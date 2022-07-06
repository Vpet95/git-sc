#!/usr/bin/env node

// import {
// getStory,
// getWorkflows,
// getSelf,
//   shortcutConfig,
// } from "./src/shortcut-client.js";

// import { stateDataFromNames } from "./src/shortcut-utils.js";

// shortcutConfig("6249f759-d4f7-422e-a6d2-852632b6c1a0");

// async function foo() {
//   const result = await getWorkflows().catch((e) => {
//     console.log(e);
//     return;
//   });

//   console.log(result);
// }

// foo();

// async function bar() {
//   const stateNames = ["Scheduled for Dev", "In Review", "On Dev"];
//   const stateData = await stateDataFromNames(stateNames);

//   console.log(stateData);
// }

// bar();

import CommandParser from "./src/command-parser.js";

const cp = CommandParser;
cp.parse();

// cp.dump();

// product engineering workflow; has a list of states
// curl -X GET -H "Content-Type: application/json" -H "Shortcut-Token: 6249f759-d4f7-422e-a6d2-852632b6c1a0" -L "https://api.app.shortcut.com/api/v3/workflows/500000005"
