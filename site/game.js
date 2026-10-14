// «Тени Ольхового Брода»: top-down action RPG. Heroes and villagers come from the character dossier generator.
import * as GEN from './gen.js';
import { loadSprites, Look, hasItem, shade, lum, ANIM_FRAMES } from './sprites.js';
import { T, TILE, makeTileset, buildCrypt, solidTile, drawGround, drawProp, propBox } from './world.js';
import { Overworld, CS, chunkMinimap, STRUCT_ICON, BIOME_NAME } from './overworld.js';
import { ART, loadArt, drawPropLPC, renderChunkGround, drawDungeonTile } from './art.js';
import { LIFE, setLife, drawGroundLife, drawSwayed, breathe, drawSmoke, drawAir, drawFireflies } from './life.js';
import { ambientTick, footstep } from './ambient.js';
import { WEATHER, weatherTick, drawWeather } from './weather.js';
import { audio, sfx } from './audio.js';
import { MonsterLook, loadMonsters } from './monsters.js';
import { VFX, loadVfx, drawVfx, vfxLife, drawProjSprite } from './vfx.js';
import * as SK from './skills.js';
import * as MEM from './memory.js';
import * as IT from './items.js';
import { Story } from './story.js';
import * as WS from './world_state.js';
import { Narrative } from './narrative.js';
import { playDream, DREAMS, dreamMods } from './dream.js';
import { LOC_REGION, RT, PLACES } from './overworld.js';
import { OUTFITS, ITEM_BASES, AFFIXES, UNIQUES, SETS } from './classes.js';
import { CLASSES2, WEIGHTS } from './classes.js';
import { CLASS_OF, CLASSES, CASTER, SCHOOL, UNDEAD, METALS, ARMOR, HELMS, ENEMIES, SPAWNS, POTIONS, MAIN_QUESTS, SIDE_TARGETS, RELICS, WEAPON_NAME, HERO_HP, HURT_MUL } from './data.js';
const armorList = (cls) => ARMOR[CASTER.has(cls) ? 'mage' : ARMOR[cls] ? cls : 'warrior'];
for (const k of Object.keys(CLASSES2)) if (CLASSES2[k].resource.secondary === 'mp' && k !== 'weaver') CASTER.add(k);
const usesMana = (cls) => !CLASSES2[cls].resource.noMana;

const $ = (id) => document.getElementById(id);
const rand = Math.random, rint = (a, b) => a + Math.floor(rand() * (b - a + 1)), rpick = (a) => a[Math.floor(rand() * a.length)];
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const DIR_OF = (dx, dy) => (Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down'));
const DV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const store = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
const SAVE_KEY = 'alderford.save.v1';

// =====================================================================================
// Characters: dossier -> stats and sprite spec
// =====================================================================================
function statBlock(c) {
  const RR = GEN.RACES[c.race], J = GEN.JOBS.fantasy[c.job], b5 = c.big5, st = GEN.stageOf(c), v = {};
  GEN.STATS.forEach((s, i) => { v[s] = 10 + (RR.stat[s] || 0) + (J.st[s] || 0) * 1.5 + (c.jitter ? c.jitter[i] : 0); });
  const bs = { 'мощное': 2, 'грузное': 1, 'крепкое': 1, 'коренастое': 1, 'широкоплечее': 1, 'плотное': 1, 'худощавое': -1, 'хрупкое': -2, 'изящное': -1 }[c.body.build] || 0;
  v.СИЛ += bs; v.ВЫН += bs * .5; v.ИНТ += (b5.O - 50) / 18; v.МДР += (b5.C - 50) / 25 - (b5.N - 50) / 25; v.ХАР += (b5.E - 50) / 20 + (b5.A - 50) / 30;
  if (st === 3) { v.СИЛ -= 2; v.ЛОВ -= 1; v.МДР += 2; } if (st === 0) { v.МДР -= 1; v.ЛОВ += 1; }
  for (const s of GEN.STATS) v[s] = Math.max(6, Math.min(18, Math.round(v[s])));
  return v;
}
const HAIR_OK = ['plain', 'parted', 'bedhead', 'messy1', 'swoop', 'pixie', 'bob', 'long', 'long_messy', 'wavy', 'ponytail', 'braid', 'topknot_short', 'curly_short', 'curly_long', 'afro', 'buzzcut', 'longhawk', 'xlong', 'bunches'];
const LMAP = { 1: 'parted', 2: 'plain', 3: 'swoop', 4: 'bedhead', 5: 'curly_short', 6: 'messy1', 7: 'plain', 8: 'swoop', 9: 'curly_short', 10: 'bob', 11: 'messy1', 12: 'swoop', 13: 'bob', 14: 'long', 15: 'bob', 16: 'long', 17: 'bob', 18: 'wavy', 19: 'bob', 20: 'bedhead', 21: 'long_messy', 22: 'curly_short', 23: 'bob', 24: 'curly_long', 25: 'buzzcut', 26: 'bunches', 27: 'longhawk', 28: 'buzzcut', 29: 'ponytail', 30: 'messy1', 31: 'ponytail', 32: 'wavy', 33: 'long', 34: null, 35: 'wavy', 36: 'topknot_short', 37: 'curly_long', 38: 'topknot_short', 39: 'afro', 40: 'long', 41: 'long', 42: 'ponytail', 43: 'bedhead', 44: 'afro', 45: 'topknot_short', 46: 'messy1', 47: 'parted', 48: 'ponytail' };
function baseLayers(c, mood) {
  const RR = GEN.RACES[c.race], F = c.female, st = GEN.stageOf(c);
  const skin = c.skin.hex, hair = c.hair.hex, eye = c.eyes.hex;
  const body = F ? 'female' : (c.race === 'halfling' || st === 0) ? 'teen' : 'male';
  let head, group = F ? 'female' : 'male', human = true;
  if (c.race === 'orc') { head = F ? 'head_orc_f' : 'head_orc_m'; human = false; }
  else if (st === 3 && !RR.longLived) { head = F ? 'head_f_old' : 'head_m_old'; group = 'elderly'; }
  else if (body === 'teen') head = F ? 'head_f_small' : 'head_m_small';
  else head = F ? 'head_f' : ['полноватое', 'грузное', 'плотное', 'коренастое'].includes(c.body.build) ? 'head_m_plump' : 'head_m';
  const L = [['body', { body: skin }], [head, { body: skin, eye }]];
  if (human) { L.push([mood > 30 ? 'face_happy' : mood < 6 ? 'face_angry' : 'face_neutral', { body: skin, eye }]); if (group !== 'elderly') L.push(['nose_straight', { body: skin }]); }
  L.push([c.face.browW === 0 || c.face.browW === 5 ? 'brows_thick' : 'brows_thin', { hair: shade(hair, lum(hair) > .7 ? -.35 : -.15) }]);
  if (RR.ears === 'elf') L.push(['ears_elven', { body: skin }]);
  if (c.race === 'tiefling') { L.push(['ears_medium', { body: skin }]); L.push([GEN.hash(c.seed, 11) < .5 ? 'horns_curled' : 'horns_back', { body: shade(skin, -.6) }]); }
  const hid = LMAP[c.hair.variant];
  if (hid && HAIR_OK.includes(hid)) L.push(['hair_' + hid, { hair, cloth: c.clothes.hex }]);
  if (c.race === 'dwarf' && c.hair.beard) L.push([F ? 'beard_5oclock_shadow' : 'beard_winter', { hair }]);
  else if (c.hair.beard === 1) L.push(['beard_beard', { hair }]); else if (c.hair.beard === 2) L.push(['beard_medium', { hair }]); else if (c.hair.stubble) L.push(['beard_5oclock_shadow', { hair }]);
  if (c.marks.includes('glasses')) L.push(['glasses', { cloth: '#2a2c30', metal: '#c49a3a' }]);
  if (c.marks.includes('eyepatch')) L.push(['eyepatch', { cloth: '#1b1b1b', metal: '#1b1b1b' }]);
  return { L, body, group };
}
const hk = (c, k, arr) => arr[Math.floor(GEN.hash(c.seed, k) * arr.length)];
function outfitOf(h) {
  const O = OUTFITS[h.cls]; if (!O) return null;
  const legend = h.gear && Object.values(h.gear).some((it) => it && it.rarity === 'unique' && it.slot === 'chest' && it.cls === h.cls) || (h === G && setCount(h.cls) >= 4);
  return legend && O.legendary ? { ...O.legendary, legendary: true } : O.tiers[Math.max(0, Math.min(3, h.equip.armor))];
}
function heroSpec(h) {
  const c = h.char, d = GEN.derive(c), { L, body, group } = baseLayers(c, d.mood), F = body === 'female' || body === 'teen' && c.female;
  const metal = METALS[h.equip.weapon].hex, C2 = CLASSES2[h.cls], O = outfitOf(h);
  const put = (id, cloth, met) => L.push([id, { cloth: cloth || '#5a4636', metal: met || metal, body: c.skin.hex }]);
  if (O) {
    let layers = O.layers.map((l) => [...l]);
    if (O.robe && body === 'female') { const t = layers.find((l) => l[0] === 'ls2'); layers = layers.filter((l) => l[0] !== 'skirt' && l[0] !== 'ls2'); if (t) layers.unshift(['robe', t[1]]); }
    if (O.fem && F) layers = layers.map((l) => (O.fem[l[0]] ? [O.fem[l[0]], l[1], l[2]] : l));
    if (body !== 'female') layers = layers.filter((l) => l[0] !== 'kimono');
    const helm = HELMS[h.equip.helm];
    if (helm && helm.id) layers = layers.filter((l) => !['hood', 'wizard', 'cavalier', 'helm_nasal', 'helm_kettle', 'helm_barbarian', 'helm_greathelm', 'helm_mail', 'hat_celestial', 'hat_large', 'cap_feather', 'bandana', 'tiara', 'headband_rune', 'crown'].includes(l[0])).concat([[helm.id, shade(c.clothes.hex, -.2), METALS[Math.min(4, 1 + h.equip.armor)].hex]]);
    for (const [id, cloth, met] of layers) put(id, cloth, met);
  }
  const w = C2.weapon;
  if (w === 'bow') { put('bow', '#7a5230', metal); put('arrow', '#7a5230', metal); }
  else if (w === 'staff') put('staff', h.cls === 'priest' ? '#e8d8a8' : h.cls === 'necro' ? '#2a2a2a' : h.cls === 'cryo' ? '#4a6a8a' : '#5a3b22', h.cls === 'necro' ? '#7dff9a' : h.cls === 'cryo' ? '#bfe8ff' : h.cls === 'pyro' ? '#ff8a3a' : metal);
  else if (w === 'dagger' || w === 'knife') put('dagger', '#3a2a20', metal);
  else put('sword', '#3a2a20', metal);
  return { body, group, layers: L, glow: O && O.glow };
}
function npcSpec(c) {
  const d = GEN.derive(c), { L, body, group } = baseLayers(c, d.mood), F = body === 'female';
  const cloth = c.clothes.hex, legs = hk(c, 62, ['#3b3f46', '#4a3a30', '#2f3e4a', '#5a5a5a', '#6b5440']), boots = hk(c, 63, ['#3a2a20', '#24201c', '#5a4030']);
  const put = (id, col) => L.push([id, { cloth, metal: '#9aa3ad', ...col }]);
  const scholar = [1, 2, 9, 12].includes(c.job);
  if (scholar) { if (F) put('robe', { cloth }); else { put('ls2', {}); put('cape', { cloth: shade(cloth, -.3) }); } if (c.job === 9) put('wizard', { cloth: shade(cloth, -.2) }); }
  else if (F) { put(hk(c, 64, ['blouse_ls', 'dress', 'tunic', 'dress']), {}); put(hk(c, 65, ['skirt', 'pants', 'skirt']), { cloth: legs }); if (GEN.hash(c.seed, 66) < .3) put('apron_full', { cloth: '#e8e2d4' }); }
  else { put(hk(c, 64, ['ls2', 'ls_laced', 'tshirt', 'ls2']), {}); if (GEN.hash(c.seed, 66) < .4) put('vest', { cloth: shade(cloth, -.3) }); put(hk(c, 65, ['pants', 'pantaloons']), { cloth: legs }); if (GEN.hash(c.seed, 67) < .3) put('overalls', { cloth: '#4a5a7a' }); }
  put(hk(c, 68, ['shoes', 'boots', 'sandals']), { cloth: boots });
  const hat = GEN.hash(c.seed, 69); if (hat < .12) put('hood', { cloth: shade(cloth, -.2) }); else if (hat < .2) put('cavalier', { cloth: shade(cloth, -.25) }); else if (hat < .26) put('bandana', { cloth: '#8a2a2a' });
  return { body, group, layers: L };
}
const enemyLooks = {};
function enemyLook(type) {
  if (enemyLooks[type]) return enemyLooks[type];
  if (ENEMIES[type].look.sheet) return (enemyLooks[type] = new MonsterLook(ENEMIES[type].look.sheet));
  const E = ENEMIES[type].look, L = [[E.base || 'body', { body: E.skin, cloth: E.skin }]];
  for (const l of E.layers) {
    if (typeof l === 'string') L.push([l, { body: E.skin, eye: '#e2343c' }]);
    else { const [id, cloth, metal] = l; L.push([id, { cloth: cloth || '#5a4636', metal: metal || '#9aa3ad', body: E.skin, eye: '#e2343c' }]); }
  }
  if (E.human) { L.splice(1, 0, [E.head || 'head_m', { body: E.skin, eye: '#3a3a3a' }], ['face_angry', { body: E.skin, eye: type === 'witch' ? '#6fd0ff' : '#3a3a3a' }]); }
  return (enemyLooks[type] = new Look({ body: E.body, group: E.group || 'male', layers: L }));
}
let allyLookCache = null;
function allyLook() {
  return allyLookCache || (allyLookCache = new Look({ body: 'male', group: 'male', layers: [['body_skeleton', { cloth: '#d6e8d0' }], ['head_skeleton', { cloth: '#d6e8d0' }], ['sword', { cloth: '#3a2a20', metal: '#7dff9a' }], ['shield', { cloth: '#2a3a2a', metal: '#7dff9a' }]] }));
}

// =====================================================================================
// Hero state
// =====================================================================================
let G = null;      // save data
const menuHandlers = {};
let world = null;  // current map
let ents = [], projs = [], fx = [], drops = [];
let player = null, tileset = null, cam = { x: 0, y: 0 }, now = 0, paused = true;
const maps = {};

function derivedStats(h) {
  const base = statBlock(h.char), st = { ...base }, C2 = CLASSES2[h.cls], main = C2.main, l = h.lvl - 1;
  st[main] += Math.floor(l * .8); st.ВЫН += Math.floor(l * .5); for (const s of GEN.STATS) if (s !== main && s !== 'ВЫН') st[s] += Math.floor(l * .25);
  const helm = HELMS[h.equip.helm] || HELMS[0]; st.ХАР += helm.cha || 0; st.ИНТ += helm.int || 0;
  const m = h === G ? SK.statMods(h) : {};
  const caster = CASTER.has(h.cls), W = WEIGHTS[C2.weight] || WEIGHTS.medium;
  const gear = h === G && h.gear ? gearStats(h) : { armor: 0 };
  const maxHp = (50 + st.ВЫН * 5 + h.lvl * 10 + (h.cls === 'warrior' || h.cls === 'hollow' ? 25 : 0) + (m.hp || 0)) * (1 + (m['hp%'] || 0));
  const maxMp = (20 + (caster ? st[main] * 3 : st.ИНТ * 1.5) + h.lvl * (caster ? 5 : 3) + (m.mp || 0)) * (1 + (m['mp%'] || 0));
  const dmg = 4 + st[main] * .9 + METALS[h.equip.weapon].power + h.lvl * 1.2;
  const armor = (armorList(h.cls)[h.equip.armor].def + helm.def + gear.armor * (W.armorMul || 1)) * (1 + (m['armor%'] || 0)) + (m.armor || 0);
  const def = Math.round(armor + Math.floor(st.ВЫН / 4));
  const crit = 5 + st.ЛОВ * .8 + (m.crit || 0) * 100;
  return { st, mods: m, maxHp: Math.max(6, Math.round(maxHp * HERO_HP)), maxMp: Math.round(maxMp), dmg, def, crit, critChance: crit / 100, dodge: W.dodge || 0, mpCostMul: W.mpCost || 0,
    speed: (88 + st.ЛОВ * 1.3) * (1 + (m['speed%'] || 0) + (W.speed || 0)), atkSpeed: 1 + (m['atkSpeed%'] || 0) + (m['castSpeed%'] || 0) * (caster ? 1 : 0) + (W.castSpeed || 0) * (caster ? 1 : 0),
    regen: (m.regen || 0) * HERO_HP, mpRegen: (caster ? 2.6 : 1.4) * (1 + (m['mpRegen%'] || 0) + (W.mpRegen || 0)), price: Math.max(.7, 1.2 - st.ХАР * .02) };
}
const xpNeed = (lvl) => Math.round(110 * lvl ** 1.75); // прокачка медленная: каждый уровень даётся трудом

function newGame(char, pickCls) {
  const cls = pickCls || 'human';
  G = { v: 3, char, cls, lvl: 1, tree: {}, slots: [null, null, null, null], echoes: 0, gear: {}, bag: [], xp: 0, gold: 25, potions: { hp: 3, mp: 2 }, equip: { weapon: 1, armor: 0, helm: 0 }, quests: [], done: {}, flags: {}, kills: {}, zone: 'world', found: {}, opened: {}, duns: {}, time: 30, playTime: 0, pos: null, seed: (rand() * 1e9) | 0, villagers: [], relics: {}, stats: { kills: 0, deaths: 0, chests: 0 } };
  SK.starterTree(G); MEM.initMemory(G);
  const ds = derivedStats(G); G.hp = ds.maxHp; G.mp = ds.maxMp;
  // villagers: four keepers and eight neighbours, each a full dossier
  const roles = ['inn', 'shop', 'smith', 'elder'];
  for (let i = 0; i < 12; i++) G.villagers.push({ seed: (rand() * 2 ** 31) | 0, role: roles[i] || null, quest: null, met: false, told: 0 });
  save();
}
function villagerChar(v) {
  const c = GEN.generate(null, new Set(), { genre: 'fantasy', gender: 'any', age: v.role === 'elder' ? 'old' : 'any', race: 'any' }, v.seed);
  return c;
}
function assignSideQuests() {
  const free = G.villagers.filter((v) => !v.role);
  for (let i = 0; i < 4; i++) {
    const v = free[i]; if (!v || v.quest) continue;
    if (i % 2 === 0) { const [target, plural, count, zone] = rpick(SIDE_TARGETS); v.quest = { id: 's' + v.seed, type: 'kill', target, plural, count: count + rint(0, 2), zone, reward: { gold: 30 + count * 8, xp: 30 + count * 10 } }; }
    else v.quest = { id: 's' + v.seed, type: 'fetch', relic: rpick(RELICS), zone: rand() < .6 ? 'forest' : 'crypt1', reward: { gold: 70, xp: 70 } };
  }
}
function save() { if (!G) return; if (maps.world) G.worldSave = { seen: [...maps.world.seen].slice(-4000) }; if (player) { G.hp = player.hp; G.mp = player.mp; G.zone = world.id; G.pos = [player.x, player.y]; } if (NARR) G.ink = NARR.save(); store.set(SAVE_KEY, G); }

// =====================================================================================
// Zones
// =====================================================================================
function strHash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return h >>> 0; }
function getMap(id) {
  if (id === 'world') return maps.world || (maps.world = new Overworld(G.seed % 1000003, G.worldSave || {}));
  if (maps[id]) return maps[id];
  if (id.startsWith('dun:')) {
    const parts = id.split(':'), floor = +parts.pop(), base = parts.join(':');
    const o = (G.duns && G.duns[base]) || { base, floors: 2, name: 'Подземелье', exit: getMap('world').spots.start };
    const m = buildCrypt(floor, (G.seed + strHash(base)) % 1000003, o);
    if (o.boss && floor === (o.floors || 3)) addDungeonFire(m, base);
    return (maps[id] = m);
  }
  return getMap('world');
}
const props = () => world.props;
function propsNear(x, y, r = 60) { return world.infinite ? world.propsNear(x, y, r) : world.props; }
function enterZone(id, spot, pos) {
  if (!(id === 'world' || id.startsWith('dun:'))) { id = 'world'; pos = null; spot = 'start'; }
  lock = null; updateLockHud();
  world = getMap(id);
  const allies = ents.filter((e) => e.kind === 'ally' && !e.dead);
  ents = [player]; projs = []; fx = []; drops = []; tele = [];
  const p = pos || world.spots[spot] || world.spots.start || world.spots.up || [world.w * T / 2, world.h * T / 2];
  player.x = p[0]; player.y = p[1];
  for (const a of allies) { a.x = player.x + 20; a.y = player.y + 14; ents.push(a); }
  if (world.infinite) { world.loaded = new Set(); spawned.clear(); worldTick(true); }
  else spawnEnemies(id);
  for (const q of G.quests) if (!q.done && q.type === 'reach' && q.target === (world.tag || id)) { q.progress = 1; q.done = true; toast(`Задание выполнено: «${q.title}». Вернитесь к старосте.`); }
  if (world.infinite) { lastBiome = ''; const near = world.structuresAround(player.x, player.y, 24)[0]; showZoneTitle(near ? near.name : BIOME_NAME[world.biomeAt(player.x, player.y)] || 'Пограничье'); } else showZoneTitle(world.name);
  music.zone(world.ambient);
  if (STORY) { respawnNpcs(); if (world.tag) STORY.onEnter(world.tag); }
  SK.clearWorld();
  G.zone = id; save();
  updateHUD();
}
// ---------- open world: chunks come and go around the hero ----------
const spawned = new Set();
let worldTimer = 0, lastBiome = '', biomeTimer = 0;
const WILD = {
  meadow: [['goblin', 4], ['wolf', 2], ['bandit', 3], ['slime', 2], ['snake', 1]], forest: [['goblin', 4], ['wolf', 3], ['shaman', 1], ['bandit', 1], ['arachne', 1], ['slime', 1]],
  swamp: [['zombie', 4], ['witch', 1], ['skeleton', 2], ['necro', 1], ['slime', 3], ['bat', 2], ['snake', 2]], snow: [['wolf', 5], ['witch', 3], ['skeleton', 2], ['golem', 1]],
  steppe: [['bandit', 4], ['goblin', 2], ['cultist', 2], ['big_worm', 2], ['snake', 2]], hills: [['wolf', 3], ['bandit', 2], ['skeleton', 2], ['golem', 1], ['bat', 2]], lake: [['slime', 3], ['snake', 2], ['wolf', 1]],
};
function wpickT(t) { const tot = t.reduce((a, b) => a + b[1], 0); let r = rand() * tot; for (const [k, w] of t) { r -= w; if (r <= 0) return k; } return t[0][0]; }
function worldTick(first) {
  const { added, removed } = world.update(player.x, player.y);
  for (const key of removed) { ents = ents.filter((e) => e.chunk !== key || e.kind === 'ally'); spawned.delete(key); }
  for (const c of added) spawnChunk(c, first);
  // discoveries
  for (const st of world.structuresAround(player.x, player.y, 16)) {
    G.found = G.found || {};
    if (!G.found[st.id]) { G.found[st.id] = { t: st.type, n: st.name, x: st.cx, y: st.cy, region: st.id }; if (!first) { gainEchoes(5); MEM.addCard(G, { id: 'reg_' + st.id, type: 'region', title: st.name, weight: 1, links: { region: st.id }, journal: [`Я нашёл ${st.name}.`] }); } if (!first) { showZoneTitle(st.name); toast(`Найдено место: ${st.name}`, 2200); } }
  }
  const b = world.biomeAt(player.x, player.y);
  if (b !== lastBiome) { biomeTimer += 1; if (biomeTimer > 3 || !lastBiome) { if (lastBiome && !first) toast(BIOME_NAME[b] || b, 1400); lastBiome = b; biomeTimer = 0; music.zone({ swamp: 'swamp', snow: 'snow', forest: 'forest', hills: 'ruins', steppe: 'ruins', lake: 'village' }[b] || 'village'); } } else biomeTimer = 0;
  G.worldSave = { seen: [...world.seen].slice(-4000) };
}
function chunkLevel(c) { return 1 + Math.hypot(c.cx - 2, c.cy - 2) * .05; }
function spawnChunk(c, first, onlyEnemies) {
  if (spawned.has(c.key)) return; spawned.add(c.key);
  const lvl = chunkLevel(c), safe = (x, y) => Math.hypot(x - player.x, y - player.y) > 240;
  for (const p of c.props) if (p.type === 'chest' && p.key && G.opened && G.opened[p.key]) p.open = true;
  for (const st of c.structs) {
    const home = Math.floor(st.cx / CS) === c.cx && Math.floor(st.cy / CS) === c.cy; if (!home) continue;
    for (const [type, dx, dy, tag] of st.spawns) {
      if (type === 'troll' && (G.flags.troll || (STORY && !STORY.wantsEnemy('troll')))) continue;
      const x = (st.cx + dx) * T + 16, y = (st.cy + dy) * T + 16;
      if (!safe(x, y) && !first) continue;
      const e = addEnemy(type, x, y, 1 + st.dist * .05); e.chunk = c.key;
    }
    if (st.hub && !onlyEnemies) spawnVillage(st, c.key);
  }
  if (Math.hypot(c.cx - 2, c.cy - 2) < 2.2 || c.structs.some((s) => s.hub)) return;
  const table = WILD[c.biome] || WILD.meadow, n = rand() < .45 ? 0 : rand() < .75 ? 1 : 2;
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < 12; k++) {
      if (world.dark > .3 && rand() < .35) { const x = (c.cx * CS + 1 + rand() * (CS - 2)) * T, y = (c.cy * CS + 1 + rand() * (CS - 2)) * T; if (!blocked(x, y, 10) && safe(x, y)) { const e = addEnemy(rand() < .6 ? 'wraith' : 'bat', x, y, lvl); e.chunk = c.key; break; } }
      const x = (c.cx * CS + 1 + rand() * (CS - 2)) * T, y = (c.cy * CS + 1 + rand() * (CS - 2)) * T;
      if (blocked(x, y, 10) || !safe(x, y)) continue;
      const type = wpickT(table), e = addEnemy(type, x, y, lvl); e.chunk = c.key;
      if (rand() < .4) { const q = freeSpot([x, y], 20, 50); if (q) { const e2 = addEnemy(type === 'shaman' || type === 'necro' || type === 'witch' ? 'goblin' : type, q[0], q[1], lvl); e2.chunk = c.key; if (type === 'necro' || type === 'witch') e2.type; } }
      break;
    }
  }
}
function spawnVillage(st, key) {
  if (st.start) {
    G.villagers.forEach((v, i) => {
      if (['inn', 'smith', 'elder', 'shop'].includes(v.role)) return;
      const c = villagerCache[v.seed] || (villagerCache[v.seed] = villagerChar(v));
      const p = v.role ? st.keeperSpots[v.role] : (freeSpot(st.npcSpots[i % st.npcSpots.length], 0, 40) || st.npcSpots[i % st.npcSpots.length]);
      ents.push({ kind: 'npc', v, c, x: p[0], y: p[1], home: p, dir: 'down', anim: 'walk', frame: 0, t: rand() * 4, speed: 28, state: 'idle', look: new Look(npcSpec(c)), still: !!v.role, chunk: key });
    });
    return;
  }
  const R = GEN.mulberry(strHash(st.id) ^ G.seed);
  for (const role of ['inn', 'shop']) {
    const h = st.props.find((p) => p.role === role); if (!h) continue;
    const v = { seed: h.keeper, role, quest: null, met: false }, c = villagerCache[v.seed] || (villagerCache[v.seed] = villagerChar(v));
    const p = st.keeperSpots[role];
    ents.push({ kind: 'npc', v, c, x: p[0], y: p[1], home: p, dir: 'down', anim: 'walk', frame: 0, t: 0, speed: 28, state: 'idle', look: new Look(npcSpec(c)), still: true, chunk: key, keeperOf: h });
  }
  const n = 2 + Math.floor(R() * 3);
  for (let i = 0; i < n; i++) {
    const v = { seed: Math.floor(R() * 2 ** 31), role: null, quest: null, met: false, guest: true }, c = villagerCache[v.seed] || (villagerCache[v.seed] = villagerChar(v));
    const s0 = st.npcSpots[i % st.npcSpots.length], p = freeSpot(s0, 0, 40) || s0;
    ents.push({ kind: 'npc', v, c, x: p[0], y: p[1], home: p, dir: 'down', anim: 'walk', frame: 0, t: rand() * 4, speed: 26, state: 'idle', look: new Look(npcSpec(c)), chunk: key });
  }
}
function freeSpot(near, rmin, rmax) {
  for (let i = 0; i < 60; i++) {
    const a = rand() * 6.283, r = rmin + rand() * (rmax - rmin), x = near[0] + Math.cos(a) * r, y = near[1] + Math.sin(a) * r;
    if (!blocked(x, y, 9)) return [x, y];
  }
  return null;
}
function randomFloor(map) {
  if (map.infinite) return null;
  for (let i = 0; i < 200; i++) { const x = rand() * map.w * T, y = rand() * map.h * T; if (!blocked(x, y, 10)) return [x, y]; }
  return null;
}
function spawnEnemies(id) {
  const table = SPAWNS[world.spawnKey] || SPAWNS.crypt1;
  const start = [player.x, player.y], lvl = world.level || 1;
  for (const [type, n] of table) for (let i = 0; i < n; i++) {
    let p = null;
    if (world.rooms) { const room = rpick(world.rooms.slice(1)); p = [(room.x + 1 + rand() * (room.w - 2)) * T, (room.y + 1 + rand() * (room.h - 2)) * T]; if (blocked(p[0], p[1], 10)) p = null; }
    else p = randomFloor(world);
    if (p && Math.hypot(p[0] - start[0], p[1] - start[1]) > 220) addEnemy(type, p[0], p[1], lvl);
  }
  if (world.tag === 'crypt2' && !G.flags.minotaur && STORY && STORY.wantsEnemy('minotaur')) { const s = world.spots.down; const p = freeSpot([s[0], s[1] - 40], 20, 60); if (p) addEnemy('minotaur', p[0], p[1], lvl); }
  else if (world.tag === 'crypt3' && !G.flags.lich && STORY && STORY.wantsEnemy('lich')) { const b = world.spots.boss; addEnemy('lich', b[0], b[1], 1); }
  else if (world.tag === 'crypt3' || world.tag === 'crypt2') {}
  else if (!world.tag && !world.spots.down && !G.flags['boss:' + world.id]) { const b = world.spots.boss; const p = freeSpot(b, 0, 40) || b; const e = addEnemy(world.spawnKey.startsWith('mine') ? 'minotaur' : 'necro', p[0], p[1], lvl * 1.15); e.dunBoss = true; if (e.type === 'necro') { e.maxHp = e.hp = Math.round(e.hp * 3.5); e.scale = 1.25; e.E = { ...e.E, boss: true, name: 'Мастер-некромант' }; } }
}
function addEnemy(type, x, y, area = 1) {
  const E = ENEMIES[type], lvlBoost = (1 + Math.max(0, G.lvl - 1) * .06 * (E.boss ? .5 : 1)) * area;
  const e = { kind: 'enemy', type, E, x, y, home: [x, y], dir: 'down', anim: 'walk', frame: 0, t: rand() * 3, hp: Math.round(E.hp * lvlBoost * (E.boss ? 1.3 : 1.5)), maxHp: Math.round(E.hp * lvlBoost * (E.boss ? 1.3 : 1.5)), dmg: E.dmg * (1 + (lvlBoost - 1) * .7) * 1.2, speed: E.speed, cd: 1 + rand(), state: 'idle', look: enemyLook(type), scale: E.scale || 1, hurtT: 0, wander: null, area };
  ents.push(e); return e;
}
const villagerCache = {};
// =====================================================================================
// Collision
// =====================================================================================
function blocked(x, y, r) {
  for (const [ox, oy] of [[-r, 0], [r, 0], [0, -r * .6], [0, r * .4]]) if (solidTile(world, Math.floor((x + ox) / T), Math.floor((y + oy) / T))) return true;
  for (const p of propsNear(x, y, 40)) {
    const b = propBox(p); if (!b) continue;
    if (x + r > b[0] && x - r < b[0] + b[2] && y + r * .4 > b[1] && y - r * .4 < b[1] + b[3]) return true;
  }
  return false;
}
function moveEnt(e, dx, dy, r = 7) {
  if (dx && !blocked(e.x + dx, e.y, r)) e.x += dx;
  if (dy && !blocked(e.x, e.y + dy, r)) e.y += dy;
}

