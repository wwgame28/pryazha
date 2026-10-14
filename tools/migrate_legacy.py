# One-time migration: dialogue lines and options of story.json (v7) move into ink (legacy.ink), verbatim.
# story.json keeps the quest structure; each step with text gets "scene": "<qid>_<sid>".
import json, sys, re, os
site = sys.argv[1]
src = json.load(open(os.path.join(site, 'story.json')))
PLACE = {'village': 'Ольховый Брод', 'ford': 'Ольховый Брод, брод', 'village_well': 'Ольховый Брод, колодец', 'tavern_cellar': 'трактир «Последняя кружка», погреб',
         'oldgrave': 'Старое кладбище', 'crypt1': 'склеп, первый ярус', 'crypt2': 'склеп, второй ярус', 'crypt3': 'склеп, нижний зал', 'trollcamp': 'Гурдымов Камень',
         'ruins': 'Руины Перевязчиков', 'tower': 'Башня Неусыпных', 'witchhut': 'хижина Иней', 'mine': 'Глухая шахта', 'mine1': 'Глухая шахта, забой', 'camp': 'Стан Пепельного Круга',
         'menhir': 'менгир', 'hamlet_dry': 'Сухой Лог', 'wild:forest': 'лес', 'wild:steppe': 'степь', 'wild:lake': 'озеро', 'wild:meadow': 'луг у менгира', 'any': 'где угодно'}
SPECIAL_NUM = ('clarity', 'gold')
def lit(v):
    if v is True: return 'true'
    if v is False: return 'false'
    if isinstance(v, (int, float)): return str(v)
    return json.dumps(str(v), ensure_ascii=False)
def lhs(k):
    if k == 'clarity': return 'clarity()'
    if k == 'class': return 'cls()'
    if k == 'school': return 'school()'
    if k == 'gold': return 'gold()'
    if k in ('dreams', 'sacrificed_any') or k.startswith('bond_'): return f'val("{k}")'
    return f'flag("{k}")'
def cond(c):
    parts = []
    for k0, v in c.items():
        if k0 == 'all': parts.append('(' + ' and '.join(cond(x) for x in v) + ')'); continue
        if k0 == 'any': parts.append('(' + ' or '.join(cond(x) for x in v) + ')'); continue
        if k0 == 'card': parts.append(f'card("{v}")'); continue
        k, op = k0, 'eq'
        for suf, o in (('_not', 'ne'), ('_in', 'in'), ('_gte', 'gte'), ('_lte', 'lte'), ('_lt', 'lt'), ('_gt', 'gt')):
            if k0.endswith(suf): k, op = k0[:-len(suf)], o; break
        L = lhs(k)
        if op == 'eq' and (k in SPECIAL_NUM or k.startswith('bond_')): parts.append(f'{L} >= {lit(v)}'); continue
        if op == 'eq':
            if v is True: parts.append(f'is("{k}")' if L.startswith('flag') else L)
            elif v is False: parts.append(f'not is("{k}")' if L.startswith('flag') else f'not {L}')
            else: parts.append(f'{L} == {lit(v)}')
        elif op == 'ne': parts.append(f'{L} != {lit(v)}')
        elif op == 'in': parts.append('(' + ' or '.join(f'{L} == {lit(x)}' for x in v) + ')')
        else: parts.append(f'{L} {dict(gte=">=", lte="<=", lt="<", gt=">")[op]} {lit(v)}')
    return ' and '.join(parts) or 'true'
def esc(t):
    t = str(t).replace('\\', '\\\\')
    for ch in '{}[]#|': t = t.replace(ch, '\\' + ch)
    return t.replace('//', '/\\/').replace('->', '-\\>').replace('<>', '<\\>')
def speaker(w): return 'hero' if w in ('hero', 'self') else w
out = ['// Перенесено дословно из story.json (сборка v7). Не удалять: это существующий контент.', '// Каждая сцена: <квест>_<шаг>. Новые сцены глав — в chNN.ink.', '']
npcs = {n['id'] for n in src['npcs']}
count = 0
for q in src['quests']:
    for s in q['steps']:
        dl, opts = s.get('dialogue') or [], s.get('options') or []
        if not dl and not opts: continue
        knot = f"{q['id']}_{s['id']}"
        who = []
        for l in dl:
            w = speaker(l.get('who'))
            if w in npcs and w not in who: who.append(w)
        tgt = s.get('target')
        if isinstance(tgt, str) and tgt in npcs and tgt not in who: who.insert(0, tgt)
        nexts = [o.get('next') for o in opts if o.get('next')]
        where = s.get('where') or 'any'
        out += [f'=== {knot} ===', f'# scene: {knot}', f'# place: {PLACE.get(where, where)}', f'# time: {"ночь" if s["type"] in ("night",) else "по ходу квеста"}',
                f'# who: {", ".join(who) if who else "—"}', f'# trigger: квест {q["id"]} «{q["title"]}», шаг {s["id"]} ({s["type"]}): {s.get("text", "")}',
                f'# next: {", ".join(sorted(set(nexts))) if nexts else "следующий шаг"}']
        def line_block(l, indent=''):
            w = speaker(l.get('who')); body = f"{indent}{w}: {esc(l.get('line', ''))}"
            if l.get('if'): return [f"{indent}{{ {cond(l['if'])}:", '    ' + body, f"{indent}}}"]
            return [body]
        for l in dl: out += line_block(l)
        if opts:
            for o in opts:
                c = f"{{{cond(o['requires'])}}} " if o.get('requires') else ''
                out.append(f"* {c}[{esc(o['text'])}]")
                for k, v in (o.get('set') or {}).items(): out.append(f'    ~ set("{k}", {lit(v)})')
                if o.get('next'): out.append(f'    ~ go("{o["next"]}")')
                out.append('    -> DONE')
                if o.get('requires', {}).get('card'):
                    out.append(f"* {{lost(\"{o['requires']['card']}\")}} [{esc(o['text'])} \\#struck]".replace(' \\#struck]', ' #struck]'))
                    out.append('    -> DONE')
        else:
            out.append('-> DONE')
        # clues for investigations: one line per marker
        if s['type'] == 'investigate' and len(dl) > 1:
            for i, l in enumerate(dl):
                out.append(f'= c{i + 1}')
                out += line_block(l)
                out.append('-> DONE')
        out.append('')
        s['scene'] = knot
        s.pop('dialogue', None); s.pop('options', None)
        count += 1
open(os.path.join(site, 'narrative', 'legacy.ink'), 'w').write('\n'.join(out) + '\n')
json.dump(src, open(os.path.join(site, 'story.json'), 'w'), ensure_ascii=False, indent=1)
print('migrated scenes:', count)
