# ARC SE - Why ARC SE Exists Asset Manifest

Asset search roots:

- `C:\Users\User\Desktop\ARCPDF\INVESTORS PRESENTATION`
- `D:\5m-rapid-desktop`

FFmpeg status during package creation:

- `ffmpeg` not found in PATH.
- Chocolatey was available, but the system install failed because the shell did not have access to the Chocolatey ProgramData lock/lib folders.
- Chocolatey did download `ffmpeg-release-essentials.7z` into the user temp folder.
- The portable FFmpeg package was extracted into `why_arc_exists_video_package\tools\ffmpeg`.
- Final render used `why_arc_exists_video_package\tools\ffmpeg\ffmpeg-8.1.1-essentials_build\bin\ffmpeg.exe`.
- Final MP4 exists at `why_arc_exists_video_package\render\WHY_ARC_EXISTS.mp4`.

Local TTS status during package creation:

- Windows System.Speech available.
- Installed voices found: Microsoft Hazel Desktop, Microsoft Zira Desktop, Microsoft Hedda Desktop.
- No local male voice detected.
- Recommended final narration: external calm male documentary voice.

## Ranked Primary Assets

| Rank | Asset | Use | Why it matters |
|---:|---|---|---|
| 1 | `arc_se_website_assets/may15-resurrection-shape-page39.jpg` | May15 proof | Shows the preserved historical event and retention shape. |
| 2 | `arc_se_website_assets/watcher-tab-analytics-build.png` | Watcher proof | Shows memory, replay, analysis, and evidence ranking. |
| 3 | `arc_se_website_assets/runtime-3002-dashboard.png` | Coordinator proof | Shows command routing and authority boundary evidence. |
| 4 | `arc_se_website_assets/3004-tab-overview.png` | 3004 proof | Shows truth surface and state visibility. |
| 5 | `arc_se_website_assets/organism-3005.png` | 3005 proof | Bearish/down continuation organism evidence. |
| 6 | `arc_se_website_assets/organism-3006.png` | 3006 proof | Bullish/up continuation organism evidence. |
| 7 | `arc_se_website_assets/organism-3007.png` | 3007 proof | Micro-harvest and April recovery lineage evidence. |
| 8 | `arc_se_website_assets/runtime-3008-dashboard.png` | 3008 proof | Runtime layer evidence. |
| 9 | `arc_se_website_assets/parity-quality-matrix.png` | Parity proof | Shows paper/live/replay/source-class discipline. |
| 10 | `arc_se_website_assets/qa-vault.png` | Evidence Vault proof | Shows the diligence room and PDF evidence surface. |
| 11 | `arc_se_website_assets/historical-runtime-contact-sheet.jpg` | Five-month history | Strong montage asset for "thousands of sessions." |
| 12 | `arc_se_website_assets/plate-evolution-timeline.png` | Reconstruction history | Clean timeline for the evidence journey. |
| 13 | `arc_se_website_assets/profit_evidence/top_sessions_net_extracted.png` | Economic validation | Shows extraction evidence without leading the video with profit. |
| 14 | `arc_se_website_assets/micro_harvest_evidence/micro_peak_vs_realized_capture.png` | Micro harvest | Shows peak vs realized capture by session. |
| 15 | `arc_se_website_assets/profit_evidence/source_paper_to_live_realism.png` | Caveat | Supports realism caution and paper/live discipline. |

## D-Drive Alternate Assets

Use these if the local website assets are unavailable or if a deeper documentary cut is needed.

| Asset | Use |
|---|---|
| `D:\5m-rapid-desktop\deliverables\arc_se_master_dossier\assets\evolution_timeline.png` | Timeline alternate |
| `D:\5m-rapid-desktop\deliverables\arc_se_master_dossier\assets\architecture_map.png` | Ecosystem map alternate |
| `D:\5m-rapid-desktop\deliverables\arc_se_master_dossier\assets\plate_may15_stats.png` | May15 stats alternate |
| `D:\5m-rapid-desktop\deliverables\arc_se_master_dossier\assets\plate_watcher_collector.png` | Watcher collector alternate |
| `D:\5m-rapid-desktop\deliverables\arc_se_master_dossier\assets\plate_coordinator.png` | Coordinator alternate |
| `D:\5m-rapid-desktop\deliverables\arcse-master-investor-report\assets\screenshots\port-3004-overview-2026-06-03T08-31-50-655Z.png` | 3004 overview source |
| `D:\5m-rapid-desktop\deliverables\arcse-master-investor-report\assets\historical-screenshots\08-arcse-coordinator-3002-dashboard-20260525.png` | Coordinator source |
| `D:\5m-rapid-desktop\deliverables\arcse-master-investor-report\assets\evidence-plates\watcher-intelligence-era.png` | Watcher era plate |
| `D:\5m-rapid-desktop\deliverables\arcse-master-investor-report\assets\evidence-plates\paper-to-live-realism.png` | Paper/live realism source |
| `D:\5m-rapid-desktop\deliverables\arcse-master-investor-report\assets\evidence-plates\top-10-session-net-chart.png` | Economic evidence source |

## Render Package Output

The render script creates:

- `why_arc_exists_video_package\assets`
- `why_arc_exists_video_package\frames`
- `why_arc_exists_video_package\audio`
- `why_arc_exists_video_package\render`
- `why_arc_exists_video_package\render\WHY_ARC_EXISTS.mp4`

Final verification:

- Format: MP4, H.264 video, AAC silent audio bed.
- Resolution: 1920x1080.
- Frame rate: 30 fps.
- Duration: 174.966667 seconds, under 3 minutes.
- Decode test: passed with FFmpeg `-f null NUL`.
- Subtitle check: burned-in captions sampled at proof, economic validation, and final question scenes.
- Narration status: no local male Windows TTS voice exists; narration remains an external male-voice step.
