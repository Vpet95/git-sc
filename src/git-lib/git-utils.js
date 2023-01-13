import { getGitClient } from "./git-client.js";
import { getConfig } from "../config.js";

export const createNewBranch = (newBranchName, errorHandler) => {
  const config = getConfig();
  const git = getGitClient();

  const primaryBranch = config.commonOptions.primaryBranch;

  console.log(`Checking out ${primaryBranch}`);
  git.checkout({ branchName: primaryBranch }, errorHandler);

  if (config.createOptions.pullLatest) {
    console.log("Pulling latest changes...");
    git.pull(
      {
        remoteName: config.commonOptions.primaryBranchRemote,
        branchName: config.commonOptions.primaryBranch,
      },
      errorHandler
    );
  }

  console.log(`Creating branch '${newBranchName}'`);
  const result = git.checkout({
    branchName: newBranchName,
    create: true,
  });

  if (!result.success) {
    if (result.output.includes("already exists")) {
      switch (config.createOptions.onBranchExists) {
        case "abort":
          console.warn(`Branch '${newBranchName} already exists`);
          return;
        case "checkout":
          console.warn(`Checking out existing branch '${newBranchName}'`);
          git.checkout(
            {
              branchName: newBranchName,
              create: false,
            },
            errorHandler
          );

          return;
        case "overwrite":
          console.warn(`OVERWRITING existing branch '${newBranchName}'`);
          git.delete({ branchName: newBranchName, force: true }, errorHandler);

          git.checkout(
            {
              branchName: newBranchName,
              create: true,
            },
            errorHandler
          );

          break;
      }
    } else {
      console.error(`Unexpected git error:\n${result.output}`);
      process.exit();
    }
  }

  if (config.createOptions.createAndLinkToRemote) {
    console.log(
      `Setting up to track remote branch '${config.createOptions.branchRemote}/${newBranchName}'`
    );
    git.track(
      {
        remoteName: config.createOptions.branchRemote,
        branchName: newBranchName,
      },
      errorHandler
    );
  }
};

// I'd rather have the caller decide what to do if multiple branches are contain the same story id
// but I provide some basic error handling here
export const findBranchesByRegexPattern = (
  branchNamePatternRegex,
  errorOnMultiple = false
) => {
  const git = getGitClient();

  const branches = git
    .listBranches()
    .filter((branch) => branchNamePatternRegex.test(branch));

  if (errorOnMultiple && branches.length > 1)
    throw new Error(`Multiple branches containing story id [${storyId}] found`);

  return branches;
};

// a hack to get the remote name and branch name of any local branch
// unfortunately there's no built-in git command to do this easily
export const getRemoteOf = (branchName) => {
  const git = getGitClient();

  git.checkout({ branchName });
  const remoteInfo = git.getCurrentRemoteName();
  git.checkoutLast();

  return remoteInfo;
};

export const getCurrentTicketId = () => {
  const { branchNameFullPattern } = getConfig().commonOptions;
  const branchName = getGitClient().getCurrentBranchName();

  return branchName.match(branchNameFullPattern)?.groups.ticketId;
};
