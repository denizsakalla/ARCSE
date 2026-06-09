# ARC SE Digital Headquarters Deployment

## Expected Web Root

Upload the contents of this folder as the web root of the static site.

The entry file is:

- `index.html`

`arc_se_overview.html` is included as a same-site alias for local review and archival continuity.

## Folder Structure

- `index.html` - main public ARC SE experience.
- `arc_se_overview.html` - archival alias of the same experience.
- `arcse-experience.css` - complete visual system, responsive layout, and multilingual overflow safeguards.
- `arcse-experience.js` - navigation state, language loading, TOI forensic replay lab, reveal motion, vault asset overrides, and screenshot lightbox.
- `lang/` - JSON language packs plus `language-packs.js`, a generated local-preview fallback for English, Bulgarian, Turkish, German, Japanese, French, Spanish, and Simplified Chinese.
- `arc_se_website_assets/` - website screenshots, organism assets, charts, proof surfaces, QA captures, and visual manifests.
- `arc_se_website_assets/leviathan_archive/` - Project Leviathan restricted archive screenshots used in the historical reconstruction exhibit.
- `arc_se_overview_assets/` - extracted source visuals from the earlier overview/PDF assets.
- `why_arc_exists_video_v5/` - final documentary renders, localized narration/subtitle files, poster images, QA frames, and documentary production assets used by the site.
- `ARC_SE_INVESTOR_EVIDENCE_BUNDLE/` - bundled diligence PDFs, screenshots, source visuals, and bundle manifest.
- `legendary_sessions_output/`, `strategic_acquisition_output/`, `valuation_thesis_output/`, and other `*_output/` folders - report outputs and supporting diligence artifacts.
- Root `*.pdf` and `*.xlsx` files - direct-download reports linked from the Investor Room / Evidence Vault.
- Root `*.md` and `.srt` files - source summaries, linkage notes, documentary scripts, subtitles, and manifests.

## Deployment Instructions

1. Unpack the release archive.
2. Upload every file and folder inside this directory to the static host.
3. Configure the host to serve `index.html` as the default document.
4. No build step, server runtime, environment variable, database, or package install is required.

## Experience Structure

The site is arranged as one continuous documentary journey:

1. Introduction
2. Transferable Operational Intelligence
3. Founder Story
4. Truth Crisis
5. Organisms
6. Restricted Archive / Project Leviathan
7. Legendary Sessions
8. Investor Room / Evidence Vault

The Transferable Operational Intelligence room is an interactive operational intelligence laboratory. Each canonical session has its own `Reconstruct Session` control. Pressing it opens an ARC SE reconstruction console, runs the preserved-history loading pipeline, then rebuilds that one historical session through the modern ARC SE interface for roughly 60 seconds. The completed session freezes, switches into its original preserved evidence screenshot, and leaves that evidence visible for comparison. The `?toiFast=1` query parameter exists only for validation and QA automation; public links should use the normal replay timing.

## Multilingual Support

The site is one static HTML experience. It does not duplicate pages per language.

Language packs live in:

- `lang/en.json`
- `lang/bg.json`
- `lang/tr.json`
- `lang/de.json`
- `lang/ja.json`
- `lang/fr.json`
- `lang/es.json`
- `lang/zh.json`

The top navigation selector loads the chosen JSON pack, replaces visible copy, updates `document.title`, updates the meta description, sets `<html lang="">`, stores the selection in `localStorage` under `arcse-language`, and switches the documentary video and caption track to the matching language.

The documentary files are packaged in `why_arc_exists_video_v5/render/`:

- `ARC_SE_WHY_ARC_EXISTS_V5_EN.mp4` plus `.vtt` and `.srt`
- `ARC_SE_WHY_ARC_EXISTS_V5_BG.mp4` plus `.vtt` and `.srt`
- `ARC_SE_WHY_ARC_EXISTS_V5_TR.mp4` plus `.vtt` and `.srt`
- `ARC_SE_WHY_ARC_EXISTS_V5_DE.mp4` plus `.vtt` and `.srt`
- `ARC_SE_WHY_ARC_EXISTS_V5_JA.mp4` plus `.vtt` and `.srt`
- `ARC_SE_WHY_ARC_EXISTS_V5_FR.mp4` plus `.vtt` and `.srt`
- `ARC_SE_WHY_ARC_EXISTS_V5_ES.mp4` plus `.vtt` and `.srt`
- `ARC_SE_WHY_ARC_EXISTS_V5_ZH.mp4` plus `.vtt` and `.srt`

