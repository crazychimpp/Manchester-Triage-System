"""
Pass B: stream the RData again, materialise only the columns we care about,
and compute the statistics the triage UI will be calibrated against.
"""
import gzip, struct, json
import numpy as np

SCHEMA = json.load(open("/home/claude/schema.json"))
NAMES = [c["name"] for c in SCHEMA["columns"]]
NROW = SCHEMA["nrow"]

WANT = {}
for nm in ["esi", "age", "gender", "disposition", "arrivalmode", "dep_name",
           "insurance_status", "previousdispo", "n_edvisits", "n_admissions",
           "triage_vital_hr", "triage_vital_sbp", "triage_vital_dbp",
           "triage_vital_rr", "triage_vital_o2", "triage_vital_temp",
           "triage_vital_o2_device"]:
    WANT[NAMES.index(nm)] = nm
CC_IDX = {i: n for i, n in enumerate(NAMES) if n.startswith("cc_")}

REFS = []


class R:
    def __init__(s, fh): s.fh = fh
    def raw(s, n):
        b = s.fh.read(n)
        while len(b) < n:
            c = s.fh.read(n - len(b))
            if not c: raise EOFError
            b += c
        return b
    def skip(s, n):
        left = n
        while left:
            c = s.fh.read(min(left, 1 << 22))
            if not c: raise EOFError
            left -= len(c)
    def i32(s): return struct.unpack(">i", s.raw(4))[0]


def read_charsxp(r):
    r.i32(); n = r.i32()
    if n == -1: return None
    return r.raw(n).decode("utf-8", "replace")


def skip_item(r, refs):
    """Skip an arbitrary SEXP (used for attributes we don't need)."""
    flags = r.i32(); t = flags & 0xFF
    ha, ht = bool((flags >> 9) & 1), bool((flags >> 10) & 1)
    if t == 254: return None
    if t == 255:
        idx = flags >> 8
        if idx == 0: r.i32()
        return None
    if t in (253, 252, 251, 241, 242): return None
    if t == 1:
        v = read_charsxp(r); refs.append(v); return v
    if t in (2, 6, 17, 239, 240):
        if ha: skip_item(r, refs)
        if ht: skip_item(r, refs)
        skip_item(r, refs); skip_item(r, refs); return None
    if t == 238:
        skip_item(r, refs); skip_item(r, refs); skip_item(r, refs); return None
    n = r.i32()
    if n == -1: n = (r.i32() << 32) | r.i32()
    if t in (10, 13): r.skip(4 * n)
    elif t == 14: r.skip(8 * n)
    elif t == 16:
        for _ in range(n): read_charsxp(r)
    elif t in (19, 20):
        for _ in range(n): skip_item(r, refs)
    if ha: skip_item(r, refs)
    return None


def read_column(r, refs, keep):
    """Read one data-frame column; return (numpy array or None, levels)."""
    flags = r.i32(); t = flags & 0xFF
    ha = bool((flags >> 9) & 1)
    n = r.i32()
    if n == -1: n = (r.i32() << 32) | r.i32()
    arr = None
    if t in (10, 13):
        if keep:
            arr = np.frombuffer(r.raw(4 * n), dtype=">i4").astype(np.int32)
        else:
            r.skip(4 * n)
    elif t == 14:
        if keep:
            arr = np.frombuffer(r.raw(8 * n), dtype=">f8").astype(np.float64)
        else:
            r.skip(8 * n)
    else:
        raise ValueError(f"unexpected column type {t}")
    levels = None
    if ha:
        # attributes come as a tagged pairlist: levels / class
        levels = read_attrs(r, refs)
    return arr, levels


