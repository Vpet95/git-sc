import { execSync } from "child_process";

/* Disclaimer: I initally opted to use a robust Node.js git client, but the ones I could find either had 
   limitations/missing implementations I needed, or were too complex/overkill for my needs. So we're going 
   with childProcess.exec */

export default class GitClient {
  constructor({ location, debug = false }) {
    if (!location) {
      throw new Error(
        "GitClient must be initialized with the directory path of your git environment"
      );
    }

    this.location = location;
    this.debug = debug;

    console.log(`Location: ${location}`);
  }

  do({ command, opts }, errorHandler) {
    let fullOpts = { cwd: this.location, ...opts };

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
    let result = this.do({
      command: `git push -u ${remoteName} ${branchName}`,
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