// =====================================================================================
// Input
// =====================================================================================
const keys = new Set();
const input = { mx: 0, my: 0, attack: false, skill: false, act: false };
addEventListener('keydown', (e) => {
  if (e.repeat && ['KeyE', 'Enter', 'Digit1', 'Digit2', 'Escape', 'Tab', 'KeyM'].includes(e.code)) return;
  keys.add(e.code);
  if (screenNow !== 'game') return;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(e.code)) e.preventDefault();
  if (modalOpen()) { if (e.code === 'Escape' && !(NARR && NARR.busy())) closeModal(); return; }
  if (e.code === 'KeyE' || e.code === 'Enter') interact();
  if (e.code === 'Space' && !e.repeat) tryDodge();
  if (e.code === 'KeyH' && !e.repeat) tryParry();
  if (e.code === 'Digit1') usePotion('hp');
  if (e.code === 'Digit2') usePotion('mp');
  if (e.code === 'Escape' || e.code === 'Tab') openMenu('hero');
  if (e.code === 'KeyM') music.toggle();
  if (e.code === 'KeyF') toggleLock();
  if (e.code === 'KeyN') openMenu('tree');
  if (e.code === 'KeyB') openMenu('skein');
  if (e.code === 'KeyG') cycleLock();
});
addEventListener('keyup', (e) => keys.delete(e.code));
function readKeys() {
  let mx = 0, my = 0;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) mx -= 1; if (keys.has('KeyD') || keys.has('ArrowRight')) mx += 1;
  if (keys.has('KeyW') || keys.has('ArrowUp')) my -= 1; if (keys.has('KeyS') || keys.has('ArrowDown')) my += 1;
  return { mx, my, attack: keys.has('KeyJ'), skills: [keys.has('KeyK') || keys.has('ShiftLeft'), keys.has('KeyL') || keys.has('KeyQ'), keys.has('KeyU') || keys.has('KeyR'), keys.has('KeyI') || keys.has('KeyT')] };
}
// touch: joystick on the left, buttons on the right
const touch = { id: null, ox: 0, oy: 0, dx: 0, dy: 0, attack: false, skill: false };
function setupTouch() {
  const pad = $('pad'), knob = $('knob');
  const start = (e) => { const t = e.changedTouches[0]; touch.id = t.identifier; touch.ox = t.clientX; touch.oy = t.clientY; pad.style.left = t.clientX - 60 + 'px'; pad.style.top = t.clientY - 60 + 'px'; pad.classList.add('on'); e.preventDefault(); };
  const move = (e) => { for (const t of e.changedTouches) if (t.identifier === touch.id) { let dx = t.clientX - touch.ox, dy = t.clientY - touch.oy; const l = Math.hypot(dx, dy), m = 48; if (l > m) { dx *= m / l; dy *= m / l; } touch.dx = dx / m; touch.dy = dy / m; knob.style.transform = `translate(${dx}px,${dy}px)`; } e.preventDefault(); };
  const end = (e) => { for (const t of e.changedTouches) if (t.identifier === touch.id) { touch.id = null; touch.dx = touch.dy = 0; knob.style.transform = ''; pad.classList.remove('on'); } };
  $('stickzone').addEventListener('touchstart', start, { passive: false });
  $('stickzone').addEventListener('touchmove', move, { passive: false });
  $('stickzone').addEventListener('touchend', end); $('stickzone').addEventListener('touchcancel', end);
  const hold = (id, key) => { const b = $(id); b.addEventListener('touchstart', (e) => { touch[key] = true; e.preventDefault(); audio.unlock(); }, { passive: false }); b.addEventListener('touchend', () => { touch[key] = false; }); b.addEventListener('mousedown', () => { touch[key] = true; }); b.addEventListener('mouseup', () => { touch[key] = false; }); b.addEventListener('mouseleave', () => { touch[key] = false; }); };
  hold('bAttack', 'attack'); hold('bSkill', 's0'); hold('bSkill2', 's1'); hold('bSkill3', 's2'); hold('bSkill4', 's3');
  $('bAct').addEventListener('click', () => interact());
  for (const [id, fn] of [['bDodge', () => tryDodge()], ['bParry', () => tryParry()]]) { const b = $(id); b.addEventListener('touchstart', (e) => { e.preventDefault(); audio.unlock(); fn(); }, { passive: false }); b.addEventListener('mousedown', fn); }
  $('bHp').addEventListener('click', () => usePotion('hp'));
  $('bMp').addEventListener('click', () => usePotion('mp'));
  $('bMenu').addEventListener('click', () => openMenu('hero'));
  let lockT = 0;
  $('bLock').addEventListener('touchstart', (e) => { lockT = performance.now(); e.preventDefault(); }, { passive: false });
  $('bLock').addEventListener('touchend', (e) => { e.preventDefault(); if (performance.now() - lockT > 380) cycleLock(); else toggleLock(); });
  $('bLock').addEventListener('click', () => toggleLock());
  cv.addEventListener('pointerdown', (e) => { if (screenNow === 'game') tapLock(e.clientX, e.clientY); });
}

// =====================================================================================
// Audio: tiny synth, starts after the first gesture
// =====================================================================================
const music = {
  timer: null, notes: [], step: 0, kind: '',
  zone(kind) { this.kind = kind; if (audio.music(kind) !== false && audio.musicMap && audio.musicMap[kind]) { this.notes = []; return; } const base = { village: [262, 330, 392, 440, 392, 330], forest: [220, 262, 294, 330, 294, 247], crypt: [147, 175, 165, 139, 147, 131] }[kind] || [262]; this.notes = base; if (!this.timer) this.timer = setInterval(() => this.tick(), 700); },
  tick() { if (!this.notes.length || !audio.on || !audio.ctx || paused) return; const f = this.notes[this.step++ % this.notes.length]; audio.tone(f / 2, .6, 'triangle', .018); if (this.step % 3 === 0) audio.tone(f, .3, 'sine', .01); },
  toggle() { const on = audio.toggle(); toast(on ? 'Звук включён' : 'Звук выключен'); },
};

// =====================================================================================
// Player actions
// =====================================================================================
function makePlayer() {
  const ds = derivedStats(G);
  player = { kind: 'player', x: 0, y: 0, dir: 'down', anim: 'walk', frame: 0, t: 0, hp: Math.min(G.hp ?? ds.maxHp, ds.maxHp), mp: Math.min(G.mp ?? ds.maxMp, ds.maxMp), ds, look: new Look(heroSpec(G)), atk: 0, cd: 0, inv: 0, dash: 0, scale: 1, moving: false };
  SK.initPlayer(player, G); player.ds = derivedStats(G);
}
function migrate(g) {
  if (g.cls === 'mage') g.cls = 'pyro';
  if (!CLASSES2[g.cls]) g.cls = 'warrior';
  g.echoes = g.echoes || 0; g.gear = g.gear || {}; g.bag = g.bag || [];
  if (!g.tree) { g.tree = {}; g.slots = [null, null, null, null]; SK.starterTree(g); }
  migrateStory(g);
  return g;
}
function refreshPlayer() { player.ds = derivedStats(G); player.ds = derivedStats(G); player.look = new Look(heroSpec(G)); player.hp = Math.min(player.hp, player.ds.maxHp); player.mp = Math.min(player.mp, player.ds.maxMp); updateHUD(); }

// ---------- target lock ----------
let lock = null;
function validLock() {
  if (lock && (lock.hp <= 0 || lock.dead || !ents.includes(lock) || dist(lock, player) > 460)) { lock = null; updateLockHud(); }
  return lock;
}
function setLock(e) { lock = e; updateLockHud(); if (e) { player.dir = DIR_OF(e.x - player.x, e.y - player.y); sfx.ui(); } }
function toggleLock() {
  if (!player || player.dead) return;
  if (validLock()) { setLock(null); toast('Цель отпущена', 800); return; }
  const e = nearestEnemy(360); if (!e) { toast('Рядом нет врагов', 900); return; }
  setLock(e);
}
function cycleLock() {
  const list = ents.filter((e) => e.kind === 'enemy' && e.hp > 0 && !e.dead && dist(e, player) < 400).sort((a, b) => dist(a, player) - dist(b, player));
  if (!list.length) { setLock(null); return; }
  setLock(list[(list.indexOf(lock) + 1) % list.length]);
}
function aimAngle() {
  const l = validLock(); if (l) return Math.atan2(l.y - 20 * l.scale - (player.y - 20), l.x - player.x);
  const dv = DV[player.dir]; return Math.atan2(dv[1], dv[0]);
}
function updateLockHud() {
  const box = $('target'); if (!box) return;
  if (!lock) { box.hidden = true; return; }
  box.hidden = false; $('targetName').textContent = lock.E.name; $('targetBar').style.width = Math.max(0, 100 * lock.hp / lock.maxHp) + '%';
}
function tapLock(clientX, clientY) {
  if (!world || !player || modalOpen()) return false;
  const k = cv.width / cv.clientWidth / view.scale, wx = cam.x + clientX * k, wy = cam.y + clientY * k;
  let best = null, bd = 34;
  for (const e of ents) if (e.kind === 'enemy' && e.hp > 0 && !e.dead) { const d = Math.hypot(e.x - wx, e.y - 22 * e.scale - wy) / Math.max(1, e.scale); if (d < bd) { bd = d; best = e; } }
  if (!best) return false;
  setLock(lock === best ? null : best); return true;
}
function drawReticle(x) {
  const l = lock; if (!l || l.dead) return;
  const sc = l.scale || 1, cxr = l.x, cyr = l.y - 22 * sc, r = 20 * sc + Math.sin(now * 6) * 2, a0 = now * 1.5;
  x.strokeStyle = '#ffd25a'; x.lineWidth = 2;
  for (let i = 0; i < 4; i++) { const a = a0 + i * Math.PI / 2; x.beginPath(); x.arc(cxr, cyr, r, a - .35, a + .35); x.stroke(); }
  x.fillStyle = '#ffd25a'; x.beginPath(); x.moveTo(cxr, cyr - r - 10 - Math.sin(now * 6) * 2); x.lineTo(cxr - 5, cyr - r - 17); x.lineTo(cxr + 5, cyr - r - 17); x.fill();
  x.strokeStyle = 'rgba(255,210,90,.25)'; x.setLineDash([3, 4]); x.beginPath(); x.moveTo(player.x, player.y - 20); x.lineTo(cxr, cyr); x.stroke(); x.setLineDash([]);
}
const CLS = () => CLASSES2[G.cls];
function attackAnim() { const C = CLS(); return C.basic.type === 'melee' ? 'slash' : C.anim === 'shoot' || C.weapon === 'bow' ? 'shoot' : 'spellcast'; }
function startAttack() {
  const C = CLS(), B = C.basic;
  if (player.cd > 0 || player.atk > 0 || player.dead || SK.busy()) return;
  const cd = (B.cd || .5) / Math.max(.4, player.ds.atkSpeed || 1);
  player.anim = attackAnim(); player.atk = cd; player.atkDur = cd; player.cd = cd; player.frame = 0; player.hitDone = false; player.hitFrame = B.hitFrame || 3;
  if (B.type === 'melee') sfx.swing();
  aimAtNearest();
}
function aimAtNearest() {
  if (validLock()) { player.dir = DIR_OF(lock.x - player.x, lock.y - player.y); return lock; }
  let best = null, bd = 220;
  for (const e of ents) if (e.kind === 'enemy' && e.hp > 0) { const d = dist(e, player); if (d < bd) { bd = d; best = e; } }
  if (best && (CLS().basic.type !== 'melee' || bd < 80)) player.dir = DIR_OF(best.x - player.x, best.y - player.y);
  return best;
}
function attackHit() { SK.basicHit(); }
// ---------- погода и звуки мира ----------
let soundT = 0;
function worldSoundTick(dt) {
  const indoor = !world.infinite, biome = indoor ? 'crypt' : world.biomeAt(player.x, player.y);
  weatherTick(dt, { time: G.time, seed: G.seed, biome, dark: world.dark || 0, chapter: G.ws ? G.ws.chapter : 1, indoor });
  if ((soundT -= dt) > 0) return; soundT = .25;
  let water = 0;
  if (!indoor) { const tx = Math.floor(player.x / T), ty = Math.floor(player.y / T); for (let a = 0; a < 12; a++) { const t1 = world.tile(tx + Math.round(Math.cos(a / 12 * 6.283) * 4), ty + Math.round(Math.sin(a / 12 * 6.283) * 4)); if (t1 === TILE.WATER || t1 === TILE.SHALLOW) water++; } }
  let fire = 0; for (const p of visibleProps) if (p.type === 'campfire') { const d = Math.hypot(p.x - player.x, p.y - player.y); if (d < 170) fire = Math.max(fire, 1 - d / 170); }
  ambientTick(.25, { water: Math.min(1, water / 6), biome, dark: world.dark || 0, rain: WEATHER.rain, fire, indoor });
}
// ---------- отскок и парирование: есть у всех с первого уровня ----------
const DODGE = { dur: .32, dist: 78, inv: .26, cd: .65 }, PARRY = { win: .22, cd: .8, recover: .3, stun: 1.1, riposte: 1.6 };
let hitStop = 0;
function tryDodge() {
  const P = player; if (!P || P.dead || P.dodgeT > 0 || P.dodgeCd > 0 || P.parry > 0 || SK.busy() || modalOpen()) return;
  if (!spendStam(STAM.dodge)) return;
  const kb = readKeys(), mx = kb.mx + touch.dx, my = kb.my + touch.dy, dv = DV[P.dir];
  P.dodgeAng = Math.hypot(mx, my) > .15 ? Math.atan2(my, mx) : Math.atan2(-dv[1], -dv[0]); // с места — назад, от взгляда
  P.dodgeT = DODGE.dur; P.dodgeCd = DODGE.dur + DODGE.cd; P.inv = Math.max(P.inv, DODGE.inv); P.dodgeMiss = false;
  P.atk = 0; P.anim = 'walk'; P.frame = 0; P.parryRecover = 0; P.trail = [];
  fx.push({ type: 'dust', x: P.x, y: P.y, t: 0, life: .5 }); sfx.dodge();
}
function tryParry() {
  const P = player; if (!P || P.dead || P.parry > 0 || P.parryCd > 0 || P.dodgeT > 0 || SK.busy() || modalOpen()) return;
  if (!spendStam(STAM.parry)) return;
  P.parry = PARRY.win; P.parryCd = PARRY.win + PARRY.cd; P.atk = 0; P.anim = 'slash'; P.frame = 1;
  const e = validLock() || nearestEnemy(90); if (e) P.dir = DIR_OF(e.x - P.x, e.y - P.y);
  sfx.swing();
}
// true, пока герой в отскоке, в стойке парирования или в заминке после промаха — тогда ходьба и атаки ждут
function combatTick(dt) {
  const P = player;
  P.dodgeCd = Math.max(0, (P.dodgeCd || 0) - dt); P.parryCd = Math.max(0, (P.parryCd || 0) - dt);
  // выносливость: тратится на отскок и парирование, после короткой паузы возвращается
  P.stamT = Math.max(0, (P.stamT || 0) - dt); P.stamFlash = Math.max(0, (P.stamFlash || 0) - dt);
  if (P.stamT <= 0) P.stam = Math.min(STAM.max, (P.stam ?? STAM.max) + STAM.regen * dt);
  if (P.dodgeT > 0) {
    const k = 1 - P.dodgeT / DODGE.dur, v = DODGE.dist / DODGE.dur * (1.45 - k * .9); // рывок с места, к концу гаснет
    (P.trail = P.trail || []).push([P.x, P.y]); if (P.trail.length > 5) P.trail.shift();
    moveEnt(P, Math.cos(P.dodgeAng) * v * dt, Math.sin(P.dodgeAng) * v * dt);
    P.dodgeT -= dt; if (P.dodgeT <= 0) { P.dodgeT = 0; P.trail = []; fx.push({ type: 'dust', x: P.x, y: P.y, t: 0, life: .4, small: true }); }
    return true;
  }
  if (P.parry > 0) { P.parry -= dt; P.anim = 'slash'; P.frame = 1; if (P.parry <= 0) { P.parry = 0; P.parryRecover = PARRY.recover; P.anim = 'walk'; P.frame = 0; } return true; }
  if (P.parryRecover > 0) { P.parryRecover -= dt; return true; } // парировал впустую — короткая заминка
  return false;
}
function parried(from, melee) {
  const P = player, a = Math.atan2(from.y - P.y, from.x - P.x);
  P.parry = 0; P.parryRecover = 0; P.parryCd = .2; P.anim = 'walk'; P.frame = 0;
  fx.push({ type: 'parry', x: P.x + Math.cos(a) * 18, y: P.y - 24 + Math.sin(a) * 10, a, t: 0, life: .5 });
  fx.push({ type: 'num', x: P.x, y: P.y - 56, text: 'парировано', small: true, gold: true, t: 0, life: .9 });
  hitStop = .1; sfx.parry();
  if (melee && from.kind === 'enemy' && from.hp > 0) { from.stun = Math.max(from.stun || 0, from.E.boss ? PARRY.stun * .35 : PARRY.stun); from.atk = 0; from.anim = 'hurt'; from.frame = 1; from.kx = Math.cos(a) * 170; from.ky = Math.sin(a) * 170; }
  if (P.sk) P.sk.buffs.push({ kind: 'riposte', dur: PARRY.riposte, mods: [{ stat: 'nextHitDmg%', value: 1 }] }); // ответный удар вдвое сильнее
  P.stam = Math.min(STAM.max, (P.stam ?? STAM.max) + 12); // точное парирование возвращает дыхание
}
function parryBroken() {
  const P = player; P.parry = 0; P.parryRecover = .45; P.anim = 'walk'; P.frame = 0; hitStop = .05;
  fx.push({ type: 'num', x: P.x, y: P.y - 56, text: 'не отбить!', small: true, hurt: true, t: 0, life: .8 });
}
const STAM = { max: 100, regen: 42, delay: .6, dodge: 34, parry: 22 };
function spendStam(n) {
  const P = player, s = P.stam ?? STAM.max;
  if (s < n) { P.stamFlash = .45; if (!P.breathT || now - P.breathT > 1) { P.breathT = now; fx.push({ type: 'num', x: P.x, y: P.y - 50, text: 'выдохся', small: true, t: 0, life: .7 }); } return false; }
  P.stam = s - n; P.stamT = STAM.delay; return true;
}
// ---------- костры: отдых, сохранение, возрождение ----------
const POTION_CAP = { hp: 3, mp: 2 };
const FIRE_LINES = ['Огонь тянется к твоим рукам. Нитка на запястье теплеет.', 'Дрова потрескивают. Кто-то сложил их до тебя и оставил гореть.', 'Дым пахнет ольхой и рекой. На минуту можно ничего не помнить.', 'Красная нитка на колышке шевелится, хотя ветра нет.'];
function restAt(p) {
  if (ents.some((e) => e.kind === 'enemy' && e.hp > 0 && !e.dead && e.state === 'chase' && dist(e, player) < 280)) { toast('Рядом враги — не до отдыха.', 1800); return; }
  const line = FIRE_LINES[(G.stats.rests || 0) % FIRE_LINES.length];
  modal(`<h2>${GEN.esc(p.name || 'Костёр')}</h2><p class="line">${line}</p><p class="aside">Отдых вернёт здоровье и ману, пополнит зелья (до ${POTION_CAP.hp} ♥ и ${POTION_CAP.mp} ♦) и сохранит игру. Если нить порвётся, ты очнёшься здесь. Враги вокруг тоже вернутся.</p><div class="row col"><button class="btn primary" data-a="rest">Отдохнуть</button><button class="btn" data-a="night">Отдохнуть до ночи</button><button class="btn" data-a="dawn">Отдохнуть до утра</button><button class="btn" data-close>Уйти</button></div>`);
  modalHandlers = { rest: () => doRest(p), night: () => doRest(p, 'night'), dawn: () => doRest(p, 'dawn') };
}
function restoreAtFire() {
  player.hp = player.ds.maxHp; player.mp = player.ds.maxMp; player.stam = STAM.max;
  for (const k of ['hp', 'mp']) G.potions[k] = Math.max(G.potions[k] || 0, POTION_CAP[k]);
  respawnAround();
}
function doRest(p, until) {
  closeModal();
  G.fires = G.fires || {}; const first = !G.fires[p.id]; G.fires[p.id] = true;
  G.rest = { id: p.id, zone: world.id, x: p.x, y: p.y + 30, name: p.name || 'Костёр' };
  G.stats.rests = (G.stats.rests || 0) + 1;
  restoreAtFire();
  if (until) skipTo(until);
  const f = $('restfade'); f.classList.add('on'); setTimeout(() => f.classList.remove('on'), 420);
  if (sfx.potion) sfx.potion();
  save(); updateHUD();
  toast(first ? `${G.rest.name} разожжён. Здесь ты очнёшься, если нить порвётся. Сохранено.` : `${G.rest.name}: ты отдохнул. Сохранено.`, 2800);
}
// враги вокруг возвращаются (в подземелье — когда спустишься снова)
function respawnAround() {
  if (!world.infinite) return;
  ents = ents.filter((e) => !(e.kind === 'enemy' && e.chunk && !(e.E && e.E.boss)));
  for (const k of world.loaded) spawned.delete(k);
  for (const k of world.loaded) { const c = world.chunks.get(k); if (c) spawnChunk(c, false, true); }
}
// костёр перед последним залом подземелья — у лестницы, по которой пришёл
function addDungeonFire(m, base) {
  if (m.props.some((p) => p.rest)) return;
  const sx = Math.floor(m.spots.up[0] / T), sy = Math.floor(m.spots.up[1] / T);
  for (let r = 2; r < 8; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const tx = sx + dx, ty = sy + dy; if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    let free = true; for (let a = -1; a <= 1 && free; a++) for (let b = -1; b <= 1 && free; b++) if (solidTile(m, tx + a, ty + b)) free = false;
    if (!free || m.props.some((p) => Math.hypot(p.x - (tx * T + 16), p.y - (ty * T + 20)) < 48)) continue;
    m.props.push({ type: 'campfire', rest: true, light: true, id: base + ':fire', name: 'Костёр перед последним залом', x: tx * T + 16, y: ty * T + 20 }); return;
  }
}
function nearestEnemy(r = 260) { let best = null, bd = r; for (const e of ents) if (e.kind === 'enemy' && e.hp > 0) { const d = dist(e, player); if (d < bd) { bd = d; best = e; } } return best; }
function areaPoint() { const e = validLock() || nearestEnemy(); if (e) return [e.x, e.y]; const dv = DV[player.dir]; return [player.x + dv[0] * 110, player.y + dv[1] * 110]; }
let warnT = 0;
function useSkill(slot) {
  const id = G.slots && G.slots[slot]; if (!id) return;
  if (player.atk > 0 || player.dead) return;
  if (!SK.slotOpen(G, slot)) return;
  const n = SK.node(G.cls, id); if (!n) return;
  const aim = aimAtNearest();
  const err = SK.cast(id);
  if (err) { if (err !== 'cd' && err !== 'занят' && now > warnT) { toast(err, 900); warnT = now + 1; } return; }
  const physical = !CASTER.has(G.cls) && !n.effects.some((e) => ['heal', 'shield', 'summon', 'aura', 'transform'].includes(e.type) && G.cls !== 'warrior');
  const anim = G.cls === 'ranger' && n.effects.some((e) => ['projectile', 'pierce', 'aoe'].includes(e.type)) ? 'shoot' : (G.cls === 'warrior' || G.cls === 'hollow' || G.cls === 'weaver') && physical ? 'slash' : 'spellcast';
  player.anim = anim; player.atk = .45; player.atkDur = .45; player.frame = 0; player.hitDone = true;
  if (STORY) STORY.onCast((n.effects.find((e) => e.school) || {}).school || CLS().school || 'phys');
  updateHUD();
}
function addAlly(spec) {
  const { x, y } = spec;
  const look = spec.copyHero ? player.look : spec.copyType ? enemyLook(spec.copyType) : spec.look ? summonLook(spec.unit, spec.look) : allyLook();
  const a = { kind: 'ally', x, y, dir: 'down', anim: 'walk', frame: 0, t: 0, hp: spec.hp, maxHp: spec.hp, dmgMul: spec.dmgMul ?? .6, speed: spec.speed || 72, cd: .5, life: spec.life ?? 45, look, scale: spec.scale || 1, hurtT: 0, unit: spec.unit, ranged: spec.ranged, turret: spec.turret, taunt: spec.taunt, onExpire: spec.onExpire, reach: spec.reach || 28, still: spec.still, tint: spec.tint, alpha: spec.alpha, name: spec.name };
  ents.push(a);
  fx.push({ type: 'ring', x, y: y - 6, t: 0, life: .8, color: spec.tint || '#7dff9a', r: 34 }); fx.push({ type: 'sparkle', x, y: y - 20, t: 0, life: .8, color: spec.tint || '#7dff9a' });
  return a;
}
const summonLooks = {};
function summonLook(unit, L) {
  if (summonLooks[unit]) return summonLooks[unit];
  const layers = [[L.base || 'body', { body: L.skin, cloth: L.skin }]];
  for (const l of L.layers) { if (typeof l === 'string') layers.push([l, { body: L.skin, eye: '#7dff9a' }]); else { const [id, cloth, metal] = l; layers.push([id, { cloth: cloth || '#5a4636', metal: metal || '#9aa3ad', body: L.skin, eye: '#7dff9a' }]); } }
  return (summonLooks[unit] = new Look({ body: L.body || 'male', group: 'male', layers }));
}
function convertToAlly(e, dur, onEnd) {
  e.kind = 'ally'; e.life = dur; e.maxHp = e.maxHp; e.dmgMul = .8; e.converted = { onEnd, type: e.type }; e.tint = '#ff6a70'; e.state = 'idle'; e.speed = e.speed || 60;
  if (lock === e) { lock = null; updateLockHud(); }
}
function allyDies(a) {
  a.hp = 0; a.dead = .001; a.anim = 'hurt'; a.frame = 0;
  if (a.onExpire) SK.run(a.onExpire, { hitPos: { x: a.x, y: a.y }, from: a });
  if (a.converted && a.converted.onEnd) SK.run([a.converted.onEnd], { hitPos: a, target: null });
  if (!a.converted) SK.onSummonDeath(a);
}
function updAlly(a, dt) {
  if (a.dead) { a.dead += dt; a.frame = Math.min(5, a.dead * 9); return; }
  a.life -= dt; a.cd -= dt; a.hurtT = Math.max(0, a.hurtT - dt);
  if (a.hp <= 0 || a.life <= 0) { allyDies(a); return; }
  const dmg = player.ds.dmg * (a.dmgMul ?? .6);
  if (a.atk > 0) { a.atk -= dt; a.frame = Math.min(5, ((.5 - a.atk) / .5) * 6); if (!a.hitDone && a.frame >= 3) { a.hitDone = true; const e = a.target; if (e && e.hp > 0 && dist(a, e) < (a.reach + 12) * Math.max(1, e.scale * .9)) { SK.dealDamage(e, (a.dmgMul ?? .6), 'phys', { summon: true, from: a }); sfx.hit(); } } if (a.atk <= 0) { a.anim = 'walk'; a.frame = 0; } return; }
  let target = null, bd = 220;
  for (const e of ents) if (e.kind === 'enemy' && e.hp > 0) { const d = Math.min(dist(e, a), dist(e, player) + 40); if (d < bd) { bd = d; target = e; } }
  a.target = target;
  const shooter = a.turret || a.ranged;
  if (shooter && target && dist(a, target) < (shooter.range || 200)) {
    a.dir = DIR_OF(target.x - a.x, target.y - a.y); a.frame = 0;
    if (a.cd <= 0) { a.cd = shooter.cd || 1.2; const ang = Math.atan2(target.y - 20 - (a.y - 20), target.x - a.x); projs.push({ type: shooter.proj || 'arrow', school: a.turret ? 'ice' : 'phys', x: a.x, y: a.y - 20, vx: Math.cos(ang) * 300, vy: Math.sin(ang) * 300, from: 'player', t: 0, life: 1, mult: shooter.dmg || a.dmgMul || .5, summon: true, hits: new Set(), ctx: { summon: true } }); if (!a.turret) { a.anim = 'shoot'; a.atk = .5; a.hitDone = true; } }
    return;
  }
  if (a.still) { a.frame = 0; return; }
  const goal = target || { x: player.x + 26, y: player.y + 10 }, d = dist(a, goal), reach = target ? a.reach * Math.max(1, target.scale * .8) : 30;
  if (d > reach) { const dx = goal.x - a.x, dy = goal.y - a.y, l = Math.max(1, d), sp = a.speed * (d > 160 ? 1.6 : 1); a.dir = DIR_OF(dx, dy); moveEnt(a, dx / l * sp * dt, dy / l * sp * dt, 7); a.walkT = (a.walkT || 0) + dt; a.frame = 1 + Math.floor(a.walkT * 8) % 8; if (d > 400 && !target) { a.x = player.x + 20; a.y = player.y + 10; } }
  else if (target && a.cd <= 0) { a.dir = DIR_OF(target.x - a.x, target.y - a.y); a.anim = 'slash'; a.atk = .5; a.hitDone = false; a.cd = 1.1; a.frame = 0; }
  else a.frame = 0;
}
function usePotion(kind) {
  if (!G || player.dead) return;
  if (!G.potions[kind]) { toast(kind === 'hp' ? 'Нет зелий здоровья' : 'Нет зелий маны'); return; }
  const ds = player.ds;
  if (kind === 'hp' && player.hp >= ds.maxHp) return; if (kind === 'mp' && player.mp >= ds.maxMp) return;
  G.potions[kind]--; const pm = (G.memory && (G.memory.dreams || []).includes('marfa')) ? 1.2 : 1; if (kind === 'hp') player.hp = Math.min(ds.maxHp, player.hp + (ds.maxHp * .5 + 2) * pm); else player.mp = Math.min(ds.maxMp, player.mp + (ds.maxMp * .6 + 10) * pm);
  fx.push({ type: 'sparkle', x: player.x, y: player.y - 20, t: 0, life: .6, color: POTIONS[kind].color }); sfx.potion(); updateHUD();
}
function applyDamage(e, dmg, dv, school, crit, ctx = {}) {
  if (e.hp <= 0) return 0;
  if (e.shielded) { if (!ctx.dot) fx.push({ type: 'num', x: e.x, y: e.y - 44 * e.scale, text: 'щит', small: true, t: 0, life: .6 }); return 0; }
  if (e.vuln > 0) dmg = Math.round(dmg * 1.5);
  e.hp -= dmg; e.hurtT = .18;
  if (e.state !== 'chase' && !(e.forget > 0)) { e.state = 'chase'; if (e.E.boss) bossIntro(e); }
  if (!e.E.boss && dv && !ctx.dot && !ctx.summon) { e.kx = (e.kx || 0) + (dv[0] || 0) * 70; e.ky = (e.ky || 0) + (dv[1] || 0) * 70; }
  fx.push({ type: 'num', x: e.x + (ctx.dot ? 8 : 0), y: e.y - 44 * e.scale, text: dmg, crit, school, small: !!ctx.dot, t: 0, life: .8 });
  if (e.hp <= 0) killEnemy(e);
  return dmg;
}
function damageEnemy(e, dmg, dv, school) { return applyDamage(e, Math.round(dmg), dv, school, false, {}); }
function killEnemy(e) {
  if (e.dead) return;
  e.hp = 0; e.dead = 0.001; e.anim = 'hurt'; e.frame = 0;
  if (lock === e) { lock = null; updateLockHud(); }
  const E = e.E; G.stats.kills++;
  if (UNDEAD.has(e.type) && VFX.ok) fx.push({ type: 'anim', key: 'ghost_wisp', x: e.x, y: e.y - 6, t: 0, life: vfxLife('ghost_wisp') });
  SK.onKill(e); onKillMemory(e); if (STORY) STORY.onKill(e.type); G.kills[e.type] = (G.kills[e.type] || 0) + 1;
  gainXp(E.xp);
  const [a, b] = E.gold; const gold = rint(a, b);
  for (let i = 0; i < Math.min(6, Math.ceil(gold / 4)); i++) drops.push({ type: 'gold', x: e.x + (rand() - .5) * 24, y: e.y + (rand() - .5) * 12, v: Math.ceil(gold / Math.min(6, Math.ceil(gold / 4))), t: 0 });
  if (rand() < (E.boss ? 1 : .12)) drops.push({ type: rand() < .6 ? 'hp' : 'mp', x: e.x + 10, y: e.y, t: 0 });
  if (E.boss) bossLoot(e);
  if (rand() < (E.boss ? 1 : ['shaman', 'necro', 'witch', 'cultist'].includes(e.type) ? .14 : .06)) dropItem(e.x - 8, e.y + 4, { ilvl: Math.max(1, Math.round(G.lvl * (e.area || 1))), rarity: E.boss && rand() < .5 ? 'unique' : undefined });
  for (const q of activeQuests()) if (q.type === 'kill' && q.target === e.type && !q.done) { q.progress = (q.progress || 0) + 1; if (q.progress >= q.count) { q.done = true; toast(`Задание выполнено: «${q.title}»`); } else toast(`${q.title}: ${q.progress} из ${q.count}`, 1200); }
  if (e.type === 'troll') { G.flags.troll = true; }
  if (e.type === 'minotaur' && world.tag === 'crypt2') G.flags.minotaur = true;
  if (e.dunBoss) { G.flags['boss:' + world.id] = true; upgrade(rand() < .5 ? 'weapon' : 'armor', 'Добыча хозяина подземелья'); }
  if (e.type === 'lich') { G.flags.lich = true; }
  updateHUD();
}
function bossLoot(e) {
  if (e.type === 'troll') { upgrade('armor', 'Тролль носил на себе трофейный доспех'); toast('Найден ключ от склепа'); }
  if (e.type === 'minotaur' && world.tag === 'crypt2') upgrade('weapon', 'В руке минотавра был отличный клинок');
}
function upgrade(slot, why) {
  if (slot === 'weapon' && G.equip.weapon < METALS.length - 1) { G.equip.weapon++; toast(`${why}: ${METALS[G.equip.weapon].name} ${WEAPON_NAME[CLS().weapon]}!`, 2600); refreshPlayer(); return true; }
  if (slot === 'armor' && G.equip.armor < 3) { G.equip.armor++; toast(`${why}: ${armorList(G.cls)[G.equip.armor].name}!`, 2600); refreshPlayer(); return true; }
  return false;
}
function gainXp(n) {
  G.xp += n;
  while (G.xp >= xpNeed(G.lvl)) {
    G.xp -= xpNeed(G.lvl); G.lvl++;
    refreshPlayer(); player.hp = player.ds.maxHp; player.mp = player.ds.maxMp;
    fx.push({ type: 'level', x: player.x, y: player.y, t: 0, life: 1.4 }); sfx.level();
    toast(`Новый уровень: ${G.lvl}! ${CLS().main} растёт, здоровье и мана восстановлены.`, 2600);
  }
  updateHUD();
}
function hurtPlayer(dmg, from, melee, proj) {
  if (player.dead) return false;
  if (player.inv > 0) { if (player.dodgeT > 0 && !player.dodgeMiss) { player.dodgeMiss = true; fx.push({ type: 'num', x: player.x, y: player.y - 46, text: 'мимо', small: true, t: 0, life: .6 }); } return false; }
  if (player.parry > 0 && from && (melee || proj)) { if (melee && from.heavy) parryBroken(); else { parried(from, melee); return false; } }
  // удар врага в шкале героя: здоровья мало, броня срезает понемногу
  dmg = Math.max(1, Math.round(dmg * HURT_MUL * (from && from.E && from.E.boss ? .65 : 1) - player.ds.def * .6 * HERO_HP)); // босс оставляет право на две ошибки
  dmg = SK.onPlayerHurt(dmg, from, melee);
  if (dmg <= 0) return;
  dmg = Math.max(1, Math.round(dmg));
  player.hp -= dmg; player.inv = .5; player.flash = .2; sfx.hurt();
  fx.push({ type: 'num', x: player.x, y: player.y - 46, text: dmg, hurt: true, t: 0, life: .8 });
  if (from && from.x !== undefined) { const a = Math.atan2(player.y - from.y, player.x - from.x), kr = 1 - (player.ds.mods.knockbackResist || 0); player.kx = Math.cos(a) * 140 * kr; player.ky = Math.sin(a) * 140 * kr; }
  if (player.hp <= 0) { player.hp = 0; if (SK.onLethal(dmg)) { player.hp = Math.max(1, player.hp); updateHUD(); return; } player.dead = .001; player.anim = 'hurt'; player.frame = 0; sfx.die(); G.stats.deaths++; setTimeout(onDeath, 1400); }
  updateHUD();
}
function selfDamage(n) { if (player.dead) return; player.hp = Math.max(1, player.hp - n); }
function onDeath() {
  const lost = Math.floor((G.echoes || 0) * .5);
  if (lost > 0 && world.infinite) { G.echoes -= lost; G.skein = { x: player.x, y: player.y, v: lost, day: MEM.dayOf(G) }; }
  // the freshest region memory does not survive
  const M = MEM.initMemory(G), fresh = M.cards.filter((c) => c.type === 'region' && MEM.dayOf(G) - c.gainedDay < 1).pop(); if (fresh) MEM.removeCard(G, fresh.id);
  const node = G.lastNode && G.nodes && G.nodes[G.lastNode];
  const line = G.stats.deaths > 3 ? 'Пряжа снова стягивает тебя из ничего. Ты уже знаешь это чувство: сначала руки, потом имя.' : 'Темнота. Потом — тёплая вода, как в тот раз, у брода. Пряжа перевязывает тебя заново.';
  modal(`<h2>Нить порвалась</h2><p class="line">${line}</p><p class="aside">${lost ? `Половина Отголосков (${lost}) осталась клубком там, где ты упал. Подбери его до следующей ночи. ` : ''}${fresh ? `Ты не помнишь, как попал в «${GEN.esc(fresh.title)}»: это не успело запомниться.` : ''}</p><div class="row"><button class="btn primary" data-close>Очнуться</button></div>`, () => {
    player.dead = 0; player.anim = 'walk'; player.hp = Math.round(player.ds.maxHp * .6); player.mp = Math.round(player.ds.maxMp * .6);
    if (G.rest) { enterZone(G.rest.zone, null, [G.rest.x, G.rest.y]); restoreAtFire(); } // очнулся у последнего костра
    else if (node && node.zone === 'world') enterZone('world', null, [node.x, node.y]); else enterZone('world', 'start');
    if (G.skein && world.infinite) drops.push({ type: 'skein', x: G.skein.x, y: G.skein.y, v: G.skein.v, t: 0 });
  });
}

