// Maps, procedural pixel tiles and props. Tiles are 32 px; props are y-sorted with the characters.
import { mulberry } from './gen.js';

export const T = 32;
export const TILE = { GRASS: 0, GRASS2: 1, FLOWERS: 2, DIRT: 3, WATER: 4, BRIDGE: 5, SAND: 6, STONE: 7, WALL: 8, WOOD: 9, FOREST: 10, VOID: 11, COBBLE: 12, MOSS: 13, SNOW: 14, CLIFF: 15, DRY: 16, SWAMP: 17, SHALLOW: 18, FIELD: 19, GRAVEL: 20 };
export const SOLID = new Set([TILE.WATER, TILE.WALL, TILE.VOID, TILE.CLIFF]);
export const SLOW = new Set([TILE.SHALLOW, TILE.SWAMP]);

// ---------- tileset ----------
function px(x, c, X, Y, w = 1, h = 1) { x.fillStyle = c; x.fillRect(X, Y, w, h); }
function speckle(x, r, ox, oy, cols, n, w = 1, h = 1) { for (let i = 0; i < n; i++) px(x, cols[Math.floor(r() * cols.length)], ox + Math.floor(r() * T), oy + Math.floor(r() * T), w, h); }
export function makeTileset() {
  const N = 21, VAR = 4, c = document.createElement('canvas'); c.width = T * VAR; c.height = T * N * 2;
  const x = c.getContext('2d'), r = mulberry(7);
  const draw = (id, v, fn) => { const ox = v * T, oy = id * T; fn(ox, oy); };
  for (let v = 0; v < VAR; v++) {
    draw(TILE.GRASS, v, (ox, oy) => { px(x, '#5f9a3e', ox, oy, T, T); speckle(x, r, ox, oy, ['#6fae47', '#55893a', '#79b851'], 26, 1, 2); });
    draw(TILE.GRASS2, v, (ox, oy) => { px(x, '#5a9439', ox, oy, T, T); speckle(x, r, ox, oy, ['#6fae47', '#4c8233', '#83c05a'], 34, 1, 2); });
    draw(TILE.FLOWERS, v, (ox, oy) => { px(x, '#5f9a3e', ox, oy, T, T); speckle(x, r, ox, oy, ['#6fae47', '#55893a'], 18, 1, 2); for (let i = 0; i < 5; i++) { const fx = ox + 2 + Math.floor(r() * 27), fy = oy + 2 + Math.floor(r() * 27), col = ['#f2e14c', '#f08ac0', '#ffffff', '#9fc4ff'][Math.floor(r() * 4)]; px(x, col, fx, fy, 2, 2); px(x, '#3f7a2a', fx, fy + 2, 1, 2); } });
    draw(TILE.DIRT, v, (ox, oy) => { px(x, '#a07c50', ox, oy, T, T); speckle(x, r, ox, oy, ['#b08c5c', '#8d6c44', '#93734a'], 40); speckle(x, r, ox, oy, ['#7a5d3a'], 4, 2, 1); });
    draw(TILE.WATER, v, (ox, oy) => { px(x, '#2f6fa8', ox, oy, T, T); for (let i = 0; i < 5; i++) px(x, '#4f93cc', ox + Math.floor(r() * 26), oy + Math.floor(r() * 30), 6, 1); speckle(x, r, ox, oy, ['#285f92'], 20); });
    draw(TILE.BRIDGE, v, (ox, oy) => { px(x, '#8a6038', ox, oy, T, T); for (let y = 0; y < T; y += 8) { px(x, '#6e4a2a', ox, oy + y, T, 1); px(x, '#a37446', ox, oy + y + 1, T, 1); } px(x, '#5a3a20', ox, oy, 2, T); px(x, '#5a3a20', ox + T - 2, oy, 2, T); });
    draw(TILE.SAND, v, (ox, oy) => { px(x, '#d8c387', ox, oy, T, T); speckle(x, r, ox, oy, ['#e4d29a', '#c4ad72'], 40); });
    draw(TILE.STONE, v, (ox, oy) => { px(x, '#4a4750', ox, oy, T, T); x.fillStyle = '#3c3a42'; for (let y = 0; y < T; y += 8) { x.fillRect(ox, oy + y, T, 1); for (let xx = ((y / 8) % 2) * 8; xx < T; xx += 16) x.fillRect(ox + xx, oy + y, 1, 8); } speckle(x, r, ox, oy, ['#55525c', '#423f48'], 22); });
    draw(TILE.WALL, v, (ox, oy) => { px(x, '#2a2830', ox, oy, T, T); speckle(x, r, ox, oy, ['#34313b', '#24222a'], 30); });
    draw(TILE.WOOD, v, (ox, oy) => { px(x, '#8c6239', ox, oy, T, T); for (let y = 0; y < T; y += 6) px(x, '#6f4a29', ox, oy + y, T, 1); speckle(x, r, ox, oy, ['#9a6d42'], 12, 3, 1); });
    draw(TILE.FOREST, v, (ox, oy) => { px(x, '#3f6e2d', ox, oy, T, T); speckle(x, r, ox, oy, ['#4b7d34', '#355f26', '#5a8a3c', '#6b5a3a'], 40, 1, 2); });
    draw(TILE.VOID, v, (ox, oy) => px(x, '#0c0b10', ox, oy, T, T));
    draw(TILE.COBBLE, v, (ox, oy) => { px(x, '#8d8a86', ox, oy, T, T); for (let i = 0; i < 14; i++) { const cx = ox + Math.floor(r() * 28), cy = oy + Math.floor(r() * 28); px(x, ['#a19e99', '#7b7874', '#97938d'][Math.floor(r() * 3)], cx, cy, 5, 4); px(x, '#6b6864', cx, cy + 4, 5, 1); } });
    draw(TILE.SNOW, v, (ox, oy) => { px(x, '#e6eef2', ox, oy, T, T); speckle(x, r, ox, oy, ['#f6fafc', '#cfdde6', '#d8e4ea'], 34, 2, 1); });
    draw(TILE.CLIFF, v, (ox, oy) => { px(x, '#6b6660', ox, oy, T, T); speckle(x, r, ox, oy, ['#7d7871', '#57534e', '#8a857d'], 30, 3, 2); px(x, '#4a4642', ox, oy + T - 4, T, 4); });
    draw(TILE.DRY, v, (ox, oy) => { px(x, '#b4a25a', ox, oy, T, T); speckle(x, r, ox, oy, ['#c6b56a', '#9c8a48', '#a8964f'], 34, 1, 2); });
    draw(TILE.SWAMP, v, (ox, oy) => { px(x, '#4d5a34', ox, oy, T, T); speckle(x, r, ox, oy, ['#5a6a3a', '#3f4a2a', '#6b5a3a'], 30, 2, 1); if (r() < .6) { x.fillStyle = '#3a5a4a'; x.fillRect(ox + 4 + Math.floor(r() * 16), oy + 6 + Math.floor(r() * 16), 10, 5); } });
    draw(TILE.SHALLOW, v, (ox, oy) => { px(x, '#4a8ab8', ox, oy, T, T); for (let i = 0; i < 4; i++) px(x, '#7ab4dc', ox + Math.floor(r() * 26), oy + Math.floor(r() * 30), 5, 1); speckle(x, r, ox, oy, ['#5a9ac4', '#c8b98a'], 14); });
    draw(TILE.FIELD, v, (ox, oy) => { px(x, '#8a6a40', ox, oy, T, T); for (let y = 2; y < T; y += 6) { px(x, '#6a4f2e', ox, oy + y, T, 2); for (let xx = 2; xx < T; xx += 5) px(x, r() < .5 ? '#d8c04a' : '#9ab84a', ox + xx, oy + y - 2, 2, 2); } });
    draw(TILE.GRAVEL, v, (ox, oy) => { px(x, '#8f8a7e', ox, oy, T, T); speckle(x, r, ox, oy, ['#a39e92', '#7a756a', '#6b675e'], 46, 2, 2); });
    draw(TILE.MOSS, v, (ox, oy) => { px(x, '#3f4a3c', ox, oy, T, T); x.fillStyle = '#343e32'; for (let y = 0; y < T; y += 8) x.fillRect(ox, oy + y, T, 1); speckle(x, r, ox, oy, ['#4f6b3c', '#5e7f45', '#454f42'], 30, 2, 1); });
  }
  // water animation frame 2 below
  for (let v = 0; v < VAR; v++) { const ox = v * T, oy = (N + TILE.WATER) * T; px(x, '#2f6fa8', ox, oy, T, T); for (let i = 0; i < 5; i++) px(x, '#5aa0d6', ox + Math.floor(r() * 26), oy + Math.floor(r() * 30), 5, 1); speckle(x, r, ox, oy, ['#285f92'], 20); }
  return { canvas: c, N, VAR };
}

