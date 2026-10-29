# ReaCut Studio — System Architecture Documentation

**Product Name:** ReaCut Studio  
**Target Platform:** Windows 10/11 Desktop (Electron) & Modern Web Browsers (GitHub Pages)  
**Architecture Version:** 1.0.0  

---

## 1. High-Level Architectural Overview

ReaCut Studio is designed as a hybrid desktop and high-performance web non-linear video editing (NLE) application. The core editing engine, timecode arithmetic, timeline state management, and Canvas/WebGL preview pipeline are completely decoupled from operating system APIs, allowing the application to execute with full parity inside an Electron desktop container or directly in modern web browsers.

```
+-------------------------------------------------------------------------+
|                              ReaCut Studio                              |
+------------------------------------+------------------------------------+
|         Desktop Runtime            |             Web Runtime            |
|       (Electron Container)         |           (GitHub Pages)           |
|                                    |                                    |
| - Restricted contextBridge IPC     | - Web Audio API Destination        |
| - Native File Dialogs              | - Canvas captureStream()           |
| - FFprobe Media Metadata Probe     | - MediaRecorder Encoding (VP9/MP4) |
| - Native FFmpeg Render Engine      | - Blob file download & LocalStorage|
+------------------------------------+------------------------------------+
                                      |
                                      v
+-------------------------------------------------------------------------+
|                           Core Shared Engine                            |
+-------------------------------------------------------------------------+
| - Timecode Engine: Frame-accurate SMPTE HH:MM:SS:FF arithmetic          |
| - Timeline Model: Sequences, Video & Audio Tracks, Multi-Clip Registry  |
| - Command Pattern: Deterministic Undo/Redo (Move, Trim, Split, Ripple)  |
| - Magnetic Snapping Engine: Origin, Playhead, Boundaries, Markers       |
| - Project Manager: Versioned .rcproj JSON Schema, Autosave Recovery     |
| - Composition Pipeline: Canvas composite + Web Audio multi-bus mix      |
| - FFmpeg FilterGraph Compiler: Multitrack overlay, trim, volume & EQ    |
+-------------------------------------------------------------------------+
```

---

## 2. Directory Structure & Modular Separation

```
reacut-studio/
├── .github/
│   └── workflows/
│       └── deploy.yml          # Automated CI/CD build & GitHub Pages deployment
├── electron/
│   ├── main.ts                 # Main process, window lifecycle, FFmpeg/FFprobe child processes
│   └── preload.ts              # Secure context-isolated bridge (window.reacutApi)
├── src/
│   ├── app/
│   │   └── App.tsx             # Master workstation layout, quadrant splitters, keyboard shortcuts
│   ├── components/
│   │   ├── TopMenuBar.tsx      # Native NLE menu bar (File, Edit, Clip, Playback, View, Help)
│   │   └── WorkspaceSelector.tsx # Presets: Editing, Color, Audio, Effects, Export
│   ├── panels/
│   │   ├── ProjectPanel/       # Bins, asset grid/list, metadata, import & title generation
│   │   ├── SourceMonitor/      # Source preview, In/Out marking, insert/overwrite controls
│   │   ├── ProgramMonitor/     # Master sequence canvas, transform handles, safe margins, resolution
│   │   ├── Timeline/           # Multitrack video (V1-V3) & audio (A1-A3), ruler, playhead, trimming
│   │   ├── EffectsPanel/       # Visual effects, color grading, audio controls, transitions
│   │   ├── InspectorPanel/     # Clip properties: Motion (X/Y, scale, rot, opacity), Gain, Pan, Title
│   │   ├── AudioMeters/        # Calibrated stereo master VU peak meters (-60 dB to +6 dB)
│   │   └── ExportModal/        # Presets, resolution, bitrates, web render & FFmpeg cmd generation
│   ├── timeline/
│   │   ├── Timecode.ts         # SMPTE calculation, rational time, frame conversions
│   │   ├── TimelineModel.ts    # ClipItem, Track, Sequence, Marker, ProjectData definitions
│   │   ├── snapping.ts         # Magnetic snapping calculation
│   │   └── commands/           # Undo/Redo Command pattern implementation
│   ├── project/
│   │   ├── ProjectSchema.ts    # Strongly-typed .rcproj validation and serialization
│   │   └── ProjectManager.ts   # New, Save, Load, Autosave recovery, missing media relinker
│   ├── export/
│   │   ├── FFmpegFilterGraph.ts# Multi-input FFmpeg filtergraph compiler
│   │   └── WebExportRenderer.ts# Browser-native Canvas + WebAudio MediaRecorder export pipeline
│   ├── state/
│   │   └── useEditorStore.ts   # Centralized reactive Zustand store
│   └── main.tsx                # Application DOM entrypoint
├── tests/
│   ├── timecode.test.ts        # Unit tests for SMPTE time conversions
│   ├── timelineCommands.test.ts# Unit tests for Add, Move, Trim, Split, RippleDelete, Undo/Redo
│   ├── snapping.test.ts        # Unit tests for magnetic snapping
│   ├── projectSerialization.test.ts # Unit tests for .rcproj schema validation
│   └── ffmpegFilterGraph.test.ts    # Unit tests for filtergraph generation
├── docs/
│   ├── research/               # REA tool findings and benchmark research
│   ├── architecture/           # System design & security architecture
│   └── testing/                # Test execution matrix & results
├── package.json
├── tsconfig.json
├── tsconfig.electron.json
├── vite.config.ts
└── README.md
```

---

## 3. Electron Security Architecture

In strict compliance with Electron application security best practices:
1. **Context Isolation:** Enabled (`contextIsolation: true`) in `webPreferences`. The renderer process cannot access Node.js runtime globals.
2. **Node Integration Disabled:** (`nodeIntegration: false`).
3. **Sandbox Active:** (`sandbox: true`).
4. **Explicit IPC Whitelist:** All desktop capabilities (file dialogs, media probing, FFmpeg rendering) are mediated through explicit IPC channels (`dialog:openFile`, `dialog:saveFile`, `media:probe`, `export:render`, `export:cancel`) exposed via `contextBridge.exposeInMainWorld('reacutApi', ...)`.
5. **No Shell Invocations:** Renderer code never invokes raw shell strings. Child process spawning is strictly encapsulated within the main process with argument array validation.

---

## 4. Frame-Accurate Timing & Snapping Engine

To eliminate fractional IEEE 754 floating-point drift across long sequences, all timeline positioning, trimming, transitions, and audio sync are represented internally as integer frame counts:
$$\text{Timecode} = \text{pad}(HH) : \text{pad}(MM) : \text{pad}(SS) : \text{pad}(FF)$$
$$\text{Total Seconds} = \frac{\text{Frames}}{\text{FPS}}$$

Magnetic snapping calculates the Euclidean distance in frames between a dragging coordinate (clip start, clip end, or playhead) and all candidate boundaries:
$$\Delta f = |f_{\text{target}} - f_{\text{candidate}}| \le \text{Threshold}$$
When $\Delta f$ falls within the magnetic radius, the position snaps to the candidate boundary, guaranteeing zero-gap cuts.
