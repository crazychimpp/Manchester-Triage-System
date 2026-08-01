import {
  complaintCohort,
  arrivalCohort,
  ageCohort,
  bandCohort,
  priorityCohort,
  BASE_ADMIT,
  N_VISITS,
  pct,
} from '../lib/cohort.js';
import { levelVar } from '../lib/colour.js';

// The widest bar in this panel is 80% admitted; scaling to that rather than
// 100% keeps the difference between 24% and 75% legible at this width.
const SCALE = 0.8;

function Row({ label, n, admit, tone }) {
  if (!n) return null;
  const w = Math.min(100, (admit / SCALE) * 100);
  return (
    <div className="ev-row">
      <div className="ev-top">
        <span>{label}</span>
        <b style={{ color: admit > BASE_ADMIT * 1.4 ? 'var(--p2)' : 'var(--chalk)' }}>
          {pct(admit)}
        </b>
      </div>
      <div className="ev-bar">
        <div className="ev-fill" style={{ width: `${w}%`, background: tone || 'var(--p5)' }} />
        <div className="ev-base" style={{ left: `${(BASE_ADMIT / SCALE) * 100}%` }} />
      </div>
      <div className="ev-note">{n.toLocaleString()} visits</div>
    </div>
  );
}

export default function EvidencePanel({ patient, engine }) {
  const cc = complaintCohort(patient.flowchart);
  const am = arrivalCohort(patient.arrivalMode);
  const ag = ageCohort(patient.age);
  const pr = priorityCohort(engine.level);

  const bands = engine.fired
    .filter((f) => f.cohort)
    .map((f) => ({ f, row: bandCohort(f.cohort) }))
    .filter((x) => x.row)
    .slice(0, 3);

  const anything = cc || am || ag || bands.length;

  return (
    <div className="card">
      <div className="ev">
        {!anything && (
          <p className="ev-note">
            Choose a flowchart and record observations to pool comparable visits.
          </p>
        )}

        {cc && <Row label={cc.label} n={cc.n} admit={cc.admit} />}
        {am && <Row label={am.label} n={am.n} admit={am.admit} />}
        {ag && <Row label={ag.label} n={ag.n} admit={ag.admit} />}

        {bands.map(({ f, row }) => (
          <Row key={f.id} label={f.label} n={row.n} admit={row.admit} tone={levelVar(f.level)} />
        ))}

        {pr && (
          <Row
            label={`Triaged ${engine.colour.toLowerCase()} here before`}
            n={pr.n}
            admit={pr.admit}
            tone={levelVar(engine.level)}
          />
        )}

        <p className="ev-foot">
          Each bar is the share of comparable previous visits that ended in admission.
          The white mark is the department-wide rate, {pct(BASE_ADMIT)} across{' '}
          {N_VISITS.toLocaleString()} visits. These are group frequencies, not a
          probability for this patient, and they are not a triage priority.
        </p>
      </div>
    </div>
  );
}
