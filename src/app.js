/**
 * Core application code - throws all the libraries and utlities together;
 * any major new features go in here
 */

import { existsSync, writeFileSync } from "fs";

import { getConfig } from "./config.js";
import { getStory, shortcutConfig } from "./shortcut-client.js";
import { generateFromKeywords, generateName } from "./name-utils.js";
import { createNewBranch } from "./git-utils.js";
import { twinwordConfig, twinwordConfigured } from "./twinword-client.js";
import { assertSuccess } from "./utils.js";
import { DEFAULT_CONFIG_LOCATIONS } from "./constants.js";

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

// apparantly isNaN will interpret the empty string as a valid number because the empty string is falsy,
// and when coerced into a Number, takes on the value 0
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/isNaN#confusing_special-case_behavior
export const createBranch = (storyId) => {
  if (storyId.length === 0 || isNaN(storyId)) {
    console.error(
      `Value (${storyId}) supplied for <story id> must be a valid integer, exiting.`
    );
    process.exit();
  }

  storyId = Number.parseInt(storyId, 10);

  const config = getConfig();

  /* Configure the libraries */
  shortcutConfig(config.commonOptions.shortcutApiKey);
  twinwordConfig(
    config.createOptions.rapidApiHost,
    config.createOptions.topicTaggingApiKey
  );

  getStory(storyId, (story) => {
    if (twinwordConfigured()) {
      generateFromKeywords(storyId, story.name, (branchName) => {
        createNewBranch(branchName, assertSuccess);
      });
    } else {
      createNewBranch(generateName(storyId, story.name), assertSuccess);
    }
  });
};
