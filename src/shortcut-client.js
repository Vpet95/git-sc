import https from "https";
import { promises as fs } from "fs";
import { isValidURL, generateURL } from "./utils.js";

let API_KEY = "";
const MOCK_API_CALLS = process.env.MOCK;

// a little safeguard - at this time at no point should git-sc be processing multiple API requests
// at once - if it is, I'm most likely missing an await somewhere
let requestCount = 0;

const shortcutCache = {
  members: null,
  workflows: null,
  self: null,
};

export const setShortcutAPIKey = (key) => {
  API_KEY = key || process.env.SC_KEY;

  if (!API_KEY) {
    console.error("Missing Shortcut API key - program terminating");
    process.exit();
  }
};

const get = (
  { baseURL, resource = null, params = [], allowConcurrent = false },
  expectedStatusCode = 200
) => {
  // assemble and validate a full url; final possible output looks like: https://www.somesite.com/1234?param1="abc"&param2="def"
  const fullURL = generateURL({ baseURL, resource, params });
  if (!isValidURL(fullURL)) throw new Error(`[${fullURL}] is not a valid URL`);

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
  if (MOCK_API_CALLS) {
    // funny, but we need to parse it; and we still need to return a Promise
    return Promise.resolve(
      JSON.parse(await fs.readFile("shortcut payloads/workflows.json"))
    );
  } else {
    return getCached({
      baseURL: "https://api.app.shortcut.com/api/v3/workflows",
      cacheKey: "workflows",
    });
  }
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
  });
};

export const searchStories = async () => {
  let data = [];

  if (MOCK_API_CALLS) {
    // using readFile instead of readFileSync to simulate the asynchronicity of an api call
    data = JSON.parse(
      await fs.readFile("shortcut payloads/assigned-stories.json")
    );
  } else {
    let result = null;

    // todo - refactor this to be responsive to actual configuration
    const baseParams = [
      {
        name: "page_size",
        value: "1",
      },
      {
        name: "query",
        value: "owner:vpet",
      },
    ];

    do {
      const next = result?.next && {
        name: "next",
        value: result.next.substring(
          result.next.lastIndexOf("=") + 1,
          result.next.length
        ),
      };

      result = await get({
        baseURL: "https://api.app.shortcut.com/api/v3/search/stories",
        params: [...baseParams, ...(Boolean(next) ? [next] : [])],
      });

      if (result.data) data = data.concat(result.data);
    } while (result.next);
  }

  return data.map((story) => ({
    started: story.started,
    completed: story.completed,
    name: story.name,
    epic_id: story.epic_id,
    workflow_state_id: story.workflow_state_id,
    id: story.id,
  }));
};
