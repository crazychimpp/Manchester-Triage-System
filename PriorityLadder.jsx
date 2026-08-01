import { LEVEL_ORDER, LEVELS } from '../data/mts.js';
import { levelVar } from '../lib/colour.js';
import { missingFields } from '../lib/triage.js';

export default function PriorityLadder({ engine, patient }) {
  const gaps = missingFields(patient);
  const colour = levelVar(engine.level);

  return (
    <div className="card ladder">
      <div className="ladder-head">
        <div className="ladder-level" style={{ color: colour }}>
          <span className="num" style={{ background: colour }}>{engine.level}</span>
          {engine.colour}
        </div>
        <div className="ladder-target">
          <b>{engine.target === 0 ? 'Now' : `${engine.target} min`}</b>
          {engine.name}
        </div>
      </div>

      <div className="ladder-track">
        {LEVEL_ORDER.map((l) => (
          <div
            key={l}
            className="rung"
            data-on={l === engine.level}
            style={{
              background: l === engine.level ? levelVar(l) : undefined,
              opacity: l === engine.level ? 1 : 0.35,
            }}
          />
        ))}
      </div>

      <div className="ladder-scale">
        {LEVEL_ORDER.map((l) => (
          <span key={l} data-on={l === engine.level}>{LEVELS[l].colour}</span>
        ))}
      </div>

      <div className="ladder-why">
        {engine.fired.length === 0 && (
          <p className="why-empty">
            {gaps.length
              ? `No discriminator has fired. Still to record: ${gaps.join(', ')}.`
              : 'No discriminator fired on the recorded assessment. Blue stands until something changes.'}
          </p>
        )}

        {engine.fired.slice(0, 6).map((f) => (
          <div className="why-line" key={f.id}>
            <i className="tick" style={{ background: levelVar(f.level) }} />
            <span style={{ color: f.level === engine.level ? 'var(--chalk)' : 'var(--mute)' }}>
              {f.label}
            </span>
            <span className="src">{f.source}</span>
          </div>
        ))}

        {engine.fired.length > 6 && (
          <p className="ev-note" style={{ marginTop: 6 }}>
            and {engine.fired.length - 6} more at lower priority
          </p>
        )}
      </div>
    </div>
  );
}
