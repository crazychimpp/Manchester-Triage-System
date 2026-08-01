import PatientAssistant from './components/PatientAssistant.jsx';
import { useMemo, useState } from 'react';
import Masthead from './components/Masthead.jsx';
import IntakeForm from './components/IntakeForm.jsx';
import VitalsGrid from './components/VitalsGrid.jsx';
import PriorityLadder from './components/PriorityLadder.jsx';
import DiscriminatorList from './components/DiscriminatorList.jsx';
import EvidencePanel from './components/EvidencePanel.jsx';
import GemmaPanel from './components/GemmaPanel.jsx';
import DecisionBar from './components/DecisionBar.jsx';
import PatientBoard from './components/PatientBoard.jsx';
import { runTriage } from './lib/triage.js';
import { FLOWCHARTS } from './data/mts.js';
import { EXAMPLES } from './data/examples.js';
import { levelVar } from './lib/colour.js';

const blankPatient = () => ({
  name: '',
  age: '',
  sex: '',
  arrivalMode: '',
  arrivalTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
  flowchart: '',
  narrative: '',
  history: '',
  vitals: { hr: '', sbp: '', dbp: '', rr: '', spo2: '', temp: '', pain: '', avpu: '', o2Device: 'Room air' },
  affectedAreas: [],
  discriminators: {},
});

export default function App() {
  const [patient, setPatient] = useState(blankPatient);
  const [board, setBoard] = useState([]);
  const [override, setOverride] = useState(null);
  const [gemma, setGemma] = useState(null);
  const [status, setStatus] = useState('idle');

  const engine = useMemo(() => runTriage(patient), [patient]);

  const set = (k, v) => setPatient((p) => ({ ...p, [k]: v }));
  const setVital = (k, v) => setPatient((p) => ({ ...p, vitals: { ...p.vitals, [k]: v } }));
  const toggleDisc = (id) =>
    setPatient((p) => ({
      ...p,
      discriminators: { ...p.discriminators, [id]: !p.discriminators[id] },
    }));

  function assign() {
    const level = override || engine.level;
    const chart = FLOWCHARTS.find((f) => f.id === patient.flowchart);
    setBoard((b) => [
      ...b,
      {
        ...patient,
        id: crypto.randomUUID(),
        level,
        engineLevel: engine.level,
        overridden: override !== null && override !== engine.level,
        gemmaLevel: gemma?.suggested_level ?? null,
        fired: engine.fired,
        chartName: chart ? chart.name : 'Unspecified',
        assignedAt: Date.now(),
      },
    ]);
    setPatient(blankPatient());
    setOverride(null);
    setGemma(null);
  }

  function loadExample(ex) {
    setPatient({ ...blankPatient(), ...ex.patient });
    setOverride(null);
    setGemma(null);
  }

  function recall(p) {
    // Bring a waiting patient back into the assessment column for reassessment.
    setBoard((b) => b.filter((x) => x.id !== p.id));
    setPatient({
      name: p.name,
      age: p.age,
      sex: p.sex,
      arrivalMode: p.arrivalMode,
      arrivalTime: p.arrivalTime,
      flowchart: p.flowchart,
      narrative: p.narrative,
      history: p.history,
      vitals: p.vitals,
      discriminators: p.discriminators,
    });
    setOverride(null);
    setGemma(null);
  }

  return (
    <div className="app">
      <Masthead status={status} waiting={board.length} />

      <div className="workspace">
        <div className="column">
          <div className="examples">
            <span className="examples-lbl">Start from</span>
            {EXAMPLES.map((ex) => (
              <button key={ex.key} type="button" className="btn ghost tiny" onClick={() => loadExample(ex)}>
                {ex.button}
              </button>
            ))}
            <button type="button" className="btn ghost tiny" onClick={() => { setPatient(blankPatient()); setOverride(null); setGemma(null); }}>
              Blank
            </button>
          </div>
          <PatientAssistant onPrefillNarrative={(txt) => set('narrative', txt)} urgencyColorVar={levelVar(engine.level)} />
          <IntakeForm patient={patient} set={set} />
        </div>

        <div className="column">
          <section>
            <h2 className="eyebrow">Priority</h2>
            <PriorityLadder engine={engine} patient={patient} />
          </section>

          <section>
            <h2 className="eyebrow">Observations</h2>
            <div className="card">
              <VitalsGrid vitals={patient.vitals} set={setVital} engine={engine} />
            </div>
          </section>

          <section>
            <h2 className="eyebrow">Discriminators seen</h2>
            <DiscriminatorList selected={patient.discriminators} toggle={toggleDisc} />
          </section>

          <section>
            <h2 className="eyebrow">Model review</h2>
            <GemmaPanel
              patient={patient}
              engine={engine}
              onStatus={setStatus}
              onResult={setGemma}
              result={gemma}
            />
          </section>

          <section>
            <h2 className="eyebrow">Decision</h2>
            <DecisionBar
              engine={engine}
              override={override}
              setOverride={setOverride}
              onAssign={assign}
              canAssign={engine.complete}
            />
          </section>
        </div>

        <div className="column board-col">
          <PatientBoard patients={board} onRecall={recall} />

          <section>
            <h2 className="eyebrow">Comparable visits</h2>
            <EvidencePanel patient={patient} engine={engine} />
          </section>
        </div>
      </div>
    </div>
  );
}
