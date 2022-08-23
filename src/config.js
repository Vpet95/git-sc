import { resolve } from "path";
import fs from "fs";
import Joi from "joi";
import {
  FILTERED_COMMANDS,
  DEFAULT_CONFIG_FILENAME,
  DEFAULT_CONFIG_LOCATIONS,
  DEFAULT_OPTIONS,
  MAX_SEARCH_RESULT_COUNT,
} from "./constants.js";
import { includesAny, wrapLog } from "./utils.js";
import GitClient from "./git-client.js";
import { Filter } from "./filter.js";
import { setShortcutAPIKey } from "./shortcut-client.js";

const refValidator = (value, helpers) => {
  if (GitClient.isValidRefName(value)) return value;

  return helpers.error("any.invalid");
};

const deleteBranchFilterSchema = Joi.object({
  stateFilter: Joi.object({
    exactly: Joi.array().items(Joi.string()).min(1),
    inBetween: Joi.object({
      lowerBound: Joi.string(),
      upperBound: Joi.string(),
    }),
    andAbove: Joi.string(),
    andBelow: Joi.string(),
  })
    .oxor("exactly", "inBetween", "andAbove", "andBelow")
    .min(1),
  ownerFilter: Joi.object({
    any: Joi.array().items(Joi.string()).min(1).unique(),
    not: Joi.array().items(Joi.string()).min(1).unique(),
  })
    .oxor("any", "not")
    .min(1),
});

const purgeSchema = Joi.object({
  force: Joi.boolean(),
  remote: Joi.boolean(),
  filters: deleteBranchFilterSchema,
  onTicketNotFound: Joi.string()
    .valid("abort", "delete", "skip")
    .insensitive()
    .required(),
  prompt: Joi.boolean(),
});

const searchSchema = Joi.object({
  query: Joi.object({
    epic: Joi.string(),
    owner: Joi.string(),
    workflowState: Joi.string(),
    completionState: Joi.string(),
    type: Joi.string().allow("feature", "bug", "chore").insensitive(),
  }),
  limit: Joi.number().min(1).max(MAX_SEARCH_RESULT_COUNT),
});

// we're allowing unknown fields because they shouldn't disrupt our logic
const optionsSchema = Joi.object({
  common: Joi.object({
    shortcutApiKey: Joi.string().required(),
    // best we can do, really https://stackoverflow.com/a/537833/3578493
    localGitDirectory: Joi.string().pattern(/^[^\0]+$/),
    primaryBranch: Joi.string()
      .custom((value, helpers) => {
        if (GitClient.isValidBranchName(value)) return value;

        return helpers.error("any.invalid");
      }, "must exist and be a valid git branch name")
      .required(),
    primaryBranchRemote: Joi.string()
      .custom(refValidator, "must exist and be a valid git ref")
      .required(),
    shortcutWorkspace: Joi.string().allow(""),
  }).required(),
  create: Joi.object({
    pullLatest: Joi.boolean(),
    branchPrefix: Joi.string(),
    branchKeywordCountLimit: Joi.number().integer().min(0),
    branchRemote: Joi.string().custom(refValidator),
    createAndLinkToRemote: Joi.boolean(),
    onBranchExists: Joi.string()
      .valid("abort", "checkout", "overwrite") // todo - add an option for re-name; will need to replace prompt with readline
      .insensitive(),
    autocomplete: searchSchema,
  }),
  delete: purgeSchema,
  clean: purgeSchema.concat(
    Joi.object({
      onError: Joi.string().valid("stop, continue").insensitive(),
    })
  ),
  list: searchSchema,
});

class Config {
  configured = false;
  debug = false;
  verbose = false;
  currentCommand = "";
  opts = structuredClone(DEFAULT_OPTIONS);

  #validate() {
    const validationResult = optionsSchema.validate(this.opts, {
      abortEarly: false,
      allowUnknown: true,
      debug: this.debug,
    });