// =====================================================================================
// Interaction: NPCs, doors, chests, stairs, signs
// =====================================================================================
function nearestInteract() {
  let best = null, bd = 1e9;
  const consider = (o, d, kind, r) => { if (d < r && d < bd) { bd = d; best = { o, kind }; } };
  for (const e of ents) if (e.kind === 'npc') consider(e, dist(e, player), 'npc', 38);
  if (STORY) { const m = STORY.markerNear(player.x, player.y); if (m) consider(m, Math.hypot(m.x - player.x, m.y - player.y) - 6, 'marker', 40); }
  for (const p of propsNear(player.x, player.y, 70)) {
    if (p.type === 'altar' || p.type === 'menhir' || p.type === 'well') consider(p, Math.hypot(p.x - player.x, p.y - player.y), p.type === 'altar' ? 'altar' : 'node', 40);
    if (p.type === 'house' && p.role) consider(p, p.sprite ? Math.hypot(p.x - player.x, p.y + 12 - player.y) : Math.hypot(p.x - p.w / 2 + (p.door ?? p.w / 2) - player.x, p.y + 8 - player.y), 'door', 34);
    if (p.type === 'chest' && !p.open) consider(p, Math.hypot(p.x - player.x, p.y + 6 - player.y), 'chest', 34);
    if ((p.type === 'stairs_down' || p.type === 'stairs_up') && p.to) consider(p, Math.hypot(p.x - player.x, p.y - player.y), 'stairs', 30);
    if (p.type === 'sign') consider(p, Math.hypot(p.x - player.x, p.y + 10 - player.y), 'sign', 30);
    if (p.type === 'campfire' && p.rest) consider(p, Math.hypot(p.x - player.x, p.y + 14 - player.y), 'fire', 46);
  }
  if (best && best.kind === 'fire') tipLater('fire', 'Костёр', 'У костра можно отдохнуть: вернутся здоровье и мана, зелья пополнятся, игра сохранится. Если нить порвётся — очнёшься у последнего костра. Но и враги вокруг вернутся.');
  return best;
}
function interact() {
  if (!player || player.dead || modalOpen()) return;
  audio.unlock();
  const n = nearestInteract(); if (!n) return;
  sfx.ui();
  if (n.kind === 'npc') talk(n.o);
  else if (n.kind === 'door') openBuilding(n.o.role, n.o);
  else if (n.kind === 'altar') useAltar(n.o);
  else if (n.kind === 'node') useNode(n.o);
  else if (n.kind === 'marker') STORY.useMarker(n.o);
  else if (n.kind === 'chest') openChest(n.o);
  else if (n.kind === 'stairs') useStairs(n.o);
  else if (n.kind === 'sign') toast(n.o.text, 2600);
  else if (n.kind === 'fire') restAt(n.o);
}
function useStairs(p) {
  if (p.dun && p.dun.tags && p.dun.tags[0] === 'crypt1' && STORY && !(STORY.isActive('m5') || STORY.isDone('m5') || G.flags.troll)) { toast('Склеп запечатан изнутри. Печать держится на чьём-то упрямстве. Сейчас не открыть.', 3000); return; }
  if (world.tag === 'crypt2' && p.type === 'stairs_down' && STORY && !(STORY.isActive('m10') || STORY.isDone('m10') || STORY.isActive('m6') || STORY.isDone('m6'))) { toast('Проход вниз закрыт нитями. Тебя туда ещё не звали.', 2600); return; }
  if (p.dun) { G.duns = G.duns || {}; G.duns[p.dun.base] = p.dun; }
  if (p.to === 'world') enterZone('world', null, p.pos || (G.duns && G.duns[world.id.split(':').slice(0, -1).join(':')]?.exit));
  else enterZone(p.to, p.at || 'up');
}
function useNode(p) {
  G.nodes = G.nodes || {}; const key = p.key || (Math.round(p.x) + ',' + Math.round(p.y));
  if (!G.nodes[key]) { G.nodes[key] = { x: p.x, y: p.y + 24, zone: world.id }; toast('Узел запомнил тебя: здесь Пряжа перевяжет тебя после смерти', 2600); sfx.memory(); }
  G.lastNode = key; save();
  atNode = p; openMenu('skein');
}
function useAltar(p) {
  useNode(p); return;
  G.shrines = G.shrines || {}; const last = G.shrines[p.key] || 0, wait = 150 - (G.playTime - last);
  if (last && wait > 0) { toast(`Камни молчат. Святилище оживёт через ${Math.ceil(wait)} с.`, 2000); return; }
  G.shrines[p.key] = G.playTime || 1; player.hp = player.ds.maxHp; player.mp = player.ds.maxMp; player.buff = 30;
  fx.push({ type: 'pillar', x: p.x, y: p.y, t: 0, life: .9 }); fx.push({ type: 'sparkle', x: player.x, y: player.y - 20, t: 0, life: .9, color: '#fff2a8' });
  sfx.level(); toast('Святилище исцеляет и благословляет: удары сильнее 30 секунд', 2400); save(); updateHUD();
}
function openChest(p) {
  p.open = true; G.stats.chests++; sfx.chest(); if (p.key) { G.opened = G.opened || {}; G.opened[p.key] = 1; }
  const zone = world.id, lines = [], area = world.infinite ? 1 + Math.hypot(p.x / T - 32, p.y / T - 32) / CS * .05 : (world.level || 1) + .3;
  const gold = Math.round(rint(10, 25) * area * (world.infinite ? 1 : 2)); G.gold += gold; lines.push(`${gold} золотых`);
  if (rand() < .5) { const k = rand() < .6 ? 'hp' : 'mp'; G.potions[k]++; lines.push(POTIONS[k].name.toLowerCase()); }
  // relic for an active fetch quest
  for (const v of G.villagers) { const q = v.quest; if (q && q.accepted && !q.done && q.type === 'fetch' && (q.zone === 'forest' ? world.infinite : !world.infinite) && !q.found) { q.found = true; q.done = true; lines.push(`«${q.relic}» — то, что просил${villagerCache[v.seed]?.female ? 'а' : ''} ${villagerCache[v.seed]?.name.first}`); break; } }
  const cap = Math.min(4, 1 + Math.floor((area - 1) * 8) + (world.infinite ? 1 : 2));
  if (rand() < .35 && G.equip.weapon < cap) { G.equip.weapon++; lines.push(`${METALS[G.equip.weapon].name.toLowerCase()} ${WEAPON_NAME[CLS().weapon]}`); refreshPlayer(); }
  else if (rand() < .25 && G.equip.armor < Math.min(3, cap - 1)) { G.equip.armor++; lines.push(armorList(G.cls)[G.equip.armor].name.toLowerCase()); refreshPlayer(); }
  if (rand() < .45) { dropItem(p.x, p.y + 14, { ilvl: Math.max(1, Math.round(G.lvl * area)) }); lines.push('что-то из вещей'); }
  toast('Сундук: ' + lines.join(', '), 3000);
  fx.push({ type: 'sparkle', x: p.x, y: p.y - 16, t: 0, life: .8, color: '#ffd25a' });
  updateHUD(); save();
}

// ---------- dialogue built from the villager's dossier ----------
function greeting(c, d) {
  const b = c.big5, F = c.female;
  if (b.E >= 55 && b.A >= 50) return rpick(['О, новое лицо! Нечасто к нам заходят путники.', 'Здравствуй, здравствуй! Хорошо, что ты здесь — с тобой спокойнее.', 'Привет! Слышал' + (F ? 'а' : '') + ', ты не боишься леса. Правда?']);
  if (b.E >= 55) return rpick(['Чего уставился? А, ты тот самый новенький.', 'Опять кто-то хочет в герои. Ну-ну.', 'Говори быстрее, у меня дела.']);
  if (b.A >= 50) return rpick(['…Добрый день.', 'Ох. Здравствуй. Прости, задумал' + (F ? 'ась' : 'ся') + '.', 'Рад' + (F ? 'а' : '') + ' видеть живого человека. В последнее время по ночам слишком тихо.']);
  return rpick(['Хм.', 'Чего надо?', 'Иди своей дорогой.']);
}
const RUMORS = [
  'Говорят, по ночам у брода стоит кто-то мокрый и смотрит на сети. Федот теперь сети не ставит.',
  'С кладбища тянет холодом. Огоньки на могилах синие — значит, им тесно.',
  'Тролль у Камня носит ключ на шее. Двести лет носит, а всё не отдаст.',
  'Башня опять скупает память. Тур ходил, вернулся с деньгами и без лица.',
  'Скелеты-лучники стреляют туда, куда стреляли в свой последний день. Отойди с той линии.',
  'Некроманты тихие, пока не начнут колдовать. Бей их первыми.',
  'Морвен был наш, бродовский. Провожатый. Читал имена у воды, а потом ушёл под землю. Больше ничего не скажу.',
  'В «Последней кружке» можно отдохнуть. Утром дорога кажется короче.',
];
function talk(e) {
  if (e.storyId) {
    e.state = 'talk'; e.dir = DIR_OF(player.x - e.x, player.y - e.y);
    if (STORY.onTalk(e.storyId)) return;
    const hub = hubFor(e.storyId); if (hub) { NARR.run(hub, { npc: e.storyId }); return; }
    if (MERCHANT_OF[e.storyId]) { openTrade(MERCHANT_OF[e.storyId]); return; }
    if (e.v.role) { openBuilding(e.v.role, null, e.storyId); return; }
    const n = STORY.npcById[e.storyId];
    storyDialog({ npc: e.storyId, lines: [{ who: e.storyId, line: STORY.greeting(e.storyId) }], body: (G.memory.heroKnows || {})[e.storyId] >= 1 ? `<p class="aside">${GEN.esc(n.bio)}</p>` : '', options: [{ text: 'Пока', go: closeModal }] });
    return;
  }
  const v = e.v, c = e.c, d = GEN.derive(c), F = c.female, name = GEN.fullName(c.name, c.race);
  e.state = 'talk'; e.dir = DIR_OF(player.x - e.x, player.y - e.y);
  if (v.role) { openBuilding(v.role, e.keeperOf); return; }
  const job = GEN.G(GEN.JOBS.fantasy[c.job].n, F);
  const first = !v.met; v.met = true;
  const page = (body, buttons) => modal(`<div class="talk"><div class="who"><canvas id="talkFace" width="64" height="64"></canvas><div><b>${GEN.esc(name)}</b><small>${GEN.esc(GEN.RACES[c.race].n[F ? 1 : 0])}, ${GEN.esc(job)}</small></div></div>${body}<div class="row">${buttons}</div></div>`, null, () => drawFace($('talkFace'), e.look));
  const q = v.quest;
  const main = () => {
    let body = `<p class="line">«${GEN.esc(first ? greeting(c, d) : rpick([c.voice.catch, 'А, это снова ты.', greeting(c, d)]))}»</p>`;
    if (first) body += `<p class="aside">${GEN.esc(c.name.first)} ${GEN.esc(GEN.low(GEN.G(c.habits.quirks[0], F)))}.</p>`;
    let btn = `<button class="btn" data-a="about">Расскажи о себе</button><button class="btn" data-a="rumor">Какие новости?</button>`;
    if (q && !q.accepted && !v.guest) btn += `<button class="btn gold" data-a="quest">Нужна помощь?</button>`;
    if (q && q.accepted && !q.rewarded) btn += `<button class="btn gold" data-a="turn">Насчёт поручения…</button>`;
    btn += `<button class="btn ghost" data-close>Пока</button>`;
    page(body, btn);
  };
  const about = () => {
    page(`<p class="line">«Я ${GEN.esc(c.name.first)}, ${GEN.esc(job)}. Родом ${GEN.esc(c.place[1])}. ${GEN.esc(c.voice.catch)}»</p>
      <dl class="mini"><dt>Характер</dt><dd>${GEN.esc(GEN.cap(d.traits.slice(0, 3).join(', ')))}</dd><dt>Любит</dt><dd>${GEN.esc(c.habits.likes.join(', '))}</dd><dt>Не выносит</dt><dd>${GEN.esc(c.habits.dislikes.join(', '))}</dd><dt>Мечтает</dt><dd>${GEN.esc(GEN.low(GEN.G(c.drive.goal, F)))}</dd></dl>`,
      `<button class="btn" data-a="back">Назад</button><button class="btn ghost" data-close>Пока</button>`);
  };
  const rumor = () => page(`<p class="line">«${GEN.esc(villageRumor(c.seed))}»</p>`, `<button class="btn" data-a="back">Назад</button><button class="btn ghost" data-close>Пока</button>`);
  const quest = () => {
    const zone = { forest: 'округе', crypt1: 'склепах', crypt2: 'склепах' }[q.zone];
    const text = q.type === 'kill'
      ? `Время неспокойное: в ${zone} развелось ${q.plural}. Убей ${q.count} — и я заплачу ${q.reward.gold} золотых.`
      : `Я потерял${F ? 'а' : ''} ${q.relic}. Это всё, что осталось от семьи. Кажется, вещь утащили куда-то ${q.zone === 'forest' ? 'в глушь — в лагерь, руины или башню' : 'в подземелье'}; она должна быть в каком-нибудь сундуке. Награда — ${q.reward.gold} золотых.`;
    page(`<p class="line">«${GEN.esc(text)}»</p>`, `<button class="btn gold" data-a="accept">Берусь</button><button class="btn" data-a="back">Не сейчас</button>`);
  };
  const turn = () => {
    if (!q.done) { page(`<p class="line">«${q.type === 'kill' ? `Пока только ${q.progress || 0} из ${q.count}. Возвращайся, когда закончишь.` : 'Ну что, нашёл? Нет? Ищи в сундуках.'}»</p>`, `<button class="btn" data-a="back">Назад</button><button class="btn ghost" data-close>Пока</button>`); return; }
    q.rewarded = true; G.gold += q.reward.gold; gainXp(q.reward.xp); sfx.coin(); save();
    page(`<p class="line">«Спасибо. Правда спасибо. Держи, ${q.reward.gold} золотых, как обещал${F ? 'а' : ''}.»</p><p class="line">«И знаешь… раз уж ты здесь. ${GEN.esc(GEN.cap(GEN.low(GEN.G(c.drive.secret, F))))}. Я никому не говорил${F ? 'а' : ''}. Пусть это останется между нами.»</p>`, `<button class="btn ghost" data-close>Сохраню тайну</button>`);
    updateHUD();
  };
  modalHandlers = { about, rumor, back: main, quest, accept: () => { q.accepted = true; q.title = q.type === 'kill' ? `${GEN.cap(q.plural)} (${c.name.first})` : `${GEN.cap(q.relic)} (${c.name.first})`; q.progress = 0; toast('Новое поручение в журнале'); save(); updateHUD(); main(); }, turn };
  main();
}
function drawFace(cv, look) {
  if (!cv || !look) return; const x = cv.getContext('2d'); x.imageSmoothingEnabled = false; x.clearRect(0, 0, 64, 64);
  const sh = look.sheet('walk'), S = sh.size; x.drawImage(sh.canvas, 0, 2 * S + (S - 64) / 2 + 8, S, S, -((S - 64) / 2) - 16, -4, S * 1.5, S * 1.5);
}

// ---------- buildings ----------
function keeper(role, house) {
  if (house && house.keeper) { const v = { seed: house.keeper, role }; const c = villagerCache[v.seed] || (villagerCache[v.seed] = villagerChar(v)); return { v, c, name: c.name.first, F: c.female }; }
  const v = G.villagers.find((x) => x.role === role); const c = villagerCache[v.seed] || (villagerCache[v.seed] = villagerChar(v)); return { v, c, name: c.name.first, F: c.female }; }
function openBuilding(role, house, storyId) {
  if (storyId && MERCHANT_OF[storyId] && WS.data().merchants[MERCHANT_OF[storyId]]) return openTrade(MERCHANT_OF[storyId]);
  if (role === 'elder') { const e = ents.find((x) => x.storyId === 'ivar'); if (e) { if (!STORY.onTalk('ivar')) storyDialog({ npc: 'ivar', lines: [{ who: 'ivar', line: STORY.greeting('ivar') }], options: [{ text: 'Пока', go: closeModal }] }); } return; }
  const k0 = storyId ? { name: STORY.npcName(storyId).split(' ')[0], c: { voice: { catch: STORY.npcById[storyId].greeting } }, F: STORY.npcById[storyId].look.body === 'female' } : null;
  const k = k0 || keeper(role, house || ents.find((e) => e.kind === 'npc' && e.v.role === role && e.keeperOf && dist(e, player) < 200)?.keeperOf), price = (p) => Math.round(p * player.ds.price);
  if (role === 'inn') {
    modalHandlers = { rest: () => { const cost = price(10); if (G.gold < cost) { toast('Не хватает золота'); return; } G.gold -= cost; player.hp = player.ds.maxHp; player.mp = player.ds.maxMp; save(); sfx.potion(); toast('Вы выспались. Игра сохранена.'); closeModal(); updateHUD(); } };
    modal(`<h2>Таверна${house && house.keeper ? '' : ' «Последняя кружка»'}</h2><p class="line">${GEN.esc(k.name)} протирает кружку: «${GEN.esc(k.c.voice.catch)} Комната — ${price(10)} золотых, утром будешь как новенький.»</p><p class="aside">Отдых восстанавливает здоровье и ману и сохраняет игру.</p><div class="row"><button class="btn primary" data-a="rest">Снять комнату (${price(10)} зол.)</button><button class="btn ghost" data-close>Уйти</button></div>`);
  }
  if (role === 'shop') {
    const items = [['hp', POTIONS.hp.name, price(POTIONS.hp.price)], ['mp', POTIONS.mp.name, price(POTIONS.mp.price)]];
    const hats = HELMS.map((h, i) => [i, h]).filter(([i, h]) => h.id && ['hood', 'cavalier', 'wizard'].includes(h.id));
    const render = () => modal(`<h2>Лавка</h2><p class="line">${GEN.esc(k.name)}: «Зелья свежие, шляпы модные. Платить вперёд.»</p><div class="shop">${items.map(([id, n, p]) => `<div class="it"><span>${n}<small>у вас: ${G.potions[id]}</small></span><button class="btn" data-a="buy_${id}">${p} зол.</button></div>`).join('')}${hats.map(([i, h]) => `<div class="it"><span>${h.name}<small>защита +${h.def}${h.cha ? ', харизма +' + h.cha : ''}${h.int ? ', интеллект +' + h.int : ''}</small></span>${G.equip.helm === i ? '<em>надето</em>' : `<button class="btn" data-a="hat_${i}">${price(60)} зол.</button>`}</div>`).join('')}</div><p class="aside">Золото: ${G.gold}</p><div class="row"><button class="btn ghost" data-close>Уйти</button></div>`);
    modalHandlers = {};
    for (const [id, , p] of items) modalHandlers['buy_' + id] = () => { if (G.gold < p) return toast('Не хватает золота'); G.gold -= p; G.potions[id]++; sfx.coin(); updateHUD(); render(); };
    for (const [i] of hats) modalHandlers['hat_' + i] = () => { const p = price(60); if (G.gold < p) return toast('Не хватает золота'); G.gold -= p; G.equip.helm = i; refreshPlayer(); sfx.coin(); render(); };
    render();
  }
  if (role === 'smith') {
    const wCost = [0, 60, 150, 320, 600], aCost = [0, 90, 220, 450];
    const render = () => {
      const w = G.equip.weapon, a = G.equip.armor, wn = WEAPON_NAME[CLS().weapon];
      modal(`<h2>Кузница</h2><p class="line">${GEN.esc(k.name)} не отрывается от наковальни: «${GEN.esc(k.c.voice.catch)}»</p><div class="shop">
        <div class="it"><span>Оружие: ${METALS[w].name.toLowerCase()} ${wn}<small>${w < 4 ? `дальше: ${METALS[w + 1].name.toLowerCase()} ${wn}, урон +${METALS[w + 1].power - METALS[w].power}` : 'лучше не бывает'}</small></span>${w < 4 ? `<button class="btn" data-a="w">${price(wCost[w + 1])} зол.</button>` : ''}</div>
        <div class="it"><span>Доспех: ${armorList(G.cls)[a].name.toLowerCase()}<small>${a < 3 ? `дальше: ${armorList(G.cls)[a + 1].name.toLowerCase()}, защита +${armorList(G.cls)[a + 1].def - armorList(G.cls)[a].def}` : 'лучше не бывает'}</small></span>${a < 3 ? `<button class="btn" data-a="a">${price(aCost[a + 1])} зол.</button>` : ''}</div>
        ${[3, 5].map((i) => `<div class="it"><span>${HELMS[i].name}<small>защита +${HELMS[i].def}</small></span>${G.equip.helm === i ? '<em>надето</em>' : `<button class="btn" data-a="h${i}">${price(i === 3 ? 90 : 160)} зол.</button>`}</div>`).join('')}
      </div><p class="aside">Золото: ${G.gold}</p><div class="row"><button class="btn ghost" data-close>Уйти</button></div>`);
    };
    modalHandlers = {
      w: () => { const p = price(wCost[G.equip.weapon + 1]); if (G.gold < p) return toast('Не хватает золота'); G.gold -= p; G.equip.weapon++; refreshPlayer(); sfx.chest(); render(); },
      a: () => { const p = price(aCost[G.equip.armor + 1]); if (G.gold < p) return toast('Не хватает золота'); G.gold -= p; G.equip.armor++; refreshPlayer(); sfx.chest(); render(); },
      h3: () => { const p = price(90); if (G.gold < p) return toast('Не хватает золота'); G.gold -= p; G.equip.helm = 3; refreshPlayer(); render(); },
      h5: () => { const p = price(160); if (G.gold < p) return toast('Не хватает золота'); G.gold -= p; G.equip.helm = 5; refreshPlayer(); render(); },
    };
    render();
  }
  if (role === 'elder') elderTalk(k);
}
function activeQuests() { return G.quests.concat(G.villagers.filter((v) => v.quest && v.quest.accepted && !v.quest.rewarded).map((v) => v.quest)); }
function elderTalk(k) {
  const cur = G.quests.find((q) => !q.rewarded);
  const nextIdx = G.quests.length;
  modalHandlers = {
    take: () => { const q = { ...MAIN_QUESTS[nextIdx], progress: 0 }; G.quests.push(q); if (q.target === 'troll' && G.flags.troll) { q.progress = 1; q.done = true; } save(); updateHUD(); toast('Новое задание: ' + q.title); closeModal(); },
    reward: () => { cur.rewarded = true; G.gold += cur.reward.gold; gainXp(cur.reward.xp); G.done[cur.id] = true; sfx.coin(); save(); updateHUD(); elderTalk(k); },
  };
  let body, btn = '';
  if (cur && cur.done) { body = `«Ты справил${G.char.female ? 'ась' : 'ся'}! Вот, как обещал${k.F ? 'а' : ''}: ${cur.reward.gold} золотых.»`; btn = `<button class="btn gold" data-a="reward">Получить награду</button>`; }
  else if (cur) body = `«${cur.text}»<br><small>Сейчас: ${cur.type === 'kill' ? `${cur.progress || 0} из ${cur.count}` : 'в пути'}</small>`;
  else if (nextIdx < MAIN_QUESTS.length) { const q = MAIN_QUESTS[nextIdx]; body = `«${nextIdx === 0 ? `Ты ${G.char.name.first}? Мне говорили о тебе. Деревне нужна помощь, и платить нам есть чем.` : 'Есть ещё одно дело.'} ${q.text}»`; btn = `<button class="btn gold" data-a="take">Взяться: «${q.title}»</button>`; }
  else body = '«Мёртвые снова спят. Деревня в долгу перед тобой — оставайся сколько захочешь.»';
  modal(`<div class="talk"><div class="who"><canvas id="talkFace" width="64" height="64"></canvas><div><b>${GEN.esc(GEN.fullName(k.c.name, k.c.race))}</b><small>староста Ольхового Брода</small></div></div><p class="line">${body}</p><div class="row">${btn}<button class="btn ghost" data-close>Уйти</button></div></div>`, null, () => { const npc = ents.find((e) => e.v === k.v); drawFace($('talkFace'), npc ? npc.look : new Look(npcSpec(k.c))); });
}


