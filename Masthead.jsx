import { useEffect, useState } from 'react';
import { gemmaConfig } from '../lib/gemma.js';
import { N_VISITS, BASE_ADMIT, pct } from '../lib/cohort.js';

const STATUS_TEXT = {
  idle: 'Gemma ready',
  busy: 'Gemma reading',
  error: 'Gemma unreachable',
};

const STATUS_DOT = { idle: 'live', busy: 'busy', error: 'down' };

export default function Masthead({ status, waiting }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="masthead">
      <div className="wordmark">
        Triage Desk<span>Manchester Triage System</span>
      </div>

      <div className="chip" title="Local model host">
        <i className={`dot ${STATUS_DOT[status]}`} />
        {STATUS_TEXT[status]} · {gemmaConfig.model}
        {gemmaConfig.api === 'mock' && ' · offline demo'}
      </div>

      <div className="chip" title="Source of every base rate shown in this interface">
        {N_VISITS.toLocaleString()} previous visits · {pct(BASE_ADMIT)} admitted
      </div>

      <div className="masthead-spacer" />

      <div className="chip">
        {waiting} waiting
      </div>

      <time className="clock">
        {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
      </time>
    </header>
  );
}
