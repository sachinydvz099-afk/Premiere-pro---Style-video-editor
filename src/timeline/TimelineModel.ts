/**
 * Core data models and type definitions for ReaCut Studio's timeline and media engine.
 */

export type MediaType = 'video' | 'audio' | 'image' | 'title';

export interface MediaAsset {
  id: string;
  name: string;
  filePath: string;
  type: MediaType;
  durationFrames: number;
  fps: number;
  width: number;
  height: number;
  channels?: number;
  sampleRate?: number;
  thumbnailUrl?: string;
  audioWaveform?: number[]; // Normalized waveform peak data (0.0 to 1.0)
  sizeBytes?: number;
  createdAt: number;
}

export interface TransformProperties {
  x: number; // Offset X in pixels
  y: number; // Offset Y in pixels
  scaleX: number; // Scale factor (1.0 = 100%)
  scaleY: number;
  rotation: number; // In degrees
  opacity: number; // 0.0 to 1.0
  anchorX: number; // Normalized anchor (0.5 = center)
  anchorY: number;
}

export interface AudioProperties {
  gain: number; // dB, default 0 dB (range -60 dB to +12 dB)
  pan: number; // -1.0 (Left) to +1.0 (Right)
  fadeInFrames: number;
  fadeOutFrames: number;
}

export interface VisualEffect {
  id: string;
  type: 'brightness' | 'contrast' | 'saturation' | 'blur' | 'crop' | 'color_temperature';
  name: string;
  enabled: boolean;
  parameters: Record<string, number>;
}

export interface TitleProperties {
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: string | number;
  color: string;
  strokeColor?: string;
  strokeWidth?: number;
  backgroundColor?: string;
  textAlign: 'left' | 'center' | 'right';
  padding: number;
}

export interface Transition {
  type: 'cross_dissolve' | 'fade_to_black' | 'fade_to_white' | 'audio_crossfade';
  durationFrames: number;
}

export interface ClipItem {
  id: string;
  mediaId: string; // References MediaAsset id or "title_media"
  trackId: string;
  name: string;
  type: MediaType;
  timelineStartFrame: number;
  durationFrames: number;
  sourceStartFrame: number;
  sourceEndFrame: number;
  speed: number; // 1.0 = normal
  muted: boolean;
  visible: boolean;
  colorLabel?: string;
  transform: TransformProperties;
  audio: AudioProperties;
  effects: VisualEffect[];
  titleProperties?: TitleProperties;
  transitionIn?: Transition;
  transitionOut?: Transition;
}

export interface Track {
  id: string;
  name: string;
  type: 'video' | 'audio';
  order: number;
  locked: boolean;
  visible: boolean; // For video tracks
  muted: boolean; // For audio tracks
  solo: boolean; // For audio tracks
  volume: number; // dB, default 0
  height?: number; // UI track height in pixels
}

export interface TimelineMarker {
  id: string;
  frame: number;
  label: string;
  color: string;
  comment?: string;
}

export interface Sequence {
  id: string;
  name: string;
  fps: number;
  width: number;
  height: number;
  durationFrames: number;
  tracks: Track[];
  clips: Record<string, ClipItem>;
  markers: TimelineMarker[];
}

export interface ProjectSettings {
  name: string;
  version: string;
  createdDate: string;
  modifiedDate: string;
  author?: string;
  mediaFolder?: string;
}

export interface ProjectData {
  schemaVersion: '1.0.0';
  settings: ProjectSettings;
  assets: Record<string, MediaAsset>;
  sequences: Record<string, Sequence>;
  activeSequenceId: string;
}

/**
 * Creates a default empty sequence with standard tracks (V1, V2, V3 and A1, A2, A3)
 */
export function createDefaultSequence(name: string = 'Sequence 01', fps: number = 30): Sequence {
  const tracks: Track[] = [
    { id: 'v3', name: 'V3', type: 'video', order: 0, locked: false, visible: true, muted: false, solo: false, volume: 0 },
    { id: 'v2', name: 'V2', type: 'video', order: 1, locked: false, visible: true, muted: false, solo: false, volume: 0 },
    { id: 'v1', name: 'V1', type: 'video', order: 2, locked: false, visible: true, muted: false, solo: false, volume: 0 },
    { id: 'a1', name: 'A1', type: 'audio', order: 3, locked: false, visible: true, muted: false, solo: false, volume: 0 },
    { id: 'a2', name: 'A2', type: 'audio', order: 4, locked: false, visible: true, muted: false, solo: false, volume: 0 },
    { id: 'a3', name: 'A3', type: 'audio', order: 5, locked: false, visible: true, muted: false, solo: false, volume: 0 },
  ];

  return {
    id: 'seq_' + Math.random().toString(36).substring(2, 9),
    name,
    fps,
    width: 1920,
    height: 1080,
    durationFrames: 30 * 60, // Default 1 minute timeline canvas
    tracks,
    clips: {},
    markers: []
  };
}

/**
 * Creates default clip transform properties.
 */
export function createDefaultTransform(): TransformProperties {
  return {
    x: 0,
    y: 0,
    scaleX: 1.0,
    scaleY: 1.0,
    rotation: 0,
    opacity: 1.0,
    anchorX: 0.5,
    anchorY: 0.5
  };
}

/**
 * Creates default clip audio properties.
 */
export function createDefaultAudio(): AudioProperties {
  return {
    gain: 0,
    pan: 0,
    fadeInFrames: 0,
    fadeOutFrames: 0
  };
}

