// World state: the consequence system.
// Faction reputation, per-NPC relations (trust/fear/respect/hostility), what the hero knows,
// deeds and their witnesses, rumours (true and false) that spread day by day, promises, debts,
// betrayals, deferred consequences and merchants whose terms depend on all of the above.
// Pure logic: no DOM. Content lives in narrative/consequences.json; documented in docs/CHOICE_FLAGS.md.

export const REL_KINDS = ['trust', 'fear', 'respect', 'hostility'];
export const REL_RU = { trust: 'доверие', fear: 'страх', respect: 'уважение', hostility: 'вражда' };
export const TIERS = [
  { id: 'enemy', name: 'Враг', max: -50, price: null },
  { id: 'dislike', name: 'Неприязнь', max: -15, price: 1.5 },
  { id: 'stranger', name: 'Чужой', max: 14, price: 1 },
  { id: 'own', name: 'Свой', max: 49, price: .9 },
  { id: 'close', name: 'Близкий', max: 1e9, price: .8 },
];
let D = { factions: {}, npcs: {}, social: {}, ears: {}, deeds: {}, rumors: {}, facts: {}, events: {}, merchants: {}, items: {} };
export function setData(data) { D = { factions: {}, npcs: {}, social: {}, ears: {}, deeds: {}, rumors: {}, facts: {}, events: {}, merchants: {}, items: {}, ...data }; return D; }
export const data = () => D;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// deterministic hash in [0,1): rumours spread the same way for the same save
export function hash01(...parts) { let h = 2166136261; for (const ch of parts.join('|')) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15; return (h >>> 0) / 4294967296; }

export function initWS(G) {
  const W = (G.ws = G.ws || {});
  W.v = W.v || 1;
  W.chapter = W.chapter || 1;
  W.rep = W.rep || {}; for (const f of Object.keys(D.factions)) if (W.rep[f] === undefined) W.rep[f] = D.factions[f].start || 0;
  W.rel = W.rel || {};
  W.know = W.know || {};       // facts the hero knows: id -> {src, day}
  W.heard = W.heard || {};     // npc -> {deedOrFact: {src, day}}
  W.deeds = W.deeds || {};     // deed id -> {day, witnesses, n}
  W.rumors = W.rumors || {};   // rumour id -> {truth, strength, day, knowers:{npc:day}, hit:{faction:true}, refuted}
  W.promises = W.promises || {};
  W.debts = W.debts || {};
  W.betrayals = W.betrayals || [];
  W.deferred = W.deferred || [];
  W.log = W.log || [];         // journal of consequences, newest last
  W.trade = W.trade || {};     // merchant flags set by story: {merchantId: {flag: value}}
  W.lastDay = W.lastDay ?? null;
  W.items = W.items || {};     // story items with provenance: id -> {from, day, stolen}
  return W;
}
const dayOf = (G) => Math.floor((G.time || 0) / 480);
function log(G, kind, text) { const W = G.ws; if (!text) return; W.log.push({ day: dayOf(G), kind, text }); if (W.log.length > 200) W.log.splice(0, W.log.length - 200); }

// ---------------- chapters ----------------
export const chapter = (G) => (G.ws && G.ws.chapter) || 1;
export function setChapter(G, n) { initWS(G); if (n > G.ws.chapter) { G.ws.chapter = n; log(G, 'chapter', `Глава ${n}`); return true; } return false; }

// ---------------- reputation ----------------
export const rep = (G, f) => (G.ws && G.ws.rep[f]) || 0;
export function tierOf(v) { for (const t of TIERS) if (v <= t.max) return t; return TIERS[TIERS.length - 1]; }
export function addRep(G, f, n, why) {
  initWS(G); if (!n || !(f in G.ws.rep) && !D.factions[f]) return 0;
  const before = G.ws.rep[f] || 0, after = clamp(before + n, -100, 100); G.ws.rep[f] = after;
  const t0 = tierOf(before), t1 = tierOf(after);
  log(G, 'rep', `${D.factions[f]?.name || f}: ${n > 0 ? '+' : ''}${n}${why ? ' — ' + why : ''}`);
  return t0.id !== t1.id ? t1 : null;
}

