/**
 * Concrete editing commands for non-destructive, frame-accurate timeline manipulation.
 */

import { Sequence, ClipItem } from '../TimelineModel';
import { Command } from './Command';

/**
 * Adds a new clip to the sequence.
 */
export class AddClipCommand implements Command {
  public name = 'Add Clip';

  constructor(private clip: ClipItem) {}

  public execute(sequence: Sequence): Sequence {
    const updatedClips = { ...sequence.clips, [this.clip.id]: this.clip };
    return {
      ...sequence,
      clips: updatedClips,
      durationFrames: Math.max(
        sequence.durationFrames,
        this.clip.timelineStartFrame + this.clip.durationFrames + 30
      )
    };
  }

  public undo(sequence: Sequence): Sequence {
    const updatedClips = { ...sequence.clips };
    delete updatedClips[this.clip.id];
    return {
      ...sequence,
      clips: updatedClips
    };
  }
}

/**
 * Deletes a clip from the sequence.
 */
export class DeleteClipCommand implements Command {
  public name = 'Delete Clip';
  private removedClip: ClipItem | null = null;

  constructor(private clipId: string) {}

  public execute(sequence: Sequence): Sequence {
    this.removedClip = sequence.clips[this.clipId] || null;
    if (!this.removedClip) return sequence;

    const updatedClips = { ...sequence.clips };
    delete updatedClips[this.clipId];

    return {
      ...sequence,
      clips: updatedClips
    };
  }

  public undo(sequence: Sequence): Sequence {
    if (!this.removedClip) return sequence;
    return {
      ...sequence,
      clips: {
        ...sequence.clips,
        [this.removedClip.id]: this.removedClip
      }
    };
  }
}

/**
 * Moves a clip to a new start frame and/or track.
 */
export class MoveClipCommand implements Command {
  public name = 'Move Clip';
  private previousStartFrame: number = 0;
  private previousTrackId: string = '';

  constructor(
    private clipId: string,
    private newStartFrame: number,
    private newTrackId?: string
  ) {}

  public execute(sequence: Sequence): Sequence {
    const clip = sequence.clips[this.clipId];
    if (!clip) return sequence;

    this.previousStartFrame = clip.timelineStartFrame;
    this.previousTrackId = clip.trackId;

    const updatedClip: ClipItem = {
      ...clip,
      timelineStartFrame: Math.max(0, this.newStartFrame),
      trackId: this.newTrackId || clip.trackId
    };

    return {
      ...sequence,
      clips: {
        ...sequence.clips,
        [this.clipId]: updatedClip
      },
      durationFrames: Math.max(
        sequence.durationFrames,
        updatedClip.timelineStartFrame + updatedClip.durationFrames + 30
      )
    };
  }

  public undo(sequence: Sequence): Sequence {
    const clip = sequence.clips[this.clipId];
    if (!clip) return sequence;

    const restoredClip: ClipItem = {
      ...clip,
      timelineStartFrame: this.previousStartFrame,
      trackId: this.previousTrackId
    };

    return {
      ...sequence,
      clips: {
        ...sequence.clips,
        [this.clipId]: restoredClip
      }
    };
  }
}

/**
 * Trims a clip's In or Out point with frame synchronization.
 */
export class TrimClipCommand implements Command {
  public name = 'Trim Clip';
  private previousClip: ClipItem | null = null;

  constructor(
    private clipId: string,
    private side: 'start' | 'end',
    private deltaFrames: number
  ) {}

  public execute(sequence: Sequence): Sequence {
    const clip = sequence.clips[this.clipId];
    if (!clip) return sequence;

    this.previousClip = { ...clip };
    let newStart = clip.timelineStartFrame;
    let newDuration = clip.durationFrames;
    let newSourceStart = clip.sourceStartFrame;
    let newSourceEnd = clip.sourceEndFrame;

    if (this.side === 'start') {
      // Trimming head: shifts timelineStart and increases sourceStart
      const effectiveDelta = Math.min(this.deltaFrames, clip.durationFrames - 1);
      newStart = Math.max(0, clip.timelineStartFrame + effectiveDelta);
      newDuration = Math.max(1, clip.durationFrames - effectiveDelta);
      newSourceStart = Math.max(0, clip.sourceStartFrame + effectiveDelta);
    } else {
      // Trimming tail: adjusts duration and sourceEnd
      newDuration = Math.max(1, clip.durationFrames + this.deltaFrames);
      newSourceEnd = newSourceStart + newDuration;
    }

    const updatedClip: ClipItem = {
      ...clip,
      timelineStartFrame: newStart,
      durationFrames: newDuration,
      sourceStartFrame: newSourceStart,
      sourceEndFrame: newSourceEnd
    };

    return {
      ...sequence,
      clips: {
        ...sequence.clips,
        [this.clipId]: updatedClip
      }
    };
  }

