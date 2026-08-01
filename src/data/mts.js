// Manchester Triage System reference data.
//
// MTS assigns one of five clinical priorities by walking a presentational
// flowchart and stopping at the first discriminator that applies. The
// discriminators below are the *general* set that appears on every chart,
// plus the physiological cut-offs a triage nurse reads off the vitals.

export const LEVELS = {
  1: { level: 1, name: 'Immediate', colour: 'Red', target: 0, token: 'p1' },
  2: { level: 2, name: 'Very urgent', colour: 'Orange', target: 10, token: 'p2' },
  3: { level: 3, name: 'Urgent', colour: 'Yellow', target: 60, token: 'p3' },
  4: { level: 4, name: 'Standard', colour: 'Green', target: 120, token: 'p4' },
  5: { level: 5, name: 'Non-urgent', colour: 'Blue', target: 240, token: 'p5' },
};

export const LEVEL_ORDER = [1, 2, 3, 4, 5];

// Observed discriminators — things the nurse sees, not measures.
export const OBSERVED = [
  { id: 'airway', level: 1, label: 'Airway compromise', hint: 'Stridor, obstruction, unable to maintain' },
  { id: 'breathing', level: 1, label: 'Inadequate breathing', hint: 'Exhaustion, agonal or absent effort' },
  { id: 'shock', level: 1, label: 'Shock', hint: 'Clammy, mottled, prolonged capillary refill' },
  { id: 'exsanguinating', level: 1, label: 'Exsanguinating haemorrhage', hint: 'Bleeding that will not stop with pressure' },
  { id: 'fitting', level: 1, label: 'Currently fitting', hint: 'Active seizure at the desk' },

  { id: 'major_haem', level: 2, label: 'Uncontrollable major haemorrhage', hint: 'Soaking through dressings' },
  { id: 'cardiac_pain', level: 2, label: 'Cardiac-sounding chest pain', hint: 'Heavy, central, radiating, sweaty' },
  { id: 'new_deficit', level: 2, label: 'New neurological deficit', hint: 'Facial droop, arm drift, new dysphasia' },
  { id: 'significant_mech', level: 2, label: 'Significant mechanism of injury', hint: 'Ejection, fall > 3 m, pedestrian struck' },
  { id: 'self_harm_risk', level: 2, label: 'Significant risk to self or others', hint: 'Active plan, agitation, absconding risk' },

  { id: 'minor_haem', level: 3, label: 'Uncontrollable minor haemorrhage', hint: 'Oozing despite pressure' },
  { id: 'loc_history', level: 3, label: 'History of unconsciousness', hint: 'Witnessed collapse, now alert' },
  { id: 'persistent_vomiting', level: 3, label: 'Persistent vomiting', hint: 'Unable to keep fluids down' },
  { id: 'inappropriate_history', level: 3, label: 'Inappropriate history', hint: 'Account does not fit the injury' },
  { id: 'pleuritic', level: 3, label: 'Pleuritic pain', hint: 'Sharp, worse on inspiration' },

  { id: 'recent_problem', level: 4, label: 'Recent problem', hint: 'Onset within 7 days' },
  { id: 'chronic_problem', level: 5, label: 'Long-standing problem', hint: 'Unchanged for weeks or months' },
];

export const OBSERVED_BY_LEVEL = LEVEL_ORDER.map((l) => ({
  level: l,
  items: OBSERVED.filter((o) => o.level === l),
}));

