import https from "https";
import { isValidURL, generateURL } from "./utils.js";

let API_KEY = "";

export const shortcutConfig = (apiToken) => {
  API_KEY = apiToken || process.env.SC_TOKEN;

  if (!API_KEY) {
    console.error("Missing Shortcut API key - program terminating");
    process.exit();
  }
};

const get = (
  { baseURL, resource = null, params = [] },
  expectedStatusCode = 200
) => {
  // assemble and validate a full url; final possible output looks like: https://www.somesite.com/1234?param1="abc"&param2="def"
  const fullURL = generateURL({ baseURL, resource, params });
  if (!isValidURL(fullURL)) throw new Error(`[${fullURL}] is not a valid URL`);

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
        reject(e.message);
        return;
      });
  });
};

export const getStory = (ticketId) => {
  return get({
    baseURL: "https://api.app.shortcut.com/api/v3/stories",
    resource: `${ticketId}`,
  });
};

export const getWorkflows = () => {
  return get({
    baseURL: "https://api.app.shortcut.com/api/v3/workflows",
  });
};

export const getSelf = () => {
  return get({
    baseURL: "https://api.app.shortcut.com/api/v3/member",
  });
};

// todo - need a way to get current user's name or id
