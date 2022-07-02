import { resolve } from "path";
import * as commander from "commander";

import { DEFAULT_CONFIG_FILENAME } from "./constants.js";
import { getConfig } from "./config.js";
import { initApp, createBranch, deleteBranch, openStory } from "./app.js";

const program = commander.program;

class CommandParser {
  constructor() {
    this.config = getConfig();
  }

  /* In this version of git-sc I decided to clean up the list of available command-line options to only those that 
     are absolutely necessary to configure from the terminal. Everything else will be expected to be within the 
     configuration JSON file. This is opinionated, but I expect it will be how most people use the tool anyway. */
  parse() {
    program
      .name("git-sc")
      .description(
        "A tool that blends your git and Shortcut workflows so you don't need to leave the terminal"
      )
      .version("1.0.4")
      .option(
        "--debug",
        "Determines whether git-sc outputs status and debug messages to the console"
      )
      .option(
        "-c, --config <file>",
        "Path to a JSON configuration file containing git-sc program options. \
        If omitted, git-sc will look for a file named `gitscconf.json` in the current directory, \
        then in the home directory. If no such configuration files are found, git-sc will attempt \
        to run with reasonable defaults, if possible."
      )
      .hook("preAction", async (thisCommand, actionCommand) => {
        /* Loads program configuration options prior to any command action. We exclude init because init itself 
           is supposed to generate a brand new configuration file, so it wouldn't make sense to look for existing ones */
        if (program.opts().debug) this.config.setDebug(program.opts().debug);

        if (actionCommand.name() !== "init")
          this.config.load(program.opts().config);

        if (actionCommand.name() === "delete")
          await this.config.processDeleteOptions();
      });

    const initCommand = new commander.Command("init")
      .argument(
        "[file name]",
        "The name of the configuration file to generate",
        resolve(`./${DEFAULT_CONFIG_FILENAME}`)
      )
      .option(
        "-f, --force",
        "Determines whether to overwrite an existing configuration file if it exists",
        false
      )
      .description("Generates a template JSON configuration file for git-sc")
      .action((fileName, options, _) => {
        initApp(fileName, options.force);
      });

    const createCommand = new commander.Command("create");
    createCommand
      .argument("<story id>")
      .description(
        "Creates a new git branch by generating a name from the given Shortcut story denoted by <story id>"
      )
      .action((storyId, _, __) => {
        createBranch(storyId);
      });

    const deleteCommand = new commander.Command("delete");
    deleteCommand
      .argument("[story id]")
      .option(
        "-f, --force",
        "Does not check if the associated shortcut story is in a 'done' state, and does not prompt"
      )
      .option(
        "-r, --remote",
        "Determines whether the associated remote branch should be deleted as well"
      )
      .description(
        "Deletes a git branch pertaining to the given shortcut story - checking first if the story is in a 'done' state. If <story id> is omitted, attempts to delete the currently checkecd out branch."
      )
      .action((storyId, _, __) => {
        deleteBranch(storyId);
      });

    const openCommand = new commander.Command("open");
    openCommand
      .argument("<story id>")
      .option(
        "-w, --workspace <name>",
        "Supplies the Shortcut workspace name",
        ""
      )
      .description("Opens the given Shortcut story in the default web browser")
      .action((storyId, options, __) => {
        openStory(storyId, options.workspace);
      });

    program.addCommand(initCommand);
    program.addCommand(createCommand);
    program.addCommand(deleteCommand);
    program.addCommand(openCommand);

    program.parse();
  }
}

export default new CommandParser();
