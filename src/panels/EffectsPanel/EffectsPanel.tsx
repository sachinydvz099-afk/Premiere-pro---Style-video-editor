import React, { useState } from 'react';
import { useEditorStore } from '../../state/useEditorStore';
import { VisualEffect } from '../../timeline/TimelineModel';

interface EffectTemplate {
  id: string;
  name: string;
  type: VisualEffect['type'];
  category: 'video' | 'audio' | 'transition';
  defaultParams: Record<string, number>;
}

const EFFECT_LIBRARY: EffectTemplate[] = [
  {
    id: 'fx_brightness',
    name: 'Brightness & Contrast',
    type: 'brightness',
    category: 'video',
    defaultParams: { value: 0.1 }
  },
  {
    id: 'fx_saturation',
    name: 'Saturation Boost',
    type: 'saturation',
    category: 'video',
    defaultParams: { value: 1.3 }
  },
  {
    id: 'fx_blur',
    name: 'Gaussian Blur',
    type: 'blur',
    category: 'video',
    defaultParams: { value: 5 }
  },
  {
    id: 'fx_temp',
    name: 'Color Temperature (Warm)',
    type: 'color_temperature',
    category: 'video',
    defaultParams: { value: 6500 }
  }
];

export const EffectsPanel: React.FC = () => {
  const { project, activeSequenceId, selectedClipIds, updateClipEffects } = useEditorStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'video' | 'audio' | 'transition'>('all');

  const sequence = project.sequences[activeSequenceId];
  const selectedClip = selectedClipIds.length > 0 && sequence ? sequence.clips[selectedClipIds[0]] : null;

  const filteredEffects = EFFECT_LIBRARY.filter(fx => {
    const matchesSearch = fx.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || fx.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleApplyEffect = (template: EffectTemplate) => {
    if (!selectedClip) {
      alert('Select a clip on the timeline first to apply this effect.');
      return;
    }

    // Check if already present
    if (selectedClip.effects.some(e => e.type === template.type)) {
      alert(`Effect '${template.name}' is already applied to this clip.`);
      return;
    }

    const newEffect: VisualEffect = {
      id: 'eff_' + Math.random().toString(36).substring(2, 9),
      type: template.type,
      name: template.name,
      enabled: true,
      parameters: { ...template.defaultParams }
    };

    updateClipEffects(selectedClip.id, [...selectedClip.effects, newEffect]);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#1b1b1b',
        borderLeft: '1px solid #282828',
        userSelect: 'none'
      }}
    >
      {/* Tab Header */}
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
        <span style={{ color: '#0d99ff' }}>EFFECTS & PRESETS</span>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ padding: '6px 8px', backgroundColor: '#181818', borderBottom: '1px solid #242424' }}>
        <input
          type="text"
          placeholder="Search effects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            backgroundColor: '#111',
            border: '1px solid #333',
            color: '#eee',
            padding: '2px 6px',
            fontSize: '11px',
            borderRadius: '2px'
          }}
        />

        {/* Category Pills */}
        <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
          {(['all', 'video', 'audio', 'transition'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                background: selectedCategory === cat ? '#0d99ff' : '#222',
                color: selectedCategory === cat ? '#fff' : '#888',
                border: 'none',
                borderRadius: '2px',
                padding: '2px 6px',
                fontSize: '9px',
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Effects List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px' }}>
        {filteredEffects.map((fx) => (
          <div
            key={fx.id}
            onClick={() => handleApplyEffect(fx)}
            style={{
              padding: '6px 8px',
              backgroundColor: '#202020',
              border: '1px solid #2c2c2c',
              borderRadius: '2px',
              marginBottom: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '11px',
              color: '#ddd'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#0d99ff';
              e.currentTarget.style.backgroundColor = '#252525';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#2c2c2c';
              e.currentTarget.style.backgroundColor = '#202020';
            }}
          >
            <div>
              <span style={{ marginRight: '6px' }}>
                {fx.category === 'video' ? '✨' : fx.category === 'audio' ? '🔊' : '🔄'}
              </span>
              <span>{fx.name}</span>
            </div>
            <span style={{ fontSize: '9px', color: '#666', textTransform: 'uppercase' }}>
              + Add
            </span>
          </div>
        ))}

        {selectedClip ? (
          <div style={{ marginTop: '12px', padding: '6px', backgroundColor: '#141414', borderRadius: '3px' }}>
            <div style={{ fontSize: '10px', color: '#0d99ff', fontWeight: 'bold', marginBottom: '4px' }}>
              TARGET CLIP: {selectedClip.name}
            </div>
            <div style={{ fontSize: '9px', color: '#888' }}>
              Click any effect above to apply it directly to this clip.
            </div>
          </div>
        ) : (
          <div style={{ marginTop: '12px', padding: '8px', textAlign: 'center', color: '#555', fontSize: '10px' }}>
            Select a clip on the timeline to preview and apply effects
          </div>
        )}
      </div>
    </div>
  );
};
