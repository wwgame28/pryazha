// Campfires (rest, save, wake after death, continue), dungeon fire, heavy wind-up vs parry/dodge, stamina.
import { chromium } from 'playwright';
const OUT = (process.env.OUT || './out/'); (await import('node:fs')).mkdirSync(OUT, { recursive: true });
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1000, height: 640 } });
const errs = []; p.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n')[1]));
await p.route('https://fonts.**', r => r.abort());
const closeAll = async () => { for (let i = 0; i < 40; i++) { const open = await p.evaluate(() => { const bs = [...document.querySelectorAll('#modalBody button')].filter(b => !b.disabled && b.offsetParent); if (!bs.length) return false; (bs.find(b => b.hasAttribute('data-close')) || bs[0]).click(); return true; }); if (!open) break; await p.waitForTimeout(120); } };
await p.goto('http://127.0.0.1:8765/test.html'); await p.waitForTimeout(1500);
await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1800);
await p.click('#newGame'); await p.waitForTimeout(300); await p.click('[data-pick="0"]'); await p.waitForTimeout(1500);
await closeAll();
const r1 = await p.evaluate(async () => {
  const g = window.__game, w = g.world, P = g.player, sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const fires = w.restFires().map(f => ({ id: f.id, t: [f.tx, f.ty], tile: w.tile(f.tx, f.ty) }));
  const brod = w.restFires().find(f => f.id === 'brod');
  const restStart = JSON.stringify(g.G.rest);
  P.x = brod.x; P.y = brod.y + 30; await sleep(400);
  P.hp = 3; g.G.potions.hp = 0; g.interact(); await sleep(300);
  const modalTitle = document.querySelector('#modalBody h2')?.textContent;
  document.querySelector('[data-a="rest"]')?.click(); await sleep(700);
  return { fires, restStart, modalTitle, hpAfter: P.hp, max: P.ds.maxHp, potions: g.G.potions.hp, fireKnown: !!(g.G.fires || {}).brod, saved: !!localStorage.length };
});
console.log('REST:', JSON.stringify(r1));
// die somewhere else and wake at the fire
const r2 = await p.evaluate(async () => {
  const g = window.__game, P = g.player, sleep = (ms) => new Promise(r => setTimeout(r, ms));
  P.x = 40 * 32; P.y = 30 * 32; await sleep(300);
  for (let i = 0; i < 5; i++) { const e = g.addEnemy('goblin', P.x + 20 + i * 4, P.y + (i - 2) * 6); e.state = 'chase'; e.cd = 0; }
  const t0 = performance.now(); while (!P.dead && performance.now() - t0 < 20000) { P.inv = 0; await sleep(50); }
  return { died: !!P.dead };
});
await p.waitForTimeout(1800); await closeAll(); await p.waitForTimeout(500);
const r3 = await p.evaluate(() => { const g = window.__game, P = g.player, R = g.G.rest; return { wokeAt: Math.round(Math.hypot(P.x - R.x, P.y - R.y)), hp: P.hp, max: P.ds.maxHp, potions: g.G.potions.hp }; });
console.log('DEATH:', JSON.stringify(r2), 'WAKE:', JSON.stringify(r3));
// continue → at the fire
await p.evaluate(() => { const g = window.__game; g.player.x = 20 * 32; g.player.y = 25 * 32; g.save && g.save(); });
await p.reload(); await p.waitForTimeout(1800); await p.click('#continue'); await p.waitForTimeout(1500); await closeAll();
const r4 = await p.evaluate(() => { const g = window.__game, P = g.player, R = g.G.rest; return { continueAt: Math.round(Math.hypot(P.x - R.x, P.y - R.y)) }; });
console.log('CONTINUE:', JSON.stringify(r4));
await p.evaluate(() => { const g = window.__game, f = g.world.restFires().find(f => f.id === 'brod'); g.player.x = f.x - 40; g.player.y = f.y + 10; });
await p.waitForTimeout(600); await p.screenshot({ path: OUT + 'fire_brod.png', clip: { x: 350, y: 180, width: 300, height: 220 } });
// dungeon fire on the crypt's last floor
const r5 = await p.evaluate(async () => { const g = window.__game; g.G.duns = g.G.duns || {}; g.G.duns['dun:1,0'] = { base: 'dun:1,0', floors: 3, boss: true, name: 'Склеп', exit: g.world.spots.start }; g.enterZone('dun:1,0:3'); await new Promise(r => setTimeout(r, 500)); const f = g.world.props.find(p => p.rest); const up = g.world.spots.up; const out = { fire: !!f, fromStairs: f ? Math.round(Math.hypot(f.x - up[0], f.y - up[1])) : null }; g.enterZone('world', 'start'); return out; });
console.log('DUNGEON FIRE:', JSON.stringify(r5));
// heavy wind-up: parry fails, dodge works; stamina runs out
const r6 = await p.evaluate(async () => {
  const g = window.__game, P = g.player, sleep = (ms) => new Promise(r => setTimeout(r, ms)), D = await import('./data.js');
  const keep = D.ENEMIES.bandit.heavy; D.ENEMIES.bandit.heavy = 1; const out = {};
  P.x = 33 * 32; P.y = 36 * 32; await sleep(300);
  for (const mode of ['parry', 'dodge']) {
    for (const e of g.ents) if (e.kind === 'enemy') { e.hp = 0; e.dead = 5; }
    P.hp = P.ds.maxHp; P.dead = 0; P.inv = 0; P.dodgeCd = 0; P.parryCd = 0; P.stam = 100;
    const e = g.addEnemy('bandit', P.x + 22, P.y); e.state = 'chase'; e.cd = 0; const hp0 = P.hp; let fired = false; const t0 = performance.now();
    while (performance.now() - t0 < 4000) { await sleep(10); if (!fired && e.atk > 0 && !e.hitDone) { fired = true; out.heavyFlag = e.heavy; await sleep(mode === 'parry' ? 300 : 200); dispatchEvent(new KeyboardEvent('keydown', { code: mode === 'parry' ? 'KeyH' : 'Space' })); dispatchEvent(new KeyboardEvent('keyup', { code: mode === 'parry' ? 'KeyH' : 'Space' })); } if (fired && e.hitDone) break; }
    await sleep(250); out[mode] = { fired, damage: Math.round(hp0 - P.hp) };
    e.hp = 0; e.dead = 5; await sleep(300);
  }
  D.ENEMIES.bandit.heavy = keep;
  // stamina: dodges one per second until breath runs out
  P.stam = 100; let n = 0, failed = 0;
  for (let i = 0; i < 6; i++) { P.dodgeCd = 0; const s0 = P.stam; dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' })); dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' })); await sleep(30); if (P.dodgeT > 0) n++; else failed++; await sleep(200); }
  out.stamina = { dodgesInARow: n, refused: failed };
  return out;
});
console.log('HEAVY+STAMINA:', JSON.stringify(r6));
console.log('ERR', JSON.stringify(errs.slice(0, 6)));
await b.close();
