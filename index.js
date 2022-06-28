#!/usr/bin/env node

import CommandParser from "./src/command-parser.js";
// import GitClient from "./src/git-client.js";

// const git = new GitClient({
//   dir: "/Users/vukpetrovic/git/hacks/test-repo",
//   debug: true,
// });

// console.log(git.listBranches());

const cp = CommandParser;
cp.parse();

// cp.dump();
