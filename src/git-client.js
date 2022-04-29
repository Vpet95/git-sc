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
    return this.do({
      command: `git checkout ${create ? "-b" : ""} ${branchName}`,
      errorHandler,
    });
  }

  pull({ remoteName, branchName }, errorHandler) {
    return this.do(
      { command: `git pull ${remoteName} ${branchName}` },
      errorHandler
    );
  }

  track({ remoteName, branchName }, errorHandler) {
    return this.do({
      command: `git branch --set-upstream-to ${remoteName}/${branchName}`,
      errorHandler,
    });
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
}
