// Skill engine: runs the data-driven skill trees from classes.js (effect primitives, passives, hooks, class resources).
import { CLASSES2, TREE_RULES, SUMMONS, SCHOOLS } from './classes.js';
import { HERO_HP } from './data.js';

let A = null; // game api, see bindSkills in game.js
export function bindSkills(api) { A = api; }
const rand = Math.random, TAU = Math.PI * 2;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return Math.abs(d); };
export const SCHOOL_COLOR = Object.fromEntries(Object.entries(SCHOOLS).map(([k, v]) => [k, v.color]));
const RGB = (hex) => { const n = parseInt(hex.slice(1, 7), 16); return `${n >> 16},${(n >> 8) & 255},${n & 255}`; };

// ---------- tree data ----------
export const NODES = {};
for (const [cls, C] of Object.entries(CLASSES2)) C.tree.forEach((b, bi) => b.nodes.forEach((n) => { NODES[cls + ':' + n.id] = { ...n, cls, branch: b.id, bi }; }));
// skills granted by the «Слово-ключ» gift of oblivion: any class can slot them
export const KEY_SKILLS = {
  cut_thread: { id: 'cut_thread', name: 'Обрыв нити', desc: 'Рвёт нить между тобой и врагом: рывком притягивает его и оглушает.', kind: 'active', ranks: 1, tier: 1, cost: { mp: 15 }, cd: 9, effects: [{ type: 'pull', at: 'target', toward: 'self', dist: 160, apply: [{ type: 'stun', dur: 1.5, bossDur: .5 }] }], key: true },
  foreign_gait: { id: 'foreign_gait', name: 'Чужая походка', desc: 'Шаг чужими ногами: мгновенный перенос на пять шагов вперёд.', kind: 'active', ranks: 1, tier: 1, cost: { mp: 12 }, cd: 6, effects: [{ type: 'blink', at: 'aim', dist: 160, iframes: .3 }], key: true },
  nameless_cry: { id: 'nameless_cry', name: 'Безымянный крик', desc: 'Крик без слов. Враги впереди забывают, зачем пришли, и бегут.', kind: 'active', ranks: 1, tier: 1, cost: { mp: 20 }, cd: 14, effects: [{ type: 'cone', at: 'aim', range: 130, arc: 100, dmg: .4, school: 'memory', apply: [{ type: 'debuff', kind: 'fear', dur: 2, bossDur: .6 }] }], key: true },
};
for (const k of Object.values(KEY_SKILLS)) NODES['*:' + k.id] = { ...k, cls: '*', branch: 'key', bi: -1 };
export const node = (cls, id) => NODES[cls + ':' + id] || NODES['*:' + id];
export const CLASS = (cls) => CLASSES2[cls];
export const rankOf = (G, id) => (G.tree && G.tree[id]) || (KEY_SKILLS[id] && G.memory && (G.memory.keyskills || []).includes(id) ? 1 : 0);
export function pointsTotal(G) { return Math.max(0, G.lvl - TREE_RULES.firstPointLevel + 1) * TREE_RULES.pointsPerLevel + 2 + (G.bonusPoints || 0); }
export function pointsSpent(G) { return Object.entries(G.tree || {}).reduce((s, [id, r]) => s + Math.min(r, (G.treePaid && G.treePaid[id]) ?? r), 0); }
export const pointsFree = (G) => pointsTotal(G) - pointsSpent(G);
export function branchPoints(G, bi) { const C = CLASSES2[G.cls]; return C.tree[bi].nodes.reduce((s, n) => s + rankOf(G, n.id), 0); }
export const WEAVE_COST = [10, 20, 35, 55, 80];
// why a node can't be learned (null when it can)
export function learnBlock(G, id) {
  const n = node(G.cls, id); if (!n) return 'нет такого';
  const r = rankOf(G, id), max = n.ranks || 1;
  if (G.memory && (G.memory.lostSkills || []).includes(id)) return 'отдано Забвению';
  if (r >= max) return 'изучено полностью';
  if (n.capstone && G.lvl < TREE_RULES.capstoneLevel) return `с ${TREE_RULES.capstoneLevel}-го уровня`;
  const need = TREE_RULES.tierPoints[n.tier] || 0;
  if (branchPoints(G, n.bi) < need) return `нужно ${need} очков в ветке`;
  for (const q of n.req || []) if (!rankOf(G, q)) return `сначала «${node(G.cls, q)?.name || q}»`;
  return null;
}
export function learn(G, id, payEcho) {
  const block = learnBlock(G, id); if (block) return block;
  const r = rankOf(G, id);
  if (payEcho) { // Вплетение: further ranks of a known skill for Отголоски
    if (!r) return 'сначала выучите навык';
    const cost = WEAVE_COST[Math.min(4, r)]; if (!A.spendEcho(cost)) return `нужно ${cost} Отголосков`;
    G.treePaid = G.treePaid || {}; G.treePaid[id] = (G.treePaid[id] ?? r);
  } else if (pointsFree(G) <= 0) return 'нет свободных очков';
  G.tree = G.tree || {}; G.tree[id] = r + 1;
  const n = node(G.cls, id);
  if (n.kind === 'active' && r === 0) { G.slots = G.slots || [null, null, null, null]; const free = G.slots.findIndex((s, i) => !s && slotOpen(G, i)); if (free >= 0) G.slots[free] = id; }
  return null;
}
export const slotOpen = (G, i) => G.lvl >= TREE_RULES.slotLevels[i];
export function resetTree(G) { G.tree = {}; G.treePaid = {}; G.slots = [null, null, null, null]; }
export function starterTree(G) {
  resetTree(G); const C = CLASSES2[G.cls];
  for (const bi of [0, 1]) { const n = C.tree[bi].nodes.find((x) => x.kind === 'active' && x.tier === 1); if (n) learn(G, n.id); }
}

// ---------- runtime state ----------
let P = null, S = null;
const timers = [], zones = [], traps = [], corpses = [], orbs = [];
export function initPlayer(player, G) {
  P = player; const C = CLASSES2[G.cls], R = C.resource;
  S = P.sk = { res: R.start || 0, idle: 0, buffs: [], cds: {}, icd: {}, counters: {}, channel: null, overheat: 0, boiling: false, consecrated: false, still: 0, lastKill: null, knot: null, combo: 0, comboT: 0, invis: 0, shieldHp: 0, shieldT: 0, shieldOnHurt: null, reflect: null, prevented: 0, nextHit: null, dodged: 0 };
  G.skillState = G.skillState || { kind: {}, notches: 0 };
  timers.length = zones.length = traps.length = corpses.length = orbs.length = 0;
}
export const clearWorld = () => { timers.length = zones.length = traps.length = corpses.length = orbs.length = 0; if (S) { S.channel = null; } };
const later = (t, fn) => timers.push({ t, fn });

// ---------- stats ----------
const SOURCES = [];
function passiveMods(G, out) {
  for (const [id, r] of Object.entries(G.tree || {})) {
    const n = node(G.cls, id); if (!n || !r || !n.mods) continue;
    for (const m of n.mods) out.push({ stat: m.stat, value: m.per !== undefined ? m.per * r : m.value });
  }
}
// all stat modifiers in one bag {stat: sum}
export function statMods(G) {
  const list = []; passiveMods(G, list);
  if (S) {
    for (const b of S.buffs) if (b.mods) for (const m of b.mods) list.push({ stat: m.stat, value: (m.value ?? 0) * (b.stacks || 1) });
    const C = CLASSES2[G.cls], R = C.resource;
    if (R.thresholds) for (const t of R.thresholds) if (S.res >= t.at) list.push(...t.mods);
    if (S.overheat > 0 && R.overheat) list.push(...R.overheat.mods);
    if (S.boiling) list.push({ stat: 'dmg%', value: .15 });
    // choir-like auras counting things around
    for (const n of activeAuras(G)) { const cnt = Math.min(n.maxCount || 99, n.countOf === 'corpse' ? corpses.filter((c) => dist(c, P) < (n.radius || 160)).length : 0); for (const m of n.perCount) list.push({ stat: m.stat, value: m.value * cnt }); }
    if (G.cls === 'hollow' && R.emptiness) { const k = Math.min(R.emptiness.cap, (G.memory && G.memory.sacrificed ? G.memory.sacrificed.length : 0)); for (const m of R.emptiness.perOblivion) list.push({ stat: m.stat, value: m.value * k }); }
  }
  if (A && A.extraMods) list.push(...A.extraMods());
  const bag = {}; for (const m of list) if (m && m.stat) bag[m.stat] = (bag[m.stat] || 0) + (+m.value || 0);
  return bag;
}
function activeAuras(G) { const out = []; for (const [id, r] of Object.entries(G.tree || {})) { const n = node(G.cls, id); if (r && n && n.kind === 'passive' && n.effects) for (const e of n.effects) if (e.type === 'aura' && e.permanent && e.perCount) out.push(e); } return out; }
const M = () => P.ds.mods || {};

// ---------- hooks ----------
function allHooks(G) {
  const out = [];
  for (const [id, r] of Object.entries(G.tree || {})) {
    const n = node(G.cls, id); if (!n || !r) continue;
    if (n.hook) out.push({ src: id, hook: n.hook, cond: n.cond, effect: n.effect, icd: n.icd, threshold: n.threshold, counter: n.counter, cost: n.cost, per: n.per, rank: r });
    if (n.extra && n.extra.hook) out.push({ src: id + '+', hook: n.extra.hook, cond: n.extra.cond, effect: n.extra.effect, rank: r });
  }
  for (const b of S.buffs) if (b.hook) out.push({ src: 'buff:' + b.id, hook: b.hook, effect: b.effect, rank: 1 });
  if (A.extraHooks) out.push(...A.extraHooks());
  return out;
}
function condOk(cond, ctx) {
  if (!cond) return true;
  for (const part of String(cond).split(',')) {
    const [k, v] = part.split(':'); const e = ctx.target;
    if (k === 'by' && ctx.by !== v) return false;
    if (k === 'still' && !(S.still > .4)) return false;
    if (k === 'melee' && !ctx.melee) return false;
    if (k === 'proj' && !(ctx.proj && String(ctx.proj).startsWith(v))) return false;
    if (k === 'skill' && ctx.skill !== v) return false;
    if (k === 'overheat' && !(S.overheat > 0)) return false;
    if (k === 'school' && ctx.school !== v) return false;
    if (k === 'target') {
      if (!e) return false;
      if (v === 'threaded' && !(e.threads > 0)) return false;
      if (v === 'burning' && !(e.dots || []).some((d) => d.kind === 'burn')) return false;
      if (v === 'marked' && !(e.marks && Object.keys(e.marks).length)) return false;
      if (v === 'undead' && !A.isUndead(e)) return false;
    }
  }
  return true;
}
// scale a passive's main number by rank
function perScale(eff, per, r) {
  if (per === undefined || r <= 1) return eff;
  const add = per * (r - 1);
  const one = (e) => { const o = { ...e }; for (const k of ['value', 'chance', 'dps', 'dmg', 'count', 'dur']) if (typeof o[k] === 'number') { o[k] += add; return o; } if (o.mods) { o.mods = o.mods.map((m, i) => (i === 0 ? { ...m, value: (m.value || 0) + add } : m)); } return o; };
  return Array.isArray(eff) ? eff.map(one) : one(eff);
}
export function fire(hook, ctx = {}) {
  if (!P || !S) return;
  const G = A.G();
  for (const h of allHooks(G)) {
    if (h.hook !== hook || !condOk(h.cond, ctx)) continue;
    if (hook === 'lowHp' && P.hp / P.ds.maxHp > (h.threshold || .3)) continue;
    if (h.icd) { if ((S.icd[h.src] || 0) > A.now()) continue; }
    if (h.counter) { S.counters[h.src] = (S.counters[h.src] || 0) + 1; if (S.counters[h.src] % h.counter) continue; }
    if (h.cost && h.cost.echo && !A.spendEcho(h.cost.echo)) continue;
    if (h.icd) S.icd[h.src] = A.now() + h.icd;
    const eff = perScale(h.effect, h.per, h.rank);
    // effects that modify the shot being fired
    if (hook === 'onCast' && !Array.isArray(eff) && eff.type === 'pierce') { S.nextShot = { pierce: eff.count, forceCrit: !!eff.forceCrit }; continue; }
    run(Array.isArray(eff) ? eff : [eff], { ...ctx, src: h.src, hooked: true });
    if (hook === 'onDeath') ctx.saved = true;
  }
}

