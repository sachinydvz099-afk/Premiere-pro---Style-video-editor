import React, { useEffect, useState } from 'react';
import { TopMenuBar } from '../components/TopMenuBar';
import { WorkspaceSelector } from '../components/WorkspaceSelector';
import { ProjectPanel } from '../panels/ProjectPanel/ProjectPanel';
import { SourceMonitor } from '../panels/SourceMonitor/SourceMonitor';
import { ProgramMonitor } from '../panels/ProgramMonitor/ProgramMonitor';
import { TimelinePanel } from '../panels/Timeline/TimelinePanel';
import { EffectsPanel } from '../panels/EffectsPanel/EffectsPanel';
import { InspectorPanel } from '../panels/InspectorPanel/InspectorPanel';
import { AudioMeters } from '../panels/AudioMeters/AudioMeters';
import { ExportModal } from '../panels/ExportModal/ExportModal';
import { useEditorStore } from '../state/useEditorStore';
import { ProjectManager } from '../project/ProjectManager';

export const App: React.FC = () => {
  const {
    project,
    activeWorkspace,
    togglePlay,
    stepFrame,
    setActiveTool,
    splitClipAtPlayhead,
    deleteSelectedClips,
    rippleDeleteSelectedClips,
    undo,
    redo,
    toggleSnapping,
    setExportModalOpen,
    setSourceInPoint,
    setSourceOutPoint,
    insertSourceClipToTimeline
  } = useEditorStore();

  // Splitter state
  const [verticalSplit, setVerticalSplit] = useState(52); // percentage for top quadrant
  const [leftSplit, setLeftSplit] = useState(30); // percentage for left quadrant
  const [rightInspectorSplit, setRightInspectorSplit] = useState(280); // px width for right inspector

  // Autosave timer (every 3 minutes)
  useEffect(() => {
    const timer = setInterval(() => {
      ProjectManager.saveAutosave(project);
    }, 180000);
    return () => clearInterval(timer);
  }, [project]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing inside an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'KeyV') {
        setActiveTool('select');
      } else if (e.code === 'KeyC') {
        setActiveTool('cut');
      } else if (e.code === 'KeyS' && !e.ctrlKey) {
        toggleSnapping();
      } else if (e.code === 'KeyK' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        splitClipAtPlayhead();
      } else if (e.code === 'Delete') {
        if (e.shiftKey) {
          rippleDeleteSelectedClips();
        } else {
          deleteSelectedClips();
        }
      } else if (e.code === 'KeyZ' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if (e.code === 'KeyY' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        redo();
      } else if (e.code === 'KeyM' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setExportModalOpen(true);
      } else if (e.code === 'ArrowLeft') {
        stepFrame(-1);
      } else if (e.code === 'ArrowRight') {
        stepFrame(1);
      } else if (e.code === 'KeyI') {
        setSourceInPoint();
      } else if (e.code === 'KeyO') {
        setSourceOutPoint();
      } else if (e.code === 'Comma') {
        insertSourceClipToTimeline();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    togglePlay,
    setActiveTool,
    toggleSnapping,
    splitClipAtPlayhead,
    deleteSelectedClips,
    rippleDeleteSelectedClips,
    undo,
    redo,
    setExportModalOpen,
    stepFrame,
    setSourceInPoint,
    setSourceOutPoint,
    insertSourceClipToTimeline
  ]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100vw',
        height: '100vh',
        backgroundColor: '#121212',
        overflow: 'hidden'
      }}
    >
      {/* Top Application Menu Bar */}
      <TopMenuBar />

      {/* Workspace Preset Switcher */}
      <WorkspaceSelector />

      {/* Main Workspace Layout Canvas */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top Half: Monitors & Inspector */}
        <div style={{ height: `${verticalSplit}%`, display: 'flex', overflow: 'hidden' }}>
          {/* Source Monitor (or Project Bin depending on layout) */}
          <div style={{ width: `${leftSplit}%`, height: '100%' }}>
            <SourceMonitor />
          </div>

          {/* Program Monitor */}
          <div style={{ flex: 1, height: '100%' }}>
            <ProgramMonitor />
          </div>

          {/* Effects or Inspector Tab */}
          <div style={{ width: `${rightInspectorSplit}px`, height: '100%', display: 'flex' }}>
            {activeWorkspace === 'effects' ? <EffectsPanel /> : <InspectorPanel />}
          </div>

          {/* Master Audio VU Peak Meters */}
          <AudioMeters />
        </div>

        {/* Horizontal Splitter Bar */}
        <div
          style={{
            height: '4px',
            backgroundColor: '#1c1c1c',
            borderTop: '1px solid #282828',
            borderBottom: '1px solid #282828',
            cursor: 'ns-resize'
          }}
          onMouseDown={(e) => {
            const startY = e.clientY;
            const startSplit = verticalSplit;
            const handleMouseMove = (moveEvt: MouseEvent) => {
              const delta = moveEvt.clientY - startY;
              const newSplit = Math.max(25, Math.min(75, startSplit + (delta / window.innerHeight) * 100));
              setVerticalSplit(newSplit);
            };
            const handleMouseUp = () => {
              window.removeEventListener('mousemove', handleMouseMove);
              window.removeEventListener('mouseup', handleMouseUp);
            };
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
          }}
        />

        {/* Bottom Half: Project Panel & Timeline */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Bottom Left: Project Bin / Assets */}
          <div style={{ width: `${leftSplit}%`, height: '100%' }}>
            <ProjectPanel />
          </div>

          {/* Center / Right: Multitrack Timeline */}
          <div style={{ flex: 1, height: '100%' }}>
            <TimelinePanel />
          </div>
        </div>
      </div>

      {/* Export Sequence Modal Dialog */}
      <ExportModal />
    </div>
  );
};
