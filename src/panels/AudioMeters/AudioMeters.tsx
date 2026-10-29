import React, { useState, useEffect } from 'react';
import { useEditorStore } from '../../state/useEditorStore';

export const AudioMeters: React.FC = () => {
  const { isPlaying } = useEditorStore();
  const [leftDb, setLeftDb] = useState<number>(-60);
  const [rightDb, setRightDb] = useState<number>(-60);
  const [leftPeak, setLeftPeak] = useState<number>(-60);
  const [rightPeak, setRightPeak] = useState<number>(-60);

  useEffect(() => {
    let animId: number;

    if (isPlaying) {
      const updateMeters = () => {
        // Simulated dynamic audio metering around -12dB nominal with peaks
        const noiseL = Math.sin(Date.now() / 80) * 8 + Math.random() * 6 - 16;
        const noiseR = Math.cos(Date.now() / 90) * 8 + Math.random() * 6 - 16;

        setLeftDb(noiseL);
        setRightDb(noiseR);

        setLeftPeak(prev => Math.max(prev * 0.98, noiseL));
        setRightPeak(prev => Math.max(prev * 0.98, noiseR));

        animId = requestAnimationFrame(updateMeters);
      };
      animId = requestAnimationFrame(updateMeters);
    } else {
      setLeftDb(-60);
      setRightDb(-60);
    }

    return () => cancelAnimationFrame(animId);
  }, [isPlaying]);

  // Convert dB (-60 to 0) to percentage (0% to 100%)
  const dbToPercent = (db: number) => {
    if (db <= -60) return 0;
    if (db >= 0) return 100;
    return ((db + 60) / 60) * 100;
  };

  return (
    <div
      style={{
        width: '54px',
        height: '100%',
        backgroundColor: '#121212',
        borderLeft: '1px solid #282828',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '6px 2px',
        userSelect: 'none'
      }}
    >
      <div style={{ fontSize: '8px', color: '#666', fontWeight: 'bold', marginBottom: '4px' }}>
        MASTER
      </div>

      {/* Meter Bars Container */}
      <div style={{ display: 'flex', gap: '3px', flex: 1, position: 'relative' }}>
        {/* dB Scale Labels */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            fontSize: '7px',
            color: '#555',
            paddingRight: '2px',
            height: '100%',
            textAlign: 'right'
          }}
        >
          <span>0</span>
          <span>-6</span>
          <span>-12</span>
          <span>-24</span>
          <span>-36</span>
          <span>-60</span>
        </div>

        {/* Left Channel */}
        <div
          style={{
            width: '10px',
            height: '100%',
            backgroundColor: '#1a1a1a',
            borderRadius: '1px',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column-reverse',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              width: '100%',
              height: `${dbToPercent(leftDb)}%`,
              background: 'linear-gradient(to top, #10b981 0%, #10b981 65%, #f59e0b 85%, #ef4444 100%)',
              transition: 'height 0.05s ease-out'
            }}
          />
          {/* Peak hold indicator */}
          <div
            style={{
              position: 'absolute',
              bottom: `${dbToPercent(leftPeak)}%`,
              left: 0,
              right: 0,
              height: '1px',
              backgroundColor: leftPeak >= -0.5 ? '#ef4444' : '#fff'
            }}
          />
        </div>

        {/* Right Channel */}
        <div
          style={{
            width: '10px',
            height: '100%',
            backgroundColor: '#1a1a1a',
            borderRadius: '1px',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column-reverse',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              width: '100%',
              height: `${dbToPercent(rightDb)}%`,
              background: 'linear-gradient(to top, #10b981 0%, #10b981 65%, #f59e0b 85%, #ef4444 100%)',
              transition: 'height 0.05s ease-out'
            }}
          />
          {/* Peak hold indicator */}
          <div
            style={{
              position: 'absolute',
              bottom: `${dbToPercent(rightPeak)}%`,
              left: 0,
              right: 0,
              height: '1px',
              backgroundColor: rightPeak >= -0.5 ? '#ef4444' : '#fff'
            }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '6px', fontSize: '8px', color: '#888', marginTop: '4px' }}>
        <span>L</span>
        <span>R</span>
      </div>
    </div>
  );
};
