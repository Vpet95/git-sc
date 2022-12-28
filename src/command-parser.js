import { resolve } from "path";
import * as commander from "commander";

import { DEFAULT_CONFIG_FILENAME } from "./constants.js";
import { getConfig } from "./config.js";
import { initializeGitClient } from "./git-lib/git-client.js";
import {
  initApp,
  createBranch,
  storyIdToBranchName,
  deleteBranch,
  cleanBranches,
  openStory,
  listStories,
} from "./app.js";

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
        "A tool that blends integrates git and Shortcut workflows so you never have to leave the terminal"
      )
      .version("1.0.0")
      .option(
        "--debug",
        "Determines whether git-sc outputs status and debug messages to the console"
      )
      .option(
        "-c, --config <file>",
        `Path to a JSON configuration file containing git-sc program options.
If omitted, git-sc will look for a file named 'gitscconf.json' in the current directory,
then in the home directory. If no such configuration files are found, git-sc will attempt
to run with reasonable defaults, if possible.`
      )
      .option(
        "-v, --verbose",
        "Determines whether commands output more verbose information while processing or prompting"
      )
      .hook("preAction", async (thisCommand, actionCommand) => {
        /* Loads program configuration options prior to any command action. We exclude init because init itself 
           is supposed to generate a brand new configuration file, so it wouldn't make sense to look for existing ones */
        if ("debug" in program.opts())
          this.config.setDebug(program.opts().debug);
        if ("verbose" in program.opts())
          this.config.setVerbose(program.opts().verbose);

        const name = actionCommand.name();
        this.config.currentCommand = name;

        if (name !== "init") {
          await this.config.load(program.opts().config);

          initializeGitClient(
            this.config.commonOptions.localGitDirectory,
            this.config.debug
          );
        }
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
      .argument("[story id]")
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
        "Does not check if the associated shortcut story is in a 'done' state, and does not prompt",
        false
      )
      .option(
        "-r, --remote",
        "Determines whether the remote branch linked to the local branch should be deleted as well",
        false
      )
      .description(
        "Deletes a git branch pertaining to the given shortcut story - checking first if the story is in a 'done' state. If <story id> is omitted, attempts to delete the currently checked out branch."
      )
      .action((storyId, options, __) => {
        const branchName = storyIdToBranchName(storyId);

        deleteBranch(branchName, storyId, options.remote, options.force);
      });

    const cleanCommand = new commander.Command("clean");
    cleanCommand
      .option(
        "-f, --force",
        "Does not check if the associated shortcut story is in a 'done' state, and does not prompt",
        false
      )
      .option(
        "-r, --remote",
        "Determines whether the remote branch linked to the local branch should be deleted as well",
        false
      )
      .description(
        "Systematically scans and deletes local branches that pass configured filters"
      )
      .action((options, __) => {
        cleanBranches(options.remote, options.force);
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

    const listCommand = new commander.Command("list");
    listCommand
      .option(
        "-a, --archived <t | f>",
        "Limits results to only stories that have or have not been archived"
      )
      .option(
        "-o, --owner <owner's mention name>",
        "The @mention name of the Shortcut user in your Workspace that owns the tickets"
      )
      .option(
        "-t, --type <ticket type>",
        "The type of Shortcut ticket to search for. Can be 'feature', 'bug', or 'chore'"
      )
      .option(
        "-e, --epic <search text>",
        "Limits results to only stories that belong to the given epic. Value does not need to be the full epic name."
      )
      .option(
        "--workflow-state <state>",
        "Limits results to only stories in the given workflow state"
      )
      .option(
        "--completion-state <state>",
        "Limits results to only stories with the given completion state"
      )
      .option(
        "-l, --limit <number>",
        "Limit search results to this number of items"
      )
      .description(
        "Lists Shortcut tickets by some configurable range. Defaults to tickets assigned to you."
      )
      .action((options, __) => {
        listStories(options);
      });

    program.addCommand(initCommand);
    program.addCommand(createCommand);
    program.addCommand(deleteCommand);
    program.addCommand(cleanCommand);
    program.addCommand(openCommand);
    program.addCommand(listCommand);

    program.parse();
  }
}

export default new CommandParser();
