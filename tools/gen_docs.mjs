// Generates docs/CHOICE_FLAGS.md and docs/QUESTS.md from the actual data (story.json, ink, consequences.json),
// so the documentation of variables and quests never drifts from the game. Usage: node tools/gen_docs.mjs
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SITE = path.join(ROOT, 'site'), NARR = path.join(SITE, 'narrative');
const story = JSON.parse(fs.readFileSync(path.join(SITE, 'story.json'), 'utf8'));
const cons = JSON.parse(fs.readFileSync(path.join(NARR, 'consequences.json'), 'utf8'));
// только то, что игра собирает (INCLUDE в main.ink): черновики глав, которые ещё пишутся, в документы не попадают
const inkFiles = [...fs.readFileSync(path.join(NARR, 'main.ink'), 'utf8').matchAll(/^INCLUDE\s+(\S+)/gm)].map((m) => m[1]).filter((f) => f !== 'common.ink');
const esc = (s) => String(s ?? '').replace(/\|/g, '/').replace(/\n/g, ' ');
const NPC = Object.fromEntries(story.npcs.map((n) => [n.id, n.name]));
const QT = Object.fromEntries(story.quests.map((q) => [q.id, q.title]));

// ---------- flags: where set, which values, where read ----------
const flags = {};
const F = (k) => (flags[k] = flags[k] || { values: new Set(), set: new Set(), read: new Set() });
for (const file of inkFiles) {
  let knot = null;
  for (const line of fs.readFileSync(path.join(NARR, file), 'utf8').split('\n')) {
    const m = /^\s*===\s*(?:function\s+)?(\w+)/.exec(line); if (m) { knot = m[1]; continue; }
    for (const s of line.matchAll(/\bset\("([^"]+)",\s*([^)]+)\)/g)) { F(s[1]).values.add(s[2].trim().replace(/^"|"$/g, '')); F(s[1]).set.add(knot); }
    for (const s of line.matchAll(/\binc\("([^"]+)"/g)) { F(s[1]).values.add('+n'); F(s[1]).set.add(knot); }
    for (const s of line.matchAll(/\b(?:flag|is)\("([^"]+)"\)/g)) F(s[1]).read.add(knot);
  }
}
const walkCond = (c, where) => { if (!c || typeof c !== 'object') return; for (const [k, v] of Object.entries(c)) { if (['all', 'any'].includes(k)) v.forEach((x) => walkCond(x, where)); else if (k === 'not') walkCond(v, where); else { const base = k.replace(/_(not|in|gte|lte|lt|gt)$/, ''); if (/^(rep|trust|fear|respect|hostility|hostile|promise|debt|did|rumor|knows|betrayed|q|npc|trade|step|bond)_/.test(base) || ['card', 'clarity', 'class', 'school', 'gold', 'dreams', 'chapter', 'day', 'night', 'knows', 'heard', 'rumor', 'did', 'item', 'sacrificed_any', 'sacrificed_n', 'fallback'].includes(base)) continue; F(base).read.add(where); } } };
for (const q of story.quests) {
  for (const s of q.steps) walkCond(s.requires, `${q.id}.${s.id}`), walkCond(s.orIf, `${q.id}.${s.id}`);
  walkCond(q.offerIf, q.id); walkCond(q.autoIf, q.id); if (q.fail) walkCond(q.fail.if, q.id);
  for (const o of q.outcomes) { walkCond(o.if, q.id + ' (исход)'); for (const w of o.worldEffects || []) { const p = w.split(':'); if (p[0] === 'flag') { const [k, v] = p.slice(1).join(':').split('='); F(k).values.add(v); F(k).set.add(q.id + ' (исход)'); } if (p[0] === 'inc') { F(p[1]).values.add('+n'); F(p[1]).set.add(q.id + ' (исход)'); } } }
}
for (const e of story.endings || []) walkCond(e.conditions, 'концовка ' + e.id);
for (const e of story.epilogue || []) walkCond(e.if, 'эпилог');
// hand-written meaning of the most important flags (others are named by their quest)
const MEANING = {
  village_verdict: 'решение Схода о герое (гл.1): own — свой, probation — на испытании, outcast — изгой',
  efim: 'судьба утопленника у брода (гл.1): named / federot_named / killed / led',
  shurshok: 'судьба гоблинёнка (m2): freed / guide / captive', gurdym: 'судьба Гурдыма (m3): dead / eased / spared',
  provody: 'Проводы (m4): spoken / sold / taken', mitya_kept: 'держит ли Агафья Митрия после Проводов', faction: 'решение о Сухом Логе (m7): archive / ash / weavers / none',
  lean: 'крен после «Трёх неправд» (m6)', hero_self: 'кто ты (m8): many / one', hero_name: 'имя, выбранное героем', morven: 'решение в нижнем зале (m10)', last_knot: 'последний узел (m11)',
  yard_help: 'сколько дворов Брода помог герой (гл.1)', ashes_asked: 'скольких спросил про пепелище (гл.1)', shirts: 'рубашки Пелагеи: bought / truth / left',
  path: 'текущий выученный путь (класс)', mentor_warrior: 'кто научил воина', mentor_ranger: 'кто научил следопыта', mentor_weaver: 'кто научил ткача', mentor_hollow: 'стал Беспамятным у Узла',
  truth: 'кому досталась правда о Красной зиме (гл.5): public / private / burned / sold', agafya_fate: 'судьба Агафьи в ночь огня (гл.5)', pominy: 'Помины вместо Проводов (гл.6)',
};
const fl = Object.entries(flags).sort(([a], [b]) => a.localeCompare(b));
let md = `# Переменные выбора и последствий (CHOICE_FLAGS)

Документ собирается автоматически: \`node tools/gen_docs.mjs\`. Источники — \`site/story.json\`,
\`site/narrative/*.ink\`, \`site/narrative/consequences.json\`. Не править руками: правки пропадут при
следующей сборке. Описания важных флагов — в словаре \`MEANING\` внутри генератора.

## Где живёт состояние
| Что | Где в сохранении | Как меняется | Как читается |
|---|---|---|---|
| флаги выборов | \`G.flags\` | \`set\`/\`inc\` в ink; \`flag:\`/\`inc:\` в исходах | \`flag()\`/\`is()\` в ink; ключи условий в story.json |
| квесты | \`G.story.active/done/failed\` | шаги и исходы | \`qstate()\`, \`q_<id>\`, \`step_<id>\` |
| глава | \`G.ws.chapter\` | \`endsChapter\` квеста | \`chapter()\` |
| репутация фракций | \`G.ws.rep\` (−100…100) | \`addrep\`, \`rep:\`, поступки, слухи | \`rep()\`, \`tier()\`, \`rep_<f>\` |
| отношения NPC | \`G.ws.rel[npc]\` = доверие/страх/уважение/вражда (0–10) | \`addrel\`, \`rel:\`, \`bond:\` | \`trust()\`… , \`trust_<npc>\`… |
| знание героя | \`G.ws.know\` | \`learn\`, \`learn:\` | \`knows()\`, \`knows\` |
| что знают NPC | \`G.ws.heard\` + слухи | \`deed\` (свидетели), \`tell\`, распространение слухов по дням | \`heard()\` |
| поступки | \`G.ws.deeds\` | \`deed\`, \`deed:\` | \`did()\`, \`did_<id>\` |
| слухи | \`G.ws.rumors\` (сила, кто знает) | \`rumor\`, поступки; растут по социальному графу каждый день, гаснут | \`rumor_on()\`, \`rumor\` |
| обещания | \`G.ws.promises\` | \`promise\`, \`keep\`, \`breakp\`, \`release\`, срок | \`promised()\`, \`promise_<id>\` |
| долги | \`G.ws.debts\` | \`debt_add\`, \`paydebt\` | \`debt()\`, \`debt_<npc>\` |
| предательства | \`G.ws.betrayals\` | \`betray\`, поступки с \`betray: true\` | \`betrayed_<id>\` |
| отложенные последствия | \`G.ws.deferred\` | \`later\`, \`at_chapter\`, \`later:\`, \`atchapter:\` | срабатывают сами (события) |
| торговля | \`G.ws.trade\` + правила торговцев | \`settrade\`, \`shop:\`, \`trade:\` | окно торговли |
| путь (класс) | \`G.cls\`, \`G.paths\` | \`learnpath\`, \`path:\` | \`cls()\`, \`class\` |
| диалоги | \`G.ink\` (состояние ink: счётчики посещений) | сам ink | счётчики узлов в ink |

## Флаги выборов (${fl.length})
| Флаг | Значения | Где ставится | Где читается | Смысл |
|---|---|---|---|---|
`;
for (const [k, v] of fl) md += `| \`${k}\` | ${esc([...v.values].slice(0, 8).join(', '))} | ${esc([...v.set].slice(0, 6).join(', ')) || '—'} | ${esc([...v.read].slice(0, 6).join(', ')) || '—'} | ${esc(MEANING[k] || (v.set.size ? 'см. сцену ' + [...v.set][0] : 'не ставится нигде (проверить!)'))} |\n`;
md += `\n## Фракции\n| Код | Название | Старт |\n|---|---|---|\n` + Object.entries(cons.factions).map(([k, f]) => `| \`${k}\` | ${f.name} | ${f.start || 0} |`).join('\n') + '\n';
md += `\n## NPC: фракция и стартовое отношение\n| NPC | Имя | Фракция | доверие/страх/уважение/вражда | Кому пересказывает слухи |\n|---|---|---|---|---|\n` + Object.entries(cons.npcs).map(([k, n]) => `| \`${k}\` | ${NPC[k] || n.name} | ${n.faction || '—'} | ${['trust', 'fear', 'respect', 'hostility'].map((x) => (n.rel || {})[x] || 0).join(' / ')} | ${(cons.social[k] || []).join(', ') || '—'} |`).join('\n') + '\n';
md += `\n«Уши» фракций (через кого слух доходит до фракции): ${Object.entries(cons.ears).map(([f, l]) => `${f}: ${l.join(', ')}`).join('; ')}.\n`;
md += `\n## Поступки (deeds)\n| id | Что | Репутация у видевших | Слух |\n|---|---|---|---|\n` + Object.entries(cons.deeds).map(([k, d]) => `| \`${k}\` | ${esc(d.title)} | ${Object.entries(d.rep || {}).map(([f, n]) => `${f} ${n > 0 ? '+' : ''}${n}`).join(', ')}${d.repAlways ? ' (всегда)' : ''}${d.betray ? ' · предательство' : ''} | ${d.rumor || '—'} |`).join('\n') + '\n';
md += `\n## Слухи\n| id | Текст | Правда? | Удар по репутации, когда дойдёт |\n|---|---|---|---|\n` + Object.entries(cons.rumors).map(([k, r]) => `| \`${k}\` | ${esc(r.text)} | ${r.truth === false ? 'ложь' : 'правда'} | ${Object.entries(r.rep || {}).map(([f, n]) => `${f} ${n}`).join(', ') || '—'} |`).join('\n') + '\n';
md += `\n## Знание и улики (facts)\n| id | Что | Описание |\n|---|---|---|\n` + Object.entries(cons.facts).map(([k, f]) => `| \`${k}\` | ${esc(f.title)} | ${esc(f.text)} |`).join('\n') + '\n';
md += `\n## Обещания\n| id | Кому | Что |\n|---|---|---|\n` + Object.entries(cons.promises || {}).map(([k, p]) => `| \`${k}\` | ${NPC[p.to] || p.to} | ${esc(p.text)} |`).join('\n') + '\n';
md += `\n## Отложенные последствия (события)\n| id | Что | Эффекты | Сцена |\n|---|---|---|---|\n` + Object.entries(cons.events).map(([k, e]) => `| \`${k}\` | ${esc(e.title || e.toast || '')} | ${esc((e.effects || []).join(', '))} | ${e.scene || '—'} |`).join('\n') + '\n';
md += `\n## Сюжетные предметы\n| id | Название |\n|---|---|\n` + Object.entries(cons.items).map(([k, i]) => `| \`${k}\` | ${esc(i.name)} |`).join('\n') + '\n';
md += `\n## Торговцы\n| id | Где | Фракция | Правила (кратко) |\n|---|---|---|---|\n` + Object.entries(cons.merchants).map(([k, m]) => `| \`${k}\` | ${esc(m.title)} | ${m.faction || '—'} | ${esc((m.rules || []).map((r) => (r.close ? 'закрыто: ' + r.close : r.secret ? 'тайная сделка' : r.special ? 'особый товар' : r.price ? 'цена ×' + r.price : r.note || '')).filter(Boolean).join(' · ')) || '—'} |`).join('\n') + '\n';
md += `\nЦены зависят от ступени репутации фракции торговца (Враг — закрыто, Неприязнь ×1.5 без редкого товара, Свой ×0.9, Близкий ×0.8) и от доверия самого торговца (≥ 6 — ×0.9; вражда ≥ 7 — закрыто). Закрытый торговец всегда показывает, как вернуть доверие.\n`;
fs.writeFileSync(path.join(ROOT, 'docs/CHOICE_FLAGS.md'), md);

// ---------- quests ----------
const STEP_RU = { talk: 'разговор', choose: 'выбор', goto: 'дойти', investigate: 'осмотреть', defeat: 'бой', collect: 'собрать', enter: 'войти', night: 'ночь', wait: 'ждать', cast: 'колдовать', sacrifice: 'отдать память', escort: 'провести', use: 'действие', count: 'счётчик' };
const CHAIN_RU = { main: 'основной', tutorial: 'обучение', yard: 'двор (гл.1)', path: 'путь (обучение ремеслу)', ashes: 'тайна', forest: 'Лесной народ' };
let qm = `# Квесты

Собирается автоматически: \`node tools/gen_docs.mjs\` (из \`site/story.json\`). Подробные сцены — \`docs/SCENES.md\`,
дизайн глав — \`docs/CHAPTERS/\`.

Правила без тупиков (проверяются \`tools/validate_story.mjs\`):
- основной квест не проваливается без продолжения;
- каждый шаг достижим;
- у каждой ветки есть исход;
- ссылки на сцены, NPC, поступки и слухи существуют.

`;
for (let ch = 1; ch <= 6; ch++) {
  const list = story.quests.filter((q) => (q.chapter || 1) === ch); if (!list.length) continue;
  qm += `\n## Глава ${ch}\n\n| Квест | Тип | Кто даёт / как начинается | После | Шаги | Исходы | Провал |\n|---|---|---|---|---|---|---|\n`;
  for (const q of list) {
    const start = q.auto ? `сам${q.autoIf ? ' (условие)' : ''}` : q.giver ? NPC[q.giver] || q.giver : 'по цепочке';
    qm += `| \`${q.id}\` ${esc(q.title)} | ${CHAIN_RU[q.chain] || 'побочный'}${q.hidden ? ', скрытый' : ''}${q.endsChapter ? ', **финал главы**' : ''} | ${esc(start)}${q.offerIf ? ' (есть условие)' : ''} | ${(q.after || []).map((a) => QT[a] || a).join(', ') || '—'} | ${q.steps.map((s) => `${s.id}: ${STEP_RU[s.type] || s.type}${s.requires ? '*' : ''}`).join('; ')} | ${q.outcomes.length} | ${q.fail ? esc(q.fail.text || 'да') : '—'} |\n`;
  }
  qm += `\n<details><summary>Описание квестов главы ${ch}</summary>\n\n`;
  for (const q of list) qm += `- **${esc(q.title)}** (\`${q.id}\`) — ${esc(q.summary || '')}\n  - Шаги: ${q.steps.map((s) => `${s.id} «${esc(s.text)}»`).join(' → ')}\n  - Исходы: ${q.outcomes.map((o) => (o.if && Object.keys(o.if).length ? `[${esc(JSON.stringify(o.if))}] ` : '[иначе] ') + esc((o.text || '').slice(0, 120))).join(' · ')}\n`;
  qm += `\n</details>\n`;
}
fs.writeFileSync(path.join(ROOT, 'docs/QUESTS.md'), qm);

// ---------- continuity: where each choice is made and in which chapters it echoes ----------
const IDX = JSON.parse(fs.readFileSync(path.join(NARR, 'story.index.json'), 'utf8')).knots;
const QCH = Object.fromEntries(story.quests.map((q) => [q.id, q.chapter || 1]));
const chOf = (where) => {
  if (!where) return null;
  if (/^концовка|^эпилог/.test(where)) return 6;
  const k = IDX[where]; if (k && k.file) { const m = /ch(\d)\.ink$/.exec(k.file); if (m) return +m[1]; }
  const q = /^(\w+?)(?:\.\w+| \(исход\))?$/.exec(where); if (q && QCH[q[1]]) return QCH[q[1]];
  const h = /^talk_\w+?_ch(\d)$/.exec(where); if (h) return +h[1];
  if (/^talk_/.test(where) || /^offer_c1_/.test(where)) return 1;
  const o = /^offer_(\w+)$/.exec(where); if (o && QCH[o[1]]) return QCH[o[1]];
  return null;
};
// deeds, facts, promises, rumors: set (ink calls / world effects) and read (ink checks / conditions)
const ids = {}; const I = (kind, id) => (ids[kind + ':' + id] = ids[kind + ':' + id] || { kind, id, set: new Set(), read: new Set() });
for (const file of inkFiles) {
  let knot = null;
  for (const line of fs.readFileSync(path.join(NARR, file), 'utf8').split('\n')) {
    const m = /^\s*===\s*(?:function\s+)?(\w+)/.exec(line); if (m) { knot = m[1]; continue; }
    for (const x of line.matchAll(/\b(deed|deed_public)\("([^"]+)"/g)) I('deed', x[2]).set.add(knot);
    for (const x of line.matchAll(/\blearn\("([^"]+)"/g)) I('fact', x[1]).set.add(knot);
    for (const x of line.matchAll(/\btell\("\w+",\s*"([^"]+)"/g)) I(/^r_/.test(x[1]) ? 'rumor' : /^d_/.test(x[1]) ? 'deed' : 'fact', x[1]).set.add(knot);
    for (const x of line.matchAll(/\bpromise\("([^"]+)"/g)) I('promise', x[1]).set.add(knot);
    for (const x of line.matchAll(/\b(?:keep|breakp|release)\("([^"]+)"/g)) I('promise', x[1]).set.add(knot);
    for (const x of line.matchAll(/\brumor\("([^"]+)"/g)) I('rumor', x[1]).set.add(knot);
    for (const x of line.matchAll(/\bdid\("([^"]+)"/g)) I('deed', x[1]).read.add(knot);
    for (const x of line.matchAll(/\bknows\("([^"]+)"/g)) I('fact', x[1]).read.add(knot);
    for (const x of line.matchAll(/\bpromised\("([^"]+)"/g)) I('promise', x[1]).read.add(knot);
    for (const x of line.matchAll(/\b(?:rumor_on|refute)\("([^"]+)"/g)) I('rumor', x[1]).read.add(knot);
    for (const x of line.matchAll(/\bheard\("\w+",\s*"([^"]+)"/g)) I(/^r_/.test(x[1]) ? 'rumor' : /^d_/.test(x[1]) ? 'deed' : 'fact', x[1]).read.add(knot);
  }
}
const walkIds = (c, where) => { if (!c || typeof c !== 'object') return; for (const [k, v] of Object.entries(c)) { if (k === 'all' || k === 'any') v.forEach((x) => walkIds(x, where)); else if (k === 'not') walkIds(v, where); else if (k === 'did') I('deed', v).read.add(where); else if (k === 'knows') I('fact', v).read.add(where); else if (k === 'rumor') I('rumor', v).read.add(where); else { const pm = /^promise_(\w+?)(?:_not|_in)?$/.exec(k); if (pm) I('promise', pm[1]).read.add(where); const dm = /^did_(\w+)$/.exec(k); if (dm) I('deed', dm[1]).read.add(where); } } };
for (const q of story.quests) {
  for (const s of q.steps) walkIds(s.requires, `${q.id}.${s.id}`), walkIds(s.orIf, `${q.id}.${s.id}`);
  walkIds(q.offerIf, q.id); walkIds(q.autoIf, q.id); if (q.fail) walkIds(q.fail.if, q.id);
  for (const o of q.outcomes) { walkIds(o.if, q.id + ' (исход)'); for (const w of o.worldEffects || []) { const p = w.split(':'); const K = { deed: 'deed', learn: 'fact', promise: 'promise', keep: 'promise', break: 'promise', rumor: 'rumor', refute: 'rumor' }[p[0]]; if (K) I(K, p[1]).set.add(q.id + ' (исход)'); } }
}
for (const e of story.endings || []) walkIds(e.conditions, 'концовка ' + e.id);
for (const e of story.epilogue || []) walkIds(e.if, 'эпилог');
const chs = (set) => [...new Set([...set].map(chOf).filter(Boolean))].sort();
const rows = [];
for (const [k, v] of fl) rows.push({ kind: 'флаг', id: k, set: chs(v.set), read: chs(v.read), setN: v.set.size, readN: v.read.size });
for (const v of Object.values(ids).sort((a, b) => (a.kind + a.id).localeCompare(b.kind + b.id))) rows.push({ kind: { deed: 'поступок', fact: 'знание', promise: 'обещание', rumor: 'слух' }[v.kind], id: v.id, set: chs(v.set), read: chs(v.read), setN: v.set.size, readN: v.read.size });
// a deed changes reputation and starts a rumour by itself; a rumour hits reputation as it spreads: that is an echo too
const systemic = (r) => (r.kind === 'поступок' && cons.deeds[r.id] && (Object.keys(cons.deeds[r.id].rep || {}).length || cons.deeds[r.id].rumor)) || (r.kind === 'слух' && cons.rumors[r.id] && Object.keys(cons.rumors[r.id].rep || {}).length);
const status = (r) => !r.setN && r.readN ? '⚠ читается, но нигде не ставится' : r.setN && !r.readN ? (systemic(r) ? 'системный отклик' : 'нет отклика') : r.read.some((c) => c > Math.min(...(r.set.length ? r.set : [9]))) ? 'сквозное' : 'внутри главы';
let cm = `<!-- AUTO:BEGIN — собирается \`node tools/gen_docs.mjs\`, правки внутри блока пропадут -->\n## Карта последствий по главам (автоматически)\n\n`;
const cross = rows.filter((r) => status(r) === 'сквозное'), none = rows.filter((r) => status(r) === 'нет отклика'), bad = rows.filter((r) => status(r).startsWith('⚠'));
const sys = rows.filter((r) => status(r) === 'системный отклик');
cm += `Всего переменных: ${rows.length}. Сквозных (выбор в одной главе, отклик в более поздней): ${cross.length}. С системным откликом (поступок меняет репутацию и рождает слух, слух бьёт по репутации): ${sys.length}. Без отклика: ${none.length}. Читаются, но не ставятся: ${bad.length}.\n\n`;
cm += `### Сквозные\n| Что | id | Ставится в главах | Откликается в главах |\n|---|---|---|---|\n` + cross.map((r) => `| ${r.kind} | \`${r.id}\` | ${r.set.join(', ')} | ${r.read.join(', ')} |`).join('\n') + '\n';
cm += `\n### Без отклика (выбор записан, но нигде не читается — кандидаты на отклик в хабах или эпилоге)\n` + (none.length ? none.map((r) => `\`${r.id}\` (${r.kind}, гл. ${r.set.join(', ') || '?'})`).join(', ') : 'нет') + '\n';
cm += `\n### Читаются, но нигде не ставятся (ошибка или внешний источник)\n` + (bad.length ? bad.map((r) => `\`${r.id}\` (${r.kind})`).join(', ') : 'нет') + '\n<!-- AUTO:END -->\n';
const CP = path.join(ROOT, 'docs/CONTINUITY.md');
let cont = fs.existsSync(CP) ? fs.readFileSync(CP, 'utf8') : '# Непрерывность (CONTINUITY)\n\n';
cont = /<!-- AUTO:BEGIN[\s\S]*?<!-- AUTO:END -->\n?/.test(cont) ? cont.replace(/<!-- AUTO:BEGIN[\s\S]*?<!-- AUTO:END -->\n?/, cm) : cont + '\n' + cm;
fs.writeFileSync(CP, cont);
console.log(`continuity: ${rows.length} vars, ${cross.length} cross-chapter, ${none.length} without echo, ${bad.length} read-but-never-set`);
console.log(`docs: ${fl.length} flags, ${story.quests.length} quests`);
