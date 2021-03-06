/**
 * Misc. utility functions to make my life easier
 */

import { URL } from "url";
import wordwrap from "wordwrapjs";

import promptSync from "prompt-sync";
const prompt = promptSync();

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

export const generateURL = ({ baseURL, resource = null, params = [] }) => {
  return `${baseURL}${
    resource !== null
      ? baseURL[baseURL.length - 1] === "/"
        ? resource
        : `/${resource}`
      : ""
  }${
    params.length
      ? `?${params.reduce(
          (prev, current) =>
            prev.length === 0
              ? `${current.name}=${current.value.replaceAll(/\s/g, "%20")}`
              : `${prev}&${current.name}=${current.value.replaceAll(
                  /\s/g,
                  "%20"
                )}`,
          ""
        )}`
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
  returnOnEmpty = undefined
) => {
  printSelectionList(items);

  while (true) {
    const resp = prompt(`#${allowEmpty ? " | <enter>" : ""}: `).trim();

    if (resp.length === 0 && allowEmpty) {
      return returnOnEmpty;
    } else if (!Number.isNaN(resp) && Math.sign(resp) === 1) {
      if (parseInt(resp, 10) <= items.length)
        return items[parseInt(resp, 10) - 1]; // convert it back into an index
    }

    console.log("Please enter a valid selection");

    if (repeatListing) printSelectionList(items);
  }
};

/* According to Shortcut support: 
   Shortcut doesn't have a maximum value for entity IDs on the backend so the number of digits 
   would increase with the more entities created. When an Organization is first created, 
   a random value is assigned to the first entity created (e.g. Story, Epic) and then each 
   entity afterwards is assigned a sequential value.

   The first entity would be any number > 0.
   
   This is quite broad, so we have to check to see if there is more than a single group of 
   numbers within the name, and error out in those cases. Probably better than exhaustively
   testing every possible ID contained within a branch name. */

export const extractStoryIdFromBranchName = (branchName) => {
  const idPattern = /\d+/;
  const result = branchName.match(idPattern);

  if (result === null) return result;

  const storyId = result[0];
  const nextIndex = storyId.length + result.index;

  if (
    nextIndex < branchName.length &&
    branchName.substring(nextIndex).match(idPattern) !== null
  ) {
    console.error(
      `Multiple possible id groups found in branch name '${branchName}'`
    );
    process.exit();
  }

  return storyId;
};
