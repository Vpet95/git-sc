export const DEFAULT_CONFIG_FILENAME = "gitscconf.json";
export const DEFAULT_CONFIG_LOCATIONS = ["./", "~/"];

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
    only: [],
    not: [],
  },
};

export const DEFAULT_OPTIONS = {
  common: {
    shortcutApiKey: "",
    localGitDirectory: process.cwd(),
    primaryBranch: "develop",
    primaryBranchRemote: "origin",
  },
  create: {
    pullLatest: true,
    topicTaggingApiKey: "",
    rapidApiHost: "",
    branchPrefix: "sc",
    branchKeywordCountLimit: 5,
    branchRemote: "origin",
    overwriteExistingBranch: false,
    createAndLinkToRemote: true,
  },
  delete: {
    force: false,
    remote: false,
    filters: structuredClone(branchDeletionFilters),
  },
  clean: {
    force: false,
    remote: false,
    onTicketNotFound: "",
    filters: structuredClone(branchDeletionFilters),
  },
  open: {
    shortcutWorkspace: "",
  },
};

export const UNDELETABLE_BRANCHES = ["develop", "main", "master"];
