// LPC Revised world art: sprites for props and autotiled terrain (grass edges blend into dirt, sand and water).
import { T, TILE } from './world.js';

export const ART = { ok: false, img: {}, spr: {}, anim: {}, authors: [] };
export async function loadArt(base = 'art/') {
  const meta = await (await fetch(base + 'art.json')).json();
  await Promise.all(meta.images.map((k) => new Promise((res) => { const im = new Image(); im.onload = () => { ART.img[k] = im; res(); }; im.onerror = res; im.src = base + k + '.png'; })));
  ART.spr = meta.sprites; ART.anim = meta.anims; ART.authors = meta.authors || []; ART.ok = true;
}
const seasonal = (key, season) => ART.img[(key === 'trees' || key === 'plants') ? `${key}_${season || 'summer'}` : key] || ART.img[`${key}_summer`];
export function drawSprite(x, name, X, Y, season) {
  const d = ART.spr[name]; if (!d) return false;
  const im = seasonal(d[0], season); if (!im) return false;
  x.drawImage(im, d[1], d[2], d[3], d[4], Math.round(X - d[5]), Math.round(Y - d[6]), d[3], d[4]);
  return true;
}
export function drawAnim(x, name, X, Y, t) {
  const a = ART.anim[name]; if (!a) return false; const im = ART.img[a[0]]; if (!im) return false;
  const fr = a[1][Math.floor(t * 8 + X * .01) % a[1].length];
  x.drawImage(im, fr[0], fr[1], a[2], a[3], Math.round(X - a[4]), Math.round(Y - a[5]), a[2], a[3]);
  return true;
}
// a chunk of stone wall from the Jagged Stone Walls autotile (cap, middle, base rows)
const WALL_STYLE = { slate: 0, ochre: 96, black: 192 };
export function drawWallChunk(x, X, Y, wTiles, hTiles, style, v = 0) {
  const im = ART.img.dungeon; if (!im) return false;
  const sx0 = WALL_STYLE[style] ?? 0, left = Math.round(X - wTiles * 16), top = Math.round(Y - hTiles * 32);
  for (let j = 0; j < hTiles; j++) for (let i = 0; i < wTiles; i++) {
    const row = j === 0 ? 0 : j === hTiles - 1 ? 64 : 32, col = (i + Math.floor(v * 7) + j) % 3;
    // ruined top: chip away part of the cap
    if (j === 0 && ((v * 13 + i) % 1) < .3) { x.drawImage(im, sx0 + col * 32, row + 10, 32, 22, left + i * 32, top + j * 32 + 10, 32, 22); continue; }
    x.drawImage(im, sx0 + col * 32, row, 32, 32, left + i * 32, top + j * 32, 32, 32);
  }
  return true;
}
// dungeon floors and walls (crypts: slate walls, mines: ochre walls and dirt)
const FLOOR_LIKE = (id) => id !== TILE.WALL && id !== TILE.VOID;
export function drawDungeonTile(x, map, tx, ty, dx, dy) {
  const im = ART.img.dungeon; if (!im || map.tile || !map.g) return false;
  const g = (X, Y) => (Y < 0 || Y >= map.h || X < 0 || X >= map.w ? TILE.WALL : map.g[Y][X]);
  const id = g(tx, ty), mine = String(map.spawnKey || '').startsWith('mine'), h = vh(tx, ty);
  if (id === TILE.WALL) {
    const b1 = g(tx, ty + 1), b2 = g(tx, ty + 2), wx = mine ? 96 : (map.floor >= 3 ? 192 : 0);
    if (FLOOR_LIKE(b1)) { x.drawImage(im, wx + (h % 3) * 32, 64, 32, 32, dx, dy, 32, 32); return true; }
    if (FLOOR_LIKE(b2)) { x.drawImage(im, wx + (h % 3) * 32, 0, 32, 32, dx, dy, 32, 32); return true; }
    x.fillStyle = '#100e16'; x.fillRect(dx, dy, 32, 32);
    x.fillStyle = mine ? '#4a3c22' : '#2e2e40';
    if (FLOOR_LIKE(g(tx - 1, ty)) || FLOOR_LIKE(g(tx - 1, ty + 1)) && FLOOR_LIKE(g(tx - 1, ty + 2))) x.fillRect(dx, dy, 2, 32);
    if (FLOOR_LIKE(g(tx + 1, ty)) || FLOOR_LIKE(g(tx + 1, ty + 1)) && FLOOR_LIKE(g(tx + 1, ty + 2))) x.fillRect(dx + 30, dy, 2, 32);
    if (FLOOR_LIKE(g(tx, ty - 1))) x.fillRect(dx, dy, 32, 2);
    return true;
  }
  if (id === TILE.STONE || id === TILE.COBBLE || id === TILE.MOSS) {
    if (mine) x.drawImage(im, 160 + (h % 6 === 0 ? 32 : 0), 96, 32, 32, dx, dy, 32, 32);
    else { const fl = Math.max(1, map.floor || 1), col = (tx & 1) + (fl === 2 ? 2 : 0), row = (fl >= 3 ? 2 : 0) + (h % 7 === 0 ? 1 : 0); x.drawImage(im, col * 32, 96 + row * 32, 32, 32, dx, dy, 32, 32); }
    if (id === TILE.MOSS) { x.fillStyle = 'rgba(60,90,50,.35)'; x.fillRect(dx, dy, 32, 32); }
    // shadow under the wall face
    if (g(tx, ty - 1) === TILE.WALL) { x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(dx, dy, 32, 6); }
    return true;
  }
  return false;
}
export const spriteH = (name) => (ART.spr[name] ? ART.spr[name][6] : 40);

