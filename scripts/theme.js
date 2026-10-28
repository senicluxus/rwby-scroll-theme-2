const MODULE_ID = "rwby-scroll-theme";
const SETTING_KEY = "theme";
const THEME_CLASS = "rwby-scroll-theme";
const MANDAR_THEME_CLASS = "rwby-scroll-theme-mandar";
const MODULE_STYLE_HREF_FRAGMENT = "modules/rwby-scroll-theme/styles/rwby-scroll-theme.css";

function isMandarActive() {
  try {
    return game.settings.get("starwarsffg", "ui-uitheme") === "mandar";
  } catch (err) {
    return false;
  }
}

// mandar.css gets added after our stylesheet, so move ours to the end of <head>.
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

const HEALTHBAR_CLASS = "rwby-healthbar";

// Adds the wounds bar under the portrait and updates how full it is.
function updateHealthBar(app, html) {
  if (!document.body.classList.contains(MANDAR_THEME_CLASS)) return;
  if (app?.actor?.type !== "character") return;

  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root) return;

  const profileBlock = root.querySelector(".header-fields .profile-block");
  const currentInput = root.querySelector('input[name="data.stats.wounds.value"]');
  const maxInput = root.querySelector('input[name="data.stats.wounds.max"]');
  if (!profileBlock || !currentInput || !maxInput) return;

  const current = Number(currentInput.value) || 0;
  const max = Number(maxInput.value) || 0;
  const remaining = max > 0 ? Math.min(1, Math.max(0, 1 - current / max)) : 1;
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

const HEADER_PILL_SELECTOR = [
  ".header-fields .species-pill",
  ".header-fields .career-pill",
  ".header-fields .specialization-pill",
  ".header-fields .signatureability-pill",
  ".header-fields .forcepower-pill"
].join(", ");

// Full name on hover, since CSS cuts long names off with "...".
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

const CHAT_STRIP_CLASS = "rwby-chat-controls";

// Tags the chat button row (the smallest box holding the globe and trash icons) so CSS can style it.
function tagChatControls() {
  if (!document.body.classList.contains(MANDAR_THEME_CLASS)) return;
  const chat = document.querySelector("#chat");
  if (!chat) return;
  // Ignore the trash icon on each message.
  const notInMessages = (el) => !el.closest("#chat-log, .chat-message");
  const globe = [...chat.querySelectorAll(".fa-globe")].find(notInMessages);
  const trash = [...chat.querySelectorAll(".fa-trash")].find(notInMessages);
  if (!globe || !trash) return;

  let strip = globe.parentElement;
  while (strip && !strip.contains(trash)) strip = strip.parentElement;
  if (!strip || strip === chat || strip.querySelector("textarea")) return;
  strip.classList.add(CHAT_STRIP_CLASS);
}

// Chat redraws now and then, so re-tag after page changes (at most once per frame).
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

// Wait for "ready" so the system has already added mandar.css.
Hooks.once("ready", () => {
  applyBodyTheme(game.settings.get(MODULE_ID, SETTING_KEY));
  watchChatControls();
});