// ---------- props ----------
const PROP = {
  tree: { box: [-7, -6, 14, 8], h: 70 }, pine: { box: [-6, -6, 12, 8], h: 76 }, bush: { box: [-10, -6, 20, 8], h: 20 }, rock: { box: [-11, -8, 22, 12], h: 18 },
  well: { box: [-26, -18, 52, 20], h: 40 }, boat: { box: [-20, -12, 40, 10], h: 14 }, nets: { box: [-17, -4, 34, 6], h: 30 }, burnt: { box: null, h: 6 }, reeds: { box: null, h: 20 }, lily: { box: null, h: 2 }, stump: { box: [-8, -6, 16, 8], h: 14 }, barrel: { box: [-8, -6, 16, 8], h: 22 }, crate: { box: [-9, -8, 18, 10], h: 22 }, grave: { box: [-8, -4, 16, 6], h: 26 },
  fence: { box: [-16, -4, 32, 6], h: 18 }, chest: { box: [-10, -6, 20, 9], h: 18 }, torch: { box: null, h: 30 }, tent: { box: [-48, -24, 96, 26], h: 140 },
  campfire: { box: [-8, -6, 16, 8], h: 12 }, ruin_wall: { box: [-30, -10, 60, 12], h: 96 }, menhir: { box: [-12, -6, 24, 8], h: 64 }, mausoleum: { box: [-46, -62, 92, 54], h: 170 }, gate: { box: null, h: 80 }, altar: { box: [-28, -10, 56, 12], h: 26 }, tower: { box: [-40, -34, 80, 36], h: 340 }, cauldron: { box: [-10, -6, 20, 8], h: 16 }, dead_tree: { box: [-5, -4, 10, 6], h: 50 }, deadbush: { box: null, h: 10 }, mine: { box: null, h: 0 }, snowrock: { box: [-11, -8, 22, 12], h: 18 }, stairs_down: { box: null, h: 0 }, stairs_up: { box: null, h: 0 }, pillar: { box: [-10, -8, 20, 10], h: 52 }, bones: { box: null, h: 4 },
  sign: { box: [-6, -4, 12, 6], h: 26 }, statue: { box: [-12, -8, 24, 10], h: 56 }, house: { box: null, h: 0 }, lamppost: { box: [-3, -3, 6, 4], h: 52 },
};
const HOUSE_BOX = { houseA: [-48, -70, 192, 80], houseB: [-80, -100, 128, 98], houseP: [-112, -64, 160, 68] };
export function propBox(p) {
  if (p.box) return [p.x + p.box[0], p.y + p.box[1], p.box[2], p.box[3]];
  if (p.type === 'house' && p.sprite) { const b = HOUSE_BOX[p.sprite]; return [p.x + b[0], p.y + b[1], b[2], b[3]]; }
  if (p.type === 'house') return [p.x - p.w / 2, p.y - p.h * 0.55, p.w, p.h * 0.55];
  const d = PROP[p.type]; if (!d || !d.box) return null;
  const s = p.scale || 1; return [p.x + d.box[0] * s, p.y + d.box[1] * s, d.box[2] * s, d.box[3] * s];
}

