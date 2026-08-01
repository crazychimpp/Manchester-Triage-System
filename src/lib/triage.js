import { LEVELS, OBSERVED, VITAL_RULES } from '../data/mts.js';

// The rules engine is the safety floor. It runs on every keystroke, it never
// calls the network, and its result stands whether or not Gemma answers.
// MTS is "first discriminator wins" — so the highest priority that fires is
// the priority, and we keep every hit for the audit trail.

export function runTriage(patient) {
  const fired = [];

  for (const rule of VITAL_RULES) {
    let hit = false;
    try {
      hit = rule.test(patient.vitals);
    } catch {
      hit = false;
    }
    if (hit) {
      fired.push({
        id: rule.id,
        label: rule.label,
        level: rule.level,
        source: 'measured',
        field: rule.field,
        cohort: rule.cohort || null,
      });
    }
  }

  for (const obs of OBSERVED) {
    if (patient.discriminators?.[obs.id]) {
      fired.push({
        id: obs.id,
        label: obs.label,
        level: obs.level,
        source: 'observed',
      });
    }
  }

  fired.sort((a, b) => a.level - b.level);

  const level = fired.length ? fired[0].level : 5;
  const leading = fired.filter((f) => f.level === level);

  return {
    level,
    ...LEVELS[level],
    fired,
    leading,
    complete: isAssessable(patient),
  };
}

export function isAssessable(patient) {
  const v = patient.vitals || {};
  const measured = ['hr', 'sbp', 'rr', 'spo2', 'temp'].filter(
    (k) => v[k] !== '' && v[k] !== undefined && v[k] !== null
  );
  return Boolean(patient.flowchart) && measured.length >= 3;
}

export function missingFields(patient) {
  const v = patient.vitals || {};
  const gaps = [];
  if (!patient.flowchart) gaps.push('presenting complaint');
  const names = { hr: 'pulse', sbp: 'blood pressure', rr: 'respiratory rate', spo2: 'SpO₂', temp: 'temperature' };
  for (const k of Object.keys(names)) {
    if (v[k] === '' || v[k] === undefined || v[k] === null) gaps.push(names[k]);
  }
  return gaps;
}

// Target time is measured from the moment the priority was assigned.
export function minutesRemaining(patient, now = Date.now()) {
  if (!patient.assignedAt) return null;
  const target = LEVELS[patient.level].target;
  const elapsed = (now - patient.assignedAt) / 60000;
  return Math.round((target - elapsed) * 10) / 10;
}

export function formatRemaining(mins) {
  if (mins === null) return '—';
  const late = mins < 0;
  const abs = Math.abs(mins);
  const h = Math.floor(abs / 60);
  const m = Math.floor(abs % 60);
  const txt = h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
  return late ? `+${txt} over` : txt;
}

// Fahrenheit is what the source dataset records; the ward may work in either.
export const toC = (f) => (parseFloat(f) - 32) * (5 / 9);
export const toF = (c) => parseFloat(c) * (9 / 5) + 32;
