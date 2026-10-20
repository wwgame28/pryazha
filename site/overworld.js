// Endless seamless overworld. Terrain comes from noise over global tile coordinates, so every chunk is computed
// independently yet matches its neighbours exactly. Structures are placed on a coarser region grid and stamped
// into whichever chunks they overlap.
import { mulberry } from './gen.js';
import { T, TILE, SOLID, SLOW } from './world.js';
import { planYard } from './graves.js';

export const CS = 16;          // chunk size, tiles
export const RT = 64;          // region size, tiles (one structure at most per region)
const LOAD_R = 2;              // chunks kept around the player
// Стартовая область — Ольховый Брод, река под ним, брод и тот берег — одинакова в каждой игре:
// внутри неё рельеф, деревья и деревня берутся из постоянного зерна. Дальше мир строится из зерна игры.
export const START = { x0: 8, y0: 10, x1: 58, y1: 62, seed: 731013 };
const inStart = (tx, ty) => tx >= START.x0 && tx < START.x1 && ty >= START.y0 && ty < START.y1;
// Дороги от Брода к местам истории (не случайные): на север к лагерю вожака, на восток к Старому кладбищу,
// на запад к руинам, на юг от брода к Сухому Логу. Через реку дороги нет: там брод.
const ROADS = [[31, 32, -25, 19], [47, 86, 31, 32], [-23, 16, 31, 32], [32, 33, 52, 147], [32, 33, 44, 44]]; // [x0, x1, y0, y1] в тайлах
const roadAt = (tx, ty) => ROADS.some(([a, b, c, d]) => tx >= a && tx <= b && ty >= c && ty <= d);
const HUT = { x0: 46, x1: 52, y0: 38, y1: 45 }; // изба Агафьи у воды: тут не растут деревья
// Костры для отдыха и сохранения — редко: у Брода и у мест истории. Точное место ищется рядом с задуманным,
// на сухой земле, не на дороге и не внутри стоянки.
const REST_FIRES = [
  { id: 'brod', name: 'Костёр у избы Агафьи', tx: 53, ty: 42 },
  { id: 'north', name: 'Костёр на Северной тропе', tx: 35, ty: -20 },
  { id: 'grave', name: 'Костёр у Тихой Стороны', tx: 83, ty: 28 },
  { id: 'ruins', name: 'Костёр у руин', tx: -20, ty: 28 },
  { id: 'dry', name: 'Костёр у Сухого Лога', tx: 36, ty: 140 },
  { id: 'tower', name: 'Костёр под Башней', tx: -29, ty: -20 },
  { id: 'mine', name: 'Костёр у шахты', tx: 99, ty: 108 },
];

// ---------- noise ----------
function hash2(x, y, s) { let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function vnoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
  return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
}
function fbm(x, y, s, o = 4) { let t = 0, a = .5, f = 1, n = 0; for (let i = 0; i < o; i++) { t += vnoise(x * f, y * f, s + i * 101) * a; n += a; a *= .5; f *= 2; } return t / n; }

export const BIOME_NAME = { meadow: 'Луга', forest: 'Лес', swamp: 'Болота', snow: 'Снежные пустоши', steppe: 'Сухая степь', hills: 'Предгорья', lake: 'Озёрный край' };
const VILLAGE_NAMES = ['Медвежий Лог', 'Тихая Заводь', 'Ясеневка', 'Кривой Мост', 'Сосновый Бор', 'Ивняки', 'Каменка', 'Лисья Горка', 'Три Колодца', 'Студёный Ключ', 'Овражки', 'Рябиновка'];
const RUIN_NAMES = ['Руины старой заставы', 'Разрушенное аббатство', 'Обломки крепости Ард', 'Руины часовни', 'Павшая башня', 'Развалины моста королей'];
const GRAVE_NAMES = ['Забытое кладбище', 'Погост у дороги', 'Курганы', 'Кладбище висельников', 'Тихий погост'];
const CAMP_NAMES = ['Лагерь гоблинов', 'Стоянка разбойников', 'Логово налётчиков'];
const TOWER_NAMES = ['Башня культистов', 'Чёрная башня', 'Башня звездочёта', 'Обитель пепла'];
const SHRINE_NAMES = ['Каменный круг', 'Святилище луны', 'Алтарь старых богов', 'Священная роща'];
const HUT_NAMES = ['Хижина ведьмы', 'Дом на сваях', 'Гнилая хибара'];
const MINE_NAMES = ['Заброшенная шахта', 'Гномья штольня', 'Пещера рудокопов'];

