#!/usr/bin/env node

import CommandParser from "./src/command-parser.js";
import { getStory, shortcutConfig } from "./src/shortcut-client.js";
import { generateFromKeywords, generateName } from "./src/name-utils.js";
import { createNewBranch } from "./src/git-utils.js";
import { twinwordConfig, twinwordConfigured } from "./src/twinword-client.js";

function assertSuccess(status) {
  if (!status.success) {
    console.error(status.output);
    process.exit();
  }
}

const cp = CommandParser;
cp.parse();

cp.dump();

shortcutConfig(cp.shortcutAPI);
twinwordConfig(cp.rapidapiHost, cp.twinwordAPI);

function invokeCreate(branchName) {
  createNewBranch(
    {
      branchName: branchName,
      ...cp.options,
    },
    assertSuccess
  );
}

getStory(cp.ticketId, (story) => {
  if (twinwordConfigured()) {
    generateFromKeywords(
      cp.branchPrefix,
      cp.ticketId,
      story.name,
      cp.limit,
      (branchName) => {
        invokeCreate(branchName);
      }
    );
  } else {
    invokeCreate(
      generateName(cp.branchPrefix, cp.ticketId, story.name, cp.limit)
    );
  }
});
