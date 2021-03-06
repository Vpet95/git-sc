import https from "https";
import { isValidURL, generateURL } from "./utils.js";

let API_KEY = "";

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

  return result;
};

export const getStory = (ticketId, allowConcurrent = false) => {
  return get({
    baseURL: "https://api.app.shortcut.com/api/v3/stories",
    resource: `${ticketId}`,
    allowConcurrent,
  });
};

export const getWorkflows = () => {
  return getCached({
    baseURL: "https://api.app.shortcut.com/api/v3/workflows",
    cacheKey: "workflows",
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
  });
};
