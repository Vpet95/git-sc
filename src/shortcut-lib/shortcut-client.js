import https from "https";
import { promises as fs } from "fs";
import { existsSync, writeFileSync } from "fs";
import { inspect } from "util";
import { isValidURL, generateURL } from "./utils.js";
import {
  MAX_SEARCH_PAGE_SIZE,
  MAX_SEARCH_RESULT_COUNT,
  QUOTED_SEARCH_QUERIES,
} from "./constants.js";

let API_KEY = "";
// const MOCK_API_CALLS = process.env.MOCK;
const MOCK_API_CALLS = false;

// a little safeguard - at this time at no point should git-sc be processing multiple API requests
// at once - if it is, I'm most likely missing an await somewhere
let requestCount = 0;

const shortcutCache = {
  epics: null,
  members: null,
  self: null,
  workflows: null,
};

export const setShortcutAPIKey = (key) => {
  API_KEY = key || process.env.SC_KEY;

  if (!API_KEY) {
    console.error("Missing Shortcut API key - program terminating");
    process.exit();
  }
};

const get = async (
  {
    baseURL,
    resource = null,
    params = null,
    allowConcurrent = false,
    mockFile = "",
  },
  expectedStatusCode = 200
) => {
  if (mockFile && MOCK_API_CALLS) {
    const fullMockfileName = `shortcut payloads/${mockFile}`;

    if (existsSync(fullMockfileName)) {
      return Promise.resolve(JSON.parse(await fs.readFile(fullMockfileName)));
    }
  }

  // assemble and validate a full url; final possible output looks like: https://www.somesite.com/1234?param1="abc"&param2="def"
  const fullURL = generateURL({ baseURL, resource, params });
  if (!isValidURL(fullURL)) throw new Error(`[${fullURL}] is not a valid URL`);

  console.log(`fullURL: ${fullURL}`);

  requestCount++;
  if (requestCount > 1 && !allowConcurrent)
    throw new Error(
      "Yikes! Attempted multiple concurrent requests - git-sc must be missing an 'await' call somewhere"
    );

  return new Promise((resolve, reject) => {
    https
      .get(
        fullURL,
        {
          headers: {
            "Content-Type": "application/json",
            "Shortcut-Token": API_KEY,
          },
        },
        (res) => {
          const { statusCode } = res;

          if (statusCode !== expectedStatusCode) {
            reject(statusCode);
            return;
          }

          res.setEncoding("utf8");
          let rawData = "";

          res.on("data", (chunk) => {
            rawData += chunk;
          });

          res.on("end", () => {
            requestCount--;

            try {
              const parsedData = JSON.parse(rawData);
              resolve(parsedData);
            } catch (e) {
              reject(e.message);
            }

            return;
          });
        }
      )
      .on("error", (e) => {
        requestCount--;
        reject(e.message);
        return;
      });
  });
};

const getCached = async ({ cacheKey, ...opts }, expectedStatusCode) => {
  if (cacheKey) {
    if (!(cacheKey in shortcutCache)) {
      throw new Error(`Shortcut API Cache has no key '${cacheKey}'`);
    }

    if (shortcutCache[cacheKey]) {
      return Promise.resolve(shortcutCache[cacheKey]);
    }
  }

  const result = await get(opts, expectedStatusCode);

  if (cacheKey) {
    shortcutCache[cacheKey] = result;
  }

  return Promise.resolve(result);
};

export const getStory = (ticketId, allowConcurrent = false) => {
  return get({
    baseURL: "https://api.app.shortcut.com/api/v3/stories",
    resource: `${ticketId}`,
    allowConcurrent,
  });
};

export const getWorkflows = async () => {
  return getCached({
    baseURL: "https://api.app.shortcut.com/api/v3/workflows",
    cacheKey: "workflows",
    mockFile: "workflows.json",
  });
};