    if (validationResult.error) {
      console.error("ERROR: Configured settings failed to validate.\n");

      validationResult.error.details.map((errorDetail) => {
        if (
          includesAny(
            errorDetail?.context?.label,
            "primaryBranch",
            "primaryBranchRemote",
            "branchRemote"
          )
        ) {
          wrapLog(
            `"${errorDetail?.context?.label}" must be a valid git ref - see: https://stackoverflow.com/a/3651867/3578493`,
            "error"
          );
        } else {
          console.error(errorDetail?.message);
        }
      });

      // console.error(`Your settings:\n${JSON.stringify(this.opts, null, 2)}`);
      process.exit();
    }

    // todo - remove
    // process.exit();
  }

  get debug() {
    return this.debug;
  }

  setDebug(value) {
    this.debug = value;
  }

  get verbose() {
    return this.verbose;
  }

  setVerbose(value) {
    this.verbose = value;
  }

  get createOptions() {
    return this.opts.create;
  }

  get deleteOptions() {
    return this.opts.delete;
  }

  get commonOptions() {
    return this.opts.common;
  }

  get openOptions() {
    return this.opts.open;
  }

  get cleanOptions() {
    return this.opts.clean;
  }

  get listOptions() {
    return this.opts.list;
  }

  all() {
    return this.opts;
  }

  describe() {
    const defaults = structuredClone(DEFAULT_OPTIONS);

    defaults.common.shortcutApiKey =
      "<required; your Shortcut API key - see https://help.shortcut.com/hc/en-us/articles/205701199-Shortcut-API-Tokens for more info>";

    return JSON.stringify(defaults, null, 2);
  }

  #storeConfig(configFile) {
    try {
      const configData = fs.readFileSync(configFile);

      // obtain user's input configuration file
      const configJSON = JSON.parse(configData);
      const configKeys = Object.keys(configJSON);

      // overlay config over default settings
      Object.assign(this.opts, configJSON);

      // collect a list of toplevel options user specified
      const unusedKeys = Object.keys(this.opts).filter(
        (key) => !configKeys.includes(key)
      );

      // remove any toplevel keys not specific by the user
      // (necessary to avoid validating default/unspecified configuration)
      unusedKeys.forEach((key) => {
        delete this.opts[key];
      });

      setShortcutAPIKey(this.opts.common.shortcutApiKey);
    } catch (e) {
      console.error(`Could not process or store configuration.\n${e.message}`);
      process.exit();
    }
  }

  async load(configFile) {
    if (this.configured) return;

    if (configFile) {
      if (!fs.existsSync(configFile))
        throw new Error(`Could not find file '${configFile}'`);

      if (this.debug)
        console.log(`Attempting to load configuration from ${configFile}`);

      this.#storeConfig(configFile);
      this.#validate();

      await this.#processFilters();

      this.configured = true;
      return;
    }

    // no config file supplied, look in the default locations
    const fp = DEFAULT_CONFIG_LOCATIONS.find((filePath) =>
      fs.existsSync(resolve(`${filePath}/${DEFAULT_CONFIG_FILENAME}`))
    );

    if (!fp) {
      throw new Error("No git-sc configuration file found");
    }

    const fileName = resolve(`${fp}/${DEFAULT_CONFIG_FILENAME}`);

    if (this.debug)
      console.log(`Attempting to load configuration from ${fileName}`);

    this.#storeConfig(fileName);
    this.#validate();

    await this.#processFilters();

    this.configured = true;
  }

  async #processFilters() {
    if (
      !FILTERED_COMMANDS.includes(this.currentCommand) ||
      !this.opts[this.currentCommand]?.filters
    )
      return;

    this.opts[this.currentCommand].filters = new Filter(
      this.opts[this.currentCommand].filters
    );
    await this.opts[this.currentCommand].filters.unpack();
  }

  toString(pretty = true) {
    return JSON.stringify(this.opts, null, pretty ? 2 : undefined);
  }

  dump() {
    console.log(this.toString());
  }
}

let config = null;

export const getConfig = () => {
  if (!config) config = new Config();

  return config;
};
