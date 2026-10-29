import React, { useState, useRef } from 'react';
import { useEditorStore } from '../../state/useEditorStore';
import { MediaAsset } from '../../timeline/TimelineModel';

export const ProjectPanel: React.FC = () => {
  const { project, addAsset, setSourceAsset, addTitleClip } = useEditorStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const assets = Object.values(project.assets).filter(a =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleImportFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const url = URL.createObjectURL(file);
      const isVideo = file.type.startsWith('video');
      const isAudio = file.type.startsWith('audio');
      const isImage = file.type.startsWith('image');
      const type = isVideo ? 'video' : isAudio ? 'audio' : isImage ? 'image' : 'video';

      addAsset({
        id: 'asset_' + Math.random().toString(36).substring(2, 9),
        name: file.name,
        filePath: file.name,
        type,
        durationFrames: 180, // Default 6s
        fps: 30,
        width: 1920,
        height: 1080,
        thumbnailUrl: isImage || isVideo ? url : undefined,
        sizeBytes: file.size,
        createdAt: Date.now()
      });
    }
    e.target.value = '';
  };

  const handleAddSampleAsset = (type: 'smpte_bars' | 'countdown' | 'audio_tone') => {
    if (type === 'smpte_bars') {
      addAsset({
        id: 'asset_bars_' + Date.now(),
        name: 'SMPTE Color Bars.mp4',
        filePath: 'SMPTE_Color_Bars.mp4',
        type: 'video',
        durationFrames: 300, // 10 seconds at 30 fps
        fps: 30,
        width: 1920,
        height: 1080,
        createdAt: Date.now()
      });
    } else if (type === 'countdown') {
      addAsset({
        id: 'asset_countdown_' + Date.now(),
        name: 'Universal Leader 8s.mp4',
        filePath: 'Universal_Leader.mp4',
        type: 'video',
        durationFrames: 240, // 8 seconds
        fps: 30,
        width: 1920,
        height: 1080,
        createdAt: Date.now()
      });
    } else {
      addAsset({
        id: 'asset_tone_' + Date.now(),
        name: '1kHz Audio Tone.wav',
        filePath: '1kHz_Tone.wav',
        type: 'audio',
        durationFrames: 300,
        fps: 30,
        width: 0,
        height: 0,
        channels: 2,
        sampleRate: 48000,
        createdAt: Date.now()
      });
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#1b1b1b',
        borderRight: '1px solid #282828',
        userSelect: 'none'
      }}
    >
      <input
        type="file"
        ref={fileInputRef}
        multiple
        accept="video/*,audio/*,image/*"
        style={{ display: 'none' }}
        onChange={handleImportFiles}
      />

      {/* Panel Tab Header */}
      <div
        style={{
          height: '24px',
          backgroundColor: '#161616',
          borderBottom: '1px solid #242424',
          display: 'flex',
          alignItems: 'center',
          padding: '0 8px',
          fontSize: '11px',
          color: '#aaa',
          fontWeight: 600
        }}
      >
        <span style={{ color: '#0d99ff' }}>PROJECT:</span>
        <span style={{ marginLeft: '4px', color: '#fff' }}>{project.settings.name}</span>

        {/* View toggle & Actions */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            title="Toggle Grid / List View"
            style={{
              background: '#222',
              border: '1px solid #333',
              color: '#bbb',
              borderRadius: '2px',
              cursor: 'pointer',
              padding: '2px 5px',
              fontSize: '10px'
            }}
          >
            {viewMode === 'grid' ? '☰ List' : '☷ Grid'}
          </button>
        </div>
      </div>

      {/* Search & Action Toolbar */}
      <div
        style={{
          padding: '4px 8px',
          display: 'flex',
          gap: '6px',
          borderBottom: '1px solid #252525',
          backgroundColor: '#181818'
        }}
      >
        <input
          type="text"
          placeholder="Filter assets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            backgroundColor: '#111',
            border: '1px solid #333',
            color: '#eee',
            padding: '2px 6px',
            fontSize: '11px',
            borderRadius: '2px'
          }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            backgroundColor: '#0d99ff',
            color: '#fff',
            border: 'none',
            borderRadius: '2px',
            padding: '2px 8px',
            fontSize: '10px',
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          + Import
        </button>
        <button
          onClick={() => addTitleClip('ReaCut Studio Title')}
          style={{
            backgroundColor: '#282828',
            color: '#eee',
            border: '1px solid #3a3a3a',
            borderRadius: '2px',
            padding: '2px 8px',
            fontSize: '10px',
            cursor: 'pointer'
          }}
        >
          + Title
        </button>
      </div>

      {/* Asset List / Grid Container */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '6px',
          display: viewMode === 'grid' ? 'grid' : 'flex',
          flexDirection: 'column',
          gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
          gap: '6px',
          alignContent: 'start'
        }}
      >
        {assets.length === 0 ? (
          <div
            style={{
              gridColumn: '1 / -1',
              padding: '20px 10px',
              textAlign: 'center',
              color: '#666',
              fontSize: '11px'
            }}
          >
            <div style={{ marginBottom: '8px', fontSize: '24px' }}>📂</div>
            <div>No media imported yet</div>
            <div style={{ fontSize: '10px', color: '#555', marginTop: '4px' }}>
              Drag files here or use the Import button
            </div>
            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', color: '#888' }}>Quick Start Test Assets:</span>
              <button
                onClick={() => handleAddSampleAsset('smpte_bars')}
                style={{
                  background: '#222',
                  border: '1px solid #444',
                  color: '#0d99ff',
                  padding: '3px 8px',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  fontSize: '10px'
                }}
              >
                + SMPTE Color Bars
              </button>
              <button
                onClick={() => handleAddSampleAsset('countdown')}
                style={{
                  background: '#222',
                  border: '1px solid #444',
                  color: '#0d99ff',
                  padding: '3px 8px',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  fontSize: '10px'
                }}
              >
                + Universal Leader 8s
              </button>
              <button
                onClick={() => handleAddSampleAsset('audio_tone')}
                style={{
                  background: '#222',
                  border: '1px solid #444',
                  color: '#0d99ff',
                  padding: '3px 8px',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  fontSize: '10px'
                }}
              >
                + 1kHz Audio Tone
              </button>
            </div>
          </div>
        ) : (
          assets.map((asset) => (
            <div
              key={asset.id}
              onDoubleClick={() => setSourceAsset(asset.id)}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/reacut-asset', JSON.stringify(asset));
              }}
              style={{
                backgroundColor: '#202020',
                border: '1px solid #2f2f2f',
                borderRadius: '3px',
                padding: '4px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: viewMode === 'grid' ? 'column' : 'row',
                alignItems: viewMode === 'grid' ? 'stretch' : 'center',
                gap: '6px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#0d99ff'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#2f2f2f'}
            >
              {/* Asset Thumbnail / Icon */}
              <div
                style={{
                  height: viewMode === 'grid' ? '54px' : '24px',
                  width: viewMode === 'grid' ? '100%' : '32px',
                  backgroundColor: '#121212',
                  borderRadius: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  position: 'relative'
                }}
              >
                {asset.thumbnailUrl ? (
                  <img
                    src={asset.thumbnailUrl}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span style={{ fontSize: '18px' }}>
                    {asset.type === 'video' ? '🎬' : asset.type === 'audio' ? '🎵' : '🖼️'}
                  </span>
                )}
                <span
                  style={{
                    position: 'absolute',
                    bottom: '1px',
                    right: '2px',
                    fontSize: '8px',
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    padding: '1px 3px',
                    borderRadius: '2px',
                    color: '#aaa'
                  }}
                >
                  {asset.type.toUpperCase()}
                </span>
              </div>

              {/* Asset Name & Duration */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '11px',
                    color: '#e0e0e0',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                  title={asset.name}
                >
                  {asset.name}
                </div>
                <div style={{ fontSize: '9px', color: '#777', marginTop: '2px' }}>
                  {(asset.durationFrames / asset.fps).toFixed(1)}s • {asset.fps}fps
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

