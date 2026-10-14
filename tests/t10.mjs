import { chromium } from 'playwright';
const OUT = (process.env.OUT || './out/'); (await import('node:fs')).mkdirSync(OUT, { recursive: true });
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1100, height: 700 } });
const errs = []; p.on('pageerror', e => errs.push('PAGE ' + e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' '))); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
await p.route('https://fonts.**', r => r.abort());
await p.goto('http://127.0.0.1:8765/test.html'); await p.waitForTimeout(2500);
const classes = ['human', 'warrior', 'ranger', 'pyro', 'cryo', 'necro', 'priest', 'weaver', 'hollow'];
for (const cls of process.argv[2] ? [process.argv[2]] : classes) {
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(2200);
  await p.click('#newGame').catch(() => {}); await p.waitForTimeout(300);
  await p.evaluate((c) => { window.__wantCls = c; }, cls); await p.click('[data-pick="0"]'); await p.waitForTimeout(900); await p.keyboard.press('Enter'); await p.waitForTimeout(400);
  // пройти стартовый диалог: пока открыт, игра стоит на паузе и снаряды не летят
  for (let i = 0; i < 80; i++) {
    const open = await p.evaluate(() => { const g = window.__game; const btn = [...document.querySelectorAll('#modalBody button')].filter(b => !b.disabled && b.offsetParent); if (!btn.length && !(g.NARR && g.NARR.busy())) return false; if (btn.length) btn[0].click(); return true; });
    if (!open) break; await p.waitForTimeout(150);
  }
  const res = await p.evaluate(async (cls) => {
    const g = window.__game, G = g.G, SK = g.SK, sleep = (ms) => new Promise(r => setTimeout(r, ms));
    g.gainXp(200000); G.bonusPoints = 200; G.echoes = 2000;
    const C = SK.CLASS(cls); let learned = 0;
    for (let pass = 0; pass < 6; pass++) for (const br of C.tree) for (const n of br.nodes) { for (let r = 0; r < 5; r++) if (!SK.learn(G, n.id)) learned++; }
    g.refreshPlayer();
    const P = g.player; P.hp = P.ds.maxHp; P.mp = P.ds.maxMp;
    const actives = C.tree.flatMap(b => b.nodes).filter(n => n.kind === 'active');
    const report = { cls, lvl: G.lvl, learned, hp: P.ds.maxHp, dmg: Math.round(P.ds.dmg), casts: {}, errors: [] };
    for (const n of actives) {
      // fresh enemies around
      for (const e of g.ents) if (e.kind === 'enemy') { e.hp = 0; e.dead = 5; }
      const mine = []; for (let i = 0; i < 4; i++) { const e = g.addEnemy(['goblin', 'skeleton', 'wolf', 'zombie'][i], P.x + 40 + (i % 2) * 22, P.y + (i - 1.5) * 16); e.hp = e.maxHp = 2000; e.state = 'idle'; mine.push(e); }
      g.setLock(mine[0]); P.dir = 'right';
      await sleep(120);
      G.slots[0] = n.id; P.sk.cds = {}; P.mp = P.ds.maxMp; P.sk.res = 100; P.sk.channel = null; P.atk = 0; G.echoes = 2000;
      const err = SK.cast(n.id);
      const before = 8000;
      await sleep(900);
      const after = mine.reduce((s, e) => s + Math.max(0, e.hp), 0);
      report.casts[n.id] = err ? 'ERR:' + err : Math.round(before - after);
      P.hp = P.ds.maxHp;
    }
    // basic attacks
    for (let i = 0; i < 4; i++) { g.keys.add('KeyJ'); await sleep(250); g.keys.delete('KeyJ'); await sleep(250); }
    report.alive = !P.dead; report.ents = g.ents.length;
    return report;
  }, cls);
  console.log(JSON.stringify(res));
  await p.screenshot({ path: OUT + 'k_' + cls + '.png' });
  await p.evaluate(() => { const g = window.__game; g.save && g.save(); });
}
console.log('ERRORS', errs.length, JSON.stringify(errs.slice(0, 12), null, 1));
await b.close();
