"""
Streaming parser for R's XDR serialization (RData / RDX2).
Extracts data.frame schema: column names, types, factor levels, samples.
Never holds the full 3.9GB payload in memory.
"""
import gzip, struct, json, sys
from collections import Counter

NILVALUE, GLOBALENV, UNBOUNDVALUE, MISSINGARG = 254, 253, 252, 251
BASENAMESPACE, NAMESPACE, PACKAGE, PERSIST = 250, 249, 248, 247
CLASSREF, GENERICREF, BCREPDEF, BCREPREF = 246, 245, 244, 243
EMPTYENV, BASEENV, ATTRLANG, ATTRLIST, ALTREP = 242, 241, 240, 239, 238
REFSXP = 255

SAMPLE_N = 400          # values kept per column
MAX_UNIQ = 2000         # cap on unique-value tracking


class Reader:
    def __init__(self, fh):
        self.fh = fh
        self.pos = 0

    def raw(self, n):
        b = self.fh.read(n)
        if len(b) != n:
            raise EOFError(f"wanted {n} got {len(b)} at {self.pos}")
        self.pos += n
        return b

    def skip(self, n):
        # read in chunks so we never allocate huge buffers
        left = n
        while left:
            c = self.fh.read(min(left, 1 << 22))
            if not c:
                raise EOFError("eof while skipping")
            left -= len(c)
        self.pos += n

    def i32(self):
        return struct.unpack(">i", self.raw(4))[0]

    def f64(self):
        return struct.unpack(">d", self.raw(8))[0]


class RDataScanner:
    def __init__(self, r):
        self.r = r
        self.refs = []

    def length(self):
        n = self.r.i32()
        if n == -1:                       # long vector
            hi, lo = self.r.i32(), self.r.i32()
            return (hi << 32) | lo
        return n

    def charsxp(self):
        flags = self.r.i32()
        n = self.r.i32()
        if n == -1:
            return None
        b = self.r.raw(n)
        try:
            return b.decode("utf-8")
        except UnicodeDecodeError:
            return b.decode("latin-1")

    def item(self, want_data=True, depth=0):
        flags = self.r.i32()
        t = flags & 0xFF
        has_attr = bool((flags >> 9) & 1)
        has_tag = bool((flags >> 10) & 1)

        if t == NILVALUE:
            return None
        if t == REFSXP:
            idx = flags >> 8
            if idx == 0:
                idx = self.r.i32()
            return self.refs[idx - 1]
        if t in (GLOBALENV, UNBOUNDVALUE, MISSINGARG, BASEENV, EMPTYENV):
            return {"__special__": t}
        if t == 1:                                    # SYMSXP
            name = self.item(want_data, depth + 1)
            self.refs.append(name)
            return name
        if t == ALTREP:
            info = self.item(False, depth + 1)
            state = self.item(True, depth + 1)
            self.item(False, depth + 1)               # attributes
            return {"__altrep__": info, "state": state}
        if t in (2, 6, 17, 239, 240):                 # pairlist-ish
            attr = self.item(False, depth + 1) if has_attr else None
            tag = self.item(False, depth + 1) if has_tag else None
            car = self.item(want_data, depth + 1)
            cdr = self.item(want_data, depth + 1)
            out = {}
            if isinstance(cdr, dict):
                out.update(cdr)
            out[tag if isinstance(tag, str) else f"_{depth}"] = car
            return out
        if t == 9:                                    # CHARSXP (shouldn't reach)
            n = self.r.i32()
            return self.r.raw(n).decode("utf-8", "replace")

        # ---- vectors -------------------------------------------------
        if t in (10, 13):                             # LGLSXP / INTSXP
            n = self.length()
            vals = None
            if want_data:
                k = min(n, SAMPLE_N)
                vals = list(struct.unpack(f">{k}i", self.r.raw(4 * k)))
                self.r.skip(4 * (n - k))
            else:
                self.r.skip(4 * n)
            node = {"type": "int" if t == 13 else "lgl", "n": n, "sample": vals}
        elif t == 14:                                 # REALSXP
            n = self.length()
            vals = None
            if want_data:
                k = min(n, SAMPLE_N)
                vals = list(struct.unpack(f">{k}d", self.r.raw(8 * k)))
                self.r.skip(8 * (n - k))
            else:
                self.r.skip(8 * n)
            node = {"type": "num", "n": n, "sample": vals}
        elif t == 16:                                 # STRSXP
            n = self.length()
            keep, uniq = [], Counter()
            strkeep = n if n <= 20000 else SAMPLE_N
            for i in range(n):
                s = self.charsxp()
                if i < strkeep:
                    keep.append(s)
                if len(uniq) < MAX_UNIQ:
                    uniq[s] += 1
            node = {"type": "str", "n": n, "sample": keep,
                    "uniq_capped": dict(uniq.most_common(40)),
                    "n_uniq_atleast": len(uniq)}
        elif t in (19, 20):                           # VECSXP / EXPRSXP
            n = self.length()
            kids = [self.item(want_data, depth + 1) for _ in range(n)]
            node = {"type": "list", "n": n, "items": kids}
        else:
            raise ValueError(f"unhandled SEXP type {t} (flags {flags:#x}) at {self.r.pos}")

        if has_attr:
            node["attr"] = self.item(True, depth + 1)
        return node


def flatten_attr(a):
    if not isinstance(a, dict):
        return {}
    return a


def main(path, out):
    with gzip.open(path, "rb") as fh:
        r = Reader(fh)
        hdr = r.raw(7)                             # "RDX2\nX\n"
        assert hdr.startswith(b"RDX"), hdr
        for _ in range(3):
            r.i32()                                # serialization + R versions
        sc = RDataScanner(r)
        # top level is a pairlist of name -> object
        flags = r.i32()
        t = flags & 0xFF
        assert t == 2, t
        has_attr, has_tag = bool((flags >> 9) & 1), bool((flags >> 10) & 1)
        if has_attr:
            sc.item(False)
        objname = sc.item(False) if has_tag else "?"
        print(f"object name: {objname}", flush=True)
        obj = sc.item(True)

    cols = obj["items"]
    attr = flatten_attr(obj.get("attr"))
    names_node = attr.get("names")
    colnames = names_node["sample"] if names_node else []
    rowcount = cols[0]["n"] if cols else 0

    schema = []
    for i, c in enumerate(cols):
        nm = colnames[i] if i < len(colnames) else f"V{i}"
        a = flatten_attr(c.get("attr"))
        lv = a.get("levels")
        cls = a.get("class")
        entry = {
            "name": nm,
            "rtype": c["type"],
            "n": c["n"],
            "class": cls["sample"] if cls else None,
            "levels": lv["sample"] if lv else None,
            "sample": c.get("sample")[:12] if c.get("sample") else None,
        }
        if c["type"] == "str":
            entry["top_values"] = c.get("uniq_capped")
            entry["n_uniq_atleast"] = c.get("n_uniq_atleast")
        schema.append(entry)

    with open(out, "w") as f:
        json.dump({"object": objname, "nrow": rowcount,
                   "ncol": len(cols), "columns": schema}, f)
    print(f"rows={rowcount} cols={len(cols)} -> {out}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