export class Overworld {
  constructor(seed, saved = {}) {
    this.seed = seed | 0; this.id = 'world'; this.infinite = true; this.name = 'Пограничье'; this.ambient = 'village'; this.dark = 0;
    this.chunks = new Map(); this.structs = new Map(); this.props = []; this.exits = []; this.spots = {};
    this.seen = new Set(saved.seen || []);
    this.loaded = new Set();
    const v = this.structure(0, 0); this.spots.start = [32 * T + 16, Math.round(riverY(32) * T) + 4]; this.spots.agafya = [49 * T + 4, 44 * T + 6];
  }
  // ---- terrain ----
  field(tx, ty) {
    const S = inStart(tx, ty) ? START.seed : this.seed, d0 = Math.hypot(tx - 32, ty - 32);
    let e = fbm(tx / 70, ty / 70, S) + .3 * Math.exp(-(d0 * d0) / 1600);
    const m = fbm(tx / 55 + 100, ty / 55, S + 7), t = fbm(tx / 150, ty / 150, S + 13) * 1.3;
    let riv = Math.abs(fbm(tx / 95, ty / 95, S + 21, 3));
    // вокруг Брода — сухая земля: без озёр и ручьёв, чтобы граница стартовой поляны не упиралась в воду
    if (d0 < 56) { const w = d0 < 40 ? 1 : 1 - (d0 - 40) / 16; if (e < -.25) e = e * (1 - w) - .25 * w; if (e > .3) e = e * (1 - w) + .3 * w; riv = Math.max(riv, .05 * w); }
    // story places pull the land around them into their own biome
    let mm = m, tt = t;
    for (const [cx, cy, bio] of BIOME_PULL) {
      const d = Math.hypot(tx - cx, ty - cy) + fbm(tx / 12, ty / 12, S + 77, 2) * 8; if (d > 40) continue;
      const w = d < 20 ? 1 : 1 - (d - 20) / 20, g = BIOME_TARGET[bio];
      if (g.m !== undefined) mm = mm * (1 - w) + g.m * w; if (g.t !== undefined) tt = tt * (1 - w) + g.t * w; if (g.e !== undefined) e = e * (1 - w) + g.e * w; else if (e < -.2) e = e * (1 - w) + -.1 * w;
      if (d < 26) riv = Math.max(riv, .05 * w);
    }
    if (d0 < 56 && tt < -.25) { const w = d0 < 40 ? 1 : 1 - (d0 - 40) / 16; tt = tt * (1 - w) - .25 * w; } // и без снега у самой деревни
    return { e, m: mm, t: tt, riv };
  }
  biome(f) {
    if (f.e > .42) return 'hills';
    if (f.t < -.3) return 'snow';
    if (f.t > .3 && f.m < 0) return 'steppe';
    if (f.m > .3) return 'swamp';
    if (f.m > .02) return 'forest';
    return 'meadow';
  }
  baseTile(tx, ty) {
    const rv = riverAt(tx, ty); if (rv) return rv;
    // поляна Брода: луг вокруг деревни, по краям роща; у самой границы — неровный переход в остальной мир
    const edge = inStart(tx, ty) ? Math.min(tx - START.x0, START.x1 - 1 - tx, ty - START.y0, START.y1 - 1 - ty) : -1;
    if (edge >= 0 && !(edge < 5 && fbm(tx / 5, ty / 5, START.seed + 91, 2) + .5 < (5 - edge) / 5)) {
      const S = START.seed, n = hash2(tx, ty, S + 3), lo = fbm(tx / 9, ty / 9, S + 33, 2);
      if (Math.hypot(tx - 32, (ty - 36) * 1.1) > 23) return [lo > .15 ? TILE.GRASS2 : TILE.FOREST, 'forest'];
      return [n < .06 ? TILE.FLOWERS : lo > 0 ? TILE.GRASS2 : TILE.GRASS, 'meadow'];
    }
    const f = this.field(tx, ty), b = this.biome(f);
    if (f.e < -.34) return [TILE.WATER, 'lake'];
    if (f.e < -.28) return [b === 'snow' ? TILE.SNOW : TILE.SAND, 'lake'];
    if (f.riv < .02 && f.e < .45) return [TILE.SHALLOW, b];
    if (f.riv < .03 && f.e < .45) return [b === 'snow' ? TILE.SNOW : TILE.SAND, b];
    if (b === 'hills') return [f.e > .56 ? TILE.CLIFF : TILE.GRAVEL, b];
    const S = inStart(tx, ty) ? START.seed : this.seed, n = hash2(tx, ty, S + 3), lo = fbm(tx / 9, ty / 9, S + 33, 2);
    switch (b) {
      case 'snow': return [TILE.SNOW, b];
      case 'steppe': return [lo > .2 ? TILE.SAND : TILE.DRY, b];
      case 'swamp': return [lo > .25 ? TILE.SHALLOW : lo > -.1 ? TILE.SWAMP : TILE.MOSS, b];
      case 'forest': return [lo > .15 ? TILE.GRASS2 : TILE.FOREST, b];
      default: return [n < .06 ? TILE.FLOWERS : lo > 0 ? TILE.GRASS2 : TILE.GRASS, b];
    }
  }
  // ---- костры отдыха ----
  restFires() {
    if (this.fires) return this.fires;
    const ok = (tx, ty) => { const t = this.baseTile(tx, ty)[0]; return !SOLID.has(t) && t !== TILE.SHALLOW && t !== TILE.SWAMP && !roadAt(tx, ty) && !this.inStruct(tx, ty); };
    this.fires = REST_FIRES.map((f) => {
      let at = [f.tx, f.ty];
      search: for (let r = 0; r < 10; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; if (ok(f.tx + dx, f.ty + dy)) { at = [f.tx + dx, f.ty + dy]; break search; } }
      return { type: 'campfire', rest: true, light: true, id: f.id, name: f.name, tx: at[0], ty: at[1], x: at[0] * T + 16, y: at[1] * T + 20 };
    });
    return this.fires;
  }
  inStruct(tx, ty) { const s = this.structure(Math.floor(tx / RT), Math.floor(ty / RT)); return !!s && tx >= s.x0 - 2 && tx < s.x0 + s.w + 2 && ty >= s.y0 - 2 && ty < s.y0 + s.h + 2; }
  // ---- chunks ----
  chunk(cx, cy) {
    const key = cx + ',' + cy; let c = this.chunks.get(key); if (c) return c;
    c = { cx, cy, key, tiles: new Uint8Array(CS * CS), biome: null, props: [], structs: [] };
    const x0 = cx * CS, y0 = cy * CS;
    const near = [];
    const rx0 = Math.floor((x0 - 40) / RT), rx1 = Math.floor((x0 + CS + 40) / RT), ry0 = Math.floor((y0 - 40) / RT), ry1 = Math.floor((y0 + CS + 40) / RT);
    for (let ry = ry0; ry <= ry1; ry++) for (let rx = rx0; rx <= rx1; rx++) { const s = this.structure(rx, ry); if (s && s.x0 < x0 + CS + 3 && s.x0 + s.w > x0 - 3 && s.y0 < y0 + CS + 3 && s.y0 + s.h > y0 - 3) near.push(s); }
    c.structs = near;
    const counts = {};
    for (let y = 0; y < CS; y++) for (let x = 0; x < CS; x++) {
      const tx = x0 + x, ty = y0 + y; let [tile, b] = this.baseTile(tx, ty);
      counts[b] = (counts[b] || 0) + 1;
      const road = roadAt(tx, ty) && !riverAt(tx, ty);
      if (road) tile = tile === TILE.WATER || tile === TILE.SHALLOW ? TILE.BRIDGE : tile === TILE.CLIFF ? TILE.GRAVEL : TILE.DIRT;
      let clear = false;
      for (const s of near) {
        if (tx >= s.x0 - 2 && tx < s.x0 + s.w + 2 && ty >= s.y0 - 2 && ty < s.y0 + s.h + 2) { clear = true; if (SOLID.has(tile) || tile === TILE.SHALLOW) tile = s.ground; }
        if (tx >= s.x0 && tx < s.x0 + s.w && ty >= s.y0 && ty < s.y0 + s.h) { const o = s.grid[(ty - s.y0) * s.w + (tx - s.x0)]; if (o >= 0) tile = o; }
      }
      c.tiles[y * CS + x] = tile;
      if (!clear && !road) this.natureProp(c, tx, ty, tile, b);
    }
    c.biome = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    for (const s of near) for (const p of s.props) if (p.x >= x0 * T && p.x < (x0 + CS) * T && p.y >= y0 * T && p.y < (y0 + CS) * T) c.props.push(p);
    for (const p of FIXED_PROPS) if (p.x >= x0 * T && p.x < (x0 + CS) * T && p.y >= y0 * T && p.y < (y0 + CS) * T) c.props.push(p);
    for (const p of this.restFires()) if (p.x >= x0 * T && p.x < (x0 + CS) * T && p.y >= y0 * T && p.y < (y0 + CS) * T) c.props.push(p);
    this.chunks.set(key, c);
    if (this.chunks.size > 900) { for (const k of this.chunks.keys()) { if (!this.loaded.has(k)) { this.chunks.delete(k); if (this.chunks.size < 700) break; } } }
    return c;
  }
  natureProp(c, tx, ty, tile, b) {
    if (Math.hypot(tx - 32, ty - 32) < 18) return; // keep the start clear
    if (tx >= 23 && tx <= 31 && ty >= 49 && ty <= 57) return; // the burnt place and the far side of the ford
    if (FORDS.some(([a2, b2]) => tx >= a2 - 2 && tx <= b2 + 2 && Math.abs(ty + .5 - riverY(tx)) < 6)) return;
    if (tx >= HUT.x0 && tx <= HUT.x1 && ty >= HUT.y0 && ty <= HUT.y1) return;
    if (this.restFires().some((f) => Math.abs(f.tx - tx) <= 2 && Math.abs(f.ty - ty) <= 2)) return; // у костра чисто
    if (roadAt(tx + 1, ty) || roadAt(tx - 1, ty) || roadAt(tx, ty + 1) || roadAt(tx, ty - 1)) return; // обочина свободна
    const S = inStart(tx, ty) ? START.seed : this.seed;
    const r = hash2(tx, ty, S + 50), r2 = hash2(tx, ty, S + 51), X = tx * T + 16 + (r2 - .5) * 10, Y = ty * T + 26;
    const season = { swamp: 'autumn', steppe: 'autumn', snow: 'winter' }[b] || 'summer', v = hash2(tx, ty, S + 52);
    const add = (o) => c.props.push({ x: X, y: Y, season, v, ...o });
    if (tile === TILE.SHALLOW) { if (b !== 'snow' && r < .07) add({ type: r2 < .5 ? 'lily' : 'reeds' }); return; }
    if (SOLID.has(tile) || tile === TILE.SAND && b !== 'steppe') return;
    switch (b) {
      case 'forest': if (r < .15) add({ type: r2 < .45 ? 'pine' : 'tree', dark: r2 > .7 }); else if (r < .2) add({ type: 'bush', berries: r2 < .3 }); else if (r < .21) add({ type: 'rock' }); break;
      case 'meadow': if (r < .02) add({ type: 'tree' }); else if (r < .045) add({ type: 'bush', berries: r2 < .4 }); else if (r < .052) add({ type: 'rock' }); break;
      case 'swamp': if (r < .05) add({ type: 'dead_tree' }); else if (r < .1) add({ type: 'reeds' }); else if (r < .12) add({ type: 'bush' }); else if (r < .085) add({ type: 'tree', tone: ['#2f4a2a', '#3a5a32', '#4a6a3a'] }); break;
      case 'snow': if (r < .07) add({ type: 'pine', snow: true }); else if (r < .085) add({ type: 'tree' }); else if (r < .1) add({ type: 'snowrock' }); break;
      case 'steppe': if (r < .02) add({ type: 'deadbush' }); else if (r < .03) add({ type: 'rock' }); else if (r < .036) add({ type: 'tree' }); else if (r < .04) add({ type: 'dead_tree' }); break;
      case 'hills': if (r < .07) add({ type: 'snowrock' }); else if (r < .1) add({ type: 'pine' }); break;
    }
  }
  tile(tx, ty) { const cx = Math.floor(tx / CS), cy = Math.floor(ty / CS); return this.chunk(cx, cy).tiles[(ty - cy * CS) * CS + (tx - cx * CS)]; }
  slowAt(x, y) { return SLOW.has(this.tile(Math.floor(x / T), Math.floor(y / T))); }
  biomeAt(x, y) { return this.chunk(Math.floor(x / T / CS), Math.floor(y / T / CS)).biome; }
  propsNear(x, y, r = 80) {
    const out = [], c0x = Math.floor((x - r) / T / CS), c1x = Math.floor((x + r) / T / CS), c0y = Math.floor((y - r) / T / CS), c1y = Math.floor((y + r) / T / CS);
    for (let cy = c0y; cy <= c1y; cy++) for (let cx = c0x; cx <= c1x; cx++) for (const p of this.chunk(cx, cy).props) if (Math.abs(p.x - x) < r + 140 && Math.abs(p.y - y) < r + 140) out.push(p);
    return out;
  }
  propsInRect(x0, y0, x1, y1) {
    const out = [];
    for (let cy = Math.floor(y0 / T / CS); cy <= Math.floor(y1 / T / CS); cy++) for (let cx = Math.floor(x0 / T / CS); cx <= Math.floor(x1 / T / CS); cx++) for (const p of this.chunk(cx, cy).props) out.push(p);
    return out;
  }
  // Load chunks around the player; returns which chunks appeared and which went away.
  update(px, py) {
    const pcx = Math.floor(px / T / CS), pcy = Math.floor(py / T / CS), now = new Set(), added = [];
    for (let dy = -LOAD_R; dy <= LOAD_R; dy++) for (let dx = -LOAD_R; dx <= LOAD_R; dx++) {
      const c = this.chunk(pcx + dx, pcy + dy); now.add(c.key);
      if (!this.loaded.has(c.key)) added.push(c);
      if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) this.seen.add(c.key);
    }
    const removed = [...this.loaded].filter((k) => !now.has(k));
    this.loaded = now;
    return { added, removed };
  }
  // ---- structures ----
  structure(rx, ry) {
    const key = rx + ',' + ry; if (this.structs.has(key)) return this.structs.get(key);
    let s = null;
    const forced = FORCED[key];
    const R = mulberry(Math.imul(rx, 92821) ^ Math.imul(ry, 68917) ^ (key === '0,0' ? START.seed : this.seed));
    if (forced) {
      s = this.makeStructure(forced.type, rx * RT + 32, ry * RT + 32, R, key);
      s.story = forced.loc; if (forced.name) { s.name = forced.name; for (const p of s.props) if (p.gkey) p.yard = s.name; }
      if (forced.biome === 'snow' && s.grid) { s.ground = TILE.SNOW; for (let i = 0; i < s.grid.length; i++) if (s.grid[i] === TILE.SWAMP || s.grid[i] === TILE.MOSS) s.grid[i] = TILE.GRAVEL; } if (forced.peaceful) s.spawns = s.spawns.filter((sp) => sp[3] === 'boss' && forced.keepBoss);
      if (forced.tags) for (const p of s.props) if (p.dun) { p.dun.tags = forced.tags; p.dun.name = s.name; }
    }
    else if (R() < .72) {
      const cx = rx * RT + 14 + Math.floor(R() * (RT - 28)), cy = ry * RT + 14 + Math.floor(R() * (RT - 28));
      const f = this.field(cx, cy);
      if (f.e > -.26 && f.e < .56) {
        const b = this.biome(f), roll = R();
        const table = { meadow: [['village', .3], ['ruins', .2], ['shrine', .18], ['graveyard', .17], ['camp', .15]], forest: [['camp', .33], ['ruins', .2], ['shrine', .15], ['tower', .17], ['graveyard', .15]], swamp: [['hut', .5], ['graveyard', .3], ['ruins', .2]], snow: [['ruins', .3], ['tower', .3], ['shrine', .2], ['village', .2]], steppe: [['bandits', .5], ['ruins', .3], ['shrine', .2]], hills: [['mine', .55], ['ruins', .25], ['tower', .2]] }[b];
        let acc = 0, type = table[0][0]; for (const [t, w] of table) { acc += w; if (roll < acc) { type = t; break; } }
        s = this.makeStructure(type, cx, cy, R, key, b);
      }
    }
    this.structs.set(key, s);
    return s;
  }
  makeStructure(type, cx, cy, R, key, biome) {
    const s = { id: key, type, cx, cy, props: [], spawns: [], npcs: [], ground: TILE.GRASS, biome: biome || 'meadow' };
    const box = (w, h) => { s.w = w; s.h = h; s.x0 = cx - Math.floor(w / 2); s.y0 = cy - Math.floor(h / 2); s.grid = new Int8Array(w * h).fill(-1); };
    const set = (lx, ly, t) => { if (lx >= 0 && ly >= 0 && lx < s.w && ly < s.h) s.grid[ly * s.w + lx] = t; };
    const rect = (lx, ly, w, h, t) => { for (let y = ly; y < ly + h; y++) for (let x = lx; x < lx + w; x++) set(x, y, t); };
    const W = (dx) => (cx + dx) * T + 16, H = (dy) => (cy + dy) * T + 16;
    const prop = (o) => { s.props.push(o); return o; };
    const pick = (a) => a[Math.floor(R() * a.length)];
    const chest = (dx, dy, loot) => prop({ type: 'chest', x: W(dx), y: H(dy) + 8, loot, key: `${key}:c${s.props.length}` });
    s.dist = Math.hypot(cx - 32, cy - 32) / CS; // in chunks, drives difficulty
    switch (type) {
      case 'village': case 'trollcamp': case 'oldgrave': case 'camp': case 'bandits': case 'ruins': case 'graveyard': case 'tower': case 'shrine': case 'hut': case 'mine': break;
    }
    if (type === 'village') {
      const start = key === '0,0';
      box(30, 24); s.name = start ? 'Ольховый Брод' : pick(VILLAGE_NAMES); s.ground = biome === 'snow' ? TILE.SNOW : TILE.GRASS; s.hub = true; s.start = start;
      const mid = [15, 12];
      rect(0, mid[1] - 1, 30, 2, TILE.DIRT); rect(mid[0] - 1, 0, 2, 24, TILE.DIRT); rect(mid[0] - 6, mid[1] - 4, 12, 8, TILE.COBBLE);
      if (!start) { rect(1, 1, 6, 5, TILE.FIELD); rect(23, 17, 6, 5, TILE.FIELD); }
      prop({ type: 'well', x: W(0), y: H(-1) + 4, fountain: false, box: [-30, -22, 60, 24] });
      for (const [a, b] of [[-5, -3], [4, -3], [-5, 3], [4, 3]]) prop({ type: 'lamppost', x: W(a), y: H(b), light: true });
      const houses = start
        ? [[-10, -5, 'houseA', { label: 'ТАВЕРНА', role: 'inn' }], [10, -5, 'houseP', { label: 'ЛАВКА', role: 'shop' }], [-9, 10, 'houseB', { label: 'КУЗНИЦА', role: 'smith' }], [8, 10, 'houseA', { label: 'СТАРОСТА', role: 'elder' }]]
        : [[-10, -5, 'houseA', { label: 'ТАВЕРНА', role: 'inn' }], [10, -5, 'houseP', { label: 'ЛАВКА', role: 'shop' }], [-9, 10, 'houseB', {}], [9, 10, pick(['houseP', 'houseB']), {}]];
      for (const [dx, dy, spr, o] of houses) { const p = prop({ type: 'house', sprite: spr, x: W(dx), y: (cy + dy) * T + 8, w: 0, h: 0, ...o }); if (o.role) p.keeper = start ? null : Math.floor(R() * 2 ** 31); }
      for (const [a, b] of [[-13, -4], [-12, -4], [13, 9], [-13, 10]]) prop({ type: 'barrel', x: W(a), y: H(b) });
      for (let i = -14; i <= 14; i += 2) if (Math.abs(i) > 2) { prop({ type: 'fence', x: W(i), y: H(-11) }); prop({ type: 'fence', x: W(i), y: H(11) }); }
      prop({ type: 'sign', x: W(2), y: H(-10), text: start ? 'Ольховый Брод. На север — лагерь вожака гоблинов, на восток — старое кладбище.' : `${s.name}. Путникам — таверна и лавка.` });
      s.npcSpots = [[W(-3), H(1)], [W(3), H(2)], [W(-1), H(-2)], [W(5), H(0)], [W(-6), H(1)], [W(0), H(4)], [W(-12), H(1)], [W(12), H(2)]];
      const hp = (role) => s.props.find((p) => p.role === role);
      s.keeperSpots = {}; for (const role of ['inn', 'shop', 'smith', 'elder']) { const h = hp(role); if (h) s.keeperSpots[role] = [h.x + 40, h.y + 16]; }
    }
    else if (type === 'camp' || type === 'trollcamp' || type === 'bandits') {
      box(16, 14); s.name = type === 'trollcamp' ? 'Лагерь вожака' : type === 'bandits' ? 'Стоянка разбойников' : pick(CAMP_NAMES.slice(0, 1)); s.ground = TILE.DIRT;
      rect(1, 1, 14, 12, TILE.DIRT);
      prop({ type: 'campfire', x: W(0), y: H(0), light: true });
      for (const [a, b, c] of [[-5, -3, '#8a6a3a'], [5, -3, '#6a4a2a'], [-5, 4, '#7a5a3a'], [5, 4, '#5a4a3a']]) prop({ type: 'tent', x: W(a), y: H(b) + 8, color: type === 'bandits' ? '#7a3a2a' : c });
      chest(1, -5, 'camp');
      if (type === 'bandits') s.spawns.push(['bandit', 0, 2], ['bandit', 3, 1], ['bandit', -3, 2], ['cultist', 0, -2]);
      else s.spawns.push(['goblin', -2, 2], ['goblin', 2, 2], ['goblin', 0, 3], ['shaman', 0, -2]);
      if (type === 'trollcamp') { s.spawns.push(['troll', 0, 1, 'boss'], ['goblin', -3, -1]); s.name = 'Лагерь вожака'; }
    }
    else if (type === 'ruins') {
      box(16, 14); s.name = pick(RUIN_NAMES); s.ground = TILE.GRASS;
      for (let y = 1; y < 13; y++) for (let x = 1; x < 15; x++) if (R() < .55) set(x, y, R() < .5 ? TILE.STONE : TILE.MOSS);
      for (const [a, b] of [[-6, -5], [-2, -5], [2, -5], [6, -5], [-6, 5], [6, 5], [-6, 0]]) if (R() < .8) { const arch = b === -5 && (a === -2 || a === 2) && R() < .6; prop({ type: 'ruin_wall', x: W(a), y: H(b), hgt: 14 + Math.floor(R() * 22), arch, box: arch ? [-62, -14, 124, 16] : null }); }
      for (const [a, b] of [[-3, -1], [3, -1], [-3, 3], [3, 3]]) if (R() < .7) prop({ type: 'pillar', x: W(a), y: H(b) });
      for (let i = 0; i < 4; i++) prop({ type: 'bones', x: W(-5 + R() * 10), y: H(-4 + R() * 8) });
      chest(0, 1, 'ruins');
      s.spawns.push(['skeleton', -2, 2], ['skeleton', 2, 0], [R() < .5 ? 'cultist' : 'archer', 0, -3]);
      if (s.dist > 4) s.spawns.push(['necro', 4, 3]);
    }
    else if (type === 'graveyard' || type === 'oldgrave') {
      box(18, 14); s.name = type === 'oldgrave' ? 'Старое кладбище' : pick(GRAVE_NAMES); s.ground = TILE.MOSS;
      rect(0, 0, 18, 14, TILE.MOSS); rect(8, 0, 2, 14, TILE.DIRT);
      const graves = [];
      for (let y = -5; y <= 4; y += 3) for (let x = -7; x <= 7; x += 3) if (Math.abs(x) > 1) graves.push(prop({ type: 'grave', x: W(x), y: H(y) + 8, gx: x, gy: y, gkey: `${key}:g${graves.length}`, yard: s.name }));
      prop({ type: 'gate', x: W(0), y: H(-6) + 8 });
      const dun = { base: 'dun:' + key, floors: type === 'oldgrave' ? 3 : 2, boss: type === 'oldgrave', name: s.name, bossRoom: 'зал Лича', spawn: 'crypt', tags: type === 'oldgrave' ? ['crypt1', 'crypt2', 'crypt3'] : null, level: 1 + s.dist * .05 };
      prop({ type: 'mausoleum', x: W(0), y: H(4) + 20 });
      prop({ type: 'stairs_down', x: W(0), y: H(4) + 26, to: dun.base + ':1', dun, label: 'Склеп', noDraw: true });
      prop({ type: 'lamppost', x: W(-2), y: H(5), light: true });
      if (type !== 'oldgrave') s.spawns.push(['zombie', -4, 0], ['zombie', 4, 2], ['skeleton', 0, -2]);
      else s.spawns.push(['zombie', 5, -2]);
      // мертвец встаёт из ближайшей могилы и носит её имя; на Старом кладбище имена сбиты все — там его не назвать
      const risen = [];
      if (type !== 'oldgrave') for (const sp of s.spawns) {
        let bi = -1, bd = 1e9; graves.forEach((g, i) => { const d = Math.hypot(g.gx - sp[1], g.gy - sp[2]); if (d < bd && !risen.includes(i)) { bd = d; bi = i; } });
        if (bi >= 0) { risen.push(bi); sp[4] = graves[bi].gkey; }
      }
      planYard(key, graves.length, risen, { old: type === 'oldgrave' }).forEach((epi, i) => { graves[i].epi = epi; });
    }
    else if (type === 'tower') {
      box(12, 12); s.name = pick(TOWER_NAMES); s.ground = TILE.STONE;
      for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) if (Math.hypot(x - 6, y - 6) < 5.5) set(x, y, TILE.STONE);
      prop({ type: 'tower', x: W(0), y: H(-1), tint: pick(['#b56cff', '#ff7a3a', '#6fd0ff']) });
      chest(2, 2, 'tower'); for (const [a, b] of [[-4, 3], [4, -3]]) prop({ type: 'torch', x: W(a), y: H(b), light: true });
      s.spawns.push(['cultist', -2, 3], ['cultist', 3, 2], [R() < .5 ? 'witch' : 'necro', 0, 3]);
    }
    else if (type === 'shrine') {
      box(11, 11); s.name = pick(SHRINE_NAMES); s.ground = TILE.GRASS;
      for (let y = 0; y < 11; y++) for (let x = 0; x < 11; x++) if (Math.hypot(x - 5, y - 5) < 4.6) set(x, y, TILE.COBBLE);
      for (let i = 0; i < 7; i++) { const a = i / 7 * 6.283; prop({ type: 'menhir', x: W(Math.cos(a) * 4.2), y: H(Math.sin(a) * 4.2) + 8, glow: true }); }
      prop({ type: 'altar', x: W(0), y: H(0) + 8, key: `${key}:altar` });
    }
    else if (type === 'hut') {
      box(12, 10); s.name = pick(HUT_NAMES); s.ground = TILE.SWAMP;
      rect(2, 2, 8, 6, TILE.MOSS);
      prop({ type: 'house', sprite: 'houseB', x: W(-1), y: (cy + 1) * T + 8, w: 0, h: 0 });
      prop({ type: 'cauldron', x: W(3), y: H(2) }); prop({ type: 'dead_tree', x: W(-5), y: H(-2) });
      chest(-3, 2, 'hut');
      s.spawns.push(['witch', 2, 3], ['zombie', -3, 3], ['zombie', 4, -2]);
    }
    else if (type === 'mine') {
      box(10, 8); s.name = pick(MINE_NAMES); s.ground = TILE.GRAVEL;
      rect(0, 0, 10, 8, TILE.GRAVEL);
      const dun = { base: 'dun:' + key, floors: 2, boss: true, name: s.name, bossRoom: 'забой', spawn: 'mine', level: 1 + s.dist * .05 };
      prop({ type: 'mine', x: W(0), y: H(0) + 14 }); prop({ type: 'stairs_down', x: W(0), y: H(0) + 18, to: dun.base + ':1', dun, label: 'Шахта', noDraw: true });
      prop({ type: 'crate', x: W(-3), y: H(1) }); prop({ type: 'barrel', x: W(3), y: H(1) }); prop({ type: 'torch', x: W(-2), y: H(-1), light: true });
      s.spawns.push(['bandit', -2, 2], ['wolf', 3, 3]);
    }
    for (const p of s.props) if (p.type === 'stairs_down' && p.dun) p.dun.exit = [p.x, p.y + 50];
    return s;
  }
  structuresAround(x, y, radiusTiles) {
    const tx = x / T, ty = y / T, out = [];
    for (let ry = Math.floor((ty - radiusTiles) / RT); ry <= Math.floor((ty + radiusTiles) / RT); ry++) for (let rx = Math.floor((tx - radiusTiles) / RT); rx <= Math.floor((tx + radiusTiles) / RT); rx++) { const s = this.structure(rx, ry); if (s && Math.hypot(s.cx - tx, s.cy - ty) < radiusTiles) out.push(s); }
    return out;
  }
}

