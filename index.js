#!/usr/bin/env node

// import {
// getStory,
// getWorkflows,
// getSelf,
//   setShortcutAPIKey,
// } from "./src/shortcut-client.js";

// import { stateDataFromNames } from "./src/shortcut-utils.js";

// setShortcutAPIKey("6249f759-d4f7-422e-a6d2-852632b6c1a0");

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

// import CommandParser from "./src/command-parser.js";

// const cp = CommandParser;
// cp.parse();

import { setShortcutAPIKey, getMembers } from "./src/shortcut-client.js";

setShortcutAPIKey("6249f759-d4f7-422e-a6d2-852632b6c1a0");

async function foo() {
  const members = await getMembers();

  console.log(
    `members: ${JSON.stringify(members.map((member) => member.profile.name))}`
  );
}

await foo();
await foo();

// product engineering workflow; has a list of states
// curl -X GET -H "Content-Type: application/json" -H "Shortcut-Token: 6249f759-d4f7-422e-a6d2-852632b6c1a0" -L "https://api.app.shortcut.com/api/v3/workflows/500000005"
