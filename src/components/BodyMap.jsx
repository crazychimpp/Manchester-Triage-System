import { useState } from 'react';

const FRONT_REGIONS = [
  { id: 'Head', label: 'Head', path: 'M 80,10 C 92,10 98,18 98,30 C 98,42 90,48 80,48 C 70,48 62,42 62,30 C 62,18 68,10 80,10 Z' },
  { id: 'Neck', label: 'Neck', path: 'M 72,49 L 88,49 L 90,60 L 70,60 Z' },
  { id: 'Chest', label: 'Chest', path: 'M 54,62 L 106,62 L 100,110 L 60,110 Z' },
  { id: 'Abdomen', label: 'Abdomen', path: 'M 60,112 L 100,112 L 94,155 L 66,155 Z' },
  { id: 'Right Arm', label: 'Right Arm', path: 'M 52,63 L 36,70 L 22,120 L 32,124 L 44,82 L 52,76 Z' },
  { id: 'Left Arm', label: 'Left Arm', path: 'M 108,63 L 124,70 L 138,120 L 128,124 L 116,82 L 108,76 Z' },
  { id: 'Right Leg', label: 'Right Leg', path: 'M 64,157 L 78,157 L 76,230 L 60,230 Z' },
  { id: 'Left Leg', label: 'Left Leg', path: 'M 82,157 L 96,157 L 100,230 L 84,230 Z' },
];

const BACK_REGIONS = [
  { id: 'Head (Back)', label: 'Head (Back)', path: 'M 80,10 C 92,10 98,18 98,30 C 98,42 90,48 80,48 C 70,48 62,42 62,30 C 62,18 68,10 80,10 Z' },
  { id: 'Neck (Back)', label: 'Neck (Back)', path: 'M 72,49 L 88,49 L 90,60 L 70,60 Z' },
  { id: 'Upper Back', label: 'Upper Back', path: 'M 54,62 L 106,62 L 100,105 L 60,105 Z' },
  { id: 'Lower Back / Flank', label: 'Lower Back / Flank', path: 'M 60,107 L 100,107 L 94,155 L 66,155 Z' },
  { id: 'Right Arm (Back)', label: 'Right Arm (Back)', path: 'M 52,63 L 36,70 L 22,120 L 32,124 L 44,82 L 52,76 Z' },
  { id: 'Left Arm (Back)', label: 'Left Arm (Back)', path: 'M 108,63 L 124,70 L 138,120 L 128,124 L 116,82 L 108,76 Z' },
  { id: 'Right Leg (Back)', label: 'Right Leg (Back)', path: 'M 64,157 L 78,157 L 76,230 L 60,230 Z' },
  { id: 'Left Leg (Back)', label: 'Left Leg (Back)', path: 'M 82,157 L 96,157 L 100,230 L 84,230 Z' },
];

export default function BodyMap({ selected = [], onChange }) {
  const [view, setView] = useState('front');
  const regions = view === 'front' ? FRONT_REGIONS : BACK_REGIONS;

  function toggleRegion(id) {
    const next = selected.includes(id)
      ? selected.filter((r) => r !== id)
      : [...selected, id];
    onChange(next);
  }

  return (
    <div className="bodymap-container" style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span className="lbl" style={{ margin: 0 }}>Symptom localization (Body Map)</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            type="button"
            className={`btn tiny ${view === 'front' ? 'primary' : 'ghost'}`}
            onClick={() => setView('front')}
          >
            Front
          </button>
          <button
            type="button"
            className={`btn tiny ${view === 'back' ? 'primary' : 'ghost'}`}
            onClick={() => setView('back')}
          >
            Rear
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'center', background: 'var(--panel-2)', padding: 12, borderRadius: 'var(--radius)', border: '1px solid var(--rule)' }}>
        <svg width="160" height="240" viewBox="0 0 160 240" style={{ cursor: 'pointer', flexShrink: 0 }}>
          {regions.map((r) => {
            const isSelected = selected.includes(r.id);
            return (
              <path
                key={r.id}
                d={r.path}
                onClick={() => toggleRegion(r.id)}
                style={{
                  fill: isSelected ? 'rgba(76, 155, 232, 0.4)' : 'var(--raised)',
                  stroke: isSelected ? 'var(--p5)' : 'var(--mute)',
                  strokeWidth: isSelected ? 2 : 1,
                  transition: 'all 0.15s ease',
                }}
                className="bodymap-region"
              >
                <title>{r.label}</title>
              </path>
            );
          })}
        </svg>

        <div style={{ fontSize: 13, flex: 1 }}>
          <div style={{ color: 'var(--mute)', marginBottom: 6 }}>
            Click regions to select affected areas:
          </div>
          {selected.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {selected.map((s) => (
                <span
                  key={s}
                  onClick={() => toggleRegion(s)}
                  style={{
                    background: 'rgba(76, 155, 232, 0.2)',
                    color: 'var(--p5)',
                    border: '1px solid var(--p5)',
                    borderRadius: 4,
                    padding: '2px 8px',
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  {s} ×
                </span>
              ))}
            </div>
          ) : (
            <em style={{ color: 'var(--dim)' }}>No regions selected (optional)</em>
          )}
        </div>
      </div>
    </div>
  );
}