// Minimap colour per tile.
export const TILE_COLOR = { [TILE.GRASS]: '#5f9a3e', [TILE.GRASS2]: '#5a9439', [TILE.FLOWERS]: '#6aa448', [TILE.DIRT]: '#a07c50', [TILE.WATER]: '#2f6fa8', [TILE.BRIDGE]: '#8a6038', [TILE.SAND]: '#d8c387', [TILE.STONE]: '#5a5760', [TILE.WALL]: '#2a2830', [TILE.WOOD]: '#8c6239', [TILE.FOREST]: '#3a6a2a', [TILE.VOID]: '#000', [TILE.COBBLE]: '#9a9792', [TILE.MOSS]: '#4a5a40', [TILE.SNOW]: '#e6eef2', [TILE.CLIFF]: '#6b6660', [TILE.DRY]: '#b4a25a', [TILE.SWAMP]: '#4d5a34', [TILE.SHALLOW]: '#4a8ab8', [TILE.FIELD]: '#a08040', [TILE.GRAVEL]: '#8f8a7e' };
export function chunkMinimap(c) {
  if (c.mini) return c.mini;
  const cv = document.createElement('canvas'); cv.width = CS; cv.height = CS; const x = cv.getContext('2d'), img = x.createImageData(CS, CS);
  for (let i = 0; i < CS * CS; i++) { const h = TILE_COLOR[c.tiles[i]] || '#000', n = parseInt(h.slice(1), 16); img.data[i * 4] = n >> 16; img.data[i * 4 + 1] = (n >> 8) & 255; img.data[i * 4 + 2] = n & 255; img.data[i * 4 + 3] = 255; }
  for (const p of c.props) if (p.type === 'tree' || p.type === 'pine') { const lx = Math.floor(p.x / T) - c.cx * CS, ly = Math.floor(p.y / T) - c.cy * CS; if (lx >= 0 && ly >= 0 && lx < CS && ly < CS) { const i = (ly * CS + lx) * 4; img.data[i] *= .6; img.data[i + 1] *= .7; img.data[i + 2] *= .6; } }
  x.putImageData(img, 0, 0); c.mini = cv; return cv;
}
// fixed places of the story; everything else is generated
export const FORCED = {
  '0,0': { type: 'village', loc: 'village', biome: 'meadow' }, '0,-1': { type: 'trollcamp', loc: 'trollcamp', biome: 'forest' }, '1,0': { type: 'oldgrave', loc: 'oldgrave', biome: 'swamp' },
  '-1,0': { type: 'ruins', loc: 'ruins', name: 'Руины Перевязчиков', peaceful: true, biome: 'meadow' }, '-1,-1': { type: 'tower', loc: 'tower', name: 'Башня Неусыпных', peaceful: true, biome: 'snow' },
  '1,-1': { type: 'hut', loc: 'witchhut', name: 'Изба Тётки Иней', peaceful: true, biome: 'snow' }, '1,1': { type: 'mine', loc: 'mine', name: 'Старая Солнечная шахта', tags: ['mine1', 'mine2'], biome: 'hills' },
  '-1,1': { type: 'camp', loc: 'camp', name: 'Стан Пепельного Круга', peaceful: true, biome: 'steppe' }, '2,0': { type: 'shrine', loc: 'menhir', name: 'Менгир у Прорехи', biome: 'meadow' },
  '0,2': { type: 'village', loc: 'hamlet_dry', name: 'Сухой Лог', biome: 'steppe' },
};
const BIOME_TARGET = { steppe: { t: .6, m: -.3 }, snow: { t: -.6 }, swamp: { m: .5, t: 0 }, meadow: { m: -.2, t: 0 }, forest: { m: .15, t: 0 }, hills: { e: .5, t: 0 } };
const BIOME_PULL = [];
// '0,0' тоже тянет: окрестности Брода всегда луг
for (const [k, v] of Object.entries(FORCED)) if (v.biome) { const [rx, ry] = k.split(',').map(Number); BIOME_PULL.push([rx * RT + 32, ry * RT + 32, v.biome]); }
export const LOC_REGION = Object.fromEntries(Object.entries(FORCED).map(([k, v]) => [v.loc, k]));
export const STRUCT_ICON = { village: '⌂', trollcamp: '☠', camp: '▲', bandits: '▲', ruins: '▣', graveyard: '✝', oldgrave: '✝', tower: '♜', shrine: '✦', hut: '☘', mine: '⛏' };

