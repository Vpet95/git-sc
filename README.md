![git-sc logo](./logos/git-sc%20logo%20A.jpeg)

✨ git-sc ✨ is a tool to help you quickly and easily integrate your [git](https://git-scm.com/) and [Shortcut](https://shortcut.com/) workflows so you never have to leave your terminal.

Note - this is still early in development and bound to contain non-backwards-compatible changes in the future.

## Installation

Use the [npm](https://www.npmjs.com/) package manager to install git-sc globally:

```bash
npm install -g @vpet95/git-sc
```

Alternatively, you can run git-sc directly via [npx](https://www.npmjs.com/package/npx).

## Prerequisites

git-sc requires a Shortcut API token to run - please read [the official help article](https://help.shortcut.com/hc/en-us/articles/205701199-Shortcut-API-Tokens) on generating your own Shortcut API token for more info.

Optionally, you may acquire a [Twinworld topic tagging](https://rapidapi.com/twinword/api/topic-tagging/) API token as well as a RapidAPI host name. At the time of this writing the free tier of the API will allow for 10k calls per month, which is more than sufficient for git-sc. The tool will still work without topic tagging, but may produce less sophisticated branch names using a simpler algorithm.

## Usage

Call git-sc with `--help` to see full usage:

```
Options:
  -V, --version                output the version number
  --debug                      Determines whether git-sc outputs status and debug messages to the console
  -c, --config <file>          Path to a JSON configuration file containing git-sc program options.
                                 If omitted, git-sc will look for a file named `gitscconf.json` in the
                               current directory,         then in the home directory. If no such
                               configuration files are found, git-sc will attempt         to run with
                               reasonable defaults, if possible.
  -h, --help                   display help for command

Commands:
  init [options] [file name]   Generates a template JSON configuration file for git-sc
  create <story id>            Creates a new git branch by generating a name from the given Shortcut
                               story denoted by <story id>
  delete [options] [story id]  Deletes a git branch pertaining to the given shortcut story - checking
                               first if the story is in a 'done' state. If <story id> is omitted,
                               attempts to delete the currently checkecd out branch.
  open [options] <story id>    Opens the given Shortcut story in the default web browser
  help [command]               display help for command
```

### Initializing

Running git-sc for the first time, it may be helpful to tell the tool to initialize a new JSON configuration file for you:

```
> git-sc init
Initialized git-sc configuration file in /path/to/your/file/gitscconf.json
```

This will create a new JSON file in your current directory. Alternatively, you can specify your own file location and name:

```
> git-sc init /fancy/path/to/my/custom-file-name.json
Initialized git-sc configuration file in /fancy/path/to/my/custom-file-name.json
```

If you choose to specify a custom file name, you will need to specify it again later when you interact with git-sc via commandline, since git-sc will look for files named `gitscconf.json` by default.

### Creating a Branch

git-sc will create a local branch for you based on the Shortcut story specified via its story id:

```
git-sc create <story-id>
```

By default git-sc will generate branch names following this scheme:

`<prefix><story id>/<hyphenated keywords>`

You can configure the branch prefix with the `branchPrefix` field in the configuration JSON - it currently defaults to 'sc' for 'Shortcut'. It may also be helpful to configure a limit on the number of words that can appear in the hyphenated keyword list for stories with particularly long titles. To do so, set a limit via the `branchKeywordCountLimit` field.

### Deleting a Branch

git-sc allows you to delete local and remote branches by specifying the Shortcut ticket id associated with the branch. The syntax follows:

```
git-sc delete [ticket id]
```

You can omit the ticket id and git-sc will attempt to delete the current branch. Note that the branch must have the related shortcut ticket id in its name for this command to work - e.g. if you used git-sc to generate the branch name in the first place.

git-sc will refuse to delete branches named `develop`, `main`, or `master` as these typically denote the root/trunk branches of a given repo. You can skip through this check with the `--force` option (see below).

By default, git-sc will do some additional safety checks and prompting to make sure only the intended branch gets deleted. This is skippable and configurable.

Since deletion happens by ticket id and not direct branch name, git-sc will also check to see if the supplied story id maps to multiple possible branch names and prompt for a selection from the user.

#### Force deleting

To skip safety checks and prompting, provide the command with the `--force` (or `-f`) option as in:

```
git-sc delete 12345 --force
```

NOTE: in addition to skipping Shortcut-related checks, the `--force` option will also ignore uncommitted changes and reset them, and perform the unsafe `-D` delete. Only use this option if you know what you're doing.

Duplicate branch name checking and prompting will not be skipped.

#### Delete remote branches

`git-sc delete` defaults to deleting local branches only. You can tell git-sc to delete any remotes associated with the given branch by specifying the `--remote` (or `-r`) command-line option, as in:

```
git-sc delete 12345 --remote
```

#### Safety Checks

For extra saftey you can configure git-sc to only allow deletion of branches whose Shortcut tickets are within a given range of states. The `gitscconf.json` file contains a `delete` section that allows you set up these state filters:

```
"delete": {
  "force": false,
  "remote": false,
  "filters": {
    "stateFilter": {
      "exactly": [],
      "inBetween": {
        "lowerBound": "",
        "upperBound": ""
      },
      "andAbove": "",
      "andBelow": ""
    },
    "ownerFilter": {
      "only": [],
      "not": []
    }
  }
},
```

The `stateFilter` above allows you to configure ranges of Shortcut ticket states through the four options:

- `exactly`: supply an array of strings corresponding to the names of the given states
- `inBetween`: specify the name of a starting state and an ending state; and git-sc will allow the deletion of any tickets that fall between these (inclusive)
- `andAbove`: specify the name of a state, and git-sc will allow deletion of any ticket that is within this state or above
- `andBelow`: specify the name of a state, and git-sc will allow deletion of any ticket that is within this state or below

**git-sc expects only one of the given options to be present in the state filter.**

States are strings representing the state of the work of the Shortcut ticket item, e.g. 'Backlog', 'In Review', 'Blocked', 'In Production', etc.

The `ownerFilter` above allows you to narrow down the list of potential branches to be deleted by a list of Shortcut ticket owner names. This filter accepts two options:

- `any`: supply an array of strings representing Shortcut ticket owner names to allow deletion
- `not`: the inverse of above - delete allowed if branch corresponds to a Shortcut ticket owned by someone not in this list.

Acceptable values for the owner filter options include:

- `"self"` - representing the currently authenticated user (via the Shortcut API key), a shorthand for referring to self without writing out your full name
- `<Shortcut user name>` - the name of any user in your Shortcut workspace - make sure it's written as it appears in the owner field of ticket items.

You use the `ownerFilter` in conjunction with the `stateFilter` to narrow down the deletable branch list further. For instance:

```
"filters": {
  "stateFilter": {
    "andAbove": "On Dev"
  },
  "ownerFilter": {
    "not": ["self"]
  }
}
```

The filter configuration above will allow git-sc to only delete branches associated with Shortcut tickets assigned to you, and are in a state of "On Dev" or above (e.g. On Prod, etc.)

### Opening a Shortcut Ticket

Use the `open` command to open a Shortcut ticket in your default browser from the terminal:

```
git-sc open <story-id>
```

This command requires knowledge of your Shortcut workspace name. You can specify it either with the `-w` or `--workspace` option, or through the configuration file via the `shortcutWorkspace` field. e.g.

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

#### Environment Variables

git-sc supports the following environment variables:

- `SC_KEY`: specifies the Shortcut API key
- `TWINWORD_TOKEN`: specifies the Twinword topic tagging API key
- `RAPID_HOST`: specifies the RapidAPI host URL

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
