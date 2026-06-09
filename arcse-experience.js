const menuToggle = document.querySelector("[data-menu-toggle]");
const mobilePanel = document.querySelector("[data-mobile-panel]");
const supportedLanguages = {
  en: "EN",
  bg: "BG",
  tr: "TR",
  de: "DE",
  ja: "JA",
  fr: "FR",
  es: "ES",
  zh: "ZH"
};
const defaultLanguage = "en";
let englishPack = null;
let activePack = null;
let activeLanguage = defaultLanguage;
const i18nTextNodes = [];
const i18nAttributeTargets = [];

function normalizeI18nValue(value) {
  return value.replace(/\s+/g, " ").trim();
}

function rememberI18nSurface() {
  const skipTags = new Set(["SCRIPT", "STYLE", "SVG", "PATH", "RECT", "POLYGON"]);
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (skipTags.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
      if (parent.closest("[aria-hidden='true'], [data-i18n-static], [data-language-current], [data-toi-metric]")) return NodeFilter.FILTER_REJECT;
      const key = normalizeI18nValue(node.nodeValue);
      if (!key) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  while (walker.nextNode()) {
    const node = walker.currentNode;
    const raw = node.nodeValue;
    i18nTextNodes.push({
      node,
      key: normalizeI18nValue(raw),
      prefix: raw.match(/^\s*/)?.[0] || "",
      suffix: raw.match(/\s*$/)?.[0] || ""
    });
  }

  document.querySelectorAll("[aria-label], [alt], [title]").forEach((element) => {
    ["aria-label", "alt", "title"].forEach((attr) => {
      const value = element.getAttribute(attr);
      if (!value) return;
      i18nAttributeTargets.push({ element, attr, key: normalizeI18nValue(value) });
    });
  });
}

function getBundledLanguagePack(code) {
  return window.ARCSE_LANGUAGE_PACKS?.[code] || null;
}

async function loadLanguagePack(lang) {
  const code = supportedLanguages[lang] ? lang : defaultLanguage;
  const bundledPack = getBundledLanguagePack(code);
  if (window.location.protocol === "file:" && bundledPack) return bundledPack;

  try {
    const response = await fetch(`lang/${code}.json`, { cache: "no-cache" });
    if (!response.ok) throw new Error(`Unable to load language pack: ${code}`);
    return response.json();
  } catch (error) {
    if (bundledPack) return bundledPack;
    throw error;
  }
}

function translateString(key, pack) {
  return pack?.strings?.[key] ?? englishPack?.strings?.[key] ?? key;
}

function collectMissingKeys(pack) {
  const keys = new Set([
    ...i18nTextNodes.map((item) => item.key),
    ...i18nAttributeTargets.map((item) => item.key)
  ]);
  return [...keys].filter((key) => !pack?.strings || !(key in pack.strings));
}

function applyVaultAssets(pack) {
  const vault = pack?.vault || {};
  const englishVault = englishPack?.vault || {};
  document.querySelectorAll("[data-vault-key]").forEach((card) => {
    const key = card.dataset.vaultKey;
    const link = card.querySelector("a[href]");
    if (!key || !link) return;
    const item = vault[key] || {};
    const fallback = englishVault[key] || {};
    const href = item.href || fallback.href;
    if (href) link.setAttribute("href", href);
    const isPdf = /\.pdf($|[?#])/i.test(href || link.getAttribute("href") || "");
    let note = card.querySelector(".language-note");
    if (isPdf) {
      if (!note) {
        note = document.createElement("span");
        note.className = "language-note";
        link.insertAdjacentElement("afterend", note);
      }
      note.textContent = item.languageNote || fallback.languageNote || pack?.ui?.pdfLanguageNote || "English PDF";
    } else if (note) {
      note.remove();
    }
  });
}

function applyVideoAssets(pack) {
  const source = document.querySelector(".video-shell video source");
  const video = source?.closest("video");
  const videoSpec = pack?.video || englishPack?.video || {};
  const href = videoSpec.href;
  const poster = videoSpec.poster;
  const trackSpec = videoSpec.track;
  let sourceChanged = false;
  if (source && href && source.getAttribute("src") !== href) {
    source.setAttribute("src", href);
    sourceChanged = true;
  }
  if (video && poster) video.setAttribute("poster", poster);
  if (video) {
    video.querySelectorAll("track[data-localized-documentary]").forEach((track) => track.remove());
    if (trackSpec?.src) {
      const track = document.createElement("track");
      track.kind = "subtitles";
      track.src = trackSpec.src;
      track.srclang = trackSpec.srclang || activeLanguage;
      track.label = trackSpec.label || supportedLanguages[activeLanguage] || activeLanguage.toUpperCase();
      track.default = true;
      track.dataset.localizedDocumentary = "true";
      video.appendChild(track);
      window.setTimeout(() => {
        Array.from(video.textTracks || []).forEach((textTrack) => {
          textTrack.mode = textTrack.language === track.srclang ? "showing" : "disabled";
        });
      }, 0);
    }
    video.dataset.documentaryLang = activeLanguage;
    if (sourceChanged) video.load();
  }
}

function setLanguageMenuState(lang) {
  document.querySelector("[data-language-current]").textContent = supportedLanguages[lang] || "EN";
  document.querySelectorAll("[data-lang-select]").forEach((button) => {
    const active = button.dataset.langSelect === lang;
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "true");
    else button.removeAttribute("aria-current");
  });
}

function updateLanguageUrl(lang) {
  const url = new URL(window.location.href);
  if (lang === defaultLanguage) url.searchParams.delete("lang");
  else url.searchParams.set("lang", lang);
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

async function applyLanguage(lang, options = {}) {
  const code = supportedLanguages[lang] ? lang : defaultLanguage;
  try {
    if (!englishPack) englishPack = await loadLanguagePack(defaultLanguage);
    activePack = code === defaultLanguage ? englishPack : await loadLanguagePack(code);
    activeLanguage = code;
  } catch (error) {
    console.warn(error);
    if (!englishPack && code !== defaultLanguage) englishPack = await loadLanguagePack(defaultLanguage);
    activePack = englishPack;
    activeLanguage = defaultLanguage;
  }

  document.documentElement.lang = activePack?.language?.htmlLang || activeLanguage;
  document.documentElement.dir = activePack?.language?.dir || "ltr";
  document.title = activePack?.meta?.title || englishPack?.meta?.title || document.title;
  const metaDescription = document.querySelector("meta[name='description']");
  if (metaDescription && (activePack?.meta?.description || englishPack?.meta?.description)) {
    metaDescription.setAttribute("content", activePack?.meta?.description || englishPack.meta.description);
  }

  i18nTextNodes.forEach((item) => {
    item.node.nodeValue = `${item.prefix}${translateString(item.key, activePack)}${item.suffix}`;
  });

  i18nAttributeTargets.forEach((item) => {
    item.element.setAttribute(item.attr, translateString(item.key, activePack));
  });

  applyVaultAssets(activePack);
  applyVideoAssets(activePack);
  setLanguageMenuState(activeLanguage);
  syncToiControlText();
  localStorage.setItem("arcse-language", activeLanguage);
  if (!options.skipUrlUpdate) updateLanguageUrl(activeLanguage);

  window.arcseI18n = {
    currentLanguage: activeLanguage,
    missingKeys: collectMissingKeys(activePack),
    pack: activePack
  };

  if (window.arcseI18n.missingKeys.length) {
    console.warn("ARC SE i18n missing keys", window.arcseI18n.missingKeys);
  }
}

function getInitialLanguage() {
  const query = new URLSearchParams(window.location.search).get("lang");
  if (query && supportedLanguages[query]) return query;
  const stored = localStorage.getItem("arcse-language");
  if (stored && supportedLanguages[stored]) return stored;
  return defaultLanguage;
}

rememberI18nSurface();

menuToggle?.addEventListener("click", () => {
  const open = mobilePanel?.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(Boolean(open)));
});

document.querySelectorAll("[data-mobile-panel] a").forEach((link) => {
  link.addEventListener("click", () => {
    mobilePanel?.classList.remove("open");
    menuToggle?.setAttribute("aria-expanded", "false");
  });
});

const languageToggle = document.querySelector("[data-language-toggle]");
const languageMenu = document.querySelector("[data-language-menu]");
languageToggle?.addEventListener("click", () => {
  const open = languageMenu?.classList.toggle("open");
  languageToggle.setAttribute("aria-expanded", String(Boolean(open)));
});

document.querySelectorAll("[data-lang-select]").forEach((button) => {
  button.addEventListener("click", () => {
    languageMenu?.classList.remove("open");
    languageToggle?.setAttribute("aria-expanded", "false");
    applyLanguage(button.dataset.langSelect);
  });
});

document.addEventListener("click", (event) => {
  if (!event.target.closest("[data-language-switcher]")) {
    languageMenu?.classList.remove("open");
    languageToggle?.setAttribute("aria-expanded", "false");
  }
});

const navLinks = Array.from(document.querySelectorAll(".nav-links a, .mobile-panel a"));
const railLinks = Array.from(document.querySelectorAll(".journey-rail a"));
const rooms = Array.from(document.querySelectorAll(".room[id]"));

function setActiveRoom() {
  const y = window.scrollY + window.innerHeight * 0.38;
  let activeId = rooms[0]?.id || "";
  rooms.forEach((room) => {
    if (room.offsetTop <= y) activeId = room.id;
  });

  navLinks.forEach((link) => {
    const active = link.getAttribute("href") === `#${activeId}`;
    link.classList.toggle("active", active);
    if (active) link.setAttribute("aria-current", "true");
    else link.removeAttribute("aria-current");
  });

  railLinks.forEach((link) => {
    const active = link.dataset.rail === activeId;
    link.classList.toggle("active", active);
    if (active) link.setAttribute("aria-current", "true");
    else link.removeAttribute("aria-current");
  });
}

setActiveRoom();
window.addEventListener("scroll", setActiveRoom, { passive: true });
window.addEventListener("resize", setActiveRoom);

const reveals = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.02, rootMargin: "0px 0px -8% 0px" });
  reveals.forEach((item) => observer.observe(item));
} else {
  reveals.forEach((item) => item.classList.add("is-visible"));
}