// =====================================================================================
// Skills, memory and gear glue
// =====================================================================================
const isNight = () => world && world.infinite && world.dark > .3;
SK.bindSkills({
  G: () => G, ents: () => ents, now: () => now, allies: () => ents.filter((e) => e.kind === 'ally' && e.hp > 0 && !e.dead),
  applyDamage, fx: (f) => fx.push(f), anim: (key, x, y, o = {}) => { if (VFX.ok && VFX.meta[key]) fx.push({ type: 'anim', key, x, y, t: 0, life: vfxLife(key) / (o.speed || 1), ...o }); }, proj: (p) => projs.push(p), sfx: (k) => (sfx[k] || sfx.cast)(), toast: (m, t) => toast(m, t),
  areaPoint, aimAngle, target: (r) => { const l = validLock(); if (l && dist(l, player) < r + 60) return l; return nearestEnemy(r); }, lockTarget: () => validLock(),
  blocked, moveEnt, addAlly, convertToAlly, kill: (e) => killEnemy(e), freeSpotObj: (p, a, b) => { const q = freeSpot([p.x, p.y], a, b); return q ? { x: q[0], y: q[1] } : { x: p.x, y: p.y + 20 }; },
  isUndead: (e) => UNDEAD.has(e.type), selfDamage,
  dropEcho: (x, y, n) => { for (let i = 0; i < n; i++) drops.push({ type: 'echo', x: x + (rand() - .5) * 20, y: y + (rand() - .5) * 10, v: 1, t: 0 }); },
  echoes: () => G.echoes || 0, spendEcho: (n) => { if ((G.echoes || 0) < n) return false; G.echoes -= n; updateHUD(); return true; },
  gold: (x, y, n) => drops.push({ type: 'gold', x, y, v: n, t: 0 }),
  extraMods: () => { const out = [...dreamMods((G.memory || {}).dreams, { nearWater: nearWaterNow() }), ...MEM.giftMods(G), ...MEM.clarityState(clarityNow()).mods, ...MEM.imprintMods(G, isNight()), ...gearMods(), ...charmMods()]; return out; },
  extraHooks: () => [...MEM.imprintHooks(G), ...gearHooks()],
});
let clarityCache = { t: -1, v: 0 };
function clarityNow() { if (clarityCache.t !== Math.floor(now * 2)) clarityCache = { t: Math.floor(now * 2), v: MEM.clarity(G, SK.node) }; return clarityCache.v; }
function heroName() { const M = G.memory; if (M && M.nameLost) return 'никто'; if (M && M.name) return M.name; return G.char.name.first; }
function memoryHud() {
  const v = clarityNow(), st = MEM.clarityState(v);
  $('clarity').innerHTML = `<span>${st.name}</span><s style="opacity:${Math.min(1, .25 + v / 50)}"></s><span>${v}</span>`;
}
function onKillMemory(e) {
  const night = isNight(), n = MEM.echoesFor(e, night) * (1 + (player.ds.mods['echoFind%'] || 0));
  const whole = Math.floor(n) + (rand() < n % 1 ? 1 : 0);
  for (let i = 0; i < Math.min(whole, 8); i++) drops.push({ type: 'echo', x: e.x + (rand() - .5) * 24, y: e.y + (rand() - .5) * 12, v: whole > 8 ? whole / 8 : 1, t: 0 });
  if (rand() < MEM.imprintChance(e, G.cls, player.ds.mods['imprint%'] || 0) && MEM.IMPRINTS[e.type]) drops.push({ type: 'imprint', enemy: e.type, x: e.x, y: e.y - 4, t: 0 });
}
function pickImprint(type) {
  const r = MEM.offerImprint(G, type), I = MEM.IMPRINTS[type];
  if (r.full) { toast(`Отпечаток «${I.name}» не помещается: все ячейки закреплены`, 2200); return; }
  toast(r.refreshed ? `Отпечаток «${I.name}» освежён` : `Отпечаток «${I.name}»: ${I.desc}. Выцветет через 3 дня, если не закрепить`, 3200);
  sfx.memory(); refreshPlayer();
}
function gainEchoes(n) { G.echoes = (G.echoes || 0) + n; updateHUD(); }
// gear
function gearStats(h) { let armor = 0; for (const it of Object.values(h.gear || {})) if (it) armor += it.armor || 0; return { armor }; }
function gearMods() { const out = []; for (const it of Object.values(G.gear || {})) if (it && it.mods) out.push(...it.mods); const w = IT.gearWeight(G); if (w && w !== CLS().weight) { const W = IT.WEIGHTS[w]; out.push({ stat: 'speed%', value: (W.speed || 0) * .5 }, { stat: 'dodge', value: (W.dodge || 0) * .5 }); } return out.concat(IT.setBonus(G).mods); }
function gearHooks() { const out = []; for (const it of Object.values(G.gear || {})) if (it && it.hooks) for (const h of it.hooks) out.push({ ...h, src: 'item:' + it.uid, rank: 1 }); return out.concat(IT.setBonus(G).hooks); }
function setCount(cls) { const n = IT.setCounts(G); return Math.max(0, ...Object.entries(n).filter(([id]) => IT.SET[id] && IT.SET[id].class === cls).map(([, k]) => k)); }
function pickItem(it) {
  G.bag = G.bag || []; if (G.bag.length >= 30) { toast('Сумка полна. Лишнее можно продать в лавке.'); return false; }
  G.bag.push(it); sfx.equip();
  toast(`${it.rarity === 'unique' ? '★ ' : it.rarity === 'set' ? '◆ ' : ''}${it.name}`, it.rarity === 'unique' ? 3000 : 1600);
  return true;
}
function dropItem(x, y, opts) { const it = IT.rollItem(G, opts); if (it) drops.push({ type: 'item', item: it, x, y, t: 0 }); }
let itemSel = null;
function itemLines(it) {
  const L = [`${IT.rarityRu[it.rarity]}${it.weight ? ', ' + IT.WEIGHTS[it.weight].name.toLowerCase() : ''}${it.armor ? `, броня ${it.armor}` : ''}`];
  for (const m of it.mods) L.push(fmtMod(m));
  for (const a of it.affixes || []) { const A = AFFIXES.find((x) => x.id === a.id); if (A && A.hook) L.push(A.desc || 'особое свойство'); }
  if (it.desc) L.push(it.desc); if (it.lore) L.push('«' + it.lore + '»');
  if (it.set) { const S = IT.SET[it.set], k = IT.setCounts(G)[it.set] || 0; L.push(`Набор «${S.name}» (${k}/4): 2 — ${S.bonus2.desc || (S.bonus2.mods || []).map(fmtMod).join(', ')}; 4 — ${S.bonus4.desc || ''}`); }
  return L;
}
function gearHtml() {
  const sel = itemSel && (G.bag.find((i) => i.uid === itemSel) || Object.values(G.gear).find((i) => i && i.uid === itemSel));
  const w = IT.gearWeight(G), sb = IT.setBonus(G).active;
  let h = `<p class="aside">Тяжесть брони: ${w ? IT.WEIGHTS[w].name.toLowerCase() + ' — ' + IT.WEIGHTS[w].desc : 'не надета'}${sb.length ? ' · наборы: ' + sb.join(', ') : ''}</p>`;
  h += '<div class="shop">' + IT.SLOTS.map((sl) => { const it = G.gear[sl]; return `<div class="it" ${it ? `data-item="${it.uid}" style="cursor:pointer"` : ''}><span><small>${IT.SLOT_RU[sl]}</small>${it ? `<b class="r-${it.rarity}">${GEN.esc(it.name)}</b>` : '—'}</span>${it && itemSel === it.uid ? '◆' : ''}</div>`; }).join('') + '</div>';
  h += `<p class="aside">Сумка (${G.bag.length}/30):</p><div class="shop">` + (G.bag.length ? G.bag.map((it) => `<div class="it" data-item="${it.uid}" style="cursor:pointer"><span><b class="r-${it.rarity}">${GEN.esc(it.name)}</b><small>${IT.SLOT_RU[it.slot === 'ring' ? 'ring1' : it.slot]}</small></span>${itemSel === it.uid ? '◆' : ''}</div>`).join('') : '<p class="aside">Пусто. Вещи падают с врагов и лежат в сундуках.</p>') + '</div>';
  if (sel) {
    const worn = Object.values(G.gear).includes(sel), err = IT.canWear(G, sel);
    h += `<div class="nodeinfo"><b class="r-${sel.rarity}">${GEN.esc(sel.name)}</b><p>${itemLines(sel).map(GEN.esc).join('<br>')}</p><div class="row">${worn ? '<button class="btn" data-a="unequip">Снять</button>' : `<button class="btn gold" data-a="equip" ${err ? 'disabled' : ''}>${err ? GEN.esc(err) : 'Надеть'}</button><button class="btn ghost" data-a="drop">Выбросить</button>`}</div></div>`;
  }
  return h;
}
Object.assign(menuHandlers, {
  equip: () => { const it = G.bag.find((i) => i.uid === itemSel); if (!it || IT.canWear(G, it)) return; if (it.memoryCost && !(G.memory.paidItems || {})[it.uid]) { G.memory.pendingItem = it.uid; toast('Эта вещь просит воспоминание. Отдайте любое в «Клубке» — вещь примет его и наденется.', 3400); openMenu('skein'); return; } const sl = IT.slotFor(G, it), old = G.gear[sl]; G.bag = G.bag.filter((i) => i !== it); if (old) G.bag.push(old); G.gear[sl] = it; refreshPlayer(); sfx.equip(); save(); openMenu('gear'); },
  unequip: () => { for (const [sl, it] of Object.entries(G.gear)) if (it && it.uid === itemSel) { G.gear[sl] = null; G.bag.push(it); } refreshPlayer(); save(); openMenu('gear'); },
  drop: () => { G.bag = G.bag.filter((i) => i.uid !== itemSel); itemSel = null; save(); openMenu('gear'); },
});
// Узлы: places where memory can be given away
function isNode(p) { return p && (p.type === 'altar' || p.type === 'menhir' || p.type === 'well'); }


// =====================================================================================
// Story glue
// =====================================================================================
let STORY_DATA = null, INK_JSON = null, INK_INDEX = null, NARR = null;
const regionCenter = (key) => { const [rx, ry] = key.split(',').map(Number); return [(rx * RT + 32) * T + 16, (ry * RT + 32) * T + 16]; };
function startStruct() { return maps.world && maps.world.structure(0, 0); }
function locPos(where) {
  if (!where || where === 'any' || where.startsWith('wild:')) return null;
  if (where === 'ford') { const w = getMap('world'); return w.spots.start; }
  if (PLACES[where]) return PLACES[where];
  const SP = STORY_DATA && STORY_DATA.places && STORY_DATA.places[where];
  if (SP) { const base = SP.at === 'ford' ? getMap('world').spots.start : locPos(SP.at); return base ? [base[0] + (SP.dx || 0) * T, base[1] + (SP.dy || 0) * T] : null; }
  if (where === 'village_well') { const st = startStruct(); const wl = st && st.props.find((p) => p.type === 'well'); return wl ? [wl.x, wl.y + 30] : null; }
  if (where === 'tavern') { const st = startStruct(); const h = st && st.props.find((p) => p.role === 'inn'); return h ? [h.x + 40, h.y + 30] : null; }
  if (where === 'tavern_cellar') { const st = startStruct(); const h = st && st.props.find((p) => p.role === 'inn'); return h ? [h.x, h.y + 20] : null; }
  const t = { crypt1: 'oldgrave', crypt2: 'oldgrave', crypt3: 'oldgrave', mine1: 'mine', mine2: 'mine', old_forge: 'mine', herd: 'hamlet_dry', lake: null }[where];
  const loc = t !== undefined ? t : where; if (!loc) return null;
  if (!world.infinite && world.tag === where) return world.spots.boss || world.spots.up;
  const key = LOC_REGION[loc]; return key ? regionCenter(key) : null;
}
function storyLook(n) {
  const L0 = n.look || {}, body = L0.body || 'male', F = body === 'female', skin = L0.skin || '#d8b39a';
  const layers = [[L0.base || 'body', { body: skin, cloth: skin }]];
  const head = L0.head ? 'head_' + L0.head.replace(/^head_/, '') : null;
  if (head && head !== 'head_human') layers.push([head === 'head_orc' ? (F ? 'head_orc_f' : 'head_orc_m') : head, { body: skin, eye: '#3a3a3a', cloth: skin }]);
  else { const girl = body === 'teen' && (L0.female || ['bunches', 'pixie', 'braid', 'long', 'xlong', 'ponytail', 'bob', 'wavy', 'curly_long'].includes(L0.hair)); layers.push([F ? 'head_f' : body === 'teen' ? (girl ? 'head_f_small' : 'head_m_small') : 'head_m', { body: skin, eye: '#3a3a3a' }], ['face_neutral', { body: skin, eye: '#3a3a3a' }], ['nose_straight', { body: skin }]); }
  if (L0.ears === 'elven' || (L0.layers || []).some((l) => l[0] === 'ears_elven')) layers.push(['ears_elven', { body: skin }]);
  if (L0.hair && !head) layers.push(['hair_' + L0.hair, { hair: L0.hairColor || '#5a4030', cloth: '#5a4030' }]);
  for (const l of L0.layers || []) { if (l[0] === 'ears_elven') continue; layers.push([l[0], { cloth: l[1] || '#5a4636', metal: l[2] || '#9aa3ad', body: skin }]); }
  return new Look({ body, group: F ? 'female' : 'male', layers });
}
const storyLooks = {};
const sLook = (id) => storyLooks[id] || (storyLooks[id] = storyLook(STORY.npcById[id]));
const VILLAGE_ROLE = { ivar: 'elder', vesna: 'inn', tur: 'smith', gostena: 'shop' };
function npcSpot(id, home) {
  let h = 0; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) | 0;
  if (!world.infinite) { const b = world.spots.boss || world.spots.up; return freeSpot([b[0] + (h % 3) * 30, b[1] + 30], 0, 50) || b; }
  if (home === 'village') {
    const st = startStruct(); if (VILLAGE_ROLE[id] && st.keeperSpots[VILLAGE_ROLE[id]]) return st.keeperSpots[VILLAGE_ROLE[id]];
    // в первое утро Агафья у брода (она вытаскивает героя из воды), потом — у своей избы
    if (id === 'agafya') { const w = getMap('world'); return STORY && !STORY.isDone('m1') || !w.spots.agafya ? [w.spots.start[0] + 40, w.spots.start[1] - 44] : w.spots.agafya; }
    const sp = st.npcSpots[Math.abs(h) % st.npcSpots.length]; return [sp[0] + (h % 5) * 6, sp[1] + 18];
  }
  const c = locPos(home); if (!c) return null;
  return freeSpot([c[0] + ((h >> 3) % 5) * 18 - 36, c[1] + 40 + ((h >> 6) % 3) * 16], 0, 60) || c;
}
let storyT = 0;
function storyNpcTick(dt) {
  if (!STORY) return; storyT -= dt; if (storyT > 0) return; storyT = .5;
  const have = new Map(ents.filter((e) => e.storyId).map((e) => [e.storyId, e]));
  for (const n of STORY.data.npcs) {
    const st = STORY.npcState(n.id), home = STORY.npcHome(n.id), e = have.get(n.id);
    let want = false;
    if (st === 'gone') want = false;
    else if (st === 'follower') want = true;
    else if (e && e.wild) want = dist(e, player) < 900;
    else if (!world.infinite) want = home === world.tag;
    else if (/^(crypt|mine)\d$/.test(home) || home.startsWith('wild:') || home === 'any') want = false;
    else { const c = locPos(home); want = !!c && Math.hypot(c[0] - player.x, c[1] - player.y) < 1100; }
    if (n.showIf && !STORY.test(n.showIf)) want = false;
    if (n.id === 'gurdym' && (G.flags.troll || STORY.wantsEnemy('troll'))) want = false;
    if (n.id === 'morven' && STORY.wantsEnemy('lich')) want = false;
    if (n.id === 'korney' && STORY.wantsEnemy('minotaur')) want = false;
    if (want && !e) {
      const p = st === 'follower' ? (freeSpot([player.x, player.y], 20, 40) || [player.x + 20, player.y]) : npcSpot(n.id, home); if (!p) continue;
      ents.push({ kind: 'npc', storyId: n.id, v: { role: world.infinite && home === 'village' ? VILLAGE_ROLE[n.id] || null : null, met: true }, c: null, x: p[0], y: p[1], home: p, dir: 'down', anim: 'walk', frame: 0, t: rand() * 4, speed: 34, state: 'idle', look: sLook(n.id), still: !!VILLAGE_ROLE[n.id] || st === 'frozen', follow: st === 'follower', tint: st === 'frozen' ? '#bfe8ff' : null });
    } else if (!want && e) ents = ents.filter((x) => x !== e);
  }
}
function ensureWildNpc(id) {
  if (ents.some((e) => e.storyId === id)) return;
  const p = freeSpot([player.x, player.y], 70, 120); if (!p) return;
  ents.push({ kind: 'npc', storyId: id, wild: true, v: { role: null, met: true }, c: null, x: p[0], y: p[1], home: p, dir: 'down', anim: 'walk', frame: 0, t: 0, speed: 34, state: 'idle', look: sLook(id), still: true });
  fx.push({ type: 'ring', x: p[0], y: p[1] - 8, t: 0, life: .8, color: '#ff9aa0', r: 30 });
  toast(`${STORY.npcName(id)} ждёт тебя неподалёку`, 2000);
}
function respawnNpcs() { ents = ents.filter((e) => !e.storyId); storyT = 0; }
function markerSpots(where, n, seed) {
  let h = 0; for (const ch of seed) h = (h * 33 + ch.charCodeAt(0)) | 0;
  const c = locPos(where) || [player.x, player.y], out = [];
  // always n spots: clue i must stay clue i, or a blocked spot (a house, the river) would make a clue unfindable
  if (!world.infinite) { for (let i = 0; i < n; i++) out.push(randomFloorNear(c, 300) || [player.x, player.y]); return out; }
  for (let i = 0; i < n; i++) {
    const a = (h % 360) / 57 + i * 2.4, r = 70 + ((h >> (i + 2)) & 63) + i * 20, q = [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r * .7];
    out.push(freeSpot(q, 0, 40) || freeSpot(q, 40, 120) || freeSpot(c, 30, 220) || freeSpot([player.x, player.y], 30, 120) || [player.x, player.y]);
  }
  return out;
}
function randomFloorNear(c, r) { for (let i = 0; i < 80; i++) { const x = c[0] + (rand() - .5) * r * 2, y = c[1] + (rand() - .5) * r * 2; if (!blocked(x, y, 10)) return [x, y]; } return world.rooms ? (() => { const room = rpick(world.rooms); return [(room.x + room.w / 2) * T, (room.y + room.h / 2) * T]; })() : null; }
// dialogue window with faces
function storyDialog({ npc, title, lines, options, body, sub }) {
  const who = (id) => id === 'narr' ? '' : id === 'hero' || id === 'self' ? 'Ты' : STORY.npcName(id);
  const faceId = npc && STORY.npcById[npc] ? npc : null;
  const html = `<div class="talk">${faceId ? `<div class="who"><canvas id="talkFace" width="64" height="64"></canvas><div><b>${GEN.esc(STORY.npcName(faceId))}</b><small>${GEN.esc(STORY.npcById[faceId].role)}</small></div></div>` : title ? `<h2>${GEN.esc(title)}</h2>` : ''}
    ${(lines || []).map((l) => l.who === 'narr' ? `<p class="aside narr">${GEN.esc(l.line)}</p>` : `<p class="line"><b class="sp">${GEN.esc(who(l.who))}:</b> «${GEN.esc(l.line)}»</p>`).join('')}${body || ''}${sub ? `<p class="aside">◇ ${GEN.esc(sub)}</p>` : ''}
    <div class="row col">${options.map((o, i) => `<button class="btn ${o.cls || ''} ${o.struck ? 'struck' : ''}" data-a="o${i}" ${o.struck ? 'disabled title="ты что-то об этом знал…"' : ''}>${GEN.esc(o.text)}${o.struck ? ' <small>— ты что-то об этом знал…</small>' : ''}</button>`).join('')}</div></div>`;
  modal(html, null, () => { if (faceId && $('talkFace')) drawFace($('talkFace'), sLook(faceId)); });
  modalHandlers = {}; options.forEach((o, i) => { modalHandlers['o' + i] = o.go; });
}
let sacrificeReq = null;
function sacrificeFor(req) {
  const cards = MEM.allCards(G, SK.node).filter((c) => c.sacrificable !== false && (!req.type || c.type === req.type) && (!req.id || c.id === req.id) && (c.weight || 0) >= (req.minWeight || 1));
  if (!cards.length) { modal(`<h2>Пряжа не берёт пустых рук</h2><p class="line">${GEN.esc(req.why || '')}</p><p class="aside">Нужно воспоминание${req.type ? ` типа «${MEM.CARD_TYPES[req.type]?.name || req.type}»` : ''} весом от ${req.minWeight || 1}. Такого у тебя пока нет. Вернись, когда будет что отдать.</p><div class="row"><button class="btn primary" data-close>Понятно</button></div>`); return; }
  sacrificeReq = req; atNode = { story: true }; cardSel = null; openMenu('skein');
}
function askName(cb) {
  modal(`<h2>Имя</h2><p class="line">Его нельзя найти. Его можно только выбрать.</p><input id="nameIn" maxlength="20" placeholder="${GEN.esc(G.char.name.first)}" style="width:100%;padding:8px;font:16px var(--pixel);background:var(--panel2);color:var(--ink);border:1px solid var(--line);border-radius:6px"><div class="row"><button class="btn gold" data-a="ok">Назвать себя</button></div>`, null, () => setTimeout(() => $('nameIn') && $('nameIn').focus(), 50));
  modalHandlers = { ok: () => { const v = ($('nameIn').value || '').trim().slice(0, 20) || G.char.name.first; closeModal(); cb(v); toast(`Тебя зовут ${v}`, 2400); } };
}
function skipTo(when) {
  const ph = (G.time % 480) / 480; let target;
  if (when === 'night') target = .5; else target = 1.02;
  let dt = (target - ph) * 480; if (dt < 0) dt += 480; G.time += dt;
  fx.push({ type: 'ring', x: player.x, y: player.y - 10, t: 0, life: .8, color: '#9ab8ff', r: 60 });
  toast(when === 'night' ? 'Стемнело' : 'Рассвело', 1600);
}
function showEnding(e) {
  save();
  const epi = (STORY_DATA.epilogue || []).filter((x) => STORY.test(x.if)).map((x) => x.text);
  modal(`<h2>${GEN.esc(e.title)}</h2><p class="line">${GEN.esc(e.text)}</p>${epi.length ? `<h3 class="sub">Что стало с ними</h3>${epi.map((t) => `<p class="aside">${GEN.esc(t)}</p>`).join('')}` : ''}${STORY_DATA.arcHook ? `<p class="line"><i>${GEN.esc(STORY_DATA.arcHook)}</i></p>` : ''}<p class="aside">Ясность: ${clarityNow()}. Отдано воспоминаний: ${(G.memory.sacrificed || []).length}. Снов: ${(G.memory.dreams || []).length}. Падений: ${G.stats.deaths}.</p><p class="aside">Мир перевязывается дальше. Можно продолжать странствовать: побочные истории, края и Отпечатки никуда не делись.</p><div class="row"><button class="btn primary" data-close>Дальше</button></div>`);
  G.flags.ending = e.id;
}
function initStory() {
  if (!STORY_DATA) return;
  STORY = new Story(STORY_DATA, {
    G: () => G, world: () => world, player: () => player, now: () => now, toast, save, updateHUD,
    clarity: clarityNow, school: () => CLS().school || 'phys', hasCard: (id) => MEM.hasCard(G, id), wasSacrificed: (id) => (G.memory.sacrificed || []).some((x) => x.id === id),
    gold: (n) => { G.gold += n; sfx.coin(); }, xp: (n) => gainXp(n), echoes: (n) => gainEchoes(n), item: (id) => { G.questItems = [...new Set([...(G.questItems || []), id])]; toast('Получено: ' + (QUEST_ITEMS[id] || id), 2000); },
    cardById: (id) => G.memory.cards.find((c) => c.id === id), addCard: (c) => { const r = MEM.addCard(G, c); if (r) { toast(`${MEM.CARD_TYPES[c.type].icon} Новое воспоминание: «${c.title}»`, 2400); clarityCache.t = -1; } return r; }, removeCard: (id) => MEM.removeCard(G, id),
    questDone: (q, o) => { sfx.level(); modal(`<h2>${GEN.esc(q.title)}</h2><p class="line">${GEN.esc(o.text)}</p><p class="aside">${[o.rewards?.xp && `опыт +${o.rewards.xp}`, o.rewards?.gold && `золото +${o.rewards.gold}`, o.rewards?.echoes && `Отголоски +${o.rewards.echoes}`].filter(Boolean).join(' · ')}</p>${pendingDreams.length ? '<p class="aside">☾ Что-то всплывает из глубины. Чужое воспоминание.</p>' : ''}<div class="row"><button class="btn primary" data-close>Дальше</button></div>`, () => setTimeout(playNextDream, 200)); },
    dream: (id) => { if (!pendingDreams.includes(id)) pendingDreams.push(id); },
    respawnNpcs, raid: (type, n, o = {}) => { for (let i = 0; i < n; i++) { const p = freeSpot([player.x, player.y], o.near ? 60 : 140, o.near ? 110 : 220); if (p) { const e = addEnemy(type, p[0], p[1], 1); e.state = 'chase'; if (o.name) e.E = { ...e.E, name: o.name }; if (o.tint) e.tint = o.tint; } } toast('Нападение!', 1400); },
    fog: (where, mode) => { if (mode === 'clear') { const c = locPos(where.replace(/^wild:.*/, '')) || [player.x, player.y]; const cx = Math.floor(c[0] / T / CS), cy = Math.floor(c[1] / T / CS); for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) maps.world && maps.world.seen.add((cx + x) + ',' + (cy + y)); } },
    forceForget: (spec) => { const [type, id] = spec.split(':'); const c = MEM.allCards(G, SK.node).find((x) => x.id === id); if (c) MEM.sacrifice(G, c, 'strong_thread', { onSkill: (sid) => { delete G.tree[sid]; } }); },
    restoreLast: () => { const M = G.memory, last = M.sacrificed.pop(); if (last) { MEM.addCard(G, { id: last.id, type: last.type, title: last.title, weight: Math.max(1, (last.weight || 1) - 1), links: last.links, journal: last.journal }); toast(`Вернулось: «${last.title}»`, 2400); } },
    removeLastGift: () => { const M = G.memory, last = M.sacrificed[M.sacrificed.length - 1]; if (last && M.gifts[last.gift]) { M.gifts[last.gift] = Math.max(0, M.gifts[last.gift] - (last.weight || 1)); } },
    ending: showEnding, biome: () => world.infinite ? world.biomeAt(player.x, player.y) : '', nearWater: () => { for (let a = 0; a < 6.28; a += .8) if (world.infinite && world.tile(Math.floor((player.x + Math.cos(a) * 96) / T), Math.floor((player.y + Math.sin(a) * 96) / T)) === 4) return true; return world.infinite && world.biomeAt(player.x, player.y) === 'lake'; },
    ensureBoss: (type) => { if (ents.some((e) => e.kind === 'enemy' && e.type === type && !e.dead)) return; const npcId = { troll: 'gurdym', minotaur: 'korney', lich: 'morven' }[type], n = ents.find((e) => e.storyId === npcId); const p = n ? [n.x, n.y] : (world.infinite ? (freeSpot([player.x, player.y], 90, 140) || [player.x + 100, player.y]) : (world.spots.boss || [player.x + 100, player.y])); if (n) ents = ents.filter((e) => e !== n); const e = addEnemy(type, p[0], p[1], world.level || 1); e.state = 'chase'; bossIntro(e); },
    locPos, modalOpen, dialog: storyDialog, close: closeModal, askName, sacrificeFor, skipTo, ensureWildNpc, markerSpots, isNight, heroName,
    locRadius: (w) => ((STORY_DATA.places || {})[w] ? ((STORY_DATA.places[w] || {}).r || 220) : PLACES[w] ? 200 : (w === 'ford' || w === 'tavern_cellar' ? 160 : 560)),
    sceneIndex: () => INK_INDEX, hub: (id) => hubFor(id), learnPath: (c) => learnPath(c), hasScene: (k) => !!(NARR && NARR.has(k)), scene: (k, o) => NARR && NARR.run(k, o), witnesses: witnessesNear, chapterTo, questFailed, queueScene, takeItem: (id) => { G.questItems = (G.questItems || []).filter((x) => x !== id); },
    hasSchool: (sc) => CLS().school === sc || CLS().tree.some((b) => b.nodes.some((n) => G.tree[n.id] && (n.effects || []).some((e) => e.school === sc))),
  });
  WS.initWS(G);
  NARR = INK_JSON ? new Narrative(INK_JSON, INK_INDEX, narrApi()) : null;
  if (NARR) NARR.load(G.ink);
}
// ---------- narrative bridge, consequences, chapters, merchants ----------
const MERCHANT_OF = { vesna: 'vesna', tur: 'tur', gostena: 'gostena', yasna: 'yasna', ugar: 'ugar', kudel: 'kudel', stakh: 'stakh', khrum: 'khrum', krivoy: 'krivoy' };
function narrApi() {
  return {
    G: () => G, story: () => STORY, modal: (html, onClose, after) => modal(html, onClose, after), close: closeModal, setHandlers: (h) => { modalHandlers = h; }, modalOpen,
    esc: GEN.esc, fill: (t) => (STORY ? STORY.fill(t) : t), isNpc: (id) => !!(STORY && STORY.npcById[id]), npcName: (id) => STORY.npcName(id), npcRole: (id) => (STORY.npcById[id] || {}).role || '',
    drawFace: (id) => { if ($('talkFace') && STORY.npcById[id]) drawFace($('talkFace'), sLook(id)); },
    heroName, clarity: clarityNow, school: () => CLS().school || 'phys', hasCard: (id) => MEM.hasCard(G, id), wasSacrificed: (id) => (G.memory.sacrificed || []).some((x) => x.id === id),
    hasItem: (id) => (G.questItems || []).includes(id), giveItem: (id) => { G.questItems = [...new Set([...(G.questItems || []), id])]; toast('Получено: ' + (QUEST_ITEMS[id] || (WS.data().items[id] || {}).name || id), 2000); }, takeItem: (id) => { G.questItems = (G.questItems || []).filter((x) => x !== id); },
    addGold: (n) => { G.gold = Math.max(0, G.gold + n); if (n > 0) sfx.coin(); updateHUD(); }, addEchoes: (n) => gainEchoes(n), addXp: (n) => gainXp(n), updateHUD,
    toast, witnesses: witnessesNear, trade: (mid) => openTrade(mid), learnPath: (c) => learnPath(c), sfx: (k) => (sfx[k] || sfx.ui)(), night: isNight, save, dirty: () => { clarityCache.t = -1; }, skipTo, chapterTo,
  };
}
// story NPCs close enough to see what the hero does
// ---------- paths: the hero starts as a plain human and learns a path from someone in the world ----------
function learnPath(cls) {
  if (!G || !CLASSES2[cls] || cls === G.cls || cls === 'human') return false;
  const was = G.cls, x = player.x, y = player.y, hp = player.hp / player.ds.maxHp;
  G.paths = [...new Set([...(G.paths || []), cls])];
  G.cls = cls; G.flags['path_' + cls] = true; G.flags.path = cls;
  SK.starterTree(G); // points come from levels: all of them return to be spent on the new path
  // a new body for the new path: the old one must leave the world, or the update loop would treat it as an npc
  const old = player; makePlayer(); player.x = x; player.y = y; player.dir = old.dir; player.hp = Math.max(1, Math.round(player.ds.maxHp * hp));
  ents = ents.map((e) => (e === old ? player : e)); if (!ents.includes(player)) ents.unshift(player);
  refreshPlayer(); updateHUD(); save();
  fx.push({ type: 'pillar', x, y, t: 0, life: 1.2, color: '#ffd25a' });
  if (sfx.level) sfx.level();
  toast(was === 'human' ? `Путь: ${CLASSES2[cls].name}. Руки начинают вспоминать.` : `Путь: ${CLASSES2[cls].name}. Прежний путь забыт.`, 3200);
  tipLater('path', 'Путь', `Ты теперь ${CLASSES2[cls].name.toLowerCase()}. Навыки пути — во вкладке «Навыки» (N). Очки навыков даются за уровни; выученное раньше вернулось очками.`);
  return true;
}
// a chapter can give an NPC a new conversation: talk_<npc>_chN (latest chapter ≤ current), else talk_<npc>
function hubFor(id) { if (!NARR) return null; for (let c = WS.chapter(G); c >= 2; c--) if (NARR.has(`talk_${id}_ch${c}`)) return `talk_${id}_ch${c}`; return NARR.has('talk_' + id) ? 'talk_' + id : null; }
function witnessesNear(r = 320) { if (!player) return []; return [...new Set(ents.filter((e) => e.kind === 'npc' && e.storyId && dist(e, player) < r).map((e) => e.storyId))]; }
// saves from before the arc: chapter and relations from what was already done
function migrateStory(g) {
  const legacy = !g.ws; // saves from v7 have no consequence state yet
  WS.initWS(g);
  const done = (g.story && g.story.done) || {};
  if (legacy) {
    const ch = done.m10 !== undefined ? 6 : done.m9 !== undefined || done.m8 !== undefined ? 5 : done.m6 !== undefined || done.m7 !== undefined ? 4 : done.m4 !== undefined || done.m5 !== undefined ? 3 : done.m2 !== undefined || done.m3 !== undefined ? 2 : 1;
    g.ws.chapter = Math.max(g.ws.chapter || 1, ch);
    for (const [npc, n] of Object.entries((g.memory && g.memory.heroKnows) || {})) if (n > 0) WS.bond(g, npc, n);
  }
}
// ---------- chapters ----------
const CHAPTER_INFO = (n) => ((WS.data().chapters || {})[n]) || { title: '', epigraph: '' };
function chapterCard(n, after) {
  const C = CHAPTER_INFO(n);
  if (player && view) { cam.x = player.x - view.w / 2; cam.y = player.y - 20 - view.h / 2; }
  modal(`<div class="chapter"><small>Глава ${n}</small><h2>${GEN.esc(C.title || '')}</h2>${C.epigraph ? `<p class="line">${GEN.esc(C.epigraph)}</p>` : ''}${C.where ? `<p class="aside">${GEN.esc(C.where)}</p>` : ''}<div class="row"><button class="btn primary" data-close>Начать</button></div></div>`, () => { sfx.memory && sfx.memory(); if (after) after(); });
}
function chapterTo(n) {
  if (!G || !WS.setChapter(G, n)) return;
  save();
  const go = () => chapterCard(n, () => { if (NARR && NARR.has(`chapter_${n}_start`)) queueScene(`chapter_${n}_start`); for (const ev of WS.dueEvents(G, (q) => STORY.isDone(q))) fireEvent(ev); });
  if (modalOpen()) pendingChapter = go; else go();
}
let pendingChapter = null;
function questFailed(q) { toast(`«${q.title}» — не сложилось. ${(q.fail && q.fail.text) || ''}`, 3200); }
// ---------- scenes queued by the world (deferred consequences, chapter openings) ----------
const pendingScenes = [];
function queueScene(knot, where) { if (!pendingScenes.some((x) => x.knot === knot)) pendingScenes.push({ knot, where: where || 'any' }); }
function fireEvent(ev) {
  const d = ev.def || {};
  for (const w of d.effects || []) STORY.effect(w, { id: 'event', title: d.title || '' }, { text: d.text || '' });
  if (d.toast) toast(d.toast, 3000);
  if (d.scene) queueScene(d.scene, d.where);
}
let consT = 0;
function consequenceTick(dt) {
  if ((consT -= dt) > 0) return; consT = 1;
  WS.newDay(G);
  for (const ev of WS.dueEvents(G, (q) => STORY.isDone(q))) fireEvent(ev);
  if (modalOpen() || (NARR && NARR.busy())) return;
  if (pendingChapter) { const f = pendingChapter; pendingChapter = null; f(); return; }
  const i = pendingScenes.findIndex((x) => STORY.here(x.where));
  if (i >= 0 && NARR) { const { knot } = pendingScenes.splice(i, 1)[0]; NARR.run(knot, {}); }
}
// ---------- charms (temporary gifts bought from merchants) ----------
function charmMods() { const out = [], C = WS.data().charms || {}; for (const [id, until] of Object.entries(G.charms || {})) if ((G.time || 0) < until && C[id]) out.push(...C[id].mods); return out; }
// ---------- merchants ----------
function openTrade(mid) {
  const M = WS.data().merchants[mid]; if (!M) { toast('Здесь не торгуют'); return; }
  const t = WS.tradeTerms(G, mid, (c) => STORY.test(c)), npc = M.npc, name = npc ? STORY.npcName(npc) : M.title;
  const secretOnly = !t.open && !!t.secret;
  const debt = npc ? WS.debtOf(G, npc) : 0;
  const wCost = [0, 60, 150, 320, 600], aCost = [0, 90, 220, 450];
  const offers = (t.open || secretOnly ? t.offers : []).map((o) => {
    let cost = o.cost, note = o.desc || '', ok = true;
    if (o.type === 'upgradeWeapon') { if (G.equip.weapon >= 4) ok = false; else { cost = Math.round(wCost[G.equip.weapon + 1] * t.priceMul); note = `${METALS[G.equip.weapon + 1].name.toLowerCase()} ${WEAPON_NAME[CLS().weapon] || 'клинок'}: урон +${METALS[G.equip.weapon + 1].power - METALS[G.equip.weapon].power}`; } }
    if (o.type === 'upgradeArmor') { if (G.equip.armor >= 3) ok = false; else { cost = Math.round(aCost[G.equip.armor + 1] * t.priceMul); note = `${armorList(G.cls)[G.equip.armor + 1].name.toLowerCase()}: защита +${armorList(G.cls)[G.equip.armor + 1].def - armorList(G.cls)[G.equip.armor].def}`; } }
    if (o.type === 'potion') note = `${note || POTIONS[o.potion].name} · у тебя: ${G.potions[o.potion]}`;
    if (o.type === 'questItem' && (G.questItems || []).includes(o.item)) ok = false;
    if (o.type === 'refute' && !WS.summary(G).rumors.some((r) => r.truth === false)) ok = false;
    if (o.once && (G.flags['bought_' + mid + '_' + o.id])) ok = false;
    return { ...o, cost, note, ok };
  }).filter((o) => o.ok);
  const line = !t.open && !secretOnly ? t.reason : secretOnly ? t.secret.line : (M.hello || '');
  const html = `<div class="talk">${npc && STORY.npcById[npc] ? `<div class="who"><canvas id="talkFace" width="64" height="64"></canvas><div><b>${GEN.esc(name)}</b><small>${GEN.esc(M.title)}</small></div></div>` : `<h2>${GEN.esc(M.title)}</h2>`}
    ${line ? `<p class="line">«${GEN.esc(STORY.fill(line))}»</p>` : ''}
    ${!t.open && !secretOnly && t.restore.length ? `<p class="aside">Как это исправить: ${t.restore.map(GEN.esc).join('; ')}.</p>` : ''}
    ${secretOnly ? `<p class="aside">Тайная сделка: дороже обычного, и об этом лучше молчать.</p>` : ''}
    ${(t.open || secretOnly) && t.priceMul !== 1 ? `<p class="aside">Цены для тебя: ×${t.priceMul}.</p>` : ''}
    ${t.notes.length && (t.open || secretOnly) ? `<p class="aside">${t.notes.map(GEN.esc).join(' ')}</p>` : ''}
    ${offers.length ? `<div class="shop">${offers.map((o, i) => `<div class="it"><span>${GEN.esc(o.title)}${o.special ? ' ✦' : ''}<small>${GEN.esc(o.note)}</small></span><button class="btn" data-a="buy${i}">${o.cost ? o.cost + ' зол.' : 'взять'}</button></div>`).join('')}</div>` : ''}
    ${debt > 0 ? `<p class="aside">Твой долг: ${debt} зол.${WS.debtOverdue(G, npc) ? ' Срок вышел.' : ''}</p>` : ''}
    <p class="aside">Золото: ${G.gold}</p>
    <div class="row">${debt > 0 ? `<button class="btn gold" data-a="paydebt">Отдать долг</button>` : ''}<button class="btn ghost" data-close>Уйти</button></div></div>`;
  modal(html, null, () => { if (npc && STORY.npcById[npc] && $('talkFace')) drawFace($('talkFace'), sLook(npc)); });
  modalHandlers = { paydebt: () => { const r = WS.payDebt(G, npc); if (r < 0) return toast('Не хватает золота'); sfx.coin(); updateHUD(); save(); openTrade(mid); } };
  offers.forEach((o, i) => { modalHandlers['buy' + i] = () => buyOffer(mid, o); });
}
function buyOffer(mid, o) {
  if (o.cost && G.gold < o.cost) return toast('Не хватает золота');
  const pay = () => { if (o.cost) G.gold -= o.cost; if (o.once) G.flags['bought_' + mid + '_' + o.id] = true; sfx.coin(); updateHUD(); };
  switch (o.type) {
    case 'potion': pay(); G.potions[o.potion]++; break;
    case 'rest': pay(); player.hp = player.ds.maxHp; player.mp = player.ds.maxMp; toast('Ты выспался. Игра сохранена.', 1800); break;
    case 'upgradeWeapon': pay(); G.equip.weapon++; refreshPlayer(); break;
    case 'upgradeArmor': pay(); G.equip.armor++; refreshPlayer(); break;
    case 'helm': pay(); G.equip.helm = o.helm; refreshPlayer(); break;
    case 'item': { pay(); const it = IT.rollItem(G, { rarity: o.rarity || 'magic' }); if (it) { G.bag.push(it); toast('В сумке: ' + it.name, 2200); } break; }
    case 'charm': { pay(); const C = (WS.data().charms || {})[o.charm]; G.charms = G.charms || {}; G.charms[o.charm] = (G.time || 0) + (C ? C.minutes : 5) * 60; toast(`${C ? C.name : 'Оберег'}: ${C ? C.desc : ''}`, 2600); refreshPlayer(); break; }
    case 'questItem': pay(); G.questItems = [...new Set([...(G.questItems || []), o.item])]; toast('Получено: ' + ((WS.data().items[o.item] || {}).name || QUEST_ITEMS[o.item] || o.item), 2200); break;
    case 'info': { pay(); const S2 = WS.summary(G); closeModal(); storyDialog({ npc: WS.data().merchants[mid].npc, lines: S2.rumors.length ? S2.rumors.map((r) => ({ who: WS.data().merchants[mid].npc, line: `Говорят: «${r.text}». ${r.reach > 4 ? 'Это уже все знают.' : 'Пока шепчутся.'}${r.truth === false ? ' Брехня, по-моему.' : ''}` })) : [{ who: WS.data().merchants[mid].npc, line: 'Про тебя пока молчат. Это редкость, цени.' }], options: [{ text: 'Понятно', go: () => openTrade(mid) }] }); save(); return; }
    case 'refute': { const r = WS.summary(G).rumors.find((x) => x.truth === false); if (!r) return; pay(); WS.refute(G, r.id, WS.data().merchants[mid].npc); toast(`Слух «${r.text}» больше не держится`, 2600); break; }
    case 'sellMemory': closeModal(); sacrificeFor({ sell: o.perWeight || 15, why: o.desc || 'Архив купит любую память. За вес — серебро.', done: () => openTrade(mid) }); return;
    case 'scene': pay(); closeModal(); if (NARR) NARR.run(o.scene, { npc: WS.data().merchants[mid].npc }); return;
    case 'flag': pay(); G.flags[o.flag] = o.value ?? true; break;
  }
  save(); openTrade(mid);
}
// ---------- what villagers say ----------
function villageRumor(seed) {
  const S2 = WS.summary(G), live = S2.rumors.filter((r) => r.reach > 1);
  if (live.length && (seed >>> 0) % 3 !== 0) return 'Слышал? ' + live[(seed >>> 0) % live.length].text + '.';
  const W2 = (WS.data().worldRumors || {})[WS.chapter(G)] || (WS.data().worldRumors || {})[1] || RUMORS;
  return W2[(seed >>> 0) % W2.length];
}
// ---------- «Связи»: factions, people, promises, rumours, evidence ----------
function tiesHtml() {
  const S2 = WS.summary(G);
  const bar = (v) => `<span class="rep"><i style="left:${50 + Math.min(0, v) / 2}%;width:${Math.abs(v) / 2}%;background:${v >= 0 ? '#8ec07c' : '#ff7a6a'}"></i></span>`;
  let h = `<p class="aside">Глава ${S2.chapter}. Тут видно, как к тебе относятся и что о тебе говорят. Помнит мир, а не только ты.</p>`;
  h += `<h3 class="sub">Фракции</h3><div class="shop">${S2.factions.map((f) => `<div class="it"><span>${GEN.esc(f.name)}<small>${GEN.esc(f.tier.name)} (${f.value > 0 ? '+' : ''}${f.value})</small></span>${bar(f.value)}</div>`).join('')}</div>`;
  const people = S2.npcs.filter((n) => STORY.S.met[n.id]);
  if (people.length) h += `<h3 class="sub">Люди</h3><div class="shop">${people.map((n) => `<div class="it"><span>${GEN.esc(STORY.npcName(n.id))}<small>${GEN.esc(n.attitude.name)} · доверие ${n.trust}, уважение ${n.respect}, страх ${n.fear}, вражда ${n.hostility}</small></span></div>`).join('')}</div>`;
  if (S2.promises.length) h += `<h3 class="sub">Слово</h3><ul class="qlist">${S2.promises.map((p) => `<li class="${p.state === 'open' ? '' : 'done'}"><b>${GEN.esc(p.toName)}: ${GEN.esc(p.text)}</b><small>${{ open: 'дано' + (p.due !== null ? `, до ${p.due + 1}-го дня` : ''), kept: 'сдержано', broken: 'нарушено' + (p.why ? ` (${p.why})` : ''), released: 'освобождён от слова' }[p.state]}</small></li>`).join('')}</ul>`;
  if (S2.debts.length) h += `<h3 class="sub">Долги</h3><ul class="qlist">${S2.debts.map((d) => `<li><b>${GEN.esc(d.name)}: ${d.amount} зол.</b><small>${d.overdue ? 'срок вышел' : d.due !== null ? `до ${d.due + 1}-го дня` : 'без срока'}</small></li>`).join('')}</ul>`;
  if (S2.rumors.length) h += `<h3 class="sub">Что о тебе говорят</h3><ul class="qlist">${S2.rumors.map((r) => `<li><b>«${GEN.esc(r.text)}»</b><small>знают ${r.reach} чел.</small></li>`).join('')}</ul>`;
  if (S2.facts.length) h += `<h3 class="sub">Улики и знания</h3><ul class="qlist">${S2.facts.map((f) => `<li><b>${GEN.esc(f.title)}</b><span>${GEN.esc(f.text)}</span></li>`).join('')}</ul>`;
  if (S2.log.length) h += `<h3 class="sub">Последствия</h3><ul class="qlist small">${S2.log.slice().reverse().slice(0, 14).map((l) => `<li><small>день ${l.day + 1}</small> ${GEN.esc(l.text)}</li>`).join('')}</ul>`;
  return h;
}

