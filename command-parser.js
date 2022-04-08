import { program } from "commander";
import { fileURLToPath } from "url";
import { resolve, dirname } from "path";

/* addresses `__dirname is not defined in es module scope` error */
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class CommandParser {
  constructor() {
    this.args = {
      scTicket: -1,
    };

    this.opts = {
      gitDir: "",
      parent: "",
      remote: "",
      update: false,
      branchPrefix: "",
      overwrite: false,
    };
  }

  parse() {
    program
      .name("git-sc")
      .description(
        "A tool to create git branches based on existing shortcut stories"
      )
      .version("1.0.0")
      .argument("<story id>", "the shortcut ticket id")
      .option(
        "-d, --git-dir <path>",
        "path to the git repository. If omitted, current directory is used",
        __dirname
      )
      .option(
        "-p, --parent <branch>",
        "the parent branch to use. **Note: this tool assumes your local and remote branches have identical names.",
        "develop"
      )
      .option(
        "-u, --update",
        "update the parent branch before creating the new branch",
        false
      )
      .option(
        "-r, --remote <remote>",
        "the name of the remote to use when updating the parent branch. Can optionally be set via P_REMOTE environment variable.",
        process.env.P_REMOTE || "origin"
      )
      .option(
        "-bp, --branch-prefix <prefix>",
        "a prefix to give the branch name prior to the shortcut ticket number.",
        "sc"
      )
      .option(
        "-o, --overwrite",
        "overwrite local branch if it already exists. NOTICE: this will discard any working changes you have",
        false
      );

    program.parse();

    this.args.scTicket = program.args[0];

    if (isNaN(this.args.scTicket)) {
      console.error(
        `Bad value (${this.args.scTicket}) supplied for <story id> - value must be valid integer`
      );

      process.exit();
    }

    Object.assign(this.opts, program.opts());
    this.opts.gitDir = resolve(this.opts.gitDir);
  }

  get ticketId() {
    return this.args.scTicket;
  }

  get dir() {
    return this.opts.gitDir;
  }

  get parent() {
    return this.opts.parent;
  }

  get update() {
    return this.opts.update;
  }

  get remote() {
    return this.opts.remote;
  }

  get branchPrefix() {
    return this.opts.branchPrefix;
  }

  get overwrite() {
    return this.opts.overwrite;
  }

  toString(pretty = false) {
    return JSON.stringify({ ...this.args, ...this.opts }, null, pretty ? 2 : 0);
  }
}

export default new CommandParser();
