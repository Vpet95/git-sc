/**
 * Core application code - throws all the libraries and utlities together;
 * any major new features go in here
 */

import { existsSync, writeFileSync } from "fs";
import open from "open";
import columnify from "columnify";
import { getConfig } from "./config.js";
import {
  UNDELETABLE_BRANCHES,
  TICKET_ID_PROMPT,
  TICKET_SEARCH_PROMPT,
  NOTFOUND_ABORT,
  NOTFOUND_DELETE,
  NOTFOUND_SKIP,
  FORMAT_TICKET_ID,
} from "./constants.js";
import { getGitClient } from "./git-lib/git-client.js";
import {
  createNewBranch,
  findBranchesByRegexPattern,
  getRemoteOf,
  getCurrentTicketId,
} from "./git-lib/git-utils.js";
import { generateName } from "./name-utils.js";
import {
  getMember,
  getState,
  getStory,
  searchStories,
} from "./shortcut-lib/shortcut-client.js";
import {
  groupStoriesByState,
  sortStoriesByState,
} from "./shortcut-lib/shortcut-utils.js";
import {
  assertSuccess,
  extractStoryIdFromBranchName,
  multiSelectionPrompt,
  underline,
  wrapLog,
  completeContains,
  truncateString,
  Time,
} from "./utils.js";

import psp, { AutocompleteBehavior } from "prompt-sync-plus";
const prompt = psp();

const TERM_WIDTH = process.stdout.columns;
const TICKET_WIDTH = 7;
const COLUMN_COUNT = 3;
const SEPARATOR_WIDTH = 3;
const NAME_WIDTH = Math.floor(
  (TERM_WIDTH - (TICKET_WIDTH + (COLUMN_COUNT - 1) * SEPARATOR_WIDTH)) * 0.6
);
const EPIC_WIDTH = Math.floor(
  (TERM_WIDTH - (TICKET_WIDTH + (COLUMN_COUNT - 1) * SEPARATOR_WIDTH)) * 0.4
);

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

const promptForDirectTicketId = () => {
  const resp = prompt(TICKET_ID_PROMPT);

  if (resp === null || resp.trim().length === 0) {
    console.log("Ok, canceled");
    return null;
  } else if (isNaN(resp)) {
    console.error(
      "Value supplied is not a valid ticket ID - expected positive integer"
    );
    return null;
  } else {
    return parseInt(resp.trim(), 10);
  }
};

const promptForTicketIdWithAutocomplete = (stories) => {
  const resp = prompt(TICKET_SEARCH_PROMPT, {
    autocomplete: {
      behavior: AutocompleteBehavior.SUGGEST,
      suggestColCount: 1,
      sticky: true,
      searchFn: completeContains(
        stories.map((story) =>
          truncateString(
            `${story.id} - ${story.name}`,
            process.stdout.columns -
              (TICKET_ID_PROMPT.length + String(story.id).length + 3)
          ).toLowerCase()
        )
      ),
    },
  });

  if (resp === null || resp.length === 0) {
    console.log("Ok, canceled");
    return null;
  }

  const ticketId = parseInt(resp);

  if (Number.isNaN(ticketId)) {
    console.warn(`Invalid Shortcut ticket id '${resp}'`);
    return null;
  }

  return ticketId;
};

const promptForShortcutTicketId = async () => {
  // populate prompt for auto-complete from currently assigned tickets
  const autoCompleteConfig = getConfig().createOptions.autocomplete;

  if (!autoCompleteConfig) {
    wrapLog(
      "Autocomplete settings for create not configured - enter a ticket id or <enter> to cancel",
      "warn"
    );
    return promptForDirectTicketId();
  }

  console.log("Searching Shortcut stories...");
  const stories = await searchStories(
    autoCompleteConfig.query,
    autoCompleteConfig.limit
  );

  if (stories === null) {
    console.warn(
      "No stories matched autocomplete criteria - enter a ticket id or <enter> to cancel"
    );
    return promptForDirectTicketId();
  } else {
    return promptForTicketIdWithAutocomplete(stories);
  }
};

