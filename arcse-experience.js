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
    if (element.closest("[data-i18n-static]")) return;
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
  document.querySelectorAll("[data-language-current]").forEach((element) => {
    element.textContent = supportedLanguages[lang] || "EN";
  });
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
  syncPresentationVideo();
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

const headquartersLayer = document.querySelector("[data-headquarters-layer]");
const headquartersOpenButtons = Array.from(document.querySelectorAll("[data-headquarters-open]"));
const headquartersCloseButtons = Array.from(document.querySelectorAll("[data-hq-close]"));
const hqBoot = document.querySelector("[data-hq-boot]");
const hqBootLine = document.querySelector("[data-hq-boot-line]");
const hqMinimal = document.querySelector("[data-hq-minimal]");
const hqCommand = document.querySelector("[data-hq-command]");
const hqInputs = Array.from(document.querySelectorAll("[data-hq-search-input]"));
const hqAutocompleteMenus = Array.from(document.querySelectorAll("[data-hq-autocomplete]"));
const hqQueryCard = document.querySelector("[data-hq-query-card]");
const hqResultTitle = document.querySelector("[data-hq-result-title]");
const hqResultCopy = document.querySelector("[data-hq-result-copy]");
const presentationOpenButtons = Array.from(document.querySelectorAll("[data-presentation-open]"));
const presentationOverlay = document.querySelector("[data-presentation-overlay]");
const presentationVideo = document.querySelector("[data-presentation-video]");
const presentationSource = document.querySelector("[data-presentation-source]");
const presentationCloseButtons = Array.from(document.querySelectorAll("[data-presentation-close]"));
const presentationFullscreenButton = document.querySelector("[data-presentation-fullscreen]");
let hqBooting = false;
let hqHasCounted = false;
let hqLandingBooted = false;

const hqSuggestions = [
  "May 15",
  "May 15 Resurrection",
  "3005",
  "3005 Monster Session",
  "3006",
  "3007",
  "3008",
  "Leviathan",
  "Project Leviathan",
  "TOI",
  "Founder Story",
  "Founder",
  "Valuation",
  "Investment",
  "Evidence",
  "Documentary",
  "Parity",
  "Watcher",
  "Coordinator",
  "Paper vs Live",
  "3008 Strike",
  "Predator Down",
  "3007 Micro Harvester",
  "3006 Up Predator"
];

const hqLandingBootLines = [
  "Opening ARC SE Headquarters...",
  "Connecting to Watcher 3001...",
  "Loading operational memory...",
  "Loading organism topology...",
  "Loading evidence vault...",
  "Synchronizing intelligence...",
  "Transferable Operational Intelligence connected."
];

const hqSearchBootLines = [
  "Searching preserved intelligence...",
  "Querying Watcher 3001...",
  "Scanning evidence objects...",
  "Cross-checking archive references...",
  "Canonical result found.",
  "Opening..."
];

const hqProfiles = [
  {
    match: /may\s*15|resurrection/i,
    title: "May 15 Resurrection intelligence opened",
    copy: "TOI reconstruction, resurrection report, Hall of Legends evidence, source screenshots, organism state, and timeline are linked into one verified operating memory.",
    target: "#room-toi",
    action: "may15"
  },
  {
    match: /3005|monster|predator down|down predator/i,
    title: "3005 Down Predator profile opened",
    copy: "Monster-session behavior, downside movement intelligence, proof surfaces, reconstruction evidence, and related PDFs are staged for review.",
    target: "#room-organisms"
  },
  {
    match: /3006|up predator/i,
    title: "3006 Up Predator profile opened",
    copy: "Upside predator behavior, organism role, proof surface, and reconstructed performance context are staged.",
    target: "#room-organisms"
  },
  {
    match: /3007|micro|harvester/i,
    title: "3007 Micro Harvester opened",
    copy: "Micro capture, peak-versus-realized evidence, replay value recovery, and version lineage are highlighted in the graph.",
    target: "#room-organisms"
  },
  {
    match: /3008|strike/i,
    title: "3008 Strike Organism opened",
    copy: "Governed strike behavior, capital truth, current 3008 framing, and operational controls are connected.",
    target: "#room-organisms"
  },
  {
    match: /founder|origin/i,
    title: "Founder Story opened",
    copy: "The human origin, pressure event, mission logic, and preservation thesis are now the active intelligence thread.",
    target: "#room-founder"
  },
  {
    match: /leviathan/i,
    title: "Project Leviathan archive opened",
    copy: "Restricted historical runtime evidence, mobile retained state, basis/equity surfaces, and governance lessons are connected.",
    target: "#room-leviathan"
  },
  {
    match: /toi|transferable/i,
    title: "TOI research library opened",
    copy: "Transferable Operational Intelligence, reconstruction controls, evidence validation, and operational memory transfer are active.",
    target: "#room-toi",
    action: "toi"
  },
  {
    match: /valuation|value|investment/i,
    title: "Valuation intelligence opened",
    copy: "Valuation thesis, investment memorandum, strategic acquisition logic, future markets, and current-value reports are indexed.",
    target: "#room-vault"
  },
  {
    match: /paper|live|parity/i,
    title: "Paper vs Live intelligence opened",
    copy: "Parity, live causal reality checks, paper-to-live realism, and separated trust surfaces are staged.",
    target: "#room-truth"
  },
  {
    match: /evidence|vault|report|pdf/i,
    title: "Evidence vault opened",
    copy: "Reports, PDFs, screenshots, documentary assets, and public diligence artifacts are ready for verification.",
    target: "#room-vault"
  },
  {
    match: /documentary|presentation|video|why arc/i,
    title: "Fullscreen presentation opened",
    copy: "The localized ARC SE presentation video is loading in the cinematic overlay.",
    action: "presentation"
  },
  {
    match: /watcher|coordinator|3001|3002|3004|sacred/i,
    title: "Organism topology opened",
    copy: "Watcher 3001, Coordinator 3002, Sacred 3004, and the connected organism network are now the active surface.",
    target: "#room-organisms"
  }
];

