/**
 * Frame-accurate SMPTE timecode and rational time utilities for ReaCut Studio.
 * Eliminates floating-point drift when placing, trimming, and rendering multitrack clips.
 */

export interface TimecodeOptions {
  fps: number;
  dropFrame?: boolean;
}

export class Timecode {
  public readonly fps: number;
  public readonly dropFrame: boolean;

  constructor(fps: number = 30, dropFrame: boolean = false) {
    this.fps = Math.max(1, fps);
    this.dropFrame = dropFrame;
  }

  /**
   * Converts a frame number to a formatted SMPTE timecode string: HH:MM:SS:FF
   */
  public framesToTimecode(totalFrames: number): string {
    const isNegative = totalFrames < 0;
    const absFrames = Math.abs(Math.round(totalFrames));
    const roundedFps = Math.round(this.fps);

    const frames = absFrames % roundedFps;
    const totalSeconds = Math.floor(absFrames / roundedFps);
    const seconds = totalSeconds % 60;
    const totalMinutes = Math.floor(totalSeconds / 60);
    const minutes = totalMinutes % 60;
    const hours = Math.floor(totalMinutes / 60);

    const pad = (num: number, digits: number = 2) => num.toString().padStart(digits, '0');
    const separator = this.dropFrame ? ';' : ':';

    const formatted = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}${separator}${pad(frames)}`;
    return isNegative ? `-${formatted}` : formatted;
  }

  /**
   * Converts a SMPTE timecode string (HH:MM:SS:FF or HH:MM:SS;FF) to an absolute frame number.
   */
  public timecodeToFrames(tc: string): number {
    const isNegative = tc.startsWith('-');
    const cleanTc = isNegative ? tc.slice(1) : tc;
    const parts = cleanTc.split(/[:;]/).map(p => parseInt(p, 10) || 0);

    const hours = parts[0] || 0;
    const minutes = parts[1] || 0;
    const seconds = parts[2] || 0;
    const frames = parts[3] || 0;

    const roundedFps = Math.round(this.fps);
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    const totalFrames = totalSeconds * roundedFps + frames;

    return isNegative ? -totalFrames : totalFrames;
  }

  /**
   * Converts floating point seconds to integer frames.
   */
  public secondsToFrames(seconds: number): number {
    return Math.round(seconds * this.fps);
  }

  /**
   * Converts integer frames to fractional seconds.
   */
  public framesToSeconds(frames: number): number {
    return frames / this.fps;
  }

  /**
   * Formats seconds directly to timecode.
   */
  public secondsToTimecode(seconds: number): string {
    return this.framesToTimecode(this.secondsToFrames(seconds));
  }
}

