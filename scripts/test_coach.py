"""Run the coach-chat test set against the live /api/coach endpoint and save results as JSON."""
import json, sys, time, urllib.request

URL = (sys.argv[1] if len(sys.argv) > 1 else "https://ascend-demo-funnel.vercel.app") + "/api/coach"
CASES = [
    ("theo", "work", "Too many client emails and a report due Friday"),
    ("theo", "family", "My mom is sick, kids have exams and I haven't started the tax forms"),
    ("theo", "work", "3 meetings tomorrow and I haven't prepared any"),
    ("theo", "home", "the flat is a mess, laundry everywhere, fridge empty"),
    ("theo", "money", "rent is due, I need to call the bank and sort my budget"),
    ("theo", "study", "exam on Monday, essay due Wednesday, I work weekends"),
    ("theo", "work", "idk everything"),
    ("theo", "health", "I want to start going to the gym but never find time"),
    ("theo", "family", "my partner and I keep fighting about chores and I'm behind at work"),
    ("theo", "work", "launching a product next week, bugs, investors want an update"),
    ("nora", "work", "I feel like I'm failing at everything and can't start"),
    ("ines", "home", "moving flats Saturday, work deadline Friday, sister's birthday Sunday"),
    ("max", "work", "I keep postponing my portfolio for 3 weeks"),
    ("theo", "work", "asdfgh"),
    ("theo", "family", "dad in hospital, I have to cover his shop and my own job"),
]

rows = []
for coach, pile, msg in CASES:
    body = json.dumps({"coachId": coach, "turn": 2, "pile": [pile], "message": msg, "chatMode": "llm"}).encode()
    req = urllib.request.Request(URL, data=body, headers={"Content-Type": "application/json"})
    t = time.time()
    try:
        r = json.loads(urllib.request.urlopen(req, timeout=15).read())
    except Exception as e:
        r = {"text": "", "mode": "error", "reason": str(e)}
    rows.append({"coach": coach, "pile": pile, "message": msg, "reply": r.get("text"), "mode": r.get("mode"),
                 "reason": r.get("reason"), "sec": round(time.time() - t, 2),
                 "words": len((r.get("text") or "").split())})
    print(f"[{rows[-1]['mode']:8}] {rows[-1]['sec']:>4}s {coach}: {msg}\n    -> {rows[-1]['reply']}")
json.dump(rows, open(sys.argv[2] if len(sys.argv) > 2 else "coach_tests.json", "w"), indent=1, ensure_ascii=False)