// ---------------- relations ----------------
export function rel(G, npc) {
  initWS(G);
  if (!G.ws.rel[npc]) { const d = (D.npcs[npc] && D.npcs[npc].rel) || {}; G.ws.rel[npc] = { trust: d.trust || 0, fear: d.fear || 0, respect: d.respect || 0, hostility: d.hostility || 0 }; }
  return G.ws.rel[npc];
}
export function addRel(G, npc, kind, n, why) {
  if (kind === 'hostile') kind = 'hostility';
  if (!REL_KINDS.includes(kind) || !n) return;
  const r = rel(G, npc); r[kind] = clamp(r[kind] + n, 0, 10);
  // trust and hostility pull against each other
  if (kind === 'trust' && n > 0) r.hostility = clamp(r.hostility - Math.ceil(n / 2), 0, 10);
  if (kind === 'hostility' && n > 0) r.trust = clamp(r.trust - Math.ceil(n / 2), 0, 10);
  if (why) log(G, 'rel', `${D.npcs[npc]?.name || npc}: ${REL_RU[kind]} ${n > 0 ? '+' : ''}${n} — ${why}`);
}
// legacy bond (-3..+3 steps) maps onto trust/hostility
export function bond(G, npc, n) { if (n > 0) addRel(G, npc, 'trust', n * 2); else if (n < 0) addRel(G, npc, 'hostility', -n * 2); }
export function attitude(G, npc) {
  const r = rel(G, npc), warm = r.trust + r.respect / 2, cold = r.hostility + r.fear / 2;
  if (r.hostility >= 7) return { id: 'hostile', name: 'враждебен' };
  if (r.fear >= 7 && r.fear > r.trust) return { id: 'afraid', name: 'боится' };
  if (warm - cold >= 7) return { id: 'close', name: 'близок' };
  if (warm - cold >= 3) return { id: 'warm', name: 'тепло' };
  if (cold - warm >= 3) return { id: 'wary', name: 'настороже' };
  return { id: 'neutral', name: 'ровно' };
}

// ---------------- knowledge ----------------
export function learn(G, fact, src = 'saw') { initWS(G); if (G.ws.know[fact]) return false; G.ws.know[fact] = { src, day: dayOf(G) }; const F = D.facts[fact]; if (F) log(G, 'fact', `Узнано: ${F.title}`); return true; }
export const knows = (G, fact) => !!(G.ws && G.ws.know[fact]);
export function tell(G, npc, id, src = 'hero') { initWS(G); const h = (G.ws.heard[npc] = G.ws.heard[npc] || {}); if (!h[id]) h[id] = { src, day: dayOf(G) }; }
// does this npc know about a deed / fact / rumour?
export function heard(G, npc, id) {
  initWS(G);
  const h = G.ws.heard[npc] && G.ws.heard[npc][id]; if (h) return h.src;
  const R = G.ws.rumors[id]; if (R && R.knowers[npc] !== undefined && !R.refuted) return 'rumor';
  for (const [rid, R2] of Object.entries(G.ws.rumors)) if (!R2.refuted && R2.knowers[npc] !== undefined && D.rumors[rid] && D.rumors[rid].deed === id) return 'rumor';
  return null;
}

