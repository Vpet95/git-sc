import { getMembers, getState, getSelf } from "./shortcut-client.js";
import { stateDataFromNames } from "./shortcut-utils.js";

export class Filter {
  filter = null;

  constructor(filterJSON) {
    this.filter = filterJSON;
  }

  toString(pretty = true) {
    return JSON.stringify(this.filter, null, pretty ? 2 : undefined);
  }

  dump() {
    console.log(this.toString());
  }

  async #processStateFilter() {
    const sf = this.filter.stateFilter;

    if (sf.exactly) {
      this.filter.stateFilter.exactly = await stateDataFromNames(sf.exactly);
    } else if (sf.andBelow) {
      this.filter.stateFilter.andBelow = (
        await stateDataFromNames([sf.andBelow])
      )[0];
    } else if (sf.andAbove) {
      this.filter.stateFilter.andAbove = (
        await stateDataFromNames([sf.andAbove])
      )[0];
    } else if (sf.inBetween) {
      const results = await stateDataFromNames([
        sf.inBetween.lowerBound,
        sf.inBetween.upperBound,
      ]);

      this.filter.stateFilter.inBetween.lowerBound = results[0];
      this.filter.stateFilter.inBetween.upperBound = results[1];
    }
  }

  async #processNameFilterList(nameList) {
    const members = await getMembers();

    return await Promise.all(
      nameList.map(async (name) => {
        if (name.toLowerCase() === "self") {
          const self = await getSelf();
          return self.id;
        }

        const member = members.find(
          (m) => m.profile.name.toLowerCase() === name.toLowerCase()
        );

        if (member === undefined) {
          throw new Error(
            `Error: name '${name}' does not refer to any member of your Shortcut workspace`
          );
        }

        return member.id;
      })
    );
  }

  async #processOwnerFilter() {
    const owf = this.filter.ownerFilter;

    if (owf.any) {
      this.filter.ownerFilter.any = await this.#processNameFilterList(owf.any);
    } else if (owf.not) {
      this.filter.ownerFilter.not = await this.#processNameFilterList(owf.not);
    }
  }

  // pre-processes filters for the given command so there's less async work to do later on
  // when the command is actually being executed
  async unpack() {
    if ("stateFilter" in this.filter) {
      await this.#processStateFilter();
    }

    if ("ownerFilter" in this.filter) {
      await this.#processOwnerFilter();
    }

    return;
  }

  async stateFilterPasses(story) {
    const sf = this.filter.stateFilter;

    if (!sf) return true; // no filter, passes by default
    if (!story) false; // should never happen

    if (sf.exactly) {
      return (
        sf.exactly.find((elem) => elem.id === story.workflow_state_id) !==
        undefined
      );
    } else {
      const state = await getState(story.workflow_state_id);

      if (sf.inBetween) {
        return (
          state.position >= sf.inBetween.lowerBound.position &&
          state.position <= sf.inBetween.upperBound.position
        );
      } else if (sf.andAbove) {
        return state.position >= sf.andAbove.position;
      } else if (sf.andBelow) {
        return state.position <= sf.andBelow.position;
      }
    }

    // we should never get here - config validates for state filters missing checks
    return false;
  }

  ownerFilterPasses(story) {
    const owf = this.filter.ownerFilter;
    if (!owf) return true; // no filter, passes by default
    if (!story) return false; // should never happen

    if (owf.any) {
      // todo - in the future it might be nice to be able to specify
      // "only if this owner, and no one else"; e.g. allowCoOwnership
      return story.owner_ids.find((id) => owf.any.includes(id)) !== undefined;
    } else if (owf.not) {
      return story.owner_ids.find((id) => owf.not.includes(id)) === undefined;
    } else {
      // shouldn't happen
      throw new Error("No valid owner filter");
    }
  }
}
