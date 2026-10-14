// Живой мир: анимации поверх готовой графики — вода, ветер в траве и деревьях, дым из труб, «дыхание» стоящих,
// бабочки, светлячки, листопад, снег, тени облаков. Рисуется только то, что на экране; позиции считаются из
// времени и координат, без новых картинок и без выделения памяти на каждый кадр. Выключается в меню.
import { T, TILE } from './world.js';
import { CS, isRiver } from './overworld.js';

export const LIFE = { on: true };
try { LIFE.on = localStorage.getItem('pryazha_life') !== '0'; } catch (e) { /* без хранилища — по умолчанию включено */ }
export function setLife(on) { LIFE.on = !!on; try { localStorage.setItem('pryazha_life', on ? '1' : '0'); } catch (e) { /* ignore */ } }

const h2 = (x, y, s) => { let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
// ветер: волна, которая катится по карте, плюс медленные порывы
export const wind = (x, y, t) => Math.sin(t * 1.5 + x * .011 + y * .004) * .65 + Math.sin(t * .6 + x * .003 - y * .002) * .35;
const WET = new Set([TILE.WATER, TILE.SHALLOW]);
// пучки травы: [основание, середина, кончик]
const GRASS_COL = {
  [TILE.GRASS]: ['#3d7a2a', '#62a43e', '#9ad266'], [TILE.GRASS2]: ['#38722a', '#5c9c3a', '#92ca5e'], [TILE.FLOWERS]: ['#3d7a2a', '#62a43e', '#9ad266'],
  [TILE.FOREST]: ['#2a5226', '#3c6e32', '#5a8f44'], [TILE.SWAMP]: ['#3e4a2a', '#5a6a38', '#7e8c4c'], [TILE.MOSS]: ['#3a4a30', '#536a3e', '#6f8a4e'], [TILE.DRY]: ['#8a7442', '#a8915a', '#d2bd7e'],
};
const FLOWER = ['#f2e6c8', '#ffd25a', '#ff9ab8', '#9ac8ff', '#e8a0ff'];

// ---------- кэш по чанку: где вода (и где у неё берег), где растёт трава ----------
function chunkLife(world, c) {
  if (c.life) return c.life;
  const water = [], tufts = [], flowers = [], x0 = c.cx * CS, y0 = c.cy * CS;
  for (let y = 0; y < CS; y++) for (let x = 0; x < CS; x++) {
    const tile = c.tiles[y * CS + x], tx = x0 + x, ty = y0 + y, px = tx * T, py = ty * T;
    if (WET.has(tile)) {
      let shore = 0; const land = (a, b) => !WET.has(world.tile(a, b)) && world.tile(a, b) !== TILE.BRIDGE;
      if (land(tx, ty - 1)) shore |= 1; if (land(tx + 1, ty)) shore |= 2; if (land(tx, ty + 1)) shore |= 4; if (land(tx - 1, ty)) shore |= 8;
      water.push(px, py, tile === TILE.WATER ? 0 : 1, isRiver(tx, ty) ? 1 : 0, shore, Math.floor(h2(tx, ty, 5) * 1000));
      continue;
    }
    const col = GRASS_COL[tile]; if (!col) continue;
    const r = h2(tx, ty, 9);
    if (r < (tile === TILE.FOREST ? .2 : tile === TILE.DRY ? .09 : .16)) tufts.push(px + 6 + Math.floor(h2(tx, ty, 10) * 20), py + 12 + Math.floor(h2(tx, ty, 11) * 18), tile, 7 + Math.floor(h2(tx, ty, 12) * 4));
    if (tile === TILE.FLOWERS) for (let k = 0; k < 2; k++) flowers.push(px + 4 + Math.floor(h2(tx, ty, 20 + k) * 24), py + 8 + Math.floor(h2(tx, ty, 30 + k) * 20), Math.floor(h2(tx, ty, 40 + k) * FLOWER.length));
  }
  return (c.life = { water, tufts, flowers });
}

// ---------- земля: вода и трава (после земли, под предметами) ----------
export function drawGroundLife(x, world, cx, cy, vw, vh, t) {
  if (!LIFE.on || !world.infinite) return;
  const dim = 1 - (world.dark || 0) * .6, S0 = CS * T;
  const gx0 = Math.floor(cx / S0), gx1 = Math.floor((cx + vw) / S0), gy0 = Math.floor(cy / S0), gy1 = Math.floor((cy + vh) / S0);
  const inView = (px, py) => px > cx - T && px < cx + vw && py > cy - T && py < cy + vh + T;
  // вода: блики (на реке плывут по течению), рябь на мелководье, накат на берег
  for (let gy = gy0; gy <= gy1; gy++) for (let gx = gx0; gx <= gx1; gx++) {
    const L = chunkLife(world, world.chunk(gx, gy)), W = L.water;
    for (let i = 0; i < W.length; i += 6) {
      const px = W[i], py = W[i + 1]; if (!inView(px, py)) continue;
      const deep = W[i + 2] === 0, flow = W[i + 3], shore = W[i + 4], ph = W[i + 5] / 159;
      const a = (.2 + .25 * (.5 + .5 * Math.sin(t * 2.1 + ph))) * dim;
      x.fillStyle = `rgba(200,236,255,${a})`;
      const sp = flow ? 11 : 2.5, n = deep ? 2 : 1;
      for (let k = 0; k < n; k++) {
        const gy2 = 5 + ((W[i + 5] * (k + 3)) % 22), gx2 = ((W[i + 5] * (k + 7)) % 32 + t * sp * (k ? .8 : 1)) % 32;
        const len = deep ? 6 : 4; x.fillRect(px + Math.floor(gx2), py + gy2, Math.min(len, 32 - Math.floor(gx2)), 1);
      }
      if (deep && (W[i + 5] % 5) === 0 && Math.sin(t * 3.1 + ph * 7) > .82) { x.fillStyle = `rgba(255,255,255,${.75 * dim})`; x.fillRect(px + (W[i + 5] % 26) + 3, py + (W[i + 5] % 19) + 6, 2, 1); }
      if (!deep && (W[i + 5] & 3) === 0) { x.fillStyle = `rgba(230,250,255,${a * .9})`; x.fillRect(px + 8 + Math.round(Math.sin(t * 1.3 + ph) * 3), py + 16, 2, 1); }
      if (shore) {
        const d = 1 + Math.round((1 + Math.sin(t * 1.7 + ph)) * 1.6), fa = (.26 + .24 * (.5 + .5 * Math.sin(t * 1.7 + ph + 1.2))) * dim;
        x.fillStyle = `rgba(240,250,255,${fa})`;
        // пена — рваными штрихами, которые чуть ползут вдоль берега
        const hv = W[i + 5];
        for (let k = 0; k < 3; k++) {
          const off = Math.floor((hv * (k + 3) + t * 5) % 24), len = 4 + ((hv >> k) % 5);
          if (shore & 1) x.fillRect(px + off, py + d, len, 2);
          if (shore & 4) x.fillRect(px + 28 - off - len + 4, py + 30 - d, len, 2);
          if (shore & 8) x.fillRect(px + d, py + off, 2, len);
          if (shore & 2) x.fillRect(px + 30 - d, py + 28 - off - len + 4, 2, len);
        }
      }
    }
  }
  // трава: пучки по три травинки, кончики гнёт ветер; цветы кивают головками
  for (let seg = 0; seg < 3; seg++) {
    for (let gy = gy0; gy <= gy1; gy++) for (let gx = gx0; gx <= gx1; gx++) {
      const U = chunkLife(world, world.chunk(gx, gy)).tufts;
      let last = -1;
      for (let i = 0; i < U.length; i += 4) {
        const bx = U[i], by = U[i + 1]; if (!inView(bx, by)) continue;
        if (U[i + 2] !== last) { last = U[i + 2]; x.fillStyle = GRASS_COL[last][seg]; }
        const w = wind(bx, by, t), h = U[i + 3], sh = Math.ceil(h / 3), f = (seg + 1) / 3;
        for (let b = 0; b < 3; b++) { const tip = w * (2 + b * .4) * f * f; x.fillRect(Math.round(bx + (b - 1) * 2 + tip), by - (seg + 1) * sh + (b === 1 ? -1 : 0), 1, sh); }
      }
    }
  }
  for (let gy = gy0; gy <= gy1; gy++) for (let gx = gx0; gx <= gx1; gx++) {
    const F = chunkLife(world, world.chunk(gx, gy)).flowers;
    for (let i = 0; i < F.length; i += 3) {
      const fx = F[i], fy = F[i + 1]; if (!inView(fx, fy)) continue;
      const o = Math.round(wind(fx, fy, t) * 1.5);
      x.fillStyle = '#4f8a34'; x.fillRect(fx + Math.round(o / 2), fy - 4, 1, 4);
      x.fillStyle = FLOWER[F[i + 2]]; x.fillRect(fx + o - 1, fy - 6, 2, 2);
    }
  }
}

// ---------- предметы: насколько гнётся под ветром (наклон верхушки) ----------
const SWAY = { tree: .03, pine: .022, bush: .045, reeds: .09, deadbush: .06, dead_tree: .014 };
export function propSway(p, t) { const k = SWAY[p.type]; return LIFE.on && k ? wind(p.x, p.y, t) * k : 0; }
export function drawSwayed(x, p, t, draw) {
  const k = propSway(p, t);
  if (!k && !(LIFE.on && p.type === 'lily')) return draw();
  x.save();
  if (p.type === 'lily') x.translate(0, Math.round(Math.sin(t * 1.3 + p.x * .05)));
  else { x.translate(p.x, p.y); x.transform(1, 0, -k, 1, 0, 0); x.translate(-p.x, -p.y); }
  const r = draw(); x.restore(); return r;
}

// ---------- «дыхание» стоящих: на долю процента приподнимаются плечи ----------
export function breathe(x, e, t, draw) {
  if (!LIFE.on || e.dead || e.frame !== 0 || e.moving) return draw();
  const s = 1 + Math.sin(t * 2.3 + (e.x % 7)) * .014;
  x.save(); x.translate(e.x, e.y); x.scale(1, s); x.translate(-e.x, -e.y); draw(); x.restore();
}

// ---------- дым: из трубы, над дымником избы, над костром и котлом ----------
const SMOKE = { houseA: [134, -169], houseB: [-17, -186], campfire: [0, -16], cauldron: [0, -14] };
export function drawSmoke(x, props, cx, cy, vw, vh, t, dark) {
  if (!LIFE.on) return;
  for (const p of props) {
    const o = SMOKE[p.type === 'house' ? p.sprite : p.type]; if (!o) continue;
    const sx = p.x + o[0], sy = p.y + o[1]; if (sx < cx - 60 || sx > cx + vw + 60 || sy < cy - 120 || sy > cy + vh + 60) continue;
    const ph = (p.x * .013) % 1, w = wind(sx, sy, t), big = p.type === 'house';
    for (let i = 0; i < 6; i++) {
      const age = (t * (big ? .22 : .35) + i / 6 + ph) % 1, r = (big ? 2.5 : 1.5) + age * (big ? 7 : 4);
      const a = (1 - age) * (big ? .32 : .26) * (1 - (dark || 0) * .5);
      x.fillStyle = `rgba(214,210,202,${a})`;
      x.beginPath(); x.arc(sx + Math.sin(age * 5 + ph * 6) * 3 + age * w * 14, sy - age * (big ? 54 : 36), r, 0, 6.283); x.fill();
    }
  }
}

// ---------- воздух: бабочки днём, светлячки ночью, листья в лесу и на болоте, снег в пустошах, тени облаков ----------
// Частицы привязаны к клеткам мира, а не к экрану: камера едет — бабочка остаётся над своей поляной.
function cells(cx, cy, vw, vh, size, fn) {
  for (let gy = Math.floor((cy - size) / size); gy <= Math.floor((cy + vh + size) / size); gy++) for (let gx = Math.floor((cx - size) / size); gx <= Math.floor((cx + vw + size) / size); gx++) fn(gx, gy, gx * size, gy * size);
}
export function drawAir(x, world, cx, cy, vw, vh, t, biome, rain = 0) {
  if (!LIFE.on || !world.infinite) return;
  const dark = world.dark || 0;
  if (dark < .3 && rain < .3 && (biome === 'meadow' || biome === 'forest')) cells(cx, cy, vw, vh, 300, (gx, gy, X, Y) => {
    const r = h2(gx, gy, 71); if (r > .4) return;
    const bx = X + 150 + Math.sin(t * .7 + r * 40) * 70 + Math.sin(t * 1.9 + r * 9) * 12, by = Y + 150 + Math.cos(t * .5 + r * 30) * 45 + Math.sin(t * 2.6 + r * 5) * 8;
    const flap = Math.floor(t * 9 + r * 10) % 2, col = ['#f2e6c8', '#ffd25a', '#ff9ab8', '#9ac8ff'][Math.floor(r * 10) % 4];
    x.fillStyle = col; x.fillRect(Math.round(bx) - (flap ? 3 : 2), Math.round(by), flap ? 2 : 1, 2); x.fillRect(Math.round(bx) + 1, Math.round(by), flap ? 2 : 1, 2);
    x.fillStyle = '#2a2420'; x.fillRect(Math.round(bx), Math.round(by), 1, 2);
  });
  const leafy = biome === 'forest' || biome === 'swamp' || biome === 'steppe';
  if (leafy) cells(cx, cy, vw, vh, 180, (gx, gy, X, Y) => {
    const r = h2(gx, gy, 81); if (r > .45) return;
    const fall = (t * 22 + r * 180) % 180, lx = X + r * 180 + Math.sin(t * 1.8 + r * 20) * 9 + fall * .25 * wind(X, Y, t), ly = Y + fall;
    x.fillStyle = biome === 'forest' ? (r < .2 ? '#9ac24a' : '#d8b44a') : (r < .2 ? '#c8783a' : '#d8a03a');
    x.fillRect(Math.round(lx), Math.round(ly), Math.floor(t * 4 + r * 9) % 2 ? 3 : 2, 2);
  });
  if (biome === 'snow') cells(cx, cy, vw, vh, 48, (gx, gy, X, Y) => {
    const r = h2(gx, gy, 91); if (r > .55) return;
    const fall = (t * 24 + r * 48 * 7) % 48;
    x.fillStyle = 'rgba(255,255,255,.85)'; x.fillRect(Math.round(X + r * 48 + Math.sin(t * 1.4 + r * 30) * 4), Math.round(Y + fall), r < .2 ? 2 : 1, r < .2 ? 2 : 1);
  });
  // тени облаков: днём по земле медленно плывут большие мягкие пятна
  if (dark < .2 && rain < .3) {
    const Wd = vw + 1400;
    for (let i = 0; i < 3; i++) {
      const wx = cx - 700 + (((i * 977 + t * 13 - (cx - 700)) % Wd) + Wd) % Wd, wy = cy + vh * (.2 + .3 * i) + Math.sin(t * .05 + i) * 60;
      const g = x.createRadialGradient(wx, wy, 10, wx, wy, 260); g.addColorStop(0, 'rgba(10,20,30,.07)'); g.addColorStop(1, 'rgba(10,20,30,0)');
      x.fillStyle = g; x.fillRect(wx - 260, wy - 260, 520, 520);
    }
  }
}
// светлячки рисуются поверх ночной темноты, чтобы светиться
export function drawFireflies(x, world, cx, cy, vw, vh, t, biome) {
  if (!LIFE.on || !world.infinite || (world.dark || 0) < .3 || biome === 'snow') return;
  cells(cx, cy, vw, vh, 170, (gx, gy, X, Y) => {
    const r = h2(gx, gy, 61); if (r > .7) return;
    const fx = X + 85 + Math.sin(t * .4 + r * 50) * 60, fy = Y + 85 + Math.sin(t * .33 + r * 17) * 35, a = .35 + .65 * Math.max(0, Math.sin(t * 2.2 + r * 30));
    const X2 = Math.round(fx - cx), Y2 = Math.round(fy - cy);
    x.fillStyle = `rgba(220,255,120,${a * .18})`; x.fillRect(X2 - 4, Y2 - 4, 10, 10);
    x.fillStyle = `rgba(230,255,140,${a * .4})`; x.fillRect(X2 - 2, Y2 - 2, 6, 6);
    x.fillStyle = `rgba(250,255,200,${a})`; x.fillRect(X2, Y2, 2, 2);
  });
}
