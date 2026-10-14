// LPC sprite atlases: load the pages, recolour layers by palette and bake each character into its own sheets.
// A baked sheet per animation: 4 rows (up, left, down, right) × N frames, frame size 64 or 128.

let META = null;
const PAGES = { 64: [], 128: [] };
export const ANIM_FRAMES = { walk: 9, slash: 6, spellcast: 7, shoot: 8, hurt: 6 };
export const DIRS = { up: 0, left: 1, down: 2, right: 3 };

export async function loadSprites(base = '') {
  META = await (await fetch(base + 'sprites.json')).json();
  const load = (src) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = base + src; });
  for (const size of ['64', '128']) {
    const p = META.pages[size];
    const imgs = await Promise.all(p.files.map(load));
    PAGES[size] = imgs.map((im) => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); return { data: x.getImageData(0, 0, im.width, im.height).data, w: im.width }; });
  }
  return META;
}
export const spriteMeta = () => META;
export const hasItem = (id) => !!(META && META.items[id]);

// ---------- colour ----------
function rgb2hsl(r, g, b) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2; if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; } return [h, s, l]; }
function hsl2rgb(h, s, l) { const f = (n) => { const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l); return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); }; return [f(0), f(8), f(4)]; }
export const hex2rgb = (h) => { const n = parseInt(h.replace('#', '').slice(0, 6), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
export function shade(h, k) { const [r, g, b] = hex2rgb(h), t = k < 0 ? 0 : 255, a = Math.abs(k); const f = (v) => Math.round(v + (t - v) * a).toString(16).padStart(2, '0'); return '#' + f(r) + f(g) + f(b); }
export function lum(h) { const [r, g, b] = hex2rgb(h); return (r * .3 + g * .59 + b * .11) / 255; }
function shiftColor(src, key, target) {
  const [h, s, l] = src, [kh, ks, kl] = key, [th, ts, tl] = target;
  const ub = Math.min(1, tl + .2 + tl * .35);
  const L = l <= kl ? tl * (kl > 0 ? l / kl : 0) : tl + (ub - tl) * ((l - kl) / Math.max(1e-3, 1 - kl));
  const S = Math.min(1, ks > .04 ? ts * (s / ks) : ts);
  let dh = h - kh; if (dh > .5) dh -= 1; if (dh < -.5) dh += 1;
  return hsl2rgb((th + dh * .4 + 1) % 1, S, Math.max(0, Math.min(1, L)));
}
const rampCache = new Map();
function ramp(pi, hex) {
  const k = pi + hex; if (rampCache.has(k)) return rampCache.get(k);
  const P = META.palettes[pi].map((h) => rgb2hsl(...hex2rgb(h)));
  const lights = P.map((p) => p[2]).filter((l) => l > .22).sort((a, b) => a - b);
  const kl = lights.length ? lights[Math.floor(lights.length * .55)] : .5;
  const key = P.reduce((best, p) => (Math.abs(p[2] - kl) < Math.abs(best[2] - kl) ? p : best), P[0]);
  const out = P.map((p) => shiftColor(p, key, rgb2hsl(...hex2rgb(hex))));
  rampCache.set(k, out); return out;
}
const EYE_KEY = rgb2hsl(86, 134, 174);

// ---------- baking ----------
function layerSheets(item, body, group) {
  const res = [];
  for (const L of item.layers) {
    const b = L.b[`${body}:${group}`] || L.b[body] || L.b[body === 'teen' ? 'male' : body] || L.b.male;
    if (b) res.push({ z: L.z, b });
  }
  return res;
}
// spec: { body, group, layers: [[id, {body, eye, hair, cloth, metal}], ...] }
export function bake(spec, anim) {
  const parts = [];
  for (const [id, colors] of spec.layers) {
    const it = META.items[id]; if (!it) continue;
    for (const { z, b } of layerSheets(it, spec.body, spec.group)) {
      const a = b.a[anim]; if (!a) continue;
      const map = new Map();
      for (const [rgb, mi, pi, idx] of b.c) { const t = colors[it.mats[mi]]; if (t) map.set(rgb, ramp(pi, t)[idx]); }
      parts.push({ z, a, map, eye: (it.kind === 'head' || it.kind === 'face') ? colors.eye : null, kind: it.kind });
    }
  }
  parts.sort((p, q) => p.z - q.z);
  const n = ANIM_FRAMES[anim], rows = anim === 'hurt' ? 1 : 4;
  const S = parts.reduce((m, p) => Math.max(m, p.a.s), 64);
  const out = new ImageData(S * n, S * rows);
  const D = out.data, W = S * n;
  for (const p of parts) {
    const s = p.a.s, off = (S - s) / 2, page = PAGES[s], cfg = META.pages[s];
    const eyeT = p.eye ? rgb2hsl(...hex2rgb(p.eye)) : null;
    for (let r = 0; r < rows; r++) {
      const row = p.a.f[r]; if (!row) continue;
      for (let f = 0; f < n; f++) {
        const fi = row[f]; if (fi === undefined || fi < 0) continue;
        const pg = page[Math.floor(fi / cfg.per)], li = fi % cfg.per;
        const ox = (li % cfg.cols) * s, oy = Math.floor(li / cfg.cols) * s;
        for (let y = 0; y < s; y++) {
          let si = ((oy + y) * pg.w + ox) * 4, di = ((r * S + off + y) * W + f * S + off) * 4;
          for (let x = 0; x < s; x++, si += 4, di += 4) {
            const a = pg.data[si + 3]; if (!a) continue;
            let R = pg.data[si], Gc = pg.data[si + 1], B = pg.data[si + 2];
            const m = p.map.get((R << 16) | (Gc << 8) | B);
            if (m) { R = m[0]; Gc = m[1]; B = m[2]; } else if (eyeT && B > R + 30 && B > 60) [R, Gc, B] = shiftColor(rgb2hsl(R, Gc, B), EYE_KEY, eyeT);
            if (a === 255 || !D[di + 3]) { D[di] = R; D[di + 1] = Gc; D[di + 2] = B; D[di + 3] = a; }
            else { const t = a / 255; D[di] = D[di] * (1 - t) + R * t; D[di + 1] = D[di + 1] * (1 - t) + Gc * t; D[di + 2] = D[di + 2] * (1 - t) + B * t; D[di + 3] = Math.max(D[di + 3], a); }
          }
        }
      }
    }
  }
  const c = document.createElement('canvas'); c.width = out.width; c.height = out.height;
  c.getContext('2d').putImageData(out, 0, 0);
  return { canvas: c, size: S, frames: n };
}

// A character's baked animations, built on first use.
export class Look {
  constructor(spec) { this.spec = spec; this.sheets = {}; }
  sheet(anim) { return this.sheets[anim] || (this.sheets[anim] = bake(this.spec, anim)); }
  draw(ctx, anim, dir, frame, x, y, scale = 1) {
    const sh = this.sheet(anim); const S = sh.size; const row = anim === 'hurt' ? 0 : DIRS[dir];
    const f = Math.min(sh.frames - 1, Math.max(0, frame | 0));
    const w = S * scale;
    ctx.drawImage(sh.canvas, f * S, row * S, S, S, Math.round(x - w / 2), Math.round(y - w / 2 - 29 * scale), w, w);
  }
}
