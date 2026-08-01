import { useState } from 'react';
import { OBSERVED_BY_LEVEL, LEVELS } from '../data/mts.js';
import { levelVar } from '../lib/colour.js';

export default function DiscriminatorList({ selected, toggle }) {
  const [showAll, setShowAll] = useState(false);
  const groups = showAll ? OBSERVED_BY_LEVEL : OBSERVED_BY_LEVEL.slice(0, 3);
  const count = Object.values(selected).filter(Boolean).length;

  return (
    <div className="card">
      {groups.map((g) => (
        <div className="disc-group" key={g.level}>
          <div className="disc-head">
            <i style={{ background: levelVar(g.level) }} />
            {LEVELS[g.level].colour} — {LEVELS[g.level].name}
          </div>
          {g.items.map((o) => (
            <label className="disc" key={o.id} data-on={!!selected[o.id]}>
              <input
                type="checkbox"
                checked={!!selected[o.id]}
                onChange={() => toggle(o.id)}
              />
              <span className="disc-text">
                <b>{o.label}</b>
                <small>{o.hint}</small>
              </span>
            </label>
          ))}
        </div>
      ))}

      <button className="btn ghost" type="button" onClick={() => setShowAll(!showAll)}>
        {showAll ? 'Show urgent and above' : 'Show standard and non-urgent'}
      </button>
      {count > 0 && <span className="count" style={{ marginLeft: 10 }}>{count} selected</span>}
    </div>
  );
}