// ---------------- deeds, witnesses, rumours ----------------
export function factionOf(npc) { return (D.npcs[npc] && D.npcs[npc].faction) || null; }
// a deed done by the hero. witnesses: npc ids who saw it. public: the whole settlement saw it.
export function deed(G, id, { witnesses = [], public: pub = false } = {}) {
  initWS(G);
  const def = D.deeds[id] || {}, W = G.ws;
  const list = [...new Set([...(witnesses || []), ...(pub ? (def.public || []) : [])])];
  const rec = W.deeds[id] = W.deeds[id] || { day: dayOf(G), witnesses: [], n: 0 };
  rec.n++; for (const w of list) if (!rec.witnesses.includes(w)) rec.witnesses.push(w);
  for (const w of list) tell(G, w, id, 'witness');
  // factions that saw it react now
  const seen = new Set(list.map(factionOf).filter(Boolean)); if (pub && def.publicFaction) seen.add(def.publicFaction);
  for (const [f, n] of Object.entries(def.rep || {})) if (seen.has(f) || def.repAlways) addRep(G, f, n, def.title);
  for (const [npc, ch] of Object.entries(def.rel || {})) for (const [k, n] of Object.entries(ch)) addRel(G, npc, k, n, def.title);
  if (def.rumor) startRumor(G, def.rumor, { knowers: list, strength: def.strength });
  if (def.betray) betray(G, id, { npc: def.npc, faction: def.faction });
  log(G, 'deed', def.title || id);
  return rec;
}
export const did = (G, id) => !!(G.ws && G.ws.deeds[id]);
export function startRumor(G, id, { knowers = [], strength, truth } = {}) {
  initWS(G);
  const def = D.rumors[id] || {}, W = G.ws, d = dayOf(G);
  const R = W.rumors[id] = W.rumors[id] || { truth: truth ?? def.truth ?? true, strength: 0, day: d, knowers: {}, hit: {}, refuted: false };
  R.refuted = false; R.strength = clamp(Math.max(R.strength, strength ?? def.strength ?? .5), 0, 1);
  for (const k of knowers.length ? knowers : (def.origin || [])) if (R.knowers[k] === undefined) R.knowers[k] = d;
  hitFactions(G, id);
  return R;
}
export const rumorActive = (G, id) => !!(G.ws && G.ws.rumors[id] && !G.ws.rumors[id].refuted && G.ws.rumors[id].strength > .05);
// rumours reach a faction when one of its "ears" hears them
function hitFactions(G, id) {
  const R = G.ws.rumors[id], def = D.rumors[id] || {};
  for (const [f, ears] of Object.entries(D.ears)) {
    if (R.hit[f]) continue;
    if (ears.some((e) => R.knowers[e] !== undefined)) { R.hit[f] = true; const n = (def.rep || {})[f]; if (n) addRep(G, f, n, `слух: ${def.text || id}`); }
  }
}
export function refute(G, id, by) {
  initWS(G); const R = G.ws.rumors[id]; if (!R || R.refuted) return false;
  R.refuted = true; const def = D.rumors[id] || {};
  // the damage a false rumour did is undone where it was believed
  if (def.truth === false) for (const f of Object.keys(R.hit)) { const n = (def.rep || {})[f]; if (n) addRep(G, f, -n, `слух опровергнут${by ? ' (' + (D.npcs[by]?.name || by) + ')' : ''}`); }
  log(G, 'rumor', `Слух опровергнут: ${def.text || id}`);
  return true;
}
// one day passes: rumours spread along who-talks-to-whom and fade
export function spreadDay(G, day) {
  const W = G.ws;
  for (const [id, R] of Object.entries(W.rumors)) {
    if (R.refuted || R.strength <= .05) continue;
    const add = [];
    for (const k of Object.keys(R.knowers)) for (const n of D.social[k] || []) if (R.knowers[n] === undefined && hash01(G.seed || 1, id, k, n, day) < R.strength) add.push(n);
    for (const n of add) R.knowers[n] = day;
    R.strength = clamp(R.strength - (D.rumors[id]?.fade ?? .08), 0, 1);
    hitFactions(G, id);
  }
}

// ---------------- promises, debts, betrayals ----------------
export function promise(G, id, npc, { text, due } = {}) { initWS(G); const def = (D.promises || {})[id] || {}; if (G.ws.promises[id]) return G.ws.promises[id]; const p = G.ws.promises[id] = { to: npc || def.to, text: text || def.text || id, made: dayOf(G), due: due ?? def.due ?? null, state: 'open' }; log(G, 'promise', `Обещано (${D.npcs[p.to]?.name || p.to}): ${p.text}`); return p; }
export const promiseState = (G, id) => (G.ws && G.ws.promises[id] && G.ws.promises[id].state) || 'none';
export function keepPromise(G, id) { const p = G.ws && G.ws.promises[id]; if (!p || p.state !== 'open') return false; p.state = 'kept'; addRel(G, p.to, 'trust', 2); addRel(G, p.to, 'respect', 1); log(G, 'promise', `Слово сдержано: ${p.text}`); return true; }
export function breakPromise(G, id, why) { const p = G.ws && G.ws.promises[id]; if (!p || p.state !== 'open') return false; p.state = 'broken'; p.why = why || null; addRel(G, p.to, 'trust', -3); addRel(G, p.to, 'respect', -2); addRel(G, p.to, 'hostility', 2); deed(G, 'd_broke_promise', { witnesses: [p.to] }); log(G, 'promise', `Слово нарушено: ${p.text}`); return true; }
export function releasePromise(G, id) { const p = G.ws && G.ws.promises[id]; if (!p || p.state !== 'open') return false; p.state = 'released'; log(G, 'promise', `Освобождён от слова: ${p.text}`); return true; }
export function addDebt(G, npc, amount, days) { initWS(G); const d = G.ws.debts[npc] = G.ws.debts[npc] || { amount: 0, due: null }; d.amount += amount; if (days) d.due = dayOf(G) + days; log(G, 'debt', `Долг ${D.npcs[npc]?.name || npc}: ${d.amount} зол.`); return d; }
export const debtOf = (G, npc) => (G.ws && G.ws.debts[npc] && G.ws.debts[npc].amount) || 0;
export function payDebt(G, npc) { const d = G.ws && G.ws.debts[npc]; if (!d || d.amount <= 0) return 0; if ((G.gold || 0) < d.amount) return -1; G.gold -= d.amount; const a = d.amount; d.amount = 0; d.due = null; addRel(G, npc, 'trust', 1); log(G, 'debt', `Долг отдан: ${D.npcs[npc]?.name || npc}`); return a; }
export const debtOverdue = (G, npc) => { const d = G.ws && G.ws.debts[npc]; return !!(d && d.amount > 0 && d.due !== null && dayOf(G) > d.due); };
export function betray(G, id, { npc, faction } = {}) { initWS(G); if (G.ws.betrayals.some((b) => b.id === id)) return; G.ws.betrayals.push({ id, npc, faction, day: dayOf(G) }); if (npc) { addRel(G, npc, 'hostility', 6); addRel(G, npc, 'trust', -6); } if (faction) addRep(G, faction, -40, 'предательство'); log(G, 'betray', (D.deeds[id] && D.deeds[id].title) || id); }
export const betrayed = (G, id) => !!(G.ws && G.ws.betrayals.some((b) => b.id === id));

