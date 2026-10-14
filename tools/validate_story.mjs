// Static checks of the story: quests ↔ ink scenes ↔ consequence data. No dead ends, no unknown ids.
// Usage: node tools/validate_story.mjs  (exit code 1 on errors; warnings are printed)
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SITE = path.join(ROOT, 'site');
// options: --index <dir with story.index.json> --story <extra quests json> (repeatable) --cons <extra consequences json> (repeatable)
const argv = process.argv.slice(2), opt = (k) => argv.flatMap((x, i) => (x === k ? [argv[i + 1]] : []));
const story = JSON.parse(fs.readFileSync(path.join(SITE, 'story.json'), 'utf8'));
const index = JSON.parse(fs.readFileSync(path.join(opt('--index')[0] ? path.resolve(opt('--index')[0]) : path.join(SITE, 'narrative'), 'story.index.json'), 'utf8'));
const cons = JSON.parse(fs.readFileSync(path.join(SITE, 'narrative/consequences.json'), 'utf8'));
const LOOSE = argv.includes('--loose');
// all chapter fragments in work/ are visible (other writers' unfinished files are skipped)
const fragFiles = [...new Set([...opt('--story'), ...(argv.includes('--all-fragments') ? fs.readdirSync(path.join(ROOT, 'work')).filter((f) => /^story_ch\d\.json$/.test(f)).map((f) => path.join(ROOT, 'work', f)) : [])])];
for (const f of fragFiles) { let x; try { x = JSON.parse(fs.readFileSync(path.resolve(f), 'utf8')); } catch (e) { console.log('WARN  fragment unreadable', f, e.message); continue; } const ids = new Set((x.quests || []).map((q) => q.id)); story.quests = story.quests.filter((q) => !ids.has(q.id)); story.quests.push(...(x.quests || [])); const nids = new Set((x.npcs || []).map((n) => n.id)); story.npcs = story.npcs.filter((n) => !nids.has(n.id)); story.npcs.push(...(x.npcs || [])); Object.assign(story.places = story.places || {}, x.places || {}); for (const [qid, fields] of Object.entries(x.modify || {})) { const q = story.quests.find((y) => y.id === qid); if (q) Object.assign(q, fields); } }
for (const f of opt('--cons')) { const x = JSON.parse(fs.readFileSync(path.resolve(f), 'utf8')); for (const [k, v] of Object.entries(x)) { if (Array.isArray(v)) cons[k] = [...(cons[k] || []), ...v]; else if (v && typeof v === 'object') cons[k] = { ...(cons[k] || {}), ...v }; } }
const inkFiles = fs.readdirSync(path.join(SITE, 'narrative')).filter((f) => f.endsWith('.ink'));
const inkSrc = Object.fromEntries(inkFiles.map((f) => [f, fs.readFileSync(path.join(SITE, 'narrative', f), 'utf8')]));
const bridge = fs.readFileSync(path.join(SITE, 'narrative.js'), 'utf8');
const errors = [], warns = [];
const E = (m) => errors.push(m), W = (m) => warns.push(m);
const npcs = new Set(story.npcs.map((n) => n.id));
const qById = Object.fromEntries(story.quests.map((q) => [q.id, q]));
const E0 = E; const looseE = (m) => (LOOSE && /no such quest|not in consequences/.test(m) ? W(m + ' (loose)') : E0(m));
const knots = index.knots;
const SPECIAL_SPEAKERS = new Set(['narr', 'act', 'hero']);
const NON_NPC_TARGETS = new Set(['self', 'hero', 'any', 'echo', 'ford', 'village', 'oldgrave', 'trollcamp', 'ruins', 'tower', 'witchhut', 'mine', 'camp', 'menhir', 'hamlet_dry', 'lake', 'herd', 'old_forge', 'tavern_cellar', 'dawn', 'name_input', 'village_well', 'crypt1', 'crypt2', 'crypt3', 'mine1', 'mine2']);