function openHeadquarters(options = {}) {
  if (!headquartersLayer) return;
  const withBoot = Boolean(options.boot);
  headquartersLayer.classList.add("is-active");
  headquartersLayer.classList.toggle("is-command-ready", !withBoot);
  headquartersLayer.classList.remove("is-minimal", "is-booting");
  headquartersLayer.setAttribute("aria-hidden", "false");
  hqMinimal?.setAttribute("aria-hidden", "true");
  if (withBoot) hqCommand?.setAttribute("aria-hidden", "true");
  else hqCommand?.removeAttribute("aria-hidden");
  document.body.classList.add("headquarters-open");
  if (withBoot) {
    runHeadquartersLandingBoot();
  } else {
    window.setTimeout(() => hqInputs[1]?.focus({ preventScroll: true }), 450);
    animateHqCounters();
    startHqLiveFeed();
  }
}

function closeHeadquarters() {
  if (!headquartersLayer) return;
  headquartersLayer.classList.remove("is-active", "is-minimal", "is-booting", "is-command-ready");
  headquartersLayer.setAttribute("aria-hidden", "true");
  document.body.classList.remove("headquarters-open");
}

function setHqQuery(value) {
  hqInputs.forEach((input) => {
    if (input.value !== value) input.value = value;
  });
  updateHqAutocomplete(value);
}

function updateHqAutocomplete(value) {
  const query = value.trim().toLowerCase();
  const matches = hqSuggestions.filter((item) => !query || item.toLowerCase().includes(query)).slice(0, 6);
  hqAutocompleteMenus.forEach((menu) => {
    if (!query) {
      menu.classList.remove("open");
      menu.innerHTML = "";
      return;
    }
    menu.innerHTML = matches.map((item) => `<button type="button" data-hq-suggestion="${item}">${item}</button>`).join("");
    menu.classList.toggle("open", matches.length > 0);
  });
}

function resolveHqProfile(query) {
  return hqProfiles.find((profile) => profile.match.test(query)) || {
    title: `${query || "ARC SE"} intelligence opened`,
    copy: "ARC SE searched founder story, TOI, organism topology, evidence vault, reports, videos, screenshots, timeline, valuation, and reconstructions."
  };
}

function setHeadquartersResult(query) {
  const profile = resolveHqProfile(query);
  if (hqResultTitle) hqResultTitle.textContent = profile.title;
  if (hqResultCopy) hqResultCopy.textContent = profile.copy;
  hqQueryCard?.classList.remove("is-resolved");
  void hqQueryCard?.offsetWidth;
  hqQueryCard?.classList.add("is-resolved");
  document.querySelectorAll("[data-hq-query]").forEach((button) => {
    button.classList.toggle("active", button.dataset.hqQuery?.toLowerCase() === query.toLowerCase());
  });
  return profile;
}

