import CommandParser from "./command-parser.js";
import GitClient from "./git-client.js";

function assertSuccess(status) {
  if (!status.success) {
    console.error(status.output);
    process.exit();
  }
}

const cp = CommandParser;
cp.parse();

// todo - replace with shortcut api call
const NEW_BRANCH_NAME = `${cp.branchPrefix}${cp.ticketId}/hardcoded-test-name`;

console.log(cp.toString(true));
const git = new GitClient({ location: cp.dir, debug: true });

git.checkout({ branchName: cp.parent }, assertSuccess);

if (cp.update)
  git.pull({ remoteName: cp.remote, branchName: cp.parent }, assertSuccess);

const result = git.checkout({
  branchName: NEW_BRANCH_NAME,
  create: true,
});

if (!result.success && cp.overwrite) {
  git.delete({ branchName: NEW_BRANCH_NAME, force: true }, assertSuccess);

  git.checkout(
    {
      branchName: NEW_BRANCH_NAME,
      create: true,
    },
    assertSuccess
  );
}

git.track(
  { remoteName: cp.remote, branchName: NEW_BRANCH_NAME },
  assertSuccess
);
