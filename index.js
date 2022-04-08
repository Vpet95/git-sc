import CommandParser from "./command-parser.js";
import GitClient from "./git-client.js";
import https from "https";
import { stat } from "fs";

const API_KEY = process.env.SC_TOKEN;

function assertSuccess(status) {
  if (!status.success) {
    console.error(status.output);
    process.exit();
  }
}

const cp = CommandParser;
cp.parse();

https
  .get(
    `https://api.app.shortcut.com/api/v3/stories/${cp.ticketId}`,
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
          console.log(parsedData);
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

//console.log(`STORY: ${typeof STORY}`);

// todo - replace with shortcut api call
//const NEW_BRANCH_NAME = `${cp.branchPrefix}${cp.ticketId}/hardcoded-test-name`;

//console.log(cp.toString(true));
// const git = new GitClient({ location: cp.dir, debug: true });

// git.checkout({ branchName: cp.parent }, assertSuccess);

// if (cp.update)
//   git.pull({ remoteName: cp.remote, branchName: cp.parent }, assertSuccess);

// const result = git.checkout({
//   branchName: NEW_BRANCH_NAME,
//   create: true,
// });

// if (!result.success && cp.overwrite) {
//   git.delete({ branchName: NEW_BRANCH_NAME, force: true }, assertSuccess);

//   git.checkout(
//     {
//       branchName: NEW_BRANCH_NAME,
//       create: true,
//     },
//     assertSuccess
//   );
// }

// git.track(
//   { remoteName: cp.remote, branchName: NEW_BRANCH_NAME },
//   assertSuccess
// );
