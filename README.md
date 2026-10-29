# ReaCut Studio ✂️
> **Professional Premiere Pro-Style Desktop Video Editor Powered by REA**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-34.2.0-47848F?logo=electron&logoColor=white)](https://electronjs.org)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6.1-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![FFmpeg](https://img.shields.io/badge/FFmpeg-9.0.2-007808?logo=ffmpeg&logoColor=white)](https://ffmpeg.org)

ReaCut Studio is an original, professional non-linear video editing (NLE) application built from the ground up with Electron, React, TypeScript, and FFmpeg, inspired by the professional workflows and layout organization of industry-standard tools like Adobe Premiere Pro.

---

## 🌟 Key Features

- **Professional Studio Workspace:**
  - Dark-themed editing interface (`#121212` / `#1b1b1b` surface) with adjustable quad-panel splitters.
  - Workspace Presets: `Editing`, `Color`, `Audio`, `Effects`, and `Export`.
  - Comprehensive native menu bar with standard NLE shortcuts (`Ctrl+N`, `Ctrl+O`, `Ctrl+S`, `Ctrl+I`, `Ctrl+M`).

- **Deterministic Frame-Accurate Timeline:**
  - Multitrack architecture supporting multiple video tracks (`V1`, `V2`, `V3`) and audio tracks (`A1`, `A2`, `A3`).
  - Strict integer frame calculations preventing floating-point IEEE 754 drift.
  - Interactive selection (`V`), razor cut (`C`), split at playhead (`Ctrl+K`), and ripple delete (`Shift+Delete`).
  - Head and tail edge trimming drag handles with real-time frame synchronization.
  - Magnetic Snapping (`S`) to clip boundaries, playhead, sequence markers, and origin.

- **Dual Monitor Workstation:**
  - **Source Monitor:** Preview raw source media, scrub, set In (`I`) and Out (`O`) points, clear In/Out (`Alt+X`), and insert (`Comma ,`) into the sequence.
  - **Program Monitor:** Master sequence preview with Canvas/WebGL compositor, transform rendering, safe margin overlays (90% action safe, 80% title safe), and playback resolution scaling (Full, 1/2, 1/4).

- **Inspector & Modular Effects Engine:**
  - Motion controls: Position X/Y, Scale (with uniform lock), Rotation, and Opacity.
  - Visual filters: Brightness, Contrast, Saturation, and Gaussian Blur.
  - Audio mixing: Per-clip and per-track Gain in decibels (-60 dB to +12 dB) with stereo panning (-1.0 to +1.0).
  - Title Clip Generator: Full custom typography, font sizing, fill colors, strokes, and alignment.
  - Master Audio VU Meters: Calibrated stereo peak meters (-60 dB to +6 dB) with animated LED response and peak hold.

- **Dual Rendering & Export Engine:**
  - **Web / In-Browser Export:** Real-time sequence rendering via HTML5 Canvas + Web Audio API + MediaRecorder to WebM/MP4, enabling zero-dependency exports on GitHub Pages!
  - **Native FFmpeg Export Pipeline:** Multi-input filtergraph compilation (`scale`, `overlay`, `eq`, `volume`, `adelay`, `amix`) executed via native child processes.

- **Robust Project System:**
  - Versioned `.rcproj` JSON schema with integrity validation.
  - Automatic autosave recovery checkpoints every 3 minutes.
  - Missing media detection and path relinking.

---

## 🔬 REA Reverse-Engineering Integration & Ethical Compliance

ReaCut Studio incorporates the findings and methodology of the **REA (Reverse Engineer Anything)** assistant:
- Verified REA environment: `rea-agents@6.8.0`, Node.js `v26.13.0`, Ghidra 12.1.4 provider available.
- **Lawful & Ethical Target Analysis:** As documented in `docs/research/rea-environment-and-premiere-analysis.md`, the host environment was scanned and determined to contain no proprietary Adobe Premiere Pro binaries. In compliance with lawful reverse-engineering standards, no proprietary code, assets, or undocumented algorithms were extracted. All UI layouts, timeline data structures, command patterns, and filter pipelines were independently engineered based on open NLE industry specifications.

---

## ⌨️ Keyboard Shortcuts Reference

| Shortcut | Action |
| :--- | :--- |
| `Space` | Toggle Play / Pause Sequence |
| `V` | Activate Selection Tool |
| `C` | Activate Razor / Cut Tool |
| `Ctrl+K` | Split Clip at Playhead |
| `Delete` | Delete Selected Clip |
| `Shift+Delete` | Ripple Delete Selected Clip (Closes Gap) |
| `S` | Toggle Magnetic Snapping |
| `I` | Mark In Point in Source Monitor |
| `O` | Mark Out Point in Source Monitor |
| `,` (Comma) | Insert Source Clip to Timeline at Playhead |
| `Ctrl+Z` | Undo Timeline Edit |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo Timeline Edit |
| `Ctrl+S` | Save Project (`.rcproj`) |
| `Ctrl+I` | Import Media Files |
| `Ctrl+M` | Open Export Sequence Dialog |
| `Left Arrow` | Step 1 Frame Backward |
| `Right Arrow` | Step 1 Frame Forward |

---

## 🚀 Getting Started

### Prerequisites
- Node.js `^22.23.4 || ^24.22.1 || >=26.12.1`
- FFmpeg (Installed on system or via Winget: `winget install Gyan.FFmpeg`)

### Installation & Launch

1. **Clone the repository:**
   ```bash
   git clone https://github.com/reacut/reacut-studio.git
   cd "reacut-studio"
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start Development Server (Web / Browser Mode):**
   ```bash
   npm run dev
   ```

4. **Launch Desktop App (Electron):**
   ```bash
   npm run dev:electron
   ```

5. **Run Automated Test Suite:**
   ```bash
   npm run test
   ```

6. **Build for GitHub Pages:**
   ```bash
   npm run build:web
   ```

---

## 📄 License & Distribution

- ReaCut Studio is released under the **MIT License**.
- FFmpeg is licensed under the LGPL v2.1+ / GPL v2+. See [ffmpeg.org](https://ffmpeg.org) for details.

