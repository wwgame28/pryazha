// «Позвать по имени»: надписи на могилах, имена мертвецов, чужое имя злит, верное отпускает навсегда;
// Недопетые с доброй славой ночью не нападают первыми.
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
// найти обычное кладбище и подойти к нему
const r1 = await p.evaluate(async () => {
  const g = window.__game, w = g.world, P = g.player, sleep = (ms) => new Promise(r => setTimeout(r, ms));
  let st = null;
  for (let r = 1; r < 7 && !st; r++) for (let ry = -r; ry <= r && !st; ry++) for (let rx = -r; rx <= r && !st; rx++) { const s = w.structure(rx, ry); if (s && s.type === 'graveyard') st = s; }
  if (!st) return { found: false };
  window.__yard = st.id;
  P.x = (st.cx + 14) * 32; P.y = st.cy * 32; P.inv = 999; await sleep(900);
  const graves = st.props.filter((q) => q.type === 'grave'), epi = graves.map((q) => q.epi);
  const intact = epi.filter((e) => e.intact), names = intact.map((e) => e.name), roles = intact.map((e) => e.role);
  const dead = g.ents.filter((e) => e.kind === 'enemy' && e.grave && e.grave.gkey.startsWith(st.id + ':'));
  for (const e of dead) e.forget = 999;
  return { found: true, name: st.name, graves: graves.length, intact: intact.length, risen: epi.filter((e) => e.risen).length, uniqueNames: new Set(names).size === names.length, uniqueRoles: new Set(roles).size === roles.length, named: dead.map((e) => e.type + ':' + e.grave.epi.name + ' (' + e.grave.epi.role + ')'), allRisenIntact: dead.every((e) => e.grave.epi.intact && e.grave.epi.risen) };
});
console.log('YARD:', JSON.stringify(r1));
// одинаково в каждой загрузке: план надписей детерминирован
const det = await p.evaluate(async () => { const m = await import('./graves.js'); const a = JSON.stringify(m.planYard('5,-2', 16, [1, 6, 9])), b2 = JSON.stringify(m.planYard('5,-2', 16, [1, 6, 9])); const old = m.planYard('1,0', 16, [], { old: true }); return { same: a === b2, oldAllChipped: old.every((e) => !e.intact) }; });
console.log('DETERMINISTIC:', JSON.stringify(det));
await p.screenshot({ path: OUT + 'graves_yard.png' });
// прочесть сбитую и целую надпись
const r2 = await p.evaluate(async () => {
  const g = window.__game, P = g.player, sleep = (ms) => new Promise(r => setTimeout(r, ms)), st = g.world.structure(...window.__yard.split(',').map(Number));
  for (const e of g.ents) if (e.grave) { e.x += 600; e.home = [e.x, e.y]; }
  const chipped = st.props.find((q) => q.type === 'grave' && !q.epi.intact), risen = st.props.find((q) => q.type === 'grave' && q.epi.risen);
  P.x = chipped.x; P.y = chipped.y + 4; await sleep(250); g.interact(); await sleep(250);
  const toastText = document.querySelector('#toast')?.textContent || [...document.querySelectorAll('.toast')].map((t) => t.textContent).join(' | ');
  const hint1 = document.querySelector('#hint')?.textContent;
  P.x = risen.x; P.y = risen.y + 4; await sleep(250); const hint2 = document.querySelector('#hint')?.textContent; g.interact(); await sleep(250);
  const modal = document.querySelector('#modalBody')?.innerText;
  return { hintChipped: hint1, chippedToast: toastText, hintRisen: hint2, modal, names: (g.G.names || []).map((n) => n.name + '/' + n.role + '/' + n.yard) };
});
console.log('READ:', JSON.stringify(r2));
await closeAll();
// выучить остальные целые имена этого кладбища и позвать мертвеца: сначала чужим именем, потом верным
const r3 = await p.evaluate(async () => {
  const g = window.__game, P = g.player, sleep = (ms) => new Promise(r => setTimeout(r, ms)), st = g.world.structure(...window.__yard.split(',').map(Number));
  for (const q of st.props.filter((q) => q.type === 'grave' && q.epi.intact)) { P.x = q.x; P.y = q.y + 4; await sleep(120); g.interact(); await sleep(120); const c = document.querySelector('#modalBody [data-close]'); if (c) c.click(); await sleep(80); }
  const known = (g.G.names || []).length;
  const e = g.ents.find((x) => x.grave && x.hp > 0 && x.grave.gkey.startsWith(window.__yard + ':'));
  e.x -= 600; e.y = st.cy * 32 + 200; e.home = [e.x, e.y]; e.forget = 999; P.x = e.x + 34; P.y = e.y; await sleep(300);
  const hint = document.querySelector('#hint')?.textContent;
  const xp0 = g.G.xp, lvl0 = g.G.lvl, ech0 = g.G.echoes || 0, rep0 = g.WS.rep(g.G, 'undead');
  g.interact(); await sleep(200);
  const opts = [...document.querySelectorAll('#modalBody [data-a]')].map((b2) => b2.textContent);
  const mutterShown = document.querySelector('#modalBody .line')?.textContent;
  const wrong = [...document.querySelectorAll('#modalBody [data-a]')].find((b2) => !b2.textContent.startsWith(e.grave.epi.name + ' '));
  wrong.click(); await sleep(200);
  const afterWrong = { enraged: +(e.enraged || 0).toFixed(1), alive: e.hp > 0, state: e.state };
  e.forget = 999; P.x = e.x + 34; P.y = e.y; await sleep(150);
  g.interact(); await sleep(200);
  const right = [...document.querySelectorAll('#modalBody [data-a]')].find((b2) => b2.textContent.startsWith(e.grave.epi.name + ' '));
  right.click(); await sleep(300);
  return { known, hint, opts, mutterShown, mutterOk: e.grave.epi.mutter.some((m) => mutterShown.includes(m)), afterWrong, released: !!e.released, graveFlag: !!(g.G.graves || {})[e.grave.gkey], propReleased: !!e.grave.released, stat: g.G.stats.released, xpGain: g.G.lvl > lvl0 || g.G.xp > xp0, echoes: (g.G.echoes || 0) - ech0, repUndead: g.WS.rep(g.G, 'undead') - rep0, deed: !!g.WS.did(g.G, 'd_named_dead'), rumor: !!(g.G.ws.rumors || {}).r_speaks_to_dead, gk: e.grave.gkey };
});
console.log('CALL:', JSON.stringify(r3));
await closeAll();
await p.waitForTimeout(2600);
const gone = await p.evaluate((gk) => window.__game.ents.filter((e) => e.grave && e.grave.gkey === gk).length, r3.gk);
// уйти далеко и вернуться: отпущенный не встаёт, остальные — на месте
const r4 = await p.evaluate(async (gk) => {
  const g = window.__game, P = g.player, sleep = (ms) => new Promise(r => setTimeout(r, ms)), st = g.world.structure(...window.__yard.split(',').map(Number));
  P.x = (st.cx + 200) * 32; P.y = (st.cy + 200) * 32; await sleep(900);
  P.x = (st.cx + 14) * 32; P.y = st.cy * 32; await sleep(1200);
  const here = g.ents.filter((e) => e.kind === 'enemy' && e.grave && e.grave.gkey.startsWith(window.__yard + ':') && e.hp > 0);
  return { back: here.length, releasedBack: here.some((e) => e.grave.gkey === gk) };
}, r3.gk);
console.log('RESPAWN:', JSON.stringify({ fadedOut: gone === 0, ...r4 }));
// ночь и добрая слава у Недопетых: мертвец не нападает первым; без славы — нападает
const r5 = await p.evaluate(async () => {
  const g = window.__game, P = g.player, sleep = (ms) => new Promise(r => setTimeout(r, ms)), out = {};
  g.skipTo('night'); await sleep(400); out.dark = +g.world.dark.toFixed(2);
  for (const rep of [20, 0]) {
    g.G.ws.rep.undead = rep;
    for (const e of g.ents) if (e.kind === 'enemy') { e.hp = 0; e.dead = 5; }
    const z = g.addEnemy('zombie', P.x + 90, P.y); z.state = 'idle'; z.forget = 0; P.inv = 999;
    await sleep(700); out['rep' + rep] = z.state; z.hp = 0; z.dead = 5;
  }
  return out;
});
console.log('NIGHT:', JSON.stringify(r5));
// снимок ночью: огоньки светятся сквозь темноту
await p.evaluate(async () => { const g = window.__game, st = g.world.structure(...window.__yard.split(',').map(Number)); g.player.x = st.cx * 32 + 16; g.player.y = (st.cy + 1) * 32; });
await p.waitForTimeout(700); await closeAll(); await p.screenshot({ path: OUT + 'graves_night.png', clip: { x: 200, y: 120, width: 600, height: 400 } });
// снимок днём: могилы с огоньками и разрытая земля, окно выбора имени
await p.evaluate(async () => { const g = window.__game, st = g.world.structure(...window.__yard.split(',').map(Number)); g.player.x = (st.cx + 200) * 32; await new Promise(r => setTimeout(r, 700)); g.skipTo('dawn'); g.player.x = (st.cx + 14) * 32; g.player.y = st.cy * 32; await new Promise(r => setTimeout(r, 900)); for (const e of g.ents) if (e.grave) e.forget = 999; g.player.x = st.cx * 32 + 16; g.player.y = (st.cy + 1) * 32; });
await p.waitForTimeout(800); await closeAll(); await p.screenshot({ path: OUT + 'graves_close.png', clip: { x: 200, y: 120, width: 600, height: 400 } });
const r6 = await p.evaluate(async () => { const g = window.__game, P = g.player, e = g.ents.find((x) => x.grave && x.hp > 0); if (!e) return { none: true }; e.forget = 999; P.x = e.x + 34; P.y = e.y; await new Promise(r => setTimeout(r, 300)); g.interact(); await new Promise(r => setTimeout(r, 300)); return { title: document.querySelector('#modalBody h2')?.textContent }; });
console.log('MODAL:', JSON.stringify(r6));
await p.screenshot({ path: OUT + 'graves_call.png' });
await closeAll();
const r7 = await p.evaluate(() => { const g = window.__game; g.openMenu('quests'); const t = document.querySelector('#modalBody')?.innerText || ''; return { namesListed: t.includes('Имена с камней'), releasedCount: /Названо по имени: \d/.test(t) }; });
console.log('JOURNAL:', JSON.stringify(r7));
console.log('ERR', JSON.stringify(errs.slice(0, 6)));
await b.close();
