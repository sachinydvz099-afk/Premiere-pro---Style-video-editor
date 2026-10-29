/**
 * Global reactive editor state store for ReaCut Studio using Zustand.
 */

import { create } from 'zustand';
import {
  ProjectData,
  Sequence,
  MediaAsset,
  ClipItem,
  createDefaultTransform,
  createDefaultAudio
} from '../timeline/TimelineModel';
import { ProjectManager } from '../project/ProjectManager';
import { CommandManager } from '../timeline/commands/Command';
import {
  AddClipCommand,
  DeleteClipCommand,
  MoveClipCommand,
  TrimClipCommand,
  SplitClipCommand,
  RippleDeleteCommand
} from '../timeline/commands/TimelineCommands';

export type WorkspacePreset = 'editing' | 'color' | 'audio' | 'effects' | 'export';
export type TimelineTool = 'select' | 'cut' | 'ripple';

export interface EditorState {
  project: ProjectData;
  activeSequenceId: string;
  currentPlayheadFrame: number;
  isPlaying: boolean;
  playbackSpeed: number;
  selectedClipIds: string[];
  activeTool: TimelineTool;
  timelineZoom: number; // Pixels per frame
  timelineScrollLeft: number;
  snappingEnabled: boolean;
  activeWorkspace: WorkspacePreset;

  // Source Monitor State
  sourceAssetId: string | null;
  sourcePlayheadFrame: number;
  sourceInFrame: number | null;
  sourceOutFrame: number | null;

  // View Settings
  playbackResolution: 'full' | 'half' | 'quarter';
  showSafeMargins: boolean;
  isExportModalOpen: boolean;
  isRelinkModalOpen: boolean;

  // Command History
  commandManager: CommandManager;
  canUndo: boolean;
  canRedo: boolean;

  // Actions
  setProject: (project: ProjectData) => void;
  setActiveSequence: (seqId: string) => void;
  setPlayhead: (frame: number) => void;
  setIsPlaying: (playing: boolean) => void;
  togglePlay: () => void;
  stepFrame: (delta: number) => void;
  setSelectedClips: (clipIds: string[]) => void;
  setActiveTool: (tool: TimelineTool) => void;
  setTimelineZoom: (zoom: number) => void;
  toggleSnapping: () => void;
  setWorkspace: (ws: WorkspacePreset) => void;
  setPlaybackResolution: (res: 'full' | 'half' | 'quarter') => void;
  toggleSafeMargins: () => void;
  setExportModalOpen: (open: boolean) => void;
  setRelinkModalOpen: (open: boolean) => void;

  // Source Monitor Actions
  setSourceAsset: (assetId: string | null) => void;
  setSourcePlayhead: (frame: number) => void;
  setSourceInPoint: (frame?: number) => void;
  setSourceOutPoint: (frame?: number) => void;
  clearSourceInOut: () => void;
  insertSourceClipToTimeline: () => void;

  // Timeline Editing Commands
  undo: () => void;
  redo: () => void;
  addClipToTimeline: (clip: ClipItem) => void;
  moveClip: (clipId: string, newStartFrame: number, newTrackId?: string) => void;
  trimClip: (clipId: string, side: 'start' | 'end', deltaFrames: number) => void;
  splitClipAtPlayhead: () => void;
  deleteSelectedClips: () => void;
  rippleDeleteSelectedClips: () => void;
  toggleTrackLock: (trackId: string) => void;
  toggleTrackVisibility: (trackId: string) => void;
  toggleTrackMute: (trackId: string) => void;
  toggleTrackSolo: (trackId: string) => void;

  // Asset & Title management
  addAsset: (asset: MediaAsset) => void;
  addTitleClip: (text: string) => void;
  updateClipTransform: (clipId: string, updates: Partial<ClipItem['transform']>) => void;
  updateClipAudio: (clipId: string, updates: Partial<ClipItem['audio']>) => void;
  updateClipEffects: (clipId: string, effects: ClipItem['effects']) => void;
  updateClipTitle: (clipId: string, titleProps: Partial<NonNullable<ClipItem['titleProperties']>>) => void;
}

const initialProject = ProjectManager.createNewProject('ReaCut Project 1');
const commandManager = new CommandManager();

