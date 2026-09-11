// This file adds our own version of the character sheet -- the one with the
// license card fields and the Strength/Flaw/Desire/Fear boxes moved to the
// Biography tab. It reuses the system's own sheet class and swaps in our
// copy of the HTML file, so everything else (buttons, drag/drop, etc.)
// still works exactly like the normal sheet.
//
// Note: this imports directly from the Star Wars FFG system's own files. If
// that system ever reorganizes its file layout in a future update, this
// import line is the first place to check/fix.
import { ActorSheetFFGV2 } from "/systems/starwarsffg/modules/actors/actor-sheet-ffg-v2.js";

// IMPORTANT: the class name has to contain "V2". The character sheet's own
// HTML checks the sheet's class name (not our own "v2" CSS class) to decide
// whether to draw the compact icon tab bar or the old full-text one -- so
// without "V2" in the name here, the tabs quietly fall back to the old,
// wrong style even though everything else is set up correctly.
class RwbyCharacterSheetV2 extends ActorSheetFFGV2 {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["starwarsffg", "sheet", "actor", "v2", "rwby-scroll-theme-sheet"],
    });
  }

  // IMPORTANT: this is the actual thing that decides which HTML file gets
  // drawn. The system's own sheet class works out its template file with
  // this same kind of method (not the "template" option above), and since
  // it always points at its own file, a plain "template" setting gets
  // silently ignored. Overriding this method here is what makes our copy
  // of the file actually get used.
  get template() {
    return "modules/rwby-scroll-theme/templates/rwby-character-sheet.html";
  }
}

// Wait for "ready" so we register after the system sets up its own sheets --
// that way ours doesn't get stomped on.
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