// ---------- externals ----------
const common = inkSrc['common.ink'] || '';
const declared = [...common.matchAll(/^EXTERNAL (\w+)\(/gm)].map((m) => m[1]);
for (const f of declared) if (!new RegExp(`(get|act)\\('${f}'`).test(bridge)) E(`external ${f}() declared in common.ink but not bound in narrative.js`);

// ---------- quests ----------
const steps = {};
for (const q of story.quests) {
  if (!q.title) E(`${q.id}: no title`);
  if (!q.chapter) E(`${q.id}: no chapter`);
  if (q.giver && !npcs.has(q.giver)) E(`${q.id}: giver ${q.giver} is not an npc`);
  for (const a of q.after || []) { if (!qById[a]) E(`${q.id}: after unknown quest ${a}`); else if ((qById[a].chapter || 1) > (q.chapter || 1)) E(`${q.id}: after ${a} from a later chapter`); }
  for (const a of q.then || []) if (!qById[a]) E(`${q.id}: then unknown quest ${a}`);
  if (q.chain === 'main' && q.fail && !(q.fail.then && q.fail.then.length)) E(`${q.id}: main quest can fail without a continuation (dead end)`);
  if (!q.outcomes || !q.outcomes.length) E(`${q.id}: no outcomes`);
  else if (!q.outcomes.some((o) => !o.if || !Object.keys(o.if).length)) W(`${q.id}: no fallback outcome (the last one will be used)`);
  const ids = new Set(q.steps.map((s) => s.id));
  steps[q.id] = ids;
  const targets = new Set();
  for (const s of q.steps) {
    if (s.scene) {
      const k = knots[s.scene];
      if (!k) E(`${q.id}.${s.id}: scene ${s.scene} not found in ink`);
      else for (const g of k.go) { if (g !== 'end' && !ids.has(g)) E(`${q.id}.${s.id}: scene ${s.scene} goes to unknown step ${g}`); if (g !== s.id) targets.add(g); } // go(own step) = "think it over", not a branch (same rule as story.js refs)
      if (s.type === 'investigate' && (s.count || 1) > 1 && k && !(k.stitches || []).some((x) => /^c\d+$/.test(x))) W(`${q.id}.${s.id}: investigation without clue stitches (.c1, .c2 …)`);
    }
    for (const b of s.branches || []) { if (b !== 'end' && !ids.has(b)) E(`${q.id}.${s.id}: branch to unknown step ${b}`); targets.add(b); }
    const t = s.target;
    if (['talk', 'choose', 'escort'].includes(s.type) && typeof t === 'string' && !t.startsWith('$') && !npcs.has(t) && !NON_NPC_TARGETS.has(t)) E(`${q.id}.${s.id}: talk target ${t} is not an npc`);
    if (!s.text) W(`${q.id}.${s.id}: no objective text`);
  }
  // reachability: sequential flow skips branch targets
  const seqOk = new Set([q.steps[0].id]);
  q.steps.forEach((s, i) => { if (i > 0 && !targets.has(s.id)) seqOk.add(s.id); });
  for (const s of q.steps) if (!seqOk.has(s.id) && !targets.has(s.id)) E(`${q.id}.${s.id}: step is unreachable`);
}
// main line per chapter: every chapter 1..6 has main quests and the chain is connected
for (let ch = 1; ch <= 6; ch++) {
  const m = story.quests.filter((q) => q.chain === 'main' && q.chapter === ch);
  if (!m.length) W(`chapter ${ch}: no main quests yet`);
  if (ch < 6 && !story.quests.some((q) => q.endsChapter === ch)) W(`chapter ${ch}: nothing ends it (endsChapter)`);
}
// ---------- ink: speakers, hubs, consequence ids ----------
for (const [name, k] of Object.entries(knots)) {
  for (const sp of k.speakers || []) if (!SPECIAL_SPEAKERS.has(sp) && !npcs.has(sp)) E(`ink ${name} (${k.file}): unknown speaker "${sp}"`);
  const m = /^talk_(\w+?)(_ch\d+)?$/.exec(name); if (m && !npcs.has(m[1])) E(`hub ${name}: no such npc`);
  const o = /^offer_(\w+)$/.exec(name); if (o && !qById[o[1]]) E(`offer ${name}: no such quest`);
}
const REG = { deed: 'deeds', deed_public: 'deeds', betray: 'deeds', rumor: 'rumors', refute: 'rumors', rumor_on: 'rumors', learn: 'facts', knows: 'facts', later: 'events', at_chapter: 'events', give: 'items', has: 'items', take: 'items', startq: null, failq: null, qstate: null, trade: 'merchants', settrade: 'merchants', addrep: 'factions', rep: 'factions', tier: 'factions', did: 'deeds' };
const flagsSet = new Set(), flagsRead = new Set();
for (const [file, src] of Object.entries(inkSrc)) {
  if (file === 'common.ink') continue;
  for (const [fn, reg] of Object.entries(REG)) {
    const re = fn === 'later' ? /\blater\(\s*\d+\s*,\s*"([^"]+)"/g : fn === 'at_chapter' ? /\bat_chapter\(\s*\d+\s*,\s*"([^"]+)"/g : new RegExp(`\\b${fn}\\("([^"]+)"`, 'g');
    for (const m of src.matchAll(re)) {
      const id = m[1];
      if (fn === 'startq' || fn === 'failq' || fn === 'qstate') { if (!qById[id]) looseE(`${file}: ${fn}("${id}") — no such quest`); continue; }
      if (reg && !(cons[reg] || {})[id]) looseE(`${file}: ${fn}("${id}") — not in consequences.json ${reg}`);
    }
  }
  for (const m of src.matchAll(/\bset\("([^"]+)"/g)) flagsSet.add(m[1]);
  for (const m of src.matchAll(/\binc\("([^"]+)"/g)) flagsSet.add(m[1]);
  for (const m of src.matchAll(/\b(?:flag|is)\("([^"]+)"\)/g)) flagsRead.add(m[1]);
  for (const m of src.matchAll(/\b(?:trust|fear|respect|hostile|promised|debt|heard|met|npcstate)\("([^"]+)"/g)) { const id = m[1]; if (!npcs.has(id) && !/^p_/.test(id)) E(`${file}: relation/npc call with unknown npc "${id}"`); }
}
// flags set by story.json
const walk = (o, fn) => { if (Array.isArray(o)) o.forEach((x) => walk(x, fn)); else if (o && typeof o === 'object') { fn(o); Object.values(o).forEach((x) => walk(x, fn)); } };
for (const q of story.quests) for (const o of q.outcomes) for (const w of o.worldEffects || []) { const p = w.split(':'); if (p[0] === 'inc') flagsSet.add(p[1]); if (p[0] === 'flag') flagsSet.add(p.slice(1).join(':').split('=')[0]); if (['deed', 'rumor', 'refute', 'learn', 'later'].includes(p[0])) { const id = p[0] === 'later' ? p[2] : p[1]; const reg = { deed: 'deeds', rumor: 'rumors', refute: 'rumors', learn: 'facts', later: 'events' }[p[0]]; if (!(cons[reg] || {})[id]) E(`${q.id} outcome: ${w} — not in consequences.json`); } if (p[0] === 'start' || p[0] === 'fail') { if (!qById[p[1]]) E(`${q.id} outcome: ${w} — no such quest`); } }
const KNOWN_FLAGS = new Set(['night', 'hero_name', 'sacrificed_any', 'troll', 'ending', 'hero_remembers']);
for (const f of flagsRead) if (!flagsSet.has(f) && !KNOWN_FLAGS.has(f) && !f.startsWith('met_') && !f.startsWith('bought_')) W(`flag "${f}" is read in ink but never set`);
// conditions in story.json that read flags
const condKeys = new Set();
walk(story.quests, (o) => { for (const k of ['requires', 'if', 'offerIf', 'autoIf']) if (o[k] && typeof o[k] === 'object') walk(o[k], (c) => Object.keys(c).forEach((x) => condKeys.add(x.replace(/_(not|in|gte|lte|lt|gt)$/, '')))); });
for (const k of condKeys) if (!['sacrificed_n', 'night', 'all', 'any', 'not', 'card', 'clarity', 'class', 'school', 'gold', 'dreams', 'sacrificed_any', 'chapter', 'day', 'knows', 'heard', 'rumor', 'did', 'item'].includes(k) && !/^(bond|rep|trust|fear|respect|hostility|hostile|promise|debt|did|rumor|knows|betrayed|q|npc|trade)_/.test(k) && !flagsSet.has(k)) W(`condition key "${k}" is never set`);
// merchants
for (const [id, m] of Object.entries(cons.merchants || {})) { if (m.npc && !npcs.has(m.npc)) E(`merchant ${id}: npc ${m.npc} missing in story.json`); for (const o of m.stock || []) if (o.type === 'charm' && !(cons.charms || {})[o.charm]) E(`merchant ${id}: charm ${o.charm} unknown`); }
for (const [id, n] of Object.entries(cons.npcs || {})) if (!npcs.has(id)) W(`consequences npc ${id} is not in story.json (yet)`);

for (const w of warns) console.log('WARN ', w);
for (const e of errors) console.log('ERROR', e);
console.log(`validate: ${story.quests.length} quests, ${Object.keys(knots).length} knots — ${errors.length} errors, ${warns.length} warnings`);
process.exit(errors.length ? 1 : 0);
