// Sprite VFX: animated sheets from vfx/vfx.json (LPC magic packs, Ninja Adventure FX, Tuomo Untinen effects).
export const VFX = { ok: false, meta: {}, img: {} };
export async function loadVfx(base = 'vfx/') {
  VFX.meta = await (await fetch(base + 'vfx.json')).json();
  await Promise.all(Object.values(VFX.meta).map((m) => new Promise((res) => { const im = new Image(); im.onload = () => { VFX.img[m.img] = im; res(); }; im.onerror = res; im.src = base + m.img + '.png'; })));
  VFX.ok = true;
}
export const vfxLife = (key) => { const m = VFX.meta[key]; return m ? m.frames.length / m.fps : .4; };
// fx entry: { type: 'anim', key, x, y, t, life, scale, a, alpha, loop }
export function drawVfx(x, f) {
  const m = VFX.meta[f.key], im = m && VFX.img[m.img]; if (!im) return false;
  let i = Math.floor(f.t * m.fps * (f.speed || 1)); if (f.loop) i %= m.frames.length; else if (i >= m.frames.length) return true;
  const [sx, sy] = m.frames[i], sc = (f.scale || 1) * m.scale, w = m.fw * sc, h = m.fh * sc;
  x.save(); if (f.alpha !== undefined) x.globalAlpha = f.alpha; if (m.blend === 'add' || f.add) x.globalCompositeOperation = 'lighter';
  x.translate(Math.round(f.x), Math.round(f.y)); if (m.rot && f.a) x.rotate(f.a); if (f.flip) x.scale(-1, 1);
  x.drawImage(im, sx, sy, m.fw, m.fh, -w / 2, -h * (m.ay ?? .5), w, h);
  x.restore(); return true;
}
// projectile sprite by projectile type / school
const PROJ = { fire: 'p_fire', fireball: 'p_fire', fire_dart: 'p_fire', efire: 'p_fire', spark: 'p_fire', ice: 'p_ice', ice_shard: 'p_ice', ice_lance: 'p_ice', ice_orb: 'p_ice', eice: 'p_ice', shadow: 'p_shadow', shadow_bolt: 'p_shadow', bone: 'p_shadow', holy: 'p_holy', holy_bolt: 'p_holy', hammer: 'p_holy', lich: 'p_orb', orb: 'p_orb' };
export function drawProjSprite(x, p, now) {
  const key = PROJ[p.type] || (p.school === 'memory' ? 'p_memory' : p.school === 'shadow' ? 'p_shadow' : p.school === 'holy' ? 'p_holy' : p.school === 'fire' ? 'p_fire' : p.school === 'ice' && p.type !== 'arrow' ? 'p_ice' : null);
  if (!key || !VFX.ok) return false;
  return drawVfx(x, { key, x: p.x, y: p.y, t: now + (p.x % 7), a: Math.atan2(p.vy, p.vx), loop: true, scale: p.type === 'ice_lance' || p.type === 'hammer' ? 1.5 : p.type === 'lich' ? 1.3 : 1 });
}
