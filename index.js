// import {
//   getMembers,
//   setShortcutAPIKey,
// } from "./src/shortcut-lib/shortcut-client.js";
import CommandParser from "./src/command-parser.js";

const cp = CommandParser;
cp.parse();

// setShortcutAPIKey("62ddad2c-9193-4687-bbc8-6482b4043a65");

// async function foo() {
//   const members = await getMembers();

//   console.log(JSON.stringify(members, null, 2));
// }

// foo();
