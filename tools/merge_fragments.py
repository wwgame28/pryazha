# Merges chapter fragments (work/story_chN.json, work/cons_chN.json) into site/story.json and
# site/narrative/consequences.json. Idempotent: running twice gives the same result.
# Usage: python3 -I tools/merge_fragments.py <game dir> [chapters...]
import json, os, sys, glob
root = sys.argv[1]; chapters = [int(x) for x in sys.argv[2:]] or list(range(2, 7))
sp = os.path.join(root, 'site/story.json'); cp = os.path.join(root, 'site/narrative/consequences.json')
S = json.load(open(sp)); C = json.load(open(cp))
def ldict(a, b):
    for k, v in b.items():
        if k in ('social', 'ears'):
            for kk, lst in v.items(): a.setdefault(k, {})[kk] = sorted(set(a.get(k, {}).get(kk, [])) | set(lst))
        elif k in ('merchantRules', 'merchantStock'):
            for mid, lst in v.items():
                M = a.setdefault('merchants', {}).setdefault(mid, {'stock': [], 'rules': []})
                key = 'rules' if k == 'merchantRules' else 'stock'
                have = [json.dumps(r, sort_keys=True) for r in M.setdefault(key, [])]
                for r in lst:
                    if json.dumps(r, sort_keys=True) not in have: M[key].append(r)
        elif k == 'merchantSpecials':
            for mid, sp in v.items(): a.setdefault('merchants', {}).setdefault(mid, {}).setdefault('specials', {}).update(sp)
        elif k == 'worldRumors':
            for kk, lst in v.items(): a.setdefault(k, {})[kk] = lst
        elif isinstance(v, dict): a.setdefault(k, {}).update(v)
        else: a[k] = v
for n in chapters:
    f = os.path.join(root, f'work/story_ch{n}.json')
    if os.path.exists(f):
        x = json.load(open(f))
        ids = {q['id'] for q in x.get('quests', [])}
        S['quests'] = [q for q in S['quests'] if q['id'] not in ids]
        # new quests go after the last quest of their chapter (or the previous chapter)
        for q in x.get('quests', []):
            idx = max([i for i, y in enumerate(S['quests']) if y.get('chapter', 1) <= q.get('chapter', n)] or [-1]) + 1
            S['quests'].insert(idx, q)
        nids = {m['id'] for m in x.get('npcs', [])}
        S['npcs'] = [m for m in S['npcs'] if m['id'] not in nids] + x.get('npcs', [])
        S.setdefault('places', {}).update(x.get('places', {}))
        Q = {q['id']: q for q in S['quests']}
        for qid, fields in x.get('modify', {}).items():
            if qid in Q: Q[qid].update(fields)
            else: print('WARN modify unknown quest', qid)
        for k in ('endings', 'epilogue', 'arcHook', 'cardTitles', 'greetings', 'lateNpcs'):
            if k in x:
                if k == 'endings':
                    E = {e['id']: e for e in S['endings']}
                    for e in x['endings']:
                        if e['id'] in E: E[e['id']].update(e)
                        else: S['endings'].insert(len(S['endings']) - 1, e)
                elif k in ('cardTitles', 'greetings'): S.setdefault(k, {}).update(x[k])
                else: S[k] = x[k]
        print('story fragment', n, 'quests', len(x.get('quests', [])), 'npcs', len(x.get('npcs', [])), 'modify', len(x.get('modify', {})))
    f = os.path.join(root, f'work/cons_ch{n}.json')
    if os.path.exists(f):
        ldict(C, json.load(open(f))); print('cons fragment', n)
json.dump(S, open(sp, 'w'), ensure_ascii=False, indent=1)
json.dump(C, open(cp, 'w'), ensure_ascii=False, indent=1)
