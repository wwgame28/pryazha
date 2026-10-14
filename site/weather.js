// Погода: дождь (косые струи, брызги, сырой полумрак), туман (ползущие пятна), снегопад.
// Меняется раз в ~2,5 минуты игры по зерну дня и биому; в главе «Красная зима» часто идёт первый снег.
// Рисуется в экранных координатах поверх мира, до ночной темноты. Под землёй погоды нет.
import { LIFE } from './life.js';

const h1 = (i, s) => { let h = Math.imul(i | 0, 2654435761) ^ Math.imul(s | 0, 1597334677); h = Math.imul(h ^ (h >>> 15), 2246822519); return ((h ^ (h >>> 13)) >>> 0) / 4294967296; };
export const WEATHER = { rain: 0, fog: 0, snow: 0, want: { rain: 0, fog: 0, snow: 0 }, period: -1, biome: '' };

// state: { time, seed, biome, dark, chapter, indoor }
export function weatherTick(dt, s) {
  const W = WEATHER, per = Math.floor((s.time || 0) / 150);
  if (s.indoor) W.want = { rain: 0, fog: 0, snow: 0 };
  else if (per !== W.period || s.biome !== W.biome) {
    W.period = per; W.biome = s.biome;
    const r = h1(per, s.seed || 1), want = { rain: 0, fog: 0, snow: 0 };
    if (s.biome === 'snow') want.snow = .45 + r * .55;
    else if (s.chapter === 5 && r < .55) want.snow = .35 + r;                                  // «Красная зима»: первый снег
    else if (r < .2 && s.biome !== 'steppe') want.rain = Math.min(1, .45 + r * 3);
    else if (r < .32 && (s.biome === 'swamp' || s.dark > .25)) want.fog = .55 + (r - .2) * 3;  // туман — над болотом и в сумерках
    W.want = want;
  }
  const k = Math.min(1, dt * .12); // смена погоды — за несколько секунд, без рывка
  for (const key of ['rain', 'fog', 'snow']) W[key] += (Math.min(1, W.want[key]) - W[key]) * k;
}

export function drawWeather(x, vw, vh, t) {
  const W = WEATHER; if (!LIFE.on) return;
  if (W.rain > .02) {
    x.fillStyle = `rgba(28,38,54,${.2 * W.rain})`; x.fillRect(0, 0, vw, vh);
    const n = Math.round(190 * W.rain);
    x.fillStyle = `rgba(196,214,238,${.42 + .2 * W.rain})`;
    for (let i = 0; i < n; i++) {
      const sp = 480 + h1(i, 2) * 220, y = ((h1(i, 1) * (vh + 60) + t * sp) % (vh + 60)) - 30, xx = ((h1(i, 3) * (vw + 80) + y * .28 + t * 40) % (vw + 80)) - 40;
      x.fillRect(Math.round(xx), Math.round(y), 1, 9 + Math.round(h1(i, 4) * 6));
    }
    x.fillStyle = `rgba(214,228,246,${.4 * W.rain})`; // брызги по земле
    for (let i = 0; i < n / 3; i++) {
      const cyc = t * 2.5 + h1(i, 7), ph = cyc % 1; if (ph > .35) continue;
      const k = Math.floor(cyc), sx = Math.floor((h1(i, 5) + h1(k, i + 50)) * vw) % vw, sy = Math.floor((h1(i, 6) + h1(k, i + 90)) * vh) % vh, r = 1 + Math.round(ph * 6);
      x.fillRect(sx - r, sy, 1, 1); x.fillRect(sx + r, sy, 1, 1); x.fillRect(sx, sy - 1, 1, 1);
    }
  }
  if (W.fog > .02) {
    x.fillStyle = `rgba(214,220,226,${.1 * W.fog})`; x.fillRect(0, 0, vw, vh);
    for (let i = 0; i < 4; i++) {
      const fx = ((h1(i, 9) * vw + t * (8 + i * 4)) % (vw + 600)) - 300, fy = vh * (.15 + .22 * i) + Math.sin(t * .1 + i) * 30;
      const g = x.createRadialGradient(fx, fy, 20, fx, fy, 320); g.addColorStop(0, `rgba(222,228,232,${.24 * W.fog})`); g.addColorStop(1, 'rgba(222,228,232,0)');
      x.fillStyle = g; x.fillRect(fx - 320, fy - 320, 640, 640);
    }
  }
  if (W.snow > .02) {
    const n = Math.round(170 * W.snow); x.fillStyle = 'rgba(255,255,255,.9)';
    for (let i = 0; i < n; i++) {
      const y = ((h1(i, 11) * (vh + 20) + t * (28 + h1(i, 12) * 30)) % (vh + 20)) - 10, xx = (((h1(i, 13) * vw + Math.sin(t * 1.3 + i) * 12 + t * 10) % vw) + vw) % vw, sz = h1(i, 14) < .25 ? 2 : 1;
      x.fillRect(Math.round(xx), Math.round(y), sz, sz);
    }
  }
}