// ---------------- deferred consequences ----------------
// when: {days} | {chapter} | {quest: id}; event ids are defined in consequences.json "events"
export function later(G, when, ev, payload) { initWS(G); if (G.ws.deferred.some((x) => x.ev === ev && !x.fired)) return; G.ws.deferred.push({ ev, dueDay: when.days !== undefined ? dayOf(G) + when.days : null, dueChapter: when.chapter ?? null, afterQuest: when.quest ?? null, payload: payload ?? null, fired: false, made: dayOf(G) }); }
export function dueEvents(G, isDone) {
  initWS(G); const out = [], d = dayOf(G), ch = G.ws.chapter;
  for (const x of G.ws.deferred) {
    if (x.fired) continue;
    if ((x.dueDay !== null && d >= x.dueDay) || (x.dueChapter !== null && ch >= x.dueChapter) || (x.afterQuest && isDone && isDone(x.afterQuest))) { x.fired = true; out.push({ ...x, def: D.events[x.ev] || {} }); }
  }
  return out;
}

// called on every in-game day change (and once on load)
export function newDay(G) {
  initWS(G); const d = dayOf(G);
  if (G.ws.lastDay === null) { G.ws.lastDay = d; return []; }
  const out = [];
  while (G.ws.lastDay < d) { G.ws.lastDay++; spreadDay(G, G.ws.lastDay); out.push(G.ws.lastDay); }
  // promises with a deadline break by themselves
  for (const [id, p] of Object.entries(G.ws.promises)) if (p.state === 'open' && p.due !== null && d > p.due) breakPromise(G, id, 'срок вышел');
  return out;
}

// ---------------- conditions ----------------
// extra keys understood on top of story.js flags. Returns undefined when the key is not ours.
export function value(G, k) {
  initWS(G);
  let m;
  if (k === 'chapter') return G.ws.chapter;
  if (k === 'day') return dayOf(G);
  if ((m = /^rep_(\w+)$/.exec(k)) && (m[1] in G.ws.rep || D.factions[m[1]])) return rep(G, m[1]);
  if ((m = /^(trust|fear|respect|hostility|hostile)_(\w+)$/.exec(k))) return rel(G, m[2])[m[1] === 'hostile' ? 'hostility' : m[1]];
  if ((m = /^promise_(\w+)$/.exec(k))) return promiseState(G, m[1]);
  if ((m = /^debt_(\w+)$/.exec(k))) return debtOf(G, m[1]);
  if ((m = /^did_(\w+)$/.exec(k))) return did(G, m[1]);
  if ((m = /^rumor_(\w+)$/.exec(k))) return rumorActive(G, m[1]);
  if ((m = /^knows_(\w+)$/.exec(k))) return knows(G, m[1]);
  if ((m = /^betrayed_(\w+)$/.exec(k))) return betrayed(G, m[1]);
  if ((m = /^trade_([a-z]+)_(\w+)$/.exec(k))) return ((G.ws.trade[m[1]] || {})[m[2]]) ?? false;
  return undefined;
}
// {heard: [npc, id]} style keys
export function testSpecial(G, k, v) {
  if (k === 'knows') return knows(G, v);
  if (k === 'knows_not') return !knows(G, v);
  if (k === 'heard') return !!heard(G, v[0], v[1]);
  if (k === 'heard_not') return !heard(G, v[0], v[1]);
  if (k === 'rumor') return rumorActive(G, v);
  if (k === 'rumor_not') return !rumorActive(G, v);
  if (k === 'did') return did(G, v);
  if (k === 'did_not') return !did(G, v);
  if (k === 'item') return !!(G.questItems || []).includes(v);
  if (k === 'item_not') return !(G.questItems || []).includes(v);
  return undefined;
}

