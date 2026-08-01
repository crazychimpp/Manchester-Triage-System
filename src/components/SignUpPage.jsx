import { useState } from 'react';
import { useAuth } from '../auth/AuthProvider.jsx';

// The note under each is what the choice actually costs the person: it decides
// which board they land on and which handoffs they can read.
const OCCUPATIONS = [
  { key: 'Nurse', note: 'Triage desk\nand the board' },
  { key: 'Paramedic', note: 'Pre-arrival\nhandover' },
  { key: 'Doctor', note: 'Full record\nand overrides' },
];

export default function SignUpPage({ onSwitch }) {
  const { signUp } = useAuth();
  const [form, setForm] = useState({
    fullName: '',
    registrationNumber: '',
    occupation: '',
    email: '',
    password: '',
    confirm: '',
  });
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);
  const [busy, setBusy] = useState(false);
  const [caps, setCaps] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Mirrors the server's rule. The server's copy is the one that counts; this
  // one exists so the person finds out before they press the button.
  const tooShort = form.password.length > 0 && form.password.length < 12;

  // Four steps, and the fourth lands exactly where the server's rule does.
  // A meter reading "strong" while the server still refuses is a lie the
  // person then has to debug.
  const strength = (() => {
    const n = form.password.length;
    if (!n) return 0;
    if (n < 6) return 1;
    if (n < 10) return 2;
    if (n < 12) return 3;
    return new Set(form.password).size >= 8 ? 4 : 3;
  })();
  const mismatch = form.confirm.length > 0 && form.password !== form.confirm;
  const ready =
    form.fullName.trim().length > 1 &&
    form.registrationNumber.trim().length > 3 &&
    OCCUPATIONS.some((o) => o.key === form.occupation) &&
    /\S+@\S+\.\S+/.test(form.email) &&
    form.password.length >= 12 &&
    form.password === form.confirm;

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { confirm, ...details } = form;
      const res = await signUp(details);
      setDone(res);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="gate">
        <div className="gate-panel">
          <div className="gate-mark">
            Triage Desk<span>Manchester Triage System</span>
          </div>
          <h1 className="gate-title">Account created</h1>
          <div className="alert" style={{ borderColor: 'var(--p4)' }}>
            <b>Waiting for verification</b>
            {done.message}
          </div>
          <p className="gate-foot">
            Registration <span className="mono">{done.clinician.registrationNumber}</span> was
            recorded as {done.clinician.occupation.toLowerCase()}. Nobody can grant themselves a
            clinical role here — an administrator checks the number against the professional
            register before the account can sign in.
          </p>
          <button className="btn gate-submit" onClick={onSwitch}>
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="gate">
      <div className="gate-panel wide">
        <div className="gate-mark">
          Triage Desk<span>Manchester Triage System</span>
        </div>

        <h1 className="gate-title">Register a clinician</h1>

        <form onSubmit={submit} noValidate>
          <div className="field">
            <label className="lbl" htmlFor="fullName">Full name</label>
            <input id="fullName" type="text" autoComplete="name" value={form.fullName} onChange={set('fullName')} />
          </div>

          <div className="row two field">
            <div>
              <label className="lbl" htmlFor="reg">Registration number</label>
              <input
                id="reg"
                type="text"
                autoComplete="off"
                placeholder="RN-88213"
                value={form.registrationNumber}
                onChange={set('registrationNumber')}
              />
            </div>
          </div>

          <div className="field">
            <label className="lbl" id="occ-label">Occupation</label>
            <div className="occ" role="group" aria-labelledby="occ-label">
              {OCCUPATIONS.map((o) => (
                <button
                  key={o.key}
                  type="button"
                  aria-pressed={form.occupation === o.key}
                  onClick={() => setForm((f) => ({ ...f, occupation: o.key }))}
                >
                  <span className="occ-name">{o.key}</span>
                  <span className="occ-note">{o.note}</span>
                </button>
              ))}
            </div>
          </div>
          <p className="hint" style={{ marginTop: -4 }}>
            Your number as it appears on the professional register. It is an identifier, not a
            password — it is stored in the clear and never accepted as a credential.
          </p>

          <div className="field">
            <label className="lbl" htmlFor="email">Work email</label>
            <input id="email" type="email" autoComplete="email" value={form.email} onChange={set('email')} />
          </div>

          <div className="row two field">
            <div>
              <label className="lbl" htmlFor="pw">Password</label>
              <input
                id="pw"
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={set('password')}
                onKeyUp={(e) => setCaps(e.getModifierState?.('CapsLock') ?? false)}
              />
              <div className="pw-meter" aria-hidden="true">
                {[1, 2, 3, 4].map((seg) => (
                  <span key={seg} className="pw-seg" data-on={seg <= strength ? strength : undefined} />
                ))}
              </div>
            </div>
            <div>
              <label className="lbl" htmlFor="pw2">Repeat password</label>
              <input id="pw2" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} />
            </div>
          </div>

          <p className="hint" style={{ marginTop: -4 }}>
            {tooShort
              ? `At least 12 characters — ${12 - form.password.length} more.`
              : mismatch
                ? 'The two passwords do not match.'
                : 'At least 12 characters. Three or four unrelated words beat one clever substitution.'}
          </p>

          {caps && <p className="caps">Caps lock is on.</p>}

          {error && (
            <div className="alert" role="alert">
              <b>Could not create the account</b>
              {error.problems?.length ? error.problems.join('. ') + '.' : error.message}
            </div>
          )}

          <button className="btn primary gate-submit" disabled={busy || !ready}>
            {busy ? 'Creating…' : 'Create account'}
          </button>
        </form>

        <p className="gate-alt">
          Already registered?{' '}
          <button type="button" className="linkish" onClick={onSwitch}>
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
