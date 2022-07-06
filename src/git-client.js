import { execSync, exec } from "child_process";

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
    let fullOpts = { cwd: this.dir, ...opts };

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

    const start = output.indexOf("...") + 3;

    if (start === -1) return undefined;

    let end = output.indexOf("\n", start);

    // for instance, if no files were modified on the current branch
    if (end === -1) end = output.length;

    const parsed = output.substring(start, end);

    return {
      branch: parsed.substring(parsed.indexOf("/") + 1, parsed.length),
      remote: parsed.substring(0, parsed.indexOf("/")),
    };
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
      });
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