// ---------- resources ----------
export function resInfo(G) {
  const R = CLASSES2[G.cls].resource, m = M();
  if (R.onEnemy) { const n = R.id === 'thread' ? A.ents().filter((e) => e.kind === 'enemy' && e.threads > 0).reduce((s, e) => s + e.threads, 0) : 0; return { id: R.id, name: R.name, value: n, max: R.id === 'thread' ? (R.max + (m.threadMax || 0)) : R.maxStacks, enemy: true }; }
  if (R.onGround) return { id: R.id, name: R.name, value: corpses.length, max: R.max };
  const max = (R.max || 100) + (R.id === 'focus' ? (m.focusMax || 0) : R.id === 'lapse' ? (m.lapseMax || 0) : 0);
  return { id: R.id, name: R.name, value: S ? S.res : 0, max, over: S && S.overheat > 0, boiling: S && S.boiling, consecrated: S && S.consecrated };
}
export function gainRes(id, n) {
  const G = A.G(), R = CLASSES2[G.cls].resource; if (R.id !== id || !S) return;
  const m = M(), mul = 1 + (m[id + 'Gain%'] || 0);
  const info = resInfo(G); S.res = Math.min(info.max, S.res + n * mul); S.idle = 0;
  if (id === 'heat' && S.overheat <= 0 && S.res >= (R.overheat.at + (m.overheatAt || 0))) { S.overheat = R.overheat.dur + (m.overheatDur || 0); A.toast('Перегрев! Заклинания бесплатны', 1200); A.fx({ type: 'ring', x: P.x, y: P.y - 10, t: 0, life: .6, color: '#ff8a3a', r: 90 }); fire('onOverheat', {}); }
  if (id === 'rage' && S.res >= 100 && !S.boiling) { S.boiling = true; A.toast('Кипение: +15 % урона', 1000); }
  if (id === 'faith' && R.consecrate && S.res >= R.consecrate.at && !S.consecrated) { S.consecrated = true; A.toast('Вера полна: следующее заклинание освящено', 1300); }
  if (id === 'lapse' && R.atMax && S.res >= info.max) { addBuff({ id: 'lapsemax', dur: R.atMax.dur, mods: R.atMax.mods, name: R.atMax.name }); }
}
function tickRes(dt, G) {
  const R = CLASSES2[G.cls].resource, m = M();
  S.idle += dt;
  if (R.id === 'focus') { const still = S.still > (R.stillDelay || .4); const info = resInfo(G); S.res = Math.min(info.max, S.res + dt * (still ? R.regenStill : R.regen) * (1 + (m['focusRegen%'] || 0))); }
  else if (R.decay && !R.onEnemy && S.idle > R.decay.delay) S.res = Math.max(0, S.res - R.decay.perSec * dt);
  if (R.id === 'rage' && S.boiling && S.res < 70) S.boiling = false;
  if (R.id === 'faith' && S.res < (R.consecrate ? R.consecrate.at : 100)) S.consecrated = false;
  if (S.overheat > 0) { S.overheat -= dt; S.burnT = (S.burnT || 0) - dt; if (S.burnT <= 0) { S.burnT = .5; A.selfDamage(P.ds.maxHp * (R.overheat.selfBurn || .02) * .5 * (1 + (m['overheatSelfBurn%'] || 0)), 'fire'); } if (S.overheat <= 0) S.res = 0; }
}
// ---------- buffs ----------
function addBuff(b) {
  const old = b.id && S.buffs.find((x) => x.id === b.id);
  if (old) { if (b.stack) old.stacks = Math.min(b.stack, (old.stacks || 1) + 1); old.dur = Math.max(old.dur, b.dur ?? 1e9); if (b.charges) old.charges = b.charges; return old; }
  S.buffs.push({ ...b, dur: b.dur ?? 1e9, stacks: b.stacks || 1 }); return S.buffs[S.buffs.length - 1];
}
export const hasBuff = (kind) => S && S.buffs.some((b) => b.kind === kind);
function tickBuffs(dt) {
  for (const b of S.buffs) {
    b.dur -= dt;
    if (b.dur <= 0 && b.onEnd) { const e = b.onEnd; if (e.type === 'heal' && e.fromPrevented) healPlayer(S.prevented * e.fromPrevented, true); else run([e], {}); }
  }
  S.buffs = S.buffs.filter((b) => b.dur > 0 && b.charges !== 0);
  if (!hasBuff('cannotDie')) S.prevented = 0;
}
// ---------- damage pipeline ----------
export function dealDamage(e, mult, school, ctx = {}) {
  if (!e || e.hp <= 0 || e.dead) return 0;
  const G = A.G(), m = M(), ds = P.ds;
  if (e.kind === 'ally') return 0;
  let dmg = ds.dmg * mult * (S.consecratedNow || 1);
  if (m['convertTo:memory'] && school !== 'memory') school = 'memory';
  let pct = 1 + (m['dmg%'] || 0) + (m[(school || 'phys') + '%'] || 0);
  if (school === 'fire' && ctx.dot) pct += m['burnDmg%'] || 0;
  if (ctx.summon) pct += m['summonDmg%'] || 0;
  if (e.marks && Object.keys(e.marks).length) pct += (m['dmgVsMarked%'] || 0);
  if (G.skillState.kind[e.type]) pct += G.skillState.kind[e.type];
  if (m['dmgPerMissingHp10%']) pct += m['dmgPerMissingHp10%'] * Math.floor(10 * (1 - P.hp / ds.maxHp));
  if (m['dmgPerOblivion%']) pct += m['dmgPerOblivion%'] * ((G.memory && G.memory.sacrificed || []).length);
  // target side
  let taken = 1;
  for (const mk of Object.values(e.marks || {})) for (const md of mk.mods || []) if (md.stat === 'dmgTakenFromYou%') taken += md.value;
  for (const d of e.debuffs || []) for (const md of d.mods || []) { if (md.stat === 'dmgTaken%') taken += md.value; if (md.stat === 'armor%') taken -= md.value * .5; }
  if (ctx.vsUndead && A.isUndead(e)) dmg *= ctx.vsUndead;
  if (school === 'holy' && A.isUndead(e)) dmg *= 1.5;
  if (school === 'memory' && A.isUndead(e)) dmg *= (SCHOOLS.memory.vsUndead || .7);
  if (ctx.lowHpBonus && e.hp / e.maxHp < ctx.lowHpBonus.below) dmg *= ctx.lowHpBonus.mul;
  if (ctx.bonusVsMarked && e.marks && Object.keys(e.marks).length) dmg *= ctx.bonusVsMarked;
  // next-hit bonuses
  if (!ctx.dot && !ctx.summon) {
    const nh = S.buffs.find((b) => b.mods && b.mods.some((x) => x.stat === 'nextHitDmg%'));
    if (nh) { pct += nh.mods.find((x) => x.stat === 'nextHitDmg%').value; if (nh.charges) nh.charges--; else nh.dur = 0; }
  }
  // shatter frozen
  let shattered = false;
  const R = CLASSES2[G.cls].resource;
  if (e.freeze > 0 && R.shatter && (R.shatter.schools.includes(school || 'phys') || ctx.shatter) && !ctx.dot) { dmg *= 1 + R.shatter.bonus + (m.shatterBonus || 0); if (R.shatter.endsFreeze) e.freeze = 0; shattered = true; }
  // crit
  let critCh = ds.critChance + (ctx.critBonus || 0);
  if (ctx.backstab) critCh += ctx.backstab.critChance || 0;
  const crit = !ctx.dot && !ctx.summon && (ctx.forceCrit || rand() < critCh);
  if (crit) dmg *= 1.6 + (m.critDmg || 0) + (ctx.critMul ? ctx.critMul - 1 : 0);
  if (ctx.backstab) dmg *= 1 + ctx.backstab.bonus + (m['backstab%'] || 0);
  dmg *= Math.max(.2, pct) * Math.max(.2, taken) * (.9 + rand() * .2);
  const dv = ctx.dv || [Math.sign(e.x - (ctx.from ? ctx.from.x : P.x)), Math.sign(e.y - (ctx.from ? ctx.from.y : P.y))];
  const dealt = A.applyDamage(e, Math.max(1, Math.round(dmg)), dv, school, crit, ctx);
  if (crit) anim('hit', e.x, e.y - 22 * (e.scale || 1), { scale: 1 });
  if (dealt <= 0) return 0;
  // linked enemies share
  for (const d of e.debuffs || []) if (d.kind === 'link' && !ctx.linked) for (const o of A.ents()) if (o !== e && o.kind === 'enemy' && o.hp > 0 && (o.debuffs || []).some((x) => x.kind === 'link')) dealDamage(o, mult * d.share, school, { ...ctx, linked: true, dot: true });
  const ls = (ctx.lifesteal || 0) + (ctx.dot || ctx.summon ? 0 : (m.lifesteal || 0));
  if (ls > 0) healPlayer(dealt * ls * HERO_HP, false, true); // урон по врагу — в его шкале, здоровье героя — в своей
  if (R.id === 'rage' && !ctx.dot && !ctx.summon && ctx.basic) gainRes('rage', R.gain.onHit);
  if (R.id === 'faith' && A.isUndead(e) && !ctx.dot) gainRes('faith', R.gain.onHitUndead);
  if (shattered) fire('onShatter', { target: e, hitPos: e });
  if (!ctx.dot && !ctx.hooked) { fire('onHit', { target: e, school, proj: ctx.proj, melee: ctx.melee, hitPos: e }); if (crit) fire('onCrit', { target: e, hitPos: e }); }
  if (ctx.echo) fire('onEchoHit', { target: e });
  if (ctx.summon) fire('onSummonHit', { target: e, hitPos: e, hooked: true });
  if (e.hp <= 0) { e.killedBy = ctx.by || null; }
  return dealt;
}
export function healPlayer(n, noFaith, silent) {
  if (n <= 0 || P.dead) return 0;
  const m = M(); n *= 1 + (m['healPower%'] || 0);
  const before = P.hp; P.hp = Math.min(P.ds.maxHp, P.hp + n); const got = P.hp - before;
  if (m.overhealShieldMax && n > got) { S.shieldHp = Math.min(P.ds.maxHp * m.overhealShieldMax, S.shieldHp + (n - got)); S.shieldT = Math.max(S.shieldT, 6); }
  const R = CLASSES2[A.G().cls].resource;
  if (!noFaith && R.id === 'faith' && got > 0) gainRes('faith', got * R.gain.perHealed);
  if (!silent && got >= 1) { A.fx({ type: 'num', x: P.x, y: P.y - 46, text: '+' + Math.round(got), heal: true, t: 0, life: .8 }); fire('onHeal', {}); }
  return got;
}
// incoming damage to the hero. returns final damage
export function onPlayerHurt(dmg, from, melee) {
  if (!S) return dmg;
  const m = M();
  if (hasBuff('invulnerable') || P.iceBlock > 0) return 0;
  if (S.invis > 0 && S.invisBreak) S.invis = 0;
  // parry
  const parry = S.buffs.find((b) => b.kind === 'parry');
  if (parry && from) { parry.dur = 0; run(parry.onTrigger || [], { attacker: from, target: from, hitPos: from }); A.fx({ type: 'sparkle', x: P.x, y: P.y - 24, t: 0, life: .4, color: '#ffffff' }); A.sfx('hit'); return 0; }
  // dodge
  if (rand() < (m.dodge || 0) + (P.ds.dodge || 0)) { A.fx({ type: 'num', x: P.x, y: P.y - 46, text: 'уклон', small: true, t: 0, life: .6 }); fire('onDodge', {}); return 0; }
  // block (shield users)
  if ((m.block || 0) > 0 && rand() < m.block) { dmg *= .3; A.fx({ type: 'sparkle', x: P.x, y: P.y - 22, t: 0, life: .3, color: '#d6d9e0' }); fire('onBlock', { attacker: from }); }
  dmg *= Math.max(.1, 1 + (m['dmgTaken%'] || 0) - (m['resist:all'] || 0));
  if (from && from.debuffs) for (const d of from.debuffs) for (const md of d.mods || []) if (md.stat === 'dmg%') dmg *= 1 + md.value;
  if (S.shieldHp > 0) { const ab = Math.min(S.shieldHp, dmg); S.shieldHp -= ab; dmg -= ab; if (S.shieldOnHurt && from) run(S.shieldOnHurt, { attacker: from, target: from }); A.fx({ type: 'sparkle', x: P.x, y: P.y - 24, t: 0, life: .3, color: '#bfe8ff' }); }
  if (m.thorns && from && melee) dealDamage(from, m.thorns * .5, 'phys', { dot: true, hooked: true });
  if (m['thorns:holy'] && from && melee) dealDamage(from, m['thorns:holy'] * .5, 'holy', { dot: true, hooked: true });
  const R = CLASSES2[A.G().cls].resource;
  if (R.id === 'rage') gainRes('rage', R.gain.onHurt);
  fire('onHurt', { attacker: from, target: from, melee });
  return dmg;
}
// called when hp would drop to 0. returns true when death is prevented
export function onLethal(dmg) {
  if (hasBuff('cannotDie')) { S.prevented += dmg; P.hp = 1; return true; }
  const ctx = {}; fire('onDeath', ctx);
  if (ctx.saved && P.hp > 0) return true;
  return false;
}
export function reflects(p) {
  const r = S && S.reflect; if (!r || r.t <= 0) return false;
  if (r.arc) { const a = Math.atan2(p.y - (P.y - 20), p.x - P.x), face = A.aimAngle(); if (angDiff(a, face) > r.arc * Math.PI / 360) return false; }
  p.from = 'player'; p.vx = -p.vx; p.vy = -p.vy; p.dmgMul = r.value || 1; p.t = 0; p.school = p.school || 'phys'; p.reflected = true; A.sfx('hit'); return true;
}

