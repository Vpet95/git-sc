import { resolve } from "path";
import fs from "fs";
import Joi from "joi";
import {
  DEFAULT_CONFIG_FILENAME,
  DEFAULT_CONFIG_LOCATIONS,
  DEFAULT_OPTIONS,
} from "./constants.js";
import { includesAny } from "./utils.js";
import { shortcutConfig } from "./shortcut-client.js";
import { stateDataFromNames } from "./shortcut-utils.js";
import GitClient from "./git-client.js";

const refValidator = (value, helpers) => {
  if (GitClient.isValidRefName(value)) return value;

  return helpers.error("any.invalid");
};

const purgeSchema = Joi.object({
  force: Joi.boolean(),
  remote: Joi.boolean(),
  mineOnly: Joi.boolean(),
  stateFilter: Joi.object({
    exactly: Joi.array().items(Joi.string()),
    inBetween: Joi.object({
      lowerBound: Joi.string(),
      upperBound: Joi.string(),
    }),
    andAbove: Joi.string(),
    andBelow: Joi.string(),
  }),
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
    if (this.opts.delete && this.opts.delete.stateFilter) {
      let optionCount = 0;

      if (this.opts.delete.stateFilter.exactly) optionCount++;
      if (this.opts.delete.stateFilter.andAbove) optionCount++;
      if (this.opts.delete.stateFilter.andBelow) optionCount++;
      if (this.opts.delete.stateFilter.inBetween) optionCount++;

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

  load(configFile) {
    if (this.configured) return;

    if (configFile) {
      try {
        if (this.debug)
          console.log(`Attempting to load configuration from ${configFile}`);

        Object.assign(this.opts, JSON.parse(fs.readFileSync(configFile)));
      } catch (e) {
        console.error(
          `Could not parse configuration file ${configFile}\n${e.message}`
        );
        process.exit();
      }

      this.validate();

      this.configured = true;
      return;
    }

    // no config file supplied, look in the default locations
    DEFAULT_CONFIG_LOCATIONS.every((loc) => {
      const fileName = resolve(`${loc}/${DEFAULT_CONFIG_FILENAME}`);

      try {
        if (this.debug)
          console.log(`Attempting to load configuration from ${fileName}`);

        const data = fs.readFileSync(fileName);

        try {
          Object.assign(this.opts, JSON.parse(data));
          this.validate();

          this.configured = true;
          return false;
        } catch (e) {
          console.error(
            `Could not parse configuration file ${fileName}\n${e.message}`
          );
          process.exit();
        }
      } catch (e) {
        /* file likely doesn't exist - do nothing */
        if (this.debug)
          console.log(`Could not open file ${fileName}\n${e.message}`);
      }

      return true;
    });
  }

  // enriches the stateFilter to something more useful to the app
  async processDeleteOptions() {
    if (!this.opts.delete || !this.opts.delete.stateFilter) return;
    const stateFilter = this.opts.delete.stateFilter;

    shortcutConfig(this.opts.common.shortcutApiKey);

    if (stateFilter.exactly && stateFilter.exactly.length)
      this.opts.delete.stateFilter.exactly = await stateDataFromNames(
        stateFilter.exactly
      );
    else if (stateFilter.andBelow)
      this.opts.delete.stateFilter.andBelow = (
        await stateDataFromNames([stateFilter.andBelow])
      )[0];
    else if (stateFilter.andAbove)
      this.opts.delete.stateFilter.andAbove = (
        await stateDataFromNames([stateFilter.andAbove])
      )[0];
    else if (stateFilter.inBetween) {
      const results = await stateDataFromNames([
        stateFilter.inBetween.lowerBound,
        stateFilter.inBetween.upperBound,
      ]);

      this.opts.delete.stateFilter.inBetween.lowerBound = results[0];
      this.opts.delete.stateFilter.inBetween.upperBound = results[1];
    }
  }
}

let config = null;

export const getConfig = () => {
  if (!config) config = new Config();

  return config;
};
