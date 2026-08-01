import json, numpy as np
import rdata_stats as RS

stats, cols, cc_rows = RS.main()
NROW = RS.NROW
esi = cols["esi"][0]
dispo, dispo_lv = cols["disposition"]
admit = dispo == 1
age = cols["age"][0].astype(float)

VIT = {"hr": "triage_vital_hr", "sbp": "triage_vital_sbp", "dbp": "triage_vital_dbp",
       "rr": "triage_vital_rr", "spo2": "triage_vital_o2", "tempF": "triage_vital_temp"}
PCT = [1, 5, 10, 25, 50, 75, 90, 95, 99]

out = {"n_visits": int(NROW), "base_admit": round(float(admit.mean()), 4),
       "vital_percentiles": {}, "vital_bands": {}, "age_bands": {},
       "by_priority": {}, "arrival": {}, "complaints": []}

for k, col in VIT.items():
    a = cols[col][0].astype(float)
    m = np.isfinite(a)
    out["vital_percentiles"][k] = {
        "n": int(m.sum()),
        "p": {str(p): round(float(np.percentile(a[m], p)), 1) for p in PCT},
    }

# admit rate inside each physiological band a triage discriminator would fire on
def band(name, mask):
    mask = mask & np.isfinite(mask.astype(float))
    n = int(mask.sum())
    out["vital_bands"][name] = {"n": n,
                                "admit": round(float(admit[mask].mean()), 4) if n else None}

hr = cols["triage_vital_hr"][0].astype(float)
sbp = cols["triage_vital_sbp"][0].astype(float)
rr = cols["triage_vital_rr"][0].astype(float)
spo2 = cols["triage_vital_o2"][0].astype(float)
tmp = cols["triage_vital_temp"][0].astype(float)

band("spo2_lt92", spo2 < 92)
band("spo2_92_94", (spo2 >= 92) & (spo2 <= 94))
band("spo2_ge95", spo2 >= 95)
band("rr_ge25", rr >= 25)
band("rr_21_24", (rr >= 21) & (rr < 25))
band("rr_lt9", rr < 9)
band("hr_ge130", hr >= 130)
band("hr_111_129", (hr >= 111) & (hr < 130))
band("hr_lt50", hr < 50)
band("sbp_lt90", sbp < 90)
band("sbp_90_99", (sbp >= 90) & (sbp < 100))
band("temp_ge102F", tmp >= 102)
band("temp_100_4_to_102F", (tmp >= 100.4) & (tmp < 102))
band("temp_lt96F", tmp < 96)

for lo, hi in [(0, 18), (18, 40), (40, 65), (65, 75), (75, 200)]:
    m = (age >= lo) & (age < hi)
    out["age_bands"][f"{lo}-{hi}"] = {"n": int(m.sum()),
                                      "admit": round(float(admit[m].mean()), 4)}

MTS = {1: "red", 2: "orange", 3: "yellow", 4: "green", 5: "blue"}
for k in range(1, 6):
    m = esi == k
    d = {"n": int(m.sum()), "admit": round(float(admit[m].mean()), 4)}
    for vk, col in VIT.items():
        a = cols[col][0][m].astype(float); a = a[np.isfinite(a)]
        d[vk] = {"p25": round(float(np.percentile(a, 25)), 1),
                 "p50": round(float(np.percentile(a, 50)), 1),
                 "p75": round(float(np.percentile(a, 75)), 1)}
    a = age[m]; a = a[np.isfinite(a)]
    d["age_median"] = round(float(np.median(a)), 1)
    out["by_priority"][MTS[k]] = d

am, am_lv = cols["arrivalmode"]
for i, lv in enumerate(am_lv):
    m = am == i + 1
    if m.sum() > 200:
        out["arrival"][lv] = {"n": int(m.sum()), "admit": round(float(admit[m].mean()), 4)}

cc_rows.sort(key=lambda x: -x["n"])
out["complaints"] = [{"key": c["cc"], "n": c["n"],
                      "admit": round(c["admit"] / max(c["n"], 1), 4)}
                     for c in cc_rows if c["n"] >= 60]

json.dump(out, open("/home/claude/priors.json", "w"), indent=1)
print("complaints kept:", len(out["complaints"]))
print(json.dumps(out["vital_bands"], indent=1))
