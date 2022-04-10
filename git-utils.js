import GitClient from "./git-client.js";

export const createNewBranch = (
  { location, parent, remote, branchName, overwrite, debug, update },
  errorHandler
) => {
  const git = new GitClient({ location: location, debug: debug });

  git.checkout({ branchName: parent }, errorHandler);

  if (update)
    git.pull({ remoteName: remote, branchName: parent }, errorHandler);

  const result = git.checkout({
    branchName: branchName,
    create: true,
  });

  if (!result.success && overwrite) {
    git.delete({ branchName: branchName, force: true }, errorHandler);

    git.checkout(
      {
        branchName: branchName,
        create: true,
      },
      errorHandler
    );
  }

  git.track({ remoteName: remote, branchName: branchName }, errorHandler);
};
