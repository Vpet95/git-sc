export const PROGRAM_VERSION = "1.0.0";
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
  common: {
    shortcutApiKey: "",
    localGitDirectory: process.cwd(),
    primaryBranch: "develop",
    primaryBranchRemote: "origin",
    shortcutWorkspace: "",
  },
  create: {
    pullLatest: true,
    branchPrefix: "sc",
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
    filters: structuredClone(branchDeletionFilters),
    prompt: true,
  },
  clean: {
    force: false,
    remote: false,
    onTicketNotFound: "skip",
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

export const TICKET_ID_PROMPT = "Ticket ID | <enter>: ";

export const NOTFOUND_ABORT = 0;
export const NOTFOUND_DELETE = 1;
export const NOTFOUND_SKIP = 2;
