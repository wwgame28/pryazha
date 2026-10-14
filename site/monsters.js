// Non-humanoid LPC monsters ([LPC] Monsters, LPC Golem): sprite-sheet looks with the same draw() interface as Look.
const DIRS = { up: 0, left: 1, down: 2, right: 3 };
const ANIM_N = { walk: 9, slash: 6, spellcast: 7, shoot: 8, hurt: 6 };
// base: 3 cols x 6 rows (walk up/left/down/right, then 6-frame death); attack: 64px frames x 4 rows
export const MON = {
  bat: { base: 'bat', fw: 32, fh: 32, atk: 'bat-attack', an: 7, pad: 4, lift: 14 },
  slime: { base: 'slime', fw: 32, fh: 32, atk: 'slime-attack', an: 8, pad: 2 },
  ghost: { base: 'ghost', fw: 40, fh: 46, atk: 'ghost-attack', an: 6, pad: 2, lift: 4 },
  eyeball: { base: 'eyeball', fw: 32, fh: 38, atk: 'eyeball-attack', an: 7, pad: 2, lift: 8 },
  big_worm: { base: 'big_worm', fw: 35, fh: 50, atk: 'big_worm-attack', an: 6, pad: 2 },
  snake: { base: 'snake', fw: 32, fh: 32, atk: 'snake-attack', an: 7, pad: 4 },
  arachne: { walk: 'arachne', fw: 48, fh: 64, cols: 3, pad: 4 },
  golem: { walk: 'golem-walk', wn: 7, fw: 64, fh: 64, atk: 'golem-attack', an: 7, die: 'golem-die', dn: 7, pad: 4 },
};
const IMG = {};
export async function loadMonsters(base = 'mon/') {
  const names = new Set(); for (const m of Object.values(MON)) for (const k of ['base', 'atk', 'walk', 'die']) if (m[k]) names.add(m[k]);
  await Promise.all([...names].map((n) => new Promise((res) => { const im = new Image(); im.onload = () => { IMG[n] = im; res(); }; im.onerror = res; im.src = base + n + '.png'; })));
}
export class MonsterLook {
  constructor(kind, tint) { this.m = MON[kind]; this.kind = kind; this.tint = tint; }
  draw(x, anim, dir, frame, X, Y, sc = 1) {
    const m = this.m, d = DIRS[dir] ?? 2, f = Math.max(0, frame || 0);
    let im, sx, sy, fw = m.fw, fh = m.fh;
    const bob = m.lift ? Math.sin(performance.now() / 160 + X) * 2 : 0;
    if (anim === 'hurt') {
      if (m.die && IMG[m.die]) { im = IMG[m.die]; fw = 64; fh = 64; const i = Math.min(m.dn - 1, Math.floor(f / 6 * m.dn)); sx = i * 64; sy = 0; }
      else if (m.base && IMG[m.base]) { im = IMG[m.base]; const i = Math.min(5, Math.floor(f)); sx = (i % 3) * fw; sy = (4 + Math.floor(i / 3)) * fh; }
      else { im = IMG[m.walk]; sx = fw; sy = d * fh; x.globalAlpha *= Math.max(0, 1 - f / 6); }
    } else if (anim !== 'walk' && m.atk && IMG[m.atk]) {
      im = IMG[m.atk]; fw = 64; fh = 64; const i = Math.min(m.an - 1, Math.floor(f / (ANIM_N[anim] || 6) * m.an)); sx = i * 64; sy = d * 64;
    } else {
      const sheet = m.base || m.walk; im = IMG[sheet]; const cols = m.wn || 3;
      const i = f === 0 ? (cols === 3 ? 1 : 0) : (cols === 3 ? [0, 1, 2, 1][f % 4] : f % cols); sx = i * fw; sy = d * fh;
    }
    if (!im) return;
    const w = fw * sc, h = fh * sc, pad = fw === 64 && m.fw !== 64 ? 8 : (m.pad || 0);
    x.drawImage(im, sx, sy, fw, fh, Math.round(X - w / 2), Math.round(Y - h + pad * sc - (m.lift || 0) * sc + bob), w, h);
  }
  sheet() { return { canvas: IMG[this.m.base || this.m.walk], size: this.m.fw }; }
}