// ---------- targeting ----------
const enemies = (filter) => A.ents().filter((e) => e.kind === 'enemy' && e.hp > 0 && !e.dead && (!filter || filter(e)));
function nearest(x, y, r, not) { let b = null, bd = r; for (const e of enemies()) { if (not && not.has(e)) continue; const d = Math.hypot(e.x - x, e.y - y); if (d < bd) { bd = d; b = e; } } return b; }
function pointOf(at, ctx, eff) {
  switch (at) {
    case 'self': case undefined: return { x: P.x, y: P.y };
    case 'point': { const p = A.areaPoint(); return { x: p[0], y: p[1] }; }
    case 'hit': case 'target': { const t = ctx.hitPos || ctx.target || A.target(eff.range || 300); return t ? { x: t.x, y: t.y } : { x: P.x, y: P.y }; }
    case 'attacker': return ctx.attacker ? { x: ctx.attacker.x, y: ctx.attacker.y } : null;
    case 'origin': return ctx.origin || { x: P.x, y: P.y };
    case 'randomEnemy': { const l = enemies((e) => dist(e, P) < 300); return l.length ? (({ x, y }) => ({ x, y }))(l[Math.floor(rand() * l.length)]) : null; }
    case 'corpse': case 'corpseOrSelf': { const c = ctx.corpse || nearestCorpse(); return c ? { x: c.x, y: c.y } : at === 'corpseOrSelf' ? A.freeSpotObj(P, 20, 50) : null; }
    case 'lastKill': return S.lastKill ? { x: S.lastKill.x, y: S.lastKill.y } : null;
    case 'mark': return S.knot ? { x: S.knot.x, y: S.knot.y } : null;
    case 'aim': { const a = A.aimAngle(), r = eff.dist || eff.range || 110; return { x: P.x + Math.cos(a) * r, y: P.y + Math.sin(a) * r }; }
    default: return { x: P.x, y: P.y };
  }
}
function targetsOf(at, ctx, eff) {
  if (at === 'threaded') return enemies((e) => e.threads > 0);
  if (at === 'target') { const t = ctx.target && ctx.target.hp > 0 ? ctx.target : A.target(eff.range || 320); return t ? [t] : []; }
  if (at === 'attacker') return ctx.attacker && ctx.attacker.hp > 0 ? [ctx.attacker] : [];
  if (at === 'hit') return ctx.target && ctx.target.hp > 0 ? [ctx.target] : [];
  return null; // area
}
const nearestCorpse = () => { let b = null, bd = 220; for (const c of corpses) { const d = dist(c, P); if (d < bd) { bd = d; b = c; } } return b; };

