import { useEffect, useState } from 'react';
import { LEVELS } from '../data/mts.js';
import { minutesRemaining, formatRemaining } from '../lib/triage.js';
import { levelVar } from '../lib/colour.js';

export default function PatientBoard({ patients, onRecall }) {
  const [, tick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 10000);
    return () => clearInterval(t);
  }, []);

  const now = Date.now();
  const sorted = [...patients].sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level;
    return minutesRemaining(a, now) - minutesRemaining(b, now);
  });

  const breached = sorted.filter((p) => minutesRemaining(p, now) < 0).length;

  return (
    <>
      <h2 className="eyebrow">Waiting</h2>

      {breached > 0 && (
        <div className="alert" style={{ marginBottom: 4 }}>
          <b>{breached} past target</b>
          Reassess before the wait extends further.
        </div>
      )}

      <div className="board">
        {sorted.length === 0 && (
          <div className="empty">
            Nobody on the board yet.<br />
            Triage a patient and they appear here, sorted by priority.
          </div>
        )}

        {sorted.map((p) => {
          const left = minutesRemaining(p, now);
          return (
            <button
              className={`pt ${left < 0 ? 'breach' : ''}`}
              key={p.id}
              style={{ borderLeftColor: levelVar(p.level), textAlign: 'left' }}
              onClick={() => onRecall(p)}
            >
              <div className="pt-top">
                <span className="pt-name">{p.name || 'Unnamed'}</span>
                <span className="pt-clock">{formatRemaining(left)}</span>
              </div>
              <div className="pt-meta">
                {LEVELS[p.level].colour} · {p.chartName}
                {p.overridden && ' · overridden'}
              </div>
              <div className="pt-vitals">
                {[p.age && `${p.age}y`, p.sex, p.vitals.hr && `HR ${p.vitals.hr}`,
                  p.vitals.sbp && `BP ${p.vitals.sbp}/${p.vitals.dbp || '—'}`,
                  p.vitals.spo2 && `SpO₂ ${p.vitals.spo2}%`]
                  .filter(Boolean)
                  .join('  ')}
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}
