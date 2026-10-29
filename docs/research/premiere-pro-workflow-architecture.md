# Professional NLE Workflow & Architecture Research

This research document analyzes standard non-linear editing (NLE) application workflows (benchmarked against Adobe Premiere Pro conventions) and specifies the independent technical architecture for **ReaCut Studio**.

---

## 1. Application Window Structure and Workspace Organization

### Industry Benchmark
- **Layout:** High-density, multi-panel window arranged around an editing canvas.
- **Top Bar:** Native application menu bar (File, Edit, Clip, Sequence, Markers, Window, Help) followed by a Workspace Preset switcher (`Editing`, `Color`, `Audio`, `Effects`, `Export`).
- **Standard 4-Quadrant View:**
  1. **Top-Left:** Source Monitor & Effect Controls tabs.
  2. **Top-Right:** Program Monitor (Master sequence preview with timecode and playback controls).
  3. **Bottom-Left:** Project Bin / Media Browser / Effects library / History.
  4. **Bottom-Right:** Multitrack Timeline & Master Audio Meters.

### ReaCut Studio Implementation
- Dark workspace theme with `#121212` background, `#1e1e1e` panel surfaces, `#2a2a2a` borders, and `#0d99ff` / `#3182ce` active highlights.
- Dynamic panel dock manager with draggable splitters.
- Workspace presets (`Editing`, `Color`, `Audio`, `Effects`, `Export`) dynamically re-balance splitter ratios and toggle panel visibility.

---

## 2. Panel Resizing and Workspace Behavior

### Industry Benchmark
- Resizable splitters between quadrants allowing full horizontal and vertical expansion.
- Double-clicking splitters or selecting "Reset to Saved Layout" restores the default layout.

### ReaCut Studio Implementation
- Pure CSS flex-based splitters with mouse drag event listeners and smooth constraints (`min-width: 200px`, `min-height: 150px`).
- Layout state (panel widths and active tabs) is persisted to `localStorage` and optionally saved per project.

---

## 3. Media Import and Asset Organization

### Industry Benchmark
- **Import Methods:** File dialog (`Ctrl+I`), Drag-and-drop from OS file explorer, double-clicking empty bin area.
- **Organization:** Hierarchical bins (folders), list view with columns (Name, Frame Rate, Duration, Video Info, Media Start/End), thumbnail grid view with hover scrub.
- **Proxy Workflows:** Generating lower-resolution lightweight proxies (ProRes Proxy or 720p H.264) for smooth timeline playback.

### ReaCut Studio Implementation
- Project panel supports both Folder Bins and Media Items.
- Media probe using Electron IPC to extract duration, dimensions, FPS, video/audio codecs.
- Hover scrub on asset thumbnails in grid view.
- In-memory asset catalog mapped by unique UUIDs (`AssetId`).

---

## 4. Source and Program Monitor Behavior

### Industry Benchmark
- **Source Monitor:** Used to preview raw imported media, scrub, set In-Point (`I`) and Out-Point (`O`), and insert (`Comma ,`) or overwrite (`Period .`) onto the active timeline.
- **Program Monitor:** Renders the sequence at the current playhead position. Displays Sequence Timecode, safe-margin overlays (action/title safe 90%/80%), playback resolution scaling (Full, 1/2, 1/4), and interactive clip transform bounding boxes.

### ReaCut Studio Implementation
- Dual preview monitors: **Source Monitor** and **Program Monitor**.
- Synchronized playback controls: Play/Pause (`Space`), Step 1 frame back (`Left Arrow`), Step 1 frame forward (`Right Arrow`), J-K-L shuttle playback (`J` reverse, `K` pause, `L` fast forward).
- In/Out point marker overlay with visual duration indicator.
- Program monitor with canvas/WebGL rendering pipeline and draggable transformation handles.

---

## 5. Timeline Interactions and Editing Commands

### Industry Benchmark
- Frame-accurate timeline with snapping (`S` toggle), razor/split tool (`C`), selection tool (`V`), ripple delete (`Shift+Delete` or `Alt+Backspace`), and track target patches (V1, A1).
- Time coordinates represented as discrete frame counts rather than floating point seconds to eliminate fractional timing drift.

### ReaCut Studio Implementation
- Deterministic frame calculations:
  $$\text{frameIndex} = \text{round}(\text{timeInSeconds} \times \text{fps})$$
