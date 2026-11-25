"""Load the v3 setup into a Mixpanel project.

  python3 scripts/mixpanel_v3.py lexicon             # event + property descriptions from analytics/tracking_plan.json
  python3 scripts/mixpanel_v3.py events [--sample N] # data/v3/events.ndjson via /import (strict, gzip, 2,000 per batch)
  python3 scripts/mixpanel_v3.py profiles            # data/v3/profiles.ndjson via /engage ($set)
Add --send to actually upload; without it every command is a dry run.

Credentials only from the environment (never in code or chat):
  MIXPANEL_PROJECT_ID, MIXPANEL_SA_USERNAME, MIXPANEL_SA_SECRET, MIXPANEL_TOKEN (for profiles), MIXPANEL_REGION=eu
Budget: the Free plan allows 1M events per month across the organisation, counted at ingestion. Check usage before
a full import; --sample 20000 is for the dev project.
"""
import base64, gzip, json, os, random, sys, time, urllib.error, urllib.request

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
CMD = sys.argv[1] if len(sys.argv) > 1 else "help"
SEND = "--send" in sys.argv
EU = "eu" in os.environ.get("MIXPANEL_REGION", "eu")
API = "https://api-eu.mixpanel.com" if EU else "https://api.mixpanel.com"
APP = "https://eu.mixpanel.com" if EU else "https://mixpanel.com"


def auth():
    u, s = os.environ["MIXPANEL_SA_USERNAME"], os.environ["MIXPANEL_SA_SECRET"]
    return "Basic " + base64.b64encode(f"{u}:{s}".encode()).decode()


def post(url, body, headers):
    for attempt in range(6):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, data=body, method="POST", headers=headers)) as r:
                return r.status, r.read()[:200]
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503): time.sleep(2 ** attempt); continue
            return e.code, e.read()[:400]
    return 0, b"gave up"


def lexicon():
    plan = json.load(open(os.path.join(ROOT, "analytics", "tracking_plan.json")))
    entries = []
    for e in plan["events"]:
        props = {k: {"type": "string" if v["type"] in ("enum", "date") else v["type"], "description": v["description"] or (", ".join(v.get("enum", [])))}
                 for k, v in e["properties"].items()}
        desc = f'{e["trigger"]}. Source: {e["source"]}. Owner: {e["owner"]}.' + (f' {e["notes"]}' if e["notes"] else "")
        entries.append({"entityType": "event", "name": e["event"], "schemaJson": {
            "description": desc[:255], "properties": props,
            "metadata": {"com.mixpanel": {"tags": [e["category"]], "hidden": e["status"] == "deprecated"}}}})
    entries.append({"entityType": "profile", "name": "$user", "schemaJson": {"description": "Quietly user (identified at the email step)", "properties": {
        k: {"type": "string" if v["type"] in ("enum", "date") else v["type"], "description": v["description"] or ", ".join(v.get("enum", []))}
        for k, v in plan["profile_properties"].items()}}})
    print(f"{len(entries)} Lexicon entries")
    if not SEND: return
    pid = os.environ["MIXPANEL_PROJECT_ID"]
    st, body = post(f"{APP}/api/app/projects/{pid}/schemas", json.dumps({"entries": entries, "truncate": False}).encode(),
                    {"Authorization": auth(), "Content-Type": "application/json"})
    print(st, body)


def batches(path, n=2000, sample=None):
    b = []
    rnd = random.Random(7)
    keep = None
    with (gzip.open(path, "rt") if path.endswith(".gz") else open(path)) as f:
        for line in f:
            if sample:  # sample whole devices, so funnels stay intact
                d = json.loads(line)["properties"].get("$device_id", "")
                if keep is None: keep = {}
                if d not in keep: keep[d] = rnd.random() < sample
                if not keep[d]: continue
            b.append(line.strip())
            if len(b) == n: yield b; b = []
    if b: yield b


def events():
    path = sys.argv[sys.argv.index("--file") + 1] if "--file" in sys.argv else os.path.join(ROOT, "data", "v3", "events.ndjson")
    opener = gzip.open if path.endswith(".gz") else open
    total = sum(1 for _ in opener(path, "rt"))
    arg = lambda k, d: type(d)(sys.argv[sys.argv.index(k) + 1]) if k in sys.argv else d
    sample_n = arg("--sample", 0)
    frac = min(1.0, sample_n / total) if sample_n else None
    print(f"{total:,} events in file" + (f", sampling ~{frac:.1%} of devices" if frac else ""))
    if not SEND: print("dry run, add --send"); return
    url = f"{API}/import?strict=1&project_id={os.environ['MIXPANEL_PROJECT_ID']}"
    h = {"Authorization": auth(), "Content-Type": "application/x-ndjson", "Content-Encoding": "gzip"}
    sent = 0
    for i, b in enumerate(batches(path, sample=frac), 1):
        st, body = post(url, gzip.compress("\n".join(b).encode()), h); sent += len(b)
        if st != 200: print("batch", i, st, body); sys.exit(1)
        if i % 25 == 0: print(f"batch {i}: {sent:,} sent")
    print(f"done: {sent:,} events")


def profiles():
    path = sys.argv[sys.argv.index("--file") + 1] if "--file" in sys.argv else os.path.join(ROOT, "data", "v3", "profiles.ndjson")
    rows = [json.loads(l) for l in open(path)]
    print(f"{len(rows):,} profiles")
    if not SEND: print("dry run, add --send"); return
    tok = os.environ["MIXPANEL_TOKEN"]
    for i in range(0, len(rows), 200):
        chunk = [{"$token": tok, "$distinct_id": r["$distinct_id"], "$ip": "0", "$set": r["$set"]} for r in rows[i:i + 200]]
        st, body = post(f"{API}/engage#profile-set", json.dumps(chunk).encode(), {"Content-Type": "application/json", "Accept": "text/plain"})
        if st != 200: print(st, body); sys.exit(1)
    print("done")


{"lexicon": lexicon, "events": events, "profiles": profiles}.get(CMD, lambda: print(__doc__))()
