import { describe, it, expect } from 'vitest';
import { Timecode } from '../src/timeline/Timecode';

describe('Timecode calculations and conversions', () => {
  const tc30 = new Timecode(30);

  it('converts frame 0 to 00:00:00:00', () => {
    expect(tc30.framesToTimecode(0)).toBe('00:00:00:00');
  });

  it('converts 1 second (30 frames) to 00:00:01:00', () => {
    expect(tc30.framesToTimecode(30)).toBe('00:00:01:00');
  });

  it('converts 1 minute (1800 frames) to 00:01:00:00', () => {
    expect(tc30.framesToTimecode(1800)).toBe('00:01:00:00');
  });

  it('converts 1 hour (108000 frames) to 01:00:00:00', () => {
    expect(tc30.framesToTimecode(108000)).toBe('01:00:00:00');
  });

  it('correctly parses timecode string back to frames', () => {
    expect(tc30.timecodeToFrames('00:00:01:00')).toBe(30);
    expect(tc30.timecodeToFrames('00:01:00:00')).toBe(1800);
    expect(tc30.timecodeToFrames('01:00:00:00')).toBe(108000);
    expect(tc30.timecodeToFrames('00:00:05:15')).toBe(165);
  });

  it('converts fractional seconds to integer frames accurately', () => {
    expect(tc30.secondsToFrames(2.5)).toBe(75);
    expect(tc30.framesToSeconds(75)).toBe(2.5);
  });
});

