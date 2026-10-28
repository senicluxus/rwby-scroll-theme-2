// Custom character sheet: license card fields, motivations moved to the Biography tab.
// Imports from the system, so check this path if a system update moves it.
import { ActorSheetFFGV2 } from "/systems/starwarsffg/modules/actors/actor-sheet-ffg-v2.js";

// The class name must contain "V2" -- the system's template checks it to pick the icon tab bar.
class RwbyCharacterSheetV2 extends ActorSheetFFGV2 {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["starwarsffg", "sheet", "actor", "v2", "rwby-scroll-theme-sheet"],
    });
  }

  // Overriding this getter is what makes Foundry use our template; the "template" option is ignored.
  get template() {
    return "modules/rwby-scroll-theme/templates/rwby-character-sheet.html";
  }

  // General skills in the left column, everything else in the right.
  _createSkillColumns(data) {
    const cols = [[], []];
    const useLabelSort = game.settings.get("starwarsffg", "skillSorting");

    const sortFunction = useLabelSort
      ? (a, b) => data.data.skills[a].label.localeCompare(data.data.skills[b].label, game.i18n.lang)
      : (a, b) => {
          if (a.toLowerCase() > b.toLowerCase()) return 1;
          if (a.toLowerCase() < b.toLowerCase()) return -1;
          return 0;
        };

    data.data.skilltypes.forEach((type) => {
      const column = type.type === "General" ? 0 : 1;
      const skills = Object.keys(data.data.skills)
        .filter((s) => data.data.skills[s].type === type.type)
        .sort(sortFunction);

      cols[column].push({ id: "header", ...type });
      skills.forEach((s) => cols[column].push({ name: s, ...data.data.skills[s] }));
    });

    return cols;
  }
}

Hooks.once("ready", () => {
  try {
    foundry.documents.collections.Actors.registerSheet("rwby-scroll-theme", RwbyCharacterSheetV2, {
      types: ["character"],
      label: "RWBY Scroll Sheet",
      makeDefault: true,
    });
  } catch (err) {
    console.error("RWBY Scroll Theme | Failed to register the custom character sheet.", err);
  }
});