export const useEditorStore = create<EditorState>((set, get) => ({
  project: initialProject,
  activeSequenceId: initialProject.activeSequenceId,
  currentPlayheadFrame: 0,
  isPlaying: false,
  playbackSpeed: 1.0,
  selectedClipIds: [],
  activeTool: 'select',
  timelineZoom: 4.0, // Default 4 pixels per frame
  timelineScrollLeft: 0,
  snappingEnabled: true,
  activeWorkspace: 'editing',

  sourceAssetId: null,
  sourcePlayheadFrame: 0,
  sourceInFrame: null,
  sourceOutFrame: null,

  playbackResolution: 'full',
  showSafeMargins: false,
  isExportModalOpen: false,
  isRelinkModalOpen: false,

  commandManager,
  canUndo: false,
  canRedo: false,

  setProject: (project) => set({
    project,
    activeSequenceId: project.activeSequenceId,
    currentPlayheadFrame: 0,
    selectedClipIds: [],
    canUndo: false,
    canRedo: false
  }),

  setActiveSequence: (seqId) => set({ activeSequenceId: seqId, currentPlayheadFrame: 0 }),

  setPlayhead: (frame) => {
    const { project, activeSequenceId } = get();
    const seq = project.sequences[activeSequenceId];
    const maxFrames = seq ? seq.durationFrames : 3600;
    set({ currentPlayheadFrame: Math.max(0, Math.min(frame, maxFrames)) });
  },

  setIsPlaying: (isPlaying) => set({ isPlaying }),

  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

  stepFrame: (delta) => {
    const { currentPlayheadFrame, setPlayhead } = get();
    setPlayhead(currentPlayheadFrame + delta);
  },

  setSelectedClips: (clipIds) => set({ selectedClipIds: clipIds }),

  setActiveTool: (activeTool) => set({ activeTool }),

  setTimelineZoom: (timelineZoom) => set({ timelineZoom: Math.max(0.5, Math.min(30, timelineZoom)) }),

  toggleSnapping: () => set((state) => ({ snappingEnabled: !state.snappingEnabled })),

  setWorkspace: (activeWorkspace) => set({ activeWorkspace }),

  setPlaybackResolution: (playbackResolution) => set({ playbackResolution }),

  toggleSafeMargins: () => set((state) => ({ showSafeMargins: !state.showSafeMargins })),

  setExportModalOpen: (isExportModalOpen) => set({ isExportModalOpen }),

  setRelinkModalOpen: (isRelinkModalOpen) => set({ isRelinkModalOpen }),

  setSourceAsset: (sourceAssetId) => set({
    sourceAssetId,
    sourcePlayheadFrame: 0,
    sourceInFrame: null,
    sourceOutFrame: null
  }),

  setSourcePlayhead: (frame) => set({ sourcePlayheadFrame: Math.max(0, frame) }),

  setSourceInPoint: (frame) => set((state) => ({
    sourceInFrame: frame !== undefined ? frame : state.sourcePlayheadFrame
  })),

  setSourceOutPoint: (frame) => set((state) => ({
    sourceOutFrame: frame !== undefined ? frame : state.sourcePlayheadFrame
  })),

  clearSourceInOut: () => set({ sourceInFrame: null, sourceOutFrame: null }),

  insertSourceClipToTimeline: () => {
    const { project, activeSequenceId, sourceAssetId, sourceInFrame, sourceOutFrame, currentPlayheadFrame, addClipToTimeline } = get();
    if (!sourceAssetId) return;
    const asset = project.assets[sourceAssetId];
    if (!asset) return;

    const start = sourceInFrame ?? 0;
    const end = sourceOutFrame ?? (asset.durationFrames || 150);
    const duration = Math.max(1, end - start);

    const targetTrackId = asset.type === 'audio' ? 'a1' : 'v1';

    const newClip: ClipItem = {
      id: 'clip_' + Math.random().toString(36).substring(2, 9),
      mediaId: asset.id,
      trackId: targetTrackId,
      name: asset.name,
      type: asset.type,
      timelineStartFrame: currentPlayheadFrame,
      durationFrames: duration,
      sourceStartFrame: start,
      sourceEndFrame: end,
      speed: 1.0,
      muted: false,
      visible: true,
      transform: createDefaultTransform(),
      audio: createDefaultAudio(),
      effects: []
    };

    addClipToTimeline(newClip);
  },

  undo: () => {
    const { project, activeSequenceId, commandManager } = get();
    const seq = project.sequences[activeSequenceId];
    if (!seq) return;

    const restoredSeq = commandManager.undo(seq);
    if (restoredSeq) {
      set({
        project: {
          ...project,
          sequences: { ...project.sequences, [activeSequenceId]: restoredSeq }
        },
        canUndo: commandManager.canUndo(),
        canRedo: commandManager.canRedo()
      });
    }
  },

  redo: () => {
    const { project, activeSequenceId, commandManager } = get();
    const seq = project.sequences[activeSequenceId];
    if (!seq) return;

    const restoredSeq = commandManager.redo(seq);
    if (restoredSeq) {
      set({
        project: {
          ...project,
          sequences: { ...project.sequences, [activeSequenceId]: restoredSeq }
        },
        canUndo: commandManager.canUndo(),
        canRedo: commandManager.canRedo()
      });
    }
  },

  addClipToTimeline: (clip) => {
    const { project, activeSequenceId, commandManager } = get();
    const seq = project.sequences[activeSequenceId];
    if (!seq) return;

    const cmd = new AddClipCommand(clip);
    const updatedSeq = commandManager.executeCommand(cmd, seq);

    set({
      project: {
        ...project,
        sequences: { ...project.sequences, [activeSequenceId]: updatedSeq }
      },
      selectedClipIds: [clip.id],
      canUndo: commandManager.canUndo(),
      canRedo: commandManager.canRedo()
    });
  },

  moveClip: (clipId, newStartFrame, newTrackId) => {
    const { project, activeSequenceId, commandManager } = get();
    const seq = project.sequences[activeSequenceId];
    if (!seq || !seq.clips[clipId]) return;

    const cmd = new MoveClipCommand(clipId, newStartFrame, newTrackId);
    const updatedSeq = commandManager.executeCommand(cmd, seq);

    set({
      project: {
        ...project,
        sequences: { ...project.sequences, [activeSequenceId]: updatedSeq }
      },
      canUndo: commandManager.canUndo(),
      canRedo: commandManager.canRedo()
    });
  },

  trimClip: (clipId, side, deltaFrames) => {
    const { project, activeSequenceId, commandManager } = get();
    const seq = project.sequences[activeSequenceId];
    if (!seq || !seq.clips[clipId]) return;

    const cmd = new TrimClipCommand(clipId, side, deltaFrames);
    const updatedSeq = commandManager.executeCommand(cmd, seq);

    set({
      project: {
        ...project,
        sequences: { ...project.sequences, [activeSequenceId]: updatedSeq }
      },
      canUndo: commandManager.canUndo(),
      canRedo: commandManager.canRedo()
    });
  },

  splitClipAtPlayhead: () => {
    const { project, activeSequenceId, currentPlayheadFrame, commandManager } = get();
    const seq = project.sequences[activeSequenceId];
    if (!seq) return;

    // Find any clip intersecting the playhead
    const targetClip = Object.values(seq.clips).find(
      c => currentPlayheadFrame > c.timelineStartFrame && currentPlayheadFrame < c.timelineStartFrame + c.durationFrames
    );

    if (targetClip) {
      const cmd = new SplitClipCommand(targetClip.id, currentPlayheadFrame);
      const updatedSeq = commandManager.executeCommand(cmd, seq);

      set({
        project: {
          ...project,
          sequences: { ...project.sequences, [activeSequenceId]: updatedSeq }
        },
        canUndo: commandManager.canUndo(),
        canRedo: commandManager.canRedo()
      });
    }
  },

  deleteSelectedClips: () => {
    const { project, activeSequenceId, selectedClipIds, commandManager } = get();
    let seq = project.sequences[activeSequenceId];
    if (!seq || selectedClipIds.length === 0) return;

    for (const clipId of selectedClipIds) {
      const cmd = new DeleteClipCommand(clipId);
      seq = commandManager.executeCommand(cmd, seq);
    }

    set({
      project: {
        ...project,
        sequences: { ...project.sequences, [activeSequenceId]: seq }
      },
      selectedClipIds: [],
      canUndo: commandManager.canUndo(),
      canRedo: commandManager.canRedo()
    });
  },

  rippleDeleteSelectedClips: () => {
    const { project, activeSequenceId, selectedClipIds, commandManager } = get();
    let seq = project.sequences[activeSequenceId];
    if (!seq || selectedClipIds.length === 0) return;

    for (const clipId of selectedClipIds) {
      const cmd = new RippleDeleteCommand(clipId);
      seq = commandManager.executeCommand(cmd, seq);
    }

    set({
      project: {
        ...project,
        sequences: { ...project.sequences, [activeSequenceId]: seq }
      },
      selectedClipIds: [],
      canUndo: commandManager.canUndo(),
      canRedo: commandManager.canRedo()
    });
  },

  toggleTrackLock: (trackId) => set((state) => {
    const seq = state.project.sequences[state.activeSequenceId];
    if (!seq) return state;
    return {
      project: {
        ...state.project,
        sequences: {
          ...state.project.sequences,
          [seq.id]: {
            ...seq,
            tracks: seq.tracks.map(t => t.id === trackId ? { ...t, locked: !t.locked } : t)
          }
        }
      }
    };
  }),

  toggleTrackVisibility: (trackId) => set((state) => {
    const seq = state.project.sequences[state.activeSequenceId];
    if (!seq) return state;
    return {
      project: {
        ...state.project,
        sequences: {
          ...state.project.sequences,
          [seq.id]: {
            ...seq,
            tracks: seq.tracks.map(t => t.id === trackId ? { ...t, visible: !t.visible } : t)
          }
        }
      }
    };
  }),

  toggleTrackMute: (trackId) => set((state) => {
    const seq = state.project.sequences[state.activeSequenceId];
    if (!seq) return state;
    return {
      project: {
        ...state.project,
        sequences: {
          ...state.project.sequences,
          [seq.id]: {
            ...seq,
            tracks: seq.tracks.map(t => t.id === trackId ? { ...t, muted: !t.muted } : t)
          }
        }
      }
    };
  }),

  toggleTrackSolo: (trackId) => set((state) => {
    const seq = state.project.sequences[state.activeSequenceId];
    if (!seq) return state;
    return {
      project: {
        ...state.project,
        sequences: {
          ...state.project.sequences,
          [seq.id]: {
            ...seq,
            tracks: seq.tracks.map(t => t.id === trackId ? { ...t, solo: !t.solo } : t)
          }
        }
      }
    };
  }),

  addAsset: (asset) => set((state) => ({
    project: {
      ...state.project,
      assets: {
        ...state.project.assets,
        [asset.id]: asset
      }
    }
  })),

  addTitleClip: (text) => {
    const { currentPlayheadFrame, addClipToTimeline } = get();
    const titleClip: ClipItem = {
      id: 'title_' + Math.random().toString(36).substring(2, 9),
      mediaId: 'title_asset',
      trackId: 'v2',
      name: text.substring(0, 15) || 'Title',
      type: 'title',
      timelineStartFrame: currentPlayheadFrame,
      durationFrames: 90, // 3 seconds at 30 fps
      sourceStartFrame: 0,
      sourceEndFrame: 90,
      speed: 1.0,
      muted: false,
      visible: true,
      transform: createDefaultTransform(),
      audio: createDefaultAudio(),
      effects: [],
      titleProperties: {
        text,
        fontFamily: 'sans-serif',
        fontSize: 48,
        fontWeight: 'bold',
        color: '#ffffff',
        textAlign: 'center',
        padding: 10
      }
    };
    addClipToTimeline(titleClip);
  },

  updateClipTransform: (clipId, updates) => set((state) => {
    const seq = state.project.sequences[state.activeSequenceId];
    if (!seq || !seq.clips[clipId]) return state;
    const clip = seq.clips[clipId];
    return {
      project: {
        ...state.project,
        sequences: {
          ...state.project.sequences,
          [seq.id]: {
            ...seq,
            clips: {
              ...seq.clips,
              [clipId]: {
                ...clip,
                transform: { ...clip.transform, ...updates }
              }
            }
          }
        }
      }
    };
  }),

  updateClipAudio: (clipId, updates) => set((state) => {
    const seq = state.project.sequences[state.activeSequenceId];
    if (!seq || !seq.clips[clipId]) return state;
    const clip = seq.clips[clipId];
    return {
      project: {
        ...state.project,
        sequences: {
          ...state.project.sequences,
          [seq.id]: {
            ...seq,
            clips: {
              ...seq.clips,
              [clipId]: {
                ...clip,
                audio: { ...clip.audio, ...updates }
              }
            }
          }
        }
      }
    };
  }),

  updateClipEffects: (clipId, effects) => set((state) => {
    const seq = state.project.sequences[state.activeSequenceId];
    if (!seq || !seq.clips[clipId]) return state;
    return {
      project: {
        ...state.project,
        sequences: {
          ...state.project.sequences,
          [seq.id]: {
            ...seq,
            clips: {
              ...seq.clips,
              [clipId]: { ...seq.clips[clipId], effects }
            }
          }
        }
      }
    };
  }),

  updateClipTitle: (clipId, titleUpdates) => set((state) => {
    const seq = state.project.sequences[state.activeSequenceId];
    if (!seq || !seq.clips[clipId] || !seq.clips[clipId].titleProperties) return state;
    const clip = seq.clips[clipId];
    return {
      project: {
        ...state.project,
        sequences: {
          ...state.project.sequences,
          [seq.id]: {
            ...seq,
            clips: {
              ...seq.clips,
              [clipId]: {
                ...clip,
                titleProperties: {
                  ...clip.titleProperties!,
                  ...titleUpdates
                }
              }
            }
          }
        }
      }
    };
  })
}));

