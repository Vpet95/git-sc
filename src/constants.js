export const DEFAULT_CONFIG_FILENAME = "gitscconf.json";
export const DEFAULT_CONFIG_LOCATIONS = ["./", "~/"];

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
    remote: true,
    stateFilter: {
      states: [],
      andAbove: false,
      andBelow: false,
      inBetween: false,
    },
  },
  open: {
    shortcutWorkspace: "",
  },
};

export const UNDELETABLE_BRANCHES = ["develop", "main", "master"];
