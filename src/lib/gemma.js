import { LEVELS, FLOWCHARTS } from '../data/mts.js';
import { complaintCohort, arrivalCohort, ageCohort, BASE_ADMIT, pct } from './cohort.js';

const API = import.meta.env?.VITE_GEMMA_API || 'ollama';
const MODEL = import.meta.env?.VITE_GEMMA_MODEL || 'gemma3:4b';

// In dev the request goes to Vite, which forwards it to the Ollama host on the
// ward network. Nothing leaves the building.
const BASE = '/gemma';

const SYSTEM = `You are a triage support model running on the emergency department's own hardware. You assist a registered triage nurse who has already assessed the patient. You do not diagnose and you do not assign the final priority — the nurse does.

You work in the Manchester Triage System. Its five priorities are:
1 Red, Immediate, seen within 0 minutes
2 Orange, Very urgent, within 10 minutes
3 Yellow, Urgent, within 60 minutes
4 Green, Standard, within 120 minutes
5 Blue, Non-urgent, within 240 minutes

You will be given the nurse's structured assessment and the priority a deterministic MTS rules engine produced from it. Your job is to look for what the rules engine cannot see: patterns across the history, combinations of borderline findings, and time-critical presentations that a single discriminator would miss.

Reply with a single JSON object and nothing else. No prose before or after, no markdown fences.

{
  "suggested_level": 1-5,
  "agrees_with_engine": true|false,
  "rationale": "two sentences at most, addressed to the nurse",
  "red_flags": ["short phrases, at most 4, omit the key if none"],
  "ask_the_patient": ["questions that would change the priority, at most 3"],
  "immediate_actions": ["what to do before the patient is seen, at most 3"],
  "differentials": [{"condition": "name", "note": "why it fits, one clause"}],
  "confidence": "high"|"moderate"|"low"
}

Escalate rather than reassure when the picture is ambiguous. If the record is too thin to judge, say so in the rationale and set confidence to low.`;

export function buildPrompt(patient, engine) {
  const chart = FLOWCHARTS.find((f) => f.id === patient.flowchart);
  const v = patient.vitals;
  const cc = complaintCohort(patient.flowchart);
  const am = arrivalCohort(patient.arrivalMode);
  const ag = ageCohort(patient.age);

  const lines = [
    `PATIENT`,
    `Age ${patient.age || 'not recorded'}, ${patient.sex || 'sex not recorded'}.`,
    `Arrived by ${patient.arrivalMode || 'unknown route'} at ${patient.arrivalTime || 'unrecorded time'}.`,
    `Presenting complaint (MTS flowchart): ${chart ? chart.name : 'not selected'}.`,
    ``,
    `TRIAGE OBSERVATIONS`,
    `Pulse ${blank(v.hr)} bpm, BP ${blank(v.sbp)}/${blank(v.dbp)} mmHg, respiratory rate ${blank(v.rr)}, SpO₂ ${blank(v.spo2)}%${v.o2Device && v.o2Device !== 'Room air' ? ` on ${v.o2Device}` : ' on room air'}, temperature ${blank(v.temp)} °C.`,
    `Conscious level ${v.avpu || 'not recorded'}. Pain score ${blank(v.pain)}/10.`,
    ``,
    `NURSE'S NARRATIVE`,
    patient.narrative?.trim() || '(none recorded)',
    ``,
    `PAST HISTORY AND MEDICATION`,
    patient.history?.trim() || '(none recorded)',
    ``,
    `RULES ENGINE RESULT`,
    `${engine.level} — ${engine.colour}, ${engine.name}, target ${engine.target} minutes.`,
    engine.fired.length
      ? `Discriminators that fired: ${engine.fired.map((f) => `${f.label} (level ${f.level})`).join('; ')}.`
      : `No discriminator fired.`,
  ];

  const ev = [];
  if (cc) ev.push(`${cc.n.toLocaleString()} previous visits on the ${cc.label} flowchart were admitted ${pct(cc.admit)} of the time.`);
  if (am) ev.push(`${am.n.toLocaleString()} previous arrivals by ${patient.arrivalMode} were admitted ${pct(am.admit)} of the time.`);
  if (ag) ev.push(`${ag.n.toLocaleString()} previous visits in the band "${ag.label}" were admitted ${pct(ag.admit)} of the time.`);
  if (ev.length) {
    lines.push(
      ``,
      `DEPARTMENTAL BASE RATES (from ${(560486).toLocaleString()} previous visits; department-wide admission rate ${pct(BASE_ADMIT)})`,
      ...ev.map((e) => `- ${e}`),
      `These are population frequencies. Do not treat them as this patient's probability.`
    );
  }

  return lines.join('\n');
}

