import { describe, it, expect } from 'vitest';
import { createDefaultSequence, ClipItem } from '../src/timeline/TimelineModel';
import { getCandidateSnapPoints, findSnapFrame } from '../src/timeline/snapping';

describe('Timeline Snapping & Magnetism', () => {
  const seq = createDefaultSequence('Snapping Test', 30);
  const clip1: ClipItem = {
    id: 'c1',
    mediaId: 'm1',
    trackId: 'v1',
    name: 'Clip 1',
    type: 'video',
    timelineStartFrame: 50,
    durationFrames: 100, // Ends at 150
    sourceStartFrame: 0,
    sourceEndFrame: 100,
    speed: 1,
    muted: false,
    visible: true,
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, anchorX: 0.5, anchorY: 0.5 },
    audio: { gain: 0, pan: 0, fadeInFrames: 0, fadeOutFrames: 0 },
    effects: []
  };

  seq.clips[clip1.id] = clip1;

  it('gathers snap candidates including origin, playhead, and clip boundaries', () => {
    const playhead = 200;
    const candidates = getCandidateSnapPoints(seq, playhead);

    const candidateFrames = candidates.map(c => c.frame);
    expect(candidateFrames).toContain(0);   // Origin
    expect(candidateFrames).toContain(200); // Playhead
    expect(candidateFrames).toContain(50);  // Clip start
    expect(candidateFrames).toContain(150); // Clip end
  });

  it('snaps to boundary within threshold', () => {
    const candidates = getCandidateSnapPoints(seq, 200);

    // Target frame 52 is 2 frames away from 50 (within default 6 frame threshold)
    const snapResult = findSnapFrame(52, candidates, 6);
    expect(snapResult.didSnap).toBe(true);
    expect(snapResult.snappedFrame).toBe(50);
  });

  it('does not snap when distance exceeds threshold', () => {
    const candidates = getCandidateSnapPoints(seq, 200);

    // Target frame 65 is 15 frames away from 50
    const snapResult = findSnapFrame(65, candidates, 6);
    expect(snapResult.didSnap).toBe(false);
    expect(snapResult.snappedFrame).toBe(65);
  });
});
