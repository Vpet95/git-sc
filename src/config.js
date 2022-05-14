import { DEFAULT_CONFIG_FILENAME, DEFAULT_OPTIONS } from "./constants.js";

class Config {
  configured = false;
  debug = false;
  opts = structuredClone(DEFAULT_OPTIONS);

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

  // todo implement
  validate() {}
}

let config = null;

export const getConfig = () => {
  if (!config) config = new Config();

  return config;
};
