import { useMemo, useState, useEffect } from 'react';
import { FLOWCHARTS, ARRIVAL_MODES } from '../data/mts.js';
import BodyMap from './BodyMap.jsx';
import { complaintCohort, arrivalCohort, pct } from '../lib/cohort.js';

export default function IntakeForm({ patient, set }) {
  const cc = complaintCohort(patient.flowchart);
  const am = arrivalCohort(patient.arrivalMode);

  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  useEffect(() => {
    if (patient.flowchart) {
      const chart = FLOWCHARTS.find((f) => f.id === patient.flowchart);
      if (chart) setQuery(chart.name);
    } else {
      setQuery('');
    }
  }, [patient.flowchart]);

  const searchItems = useMemo(() => {
    const list = [];
    FLOWCHARTS.forEach((f) => {
      list.push({ id: f.id, label: f.name, chartName: f.name });
      f.cc.forEach((ccCode) => {
        const friendly = ccCode.replace(/[-/]/g, ' ');
        if (
          friendly.toLowerCase() !== f.name.toLowerCase() &&
          !list.some((i) => i.label.toLowerCase() === friendly.toLowerCase())
        ) {
          list.push({ id: f.id, label: friendly, chartName: f.name });
        }
      });
    });
    return list;
  }, []);

  const filteredResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return searchItems
      .filter((item) => item.label.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, searchItems]);

  function selectResult(item) {
    set('flowchart', item.id);
    setQuery(item.label);
    setIsOpen(false);
    setHighlightedIndex(-1);
  }

  function handleInputChange(e) {
    const val = e.target.value;
    setQuery(val);
    setIsOpen(true);
    setHighlightedIndex(-1);
    const match = searchItems.find((i) => i.label.toLowerCase() === val.trim().toLowerCase());
    if (match) {
      set('flowchart', match.id);
    }
  }

  function handleKeyDown(e) {
    if (!isOpen || filteredResults.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % filteredResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + filteredResults.length) % filteredResults.length);
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < filteredResults.length) {
        e.preventDefault();
        selectResult(filteredResults[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  }

  return (
    <>
      <section>
        <h2 className="eyebrow">At the door</h2>
        <div className="card">
          <div className="field">
            <label className="lbl" htmlFor="name">Patient identifier</label>
            <input
              id="name"
              type="text"
              placeholder="Surname or trolley number"
              value={patient.name}
              onChange={(e) => set('name', e.target.value)}
            />
          </div>

          <div className="row three field">
            <div>
              <label className="lbl" htmlFor="age">Age</label>
              <input
                id="age"
                type="number"
                min="0"
                max="120"
                value={patient.age}
                onChange={(e) => set('age', e.target.value)}
              />
            </div>
            <div>
              <label className="lbl" htmlFor="sex">Sex</label>
              <select id="sex" value={patient.sex} onChange={(e) => set('sex', e.target.value)}>
                <option value="">—</option>
                <option>Female</option>
                <option>Male</option>
              </select>
            </div>
            <div>
              <label className="lbl" htmlFor="arrivalTime">Arrived</label>
              <input
                id="arrivalTime"
                type="text"
                value={patient.arrivalTime}
                onChange={(e) => set('arrivalTime', e.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <label className="lbl" htmlFor="arrival">Route of arrival</label>
            <select
              id="arrival"
              value={patient.arrivalMode}
              onChange={(e) => set('arrivalMode', e.target.value)}
            >
              <option value="">—</option>
              {ARRIVAL_MODES.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            {am && (
              <p className="hint">
                {am.n.toLocaleString()} previous arrivals this way · {pct(am.admit)} were admitted
              </p>
            )}
          </div>
        </div>
      </section>

      <section>
        <h2 className="eyebrow">Presenting complaint</h2>
        <div className="card">
          <div className="field search-field" style={{ position: 'relative' }}>
            <label className="lbl" htmlFor="symptom-search">Symptom search & quick pick</label>
            <input
              id="symptom-search"
              type="text"
              placeholder="Type symptom (e.g. chest pain, headache, shortness of breath)..."
              value={query}
              onChange={handleInputChange}
              onFocus={() => setIsOpen(true)}
              onBlur={() => setTimeout(() => setIsOpen(false), 200)}
              onKeyDown={handleKeyDown}
              autoComplete="off"
            />
            {isOpen && filteredResults.length > 0 && (
              <ul
                className="autocomplete-dropdown"
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  zIndex: 20,
                  background: 'var(--raised)',
                  border: '1px solid var(--rule)',
                  borderRadius: 'var(--radius)',
                  marginTop: 4,
                  padding: 0,
                  listStyle: 'none',
                  maxHeight: 220,
                  overflowY: 'auto',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                }}
              >
                {filteredResults.map((item, idx) => (
                  <li
                    key={`${item.id}-${idx}`}
                    onMouseDown={() => selectResult(item)}
                    style={{
                      padding: '8px 12px',
                      cursor: 'pointer',
                      background: idx === highlightedIndex ? 'var(--panel-2)' : 'transparent',
                      borderBottom: '1px solid var(--panel)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span>{item.label}</span>
                    <small style={{ color: 'var(--mute)', fontSize: 11 }}>
                      {item.chartName}
                    </small>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="field">
            <label className="lbl" htmlFor="chart">MTS flowchart</label>
            <select
              id="chart"
              value={patient.flowchart}
              onChange={(e) => set('flowchart', e.target.value)}
            >
              <option value="">Choose the chart that fits</option>
              {FLOWCHARTS.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            {cc && (
              <p className="hint">
                Pools {cc.n.toLocaleString()} previous visits — most often{' '}
                {cc.top.map((t) => t.key.replace(/[-/]/g, ' ')).slice(0, 3).join(', ')}
              </p>
            )}
          </div>

          <BodyMap
            selected={patient.affectedAreas || []}
            onChange={(areas) => set('affectedAreas', areas)}
          />

          <div className="field">
            <label className="lbl" htmlFor="narrative">Patient's own words</label>
            <textarea
              id="narrative"
              placeholder="In their own words. Onset, duration, what makes it worse."
              value={patient.narrative}
              onChange={(e) => set('narrative', e.target.value)}
            />
          </div>

          <div className="field">
            <label className="lbl" htmlFor="history">History and medication</label>
            <textarea
              id="history"
              placeholder="Known conditions, regular medicines, allergies, recent admissions."
              value={patient.history}
              onChange={(e) => set('history', e.target.value)}
            />
          </div>
        </div>
      </section>
    </>
  );
}
