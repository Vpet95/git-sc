import { getWorkflows, getState, getEpic } from "./shortcut-client.js";

// grabs the state id and position - position refers to the ordering of states
// (e.g. 'Scheduled for Dev' is to the left of 'On Dev'); i.e. higher position = more "done"
const getStateData = (workflows, stateName) => {
  for (const workflow of workflows) {
    const stateObj = workflow.states.find((state) => {
      return state.name === stateName;
    });

    if (stateObj !== undefined) {
      return { id: stateObj.id, position: stateObj.position };
    }
  }

  console.warn(
    `State name '${stateName}' does not map to any known ticket states in your Shortcut workspace; ignoring`
  );

  return undefined;
};

export const stateDataFromNames = async (stateNames) => {
  const workflows = await getWorkflows().catch((e) => {
    throw new Error(e);
  });

  const states = stateNames.map((stateName) =>
    getStateData(workflows, stateName)
  );

  return states.filter((elem) => elem !== undefined);
};

export const groupStoriesByState = async (stories) => {
  const states = {};
  const results = {};

  const epicified = await fillAndSortByEpicName(stories);

  for (let i = 0; i < epicified.length; ++i) {
    const story = epicified[i];

    // convert state id to state object, or grab existing state object
    const stateObj =
      story.workflow_state_id in states
        ? states[story.workflow_state_id]
        : await getState(story.workflow_state_id);

    // weirdly, some of our states have trailing spaces
    stateObj.name = stateObj.name.trim();

    if (stateObj.name in results) {
      results[stateObj.name].stories.push(story);
    } else {
      results[stateObj.name] = {
        stories: [story],
        position: stateObj.position,
      };
    }

    if (!(story.workflow_state_id in states))
      states[story.workflow_state_id] = stateObj;
  }

  return results;
};

export const sortStoriesByState = (stories) => {
  const storyMap = [];

  for (const state in stories) {
    storyMap.push([state, stories[state]]);
  }

  storyMap.sort((a, b) => a[1].position - b[1].position);

  return Object.fromEntries(storyMap);
};

export const fillAndSortByEpicName = async (stories) => {
  // needed a for-loop here since I'm caching the epics
  // and I want to make sure they're available before the next story with the same
  // epic id runs through getEpic
  for (let story of stories) {
    if (!story.epic_id) {
      story.epicName = "<No epic>";
      continue;
    }

    const { name } = await getEpic(story.epic_id);

    story.epicName = name;
  }

  return stories.sort((a, b) => a.epicName.localeCompare(b.epicName));
};