export const getState = async (stateId) => {
  if (stateId == undefined /* or null */ || stateId < 0) return null;

  // just in case
  if (typeof stateId === "string") stateId = parseInt(stateId, 10);

  const workflows = await getWorkflows().catch((e) => {
    throw new Error(e);
  });

  for (const w of workflows) {
    const state = w.states.find((state) => state.id === stateId);

    if (state !== undefined) return state;
  }

  return null;
};

export const getMembers = () => {
  return getCached({
    baseURL: "https://api.app.shortcut.com/api/v3/members",
    cacheKey: "members",
  });
};

export const getMember = async (memberId) => {
  // pull from local cache if any, otherwise call API
  if (shortcutCache.members) {
    return Promise.resolve(
      shortcutCache.members.find((member) => member.id === memberId)
    );
  }

  return get({
    baseURL: "https://api.app.shortcut.com/api/v3/members",
    resource: memberId,
  });
};

export const getSelf = () => {
  return getCached({
    baseURL: "https://api.app.shortcut.com/api/v3/member",
    cacheKey: "self",
    mockFile: "self.json",
  });
};

const processOwnerMentionName = async (owner) => {
  if (!owner || owner.toLowerCase() === "self") {
    const self = await getSelf();
    return self.mention_name;
  }

  return owner;
};

const generateQueryString = async (options) => {
  options.owner = await processOwnerMentionName(options.owner);

  QUOTED_SEARCH_QUERIES.forEach((query) => {
    if (options[query]) options[query] = `\"${options[query]}\"`;
  });

  // convert certain git-sc terms into Shortcut terms
  if ("workflowState" in options) {
    options.state = options.workflowState;
    delete options.workflowState;
  }

  return Object.keys(options)
    .map((key) => {
      const isArchived = key === "archived";
      const isInverted =
        options[key][0] === "!" || (isArchived && !options[key]);

      const keyName =
        key === "workflowState"
          ? "state"
          : key === "completionState" || isArchived
          ? "is"
          : key;

      const value = isArchived
        ? "archived"
        : isInverted
        ? options[key].substr(1)
        : options[key];

      // shortcut wants the inversion on the key name,
      // whereas it's easier for users to specify it on the value in git-sc
      return `${isInverted ? "!" : ""}${keyName}:${value}`;
    })
    .join(" ");
};

// todo - consider what to do with search queries that could return > 1k results
export const searchStories = async (searchOptions, limit) => {
  let data = [];

  if (MOCK_API_CALLS) {
    // can't use get()'s mock logic since there's so much custom logic happening here
    data = JSON.parse(
      await fs.readFile("shortcut payloads/assigned-stories.json")
    );
  } else {
    let result = null;
    const resultLimit = limit || MAX_SEARCH_RESULT_COUNT;
    const searchQuery = await generateQueryString(searchOptions);

    do {
      result = await get({
        baseURL: "https://api.app.shortcut.com/api/v3/search/stories",
        params: {
          page_size: Math.min(MAX_SEARCH_PAGE_SIZE, resultLimit - data.length),
          ...(Boolean(result?.next)
            ? {
                next: result.next.substring(
                  result.next.lastIndexOf("=") + 1,
                  result.next.length
                ),
              }
            : {}),
          query: searchQuery,
        },
      });

      if (result.data) data = data.concat(result.data);
    } while (result.next && data.length < resultLimit);
  }

  return data.length
    ? data.map((story) => ({
        started: story.started,
        completed: story.completed,
        name: story.name,
        epic_id: story.epic_id,
        workflow_state_id: story.workflow_state_id,
        id: story.id,
      }))
    : null;
};

export const getEpic = async (epicId) => {
  if (shortcutCache.epics?.[epicId]) return shortcutCache.epics[epicId];

  const epic = await get({
    baseURL: "https://api.app.shortcut.com/api/v3/epics",
    resource: epicId,
  });

  if (!shortcutCache.epics) shortcutCache.epics = {};

  // at this point I'm only interested in epic names; someday I might expand on this
  shortcutCache.epics[epicId] = { name: epic.name };

  return shortcutCache.epics[epicId];
};
