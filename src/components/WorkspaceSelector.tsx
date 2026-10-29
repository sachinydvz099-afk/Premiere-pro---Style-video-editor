import React from 'react';
import { useEditorStore, WorkspacePreset } from '../state/useEditorStore';

const WORKSPACES: { id: WorkspacePreset; label: string }[] = [
  { id: 'editing', label: 'Editing' },
  { id: 'color', label: 'Color' },
  { id: 'audio', label: 'Audio' },
  { id: 'effects', label: 'Effects' },
  { id: 'export', label: 'Export' }
];

export const WorkspaceSelector: React.FC = () => {
  const { activeWorkspace, setWorkspace, setExportModalOpen } = useEditorStore();

  const handleSelect = (id: WorkspacePreset) => {
    setWorkspace(id);
    if (id === 'export') {
      setExportModalOpen(true);
    }
  };

  return (
    <div
      style={{
        height: '26px',
        backgroundColor: '#181818',
        borderBottom: '1px solid #242424',
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px',
        fontSize: '11px',
        gap: '2px'
      }}
    >
      <span style={{ color: '#555', marginRight: '6px', fontSize: '10px', textTransform: 'uppercase' }}>
        Workspaces:
      </span>
      {WORKSPACES.map((ws) => {
        const isActive = activeWorkspace === ws.id;
        return (
          <button
            key={ws.id}
            onClick={() => handleSelect(ws.id)}
            style={{
              padding: '3px 10px',
              backgroundColor: isActive ? '#282828' : 'transparent',
              color: isActive ? '#0d99ff' : '#888888',
              border: 'none',
              borderBottom: isActive ? '2px solid #0d99ff' : '2px solid transparent',
              cursor: 'pointer',
              fontWeight: isActive ? '600' : '400',
              fontSize: '11px',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.color = '#ccc';
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.color = '#888888';
            }}
          >
            {ws.label}
          </button>
        );
      })}
    </div>
  );
};
