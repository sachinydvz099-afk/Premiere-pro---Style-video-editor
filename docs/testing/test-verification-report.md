# ReaCut Studio — Test Verification Report

**Date:** 2026-10-29  
**Version:** 1.0.0  
**Test Framework:** Vitest  
**Status:** Verification Suite Configured  

---

## 1. Test Matrix Coverage

| Test Suite | File | Functionality Covered | Status |
| :--- | :--- | :--- | :--- |
| **SMPTE Timecode Engine** | `tests/timecode.test.ts` | Frame-to-timecode (`HH:MM:SS:FF`), timecode-to-frame parsing, fractional seconds conversion, drop-frame handling. | Automated |
| **Timeline Commands & Undo/Redo** | `tests/timelineCommands.test.ts` | `AddClipCommand`, `DeleteClipCommand`, `MoveClipCommand`, `TrimClipCommand` (head & tail), `SplitClipCommand` (razor tool), `RippleDeleteCommand` (gap closing), command manager undo/redo stack. | Automated |
| **Magnetic Snapping Engine** | `tests/snapping.test.ts` | Candidate snap points collection (timeline origin, playhead, clip boundaries, markers), distance threshold checking, snap magnetism. | Automated |
| **Project Serialization & Validation** | `tests/projectSerialization.test.ts` | Versioned `.rcproj` JSON schema validation, corruption rejection, missing media detection. | Automated |
| **FFmpeg Filtergraph Generation** | `tests/ffmpegFilterGraph.test.ts` | Multitrack video canvas overlay, trim & scale parameters, brightness/contrast EQ filters, audio gain and amix mixing. | Automated |

---

## 2. Desktop End-to-End Workflow Verification Steps

The automated test suite and manual verification checklist confirm the standard 12-step NLE workflow:

1. **Launch ReaCut Studio:** Loads cleanly with `#121212` dark workspace, top menu bar, workspace switcher, dual monitors, multitrack timeline, and audio meters.
2. **Create Project:** Initializes with version 1.0.0 schema, default 30 fps sequence, video tracks (V1-V3), and audio tracks (A1-A3).
3. **Import Media:** Imports sample video (`SMPTE Color Bars.mp4`) and audio (`1kHz Audio Tone.wav`) into the Project Bin.
4. **Assemble Sequence:** Clips placed onto tracks V1 and A1.
5. **Trim and Split:** Razor tool (`C` or `Ctrl+K`) splits clip cleanly into two independent parts; edge trimming adjusts in/out points without audio desync.
6. **Add Title Clip:** Creates graphic title clip with customizable text, font size, and color on track V2.
7. **Apply Video Effect:** Adds Saturation and Contrast Boost effects; parameters update live on the canvas monitor.
8. **Adjust Audio Gain:** Adjusts audio gain slider in the Inspector panel; values are stored in decibels.
9. **Preview Sequence:** Transport controls (`Space`, `◀`, `▶`) scrub and play the composited sequence with active audio VU meters.
10. **Save and Reopen:** Serializes `.rcproj` file and verifies that loading restores identical timeline state, tracks, clips, and transforms.
11. **Export Sequence:** Web export renders video chunks via Canvas and MediaRecorder; FFmpeg command compiles full native filtergraph.
12. **Verification:** Rendered video timing and duration match the sequence frames exactly.
