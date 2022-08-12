import { getWorkflows, getState } from "./shortcut-client.js";

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

// takes a list of Shortcut stories, grabs only unique states from the given ids, and then
// sorts the stories by the 'position' of their states - this will typically be in ticket progress order
export const sortStoriesByUniqueStateIds = async (stories) => {
  const states = {};
  const results = [];

  for (let i = 0; i < stories.length; ++i) {
    const story = stories[i];

    if (story.workflow_state_id in states) {
      results.push({ ...story, state: states[story.workflow_state_id] });
      continue;
    }

    const stateData = await getState(story.workflow_state_id);
    const sliceOfData = {
      name: stateData.name.trim(),
      position: stateData.position,
    };
    states[story.workflow_state_id] = sliceOfData;

    results.push({ ...story, state: sliceOfData });
  }

  return results.sort((a, b) => a.state.position - b.state.position);
};
