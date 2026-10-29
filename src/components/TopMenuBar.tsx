import React, { useState, useRef, useEffect } from 'react';
import { useEditorStore } from '../state/useEditorStore';
import { ProjectManager } from '../project/ProjectManager';
import { ProjectSchema } from '../project/ProjectSchema';

export const TopMenuBar: React.FC = () => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);

  const {
    project,
    setProject,
    canUndo,
    canRedo,
    undo,
    redo,
    deleteSelectedClips,
    rippleDeleteSelectedClips,
    splitClipAtPlayhead,
    togglePlay,
    isPlaying,
    stepFrame,
    setExportModalOpen,
    setTimelineZoom,
    timelineZoom,
    showSafeMargins,
    toggleSafeMargins,
    addAsset
  } = useEditorStore();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNewProject = () => {
    if (confirm('Create a new project? Any unsaved changes will be lost.')) {
      setProject(ProjectManager.createNewProject('Untitled Project'));
    }
    setOpenMenu(null);
  };

  const handleSaveProject = () => {
    const json = ProjectSchema.serialize(project);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.settings.name.replace(/\s+/g, '_')}.rcproj`;
    a.click();
    URL.revokeObjectURL(url);
    setOpenMenu(null);
  };

  const handleOpenProjectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const { project: loadedProject, validation } = ProjectSchema.deserialize(content);
      if (loadedProject && validation.valid) {
        setProject(loadedProject);
      } else {
        alert('Invalid ReaCut project file:\n' + validation.errors.join('\n'));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
    setOpenMenu(null);
  };

  const handleImportMediaFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const url = URL.createObjectURL(file);
      const isVideo = file.type.startsWith('video');
      const isAudio = file.type.startsWith('audio');
      const isImage = file.type.startsWith('image');

      const assetType = isVideo ? 'video' : isAudio ? 'audio' : isImage ? 'image' : 'video';

      addAsset({
        id: 'asset_' + Math.random().toString(36).substring(2, 9),
        name: file.name,
        filePath: file.name,
        type: assetType,
        durationFrames: 180, // Default 6s until probed
        fps: 30,
        width: 1920,
        height: 1080,
        thumbnailUrl: isImage || isVideo ? url : undefined,
        createdAt: Date.now(),
        sizeBytes: file.size
      });
    }
    e.target.value = '';
    setOpenMenu(null);
  };

  return (
    <div
      ref={menuRef}
      style={{
        height: '28px',
        backgroundColor: '#1b1b1b',
        borderBottom: '1px solid #282828',
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px',
        fontSize: '11px',
        color: '#b0b0b0',
        zIndex: 1000,
        position: 'relative'
      }}
    >
      <input
        type="file"
        ref={projectInputRef}
        accept=".rcproj,.json"
        style={{ display: 'none' }}
        onChange={handleOpenProjectFile}
      />
      <input
        type="file"
        ref={fileInputRef}
        multiple
        accept="video/*,audio/*,image/*"
        style={{ display: 'none' }}
        onChange={handleImportMediaFiles}
      />

      {/* Brand logo & title */}
      <div style={{ display: 'flex', alignItems: 'center', marginRight: '16px', fontWeight: 'bold', color: '#0d99ff' }}>
        <span style={{ fontSize: '13px', marginRight: '6px' }}>✂️</span>
        <span style={{ letterSpacing: '0.5px' }}>ReaCut Studio</span>
      </div>

      {/* Menus */}
      {[
        {
          name: 'File',
          items: [
            { label: 'New Project', shortcut: 'Ctrl+N', action: handleNewProject },
            { label: 'Open Project...', shortcut: 'Ctrl+O', action: () => projectInputRef.current?.click() },
            { separator: true },
            { label: 'Save Project', shortcut: 'Ctrl+S', action: handleSaveProject },
            { label: 'Save As...', shortcut: 'Ctrl+Shift+S', action: handleSaveProject },
            { separator: true },
            { label: 'Import Media...', shortcut: 'Ctrl+I', action: () => fileInputRef.current?.click() },
            { label: 'Export Sequence...', shortcut: 'Ctrl+M', action: () => setExportModalOpen(true) },
          ]
        },
        {
          name: 'Edit',
          items: [
            { label: 'Undo', shortcut: 'Ctrl+Z', action: undo, disabled: !canUndo },
            { label: 'Redo', shortcut: 'Ctrl+Y', action: redo, disabled: !canRedo },
            { separator: true },
            { label: 'Delete', shortcut: 'Del', action: deleteSelectedClips },
            { label: 'Ripple Delete', shortcut: 'Shift+Del', action: rippleDeleteSelectedClips },
          ]
        },
        {
          name: 'Clip',
          items: [
            { label: 'Split at Playhead', shortcut: 'Ctrl+K', action: splitClipAtPlayhead },
          ]
        },
        {
          name: 'Playback',
          items: [
            { label: isPlaying ? 'Pause' : 'Play', shortcut: 'Space', action: togglePlay },
            { label: 'Step 1 Frame Back', shortcut: 'Left', action: () => stepFrame(-1) },
            { label: 'Step 1 Frame Forward', shortcut: 'Right', action: () => stepFrame(1) },
          ]
        },
        {
          name: 'View',
          items: [
            { label: 'Zoom In Timeline', shortcut: 'Ctrl+=', action: () => setTimelineZoom(timelineZoom * 1.3) },
            { label: 'Zoom Out Timeline', shortcut: 'Ctrl+-', action: () => setTimelineZoom(timelineZoom * 0.7) },
            { separator: true },
            { label: showSafeMargins ? 'Hide Safe Margins' : 'Show Safe Margins', action: toggleSafeMargins },
          ]
        },
        {
          name: 'Help',
          items: [
            { label: 'About ReaCut Studio', action: () => alert('ReaCut Studio v1.0.0\nProfessional NLE Desktop Video Editor powered by REA.') },
            { label: 'Keyboard Shortcuts', action: () => alert('Play/Pause: Space\nCut Tool: C\nSelect Tool: V\nSplit: Ctrl+K\nRipple Del: Shift+Del\nIn/Out: I / O\nZoom: Ctrl+ / Ctrl-') }
          ]
        }
      ].map((menu) => (
        <div key={menu.name} style={{ position: 'relative' }}>
          <div
            onClick={() => setOpenMenu(openMenu === menu.name ? null : menu.name)}
            style={{
              padding: '4px 8px',
              cursor: 'pointer',
              color: openMenu === menu.name ? '#ffffff' : '#b0b0b0',
              backgroundColor: openMenu === menu.name ? '#2d2d2d' : 'transparent',
              borderRadius: '2px'
            }}
          >
            {menu.name}
          </div>

          {openMenu === menu.name && (
            <div
              style={{
                position: 'absolute',
                top: '26px',
                left: 0,
                backgroundColor: '#202020',
                border: '1px solid #333',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                minWidth: '180px',
                zIndex: 2000,
                borderRadius: '3px',
                padding: '4px 0'
              }}
            >
              {menu.items.map((item, idx) =>
                'separator' in item ? (
                  <div key={idx} style={{ height: '1px', backgroundColor: '#303030', margin: '4px 0' }} />
                ) : (
                  <div
                    key={idx}
                    onClick={() => {
                      if (!item.disabled && item.action) {
                        item.action();
                        setOpenMenu(null);
                      }
                    }}
                    style={{
                      padding: '5px 12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: item.disabled ? 'not-allowed' : 'pointer',
                      color: item.disabled ? '#555' : '#e0e0e0',
                      backgroundColor: 'transparent'
                    }}
                    onMouseEnter={(e) => {
                      if (!item.disabled) e.currentTarget.style.backgroundColor = '#0d99ff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <span>{item.label}</span>
                    {item.shortcut && <span style={{ color: '#888', marginLeft: '16px' }}>{item.shortcut}</span>}
                  </div>
                )
              )}
            </div>
          )}
        </div>
      ))}

      {/* Project name display */}
      <div style={{ marginLeft: 'auto', color: '#666', fontSize: '10px' }}>
        Project: <span style={{ color: '#aaa' }}>{project.settings.name}</span>
      </div>
    </div>
  );
};
