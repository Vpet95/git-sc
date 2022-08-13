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
  search: {
    user: "self",
  },
};

export const UNDELETABLE_BRANCHES = ["develop", "main", "master"];
