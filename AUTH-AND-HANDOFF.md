# Accounts, patient records and the handoff chain

Three things were asked for, and one of them needed rethinking before it was
safe to build. This document covers all three.

---

## 1. Login and sign-up

**Pages:** `src/components/LoginPage.jsx`, `src/components/SignUpPage.jsx`,
session state in `src/auth/AuthProvider.jsx`, gated at `src/Root.jsx`.

Sign-up collects full name, ID number, occupation (Nurse / Paramedic /
Doctor), email and password. Login takes a username — or the work email, since
that is what clinicians actually remember — and a password.

**What the backend does with them:**

| | |
|---|---|
| Password storage | Argon2id, ~19 MiB / 2 passes (OWASP's current floor). Parameters live inside the encoded hash, so the cost can be raised later and existing accounts rehash on their next successful login. |
| Unknown username | Costs the same as a wrong password — a dummy verify runs — so the login form is not a user-enumeration oracle. |
| Repeated failures | Counted on the row, not in memory, so a restart does not clear a lockout. Ten attempts, fifteen minutes. |
| Sessions | Short access token (15 min, verified without a database round trip) plus an opaque refresh token stored only as a SHA-256 digest. Rotation on every use with **reuse detection**: a refresh token presented twice means it was copied, so the whole token family is revoked rather than just that one request refused. |
| ID number | Unique per occupation, so two accounts cannot claim the same registration. |

**One deliberate gap, flagged rather than hidden:** `AUTO_ACTIVATE_SIGNUPS` is
on so the system is usable as delivered, which means anyone signing up can tick
"Doctor". An occupation claim is only worth something if a human checks the
registration number against the professional register. Turn it off and accounts
land in `pending` until verified — the schema already carries `verified_by` and
`verified_at` for exactly that.

---

## 2. Patient data keyed on the health card

`PUT /api/v1/patients/{healthCardId}` and `GET /api/v1/patients/{healthCardId}`.

The health card is the right key because it is the identity that survives the
journey. The paramedic reads it off the card in the patient's wallet, the nurse
reads the same number at the door, the doctor sees the same record. An MRN is
issued per hospital and would break the chain at the ambulance bay.

Numbers are normalised on the way in — `1234-567-890 XY`, `1234 567 890 XY`
and `1234567890xy` are one patient, not three. That matters because a health
card gets read aloud over a radio and typed by three different people.

Every read is audited, not just every write. "Who looked at this record" is the
question asked in an investigation, and it cannot be answered retroactively.

---

## 3. The one-hour handoff cache — and the change I made to it

You asked for the recent-patient cache to be fetched **using the full name of
the user**. I built the name search, because it is genuinely the right
interface: the nurse at the door knows "Sarah from the ambulance", not a UUID.
But a name cannot be what *authorises* the read.

The test run below is the argument. Typing `sarah chen` matched **six active
clinicians** — two paramedics, two nurses, two doctors. If the name were the
key, any Sarah Chen could pull any other Sarah Chen's patients. On a ward of
any size there are two Sarah Chens.

So the flow is: **name → candidate list → clinician id → role check.**

```
=== 8. nurse finds it by typing the sender's name
  name matched 6 clinicians: ['Doctor', 'Doctor', 'Nurse', 'Nurse', 'Paramedic', 'Paramedic']
  handoffs visible to this nurse: 1
   from Sarah Chen (Paramedic) -> Nurse | ETA 8 minutes, chest pain, GTN given

=== 9. the doctor types the same name and correctly sees nothing
  matched 6 clinicians but 0 handoffs — a paramedic hands over to a nurse, not a doctor
```

Step 9 is the point. The doctor typed the same string and got nothing, because
a paramedic hands over to a nurse. That is the correct answer, not a bug.

### How the hour works

- **Postgres first, cache second.** Every handoff is a row before it is a cache
  entry. A handoff that exists only in a cache disappears when the cache
  restarts, and during a shift change that is the worst possible moment. Cache
  miss falls through to the database and still answers.
- **The lease is per handoff, not per hour of the clock.** One written at 09:55
  is good until 10:55. Flushing the namespace on the hour would throw away
  fifty-five minutes of it.
- **Accepting a handoff drops it from the cache immediately.** It has done its
  job; leaving patient data cached past its usefulness is the thing the hour
  limit exists to prevent.
- `DELETE /api/v1/handoffs/cache` is there for incident response, not on a
  timer.

**Run Redis.** With `REDIS_URL` empty the cache is an in-process dict, which is
correct for one process and wrong the moment there are two — and the paramedic
tablet and the nurse workstation are, by definition, different devices.

---

## Why two backends

Not language tourism. The two own different things and fail differently.

**Python — `python-service/`** (FastAPI, asyncpg, argon2-cffi, PyJWT)
Identity and the handoff chain. It is what a clinician's device talks to first,
and it has to keep working when the clinical API is being restarted mid-shift.

**JavaScript — `server/`** (Fastify, pg, ioredis)
The triage encounter: board, rules-engine output, model proxy, literature
lookup.

They share one Postgres and one JWT secret — same issuer, audience and claim
names — so a session opened against either is accepted by both and the front
end does not care which process answers. **Schema ownership sits with the Node
service's migrations**: one owner, one source of truth. The Python service
reads and writes those tables and does not migrate them, which is the only
arrangement that stays sane when two runtimes share a database.

---

## Running it

```bash
# database and cache
cd server && docker compose up -d

# JavaScript service  :8080
npm install && npm run dev

# Python service      :8090
cd ../python-service
pip install -r requirements.txt
cp .env.example .env          # JWT_SECRET must match the Node service
uvicorn app.main:app --port 8090 --reload

# front end           :5173
cd .. && npm run dev
```

`python-service/scripts/e2e.sh` walks the whole chain: three accounts, a
patient keyed on a health card, a handoff relayed paramedic → nurse → doctor,
found by name, with the role isolation checked in both directions.

## Verified against a live Postgres

Signup for all three occupations · duplicate registration number refused ·
short password refused · wrong password refused, then correct login · patient
upsert with card normalisation (`1234-567-890 XY` → `1234567890XY`) ·
paramedic → nurse handoff · paramedic → doctor refused · name search returning
one handoff to the nurse and zero to the doctor · inbox served from cache ·
accept · nurse → doctor · card lookup · cache stats showing 3599s left on the
lease · unauthenticated read returning 401.