// ---------- apply effects ----------
// statuses on an enemy
function applyTo(e, effs, ctx) {
  for (const a of effs || []) {
    if (!e || e.hp <= 0) return;
    if (a.chance !== undefined && rand() > a.chance) continue;
    if (a.target === 'undead' && !A.isUndead(e)) continue;
    if (a.target === 'allies' || a.target === 'summons') continue;
    if (a.delay) { later(a.delay, () => applyTo(e, [{ ...a, delay: 0 }], ctx)); continue; }
    const boss = e.E && e.E.boss, ccMul = boss ? (a.bossMul ?? .4) : 1, ccDur = (d) => (boss && a.bossDur !== undefined ? a.bossDur : (d || 0) * ccMul);
    switch (a.type) {
      case 'stun': if (a.kind === 'root') e.root = Math.max(e.root || 0, ccDur(a.dur)); else { e.stun = Math.max(e.stun || 0, ccDur(a.dur)); if (a.kind === 'cocoon') e.cocoon = e.stun; } break;
      case 'knockback': { if (boss) break; const ang = Math.atan2(e.y - (ctx.from ? ctx.from.y : P.y), e.x - (ctx.from ? ctx.from.x : P.x)); e.kx = Math.cos(ang) * a.dist * 5; e.ky = Math.sin(ang) * a.dist * 5; break; }
      case 'slow': e.slowV = Math.max(e.slow > 0 ? e.slowV || 0 : 0, a.value); e.slow = Math.max(e.slow || 0, a.dur || 1); break;
      case 'freeze': freezeEnemy(e, ccDur(a.dur) * (1 + (M().freezeDur || 0)), a.ignoreImmune); break;
      case 'dot': addDot(e, a, ctx); break;
      case 'debuff': addDebuff(e, a, ctx); break;
      case 'mark': addMark(e, a); break;
      case 'frostStack': addFrost(e, a.count || 1); break;
      case 'thread': addThread(e, a.count || 1); break;
      case 'lifesteal': break; // handled in dealDamage via ctx
      case 'heal': healPlayer(P.ds.maxHp * (a.value || 0)); break;
      case 'aoe': case 'cone': case 'chain': case 'gain': case 'dropEcho': case 'summon': run([{ ...a, at: a.at || 'hit' }], { ...ctx, target: e, hitPos: e }); break;
    }
  }
}
function lsOf(effs) { const l = (effs || []).find((x) => x.type === 'lifesteal'); return l ? l.value : 0; }
function freezeEnemy(e, dur, ignoreImm) {
  if (!ignoreImm && (e.freezeImm || 0) > A.now()) return;
  e.freeze = Math.max(e.freeze || 0, dur); e.frost = 0; anim('ice_spikes', e.x, e.y + 4, { scale: .8 * (e.scale || 1) });
  const R = CLASSES2[A.G().cls].resource; if (R.atMax && R.atMax.immune) e.freezeImm = A.now() + dur + R.atMax.immune;
  A.sfx('ice');
}
function addFrost(e, n) {
  const G = A.G(), R = CLASSES2[G.cls].resource; if (!R.maxStacks) { e.slow = Math.max(e.slow || 0, 1.5); e.slowV = .3; return; }
  if (e.freeze > 0) return;
  e.frost = Math.min(R.maxStacks, (e.frost || 0) + n); e.frostT = 0;
  if (e.frost >= R.maxStacks) { const boss = e.E && e.E.boss; freezeEnemy(e, (boss ? R.atMax.bossDur : R.atMax.dur) * (1 + (M().freezeDur || 0))); }
}
function addThread(e, n) {
  const G = A.G(), R = CLASSES2[G.cls].resource, max = R.id === 'thread' ? R.max + (M().threadMax || 0) : 3;
  const total = enemies((x) => x !== e && x.threads > 0).reduce((s, x) => s + x.threads, 0);
  e.threads = Math.min(max - total, (e.threads || 0) + n); if (e.threads < 0) e.threads = 0;
  e.threadT = (R.life || 8) + (M().threadLife || 0);
}
function addDot(e, a, ctx) {
  e.dots = e.dots || [];
  const school = a.school || ({ burn: 'fire', bleed: 'phys', rot: 'shadow', holyfire: 'holy' }[a.kind]) || 'phys';
  let dur = a.dur || 3; if (school === 'fire') dur += M().burnDur || 0; if (school === 'shadow') dur += M()['dotDur:shadow'] || 0;
  const same = e.dots.filter((d) => d.kind === a.kind);
  if (same.length >= (a.stacks || 1)) { same[0].t = dur; return; }
  e.dots.push({ kind: a.kind, school, dps: a.dps || .15, t: dur, tick: .5, mul: ctx.consecrate || 1 });
}
function addDebuff(e, a, ctx) {
  if (a.bossOnly && !(e.E && e.E.boss)) return;
  if (a.cutHp && e.E && e.E.boss) { const cut = Math.round(e.hp * a.cutHp); e.hp -= cut; A.fx({ type: 'num', x: e.x, y: e.y - 50, text: cut, school: 'memory', t: 0, life: .8 }); applyTo(e, a.apply, ctx); return; }
  const boss = e.E && e.E.boss, dur = boss && a.bossDur !== undefined ? a.bossDur : a.dur;
  e.debuffs = (e.debuffs || []).filter((d) => !(a.kind && d.kind === a.kind));
  e.debuffs.push({ kind: a.kind, t: dur, mods: a.mods, share: a.share });
  if (a.kind === 'taunt') e.taunt = dur;
  if (a.kind === 'fear') e.fear = dur;
  if (a.kind === 'forget') { e.forget = dur; e.state = 'idle'; }
  if (a.kind === 'silence') e.silence = dur;
  if (a.apply) applyTo(e, a.apply, ctx);
}
function addMark(e, a) {
  e.marks = e.marks || {};
  e.marks[a.kind || 'mark'] = { t: a.dur || 6, mods: a.mods, onDeath: a.onDeath, jump: a.jumpOnDeath, ...a };
}
function scaleNode(n, r) {
  if (!n.perRank || r <= 1) return n.effects;
  const k = r - 1;
  const walk = (o) => {
    if (Array.isArray(o)) return o.map(walk);
    if (!o || typeof o !== 'object') return o;
    const c = {}; for (const [key, v] of Object.entries(o)) c[key] = (typeof v === 'number' && n.perRank[key] !== undefined) ? v + n.perRank[key] * k : walk(v);
    if (c.mods && n.perRank.value) c.mods = c.mods.map((m) => ({ ...m, value: m.value + Math.sign(m.value) * n.perRank.value * k }));
    return c;
  };
  return walk(n.effects);
}
// run a list of effects
export function run(effs, ctx = {}) {
  for (const eff of effs) {
    if (!eff) continue;
    if (eff.chance !== undefined && !['dot', 'stun', 'slow', 'thread'].includes(eff.type) && rand() > eff.chance) continue;
    if (eff.delay && !ctx.noDelay && ['aoe', 'debuff'].includes(eff.type) === false) { later(eff.delay, () => run([{ ...eff, delay: 0 }], ctx)); continue; }
    one(eff, ctx);
  }
}
function areaHit(x, y, radius, eff, ctx, filter) {
  let n = 0;
  for (const e of enemies(filter)) {
    if (Math.hypot(e.x - x, e.y - 8 - y) > radius + 8 * (e.scale || 1)) continue;
    if (eff.filter === 'frozen' && !(e.freeze > 0)) continue;
    let mult = (eff.dmg || 0) * (ctx.mul || 1);
    if (eff.perThread) mult *= Math.max(1, e.threads || 0);
    if (eff.perLapse) mult *= 1 + eff.perLapse * (ctx.lapse || 0);
    if (eff.executeUndeadBelow && A.isUndead(e) && e.hp / e.maxHp < eff.executeUndeadBelow) mult = 999;
    if (mult > 0) dealDamage(e, mult, eff.school, { ...ctx, from: { x, y }, vsUndead: eff.vsUndead, lifesteal: lsOf(eff.apply), shatter: eff.shatter, dot: ctx.tickDot });
    if (eff.perThread && e.threads) e.threads = 0;
    applyTo(e, eff.apply, { ...ctx, from: { x, y } });
    n++;
  }
  return n;
}
const anim = (key, x, y, o) => A.anim && A.anim(key, x, y, o);
function schoolBurst(school, x, y, r) {
  const big = r >= 70;
  if (school === 'fire') anim(big ? 'firelion' : 'flam', x, y, { scale: big ? Math.min(1.6, r / 70) : 1 + r / 80 });
  else if (school === 'ice') anim(big ? 'icetacle' : 'ice_burst', x, y, { scale: big ? Math.min(1.5, r / 80) : 1 });
  else if (school === 'holy') { anim('lightning', x, y, { scale: Math.min(1.3, .6 + r / 140) }); if (big) anim('holy_rays', x, y); }
  else if (school === 'shadow') anim('spirit_green', x, y, { scale: Math.min(1.6, .6 + r / 90), speed: 1.6 });
  else if (school === 'memory') anim('aura_purple', x, y - 8, { scale: Math.min(2.5, r / 40) });
  else anim(big ? 'earth_spikes' : 'smoke', x, y, { scale: big ? Math.min(1.6, r / 60) : 1 });
}
function vfxRing(x, y, r, school, life = .5) { A.fx({ type: 'ring', x, y: y - 8, t: 0, life, color: SCHOOL_COLOR[school] || '#ffffff', r }); }
function one(eff, ctx) {
  const now = A.now();
  switch (eff.type) {
    case 'aoe': {
      if (eff.at === 'enemies') { // several strikes on separate enemies
        const list = enemies((e) => dist(e, P) < (eff.searchRadius || 220)).sort(() => rand() - .5).slice(0, eff.count || 3);
        list.forEach((e, i) => later(i * .12, () => { schoolBurst(eff.school, e.x, e.y, eff.radius || 60); areaHit(e.x, e.y, eff.radius || 60, eff, ctx); A.sfx(eff.school || 'hit'); }));
        break;
      }
      if (eff.at === 'threaded' || eff.at === 'corpse' && eff.perThread) { for (const e of targetsOf('threaded', ctx, eff)) { areaHit(e.x, e.y, 20, eff, ctx, (x) => x === e); A.fx({ type: 'sparkle', x: e.x, y: e.y - 20, t: 0, life: .5, color: '#ff6a70' }); } break; }
      if (eff.every) { // repeated random strikes for a while
        const n = Math.floor((eff.dur || 6) / eff.every);
        for (let i = 0; i < n; i++) later(i * eff.every, () => { const p = pointOf('randomEnemy', ctx, eff); if (!p) return; A.fx({ type: 'meteor', x: p.x, y: p.y, t: 0, life: eff.delay || .6, color: SCHOOL_COLOR[eff.school] }); later(eff.delay || .6, () => { schoolBurst(eff.school, p.x, p.y, eff.radius); areaHit(p.x, p.y, eff.radius, eff, ctx); A.sfx('boom'); }); });
        break;
      }
      const p = pointOf(eff.at, ctx, eff); if (!p) break;
      const go = () => {
        if (eff.dur && eff.tick) { addZone({ x: p.x, y: p.y, r: eff.radius, t: eff.dur, tick: eff.tick, eff, ctx, follow: eff.at === 'self' && !eff.ground ? false : false, school: eff.school, ground: eff.ground }); return; }
        if (eff.ticks) { for (let i = 0; i < eff.ticks; i++) later(i * (eff.tick || .2), () => { areaHit(p.x, p.y, eff.radius, eff, ctx); }); A.fx({ type: 'rain', x: p.x, y: p.y, t: 0, life: (eff.ticks * (eff.tick || .2)) + .3 }); return; }
        const n = areaHit(p.x, p.y, eff.radius || 60, eff, ctx);
        if (eff.school) schoolBurst(eff.school, p.x, p.y, eff.radius || 60);
        if (eff.school === 'fire' || eff.radius >= 70 && eff.dmg >= 1.5) A.fx({ type: 'boom', x: p.x, y: p.y - 6, t: 0, life: .45, r: eff.radius, color: RGB(SCHOOL_COLOR[eff.school] || '#ffffff') });
        vfxRing(p.x, p.y, eff.radius || 60, eff.school);
        if (eff.school === 'ice') A.fx({ type: 'frost', x: p.x, y: p.y - 10, t: 0, life: .5 });
        if (eff.school === 'holy' && eff.at === 'point') A.fx({ type: 'pillar', x: p.x, y: p.y, t: 0, life: .6 });
        if (n && eff.school) A.sfx(eff.school === 'phys' ? 'hit' : eff.school);
      };
      if (eff.delay) { if (eff.at === 'point' && eff.school === 'fire') A.fx({ type: 'meteor', x: p.x, y: p.y, t: 0, life: eff.delay }); else if (eff.school === 'holy') A.fx({ type: 'pillar', x: p.x, y: p.y, t: 0, life: eff.delay + .4 }); later(eff.delay, go); } else go();
      break;
    }
    case 'cone': {
      if (ctx.channelTick === undefined && eff.tick && S.channel) break; // ticks handled by the channel
      const origin = eff.at === 'attacker' || eff.at === 'hit' ? pointOf(eff.at, ctx, eff) : { x: P.x, y: P.y - 10 };
      if (!origin) break;
      let ang = eff.at === 'target' ? (() => { const t = targetsOf('target', ctx, eff)[0]; return t ? Math.atan2(t.y - P.y, t.x - P.x) : A.aimAngle(); })() : A.aimAngle();
      if (eff.count && eff.count > 1) { for (let i = 0; i < eff.count; i++) { const a = ang + (i / (eff.count - 1) - .5) * (eff.arc || 60) * Math.PI / 180; shootProj({ ...eff, proj: eff.school === 'ice' ? 'ice_shard' : 'spark', speed: 380, range: eff.range, dmg: eff.dmg }, ctx, a); } break; }
      const arc = (eff.arc || 360) * Math.PI / 360; let hits = 0;
      const list = enemies((e) => { const d = Math.hypot(e.x - origin.x, e.y - origin.y); if (d > (eff.range || 60) + 10 * (e.scale || 1)) return false; return eff.at === 'hit' || eff.at === 'attacker' && d < 30 || angDiff(Math.atan2(e.y - origin.y, e.x - origin.x), ang) <= arc + .2; }).sort((a, b) => dist(a, P) - dist(b, P));
      for (const e of list.slice(0, eff.maxTargets || 99)) {
        const before = e.hp;
        dealDamage(e, (eff.dmg || 0) * (ctx.mul || 1), eff.school, { ...ctx, from: origin, vsUndead: eff.vsUndead, lowHpBonus: eff.lowHpBonus, lifesteal: lsOf(eff.apply), melee: true, by: ctx.skill, dot: ctx.channelTick !== undefined && !!eff.tick && false });
        applyTo(e, eff.apply, { ...ctx, from: origin }); hits++;
        if (before > 0 && e.hp <= 0 && eff.onKill && eff.onKill.refund && ctx.node) { refundNode(ctx.node); }
      }
      if (eff.gainPerTick) for (const [k, v] of Object.entries(eff.gainPerTick)) gainRes(k, v);
      A.fx({ type: 'cone', x: origin.x, y: origin.y, a: ang, arc, r: eff.range || 60, t: 0, life: eff.tick ? eff.tick + .05 : .25, color: SCHOOL_COLOR[eff.school] || '#ffffff', beam: (eff.arc || 360) <= 25 });
      if (eff.school === 'fire' && (!eff.tick || Math.random() < .5)) anim('flam', origin.x + Math.cos(ang) * (eff.range || 60) * (.4 + Math.random() * .5), origin.y + 10 + Math.sin(ang) * (eff.range || 60) * .5, { scale: .8 });
      if (!eff.tick && eff.school === 'phys' && hits) anim('slash_big', origin.x + Math.cos(ang) * 24, origin.y + Math.sin(ang) * 14, { a: ang, scale: (eff.range || 60) / 40 });
      if (!eff.tick && eff.school === 'shadow') anim('spirit_green', origin.x + Math.cos(ang) * 40, origin.y + 14 + Math.sin(ang) * 26, { scale: .7, speed: 1.8 });
      if (!eff.tick) A.sfx(hits ? 'hit' : 'swing');
      break;
    }
    case 'projectile': case 'pierce': {
      if (eff.rate && S.channel && ctx.channelTick === undefined) break;
      const n = Math.max(1, Math.round(eff.count && eff.type === 'projectile' ? eff.count : 1));
      const t = eff.at === 'target' ? targetsOf('target', ctx, eff)[0] : null;
      let base = t ? Math.atan2(t.y - 20 * (t.scale || 1) - (P.y - 20), t.x - P.x) : A.aimAngle();
      if (eff.at === 'target' && ctx.hooked && ctx.target) base = Math.atan2(ctx.target.y - P.y, ctx.target.x - P.x);
      for (let i = 0; i < n; i++) { const a = base + (n > 1 ? (i / (n - 1) - .5) * 2 * (eff.spread || .2) : (eff.rate ? (rand() - .5) * 2 * (eff.spread || 0) : 0)); shootProj(eff, ctx, a, t); }
      A.sfx(eff.proj && eff.proj.startsWith('arrow') ? 'arrow' : eff.school === 'phys' || !eff.school ? 'arrow' : eff.school);
      break;
    }
    case 'chain': {
      if (eff.at === 'target' && eff.tick) { // beam to a target while channelling
        if (ctx.channelTick === undefined && S.channel) break;
        const t = (S.beamT && S.beamT.hp > 0 && dist(S.beamT, P) < (eff.range || 200)) ? S.beamT : A.target(eff.range || 200); S.beamT = t; if (!t) break;
        dealDamage(t, eff.dmg * (ctx.mul || 1), eff.school, { ...ctx, lifesteal: lsOf(eff.apply), dot: false });
        A.fx({ type: 'beam', x: P.x, y: P.y - 22, tx: t.x, ty: t.y - 20, t: 0, life: (eff.tick || .2) + .05, color: SCHOOL_COLOR[eff.school] });
        break;
      }
      let from = ctx.target || ctx.hitPos; if (!from) break; const hit = new Set([from]); let cur = from;
      for (let i = 0; i < Math.round(eff.count || 1); i++) {
        const nx = nearest(cur.x, cur.y, eff.radius || 100, hit); if (!nx) break; hit.add(nx);
        A.fx({ type: 'beam', x: cur.x, y: cur.y - 20, tx: nx.x, ty: nx.y - 20, t: 0, life: .2, color: SCHOOL_COLOR[eff.school || ctx.school] || '#ffd25a' });
        if (eff.dmgMul || eff.dmg) dealDamage(nx, (eff.dmg || (ctx.lastMult || .8) * (eff.dmgMul || .5)), eff.school || ctx.school, { hooked: true });
        applyTo(nx, eff.apply, ctx); cur = nx;
      }
      break;
    }
    case 'stun': case 'freeze': case 'slow': case 'dot': case 'debuff': case 'mark': case 'frostStack': case 'thread': case 'knockback': {
      if (eff.type === 'freeze' && eff.at === 'self') { P.iceBlock = eff.dur; A.fx({ type: 'frost', x: P.x, y: P.y - 10, t: 0, life: .5 }); break; }
      if (eff.type === 'mark' && eff.at === 'self') { S.knot = { x: P.x, y: P.y, hp: P.hp, t: eff.dur, recast: eff.recast }; A.fx({ type: 'ring', x: P.x, y: P.y - 8, t: 0, life: .6, color: '#ff6a70', r: 26 }); break; }
      if (eff.type === 'thread' && eff.at === 'self') { for (const e of enemies((e) => dist(e, P) < (eff.radius || 150))) addThread(e, eff.count || 1); A.fx({ type: 'ring', x: P.x, y: P.y - 8, t: 0, life: .6, color: '#ff6a70', r: eff.radius }); break; }
      let list = targetsOf(eff.at || 'hit', ctx, eff);
      if (eff.radius && (!list || eff.at === 'self' || eff.at === undefined)) { const c = eff.at === 'self' ? P : (ctx.hitPos || ctx.target || P); list = enemies((e) => Math.hypot(e.x - c.x, e.y - c.y) < eff.radius); if (eff.chance !== undefined && eff.type === 'thread') list = list.filter(() => rand() < eff.chance); vfxRing(c.x, c.y, eff.radius, eff.type === 'debuff' && eff.kind === 'taunt' ? 'holy' : 'shadow', .4); }
      if (!list) list = ctx.target ? [ctx.target] : [];
      for (const e of list) applyTo(e, [{ ...eff, chance: eff.type === 'thread' && eff.radius ? undefined : eff.chance }], ctx);
      if (eff.type === 'debuff' && eff.kind === 'taunt' && eff.at === 'self') A.fx({ type: 'ring', x: P.x, y: P.y - 8, t: 0, life: .6, color: '#ffd25a', r: eff.radius });
      break;
    }
    case 'buff': {
      if (eff.cleanse) { P.slow = 0; P.burn = 0; if (!eff.dur) break; }
      if (eff.from === 'corpseKind') { const c = ctx.corpse || nearestCorpse(); const mods = (c && eff.table[c.type]) || eff.table.default; addBuff({ id: 'pull_memory', dur: eff.dur, mods, name: 'Чужая память' }); A.fx({ type: 'drain', x: c ? c.x : P.x, y: (c ? c.y : P.y) - 10, tx: P, t: 0, life: .5 }); break; }
      if (eff.permanent && eff.stat) { const G = A.G(), k = ctx.target && ctx.target.type; if (k) G.skillState.kind[k] = Math.min(eff.max || .1, (G.skillState.kind[k] || 0) + eff.value); break; }
      if (eff.persist === 'untilRest' && eff.stack) { const G = A.G(); G.skillState.notches = (G.skillState.notches || 0) + 1; if (G.skillState.notches >= eff.stack && eff.onMax) { G.skillState.notches = 0; run([eff.onMax], ctx); } break; }
      const mods = eff.mods || (eff.stat ? [{ stat: eff.stat, value: eff.value }] : null);
      addBuff({ id: ctx.src || ctx.skill || eff.kind || eff.stat, kind: eff.kind, dur: eff.dur ?? 5, mods, charges: eff.charges, stack: eff.stack, onTrigger: eff.onTrigger, onEnd: eff.onEnd, hook: eff.hook, effect: eff.effect, repeat: eff.repeat, name: eff.name });
      if (eff.kind === 'invulnerable') A.fx({ type: 'pillar', x: P.x, y: P.y, t: 0, life: .8, color: '#ffd25a' });
      else if (eff.kind === 'woven') A.fx({ type: 'ring', x: P.x, y: P.y - 8, t: 0, life: .6, color: '#ff6a70', r: 34 });
      else A.fx({ type: 'sparkle', x: P.x, y: P.y - 24, t: 0, life: .5, color: '#ffd25a' });
      break;
    }
    case 'shield': { anim(A.G().cls === 'cryo' ? 'shield_blue' : A.G().cls === 'priest' || A.G().cls === 'warrior' ? 'shield_yellow' : 'shield_pink', P.x, P.y - 4, { scale: A.G().cls === 'necro' || A.G().cls === 'pyro' || A.G().cls === 'weaver' ? .45 : 1 }); S.shieldHp = (eff.stack ? S.shieldHp : 0) + P.ds.maxHp * (eff.value || .2) * (ctx.mul || 1); S.shieldT = eff.dur || 6; S.shieldOnHurt = eff.onHurt || null; A.fx({ type: 'ring', x: P.x, y: P.y - 16, t: 0, life: .5, color: '#bfe8ff', r: 40 }); A.sfx('potion'); break; }
    case 'heal': {
      if (eff.setTo !== undefined) { P.hp = eff.abs ? Math.max(1, eff.setTo) : P.ds.maxHp * eff.setTo; break; }
      if (eff.toSnapshot && S.knot) { if (S.knot.hp > P.hp) healPlayer(S.knot.hp - P.hp); break; }
      if (eff.target === 'summons') { for (const a of A.allies()) a.hp = Math.min(a.maxHp, a.hp + a.maxHp * eff.value); break; }
      const v = (eff.value || 0) * (ctx.mul || 1);
      if (eff.at === 'allies') { for (const a of A.allies()) if (dist(a, P) < (eff.radius || 160)) a.hp = Math.min(a.maxHp, a.hp + a.maxHp * v); break; }
      if (eff.tick && eff.dur) { const n = Math.floor(eff.dur / eff.tick); for (let i = 1; i <= n; i++) later(i * eff.tick, () => { healPlayer(P.ds.maxHp * v); if (eff.alsoAllies) for (const a of A.allies()) a.hp = Math.min(a.maxHp, a.hp + a.maxHp * v); }); A.fx({ type: 'sparkle', x: P.x, y: P.y - 20, t: 0, life: .8, color: '#9be36a' }); break; }
      if (eff.overTime) { const n = 4; for (let i = 1; i <= n; i++) later(i * eff.overTime / n, () => healPlayer(P.ds.maxHp * v / n)); break; }
      if (v) healPlayer(P.ds.maxHp * v);
      if (eff.mp) P.mp = Math.min(P.ds.maxMp, P.mp + eff.mp);
      if (eff.alsoAllies) for (const a of A.allies()) if (dist(a, P) < eff.alsoAllies) a.hp = Math.min(a.maxHp, a.hp + a.maxHp * v);
      if (!ctx.hooked) { anim('holy_rays', P.x, P.y + 2); A.fx({ type: 'sparkle', x: P.x, y: P.y - 20, t: 0, life: .8, color: '#fff2a8' }); A.fx({ type: 'ring', x: P.x, y: P.y - 8, t: 0, life: .5, color: '#fff2a8', r: 50 }); A.sfx('holy'); }
      break;
    }
    case 'dash': {
      let ang = A.aimAngle();
      if (eff.at === 'target') { const t = targetsOf('target', ctx, eff)[0]; if (t) ang = Math.atan2(t.y - P.y, t.x - P.x); }
      if (eff.dir === 'back') ang += Math.PI;
      P.dashV = { ang, left: eff.dist || 100, speed: eff.speed || 520, hits: new Set(), eff, ctx };
      P.inv = Math.max(P.inv || 0, eff.iframes || .2);
      A.sfx('swing');
      break;
    }
    case 'blink': {
      if (eff.at === 'mark') { if (S.knot) { A.fx({ type: 'ring', x: P.x, y: P.y - 8, t: 0, life: .4, color: '#ff6a70', r: 24 }); P.x = S.knot.x; P.y = S.knot.y; } break; }
      if (eff.count && eff.count > 1) { // hop between enemies
        const tick = eff.tick || .12; let i = 0;
        const hop = () => { const list = (eff.at === 'threaded' ? enemies((e) => e.threads > 0) : enemies((e) => dist(e, P) < (eff.radius || 160))); if (!list.length || i >= eff.count) return; const e = list[i % list.length]; i++; const a = rand() * TAU; teleport(e.x + Math.cos(a) * 18, e.y + Math.sin(a) * 10); P.inv = Math.max(P.inv, tick + .1); A.fx({ type: 'afterimage', x: P.x, y: P.y, t: 0, life: .3 }); run(eff.apply || [], { ...ctx, target: e, hitPos: e }); later(tick, hop); };
        hop(); break;
      }
      const origin = { x: P.x, y: P.y };
      let tx, ty;
      if (eff.at === 'target') { const t = targetsOf('target', ctx, eff)[0]; if (t && dist(t, P) < (eff.dist || 140) + 60) { const a = Math.atan2(P.y - t.y, P.x - t.x); tx = t.x + Math.cos(a) * 22; ty = t.y + Math.sin(a) * 14; } }
      if (tx === undefined) { let a = A.aimAngle(); if (eff.dir === 'back') a += Math.PI; tx = P.x + Math.cos(a) * (eff.dist || 110); ty = P.y + Math.sin(a) * (eff.dist || 110); }
      A.fx({ type: 'afterimage', x: P.x, y: P.y, t: 0, life: .35 }); anim('smoke', P.x, P.y); teleport(tx, ty); anim('smoke', P.x, P.y); ctx.origin = origin; ctx.pathFrom = origin;
      if (eff.iframes) P.inv = Math.max(P.inv, eff.iframes === true ? .3 : eff.iframes);
      A.sfx('memory');
      break;
    }
    case 'trap': {
      const p = eff.at === 'path' && ctx.pathFrom ? ctx.pathFrom : pointOf(eff.at, ctx, eff) || P;
      if (eff.shape === 'line') {
        const a = eff.at === 'path' ? Math.atan2(P.y - p.y, P.x - p.x) : A.aimAngle() + Math.PI / 2, len = eff.at === 'path' ? Math.hypot(P.x - p.x, P.y - p.y) : (eff.length || 120);
        const cx = eff.at === 'path' ? (p.x + P.x) / 2 : p.x, cy = eff.at === 'path' ? (p.y + P.y) / 2 : p.y;
        addZone({ x: cx, y: cy, line: { a, len, w: eff.width || 18 }, t: eff.life || 4, tick: eff.tick || .5, eff: { ...eff, radius: 0 }, ctx, school: eff.school, ground: 'fire' });
      } else {
        const mine = traps.filter((t) => t.src === ctx.skill); if (eff.max && mine.length >= eff.max) traps.splice(traps.indexOf(mine[0]), 1);
        traps.push({ x: p.x, y: p.y, r: eff.radius || 22, t: eff.life || 30, eff, ctx, src: ctx.skill });
      }
      break;
    }
    case 'aura': {
      if (eff.permanent) break;
      if (eff.orbit) { const n = Math.max(1, ctx.costPaid && ctx.costPaid.echo || 3); orbs.push({ n, t: eff.dur || 10, r: eff.radius || 70, speed: eff.orbit.speed || 3, eff, ctx, hitT: new Map() }); break; }
      const p = eff.at === 'point' ? pointOf('point', ctx, eff) : P;
      addZone({ x: p.x, y: p.y, r: eff.radius || 80, t: eff.dur || 5, tick: eff.tick || .5, eff, ctx, follow: eff.at !== 'point', school: eff.school || (eff.apply || []).find((a) => a.school)?.school });
      break;
    }
    case 'summon': {
      const p = pointOf(eff.at || 'self', ctx, eff) || P;
      if (eff.at === 'corpse' || eff.at === 'corpseOrSelf') { const c = ctx.corpse || nearestCorpse(); if (c && !ctx.corpse) { corpses.splice(corpses.indexOf(c), 1); } if (!c && eff.at === 'corpse' && !ctx.corpse) { A.toast('Рядом нет павших'); break; } }
      const u = SUMMONS[eff.unit] || {}, G = A.G(), m = M();
      const max = Math.floor((eff.max || 99) + (m.summonMax || 0));
      if (!eff.ignoreMax) { const mine = A.allies().filter((a) => a.unit === eff.unit && a.hp > 0); if (mine.length >= max) { const old = mine[0]; old.hp = 0; old.dead = .001; } }
      const hpBase = eff.hp ? eff.hp.base + (eff.hp.perLvl || 0) * G.lvl : 40 + G.lvl * 10;
      let hp = hpBase * (1 + (m['summonHp%'] || 0)) + (eff.corpseBonus && ctx.corpse ? eff.corpseBonus.hp || 0 : 0);
      let look = u.look, copy = null;
      if (eff.unit === 'copyOfLastKill') { if (!S.lastKill) { A.toast('Некого повторить'); break; } copy = S.lastKill; hp = (copy.maxHp || 40) * (eff.hpMul || 1); }
      anim('summon_ring', p.x, p.y); anim(eff.unit === 'snow_double' || eff.unit === 'ice_mirror' ? 'ice_burst' : eff.unit === 'memory_wolf' || eff.unit === 'hero_echo' ? 'aura_purple' : 'spirit_green', p.x, p.y, { scale: .7 });
      A.addAlly({ x: p.x, y: p.y, unit: eff.unit, hp: Math.round(hp), dmgMul: (eff.dmg || (copy ? 1 : .5)) * (eff.dmgMul || 1), life: eff.life || 1e9, look, copyType: copy && copy.type, copyHero: eff.copyHero || u.copyHero, tint: eff.tint || u.tint || (look && look.tint), alpha: eff.alpha || u.alpha, scale: eff.scale || (look && look.scale) || 1, ranged: eff.ranged || (u.ai === 'ranged' ? { range: 200, cd: 1.6 } : null), turret: eff.turret || (u.ai === 'turret' ? { proj: 'ice_shard', cd: .6, dmg: .6, range: 200 } : null), taunt: eff.taunt, onExpire: eff.onExpire, reach: eff.reach || u.reach, speed: eff.speed || u.speed || 72, still: u.ai === 'none' || u.ai === 'turret', name: u.name });
      A.sfx('shadow');
      break;
    }
    case 'transform': {
      if (eff.at === 'target' || eff.into === 'ally') { const t = targetsOf('target', ctx, eff)[0]; if (!t) break; if (eff.notBoss && t.E && t.E.boss) break; A.convertToAlly(t, eff.dur || 20, eff.onEnd); A.fx({ type: 'ring', x: t.x, y: t.y - 8, t: 0, life: .7, color: '#ff6a70', r: 34 }); A.sfx('memory'); break; }
      addBuff({ id: 'transform:' + (ctx.skill || ''), kind: 'transform', dur: eff.dur, mods: eff.mods, tint: eff.tint, alpha: eff.alpha });
      A.fx({ type: 'ring', x: P.x, y: P.y - 8, t: 0, life: .7, color: eff.tint || '#ff3030', r: 60 }); anim(A.G().cls === 'hollow' ? 'aura_purple' : 'aura_white', P.x, P.y, { scale: 1.3 }); A.sfx('level');
      break;
    }
    case 'channel': S.channel = { t: eff.dur, dur: eff.dur, moveMul: eff.moveMul ?? .5, iframes: eff.iframes, node: ctx.node, rank: ctx.rank, ctx, acc: {}, perSec: ctx.node && ctx.node.cost && ctx.node.cost.perSec }; if (eff.iframes) P.inv = Math.max(P.inv, eff.dur); break;
    case 'reflect': S.reflect = { t: eff.dur || 3, value: eff.value || 1, arc: eff.arc, projectiles: eff.projectiles }; A.fx({ type: 'ring', x: P.x, y: P.y - 16, t: 0, life: .5, color: '#ffffff', r: 30 }); break;
    case 'invis': S.invis = eff.dur || 3; S.invisBreak = eff.breakOnHit !== false; S.detect = eff.detectRadius || 0; S.nextHit = eff.nextHit || null; A.fx({ type: 'afterimage', x: P.x, y: P.y, t: 0, life: .4 }); for (const e of enemies()) if (dist(e, P) > S.detect) { e.state = 'idle'; } break;
    case 'pull': {
      const list = eff.at === 'threaded' ? enemies((e) => e.threads > 0) : targetsOf(eff.at, ctx, eff) || [];
      const goal = eff.toward === 'point' ? pointOf('point', ctx, eff) : P;
      for (const e of list) {
        if (e.E && e.E.boss) continue;
        const d = dist(e, goal), k = Math.min(eff.dist || 80, Math.max(0, d - 20)) / Math.max(1, d);
        A.fx({ type: 'beam', x: e.x, y: e.y - 20, tx: P.x, ty: P.y - 20, t: 0, life: .25, color: '#ff6a70' });
        e.kx = (goal.x - e.x) * k * 6; e.ky = (goal.y - e.y) * k * 6;
        applyTo(e, eff.apply, ctx); fire('onPull', { target: e });
        e.threads = 0;
      }
      A.sfx('memory');
      break;
    }
    case 'gain': {
      if (eff.chance !== undefined && rand() > eff.chance) break;
      for (const k of ['rage', 'focus', 'heat', 'faith', 'lapse']) if (eff[k]) gainRes(k, eff[k]);
      if (eff.mp) P.mp = Math.min(P.ds.maxMp, P.mp + eff.mp);
      if (eff.skillPoint) { const G = A.G(); G.bonusPoints = (G.bonusPoints || 0) + eff.skillPoint; }
      break;
    }
    case 'refund': {
      if (eff.chance !== undefined && rand() > eff.chance) break;
      if (eff.skill === 'all') { for (const k of Object.keys(S.cds)) S.cds[k] = Math.max(now, S.cds[k] - (eff.value || 1)); break; }
      if (ctx.node) refundNode(ctx.node);
      break;
    }
    case 'dropEcho': {
      if (eff.chance !== undefined && rand() > eff.chance) break;
      const at = ctx.hitPos || ctx.target || P; A.dropEcho(at.x, at.y, eff.count || 1);
      if (eff.kill && ctx.target) { ctx.target.hp = 0; A.kill(ctx.target); }
      break;
    }
    case 'repeatHit': {
      if (eff.chance !== undefined && rand() > eff.chance) break;
      const e = ctx.target; if (!e) break;
      later(.25, () => { if (e.hp > 0) { dealDamage(e, (eff.dmgMul || .5), eff.school || 'memory', { hooked: true, echo: true }); A.fx({ type: 'afterimage', x: P.x, y: P.y, t: 0, life: .3 }); } });
      break;
    }
    case 'repeatCast': { const n = ctx.skill && node(A.G().cls, ctx.skill); if (n) later(eff.delay || .3, () => run(scaleNode(n, rankOf(A.G(), n.id)), { ...ctx, hooked: true, node: n })); break; }
    case 'gold': { if (eff.chance !== undefined && rand() > eff.chance) break; const at = ctx.hitPos || P; A.gold(at.x, at.y, eff.min + Math.floor(rand() * (eff.max - eff.min + 1))); break; }
    case 'lifesteal': healPlayer((ctx.lastDealt || 0) * eff.value * HERO_HP, false, true); break;
    case 'melee': break;
  }
}
function teleport(x, y) {
  // stop at walls along the way
  const sx = P.x, sy = P.y, n = Math.ceil(Math.hypot(x - sx, y - sy) / 8);
  for (let i = 1; i <= n; i++) { const px = sx + (x - sx) * i / n, py = sy + (y - sy) * i / n; if (A.blocked(px, py, 7)) break; P.x = px; P.y = py; }
}
function refundNode(n) { S.cds[n.id] = A.now(); const c = n.cost || {}; for (const [k, v] of Object.entries(c)) { if (k === 'mp' && typeof v === 'number') P.mp = Math.min(P.ds.maxMp, P.mp + v); else if (typeof v === 'number' && ['rage', 'focus', 'heat', 'faith'].includes(k)) S.res += v; } A.fx({ type: 'sparkle', x: P.x, y: P.y - 30, t: 0, life: .4, color: '#ffffff' }); }
function shootProj(eff, ctx, a, target) {
  const sp = eff.speed || 320, range = eff.range || 340;
  const pierce = eff.type === 'pierce' ? (eff.count || 3) : (S.nextShot && ctx.basic ? S.nextShot.pierce : 0);
  const forceCrit = eff.forceCrit || (S.nextShot && ctx.basic && S.nextShot.forceCrit);
  if (S.nextShot && ctx.basic) S.nextShot = null; else if (!ctx.basic && S.nextShot) { /* keep for the next basic shot */ }
  A.proj({ type: eff.proj || 'bolt', school: eff.school || 'phys', x: P.x + Math.cos(a) * 14, y: P.y - 20 + Math.sin(a) * 8, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, from: 'player', t: 0, life: range / sp, mult: (eff.dmg || 1) * (ctx.mul || 1), apply: eff.apply, onHit: eff.onHit, pierce, hits: new Set(), target: eff.at === 'target' ? target : null, homing: eff.at === 'target', vsUndead: eff.vsUndead, lifesteal: eff.lifesteal || lsOf(eff.apply), bonusVsMarked: eff.bonusVsMarked, onKill: eff.onKill, burst: eff.burst, forceCrit, node: ctx.node, basic: ctx.basic, critMul: ctx.critMul, ctx });
}
// a player projectile met an enemy
export function projHit(p, e) {
  const ctx = { ...(p.ctx || {}), proj: p.type, from: { x: p.x, y: p.y }, dv: [Math.sign(p.vx), Math.sign(p.vy)], vsUndead: p.vsUndead, lifesteal: p.lifesteal, bonusVsMarked: p.bonusVsMarked, forceCrit: p.forceCrit, basic: p.basic, critMul: p.critMul };
  const before = e.hp;
  const nh = S.nextHit; if (nh && p.basic) { ctx.forceCrit = ctx.forceCrit || nh.forceCrit; ctx.critMul = nh.critMul; S.nextHit = null; S.invis = 0; if (nh.apply) applyTo(e, nh.apply, ctx); }
  dealDamage(e, (p.mult || 1) * (p.dmgMul || 1), p.school, ctx);
  if (p.burst) { for (const o of enemies((o) => o !== e && Math.hypot(o.x - p.x, o.y - 20 - p.y) < p.burst)) applyTo(o, p.apply, ctx); }
  applyTo(e, p.apply, ctx);
  if (p.onHit) for (const h of p.onHit) { if (h.type === 'aoe') { A.fx({ type: 'boom', x: p.x, y: p.y + 12, t: 0, life: .35, r: (h.radius || 30) + 6, color: RGB(SCHOOL_COLOR[p.school] || '#ffffff') }); for (const o of enemies((o) => o !== e && Math.hypot(o.x - p.x, o.y - 20 - p.y) < h.radius)) dealDamage(o, (p.mult || 1) * h.dmg, p.school, { ...ctx, hooked: true }); } else applyTo(e, [h], ctx); }
  anim(p.school === 'fire' ? 'flam' : p.school === 'ice' ? 'ice_burst' : p.school === 'shadow' ? 'spirit_small' : p.school === 'holy' ? 'spark' : p.school === 'memory' ? 'spark' : 'hit', p.x, p.y + 10, { scale: p.school === 'phys' ? .8 : .8 });
  if (p.school === 'shadow' && p.lifesteal) A.fx({ type: 'drain', x: e.x, y: e.y - 20, tx: P, t: 0, life: .45 });
  if (p.school === 'ice' || p.school === 'holy' || p.school === 'memory') A.fx({ type: 'sparkle', x: p.x, y: p.y, t: 0, life: .4, color: SCHOOL_COLOR[p.school] });
  if (before > 0 && e.hp <= 0 && p.onKill && p.onKill.refund && p.node) refundNode(p.node);
  A.sfx('hit');
}
// ---------- zones, traps, orbs ----------
function addZone(z) { z.acc = 0; z.age = 0; zones.push(z); }
function zoneHit(z) {
  const e = z.eff, ctx = { ...z.ctx, tickDot: false, hooked: true };
  const inside = (o) => { if (z.line) { const dx = o.x - z.x, dy = o.y - z.y, c = Math.cos(z.line.a), s = Math.sin(z.line.a), u = dx * c + dy * s, v = -dx * s + dy * c; return Math.abs(u) < z.line.len / 2 + 6 && Math.abs(v) < z.line.w; } return Math.hypot(o.x - z.x, o.y - z.y) < z.r + 6; };
  for (const o of enemies(inside)) {
    if (e.dmg) dealDamage(o, e.dmg * (z.ctx.mul || 1), e.school || z.school, { ...ctx, lifesteal: lsOf(e.apply), dot: true });
    for (const a of e.apply || []) { if (a.type === 'heal') continue; if (a.type === 'frostStack' && a.every) { if ((z.age % a.every) < z.tick) addFrost(o, a.count || 1); continue; } applyTo(o, [a], ctx); }
  }
  for (const a of e.apply || []) if (a.type === 'heal' && a.target === 'allies') { if (inside(P)) healPlayer(P.ds.maxHp * a.value); for (const al of A.allies()) if (inside(al)) al.hp = Math.min(al.maxHp, al.hp + al.maxHp * a.value); }
}
// ---------- per frame ----------
export function tick(dt, moving) {
  if (!P || !S) return;
  const G = A.G(), now = A.now();
  S.still = moving ? 0 : S.still + dt;
  if (S.still > .5 && !moving) fire('still', {});
  for (let i = timers.length - 1; i >= 0; i--) { timers[i].t -= dt; if (timers[i].t <= 0) { const f = timers[i].fn; timers.splice(i, 1); try { f(); } catch (err) { console.error(err); } } }
  tickRes(dt, G); tickBuffs(dt);
  if (S.shieldT > 0) { S.shieldT -= dt; if (S.shieldT <= 0) S.shieldHp = 0; }
  if (S.reflect) { S.reflect.t -= dt; if (S.reflect.t <= 0) S.reflect = null; }
  if (S.invis > 0) S.invis -= dt;
  if (S.knot) { S.knot.t -= dt; if (S.knot.t <= 0) S.knot = null; }
  if (P.iceBlock > 0) P.iceBlock -= dt;
  if (S.comboT > 0) { S.comboT -= dt; if (S.comboT <= 0) S.combo = 0; }
  if (P.hp / P.ds.maxHp < .35) fire('lowHp', {});
  // channel
  const ch = S.channel;
  if (ch) {
    ch.t -= dt;
    const n = ch.node, effs = n ? scaleNode(n, ch.rank) : [];
    if (ch.perSec) { for (const [k, v] of Object.entries(ch.perSec)) { const need = v * dt * (S.overheat > 0 && k === 'mp' ? 0 : 1); if (k === 'mp') { if (P.mp < need) ch.t = 0; else P.mp -= need; } else if (S.res < need) ch.t = 0; else S.res -= need; } }
    for (const e of effs) {
      const step = e.tick || (e.rate ? 1 / e.rate : 0); if (!step) continue;
      ch.acc[e.type] = (ch.acc[e.type] || 0) + dt;
      while (ch.acc[e.type] >= step) { ch.acc[e.type] -= step; one(e, { ...ch.ctx, channelTick: true, tickDot: true }); }
    }
    if (ch.t <= 0) { S.channel = null; if (ch.moveMul === 0 && n) for (const e of effs) if (!e.tick && !e.rate && e.type !== 'channel') one(e, { ...ch.ctx, channelEnd: true }); }
  }
  // dash movement
  if (P.dashV) { const d = P.dashV, step = Math.min(d.left, d.speed * dt), ox = P.x, oy = P.y; A.moveEnt(P, Math.cos(d.ang) * step, Math.sin(d.ang) * step); d.left -= step; if ((P.x === ox && P.y === oy) || d.left <= 0) P.dashV = null; if (d.eff.dmg) for (const e of enemies((e) => dist(e, P) < 30 * (e.scale || 1) && !d.hits.has(e))) { d.hits.add(e); for (let h = 0; h < (d.eff.hits || 1); h++) dealDamage(e, d.eff.dmg * (d.ctx.mul || 1), d.eff.school, { ...d.ctx, melee: true }); applyTo(e, d.eff.apply, d.ctx); A.sfx('hit'); } A.fx({ type: 'afterimage', x: ox, y: oy, t: 0, life: .2 }); }
  // zones
  for (const z of zones) { z.t -= dt; z.age += dt; if (z.follow) { z.x = P.x; z.y = P.y; } z.acc += dt; while (z.acc >= z.tick) { z.acc -= z.tick; zoneHit(z); } }
  for (let i = zones.length - 1; i >= 0; i--) if (zones[i].t <= 0) zones.splice(i, 1);
  // traps
  for (const tr of traps) { tr.t -= dt; const e = nearest(tr.x, tr.y, tr.r); if (e && tr.t > 0) { tr.t = 0; applyTo(e, tr.eff.apply, tr.ctx); if (tr.eff.dmg) dealDamage(e, tr.eff.dmg, tr.eff.school, tr.ctx); A.fx({ type: 'ring', x: tr.x, y: tr.y - 6, t: 0, life: .4, color: '#e8e2d4', r: 26 }); A.sfx('hit'); } }
  for (let i = traps.length - 1; i >= 0; i--) if (traps[i].t <= 0) traps.splice(i, 1);
  // orbiting echoes
  for (const o of orbs) { o.t -= dt; for (let k = 0; k < o.n; k++) { const a = now * o.speed + k * TAU / o.n, x = P.x + Math.cos(a) * o.r * .8, y = P.y - 12 + Math.sin(a) * o.r * .45; for (const e of enemies((e) => Math.hypot(e.x - x, e.y - 14 - y) < 18)) { const last = o.hitT.get(e) || 0; if (now - last < (o.eff.hitCd || .5)) continue; o.hitT.set(e, now); dealDamage(e, o.eff.dmg, o.eff.school, { hooked: true, echo: true }); } } }
  for (let i = orbs.length - 1; i >= 0; i--) if (orbs[i].t <= 0) orbs.splice(i, 1);
  // corpses
  const life = (CLASSES2[G.cls].resource.life || 20) * (1 + (M()['corpseLife%'] || 0));
  for (const c of corpses) c.t += dt; for (let i = corpses.length - 1; i >= 0; i--) if (corpses[i].t > life) corpses.splice(i, 1);
}
// enemy statuses. returns 'frozen' | 'stunned' | null
export function tickEnemy(e, dt) {
  if (e.dots && e.dots.length) {
    for (const d of e.dots) { d.t -= dt; d.tick -= dt; if (d.tick <= 0) { d.tick = .5; dealDamage(e, d.dps * .5 * d.mul, d.school, { dot: true, hooked: true }); } }
    e.dots = e.dots.filter((d) => d.t > 0);
    e.burn = e.dots.some((d) => d.kind === 'burn') ? 1 : 0;
  }
  if (e.debuffs) { for (const d of e.debuffs) d.t -= dt; e.debuffs = e.debuffs.filter((d) => d.t > 0); }
  if (e.marks) for (const [k, mk] of Object.entries(e.marks)) { mk.t -= dt; if (mk.t <= 0) delete e.marks[k]; }
  for (const k of ['taunt', 'fear', 'forget', 'silence', 'root', 'cocoon']) if (e[k] > 0) e[k] -= dt;
  if (e.frost > 0) { e.frostT = (e.frostT || 0) + dt; const R = CLASSES2[A.G().cls].resource; if (R.decay && e.frostT > R.decay.delay) { e.frost = Math.max(0, e.frost - dt * R.decay.perSec); } }
  if (e.threads > 0) { e.threadT -= dt; if (e.threadT <= 0) e.threads = 0; }
  if (e.hp <= 0) return null;
  if (e.freeze > 0) { e.freeze -= dt; return 'frozen'; }
  if (e.stun > 0) { e.stun -= dt; return 'stunned'; }
  return null;
}
// enemy slow factor (frost stacks + slows)
export function enemySpeedMul(e) {
  let m = 1; if (e.slow > 0) m *= 1 - (e.slowV ?? .5);
  const R = CLASSES2[A.G().cls].resource; if (e.frost > 0 && R.perStack) m *= 1 - R.perStack.slow * e.frost * (1 + (M().frostSlowPerStack || 0));
  if (e.root > 0) m = 0;
  return Math.max(0, m);
}
// invisibility: does this enemy notice the hero?
export const heroHidden = (e) => S && S.invis > 0 && dist(e, P) > (S.detect || 0);
export function onKill(e) {
  if (!S) return;
  const G = A.G(), R = CLASSES2[G.cls].resource;
  S.lastKill = { x: e.x, y: e.y, type: e.type, maxHp: e.maxHp };
  if (!e.summoned) corpses.push({ x: e.x, y: e.y, type: e.type, t: 0 }); if (corpses.length > 16) corpses.shift();
  if (R.id === 'lapse') gainRes('lapse', R.gain.onKill);
  for (const [k, mk] of Object.entries(e.marks || {})) {
    if (mk.onDeath) run([mk.onDeath], { target: e, hitPos: e });
    if (mk.jump) { const nx = nearest(e.x, e.y, mk.jump, new Set([e])); if (nx) addMark(nx, { ...mk, t: undefined, dur: mk.dur }); }
    if (k === 'prey' && R.id === 'focus' && rand() < .5) A.dropEcho(e.x, e.y, 1);
  }
  fire('onKill', { target: e, hitPos: e, by: e.killedBy });
}
export function onSummonDeath(a) { fire('onSummonDeath', { hitPos: a, target: null }); }
export function onForget() { fire('onForget', {}); }
export const corpseList = () => corpses;

