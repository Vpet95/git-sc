export const DEFAULT_CONFIG_FILENAME = "gitscconf.json";
export const DEFAULT_CONFIG_LOCATIONS = ["./", "~/"];

export const DEFAULT_OPTIONS = {
  common: {
    shortcutApiKey: "",
    localGitDirectory: process.cwd(),
    branchRemote: "origin",
  },
  create: {
    parentBranch: "develop",
    parentBranchRemote: "origin",
    pullLatest: true,
    topicTaggingApiKey: "",
    rapidApiHost: "",
    branchPrefix: "sc",
    branchKeywordCountLimit: 5,
    overwriteExistingBranch: false,
    createAndLinkToRemote: true,
  },
  open: {
    shortcutWorkspace: "",
  },
};
