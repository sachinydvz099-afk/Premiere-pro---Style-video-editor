import React, { useRef, useEffect } from 'react';
import { useEditorStore } from '../../state/useEditorStore';
import { Timecode } from '../../timeline/Timecode';

export const ProgramMonitor: React.FC = () => {
  const {
    project,
    activeSequenceId,
    currentPlayheadFrame,
    isPlaying,
    togglePlay,
    stepFrame,
    setPlayhead,
    playbackResolution,
    setPlaybackResolution,
    showSafeMargins,
    toggleSafeMargins,
    selectedClipIds
  } = useEditorStore();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const sequence = project.sequences[activeSequenceId];
  const timecode = new Timecode(sequence?.fps || 30);

  // Playhead animation loop when isPlaying is true
  useEffect(() => {
    let animId: number;
    if (isPlaying && sequence) {
      const interval = 1000 / sequence.fps;
      let lastTime = performance.now();

      const tick = (now: number) => {
        if (now - lastTime >= interval) {
          lastTime = now;
          const nextFrame = currentPlayheadFrame + 1;
          if (nextFrame >= sequence.durationFrames) {
            setPlayhead(0); // Loop or stop
          } else {
            setPlayhead(nextFrame);
          }
        }
        animId = requestAnimationFrame(tick);
      };
      animId = requestAnimationFrame(tick);
    }
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, currentPlayheadFrame, sequence, setPlayhead]);

  // Render current sequence frame on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sequence) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = sequence.width || 1920;
    const height = sequence.height || 1080;

    // Apply playback resolution scaling
    const scaleFactor = playbackResolution === 'half' ? 0.5 : playbackResolution === 'quarter' ? 0.25 : 1.0;
    canvas.width = width * scaleFactor;
    canvas.height = height * scaleFactor;

    ctx.save();
    ctx.scale(scaleFactor, scaleFactor);

    // Black canvas background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Filter active clips at currentPlayheadFrame
    const activeClips = Object.values(sequence.clips).filter(
      c => currentPlayheadFrame >= c.timelineStartFrame &&
           currentPlayheadFrame < c.timelineStartFrame + c.durationFrames &&
           c.visible
    );

    // Sort by track order (V1 at bottom, V3 on top)
    activeClips.sort((a, b) => {
      const trackA = sequence.tracks.find(t => t.id === a.trackId)?.order ?? 0;
      const trackB = sequence.tracks.find(t => t.id === b.trackId)?.order ?? 0;
      return trackB - trackA; // lower order number = higher z-index
    });

    for (const clip of activeClips) {
      ctx.save();

      // Transform
      const cx = width / 2 + clip.transform.x;
      const cy = height / 2 + clip.transform.y;
      ctx.translate(cx, cy);
      ctx.rotate((clip.transform.rotation * Math.PI) / 180);
      ctx.scale(clip.transform.scaleX, clip.transform.scaleY);
      ctx.globalAlpha = clip.transform.opacity;

      // Filter effects
      const brightness = clip.effects.find(e => e.type === 'brightness' && e.enabled)?.parameters.value ?? 0;
      const contrast = clip.effects.find(e => e.type === 'contrast' && e.enabled)?.parameters.value ?? 1;
      const saturation = clip.effects.find(e => e.type === 'saturation' && e.enabled)?.parameters.value ?? 1;
      const blur = clip.effects.find(e => e.type === 'blur' && e.enabled)?.parameters.value ?? 0;

      ctx.filter = `brightness(${1 + brightness}) contrast(${contrast}) saturate(${saturation}) blur(${blur}px)`;

      if (clip.type === 'title' && clip.titleProperties) {
        // Render Title Text
        const title = clip.titleProperties;
        ctx.font = `${title.fontWeight || 'bold'} ${title.fontSize}px ${title.fontFamily || 'sans-serif'}`;
        ctx.fillStyle = title.color || '#ffffff';
        ctx.textAlign = title.textAlign || 'center';
        ctx.textBaseline = 'middle';

        if (title.strokeColor && title.strokeWidth) {
          ctx.strokeStyle = title.strokeColor;
          ctx.lineWidth = title.strokeWidth;
          ctx.strokeText(title.text, 0, 0);
        }
        ctx.fillText(title.text, 0, 0);
      } else {
        // Render Video / Image Clip Representation
        const asset = project.assets[clip.mediaId];
        if (asset && asset.thumbnailUrl) {
          // If thumbnail/image element is available, we draw it or placeholder
          ctx.fillStyle = '#1e3a8a';
          ctx.fillRect(-width / 4, -height / 4, width / 2, height / 2);
          ctx.fillStyle = '#ffffff';
          ctx.font = '28px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(clip.name, 0, 0);
        } else {
          // Video color card
          const isSelected = selectedClipIds.includes(clip.id);
          ctx.fillStyle = isSelected ? '#2563eb' : '#1e293b';
          ctx.fillRect(-width / 4, -height / 4, width / 2, height / 2);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 32px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(clip.name, 0, -10);
          ctx.font = '18px sans-serif';
          ctx.fillStyle = '#94a3b8';
          ctx.fillText(`Frame ${currentPlayheadFrame - clip.timelineStartFrame + clip.sourceStartFrame}`, 0, 25);
        }
      }

      ctx.restore();
    }

    // Draw Safe Margins (90% Action Safe, 80% Title Safe)
    if (showSafeMargins) {
      ctx.save();
      ctx.strokeStyle = '#00ffcc';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      // 90% Action Safe
      const m90w = width * 0.9;
      const m90h = height * 0.9;
      ctx.strokeRect((width - m90w) / 2, (height - m90h) / 2, m90w, m90h);

      // 80% Title Safe
      ctx.strokeStyle = '#ffcc00';
      const m80w = width * 0.8;
      const m80h = height * 0.8;
      ctx.strokeRect((width - m80w) / 2, (height - m80h) / 2, m80w, m80h);

      // Center crosshair
      ctx.beginPath();
      ctx.moveTo(width / 2 - 10, height / 2);
      ctx.lineTo(width / 2 + 10, height / 2);
      ctx.moveTo(width / 2, height / 2 - 10);
      ctx.lineTo(width / 2, height / 2 + 10);
      ctx.stroke();

      ctx.restore();
    }

    ctx.restore();
  }, [
    sequence,
    currentPlayheadFrame,
    playbackResolution,
    showSafeMargins,
    project.assets,
    selectedClipIds
  ]);

  const handleFullscreen = () => {
    if (containerRef.current) {
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen().catch(err => console.error(err));
      } else {
        document.exitFullscreen().catch(err => console.error(err));
      }
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#161616',
        userSelect: 'none'
      }}
    >
      {/* Tab Header Bar */}
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
        <span style={{ color: '#0d99ff' }}>PROGRAM:</span>
        <span style={{ marginLeft: '4px', color: '#eee' }}>{sequence?.name || 'Program'}</span>

        {/* Resolution selector */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <select
            value={playbackResolution}
            onChange={(e) => setPlaybackResolution(e.target.value as 'full' | 'half' | 'quarter')}
            style={{
              backgroundColor: '#222',
              color: '#ccc',
              border: '1px solid #333',
              borderRadius: '2px',
              fontSize: '10px',
              padding: '1px 4px'
            }}
          >
            <option value="full">Full Res</option>
            <option value="half">1/2 Res</option>
            <option value="quarter">1/4 Res</option>
          </select>

          <button
            onClick={toggleSafeMargins}
            title="Toggle Safe Margin Guidelines"
            style={{
              background: showSafeMargins ? '#0d99ff' : '#222',
              color: '#fff',
              border: '1px solid #333',
              borderRadius: '2px',
              fontSize: '10px',
              padding: '1px 5px',
              cursor: 'pointer'
            }}
          >
            Margins
          </button>

          <button
            onClick={handleFullscreen}
            title="Toggle Fullscreen Preview"
            style={{
              background: '#222',
              color: '#fff',
              border: '1px solid #333',
              borderRadius: '2px',
              fontSize: '10px',
              padding: '1px 5px',
              cursor: 'pointer'
            }}
          >
            ⛶
          </button>
        </div>
      </div>

      {/* Main Canvas Viewport */}
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
        <canvas
          ref={canvasRef}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            boxShadow: '0 0 20px rgba(0,0,0,0.8)'
          }}
        />

        {/* Master Sequence Timecode overlay */}
        <div
          style={{
            position: 'absolute',
            bottom: '8px',
            right: '8px',
            fontFamily: 'monospace',
            fontSize: '13px',
            backgroundColor: 'rgba(0,0,0,0.75)',
            padding: '2px 8px',
            borderRadius: '2px',
            color: '#0d99ff',
            letterSpacing: '1px',
            fontWeight: 'bold'
          }}
        >
          {timecode.framesToTimecode(currentPlayheadFrame)}
        </div>
      </div>

      {/* Program Transport Controls Bar */}
      <div
        style={{
          height: '32px',
          backgroundColor: '#161616',
          borderTop: '1px solid #222',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '0 8px'
        }}
      >
        {/* Step Back */}
        <button
          onClick={() => stepFrame(-1)}
          title="Step 1 Frame Back (Left Arrow)"
          style={{
            background: '#222',
            border: '1px solid #333',
            color: '#eee',
            borderRadius: '2px',
            padding: '3px 8px',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          ◀
        </button>

        {/* Play/Pause */}
        <button
          onClick={togglePlay}
          title="Play / Pause Sequence (Space)"
          style={{
            background: isPlaying ? '#0d99ff' : '#282828',
            border: '1px solid #3a3a3a',
            color: '#fff',
            borderRadius: '2px',
            padding: '3px 14px',
            fontSize: '12px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        {/* Step Forward */}
        <button
          onClick={() => stepFrame(1)}
          title="Step 1 Frame Forward (Right Arrow)"
          style={{
            background: '#222',
            border: '1px solid #333',
            color: '#eee',
            borderRadius: '2px',
            padding: '3px 8px',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          ▶
        </button>
      </div>
    </div>
  );
};