let pendingDreams = [];
function dreamApi(after) {
  return { modal: (html, onClose) => modal(html, onClose), close: closeModal, handlers: (h) => { modalHandlers = h; }, look: (spec) => storyLook({ look: spec }), npcLook: (id, over) => { const n = STORY && STORY.npcById[id]; return storyLook({ look: { ...(n ? n.look : {}), ...(over || {}) } }); }, sfx: () => sfx.memory() };
}
function playNextDream() { if (modalOpen()) return; const id = pendingDreams.shift(); if (!id) return; playDream(id, dreamApi(), () => setTimeout(playNextDream, 300)); tipLater('dream', 'Сны', 'Ты сшит из чужих жизней. Каждый Сон — карта памяти весом 5 и постоянная сила, пока ты его помнишь. Пересмотреть Сон можно в «Клубке» (B).'); }
function nearWaterNow() { if (!world || !world.infinite || !player) return false; for (let a = 0; a < 6.28; a += 1.05) { const id = world.tile(Math.floor((player.x + Math.cos(a) * 80) / T), Math.floor((player.y + Math.sin(a) * 80) / T)); if (id === 4 || id === 18) return true; } return false; }
// ---------- one-time tips ----------
const tipQueue = []; let tipShown = null, tipT = 0;
function tipLater(id, title, text) { G.tips = G.tips || {}; if (G.tips[id] || tipQueue.some((t) => t.id === id) || (tipShown && tipShown.id === id)) return; tipQueue.push({ id, title, text }); }
function tipsTick(dt) {
  if (!G || !player) return;
  if (tipShown) { tipT -= dt; if (tipT <= 0) hideTip(); }
  else if (tipQueue.length && !modalOpen()) { tipShown = tipQueue.shift(); G.tips[tipShown.id] = 1; tipT = 11; const el = $('tip'); el.innerHTML = `<b>${GEN.esc(tipShown.title)}</b><span>${GEN.esc(tipShown.text)}</span><button aria-label="Закрыть подсказку">×</button>`; el.hidden = false; el.classList.remove('in'); void el.offsetWidth; el.classList.add('in'); el.querySelector('button').onclick = hideTip; }
  if ((tipCheckT -= dt) > 0) return; tipCheckT = 1;
  const M = G.memory || {}, T0 = G.tips || {};
  if ((G.echoes || 0) > 0 && !T0.echo) tipLater('echo', 'Отголоски ✶', 'Светящиеся нити — осколки чужой памяти. Ими вплетают ранги навыков, закрепляют Отпечатки и платят ткачам. Носить можно 100 + 10 за уровень, лишнее выцветает.');
  if ((M.cards || []).length && !T0.card) tipLater('card', 'Воспоминание', 'Всё, что ты пережил, становится картой памяти: края, истории, люди, навыки. Их видно в «Клубке» (B). Их можно хранить — или отдать на Узле ради силы.');
  if (SK.pointsFree(G) > 0 && G.lvl >= 2 && !T0.points) tipLater('points', 'Очко навыков', 'Открой «Навыки» (N). У класса три ветви. Выученное умение ставится в ячейки K, L, U, I; ячейки открываются на 1, 3, 6 и 12 уровне.');
  if ((G.imprints || []).length && !T0.imprint) tipLater('imprint', 'Отпечаток', 'Память павшего врага о том, как он дрался. Действует три дня, потом выцветает, если не закрепить его в «Клубке» за 30 ✶.');
  if ((G.bag || []).length && !T0.item) tipLater('item', 'Вещи', 'Сумка — во вкладке «Вещи». Тяжёлая броня держит удар, но замедляет шаг и колдовство; лёгкая — наоборот.');
  if (world && world.infinite && world.dark > .3 && !T0.night) tipLater('night', 'Ночь', 'Ночью нежить сильнее, а Отголоски с неё дороже. Из темноты выходят Недопетые и нетопыри.');
  if ((G.echoes || 0) > MEM.echoCap(G) && !T0.cap) tipLater('cap', 'Отголоски выцветают', 'Ты несёшь больше, чем можешь удержать. Потрать лишнее: вплети ранг навыка или закрепи Отпечаток.');
  const st = MEM.clarityState(clarityNow()).id; if (st !== lastClarity) { if (lastClarity && (st === 'holey' || st === 'hollow') && !T0['cl_' + st]) tipLater('cl_' + st, 'Ясность падает', st === 'hollow' ? 'Ты почти пуст. Удары злее, но люди смотрят сквозь тебя, и многие концовки уже закрыты.' : 'Чем меньше ты помнишь, тем сильнее бьёшь — и тем хуже понимаешь мир: часть слов теряется.'); lastClarity = st; }
  const ni = nearestInteract(); if (ni && (ni.kind === 'node' || ni.kind === 'altar') && !T0.node) tipLater('node', 'Узел', 'Здесь Пряжа слушает. Можно отдать воспоминание ради дара. После смерти тебя перевяжет на последнем Узле, где ты был.');
}
let tipCheckT = 0, lastClarity = null;
function hideTip() { tipShown = null; $('tip').hidden = true; }
const QUEST_ITEMS = { grandfather_compass: 'дедовский компас', frost_lamp: 'ледяная лампа Архива', ash_torch: 'пепельный факел', spindle: 'веретено Перевязчиков' };

