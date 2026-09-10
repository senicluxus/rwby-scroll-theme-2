/**
 * RWBY Scroll Theme
 * Registers a client-side theme setting and toggles CSS classes on <body>
 * that every rule in rwby-scroll-theme.css is scoped under. No sheet
 * templates, actor data, or system files are touched -- this only ever
 * adds/removes class names and reorders our own <link> element.
 *
 * Mandar compatibility
 * ---------------------
 * The starwarsffg system ships two UI themes: the deprecated "Default"
 * theme (systems/starwarsffg/styles/starwarsffg.css, always linked from
 * system.json) and "Mandar" (systems/starwarsffg/styles/mandar.css, NOT
 * declared in system.json's manifest). When a world has Mandar selected,
 * the system's own init hook (swffg-main.js) disables the Default
 * stylesheet and does this instead:
 *
 *   $('link[href*="styles/starwarsffg.css"]').prop("disabled", true);
 *   $("head").append('<link href=".../mandar.css" ...>');
 *
 * That append happens during the system's "init" hook, which runs AFTER
 * Foundry has already inserted every module's manifest-declared
 * stylesheet (ours included) into <head>. The practical effect: under
 * Mandar, mandar.css ends up LAST in the document -- after
 * rwby-scroll-theme.css -- and it also defines some selectors nested
 * more deeply than ours for the same elements (e.g. per-resource-block
 * variants under ".general .genesys"), which can out-specify our plain
 * ".starwarsffg X Y" overrides even though we add an extra body class.
 * Combined, that's why a theme built by mirroring Default's selectors
 * can silently lose pieces of itself the moment a world switches to
 * Mandar, even though nothing in this module changed.
 *
 * Two independent fixes below close that gap without needing to track
 * mandar.css's internal structure (which we don't control and can't
 * alter): we detect Mandar and add a second body class
 * (rwby-scroll-theme-mandar) that the Mandar-only block of our CSS uses
 * with !important, and -- belt and suspenders -- we move our own <link>
 * to the end of <head> so it always loads after mandar.css too.
 *
 * Known limitation: sheets popped out into a separate browser window
 * (e.g. via a "pop-out" module) live in a different document and won't
 * see the classes added here, since they're applied to this document's
 * body.
 */

const MODULE_ID = "rwby-scroll-theme";
const SETTING_KEY = "theme";
const THEME_CLASS = "rwby-scroll-theme";
const MANDAR_THEME_CLASS = "rwby-scroll-theme-mandar";
const MODULE_STYLE_HREF_FRAGMENT = "modules/rwby-scroll-theme/styles/rwby-scroll-theme.css";

/**
 * Ask the starwarsffg system which UI theme the world is using. Wrapped in
 * a try/catch because "starwarsffg.ui-uitheme" is the system's own setting,
 * not ours -- if a future/older system version renames or drops it, we
 * fall back to treating the world as non-Mandar rather than throwing.
 */
function isMandarActive() {
  try {
    return game.settings.get("starwarsffg", "ui-uitheme") === "mandar";
  } catch (err) {
    return false;
  }
}

/**
 * Move our stylesheet <link> to the end of <head>, after mandar.css (if
 * present). Foundry loads module styles during manifest bootstrap, long
 * before any "init" hook runs, so without this our link is always first.
 * Re-running this is harmless: appendChild on a node already at the end
 * is a no-op move.
 */
function reorderStylesheet() {
  const ourLink = document.querySelector(`link[href*="${MODULE_STYLE_HREF_FRAGMENT}"]`);
  if (!ourLink) return;
  document.head.appendChild(ourLink);
}

function applyBodyTheme(value) {
  const enabled = value === "rwby";
  const mandar = enabled && isMandarActive();
  document.body.classList.toggle(THEME_CLASS, enabled);
  document.body.classList.toggle(MANDAR_THEME_CLASS, mandar);
  if (enabled) reorderStylesheet();
}

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, SETTING_KEY, {
    name: "RWBY-SCROLL-THEME.SettingName",
    hint: "RWBY-SCROLL-THEME.SettingHint",
    scope: "client",
    config: true,
    type: String,
    choices: {
      none: "RWBY-SCROLL-THEME.ChoiceNone",
      rwby: "RWBY-SCROLL-THEME.ChoiceRwby"
    },
    default: "none",
    onChange: (value) => applyBodyTheme(value)
  });
});

Hooks.once("ready", () => {
  // By "ready", every module and system "init" hook has already run --
  // including the starwarsffg "init" hook that injects mandar.css when
  // Mandar is selected -- so it's safe to detect it and reorder here.
  applyBodyTheme(game.settings.get(MODULE_ID, SETTING_KEY));
});
