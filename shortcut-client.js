import https from "https";

let API_KEY = "";

export const shortcutConfig = (apiToken) => {
  API_KEY = apiToken || process.env.SC_TOKEN;

  if (!API_KEY) {
    console.error("Missing Shortcut API key - program terminating");
    process.exit();
  }
};

export const getStory = (ticketId, cb) => {
  if (typeof ticketId !== "number")
    throw new Error("Shortcut ticket id must be a valid integer");

  if (!cb || typeof cb !== "function")
    throw new Error("Callback must be a valid function");

  https
    .get(
      `https://api.app.shortcut.com/api/v3/stories/${ticketId}`,
      {
        headers: {
          "Content-Type": "application/json",
          "Shortcut-Token": API_KEY,
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