  public undo(sequence: Sequence): Sequence {
    if (!this.previousClip) return sequence;
    return {
      ...sequence,
      clips: {
        ...sequence.clips,
        [this.previousClip.id]: this.previousClip
      }
    };
  }
}

/**
 * Splits a clip at the playhead position (Razor Tool).
 */
export class SplitClipCommand implements Command {
  public name = 'Split Clip';
  private originalClip: ClipItem | null = null;
  private newClipId: string = '';

  constructor(private clipId: string, private splitFrame: number) {}

  public execute(sequence: Sequence): Sequence {
    const clip = sequence.clips[this.clipId];
    if (!clip) return sequence;

    // Split frame must fall strictly inside the clip
    if (
      this.splitFrame <= clip.timelineStartFrame ||
      this.splitFrame >= clip.timelineStartFrame + clip.durationFrames
    ) {
      return sequence;
    }

    this.originalClip = { ...clip };
    const firstDuration = this.splitFrame - clip.timelineStartFrame;
    const secondDuration = clip.durationFrames - firstDuration;

    const firstClip: ClipItem = {
      ...clip,
      durationFrames: firstDuration,
      sourceEndFrame: clip.sourceStartFrame + firstDuration
    };

    this.newClipId = clip.id + '_split_' + Math.random().toString(36).substring(2, 6);
    const secondClip: ClipItem = {
      ...clip,
      id: this.newClipId,
      name: `${clip.name} (Part 2)`,
      timelineStartFrame: this.splitFrame,
      durationFrames: secondDuration,
      sourceStartFrame: clip.sourceStartFrame + firstDuration,
      sourceEndFrame: clip.sourceEndFrame
    };

    return {
      ...sequence,
      clips: {
        ...sequence.clips,
        [clip.id]: firstClip,
        [this.newClipId]: secondClip
      }
    };
  }

  public undo(sequence: Sequence): Sequence {
    if (!this.originalClip) return sequence;

    const updatedClips = { ...sequence.clips };
    delete updatedClips[this.newClipId];
    updatedClips[this.originalClip.id] = this.originalClip;

    return {
      ...sequence,
      clips: updatedClips
    };
  }
}

/**
 * Ripple deletes a clip: removes the clip and shifts all subsequent clips on the track to the left.
 */
export class RippleDeleteCommand implements Command {
  public name = 'Ripple Delete';
  private originalClips: Record<string, ClipItem> = {};

  constructor(private clipId: string) {}

  public execute(sequence: Sequence): Sequence {
    const targetClip = sequence.clips[this.clipId];
    if (!targetClip) return sequence;

    this.originalClips = { ...sequence.clips };
    const gapDuration = targetClip.durationFrames;
    const gapStart = targetClip.timelineStartFrame;
    const trackId = targetClip.trackId;

    const updatedClips: Record<string, ClipItem> = {};

    for (const [id, clip] of Object.entries(sequence.clips)) {
      if (id === this.clipId) continue; // Remove target

      // If clip is on the same track and appears after the gap, shift it left
      if (clip.trackId === trackId && clip.timelineStartFrame >= gapStart + gapDuration) {
        updatedClips[id] = {
          ...clip,
          timelineStartFrame: clip.timelineStartFrame - gapDuration
        };
      } else {
        updatedClips[id] = clip;
      }
    }

    return {
      ...sequence,
      clips: updatedClips
    };
  }

  public undo(sequence: Sequence): Sequence {
    return {
      ...sequence,
      clips: this.originalClips
    };
  }
}
