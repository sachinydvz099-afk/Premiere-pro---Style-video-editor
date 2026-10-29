/**
 * FFmpeg filter graph compiler for multi-track video, audio mixing, transitions, and overlays.
 */

import { Sequence, MediaAsset, ClipItem } from '../timeline/TimelineModel';

export interface ExportSettings {
  outputFilePath: string;
  width: number;
  height: number;
  fps: number;
  videoCodec: 'libx264' | 'libvpx-vp9' | 'hevc';
  audioCodec: 'aac' | 'libopus' | 'pcm_s16le';
  videoBitrate: string; // e.g., '6M'
  audioBitrate: string; // e.g., '192k'
  format: 'mp4' | 'webm' | 'wav';
}

export interface GeneratedFFmpegCommand {
  command: string;
  args: string[];
  filterGraphString: string;
  totalDurationFrames: number;
}

export class FFmpegFilterGraph {
  /**
   * Compiles an active Sequence into a complete FFmpeg command array.
   */
  public static compile(
    sequence: Sequence,
    assets: Record<string, MediaAsset>,
    settings: ExportSettings
  ): GeneratedFFmpegCommand {
    const clips = Object.values(sequence.clips).sort((a, b) => a.timelineStartFrame - b.timelineStartFrame);
    const inputFiles: string[] = [];
    const inputFileIndexMap = new Map<string, number>();

    // Map each unique media file to an input index
    for (const clip of clips) {
      if (clip.type === 'title') continue;
      const asset = assets[clip.mediaId];
      if (asset && asset.filePath && !inputFileIndexMap.has(asset.filePath)) {
        inputFileIndexMap.set(asset.filePath, inputFiles.length);
        inputFiles.push(asset.filePath);
      }
    }

    const filterComplexParts: string[] = [];
    const videoOutLabels: string[] = [];
    const audioOutLabels: string[] = [];

    // Background canvas base
    const totalFrames = Math.max(sequence.durationFrames, 30);
    const totalSeconds = totalFrames / sequence.fps;
    filterComplexParts.push(
      `color=c=black:s=${settings.width}x${settings.height}:r=${settings.fps}:d=${totalSeconds.toFixed(3)}[bg_base]`
    );
    let currentVideoChain = '[bg_base]';

    // Video & Title Clips
    let clipIndex = 0;
    for (const clip of clips) {
      if (clip.type === 'video' || clip.type === 'image') {
        const asset = assets[clip.mediaId];
        if (!asset || !asset.filePath) continue;

        const inputIdx = inputFileIndexMap.get(asset.filePath);
        if (inputIdx === undefined) continue;

        const clipLabel = `v_${clipIndex}`;
        const startSec = clip.sourceStartFrame / sequence.fps;
        const durationSec = clip.durationFrames / sequence.fps;
        const timelineStartSec = clip.timelineStartFrame / sequence.fps;
        const timelineEndSec = (clip.timelineStartFrame + clip.durationFrames) / sequence.fps;

        // Apply scale, trim, and adjustments
        let filterChain = `[${inputIdx}:v]trim=start=${startSec.toFixed(3)}:duration=${durationSec.toFixed(3)},setpts=PTS-STARTPTS`;

        // Transforms & scaling
        const scaleW = Math.round(settings.width * clip.transform.scaleX);
        const scaleH = Math.round(settings.height * clip.transform.scaleY);
        filterChain += `,scale=${scaleW}:${scaleH}`;

        // Color adjustments
        const brightness = clip.effects.find(e => e.type === 'brightness' && e.enabled)?.parameters.value ?? 0;
        const contrast = clip.effects.find(e => e.type === 'contrast' && e.enabled)?.parameters.value ?? 1;
        const saturation = clip.effects.find(e => e.type === 'saturation' && e.enabled)?.parameters.value ?? 1;
        if (brightness !== 0 || contrast !== 1 || saturation !== 1) {
          filterChain += `,eq=brightness=${brightness.toFixed(2)}:contrast=${contrast.toFixed(2)}:saturation=${saturation.toFixed(2)}`;
        }

        filterChain += `[${clipLabel}]`;
        filterComplexParts.push(filterChain);

        // Overlay onto current chain
        const nextChain = `[v_chain_${clipIndex}]`;
        const posX = Math.round(clip.transform.x);
        const posY = Math.round(clip.transform.y);
        filterComplexParts.push(
          `${currentVideoChain}[${clipLabel}]overlay=x=${posX}:y=${posY}:enable='between(t,${timelineStartSec.toFixed(3)},${timelineEndSec.toFixed(3)})'${nextChain}`
        );
        currentVideoChain = nextChain;
        clipIndex++;
      } else if (clip.type === 'title' && clip.titleProperties) {
        // Text overlay
        const title = clip.titleProperties;
        const timelineStartSec = clip.timelineStartFrame / sequence.fps;
        const timelineEndSec = (clip.timelineStartFrame + clip.durationFrames) / sequence.fps;
        const nextChain = `[v_chain_${clipIndex}]`;

        const escapedText = title.text.replace(/'/g, "\\'").replace(/:/g, '\\:');
        filterComplexParts.push(
          `${currentVideoChain}drawtext=text='${escapedText}':fontsize=${title.fontSize}:fontcolor=${title.color}:x=(w-text_w)/2:y=(h-text_h)/2:enable='between(t,${timelineStartSec.toFixed(3)},${timelineEndSec.toFixed(3)})'${nextChain}`
        );
        currentVideoChain = nextChain;
        clipIndex++;
      }
    }

    // Audio Clips
    let audioIndex = 0;
    for (const clip of clips) {
      if (clip.type === 'audio' || clip.type === 'video') {
        const asset = assets[clip.mediaId];
        if (!asset || !asset.filePath || clip.muted) continue;

        const inputIdx = inputFileIndexMap.get(asset.filePath);
        if (inputIdx === undefined) continue;

        const startSec = clip.sourceStartFrame / sequence.fps;
        const durationSec = clip.durationFrames / sequence.fps;
        const delayMs = Math.round((clip.timelineStartFrame / sequence.fps) * 1000);
        const audioLabel = `a_${audioIndex}`;

        // Volume conversion
        const volumeFactor = Math.pow(10, clip.audio.gain / 20);

        filterComplexParts.push(
          `[${inputIdx}:a]atrim=start=${startSec.toFixed(3)}:duration=${durationSec.toFixed(3)},asetpts=PTS-STARTPTS,volume=${volumeFactor.toFixed(3)},adelay=${delayMs}|${delayMs}[${audioLabel}]`
        );
        audioOutLabels.push(`[${audioLabel}]`);
        audioIndex++;
      }
    }

    // Audio mix
    if (audioOutLabels.length > 0) {
      filterComplexParts.push(
        `${audioOutLabels.join('')}amix=inputs=${audioOutLabels.length}:duration=longest:dropout_transition=0[a_final]`
      );
    } else {
      // Generate silence
      filterComplexParts.push(
        `aevalsrc=0:d=${totalSeconds.toFixed(3)}[a_final]`
      );
    }

    // Build args
    const args: string[] = ['-y'];

    for (const file of inputFiles) {
      args.push('-i', file);
    }

    const filterString = filterComplexParts.join(';');
    args.push('-filter_complex', filterString);
    args.push('-map', currentVideoChain);
    args.push('-map', '[a_final]');

    args.push('-c:v', settings.videoCodec);
    args.push('-b:v', settings.videoBitrate);
    args.push('-r', settings.fps.toString());
    args.push('-c:a', settings.audioCodec);
    args.push('-b:a', settings.audioBitrate);
    args.push('-pix_fmt', 'yuv420p');
    args.push('-t', totalSeconds.toFixed(3));
    args.push(settings.outputFilePath);

    return {
      command: 'ffmpeg',
      args,
      filterGraphString: filterString,
      totalDurationFrames: totalFrames
    };
  }
}
