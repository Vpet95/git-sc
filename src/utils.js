/**
 * Misc. utility functions to make my life easier
 */

import { URL } from "url";
import wordwrap from "wordwrapjs";

import psp from "prompt-sync-plus";
const prompt = psp();

export const includesAny = (source, ...values) => {
  if (!source) return false;

  const found = values.find((value, _, __) => source.includes(value));

  return Boolean(found);
};

export const includesAll = (source, ...values) => {
  if (!source) return false;

  const hasEvery = values.every((value, _, __) => source.includes(value));

  return Boolean(hasEvery);
};

export const assertSuccess = (status) => {
  if (!status.success) {
    console.error(status.output);
    process.exit();
  }
};

// is by no means intended to be a be-all-end-all URL formatter - I left out a ton of logic
// because I didn't need it in git-sc; however this is a really fascinating read:
// https://stackoverflow.com/a/29948396/3578493
export const generateURL = ({ baseURL, resource = null, params = null }) => {
  return `${baseURL}${
    resource !== null
      ? baseURL[baseURL.length - 1] === "/"
        ? resource
        : `/${resource}`
      : ""
  }${
    params
      ? `?${Object.keys(params)
          .map((key) => `${key}=${params[key]}`)
          .join("&")
          .replace(/\s/g, "%20")
          .replace(/"/g, "%22")}`
      : ""
  }`;
};

// yoinked from https://stackoverflow.com/a/55585593/3578493
// thanks pouya!
export const isValidURL = (urlString, protocols = ["http", "https"]) => {
  try {
    const url = new URL(urlString);
    return protocols
      ? url.protocol
        ? protocols.map((p) => `${p.toLowerCase()}:`).includes(url.protocol)
        : false
      : true;
  } catch (err) {
    return false;
  }
};

export const truncateString = (str, availableSpace) => {
  if (!str || str.length <= availableSpace) return str;

  return `${str.substr(0, availableSpace - 3)}...`;
};

export const wrapLog = (
  inputString,
  type = "log",
  width = process.stdout.columns
) => {
  const outputString = wordwrap.wrap(inputString, { width });

  switch (type) {
    case "warn":
      console.warn(outputString);
      break;
    case "error":
      console.error(outputString);
      break;
    case "log":
    default:
      console.log(outputString);
  }
};

const printSelectionList = (items) => {
  const maxPadLength = String(items.length).length;

  items.forEach((item, index) => {
    const indexAsStringLength = String(index + 1).length;
    const padLength = maxPadLength - indexAsStringLength;

    console.log(`${index + 1}: ${item}`.padStart(padLength));
  });
};

export const selectionPrompt = (
  items,
  repeatListing = false,
  allowEmpty = true,
  defaultValue = undefined
) => {
  printSelectionList(items);

  while (true) {
    const resp = prompt(`# | * ${allowEmpty ? " | ^C" : ""}: `).trim();

    if (resp.length === 0 && allowEmpty) {
      return defaultValue;
    } else if (resp === "*") {
      return items;
    } else if (!Number.isNaN(resp) && Math.sign(resp) === 1) {
      const digit = parseInt(resp, 10);

      if (digit <= items.length) return items[digit - 1]; // convert it back into an index
    }

    console.log("Please enter a valid selection");

    if (repeatListing) printSelectionList(items);
  }
};

export const multiSelectionPrompt = (
  items,
  repeatListing = false,
  allowEmpty = true,
  defaultValue = undefined
) => {
  printSelectionList(items);

  while (true) {
    const resp = prompt(`#s | * | ^C: `).trim();

    if (resp.length === 0 && allowEmpty) {
      return defaultValue;
    }

    if (resp === "*") return items;

    const digitList = resp.split(/[^\d]+/);
    const results = [];

    digitList.forEach((digitString) => {
      const digit = parseInt(digitString, 10);

      if (Number.isNaN(digit)) {
        console.error(
          `Couldn't parse a valid integer from ${digitString}, skipping`
        );
      } else if (digit > items.length) {
        console.error(`Value (${digit}) out of bounds, skipping`);
      } else {
        results.push(items[digit - 1]);
      }
    });

    if (results.length === 0) console.log("Please enter a valid selection");
    else return results;

    if (repeatListing) printSelectionList(items);
  }
};

export const extractStoryIdFromBranchName = (branchName, branchNameRegex) => {
  const result = branchName.match(branchNameRegex);

  return result?.groups?.ticketId;
};

export const underline = (str, customLength = null) =>
  `${str}\n${"-".repeat(customLength || str.length)}`;

export const completeStartsWith = (choices) => (enteredString) =>
  choices.filter((choice) => choice.indexOf(enteredString) === 0);

export const completeContains = (choices) => (enteredString) =>
  choices.filter((choice) => choice.includes(enteredString));

// credit to @code for https://stackoverflow.com/a/74514157/3578493
export class Time {
  constructor() {
    this.time = performance.now();
  }

  end() {
    // round number to lower decimal precision, like console.time()
    return `${(performance.now() - this.time).toFixed(3)} ms`;
  }
}