// =====================================================================================
// Update
// =====================================================================================
let statT = 0;
function update(dt) {
  const kb = readKeys();
  let mx = kb.mx + touch.dx, my = kb.my + touch.dy;
  const l = Math.hypot(mx, my); if (l > 1) { mx /= l; my /= l; }
  const P = player;
  P.cd = Math.max(0, P.cd - dt); P.inv = Math.max(0, P.inv - dt); P.flash = Math.max(0, (P.flash || 0) - dt);
  P.slow = Math.max(0, (P.slow || 0) - dt);
  const spd = P.ds.speed * (P.slow > 0 ? .6 * (1 + (P.ds.mods.slowResist || 0)) : 1) * (world.infinite && world.slowAt(P.x, P.y) && !((G.memory || {}).dreams || []).includes('lesya') ? .65 : 1) * SK.channelMove();
  if (!P.dead) SK.tick(dt, l > .1);
  if (STORY) { storyNpcTick(dt); STORY.tick(dt); consequenceTick(dt); }
  worldSoundTick(dt);
  tipsTick(dt);
  if (pendingDreams.length && !modalOpen()) playNextDream();
  if ((statT -= dt) <= 0) { statT = .25; const hp = P.hp, mp = P.mp; P.ds = derivedStats(G); P.hp = Math.min(hp, P.ds.maxHp); P.mp = Math.min(mp, P.ds.maxMp); }
  G.playTime = (G.playTime || 0) + dt;
  if (MEM.tickEchoes(G, dt)) updateHUD();
  if (world.infinite) { const d0 = MEM.dayOf(G); G.time = (G.time || 0) + dt; if (MEM.dayOf(G) !== d0) { const k = MEM.tickImprints(G); if (k) toast('Отпечаток выцвел', 1600); if (G.skein && G.skein.day < MEM.dayOf(G)) { G.skein = null; drops = drops.filter((d2) => d2.type !== 'skein'); } } const ph = (G.time % 480) / 480, night = (1 - Math.cos(ph * 6.283)) / 2; world.dark = Math.max(0, night - .38) * 1.1; worldTimer -= dt; if (worldTimer <= 0) { worldTimer = .35; worldTick(false); } }
  if (!P.dead) {
    const acting = combatTick(dt); // отскок и парирование сами ведут героя
    if (!acting && (kb.attack || touch.attack)) startAttack();
    if (!acting) for (let i = 0; i < 4; i++) if (kb.skills[i] || touch['s' + i]) useSkill(i);
    // regen
    P.mp = Math.min(P.ds.maxMp, P.mp + dt * P.ds.mpRegen);
    if (P.ds.regen) P.hp = Math.min(P.ds.maxHp, P.hp + P.ds.regen * dt);
    if (acting) { /* поза держится в combatTick */ }
    else if (P.atk > 0) {
      P.atk -= dt;
      const n = ANIM_FRAMES[P.anim], dur = P.atkDur || .5;
      P.frame = Math.min(n - 1, ((dur - P.atk) / dur) * n);
      if (!P.hitDone && P.frame >= (P.hitFrame || 3)) { P.hitDone = true; attackHit(); }
      if (P.atk <= 0) { P.anim = 'walk'; P.frame = 0; }
      const slow = CLS().basic.type === 'melee' ? .35 : .15;
      if (l > .1) moveEnt(P, mx * spd * slow * dt, my * spd * slow * dt);
    } else if (l > .1 && !P.dashV) {
      P.dir = DIR_OF(mx, my);
      moveEnt(P, mx * spd * dt, my * spd * dt);
      P.t += dt * (spd / 60); P.frame = 1 + Math.floor(P.t * 9) % 8; P.anim = 'walk'; P.moving = true;
      if ((P.frame === 1 || P.frame === 5) && P.frame !== P.stepF) footstep(world.infinite ? world.tile(Math.floor(P.x / T), Math.floor(P.y / T)) : TILE.STONE); P.stepF = P.frame;
    } else { P.frame = 0; P.moving = false; if (validLock()) P.dir = DIR_OF(lock.x - P.x, lock.y - P.y); }
    if (P.kx || P.ky) { moveEnt(P, P.kx * dt, P.ky * dt); P.kx *= .82; P.ky *= .82; if (Math.abs(P.kx) < 2) P.kx = 0; if (Math.abs(P.ky) < 2) P.ky = 0; }
  } else if (P.dead) { P.dead += dt; P.frame = Math.min(5, P.dead * 8); }
  // exits
  for (const ex of world.exits) if (P.x > ex.x && P.x < ex.x + ex.w && P.y > ex.y && P.y < ex.y + ex.h) { enterZone(ex.to, ex.at); return; }

  for (const e of ents) if (e !== P) { if (e.vuln > 0) e.vuln -= dt; (e.kind === 'enemy' ? updEnemy : e.kind === 'ally' ? updAlly : updNpc)(e, dt); }
  teleTick(dt); bossBarTick();
  ents = ents.filter((e) => !((e.kind === 'enemy' && e.dead > 2.2) || (e.kind === 'ally' && e.dead > 1.4)));
  // projectiles
  for (const p of projs) {
    p.t += dt;
    if ((p.type === 'bolt' || p.homing) && p.target && p.target.hp > 0) { const a = Math.atan2(p.target.y - 20 * (p.target.scale || 1) - p.y, p.target.x - p.x), sp = Math.hypot(p.vx, p.vy), cur = Math.atan2(p.vy, p.vx); let da = a - cur; while (da > Math.PI) da -= 6.283; while (da < -Math.PI) da += 6.283; const na = cur + Math.max(-5 * dt, Math.min(5 * dt, da)); p.vx = Math.cos(na) * sp; p.vy = Math.sin(na) * sp; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (solidTile(world, Math.floor(p.x / T), Math.floor((p.y + 18) / T))) p.t = 99;
    if (p.from === 'player') {
      for (const e of ents) if (e.kind === 'enemy' && e.hp > 0 && !(p.hits && p.hits.has(e)) && Math.hypot(e.x - p.x, e.y - 22 * e.scale - p.y) < 18 * e.scale) {
        if (p.hits) p.hits.add(e);
        if (p.summon) SK.dealDamage(e, p.mult || .5, p.school, { summon: true, from: p }); else SK.projHit(p, e);
        if (p.pierce > 0) p.pierce--; else { p.t = 99; break; }
      }
    }
    else if (!P.dead && Math.hypot(P.x - p.x, P.y - 22 - p.y) < 16) { if (SK.reflects(p)) continue; const landed = hurtPlayer(p.dmg, p.owner || p, false, true) !== false; if (landed && p.type === 'eice') { P.slow = 1.8; } if (landed && p.type === 'efire') fx.push({ type: 'boom', x: p.x, y: p.y + 10, t: 0, life: .35, r: 26, color: '255,120,40' }); p.t = 99; }
    else for (const a of ents) if (a.kind === 'ally' && a.hp > 0 && Math.hypot(a.x - p.x, a.y - 22 - p.y) < 16) { a.hp -= p.dmg; a.hurtT = .18; p.t = 99; break; }
  }
  projs = projs.filter((p) => p.t < p.life);
  // drops
  for (const d of drops) {
    d.t += dt; const dd = Math.hypot(P.x - d.x, P.y - d.y);
    if (dd < 70 && d.t > .4) { d.x += (P.x - d.x) * dt * 6; d.y += (P.y - d.y) * dt * 6; }
    if (dd < 14 && d.t > .4) { d.got = true; if (d.type === 'gold') { G.gold += d.v; sfx.coin(); } else if (d.type === 'echo') { gainEchoes(d.v); sfx.memory(); if (STORY) STORY.onEcho(d.v); } else if (d.type === 'imprint') { pickImprint(d.enemy); } else if (d.type === 'skein') { gainEchoes(d.v); G.skein = null; toast(`Клубок подобран: +${Math.round(d.v)} Отголосков`, 1800); sfx.memory(); } else if (d.type === 'item') { pickItem(d.item); } else { G.potions[d.type]++; sfx.potion(); toast(POTIONS[d.type].name + ' +1', 1200); } updateHUD(); }
  }
  drops = drops.filter((d) => !d.got);
  for (const f of fx) f.t += dt; fx = fx.filter((f) => f.t < f.life);
  // camera
  const vw = view.w, vh = view.h;
  cam.x += (P.x - vw / 2 - cam.x) * Math.min(1, dt * 8); cam.y += (P.y - 20 - vh / 2 - cam.y) * Math.min(1, dt * 8);
  if (!world.infinite) {
    cam.x = Math.max(0, Math.min(world.w * T - vw, cam.x)); cam.y = Math.max(0, Math.min(world.h * T - vh, cam.y));
    if (world.w * T < vw) cam.x = (world.w * T - vw) / 2; if (world.h * T < vh) cam.y = (world.h * T - vh) / 2;
  }
  hudTick();
}
function updNpc(e, dt) {
  if (e.follow) { const d = dist(e, player); if (d > 500) { e.x = player.x - 20; e.y = player.y + 10; } if (d > 40) { const dx = player.x - e.x, dy = player.y - e.y; e.dir = DIR_OF(dx, dy); moveEnt(e, dx / d * 90 * dt, dy / d * 90 * dt); e.walkT = (e.walkT || 0) + dt; e.frame = 1 + Math.floor(e.walkT * 8) % 8; } else e.frame = 0; return; }
  if (e.state === 'talk') { if (!modalOpen()) e.state = 'idle'; e.frame = 0; return; }
  if (e.still) { e.frame = 0; if (dist(e, player) < 80) e.dir = DIR_OF(player.x - e.x, player.y - e.y); return; }
  e.t -= dt;
  if (e.state === 'idle') { e.frame = 0; if (e.t <= 0) { const a = rand() * 6.283, r = rand() * 70; e.goal = [e.home[0] + Math.cos(a) * r, e.home[1] + Math.sin(a) * r]; e.state = 'walk'; e.t = 4; } }
  else { const dx = e.goal[0] - e.x, dy = e.goal[1] - e.y, l = Math.hypot(dx, dy); if (l < 4 || e.t <= 0) { e.state = 'idle'; e.t = 1 + rand() * 4; } else { e.dir = DIR_OF(dx, dy); const ox = e.x, oy = e.y; moveEnt(e, dx / l * e.speed * dt, dy / l * e.speed * dt); if (ox === e.x && oy === e.y) { e.state = 'idle'; e.t = 1; } e.walkT = (e.walkT || 0) + dt; e.frame = 1 + Math.floor(e.walkT * 7) % 8; } }
}
function updEnemy(e, dt) {
  const P = player, E = e.E;
  if (e.dead) { e.dead += dt; e.frame = Math.min(5, e.dead * 9); return; }
  e.cd -= dt; e.hurtT = Math.max(0, e.hurtT - dt);
  const st = SK.tickEnemy(e, dt);
  if (e.dead || e.hp <= 0) return;
  if (e.kx || e.ky) { moveEnt(e, e.kx * dt, e.ky * dt, 8); e.kx *= .8; e.ky *= .8; if (Math.abs(e.kx) < 3) e.kx = 0; if (Math.abs(e.ky) < 3) e.ky = 0; }
  if (st) { e.frame = 0; if (st === 'frozen') e.atk = 0; return; }
  e.slow = Math.max(0, (e.slow || 0) - dt);
  const spd = e.speed * SK.enemySpeedMul(e) * (world.dark > .3 && UNDEAD.has(e.type) ? 1.1 : 1);
  if (e.fear > 0) { const a = Math.atan2(e.y - P.y, e.x - P.x); e.dir = DIR_OF(Math.cos(a), Math.sin(a)); moveEnt(e, Math.cos(a) * spd * dt, Math.sin(a) * spd * dt, 8); e.walkT = (e.walkT || 0) + dt; e.frame = 1 + Math.floor(e.walkT * 10) % 8; e.atk = 0; return; }
  if (e.forget > 0 || SK.heroHidden(e)) { if (e.state === 'chase') e.state = 'idle'; }
  const tgt = pickTarget(e), d = dist(e, tgt), aggro = (E.boss ? 260 : 170) * (e.forget > 0 || SK.heroHidden(e) ? 0 : 1); e.tgt = tgt;
  if (e.atk > 0) {
    e.atk -= dt; const n = ANIM_FRAMES[e.anim], total = e.atkDur; e.frame = Math.min(n - 1, ((total - e.atk) / total) * n);
    if (!e.hitDone && e.frame >= (e.anim === 'slash' ? 3 : e.anim === 'shoot' ? 5 : 4)) {
      e.hitDone = true;
      if (E.ai === 'melee') { if (tgt.hp > 0 && d < (E.reach + 12) * e.scale) { const dm = e.dmg * enemyDmgMul(e) * (e.heavy ? 1.6 : 1); if (tgt === P) hurtPlayer(dm, e, true); else { tgt.hp -= dm; tgt.hurtT = .18; } } }
      else enemyShoot(e);
    }
    if (e.atk <= 0) { e.anim = 'walk'; e.frame = 0; }
    return;
  }
  if (P.dead && tgt === P) { e.state = 'idle'; }
  if (e.state === 'idle' || e.state === 'wander') {
    if (d < aggro && !P.dead && !(e.forget > 0)) { e.state = 'chase'; if (E.boss) bossIntro(e); }
    e.t -= dt; if (e.t <= 0) { e.t = 2 + rand() * 3; const a = rand() * 6.283; e.wander = [e.home[0] + Math.cos(a) * 60, e.home[1] + Math.sin(a) * 60]; }
    if (e.wander) { const dx = e.wander[0] - e.x, dy = e.wander[1] - e.y, l = Math.hypot(dx, dy); if (l > 4) { e.dir = DIR_OF(dx, dy); moveEnt(e, dx / l * e.speed * .4 * dt, dy / l * e.speed * .4 * dt, 8); e.walkT = (e.walkT || 0) + dt; e.frame = 1 + Math.floor(e.walkT * 6) % 8; } else e.frame = 0; }
    return;
  }
  if (d > aggro * 2.2) { e.state = 'idle'; return; }
  const dx = tgt.x - e.x, dy = tgt.y - e.y, l = Math.max(1, d);
  if (E.boss && bossMech(e, dt, tgt, d)) return;
  if (!(e.silence > 0) && E.heals && (!e.healT || now - e.healT > E.heals)) { e.healT = now; let n = 0; for (const o of ents) if (o.kind === 'enemy' && o.hp > 0 && o !== e && o.hp < o.maxHp && dist(o, e) < 150) { o.hp = Math.min(o.maxHp, o.hp + o.maxHp * .3); n++; fx.push({ type: 'sparkle', x: o.x, y: o.y - 20, t: 0, life: .6, color: '#9be36a' }); } if (n) { fx.push({ type: 'ring', x: e.x, y: e.y - 10, t: 0, life: .6, color: '#9be36a', r: 60 }); e.anim = 'spellcast'; e.atkDur = .6; e.atk = .6; e.hitDone = true; return; } }
  if (!(e.silence > 0) && E.summon && (!e.summonT2 || now - e.summonT2 > E.summon) && ents.filter((o) => o.kind === 'enemy' && o.type === 'skeleton' && o.hp > 0 && dist(o, e) < 220).length < 3) { e.summonT2 = now; const p = freeSpot([e.x, e.y], 30, 70); if (p) { addEnemy('skeleton', p[0], p[1]); const s2 = ents[ents.length - 1]; s2.state = 'chase'; s2.hp = s2.maxHp = Math.round(s2.maxHp * .7); fx.push({ type: 'ring', x: p[0], y: p[1] - 6, t: 0, life: .8, color: '#7dff9a', r: 30 }); e.anim = 'spellcast'; e.atkDur = .7; e.atk = .7; e.hitDone = true; return; } }
  e.dir = DIR_OF(dx, dy);
  let want = 0;
  if (E.ai === 'melee') want = d > E.reach * e.scale ? 1 : 0;
  else want = d > E.range ? 1 : d < E.range * .5 ? -.7 : 0;
  if (want) { const ox = e.x, oy = e.y; moveEnt(e, dx / l * spd * want * dt, dy / l * spd * want * dt, 8); if (ox === e.x && oy === e.y) moveEnt(e, -dy / l * spd * dt, dx / l * spd * dt, 8); e.walkT = (e.walkT || 0) + dt; e.frame = 1 + Math.floor(e.walkT * 8) % 8; } else e.frame = 0;
  const inRange = E.ai === 'melee' ? d < E.reach * e.scale + 4 : d < E.range * 1.1;
  if (inRange && e.cd <= 0) {
    e.anim = E.ai === 'melee' ? 'slash' : E.ai === 'ranged' ? 'shoot' : 'spellcast'; e.atkDur = E.ai === 'melee' ? .55 : .7; e.atk = e.atkDur; e.frame = 0; e.hitDone = false; e.cd = E.cd * (.8 + rand() * .4);
    // тяжёлый удар: замах дольше, бьёт сильнее, парированием не отбить
    e.heavy = E.ai === 'melee' && !!E.heavy && rand() < E.heavy; if (e.heavy) { e.atkDur = .95; e.atk = e.atkDur; }
    if (tgt === P && d < 230) { if (e.heavy) tipLater('heavy', 'Тяжёлый удар', 'Враг светится красным, над ним «‼» — тяжёлый удар. Его не отбить, только отскочить (Пробел, кнопка ↷).'); else if (E.ai === 'melee') tipLater('windup', 'Замах', 'Красный «!» над врагом — он замахнулся. Отскочи (Пробел, ↷) или парируй (H, ⛨) прямо перед ударом: отбитый враг оглушён, а твой следующий удар вдвое сильнее.'); }
  }
  // (lich phases live in bossMech)
}
// =====================================================================================
// Bosses: telegraphed attacks and memory-themed phases
// =====================================================================================
let tele = [];
function addTele(t) { tele.push({ t: 0, color: '255,70,60', ...t }); }
function inTele(t, o) {
  if (t.shape === 'circle') return Math.hypot(o.x - t.x, o.y - t.y) < t.r;
  const dx = t.x2 - t.x, dy = t.y2 - t.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, px = o.x - t.x, py = o.y - t.y, u = px * ux + py * uy, v = -px * uy + py * ux;
  return u > -10 && u < L + 10 && Math.abs(v) < t.w / 2 + 6;
}
function teleTick(dt) {
  for (const t of tele) { t.t += dt; if (t.t >= t.delay && !t.fired) { t.fired = true; if (t.owner && (t.owner.dead || t.owner.hp <= 0)) continue; t.onFire(t); } }
  tele = tele.filter((t) => !t.fired);
}
function drawTele(x) {
  for (const t of tele) {
    const k = Math.min(1, t.t / t.delay), pulse = .5 + Math.sin(now * 14) * .15;
    x.fillStyle = `rgba(${t.color},${.12 + k * .18})`; x.strokeStyle = `rgba(${t.color},${pulse})`; x.lineWidth = 1.5;
    if (t.shape === 'circle') { x.beginPath(); x.ellipse(t.x, t.y, t.r, t.r * .6, 0, 0, 7); x.fill(); x.stroke(); x.fillStyle = `rgba(${t.color},.25)`; x.beginPath(); x.ellipse(t.x, t.y, t.r * k, t.r * .6 * k, 0, 0, 7); x.fill(); }
    else { const a = Math.atan2(t.y2 - t.y, t.x2 - t.x), L = Math.hypot(t.x2 - t.x, t.y2 - t.y); x.save(); x.translate(t.x, t.y); x.rotate(a); x.fillRect(0, -t.w / 2, L, t.w); x.strokeRect(0, -t.w / 2, L, t.w); x.fillStyle = `rgba(${t.color},.28)`; x.fillRect(0, -t.w / 2, L * k, t.w); x.restore(); }
  }
}
const MORVEN_NAMES = ['Митрий Вереск', 'Лёся', 'Марфа', 'Сенька', 'Остап Ряд', 'Гордей', 'Устинья', 'Фрол', 'Анисья', 'Павлуша', 'Дарья Ольха', 'Тимоха'];
function bossAnim(key, x, y, o) { if (VFX.ok && VFX.meta[key]) fx.push({ type: 'anim', key, x, y, t: 0, life: vfxLife(key), ...o }); }
function bossMech(e, dt, tgt, d) {
  const P = player, M = (e.mech = e.mech || { t1: 2.5, t2: 4, phase: 0 });
  M.t1 -= dt; M.t2 -= dt;
  const hpK = e.hp / e.maxHp;
  if (e.type === 'troll') {
    if (!M.spoke) { M.spoke = true; const n = G.stats.deaths || 0; if (n > 0) { e.dmg *= 1 + Math.min(.5, n * .05); showBossLine(e, `«Я помню каждую твою смерть, маленький. ${n}.»`); } else showBossLine(e, '«Я помню всех, кто сюда приходил. Тебя тоже запомню.»'); }
    if (hpK < .35 && M.phase < 1) { M.phase = 1; e.speed *= 1.4; showBossLine(e, '«Не забуду! Ничего не забуду!»'); }
    if (M.t1 <= 0 && d < 150) { M.t1 = M.phase ? 5 : 7; const r = 100; addTele({ shape: 'circle', x: e.x, y: e.y, r, delay: 1.1, owner: e, onFire: (t) => { bossAnim('earth_spikes', t.x, t.y + 6, { scale: 1.6 }); fx.push({ type: 'ring', x: t.x, y: t.y - 8, t: 0, life: .5, color: '#c8a070', r }); sfx.boom(); if (inTele(t, P)) { hurtPlayer(e.dmg * 1.6, e, true); P.slow = 1.4; } for (const a of ents) if (a.kind === 'ally' && inTele(t, a)) a.hp -= e.dmg * 1.6; } }); e.anim = 'slash'; e.atkDur = 1.1; e.atk = 1.1; e.hitDone = true; return true; }
    if (M.t2 <= 0 && d > 120 && d < 380) { M.t2 = 5; const tx = tgt.x, ty = tgt.y; addTele({ shape: 'line', x: e.x, y: e.y, x2: tx + (tx - e.x) / d * 40, y2: ty + (ty - e.y) / d * 40, w: 30, delay: .85, owner: e, onFire: (t) => { bossAnim('earth_spikes', t.x2, t.y2 + 4, { scale: 1.1 }); sfx.hit(); if (inTele(t, P)) hurtPlayer(e.dmg * 1.25, e); } }); e.anim = 'slash'; e.atkDur = .85; e.atk = .85; e.hitDone = true; return true; }
    return false;
  }
  if (e.type === 'lich') {
    if (!M.spoke) { M.spoke = true; showBossLine(e, '«Ты пришёл забрать у меня имена? Их двести лет никто не просил.»'); }
    // «Двести имён»: a barrier held by named dead
    if ((hpK < .66 && M.phase < 1) || (hpK < .33 && M.phase < 2)) {
      M.phase++; e.shielded = true; e.guards = [];
      const names = MORVEN_NAMES.slice().sort(() => rand() - .5);
      for (let i = 0; i < 3; i++) { const p = freeSpot([e.x, e.y], 60, 120); if (!p) continue; const w = addEnemy('wraith', p[0], p[1], world.level || 1); w.state = 'chase'; w.nameTag = names[i]; w.maxHp = w.hp = Math.round(w.hp * 1.6); e.guards.push(w); bossAnim('summon_ring', p[0], p[1]); }
      showBossLine(e, `«${e.guards.map((w) => w.nameTag).join(', ')}… Встаньте. Ещё раз. За меня.»`);
      toast('Морвен закрылся именами. Упокой Недопетых, чтобы снять щит', 3000);
    }
    if (e.shielded && e.guards && e.guards.every((w) => w.hp <= 0 || w.dead)) { e.shielded = false; showBossLine(e, '«…Простите. Опять.»'); bossAnim('ghost_wisp', e.x, e.y - 10, { scale: 1.6 }); }
    if (M.t1 <= 0) { M.t1 = M.phase >= 2 ? 4.5 : 6; const pts = [[tgt.x, tgt.y]]; for (let i = 0; i < 2 + M.phase; i++) { const a = rand() * 6.28, r = 60 + rand() * 80; pts.push([tgt.x + Math.cos(a) * r, tgt.y + Math.sin(a) * r * .7]); }
      for (const [px, py] of pts) addTele({ shape: 'circle', x: px, y: py, r: 46, delay: 1.3, color: '120,200,255', owner: e, onFire: (t) => { bossAnim('ice_burst', t.x, t.y, { scale: 1.6 }); sfx.ice(); if (inTele(t, P)) { hurtPlayer(e.dmg * 1.3, e); P.slow = 2; } } });
      e.anim = 'spellcast'; e.atkDur = .8; e.atk = .8; e.hitDone = true; return true; }
    return false;
  }
  if (e.type === 'minotaur') {
    if (M.charge) {
      const c = M.charge, step = 560 * dt, ox = e.x, oy = e.y; moveEnt(e, c.ux * step, c.uy * step, 10); c.left -= step; e.walkT = (e.walkT || 0) + dt * 3; e.frame = 1 + Math.floor(e.walkT * 8) % 8;
      if (!c.hit && dist(e, P) < 30 * e.scale) { c.hit = true; if (hurtPlayer(e.dmg * 1.8, e, true) !== false) { P.kx = c.ux * 300; P.ky = c.uy * 300; } }
      const stuck = Math.hypot(e.x - ox, e.y - oy) < step * .5;
      if (stuck) { M.charge = null; e.stun = 2.2; e.vuln = 2.2; bossAnim('smoke', e.x, e.y, { scale: 1.6 }); bossAnim('spark', e.x, e.y - 30, { scale: 1.5 }); sfx.boom(); toast('Минотавр врезался и оглушён: бей сейчас', 1600); if (world.infinite) showBossLine(e, '«…Опять стена. Всегда стена.»'); }
      else if (c.left <= 0) M.charge = null;
      return true;
    }
    const korney = world.infinite;
    if (!M.spoke) { M.spoke = true; if (korney) showBossLine(e, '«Круг. Опять круг. Отойди с дороги, я не могу остановиться.»'); }
    if (hpK < .4 && M.phase < 1) { M.phase = 1; if (korney) showBossLine(e, '«Я помню, кем был. Корней. Меня звали Корней.»'); }
    if (M.t1 <= 0 && d > 80 && d < 340) { M.t1 = M.phase ? 4 : 6; const ux = (tgt.x - e.x) / d, uy = (tgt.y - e.y) / d, L = d + 70;
      addTele({ shape: 'line', x: e.x, y: e.y, x2: e.x + ux * L, y2: e.y + uy * L, w: 36, delay: .9, owner: e, onFire: () => { M.charge = { ux, uy, left: L, hit: false }; sfx.swing(); } });
      e.dir = DIR_OF(ux, uy); e.anim = 'walk'; e.frame = 0; e.atk = .9; e.atkDur = .9; e.hitDone = true; return true; }
    return false;
  }
  if (e.dunBoss && e.type === 'necro') {
    if (M.t1 <= 0) { M.t1 = 5.5; addTele({ shape: 'circle', x: tgt.x, y: tgt.y, r: 56, delay: 1.2, color: '125,255,154', owner: e, onFire: (t) => { bossAnim('spirit_green', t.x, t.y, { scale: 1.2, speed: 1.5 }); sfx.shadow(); if (inTele(t, P)) hurtPlayer(e.dmg * 1.4, e); } }); }
    return false;
  }
  return false;
}
let bossLineT = 0;
function showBossLine(e, line) { const el = $('bossline'); if (!el) return; el.textContent = `${e.E.name}: ${line}`; el.hidden = false; el.classList.remove('in'); void el.offsetWidth; el.classList.add('in'); clearTimeout(bossLineT); bossLineT = setTimeout(() => { el.hidden = true; }, 4200); }
function bossBarTick() {
  const bar = $('bossbar'); if (!bar) return;
  const b = ents.find((e) => e.kind === 'enemy' && e.E.boss && !e.dead && e.hp > 0 && e.state === 'chase' && dist(e, player) < 520);
  if (!b) { bar.hidden = true; return; }
  bar.hidden = false; $('bossName').textContent = b.E.name + (b.shielded ? ' — щит из имён' : b.vuln > 0 ? ' — оглушён' : '');
  $('bossFill').style.width = Math.max(0, 100 * b.hp / b.maxHp) + '%'; bar.classList.toggle('shield', !!b.shielded);
}
function enemyDmgMul(e) { let m = world.dark > .3 && UNDEAD.has(e.type) ? 1.15 : 1; for (const d of e.debuffs || []) for (const md of d.mods || []) if (md.stat === 'dmg%') m *= 1 + md.value; return m; }
function pickTarget(e) {
  if (e.taunt > 0 && !player.dead) return player;
  let best = player, bd = player.dead ? 1e9 : dist(e, player) + (SK.isInvis() ? 400 : 0);
  for (const a of ents) if (a.kind === 'ally' && a.taunt && a.hp > 0 && !a.dead && dist(e, a) < 220) return a;
  for (const a of ents) if (a.kind === 'ally' && a.hp > 0 && !a.dead) { const d = dist(e, a) + 20; if (d < bd) { bd = d; best = a; } }
  return best;
}
function enemyShoot(e) {
  const P = e.tgt || player, a = Math.atan2(P.y - e.y, P.x - e.x), E = e.E;
  const fire = (ang, kind, sp) => projs.push({ type: kind, x: e.x + Math.cos(ang) * 14, y: e.y - 22 * e.scale, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, dmg: e.dmg * enemyDmgMul(e), from: 'enemy', owner: e, t: 0, life: 2 });
  if (E.proj === 'arrow') { fire(a, 'earrow', 240); sfx.arrow(); }
  else if (E.proj === 'bone') { fire(a, 'bone', 170); sfx.cast(); }
  else if (E.proj === 'poison') { fire(a, 'poison', 160); sfx.cast(); }
  else if (E.proj === 'efire') { fire(a, 'efire', 190); sfx.cast(); }
  else if (E.proj === 'eice') { fire(a - .12, 'eice', 200); fire(a + .12, 'eice', 200); sfx.cast(); }
  else { for (const s of [-.3, 0, .3]) fire(a + s, 'orb', 160); sfx.cast(); }
}
let bossShown = {};
function bossIntro(e) { if (bossShown[e.type]) return; bossShown[e.type] = true; showZoneTitle(e.E.name, true); music.zone('boss'); }

// =====================================================================================
// Render
// =====================================================================================
const cv = $('game'), ctx = cv.getContext('2d');
const view = { w: 0, h: 0, scale: 2 };
let visibleProps = [];
const light = document.createElement('canvas'), lctx = light.getContext('2d');
function resize() {
  const dpr = Math.min(2, devicePixelRatio || 1), W = innerWidth, H = innerHeight;
  const target = Math.min(W, H) < 500 ? 300 : 380; // logical pixels on the short side, at least
  view.scale = Math.max(1, Math.floor(Math.min(W, H) * dpr / target));
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + 'px'; cv.style.height = H + 'px';
  view.w = Math.ceil(cv.width / view.scale); view.h = Math.ceil(cv.height / view.scale);
  light.width = view.w; light.height = view.h;
}
addEventListener('resize', resize);
function render() {
  const x = ctx, s = view.scale;
  x.setTransform(1, 0, 0, 1, 0, 0); x.imageSmoothingEnabled = false;
  x.fillStyle = '#0c0b10'; x.fillRect(0, 0, cv.width, cv.height);
  x.setTransform(s, 0, 0, s, 0, 0);
  const cx = Math.round(cam.x), cy = Math.round(cam.y);
  if (world.infinite && ART.ok) { const S0 = CS * T; for (let gy = Math.floor(cy / S0); gy <= Math.floor((cy + view.h) / S0); gy++) for (let gx = Math.floor(cx / S0); gx <= Math.floor((cx + view.w) / S0); gx++) x.drawImage(renderChunkGround(world, world.chunk(gx, gy), tileset), gx * S0 - cx, gy * S0 - cy); }
  else drawGround(x, world, tileset, { x: cx, y: cy }, view.w, view.h, now, ART.ok ? drawDungeonTile : null);
  x.translate(-cx, -cy);
  drawGroundLife(x, world, cx, cy, view.w, view.h, now); // вода и трава шевелятся
  // stairs and floor decals first
  const vis = (o, m = 80) => o.x > cx - m && o.x < cx + view.w + m && o.y > cy - m && o.y < cy + view.h + 120;
  const vprops = world.infinite ? world.propsInRect(cx - 300, cy - 300, cx + view.w + 300, cy + view.h + 300) : world.props; visibleProps = vprops;
  for (const p of vprops) if ((p.type === 'stairs_down' || p.type === 'stairs_up' || p.type === 'bones' || p.type === 'lily') && vis(p) && !p.noDraw) drawSwayed(x, p, now, () => drawPropLPC(x, p, now) || drawProp(x, p, now));
  SK.drawUnder(x, now);
  drawTele(x);
  if (STORY) for (const m of STORY.markers) { const a = .5 + Math.sin(now * 4 + m.i) * .3; x.fillStyle = `rgba(127,224,192,${a * .35})`; x.beginPath(); x.ellipse(m.x, m.y, 12, 6, 0, 0, 7); x.fill(); x.fillStyle = `rgba(200,255,235,${a})`; x.fillRect(m.x - 1, m.y - 16 - Math.sin(now * 3 + m.i) * 3, 2, 10); x.fillRect(m.x - 4, m.y - 12 - Math.sin(now * 3 + m.i) * 3, 8, 2); }
  for (const d of drops) drawDrop(x, d);
  const list = [];
  for (const p of vprops) if (p.type !== 'stairs_down' && p.type !== 'stairs_up' && p.type !== 'bones' && p.type !== 'lily' && vis(p, p.type === 'house' || p.type === 'tower' || p.type === 'mausoleum' || p.type === 'tent' ? 360 : 100)) list.push({ y: p.y, p });
  for (const e of ents) if (vis(e)) list.push({ y: e.y, e });
  list.sort((a, b) => a.y - b.y);
  for (const it of list) {
    if (it.p) drawSwayed(x, it.p, now, () => drawPropLPC(x, it.p, now) || drawProp(x, it.p, now));
    else drawEnt(x, it.e);
  }
  const biomeHere = world.infinite && player ? world.biomeAt(player.x, player.y) : null;
  drawSmoke(x, vprops, cx, cy, view.w, view.h, now, world.dark);
  drawAir(x, world, cx, cy, view.w, view.h, now, biomeHere, WEATHER.rain);
  SK.drawOver(x, now);
  drawReticle(x);
  for (const p of projs) drawProj(x, p);
  for (const f of fx) drawFx(x, f);
  x.setTransform(s, 0, 0, s, 0, 0);
  drawWeather(x, view.w, view.h, now);
  if (world.dark > .01) drawLight(cx, cy);
  drawFireflies(x, world, cx, cy, view.w, view.h, now, biomeHere);
  if (world.infinite) drawMinimap();
  // interaction hint
  const n = player && !player.dead && !modalOpen() ? nearestInteract() : null;
  $('hint').hidden = !n;
  if (n) $('hint').textContent = { fire: 'Отдохнуть у костра', marker: n.o.type === 'night' ? 'Ждать ночи' : n.o.type === 'wait' ? 'Ждать рассвета' : n.o.type === 'sacrifice' ? 'Отдать память' : 'Осмотреть', altar: 'Узел: память', node: 'Узел: память', npc: 'Говорить', door: 'Войти', chest: 'Открыть сундук', stairs: n.o.type === 'stairs_down' ? 'Спуститься' : 'Подняться', sign: 'Читать' }[n.kind];
}
function drawEnt(x, e) {
  const sc = e.scale || 1;
  x.fillStyle = 'rgba(0,0,0,.25)'; x.beginPath(); x.ellipse(e.x, e.y, 10 * sc, 3.5 * sc, 0, 0, 7); x.fill();
  if (e.kind === 'player' && e.inv > 0 && !e.dash && !(e.dodgeT > 0) && Math.floor(now * 20) % 2) x.globalAlpha = .45;
  if ((e.kind === 'enemy' || e.kind === 'ally') && e.dead) x.globalAlpha = Math.max(0, 1 - Math.max(0, e.dead - (e.kind === 'ally' ? .6 : 1.2)));
  const anim = e.dead ? 'hurt' : e.anim;
  const tf = e.kind === 'player' ? SK.playerTint() : e.tint ? { tint: e.tint, alpha: e.alpha } : null;
  if (e.kind === 'player' && SK.isInvis()) x.globalAlpha = .35;
  if (tf && tf.alpha) x.globalAlpha *= tf.alpha;
  if (e.kind === 'player' && e.dodgeT > 0) drawDodge(x, e, anim, sc);
  else breathe(x, e, now, () => e.look.draw(x, anim, e.dir, e.frame, e.x, e.y, sc));
  // стойка парирования: перед героем дуга клинка
  if (e.kind === 'player' && e.parry > 0) { const dv = DV[e.dir], a0 = Math.atan2(dv[1], dv[0]), p = e.parry / PARRY.win; x.lineWidth = 3; x.strokeStyle = `rgba(255,236,170,${.35 + .5 * p})`; x.beginPath(); x.arc(e.x, e.y - 22, 22, a0 - 1, a0 + 1); x.stroke(); x.lineWidth = 1; x.strokeStyle = `rgba(255,255,255,${.6 * p})`; x.beginPath(); x.arc(e.x, e.y - 22, 26, a0 - .8, a0 + .8); x.stroke(); }
  // замах врага: красный «!» над головой — пора отскочить или парировать
  if (e.kind === 'enemy' && e.atk > 0 && !e.hitDone && !e.dead && e.hp > 0 && !(e.stun > 0)) {
    const b = .55 + .45 * Math.sin(now * 28), hy = e.y - 50 * sc, mark = e.heavy ? '‼' : '!';
    if (e.heavy) { x.lineWidth = 2; x.strokeStyle = `rgba(255,50,30,${.35 + .4 * b})`; x.beginPath(); x.ellipse(e.x, e.y, 17 * sc, 6 * sc, 0, 0, 7); x.stroke(); x.lineWidth = 1; } // тяжёлый: земля под ним тлеет
    x.font = `bold ${e.heavy ? 17 : 15}px monospace`; x.fillStyle = 'rgba(20,8,8,.85)'; x.fillText(mark, e.x - (e.heavy ? 6 : 3), hy + 1); x.fillStyle = e.heavy ? `rgba(255,40,30,${b})` : `rgba(255,86,70,${b})`; x.fillText(mark, e.x - (e.heavy ? 7 : 4), hy);
  }
  // выносливость: маленькое кольцо у плеча, видно, пока не полное
  if (e.kind === 'player' && !e.dead && ((e.stam ?? STAM.max) < STAM.max || e.stamFlash > 0)) {
    const v = (e.stam ?? STAM.max) / STAM.max, cx0 = e.x + 15, cy0 = e.y - 46;
    x.lineWidth = 3; x.strokeStyle = 'rgba(10,8,6,.7)'; x.beginPath(); x.arc(cx0, cy0, 6, 0, 6.283); x.stroke();
    x.strokeStyle = e.stamFlash > 0 ? '#ff5a4a' : v * STAM.max < STAM.dodge ? '#e8a23a' : '#cfe86a'; x.beginPath(); x.arc(cx0, cy0, 6, -Math.PI / 2, -Math.PI / 2 + v * 6.283); x.stroke(); x.lineWidth = 1;
  }
  if (tf && tf.tint) { x.save(); x.globalAlpha = .35 * (tf.alpha || 1); x.globalCompositeOperation = 'source-atop'; x.restore(); tintDraw(x, e, anim, sc, tf.tint); }
  if (e.hurtT > 0) { x.globalAlpha = .55; x.globalCompositeOperation = 'lighter'; e.look.draw(x, anim, e.dir, e.frame, e.x, e.y, sc); x.globalCompositeOperation = 'source-over'; }
  x.globalAlpha = 1;
  if (e.freeze > 0) { x.fillStyle = 'rgba(150,220,255,.35)'; x.fillRect(Math.round(e.x - 12 * sc), Math.round(e.y - 44 * sc), Math.round(24 * sc), Math.round(44 * sc)); x.fillStyle = '#e8fbff'; for (const [a, b] of [[-10, -40], [8, -30], [-6, -14], [10, -8]]) x.fillRect(e.x + a * sc, e.y + b * sc, 2, 2); }
  if (e.burn > 0) { x.fillStyle = Math.floor(now * 12) % 2 ? '#ff7a1e' : '#ffd25a'; for (const [a, b] of [[-6, -30], [5, -22], [0, -40]]) x.fillRect(e.x + a * sc + Math.sin(now * 20 + a) * 2, e.y + b * sc - ((now * 30) % 6), 2, 3); }
  if (e.slow > 0 && !e.freeze) { x.fillStyle = '#8fd6ff'; x.fillRect(e.x - 8, e.y - 2, 2, 2); x.fillRect(e.x + 6, e.y - 1, 2, 2); }
  if (e.stun > 0) { x.fillStyle = '#ffd25a'; for (let i = 0; i < 3; i++) { const a = now * 6 + i * 2.1; x.fillRect(e.x + Math.cos(a) * 10, e.y - 50 * sc + Math.sin(a) * 3, 2, 2); } }
  if (e.kind === 'enemy' && !e.dead) SK.drawEnemyStatus(x, e, now);
  if (e.kind === 'enemy' && !e.dead && e.nameTag) { x.font = '8px monospace'; const tw = x.measureText(e.nameTag).width; x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(e.x - tw / 2 - 2, e.y - 66, tw + 4, 9); x.fillStyle = '#bfe8ff'; x.fillText(e.nameTag, e.x - tw / 2, e.y - 59); }
  if (e.kind === 'enemy' && e.shielded) { x.strokeStyle = `rgba(191,232,255,${.5 + Math.sin(now * 6) * .25})`; x.lineWidth = 2; x.beginPath(); x.ellipse(e.x, e.y - 30 * e.scale, 22 * e.scale, 36 * e.scale, 0, 0, 7); x.stroke(); }
  if (e.kind === 'player' && e.iceBlock > 0) { x.fillStyle = 'rgba(170,225,255,.45)'; x.fillRect(e.x - 13, e.y - 46, 26, 46); x.strokeStyle = '#e8fbff'; x.strokeRect(e.x - 13, e.y - 46, 26, 46); }
  if (e.kind === 'player' && e.shield > 0) { x.strokeStyle = `rgba(191,232,255,${.5 + Math.sin(now * 8) * .2})`; x.lineWidth = 2; x.beginPath(); x.ellipse(e.x, e.y - 22, 16, 26, 0, 0, 7); x.stroke(); }
  if (e.kind === 'player' && e.buff > 0) { x.fillStyle = 'rgba(255,210,90,.6)'; x.fillRect(e.x - 12 + ((now * 40) % 24), e.y - 4, 2, 2); }
  if (e.kind === 'ally' && !e.dead) { x.fillStyle = 'rgba(0,0,0,.6)'; x.fillRect(Math.round(e.x - 10), Math.round(e.y - 52), 20, 2); x.fillStyle = '#7dff9a'; x.fillRect(Math.round(e.x - 10), Math.round(e.y - 52), Math.max(0, 20 * e.hp / e.maxHp), 2); }
  if (e.kind === 'enemy' && !e.dead && e.hp < e.maxHp) {
    const w = e.E.boss ? 40 : 22; x.fillStyle = 'rgba(0,0,0,.6)'; x.fillRect(Math.round(e.x - w / 2), Math.round(e.y - 52 * sc), w, 3); x.fillStyle = e.E.boss ? '#c84af0' : '#e0464e'; x.fillRect(Math.round(e.x - w / 2), Math.round(e.y - 52 * sc), Math.max(0, w * e.hp / e.maxHp), 3);
  }
  if (e.kind === 'npc' && (e.v.quest && !e.v.quest.accepted || e.v.quest && e.v.quest.done && !e.v.quest.rewarded) && !e.v.role) { const b = Math.sin(now * 4) * 1.5; x.fillStyle = '#ffd25a'; x.font = 'bold 12px monospace'; x.fillText(e.v.quest.done ? '?' : '!', e.x - 3, e.y - 54 + b); }
  if (e.kind === 'npc' && e.storyId) { const mk = STORY.marks(e.storyId), b = Math.sin(now * 4) * 1.5; if (mk) { x.fillStyle = mk === '?' ? '#7fe0c0' : '#ffd25a'; x.font = 'bold 12px monospace'; x.fillText(mk, e.x - 3, e.y - 56 + b); } if (dist(e, player) < 90) { x.font = '8px monospace'; const nm = STORY.npcName(e.storyId), tw = x.measureText(nm).width; x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(e.x - tw / 2 - 2, e.y - 54, tw + 4, 9); x.fillStyle = '#f2e6c8'; x.fillText(nm, e.x - tw / 2, e.y - 47); } }
  if (false) { const cur = G.quests.find((q) => !q.rewarded); if (!cur && G.quests.length < MAIN_QUESTS.length || cur && cur.done) { const b = Math.sin(now * 4) * 1.5; x.fillStyle = '#ffd25a'; x.font = 'bold 12px monospace'; x.fillText(cur && cur.done ? '?' : '!', e.x - 3, e.y - 54 + b); } }
}
const tintCv = document.createElement('canvas'), tintX = tintCv.getContext('2d');
function tintDraw(x, e, anim, sc, color) {
  const S = 128; tintCv.width = S; tintCv.height = S; tintX.imageSmoothingEnabled = false; tintX.clearRect(0, 0, S, S);
  e.look.draw(tintX, anim, e.dir, e.frame, S / 2, S - 20, 1);
  tintX.globalCompositeOperation = 'source-atop'; tintX.fillStyle = color; tintX.globalAlpha = .45; tintX.fillRect(0, 0, S, S); tintX.globalAlpha = 1; tintX.globalCompositeOperation = 'source-over';
  x.save(); x.globalAlpha = Math.min(1, (e.alpha || 1)); x.translate(e.x, e.y); x.scale(sc, sc); x.drawImage(tintCv, -S / 2, -(S - 20)); x.restore();
}
function drawDrop(x, d) {
  const b = Math.sin((now + d.x) * 5) * 1.5;
  if (d.type === 'echo') { const a = .6 + Math.sin(now * 6 + d.x) * .3; x.fillStyle = `rgba(255,154,160,${a * .4})`; x.beginPath(); x.arc(d.x, d.y - 6 + b, 5, 0, 7); x.fill(); x.fillStyle = '#ffe0e2'; x.fillRect(d.x - 1, d.y - 7 + b, 2, 2); return; }
  if (d.type === 'imprint') { x.strokeStyle = '#b9a8d8'; x.lineWidth = 1; x.beginPath(); x.ellipse(d.x, d.y - 8 + b, 6, 8, 0, 0, 7); x.stroke(); x.fillStyle = 'rgba(185,168,216,.5)'; x.fill(); x.fillStyle = '#fff'; x.fillRect(d.x - 1, d.y - 10 + b, 2, 2); return; }
  if (d.type === 'skein') { x.fillStyle = 'rgba(255,106,112,.35)'; x.beginPath(); x.arc(d.x, d.y - 8 + b, 9, 0, 7); x.fill(); x.strokeStyle = '#ff9aa0'; for (let i = 0; i < 3; i++) { x.beginPath(); x.ellipse(d.x, d.y - 8 + b, 6, 3 + i, now + i, 0, 7); x.stroke(); } return; }
  if (d.type === 'item') { const col = d.item.rarity === 'unique' ? '#ff9a3a' : d.item.rarity === 'set' ? '#7fe07a' : d.item.rarity === 'magic' ? '#8ab4ff' : '#e8e2d4'; x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(d.x - 5, d.y - 2, 10, 3); x.fillStyle = col; x.fillRect(d.x - 4, d.y - 10 + b, 8, 8); x.fillStyle = '#1a1622'; x.fillRect(d.x - 2, d.y - 8 + b, 4, 4); x.fillStyle = col; x.globalAlpha = .4 + Math.sin(now * 5) * .2; x.fillRect(d.x - 1, d.y - 24 + b, 2, 14); x.globalAlpha = 1; return; }
  if (d.type === 'gold') { x.fillStyle = '#b8860b'; x.fillRect(d.x - 3, d.y - 5 + b, 6, 6); x.fillStyle = '#ffd25a'; x.fillRect(d.x - 2, d.y - 4 + b, 4, 4); }
  else { x.fillStyle = POTIONS[d.type].color; x.fillRect(d.x - 3, d.y - 8 + b, 6, 7); x.fillStyle = '#e8e2d4'; x.fillRect(d.x - 1, d.y - 11 + b, 2, 3); }
}
function drawProj(x, p) {
  if (p.type !== 'arrow' && p.type !== 'earrow' && p.type !== 'arrow_heavy' && p.type !== 'net' && drawProjSprite(x, p, now)) return;
  const a = Math.atan2(p.vy, p.vx);
  x.save(); x.translate(p.x, p.y); x.rotate(a);
  if (p.type === 'arrow' || p.type === 'earrow') { x.fillStyle = '#6a4a2a'; x.fillRect(-9, -1, 14, 2); x.fillStyle = '#d6d9e0'; x.fillRect(5, -2, 4, 4); x.fillStyle = p.type === 'earrow' ? '#c44' : '#e8e2d4'; x.fillRect(-11, -2, 3, 4); }
  else if (p.type === 'fire' || p.type === 'efire') { x.fillStyle = 'rgba(255,120,40,.35)'; x.fillRect(-16, -3, 14, 6); x.fillStyle = '#ff7a1e'; x.beginPath(); x.arc(0, 0, 6, 0, 7); x.fill(); x.fillStyle = '#ffd25a'; x.beginPath(); x.arc(1, 0, 3, 0, 7); x.fill(); }
  else if (p.type === 'ice' || p.type === 'eice') { x.fillStyle = 'rgba(191,232,255,.35)'; x.fillRect(-14, -2, 12, 4); x.fillStyle = '#8fd6ff'; x.beginPath(); x.moveTo(8, 0); x.lineTo(0, -4); x.lineTo(-6, 0); x.lineTo(0, 4); x.fill(); x.fillStyle = '#ffffff'; x.fillRect(0, -1, 4, 2); }
  else if (p.type === 'shadow') { x.fillStyle = 'rgba(125,255,154,.25)'; x.fillRect(-16, -3, 14, 6); x.fillStyle = '#2a1238'; x.beginPath(); x.arc(0, 0, 6, 0, 7); x.fill(); x.strokeStyle = '#7dff9a'; x.lineWidth = 1.5; x.stroke(); }
  else if (p.type === 'holy') { x.fillStyle = 'rgba(255,242,168,.4)'; x.fillRect(-18, -2, 16, 4); x.fillStyle = '#fff2a8'; x.beginPath(); x.arc(0, 0, 5, 0, 7); x.fill(); x.fillStyle = '#ffffff'; x.fillRect(-1, -4, 2, 8); x.fillRect(-4, -1, 8, 2); }
  else if (p.type === 'poison') { x.fillStyle = '#6fd83a'; x.beginPath(); x.arc(0, 0, 5, 0, 7); x.fill(); x.fillStyle = '#d8ffb0'; x.fillRect(-1, -2, 3, 3); }
  else if (p.type === 'bolt') { x.fillStyle = '#7fd6ff'; x.beginPath(); x.arc(0, 0, 5, 0, 7); x.fill(); x.fillStyle = '#e8fbff'; x.beginPath(); x.arc(1, 0, 2.5, 0, 7); x.fill(); x.fillStyle = 'rgba(127,214,255,.35)'; x.fillRect(-14, -2, 12, 4); }
  else if (p.type === 'bone') { x.fillStyle = '#9be36a'; x.beginPath(); x.arc(0, 0, 5, 0, 7); x.fill(); x.fillStyle = '#e8ffd8'; x.fillRect(-2, -1, 4, 2); }
  else { x.fillStyle = '#b56cff'; x.beginPath(); x.arc(0, 0, 6, 0, 7); x.fill(); x.fillStyle = '#f2e0ff'; x.beginPath(); x.arc(0, 0, 2.5, 0, 7); x.fill(); }
  x.restore();
}
function drawDodge(x, e, anim, sc) {
  // отскок: шлейф бледных копий, прыжок по дуге, сжатие на толчке и приземлении, наклон в сторону рывка
  const k = 1 - e.dodgeT / DODGE.dur, hop = Math.sin(k * Math.PI) * 11, tr = e.trail || [];
  for (let i = 0; i < tr.length; i++) { x.globalAlpha = .07 + .06 * i; e.look.draw(x, anim, e.dir, 0, tr[i][0], tr[i][1] - hop * .6, sc); }
  x.globalAlpha = 1;
  const sy = k < .18 ? .86 : k > .82 ? .9 : 1.05, lean = -Math.cos(e.dodgeAng) * .2 * Math.sin(k * Math.PI);
  x.save(); x.translate(e.x, e.y - hop); x.transform(1 / sy, 0, lean, sy, 0, 0); x.translate(-e.x, -e.y);
  e.look.draw(x, anim, e.dir, 1 + Math.floor(k * 7) % 8, e.x, e.y, sc); x.restore();
}
function drawFx(x, f) {
  const k = f.t / f.life;
  if (f.type === 'dust') { const n = f.small ? 4 : 6; for (let i = 0; i < n; i++) { const a = i / n * 6.283 + f.x, r = (f.small ? 6 : 9) + k * (f.small ? 10 : 16); x.fillStyle = `rgba(205,195,172,${.45 * (1 - k)})`; x.beginPath(); x.arc(f.x + Math.cos(a) * r, f.y - 2 + Math.sin(a) * r * .4 - k * 4, (f.small ? 2 : 3) * (1 - k * .5), 0, 6.283); x.fill(); } return; }
  if (f.type === 'parry') { const a = 1 - k; x.lineWidth = 2; x.strokeStyle = `rgba(255,240,180,${a})`; for (let i = 0; i < 8; i++) { const an = i / 8 * 6.283 + f.a, r0 = 3 + k * 8, r1 = 10 + k * 22; x.beginPath(); x.moveTo(f.x + Math.cos(an) * r0, f.y + Math.sin(an) * r0); x.lineTo(f.x + Math.cos(an) * r1, f.y + Math.sin(an) * r1); x.stroke(); } x.strokeStyle = `rgba(255,255,255,${a * .8})`; x.beginPath(); x.arc(f.x, f.y, 6 + k * 26, 0, 6.283); x.stroke(); x.lineWidth = 1; x.fillStyle = `rgba(255,255,230,${a})`; x.fillRect(f.x - 2, f.y - 2, 4, 4); return; }
  if (f.type === 'anim') { drawVfx(x, f); return; }
  if (f.type === 'num') { x.font = `bold ${f.crit ? 12 : f.small ? 7 : 9}px monospace`; x.fillStyle = f.gold ? '#ffe08a' : f.heal ? '#7fe07a' : f.hurt ? '#ff6a6a' : f.crit ? '#ffd25a' : { fire: '#ffa24a', ice: '#bfe8ff', shadow: '#9dffb0', holy: '#fff2a8', memory: '#ff9aa0' }[f.school] || '#ffffff'; x.strokeStyle = '#000'; x.lineWidth = 2; const y = f.y - k * 18; x.strokeText(f.text, f.x - 6, y); x.fillText(f.text, f.x - 6, y); }
  else if (f.type === 'cone') { const a = 1 - k; if (f.beam) { x.strokeStyle = f.color; x.globalAlpha = .7 * a; x.lineWidth = 6; x.beginPath(); x.moveTo(f.x, f.y); x.lineTo(f.x + Math.cos(f.a) * f.r, f.y + Math.sin(f.a) * f.r); x.stroke(); x.strokeStyle = '#ffffff'; x.lineWidth = 2; x.stroke(); x.globalAlpha = 1; } else { x.fillStyle = f.color; x.globalAlpha = .28 * a; x.beginPath(); x.moveTo(f.x, f.y); x.arc(f.x, f.y, f.r * (.6 + k * .4), f.a - f.arc, f.a + f.arc); x.closePath(); x.fill(); x.globalAlpha = 1; } }
  else if (f.type === 'thread') { const burn = Math.min(1, k * 1.4), len = 70; x.lineWidth = 1.5; for (let i = 0; i < 24; i++) { const a = i / 24, b = (i + 1) / 24; if (a < burn) continue; x.strokeStyle = f.color; x.globalAlpha = .9; x.beginPath(); x.moveTo(f.x + Math.sin(now * 6 + a * 12) * 4, f.y - a * len); x.lineTo(f.x + Math.sin(now * 6 + b * 12) * 4, f.y - b * len); x.stroke(); } const by = f.y - burn * len; x.globalAlpha = 1 - k; x.fillStyle = '#ffd25a'; for (let i = 0; i < 5; i++) x.fillRect(f.x + Math.sin(now * 20 + i) * 5, by - i * 3 - (now * 30 % 6), 2, 2); x.globalAlpha = 1; }
  else if (f.type === 'beam') { x.strokeStyle = f.color || '#ffffff'; x.globalAlpha = .8 * (1 - k); x.lineWidth = 3; x.beginPath(); x.moveTo(f.x, f.y); const mx2 = (f.x + f.tx) / 2 + Math.sin(now * 40) * 4, my2 = (f.y + f.ty) / 2 + Math.cos(now * 37) * 4; x.quadraticCurveTo(mx2, my2, f.tx, f.ty); x.stroke(); x.strokeStyle = '#ffffff'; x.lineWidth = 1; x.stroke(); x.globalAlpha = 1; }
  else if (f.type === 'slash') { x.strokeStyle = `rgba(255,255,255,${.85 * (1 - k)})`; x.lineWidth = f.big ? 4 : 3; x.beginPath(); x.arc(f.x - Math.cos(f.a) * 12, f.y - Math.sin(f.a) * 8, f.r, f.a - 1.1 + k * .6, f.a + 1.1 - k * .3); x.stroke(); if (f.big) { x.strokeStyle = `rgba(255,210,90,${.6 * (1 - k)})`; x.lineWidth = 2; x.stroke(); } }
  else if (f.type === 'afterimage') { x.globalAlpha = .35 * (1 - k); player.look.draw(x, player.anim, player.dir, player.frame, f.x, f.y, 1); x.globalAlpha = 1; }
  else if (f.type === 'arc') { x.strokeStyle = `rgba(255,255,255,${.7 * (1 - k)})`; x.lineWidth = 3; x.beginPath(); const a = { up: -Math.PI / 2, down: Math.PI / 2, left: Math.PI, right: 0 }[f.dir]; x.arc(f.x - DV[f.dir][0] * 14, f.y - DV[f.dir][1] * 10, 20, a - 1 + k, a + 1 - k * .2); x.stroke(); }
  else if (f.type === 'nova') { x.strokeStyle = `rgba(255,140,40,${1 - k})`; x.lineWidth = 6 * (1 - k) + 1; x.beginPath(); x.ellipse(f.x, f.y + 10, 95 * k, 60 * k, 0, 0, 7); x.stroke(); x.fillStyle = `rgba(255,200,80,${.25 * (1 - k)})`; x.fill(); }
  else if (f.type === 'sparkle') { x.fillStyle = f.color; for (let i = 0; i < 8; i++) { const a = i * .785 + k * 2, r = 6 + k * 16; x.globalAlpha = 1 - k; x.fillRect(f.x + Math.cos(a) * r, f.y + Math.sin(a) * r - k * 10, 2, 2); } x.globalAlpha = 1; }
  else if (f.type === 'ring') { x.strokeStyle = f.color; x.globalAlpha = 1 - k; x.lineWidth = 3; x.beginPath(); x.ellipse(f.x, f.y + 8, (f.r || 60) * (.3 + k * .7), (f.r || 60) * (.3 + k * .7) * .55, 0, 0, 7); x.stroke(); x.globalAlpha = 1; }
  else if (f.type === 'boom') { x.fillStyle = `rgba(${f.color},${.55 * (1 - k)})`; x.beginPath(); x.ellipse(f.x, f.y, f.r * (.4 + k * .6), f.r * (.4 + k * .6) * .6, 0, 0, 7); x.fill(); x.fillStyle = `rgba(255,230,140,${.8 * (1 - k)})`; x.beginPath(); x.ellipse(f.x, f.y, f.r * .4 * (1 - k * .5), f.r * .25, 0, 0, 7); x.fill(); }
  else if (f.type === 'frost') { x.strokeStyle = `rgba(191,232,255,${1 - k})`; x.lineWidth = 4 * (1 - k) + 1; x.beginPath(); x.ellipse(f.x, f.y + 10, 100 * k, 62 * k, 0, 0, 7); x.stroke(); x.fillStyle = `rgba(150,220,255,${.25 * (1 - k)})`; x.fill(); x.fillStyle = '#ffffff'; for (let i = 0; i < 12; i++) { const a = i * .52; x.fillRect(f.x + Math.cos(a) * 90 * k, f.y + 10 + Math.sin(a) * 55 * k, 2, 2); } }
  else if (f.type === 'meteor') { const h = (1 - k) * 160; x.fillStyle = `rgba(0,0,0,${.15 + k * .25})`; x.beginPath(); x.ellipse(f.x, f.y, 30 + k * 40, 10 + k * 14, 0, 0, 7); x.fill(); x.fillStyle = 'rgba(255,140,40,.4)'; x.fillRect(f.x + h * .5 - 4, f.y - h - 40, 8, 40); x.fillStyle = '#ff7a1e'; x.beginPath(); x.arc(f.x + h * .5, f.y - h, 9, 0, 7); x.fill(); x.fillStyle = '#ffd25a'; x.beginPath(); x.arc(f.x + h * .5, f.y - h, 4, 0, 7); x.fill(); }
  else if (f.type === 'pillar') { const a = k < .4 ? k / .4 : 1 - (k - .4) / .6; x.fillStyle = f.color ? f.color + '88' : `rgba(255,242,168,${.55 * a})`; if (f.color) x.globalAlpha = a; x.fillRect(f.x - 18, f.y - 200, 36, 200); x.fillStyle = `rgba(255,255,255,${.7 * a})`; x.fillRect(f.x - 6, f.y - 200, 12, 200); x.strokeStyle = `rgba(255,242,168,${a})`; x.lineWidth = 2; x.beginPath(); x.ellipse(f.x, f.y, 60, 22, 0, 0, 7); x.stroke(); x.globalAlpha = 1; }
  else if (f.type === 'rain') { x.fillStyle = 'rgba(0,0,0,.18)'; x.beginPath(); x.ellipse(f.x, f.y, 64, 24, 0, 0, 7); x.fill(); x.fillStyle = '#e8e2d4'; for (let i = 0; i < 14; i++) { const ax = f.x + Math.sin(i * 7.1) * 56, ay = f.y + Math.cos(i * 3.7) * 20 - ((now * 400 + i * 37) % 120); x.fillRect(ax, ay, 1, 10); } }
  else if (f.type === 'drain') { const tx = f.tx.x, ty = f.tx.y - 20; x.fillStyle = '#7dff9a'; for (let i = 0; i < 5; i++) { const q = Math.min(1, k + i * .08); x.globalAlpha = 1 - i * .18; x.fillRect(f.x + (tx - f.x) * q - 1, f.y + (ty - f.y) * q - 1, 3, 3); } x.globalAlpha = 1; }
  else if (f.type === 'level') { x.strokeStyle = `rgba(255,210,90,${1 - k})`; x.lineWidth = 2; for (let i = 0; i < 3; i++) { x.beginPath(); x.ellipse(f.x, f.y - i * 14 * k, 16 + k * 10, 6, 0, 0, 7); x.stroke(); } x.font = 'bold 10px monospace'; x.fillStyle = `rgba(255,210,90,${1 - k})`; x.fillText('УРОВЕНЬ!', f.x - 24, f.y - 60 - k * 12); }
}
function drawLight(cx, cy) {
  const l = lctx; l.globalCompositeOperation = 'source-over'; l.clearRect(0, 0, light.width, light.height);
  l.fillStyle = `rgba(6,5,14,${world.dark})`; l.fillRect(0, 0, light.width, light.height);
  l.globalCompositeOperation = 'destination-out';
  const hole = (x, y, r, a = 1) => { const g = l.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(1, 'rgba(0,0,0,0)'); l.fillStyle = g; l.fillRect(x - r, y - r, r * 2, r * 2); };
  hole(player.x - cx, player.y - 20 - cy, world.infinite ? 200 : 150, 1);
  for (const p of visibleProps) if (p.type === 'torch' || p.type === 'campfire' || p.type === 'lamppost') hole(p.x - cx, p.y - 26 - cy, 90 + Math.sin(now * 9 + p.x) * 4, .9);
  for (const p of projs) if (p.type !== 'arrow' && p.type !== 'earrow') hole(p.x - cx, p.y - cy, 46, .85);
  for (const f of fx) if (f.type === 'boom' || f.type === 'pillar' || f.type === 'frost' || f.type === 'meteor') hole(f.x - cx, f.y - 20 - cy, 110, .8);
  for (const f of fx) if (f.type === 'nova') hole(f.x - cx, f.y - cy, 120, .8);
  for (const f of fx) if (f.type === 'anim' && /fire|flam|lightning|holy|spirit|ice/.test(f.key)) hole(f.x - cx, f.y - 20 - cy, 90, .75);
  ctx.drawImage(light, 0, 0);
  // warm glow on top
  ctx.globalCompositeOperation = 'lighter';
  for (const p of visibleProps) if (p.type === 'torch' || p.type === 'campfire' || p.type === 'lamppost') { const X = p.x - cx, Y = p.y - 26 - cy; if (X < -60 || Y < -60 || X > view.w + 60 || Y > view.h + 60) continue; const g = ctx.createRadialGradient(X, Y, 0, X, Y, 60); g.addColorStop(0, 'rgba(255,140,40,.18)'); g.addColorStop(1, 'rgba(255,140,40,0)'); ctx.fillStyle = g; ctx.fillRect(X - 60, Y - 60, 120, 120); }
  ctx.globalCompositeOperation = 'source-over';
}

// =====================================================================================
// HUD, toasts, modals
// =====================================================================================
let miniBig = false, miniT = 0;
function drawMinimap() {
  const cvm = $('minimap'); if (!cvm) return;
  miniT -= 1; if (miniT > 0) return; miniT = 6;
  const S = miniBig ? 220 : 120, scale = miniBig ? .5 : 1; // px per tile
  if (cvm.width !== S) { cvm.width = S; cvm.height = S; }
  const m = cvm.getContext('2d'); m.imageSmoothingEnabled = false; m.fillStyle = '#0c0b10'; m.fillRect(0, 0, S, S);
  const ptx = player.x / T, pty = player.y / T, half = S / 2 / scale;
  for (let cy = Math.floor((pty - half) / CS); cy <= Math.floor((pty + half) / CS); cy++) for (let cx = Math.floor((ptx - half) / CS); cx <= Math.floor((ptx + half) / CS); cx++) {
    const key = cx + ',' + cy; if (!world.seen.has(key)) continue;
    m.drawImage(chunkMinimap(world.chunk(cx, cy)), Math.round((cx * CS - ptx) * scale + S / 2), Math.round((cy * CS - pty) * scale + S / 2), CS * scale, CS * scale);
  }
  m.font = `${miniBig ? 11 : 10}px sans-serif`; m.textAlign = 'center'; m.textBaseline = 'middle';
  for (const f of Object.values(G.found || {})) { const X = (f.x - ptx) * scale + S / 2, Y = (f.y - pty) * scale + S / 2; if (X < 0 || Y < 0 || X > S || Y > S) continue; m.fillStyle = 'rgba(0,0,0,.6)'; m.fillRect(X - 6, Y - 6, 12, 12); m.fillStyle = f.t === 'village' ? '#ffd25a' : f.t === 'shrine' ? '#bfe8ff' : '#ff8a80'; m.fillText(STRUCT_ICON[f.t] || '•', X, Y + 1); }
  // quest target
  const tg = STORY && STORY.target(), target = tg ? [tg.pos[0] / T, tg.pos[1] / T] : null;
  if (target) { let X = (target[0] - ptx) * scale + S / 2, Y = (target[1] - pty) * scale + S / 2; const inside = X > 6 && Y > 6 && X < S - 6 && Y < S - 6; if (!inside) { const a = Math.atan2(Y - S / 2, X - S / 2); X = S / 2 + Math.cos(a) * (S / 2 - 8); Y = S / 2 + Math.sin(a) * (S / 2 - 8); } m.fillStyle = '#ffd25a'; m.beginPath(); m.arc(X, Y, inside ? 4 : 3, 0, 7); m.fill(); m.strokeStyle = '#000'; m.lineWidth = 1; m.stroke(); }
  m.fillStyle = '#ffffff'; m.fillRect(S / 2 - 2, S / 2 - 2, 4, 4); m.strokeStyle = '#000'; m.strokeRect(S / 2 - 2.5, S / 2 - 2.5, 5, 5);
  if (world.dark > .15) { m.fillStyle = `rgba(6,5,20,${world.dark * .6})`; m.fillRect(0, 0, S, S); }
}
let hudKey = '';
let hudHpLast = Infinity; const hudCd = [-1, -1];
function updateHUD() { hudKey = ''; hudTick(); }
const KEYS4 = ['K', 'L', 'U', 'I'];
const ICON_IDX = {"meteor":29,"nova":13,"fire_ring":13,"incinerate":11,"fire_wall":22,"fire_dart":12,"blast":12,"flame_shield":28,"flame_step":17,"frostnova":41,"ice_prison":31,"blizzard":39,"absolute_zero":42,"ice_lance":0,"shard_burst":42,"break":36,"barrier":37,"snow_double":16,"ice_block":28,"raise":6,"raise_archer":6,"bone_golem":7,"corpse_blast":7,"harvest":27,"siphon":27,"rot":1,"black_harvest":8,"pull_memory":30,"terror":5,"borrow_flesh":23,"heal":18,"renew":35,"holy_ground":25,"miracle":24,"smite":21,"judgement_day":20,"ray":40,"faith_hammer":20,"faith_shield":37,"vow":4,"holy_word":19,"shield_bash":3,"shield_wall":37,"challenge":23,"dash":17,"whirlwind":43,"cry":34,"red_veil":34,"cleave":44,"parry":3,"execute":8,"thousand_cuts":44,"aimed_shot":15,"disengage":17,"heart_shot":15,"fan":44,"rain":39,"snare":10,"arrow_storm":39,"prey_mark":2,"beast_call":23,"net":10,"the_hunt":17,"tug":10,"bind_fates":5,"cocoon":31,"canvas":9,"stitch":17,"unravel":27,"hidden_seam":16,"thousand_stitches":43,"memory_knot":30,"weave_echo":35,"unpick_time":38,"reweave":0,"blood_swing":34,"blank_stare":2,"void_hunger":27,"nobody":16,"erase":5,"lapse_leap":17,"blank_spot":38,"eat_echo":14,"echo_strike":3,"self_ghost":23,"echo_choir":30,"cut_thread":10,"foreign_gait":17,"nameless_cry":5};
const SCHOOL_ICON = { fire: 12, ice: 41, shadow: 15, holy: 20, memory: 34, phys: 43 };
function iconStyle(n, px) { const i = n ? ICON_IDX[n.id] ?? SCHOOL_ICON[(n.effects.find((e) => e.school) || {}).school || 'phys'] ?? 43 : -1; if (i < 0) return ''; const k = px / 40; return `background-image:url(icons/spells.png);background-size:${360 * k}px auto;background-position:${-(i % 9) * px}px ${-Math.floor(i / 9) * px}px;background-repeat:no-repeat`; }
let skillHudT = 0;
function skillHud() {
  if ((skillHudT -= 1) > 0) return; skillHudT = 4;
  const bar = $('skillbar'), touchB = ['bSkill', 'bSkill2', 'bSkill3', 'bSkill4'];
  if (bar.children.length !== 4) { bar.innerHTML = KEYS4.map((k, i) => `<div class="slot" data-slot="${i}"><kbd>${k}</kbd><b></b><small></small><i></i></div>`).join(''); bar.onclick = (e) => { const sl = e.target.closest('.slot'); if (sl) useSkill(+sl.dataset.slot); }; }
  for (let i = 0; i < 4; i++) {
    const id = G.slots[i], n = id && SK.node(G.cls, id), open = SK.slotOpen(G, i), el = bar.children[i], tb = $(touchB[i]);
    const cdl = n ? SK.cdLeft(id) : 0, cdTot = n ? n.cd : 1, can = n && !SK.canPay(G, n, true) === false ? true : n && SK.canPay(G, n, true) === null;
    const school = n ? (n.effects.find((e) => e.school) || {}).school || CLS().school || 'phys' : '';
    const label = n ? n.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() : open ? '·' : '🔒';
    for (const node of [el, tb]) { if (!node) continue; node.dataset.school = school; const ic = n ? iconStyle(n, node === el ? 40 : 36) : ''; if (node.dataset.ic !== (n ? n.id : '')) { node.dataset.ic = n ? n.id : ''; node.style.cssText = ''; if (ic) { node.style.cssText = ic; node.style.backgroundPosition = node.style.backgroundPosition; } node.classList.toggle('hasicon', !!ic); } node.classList.toggle('dim', !!n && (!can || cdl > 0)); node.classList.toggle('empty', !n); node.classList.toggle('lock', !open);
      const b = node.querySelector('b') || node.appendChild(document.createElement('b')); b.textContent = cdl > 0 ? Math.ceil(cdl) : n ? '' : label;
      const ii = node.querySelector('i') || node.appendChild(document.createElement('i')); ii.style.height = (cdl > 0 ? 100 * cdl / cdTot : 0) + '%'; node.title = n ? `${n.name} — ${n.desc}` : open ? 'Пустая ячейка: назначьте навык в меню «Навыки»' : `Откроется на ${SK.slotOpen ? [1, 3, 6, 12][i] : ''}-м уровне`; }
    const sm = el.querySelector('small'); if (sm) sm.textContent = n && n.cost ? costText(n.cost) : '';
  }
}
function costText(c) { const p = []; if (c.mp) p.push(c.mp); if (c.rage) p.push(c.rage + 'я'); if (c.focus) p.push(c.focus + 'с'); if (c.faith) p.push(c.faith === 'all' ? 'вся в.' : c.faith + 'в'); if (c.corpse) p.push(c.corpse + '☠'); if (c.echo) p.push(c.echo + '✶'); if (c.hp) p.push(Math.round(c.hp * 100) + '%♥'); return p.join(' '); }
function hudTick() {
  if (!G || !player) return;
  $('minimap').hidden = !world.infinite;
  if (lock) $('targetBar').style.width = Math.max(0, 100 * lock.hp / lock.maxHp) + '%';
  const ds = player.ds, ri = SK.resInfo(G);
  $('resWrap').dataset.r = ri.id; $('resWrap').classList.toggle('hot', !!ri.over); $('resWrap').classList.toggle('full', !!(ri.boiling || ri.consecrated));
  $('resBar').style.width = Math.min(100, 100 * ri.value / Math.max(1, ri.max)) + '%'; $('resTxt').textContent = `${ri.name} ${Math.floor(ri.value)}${ri.enemy || ri.id === 'corpse' ? '' : ' / ' + ri.max}`;
  skillHud();
  // отскок и парирование: затенение на время перезарядки
  const dc = player.dodgeCd || 0, pc = player.parryCd || 0;
  if (dc !== hudCd[0] || pc !== hudCd[1]) { hudCd[0] = dc; hudCd[1] = pc; $('aDodge').lastChild.style.height = (100 * dc / (DODGE.dur + DODGE.cd)) + '%'; $('aParry').lastChild.style.height = (100 * pc / (PARRY.win + PARRY.cd)) + '%'; $('bDodge').classList.toggle('dim', dc > 0); $('bParry').classList.toggle('dim', pc > 0); }
  const k = [Math.ceil(player.hp), Math.floor(player.mp), G.cls, G.gold, G.xp, G.lvl, G.potions.hp, G.potions.mp, G.echoes, activeQuests().map((q) => (q.progress || 0) + (q.done ? 'd' : '')).join()].join('|');
  if (k === hudKey) return; hudKey = k;
  const hpPct = Math.max(0, 100 * player.hp / ds.maxHp) + '%';
  $('hpBar').style.width = hpPct; $('hpLag').style.width = hpPct; $('hpTxt').textContent = `${Math.ceil(player.hp)} / ${ds.maxHp}`;
  // деления нити: на малом здоровье — по одному на единицу, дальше — по пять
  $('hpSeg').style.setProperty('--seg', (100 / (ds.maxHp <= 30 ? ds.maxHp : Math.ceil(ds.maxHp / 5))) + '%');
  if (player.hp < hudHpLast) { const h = $('hud'); h.classList.remove('hit'); void h.offsetWidth; h.classList.add('hit'); }
  hudHpLast = player.hp; $('lowhp').classList.toggle('on', !player.dead && player.hp / ds.maxHp <= .3);
  $('mpBar').style.width = (100 * player.mp / ds.maxMp) + '%'; $('mpTxt').textContent = `${Math.floor(player.mp)} / ${ds.maxMp}`;
  $('mpBar').parentElement.hidden = !usesMana(G.cls);
  $('xpBar').style.width = (100 * G.xp / xpNeed(G.lvl)) + '%';
  $('lvl').textContent = G.lvl; $('gold').textContent = G.gold; $('pHp').textContent = G.potions.hp; $('pMp').textContent = G.potions.mp; $('echoes').textContent = Math.floor(G.echoes || 0);
  $('heroName').textContent = heroName();
  memoryHud();
  const st = STORY ? STORY.activeSteps().filter(({ q, a }) => !(q.hidden && a.step === q.steps[0].id)).sort((a, b) => (a.q.chain === 'main' ? -1 : 1)).slice(0, 3) : [];
  const qs = activeQuests().filter((q) => !q.rewarded).slice(0, Math.max(0, 3 - st.length));
  $('quests').innerHTML = st.map(({ q, s, a }) => `<li class="${q.chain === 'main' ? 'main' : ''}">${GEN.esc(q.title)}<small>${GEN.esc(s.text)}${s.count > 1 && a.counter ? ` (${a.counter}/${s.count})` : ''}</small></li>`).join('') + qs.map((q) => `<li class="${q.done ? 'done' : ''}">${GEN.esc(q.title)}<small>${q.done ? 'выполнено — вернитесь за наградой' : q.type === 'kill' ? `${q.progress || 0} / ${q.count}` : q.type === 'fetch' ? 'найти в сундуке' : 'дойти'}</small></li>`).join('');
}
let toastT = 0;
function toast(msg, ms = 1800) { const t = $('toast'); t.textContent = msg; t.hidden = false; t.classList.remove('in'); void t.offsetWidth; t.classList.add('in'); clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, ms); }
let zoneT = 0;
function showZoneTitle(name, boss) { const z = $('zone'); z.textContent = name; z.className = boss ? 'boss' : ''; z.hidden = false; void z.offsetWidth; z.classList.add('in'); clearTimeout(zoneT); zoneT = setTimeout(() => { z.hidden = true; }, 2200); }
let modalHandlers = {}, onModalClose = null;
const modalOpen = () => !$('modal').hidden;
function modal(html, onClose, after) {
  $('modalBody').innerHTML = html; $('modal').hidden = false; paused = true; onModalClose = onClose || null;
  if (after) after();
  const first = $('modalBody').querySelector('button'); if (first) first.focus({ preventScroll: true });
}
function closeModal() { $('modal').hidden = true; paused = false; const f = onModalClose; onModalClose = null; modalHandlers = {}; if (f) f(); }
$('modalBody').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return; sfx.ui();
  if (b.hasAttribute('data-close')) return closeModal();
  const h = modalHandlers[b.dataset.a]; if (h) h();
});

