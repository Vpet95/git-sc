import https from "https";
import { URL } from "url";

let RAPIDAPI_HOST = "";
let API_KEY = "";

const API_URL = new URL(
  "https://twinword-topic-tagging.p.rapidapi.com/generate/"
);

export const twinwordConfig = (rapidapiHost, apiToken) => {
  RAPIDAPI_HOST = rapidapiHost || process.env.RAPID_HOST;
  API_KEY = apiToken || process.env.TWINWORD_TOKEN;

  if (!RAPIDAPI_HOST || !API_KEY)
    console.warn(
      `Missing ${!RAPIDAPI_HOST ? "RapidAPI Host" : ""} ${
        !API_KEY
          ? !RAPIDAPI_HOST
            ? "and Twinword API key"
            : "Twinword API key"
          : ""
      } - git-sc will use a simpler name filtering algorithm`
    );
};

export const twinwordConfigured = () => RAPIDAPI_HOST && API_KEY;

export const getKeywords = (text, cb) => {
  if (typeof text !== "string")
    throw new Error("Search text must be a valid string");
  else if (!text.length) throw new Error("Search text must not be empty");

  if (!cb || typeof cb !== "function")
    throw new Error("Callback must be a valid function");

  API_URL.search = `text=${text}`;

  https
    .get(
      API_URL,
      {
        headers: {
          "X-RapidAPI-Host": RAPIDAPI_HOST,
          "X-RapidAPI-Key": API_KEY,
        },
      },
      (res) => {
        const { statusCode } = res;

        if (statusCode < 200 || statusCode >= 300) {
          console.error(`Request failed. Status code: ${statusCode}`);
          res.resume();
          process.exit();
        }

        res.setEncoding("utf8");
        let rawData = "";

        res.on("data", (chunk) => {
          rawData += chunk;
        });

        res.on("end", () => {
          try {
            const parsedData = JSON.parse(rawData);
            cb(parsedData);
          } catch (e) {
            console.error(`JSON error ${e.message}`);
            process.exit();
          }
        });
      }
    )
    .on("error", (e) => {
      console.error(`Request error: ${e.message}`);
    });
};
