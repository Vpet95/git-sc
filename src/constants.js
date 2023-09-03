export const VERSION_MAJOR = 2;
export const VERSION_MINOR = 1;
export const VERSION_PATCH = 1;
export const PROGRAM_VERSION = `${VERSION_MAJOR}.${VERSION_MINOR}.${VERSION_PATCH}`;
export const SEMVER_REGEX = /(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)/;

export const DEFAULT_CONFIG_FILENAME = "gitscconf.json";
export const DEFAULT_CONFIG_LOCATIONS = ["./", "~/"];

export const FILTERED_COMMANDS = ["delete", "clean"];

const branchDeletionFilters = {
  stateFilter: {
    exactly: [],
    inBetween: {
      lowerBound: "",
      upperBound: "",
    },
    andAbove: "",
    andBelow: "",
  },
  ownerFilter: {
    any: [],
    not: [],
  },
};

export const UNDELETABLE_BRANCHES = ["develop", "main", "master"];
export const QUOTED_SEARCH_QUERIES = ["epic", "workflowState"];
export const MAX_SEARCH_RESULT_COUNT = 1000;
export const MAX_SEARCH_PAGE_SIZE = 25;

export const DEFAULT_OPTIONS = {
  meta: {
    version: PROGRAM_VERSION,
  },
  branch: {
    excludeDoneWork: true,
  },
  checkout: {
    excludeDoneWork: true,
  },
  common: {
    shortcutApiKey: "",
    localGitDirectory: process.cwd(),
    primaryBranch: "develop",
    primaryBranchRemote: "origin",
    shortcutWorkspace: "",
    branchNameFormat:
      "<required>: what will branches generated or parsed by git-sc look like?",
  },
  create: {
    pullLatest: true,
    branchKeywordCountLimit: 10,
    branchRemote: "origin",
    createAndLinkToRemote: true,
    onBranchExists: "checkout",
    autocomplete: {
      query: {
        owner: "self",
      },
    },
  },
  delete: {
    force: false,
    remote: false,
    onTicketNotFound: "abort",
    onNotFullyMerged: "abort",
    onError: "abort",
    filters: structuredClone(branchDeletionFilters),
    prompt: true,
  },
  clean: {
    force: false,
    remote: false,
    onTicketNotFound: "skip",
    onNotFullyMerged: "skip",
    onError: "skip",
    filters: structuredClone(branchDeletionFilters),
    prompt: true,
  },
  list: {
    query: {
      owner: "self",
      archived: false,
    },
    limit: MAX_SEARCH_RESULT_COUNT,
  },
};

export const TICKET_ID_PROMPT = "Ticket ID | ^C: ";
export const TICKET_SEARCH_PROMPT = "Search story | ^C to cancel: ";
export const CHECKOUT_PROMPT = "# | ^C to cancel: ";

export const NOTFOUND_ABORT = 0;
export const NOTFOUND_DELETE = 1;
export const NOTFOUND_SKIP = 2;

/**
 * Syntax represents how the user will interact with these concepts: e.g. they provide the string literal <title> in their config
 * Regex represents our knowledge of how we format these pieces within git-sc, i.e. what we expect git-sc generated branch names
 * to look like.
 *
 * At this time git-sc joins words within titles and separates them with hyphens.
 *
 * Regex is stored as regex here instead of string because formatting tools like Prettier remove back-slashes that
 * create invalid escape sequences from strings by default; so \d becomes d, which isn't intended
 */
export const FORMAT_TICKET_ID = {
  syntax: "<ticket-id>",
  regex: /(?<ticketId>\d+)/,
};

export const FORMAT_TITLE = {
  syntax: "<title>",
  regex: /(?<title>([^-]+-?)+)/,
};

export const BRANCH_NAME_FORMATTERS = [FORMAT_TICKET_ID, FORMAT_TITLE];
