#!/usr/bin/env python3
"""Compile reviewed 2025 protest-demand counts from the pinned CCC v18 CSV.
Usage: python3 scripts/compile_protests.py /path/to/ccc-phase3-public.csv
Download URL and hashes: data/protest-provenance.json. Standard library only.
"""
import argparse
import csv
import hashlib
import json
import math
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STATES = set('AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split())
CATEGORIES = [
    ('epstein', 'Epstein files / accountability'),
    ('gaza', 'Gaza / Palestinian solidarity'),
    ('racial', 'Racial justice / police accountability'),
    ('abortion', 'Abortion / reproductive rights'),
    ('climate', 'Climate action'),
    ('immigrant', 'Immigrant rights / anti-deportation'),
    ('ukraine', 'Ukraine solidarity'),
]


def in_scope(row):
    return ('2025-01-01' <= row['date'] <= '2025-12-31'
            and row['state'] in STATES and row['online'] == '0')


def load_vocabulary():
    result = {}
    with (ROOT / 'data/protest-coding.csv').open(encoding='utf-8', newline='') as f:
        for item in csv.DictReader(f):
            if item['include'] == '1':
                result.setdefault(item['clause'], set()).add(item['category'])
    return result


def classify(claims, vocabulary):
    result = {}
    for clause in sorted(set(c.strip() for c in claims.split(';'))):
        for category in sorted(vocabulary.get(clause, ())):
            result.setdefault(category, []).append(clause)
    return result


def compile_data(source):
    provenance = json.loads((ROOT / 'data/protest-provenance.json').read_text())
    raw = source.read_bytes()
    if hashlib.sha256(raw).hexdigest() != provenance['source_sha256']:
        raise ValueError('Source hash differs from reviewed CCC v18: re-review before compiling.')
    vocabulary = load_vocabulary()
    events, seen, eligible, duplicate_count = [], set(), 0, 0
    with source.open(encoding='utf-8-sig', newline='') as f:
        for number, row in enumerate(csv.DictReader(f), 2):
            if not in_scope(row):
                continue
            key = tuple(row.items())
            if key in seen:
                duplicate_count += 1
                continue
            seen.add(key)
            eligible += 1
            for category, clauses in classify(row['claims_summary'], vocabulary).items():
                events.append(dict(source_row=number, date=row['date'], locality=row['locality'],
                                   state=row['state'], category=category, matched_claims='; '.join(clauses),
                                   macroevent=row['macroevent'], repeater=row['repeater'],
                                   source1=row['source1'], source2=row['source2']))
    events.sort(key=lambda e: (e['date'], e['source_row'], e['category']))
    counts = Counter(e['category'] for e in events)
    summary = dict(period=['2025-01-01', '2025-12-31'], geography='50 US states and Washington, DC',
                   unit='Recorded in-person protest event-days with matching coded demands',
                   eligible_records=eligible, exact_duplicates_removed=duplicate_count,
                   unique_matched_records=len({e['source_row'] for e in events}),
                   category_memberships=len(events),
                   epstein_august_2=sum(e['category']=='epstein' and e['date']=='2025-08-02' for e in events),
                   epstein_coverup_claim=sum(e['category']=='epstein' and 'against covering up the Epstein files' in e['matched_claims'] for e in events),
                   categories=[dict(id=k, label=label, count=counts[k]) for k, label in CATEGORIES],
                   axis_max=math.ceil(max(counts.values()) / 2000) * 2000,
                   source=provenance)
    with (ROOT / 'data/protest-events.csv').open('w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['source_row','date','locality','state','category',
                                              'matched_claims','macroevent','repeater','source1','source2'])
        writer.writeheader()
        writer.writerows(events)
    (ROOT / 'data/protests.json').write_text(json.dumps(summary, indent=2, ensure_ascii=False)+'\n')
    print(json.dumps(summary, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    compile_data(parser.parse_args().source)
