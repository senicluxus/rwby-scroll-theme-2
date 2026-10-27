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

/**
 * Wounds health bar, under the portrait (Mandar-only; character sheets
 * only). CSS draws the bar itself -- this just reads the Current and
 * Threshold boxes and hands over one number: what fraction of health is
 * left, from 1 (no wounds) down to 0 (current wounds = threshold). The bar
 * element doesn't exist in the system's own template, so the first time a
 * sheet renders we create it once and just update the number after that.
 */
const HEALTHBAR_CLASS = "rwby-healthbar";

function updateHealthBar(app, html) {
  if (!document.body.classList.contains(MANDAR_THEME_CLASS)) return;
  if (app?.actor?.type !== "character") return;

  // Older Foundry hooks hand this over as a jQuery object; newer ones may
  // pass the raw element directly -- this covers both.
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root) return;

  const profileBlock = root.querySelector(".header-fields .profile-block");
  const currentInput = root.querySelector('input[name="data.stats.wounds.value"]');
  const maxInput = root.querySelector('input[name="data.stats.wounds.max"]');
  if (!profileBlock || !currentInput || !maxInput) return;

  const current = Number(currentInput.value) || 0;
  const max = Number(maxInput.value) || 0;
  const remaining = max > 0 ? Math.min(1, Math.max(0, 1 - current / max)) : 1;
  // Three fixed color bands instead of a smooth blend -- matches how
  // wound thresholds are usually talked about (healthy/wounded/critical).
  const band = remaining >= 0.66 ? "healthy" : remaining <= 0.33 ? "critical" : "wounded";

  let bar = profileBlock.querySelector(`:scope > .${HEALTHBAR_CLASS}`);
  if (!bar) {
    bar = document.createElement("div");
    bar.className = HEALTHBAR_CLASS;
    const fill = document.createElement("div");
    fill.className = `${HEALTHBAR_CLASS}-fill`;
    bar.appendChild(fill);
    profileBlock.appendChild(bar);
  }
  bar.style.setProperty("--rwby-health-pct", remaining);

  const fill = bar.querySelector(`.${HEALTHBAR_CLASS}-fill`);
  fill.classList.remove("rwby-health-healthy", "rwby-health-wounded", "rwby-health-critical");
  fill.classList.add(`rwby-health-${band}`);
}

/**
 * Full-name tooltips for the header pills (Background/Education/Role/
 * Semblance/Team Attacks), Mandar-only. CSS cuts long names off with
 * "..." when they don't fit -- this puts the full name in a title
 * attribute so hovering still shows it, since CSS alone can't reveal
 * text it just cut off.
 */
const HEADER_PILL_SELECTOR = [
  ".header-fields .species-pill",
  ".header-fields .career-pill",
  ".header-fields .specialization-pill",
  ".header-fields .signatureability-pill",
  ".header-fields .forcepower-pill"
].join(", ");

function updatePillTooltips(app, html) {
  if (!document.body.classList.contains(MANDAR_THEME_CLASS)) return;

  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root) return;

  root.querySelectorAll(HEADER_PILL_SELECTOR).forEach((pill) => {
    pill.title = pill.textContent.trim();
  });
}

Hooks.on("renderActorSheet", (app, html) => {
  updateHealthBar(app, html);
  updatePillTooltips(app, html);
});

/**
 * Chat button strip (Mandar-only). Foundry gives the row holding the
 * roll-type buttons and the save/delete buttons no dependable name, so this
 * finds it -- the smallest box holding both the globe (public roll) and
 * trash icons -- and tags it so our CSS can give it its own background.
 */
const CHAT_STRIP_CLASS = "rwby-chat-controls";

function tagChatControls() {
  if (!document.body.classList.contains(MANDAR_THEME_CLASS)) return;
  const chat = document.querySelector("#chat");
  if (!chat) return;
  // Skip icons inside the message list -- every chat message has its own
  // little trash icon, which used to get picked instead of the real one.
  const notInMessages = (el) => !el.closest("#chat-log, .chat-message");
  const globe = [...chat.querySelectorAll(".fa-globe")].find(notInMessages);
  const trash = [...chat.querySelectorAll(".fa-trash")].find(notInMessages);
  if (!globe || !trash) return;

  let strip = globe.parentElement;
  while (strip && !strip.contains(trash)) strip = strip.parentElement;
  // Safety: skip if we landed on something too big (the whole chat or the typing box's area).
  if (!strip || strip === chat || strip.querySelector("textarea")) return;
  if (!strip.classList.contains(CHAT_STRIP_CLASS)) strip.classList.add(CHAT_STRIP_CLASS);
}

// Chat re-draws now and then, so re-check whenever the page changes (once per frame at most).
let chatTagQueued = false;
function watchChatControls() {
  tagChatControls();
  new MutationObserver(() => {
    if (chatTagQueued) return;
    chatTagQueued = true;
    requestAnimationFrame(() => {
      chatTagQueued = false;
      tagChatControls();
    });
  }).observe(document.body, { childList: true, subtree: true });
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
  watchChatControls();
});
