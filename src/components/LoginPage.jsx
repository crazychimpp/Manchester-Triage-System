import { useState } from 'react';
import { useAuth } from '../auth/AuthProvider.jsx';

export default function LoginPage({ onSwitch }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  // Worth catching on a shared ward workstation: the password field shows
  // nothing, so caps lock is otherwise three failed attempts and a lockout.
  const [caps, setCaps] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (err) {
      // The message comes from the server, which deliberately does not
      // distinguish "no such account" from "wrong password".
      setError({ message: err.message, code: err.code });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="gate">
      <div className="gate-panel">
        <div className="gate-mark">
          Triage Desk<span>Manchester Triage System</span>
        </div>

        <h1 className="gate-title">Sign in</h1>

        <form onSubmit={submit} noValidate>
          <div className="field">
            <label className="lbl" htmlFor="email">Work email</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="field">
            <label className="lbl" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyUp={(e) => setCaps(e.getModifierState?.('CapsLock') ?? false)}
            />
            {caps && <p className="caps">Caps lock is on.</p>}
          </div>

          {error && (
            <div className="alert" role="alert">
              <b>
                {error.code === 'locked'
                  ? 'Too many attempts'
                  : error.code === 'account_pending'
                    ? 'Not verified yet'
                    : 'Could not sign in'}
              </b>
              {error.message}
            </div>
          )}

          <button className="btn primary gate-submit" disabled={busy || !email || !password}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="gate-alt">
          No account?{' '}
          <button type="button" className="linkish" onClick={onSwitch}>
            Register a clinician
          </button>
        </p>

        <p className="gate-foot">
          Access is logged against your name. Patient records are viewable only
          for the role your registration was verified for.
        </p>
      </div>
    </div>
  );
}