let STORY = null;
function questsHtml() {
  if (STORY) { const rows = STORY.journalRows(); const act = rows.filter((r) => r.active), done = rows.filter((r) => r.done); const nx = STORY.nextMain(); let h = act.length ? `<ul class="qlist">${act.map(({ q, s }) => `<li class="${q.chain === 'main' ? 'main' : ''}"><b>${GEN.esc(q.title)}</b><span>${GEN.esc(q.summary)}</span><small>Сейчас: ${GEN.esc(s.text)}</small></li>`).join('')}</ul>` : `<p class="aside">Сейчас нет начатых историй.${nx ? ` Следующую главную расскажет ${GEN.esc(STORY.npcName(STORY.qById[nx].giver))}.` : ''}</p>`; const failed = rows.filter((r) => r.failed); if (failed.length) h += `<p class="aside">Не сложилось:</p><ul class="qlist">${failed.map(({ q }) => `<li class="done"><b>${GEN.esc(q.title)}</b><span>${GEN.esc((q.fail && q.fail.text) || 'Время ушло.')}</span></li>`).join('')}</ul>`; h = `<p class="aside">Глава ${WS.chapter(G)}${CHAPTER_INFO(WS.chapter(G)).title ? ' — «' + GEN.esc(CHAPTER_INFO(WS.chapter(G)).title) + '»' : ''}. День ${MEM.dayOf(G) + 1}.</p>` + h; if (done.length) h += `<p class="aside">Завершено:</p><ul class="qlist">${done.map(({ q, o }) => `<li class="done"><b>${GEN.esc(q.title)}</b><span>${(G.memory.sacrificed || []).some((x) => x.id === 'q_' + q.id) ? '〰〰〰 (ты это забыл)' : GEN.esc(o ? o.text : '')}</span></li>`).join('')}</ul>`; const old = activeQuests().filter((q) => !q.rewarded); if (old.length) h += `<p class="aside">Поручения жителей:</p><ul class="qlist">${old.map((q) => `<li class="${q.done ? 'done' : ''}"><b>${GEN.esc(q.title)}</b><small>${q.done ? 'выполнено — вернитесь за наградой' : q.type === 'kill' ? `${q.progress || 0} из ${q.count}` : 'найти в сундуке'}</small></li>`).join('')}</ul>`; return h + `<p class="aside">Убито врагов: ${G.stats.kills}. Падений: ${G.stats.deaths}.</p>`; }
  const qs = activeQuests(); let body = qs.length ? `<ul class="qlist">${qs.map((q) => `<li class="${q.done ? 'done' : ''}"><b>${GEN.esc(q.title)}</b><span>${GEN.esc(q.text || (q.type === 'kill' ? `Убить ${q.count}: ${q.plural}.` : `Найти «${q.relic}» в сундуке.`))}</span><small>${q.done ? 'Выполнено. Вернитесь за наградой.' : q.type === 'kill' ? `${q.progress || 0} из ${q.count}` : ''}</small></li>`).join('')}</ul>` : '<p>Заданий нет.</p>'; return body + `<p class="aside">Убито врагов: ${G.stats.kills}. Открыто сундуков: ${G.stats.chests}. Падений: ${G.stats.deaths}.</p>`; }