// apparantly isNaN will interpret the empty string as a valid number because the empty string is falsy,
// and when coerced into a Number, takes on the value 0
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/isNaN#confusing_special-case_behavior
export const createBranch = async (storyId) => {
  if (storyId === undefined) {
    storyId = await promptForShortcutTicketId();

    if (storyId === null) return;
  } else {
    if (storyId.length === 0 || isNaN(storyId)) {
      console.error(
        "Value supplied is not a valid ticket ID - expected positive integer"
      );
      return;
    }

    storyId = Number.parseInt(storyId, 10);
  }

  const story = await getStory(storyId);

  createNewBranch(generateName(storyId, story.name), assertSuccess);
};

function handleTicketNotFound(onTicketNotFound, storyId) {
  const commonCopy = `Could not find story #${storyId} on Shortcut,`;
  switch (onTicketNotFound) {
    case "abort":
      console.warn(`${commonCopy} aborting`);
      return NOTFOUND_ABORT;
    case "delete":
      wrapLog(
        `${commonCopy} proceeding with branch deletion due to configured 'onStoryNotFound' value`,
        "warn"
      );
      return NOTFOUND_DELETE;
    case "skip":
      console.warn(`${commonCopy} skipping current branch deletion`);
      return NOTFOUND_SKIP;
  }
}

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
    storyId = extractStoryIdFromBranchName(
      branchName,
      config.commonOptions.branchNameFullPattern
    );

    if (storyId !== undefined) storyId = parseInt(storyId, 10);
  }

  if (storyId !== undefined) {
    try {
      story = await getStory(
        parseInt(storyId, 10),
        // clean will most likely be calling getStory on a bunch of different stories at once
        // delete may end up doing so too if there are multiple branches that map to the same story id
        config.currentCommand === "clean" || config.currentCommand === "delete"
      );

      if (
        !(await options.filters.stateFilterPasses(story)) ||
        !(await options.filters.ownerFilterPasses(story))
      ) {
        // todo - maybe specify what filter caused this
        wrapLog(`Branch ${branchName} filtered out by configuration`, "warn");
        return false;
      }
    } catch (e) {
      if (e === 404) {
        const action = handleTicketNotFound(options.onTicketNotFound, storyId);

        if (action === NOTFOUND_ABORT) process.exit();
        else if (action === NOTFOUND_SKIP) return false;

        // NOTFOUND_DELETE should proceed through to the prompting
      } else {
        throw new Error(`Unexpected error on getStory(): ${e}`);
      }
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

  // really useful in cases where the user is doing a clean command, with hundreds of local branches
  // and finds out last minute that they had prompt: true, and want an easy way to cancel the entire
  // command, not just the current delete iteration
  if (resp === null) {
    console.log("Operation fully canceled");
    process.exit();
  }

  if (resp.length === 0 || resp.toLowerCase() === "n") {
    console.log("Ok, canceled");
    return false;
  }

  return true;
}

// does the legwork of finding the specific branch name to delete
export const storyIdToBranchNames = (storyId) => {
  const git = getGitClient();
  const { branchNameDeletePattern } = getConfig().commonOptions;

  let branchName =
    storyId === undefined
      ? git.getCurrentBranchName()
      : findBranchesByRegexPattern(
          new RegExp(
            branchNameDeletePattern.replace(FORMAT_TICKET_ID.syntax, storyId)
          )
        );

  if (branchName === undefined) {
    console.error("Error: could not find current branch name");
    process.exit();
  } else if (Array.isArray(branchName)) {
    switch (branchName.length) {
      case 0:
        branchName = undefined;
        break;
      case 1:
        branchName = branchName[0];
        break;
      default:
        console.log(
          `Multiple branches found.\nEnter a separated list of digits, * for all branches, or ^C to cancel.`
        );
        branchName = multiSelectionPrompt(branchName);

        if (!branchName) {
          console.log("Ok, canceled");
          process.exit();
        }
    }
  }

  return branchName;
};

const handleDeleteError = (status, onError, forceDeleteFn, errorMessages) => {
  console.error(status.output);

  switch (onError) {
    case "abort":
      if (errorMessages.abort) console.error(errorMessages.abort);
      process.exit();
    case "skip":
      if (errorMessages.skip) console.error(errorMessages.skip);
      return false;
    case "delete":
      if (errorMessages.delete) console.error(errorMessages.delete);
      forceDeleteFn();
  }

  return true;
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

  const result = git.delete({
    branchName: branchName,
    remoteName,
    force: shouldForce,
  });

  if (!result.success) {
    const isNotFullyMerged = result.output.includes("is not fully merged");

    return handleDeleteError(
      result,
      isNotFullyMerged ? options.onNotFullyMerged : options.onError,
      () => {
        git.delete({
          branchName: branchName,
          remoteName,
          force: true,
        });
      },
      {
        abort: `Aborting due to ${
          isNotFullyMerged ? "onNotFullyMerged" : "onError"
        } setting`,
        skip: isNotFullyMerged
          ? `Branch '${branchName}' is not fully merged. Skipping due to onNotFullyMerged setting.`
          : `Skipping due to onError setting.`,
        delete: `Force deleting due to ${
          isNotFullyMerged ? "onNotFullyMerged" : "onError"
        } setting`,
      }
    );
  }

  return true;
};

export const cleanBranches = async (remote, force) => {
  const config = getConfig();
  const git = getGitClient();

  // our safe haven - can't delete this one
  const primaryBranch = config.commonOptions.primaryBranch;

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

export const openStory = (givenStoryId = undefined, workspace = undefined) => {
  const storyId = givenStoryId ?? getCurrentTicketId();

  if (storyId === undefined) {
    console.error(
      "Could not extract a valid shortcut story id from the current git branch"
    );
    process.exit();
  } else if (storyId.length === 0 || isNaN(storyId)) {
    console.error(
      `Value (${givenStoryId}) supplied for story id must be a valid integer`
    );
    process.exit();
  }

  const workspaceName =
    workspace || getConfig().commonOptions.shortcutWorkspace;

  if (!workspaceName) {
    console.error(
      `Missing required shortcut workspace name - pass in either via -w option or add to your config file`
    );
    process.exit();
  }

  const openURL = `https://app.shortcut.com/${workspaceName}/story/${storyId}/`;

  open(openURL);
};

export const listStories = async ({
  archived,
  owner,
  type,
  epic,
  workflowState,
  completionState,
  limit,
}) => {
  const listOpts = getConfig().listOptions;

  console.log(
    `Searching Shortcut (this may take a bit depending on your search criteria)...`
  );
  const searchTime = new Time();
  const stories = await searchStories(
    {
      ...listOpts.query,
      ...(archived ? { archived: archived.toLowerCase() === "t" } : {}),
      ...(owner ? { owner } : {}),
      ...(type ? { type } : {}),
      ...(epic ? { epic } : {}),
      ...(workflowState ? { workflowState } : {}),
      ...(completionState ? { completionState } : {}),
    },
    limit || listOpts.limit
  );

  if (stories === null) {
    console.log(`No Shortcut stories matched your query.`);
    return;
  }

  const enriched = await groupStoriesByState(stories);
  const sorted = sortStoriesByState(enriched);

  console.log("\n");

  Object.keys(sorted).forEach((key) => {
    const columns = columnify(sorted[key].stories, {
      columns: ["id", "name", "epicName"],
      minWidth: TICKET_WIDTH,
      config: {
        name: { maxWidth: NAME_WIDTH },
        epicName: { maxWidth: EPIC_WIDTH },
      },
      showHeaders: false,
      columnSplitter: " | ",
    });

    console.log(underline(key, process.stdout.columns - 1));
    console.log(`${columns}\n`);
  });

  console.log(`Found ${stories.length} stories in ${searchTime.end()}`);
};