// ---------------- merchants ----------------
// rules are evaluated with the story's condition tester; see consequences.json "merchants"
export function tradeTerms(G, mid, test) {
  initWS(G);
  const M = D.merchants[mid]; if (!M) return { open: false, reason: 'Здесь не торгуют.', priceMul: 1, offers: [] };
  const flags = G.ws.trade[mid] || {};
  const t = { id: mid, npc: M.npc, title: M.title, open: true, reason: null, restore: [], priceMul: 1, rare: true, offers: [], secret: null, notes: [] };
  // faction standing sets the base price
  const tier = M.faction ? tierOf(rep(G, M.faction)) : tierOf(0);
  if (tier.price === null && !M.ignoreFaction) { t.open = false; t.reason = M.enemyLine || `${D.factions[M.faction]?.name}: для них ты враг.`; t.restore.push(...(M.restoreFaction || ['Поднять репутацию фракции.'])); }
  else t.priceMul *= tier.price || 1;
  if (tier.id === 'dislike' && !M.ignoreFaction) { t.rare = false; t.notes.push('Редкий товар не продают тем, кого не любят.'); }
  // personal standing
  if (M.npc) { const r = rel(G, M.npc); if (r.hostility >= 7) { t.open = false; t.reason = t.reason || M.hostileLine || 'Тебе здесь не рады.'; t.restore.push(...(M.restoreHostile || [])); } else if (r.trust >= 6) { t.priceMul *= .9; t.notes.push('Своим — дешевле.'); } }
  if (flags.closed) { t.open = false; t.reason = flags.closedLine || t.reason || 'Закрыто.'; }
  if (flags.discount) t.priceMul *= 1 - flags.discount / 100;
  for (const r of M.rules || []) {
    if (!test(r.if)) continue;
    if (r.close) { t.open = false; t.reason = r.close; if (r.restore) t.restore.push(...[].concat(r.restore)); }
    if (r.closeRare) { t.rare = false; t.notes.push(r.closeRare); }
    if (r.price) t.priceMul *= r.price;
    if (r.note) t.notes.push(r.note);
    if (r.special) t.offers.push(...[].concat(r.special).map((o) => ({ ...(M.specials || {})[o], id: o, special: true })));
    if (r.secret) t.secret = { ...r.secret };
    if (r.requireQuest) { t.open = false; t.reason = r.requireQuest.line; t.restore.push(r.requireQuest.how); }
  }
  // a merchant that is closed may still have a secret door
  t.priceMul = Math.round(t.priceMul * 100) / 100;
  for (const o of M.stock || []) { if (o.rare && !t.rare) continue; if (o.if && !test(o.if)) continue; t.offers.unshift({ ...o }); }
  for (const o of t.offers) o.cost = o.price === undefined ? 0 : Math.max(1, Math.round(o.price * t.priceMul * (t.secret && !t.open ? (t.secret.mul || 1.5) : 1)));
  return t;
}
export function setTrade(G, mid, flag, v) { initWS(G); const f = G.ws.trade[mid] = G.ws.trade[mid] || {}; f[flag] = v; }

// ---------------- summary for the journal ----------------
export function summary(G) {
  initWS(G); const W = G.ws;
  return {
    chapter: W.chapter,
    factions: Object.entries(W.rep).map(([f, v]) => ({ id: f, name: D.factions[f]?.name || f, value: v, tier: tierOf(v) })),
    npcs: Object.keys(W.rel).filter((n) => D.npcs[n]).map((n) => ({ id: n, name: D.npcs[n].name, ...W.rel[n], attitude: attitude(G, n) })),
    promises: Object.entries(W.promises).map(([id, p]) => ({ id, ...p, toName: D.npcs[p.to]?.name || p.to })),
    debts: Object.entries(W.debts).filter(([, d]) => d.amount > 0).map(([npc, d]) => ({ npc, name: D.npcs[npc]?.name || npc, ...d, overdue: debtOverdue(G, npc) })),
    rumors: Object.entries(W.rumors).filter(([, R]) => !R.refuted && R.strength > .05).map(([id, R]) => ({ id, text: D.rumors[id]?.text || id, truth: R.truth, strength: R.strength, reach: Object.keys(R.knowers).length })),
    facts: Object.entries(W.know).map(([id, k]) => ({ id, title: D.facts[id]?.title || id, text: D.facts[id]?.text || '', ...k })),
    log: W.log.slice(-40),
  };
}
