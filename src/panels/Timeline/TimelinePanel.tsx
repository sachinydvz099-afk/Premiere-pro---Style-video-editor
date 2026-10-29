import React, { useRef, useState, useEffect } from 'react';
import { useEditorStore } from '../../state/useEditorStore';
import { Timecode } from '../../timeline/Timecode';
import { ClipItem, Track } from '../../timeline/TimelineModel';
import { getCandidateSnapPoints, findSnapFrame } from '../../timeline/snapping';

export const TimelinePanel: React.FC = () => {
  const {
    project,
    activeSequenceId,
    currentPlayheadFrame,
    setPlayhead,
    activeTool,
    setActiveTool,
    timelineZoom,
    setTimelineZoom,
    snappingEnabled,
    toggleSnapping,
    selectedClipIds,
    setSelectedClips,
    moveClip,
    trimClip,
    splitClipAtPlayhead,
    deleteSelectedClips,
    rippleDeleteSelectedClips,
    undo,
    redo,
    canUndo,
    canRedo,
    toggleTrackLock,
    toggleTrackVisibility,
    toggleTrackMute,
    toggleTrackSolo,
    addClipToTimeline
  } = useEditorStore();

  const sequence = project.sequences[activeSequenceId];
  const timecode = new Timecode(sequence?.fps || 30);

  const rulerRef = useRef<HTMLDivElement>(null);
  const tracksContainerRef = useRef<HTMLDivElement>(null);

  // Dragging state
  const [draggingClipId, setDraggingClipId] = useState<string | null>(null);
  const [dragAction, setDragAction] = useState<'move' | 'trim-start' | 'trim-end' | null>(null);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const [originalStartFrame, setOriginalStartFrame] = useState<number>(0);
  const [originalDuration, setOriginalDuration] = useState<number>(0);
  const [isScrubbingPlayhead, setIsScrubbingPlayhead] = useState<boolean>(false);

  // Playhead scrubbing handler
  const handleRulerMouseDown = (e: React.MouseEvent) => {
    setIsScrubbingPlayhead(true);
    handleScrub(e.clientX);
  };

  const handleScrub = (clientX: number) => {
    if (!tracksContainerRef.current) return;
    const rect = tracksContainerRef.current.getBoundingClientRect();
    const scrollLeft = tracksContainerRef.current.scrollLeft;
    const offsetX = clientX - rect.left + scrollLeft;
    const targetFrame = Math.max(0, Math.round(offsetX / timelineZoom));

    if (snappingEnabled && sequence) {
      const snapCandidates = getCandidateSnapPoints(sequence, currentPlayheadFrame);
      const snap = findSnapFrame(targetFrame, snapCandidates, Math.round(8 / timelineZoom));
      setPlayhead(snap.snappedFrame);
    } else {
      setPlayhead(targetFrame);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isScrubbingPlayhead) {
        handleScrub(e.clientX);
      } else if (draggingClipId && dragAction && sequence) {
        const deltaPx = e.clientX - dragStartX;
        const deltaFrames = Math.round(deltaPx / timelineZoom);
        const clip = sequence.clips[draggingClipId];
        if (!clip) return;

        if (dragAction === 'move') {
          let newStart = Math.max(0, originalStartFrame + deltaFrames);
          if (snappingEnabled) {
            const snapCandidates = getCandidateSnapPoints(sequence, currentPlayheadFrame, [clip.id]);
            const snap = findSnapFrame(newStart, snapCandidates, Math.round(8 / timelineZoom));
            newStart = snap.snappedFrame;
          }
          moveClip(clip.id, newStart);
        } else if (dragAction === 'trim-start') {
          trimClip(clip.id, 'start', deltaFrames);
        } else if (dragAction === 'trim-end') {
          trimClip(clip.id, 'end', deltaFrames);
        }
      }
    };

    const handleMouseUp = () => {
      setIsScrubbingPlayhead(false);
      setDraggingClipId(null);
      setDragAction(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [
    isScrubbingPlayhead,
    draggingClipId,
    dragAction,
    dragStartX,
    originalStartFrame,
    originalDuration,
    timelineZoom,
    snappingEnabled,
    sequence,
    currentPlayheadFrame,
    moveClip,
    trimClip
  ]);

  if (!sequence) return <div style={{ color: '#fff' }}>No sequence loaded</div>;

  const totalWidth = Math.max(1200, sequence.durationFrames * timelineZoom + 400);

  // Separate tracks into Video and Audio
  const videoTracks = sequence.tracks.filter(t => t.type === 'video').sort((a, b) => a.order - b.order);
  const audioTracks = sequence.tracks.filter(t => t.type === 'audio').sort((a, b) => a.order - b.order);

  const handleClipClick = (e: React.MouseEvent, clip: ClipItem) => {
    e.stopPropagation();
    if (activeTool === 'cut') {
      // Split clip directly at click position
      const rect = e.currentTarget.getBoundingClientRect();
      const clickOffsetX = e.clientX - rect.left;
      const clickedFrame = clip.timelineStartFrame + Math.round(clickOffsetX / timelineZoom);
      setPlayhead(clickedFrame);
      splitClipAtPlayhead();
    } else {
      setSelectedClips([clip.id]);
    }
  };

  const handleClipMouseDown = (
    e: React.MouseEvent,
    clip: ClipItem,
    action: 'move' | 'trim-start' | 'trim-end'
  ) => {
    e.stopPropagation();
    if (activeTool === 'cut') return;

    setSelectedClips([clip.id]);
    setDraggingClipId(clip.id);
    setDragAction(action);
    setDragStartX(e.clientX);
    setOriginalStartFrame(clip.timelineStartFrame);
    setOriginalDuration(clip.durationFrames);
  };

  // Drop asset onto timeline track
  const handleDropOnTrack = (e: React.DragEvent, track: Track) => {
    e.preventDefault();
    const assetJson = e.dataTransfer.getData('application/reacut-asset');
    if (!assetJson) return;

    try {
      const asset = JSON.parse(assetJson);
      const rect = e.currentTarget.getBoundingClientRect();
      const scrollLeft = tracksContainerRef.current?.scrollLeft || 0;
      const dropX = e.clientX - rect.left + scrollLeft;
      const dropFrame = Math.max(0, Math.round(dropX / timelineZoom));

      const newClip: ClipItem = {
        id: 'clip_' + Math.random().toString(36).substring(2, 9),
        mediaId: asset.id,
        trackId: track.id,
        name: asset.name,
        type: asset.type,
        timelineStartFrame: dropFrame,
        durationFrames: asset.durationFrames || 150,
        sourceStartFrame: 0,
        sourceEndFrame: asset.durationFrames || 150,
        speed: 1.0,
        muted: false,
        visible: true,
        transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, anchorX: 0.5, anchorY: 0.5 },
        audio: { gain: 0, pan: 0, fadeInFrames: 0, fadeOutFrames: 0 },
        effects: []
      };

      addClipToTimeline(newClip);
    } catch (err) {
      console.error('Failed to parse dropped asset', err);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#181818',
        borderTop: '1px solid #282828',
        userSelect: 'none'
      }}
    >
      {/* Top Controls Toolbar */}
      <div
        style={{
          height: '32px',
          backgroundColor: '#1b1b1b',
          borderBottom: '1px solid #282828',
          display: 'flex',
          alignItems: 'center',
          padding: '0 8px',
          gap: '8px'
        }}
      >
        {/* Playhead Timecode readout */}
        <div
          style={{
            fontFamily: 'monospace',
            fontSize: '13px',
            fontWeight: 'bold',
            color: '#0d99ff',
            backgroundColor: '#101010',
            padding: '2px 8px',
            borderRadius: '2px',
            border: '1px solid #2a2a2a'
          }}
        >
          {timecode.framesToTimecode(currentPlayheadFrame)}
        </div>

        {/* Editing Tools (Selection, Razor Cut, Ripple) */}
        <div style={{ display: 'flex', gap: '2px', backgroundColor: '#141414', padding: '2px', borderRadius: '3px' }}>
          <button
            onClick={() => setActiveTool('select')}
            title="Selection Tool (V)"
            style={{
              background: activeTool === 'select' ? '#0d99ff' : 'transparent',
              color: activeTool === 'select' ? '#fff' : '#aaa',
              border: 'none',
              padding: '3px 8px',
              borderRadius: '2px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 600
            }}
          >
            V Select
          </button>
          <button
            onClick={() => setActiveTool('cut')}
            title="Razor / Cut Tool (C)"
            style={{
              background: activeTool === 'cut' ? '#0d99ff' : 'transparent',
              color: activeTool === 'cut' ? '#fff' : '#aaa',
              border: 'none',
              padding: '3px 8px',
              borderRadius: '2px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 600
            }}
          >
            C Razor
          </button>
        </div>

        {/* Quick Edit Buttons */}
        <button
          onClick={splitClipAtPlayhead}
          title="Split at Playhead (Ctrl+K)"
          style={{
            background: '#222',
            border: '1px solid #333',
            color: '#eee',
            padding: '2px 6px',
            borderRadius: '2px',
            fontSize: '11px',
            cursor: 'pointer'
          }}
        >
          Split (Ctrl+K)
        </button>

        <button
          onClick={deleteSelectedClips}
          disabled={selectedClipIds.length === 0}
          title="Delete Selected Clip (Del)"
          style={{
            background: '#222',
            border: '1px solid #333',
            color: selectedClipIds.length > 0 ? '#eee' : '#555',
            padding: '2px 6px',
            borderRadius: '2px',
            fontSize: '11px',
            cursor: 'pointer'
          }}
        >
          Delete
        </button>

        <button
          onClick={rippleDeleteSelectedClips}
          disabled={selectedClipIds.length === 0}
          title="Ripple Delete Clip (Shift+Del)"
          style={{
            background: '#222',
            border: '1px solid #333',
            color: selectedClipIds.length > 0 ? '#0d99ff' : '#555',
            padding: '2px 6px',
            borderRadius: '2px',
            fontSize: '11px',
            cursor: 'pointer'
          }}
        >
          Ripple Del
        </button>

        {/* Snapping Toggle */}
        <button
          onClick={toggleSnapping}
          title="Toggle Magnetic Snapping (S)"
          style={{
            background: snappingEnabled ? '#0d99ff' : '#222',
            color: '#fff',
            border: '1px solid #333',
            padding: '2px 8px',
            borderRadius: '2px',
            fontSize: '11px',
            cursor: 'pointer',
            marginLeft: '4px'
          }}
        >
          🧲 Snap: {snappingEnabled ? 'ON' : 'OFF'}
        </button>

        {/* Undo / Redo */}
        <div style={{ display: 'flex', gap: '2px', marginLeft: '4px' }}>
          <button
            onClick={undo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            style={{
              background: '#222',
              border: '1px solid #333',
              color: canUndo ? '#eee' : '#444',
              padding: '2px 6px',
              borderRadius: '2px',
              fontSize: '11px',
              cursor: canUndo ? 'pointer' : 'default'
            }}
          >
            ↩ Undo
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            style={{
              background: '#222',
              border: '1px solid #333',
              color: canRedo ? '#eee' : '#444',
              padding: '2px 6px',
              borderRadius: '2px',
              fontSize: '11px',
              cursor: canRedo ? 'pointer' : 'default'
            }}
          >
            ↪ Redo
          </button>
        </div>

        {/* Zoom Slider */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '10px', color: '#888' }}>Zoom:</span>
          <button
            onClick={() => setTimelineZoom(timelineZoom * 0.8)}
            style={{ background: '#222', border: '1px solid #333', color: '#ccc', padding: '1px 5px', cursor: 'pointer', borderRadius: '2px' }}
          >
            -
          </button>
          <input
            type="range"
            min="0.5"
            max="15"
            step="0.5"
            value={timelineZoom}
            onChange={(e) => setTimelineZoom(parseFloat(e.target.value))}
            style={{ width: '80px', accentColor: '#0d99ff', cursor: 'pointer' }}
          />
          <button
            onClick={() => setTimelineZoom(timelineZoom * 1.25)}
            style={{ background: '#222', border: '1px solid #333', color: '#ccc', padding: '1px 5px', cursor: 'pointer', borderRadius: '2px' }}
          >
            +
          </button>
        </div>
      </div>

      {/* Main Tracks & Ruler Container */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left Track Headers Column (Fixed Width 140px) */}
        <div
          style={{
            width: '140px',
            backgroundColor: '#1b1b1b',
            borderRight: '1px solid #282828',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 10
          }}
        >
          {/* Top ruler placeholder aligner */}
          <div style={{ height: '26px', borderBottom: '1px solid #282828', backgroundColor: '#161616' }} />

          {/* Video Track Headers */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {videoTracks.map((track) => (
              <div
                key={track.id}
                style={{
                  height: '42px',
                  borderBottom: '1px solid #282828',
                  backgroundColor: '#1e1e1e',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 8px',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                  color: '#bbb'
                }}
              >
                <span style={{ fontWeight: 'bold', color: '#0d99ff' }}>{track.name}</span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={() => toggleTrackVisibility(track.id)}
                    title={track.visible ? 'Hide Track Output' : 'Show Track Output'}
                    style={{
                      background: track.visible ? '#282828' : '#e11d48',
                      color: '#fff',
                      border: '1px solid #3a3a3a',
                      borderRadius: '2px',
                      padding: '2px 4px',
                      fontSize: '9px',
                      cursor: 'pointer'
                    }}
                  >
                    👁
                  </button>
                  <button
                    onClick={() => toggleTrackLock(track.id)}
                    title={track.locked ? 'Unlock Track' : 'Lock Track'}
                    style={{
                      background: track.locked ? '#f59e0b' : '#282828',
                      color: '#fff',
                      border: '1px solid #3a3a3a',
                      borderRadius: '2px',
                      padding: '2px 4px',
                      fontSize: '9px',
                      cursor: 'pointer'
                    }}
                  >
                    🔒
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Divider between Video and Audio */}
          <div style={{ height: '4px', backgroundColor: '#101010', borderBottom: '1px solid #242424' }} />

          {/* Audio Track Headers */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {audioTracks.map((track) => (
              <div
                key={track.id}
                style={{
                  height: '38px',
                  borderBottom: '1px solid #282828',
                  backgroundColor: '#1b1e1b',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 8px',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                  color: '#bbb'
                }}
              >
                <span style={{ fontWeight: 'bold', color: '#10b981' }}>{track.name}</span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={() => toggleTrackMute(track.id)}
                    title={track.muted ? 'Unmute Track' : 'Mute Track (M)'}
                    style={{
                      background: track.muted ? '#ef4444' : '#282828',
                      color: '#fff',
                      border: '1px solid #3a3a3a',
                      borderRadius: '2px',
                      padding: '2px 4px',
                      fontSize: '9px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    M
                  </button>
                  <button
                    onClick={() => toggleTrackSolo(track.id)}
                    title={track.solo ? 'Unsolo Track' : 'Solo Track (S)'}
                    style={{
                      background: track.solo ? '#10b981' : '#282828',
                      color: '#fff',
                      border: '1px solid #3a3a3a',
                      borderRadius: '2px',
                      padding: '2px 4px',
                      fontSize: '9px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    S
                  </button>
                  <button
                    onClick={() => toggleTrackLock(track.id)}
                    title={track.locked ? 'Unlock Track' : 'Lock Track'}
                    style={{
                      background: track.locked ? '#f59e0b' : '#282828',
                      color: '#fff',
                      border: '1px solid #3a3a3a',
                      borderRadius: '2px',
                      padding: '2px 4px',
                      fontSize: '9px',
                      cursor: 'pointer'
                    }}
                  >
                    🔒
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Scrollable Timeline Body (Ruler & Tracks) */}
        <div
          ref={tracksContainerRef}
          style={{
            flex: 1,
            overflowX: 'auto',
            overflowY: 'hidden',
            position: 'relative',
            backgroundColor: '#141414'
          }}
        >
          <div style={{ width: `${totalWidth}px`, position: 'relative', height: '100%' }}>
            {/* Timeline Ruler */}
            <div
              ref={rulerRef}
              onMouseDown={handleRulerMouseDown}
              style={{
                height: '26px',
                backgroundColor: '#181818',
                borderBottom: '1px solid #282828',
                position: 'relative',
                cursor: 'pointer'
              }}
            >
              {/* Ticks and timecode labels every second */}
              {Array.from({ length: Math.ceil(sequence.durationFrames / sequence.fps) + 1 }).map((_, secIdx) => {
                const frame = secIdx * sequence.fps;
                const left = frame * timelineZoom;
                return (
                  <div
                    key={secIdx}
                    style={{
                      position: 'absolute',
                      left: `${left}px`,
                      top: 0,
                      bottom: 0,
                      borderLeft: '1px solid #333',
                      fontSize: '9px',
                      fontFamily: 'monospace',
                      color: '#777',
                      paddingLeft: '4px',
                      pointerEvents: 'none'
                    }}
                  >
                    {timecode.framesToTimecode(frame).substring(3, 8)}
                  </div>
                );
              })}
            </div>

            {/* Video Tracks Content */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {videoTracks.map((track) => {
                const trackClips = Object.values(sequence.clips).filter(c => c.trackId === track.id);
                return (
                  <div
                    key={track.id}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDropOnTrack(e, track)}
                    style={{
                      height: '42px',
                      borderBottom: '1px solid #222',
                      backgroundColor: track.locked ? '#121212' : '#161616',
                      position: 'relative'
                    }}
                  >
                    {trackClips.map((clip) => {
                      const isSelected = selectedClipIds.includes(clip.id);
                      const isTitle = clip.type === 'title';
                      const leftPx = clip.timelineStartFrame * timelineZoom;
                      const widthPx = clip.durationFrames * timelineZoom;

                      return (
                        <div
                          key={clip.id}
                          onClick={(e) => handleClipClick(e, clip)}
                          onMouseDown={(e) => handleClipMouseDown(e, clip, 'move')}
                          style={{
                            position: 'absolute',
                            left: `${leftPx}px`,
                            width: `${widthPx}px`,
                            top: '3px',
                            bottom: '3px',
                            backgroundColor: isTitle ? '#8b5cf6' : '#2563eb',
                            border: isSelected ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '3px',
                            overflow: 'hidden',
                            cursor: activeTool === 'cut' ? 'crosshair' : 'move',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0 6px',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
                            zIndex: isSelected ? 5 : 2
                          }}
                        >
                          {/* Left Trim Handle */}
                          <div
                            onMouseDown={(e) => handleClipMouseDown(e, clip, 'trim-start')}
                            style={{
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              bottom: 0,
                              width: '6px',
                              cursor: 'ew-resize',
                              backgroundColor: 'rgba(255,255,255,0.15)'
                            }}
                          />

                          {/* Clip Label */}
                          <div style={{ flex: 1, minWidth: 0, pointerEvents: 'none' }}>
                            <div
                              style={{
                                fontSize: '10px',
                                fontWeight: 600,
                                color: '#ffffff',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}
                            >
                              {clip.name}
                            </div>
                            <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.7)' }}>
                              {(clip.durationFrames / sequence.fps).toFixed(1)}s
                            </div>
                          </div>

                          {/* Right Trim Handle */}
                          <div
                            onMouseDown={(e) => handleClipMouseDown(e, clip, 'trim-end')}
                            style={{
                              position: 'absolute',
                              right: 0,
                              top: 0,
                              bottom: 0,
                              width: '6px',
                              cursor: 'ew-resize',
                              backgroundColor: 'rgba(255,255,255,0.15)'
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Track Group Separator */}
            <div style={{ height: '4px', backgroundColor: '#0d0d0d' }} />

            {/* Audio Tracks Content */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {audioTracks.map((track) => {
                const trackClips = Object.values(sequence.clips).filter(c => c.trackId === track.id);
                return (
                  <div
                    key={track.id}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDropOnTrack(e, track)}
                    style={{
                      height: '38px',
                      borderBottom: '1px solid #222',
                      backgroundColor: track.locked ? '#121212' : '#141714',
                      position: 'relative'
                    }}
                  >
                    {trackClips.map((clip) => {
                      const isSelected = selectedClipIds.includes(clip.id);
                      const leftPx = clip.timelineStartFrame * timelineZoom;
                      const widthPx = clip.durationFrames * timelineZoom;

                      return (
                        <div
                          key={clip.id}
                          onClick={(e) => handleClipClick(e, clip)}
                          onMouseDown={(e) => handleClipMouseDown(e, clip, 'move')}
                          style={{
                            position: 'absolute',
                            left: `${leftPx}px`,
                            width: `${widthPx}px`,
                            top: '3px',
                            bottom: '3px',
                            backgroundColor: '#059669',
                            border: isSelected ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '3px',
                            overflow: 'hidden',
                            cursor: activeTool === 'cut' ? 'crosshair' : 'move',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0 6px',
                            zIndex: isSelected ? 5 : 2
                          }}
                        >
                          {/* Left Trim Handle */}
                          <div
                            onMouseDown={(e) => handleClipMouseDown(e, clip, 'trim-start')}
                            style={{
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              bottom: 0,
                              width: '6px',
                              cursor: 'ew-resize',
                              backgroundColor: 'rgba(255,255,255,0.15)'
                            }}
                          />

                          {/* Audio Waveform visualization */}
                          <div style={{ flex: 1, minWidth: 0, pointerEvents: 'none' }}>
                            <div
                              style={{
                                fontSize: '10px',
                                fontWeight: 600,
                                color: '#ffffff',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}
                            >
                              🎵 {clip.name}
                            </div>
                            <div style={{ height: '10px', display: 'flex', alignItems: 'center', gap: '1px', marginTop: '1px' }}>
                              {Array.from({ length: Math.min(40, Math.round(widthPx / 5)) }).map((_, idx) => (
                                <div
                                  key={idx}
                                  style={{
                                    width: '2px',
                                    height: `${Math.sin(idx * 0.7) * 4 + 6}px`,
                                    backgroundColor: 'rgba(255,255,255,0.5)',
                                    borderRadius: '1px'
                                  }}
                                />
                              ))}
                            </div>
                          </div>

                          {/* Right Trim Handle */}
                          <div
                            onMouseDown={(e) => handleClipMouseDown(e, clip, 'trim-end')}
                            style={{
                              position: 'absolute',
                              right: 0,
                              top: 0,
                              bottom: 0,
                              width: '6px',
                              cursor: 'ew-resize',
                              backgroundColor: 'rgba(255,255,255,0.15)'
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Playhead Needle and Scrub Line */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: `${currentPlayheadFrame * timelineZoom}px`,
                width: '1px',
                backgroundColor: '#0d99ff',
                zIndex: 20,
                pointerEvents: 'none'
              }}
            >
              {/* Playhead Head Polygon */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '-6px',
                  width: '13px',
                  height: '14px',
                  backgroundColor: '#0d99ff',
                  clipPath: 'polygon(0% 0%, 100% 0%, 100% 60%, 50% 100%, 0% 60%)'
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
