import { program } from "commander";
import { fileURLToPath } from "url";
import { resolve, dirname } from "path";
import fs from "fs";

/* addresses `__dirname is not defined in es module scope` error */
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DEFAULT_CONFIG_FILENAME = "gitscconf.json";

class CommandParser {
  constructor() {
    this.args = {
      scTicket: -1,
    };

    this.opts = {
      gitDir: __dirname,
      parent: "develop",
      remote: process.env.P_REMOTE || "origin",
      update: true,
      debug: false,
      branchPrefix: "sc",
      overwrite: false,
      twinwordApi: "",
      rapidapiHost: "",
      shortcutApi: "",
      limit: 0,
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
        "path to the git repository. If omitted, current directory is used"
      )
      .option(
        "-p, --parent <branch>",
        "the parent branch to use. **Note: this tool assumes your local and remote branches have identical names."
      )
      .option(
        "-u, --update",
        "update the parent branch before creating the new branch"
      )
      .option(
        "-r, --remote <remote>",
        "the name of the remote to use when updating the parent branch. Can optionally be set via P_REMOTE environment variable."
      )
      .option(
        "-bp, --branch-prefix <prefix>",
        "a prefix to give the branch name prior to the shortcut ticket number."
      )
      .option(
        "-o, --overwrite",
        "overwrite local branch if it already exists. NOTICE: this will discard any working changes you have"
      )
      .option(
        "-l, --limit <count>",
        "Limits the number of words in the resulting branch name. If omitted, or zero, all unfiltered words are included."
      )
      .option(
        "--debug",
        "Determines whether git-sc outputs status and debug messages to the console"
      )
      .option(
        "--twinword-api <token>",
        "Your twinword API key. To generate one, go to https://rapidapi.com/twinword/api/topic-tagging/ and make a free account. If omitted, a simpler name filtering algorithm is used. git-sc will also look at the RAPID_HOST environment variable."
      )
      .option(
        "--rapidapi-host <URL>",
        "Your RapidAPI Host name. To generate one, go to https://rapidapi.com/twinword/api/topic-tagging/ and make a free account. If omitted, a simpler name filtering algorithm is used. git-sc will also look for the TWINWORD_TOKEN environment variable."
      )
      .option(
        "--shortcut-api <token>",
        "Your Shortcut API token. This parameter is required. git-sc will also look for the SC_TOKEN environment variable"
      )
      .option(
        "-c, --config",
        "Path to a configuration JSON file containing git-sc options"
      );

    program.parse();

    this.args.scTicket = parseInt(program.args[0], 10);

    if (isNaN(this.args.scTicket)) {
      console.error(
        `Bad value (${this.args.scTicket}) supplied for <story id> - value must be valid integer`
      );

      process.exit();
    }

    /* Grab these options first, overwrite with options supplied on the commandline */
    if (program.opts().config) {
      try {
        Object.assign(
          this.opts,
          JSON.parse(fs.readFileSync(program.opts().config))
        );
      } catch (e) {
        console.error(
          `Could not parse options from configuration file ${
            program.opts().config
          }\n${e.message}`
        );
        process.exit();
      }
    } else {
      /* look for a configuration file in the current directory */
      try {
        let rawData = fs.readFileSync(`./${DEFAULT_CONFIG_FILENAME}`);

        try {
          Object.assign(this.opts, JSON.parse(rawData));
        } catch (e) {
          console.error(
            `Could not parse JSON from configuration file ${resolve(
              `./${DEFAULT_CONFIG_FILENAME}`
            )}`
          );
        }
      } catch (e) {
        /* Do nothing, means there's probably no config file */
      }
    }

    Object.assign(this.opts, program.opts());
    this.opts.gitDir = resolve(this.opts.gitDir);

    if (this.opts.limit < 0) {
      console.log(
        `Invalid value for 'limit' (${this.opts.limit}), defaulting to no limit`
      );
      this.opts.limit = 0;
    }
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

  get limit() {
    return this.opts.limit;
  }

  get debug() {
    return this.opts.debug;
  }

  get twinwordAPI() {
    return this.opts.twinwordApi;
  }

  get rapidapiHost() {
    return this.opts.rapidapiHost;
  }

  get shortcutAPI() {
    return this.opts.shortcutApi;
  }

  toString(pretty = false) {
    return JSON.stringify({ ...this.args, ...this.opts }, null, pretty ? 2 : 0);
  }

  dump() {
    console.log(this.toString(true));
  }
}

export default new CommandParser();