export function drawProp(x, p, t) {
  const X = Math.round(p.x), Y = Math.round(p.y);
  const shadow = (w, h = 4) => { x.fillStyle = 'rgba(0,0,0,.22)'; x.beginPath(); x.ellipse(X, Y, w, h, 0, 0, 7); x.fill(); };
  switch (p.type) {
    case 'tree': {
      const s = p.scale || 1; shadow(16 * s, 5 * s);
      x.fillStyle = '#5a3b22'; x.fillRect(X - 4 * s, Y - 22 * s, 8 * s, 22 * s); x.fillStyle = '#6e4a2c'; x.fillRect(X - 1 * s, Y - 22 * s, 3 * s, 20 * s);
      const tone = p.tone || ['#2f6b2b', '#3e8536', '#57a046'];
      x.fillStyle = tone[0]; x.beginPath(); x.arc(X, Y - 40 * s, 22 * s, 0, 7); x.arc(X - 14 * s, Y - 30 * s, 14 * s, 0, 7); x.arc(X + 14 * s, Y - 30 * s, 14 * s, 0, 7); x.fill();
      x.fillStyle = tone[1]; x.beginPath(); x.arc(X - 4 * s, Y - 44 * s, 17 * s, 0, 7); x.arc(X + 10 * s, Y - 34 * s, 11 * s, 0, 7); x.fill();
      x.fillStyle = tone[2]; x.beginPath(); x.arc(X - 8 * s, Y - 50 * s, 8 * s, 0, 7); x.fill();
      if (p.fruit) { x.fillStyle = '#d33b2c'; for (const [a, b] of [[-12, -36], [8, -46], [14, -30], [-2, -28]]) x.fillRect(X + a * s, Y + b * s, 3, 3); }
      break;
    }
    case 'pine': {
      const s = p.scale || 1; shadow(12 * s, 4 * s);
      x.fillStyle = '#4a321e'; x.fillRect(X - 3 * s, Y - 14 * s, 6 * s, 14 * s);
      const layers = [['#1f4d2a', 26, 16], ['#28603a', 18, 34], ['#337347', 11, 50]];
      for (const [c, w, yy] of layers) { x.fillStyle = c; x.beginPath(); x.moveTo(X - w * s, Y - (yy - 4) * s); x.lineTo(X, Y - (yy + 26) * s); x.lineTo(X + w * s, Y - (yy - 4) * s); x.fill(); }
      if (p.snow) { x.fillStyle = '#e8f0f2'; x.fillRect(X - 4 * s, Y - 76 * s, 8 * s, 4 * s); }
      break;
    }
    case 'bush': shadow(12); x.fillStyle = '#2f6b2b'; x.beginPath(); x.arc(X - 6, Y - 8, 9, 0, 7); x.arc(X + 6, Y - 8, 9, 0, 7); x.arc(X, Y - 14, 9, 0, 7); x.fill(); x.fillStyle = '#4b8d3c'; x.beginPath(); x.arc(X - 3, Y - 15, 5, 0, 7); x.fill(); if (p.berries) { x.fillStyle = '#7a3bd1'; x.fillRect(X - 7, Y - 10, 2, 2); x.fillRect(X + 4, Y - 13, 2, 2); x.fillRect(X + 1, Y - 6, 2, 2); } break;
    case 'rock': shadow(13); x.fillStyle = '#7a7670'; x.beginPath(); x.moveTo(X - 12, Y); x.lineTo(X - 9, Y - 12); x.lineTo(X + 2, Y - 16); x.lineTo(X + 12, Y - 8); x.lineTo(X + 11, Y); x.fill(); x.fillStyle = '#948f88'; x.beginPath(); x.moveTo(X - 8, Y - 11); x.lineTo(X + 1, Y - 15); x.lineTo(X + 5, Y - 9); x.lineTo(X - 4, Y - 7); x.fill(); break;
    case 'well': shadow(18, 6); x.fillStyle = '#6d6a66'; x.fillRect(X - 16, Y - 18, 32, 16); x.fillStyle = '#8a8681'; for (let i = 0; i < 4; i++) x.fillRect(X - 16 + i * 8, Y - 18, 7, 3); x.fillStyle = '#1d3550'; x.fillRect(X - 12, Y - 18, 24, 4); x.fillStyle = '#5a3b22'; x.fillRect(X - 15, Y - 40, 3, 24); x.fillRect(X + 12, Y - 40, 3, 24); x.fillStyle = '#8a3a2a'; x.beginPath(); x.moveTo(X - 20, Y - 36); x.lineTo(X, Y - 48); x.lineTo(X + 20, Y - 36); x.fill(); break;
    case 'boat': { shadow(22, 5); x.fillStyle = '#4a3220'; x.beginPath(); x.ellipse(X, Y - 6, 22, 8, -.12, 0, Math.PI); x.fill(); x.fillStyle = '#6a4a2c'; x.beginPath(); x.ellipse(X, Y - 8, 21, 6, -.12, 0, 7); x.fill(); x.fillStyle = '#3a2616'; x.beginPath(); x.ellipse(X, Y - 8, 17, 4, -.12, 0, 7); x.fill(); x.strokeStyle = '#8a6a44'; x.lineWidth = 2; x.beginPath(); x.moveTo(X - 6, Y - 9); x.lineTo(X + 22, Y - 16); x.moveTo(X + 4, Y - 7); x.lineTo(X + 26, Y - 2); x.stroke(); break; }
    case 'nets': { shadow(18, 4); x.strokeStyle = '#5a3b22'; x.lineWidth = 3; x.beginPath(); x.moveTo(X - 16, Y); x.lineTo(X - 16, Y - 30); x.moveTo(X + 16, Y); x.lineTo(X + 16, Y - 30); x.stroke(); x.strokeStyle = 'rgba(200,190,160,.75)'; x.lineWidth = 1; for (let i = 0; i <= 8; i++) { x.beginPath(); x.moveTo(X - 16 + i * 4, Y - 28); x.lineTo(X - 16 + i * 4 + (i % 2 ? 1 : -1), Y - 10 + Math.sin(i) * 2); x.stroke(); } for (let j = 0; j < 5; j++) { x.beginPath(); x.moveTo(X - 16, Y - 27 + j * 4); x.quadraticCurveTo(X, Y - 23 + j * 4, X + 16, Y - 27 + j * 4); x.stroke(); } break; }
    case 'burnt': { shadow(14, 3); x.fillStyle = '#1e1a18'; x.save(); x.translate(X, Y - 4); x.rotate((p.v || .3) - .5); x.fillRect(-14, -3, 28, 6); x.fillStyle = '#3a2e28'; x.fillRect(-12, -3, 8, 2); x.fillStyle = '#5a2a1a'; x.fillRect(4, -1, 6, 2); x.restore(); break; }
    case 'barrel': shadow(9); x.fillStyle = '#7a5230'; x.fillRect(X - 8, Y - 20, 16, 20); x.fillStyle = '#5b3a1f'; x.fillRect(X - 8, Y - 16, 16, 2); x.fillRect(X - 8, Y - 6, 16, 2); x.fillStyle = '#9a6b3e'; x.fillRect(X - 6, Y - 22, 12, 3); break;
    case 'crate': shadow(10); x.fillStyle = '#9a6b3e'; x.fillRect(X - 9, Y - 18, 18, 18); x.strokeStyle = '#6a4423'; x.lineWidth = 2; x.strokeRect(X - 8, Y - 17, 16, 16); x.beginPath(); x.moveTo(X - 8, Y - 17); x.lineTo(X + 8, Y - 1); x.stroke(); break;
    case 'grave': shadow(9); x.fillStyle = '#8b8a8f'; x.beginPath(); x.moveTo(X - 8, Y); x.lineTo(X - 8, Y - 16); x.arc(X, Y - 16, 8, Math.PI, 0); x.lineTo(X + 8, Y); x.fill(); x.fillStyle = '#6c6b70'; x.fillRect(X - 1, Y - 18, 2, 10); x.fillRect(X - 4, Y - 15, 8, 2); x.fillStyle = '#5a4630'; x.fillRect(X - 9, Y, 18, 4); break;
    case 'fence': x.fillStyle = '#7a5230'; x.fillRect(X - 16, Y - 12, 32, 3); x.fillRect(X - 16, Y - 6, 32, 3); for (const o of [-14, -2, 10]) x.fillRect(X + o, Y - 16, 4, 16); break;
    case 'chest': shadow(11); x.fillStyle = p.open ? '#4a2f1a' : '#8a5a2b'; x.fillRect(X - 10, Y - 14, 20, 14); x.fillStyle = '#d4a93a'; x.fillRect(X - 10, Y - 9, 20, 2); x.fillRect(X - 2, Y - 11, 4, 5); if (p.open) { x.fillStyle = '#8a5a2b'; x.fillRect(X - 10, Y - 20, 20, 6); } else { x.fillStyle = '#9a6a3a'; x.fillRect(X - 10, Y - 16, 20, 3); } break;
    case 'torch': { const f = Math.sin(t * 12 + p.x) * 1.5; x.fillStyle = '#5a3b22'; x.fillRect(X - 2, Y - 24, 4, 12); x.fillStyle = '#ff9a2e'; x.beginPath(); x.ellipse(X, Y - 28 + f * .3, 4, 6 + f, 0, 0, 7); x.fill(); x.fillStyle = '#ffe28a'; x.beginPath(); x.ellipse(X, Y - 27, 2, 3, 0, 0, 7); x.fill(); break; }
    case 'tent': shadow(28, 6); x.fillStyle = p.color || '#8a6a3a'; x.beginPath(); x.moveTo(X - 28, Y); x.lineTo(X, Y - 44); x.lineTo(X + 28, Y); x.fill(); x.fillStyle = 'rgba(0,0,0,.25)'; x.beginPath(); x.moveTo(X, Y - 44); x.lineTo(X + 28, Y); x.lineTo(X, Y); x.fill(); x.fillStyle = '#2a1a10'; x.beginPath(); x.moveTo(X - 7, Y); x.lineTo(X, Y - 18); x.lineTo(X + 7, Y); x.fill(); break;
    case 'campfire': { const f = Math.sin(t * 14) * 2; x.fillStyle = '#5a3b22'; x.fillRect(X - 9, Y - 4, 18, 4); x.fillStyle = '#ff7a1e'; x.beginPath(); x.ellipse(X, Y - 9, 6, 9 + f, 0, 0, 7); x.fill(); x.fillStyle = '#ffd25a'; x.beginPath(); x.ellipse(X, Y - 7, 3, 5, 0, 0, 7); x.fill(); break; }
    case 'stairs_down': case 'stairs_up': { x.fillStyle = '#16141b'; x.fillRect(X - 16, Y - 16, 32, 32); for (let i = 0; i < 5; i++) { x.fillStyle = p.type === 'stairs_down' ? `rgb(${120 - i * 20},${116 - i * 20},${124 - i * 20})` : `rgb(${70 + i * 18},${66 + i * 18},${74 + i * 18})`; x.fillRect(X - 14, Y - 14 + i * 6, 28, 5); } break; }
    case 'pillar': shadow(12); x.fillStyle = '#5c5966'; x.fillRect(X - 9, Y - 50, 18, 50); x.fillStyle = '#716e7c'; x.fillRect(X - 9, Y - 50, 5, 50); x.fillStyle = '#7d7a88'; x.fillRect(X - 11, Y - 54, 22, 6); x.fillRect(X - 11, Y - 4, 22, 4); break;
    case 'bones': x.fillStyle = '#d8d2c0'; x.fillRect(X - 8, Y - 2, 12, 2); x.fillRect(X - 3, Y - 6, 2, 7); x.beginPath(); x.arc(X + 6, Y - 3, 3, 0, 7); x.fill(); break;
    case 'sign': shadow(7); x.fillStyle = '#5a3b22'; x.fillRect(X - 1, Y - 22, 3, 22); x.fillStyle = '#9a6b3e'; x.fillRect(X - 10, Y - 26, 20, 10); x.fillStyle = '#6a4423'; x.fillRect(X - 7, Y - 22, 14, 1); x.fillRect(X - 7, Y - 19, 10, 1); break;
    case 'statue': shadow(14); x.fillStyle = '#7d7a88'; x.fillRect(X - 12, Y - 12, 24, 12); x.fillStyle = '#9693a2'; x.fillRect(X - 6, Y - 44, 12, 32); x.beginPath(); x.arc(X, Y - 50, 7, 0, 7); x.fill(); x.fillRect(X - 12, Y - 40, 24, 5); break;
    case 'lamppost': { shadow(5, 2); x.fillStyle = '#2b2b30'; x.fillRect(X - 2, Y - 46, 4, 46); x.fillStyle = '#ffdf8a'; x.fillRect(X - 5, Y - 54, 10, 9); x.fillStyle = '#2b2b30'; x.fillRect(X - 6, Y - 56, 12, 3); break; }
    case 'house': drawHouse(x, p); break;
    case 'ruin_wall': { shadow(16, 4); const hgt = p.hgt || 28; x.fillStyle = '#7d7a72'; x.fillRect(X - 16, Y - hgt, 32, hgt); x.fillStyle = '#8f8b82'; for (let yy = Y - hgt; yy < Y; yy += 7) for (let xx = X - 16 + ((yy / 7) % 2) * 5; xx < X + 16; xx += 10) x.fillRect(xx, yy, 8, 5); x.fillStyle = '#6a6760'; x.fillRect(X - 16, Y - hgt, 6, 4); x.fillRect(X + 6, Y - hgt - 6, 10, 6); x.fillStyle = '#4f7a3a'; x.fillRect(X - 12, Y - 6, 6, 6); x.fillRect(X + 9, Y - hgt + 4, 4, 8); break; }
    case 'menhir': shadow(8, 3); x.fillStyle = '#7a7884'; x.beginPath(); x.moveTo(X - 7, Y); x.lineTo(X - 5, Y - 38); x.lineTo(X + 3, Y - 42); x.lineTo(X + 7, Y); x.fill(); x.fillStyle = '#8f8d9a'; x.fillRect(X - 4, Y - 36, 3, 30); if (p.glow) { x.fillStyle = `rgba(150,220,255,${.5 + Math.sin(t * 3 + X) * .3})`; x.fillRect(X - 1, Y - 30, 2, 6); x.fillRect(X - 1, Y - 20, 2, 2); } break;
    case 'altar': { shadow(16, 5); x.fillStyle = '#6d6a76'; x.fillRect(X - 14, Y - 14, 28, 14); x.fillStyle = '#86838f'; x.fillRect(X - 16, Y - 18, 32, 5); const g = .5 + Math.sin(t * 2) * .25; x.fillStyle = p.used ? '#555' : `rgba(255,236,150,${g})`; x.beginPath(); x.arc(X, Y - 24, 5, 0, 7); x.fill(); break; }
    case 'tower': { shadow(30, 8); x.fillStyle = '#5c5968'; x.fillRect(X - 24, Y - 110, 48, 110); x.fillStyle = '#6d6a7a'; x.fillRect(X - 24, Y - 110, 12, 110); x.fillStyle = 'rgba(0,0,0,.18)'; for (let yy = Y - 106; yy < Y; yy += 8) x.fillRect(X - 24, yy, 48, 1); x.fillStyle = '#4a4757'; for (let i = 0; i < 5; i++) x.fillRect(X - 26 + i * 11, Y - 120, 7, 12); x.fillStyle = '#2a1238'; x.fillRect(X - 7, Y - 22, 14, 22); x.fillStyle = p.tint || '#b56cff'; x.fillRect(X - 4, Y - 84, 8, 10); x.fillRect(X - 4, Y - 54, 8, 10); break; }
    case 'cauldron': { shadow(11, 3); x.fillStyle = '#5a3b22'; x.fillRect(X - 9, Y - 4, 18, 4); x.fillStyle = '#2a2a30'; x.beginPath(); x.ellipse(X, Y - 10, 11, 8, 0, 0, 7); x.fill(); x.fillStyle = '#6fd83a'; x.beginPath(); x.ellipse(X, Y - 15, 9, 3, 0, 0, 7); x.fill(); x.fillStyle = 'rgba(160,255,120,.6)'; x.fillRect(X - 3 + Math.sin(t * 3) * 3, Y - 24 - ((t * 10) % 8), 3, 3); break; }
    case 'dead_tree': { const s = p.scale || 1; shadow(9 * s, 3); x.fillStyle = '#4a3a2a'; x.fillRect(X - 3 * s, Y - 40 * s, 6 * s, 40 * s); x.fillRect(X - 14 * s, Y - 34 * s, 12 * s, 3 * s); x.fillRect(X + 2 * s, Y - 28 * s, 13 * s, 3 * s); x.fillRect(X - 14 * s, Y - 42 * s, 3 * s, 10 * s); x.fillRect(X + 12 * s, Y - 36 * s, 3 * s, 10 * s); break; }
    case 'deadbush': x.fillStyle = '#8a7240'; for (const [a, b] of [[-6, -8], [-2, -11], [3, -9], [6, -6]]) x.fillRect(X + a, Y + b, 2, -b); break;
    case 'snowrock': shadow(13); x.fillStyle = '#8a8e96'; x.beginPath(); x.moveTo(X - 12, Y); x.lineTo(X - 9, Y - 12); x.lineTo(X + 2, Y - 16); x.lineTo(X + 12, Y - 8); x.lineTo(X + 11, Y); x.fill(); x.fillStyle = '#f2f6f8'; x.beginPath(); x.moveTo(X - 9, Y - 12); x.lineTo(X + 2, Y - 16); x.lineTo(X + 10, Y - 9); x.lineTo(X, Y - 10); x.fill(); break;
    case 'mine': { x.fillStyle = '#16141b'; x.fillRect(X - 18, Y - 30, 36, 30); x.fillStyle = '#6a4423'; x.fillRect(X - 22, Y - 34, 6, 34); x.fillRect(X + 16, Y - 34, 6, 34); x.fillRect(X - 24, Y - 38, 48, 7); x.fillStyle = '#3a2a1a'; x.fillRect(X - 12, Y - 4, 24, 4); break; }
  }
}
function drawHouse(x, p) {
  if (p.small) { p = { ...p }; }
  const { w, h } = p, L = Math.round(p.x - w / 2), B = Math.round(p.y), wallH = Math.round(h * .55), top = B - wallH, roofH = Math.round(h * .55);
  x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(L + 4, B - 2, w, 6);
  // walls
  x.fillStyle = p.wall || '#c9b48a'; x.fillRect(L, top, w, wallH);
  if (p.stone) { x.fillStyle = 'rgba(0,0,0,.12)'; for (let yy = top + 4; yy < B; yy += 7) for (let xx = L + ((yy / 7) % 2) * 6; xx < L + w; xx += 12) x.fillRect(xx, yy, 10, 1); }
  else { x.fillStyle = '#6a4423'; x.fillRect(L, top, 4, wallH); x.fillRect(L + w - 4, top, 4, wallH); x.fillRect(L, top + Math.round(wallH / 2), w, 3); }
  x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(L, B - 3, w, 3);
  // windows
  for (const wx of p.windows || []) { x.fillStyle = '#3b2a1a'; x.fillRect(L + wx - 8, top + 10, 16, 14); x.fillStyle = '#ffd98a'; x.fillRect(L + wx - 6, top + 12, 12, 10); x.fillStyle = '#3b2a1a'; x.fillRect(L + wx - 1, top + 12, 2, 10); x.fillRect(L + wx - 6, top + 16, 12, 2); }
  // door
  const dx = L + (p.door ?? w / 2);
  x.fillStyle = '#3b2412'; x.fillRect(dx - 9, B - 26, 18, 26); x.fillStyle = '#7a4a26'; x.fillRect(dx - 7, B - 24, 14, 24); x.fillStyle = '#d4a93a'; x.fillRect(dx + 3, B - 13, 2, 2);
  // roof
  const rc = p.roof || '#8a3a2a';
  x.fillStyle = rc; x.beginPath(); x.moveTo(L - 8, top + 4); x.lineTo(L + 8, top - roofH); x.lineTo(L + w - 8, top - roofH); x.lineTo(L + w + 8, top + 4); x.fill();
  x.fillStyle = 'rgba(0,0,0,.18)'; for (let yy = top - roofH + 6; yy < top + 2; yy += 6) x.fillRect(L - 4, yy, w + 8, 1);
  x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(L + 8, top - roofH, w - 16, 3);
  if (p.chimney) { x.fillStyle = '#6d6a66'; x.fillRect(L + w - 30, top - roofH - 12, 10, 20); }
  // signboard
  if (p.label) {
    x.font = 'bold 9px monospace'; const tw = x.measureText(p.label).width;
    x.fillStyle = '#5a3b22'; x.fillRect(dx - tw / 2 - 5, top - 2, tw + 10, 13); x.fillStyle = '#f2e6c8'; x.fillText(p.label, dx - tw / 2, top + 8);
  }
}

