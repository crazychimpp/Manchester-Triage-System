import { FLOWCHARTS, ARRIVAL_MODES } from '../data/mts.js';
import { complaintCohort, arrivalCohort, pct } from '../lib/cohort.js';

export default function IntakeForm({ patient, set }) {
  const cc = complaintCohort(patient.flowchart);
  const am = arrivalCohort(patient.arrivalMode);

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

          <div className="field">
            <label className="lbl" htmlFor="narrative">What the patient says</label>
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
