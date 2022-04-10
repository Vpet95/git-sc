import CommandParser from "./command-parser.js";
import { getStory, shortcutConfig } from "./shortcut-client.js";
import { generateFromKeywords, generateName } from "./name-utils.js";
import { createNewBranch } from "./git-utils.js";
import { twinwordConfig, twinwordConfigured } from "./twinword-client.js";

function assertSuccess(status) {
  if (!status.success) {
    console.error(status.output);
    process.exit();
  }
}

const cp = CommandParser;
cp.parse();

shortcutConfig(cp.shortcutAPI);
twinwordConfig(cp.rapidapiHost, cp.twinwordAPI);

function invokeCreate(branchName) {
  createNewBranch(
    {
      location: cp.dir,
      parent: cp.parent,
      remote: cp.remote,
      branchName: branchName,
      overwrite: cp.overwrite,
      debug: cp.debug,
      update: cp.update,
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