- Core command-pattern operations:
  - `SelectClip`, `MoveClip` (with track change and collision prevention)
  - `SplitClip` at playhead
  - `TrimClip` (adjust start or end source points and timeline durations)
  - `RippleDelete` (removes clip and shifts subsequent clips on affected tracks to close the gap)
  - `DuplicateClip`
  - `ToggleTrackLock`, `ToggleTrackMute`, `ToggleTrackSolo`, `ToggleTrackVisibility`
  - `AddMarker`, `RemoveMarker`
- Undo/Redo stack with immutable state snapshots.

---

## 6. Clip Properties and Effects

### Industry Benchmark
- Fixed intrinsic effects on every video clip: Motion (Position X/Y, Scale, Rotation, Anchor Point) and Opacity (Blend Mode, Opacity %).
- Fixed intrinsic audio effects: Volume / Gain, Channel Pan.
- Applied effect stack: Color adjustments (Brightness, Contrast, Saturation, Temperature, Tint), Blur, Sharpen, Crop.
- Transitions: Cross Dissolve, Dip to Black, Dip to White, Audio Constant Power Crossfade.

### ReaCut Studio Implementation
- Inspector panel dynamically reflects selected clip's properties.
- Extensible effect schema:
  - Intrinsic: `transform` (x, y, scaleX, scaleY, rotation, anchorX, anchorY), `opacity` (0.0 to 1.0).
  - Audio: `gain` (-60dB to +12dB), `mute`.
  - Visual filters: `brightness`, `contrast`, `saturation`, `blur`, `crop`.
  - Title clip: text content, font family, font size, fill color, stroke, background box.
- Preview renderer renders CSS/Canvas matrix transforms and filter pipelines; export generator translates these into FFmpeg filtergraph strings (`eq=brightness=...:contrast=...:saturation=...`, `boxblur=...`, `overlay=...`).

---

## 7. Project Save/Load Behavior

### Industry Benchmark
- Fast, non-destructive project serialization (`.prproj` is gzipped XML).
- Media files are referenced by path and metadata hash, never embedded into the project file.
- Automatic autosave intervals with rolling recovery files.

### ReaCut Studio Implementation
- Versioned `.rcproj` file structure (JSON format, validated against TypeScript schema).
- Autosave every 3 minutes to `%APPDATA%/ReaCutStudio/recovery/` or `.rcproj.autosave`.
- Relink media dialog: When opening a project, missing files trigger an interactive relinking modal with path resolution.

---

## 8. Export Settings and Progress Reporting

### Industry Benchmark
- Presets: YouTube 1080p, 4K UHD, 720p Social, ProRes Master, Audio Only WAV/MP3.
- Non-blocking background render with percentage progress bar, estimated time remaining, frame counter, and cancellation.

### ReaCut Studio Implementation
- Export modal with output filename, resolution (`3840x2160`, `1920x1080`, `1280x720`, `1080x1920` vertical), framerate (24, 25, 30, 60), video bitrate, audio bitrate, and format (`mp4`, `webm`, `wav`).
- Main process FFmpeg child process spawning with progress listener parsing stdout/stderr frame progress:
  $$\text{Progress} = \frac{\text{Current Frame}}{\text{Total Sequence Frames}} \times 100\%$$
- Interactive modal with cancel button and "Open in File Explorer" upon completion.

---

## 9. Keyboard Shortcuts and Common Editing Workflows

| Action | Shortcut (Standard) | ReaCut Studio Implementation |
| :--- | :--- | :--- |
| **Play / Pause** | `Space` | Implemented globally (when not typing in an input) |
| **Selection Tool** | `V` | Implemented |
| **Razor / Cut Tool** | `C` | Implemented |
| **Split at Playhead** | `Ctrl+K` | Implemented |
| **Ripple Delete** | `Shift+Delete` | Implemented |
| **Delete** | `Delete` / `Backspace` | Implemented |
| **Set In Point** | `I` | Implemented |
| **Set Out Point** | `O` | Implemented |
| **Clear In/Out** | `Alt+X` | Implemented |
| **Go to In Point** | `Shift+I` | Implemented |
| **Go to Out Point** | `Shift+O` | Implemented |
| **Zoom In Timeline** | `=` or `Ctrl+=` | Implemented |
| **Zoom Out Timeline**| `-` or `Ctrl+-` | Implemented |
| **Fit Timeline** | `\` | Implemented |
| **Toggle Snapping** | `S` | Implemented |
| **Save Project** | `Ctrl+S` | Implemented |
| **Save As** | `Ctrl+Shift+S` | Implemented |
| **Import Media** | `Ctrl+I` | Implemented |
| **Export Media** | `Ctrl+M` | Implemented |
| **Undo** | `Ctrl+Z` | Implemented |
| **Redo** | `Ctrl+Y` / `Ctrl+Shift+Z`| Implemented |

