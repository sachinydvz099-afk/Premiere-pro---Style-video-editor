import React from 'react';
import { useEditorStore } from '../../state/useEditorStore';

export const InspectorPanel: React.FC = () => {
  const {
    project,
    activeSequenceId,
    selectedClipIds,
    updateClipTransform,
    updateClipAudio,
    updateClipEffects,
    updateClipTitle
  } = useEditorStore();

  const sequence = project.sequences[activeSequenceId];
  const selectedClip = selectedClipIds.length > 0 && sequence ? sequence.clips[selectedClipIds[0]] : null;

  if (!selectedClip) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          backgroundColor: '#1c1c1c',
          borderLeft: '1px solid #282828',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          color: '#666',
          fontSize: '11px',
          textAlign: 'center',
          userSelect: 'none'
        }}
      >
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>🎛️</div>
        <div style={{ color: '#888', fontWeight: 600 }}>EFFECT CONTROLS / INSPECTOR</div>
        <div style={{ marginTop: '4px', fontSize: '10px' }}>
          Select a clip on the timeline to inspect and edit its properties, transforms, audio gain, and effects.
        </div>
      </div>
    );
  }

  const { transform, audio, effects, titleProperties } = selectedClip;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#1c1c1c',
        borderLeft: '1px solid #282828',
        userSelect: 'none',
        overflowY: 'auto'
      }}
    >
      {/* Panel Header */}
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
        <span style={{ color: '#0d99ff' }}>INSPECTOR:</span>
        <span style={{ marginLeft: '4px', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedClip.name}
        </span>
      </div>

      <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Clip Overview Info */}
        <div style={{ backgroundColor: '#161616', padding: '6px 8px', borderRadius: '3px', border: '1px solid #282828' }}>
          <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', marginBottom: '4px' }}>Clip Details</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '10px', color: '#ccc' }}>
            <div>Type: <span style={{ color: '#0d99ff' }}>{selectedClip.type.toUpperCase()}</span></div>
            <div>Track: <span style={{ color: '#0d99ff' }}>{selectedClip.trackId.toUpperCase()}</span></div>
            <div>Start: <span style={{ color: '#0d99ff' }}>{selectedClip.timelineStartFrame}f</span></div>
            <div>Duration: <span style={{ color: '#0d99ff' }}>{selectedClip.durationFrames}f</span></div>
          </div>
        </div>

        {/* Title Editor (If Title Clip) */}
        {selectedClip.type === 'title' && titleProperties && (
          <div style={{ backgroundColor: '#202020', padding: '8px', borderRadius: '3px', border: '1px solid #333' }}>
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#8b5cf6', marginBottom: '6px' }}>
              ✍️ Title Text & Typography
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div>
                <label style={{ fontSize: '10px', color: '#aaa', display: 'block', marginBottom: '2px' }}>Text Content</label>
                <textarea
                  value={titleProperties.text}
                  onChange={(e) => updateClipTitle(selectedClip.id, { text: e.target.value })}
                  rows={2}
                  style={{
                    width: '100%',
                    backgroundColor: '#121212',
                    border: '1px solid #3a3a3a',
                    color: '#fff',
                    borderRadius: '2px',
                    padding: '4px',
                    fontSize: '11px'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <div>
                  <label style={{ fontSize: '10px', color: '#aaa' }}>Font Size ({titleProperties.fontSize}px)</label>
                  <input
                    type="range"
                    min="16"
                    max="120"
                    value={titleProperties.fontSize}
                    onChange={(e) => updateClipTitle(selectedClip.id, { fontSize: parseInt(e.target.value, 10) })}
                    style={{ width: '100%', accentColor: '#8b5cf6' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '10px', color: '#aaa' }}>Text Color</label>
                  <input
                    type="color"
                    value={titleProperties.color}
                    onChange={(e) => updateClipTitle(selectedClip.id, { color: e.target.value })}
                    style={{ width: '100%', height: '22px', border: 'none', background: 'none', cursor: 'pointer' }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Video Transform Properties */}
        {selectedClip.type !== 'audio' && (
          <div style={{ backgroundColor: '#202020', padding: '8px', borderRadius: '3px', border: '1px solid #2e2e2e' }}>
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#0d99ff', marginBottom: '6px' }}>
              📐 Motion & Transform
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {/* Position X / Y */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <div>
                  <label style={{ fontSize: '10px', color: '#aaa' }}>Position X: {Math.round(transform.x)}px</label>
                  <input
                    type="range"
                    min="-500"
                    max="500"
                    value={transform.x}
                    onChange={(e) => updateClipTransform(selectedClip.id, { x: parseFloat(e.target.value) })}
                    style={{ width: '100%', accentColor: '#0d99ff' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '10px', color: '#aaa' }}>Position Y: {Math.round(transform.y)}px</label>
                  <input
                    type="range"
                    min="-500"
                    max="500"
                    value={transform.y}
                    onChange={(e) => updateClipTransform(selectedClip.id, { y: parseFloat(e.target.value) })}
                    style={{ width: '100%', accentColor: '#0d99ff' }}
                  />
                </div>
              </div>

              {/* Scale */}
              <div>
                <label style={{ fontSize: '10px', color: '#aaa' }}>Scale: {Math.round(transform.scaleX * 100)}%</label>
                <input
                  type="range"
                  min="0.1"
                  max="3.0"
                  step="0.05"
                  value={transform.scaleX}
                  onChange={(e) => {
                    const s = parseFloat(e.target.value);
                    updateClipTransform(selectedClip.id, { scaleX: s, scaleY: s });
                  }}
                  style={{ width: '100%', accentColor: '#0d99ff' }}
                />
              </div>

              {/* Rotation */}
              <div>
                <label style={{ fontSize: '10px', color: '#aaa' }}>Rotation: {Math.round(transform.rotation)}°</label>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  value={transform.rotation}
                  onChange={(e) => updateClipTransform(selectedClip.id, { rotation: parseFloat(e.target.value) })}
                  style={{ width: '100%', accentColor: '#0d99ff' }}
                />
              </div>

              {/* Opacity */}
              <div>
                <label style={{ fontSize: '10px', color: '#aaa' }}>Opacity: {Math.round(transform.opacity * 100)}%</label>
                <input
                  type="range"
                  min="0"
                  max="1.0"
                  step="0.02"
                  value={transform.opacity}
                  onChange={(e) => updateClipTransform(selectedClip.id, { opacity: parseFloat(e.target.value) })}
                  style={{ width: '100%', accentColor: '#0d99ff' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Audio Properties */}
        <div style={{ backgroundColor: '#202020', padding: '8px', borderRadius: '3px', border: '1px solid #2e2e2e' }}>
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#10b981', marginBottom: '6px' }}>
            🔊 Audio & Gain
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div>
              <label style={{ fontSize: '10px', color: '#aaa' }}>
                Gain: {audio.gain >= 0 ? `+${audio.gain.toFixed(1)}` : audio.gain.toFixed(1)} dB
              </label>
              <input
                type="range"
                min="-60"
                max="12"
                step="0.5"
                value={audio.gain}
                onChange={(e) => updateClipAudio(selectedClip.id, { gain: parseFloat(e.target.value) })}
                style={{ width: '100%', accentColor: '#10b981' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '10px', color: '#aaa' }}>
                Pan: {audio.pan === 0 ? 'Center' : audio.pan < 0 ? `L ${Math.abs(audio.pan * 100).toFixed(0)}%` : `R ${(audio.pan * 100).toFixed(0)}%`}
              </label>
              <input
                type="range"
                min="-1.0"
                max="1.0"
                step="0.05"
                value={audio.pan}
                onChange={(e) => updateClipAudio(selectedClip.id, { pan: parseFloat(e.target.value) })}
                style={{ width: '100%', accentColor: '#10b981' }}
              />
            </div>
          </div>
        </div>

        {/* Applied Visual Effects Stack */}
        <div style={{ backgroundColor: '#202020', padding: '8px', borderRadius: '3px', border: '1px solid #2e2e2e' }}>
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '6px' }}>
            ✨ Applied Effects ({effects.length})
          </div>

          {effects.length === 0 ? (
            <div style={{ fontSize: '10px', color: '#666', fontStyle: 'italic' }}>
              No visual effects applied. Add effects from the Effects tab.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {effects.map((fx, idx) => (
                <div key={fx.id} style={{ backgroundColor: '#161616', padding: '6px', borderRadius: '2px', border: '1px solid #333' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input
                        type="checkbox"
                        checked={fx.enabled}
                        onChange={(e) => {
                          const updated = [...effects];
                          updated[idx] = { ...fx, enabled: e.target.checked };
                          updateClipEffects(selectedClip.id, updated);
                        }}
                      />
                      <span style={{ fontSize: '10px', fontWeight: 600, color: fx.enabled ? '#eee' : '#666' }}>{fx.name}</span>
                    </div>
                    <button
                      onClick={() => {
                        updateClipEffects(selectedClip.id, effects.filter(e => e.id !== fx.id));
                      }}
                      title="Remove Effect"
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '10px' }}
                    >
                      ✕
                    </button>
                  </div>

                  {/* Effect Parameter Slider */}
                  {Object.entries(fx.parameters).map(([paramKey, paramVal]) => (
                    <div key={paramKey} style={{ marginTop: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#888' }}>
                        <span>{paramKey}</span>
                        <span>{paramVal.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min={paramKey === 'value' && fx.type === 'brightness' ? -1 : 0}
                        max={paramKey === 'value' && fx.type === 'blur' ? 20 : 3}
                        step="0.05"
                        value={paramVal}
                        disabled={!fx.enabled}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          const updated = [...effects];
                          updated[idx] = {
                            ...fx,
                            parameters: { ...fx.parameters, [paramKey]: val }
                          };
                          updateClipEffects(selectedClip.id, updated);
                        }}
                        style={{ width: '100%', accentColor: '#f59e0b' }}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
