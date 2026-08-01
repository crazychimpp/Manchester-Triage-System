import { useEffect, useRef, useState } from 'react';
import { apiEnabled, suggestPatients, prefillPatient } from '../lib/api.js';

// Type a name, get back anyone triaged in the last hour first, then everyone
// on record. Choosing a match fills in identity and context.
//
// It does NOT fill in observations. The server returns the previous set and
// this component shows them as a reference line under the field, greyed, with
// their age in minutes — but the vitals boxes stay empty and the nurse
// measures again. A patient who was well an hour ago and is not well now is
// precisely the case this whole system exists to catch, and pre-filling their
// old numbers would hide it.

const DEBOUNCE_MS = 180;
const MIN_CHARS = 2;

export default function PatientLookup({ value, onChange, onPrefill }) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [note, setNote] = useState(null);
  const [busy, setBusy] = useState(false);
  const abort = useRef(null);
  const timer = useRef(null);
  const box = useRef(null);

  useEffect(() => {
    if (!apiEnabled) return;
    clearTimeout(timer.current);
    abort.current?.abort();

    const q = value.trim();
    if (q.length < MIN_CHARS) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    timer.current = setTimeout(async () => {
      abort.current = new AbortController();
      setBusy(true);
      try {
        const res = await suggestPatients(q, abort.current.signal);
        setSuggestions(res.results || []);
        setOpen((res.results || []).length > 0);
        setActive(-1);
      } catch (e) {
        // A lookup failure must not block typing a name. Fall silent and let
        // the nurse carry on entering a new patient.
        if (e.name !== 'AbortError') setSuggestions([]);
      } finally {
        setBusy(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer.current);
  }, [value]);

  useEffect(() => {
    const close = (e) => {
      if (box.current && !box.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  async function choose(s) {
    setOpen(false);
    onChange(s.displayName);
    try {
      const pre = await prefillPatient(s.mrn);
      onPrefill(pre);
      setNote({
        source: pre.source,
        staleMinutes: pre.context.staleMinutes,
        vitals: pre.lastObservations,
        level: pre.lastEncounter?.assignedLevel ?? null,
      });
    } catch {
      setNote(null);
    }
  }

  function onKeyDown(e) {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      choose(suggestions[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className="lookup" ref={box}>
      <label className="lbl" htmlFor="name">
        Patient identifier
        {busy && <span className="lookup-busy"> searching…</span>}
      </label>
      <input
        id="name"
        type="text"
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls="patient-suggestions"
        aria-autocomplete="list"
        placeholder="Surname or trolley number"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setNote(null);
        }}
        onKeyDown={onKeyDown}
        onFocus={() => suggestions.length && setOpen(true)}
      />

      {open && (
        <ul className="lookup-list" id="patient-suggestions" role="listbox">
          {suggestions.map((s, i) => (
            <li key={s.mrn} role="option" aria-selected={i === active}>
              <button
                type="button"
                className={i === active ? 'on' : ''}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(s)}
              >
                <span className="lookup-name">{s.displayName}</span>
                <span className="lookup-meta">
                  {[s.age && `${s.age}y`, s.sex, s.mrn].filter(Boolean).join(' · ')}
                </span>
                <span className={`lookup-tag ${s.source}`}>
                  {s.source === 'cache'
                    ? `seen ${minsAgo(s.lastEncounter?.assignedAt || s.cachedAt)} ago`
                    : 'on record'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {note && (
        <div className="lookup-note">
          <b>Filled from {note.source === 'cache' ? 'this hour' : 'the patient record'}.</b>{' '}
          Identity and history only.
          {note.vitals && Object.values(note.vitals).some(Boolean) && (
            <>
              {' '}
              Last observations {note.staleMinutes != null ? `${note.staleMinutes} min ago` : 'previously'}:{' '}
              <span className="lookup-stale">{summarise(note.vitals)}</span> — measure again, they are not
              carried over.
            </>
          )}
        </div>
      )}
    </div>
  );
}

function minsAgo(ts) {
  if (!ts) return 'recently';
  const m = Math.max(0, Math.round((Date.now() - new Date(ts).getTime()) / 60000));
  return m < 1 ? 'just now' : `${m} min`;
}

function summarise(v) {
  return [
    v.hr && `HR ${v.hr}`,
    v.sbp && `BP ${v.sbp}/${v.dbp || '—'}`,
    v.rr && `RR ${v.rr}`,
    v.spo2 && `SpO₂ ${v.spo2}%`,
    v.temp && `${v.temp}°C`,
  ]
    .filter(Boolean)
    .join('  ');
}
