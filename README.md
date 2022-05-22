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
  -V, --version               output the version number
  --debug                     Determines whether git-sc outputs status and debug messages to the console
  -c, --config <file>         Path to a JSON configuration file containing git-sc program options.
                               If omitted, git-sc will look for a file named `gitscconf.json` in the
                              current directory,         then in the home directory. If no such
                              configuration files are found, git-sc will attempt         to run with
                              reasonable defaults, if possible.
  -h, --help                  display help for command

Commands:
  init [options] [file name]  Generates a template JSON configuration file for git-sc
  create <story id>           Creates a new git branch by generating a name from the given Shortcut story
                              denoted by <story id>
  open [options] <story id>   Opens the given Shortcut story in the default web browser
  help [command]              display help for command
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

- `SC_TOKEN`: specifies the Shortcut API key
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
- [ ] Command to easily delete branches based on shortcut story id
- [ ] Command to clean up local branch list based on branch status (configurable)
- [ ] Command to add to-dos
- [x] Command to open shortcut story in default browser
- [ ] Hijack `status` to include Shortcut story status
- [ ] Hijack `commit` to send updates to Shortcut
- [ ] Interactive mode / prompting
- [ ] Rewrite git integration to make use of a more robust API
- [ ] Test on Windows, update accordingly

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

## License

[MIT](https://choosealicense.com/licenses/mit/)

If you're enjoying git-sc, why not [buy me a coffee](https://www.buymeacoffee.com/vukiepookie) ☕️?
