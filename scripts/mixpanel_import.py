"""Send data/events.ndjson to Mixpanel's /import API (batches of 2,000, gzip).

Use a SEPARATE Mixpanel project for simulated data, so it never mixes with real tracking.
Credentials come from environment variables, never from the code:
  MIXPANEL_PROJECT_ID, MIXPANEL_SA_USERNAME, MIXPANEL_SA_SECRET  (service account, Admin/Owner role)
  MIXPANEL_REGION=api  (or api-eu for EU data residency)
Run with --send to actually upload; without it the script only validates and counts.
"""
import base64, gzip, json, os, sys, time, urllib.request

path = os.path.join(os.path.dirname(__file__), "..", "data", "events.ndjson")
rows = [json.loads(l) for l in open(path)]
batches = [rows[i:i + 2000] for i in range(0, len(rows), 2000)]
print(f"{len(rows)} events in {len(batches)} batches")
if "--send" not in sys.argv:
    print("Dry run. Add --send to upload."); sys.exit()

pid, user, secret = (os.environ[k] for k in ("MIXPANEL_PROJECT_ID", "MIXPANEL_SA_USERNAME", "MIXPANEL_SA_SECRET"))
url = f"https://{os.environ.get('MIXPANEL_REGION', 'api')}.mixpanel.com/import?strict=1&project_id={pid}"
auth = base64.b64encode(f"{user}:{secret}".encode()).decode()
for n, b in enumerate(batches, 1):
    body = gzip.compress("\n".join(json.dumps(e) for e in b).encode())
    req = urllib.request.Request(url, data=body, method="POST", headers={
        "Authorization": f"Basic {auth}", "Content-Type": "application/x-ndjson", "Content-Encoding": "gzip"})
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req) as r:
                print(f"batch {n}/{len(batches)}: {r.status} {r.read()[:80]}"); break
        except urllib.error.HTTPError as e:
            if e.code in (429, 502, 503): time.sleep(2 ** attempt); continue
            print(f"batch {n}: {e.code} {e.read()[:300]}"); raise