// ---------- terrain ----------
const GRASSY = { [TILE.GRASS]: 'summer', [TILE.GRASS2]: 'summer', [TILE.FLOWERS]: 'summer', [TILE.FOREST]: 'summer', [TILE.DRY]: 'autumn', [TILE.SWAMP]: 'autumn', [TILE.SNOW]: 'winter' };
const GRASS_FILL = [[3, 1], [4, 1], [5, 1], [3, 2], [4, 2], [5, 2]];
const FILL = {
  [TILE.DIRT]: [[3, 3], [4, 3], [5, 3], [3, 4], [4, 4], [5, 4]], [TILE.FIELD]: [[3, 3], [4, 3], [5, 3]], [TILE.SAND]: [[3, 5], [4, 5], [5, 5]],
  [TILE.WATER]: [[1, 11]], [TILE.SHALLOW]: [[1, 11]],
};
const vh = (tx, ty, k = 0) => { let h = Math.imul(tx, 73856093) ^ Math.imul(ty, 19349663) ^ k; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0); };
function drawFill(x, tile, tx, ty, X, Y, ts, season) {
  const f = FILL[tile];
  if (f && ART.ok) {
    const im = ART.img[`terrain_${tile === TILE.SAND || tile === TILE.WATER || tile === TILE.SHALLOW || tile === TILE.DIRT || tile === TILE.FIELD ? (season === 'winter' && tile === TILE.DIRT ? 'winter' : 'summer') : 'summer'}`];
    const [cx, cy] = f[vh(tx, ty) % f.length];
    x.drawImage(im, cx * T, cy * T, T, T, X, Y, T, T);
    if (tile === TILE.SHALLOW) { x.fillStyle = 'rgba(170,215,235,.28)'; x.fillRect(X, Y, T, T); }
    if (tile === TILE.FIELD) { x.fillStyle = 'rgba(70,45,20,.35)'; for (let yy = 3; yy < T; yy += 7) x.fillRect(X, Y + yy, T, 2); x.fillStyle = '#c9b04a'; for (let yy = 1; yy < T; yy += 7) for (let xx = 2; xx < T; xx += 5) if ((vh(tx * 32 + xx, ty * 32 + yy) & 3) !== 0) x.fillRect(X + xx, Y + yy, 2, 2); }
    return;
  }
  const v = (vh(tx, ty) % ts.VAR);
  x.drawImage(ts.canvas, v * T, tile * T, T, T, X, Y, T, T);
}
// One tile with grass edges built from 16 px quadrants (outer corners, edges, inner corners, fill).
export function drawTerrainTile(x, tileAt, tx, ty, X, Y, ts) {
  const tile = tileAt(tx, ty), season = GRASSY[tile];
  if (season === undefined || !ART.ok) {
    drawFill(x, tile, tx, ty, X, Y, ts);
    if (tile === TILE.CLIFF) { const below = tileAt(tx, ty + 1); if (below !== TILE.CLIFF) { x.fillStyle = '#4a4642'; x.fillRect(X, Y + 18, T, 14); x.fillStyle = '#3a3733'; for (let xx = 3; xx < T; xx += 7) x.fillRect(X + xx, Y + 20, 2, 12); } }
    return;
  }
  const same = (dx, dy) => GRASSY[tileAt(tx + dx, ty + dy)] === season;
  const im = ART.img['terrain_' + season];
  const all = same(-1, -1) && same(0, -1) && same(1, -1) && same(-1, 0) && same(1, 0) && same(-1, 1) && same(0, 1) && same(1, 1);
  const [fx, fy] = GRASS_FILL[vh(tx, ty) % GRASS_FILL.length];
  if (!all) {
    // what shows through the grass edge: the first neighbour that is not this grass
    let under = TILE.DIRT;
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]]) { const n = tileAt(tx + dx, ty + dy); if (GRASSY[n] !== season) { under = GRASSY[n] !== undefined ? TILE.DIRT : n; break; } }
    drawFill(x, under === TILE.CLIFF || under === TILE.WALL ? TILE.GRAVEL : under, tx, ty, X, Y, ts, season);
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const h = same(sx, 0), v = same(0, sy), d = same(sx, sy), qx = sx < 0 ? 0 : 16, qy = sy < 0 ? 0 : 16;
      let cx, cy;
      if (!h && !v) { cx = sx < 0 ? 0 : 2; cy = sy < 0 ? 0 : 2; }
      else if (h && !v) { cx = 1; cy = sy < 0 ? 0 : 2; }
      else if (!h && v) { cx = sx < 0 ? 0 : 2; cy = 1; }
      else if (!d) { cx = sx < 0 ? 2 : 0; cy = 3 + (sy < 0 ? 2 : 0); }
      else { cx = fx; cy = fy; }
      x.drawImage(im, cx * T + qx, cy * T + qy, 16, 16, X + qx, Y + qy, 16, 16);
    }
  } else x.drawImage(im, fx * T, fy * T, T, T, X, Y, T, T);
  if (tile === TILE.FOREST) { x.fillStyle = 'rgba(10,40,10,.16)'; x.fillRect(X, Y, T, T); }
  if (tile === TILE.SWAMP) { x.fillStyle = 'rgba(40,50,20,.32)'; x.fillRect(X, Y, T, T); if (vh(tx, ty, 5) % 3 === 0) { x.fillStyle = 'rgba(60,90,80,.7)'; x.fillRect(X + 6 + vh(tx, ty, 6) % 14, Y + 10 + vh(tx, ty, 7) % 12, 10, 4); } }
  if (tile === TILE.FLOWERS) { const cols = ['#f2e14c', '#f08ac0', '#ffffff', '#9fc4ff']; for (let i = 0; i < 4; i++) { const h = vh(tx, ty, i + 9); x.fillStyle = cols[h % 4]; x.fillRect(X + 3 + (h >>> 3) % 26, Y + 3 + (h >>> 9) % 26, 2, 2); } }
}
// Whole chunk of ground rendered once into its own canvas.
export function renderChunkGround(world, c, ts) {
  if (c.ground) return c.ground;
  const CSZ = Math.sqrt(c.tiles.length), cv = document.createElement('canvas'); cv.width = CSZ * T; cv.height = CSZ * T;
  const x = cv.getContext('2d'), tileAt = (tx, ty) => world.tile(tx, ty);
  for (let y = 0; y < CSZ; y++) for (let xx = 0; xx < CSZ; xx++) drawTerrainTile(x, tileAt, c.cx * CSZ + xx, c.cy * CSZ + y, xx * T, y * T, ts);
  c.ground = cv; return cv;
}

