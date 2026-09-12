"""Merge all scraped/downloaded sources into one probability question bank.

Run:  python3 data/build_probability_bank.py
Out:  data/probability_bank.json  (list of records, unified schema)

Record schema
  id            unique string
  source        quantprof | quantprof_youtube | aops_wiki | MATH | AIME | AIMO_AMC | AIMO_AIME
  title         short title (may be null)
  statement     problem text (LaTeX kept as $...$)
  answer        final answer if known (string) else null
  solution      worked solution text if known else null
  difficulty    1-10 (quantprof) / 1-5 (MATH level) / null
  tags          list of strings (topic, contest, firms...)
  url           source url
  extra         source-specific leftovers
"""
import json, os, re, glob
from collections import Counter

RAW = os.path.join(os.path.dirname(os.path.abspath(__file__)), "raw")
KW = re.compile(r"probab|expected value|expectation|expected number|random|chance|dice|\bdie\b|coin|urn|shuffle|deck of cards|at random|odds|lottery|gambl", re.I)

def load(p, default=None):
    p = os.path.join(RAW, p)
    if not os.path.exists(p):
        return default
    d = json.load(open(p))
    if isinstance(d, str):
        d = json.loads(d)
    return d

def boxed(s):
    if not s:
        return None
    m = re.findall(r"\\boxed\{((?:[^{}]|\{[^{}]*\})*)\}", s)
    return m[-1].strip() if m else None

bank = []

# ---------------- quantprof.org ----------------
# Prefer the full scrape (statements + hints + solutions); fall back to the first 61.
qp = load("quantprof_problems_full.json") or load("quantprof_problems.json", [])
ql = load("quantprof_list.json", [])
topic_by_title = {r["title"].strip().lower(): (r["badges"][0].lower() if r.get("badges") else None) for r in ql}
for p in qp:
    if p.get("topic"):
        topic_by_title[p["title"].strip().lower()] = p["topic"].lower()
yt = load("youtube/quantprof_youtube.json", [])
yt_by_title = {}
for v in yt:
    t = v["title"].split("|")[-1].strip().lower() if "|" in v["title"] else v["title"].strip().lower()
    yt_by_title[t] = v
used_videos = set()
for p in qp:
    t = p["title"].strip()
    vid = yt_by_title.get(t.lower())
    if vid:
        used_videos.add(vid["id"])
    topic = topic_by_title.get(t.lower())
    site_solution = (p.get("solution") or "").strip() or None
    hints = [h["text"] for h in p.get("hints", []) if h.get("text")]
    video = next((l for l in p.get("links", []) if "youtu" in l), None) or (vid["url"] if vid else None)
    bank.append({
        "id": f"quantprof:{p['id']}",
        "source": "quantprof",
        "title": t,
        "statement": p["statement"].strip(),
        "answer": None,
        "solution": site_solution or (vid["transcript"] if vid else None),
        "difficulty": int(p["level"]) if p.get("level") else None,
        "tags": [x for x in [topic] if x] + [f"asked_in:{f}" for f in p.get("firms", [])],
        "url": p["url"],
        "extra": {"answer_format": (p.get("inputs") or [None])[0], "video_url": video,
                  "hints": hints, "solution_source": "site" if site_solution else ("youtube_transcript" if vid else None),
                  "video_transcript": vid["transcript"] if (vid and site_solution) else None},
    })

# ---------------- QuantProf YouTube videos not matched above ----------------
for v in yt:
    if v["id"] in used_videos or not v.get("transcript"):
        continue
    bank.append({
        "id": f"quantprof_youtube:{v['id']}",
        "source": "quantprof_youtube",
        "title": v["title"],
        "statement": None,  # statement is inside the transcript; extract downstream
        "answer": None,
        "solution": v["transcript"],
        "difficulty": None,
        "tags": ["quant_interview"],
        "url": v["url"],
        "extra": {"description": v.get("description", "")[:500], "duration": v.get("duration"),
                  "thumbnail": f"raw/youtube/thumbs/{v['id']}.jpg"},
    })

