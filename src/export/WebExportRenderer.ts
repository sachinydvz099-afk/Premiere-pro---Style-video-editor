/**
 * Web-compatible export engine using Canvas, Web Audio API, and MediaRecorder.
 * Enables zero-dependency exports directly in the browser and on GitHub Pages!
 */

import { Sequence, MediaAsset } from '../timeline/TimelineModel';

export interface WebExportProgress {
  currentFrame: number;
  totalFrames: number;
  progressPercent: number;
  status: 'rendering' | 'encoding' | 'completed' | 'cancelled' | 'error';
  error?: string;
}

export class WebExportRenderer {
  private isCancelled = false;

  public cancel(): void {
    this.isCancelled = true;
  }

  /**
   * Renders sequence to a downloadable video Blob using HTML5 Canvas & MediaRecorder.
   */
  public async renderSequence(
    sequence: Sequence,
    assets: Record<string, MediaAsset>,
    onProgress: (progress: WebExportProgress) => void
  ): Promise<Blob> {
    this.isCancelled = false;
    const width = sequence.width || 1280;
    const height = sequence.height || 720;
    const fps = sequence.fps || 30;
    const totalFrames = Math.max(30, sequence.durationFrames);

    // Create offline canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not acquire 2D canvas context.');

    // Setup Web Audio
    const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const dest = audioCtx.createMediaStreamDestination();

    // Stream capture
    const canvasStream = canvas.captureStream(fps);
    const combinedTracks = [...canvasStream.getVideoTracks(), ...dest.stream.getAudioTracks()];
    const combinedStream = new MediaStream(combinedTracks);

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : MediaRecorder.isTypeSupported('video/webm')
      ? 'video/webm'
      : 'video/mp4';

    const recordedChunks: Blob[] = [];
    const mediaRecorder = new MediaRecorder(combinedStream, {
      mimeType,
      videoBitsPerSecond: 5000000
    });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        recordedChunks.push(e.data);
      }
    };

    mediaRecorder.start(100);

    // Render frame-by-frame
    for (let frame = 0; frame < totalFrames; frame++) {
      if (this.isCancelled) {
        mediaRecorder.stop();
        audioCtx.close();
        throw new Error('Export was cancelled by user.');
      }

      // Clear frame background
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      // Render active clips at this frame
      const activeClips = Object.values(sequence.clips).filter(
        c => frame >= c.timelineStartFrame && frame < c.timelineStartFrame + c.durationFrames && c.visible
      );

      // Sort clips by track order (V1 at bottom, V3 on top)
      activeClips.sort((a, b) => {
        const trackA = sequence.tracks.find(t => t.id === a.trackId)?.order ?? 0;
        const trackB = sequence.tracks.find(t => t.id === b.trackId)?.order ?? 0;
        return trackB - trackA; // lower order = higher in stack
      });

      for (const clip of activeClips) {
        ctx.save();

        // Apply clip transform
        const cx = width / 2 + clip.transform.x;
        const cy = height / 2 + clip.transform.y;
        ctx.translate(cx, cy);
        ctx.rotate((clip.transform.rotation * Math.PI) / 180);
        ctx.scale(clip.transform.scaleX, clip.transform.scaleY);
        ctx.globalAlpha = clip.transform.opacity;

        if (clip.type === 'title' && clip.titleProperties) {
          const t = clip.titleProperties;
          ctx.font = `${t.fontWeight || 'bold'} ${t.fontSize}px ${t.fontFamily || 'sans-serif'}`;
          ctx.fillStyle = t.color || '#ffffff';
          ctx.textAlign = t.textAlign || 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(t.text, 0, 0);
        } else if (clip.type === 'image' || clip.type === 'video') {
          // Placeholder or rendered visual frame
          ctx.fillStyle = '#2563eb';
          ctx.fillRect(-width / 4, -height / 4, width / 2, height / 2);
          ctx.fillStyle = '#ffffff';
          ctx.font = '24px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(clip.name, 0, 0);
        }

        ctx.restore();
      }

      onProgress({
        currentFrame: frame + 1,
        totalFrames,
        progressPercent: Math.round(((frame + 1) / totalFrames) * 100),
        status: 'rendering'
      });

      // Allow event loop slice
      await new Promise(r => setTimeout(r, 1000 / fps));
    }

    return new Promise((resolve) => {
      mediaRecorder.onstop = () => {
        const outputBlob = new Blob(recordedChunks, { type: mimeType });
        audioCtx.close();
        onProgress({
          currentFrame: totalFrames,
          totalFrames,
          progressPercent: 100,
          status: 'completed'
        });
        resolve(outputBlob);
      };

      mediaRecorder.stop();
    });
  }
}
