// Three assessments that exercise different parts of the engine. They are
// composites written to sit inside the distributions in priors.js — no row of
// the source export is reproduced here, and none of these is a real person.

export const EXAMPLES = [
  {
    key: 'chest',
    button: 'Chest pain, 68',
    patient: {
      name: 'Trolley 4',
      age: '68',
      sex: 'Male',
      arrivalMode: 'ambulance',
      flowchart: 'chest_pain',
      narrative:
        'Central heaviness that started an hour ago while carrying shopping upstairs. Radiates into the left jaw. Sweaty on arrival, still sweaty now. Says it is the worst he has felt.',
      history:
        'Type 2 diabetes, hypertension. Metformin, ramipril, atorvastatin. Father died of a heart attack at 61. No previous cardiac admission.',
      vitals: { hr: '104', sbp: '148', dbp: '88', rr: '20', spo2: '96', temp: '36.8', pain: '8', avpu: 'A', o2Device: 'Room air' },
      discriminators: { cardiac_pain: true },
    },
  },
  {
    key: 'fever',
    button: 'Unwell, 81',
    patient: {
      name: 'Trolley 9',
      age: '81',
      sex: 'Female',
      arrivalMode: 'ambulance',
      flowchart: 'fever',
      narrative:
        'Three days of cough, more confused than usual since this morning according to her daughter. Not eating. Has not passed urine since yesterday evening.',
      history:
        'COPD, atrial fibrillation, previous stroke with mild left-sided weakness. Apixaban, tiotropium, bisoprolol. Lives alone, carers twice daily.',
      vitals: { hr: '118', sbp: '96', dbp: '58', rr: '26', spo2: '91', temp: '38.9', pain: '2', avpu: 'V', o2Device: 'Nasal cannula' },
      discriminators: {},
    },
  },
  {
    key: 'ankle',
    button: 'Ankle injury, 24',
    patient: {
      name: 'Trolley 2',
      age: '24',
      sex: 'Female',
      arrivalMode: 'Walk-in',
      flowchart: 'limb',
      narrative:
        'Rolled her ankle stepping off a kerb about two hours ago. Walked in on it, limping. Swollen over the outer side, no deformity.',
      history: 'Nothing regular. No allergies.',
      vitals: { hr: '78', sbp: '118', dbp: '74', rr: '16', spo2: '99', temp: '36.6', pain: '5', avpu: 'A', o2Device: 'Room air' },
      discriminators: { recent_problem: true },
    },
  },
  {
    key: 'thunderclap',
    button: 'Thunderclap headache, 42',
    patient: {
      name: 'Trolley 6',
      age: '42',
      sex: 'Male',
      arrivalMode: 'Walk-in',
      flowchart: 'headache',
      narrative:
        'Worst headache of my life, came on suddenly like a thunderclap while exercising.',
      history: 'No prior history of migraines or severe headaches. No regular medications.',
      vitals: { hr: '78', sbp: '122', dbp: '78', rr: '16', spo2: '98', temp: '36.8', pain: '6', avpu: 'A', o2Device: 'Room air' },
      discriminators: { recent_problem: true },
    },
  },
];
