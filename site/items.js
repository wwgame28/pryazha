// Gear: item bases, rolled affixes, uniques and sets from classes.js.
import { ITEM_BASES, AFFIXES, UNIQUES, SETS, WEIGHTS } from './classes.js';
const rand = Math.random, pick = (a) => a[Math.floor(rand() * a.length)];
export const SLOTS = ['head', 'chest', 'legs', 'feet', 'cloak', 'amulet', 'ring1', 'ring2', 'offhand'];
export const SLOT_RU = { head: 'Голова', chest: 'Тело', legs: 'Ноги', feet: 'Обувь', cloak: 'Плащ', amulet: 'Шея', ring1: 'Кольцо', ring2: 'Кольцо', offhand: 'Вторая рука' };
const BASE = Object.fromEntries(ITEM_BASES.map((b) => [b.id, b]));
// grammatical gender of base names: m, f, n, p (plural)
const GENDER = { cap_cloth: 'm', hood_leather: 'm', helm_iron: 'm', robe: 'f', jerkin: 'f', mail: 'f', plate: 'f', trousers: 'p', leggings: 'p', greaves: 'p', sandals: 'p', boots: 'p', sabatons: 'p', cloak: 'm', mantle: 'f', amulet: 'm', locket: 'm', ring: 'n', signet: 'm', shield: 'm', quiver: 'm', orb: 'f', spool: 'n', tome: 'f', skull: 'm', idol: 'm' };
function agree(adj, g) {
  if (g === 'm' || !g) return adj;
  const soft = /(ний|жий|ший|чий|щий)$/.test(adj) || /[гкх]ий$/.test(adj);
  const stem = adj.replace(/(ый|ий|ой)$/, '');
  if (g === 'f') return stem + (/(ний)$/.test(adj) ? 'яя' : 'ая');
  if (g === 'n') return stem + (/(ний)$/.test(adj) ? 'ее' : /(жий|ший|чий|щий)$/.test(adj) ? 'ее' : 'ое');
  return stem + (soft || /[гкхжшчщ]$/.test(stem) ? 'ие' : 'ые');
}
const lc1 = (s) => s.charAt(0).toLowerCase() + s.slice(1);
let uidN = 0;
const uid = () => Date.now().toString(36) + (uidN++).toString(36) + Math.floor(rand() * 1e4).toString(36);
const tierOf = (ilvl) => (ilvl >= 18 ? 2 : ilvl >= 8 ? 1 : 0);
export function baseFits(b, cls) { return !b.classes || b.classes.includes(cls); }
export function rollItem(G, { ilvl = G.lvl, rarity, baseId, cls = G.cls } = {}) {
  if (!rarity) { const r = rand(); rarity = r < .03 ? 'unique' : r < .07 ? 'set' : r < .45 ? 'magic' : 'common'; }
  if (rarity === 'unique') { const list = UNIQUES.filter((u) => (!u.class || u.class === cls) && !(String(u.base).startsWith('weapon:'))); if (list.length) return makeUnique(pick(list), ilvl); rarity = 'magic'; }
  if (rarity === 'set') { const sets = SETS.filter((s) => s.class === cls || !s.class); if (sets.length) { const S = pick(sets), bid = pick(S.pieces), b = BASE[bid]; if (b) return finish({ uid: uid(), base: bid, slot: b.slot, rarity: 'set', set: S.id, setName: S.name, ilvl, affixes: [] }); } rarity = 'magic'; }
  const pool = ITEM_BASES.filter((b) => baseFits(b, cls) && !(b.minLevel > ilvl));
  const b = baseId ? BASE[baseId] : pick(pool);
  const it = { uid: uid(), base: b.id, slot: b.slot, rarity, ilvl, affixes: [] };
  if (rarity === 'magic') {
    const fits = (a) => (!a.classes || a.classes.includes(cls)) && (!a.slots || a.slots.includes(b.slot) || a.slots === 'ALL');
    const pre = AFFIXES.filter((a) => a.kind === 'prefix' && fits(a)), suf = AFFIXES.filter((a) => a.kind === 'suffix' && fits(a));
    const n = rand() < .4 ? 2 : 1, t = tierOf(ilvl);
    if (pre.length && (n === 2 || rand() < .5)) { const a = pick(pre.filter((x) => !x.rare || rand() < .3)); if (a) it.affixes.push({ id: a.id, t }); }
    if (suf.length && (n === 2 || !it.affixes.length)) { const a = pick(suf.filter((x) => !x.rare || rand() < .3)); if (a) it.affixes.push({ id: a.id, t }); }
  }
  return finish(it);
}
function makeUnique(U, ilvl) { const bid = BASE[U.base] ? U.base : ITEM_BASES.find((b) => b.slot === U.base || b.id === U.base)?.id || 'amulet'; return finish({ uid: uid(), base: bid, slot: BASE[bid].slot, rarity: 'unique', unique: U.id, ilvl, affixes: [], cls: U.class }); }
const AFX = Object.fromEntries(AFFIXES.map((a) => [a.id, a]));
const UNQ = Object.fromEntries(UNIQUES.map((u) => [u.id, u]));
export const SET = Object.fromEntries(SETS.map((s) => [s.id, s]));
// derive name, armor, mods, hooks (also re-run after loading a save)
export function finish(it) {
  const b = BASE[it.base]; if (!b) return null;
  const g = GENDER[b.id] || 'm';
  it.armor = Math.round((b.armor || 0) * (1 + it.ilvl * .08));
  it.weight = b.weight || null;
  it.mods = [...(b.implicit || [])].map((m) => ({ ...m }));
  it.hooks = [];
  let name = b.name;
  for (const a of it.affixes) {
    const A = AFX[a.id]; if (!A) continue;
    for (const m of A.mods || []) it.mods.push({ stat: m.stat, value: m.tiers ? m.tiers[Math.min(a.t, m.tiers.length - 1)] : m.value });
    if (A.hook) it.hooks.push({ hook: A.hook, cond: A.cond, effect: A.effect, icd: A.icd, threshold: A.threshold });
    if (A.kind === 'prefix') name = agree(A.name, g) + ' ' + lc1(name); else name = name + ' ' + A.name;
  }
  if (it.unique) { const U = UNQ[it.unique]; name = U.name; it.lore = U.lore; it.desc = U.desc; it.cls = U.class; it.memoryCost = U.memoryCost; it.mods.push(...(U.mods || [])); if (U.hook) it.hooks.push({ hook: U.hook, cond: U.cond, effect: U.effect, icd: U.icd, threshold: U.threshold }); if (it.locketTier && U.tiersByMemory) it.mods.push(...U.tiersByMemory[it.locketTier]); }
  if (it.set) { const S = SET[it.set]; it.setName = S.name; name = `${b.name} (${S.name})`; it.cls = S.class; }
  it.name = name;
  return it;
}
export function canWear(G, it) {
  const b = BASE[it.base];
  if (b.classes && !b.classes.includes(G.cls)) return 'не для твоего класса';
  if (it.cls && it.cls !== G.cls && it.rarity === 'unique') return 'эта вещь помнит другого';
  if (b.minLevel && G.lvl < b.minLevel) return `нужен ${b.minLevel}-й уровень`;
  return null;
}
export function slotFor(G, it) { if (it.slot === 'ring') return !G.gear.ring1 ? 'ring1' : !G.gear.ring2 ? 'ring2' : 'ring1'; return it.slot; }
export function setCounts(G) { const n = {}; for (const it of Object.values(G.gear || {})) if (it && it.set) n[it.set] = (n[it.set] || 0) + 1; return n; }
export function setBonus(G) {
  const mods = [], hooks = [], active = [];
  for (const [id, k] of Object.entries(setCounts(G))) {
    const S = SET[id]; if (!S) continue;
    if (k >= 2 && S.bonus2) { mods.push(...(S.bonus2.mods || [])); if (S.bonus2.hook) hooks.push({ ...S.bonus2, src: id + ':2' }); active.push(S.name + ' (2)'); }
    if (k >= 4 && S.bonus4) { mods.push(...(S.bonus4.mods || [])); if (S.bonus4.hook) hooks.push({ hook: S.bonus4.hook, cond: S.bonus4.cond, effect: S.bonus4.effect, src: id + ':4', rank: 1 }); active.push(S.name + ' (4)'); }
  }
  return { mods, hooks, active };
}
// most common weight among body pieces
export function gearWeight(G) { const n = {}; for (const s of ['head', 'chest', 'legs', 'feet']) { const it = G.gear[s]; if (it && it.weight) n[it.weight] = (n[it.weight] || 0) + 1; } let best = null, bn = 0; for (const [w, k] of Object.entries(n)) if (k > bn) { bn = k; best = w; } return best; }
export const price = (it) => Math.round((it.rarity === 'unique' ? 120 : it.rarity === 'set' ? 80 : it.rarity === 'magic' ? 30 : 10) * (1 + it.ilvl * .1));
export const rarityRu = { common: 'обычная', magic: 'волшебная', set: 'из набора', unique: 'уникальная' };
export { WEIGHTS };
