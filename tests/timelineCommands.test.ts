import { describe, it, expect } from 'vitest';
import { createDefaultSequence, ClipItem } from '../src/timeline/TimelineModel';
import { CommandManager } from '../src/timeline/commands/Command';
import {
  AddClipCommand,
  DeleteClipCommand,
  MoveClipCommand,
  TrimClipCommand,
  SplitClipCommand,
  RippleDeleteCommand
} from '../src/timeline/commands/TimelineCommands';

describe('Timeline Editing Commands & Undo/Redo Engine', () => {
  const initialSeq = createDefaultSequence('Test Seq', 30);
  const commandManager = new CommandManager();

  const testClip: ClipItem = {
    id: 'clip_1',
    mediaId: 'asset_1',
    trackId: 'v1',
    name: 'Sample Footage',
    type: 'video',
    timelineStartFrame: 30, // Starts at 1.0s
    durationFrames: 90,     // 3.0s duration
    sourceStartFrame: 0,
    sourceEndFrame: 90,
    speed: 1.0,
    muted: false,
    visible: true,
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, anchorX: 0.5, anchorY: 0.5 },
    audio: { gain: 0, pan: 0, fadeInFrames: 0, fadeOutFrames: 0 },
    effects: []
  };

  it('adds clip and supports undo/redo', () => {
    const addCmd = new AddClipCommand(testClip);
    const seqWithClip = commandManager.executeCommand(addCmd, initialSeq);

    expect(seqWithClip.clips['clip_1']).toBeDefined();
    expect(seqWithClip.clips['clip_1'].name).toBe('Sample Footage');

    // Undo
    const undoneSeq = commandManager.undo(seqWithClip);
    expect(undoneSeq?.clips['clip_1']).toBeUndefined();

    // Redo
    const redoneSeq = commandManager.redo(undoneSeq!);
    expect(redoneSeq?.clips['clip_1']).toBeDefined();
  });

  it('moves clip to new timeline position', () => {
    let seq = createDefaultSequence('Seq', 30);
    seq = { ...seq, clips: { [testClip.id]: { ...testClip } } };

    const moveCmd = new MoveClipCommand(testClip.id, 60, 'v2');
    const movedSeq = commandManager.executeCommand(moveCmd, seq);

    expect(movedSeq.clips[testClip.id].timelineStartFrame).toBe(60);
    expect(movedSeq.clips[testClip.id].trackId).toBe('v2');

    // Undo move
    const revertedSeq = commandManager.undo(movedSeq);
    expect(revertedSeq?.clips[testClip.id].timelineStartFrame).toBe(30);
    expect(revertedSeq?.clips[testClip.id].trackId).toBe('v1');
  });

  it('trims clip head and tail accurately', () => {
    let seq = createDefaultSequence('Seq', 30);
    seq = { ...seq, clips: { [testClip.id]: { ...testClip } } };

    // Trim head (start) by +10 frames
    const trimStartCmd = new TrimClipCommand(testClip.id, 'start', 10);
    const trimmedStartSeq = commandManager.executeCommand(trimStartCmd, seq);

    const c1 = trimmedStartSeq.clips[testClip.id];
    expect(c1.timelineStartFrame).toBe(40);
    expect(c1.durationFrames).toBe(80);
    expect(c1.sourceStartFrame).toBe(10);

    // Trim tail (end) by -20 frames
    const trimEndCmd = new TrimClipCommand(testClip.id, 'end', -20);
    const trimmedEndSeq = commandManager.executeCommand(trimEndCmd, trimmedStartSeq);

    const c2 = trimmedEndSeq.clips[testClip.id];
    expect(c2.durationFrames).toBe(60);
  });

  it('splits clip at playhead (razor tool)', () => {
    let seq = createDefaultSequence('Seq', 30);
    seq = { ...seq, clips: { [testClip.id]: { ...testClip } } };

    // Clip starts at 30, duration 90 (ends at 120). Split at frame 60.
    const splitCmd = new SplitClipCommand(testClip.id, 60);
    const splitSeq = commandManager.executeCommand(splitCmd, seq);

    const clips = Object.values(splitSeq.clips);
    expect(clips.length).toBe(2);

    const firstPart = clips.find(c => c.id === testClip.id)!;
    expect(firstPart.timelineStartFrame).toBe(30);
    expect(firstPart.durationFrames).toBe(30); // 60 - 30 = 30 frames

    const secondPart = clips.find(c => c.id !== testClip.id)!;
    expect(secondPart.timelineStartFrame).toBe(60);
    expect(secondPart.durationFrames).toBe(60); // 120 - 60 = 60 frames
  });

  it('performs ripple delete and closes gap', () => {
    let seq = createDefaultSequence('Seq', 30);

    const clipA: ClipItem = { ...testClip, id: 'clip_A', timelineStartFrame: 0, durationFrames: 30 };
    const clipB: ClipItem = { ...testClip, id: 'clip_B', timelineStartFrame: 30, durationFrames: 40 }; // Target to ripple delete
    const clipC: ClipItem = { ...testClip, id: 'clip_C', timelineStartFrame: 70, durationFrames: 50 }; // Follower

    seq = {
      ...seq,
      clips: {
        [clipA.id]: clipA,
        [clipB.id]: clipB,
        [clipC.id]: clipC
      }
    };

    const rippleCmd = new RippleDeleteCommand('clip_B');
    const rippledSeq = commandManager.executeCommand(rippleCmd, seq);

    expect(rippledSeq.clips['clip_B']).toBeUndefined();
    expect(rippledSeq.clips['clip_A'].timelineStartFrame).toBe(0);
    // clipC should have shifted left by clipB's duration (40 frames): 70 - 40 = 30
    expect(rippledSeq.clips['clip_C'].timelineStartFrame).toBe(30);
  });
});