# ---------------- AoPS wiki probability categories ----------------
for r in load("aops_probability.json", []) or []:
    if r.get("err") or not r.get("sections"):
        continue
    secs = r["sections"]
    prob_key = next((k for k in secs if k.lower().startswith("problem")), None)
    if not prob_key:
        continue
    sols = [v for k, v in secs.items() if k.lower().startswith("solution") and v.strip()]
    contest = re.sub(r" Problems/Problem \d+.*", "", r["title"])
    bank.append({
        "id": f"aops:{r['title']}",
        "source": "aops_wiki",
        "title": r["title"],
        "statement": secs[prob_key].strip(),
        "answer": boxed(sols[0]) if sols else None,
        "solution": "\n\n---\n\n".join(sols) if sols else None,
        "difficulty": 2 if "Introductory" in r["cat"] else 4,
        "tags": ["probability", contest, r["cat"].replace("_", " ")],
        "url": r.get("url") or r.get("href"),
        "extra": {},
    })

# ---------------- MATH dataset, counting & probability subject ----------------
for i, r in enumerate(load("amc/math_counting_probability.json", []) or []):
    if not KW.search(r["problem"]):
        continue
    lvl = re.sub(r"\D", "", r.get("level", "")) or None
    bank.append({
        "id": f"MATH:cp:{r['split']}:{i}",
        "source": "MATH",
        "title": None,
        "statement": r["problem"].strip(),
        "answer": boxed(r.get("solution")),
        "solution": r.get("solution"),
        "difficulty": int(lvl) if lvl else None,
        "tags": ["probability", "counting_and_probability", "AMC/AIME-derived"],
        "url": "https://huggingface.co/datasets/EleutherAI/hendrycks_math",
        "extra": {"split": r["split"]},
    })

# ---------------- AIME 1983-2024 ----------------
for r in load("amc/aime_1983_2024.json", []) or []:
    if not KW.search(r["Question"]):
        continue
    bank.append({
        "id": f"AIME:{r['Year']}:{r.get('Part') or ''}:{r['Problem Number']}",
        "source": "AIME",
        "title": f"{r['Year']} AIME {r.get('Part') or ''} Problem {r['Problem Number']}".replace("  ", " "),
        "statement": r["Question"].strip(),
        "answer": str(r["Answer"]),
        "solution": None,
        "difficulty": 4,
        "tags": ["probability", "AIME", str(r["Year"])],
        "url": "https://huggingface.co/datasets/di-zhang-fdu/AIME_1983_2024",
        "extra": {},
    })

# ---------------- AIMO validation AMC / AIME ----------------
for name, src in [("amc/aimo_amc.json", "AIMO_AMC"), ("amc/aimo_aime.json", "AIMO_AIME")]:
    for r in load(name, []) or []:
        if not KW.search(r["problem"]):
            continue
        bank.append({
            "id": f"{src}:{r['id']}",
            "source": src,
            "title": None,
            "statement": r["problem"].strip(),
            "answer": str(r.get("answer")),
            "solution": r.get("solution"),
            "difficulty": 3 if src == "AIMO_AMC" else 4,
            "tags": ["probability", "AMC" if src == "AIMO_AMC" else "AIME"],
            "url": r.get("url"),
            "extra": {},
        })

out = os.path.join(os.path.dirname(RAW), "probability_bank.json")
json.dump(bank, open(out, "w"), indent=1, ensure_ascii=False)
c = Counter(r["source"] for r in bank)
print(f"wrote {len(bank)} records -> {out}")
for k, v in c.most_common():
    print(f"  {k:18s} {v:5d}   with_answer={sum(1 for r in bank if r['source']==k and r['answer'])}  with_solution={sum(1 for r in bank if r['source']==k and r['solution'])}")