The `Watch Documentary` button opens the single documentary room. The video inside that room automatically uses the currently selected language. The Evidence Vault documentary link also changes to the selected language's video.

For normal static hosting, the runtime reads `lang/*.json`. For direct local preview from disk, some browsers block JSON `fetch()` on `file://`; `lang/language-packs.js` mirrors the same language packs so the selector still works when `index.html` is opened locally.

Direct language links are supported with the query parameter:

- `index.html?lang=bg`
- `index.html?lang=tr`
- `index.html?lang=de`
- `index.html?lang=ja`
- `index.html?lang=fr`
- `index.html?lang=es`
- `index.html?lang=zh`

If a translation key is missing, the runtime falls back to English and reports missing keys to `window.arcseI18n.missingKeys` and the browser console.

## Adding Another Language

1. Copy `lang/en.json` to a new language code, for example `lang/it.json`.
2. Translate `meta`, `ui`, and every value in `strings`.
3. Keep the keys in `strings` exactly unchanged.
4. Add the language code and selector label in `arcse-experience.js` and `index.html`.
5. Add the localized documentary MP4 plus `.vtt` and `.srt` captions, then point `video.href`, `video.track.src`, `video.subtitles`, and `vault.documentary.href` at those files.
6. Regenerate or update `lang/language-packs.js` so local file preview keeps working.
7. Add any CSS-specific handling if the language needs special wrapping or font fallback.

## PDF And Video Overrides

The current public links point to the available English PDFs. Non-English labels mark those PDF links as English PDFs in the selected language.

The documentary is already localized for all supported languages. Each language pack routes `video.href`, `video.track.src`, and `vault.documentary.href` to that language's packaged MP4 and captions.

Each language pack is ready for future overrides:

- `vault.<item>.href` controls each Evidence Vault download path.
- `vault.<item>.languageNote` controls the visible PDF language note.
- `video.href` controls the documentary video file.
- `video.poster` controls the documentary poster image.
- `video.track.src` controls the documentary caption file.
- `video.subtitles.vtt` and `video.subtitles.srt` document the packaged subtitle assets.

To replace an English PDF with a translated file later, add the translated file to the package and update only that language pack:

```json
"vault": {
  "founder": {
    "href": "translated/ARC_SE_FOUNDER_STORY_IT.pdf",
    "languageNote": "PDF in italiano"
  }
}
```

To replace the documentary for a language, update:

```json
"video": {
  "href": "translated/ARC_SE_WHY_ARC_EXISTS_IT.mp4",
  "poster": "translated/ARC_SE_WHY_ARC_EXISTS_IT_POSTER.png",
  "track": {
    "src": "translated/ARC_SE_WHY_ARC_EXISTS_IT.vtt",
    "srclang": "it",
    "label": "Italiano"
  },
  "subtitles": {
    "vtt": "translated/ARC_SE_WHY_ARC_EXISTS_IT.vtt",
    "srt": "translated/ARC_SE_WHY_ARC_EXISTS_IT.srt"
  }
}
```

Keep all paths relative to `index.html`.

## Download Wiring

The Evidence Vault links use relative paths from `index.html`.

Examples:

- Documentary: language-routed through `vault.documentary.href`, for example `why_arc_exists_video_v5/render/ARC_SE_WHY_ARC_EXISTS_V5_EN.mp4` for English or `why_arc_exists_video_v5/render/ARC_SE_WHY_ARC_EXISTS_V5_JA.mp4` for Japanese.
- Founder Story: `ARC_SE_FOUNDER_STORY_1.pdf`
- Evolution PDF: `ARC_SE_EVOLUTION_DOCUMENTARY_2.pdf`
- Resurrection PDF: `ARC_SE_MAY15_RESURRECTION_3.pdf`
- TOI PDF: `ARC_SE_TRANSFERABLE_OPERATIONAL_INTELLIGENCE_REPORT.pdf`
- Ecosystem PDF: `ARC_SE_ECOSYSTEM_DOSSIER_EN.pdf`
- Legendary Sessions: `legendary_sessions_output/ARC_SE_LEGENDARY_SESSIONS_HALL_OF_LEGENDS_EN.pdf`
- Evidence Bundle Manifest: `ARC_SE_INVESTOR_EVIDENCE_BUNDLE/BUNDLE_MANIFEST.md`

Keep the folder names unchanged after upload so these relative paths remain valid.

## Required Configuration

None. This is a vanilla static deployment package.

Recommended host behavior:

- Serve `.json` as `application/json`.
- Serve `.mp4` as `video/mp4`.
- Serve `.pdf` as `application/pdf`.
- Support byte-range requests for smoother video playback.
