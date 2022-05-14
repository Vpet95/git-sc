import { existsSync, writeFileSync } from "fs";

import { getConfig } from "./config.js";
import { getStory, shortcutConfig } from "./shortcut-client.js";
import { generateFromKeywords, generateName } from "./name-utils.js";
import { createNewBranch } from "./git-utils.js";
import { twinwordConfig, twinwordConfigured } from "./twinword-client.js";

/* This is the core application code that throws everything together */

function assertSuccess(status) {
  if (!status.success) {
    console.error(status.output);
    process.exit();
  }
}

export const initApp = (fileName, force = false) => {
  if (existsSync(fileName)) {
    if (!force) {
      console.warn(`File ${fileName} already exists, exiting`);

      process.exit();
    }

    console.warn(`Overwriting existing file ${fileName}...`);
  }

  const config = getConfig();
  const output = config.describe();

  try {
    if (config.debug)
      console.log(
        `Attempting to write the following output to file ${fileName}:\n${output}`
      );

    writeFileSync(fileName, output);
  } catch (e) {
    console.error(`Unable to write to file ${fileName}\n${e.message}`);
    process.exit();
  }
};

// function invokeCreate(branchName) {
//   createNewBranch(
//     {
//       branchName: branchName,
//       ...cp.options,
//     },
//     assertSuccess
//   );
// }

// getStory(cp.ticketId, (story) => {
//   if (twinwordConfigured()) {
//     generateFromKeywords(
//       cp.branchPrefix,
//       cp.ticketId,
//       story.name,
//       cp.limit,
//       (branchName) => {
//         invokeCreate(branchName);
//       }
//     );
//   } else {
//     invokeCreate(
//       generateName(cp.branchPrefix, cp.ticketId, story.name, cp.limit)
//     );
//   }
// });

// apparantly isNaN will interpret the empty string as a valid number because the empty string is falsy,
// and when coerced into a Number, takes on the value 0
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/isNaN#confusing_special-case_behavior
export const createBranch = (storyId, createOptions) => {
  if (storyId.length === 0 || isNaN(storyId)) {
    console.error(
      `Value supplied for <story id> must be a valid integer, exiting.`
    );
    process.exit();
  }

  shortcutConfig(createOptions.shortcutApiKey);
  twinwordConfig(createOptions.rapidApiHost, createOptions.twinwordApiKey);

  console.log(
    `Calling createBranch with storyId: ${storyId}, createOptions: ${JSON.stringify(
      createOptions,
      null,
      2
    )}`
  );
};
