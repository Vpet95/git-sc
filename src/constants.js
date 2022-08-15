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
export const QUOTED_SEARCH_QUERIES = ["epic", "state"];
export const MAX_SEARCH_RESULT_COUNT = 1000;
export const MAX_SEARCH_PAGE_SIZE = 25;

export const DEFAULT_OPTIONS = {
  common: {
    shortcutApiKey: "",
    localGitDirectory: process.cwd(),
    primaryBranch: "develop",
    primaryBranchRemote: "origin",
    shortcutWorkspace: "",
  },
  create: {
    pullLatest: true,
    topicTaggingApiKey: "",
    rapidApiHost: "",
    branchPrefix: "sc",
    branchKeywordCountLimit: 5,
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
    },
    limit: MAX_SEARCH_RESULT_COUNT,
  },
};

export const TICKET_ID_PROMPT = "Ticket ID | <enter>: ";
