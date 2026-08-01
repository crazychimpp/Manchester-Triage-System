import { AVPU } from '../data/mts.js';
import { percentileOf } from '../lib/cohort.js';

const FIELDS = [
  { key: 'hr', label: 'Pulse', unit: 'bpm', dist: 'hr' },
  { key: 'sbp', label: 'Systolic', unit: 'mmHg', dist: 'sbp' },
  { key: 'dbp', label: 'Diastolic', unit: 'mmHg', dist: 'dbp' },
  { key: 'rr', label: 'Resp rate', unit: '/min', dist: 'rr' },
  { key: 'spo2', label: 'SpO₂', unit: '%', dist: 'spo2' },
  { key: 'temp', label: 'Temp', unit: '°C', dist: 'tempF' },
];

function ordinal(p) {
  if (p >= 99) return 'top 1%';
  if (p <= 1) return 'bottom 1%';
  return `${p}th pct`;
}

export default function VitalsGrid({ vitals, set, engine }) {
  // Highest-severity discriminator per field, so the strip on the left of each
  // reading matches the priority that reading is driving.
  const flags = {};
  for (const f of engine.fired) {
    if (f.source === 'measured' && f.field) {
      if (!flags[f.field] || f.level < flags[f.field].level) flags[f.field] = f;
    }
  }

  return (
    <>
      <div className="vitals">
        {FIELDS.map((f) => {
          const flag = flags[f.key];
          const val = vitals[f.key];
          const p = val !== '' ? percentileOf(f.dist, val) : null;
          return (
            <div className="vital" key={f.key} data-flag={flag ? flag.level : undefined}>
              <div className="vital-label">
                <span>{f.label}</span>
                <span className="vital-unit">{f.unit}</span>
              </div>
              <input
                type="number"
                step={f.key === 'temp' ? '0.1' : '1'}
                value={val}
                aria-label={`${f.label} in ${f.unit}`}
                placeholder="—"
                onChange={(e) => set(f.key, e.target.value)}
              />
              <div className="vital-foot">
                {flag ? flag.label : p ? ordinal(p.pct) : ''}
              </div>
            </div>
          );
        })}
      </div>

      <div className="row two" style={{ marginTop: 10 }}>
        <div>
          <label className="lbl">Conscious level (AVPU)</label>
          <div className="seg">
            {AVPU.map((a) => (
              <button
                key={a.key}
                type="button"
                title={a.label}
                aria-pressed={vitals.avpu === a.key}
                onClick={() => set('avpu', vitals.avpu === a.key ? '' : a.key)}
              >
                {a.key}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="lbl" htmlFor="pain">Pain score (0–10)</label>
          <input
            id="pain"
            type="number"
            min="0"
            max="10"
            value={vitals.pain}
            onChange={(e) => set('pain', e.target.value)}
          />
        </div>
      </div>

      <div className="field" style={{ marginTop: 10 }}>
        <label className="lbl" htmlFor="o2">Oxygen delivery</label>
        <select id="o2" value={vitals.o2Device} onChange={(e) => set('o2Device', e.target.value)}>
          <option>Room air</option>
          <option>Nasal cannula</option>
          <option>Simple mask</option>
          <option>Non-rebreather</option>
          <option>NIV / ventilated</option>
        </select>
      </div>
    </>
  );
}
