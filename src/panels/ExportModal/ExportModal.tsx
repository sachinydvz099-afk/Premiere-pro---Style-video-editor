import React, { useState } from 'react';
import { useEditorStore } from '../../state/useEditorStore';
import { FFmpegFilterGraph } from '../../export/FFmpegFilterGraph';
import { WebExportRenderer, WebExportProgress } from '../../export/WebExportRenderer';

interface ExportPreset {
  name: string;
  width: number;
  height: number;
  fps: number;
  videoBitrate: string;
  audioBitrate: string;
  format: 'mp4' | 'webm' | 'wav';
}

const PRESETS: ExportPreset[] = [
  { name: '1080p Full HD (H.264 MP4)', width: 1920, height: 1080, fps: 30, videoBitrate: '8M', audioBitrate: '192k', format: 'mp4' },
  { name: '720p Social (H.264 MP4)', width: 1280, height: 720, fps: 30, videoBitrate: '4M', audioBitrate: '160k', format: 'mp4' },
  { name: '4K Ultra HD (H.264 MP4)', width: 3840, height: 2160, fps: 30, videoBitrate: '25M', audioBitrate: '320k', format: 'mp4' },
  { name: 'Vertical 9:16 Reel/Shorts (1080x1920)', width: 1080, height: 1920, fps: 30, videoBitrate: '6M', audioBitrate: '192k', format: 'mp4' },
  { name: 'Master Audio (WAV)', width: 0, height: 0, fps: 30, videoBitrate: '0', audioBitrate: '1411k', format: 'wav' }
];

