import { useRef, useState } from 'react';
import { buildPrompt, streamGemma, parseGemma, gemmaConfig } from '../lib/gemma.js';
import { LEVELS } from '../data/mts.js';
import { levelVar } from '../lib/colour.js';

export default function GemmaPanel({ patient, engine, onStatus, onResult, result }) {
  const [raw, setRaw] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [demo, setDemo] = useState(gemmaConfig.api === 'mock');
  const abort = useRef(null);

  async function ask(transport) {
    setBusy(true);
    setError(null);
    setRaw('');
    setDemo(transport ? transport === 'mock' : gemmaConfig.api === 'mock');
    onResult(null);
    onStatus('busy');
    abort.current = new AbortController();
    try {
      const text = await streamGemma(buildPrompt(patient, engine), {
        onToken: setRaw,
        signal: abort.current.signal,
        transport,
      });
      const parsed = parseGemma(text);
      if (!parsed) throw new Error('Gemma replied but the response was not usable JSON.');
      onResult(parsed);
      onStatus('idle');
    } catch (e) {
      if (e.name !== 'AbortError') {
        setError(e.message);
        onStatus('error');
      } else {
        onStatus('idle');
      }
    } finally {
      setBusy(false);
    }
  }

  function stop() {
    abort.current?.abort();
    setBusy(false);
  }

  const suggested = result?.suggested_level;
  const disagrees = suggested && suggested !== engine.level;

  return (
    <div className="card">
      <div className="gemma-bar">
        <button className="btn primary" onClick={() => ask()} disabled={busy || !engine.complete}>
          {result ? 'Ask again' : 'Ask Gemma to review'}
        </button>
        {busy && (
          <button className="btn ghost" onClick={stop}>Stop</button>
        )}
        <span className="count">
          {demo ? 'offline demo model' : `${gemmaConfig.model} on the ward host`}
        </span>
      </div>

      {!engine.complete && !result && (
        <p className="ev-note">
          Record a flowchart and at least three observations first — the model
          should not be asked to fill gaps the nurse has not closed.
        </p>
      )}

      {error && (
        <div className="alert">
          <b>Gemma did not answer</b>
          {error} The priority above was produced by the rules engine and stands
          on its own.
          <button
            className="btn ghost tiny"
            type="button"
            style={{ marginTop: 8 }}
            onClick={() => ask('mock')}
          >
            Run the offline demo model instead
          </button>
        </div>
      )}

      {busy && !result && (
        <div className="stream">{raw || 'waiting for first token…'}</div>
      )}

      {result && (
        <>
          <div className={`verdict ${disagrees ? 'disagree' : 'agree'}`}>
            <span
              className="num"
              style={{
                background: levelVar(suggested),
                color: 'var(--ink)',
                fontFamily: 'var(--mono)',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 2,
              }}
            >
              {suggested}
            </span>
            <div>
              <div className="verdict-title">
                {disagrees
                  ? `Gemma reads this as ${LEVELS[suggested].colour.toLowerCase()}`
                  : `Agrees with ${LEVELS[engine.level].colour.toLowerCase()}`}
              </div>
              <small>
                confidence {result.confidence || 'unstated'}
                {demo && ' · demo model, no clinical reasoning'}
              </small>
            </div>
          </div>

          {result.rationale && (
            <div className="g-block">
              <div className="g-title">Reading</div>
              <p style={{ margin: 0, fontSize: 13.5 }}>{result.rationale}</p>
            </div>
          )}

          <ListBlock title="Red flags" items={result.red_flags} cls="flags" />
          <ListBlock title="Do before the patient is seen" items={result.immediate_actions} />
          <ListBlock title="Worth asking" items={result.ask_the_patient} />

          {Array.isArray(result.differentials) && result.differentials.length > 0 && (
            <div className="g-block">
              <div className="g-title">Consider</div>
              <ul className="g-list">
                {result.differentials.slice(0, 5).map((d, i) => (
                  <li key={i}>
                    {d.condition} <em>— {d.note}</em>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {disagrees && (
            <div className="alert">
              <b>Disagreement logged</b>
              The rules engine assigned {LEVELS[engine.level].colour.toLowerCase()};
              Gemma suggests {LEVELS[suggested].colour.toLowerCase()}. Either
              priority can be recorded below — whichever you record is the one
              that counts, and the disagreement is saved with it.
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ListBlock({ title, items, cls = '' }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <div className="g-block">
      <div className="g-title">{title}</div>
      <ul className={`g-list ${cls}`}>
        {items.slice(0, 4).map((it, i) => (
          <li key={i}>{typeof it === 'string' ? it : JSON.stringify(it)}</li>
        ))}
      </ul>
    </div>
  );
}