// ---------- maps ----------
function grid(w, h, v) { return Array.from({ length: h }, () => new Array(w).fill(v)); }
function rect(g, x0, y0, w, h, v) { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (g[y] && g[y][x] !== undefined) g[y][x] = v; }

export function buildVillage() {
  const W = 46, H = 36, g = grid(W, H, TILE.GRASS), r = mulberry(11), props = [], spots = {};
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) g[y][x] = r() < .45 ? TILE.GRASS2 : TILE.GRASS;
  smooth(g, W, H, [TILE.GRASS2, TILE.GRASS], 2);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (r() < .07) g[y][x] = TILE.FLOWERS;
  // roads, then the river on the east with a bridge over the road
  rect(g, 21, 0, 3, 36, TILE.DIRT); rect(g, 4, 16, 40, 2, TILE.DIRT);
  rect(g, 16, 12, 13, 10, TILE.COBBLE);
  for (let y = 0; y < H; y++) { const cx = 34 + Math.round(Math.sin(y / 4) * 1.5); rect(g, cx, y, 3, 1, y === 16 || y === 17 ? TILE.BRIDGE : TILE.WATER); }
  // graveyard east of the river
  rect(g, 38, 6, 8, 22, TILE.MOSS); rect(g, 40, 16, 6, 2, TILE.DIRT);
  for (let y = 8; y < 26; y += 3) for (let x = 39; x < 46; x += 3) if (Math.abs(y - 17) > 1) props.push({ type: 'grave', x: x * T + 16, y: y * T + 24 });
  props.push({ type: 'stairs_down', x: 44 * T + 16, y: 17 * T, to: 'crypt1', label: 'Склеп' });
  props.push({ type: 'statue', x: 44 * T + 16, y: 14 * T });
  // houses (label shown on the signboard)
  const house = (tx, ty, w, h, opt) => { const p = { type: 'house', x: tx * T, y: ty * T, w: w * T, h: h * T, ...opt }; props.push(p); return p; };
  house(12, 11, 7, 4, { label: 'ТАВЕРНА', roof: '#7a2f2a', wall: '#c9b48a', windows: [30, 190], chimney: true, role: 'inn', door: 112 });
  house(30, 11, 6, 4, { label: 'ЛАВКА', roof: '#2f5a7a', wall: '#d8c9a4', windows: [28, 160], role: 'shop', door: 96 });
  house(12, 26, 6, 4, { label: 'КУЗНИЦА', roof: '#4a4a52', wall: '#9a948c', stone: true, windows: [30], chimney: true, role: 'smith', door: 120 });
  house(31, 26, 6, 4, { label: 'СТАРОСТА', roof: '#5a3a7a', wall: '#d9c7a0', windows: [30, 160], role: 'elder', door: 96 });
  house(6, 4, 5, 3, { roof: '#7a5a2a', windows: [40] }); house(36, 31, 5, 3, { roof: '#7a2f2a', windows: [40] }); house(5, 31, 5, 3, { roof: '#2f5a3a', windows: [110] });
  props.push({ type: 'well', x: 22 * T + 16, y: 17 * T - 40 });
  for (const [a, b] of [[17, 13], [27, 13], [17, 21], [27, 21]]) props.push({ type: 'lamppost', x: a * T + 16, y: b * T + 16 });
  for (const [a, b] of [[9, 12], [10, 12], [28, 12], [9, 27]]) props.push({ type: 'barrel', x: a * T + 16, y: b * T + 20 });
  for (const [a, b] of [[34, 12], [35, 12]]) props.push({ type: 'crate', x: a * T + 16, y: b * T + 20 });
  // fences and trees around the edge
  for (let x = 0; x < W; x++) for (const y of [0, H - 1]) if (x < 20 || x > 24) if (r() < .8) props.push({ type: r() < .5 ? 'tree' : 'pine', x: x * T + 16 + (r() - .5) * 10, y: y * T + 26, scale: .85 + r() * .3 });
  for (let y = 1; y < H - 1; y++) if (y < 15 || y > 18) if (r() < .8) props.push({ type: r() < .5 ? 'tree' : 'pine', x: 16 + (r() - .5) * 8, y: y * T + 26, scale: .85 + r() * .3 });
  for (let i = 0; i < 18; i++) { const x = 2 + Math.floor(r() * 30), y = 2 + Math.floor(r() * 32); if (g[y][x] <= TILE.FLOWERS && !nearProp(props, x * T, y * T, 70)) props.push({ type: r() < .5 ? 'bush' : 'tree', x: x * T + 16, y: y * T + 24, berries: r() < .3, fruit: r() < .3 }); }
  props.push({ type: 'sign', x: 23 * T + 24, y: 2 * T, text: 'Север: Шепчущий лес' });
  props.push({ type: 'sign', x: 40 * T + 8, y: 15 * T + 12, text: 'Старое кладбище. Склеп запечатан приказом старосты' });
  spots.start = [22 * T + 16, 19 * T]; spots.inn = [12 * T, 12 * T]; spots.fromForest = [22 * T + 16, 2 * T]; spots.fromCrypt = [42 * T, 17 * T + 10];
  const exits = [{ x: 20 * T, y: 0, w: 4 * T, h: 12, to: 'forest', at: 'fromVillage', label: 'Шепчущий лес' }];
  return { id: 'village', name: 'Деревня Ольховый Брод', w: W, h: H, g, props, spots, exits, dark: 0, ambient: 'village' };
}
// cellular smoothing so ground patches read as meadows, not a checkerboard
function smooth(g, W, H, [a, b], n) {
  for (let it = 0; it < n; it++) {
    const c = g.map((row) => row.slice());
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let k = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((c[y + dy] || [])[x + dx] === a) k++; g[y][x] = k >= 5 ? a : b; }
  }
}
function nearProp(props, x, y, d) { return props.some((p) => Math.abs(p.x - x) < d && Math.abs(p.y - y) < d); }

