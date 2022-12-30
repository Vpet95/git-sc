![git-sc logo](./logos/git-sc%20logo%20A.jpeg)

✨ git-sc ✨ is a tool that integrates your [git](https://git-scm.com/) and [Shortcut](https://shortcut.com/) workflows so you never have to leave your terminal.

This tool allows you to:

- Reduce jarring back-and-forth movement between your terminal and browser to reference Shortcut tickets or backlog information
- Reduce reliance on your mouse to copy and paste ticket ids or details when creating a new branch
- Automatically format all generated branch names to your organization's specific naming schema, because Naming Things is Hard(TM)
- Automatically clean up your local and remote branch lists based on the status of your Shortcut tickets
- Search Shortcut tickets without leaving your terminal based on pre-configured filters

## Installation

Use the [npm](https://www.npmjs.com/) package manager to install git-sc globally:

```bash
npm install -g @vpet95/git-sc
```

Alternatively, you can run git-sc directly via [npx](https://www.npmjs.com/package/npx).

## Prerequisites

git-sc requires that you have a Shortcut API token - please read [the official help article](https://help.shortcut.com/hc/en-us/articles/205701199-Shortcut-API-Tokens) on generating your own Shortcut API token for more info.

## Usage

Call git-sc with `--help` to see full usage:

```
Options:
  -V, --version                output the version number
  --debug                      Determines whether git-sc outputs status and debug messages to the console
  -c, --config <file>          Path to a JSON configuration file containing git-sc program options.         If omitted, git-sc will
                               look for a file named `gitscconf.json` in the current directory,         then in the home directory.
                               If no such configuration files are found, git-sc will attempt         to run with reasonable
                               defaults, if possible.
  -v, --verbose                Determines whether commands output more verbose information while processing or prompting
  -h, --help                   display help for command

Commands:
  init [options] [file name]   Generates a template JSON configuration file for git-sc
  create [story id]            Creates a new git branch by generating a name from the given Shortcut story denoted by <story id>
  delete [options] [story id]  Deletes a git branch pertaining to the given shortcut story - checking first if the story is in a
                               'done' state. If <story id> is omitted, attempts to delete the currently checkecd out branch.
  clean [options]              Systematically scans and deletes local branches that pass configured filters
  open [options] <story id>    Opens the given Shortcut story in the default web browser
  list [options]               Lists Shortcut tickets by some configurable range. Defaults to tickets assigned to you.
  help [command]               display help for command
```

### Configuration

git-sc relies on a JSON configuration file that specifes things like Shortcut ticket search criteria, git branch purge criteria, new branch name formatting options, and more. To generate an empty config file, run:

```
git-sc init [file name]
```

This creates a file named `gitscconf.json` in your current directory with some fields pre-filled with reasonable defaults. Other fields are pre-filled with instructions to help you configure them. This is a special/reserved file name, but any file name or location can be tacked on to the `init` command.

If you deviate from this pattern, you will need to specify the location and name in later commands with the `-c` option:

```
git-sc -c path/to/your/config/file.json <some command>
```

Next, configure the `common` section of this generated file - this section contains fields for info git-sc will need to know to perform many of its actions, including:

- `shortcutApiKey` - your Shortcut api key
- `localGitDirectory` - the directory of your local git repository (you can run git-sc from anywhere as long as this is pointing to the right place)
- `primaryBranch` - this designates the common parent branch for all branch creations done by git-sc. For many, this will be `develop`, `master`, or `main`.
- `primaryBranchRemote` - the git remote pertaining to the primary branch, typically `origin`
- `shortcutWorkspace` - the name of your Shortcut worksapce

### Creating a Branch

The `git-sc create` command allows the user to create local git branches from existing Shortcut tickets and has the following syntax:

```
git-sc create [ticket id]
```

The simplest use of this command involves passing in the Shortcut ticket id:

```
> git-sc create 12345
Checking out develop
Pulling latest changes...
Creating branch 'sc12345/some-branch-name-based-on-ticket'
```

Alternatively, you can run `git-sc create` without any arguments, which will launch an interactive mode. In this mode, git-sc will search Shortcut for tickets based on your configured search filters and recommend tickets as you type:

```
> git-sc create
Searching Shortcut stories...
Ticket ID | <enter>: 12
  12345 - Some pretty awesome ticket name here
  12346 - Another cool ticket name here
  12366 - A particularly long and tedious ticket name that is cut short...
  12555 - Final ticket that can display on this screen
  45 more...
```

Each character typed filters the suggested tickets down until one remaining suggestion, then the rest of the input is filled in. The `create` command is configured within the `create` field of the JSON configuration file, and contains the following fields:

- `pullLatest` - determines whether the `primaryBranch` should be updated prior to creating the new branch
- `branchPrefix` - determines a prefix string of characters to prepend to the generated branch name, defaults to "sc"
- `branchKeywordCountLimit` - determines the maximum number of individual words that can appear in generated branch names, defaults to 10
- `branchRemote` - determines the git remote for the branch being created, defaults to "origin"
- `createAndLinkToRemote` - determines whether git-sc should also create the remote branch with the same name, and set the local branch to track the remote, defaults to `true`
- `onBranchExists` - determines how to respond to existing branches, valid values include:
  - `"abort"` - warn the user the branch already exists, and do nothing
  - `"checkout"` - warn the user the branch already exists, and check it out (**this is the default behavior**)
  - `"overwrite"` - delete existing branch and create a new one with the same name
- `autocomplete` - determines the Shortcut search criteria used to generate list of autocomplete suggestions. See [Searching Shortcut]() for specific configuration options

### Deleting a Branch

The `git-sc delete` commands allows you to delete local git branches based on the desired Shortcut ticket state and/or ownership. The syntax follows:

```
git-sc delete [options] [story id]
```

Where `options` can be any of:

- `-f` or `--force` - bypasses all prompting and Shortcut story checking (default: `false`)
- `-r` or `--remote` - tells git-sc to delete the remote branch too (default: `false`)

Omitting the `story id` results in git-sc attempting to delete the currently checked out branch.

Supplying `story id` allows git-sc to validate the branch's Shortcut story state and ownership prior to attempting a delete. To do so, branches must have an identifiable Shortcut ticket id in their name (which is always the case for branches generated with git-sc) - otherwise the validation is skipped (an 'are you sure?' prompt will still show).

By default, git-sc refuses to delete branches named `develop`, `main`, or `master` as these typically denote the root/trunk branches of a given repo.

If multiple branch names contain the same story id, an additional selection prompt is shown.

```
> git-sc --verbose delete 12345 --remote
Multiple branches contain the story id 12345; select one, or hit enter to cancel
1: sc12345/a-third-branch-name-here-in-order-to-clash
2: sc12345/another-branch-name-here
3: sc12345/a-branch-name
4: sc12345/the-last-branch-name-here
# | <enter>: 3
Delete branch 'sc12345/a-branch-name'
 > Associated with ticket 'Some Shortcut ticket title here'
 > In work state: In Development
 > Assigned to: Jane Doe
y/[n]? y
Deleting local branch sc12345/a-branch-name and remote branch origin/sc12345/a-branch-name...
```

#### Force

Only use this option if you know what you're doing. `--force` will:

- Skip 'special branch' name checks
- Skip Shortcut ticket state and ownership validation
- Skip uncommitted changes checking
- Bypass prompts (except the 'multiple branches found' prompt)
- Runs the `git branch -D` command to force deletion

#### Configuration for Delete

The `gitscconf.json` file contains a section for the delete command, allowing you to configure safety checks to prevent accidental branch deletion. Options include:

- `force` - whether to bypass prompts and validation (default: `false`), see [Force](#force)
- `remote` - whether to delete remote branches in addition to local (default: `false`)
- `filters`
  - `stateFilter` - validates that the Shortcut ticket pertaining to the branch being deleted falls within a certain work state
    - `exactly` - an array of ticket state names (strings) (e.g. `["Done", "In Progress", "On Dev"]`), ticket pertaining to branch _must be_ in one of these states
    - `inBetween` - state must be between two states, inclusive
      - `lowerBound` - string
      - `upperBound` - string
    - `andAbove` - any state above, inclusive
    - `andBelow` - any state below, inclusive
  - `ownerFilter` - filters by who owns the Shortcut ticket
    - `only` - an of Shortcut user profile names (strings), only delete branches if any one of these users is listed as owner on the ticket
    - `not` - the inverse of `only` - only delete branches if all of the names here are not listed as owner on the ticket

**Notes on the state filter**

- Shortcut organizes ticket states into an ascending list, typically corresponding a level of ticket completion. Therefore the use of the state filter is entirely dependent on how your organization has defined ticket states within Shortcut.
  - For example, you might have: "Inbox", "Scheduled", "In Progress", "In QA", and "Done", in order; so a state filter of `andAbove: "In QA"` would allow the deletion of branches pertaining to tickets that are "In QA" or "Done"
  - git-sc does a case-sensitive state Shortcut workflow state lookup

**Notes on the owner filter**

- The names expected in the owner filter `only` and `not` arrays are the users' Shortcut profile names (not their @mention names).
- For convenience you can enter the string literal `"self"` in either of these arrays to target your own user (you are already identified by your Shortcut API key)

**Example configuration**

```
"filters": {
  "stateFilter": {
    "andAbove": "In QA"
  },
  "ownerFilter": {
    "only": ["self"]
  }
}
```

The filter configuration above will allow git-sc to delete branches associated pertaining to Shortcut tickets assigned to you, and are in a state of "In QA" or above (e.g. Tested, On Prod, etc.)

### Cleaning up Branches

The `git-sc clean` command tells git-sc to scan through the branches in your local repo, attempt to look up their associated Shortcut tickets, and based on configuration, delete them. The syntax follows:

```
git-sc clean [options]
```

Where `options` are identical to those listed under [Deleting a Branch](#deleting-a-branch). Configuration options for `clean` are also identical to those listed in [Configuration for Delete](#configuration-for-delete). The `clean` and `delete` options are distinct sections in the `gitscconf.json` file, e.g.

```json
{
  "delete": { etc },
  "clean": { etc }
}
```

### Opening a Shortcut Ticket

Use the `open` command to open a Shortcut ticket in your default browser from the terminal:

```
git-sc open <story-id>
```

This command requires knowledge of your Shortcut workspace name. You can specify it either with the `-w` or `--workspace` option, or through the configuration file via the `shortcutWorkspace` field under `common` options. e.g.

```
git-sc open 12345 -w myworkspace
```

### Configuration

#### JSON

git-sc requires a JSON configuration file to run properly. It will look for it in the following places, in order:

- The target specified via the `--config` command-line option
- The current directory
- The home directory (`~`)

If no configuration file is found, git-sc will quit.

## Roadmap

_Subject to change on a whim, and in no particular order_ 😅

- [x] Rewrite command interface and configuration logic
- [x] Configuration file validation
- [ ] Add unit tests
- [ ] More robust internal and external documentation
- [ ] More debug output
- [ ] Configuration file versioning
- [ ] More output name format configurability for `create`
- [ ] Exposing more Shortcut story fields for name formatting
- [x] Command to easily delete branches based on shortcut story id
- [ ] Command to clean up local branch list based on branch status (configurable)
- [ ] Command to add to-dos
- [x] Command to open shortcut story in default browser
- [ ] Hijack `status` to include Shortcut story status
- [ ] Hijack `commit` to send updates to Shortcut
- [ ] Interactive mode / prompting
- [ ] Rewrite git integration to make use of a more robust API
- [ ] Test on Windows, update accordingly
- [ ] Move app text to a common file

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

## License

[MIT](https://choosealicense.com/licenses/mit/)

If you're enjoying git-sc, why not [buy me a coffee](https://www.buymeacoffee.com/vukiepookie) ☕️?