// ---------- props ----------
const pv = (p) => (p.v !== undefined ? p.v : (((Math.imul(Math.round(p.x), 7919) + Math.imul(Math.round(p.y), 104729)) >>> 0) % 1000) / 1000);
const pickN = (base, n, v) => `${base}${1 + Math.min(n - 1, Math.floor(v * n))}`;
const HOUSE_LABEL_Y = { houseA: 64, houseB: 74, houseP: 62 };
export function drawPropLPC(x, p, t) {
  if (!ART.ok) return false;
  const X = Math.round(p.x), Y = Math.round(p.y), v = pv(p);
  const shadow = (w, h = 4) => { x.fillStyle = 'rgba(0,0,0,.22)'; x.beginPath(); x.ellipse(X, Y, w, h, 0, 0, 7); x.fill(); };
  switch (p.type) {
    case 'tree': shadow(20, 5); return drawSprite(x, p.spr || (p.dark ? pickN('dark', 4, v) : pickN('oak', 7, v)), X, Y, p.season);
    case 'pine': shadow(16, 4); return drawSprite(x, pickN('pine', 4, v), X, Y, p.snow ? 'winter' : p.season);
    case 'dead_tree': shadow(12, 3); return drawSprite(x, v < .85 ? 'dead' : 'stump', X, Y, 'summer');
    case 'stump': return drawSprite(x, 'stump', X, Y, 'summer');
    case 'bush': return drawSprite(x, p.spr || ['bush1', 'bush2', 'leafy1', 'leafy2', 'leafy3', 'shrub1', 'shrub2', 'cypress1', 'fern1', 'cypress3'][Math.floor(v * 10)], X, Y + 2, p.season);
    case 'rock': return drawSprite(x, p.spr || (p.season === 'autumn' ? pickN('rockS', 5, v) : pickN('rockB', 6, v)), X, Y + 2);
    case 'snowrock': return drawSprite(x, pickN('rockG', 6, v), X, Y + 2);
    case 'deadbush': return drawSprite(x, pickN('reed', 6, v), X, Y, 'autumn');
    case 'reeds': return drawSprite(x, pickN('reed', 6, v), X, Y, p.season);
    case 'lily': return drawSprite(x, pickN('lily', 3, v), X, Y, 'summer');
    case 'barrel': return drawSprite(x, v < .75 ? 'barrel' : 'barrels', X, Y);
    case 'crate': return drawSprite(x, v < .7 ? 'crate' : 'crates', X, Y);
    case 'chest': return drawSprite(x, p.open ? 'chest_open' : 'chest', X, Y + 2);
    case 'campfire': {
      if (p.rest) { // костёр отдыха: кольцо камней и красная нитка на колышке — здесь можно перевести дух
        x.fillStyle = 'rgba(0,0,0,.25)'; x.beginPath(); x.ellipse(X, Y + 4, 22, 7, 0, 0, 7); x.fill();
        for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283, sx = Math.round(X + Math.cos(a) * 17), sy = Math.round(Y + 3 + Math.sin(a) * 6); x.fillStyle = i % 2 ? '#6e6a62' : '#85807a'; x.fillRect(sx - 3, sy - 2, 6, 4); x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(sx - 2, sy - 2, 3, 1); }
        x.fillStyle = '#5a3d24'; x.fillRect(X + 21, Y - 22, 2, 24);
        x.fillStyle = '#c63f37'; x.fillRect(X + 19, Y - 18, 6, 2); x.fillRect(X + 23, Y - 16, 2, 6 + Math.round(Math.sin(t * 2 + X)));
      }
      return drawAnim(x, 'campfire', X, Y + 2, t);
    }
    case 'cauldron': return drawAnim(x, 'cauldron', X, Y + 2, t);
    case 'fence': return drawSprite(x, 'fence', X, Y);
    case 'bones': return drawSprite(x, v < .5 ? 'bones' : 'skull', X, Y + 4);
    case 'well': if (p.fountain === false || p.roofed) { shadow(30, 6); return drawSprite(x, 'well_roof', X, Y + 6); } shadow(26, 6); return drawSprite(x, 'fountain', X, Y + 4);
    case 'grave': return drawSprite(x, v < .08 ? 'grave2' : ['grave1', 'grave3', 'grave4', 'grave5', 'grave6', 'grave1', 'grave3'][Math.floor(v * 7)], X, Y + 2);
    case 'tent': shadow(46, 7); return drawSprite(x, 'tent', X, Y + 4);
    case 'tower': shadow(44, 10); return drawSprite(x, 'tower_blue', X, Y + 4);
    case 'mausoleum': shadow(50, 8); return drawSprite(x, 'mausoleum', X, Y);
    case 'gate': return drawSprite(x, 'iron_gate', X, Y);
    case 'ruin_wall': if (p.arch) { shadow(56, 6); return drawSprite(x, 'arch', X, Y + 2); } drawWallChunk(x, X, Y, 2, (p.hgt || 20) > 26 ? 3 : 2, 'slate', v); return true;
    case 'pillar': shadow(14, 4); return drawSprite(x, p.dungeon ? 'pillar5' : ['pillar4', 'pillar2', 'pillar1'][Math.floor(v * 3)], X, Y + 2);
    case 'menhir': { shadow(12, 4); drawWallChunk(x, X, Y, 1, 2, 'black', v); if (p.glow) { const a = .45 + Math.sin(t * 2 + X) * .25; x.fillStyle = `rgba(160,230,255,${a})`; for (let i = 0; i < 4; i++) x.fillRect(X - 3 + (i % 2) * 4, Y - 50 + i * 9, 2, 5); } return true; }
    case 'altar': shadow(30, 5); drawSprite(x, 'slab', X, Y + 2); x.fillStyle = '#f2e6c8'; x.fillRect(X - 14, Y - 26, 2, 6); x.fillRect(X + 12, Y - 26, 2, 6); x.fillStyle = `rgba(255,200,90,${.7 + Math.sin(t * 9) * .3})`; x.fillRect(X - 14, Y - 29, 2, 3); x.fillRect(X + 12, Y - 29, 2, 3); return true;
    case 'mine': return drawSprite(x, 'cave', X, Y);
    case 'lamppost': shadow(6, 2); return drawSprite(x, 'lamp_lit', X, Y + 2);
    case 'house': {
      if (!p.sprite) return false;
      x.fillStyle = 'rgba(0,0,0,.22)'; x.fillRect(X - 60, Y + 4, 140, 8);
      drawSprite(x, p.sprite, X, Y);
      if (p.label) {
        x.font = 'bold 9px monospace'; const tw = x.measureText(p.label).width, ly = Y - (HOUSE_LABEL_Y[p.sprite] || 64);
        x.fillStyle = '#4a3020'; x.fillRect(X - tw / 2 - 5, ly - 9, tw + 10, 13); x.fillStyle = '#f2e6c8'; x.fillText(p.label, X - tw / 2, ly + 1);
      }
      return true;
    }
  }
  return false;
}