async function runHqBootLines(lines, delay = 330) {
  hqBoot?.setAttribute("aria-hidden", "false");
  for (const line of lines) {
    if (hqBootLine) {
      hqBootLine.textContent = line;
      hqBootLine.classList.remove("pulse");
      void hqBootLine.offsetWidth;
      hqBootLine.classList.add("pulse");
    }
    await new Promise((resolve) => window.setTimeout(resolve, delay));
  }
  hqBoot?.setAttribute("aria-hidden", "true");
}

async function runHeadquartersLandingBoot() {
  if (!headquartersLayer || hqBooting) return;
  if (hqLandingBooted) {
    headquartersLayer.classList.add("is-command-ready");
    hqCommand?.removeAttribute("aria-hidden");
    animateHqCounters();
    startHqLiveFeed();
    return;
  }
  hqBooting = true;
  hqLandingBooted = true;
  headquartersLayer.classList.add("is-booting");
  await runHqBootLines(hqLandingBootLines, 330);
  headquartersLayer.classList.remove("is-booting");
  headquartersLayer.classList.add("is-command-ready");
  hqCommand?.removeAttribute("aria-hidden");
  animateHqCounters();
  startHqLiveFeed();
  window.setTimeout(() => hqInputs[1]?.focus({ preventScroll: true }), 260);
  hqBooting = false;
}

function executeHqRoute(profile) {
  if (profile?.action === "presentation") {
    openPresentationOverlay();
    return;
  }
  if (!profile?.target) return;
  closeHeadquarters();
  window.setTimeout(() => {
    const target = document.querySelector(profile.target);
    if (!target) return;
    history.pushState({}, "", profile.target);
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    if (profile.action === "may15") {
      window.setTimeout(() => window.arcseToiLab?.startOne?.("may15"), 720);
    } else if (profile.action === "toi") {
      window.setTimeout(() => window.arcseToiLab?.start?.(), 720);
    }
  }, 180);
}

async function runHeadquartersBoot(query) {
  if (!headquartersLayer || hqBooting) return;
  hqBooting = true;
  headquartersLayer.classList.add("is-booting");
  await runHqBootLines(hqSearchBootLines, 300);
  headquartersLayer.classList.remove("is-booting");
  const profile = setHeadquartersResult(query);
  animateHqCounters();
  hqBooting = false;
  window.setTimeout(() => executeHqRoute(profile), 260);
}

