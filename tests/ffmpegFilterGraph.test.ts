import { describe, it, expect } from 'vitest';
import { createDefaultSequence, ClipItem, MediaAsset } from '../src/timeline/TimelineModel';
import { FFmpegFilterGraph } from '../src/export/FFmpegFilterGraph';

describe('FFmpeg Filter Graph Compiler', () => {
  it('generates a valid filtergraph for video overlay and audio mix', () => {
    const seq = createDefaultSequence('Render Seq', 30);

    const asset1: MediaAsset = {
      id: 'm1',
      name: 'Interview.mp4',
      filePath: 'C:/media/Interview.mp4',
      type: 'video',
      durationFrames: 300,
      fps: 30,
      width: 1920,
      height: 1080,
      createdAt: Date.now()
    };

    const clip1: ClipItem = {
      id: 'c1',
      mediaId: 'm1',
      trackId: 'v1',
      name: 'Interview',
      type: 'video',
      timelineStartFrame: 0,
      durationFrames: 150, // 5 seconds
      sourceStartFrame: 0,
      sourceEndFrame: 150,
      speed: 1,
      muted: false,
      visible: true,
      transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, anchorX: 0.5, anchorY: 0.5 },
      audio: { gain: -3, pan: 0, fadeInFrames: 0, fadeOutFrames: 0 },
      effects: [
        {
          id: 'fx1',
          name: 'Contrast Boost',
          type: 'contrast',
          enabled: true,
          parameters: { value: 1.2 }
        }
      ]
    };

    seq.clips[clip1.id] = clip1;

    const compiled = FFmpegFilterGraph.compile(
      seq,
      { [asset1.id]: asset1 },
      {
        outputFilePath: 'output.mp4',
        width: 1920,
        height: 1080,
        fps: 30,
        videoCodec: 'libx264',
        audioCodec: 'aac',
        videoBitrate: '8M',
        audioBitrate: '192k',
        format: 'mp4'
      }
    );

    expect(compiled.command).toBe('ffmpeg');
    expect(compiled.args).toContain('-filter_complex');
    expect(compiled.filterGraphString).toContain('color=c=black:s=1920x1080');
    expect(compiled.filterGraphString).toContain('trim=start=0.000:duration=5.000');
    expect(compiled.filterGraphString).toContain('overlay=');
    expect(compiled.filterGraphString).toContain('volume=');
    expect(compiled.args).toContain('-c:v');
    expect(compiled.args).toContain('libx264');
    expect(compiled.args).toContain('output.mp4');
  });
});