def read_attrs(r, refs):
    """Walk the attribute pairlist, capture a 'levels' STRSXP if present."""
    out = {}
    while True:
        flags = r.i32(); t = flags & 0xFF
        if t == 254: return out.get("levels")
        ha, ht = bool((flags >> 9) & 1), bool((flags >> 10) & 1)
        if t != 2: raise ValueError(f"attr not pairlist: {t}")
        if ha: skip_item(r, refs)
        tag = None
        if ht:
            f2 = r.i32(); t2 = f2 & 0xFF
            if t2 == 1:
                tag = read_charsxp(r); refs.append(tag)
            elif t2 == 255:
                idx = f2 >> 8
                if idx == 0: idx = r.i32()
                tag = refs[idx - 1]
        # CAR
        if tag == "levels":
            f3 = r.i32()
            n3 = r.i32()
            out["levels"] = [read_charsxp(r) for _ in range(n3)]
        else:
            skip_item(r, refs)
        # CDR continues the loop


def main():
    stats = {"nrow": NROW}
    cols = {}
    cc_rows = []
    with gzip.open("/mnt/user-data/uploads/5v_cleandf.rdata", "rb") as fh:
        r = R(fh)
        r.raw(7)
        for _ in range(3): r.i32()
        refs = []
        flags = r.i32()                       # top-level pairlist
        if (flags >> 10) & 1:
            f2 = r.i32(); refs.append(read_charsxp(r))   # SYMSXP "df" -> ref #1
        lf = r.i32()                          # VECSXP flags
        ncol = r.i32()
        disp = None
        for i in range(ncol):
            keep = (i in WANT) or (i in CC_IDX)
            arr, levels = read_column(r, refs, keep)
            if i in WANT:
                cols[WANT[i]] = (arr, levels)
                if WANT[i] == "disposition":
                    disp = (arr == 1)          # level 1 = 'Admit'
            elif i in CC_IDX and disp is not None:
                m = arr > 0
                cc_rows.append({"cc": CC_IDX[i][3:], "n": int(m.sum()),
                                "admit": int((m & disp).sum())})
            del arr
    return stats, cols, cc_rows


if __name__ == "__main__":
    stats, cols, cc_rows = main()

    esi, esi_lv = cols["esi"]
    dispo, dispo_lv = cols["disposition"]
    admit = dispo == 1
    print("esi levels", esi_lv, "dispo levels", dispo_lv)

    out = {"nrow": NROW, "esi_levels": esi_lv, "by_esi": {}, "cc": [], "vitals": {}}

    for k in range(1, 6):
        m = esi == k
        if m.sum() == 0: continue
        d = {"n": int(m.sum()), "admit_rate": float(admit[m].mean())}
        for v in ["triage_vital_hr", "triage_vital_sbp", "triage_vital_dbp",
                  "triage_vital_rr", "triage_vital_o2", "triage_vital_temp", "age"]:
            a = cols[v][0][m].astype(float)
            a = a[np.isfinite(a)]
            if len(a):
                d[v] = {"median": round(float(np.median(a)), 1),
                        "p10": round(float(np.percentile(a, 10)), 1),
                        "p90": round(float(np.percentile(a, 90)), 1)}
        out["by_esi"][str(k)] = d

    for v in ["triage_vital_hr", "triage_vital_sbp", "triage_vital_dbp",
              "triage_vital_rr", "triage_vital_o2", "triage_vital_temp", "age"]:
        a = cols[v][0].astype(float); a = a[np.isfinite(a)]
        out["vitals"][v] = {"n": int(len(a)),
                            "median": round(float(np.median(a)), 1),
                            "p05": round(float(np.percentile(a, 5)), 1),
                            "p95": round(float(np.percentile(a, 95)), 1)}

    cc_rows.sort(key=lambda x: -x["n"])
    out["cc"] = [{**c, "admit_rate": round(c["admit"] / max(c["n"], 1), 4)}
                 for c in cc_rows]

    am, am_lv = cols["arrivalmode"]
    out["arrivalmode"] = {lv: {"n": int((am == i + 1).sum()),
                               "admit_rate": round(float(admit[am == i + 1].mean()), 4)}
                          for i, lv in enumerate(am_lv) if (am == i + 1).sum() > 0}
    out["overall_admit_rate"] = round(float(admit.mean()), 4)
    json.dump(out, open("/home/claude/stats.json", "w"), indent=1)
    print("overall admit", out["overall_admit_rate"])
    print(json.dumps(out["by_esi"], indent=1)[:1200])
