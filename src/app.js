/**
 * Core application code - throws all the libraries and utlities together;
 * any major new features go in here
 */

import { existsSync, writeFileSync } from "fs";
import open from "open";
import { getConfig } from "./config.js";
import GitClient from "./git-client.js";
import { createNewBranch, findBranchByStoryId } from "./git-utils.js";
import { generateFromKeywords, generateName } from "./name-utils.js";
import { getStory, shortcutConfig } from "./shortcut-client.js";
import { twinwordConfig, twinwordConfigured } from "./twinword-client.js";
import { assertSuccess } from "./utils.js";
import { UNDELETABLE_BRANCHES } from "./constants.js";

import promptSync from "prompt-sync";
const prompt = promptSync();

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
    writeFileSync(fileName, output);

    console.log(`Initialized git-sc configuration file in ${fileName}`);
  } catch (e) {
    console.error(`Unable to write to file ${fileName}\n${e.message}`);
    process.exit();
  }
};

// apparantly isNaN will interpret the empty string as a valid number because the empty string is falsy,
// and when coerced into a Number, takes on the value 0
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/isNaN#confusing_special-case_behavior
export const createBranch = async (storyId) => {
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

  const story = await getStory(storyId);

  if (twinwordConfigured()) {
    generateFromKeywords(storyId, story.name, (branchName) => {
      createNewBranch(branchName, assertSuccess);
    });
  } else {
    createNewBranch(generateName(storyId, story.name), assertSuccess);
  }
};

export const deleteBranch = async (storyId) => {
  const config = getConfig();
  const git = new GitClient({
    dir: config.commonOptions.localGitDirectory,
    debug: config.debug,
  });

  shortcutConfig(config.commonOptions.shortcutApiKey);

  const branchName =
    storyId === undefined
      ? git.getCurrentBranchName()
      : findBranchByStoryId(parseInt(storyId, 10));

  if (branchName === undefined) {
    if (storyId === undefined)
      console.error("Error: could not find current branch name");
    else
      console.error(
        `Error: could not find branch pertaining to story id ${storyId}`
      );

    process.exit();
  }

  if (
    UNDELETABLE_BRANCHES.includes(branchName) &&
    !config.deleteOptions.force
  ) {
    console.warn(
      `Cannot delete branch '${branchName}' - use --force to override`
    );
    process.exit();
  }

  if (!config.deleteOptions.force) {
    let additionalWarning = "";

    // we're deleting the current branch, see if we can parse out a story id
    if (storyId === undefined) {
      // this is very much less than ideal. I don't currently know what the mix/max Shortcut story ids are;
      // but I want to avoid the possibility of snagging just any number from a branch name; so we're making
      // an educated guess here that if there are at least 3 digits in a row, it's most likely an id
      // Again, not sure how often people have numbers in their git branch names
      const idPattern = /\d{3,}/;
      storyId = branchName.match(idPattern);

      storyId = storyId === null ? undefined : parseInt(storyId, 10);
    }

    if (storyId !== undefined) {
      const story = await getStory(parseInt(storyId, 10)).catch((e) => {
        console.error(e);
        process.exit();
      });

      console.log(`We got a story: ${JSON.stringify(story, null, 2)}`);
    }

    const resp = prompt(`Delete branch '${branchName}' y/[n]? `);

    if (resp.length === 0 || resp.toLowerCase() === "n") {
      console.log("Action canceled");
      return;
    }
  }

  let remoteName = "";
  let remoteBranchName = "";
  if (config.deleteOptions.remote) {
    git.checkout({ branchName: branchName });

    const remoteInfo = git.getCurrentRemoteName();

    if (remoteInfo) {
      remoteBranchName = remoteInfo.branch;
      remoteName = remoteInfo.remote;
    }
  }

  console.log(
    `Deleting local branch ${branchName}${
      remoteName
        ? ` and remote branch ${remoteName}/${remoteBranchName}...`
        : "..."
    }`
  );

  git.checkout({ branchName: config.commonOptions.primaryBranch });
  git.delete(
    {
      branchName,
      remoteName,
      force: config.deleteOptions.force,
    },
    assertSuccess
  );

  // console.log(git.getCurrentBranchName());
  // console.log(git.getCurrentRemoteName());
};

export const openStory = (storyId, workspace = undefined) => {
  if (storyId.length === 0 || isNaN(storyId)) {
    console.error(
      `Value (${storyId}) supplied for <story id> must be a valid integer, exiting.`
    );
    process.exit();
  }

  const config = getConfig();
  const workspaceName = workspace || config.openOptions.shortcutWorkspace;

  if (!workspaceName) {
    console.error(
      `Missing required shortcut workspace name - pass in either via -w option or add to your config file`
    );
    process.exit();
  }

  const openURL = `https://app.shortcut.com/${workspaceName}/story/${storyId}/`;

  open(openURL);
};