function blank(x) {
  return x === '' || x === undefined || x === null ? '—' : x;
}

// ---------------------------------------------------------------- transports

export async function streamGemma(prompt, { onToken, signal, transport }) {
  const t = transport || API;
  if (t === 'mock') return mockStream(prompt, onToken, signal);
  if (t === 'openai') return openaiStream(prompt, onToken, signal);
  return ollamaStream(prompt, onToken, signal);
}

async function ollamaStream(prompt, onToken, signal) {
  const res = await fetch(`${BASE}/api/chat`, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      stream: true,
      format: 'json',
      options: { temperature: 0.2, num_predict: 700 },
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: prompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Gemma host returned ${res.status}. Check that Ollama is running and ${MODEL} is pulled.`);
  return consumeNdjson(res, onToken, (o) => o?.message?.content || '');
}

async function openaiStream(prompt, onToken, signal) {
  const res = await fetch(`${BASE}/v1/chat/completions`, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      stream: true,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: prompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Gemma host returned ${res.status}.`);
  return consumeSse(res, onToken);
}

async function consumeNdjson(res, onToken, pick) {
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  let full = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop();
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const piece = pick(JSON.parse(line));
        if (piece) {
          full += piece;
          onToken(full);
        }
      } catch {
        /* partial line, wait for the rest */
      }
    }
  }
  return full;
}

async function consumeSse(res, onToken) {
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  let full = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const parts = buf.split('\n\n');
    buf = parts.pop();
    for (const part of parts) {
      const line = part.split('\n').find((l) => l.startsWith('data:'));
      if (!line) continue;
      const payload = line.slice(5).trim();
      if (payload === '[DONE]') continue;
      try {
        const piece = JSON.parse(payload).choices?.[0]?.delta?.content || '';
        if (piece) {
          full += piece;
          onToken(full);
        }
      } catch {
        /* ignore */
      }
    }
  }
  return full;
}

export function parseGemma(raw) {
  if (!raw) return null;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------ mock mode
// Lets the interface be demonstrated, and the rules engine tested, on a
// workstation with no model installed. Never used when VITE_GEMMA_API is set
// to a real transport.

async function mockStream(prompt, onToken, signal) {
  const level = Number((prompt.match(/RULES ENGINE RESULT\n(\d)/) || [])[1] || 3);
  const chartLine = (prompt.match(/MTS flowchart\): (.+?)\./) || [])[1] || 'this presentation';
  const body = {
    suggested_level: level,
    agrees_with_engine: true,
    rationale: `Nothing in the record contradicts a ${LEVELS[level].colour.toLowerCase()} priority for ${chartLine.toLowerCase()}. This is the offline demonstration model — no clinical reasoning has been performed.`,
    red_flags: level <= 2 ? ['Reassess observations within 10 minutes'] : undefined,
    ask_the_patient: ['When did this start?', 'Has it happened before?'],
    immediate_actions: level <= 2 ? ['Move to a monitored space', 'Repeat full observations'] : ['Repeat observations if the wait exceeds the target'],
    differentials: [{ condition: 'Demonstration output', note: 'connect a Gemma host for real support' }],
    confidence: 'low',
  };
  const text = JSON.stringify(body, null, 1);
  let out = '';
  for (const ch of text) {
    if (signal?.aborted) throw new DOMException('aborted', 'AbortError');
    out += ch;
    onToken(out);
    await new Promise((r) => setTimeout(r, 4));
  }
  return out;
}

export const gemmaConfig = { api: API, model: MODEL };
