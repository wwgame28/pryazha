// Combat feel: hits-to-die at level 1, dodge and parry against a real wind-up, HUD screenshots (desktop + phone).
import { chromium } from 'playwright';
const OUT = (process.env.OUT || './out/'); (await import('node:fs')).mkdirSync(OUT, { recursive: true });
const b = await chromium.launch();
async function start(viewport, touch) {
  const p = await b.newPage({ viewport, hasTouch: !!touch, isMobile: !!touch, deviceScaleFactor: touch ? 2 : 1 });
  p.errs = []; p.on('pageerror', e => p.errs.push(e.message + ' @ ' + (e.stack || '').split('\n')[1]));
  await p.route('https://fonts.**', r => r.abort());
  await p.goto('http://127.0.0.1:8765/test.html'); await p.waitForTimeout(1500);
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1800);
  await p.click('#newGame'); await p.waitForTimeout(300); await p.click('[data-pick="0"]'); await p.waitForTimeout(1500);
  for (let i = 0; i < 40; i++) { const open = await p.evaluate(() => { const bs = [...document.querySelectorAll('#modalBody button')].filter(b => !b.disabled && b.offsetParent); if (!bs.length) return false; bs[0].click(); return true; }); if (!open) break; await p.waitForTimeout(120); }
  return p;
}
const p = await start({ width: 1100, height: 700 });
const res = await p.evaluate(async () => {
  const g = window.__game, P = g.player, sleep = (ms) => new Promise(r => setTimeout(r, ms)), out = { maxHp: P.ds.maxHp, lvl: g.G.lvl, def: P.ds.def, enemies: {} };
  const clear = () => { for (const e of g.ents) if (e.kind === 'enemy') { e.hp = 0; e.dead = 5; } };
  g.player.x = 32 * 32 + 16; g.player.y = 36 * 32; // village square
  for (const type of ['goblin', 'wolf', 'bandit', 'skeleton', 'zombie', 'archer']) {
    clear(); P.hp = P.ds.maxHp; P.dead = 0; P.inv = 0; await sleep(100);
    const e = g.addEnemy(type, P.x + (type === 'archer' ? 120 : 22), P.y); e.state = 'chase'; e.cd = 0;
    let hits = 0, last = P.hp, per = []; const t0 = performance.now();
    while (performance.now() - t0 < 15000 && P.hp > 0 && !P.dead) { await sleep(30); if (P.hp < last) { hits++; per.push(Math.round(last - P.hp)); last = P.hp; } P.inv = 0; }
    out.enemies[type] = { hitsToDie: P.hp <= 0 || P.dead ? hits : `>${hits} (жив)`, perHit: per };
    P.dead = 0; P.hp = P.ds.maxHp; P.anim = 'walk';
    document.querySelectorAll('#modalBody button[data-close]').forEach(b => b.click());
  }
  return out;
});
console.log('LEVEL 1:', JSON.stringify(res));
// dodge and parry against a goblin's real wind-up
const dp = await p.evaluate(async () => {
  const g = window.__game, P = g.player, sleep = (ms) => new Promise(r => setTimeout(r, ms));
  for (const e of g.ents) if (e.kind === 'enemy') { e.hp = 0; e.dead = 5; }
  const out = {};
  for (const mode of ['dodge', 'parry']) {
    P.hp = P.ds.maxHp; P.dead = 0; P.inv = 0; P.dodgeCd = 0; P.parryCd = 0;
    const e = g.addEnemy('goblin', P.x + 22, P.y); e.state = 'chase'; e.cd = 0;
    let fired = false, t0 = performance.now(), hp0 = P.hp;
    while (performance.now() - t0 < 4000) {
      await sleep(10);
      if (!fired && e.atk > 0 && !e.hitDone) { fired = true; await sleep(90); dispatchEvent(new KeyboardEvent('keydown', { code: mode === 'dodge' ? 'Space' : 'KeyH' })); dispatchEvent(new KeyboardEvent('keyup', { code: mode === 'dodge' ? 'Space' : 'KeyH' })); }
      if (fired && e.hitDone) break;
    }
    await sleep(200);
    out[mode] = { fired, damageTaken: Math.round(hp0 - P.hp), enemyStunned: (e.stun || 0) > 0, riposte: !!(P.sk && P.sk.buffs.some(b => b.kind === 'riposte')), dist: Math.round(Math.hypot(P.x - e.x, P.y - e.y)) };
    e.hp = 0; e.dead = 5; await sleep(900);
  }
  return out;
});
console.log('DODGE/PARRY:', JSON.stringify(dp));
// HUD screenshots: full, just hit (lag), low hp
await p.evaluate(() => { const g = window.__game; for (const e of g.ents) if (e.kind === 'enemy') { e.hp = 0; e.dead = 5; } g.player.hp = g.player.ds.maxHp; g.updateHUD && g.updateHUD(); });
await p.waitForTimeout(400); await p.screenshot({ path: OUT + 'hud_full.png', clip: { x: 0, y: 0, width: 1100, height: 240 } });
await p.evaluate(() => { const g = window.__game; g.player.hp = Math.ceil(g.player.ds.maxHp * .25); });
await p.waitForTimeout(150); await p.screenshot({ path: OUT + 'hud_low.png' });
console.log('ERR desktop', JSON.stringify(p.errs.slice(0, 5)));
const q = await start({ width: 390, height: 844 }, true);
await q.waitForTimeout(3500); await q.screenshot({ path: OUT + 'hud_phone.png' });
await q.setViewportSize({ width: 844, height: 390 }); await q.waitForTimeout(500); await q.screenshot({ path: OUT + 'hud_phone_land.png' });
console.log('ERR phone', JSON.stringify(q.errs.slice(0, 5)));
await b.close();