const toiLab = document.querySelector("[data-toi-lab]");
const toiSessionButtons = Array.from(document.querySelectorAll("[data-session-start]"));
const toiSessionFrames = new Map();
const toiSessionTimers = new Map();
const toiRunTokens = new Map();
const toiFastMode = new URLSearchParams(window.location.search).get("toiFast") === "1";

const toiPipelineStages = [
  "Extracting preserved operational history...",
  "Loading historical session...",
  "Gathering historical market conditions...",
  "Synchronizing lifecycle ledger...",
  "Loading basis reconstruction...",
  "Cross-checking preserved execution records...",
  "Validating replay integrity...",
  "Preparing TOI reconstruction..."
];

const toiReplayConfigs = {
  may15: {
    durationMs: 60000,
    runtimeMinutes: 18 * 60 + 29,
    final: 7023.97,
    peak: 7347.35,
    retained: 7023.97,
    closedProfit: 7347.35,
    closedLoss: 323.38,
    trades: 19492,
    retention: 95.6,
    curve: [0, 146, 312, 688, 1210, 1840, 2510, 3375, 4210, 5050, 6120, 6990, 7347.35, 7023.97],
    basisCurve: [0, 88, 210, 430, 790, 1280, 1780, 2460, 3180, 3940, 5070, 6180, 7010, 6940]
  },
  leviathan: {
    durationMs: 60000,
    runtimeMinutes: 9,
    final: 554.94,
    peak: 654.94,
    giveback: 16.76,
    closedProfit: 554.94,
    closedLoss: 16.76,
    equityBase: 100,
    trades: 240,
    curve: [0, 18, 44, 92, 150, 238, 314, 405, 488, 572, 654.94, 610, 554.94],
    basisCurve: [100, 113, 138, 170, 229, 306, 372, 462, 548, 620, 654.94, 638, 654.94]
  },
  down: {
    durationMs: 60000,
    runtimeWindow: 20,
    final: 1711.33,
    peak: 1725.75,
    closedProfit: 1725.75,
    closedLoss: 14.42,
    trades: 23219,
    retention: 99.2,
    curve: [0, 72, 165, 300, 470, 650, 830, 1040, 1260, 1475, 1620, 1725.75, 1711.33],
    basisCurve: [0, 60, 138, 272, 430, 590, 780, 965, 1180, 1390, 1540, 1688, 1708]
  },
  up: {
    durationMs: 60000,
    final: 1044.97,
    peak: 1044.97,
    closedProfit: 1044.97,
    closedLoss: 0,
    events: 172,
    retention: 100,
    sourceClass: 3006,
    curve: [0, 34, 102, 188, 276, 382, 508, 646, 782, 898, 988, 1044.97],
    basisCurve: [0, 20, 75, 150, 236, 345, 460, 590, 730, 846, 930, 1010]
  },
  micro: {
    durationMs: 60000,
    final: 2509.31,
    peak: 5710.53,
    closedProfit: 5710.53,
    closedLoss: 3201.22,
    wins: 1388,
    losses: 2040,
    trades: 3611,
    curve: [0, 120, 420, 290, 760, 1160, 940, 1680, 2220, 1960, 2860, 3410, 3090, 3900, 4550, 4300, 5090, 5710.53, 4980, 4380, 3610, 3020, 2509.31],
    basisCurve: [0, 110, 330, 390, 610, 980, 1140, 1420, 1880, 2140, 2420, 2860, 3020, 3450, 3860, 4100, 4520, 4920, 4700, 4380, 3900, 3370, 2950]
  }
};

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function easeInOutCubic(value) {
  return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function valueAt(values, progress) {
  if (!values?.length) return 0;
  if (progress <= 0) return values[0];
  if (progress >= 1) return values[values.length - 1];
  const scaled = progress * (values.length - 1);
  const index = Math.floor(scaled);
  const fraction = scaled - index;
  const start = values[index];
  const end = values[Math.min(index + 1, values.length - 1)];
  return start + (end - start) * fraction;
}

function visibleValues(values, progress) {
  if (!values?.length) return [];
  const scaled = progress * (values.length - 1);
  const count = Math.max(1, Math.floor(scaled) + 1);
  const partial = values.slice(0, count);
  if (progress < 1) partial.push(valueAt(values, progress));
  return partial;
}

function sampledValues(values, progress, count = 80) {
  if (!values?.length) return [];
  const limit = clamp(progress);
  const sampleCount = Math.max(2, Math.ceil(count * Math.max(limit, 0.012)));
  return Array.from({ length: sampleCount }, (_, index) => {
    const local = sampleCount === 1 ? 0 : index / (sampleCount - 1);
    return valueAt(values, limit * local);
  });
}

function smoothPath(points) {
  if (!points.length) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    path += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return path;
}

function chartPath(values, progress, minValue, maxValue) {
  const limitedProgress = clamp(progress);
  const currentValues = sampledValues(values, limitedProgress, 96);
  const span = Math.max(1, maxValue - minValue);
  const points = currentValues.map((value, index) => ({
    x: currentValues.length === 1 ? 0 : 640 * limitedProgress * (index / (currentValues.length - 1)),
    y: 228 - ((value - minValue) / span) * 196
  }));
  return smoothPath(points);
}

function deterministicFraction(value) {
  return Math.abs(Math.sin(value) * 10000) % 1;
}

function ensureTradeMarkerLayer(card) {
  const svg = card.querySelector(".toi-chart");
  if (!svg) return null;
  let layer = svg.querySelector("[data-trade-markers]");
  if (!layer) {
    layer = document.createElementNS("http://www.w3.org/2000/svg", "g");
    layer.setAttribute("data-trade-markers", "");
    layer.setAttribute("aria-hidden", "true");
    svg.appendChild(layer);
  }
  return layer;
}

function updateTradeMarkers(card, config, progress, minValue, maxValue) {
  const layer = ensureTradeMarkerLayer(card);
  if (!layer) return;
  const seed = (card.dataset.replay || "toi").split("").reduce((total, char) => total + char.charCodeAt(0), 0);
  const totalMarkers = Math.min(42, Math.max(12, Math.round((config.trades || config.events || config.curve.length * 120) / 700)));
  const visibleCount = Math.floor(totalMarkers * clamp(progress));
  const fragment = document.createDocumentFragment();
  const span = Math.max(1, maxValue - minValue);
  const lossRatio = config.closedLoss
    ? Math.min(0.52, Math.max(0.08, config.closedLoss / ((config.closedProfit || 0) + config.closedLoss) + 0.04))
    : 0.04;

  for (let index = 0; index < visibleCount; index += 1) {
    const localProgress = ((index + 1) / (totalMarkers + 1)) * clamp(progress);
    const value = valueAt(config.curve, localProgress);
    const x = 640 * localProgress;
    const y = 228 - ((value - minValue) / span) * 196;
    const isLoss = deterministicFraction((index + 1) * (seed + 17)) < lossRatio;
    const marker = document.createElementNS("http://www.w3.org/2000/svg", "line");
    marker.setAttribute("class", `toi-trade-marker ${isLoss ? "loss" : "win"}`);
    marker.setAttribute("x1", x.toFixed(2));
    marker.setAttribute("x2", x.toFixed(2));
    marker.setAttribute("y1", (y - 8).toFixed(2));
    marker.setAttribute("y2", (y + 8).toFixed(2));
    fragment.appendChild(marker);
  }

  layer.replaceChildren(fragment);
}

function formatCurrency(value) {
  const sign = value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatInteger(value) {
  return Math.round(value).toLocaleString("en-US");
}

function formatRuntime(minutes) {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return `${hours}:${String(mins).padStart(2, "0")}`;
}

function setMetric(card, key, value) {
  const target = card.querySelector(`[data-toi-metric="${key}"]`);
  if (target) target.textContent = value;
}

function translateUi(key) {
  return translateString(key, activePack || englishPack || null);
}

function syncToiControlText() {
  if (!toiLab) return;
  toiSessionButtons.forEach((button) => {
    const card = button.closest("[data-replay]");
    const state = card?.dataset.toiState || "idle";
    const buttonKey = state === "loading"
      ? "Preparing reconstruction"
      : state === "running"
        ? "Reconstruction Running"
        : state === "evidence"
          ? "Reconstruct Again"
          : "Reconstruct Session";
    button.textContent = translateUi(buttonKey);
    button.disabled = state === "loading" || state === "running" || state === "freezing";
  });
  document.querySelectorAll("[data-toi-console]").forEach(syncSessionConsoleText);
}

function updateReplayWindow(card, config, progress) {
  const eased = clamp(progress);
  const values = config.curve;
  const basisValues = config.basisCurve || values;
  const minValue = Math.min(0, ...values, ...basisValues);
  const maxValue = Math.max(config.peak || 1, ...values, ...basisValues);
  const netPath = card.querySelector("[data-chart-net]");
  const basisPath = card.querySelector("[data-chart-basis]");
  if (netPath) netPath.setAttribute("d", chartPath(values, eased, minValue, maxValue));
  if (basisPath) basisPath.setAttribute("d", chartPath(basisValues, eased, minValue, maxValue));
  updateTradeMarkers(card, config, eased, minValue, maxValue);

  const current = valueAt(values, eased);
  const currentBasis = valueAt(basisValues, eased);
  const visible = sampledValues(values, eased, 80);
  const peakSoFar = Math.max(...visible, current);

  setMetric(card, "net", formatCurrency(current));
  setMetric(card, "peak", formatCurrency(Math.min(config.peak || peakSoFar, peakSoFar)));
  setMetric(card, "progress", `${Math.round(progress * 100)}%`);

  if ("retained" in config) setMetric(card, "retained", formatCurrency(valueAt([0, config.retained], eased)));
  if ("giveback" in config) setMetric(card, "giveback", formatCurrency(valueAt([0, config.giveback], eased)));
  if ("equityBase" in config) setMetric(card, "equity", formatCurrency(config.equityBase + current));
  else setMetric(card, "equity", formatCurrency(currentBasis));
  setMetric(card, "basis", formatCurrency(currentBasis));
  if ("trades" in config) setMetric(card, "trades", formatInteger(config.trades * eased));
  if ("closedProfit" in config) setMetric(card, "closedProfit", formatCurrency(config.closedProfit * eased));
  if ("closedLoss" in config) setMetric(card, "closedLoss", formatCurrency(config.closedLoss * eased));
  if ("wins" in config) setMetric(card, "wins", formatInteger(config.wins * eased));
  if ("losses" in config) setMetric(card, "losses", formatInteger(config.losses * eased));
  if ("events" in config) setMetric(card, "events", formatInteger(config.events * eased));
  if ("sourceClass" in config) setMetric(card, "class", String(config.sourceClass));
  if ("retention" in config) setMetric(card, "retention", `${(config.retention * eased).toFixed(progress >= 1 ? 1 : 0)}%`);
  if ("runtimeMinutes" in config) setMetric(card, "runtime", formatRuntime(config.runtimeMinutes * eased));
  if ("runtimeWindow" in config) setMetric(card, "runtime", formatInteger(config.runtimeWindow * eased));

  card.classList.toggle("complete", progress >= 1);
}

function clearToiSessionTimers(card) {
  const frame = toiSessionFrames.get(card);
  if (frame) cancelAnimationFrame(frame);
  toiSessionFrames.delete(card);
  const timers = toiSessionTimers.get(card) || [];
  timers.forEach((timer) => window.clearTimeout(timer));
  toiSessionTimers.delete(card);
}

function queueToiSessionTimer(card, callback, delay) {
  const timer = window.setTimeout(() => {
    const timers = toiSessionTimers.get(card) || [];
    toiSessionTimers.set(card, timers.filter((item) => item !== timer));
    callback();
  }, delay);
  const timers = toiSessionTimers.get(card) || [];
  timers.push(timer);
  toiSessionTimers.set(card, timers);
  return timer;
}

function waitForSession(card, delay) {
  return new Promise((resolve) => {
    queueToiSessionTimer(card, resolve, delay);
  });
}

function syncSessionConsoleText(consoleEl) {
  if (!consoleEl) return;
  consoleEl.querySelectorAll("[data-console-text]").forEach((item) => {
    item.textContent = translateUi(item.dataset.consoleText);
  });
  consoleEl.querySelectorAll("[data-pipeline-key]").forEach((item) => {
    item.textContent = translateUi(item.dataset.pipelineKey);
  });
}

function ensureSessionConsole(card) {
  const terminal = card.querySelector(".toi-terminal");
  if (!terminal) return null;
  let consoleEl = terminal.querySelector("[data-toi-console]");
  if (consoleEl) {
    syncSessionConsoleText(consoleEl);
    return consoleEl;
  }

  const stages = toiPipelineStages.map((stage) => `
    <li data-pipeline-stage>
      <span class="brand-mark mini" aria-hidden="true"></span>
      <span class="toi-console-dot" aria-hidden="true"></span>
      <p data-pipeline-key="${stage}">${translateUi(stage)}</p>
      <i><b></b></i>
      <em data-console-text="Complete">${translateUi("Complete")}</em>
    </li>
  `).join("");

  terminal.insertAdjacentHTML("beforeend", `
    <div class="toi-console" data-toi-console aria-hidden="true">
      <div class="toi-console-head">
        <span class="brand-mark console-brand" aria-hidden="true"></span>
        <span class="toi-console-dot" aria-hidden="true"></span>
        <div>
          <strong>ARC SE</strong>
          <small data-console-text="Operational Intelligence Laboratory">${translateUi("Operational Intelligence Laboratory")}</small>
        </div>
      </div>
      <div class="toi-console-core" aria-hidden="true">
        <span class="brand-mark console-logo"></span>
        <span></span><span></span><span></span>
      </div>
      <ol class="toi-pipeline">${stages}</ol>
      <div class="toi-console-ready">
        <strong data-console-text="TOI BUILD READY.">${translateUi("TOI BUILD READY.")}</strong>
        <span data-console-text="RUNNING...">${translateUi("RUNNING...")}</span>
      </div>
    </div>
  `);
  consoleEl = terminal.querySelector("[data-toi-console]");
  syncSessionConsoleText(consoleEl);
  return consoleEl;
}

function setSessionState(card, state) {
  card.dataset.toiState = state;
  card.classList.toggle("loading", state === "loading");
  card.classList.toggle("running", state === "running");
  card.classList.toggle("evidence-visible", state === "evidence");
  syncToiControlText();
}

function resetToiSession(card) {
  const config = toiReplayConfigs[card.dataset.replay];
  clearToiSessionTimers(card);
  toiRunTokens.delete(card);
  delete card.dataset.sourceSeen;
  card.classList.remove("show-source", "complete", "loading", "running", "evidence-visible");
  setSessionState(card, "idle");
  if (config) updateReplayWindow(card, config, 0);
  const consoleEl = card.querySelector("[data-toi-console]");
  if (consoleEl) {
    consoleEl.classList.remove("active", "ready");
    consoleEl.setAttribute("aria-hidden", "true");
    consoleEl.querySelectorAll("[data-pipeline-stage]").forEach((stage) => {
      stage.classList.remove("active", "complete");
      stage.querySelector("b").style.width = "0%";
    });
  }
}

async function runToiPipeline(card, token) {
  const consoleEl = ensureSessionConsole(card);
  if (!consoleEl) return false;
  const stageDuration = toiFastMode ? 75 : 900;
  const stagePause = toiFastMode ? 20 : 130;
  consoleEl.setAttribute("aria-hidden", "false");
  consoleEl.classList.add("active");
  consoleEl.classList.remove("ready");
  consoleEl.querySelectorAll("[data-pipeline-stage]").forEach((stage) => {
    stage.classList.remove("active", "complete");
    stage.querySelector("b").style.width = "0%";
    stage.querySelector("b").style.transitionDuration = `${stageDuration}ms`;
  });

  for (const stage of Array.from(consoleEl.querySelectorAll("[data-pipeline-stage]"))) {
    if (toiRunTokens.get(card) !== token) return false;
    stage.classList.add("active");
    stage.querySelector("b").style.width = "0%";
    requestAnimationFrame(() => {
      if (toiRunTokens.get(card) === token) stage.querySelector("b").style.width = "100%";
    });
    await waitForSession(card, stageDuration);
    if (toiRunTokens.get(card) !== token) return false;
    stage.classList.remove("active");
    stage.classList.add("complete");
    await waitForSession(card, stagePause);
  }

  if (toiRunTokens.get(card) !== token) return false;
  consoleEl.classList.add("ready");
  await waitForSession(card, toiFastMode ? 140 : 900);
  if (toiRunTokens.get(card) !== token) return false;
  consoleEl.classList.remove("active");
  consoleEl.setAttribute("aria-hidden", "true");
  return true;
}

function finishToiSession(card, token) {
  if (toiRunTokens.get(card) !== token) return;
  const config = toiReplayConfigs[card.dataset.replay];
  if (config) updateReplayWindow(card, config, 1);
  card.classList.add("complete");
  setSessionState(card, "freezing");
  queueToiSessionTimer(card, () => {
    if (toiRunTokens.get(card) !== token) return;
    card.classList.add("show-source");
    card.dataset.sourceSeen = "true";
    setSessionState(card, "evidence");
  }, toiFastMode ? 180 : 1300);
}

function runToiReplay(card, token) {
  const config = toiReplayConfigs[card.dataset.replay];
  if (!config) return;
  setSessionState(card, "running");
  const duration = Math.max(1, config.durationMs * (toiFastMode ? 0.045 : 1));
  const start = performance.now();

  function frame(now) {
    if (toiRunTokens.get(card) !== token) return;
    const progress = clamp((now - start) / duration);
    updateReplayWindow(card, config, progress);
    if (progress >= 1) {
      toiSessionFrames.delete(card);
      finishToiSession(card, token);
      return;
    }
    toiSessionFrames.set(card, requestAnimationFrame(frame));
  }

  toiSessionFrames.set(card, requestAnimationFrame(frame));
}

async function startToiSession(card) {
  if (!card) return;
  const state = card.dataset.toiState || "idle";
  if (state === "loading" || state === "running" || state === "freezing") return;
  resetToiSession(card);
  const token = Symbol(card.dataset.replay || "toi");
  toiRunTokens.set(card, token);
  setSessionState(card, "loading");
  const ready = await runToiPipeline(card, token);
  if (!ready || toiRunTokens.get(card) !== token) return;
  runToiReplay(card, token);
}

function resetToiLab() {
  if (!toiLab) return;
  toiLab.classList.remove("running", "complete", "collapse", "settled", "fast");
  Array.from(toiLab.querySelectorAll("[data-replay]")).forEach(resetToiSession);
  syncToiControlText();
}

function startToiLab() {
  if (!toiLab) return;
  Array.from(toiLab.querySelectorAll("[data-replay]")).forEach((card) => startToiSession(card));
}

if (toiLab) {
  if (toiFastMode) toiLab.classList.add("fast");
  resetToiLab();
  toiSessionButtons.forEach((button) => {
    button.addEventListener("click", () => startToiSession(button.closest("[data-replay]")));
  });
  window.arcseToiLab = {
    start: startToiLab,
    startAll: startToiLab,
    startOne: (key) => startToiSession(toiLab.querySelector(`[data-replay="${key}"]`)),
    reset: resetToiLab
  };
}

const lightbox = document.querySelector("[data-lightbox-modal]");
const lightboxImage = document.querySelector("[data-lightbox-image]");
const lightboxTitle = document.querySelector("[data-lightbox-title]");
const lightboxCaption = document.querySelector("[data-lightbox-caption]");
const lightboxClose = document.querySelector("[data-lightbox-close]");

function openLightbox(image) {
  if (!lightbox || !lightboxImage) return;
  lightboxImage.src = image.currentSrc || image.src;
  lightboxImage.alt = image.alt || "Expanded ARC SE evidence";
  lightboxTitle.textContent = image.alt || "ARC SE evidence";
  const card = image.closest(".proof-card");
  const title = card?.querySelector("h3")?.textContent?.trim();
  const body = card?.querySelector("p")?.textContent?.trim();
  lightboxCaption.textContent = [title, body].filter(Boolean).join(": ");
  lightbox.classList.add("open");
  lightbox.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  lightboxClose?.focus();
}

function closeLightbox() {
  if (!lightbox || !lightboxImage) return;
  lightbox.classList.remove("open");
  lightbox.setAttribute("aria-hidden", "true");
  lightboxImage.removeAttribute("src");
  document.body.style.overflow = "";
}

document.querySelectorAll(".proof-card img").forEach((image) => {
  image.setAttribute("tabindex", "0");
  image.setAttribute("role", "button");
  image.addEventListener("click", () => openLightbox(image));
  image.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openLightbox(image);
    }
  });
});

lightboxClose?.addEventListener("click", closeLightbox);
lightbox?.addEventListener("click", (event) => {
  if (event.target === lightbox) closeLightbox();
});
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeLightbox();
});

applyLanguage(getInitialLanguage(), { skipUrlUpdate: true });
