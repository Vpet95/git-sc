import GitClient from "./git-client.js";
import { getConfig } from "./config.js";

export const createNewBranch = (newBranchName, errorHandler) => {
  const config = getConfig();
  const git = new GitClient({
    dir: config.commonOptions.localGitDirectory,
    debug: config.commonOptions.debug,
  });

  git.checkout({ branchName: config.createOptions.parentBranch }, errorHandler);

  if (config.createOptions.pullLatest)
    git.pull(
      {
        remoteName: config.createOptions.parentBranchRemote,
        branchName: config.createOptions.parentBranch,
      },
      errorHandler
    );

  const result = git.checkout({
    branchName: newBranchName,
    create: true,
  });

  if (!result.success) {
    if (
      result.output.includes("already exists") &&
      config.createOptions.overwriteExistingBranch
    ) {
      console.warn("git-sc is OVERWRITING existing branch");

      git.delete({ branchName: newBranchName, force: true }, errorHandler);

      git.checkout(
        {
          branchName: newBranchName,
          create: true,
        },
        errorHandler
      );
    } else {
      console.error(`Unexpected git error:\n${result.output}`);
      process.exit();
    }
  }

  if (config.createOptions.createLinkToRemote)
    git.track(
      {
        remoteName: config.commonOptions.branchRemote,
        branchName: newBranchName,
      },
      errorHandler
    );
};
