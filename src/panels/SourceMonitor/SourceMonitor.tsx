import React, { useRef, useState, useEffect } from 'react';
import { useEditorStore } from '../../state/useEditorStore';
import { Timecode } from '../../timeline/Timecode';

export const SourceMonitor: React.FC = () => {
  const {
    project,
    sourceAssetId,
    sourcePlayheadFrame,
    sourceInFrame,
    sourceOutFrame,
    setSourcePlayhead,
    setSourceInPoint,
    setSourceOutPoint,
    clearSourceInOut,
    insertSourceClipToTimeline
  } = useEditorStore();

  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const asset = sourceAssetId ? project.assets[sourceAssetId] : null;
  const timecode = new Timecode(asset?.fps || 30);

  const durationFrames = asset ? asset.durationFrames : 300;
  const inPt = sourceInFrame ?? 0;
  const outPt = sourceOutFrame ?? durationFrames;

  useEffect(() => {
    let animId: number;
    if (isPlaying) {
      const interval = 1000 / (asset?.fps || 30);
      let lastTime = performance.now();
      const tick = (now: number) => {
        if (now - lastTime >= interval) {
          lastTime = now;
          setSourcePlayhead((sourcePlayheadFrame + 1) % durationFrames);
        }
        animId = requestAnimationFrame(tick);
      };
      animId = requestAnimationFrame(tick);
    }
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, sourcePlayheadFrame, durationFrames, asset?.fps, setSourcePlayhead]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#161616',
        borderRight: '1px solid #282828',
        userSelect: 'none'
      }}
    >
      {/* Tab Header */}
      <div
        style={{
          height: '24px',
          backgroundColor: '#121212',
          borderBottom: '1px solid #222',
          display: 'flex',
          alignItems: 'center',
          padding: '0 8px',
          fontSize: '11px',
          color: '#aaa',
          fontWeight: 600
        }}
      >
        <span style={{ color: '#0d99ff' }}>SOURCE:</span>
        <span style={{ marginLeft: '4px', color: '#eee', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {asset ? asset.name : 'No Clip Selected'}
        </span>
      </div>

      {/* Video Viewport Area */}
      <div
        style={{
          flex: 1,
          backgroundColor: '#0a0a0a',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden'
        }}
      >
        {asset ? (
          asset.thumbnailUrl ? (
            <img
              src={asset.thumbnailUrl}
              alt=""
              style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
            />
          ) : (
            <div style={{ textAlign: 'center', color: '#666' }}>
              <div style={{ fontSize: '32px' }}>{asset.type === 'audio' ? '🎵' : '🎬'}</div>
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#888' }}>{asset.name}</div>
              <div style={{ fontSize: '10px', color: '#555', marginTop: '2px' }}>
                Frame {sourcePlayheadFrame} / {durationFrames}
              </div>
            </div>
          )
        ) : (
          <div style={{ color: '#444', fontSize: '11px' }}>
            Double-click any media in the Project Bin to preview
          </div>
        )}

        {/* Timecode overlay */}
        {asset && (
          <div
            style={{
              position: 'absolute',
              top: '6px',
              right: '8px',
              fontFamily: 'monospace',
              fontSize: '12px',
              backgroundColor: 'rgba(0,0,0,0.7)',
              padding: '2px 6px',
              borderRadius: '2px',
              color: '#0d99ff'
            }}
          >
            {timecode.framesToTimecode(sourcePlayheadFrame)}
          </div>
        )}
      </div>

      {/* Scrubber Bar & In/Out Track */}
      {asset && (
        <div style={{ padding: '4px 8px', backgroundColor: '#1a1a1a', borderTop: '1px solid #242424' }}>
          <div
            style={{
              position: 'relative',
              height: '14px',
              backgroundColor: '#111',
              borderRadius: '2px',
              cursor: 'pointer'
            }}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              setSourcePlayhead(Math.round(ratio * durationFrames));
            }}
          >
            {/* In-Out highlighted region */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: `${(inPt / durationFrames) * 100}%`,
                width: `${((outPt - inPt) / durationFrames) * 100}%`,
                backgroundColor: 'rgba(13, 153, 255, 0.25)',
                borderLeft: '2px solid #0d99ff',
                borderRight: '2px solid #0d99ff'
              }}
            />
            {/* Playhead thumb */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: `${(sourcePlayheadFrame / durationFrames) * 100}%`,
                width: '2px',
                backgroundColor: '#ffffff'
              }}
            />
          </div>
        </div>
      )}

      {/* Transport Controls Bar */}
      <div
        style={{
          height: '32px',
          backgroundColor: '#161616',
          borderTop: '1px solid #222',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          padding: '0 8px'
        }}
      >
        {/* Mark In */}
        <button
          onClick={() => setSourceInPoint()}
          disabled={!asset}
          title="Mark In Point (I)"
          style={{
            background: '#222',
            border: '1px solid #333',
            color: '#eee',
            borderRadius: '2px',
            padding: '2px 6px',
            fontSize: '11px',
            cursor: asset ? 'pointer' : 'not-allowed'
          }}
        >
          {'{'} In
        </button>

        {/* Mark Out */}
        <button
          onClick={() => setSourceOutPoint()}
          disabled={!asset}
          title="Mark Out Point (O)"
          style={{
            background: '#222',
            border: '1px solid #333',
            color: '#eee',
            borderRadius: '2px',
            padding: '2px 6px',
            fontSize: '11px',
            cursor: asset ? 'pointer' : 'not-allowed'
          }}
        >
          Out {'}'}
        </button>

        {/* Clear In/Out */}
        <button
          onClick={clearSourceInOut}
          disabled={!asset || (sourceInFrame === null && sourceOutFrame === null)}
          title="Clear In/Out (Alt+X)"
          style={{
            background: '#222',
            border: '1px solid #333',
            color: '#888',
            borderRadius: '2px',
            padding: '2px 6px',
            fontSize: '10px',
            cursor: 'pointer'
          }}
        >
          ✕
        </button>

        {/* Step Back */}
        <button
          onClick={() => setSourcePlayhead(Math.max(0, sourcePlayheadFrame - 1))}
          disabled={!asset}
          title="Step 1 Frame Back (Left Arrow)"
          style={{
            background: '#222',
            border: '1px solid #333',
            color: '#eee',
            borderRadius: '2px',
            padding: '2px 6px',
            fontSize: '11px',
            cursor: 'pointer'
          }}
        >
          ◀
        </button>

        {/* Play/Pause */}
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          disabled={!asset}
          title="Play / Pause (Space)"
          style={{
            background: isPlaying ? '#0d99ff' : '#282828',
            border: '1px solid #3a3a3a',
            color: '#fff',
            borderRadius: '2px',
            padding: '3px 10px',
            fontSize: '11px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        {/* Step Forward */}
        <button
          onClick={() => setSourcePlayhead(Math.min(durationFrames, sourcePlayheadFrame + 1))}
          disabled={!asset}
          title="Step 1 Frame Forward (Right Arrow)"
          style={{
            background: '#222',
            border: '1px solid #333',
            color: '#eee',
            borderRadius: '2px',
            padding: '2px 6px',
            fontSize: '11px',
            cursor: 'pointer'
          }}
        >
          ▶
        </button>

        {/* Insert to Timeline */}
        <button
          onClick={insertSourceClipToTimeline}
          disabled={!asset}
          title="Insert into Timeline at Playhead (,)"
          style={{
            background: '#0d99ff',
            border: 'none',
            color: '#fff',
            borderRadius: '2px',
            padding: '3px 8px',
            fontSize: '10px',
            fontWeight: 600,
            cursor: asset ? 'pointer' : 'not-allowed',
            marginLeft: '8px'
          }}
        >
          + Insert (,)
        </button>
      </div>
    </div>
  );
};

