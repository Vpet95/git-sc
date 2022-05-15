export const DEFAULT_CONFIG_FILENAME = "gitscconf.json";
export const DEFAULT_CONFIG_LOCATIONS = ["./", "~/"];

export const DEFAULT_OPTIONS = {
  create: {
    parentBranch: "develop",
    parentBranchRemote: "origin",
    pullLatest: true,
    topicTaggingApiKey: "",
    rapidApiHost: "",
    branchPrefix: "sc",
    generatedNameWordLimit: 0,
    overwriteExistingBranch: false,
    createAndLinkToRemote: true,
  },
  common: {
    shortcutApiKey: "",
    localGitDirectory: process.cwd(),
    branchRemote: "origin",
  },
};
