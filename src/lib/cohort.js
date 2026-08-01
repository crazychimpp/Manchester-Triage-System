import priors, { complaintIndex } from '../data/priors.js';
import { FLOWCHARTS } from '../data/mts.js';
import { toF } from './triage.js';

// Everything here is a lookup against observed frequencies in the source
// export. No model, no fitting — just "of the N patients who arrived like
// this, how many were admitted?" It is context for the nurse, not a
// prediction about this patient.

export const BASE_ADMIT = priors.base_admit;
export const N_VISITS = priors.n_visits;

export function complaintCohort(flowchartId) {
  const chart = FLOWCHARTS.find((f) => f.id === flowchartId);
  if (!chart) return null;
  let n = 0;
  let admitted = 0;
  const parts = [];
  for (const key of chart.cc) {
    const row = complaintIndex[key];
    if (!row) continue;
    n += row.n;
    admitted += row.n * row.admit;
    parts.push(row);
  }
  if (!n) return null;
  parts.sort((a, b) => b.n - a.n);
  return {
    label: chart.name,
    n,
    admit: admitted / n,
    top: parts.slice(0, 4),
  };
}

export function arrivalCohort(mode) {
  const row = priors.arrival[mode];
  return row ? { label: `Arrived by ${mode.toLowerCase()}`, ...row } : null;
}

export function ageCohort(age) {
  const a = parseFloat(age);
  if (!Number.isFinite(a)) return null;
  const key = Object.keys(priors.age_bands).find((k) => {
    const [lo, hi] = k.split('-').map(Number);
    return a >= lo && a < hi;
  });
  if (!key) return null;
  const row = priors.age_bands[key];
  // The export is adults only, so the paediatric band is empty. Say nothing
  // rather than show a rate computed from no visits.
  if (!row || !row.n || !Number.isFinite(row.admit)) return null;
  const [lo, hi] = key.split('-').map(Number);
  const label = hi > 150 ? `Age ${lo} and over` : `Age ${lo}–${hi - 1}`;
  return { label, ...row };
}

export function bandCohort(bandKey) {
  const row = priors.vital_bands[bandKey];
  return row && row.admit !== null ? row : null;
}

// Where does this reading sit among the 560,486 recorded triage observations?
const PCT_KEYS = [1, 5, 10, 25, 50, 75, 90, 95, 99];

export function percentileOf(vital, value) {
  const dist = priors.vital_percentiles[vital];
  if (!dist) return null;
  const v = vital === 'tempF' ? toF(value) : parseFloat(value);
  if (!Number.isFinite(v)) return null;

  const pts = PCT_KEYS.map((p) => [dist.p[String(p)], p]);
  if (v <= pts[0][0]) return { pct: 1, below: true, n: dist.n };
  if (v >= pts[pts.length - 1][0]) return { pct: 99, above: true, n: dist.n };
  for (let i = 0; i < pts.length - 1; i++) {
    const [v0, p0] = pts[i];
    const [v1, p1] = pts[i + 1];
    if (v >= v0 && v <= v1) {
      const t = v1 === v0 ? 0 : (v - v0) / (v1 - v0);
      return { pct: Math.round(p0 + t * (p1 - p0)), n: dist.n };
    }
  }
  return null;
}

export function priorityCohort(level) {
  const map = { 1: 'red', 2: 'orange', 3: 'yellow', 4: 'green', 5: 'blue' };
  return priors.by_priority[map[level]] || null;
}

export function pct(x) {
  return `${(x * 100).toFixed(1)}%`;
}