export function buildForest(seed) {
  const W = 64, H = 56, g = grid(W, H, TILE.FOREST), r = mulberry(seed), props = [], spots = {};
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const n = r(); g[y][x] = n < .42 ? TILE.GRASS2 : TILE.FOREST; }
  smooth(g, W, H, [TILE.GRASS2, TILE.FOREST], 3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g[y][x] === TILE.GRASS2 && r() < .08) g[y][x] = TILE.FLOWERS;
  // winding path from the south gate to the goblin camp in the north-east
  let px0 = 32;
  for (let y = H - 1; y > 10; y--) { px0 += Math.round((r() - .5) * 2 + (y < 30 ? .35 : 0)); px0 = Math.max(6, Math.min(W - 8, px0)); rect(g, px0, y, 3, 1, TILE.DIRT); }
  // pond
  const pcx = 14, pcy = 30; for (let y = -5; y <= 5; y++) for (let x = -7; x <= 7; x++) if ((x * x) / 49 + (y * y) / 25 < 1) g[pcy + y][pcx + x] = TILE.WATER; else if ((x * x) / 64 + (y * y) / 36 < 1) g[pcy + y][pcx + x] = TILE.SAND;
  // goblin camp
  const cx = Math.min(W - 12, px0 + 2), cy = 8;
  rect(g, cx - 7, cy - 5, 15, 11, TILE.DIRT);
  props.push({ type: 'campfire', x: cx * T, y: cy * T + 10 });
  for (const [a, b, c] of [[-5, -3, '#8a6a3a'], [5, -3, '#6a4a2a'], [-5, 4, '#7a5a3a'], [5, 4, '#5a4a3a']]) props.push({ type: 'tent', x: (cx + a) * T, y: (cy + b) * T + 20, color: c });
  props.push({ type: 'chest', x: cx * T + 40, y: (cy - 3) * T, loot: 'camp' });
  spots.camp = [cx * T, cy * T + 60]; spots.fromVillage = [33 * T, (H - 2) * T];
  // trees: dense except on paths, clearings and the camp
  const clear = (x, y) => g[y][x] === TILE.DIRT || g[y][x] === TILE.WATER || g[y][x] === TILE.SAND || (Math.abs(x - cx) < 9 && Math.abs(y - cy) < 7);
  for (let y = 1; y < H; y++) for (let x = 0; x < W; x++) {
    if (clear(x, y)) continue;
    const edge = x < 2 || x > W - 3 || y < 2;
    const near = [[0, 1], [1, 0], [0, -1], [-1, 0]].some(([a, b]) => g[y + b] && g[y + b][x + a] === TILE.DIRT);
    if (near) continue;
    if (edge || r() < .16) props.push({ type: r() < .55 ? 'pine' : 'tree', x: x * T + 16 + (r() - .5) * 12, y: y * T + 26, scale: .85 + r() * .4, tone: r() < .3 ? ['#2a5a2a', '#3a7232', '#4f8e40'] : undefined });
    else if (r() < .05) props.push({ type: 'bush', x: x * T + 16, y: y * T + 22, berries: r() < .4 });
    else if (r() < .02) props.push({ type: 'rock', x: x * T + 16, y: y * T + 22 });
  }
  // hidden chests in clearings
  for (let i = 0; i < 4; i++) { const x = 4 + Math.floor(r() * (W - 8)), y = 12 + Math.floor(r() * (H - 18)); if (!clear(x, y)) { removeNear(props, x * T + 16, y * T + 20, 40); props.push({ type: 'chest', x: x * T + 16, y: y * T + 20, loot: 'forest' }); } }
  const exits = [{ x: 29 * T, y: H * T - 14, w: 8 * T, h: 14, to: 'village', at: 'fromForest', label: 'Деревня' }];
  return { id: 'forest', name: 'Шепчущий лес', w: W, h: H, g, props, spots, exits, dark: .12, ambient: 'forest', seed };
}
function removeNear(props, x, y, d) { for (let i = props.length - 1; i >= 0; i--) if (Math.abs(props[i].x - x) < d && Math.abs(props[i].y - y) < d) props.splice(i, 1); }