// ---------- casting ----------
export function cdLeft(id) { return Math.max(0, (S && S.cds[id] || 0) - A.now()); }
export function canPay(G, n, silent) {
  const c = n.cost || {}, m = M();
  const free = S.overheat > 0 || (m['rageCost%'] <= -1 && c.rage) || (m['hpCost%'] <= -1 && c.hp);
  if (c.mp && !free && P.mp < c.mp * (1 + (m['mpCost%'] || 0) + (P.ds.mpCostMul || 0))) return silent ? false : 'Не хватает маны';
  for (const k of ['rage', 'focus', 'faith', 'lapse']) { const v = c[k]; if (v === undefined || free) continue; if (v === 'all') { if (S.res <= 0) return silent ? false : `Нет: ${resInfo(G).name}`; continue; } if (S.res < v * (k === 'rage' ? 1 + (m['rageCost%'] || 0) : 1)) return silent ? false : `Не хватает: ${resInfo(G).name}`; }
  if (c.faithMin && S.res < c.faithMin) return silent ? false : `Нужно ${c.faithMin} Веры`;
  if (c.corpse && corpses.filter((x) => dist(x, P) < 220).length < c.corpse && !(c.orMinion && A.allies().length)) return silent ? false : 'Рядом нет павших';
  if (c.echo) { const need = typeof c.echo === 'string' ? 1 : c.echo; if (A.echoes() < need) return silent ? false : `Нужно Отголосков: ${need}`; }
  if (c.thread === 'all' && !enemies((e) => e.threads > 0).length) return silent ? false : 'Ни одной нити';
  if (c.hp && P.hp <= P.ds.maxHp * c.hp + 1) return silent ? false : 'Слишком мало сил';
  return null;
}
function pay(G, n) {
  const c = n.cost || {}, m = M(), paid = {};
  const free = S.overheat > 0;
  if (c.mp && !free) { const v = c.mp * Math.max(0, 1 + (m['mpCost%'] || 0) + (P.ds.mpCostMul || 0)); P.mp -= v; }
  for (const k of ['rage', 'focus', 'faith', 'lapse']) { const v = c[k]; if (v === undefined) continue; if (v === 'all') { paid[k] = S.res; S.res = 0; } else { const k2 = k === 'rage' ? Math.max(0, 1 + (m['rageCost%'] || 0)) : 1; S.res -= v * k2; paid[k] = v; } }
  if (c.corpse) { let left = c.corpse; const near = corpses.filter((x) => dist(x, P) < 220).sort((a, b) => dist(a, P) - dist(b, P)); paid.corpse = near[0]; for (const x of near) { if (left-- <= 0) break; corpses.splice(corpses.indexOf(x), 1); } if (left > 0 && c.orMinion) { const a = A.allies()[0]; if (a) { paid.corpse = { x: a.x, y: a.y, type: 'skeleton' }; a.hp = 0; a.dead = .001; } } }
  if (c.echo) { const want = typeof c.echo === 'string' ? Math.min(5, A.echoes()) : c.echo; A.spendEcho(want); paid.echo = want; }
  if (c.hp) { const v = P.ds.maxHp * c.hp * Math.max(0, 1 + (m['hpCost%'] || 0)); P.hp = Math.max(1, P.hp - v); }
  if (c.thread === 'all') paid.threads = enemies((e) => e.threads > 0).reduce((s, e) => s + e.threads, 0);
  return paid;
}
export function cast(id) {
  const G = A.G(), n = node(G.cls, id); if (!n || n.kind !== 'active') return 'нет';
  if (P.dead || S.channel) return 'занят';
  if (cdLeft(id) > 0) return 'cd';
  // memory knot recast
  if (S.knot && S.knot.recast && n.effects.some((e) => e.type === 'mark' && e.at === 'self')) { run(S.knot.recast, { node: n }); S.knot = null; S.cds[id] = A.now() + n.cd; return null; }
  const err = canPay(G, n); if (err) return err;
  const r = rankOf(G, id), paid = pay(G, n), m = M();
  let mul = 1;
  // weaver: woven charge empowers
  const woven = n.woven && S.buffs.find((b) => b.kind === 'woven' && b.charges > 0);
  let effs = scaleNode(n, r);
  if (woven) { woven.charges--; effs = applyWoven(effs, n.woven); A.fx({ type: 'ring', x: P.x, y: P.y - 8, t: 0, life: .5, color: '#ff6a70', r: 40 }); }
  // priest consecration
  const R = CLASSES2[G.cls].resource;
  if (S.consecrated && R.consecrate) { mul = R.consecrate.effectMul; S.res = Math.max(0, S.res - R.consecrate.consume); S.consecrated = false; A.fx({ type: 'pillar', x: P.x, y: P.y, t: 0, life: .7 }); fire('onConsecrate', {}); }
  const cdr = Math.min(.5, (m.cdr || 0)) + (n.cdPerRank ? 0 : 0);
  S.cds[id] = A.now() + Math.max(.2, (n.cd + (n.cdPerRank || 0) * (r - 1)) * (1 - cdr));
  if (n.gain) for (const [k, v] of Object.entries(n.gain)) gainRes(k, v);
  const ctx = { node: n, rank: r, skill: id, mul, corpse: paid.corpse, costPaid: paid, lapse: paid.lapse || 0 };
  const L = validTarget(); if (L) ctx.target = L;
  run(effs, ctx);
  fire('onCast', { skill: id, node: n });
  return null;
}
function validTarget() { const t = A.lockTarget(); return t && t.hp > 0 ? t : null; }
function applyWoven(effs, w) {
  const out = effs.map((e) => ({ ...e }));
  for (const [k, v] of Object.entries(w)) {
    if (k === 'add') { out.push(...v); continue; }
    for (const e of out) { if (typeof v === 'object' && e.type === k) Object.assign(e, v); else if (typeof v === 'number' && e[k] !== undefined) e[k] = v; else if (typeof v === 'object' && e.apply) e.apply = e.apply.map((a) => (a.type === k ? { ...a, ...v } : a)); }
  }
  return out;
}
// basic attack hit (called at the attack animation's hit frame)
export function basicHit() {
  const G = A.G(), C = CLASSES2[G.cls], B = C.basic, m = M();
  const ctx = { basic: true, skill: 'basic', mul: 1 };
  if (S.invis > 0 && S.nextHit) { ctx.forceCrit = S.nextHit.forceCrit; ctx.critMul = S.nextHit.critMul; }
  const echoB = S.buffs.find((b) => b.kind === 'echoHits' && b.charges > 0);
  if (B.type === 'melee') {
    const combo = B.combo || [1]; const k = combo[S.combo % combo.length]; S.combo++; S.comboT = B.comboWindow || .8;
    const ang = A.aimAngle(), arc = (B.arc || 110) * Math.PI / 360, range = (B.range || 42) * (1 + (m['range%'] || 0));
    let hits = 0;
    for (const e of enemies((e) => { const d = Math.hypot(e.x - P.x, e.y - P.y); return d < range + 12 * (e.scale || 1) && (d < 18 || angDiff(Math.atan2(e.y - P.y, e.x - P.x), ang) < arc + .25); })) {
      const back = B.backstab && e.dir && behind(e) ? B.backstab : null;
      dealDamage(e, B.dmg * k, B.school, { ...ctx, melee: true, lifesteal: B.lifesteal, backstab: back });
      if (m.doubleHit && rand() < .5) dealDamage(e, B.dmg * k * .5, B.school, { ...ctx, hooked: true });
      if (k > 1 && B.finisher && B.finisher.knockback) applyTo(e, [{ type: 'knockback', dist: B.finisher.knockback }], ctx);
      if (B.onHit) applyTo(e, B.onHit, ctx);
      if (S.nextHit && S.nextHit.apply) applyTo(e, S.nextHit.apply, ctx);
      if (echoB) later(echoB.repeat.delay, () => { if (e.hp > 0) { dealDamage(e, B.dmg * (echoB.repeat.dmgMul || .5), echoB.repeat.school || 'memory', { hooked: true, echo: true }); A.fx({ type: 'afterimage', x: P.x, y: P.y, t: 0, life: .3 }); } });
      hits++;
    }
    if (echoB && hits) echoB.charges--;
    if (S.invis > 0 && S.invisBreak) { S.invis = 0; S.nextHit = null; }
    anim(k > 1 ? 'slash_big' : 'slash', P.x + Math.cos(ang) * 22, P.y - 14 + Math.sin(ang) * 14, { a: ang, scale: range / 42 });
    A.sfx(hits ? 'hit' : 'swing');
    return hits;
  }
  // ranged / spell bolt
  const a = A.aimAngle();
  shootProj({ ...B, at: 'aim', dmg: B.dmg, apply: B.apply }, ctx, a);
  if (B.gain) for (const [k2, v] of Object.entries(B.gain)) gainRes(k2, v);
  fire('onCast', { skill: 'basic', basic: true });
  if (S.invis > 0 && S.invisBreak) { S.invis = 0; }
  A.sfx(B.proj && B.proj.startsWith('arrow') ? 'arrow' : B.school === 'phys' ? 'arrow' : B.school);
  return 1;
}
function behind(e) { const DV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[e.dir]; if (!DV) return false; const dx = P.x - e.x, dy = P.y - e.y; return dx * DV[0] + dy * DV[1] < 0; }

