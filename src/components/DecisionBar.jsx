import { LEVEL_ORDER, LEVELS } from '../data/mts.js';
import { levelVar } from '../lib/colour.js';

export default function DecisionBar({ engine, override, setOverride, onAssign, canAssign }) {
  const final = override || engine.level;

  return (
    <div className="card">
      <div className="decision">
        <div>
          <label className="lbl">Priority to record</label>
          <div className="override">
            {LEVEL_ORDER.map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={final === l}
                title={`${LEVELS[l].colour} — ${LEVELS[l].name}`}
                style={final === l ? { background: levelVar(l) } : undefined}
                onClick={() => setOverride(l === engine.level ? null : l)}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 140 }}>
          <label className="lbl">&nbsp;</label>
          <button className="btn primary" onClick={onAssign} disabled={!canAssign}>
            Assign {LEVELS[final].colour} · seen in{' '}
            {LEVELS[final].target === 0 ? '0' : LEVELS[final].target} min
          </button>
        </div>
      </div>

      {override && override !== engine.level && (
        <p className="hint" style={{ marginTop: 9 }}>
          Recording {LEVELS[override].colour.toLowerCase()} against a rules-engine
          result of {LEVELS[engine.level].colour.toLowerCase()}. The override and
          the discriminators that fired are both saved with the record.
        </p>
      )}

      <p className="disclaimer" style={{ marginTop: 11 }}>
        Decision support only. The registered nurse assigns the priority; nothing
        in this interface assigns it for them, and no output here is a diagnosis.
        Patient data stays on this machine and the ward's model host.
      </p>
    </div>
  );
}
