import { resolve } from "path";
import fs from "fs";
import Joi from "joi";
import {
  DEFAULT_CONFIG_FILENAME,
  DEFAULT_CONFIG_LOCATIONS,
  DEFAULT_OPTIONS,
} from "./constants.js";
import { includesAny } from "./utils.js";
import GitClient from "./git-client.js";

const refValidator = (value, helpers) => {
  if (GitClient.isValidRefName(value)) return value;

  return helpers.error("any.invalid");
};

// we're allowing unknown fields because they shouldn't disrupt our logic
const optionsSchema = Joi.object({
  create: Joi.object({
    parentBranch: Joi.string().custom((value, helpers) => {
      if (GitClient.isValidBranchName(value)) return value;

      return helpers.error("any.invalid");
    }, "must be a valid git branch name"),
    parentBranchRemote: Joi.string().custom(
      refValidator,
      "must be a valid git ref"
    ),
    pullLatest: Joi.boolean(),
    topicTaggingApiKey: Joi.string().min(1), // basically, non-empty
    rapidApiHost: Joi.string().pattern(/^.*\.rapidapi.com$/),
    branchPrefix: Joi.string(),
    generatedNameWordLimit: Joi.number().integer().min(0),
    overwriteExistingBranch: Joi.boolean(),
    createAndLinkToRemote: Joi.boolean(),
  }).with("topicTaggingApiKey", "rapidApiHost"),
  common: Joi.object({
    shortcutApiKey: Joi.string().required(),
    // best we can do, really https://stackoverflow.com/a/537833/3578493
    localGitDirectory: Joi.string().pattern(/^[^\0]+$/),
    branchRemote: Joi.string().custom(refValidator),
  }),
});

class Config {
  configured = false;
  debug = false;
  opts = structuredClone(DEFAULT_OPTIONS);

  validate() {
    const validationResult = optionsSchema.validate(this.opts, {
      abortEarly: false,
      allowUnknown: true,
      debug: this.debug,
    });

    // console.log(JSON.stringify(validationResult, null, 2));

    if (validationResult.error) {
      console.error("ERROR: Configured settings failed to validate.\n");

      validationResult.error.details.map((errorDetail) => {
        if (
          includesAny(
            errorDetail?.context?.label,
            "parentBranch",
            "parentBranchRemote",
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
  }

  get debug() {
    return this.debug;
  }

  setDebug(value) {
    this.debug = value;
  }

  get createOpts() {
    return this.opts.create;
  }

  get commonOpts() {
    return this.opts.common;
  }

  all() {
    return this.opts;
  }

  describe() {
    const defaults = structuredClone(DEFAULT_OPTIONS);

    defaults.create.twinwordApiKey =
      "<optional; your Twinword API key here - to obtain one go to https://rapidapi.com/twinword/api/topic-tagging/>";
    defaults.create.rapidapiHost =
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
}

let config = null;

export const getConfig = () => {
  if (!config) config = new Config();

  return config;
};