export function buildCrypt(floor, seed, opts = {}) {
  const W = 56, H = 46, g = grid(W, H, TILE.WALL), r = mulberry(seed + floor * 101), props = [], spots = {}, rooms = [];
  const floors = opts.floors || 3, base = opts.base || 'crypt', boss = !!opts.boss && floor === floors;
  const tries = boss ? 40 : 90;
  for (let i = 0; i < tries && rooms.length < (boss ? 6 : 11); i++) {
    const w = 6 + Math.floor(r() * 7), h = 5 + Math.floor(r() * 6), x = 2 + Math.floor(r() * (W - w - 4)), y = 2 + Math.floor(r() * (H - h - 4));
    if (rooms.some((o) => x < o.x + o.w + 2 && x + w + 2 > o.x && y < o.y + o.h + 2 && y + h + 2 > o.y)) continue;
    rooms.push({ x, y, w, h });
  }
  if (boss) { const bw = 16, bh = 12, bx = W - bw - 3, by = 3; rooms.push({ x: bx, y: by, w: bw, h: bh, boss: true }); }
  for (const o of rooms) rect(g, o.x, o.y, o.w, o.h, TILE.STONE);
  const center = (o) => [Math.floor(o.x + o.w / 2), Math.floor(o.y + o.h / 2)];
  rooms.sort((a, b) => (a.boss ? 1 : 0) - (b.boss ? 1 : 0) || a.x - b.x);
  for (let i = 1; i < rooms.length; i++) {
    const [ax, ay] = center(rooms[i - 1]), [bx, by] = center(rooms[i]);
    if (r() < .5) { rect(g, Math.min(ax, bx), ay, Math.abs(ax - bx) + 2, 2, TILE.STONE); rect(g, bx, Math.min(ay, by), 2, Math.abs(ay - by) + 2, TILE.STONE); }
    else { rect(g, ax, Math.min(ay, by), 2, Math.abs(ay - by) + 2, TILE.STONE); rect(g, Math.min(ax, bx), by, Math.abs(ax - bx) + 2, 2, TILE.STONE); }
  }
  const first = rooms[0], last = rooms[rooms.length - 1];
  const [sx, sy] = center(first), [ex, ey] = center(last);
  props.push({ type: 'stairs_up', x: sx * T + 16, y: sy * T + 16, to: floor === 1 ? 'world' : `${base}:${floor - 1}`, at: floor === 1 ? null : 'down', pos: floor === 1 ? opts.exit : null });
  spots.up = [sx * T + 16, sy * T + 56];
  if (floor < floors) { props.push({ type: 'stairs_down', x: ex * T + 16, y: ey * T + 16, to: `${base}:${floor + 1}`, at: 'up' }); spots.down = [ex * T + 16, ey * T + 56]; }
  spots.boss = [ex * T + 16, ey * T];
  // decoration
  for (const o of rooms) {
    for (let k = 0; k < 2; k++) props.push({ type: 'torch', x: (o.x + 1 + Math.floor(r() * (o.w - 2))) * T + 16, y: o.y * T + 4, light: true });
    if (o.w >= 9 && o.h >= 7 && r() < .6) for (const [a, b] of [[2, 2], [o.w - 3, 2], [2, o.h - 2], [o.w - 3, o.h - 2]]) props.push({ type: 'pillar', dungeon: true, x: (o.x + a) * T + 16, y: (o.y + b) * T + 16 });
    for (let k = 0; k < 3; k++) if (r() < .6) props.push({ type: 'bones', x: (o.x + 1 + r() * (o.w - 2)) * T, y: (o.y + 1 + r() * (o.h - 2)) * T });
    if (o !== first && !o.boss && r() < .45) props.push({ type: 'chest', x: (o.x + 1 + Math.floor(r() * (o.w - 2))) * T + 16, y: (o.y + 1) * T + 24, loot: 'crypt' + floor, key: `${base}:${floor}:${props.length}` });
  }
  const name = opts.name ? `${opts.name}, ${floor === floors && opts.boss ? opts.bossRoom || 'последний зал' : ['', 'верхний ярус', 'нижний ярус', 'глубины'][floor]}` : `Склеп, ${['', 'верхний ярус', 'катакомбы', 'зал Лича'][floor]}`;
  return { id: `${base}:${floor}`, name, w: W, h: H, g, props, spots, exits: [], dark: .82, ambient: 'crypt', rooms, floor, seed, tag: opts.tags ? opts.tags[floor - 1] : null, spawnKey: (opts.spawn || 'crypt') + Math.min(floor, opts.spawnMax || 3), level: opts.level || 1 };
}

