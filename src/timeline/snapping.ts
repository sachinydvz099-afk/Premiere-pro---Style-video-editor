/**
 * Magnetic snapping calculation for timeline scrubbing, trimming, and dragging.
 */

import { Sequence } from './TimelineModel';

export interface SnapPoint {
  frame: number;
  type: 'playhead' | 'clip_start' | 'clip_end' | 'marker' | 'origin';
  label?: string;
}

export interface SnapResult {
  snappedFrame: number;
  didSnap: boolean;
  snapPoint?: SnapPoint;
}

/**
 * Collects all candidate snap points from the sequence.
 * @param sequence The current active sequence.
 * @param currentPlayhead Current playhead frame position.
 * @param ignoreClipIds Optional array of clip IDs to exclude (e.g., the clip currently being dragged).
 */
export function getCandidateSnapPoints(
  sequence: Sequence,
  currentPlayhead: number,
  ignoreClipIds: string[] = []
): SnapPoint[] {
  const points: SnapPoint[] = [
    { frame: 0, type: 'origin', label: 'Timeline Start' },
    { frame: currentPlayhead, type: 'playhead', label: 'Playhead' }
  ];

  // Clip boundaries
  for (const clip of Object.values(sequence.clips)) {
    if (ignoreClipIds.includes(clip.id)) continue;
    points.push({
      frame: clip.timelineStartFrame,
      type: 'clip_start',
      label: `${clip.name} (Start)`
    });
    points.push({
      frame: clip.timelineStartFrame + clip.durationFrames,
      type: 'clip_end',
      label: `${clip.name} (End)`
    });
  }

  // Sequence markers
  for (const marker of sequence.markers) {
    points.push({
      frame: marker.frame,
      type: 'marker',
      label: marker.label
    });
  }

  return points;
}

/**
 * Finds the closest snap target within the specified frame threshold.
 * @param targetFrame The desired frame position before snapping.
 * @param candidatePoints Array of snap candidates.
 * @param thresholdFrames Maximum distance in frames to trigger snap (default: 6 frames).
 */
export function findSnapFrame(
  targetFrame: number,
  candidatePoints: SnapPoint[],
  thresholdFrames: number = 6
): SnapResult {
  let closestPoint: SnapPoint | undefined;
  let minDistance = thresholdFrames + 1;

  for (const point of candidatePoints) {
    const distance = Math.abs(point.frame - targetFrame);
    if (distance <= thresholdFrames && distance < minDistance) {
      minDistance = distance;
      closestPoint = point;
    }
  }

  if (closestPoint) {
    return {
      snappedFrame: closestPoint.frame,
      didSnap: true,
      snapPoint: closestPoint
    };
  }

  return {
    snappedFrame: targetFrame,
    didSnap: false
  };
}
