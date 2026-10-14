// create screen without classes + first minutes as a plain human (desktop and phone sizes)
import { chromium } from 'playwright';
const OUT = (process.env.OUT || './out/'); (await import('node:fs')).mkdirSync(OUT, { recursive: true });
const b = await chromium.launch();
for (const [w, h, tag] of [[1280, 820, 'desk'], [390, 844, 'phone']]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: tag === 'phone' ? 2 : 1, hasTouch: tag === 'phone', isMobile: tag === 'phone' });
  const errs = []; p.on('pageerror', e => errs.push('PAGE ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !m.text().includes('404')) errs.push(m.text()); });
  await p.route('https://fonts.**', r => r.abort());
  await p.goto('http://127.0.0.1:8765/test.html'); await p.waitForTimeout(2500);
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(2200);
  await p.click('#newGame'); await p.waitForTimeout(600);
  await p.screenshot({ path: OUT + `create_${tag}.png` });
  await p.click('[data-pick="0"]'); await p.waitForTimeout(1200);
  await p.screenshot({ path: OUT + `card_${tag}.png` });
  await p.evaluate(() => document.querySelector('#modalBody [data-close]')?.click()); await p.waitForTimeout(900);
  await p.screenshot({ path: OUT + `wake_${tag}.png` });
  const info = await p.evaluate(() => { const g = window.__game; return { cls: g.G.cls, slots: g.G.slots, tree: g.G.tree, hp: g.player.ds.maxHp, dmg: Math.round(g.player.ds.dmg) }; });
  console.log(tag, JSON.stringify(info), 'ERR', errs);
  await p.close();
}
await b.close();