export function solidTile(map, tx, ty) {
  if (map.tile) return SOLID.has(map.tile(tx, ty));
  if (tx < 0 || ty < 0 || tx >= map.w || ty >= map.h) return true;
  return SOLID.has(map.g[ty][tx]);
}

export function drawGround(x, map, ts, cam, vw, vh, t, tileHook) {
  const inf = !!map.tile;
  const x0 = inf ? Math.floor(cam.x / T) : Math.max(0, Math.floor(cam.x / T)), y0 = inf ? Math.floor(cam.y / T) : Math.max(0, Math.floor(cam.y / T));
  const x1 = inf ? Math.floor((cam.x + vw) / T) : Math.min(map.w - 1, Math.floor((cam.x + vw) / T)), y1 = inf ? Math.floor((cam.y + vh) / T) : Math.min(map.h - 1, Math.floor((cam.y + vh) / T));
  const wf = Math.floor(t * 1.5) % 2;
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const id = map.tile ? map.tile(tx, ty) : map.g[ty][tx], v = (((tx * 7 + ty * 13) % ts.VAR) + ts.VAR) % ts.VAR;
    const row = id === TILE.WATER && wf ? ts.N + id : id;
    const dx = Math.round(tx * T - cam.x), dy = Math.round(ty * T - cam.y);
    if (tileHook && tileHook(x, map, tx, ty, dx, dy)) continue;
    x.drawImage(ts.canvas, v * T, row * T, T, T, dx, dy, T, T);
    if (id === TILE.WALL) {
      const below = map.tile ? map.tile(tx, ty + 1) : ty + 1 < map.h ? map.g[ty + 1][tx] : TILE.WALL;
      if (below !== TILE.WALL) { // visible face of the wall
        x.fillStyle = '#4b4654'; x.fillRect(dx, dy + 8, T, T - 8);
        x.fillStyle = '#3a3642'; for (let yy = 12; yy < T; yy += 7) x.fillRect(dx, dy + yy, T, 1);
        for (let xx = ((ty + tx) % 2) * 8; xx < T; xx += 16) x.fillRect(dx + xx, dy + 8, 1, T - 8);
        x.fillStyle = '#5c5768'; x.fillRect(dx, dy + 8, T, 2);
      }
    }
    // soft edges where grass meets path or water
    if (id === TILE.WATER || id === TILE.SHALLOW) { const up = map.tile ? map.tile(tx, ty - 1) : ty > 0 ? map.g[ty - 1][tx] : id; if (up !== TILE.WATER && up !== TILE.BRIDGE && up !== TILE.SHALLOW) { x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(dx, dy, T, 2); } }
    if (id === TILE.CLIFF) { const below = map.tile ? map.tile(tx, ty + 1) : TILE.CLIFF; if (below !== TILE.CLIFF) { x.fillStyle = '#4a4642'; x.fillRect(dx, dy + 18, T, 14); x.fillStyle = '#3a3733'; for (let xx = 3; xx < T; xx += 7) x.fillRect(dx + xx, dy + 20, 2, 12); } }
  }
}
