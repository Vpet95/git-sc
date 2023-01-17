import { getConfig } from "./config.js";
import { FORMAT_TICKET_ID, FORMAT_TITLE } from "./constants.js";

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

  // consider also filtering out adverbs
  const newName = name
    .toLowerCase()
    // slashes are typically used to separate two words, we want to preserve that separation
    .replace(/[\/\\]/g, " ")
    // most other forms of punctuation will typically include parens () and single-quotes, e.g. "can't"
    .replace(/[^\w_\s]/g, "")
    .split(/\s/)
    .filter((word) => word.length > 0 && !skipWords.includes(word))
    .slice(0, limit ? limit : Number.POSITIVE_INFINITY)
    .join("-");

  // if we somehow filtered out the entire name, just return the original
  return newName.length ? newName : name;
};

export const generateName = (storyId, storyName) => {
  const { branchKeywordCountLimit } = getConfig().createOptions;
  const { branchNameFormat } = getConfig().commonOptions;

  return branchNameFormat
    .replace(FORMAT_TICKET_ID.syntax, `${storyId}`)
    .replace(
      FORMAT_TITLE.syntax,
      filterAndTransform(storyName, branchKeywordCountLimit)
    );
};
