import { getWorkflows } from "./shortcut-client.js";

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

  console.log(`Workflows: ${workflows.length}`);

  const states = stateNames.map((stateName) =>
    getStateData(workflows, stateName)
  );

  return states.filter((elem) => elem !== undefined);
};