// Physiological discriminators, evaluated from the vitals as they are typed.
// `cohort` points at a band in the dataset priors so the UI can show the
// observed admission rate for patients who arrived in that band.
export const VITAL_RULES = [
  { id: 'avpu_u', level: 1, label: 'Unresponsive (AVPU = U)', field: 'avpu', test: (v) => v.avpu === 'U' },
  { id: 'spo2_crit', level: 1, label: 'SpO₂ below 85%', field: 'spo2', test: (v) => num(v.spo2) < 85, cohort: 'spo2_lt92' },
  { id: 'sbp_shock', level: 1, label: 'Systolic BP below 90 mmHg', field: 'sbp', test: (v) => num(v.sbp) < 90, cohort: 'sbp_lt90' },
  { id: 'rr_crit', level: 1, label: 'Respiratory rate below 9', field: 'rr', test: (v) => num(v.rr) < 9, cohort: 'rr_lt9' },

  { id: 'avpu_vp', level: 2, label: 'Altered conscious level (AVPU = V or P)', field: 'avpu', test: (v) => v.avpu === 'V' || v.avpu === 'P' },
  { id: 'spo2_low', level: 2, label: 'SpO₂ 85–91%', field: 'spo2', test: (v) => between(v.spo2, 85, 91.99), cohort: 'spo2_lt92' },
  { id: 'rr_high', level: 2, label: 'Respiratory rate 25 or above', field: 'rr', test: (v) => num(v.rr) >= 25, cohort: 'rr_ge25' },
  { id: 'hr_high', level: 2, label: 'Heart rate 130 or above', field: 'hr', test: (v) => num(v.hr) >= 130, cohort: 'hr_ge130' },
  { id: 'hr_low', level: 2, label: 'Heart rate below 50', field: 'hr', test: (v) => num(v.hr) < 50, cohort: 'hr_lt50' },
  { id: 'sbp_border', level: 2, label: 'Systolic BP 90–99 mmHg', field: 'sbp', test: (v) => between(v.sbp, 90, 99.99), cohort: 'sbp_90_99' },
  { id: 'temp_hot', level: 2, label: 'Temperature 39.0 °C or above', field: 'temp', test: (v) => num(v.temp) >= 39, cohort: 'temp_ge102F' },
  { id: 'pain_severe', level: 2, label: 'Severe pain (7–10)', field: 'pain', test: (v) => num(v.pain) >= 7 },

  { id: 'spo2_borderline', level: 3, label: 'SpO₂ 92–94%', field: 'spo2', test: (v) => between(v.spo2, 92, 94.99), cohort: 'spo2_92_94' },
  { id: 'rr_mod', level: 3, label: 'Respiratory rate 21–24', field: 'rr', test: (v) => between(v.rr, 21, 24.99), cohort: 'rr_21_24' },
  { id: 'hr_mod', level: 3, label: 'Heart rate 111–129', field: 'hr', test: (v) => between(v.hr, 111, 129.99), cohort: 'hr_111_129' },
  { id: 'temp_warm_high', level: 3, label: 'Temperature 38.0–38.9 °C', field: 'temp', test: (v) => between(v.temp, 38, 38.99), cohort: 'temp_100_4_to_102F' },
  { id: 'temp_cold', level: 3, label: 'Temperature below 35.5 °C', field: 'temp', test: (v) => num(v.temp) < 35.5, cohort: 'temp_lt96F' },
  { id: 'pain_mod', level: 3, label: 'Moderate pain (4–6)', field: 'pain', test: (v) => between(v.pain, 4, 6) },

  { id: 'temp_warm', level: 4, label: 'Temperature 37.5–37.9 °C', field: 'temp', test: (v) => between(v.temp, 37.5, 37.99) },
  { id: 'pain_mild', level: 4, label: 'Mild pain (1–3)', field: 'pain', test: (v) => between(v.pain, 1, 3) },
];