let menuTab = 'hero', nodeSel = null, cardSel = null, offerRoll = 0, atNode = null;
const STAT_RU = { 'dmg%': 'урон', crit: 'шанс крита', critDmg: 'сила крита', hp: 'здоровье', 'hp%': 'здоровье', mp: 'мана', 'mp%': 'мана', armor: 'броня', 'armor%': 'броня', 'speed%': 'скорость', 'atkSpeed%': 'скорость атаки', 'castSpeed%': 'скорость чар', regen: 'восстановление здоровья', 'mpRegen%': 'восстановление маны', lifesteal: 'похищение жизни', dodge: 'уклонение', block: 'блок', cdr: 'перезарядка', 'fire%': 'урон огнём', 'ice%': 'урон льдом', 'shadow%': 'урон тьмой', 'holy%': 'урон светом', 'memory%': 'урон памятью', 'echoFind%': 'Отголоски', 'summonDmg%': 'урон слуг', 'summonHp%': 'здоровье слуг', thorns: 'шипы', 'burnDmg%': 'урон горения', 'healPower%': 'сила лечения', 'resist:all': 'сопротивление', 'imprint%': 'шанс Отпечатка', slowResist: 'стойкость к замедлению', freezeDur: 'длительность заморозки' };
const pctStat = (k) => k.endsWith('%') || ['crit', 'critDmg', 'lifesteal', 'dodge', 'block', 'cdr', 'resist:all', 'slowResist', 'freezeDur'].includes(k);
const fmtMod = (m) => `${m.value > 0 ? '+' : ''}${pctStat(m.stat) ? Math.round(m.value * 100) + ' %' : Math.round(m.value * 10) / 10} ${STAT_RU[m.stat] || m.stat}`;
function openMenu(tab) {
  if (!G || modalOpen() && !tab) return;
  if (tab) menuTab = tab;
  const ds = player.ds, c = G.char, d = GEN.derive(c), C2 = CLS(), F = c.female;
  const TABS = [['hero', 'Герой'], ['tree', 'Навыки' + (SK.pointsFree(G) > 0 ? ' •' : '')], ['gear', 'Вещи'], ['skein', 'Клубок'], ['chron', 'Летопись'], ['quests', 'Задания'], ['ties', 'Связи'], ['help', 'Управление']];
  let body = '';
  const name = menuTab;
  if (name === 'hero') {
    const O = outfitOf(G), ri = SK.resInfo(G);
    body = `<div class="herobox"><canvas id="menuFace" width="64" height="64"></canvas><div><b>${GEN.esc(heroName())}</b><small>${GEN.esc(GEN.RACES[c.race].n[F ? 1 : 0])} · ${C2.name} · уровень ${G.lvl}</small><small>${O ? GEN.esc(O.name) : ''}${O && O.legendary ? ' ✧' : ''}</small></div></div>
      <p class="aside">${GEN.esc(C2.fantasy || '')}</p>
      <div class="stats">${GEN.STATS.map((s2) => `<div class="${s2 === C2.main ? 'main' : ''}"><small>${s2}</small><b>${ds.st[s2]}</b></div>`).join('')}</div>
      <dl class="mini"><dt>Здоровье</dt><dd>${Math.ceil(player.hp)} / ${ds.maxHp}</dd>${usesMana(G.cls) ? `<dt>Мана</dt><dd>${Math.floor(player.mp)} / ${ds.maxMp}</dd>` : ''}<dt>${ri.name}</dt><dd>${GEN.esc(C2.resource.twist || '')}</dd><dt>Урон</dt><dd>${Math.round(ds.dmg)}</dd><dt>Защита</dt><dd>${ds.def}</dd><dt>Крит</dt><dd>${Math.round(ds.crit)} %</dd><dt>Опыт</dt><dd>${G.xp} / ${xpNeed(G.lvl)}</dd>
      <dt>Оружие</dt><dd>${METALS[G.equip.weapon].name} ${WEAPON_NAME[C2.weapon] || 'клинок'}</dd><dt>Стиль</dt><dd>${GEN.esc(C2.style || '')}</dd></dl>
      <p class="aside">${GEN.esc(GEN.cap(GEN.low(GEN.G(c.drive.goal, F))))} — так думал${F ? 'а' : ''} ${GEN.esc(c.name.first)}, пока ${F ? 'её' : 'его'} не вытащили из реки.</p>`;
  }
  if (name === 'tree') body = treeHtml();
  if (name === 'gear') body = gearHtml();
  if (name === 'skein') body = skeinHtml();
  if (name === 'chron') body = chronHtml();
  if (name === 'quests') body = questsHtml();
  if (name === 'ties') body = tiesHtml();
  if (name === 'help') body = `<dl class="mini"><dt>Движение</dt><dd>WASD или стрелки; на телефоне — палец в левой части экрана</dd><dt>Атака</dt><dd>J; кнопка ⚔</dd><dt>Отскок</dt><dd>Пробел; кнопка ↷. Короткий прыжок, во время которого удары проходят мимо. С места — назад.</dd><dt>Парирование</dt><dd>H; кнопка ⛨. Нажми, когда над врагом вспыхнет «!»: удар отбит, враг оглушён, следующий твой удар вдвое сильнее. Впустую — короткая заминка.</dd><dt>Навыки</dt><dd>K, L, U, I (или Shift, Q, R, T); на телефоне — четыре кнопки у атаки</dd><dt>Действие</dt><dd>E или Enter; кнопка ◉</dd><dt>Захват цели</dt><dd>F или ◎ — захватить и отпустить; G или долгое нажатие ◎ — следующий враг; можно нажать на врага</dd><dt>Зелья</dt><dd>1 — здоровье, 2 — мана</dd><dt>Костры</dt><dd>Редкие, у деревни и мест истории, в подземельях — перед последним залом. Отдых возвращает здоровье и ману, пополняет зелья и сохраняет игру; «Продолжить» и пробуждение после гибели — у последнего костра. Враги вокруг при отдыхе возвращаются.</dd><dt>Выносливость</dt><dd>Кольцо у героя: отскок и парирование тратят дыхание, оно возвращается за пару секунд. Точное парирование возвращает часть.</dd><dt>Меню</dt><dd>Esc или Tab; Навыки — N, Клубок — B, Летопись — J в меню</dd><dt>Звук</dt><dd>M</dd></dl>
    <p class="aside"><b>Отголоски ✶</b> — осколки памяти: падают с врагов, мест и разговоров. Ими вплетают ранги навыков, закрепляют Отпечатки, платят ткачам. Больше предела носить нельзя — лишнее выцветает.</p>
    <p class="aside"><b>Забвение</b> — на Узле (алтарь, менгир, колодец) можно отдать своё воспоминание ради постоянного дара. Цена настоящая: люди перестают узнаваться, края уходят в туман, строки Летописи осыпаются.</p>`;
  modal(`<div class="tabs">${TABS.map(([id, n]) => `<button class="tab ${id === name ? 'on' : ''}" data-a="t_${id}">${n}</button>`).join('')}</div>${body}<div class="row">${name === 'help' ? `<button class="btn" data-a="sound">${audio.on ? 'Выключить звук' : 'Включить звук'}</button><button class="btn" data-a="life">${LIFE.on ? 'Выключить анимации мира' : 'Включить анимации мира'}</button><button class="btn" data-a="title">В главное меню</button>` : ''}<button class="btn primary" data-close>Продолжить</button></div>`, () => { atNode = null; sacrificeReq = null; }, () => { if ($('menuFace')) drawFace($('menuFace'), player.look); });
  modalHandlers = { sound: () => { music.toggle(); openMenu(name); }, life: () => { setLife(!LIFE.on); openMenu(name); }, title: () => { save(); closeModal(); showTitle(); } };
  for (const [id] of TABS) modalHandlers['t_' + id] = () => { nodeSel = null; cardSel = null; openMenu(id); };
  Object.assign(modalHandlers, menuHandlers);
}
$('modalBody').addEventListener('click', (e) => {
  const n = e.target.closest('[data-node]'); if (n) { nodeSel = n.dataset.node; openMenu('tree'); return; }
  const cd = e.target.closest('[data-card]'); if (cd) { cardSel = cd.dataset.card; offerRoll = 0; openMenu('skein'); return; }
  const it = e.target.closest('[data-item]'); if (it) { itemSel = it.dataset.item; openMenu('gear'); }
});
// ---------- skill tree ----------
function nodeText(n) {
  const bits = [];
  if (n.kind === 'active') { bits.push(n.cost ? costText(n.cost) || 'бесплатно' : 'бесплатно'); bits.push(`перезарядка ${n.cd} с`); }
  else bits.push('пассивный');
  if (n.ranks > 1) bits.push(`рангов: ${n.ranks}`);
  return bits.join(' · ');
}
function treeHtml() {
  const C2 = CLS(), free = SK.pointsFree(G), sel = nodeSel && SK.node(G.cls, nodeSel);
  let h = `<p class="aside">Свободных очков: <b>${free}</b>. Очко даётся за каждый уровень. Ранги выше первого можно вплести за Отголоски (✶ ${Math.floor(G.echoes)}). Узлы IV яруса открываются с ${20}-го уровня.</p>`;
  h += `<div class="slots4">${[0, 1, 2, 3].map((i) => { const id = G.slots[i], n = id && SK.node(G.cls, id); return `<span class="chip">${KEYS4[i]}: ${SK.slotOpen(G, i) ? (n ? GEN.esc(n.name) : '—') : `с ${[1, 3, 6, 12][i]} ур.`}</span>`; }).join('')}</div>`;
  h += '<div class="tree">' + C2.tree.map((b, bi) => `<div class="branch"><h4>${GEN.esc(b.name)}</h4><p>${GEN.esc(b.style || '')} · ${SK.branchPoints(G, bi)} оч.</p>${b.nodes.map((n) => { const r = SK.rankOf(G, n.id), lost = (G.memory.lostSkills || []).includes(n.id), blk = SK.learnBlock(G, n.id); return `<button class="node ${n.kind === 'active' ? 'active' : ''} ${n.capstone ? 'cap' : ''} ${r ? 'on' : ''} ${!r && (blk || lost) ? 'no' : ''}" data-node="${n.id}"><em>${lost ? '〰' : `${r}/${n.ranks || 1}`}</em>${n.kind === 'active' ? `<i class="ic" style="${iconStyle(n, 20)}"></i>` : ''}<b>${GEN.esc(n.name)}</b></button>`; }).join('')}</div>`).join('') + '</div>';
  const keys = (G.memory.keyskills || []).map((id) => SK.node(G.cls, id));
  if (keys.length) h += `<div class="branch" style="margin-top:8px"><h4>Слова-ключи</h4>${keys.map((n) => `<button class="node active on" data-node="${n.id}"><em>✧</em><b>${GEN.esc(n.name)}</b></button>`).join('')}</div>`;
  if (sel) {
    const r = SK.rankOf(G, sel.id), lost = (G.memory.lostSkills || []).includes(sel.id), blk = lost ? 'отдано Забвению' : SK.learnBlock(G, sel.id);
    const canEcho = r > 0 && r < (sel.ranks || 1) && !sel.key, wc = SK.WEAVE_COST[Math.min(4, r)];
    h += `<div class="nodeinfo"><b>${GEN.esc(sel.name)}</b> <small>${nodeText(sel)}</small><p>${GEN.esc(sel.desc)}</p>${lost ? '<p class="aside">Ты отдал это умение. Руки иногда дёргаются по старой памяти — и ничего не происходит.</p>' : ''}
      <div class="row">${!sel.key && !lost ? `<button class="btn gold" data-a="learn" ${blk || SK.pointsFree(G) <= 0 ? 'disabled' : ''}>${r ? 'Ранг за очко' : 'Изучить'}${blk ? ` (${blk})` : ''}</button>` : ''}${canEcho && !lost ? `<button class="btn" data-a="weave">Вплести ранг: ${wc} ✶</button>` : ''}
      ${(r || sel.key) && sel.kind === 'active' && !lost ? [0, 1, 2, 3].map((i) => `<button class="btn ${G.slots[i] === sel.id ? 'primary' : ''}" data-a="slot${i}" ${SK.slotOpen(G, i) ? '' : 'disabled'}>${KEYS4[i]}</button>`).join('') : ''}</div></div>`;
  }
  h += `<div class="row"><button class="btn ghost" data-a="respec">Перевязать узор (3 ✶)</button></div>`;
  return h;
}
Object.assign(menuHandlers, {
  learn: () => { const err = SK.learn(G, nodeSel); if (err) toast(err); else { sfx.level(); refreshPlayer(); save(); } openMenu('tree'); },
  weave: () => { const err = SK.learn(G, nodeSel, true); if (err) toast(err); else { sfx.memory(); refreshPlayer(); save(); } openMenu('tree'); },
  respec: () => { if (!(G.echoes >= 3)) return toast('Нужно 3 Отголоска'); G.echoes -= 3; const keep = (G.memory.lostSkills || []); SK.resetTree(G); G.memory.lostSkills = keep; refreshPlayer(); toast('Узор распущен. Очки можно разложить заново.'); openMenu('tree'); },
});
for (let i = 0; i < 4; i++) menuHandlers['slot' + i] = () => { const j = G.slots.indexOf(nodeSel); if (j >= 0) G.slots[j] = G.slots[i]; G.slots[i] = nodeSel; sfx.ui(); openMenu('tree'); };
// patch learn to refuse lost skills
// ---------- skein: memory cards and oblivion ----------
function npcName(id) { const n = STORY && STORY.npcById[id]; return n ? n.name : id; }
function skeinHtml() {
  const M = MEM.initMemory(G), cards = MEM.allCards(G, SK.node).filter((c) => !sacrificeReq || ((!sacrificeReq.type || c.type === sacrificeReq.type) && (!sacrificeReq.id || c.id === sacrificeReq.id) && (c.weight || 0) >= (sacrificeReq.minWeight || 1))), v = clarityNow(), st = MEM.clarityState(v), snapOk = M.lastSnap !== MEM.dayOf(G);
  let h = `<p class="aside">Ясность <b>${v}</b> — ${st.name}. ${st.desc}</p>`;
  h += sacrificeReq ? `<p class="line">${GEN.esc(sacrificeReq.why || 'Пряжа просит память.')}</p>` : atNode ? `<p class="line">Ты стоишь на Узле. Пряжа слушает. Выбери воспоминание — она предложит три дара.</p>` : `<p class="aside">Отдать память можно на Узле: алтарь, менгир, колодец. Где угодно — раз в сутки, «Обрывом», за полцены${snapOk ? '' : ' (сегодня уже было)'}.</p>`;
  const groups = {}; for (const c of cards) (groups[c.type] = groups[c.type] || []).push(c);
  h += '<div class="shop">' + Object.entries(groups).map(([t, list]) => `<div><small>${MEM.CARD_TYPES[t].icon} ${MEM.CARD_TYPES[t].name}</small>${list.map((c) => `<div class="it" data-card="${GEN.esc(c.id)}" style="cursor:pointer;border-left:3px solid ${MEM.CARD_TYPES[c.type].color}"><span>${GEN.esc(c.title)}<small>вес ${c.weight}</small></span>${cardSel === c.id ? '◆' : ''}</div>`).join('')}</div>`).join('') + '</div>';
  if (!cards.length) h += '<p class="aside">У тебя пока нет воспоминаний. Ты помнишь только реку.</p>';
  const sel = cards.find((c) => c.id === cardSel);
  if (sel) {
    const cons = MEM.consequences(G, sel, npcName), gifts = MEM.offers(G, sel, offerRoll), pw = MEM.POWER_MUL(G, sel, !atNode);
    h += `<div class="nodeinfo"><b>${GEN.esc(sel.title)}</b><p>${(sel.journal || []).map((l) => `<i>«${GEN.esc(l)}»</i>`).join('<br>')}</p><p><b>Если отдать:</b><br>${cons.map(GEN.esc).join('<br>')}</p>`;
    if (sel.type === 'dream' && DREAMS[sel.links.dream]) h += `<div class="row"><button class="btn" data-a="remember">☾ Вспомнить сон</button></div>`;
    if (sel.sacrificable === false) h += '<p class="aside">Это нельзя отдать.</p>';
    else if (sacrificeReq && sacrificeReq.sell) h += `<p><b>Архив платит ${sacrificeReq.sell * (sel.weight || 1)} зол.</b> Память уйдёт на полку, как при Забвении, но без дара.</p><div class="row"><button class="btn gold" data-a="sellcard">Продать «${GEN.esc(sel.title)}»</button></div>`;
    else if (atNode || snapOk) h += `<p><b>Дары (мощь ${Math.round(pw * 10) / 10}${atNode ? '' : ', Обрыв — вполсилы'}):</b></p><div class="row">${gifts.map((g) => `<button class="btn gold" data-a="gift_${g.id}">${GEN.esc(g.name)}: ${GEN.esc(g.desc(pw))}</button>`).join('')}</div><div class="row"><button class="btn ghost" data-a="reroll">Другие дары (5 ✶)</button></div>`;
    h += '</div>';
  }
  if (G.imprints.length || true) {
    h += `<h3 style="font:700 16px var(--pixel);color:var(--gold);margin:12px 0 4px">Отпечатки павших (${G.imprints.length}/${MEM.imprintSlots(G)})</h3>`;
    h += G.imprints.length ? '<div class="shop">' + G.imprints.map((im, i) => { const I = MEM.IMPRINTS[im.enemy]; return `<div class="it"><span>${GEN.esc(I.name)} <small>${GEN.esc(ENEMIES[im.enemy].name)}: ${GEN.esc(I.desc)}${im.fixed ? ' · закреплён' : ` · выцветет через ${Math.max(0, im.expiresDay - MEM.dayOf(G))} дн.`}</small></span>${im.fixed ? '' : `<button class="btn" data-a="fix${i}">Закрепить 30 ✶</button>`}</div>`; }).join('') + '</div>' : '<p class="aside">С павших врагов иногда остаётся Отпечаток — память о том, как они дрались. Подбери его, и ненадолго будешь драться так же.</p>';
  }
  return h;
}
Object.assign(menuHandlers, { remember: () => { const c = MEM.allCards(G, SK.node).find((x) => x.id === cardSel); if (c && c.links.dream) playDream(c.links.dream, dreamApi(), () => setTimeout(() => openMenu('skein'), 50)); }, reroll: () => { if (!(G.echoes >= 5)) return toast('Нужно 5 Отголосков'); G.echoes -= 5; offerRoll++; openMenu('skein'); } });
for (const id of Object.keys(MEM.GIFTS)) menuHandlers['gift_' + id] = () => confirmSacrifice(id);
menuHandlers.sellcard = () => { const sel = MEM.allCards(G, SK.node).find((c) => c.id === cardSel); if (!sel || !sacrificeReq) return; const gold = sacrificeReq.sell * (sel.weight || 1); G.gold += gold; sfx.coin(); WS.deed(G, 'd_sold_memory', { witnesses: ['yasna'] }); doSacrifice(sel, 'sold'); toast(`Архив заплатил ${gold} зол.`, 2200); };
for (let i = 0; i < 4; i++) menuHandlers['fix' + i] = () => { const im = G.imprints[i]; if (!im) return; if (!(G.echoes >= 30)) return toast('Нужно 30 Отголосков'); G.echoes -= 30; im.fixed = true; MEM.addCard(G, { id: 'imp_' + im.enemy, type: 'foreign', title: 'Отпечаток: ' + MEM.IMPRINTS[im.enemy].name, weight: 2, journal: [`Я помню, как дрался ${ENEMIES[im.enemy].name.toLowerCase()}. Это не моя память.`] }); sfx.memory(); save(); openMenu('skein'); };
function confirmSacrifice(giftId) {
  const cards = MEM.allCards(G, SK.node), sel = cards.find((c) => c.id === cardSel); if (!sel) return;
  const g = MEM.GIFTS[giftId], pw = MEM.POWER_MUL(G, sel, !atNode);
  modal(`<h2>Забвение</h2><p class="line">Ты отдаёшь «${GEN.esc(sel.title)}».</p><p>${MEM.consequences(G, sel, npcName).map(GEN.esc).join('<br>')}</p><p class="line">Взамен: <b>${GEN.esc(g.name)}</b> — ${GEN.esc(g.desc(pw))}.</p><p class="aside">Этого нельзя будет вернуть.</p><div class="row"><button class="btn gold" data-a="doit">Отдать</button><button class="btn ghost" data-a="back">Передумать</button></div>`);
  modalHandlers = { back: () => openMenu('skein'), doit: () => doSacrifice(sel, giftId) };
}
function doSacrifice(card, giftId) {
  const r = MEM.sacrifice(G, card, giftId, {
    snap: !atNode,
    onSkill: (id) => { delete G.tree[id]; G.slots = G.slots.map((s2) => (s2 === id ? null : s2)); },
    onRegion: (key) => forgetRegion(key),
    onBond: (npc) => { if (STORY) STORY.onForgetBond(npc); },
  });
  SK.onForget();
  if (card.type === 'dream' && card.links.dream === 'morven') { G.memory.keyskills = (G.memory.keyskills || []).filter((k) => k !== 'foreign_gait'); G.slots = G.slots.map((s2) => (s2 === 'foreign_gait' ? null : s2)); }
  fx.push({ type: 'thread', x: player.x, y: player.y - 24, t: 0, life: 1.6, color: MEM.CARD_TYPES[card.type].color });
  if (G.cls === 'hollow') toast('Пустота растёт: +3 % урона, +1 % вампиризма', 2000);
  fx.push({ type: 'pillar', x: player.x, y: player.y, t: 0, life: 1.2, color: '#ff6a70' }); for (let i = 0; i < 6; i++) fx.push({ type: 'sparkle', x: player.x + (rand() - .5) * 30, y: player.y - 20 - i * 6, t: 0, life: 1.2, color: '#ff9aa0' });
  if (sacrificeReq) { const rq = sacrificeReq; sacrificeReq = null; atNode = null; closeModal(); fx.push({ type: 'pillar', x: player.x, y: player.y, t: 0, life: 1.2, color: '#ff6a70' }); sfx.forget(); refreshPlayer(); save(); rq.done(card); return; }
  if (G.memory.pendingItem) { const it = G.bag.find((i) => i.uid === G.memory.pendingItem); if (it) { G.memory.paidItems = G.memory.paidItems || {}; G.memory.paidItems[it.uid] = card.id; const sl = IT.slotFor(G, it), old = G.gear[sl]; G.bag = G.bag.filter((i) => i !== it); if (old) G.bag.push(old); G.gear[sl] = it; if (it.unique === 'u_empty_locket') { it.locketTier = card.weight >= 5 ? 'precious' : card.weight >= 3 ? 'major' : 'minor'; IT.finish(it); } toast(`«${it.name}» приняла память и надета`, 2600); } G.memory.pendingItem = null; }
  sfx.forget(); refreshPlayer(); save(); cardSel = null;
  modal(`<h2>Нить сгорела</h2><p class="line">Что-то было. Ты помнишь, что оно было, — и больше ничего.</p><p>Дар: <b>${GEN.esc(r.gift.name)}</b> — ${GEN.esc(r.gift.desc(r.power))}.</p><div class="row"><button class="btn primary" data-close>Дальше</button></div>`);
}
function forgetRegion(key) {
  if (!key || !maps.world) return; const [rx, ry] = key.split(',').map(Number), w = maps.world;
  for (let cy = ry * 4 - 1; cy <= ry * 4 + 4; cy++) for (let cx = rx * 4 - 1; cx <= rx * 4 + 4; cx++) w.seen.delete(cx + ',' + cy);
  for (const [id, f] of Object.entries(G.found || {})) if (f.region === key) delete G.found[id];
}
// ---------- chronicle ----------
function chronHtml() {
  const rows = MEM.journal(G, SK.node);
  const sig = heroName();
  if (!rows.length) return '<p class="aside">Летопись пуста. Первая строка: «Меня вытащили из реки».</p>';
  return `<div class="chron">${rows.map((r) => r.erased ? `<p class="erased">${'〰'.repeat(Math.max(3, Math.round(r.len / 6)))}${(r.foreign || []).map((n) => `<br><i class="foreign">${GEN.esc(n)}</i>`).join('')}</p>` : `<p>${GEN.esc(r.text)}</p>`).join('')}<p class="sig">— ${GEN.esc(sig)}</p></div>`;
}
function victory() {
  save();
  modal(`<h2>Мёртвые уснули</h2><p class="line">Лич Морвен рассыпался прахом, и синие огоньки над кладбищем погасли. ${GEN.esc(G.char.name.first)} возвращается в Ольховый Брод героем.</p><p class="aside">Уровень ${G.lvl}, врагов побеждено: ${G.stats.kills}, сундуков открыто: ${G.stats.chests}. Можно продолжать исследовать мир: монстры возвращаются, если покинуть зону.</p><div class="row"><button class="btn primary" data-close>Продолжить</button></div>`);
}

// =====================================================================================
// Screens: title, hero creation, game
// =====================================================================================
let screenNow = 'title';
function showScreen(id) { screenNow = id; $('title').hidden = id !== 'title'; $('create').hidden = id !== 'create'; $('play').hidden = id !== 'game'; }
function showTitle() {
  paused = true; showScreen('title');
  const sv = store.get(SAVE_KEY);
  $('continue').hidden = !sv;
  if (sv) $('continue').textContent = `Продолжить: ${sv.char.name.first}, ур. ${sv.lvl}`;
}
let candidates = [];
function showCreate() {
  showScreen('create');
  candidates = [0, 1, 2].map(() => rollHero()); candClass = [];
  renderCreate();
}
function rollHero() {
  const c = GEN.generate(null, new Set(), { genre: 'fantasy', gender: 'any', age: rand() < .85 ? 'adult' : 'any', race: 'any' }, (rand() * 2 ** 31) | 0);
  return c;
}
let candClass = [];
const CLASS_KEYS = Object.keys(CLASSES2);
function renderCreate() {
  const box = $('cards'); box.innerHTML = '';
  candidates.forEach((c, i) => {
    const cls = 'human', C = CLASSES2[cls], st = statBlock(c), d = GEN.derive(c), F = c.female;
    const el = document.createElement('article'); el.className = 'card';
    el.innerHTML = `<canvas width="128" height="128" aria-label="Портрет"></canvas><h3>${GEN.esc(GEN.fullName(c.name, c.race))}</h3><p class="sub">${GEN.esc(GEN.RACES[c.race].n[F ? 1 : 0])}, ${GEN.esc(GEN.years(c.ageN))} · бывш${F ? 'ая' : 'ий'} ${GEN.esc(GEN.G(GEN.JOBS.fantasy[c.job].n, F))}</p>
      <p class="cls"><b>Человек</b>. Ни ремесла, ни магии. Руки помнят: ${GEN.esc(GEN.G(GEN.JOBS.fantasy[c.job].n, F))}${CLASSES2[CLASS_OF[c.job]] ? ` — из ${F ? 'неё' : 'него'} легче выйдет ${GEN.esc(CLASSES2[CLASS_OF[c.job]].name.toLowerCase())}` : ''}.</p><div class="stats">${GEN.STATS.map((s) => `<div class="${s === C.main ? 'main' : ''}"><small>${s}</small><b>${st[s]}</b></div>`).join('')}</div>
      <p class="sub">${GEN.esc(GEN.cap(d.traits.slice(0, 3).join(', ')))}. ${GEN.esc(GEN.G(c.drive.fear, F))}.</p>
      <div class="row"><button class="btn" data-re="${i}">Другой</button><button class="btn primary" data-pick="${i}">Играть</button></div>`;
    box.append(el);
    const look = new Look({ ...heroSpec({ char: c, cls, equip: { weapon: 1, armor: 0, helm: 0 }, gear: {} }) });
    animatePreview(el.querySelector('canvas'), look, i);
  });
}
const previews = [];
function animatePreview(canvas, look, i) { previews[i] = { canvas, look }; }
function previewTick(t) {
  for (const p of previews) {
    if (!p || !p.canvas.isConnected) continue; const x = p.canvas.getContext('2d'); x.imageSmoothingEnabled = false; x.clearRect(0, 0, 128, 128);
    x.fillStyle = 'rgba(0,0,0,.2)'; x.beginPath(); x.ellipse(64, 118, 22, 6, 0, 0, 7); x.fill();
    const f = 1 + Math.floor(t / 110) % 8; p.look.draw(x, 'walk', 'down', f, 64, 118, 2);
  }
}
$('cards').addEventListener('click', (e) => {
  const re = e.target.closest('[data-re]'), pk = e.target.closest('[data-pick]');
  audio.unlock();
  const cl = e.target.closest('[data-cls]');
  if (cl) { const [i, k] = cl.dataset.cls.split(':'); candClass[+i] = k; renderCreate(); }
  if (re) { candidates[+re.dataset.re] = rollHero(); candClass[+re.dataset.re] = null; renderCreate(); }
  if (pk) { newGame(candidates[+pk.dataset.pick], 'human'); startGame(true); }
});
$('rerollAll').addEventListener('click', () => { candidates = [0, 1, 2].map(rollHero); candClass = []; renderCreate(); });
$('newGame').addEventListener('click', () => { audio.unlock(); showCreate(); });
$('continue').addEventListener('click', () => { audio.unlock(); G = store.get(SAVE_KEY); if (G) { migrate(G); MEM.initMemory(G); for (const it of [...(G.bag || []), ...Object.values(G.gear || {})]) if (it) IT.finish(it); } if (G && !(G.zone === 'world' || String(G.zone).startsWith('dun:'))) { G.zone = 'world'; G.pos = null; } if (G) startGame(false); });
$('backTitle').addEventListener('click', showTitle);

function startGame(fresh) {
  Object.keys(maps).forEach((k) => delete maps[k]); bossShown = {};
  initStory();
  makePlayer();
  showScreen('game');
  if (fresh && !G.rest) { const f = getMap('world').restFires().find((r) => r.id === 'brod'); if (f) G.rest = { id: f.id, zone: 'world', x: f.x, y: f.y + 30, name: f.name }; }
  // «Продолжить» — у последнего костра: костры и есть сохранения (сюжет и выборы пишутся всегда)
  if (!fresh && G.rest) enterZone(G.rest.zone, null, [G.rest.x, G.rest.y]); else enterZone(G.zone || 'world', 'start', fresh ? null : G.pos);
  paused = false;
  // test hook: automated tests may start with a path already learned
  if (fresh && window.__wantCls && window.__wantCls !== 'human') learnPath(window.__wantCls);
  if (fresh) { WS.initWS(G); chapterCard(1, () => { STORY.start('m1', true); STORY.markerT = 0; STORY.tick(1); }); }
}

// =====================================================================================
// Boot
// =====================================================================================
let last = 0;
function loop(t) {
  const dt = Math.min(.05, (t - last) / 1000 || 0); last = t;
  if (screenNow === 'game' && world && player) { if (!paused) { let sdt = dt; if (hitStop > 0) { hitStop -= dt; sdt = dt * .15; } now += sdt; update(sdt); } render(); }
  if (screenNow === 'create') previewTick(t);
  requestAnimationFrame(loop);
}
async function boot() {
  resize();
  try { await Promise.all([loadSprites(''), loadArt('art/').catch(() => {}), audio.load('sfx/'), loadVfx('vfx/').catch(() => {}), loadMonsters('mon/'), fetch('story.json').then((r) => r.json()).then((d) => { STORY_DATA = d; }), fetch('narrative/story.ink.json').then((r) => r.text()).then((t) => { INK_JSON = t; }), fetch('narrative/story.index.json').then((r) => r.json()).then((d) => { INK_INDEX = d; }), fetch('narrative/consequences.json').then((r) => r.json()).then((d) => { WS.setData(d); })]); window.__artAuthors = ART.authors; } catch (e) { $('loading').textContent = 'Не удалось загрузить спрайты. Обновите страницу.'; return; }
  tileset = makeTileset();
  $('loading').hidden = true;
  setupTouch();
  $('minimap').addEventListener('click', () => { miniBig = !miniBig; miniT = 0; $('minimap').classList.toggle('big', miniBig); });
  if (matchMedia('(pointer: coarse)').matches) document.body.classList.add('touch');
  showTitle();
  requestAnimationFrame(loop);
  window.__game = { dream: (id) => playDream(id, dreamApi()), get STORY() { return STORY; }, get NARR() { return NARR; }, WS, openTrade, chapterTo, learnPath, locPos, killEnemy, useStairs, interact, skipTo, heroLook: (char, cls, tier, legend) => new Look(heroSpec({ char, cls, equip: { weapon: 2, armor: tier, helm: 0 }, gear: legend ? { chest: { rarity: 'unique', slot: 'chest', cls } } : {} })), rollHero, SK, MEM, IT, setLock: (e) => setLock(e), useSkill, addEnemy: (t, x, y) => addEnemy(t, x, y), refreshPlayer, openMenu, get drops() { return drops; }, get maps() { return maps; }, worldTick, get G() { return G; }, get player() { return player; }, get world() { return world; }, get ents() { return ents; }, enterZone, gainXp, keys, interact, openMenu };
}
boot();