// ---------- drawing ----------
export function drawUnder(x, now) {
  for (const c of corpses) { const a = 1 - c.t / 24; x.globalAlpha = Math.max(.2, a); x.fillStyle = '#d8d0b8'; x.fillRect(c.x - 6, c.y - 2, 12, 3); x.fillRect(c.x - 2, c.y - 5, 4, 8); x.fillStyle = '#7dff9a'; if (A.G().cls === 'necro') x.fillRect(c.x - 1, c.y - 9 - Math.sin(now * 4 + c.x) * 2, 2, 2); x.globalAlpha = 1; }
  for (const z of zones) {
    const col = RGB(SCHOOL_COLOR[z.school] || (z.ground === 'fire' ? '#ff8a3a' : '#ffffff')), a = Math.min(1, z.t * 2) * .22;
    if (z.line) { x.save(); x.translate(z.x, z.y); x.rotate(z.line.a); x.fillStyle = `rgba(${col},${a + .1})`; x.fillRect(-z.line.len / 2, -z.line.w / 2, z.line.len, z.line.w); x.fillStyle = `rgba(255,230,140,${a + .1})`; for (let i = -z.line.len / 2; i < z.line.len / 2; i += 9) x.fillRect(i + Math.sin(now * 9 + i) * 2, -6 - Math.abs(Math.sin(now * 7 + i)) * 8, 3, 6); x.restore(); continue; }
    x.fillStyle = `rgba(${col},${a})`; x.beginPath(); x.ellipse(z.x, z.y, z.r, z.r * .55, 0, 0, 7); x.fill();
    x.strokeStyle = `rgba(${col},${a * 2.5})`; x.lineWidth = 1; x.setLineDash([4, 4]); x.lineDashOffset = -now * 20; x.stroke(); x.setLineDash([]);
    if (z.school === 'ice') { x.fillStyle = 'rgba(255,255,255,.8)'; for (let i = 0; i < 10; i++) { const px = z.x + Math.sin(i * 7.3 + now) * z.r * .8, py = z.y - 30 + ((now * 60 + i * 23) % 50); x.fillRect(px, py, 2, 2); } }
    if (z.school === 'fire' || z.ground === 'fire') { x.fillStyle = 'rgba(255,170,60,.7)'; for (let i = 0; i < 8; i++) { const a2 = i * .8 + now; x.fillRect(z.x + Math.cos(a2) * z.r * .6, z.y + Math.sin(a2) * z.r * .3 - ((now * 30 + i * 5) % 10), 2, 3); } }
  }
  for (const tr of traps) { x.strokeStyle = 'rgba(232,226,212,.7)'; x.lineWidth = 1; x.beginPath(); x.ellipse(tr.x, tr.y, 9, 5, 0, 0, 7); x.stroke(); x.fillStyle = '#8a7f74'; for (let i = 0; i < 6; i++) { const a2 = i * 1.047; x.fillRect(tr.x + Math.cos(a2) * 8 - 1, tr.y + Math.sin(a2) * 4 - 2, 2, 3); } }
  if (S && S.knot) { x.strokeStyle = '#ff6a70'; x.lineWidth = 1; x.beginPath(); x.ellipse(S.knot.x, S.knot.y, 8 + Math.sin(now * 5) * 2, 4, 0, 0, 7); x.stroke(); }
}
export function drawOver(x, now) {
  for (const o of orbs) for (let k = 0; k < o.n; k++) { const a = now * o.speed + k * TAU / o.n, px = P.x + Math.cos(a) * o.r * .8, py = P.y - 12 + Math.sin(a) * o.r * .45; x.fillStyle = 'rgba(255,106,112,.35)'; x.beginPath(); x.arc(px, py, 6, 0, 7); x.fill(); x.fillStyle = '#ffd8da'; x.beginPath(); x.arc(px, py, 2.5, 0, 7); x.fill(); }
  // threads from hero to threaded enemies
  if (A.G().cls === 'weaver') for (const e of enemies((e) => e.threads > 0)) { x.strokeStyle = `rgba(255,106,112,${.25 + e.threads * .1})`; x.lineWidth = 1; x.beginPath(); x.moveTo(P.x, P.y - 20); x.quadraticCurveTo((P.x + e.x) / 2, Math.max(P.y, e.y) + 10, e.x, e.y - 20); x.stroke(); }
  if (S && S.channel && S.channel.dur > .5) { const k = 1 - S.channel.t / S.channel.dur; x.fillStyle = 'rgba(0,0,0,.6)'; x.fillRect(P.x - 14, P.y + 4, 28, 3); x.fillStyle = '#ffd25a'; x.fillRect(P.x - 14, P.y + 4, 28 * k, 3); }
  if (S && S.shieldHp > 0) { x.strokeStyle = `rgba(191,232,255,${.5 + Math.sin(now * 8) * .2})`; x.lineWidth = 2; x.beginPath(); x.ellipse(P.x, P.y - 22, 16, 26, 0, 0, 7); x.stroke(); }
  if (S && S.reflect) { x.strokeStyle = 'rgba(255,255,255,.7)'; x.lineWidth = 2; const a = A.aimAngle(); x.beginPath(); x.arc(P.x, P.y - 20, 20, a - .9, a + .9); x.stroke(); }
}
// enemy overlay: frost stacks, threads, marks
export function drawEnemyStatus(x, e, now) {
  const sc = e.scale || 1, top = e.y - 58 * sc;
  if (e.frost > 0 && !(e.freeze > 0)) for (let i = 0; i < Math.ceil(e.frost); i++) { x.fillStyle = '#bfe8ff'; x.fillRect(e.x - 9 + i * 4, top, 3, 3); }
  if (e.threads > 0) for (let i = 0; i < e.threads; i++) { x.fillStyle = '#ff6a70'; x.fillRect(e.x - 9 + i * 4, top - 4, 3, 2); }
  if (e.marks && Object.keys(e.marks).length) { x.strokeStyle = '#ff9a3a'; x.lineWidth = 1; x.beginPath(); x.moveTo(e.x, top - 10); x.lineTo(e.x + 4, top - 6); x.lineTo(e.x, top - 2); x.lineTo(e.x - 4, top - 6); x.closePath(); x.stroke(); }
  if (e.fear > 0) { x.fillStyle = '#b56cff'; x.font = 'bold 9px monospace'; x.fillText('!', e.x + 8, top + 6); }
  if (e.taunt > 0) { x.fillStyle = '#ffd25a'; x.font = 'bold 9px monospace'; x.fillText('⚑', e.x - 12, top + 6); }
  if (e.cocoon > 0) { x.fillStyle = 'rgba(255,220,220,.55)'; x.beginPath(); x.ellipse(e.x, e.y - 20 * sc, 12 * sc, 24 * sc, 0, 0, 7); x.fill(); x.strokeStyle = '#ff6a70'; for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(e.x - 12 * sc, e.y - (8 + i * 10) * sc); x.lineTo(e.x + 12 * sc, e.y - (14 + i * 10) * sc); x.stroke(); } }
  if ((e.dots || []).some((d) => d.kind === 'bleed')) { x.fillStyle = '#c0283a'; x.fillRect(e.x - 3, e.y - 30 * sc + ((now * 20) % 10), 2, 2); }
  if ((e.dots || []).some((d) => d.kind === 'rot')) { x.fillStyle = 'rgba(125,255,154,.6)'; x.fillRect(e.x + 4, e.y - 34 * sc - ((now * 15) % 12), 2, 2); }
}
export function playerTint() { const t = S && S.buffs.find((b) => b.kind === 'transform'); return t ? { tint: t.tint, alpha: t.alpha } : null; }
export const isInvis = () => S && S.invis > 0;
export const channelMove = () => (S && S.channel ? S.channel.moveMul : 1);
export const busy = () => !!(S && (S.channel || P.dashV));