function animateHqCounters() {
  if (hqHasCounted) return;
  hqHasCounted = true;
  document.querySelectorAll("[data-hq-count]").forEach((element) => {
    const target = Number(element.dataset.hqCount || 0);
    const duration = 1200;
    const start = performance.now();
    function frame(now) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = Math.round(target * eased).toLocaleString();
      if (progress < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
}

let hqLiveFeedStarted = false;
function startHqLiveFeed() {
  if (hqLiveFeedStarted) return;
  hqLiveFeedStarted = true;
  const timelineButtons = Array.from(document.querySelectorAll(".hq-mini-timeline button"));
  const notices = Array.from(document.querySelectorAll(".hq-notice-list p"));
  const feedItems = [
    ["TOI", "TOI reconstruction completed"],
    ["Evidence", "New evidence validated"],
    ["3005", "3005 archive synchronized"],
    ["May 15", "May15 replay verified"],
    ["Vault", "Investor vault updated"],
    ["Language", "Language pack ready"],
    ["Video", "Documentary localized"]
  ];
  const noticeItems = [
    ["All systems green.", "All organisms operating normally."],
    ["New TOI report available.", "Q2 2026 comprehensive analysis."],
    ["Legendary session recorded.", "3007 Micro Harvester session."],
    ["Documentary localized.", "Selected language presentation ready."]
  ];
  let index = 0;
  function tick() {
    timelineButtons.forEach((button) => button.classList.remove("is-live"));
    notices.forEach((notice) => notice.classList.remove("is-live"));
    const timeline = timelineButtons[index % timelineButtons.length];
    const item = feedItems[index % feedItems.length];
    if (timeline) {
      const label = timeline.querySelector("b");
      const body = timeline.querySelector("span");
      if (label) label.textContent = item[0];
      if (body) body.textContent = item[1];
      timeline.classList.add("is-live");
    }
    const notice = notices[index % notices.length];
    const noticeItem = noticeItems[index % noticeItems.length];
    if (notice) {
      notice.innerHTML = `<strong>${noticeItem[0]}</strong> ${noticeItem[1]}`;
      notice.classList.add("is-live");
    }
    index += 1;
  }
  tick();
  window.setInterval(tick, 3400);
}

function getPresentationVideoSpec() {
  const englishVideo = englishPack?.video || {};
  const activeVideo = activePack?.video || {};
  return {
    href: activeVideo.href || englishVideo.href || "why_arc_exists_video_v5/render/ARC_SE_WHY_ARC_EXISTS_V5_EN.mp4",
    poster: activeVideo.poster || englishVideo.poster || "why_arc_exists_video_v5/render/arcse frontpage.png",
    track: activeVideo.track || englishVideo.track || {
      src: "why_arc_exists_video_v5/render/ARC_SE_WHY_ARC_EXISTS_V5_EN.vtt",
      srclang: "en",
      label: "English"
    }
  };
}

function syncPresentationVideo() {
  if (!presentationVideo || !presentationSource) return;
  const spec = getPresentationVideoSpec();
  let changed = false;
  if (presentationSource.getAttribute("src") !== spec.href) {
    presentationSource.setAttribute("src", spec.href);
    changed = true;
  }
  if (spec.poster) presentationVideo.setAttribute("poster", spec.poster);
  presentationVideo.querySelectorAll("track[data-presentation-track]").forEach((track) => track.remove());
  if (spec.track?.src) {
    const track = document.createElement("track");
    track.kind = "subtitles";
    track.src = spec.track.src;
    track.srclang = spec.track.srclang || activeLanguage;
    track.label = spec.track.label || supportedLanguages[activeLanguage] || activeLanguage.toUpperCase();
    track.default = true;
    track.dataset.presentationTrack = "true";
    presentationVideo.appendChild(track);
  }
  presentationVideo.dataset.presentationLang = activeLanguage;
  if (changed) presentationVideo.load();
}

async function openPresentationOverlay() {
  if (!presentationOverlay || !presentationVideo) return;
  syncPresentationVideo();
  presentationOverlay.classList.add("open");
  presentationOverlay.setAttribute("aria-hidden", "false");
  document.body.classList.add("presentation-open");
  try {
    await presentationVideo.play();
  } catch {}
}

function closePresentationOverlay() {
  if (!presentationOverlay || !presentationVideo) return;
  presentationVideo.pause();
  presentationOverlay.classList.remove("open");
  presentationOverlay.setAttribute("aria-hidden", "true");
  document.body.classList.remove("presentation-open");
}

async function requestPresentationFullscreen() {
  const target = presentationVideo || presentationOverlay;
  if (!target?.requestFullscreen) return;
  try {
    await target.requestFullscreen();
  } catch {}
}

headquartersOpenButtons.forEach((button) => {
  button.addEventListener("click", () => openHeadquarters());
});

headquartersCloseButtons.forEach((button) => {
  button.addEventListener("click", closeHeadquarters);
});

presentationOpenButtons.forEach((button) => {
  button.addEventListener("click", openPresentationOverlay);
});

presentationCloseButtons.forEach((button) => {
  button.addEventListener("click", closePresentationOverlay);
});

presentationFullscreenButton?.addEventListener("click", requestPresentationFullscreen);

presentationOverlay?.addEventListener("click", (event) => {
  if (event.target === presentationOverlay) closePresentationOverlay();
});

hqInputs.forEach((input) => {
  input.addEventListener("input", () => {
    setHqQuery(input.value);
  });
});

document.querySelectorAll("[data-hq-search-form]").forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = form.querySelector("[data-hq-search-input]");
    const query = input?.value.trim() || "ARC SE";
    setHqQuery(query);
    runHeadquartersBoot(query);
  });
});

document.addEventListener("click", (event) => {
  const suggestion = event.target.closest("[data-hq-suggestion]");
  if (suggestion) {
    const query = suggestion.dataset.hqSuggestion;
    setHqQuery(query);
    hqAutocompleteMenus.forEach((menu) => menu.classList.remove("open"));
    runHeadquartersBoot(query);
  }
  const queryButton = event.target.closest("[data-hq-query]");
  if (queryButton) {
    const query = queryButton.dataset.hqQuery;
    setHqQuery(query);
    runHeadquartersBoot(query);
  }
});

function shouldOpenHeadquartersOnLanding() {
  const params = new URLSearchParams(window.location.search);
  return !window.location.hash && params.get("museum") !== "1";
}

if (shouldOpenHeadquartersOnLanding()) {
  window.setTimeout(() => openHeadquarters({ boot: true }), 160);
}

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
  if (event.key === "Escape") {
    closeLightbox();
    closePresentationOverlay();
  }
});

applyLanguage(getInitialLanguage(), { skipUrlUpdate: true });
