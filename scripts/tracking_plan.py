"""Tracking plan as code.

  python3 scripts/tracking_plan.py render                 -> analytics/TRACKING_PLAN.md + analytics/tracking_plan.csv
  python3 scripts/tracking_plan.py validate events.ndjson -> schema check of an event export (unknown events,
                                                             missing required props, enum mismatches, PII)
The JSON in analytics/tracking_plan.json is the single source of truth: the app, the simulation and the
Mixpanel Lexicon descriptions are all checked against it.
"""
import csv, json, re, sys
from collections import Counter, defaultdict

PLAN_PATH = "analytics/tracking_plan.json"
PLAN = json.load(open(PLAN_PATH))
EVENTS = {e["event"]: e for e in PLAN["events"]}
AUTO = {"time", "distinct_id", "$insert_id", "$user_id", "$device_id", "$os", "$browser", "mp_country_code", "$city", "$region",
        "token", "simulated", "sim_version", "$source", "mp_lib"}
PII = re.compile(r"[^@\s]+@[^@\s]+\.[a-z]{2,}|\+\d[\d \-]{8,}\d", re.I)


def render():
    rows = []
    for e in PLAN["events"]:
        props = "; ".join(f'{k} ({v["type"]}{"" if v["required"] else ", optional"}{": " + "|".join(v["enum"]) if v.get("enum") else ""})'
                          for k, v in e["properties"].items())
        rows.append([e["category"], e["event"], e["source"], e["status"], e["owner"], e["trigger"], props, e["notes"]])
    with open("analytics/tracking_plan.csv", "w", newline="") as f:
        w = csv.writer(f); w.writerow(["category", "event", "source", "status", "owner", "trigger", "properties", "notes"]); w.writerows(rows)
    out = [f"# Tracking plan v{PLAN['version']}", "", "Generated from `analytics/tracking_plan.json` by `scripts/tracking_plan.py render`. Do not edit by hand.", "",
           f"**Convention:** {PLAN['convention']}.", "",
           "**Sources:** `web` = browser funnel, `server` = Stripe webhook and API routes (source of truth for money and safety), `app` = mobile app after purchase.", "",
           "**Status:** `live` = implemented in this build (server events need the Stripe webhook configured), `spec` = specified for the mobile app, present only in simulated data, `deprecated` = still firing for one release, then hidden in Lexicon.", ""]
    cat = None
    for e in sorted(PLAN["events"], key=lambda x: (x["category"], x["event"])):
        if e["category"] != cat:
            cat = e["category"]; out += ["", f"## {cat}", "", "| Event | Source | Status | Trigger | Properties |", "|---|---|---|---|---|"]
        props = "<br>".join(f'`{k}` {v["type"]}{"" if v["required"] else "?"}' + (f' ({", ".join(v["enum"])})' if v.get("enum") else "") for k, v in e["properties"].items()) or "—"
        note = f'<br><i>{e["notes"]}</i>' if e["notes"] else ""
        out.append(f'| `{e["event"]}` | {e["source"]} | {e["status"]} | {e["trigger"]}{note} | {props} |')
    for title, key in [("Super properties (on every event)", "super_properties"), ("User profile properties", "profile_properties")]:
        out += ["", f"## {title}", "", "| Property | Type | Required | Description |", "|---|---|---|---|"]
        for k, v in PLAN[key].items():
            out.append(f'| `{k}` | {v["type"]}{" (" + ", ".join(v["enum"]) + ")" if v.get("enum") else ""} | {"yes" if v["required"] else "no"} | {v["description"]} |')
    open("analytics/TRACKING_PLAN.md", "w").write("\n".join(out) + "\n")
    print(f"rendered {len(rows)} events")


def check_value(spec, val):
    t = spec["type"]
    if t == "number": return isinstance(val, (int, float)) and not isinstance(val, bool)
    if t == "boolean": return isinstance(val, bool)
    if t == "enum": return str(val) in spec["enum"]
    return isinstance(val, (str, int, float)) and not isinstance(val, bool)


def validate(path, limit=None):
    issues = Counter(); examples = defaultdict(list); n = 0; seen = Counter()
    sup = PLAN["super_properties"]
    for line in open(path):
        if limit and n >= limit: break
        d = json.loads(line); n += 1
        name, props = d["event"], d["properties"]; seen[name] += 1
        spec = EVENTS.get(name)
        if not spec and name.startswith("$"): continue   # SDK system events ($identify, $mp_web_page_view)
        if not spec: issues[f"unknown event: {name}"] += 1; continue
        if spec["status"] == "deprecated": issues[f"deprecated event still firing: {name}"] += 1
        allowed = set(spec["properties"]) | set(sup) | AUTO
        for k, v in spec["properties"].items():
            if k not in props:
                if v["required"]: issues[f"{name}: missing required '{k}'"] += 1
            elif not check_value(v, props[k]):
                issues[f"{name}: bad value for '{k}'"] += 1
                if len(examples[f"{name}.{k}"]) < 3: examples[f"{name}.{k}"].append(props[k])
        for k, v in sup.items():
            if v["required"] and k not in props: issues[f"missing super property '{k}'"] += 1
        for k in props:
            if k not in allowed and not k.startswith(("$", "mp_")): issues[f"{name}: undocumented property '{k}'"] += 1
            if k not in AUTO and not k.startswith(("$", "mp_")) and isinstance(props[k], str) and PII.search(props[k]): issues[f"{name}: possible PII in '{k}'"] += 1
    print(f"checked {n:,} events, {len(seen)} event types")
    if not issues: print("OK: matches the tracking plan"); return 0
    for k, c in issues.most_common(): print(f"{c:>9,}  {k}")
    for k, v in examples.items(): print("   e.g.", k, v)
    missing = [e for e in EVENTS if EVENTS[e]["status"] == "live" and e not in seen]
    if missing: print("live events never seen:", ", ".join(missing))
    return 1


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "render"
    if cmd == "render": render()
    else: sys.exit(validate(sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else None))
