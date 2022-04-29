import GitClient from "./git-client.js";

export const createNewBranch = (
  {
    gitDir,
    parent,
    parentRemote,
    branchName,
    childRemote,
    overwrite,
    debug,
    update,
  },
  errorHandler
) => {
  const git = new GitClient({ dir: gitDir, debug: debug });

  git.checkout({ branchName: parent }, errorHandler);

  if (update)
    git.pull({ remoteName: parentRemote, branchName: parent }, errorHandler);

  const result = git.checkout({
    branchName: branchName,
    create: true,
  });

  if (!result.success) {
    if (result.output.includes("already exists") && overwrite) {
      console.log(`>> OVERWRITING BRANCH`);

      git.delete({ branchName: branchName, force: true }, errorHandler);

      git.checkout(
        {
          branchName: branchName,
          create: overwrite,
        },
        errorHandler
      );
    } else {
      console.error(`Unexpected git error:\n${result.output}`);
      process.exit();
    }
  }

  git.track({ remoteName: childRemote, branchName: branchName }, errorHandler);
};