// ---------- Ольховая река: the river at the Брод (story place, not noise) ----------
// centre line south of the village; deep water in the middle, shallows, sand banks; fords where people cross.
export function riverY(tx) { return 47.5 + 2.5 * Math.sin(tx / 9) + 1.5 * Math.sin(tx / 23); }
const FORDS = [[30, 34], [-22, -18], [92, 96]];
const RIVER_X = [-60, 132];
export const isRiver = (tx, ty) => tx >= RIVER_X[0] && tx <= RIVER_X[1] && Math.abs(ty + .5 - riverY(tx)) < 2.7; // течёт (для анимации)
function riverAt(tx, ty) {
  if (tx < RIVER_X[0] - 10 || tx > RIVER_X[1] + 10) return null;
  // lakes where the river begins and ends
  for (const [lx, ly, r] of [[RIVER_X[0] - 4, 47, 9], [RIVER_X[1] + 4, 47, 8]]) { const d = Math.hypot(tx - lx, (ty - ly) * 1.2); if (d < r) return [d < r - 2.5 ? TILE.WATER : d < r - 1.2 ? TILE.SHALLOW : TILE.SAND, 'lake']; }
  if (tx < RIVER_X[0] || tx > RIVER_X[1]) return null;
  const d = Math.abs(ty + .5 - riverY(tx)), ford = FORDS.some(([a, b]) => tx >= a && tx <= b);
  if (d < 1.6) return [ford ? TILE.SHALLOW : TILE.WATER, 'lake'];
  if (d < 2.6) return [TILE.SHALLOW, 'lake'];
  if (d < 3.4) return [TILE.SAND, 'meadow'];
  // the burnt place on the far bank: nobody remembers whose it was
  if (tx >= 25 && tx <= 29 && ty >= Math.floor(riverY(27) + 4) && ty <= Math.floor(riverY(27) + 7)) return [TILE.GRAVEL, 'meadow'];
  return null;
}
const AY = (tx, dy) => Math.round((riverY(tx) + dy) * T);
export const PLACES = {
  ashes: [27 * T + 16, AY(27, 5.5)],
  boat: [36 * T + 16, AY(36, -3.1)],
  far_bank: [32 * T + 16, AY(32, 4.5)],
};
export const FIXED_PROPS = [
  { type: 'ruin_wall', x: 26 * T + 8, y: AY(26, 4.6), burnt: true, v: .3 }, { type: 'ruin_wall', x: 28 * T + 24, y: AY(28, 4.8), burnt: true, v: .7 },
  { type: 'burnt', x: 27 * T + 10, y: AY(27, 6.1) }, { type: 'burnt', x: 28 * T + 2, y: AY(28, 6.6), v: .6 },
  { type: 'dead_tree', x: 25 * T, y: AY(25, 6.8), v: .9, season: 'autumn' }, { type: 'deadbush', x: 29 * T + 20, y: AY(29, 6.9), v: .2, season: 'autumn' }, { type: 'deadbush', x: 25 * T + 18, y: AY(25, 5.2), v: .6, season: 'autumn' },
  { type: 'boat', x: 36 * T + 16, y: AY(36, -2.3) }, { type: 'nets', x: 38 * T + 8, y: AY(38, -3.4) },
  // изба Агафьи у самой воды: отсюда она увидела героя в реке
  { type: 'house', sprite: 'houseB', x: 50 * T, y: 43 * T + 4, label: 'ИЗБА АГАФЬИ' },
  ...[22, 24, 27, 37, 40, 43].map((tx, i) => ({ type: 'reeds', x: tx * T + 14, y: AY(tx, i % 2 ? 2.4 : -2.2), v: i / 6, season: 'autumn' })),
];