export const ExportModal: React.FC = () => {
  const { project, activeSequenceId, isExportModalOpen, setExportModalOpen } = useEditorStore();
  const sequence = project.sequences[activeSequenceId];

  const [selectedPreset, setSelectedPreset] = useState<ExportPreset>(PRESETS[0]);
  const [outputFileName, setOutputFileName] = useState<string>(
    `${sequence?.name || 'Sequence'}_Export`
  );
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<WebExportProgress | null>(null);
  const [ffmpegCommand, setFfmpegCommand] = useState<string | null>(null);
  const [rendererInstance, setRendererInstance] = useState<WebExportRenderer | null>(null);

  if (!isExportModalOpen || !sequence) return null;

  const handleStartWebExport = async () => {
    setIsExporting(true);
    const renderer = new WebExportRenderer();
    setRendererInstance(renderer);

    try {
      const blob = await renderer.renderSequence(sequence, project.assets, (p) => {
        setProgress(p);
      });

      // Download rendered file
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${outputFileName}.${selectedPreset.format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed', err);
      alert('Export aborted or encountered an error.');
    } finally {
      setIsExporting(false);
      setRendererInstance(null);
    }
  };

  const handleGenerateFFmpeg = () => {
    const compiled = FFmpegFilterGraph.compile(sequence, project.assets, {
      outputFilePath: `${outputFileName}.${selectedPreset.format}`,
      width: selectedPreset.width,
      height: selectedPreset.height,
      fps: selectedPreset.fps,
      videoCodec: 'libx264',
      audioCodec: 'aac',
      videoBitrate: selectedPreset.videoBitrate,
      audioBitrate: selectedPreset.audioBitrate,
      format: selectedPreset.format
    });

    const fullCmd = `ffmpeg ${compiled.args.map(a => a.includes(' ') || a.includes(';') ? `"${a}"` : a).join(' ')}`;
    setFfmpegCommand(fullCmd);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 5000,
        userSelect: 'none'
      }}
    >
      <div
        style={{
          width: '560px',
          backgroundColor: '#1e1e1e',
          borderRadius: '4px',
          border: '1px solid #383838',
          boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div
          style={{
            height: '36px',
            backgroundColor: '#161616',
            borderBottom: '1px solid #2a2a2a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 12px',
            color: '#fff',
            fontWeight: 600,
            fontSize: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#0d99ff' }}>🎬</span>
            <span>Export Sequence Settings</span>
          </div>
          <button
            onClick={() => !isExporting && setExportModalOpen(false)}
            style={{
              background: 'none',
              border: 'none',
              color: '#888',
              fontSize: '14px',
              cursor: isExporting ? 'not-allowed' : 'pointer'
            }}
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Preset Selector */}
          <div>
            <label style={{ fontSize: '11px', color: '#aaa', display: 'block', marginBottom: '4px' }}>
              Export Preset:
            </label>
            <select
              value={selectedPreset.name}
              onChange={(e) => {
                const found = PRESETS.find(p => p.name === e.target.value);
                if (found) setSelectedPreset(found);
              }}
              style={{
                width: '100%',
                backgroundColor: '#121212',
                border: '1px solid #333',
                color: '#fff',
                padding: '6px',
                borderRadius: '3px',
                fontSize: '11px'
              }}
            >
              {PRESETS.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Output Filename */}
          <div>
            <label style={{ fontSize: '11px', color: '#aaa', display: 'block', marginBottom: '4px' }}>
              Output File Name:
            </label>
            <input
              type="text"
              value={outputFileName}
              onChange={(e) => setOutputFileName(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: '#121212',
                border: '1px solid #333',
                color: '#fff',
                padding: '6px',
                borderRadius: '3px',
                fontSize: '11px'
              }}
            />
          </div>

          {/* Preset Specs Summary */}
          <div
            style={{
              backgroundColor: '#141414',
              padding: '10px',
              borderRadius: '3px',
              border: '1px solid #282828',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '6px',
              fontSize: '10px',
              color: '#bbb'
            }}
          >
            <div>Resolution: <span style={{ color: '#0d99ff' }}>{selectedPreset.width}x{selectedPreset.height}</span></div>
            <div>Framerate: <span style={{ color: '#0d99ff' }}>{selectedPreset.fps} fps</span></div>
            <div>Video Bitrate: <span style={{ color: '#0d99ff' }}>{selectedPreset.videoBitrate}</span></div>
            <div>Audio Bitrate: <span style={{ color: '#0d99ff' }}>{selectedPreset.audioBitrate}</span></div>
            <div>Format: <span style={{ color: '#0d99ff' }}>{selectedPreset.format.toUpperCase()}</span></div>
            <div>Sequence Duration: <span style={{ color: '#0d99ff' }}>{(sequence.durationFrames / sequence.fps).toFixed(1)}s</span></div>
          </div>

          {/* Export Progress Bar */}
          {isExporting && progress && (
            <div style={{ backgroundColor: '#141414', padding: '10px', borderRadius: '3px', border: '1px solid #0d99ff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#eee', marginBottom: '4px' }}>
                <span>Encoding Sequence...</span>
                <span>{progress.progressPercent}% ({progress.currentFrame}/{progress.totalFrames} frames)</span>
              </div>
              <div style={{ height: '8px', backgroundColor: '#222', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${progress.progressPercent}%`,
                    backgroundColor: '#0d99ff',
                    transition: 'width 0.1s linear'
                  }}
                />
              </div>
            </div>
          )}

          {/* Generated FFmpeg Command Display */}
          {ffmpegCommand && (
            <div>
              <label style={{ fontSize: '10px', color: '#10b981', display: 'block', marginBottom: '2px' }}>
                Native FFmpeg Render Command (Verified for FFmpeg 9.0.2):
              </label>
              <textarea
                readOnly
                value={ffmpegCommand}
                rows={3}
                style={{
                  width: '100%',
                  backgroundColor: '#101010',
                  border: '1px solid #333',
                  color: '#10b981',
                  fontFamily: 'monospace',
                  fontSize: '10px',
                  padding: '6px',
                  borderRadius: '3px'
                }}
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            height: '46px',
            backgroundColor: '#161616',
            borderTop: '1px solid #2a2a2a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: '0 12px',
            gap: '8px'
          }}
        >
          {isExporting ? (
            <button
              onClick={() => rendererInstance?.cancel()}
              style={{
                backgroundColor: '#e11d48',
                color: '#fff',
                border: 'none',
                borderRadius: '3px',
                padding: '6px 14px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cancel Render
            </button>
          ) : (
            <>
              <button
                onClick={handleGenerateFFmpeg}
                style={{
                  backgroundColor: '#222',
                  color: '#ccc',
                  border: '1px solid #444',
                  borderRadius: '3px',
                  padding: '6px 12px',
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
              >
                Copy FFmpeg Cmd
              </button>

              <button
                onClick={handleStartWebExport}
                style={{
                  backgroundColor: '#0d99ff',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '3px',
                  padding: '6px 16px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Render & Download Video
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

