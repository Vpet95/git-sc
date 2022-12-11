import { execSync } from "child_process";

export default class GitClient {
  constructor({ dir, debug = false }) {
    if (!dir) {
      throw new Error(
        "GitClient must be initialized with the directory path of your git environment"
      );
    }

    this.dir = dir;
    this.debug = debug;
  }

  do({ command, opts }, errorHandler) {
    let fullOpts = { cwd: this.dir, ...opts, stdio: "pipe" };

    if (this.debug) {
      console.log(
        `### Executing command: [${command}], options: ${JSON.stringify(
          fullOpts
        )}`
      );
    }

    const result = {
      output: "",
      success: true,
    };

    try {
      result.output = execSync(command, fullOpts);
      if (typeof result.output === "object" && Buffer.isBuffer(result.output))
        result.output = result.output.toString();

      result.success = !result.output.includes("Command failed");
    } catch (e) {
      result.output += `\n${e}`;
      result.success = false;
    }

    if (!result.success && errorHandler) {
      errorHandler(result);
    }

    return result;
  }

  checkout({ branchName, create = false }, errorHandler) {
    return this.do(
      {
        command: `git checkout ${create ? "-b" : ""} ${branchName}`,
      },
      errorHandler
    );
  }

  checkoutLast() {
    return this.do({
      command: `git checkout -`,
    });
  }

  getCurrentBranchName(errorHandler) {
    return this.do(
      { command: "git branch --show-current" },
      errorHandler
    ).output.trim();
  }

  getCurrentRemoteName(errorHandler) {
    const output = this.do(
      { command: "git status -sb" },
      errorHandler
    ).output.trim();

    const result = { remoteBranchName: undefined, remoteName: undefined };

    const ellipsesIndex = output.indexOf("...");
    if (ellipsesIndex === -1) return result;

    const start = ellipsesIndex + 3;

    let end = output.indexOf("\n", start);

    // for instance, if no files were modified on the current branch
    if (end === -1) end = output.length;

    const parsed = output.substring(start, end);

    result.remoteBranchName = parsed.substring(
      parsed.indexOf("/") + 1,
      parsed.length
    );

    result.remote = parsed.substring(0, parsed.indexOf("/"));

    return result;
  }

  pull({ remoteName, branchName }, errorHandler) {
    return this.do(
      { command: `git pull ${remoteName} ${branchName}` },
      errorHandler
    );
  }

  track({ remoteName, branchName }, errorHandler) {
    return this.do(
      {
        command: `git push -u ${remoteName} ${branchName}`,
      },
      errorHandler
    );
  }

  delete({ branchName, remoteName, remoteOnly, force }, errorHandler) {
    let result;

    if (remoteName) {
      result = this.do(
        { command: `git push --delete ${remoteName} ${branchName}` },
        errorHandler
      );

      // bail out early - there was an error and no handler was provided, or handler didn't exit
      if (!result.success || remoteOnly) return result;
    }

    // it's safe to overwrite result here - the output will contain the necessary context to debug
    return this.do(
      { command: `git branch ${force ? "-D" : "-d"} ${branchName}` },
      errorHandler
    );
  }

  listBranches() {
    return this.do({ command: "git branch" })
      .output.split("\n")
      .map((branchName) => {
        const name = branchName.trim();

        // clean up the current branch name
        return name[0] === "*" ? name.substring(2, name.length) : name;
      })
      .filter((name) => name.length > 0);
  }

  status() {
    return this.do({ command: "git status" }).output;
  }

  reset(hard = false, errorHandler) {
    this.do({ command: `git reset ${hard ? "--hard" : ""}` }, errorHandler);
  }

  static isValidBranchName(name) {
    try {
      execSync(`git check-ref-format --branch ${name}`, {
        stdio: "ignore",
      });
    } catch (e) {
      return false;
    }

    return true;
  }

  static isValidRefName(ref) {
    try {
      execSync(`git check-ref-format refs/heads/${ref}`, {
        stdio: "ignore",
      });
    } catch (e) {
      return false;
    }

    return true;
  }
}

let gitClient = null;

export const initializeGitClient = (dir, debug) => {
  gitClient = new GitClient({
    dir,
    debug,
  });
};

export const getGitClient = () => {
  if (gitClient === null) throw new Error("git client not initialized"); // should never happen

  return gitClient;
};