// MTS presentational flowcharts, each mapped to the chief-complaint codes
// used in the source dataset so the evidence panel can pool the right visits.
export const FLOWCHARTS = [
  { id: 'chest_pain', name: 'Chest pain', cc: ['chestpain', 'chesttightness', 'epigastricpain', 'ribpain'] },
  { id: 'sob', name: 'Shortness of breath in adults', cc: ['shortnessofbreath', 'breathingdifficulty', 'dyspnea', 'asthma', 'wheezing', 'respiratorydistress', 'breathingproblem'] },
  { id: 'abdo', name: 'Abdominal pain in adults', cc: ['abdominalpain', 'abdominalcramping', 'abdominaldistention', 'epigastricpain'] },
  { id: 'collapsed', name: 'Collapsed adult', cc: ['unresponsive', 'lossofconsciousness', 'syncope', 'nearsyncope', 'cardiacarrest', 'lethargy'] },
  { id: 'neuro', name: 'Neurological deficit', cc: ['strokealert', 'neurologicproblem', 'alteredmentalstatus', 'numbness', 'extremityweakness', 'confusion'] },
  { id: 'unwell', name: 'Unwell adult', cc: ['weakness', 'fatigue', 'medicalproblem', 'generalizedbodyaches', 'dehydration', 'abnormallab', 'medicalscreening'] },
  { id: 'headache', name: 'Headache', cc: ['headache-newonsetornewsymptoms', 'headache', 'migraine', 'headachere-evaluation', 'headache-recurrentorknowndxmigraines'] },
  { id: 'falls', name: 'Falls', cc: ['fall', 'fall>65', 'multiplefalls'] },
  { id: 'head_injury', name: 'Head injury', cc: ['headinjury', 'headlaceration', 'faciallaceration', 'facialinjury'] },
  { id: 'major_trauma', name: 'Major trauma', cc: ['fulltrauma', 'modifiedtrauma', 'trauma', 'motorvehiclecrash', 'motorcyclecrash', 'assaultvictim'] },
  { id: 'limb', name: 'Limb problems', cc: ['legpain', 'armpain', 'kneepain', 'anklepain', 'hippain', 'shoulderpain', 'footpain', 'wristpain', 'handpain', 'elbowpain', 'toepain', 'fingerpain', 'jointswelling', 'legswelling', 'edema'] },
  { id: 'back', name: 'Back pain', cc: ['backpain', 'neckpain'] },
  { id: 'gi_bleed', name: 'Gastrointestinal bleeding', cc: ['gibleeding', 'rectalbleeding', 'hematuria', 'hemoptysis', 'epistaxis'] },
  { id: 'vomiting', name: 'Vomiting', cc: ['emesis', 'nausea', 'diarrhea', 'giproblem', 'constipation'] },
  { id: 'mental', name: 'Mental illness', cc: ['psychiatricevaluation', 'suicidal', 'depression', 'anxiety', 'hallucinations', 'psychoticsymptoms', 'agitation', 'panicattack', 'homicidal'] },
  { id: 'overdose', name: 'Overdose and poisoning', cc: ['overdose-intentional', 'overdose-accidental', 'poisoning', 'ingestion', 'drugproblem', 'withdrawal-alcohol', 'detoxevaluation', 'addictionproblem', 'drug/alcoholassessment', 'alcoholproblem', 'alcoholintoxication'] },
  { id: 'palpitations', name: 'Palpitations', cc: ['palpitations', 'tachycardia', 'rapidheartrate', 'irregularheartbeat', 'hypertension', 'hypotension'] },
  { id: 'fits', name: 'Fits', cc: ['seizure-newonset', 'seizure-priorhxof', 'seizures'] },
  { id: 'diabetes', name: 'Diabetes', cc: ['elevatedbloodsugar-symptomatic', 'elevatedbloodsugar-nosymptoms', 'decreasedbloodsugar-symptomatic', 'hyperglycemia'] },
  { id: 'urinary', name: 'Urinary problems', cc: ['dysuria', 'urinarytractinfection', 'urinaryretention', 'urinaryfrequency', 'flankpain'] },
  { id: 'fever', name: 'Unwell adult — fever', cc: ['fever', 'fever-9weeksto74years', 'fever-75yearsorolder', 'feverimmunocompromised', 'chills', 'influenza', 'uri', 'coldlikesymptoms', 'cough', 'sorethroat', 'nasalcongestion', 'sinusproblem'] },
  { id: 'wounds', name: 'Wounds', cc: ['laceration', 'extremitylaceration', 'woundcheck', 'woundinfection', 'woundre-evaluation', 'suture/stapleremoval', 'burn', 'animalbite', 'insectbite', 'post-opproblem'] },
  { id: 'skin', name: 'Rashes', cc: ['rash', 'cellulitis', 'follow-upcellulitis', 'abscess', 'skinproblem', 'skinirritation', 'cyst', 'allergicreaction', 'facialswelling', 'oralswelling'] },
  { id: 'eye', name: 'Eye problems', cc: ['eyeproblem', 'eyepain', 'eyeredness', 'eyeinjury', 'conjunctivitis', 'foreignbodyineye', 'blurredvision'] },
  { id: 'ent', name: 'Ear problems', cc: ['earpain', 'otalgia', 'earproblem', 'dentalpain', 'jawpain', 'swallowedforeignbody'] },
  { id: 'gu', name: 'Genitourinary problems', cc: ['femaleguproblem', 'maleguproblem', 'vaginalbleeding', 'vaginaldischarge', 'vaginalpain', 'pelvicpain', 'testiclepain', 'groinpain', 'abdominalpainpregnant', 'breastpain', 'stdcheck', 'exposuretostd'] },
  { id: 'dizzy', name: 'Dizziness', cc: ['dizziness'] },
  { id: 'other', name: 'Unwell adult — unspecified', cc: ['other', 'pain', 'mass', 'medicationrefill', 'medicationproblem', 'bodyfluidexposure', 'bleeding/bruising', 'sicklecellpain', 'tickremoval'] },
];

export const ARRIVAL_MODES = [
  'ambulance',
  'Car',
  'Walk-in',
  'Wheelchair',
  'Public Transportation',
  'Police',
  'Other',
];

export const AVPU = [
  { key: 'A', label: 'Alert' },
  { key: 'V', label: 'Responds to voice' },
  { key: 'P', label: 'Responds to pain' },
  { key: 'U', label: 'Unresponsive' },
];

function num(x) {
  const n = parseFloat(x);
  return Number.isFinite(n) ? n : NaN;
}

function between(x, lo, hi) {
  const n = num(x);
  return Number.isFinite(n) && n >= lo && n <= hi;
}
