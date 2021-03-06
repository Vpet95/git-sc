import { getConfig } from "./config.js";

// some useful part-of-speech info: https://english.stackexchange.com/questions/328961/what-type-of-words-are-the-a-of-etc-grouped-as

const articles = ["the", "a", "an"];

/* not exhaustive, but serves our needs. Source: 
https://outreach.ou.edu/media/filer_public/a2/d8/a2d8fbef-36fd-4f2e-84b6-b7bddf2b741f/mini_lesson_1-connectives.pdf */
const connectives = ["and", "also", "as", "in", "so", "then", "if", "from"];

/* Also not exhaustive, but likely to appear in tickets and add little extra value in branch names 
Source: https://www.englishclub.com/grammar/prepositions-list.htm
*/
const prepositions = [
  "at",
  "but",
  "by",
  "for",
  "into",
  "like",
  "of",
  "off",
  "on",
  "onto",
  "over",
  "per",
  "to",
  "than",
  "toward",
  "under",
  "like",
  "unlike",
  "until",
  "up",
  "upon",
  "via",
  "with",
  "within",
];

const verbs = ["has", "have", "be", "been"];

const adverbs = ["only"];

const quantifiers = [
  "much",
  "many",
  "few",
  "more",
  "no",
  "several",
  "less",
  "some",
  "none",
];

const skipWords = [
  ...articles,
  ...connectives,
  ...prepositions,
  ...verbs,
  ...adverbs,
  ...quantifiers,
];

export const filterAndTransform = (name, limit) => {
  if (typeof name !== "string")
    throw new Error("name supplied must be a valid string");

  if (!name.length) return name;

  const newName = name
    .split(" ")
    .map((word) => word.toLowerCase().replace(/[^a-zA-Z ]/g, ""))
    .filter((word) => !skipWords.includes(word))
    .slice(0, limit ? limit : Number.POSITIVE_INFINITY)
    .join("-");

  // if we somehow filtered out the entire name, just return the original
  return newName.length ? newName : name;
};

export const generateName = (storyId, storyName) => {
  const createOpts = getConfig().createOptions;

  return `${createOpts.branchPrefix}${storyId}/${filterAndTransform(
    storyName,
    createOpts.branchKeywordCountLimit
  )}`;
};
