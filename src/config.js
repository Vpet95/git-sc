import { resolve } from "path";
import fs from "fs";
import Joi from "joi";
import {
  DEFAULT_CONFIG_FILENAME,
  DEFAULT_CONFIG_LOCATIONS,
  DEFAULT_OPTIONS,
} from "./constants.js";
import { includesAny } from "./utils.js";
import { setShortcutAPIKey } from "./shortcut-client.js";
import { stateDataFromNames } from "./shortcut-utils.js";
import GitClient from "./git-client.js";

const refValidator = (value, helpers) => {
  if (GitClient.isValidRefName(value)) return value;

  return helpers.error("any.invalid");
};

const deleteBranchFilterSchema = Joi.object({
  stateFilter: Joi.object({
    exactly: Joi.array().items(Joi.string()),
    inBetween: Joi.object({
      lowerBound: Joi.string(),
      upperBound: Joi.string(),
    }),
    andAbove: Joi.string(),
    andBelow: Joi.string(),
  }),
  ownerFilter: Joi.object({
    any: Joi.array().items(Joi.string()),
    not: Joi.array().items(Joi.string()),
  }),
});

const purgeSchema = Joi.object({
  force: Joi.boolean(),
  remote: Joi.boolean(),
  filter: deleteBranchFilterSchema,
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
  }).required(),
  create: Joi.object({
    pullLatest: Joi.boolean(),
    topicTaggingApiKey: Joi.string().min(1), // basically, non-empty
    rapidApiHost: Joi.string().pattern(/^.*\.rapidapi.com$/),
    branchPrefix: Joi.string(),
    branchKeywordCountLimit: Joi.number().integer().min(0),
    branchRemote: Joi.string().custom(refValidator),
    overwriteExistingBranch: Joi.boolean(),
    createAndLinkToRemote: Joi.boolean(),
  }).with("topicTaggingApiKey", "rapidApiHost"),
  delete: purgeSchema,
  clean: purgeSchema.concat(
    Joi.object({
      onTicketNotFound: Joi.string()
        .valid("delete", "error", "skip")
        .insensitive()
        .required(),
    })
  ),
  open: Joi.object({
    shortcutWorkspace: Joi.string().allow(""),
  }),
});

class Config {
  configured = false;
  debug = false;
  verbose = false;
  opts = structuredClone(DEFAULT_OPTIONS);

  validate() {
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
          console.error(
            `"${errorDetail?.context?.label}" must be a valid git ref - see: https://stackoverflow.com/a/3651867/3578493`
          );
        } else {
          console.error(errorDetail?.message);
        }
      });

      console.error(`Your settings:\n${JSON.stringify(this.opts, null, 2)}`);
      process.exit();
    }

    // on initial release we don't want to allow multiple filter options at once.
    // Validating whether the resulting filter makes any sense is more trouble than it's worth; also a single filter covers most if not all use cases
    if (this.opts.delete && this.opts.delete.filters.stateFilter) {
      let optionCount = 0;

      if (this.opts.delete.filters.stateFilter.exactly) optionCount++;
      if (this.opts.delete.filters.stateFilter.andAbove) optionCount++;
      if (this.opts.delete.filters.stateFilter.andBelow) optionCount++;
      if (this.opts.delete.filters.stateFilter.inBetween) optionCount++;

      if (optionCount > 1) {
        console.error(
          "Multiple filter conditions detected in the delete options stateFilter.\nPlease review your settings and narrow the stateFilter to one condition."
        );
        process.exit();
      } else if (optionCount === 0) {
        // looks like they started writing a filter and got distracted by a shiny object. Deleting branches is serious and I would rather
        // risk being annoying and have the user double-check than delete an unintended branch
        console.error(
          "No options were provided to the stateFilter.\nExpected one of 'exactly', 'inBetween', 'andAbove', 'andBelow'"
        );
        process.exit();
      }
    }

    // todo - remove
    //process.exit();
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

  all() {
    return this.opts;
  }

  describe() {
    const defaults = structuredClone(DEFAULT_OPTIONS);

    defaults.create.topicTaggingApiKey =
      "<optional; your Twinword API key here - to obtain one go to https://rapidapi.com/twinword/api/topic-tagging/>";
    defaults.create.rapidApiHost =
      "<optional; your RapidAPI host here - to obtain one go to https://rapidapi.com/twinword/api/topic-tagging/>";
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
    } catch (e) {
      console.error(`Could not process or store configuration.\n${e.message}`);
      process.exit();
    }
  }

  load(configFile) {
    if (this.configured) return;

    if (configFile) {
      if (this.debug)
        console.log(`Attempting to load configuration from ${configFile}`);

      this.#storeConfig(configFile);
      this.validate();

      this.configured = true;
      return;
    }

    // no config file supplied, look in the default locations
    DEFAULT_CONFIG_LOCATIONS.every((loc) => {
      const fileName = resolve(`${loc}/${DEFAULT_CONFIG_FILENAME}`);

      if (this.debug)
        console.log(`Attempting to load configuration from ${fileName}`);

      if (fs.existsSync(fileName)) {
        this.#storeConfig(fileName);
        this.validate();
        this.configured = true;

        return false; // exits the loop
      }

      return true;
    });
  }

  async #processStateFilter(stateFilter) {
    if (stateFilter.exactly && stateFilter.exactly.length)
      stateFilter.exactly = await stateDataFromNames(stateFilter.exactly);
    else if (stateFilter.andBelow)
      stateFilter.andBelow = (
        await stateDataFromNames([stateFilter.andBelow])
      )[0];
    else if (stateFilter.andAbove)
      stateFilter.andAbove = (
        await stateDataFromNames([stateFilter.andAbove])
      )[0];
    else if (stateFilter.inBetween) {
      const results = await stateDataFromNames([
        stateFilter.inBetween.lowerBound,
        stateFilter.inBetween.upperBound,
      ]);

      stateFilter.inBetween.lowerBound = results[0];
      stateFilter.inBetween.upperBound = results[1];
    }
  }

  async #processOwnerFilter(ownerFilter) {}

  // pre-processes filters for the given command so there's less async work to do later on
  // when the command is actually being executed
  async processFilters(commandName) {
    if (
      this.opts[commandName] == undefined ||
      this.opts[commandName].filters == undefined
    ) {
      return;
    }

    setShortcutAPIKey(this.opts.common.shortcutApiKey);

    if ("stateFilter" in this.opts[commandName].filters) {
      await this.#processStateFilter(
        this.opts[commandName].filters.stateFilter
      );
    }

    if ("ownerFIlter" in this.opts[commandName].filters) {
      await this.#processOwnerFilter(
        this.opts[commandName].filters.ownerFilter
      );
    }

    return;
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
