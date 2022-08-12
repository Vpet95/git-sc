/**
 * Core application code - throws all the libraries and utlities together;
 * any major new features go in here
 */

import { existsSync, writeFileSync } from "fs";
import open from "open";
import { getConfig } from "./config.js";
import { getGitClient } from "./git-client.js";
import {
  createNewBranch,
  findBranchesByStoryId,
  getRemoteOf,
} from "./git-utils.js";
import { generateName } from "./name-utils.js";
import {
  getStory,
  getState,
  getMember,
  searchStories,
} from "./shortcut-client.js";
import { assertSuccess, selectionPrompt } from "./utils.js";
import { UNDELETABLE_BRANCHES } from "./constants.js";
import { extractStoryIdFromBranchName } from "./utils.js";

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

  const story = await getStory(storyId);

  createNewBranch(generateName(storyId, story.name), assertSuccess);
};

// first determine if it's even possible to delete the branch given current settings
// then, prompt
async function validateDeleteConditionsAndPrompt(
  branchName,
  storyId,
  currentBranchName,
  force,
  options
) {
  let story = null;
  let promptDescription = "";

  const git = getGitClient();
  const config = getConfig();

  // deleting the current branch - make sure no uncommitted changes exist
  if (storyId === undefined || branchName === currentBranchName) {
    if (git.status().includes("Changes not staged for commit")) {
      console.error(
        "Uncomitted changes detected - reset, commit, or stash changes; then try again."
      );
      process.exit();
    }
  }

  // no further validation / filtering necessary
  if (force) return true;

  if (UNDELETABLE_BRANCHES.includes(branchName)) {
    console.error(
      `Cannot delete branch '${branchName}' - use --force to override`
    );
    return false;
  }

  // we're deleting the current branch (or running clean), see if we can parse out a story id
  if (storyId === undefined) {
    storyId = extractStoryIdFromBranchName(branchName);
    storyId = storyId === null ? undefined : parseInt(storyId, 10);
  }

  if (storyId !== undefined) {
    story = await getStory(
      parseInt(storyId, 10),
      config.currentCommand === "clean" // clean will most likely be calling getStory on a bunch of different stories at once
    );

    if (
      !(await options.filters.stateFilterPasses(story)) ||
      !(await options.filters.ownerFilterPasses(story))
    ) {
      // todo - maybe specify what filter caused this
      console.warn(`Branch ${branchName} filtered out by configuration`);
      return false;
    }
  }

  if (getConfig().verbose && story) {
    promptDescription = ` > Associated with ticket '${story.name}'\n`;

    const state = await getState(story.workflow_state_id);
    promptDescription += ` > In work state: ${state.name}\n`;

    if (story.owner_ids.length > 0) {
      const assignee = await getMember(story.owner_ids[0]);
      promptDescription += ` > Assigned to: ${assignee.profile.name}\n`;
    }
  }

  const resp = options.prompt
    ? prompt(
        `Delete branch '${branchName}'${
          promptDescription.length ? `\n${promptDescription}` : " "
        }y/[n]? `
      )
    : "y";

  if (resp.length === 0 || resp.toLowerCase() === "n") {
    console.log("Ok, canceled");
    return false;
  }

  return true;
}

// does the legwork of finding the specific branch name to delete
export const storyIdToBranchName = (storyId) => {
  const git = getGitClient();

  let branchName =
    storyId === undefined
      ? git.getCurrentBranchName()
      : findBranchesByStoryId(parseInt(storyId, 10));

  if (branchName === undefined) {
    console.error("Error: could not find current branch name");
    process.exit();
  } else if (Array.isArray(branchName)) {
    if (branchName.length > 1) {
      console.log(
        `Multiple branches contain the story id ${storyId}; select one, or hit enter to cancel`
      );
      branchName = selectionPrompt(branchName);

      if (!branchName) {
        console.log("Ok, canceled");
        process.exit();
      }
    }
  }

  return branchName;
};

export const deleteBranch = async (
  branchName,
  storyId,
  remote,
  force,
  overrideOptions
) => {
  const config = getConfig();
  const git = getGitClient();
  const options = overrideOptions || config.deleteOptions;
  const shouldDeleteRemote = remote || options.remote;
  const shouldForce = force || options.force;

  const currentBranchName = git.getCurrentBranchName();

  const shouldContinue = await validateDeleteConditionsAndPrompt(
    branchName,
    storyId,
    currentBranchName,
    shouldForce,
    options
  );

  if (!shouldContinue) return false;

  const { remoteBranchName, remoteName } = shouldDeleteRemote
    ? getRemoteOf(branchName)
    : { remoteBranchName: undefined, remoteName: undefined };

  if (branchName === currentBranchName) {
    console.log(`Checking out ${config.commonOptions.primaryBranch}...`);
    git.checkout({ branchName: config.commonOptions.primaryBranch });
  }

  console.log(
    `Deleting local branch ${branchName}${
      remoteName
        ? ` and remote branch ${remoteName}/${remoteBranchName}...`
        : "..."
    }`
  );

  git.delete(
    {
      branchName,
      remoteName,
      force: shouldForce,
    },
    assertSuccess
  );

  return true;
};

export const cleanBranches = async (remote, force) => {
  const config = getConfig();
  const git = getGitClient();

  // our safe haven - can't delete this one
  const primaryBranch = config.commonOptions.primaryBranch;

  // todo - maybe move these types of logs into the git commands themsleves?
  console.log(`Checking out ${primaryBranch}...`);
  git.checkout({ branchName: primaryBranch });

  const branches = git
    .listBranches()
    .filter((name) => name.toLowerCase() !== primaryBranch.toLowerCase());

  const results = await Promise.all(
    branches.map(async (branch) => {
      return deleteBranch(
        branch,
        undefined,
        remote,
        force,
        config.cleanOptions
      );
    })
  );

  const deleteCount = results.filter((result) => Boolean(result)).length;
  console.log(`Deleted (${deleteCount}/${branches.length}) branches`);
};

export const openStory = (storyId, workspace = undefined) => {
  if (storyId.length === 0 || isNaN(storyId)) {
    console.error(
      `Value (${storyId}) supplied for <story id> must be a valid integer, exiting.`
    );
    process.exit();
  }

  const config = getConfig();
  const workspaceName = workspace || config.commonOptions.shortcutWorkspace;

  if (!workspaceName) {
    console.error(
      `Missing required shortcut workspace name - pass in either via -w option or add to your config file`
    );
    process.exit();
  }

  const openURL = `https://app.shortcut.com/${workspaceName}/story/${storyId}/`;

  open(openURL);
};

export const listStories = async () => {
  const stories = await searchStories();

  console.log(JSON.stringify(stories, null, 2));
};
