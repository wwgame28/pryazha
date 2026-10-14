// Save / load: state of quests, consequences and ink survives a reload mid-chapter
import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1000, height: 700 } });
const errs = []; p.on('pageerror', e => errs.push('PAGE ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !m.text().includes('404')) errs.push(m.text()); });
await p.route('https://fonts.**', r => r.abort());
await p.goto('http://127.0.0.1:8765/test.html'); await p.waitForTimeout(2500);
await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(2200);
await p.click('#newGame'); await p.waitForTimeout(300); await p.evaluate((c) => { window.__wantCls = c; }, 'pyro'); await p.click('[data-pick="0"]'); await p.waitForTimeout(1500);
const clickAll = async () => p.evaluate(async () => { const sleep = (ms) => new Promise(r => setTimeout(r, ms)); for (let i = 0; i < 60; i++) { const m = document.getElementById('modal'); if (m.hidden) break; const bs = [...document.querySelectorAll('#modalBody button')].filter(b => !b.disabled); const b = bs.find(b => b.dataset.a === 'next') || bs.find(b => /^c\d/.test(b.dataset.a || '')) || bs.find(b => b.hasAttribute('data-close')) || bs[0]; if (!b) break; b.click(); await sleep(60); } });
await clickAll();
const before = await p.evaluate(async () => {
  const g = window.__game, G = g.G, S = g.STORY, sleep = (ms) => new Promise(r => setTimeout(r, ms));
  // play a scene with lasting effects: Агафья's hub topic and a promise, a rumour and a debt
  g.WS.promise(G, 'p_agafya_knots', 'agafya'); g.WS.startRumor(G, 'r_wet_lures_dead', { knowers: ['federot', 'vesna'] }); g.WS.addDebt(G, 'gostena', 30, 3); g.WS.addRel(G, 'tur', 'trust', 3);
  S.start('c1_well'); G.flags.yard_help = 1;
  g.NARR.run('talk_agafya', { npc: 'agafya' });
  return true;
});
await clickAll();
const snap = await p.evaluate(() => { const g = window.__game, G = g.G; g.interact && 0; document.getElementById('modal').hidden || null; const k = 'alderford.save.v1'; window.__game.G.pos = null; return { visits: g.NARR.ink.state.VisitCountAtPathString('talk_agafya'), ws: JSON.stringify(G.ws), story: JSON.stringify(G.story), flags: JSON.stringify(G.flags) }; });
// save the game the way the game does it (menu → title) and reload
await p.evaluate(() => { window.__game.openMenu('help'); }); await p.waitForTimeout(200);
await p.evaluate(() => { const b = [...document.querySelectorAll('#modalBody button')].find(b => b.dataset.a === 'title'); b.click(); });
await p.waitForTimeout(400);
await p.reload(); await p.waitForTimeout(2500);
await p.click('#continue'); await p.waitForTimeout(1500);
await clickAll();
const after = await p.evaluate(() => { const g = window.__game, G = g.G; return { visits: g.NARR.ink.state.VisitCountAtPathString('talk_agafya'), ws: JSON.stringify(G.ws), story: JSON.stringify(G.story), flags: JSON.stringify(G.flags), chapter: G.ws.chapter, active: Object.keys(g.STORY.S.active) }; });
const same = (k) => snap[k] === after[k];
console.log('ink visit count talk_agafya:', snap.visits, '→', after.visits, snap.visits === after.visits && snap.visits > 0 ? 'OK' : 'FAIL');
console.log('world state equal:', same('ws') ? 'OK' : 'DIFF'); if (!same('ws')) { const A = JSON.parse(snap.ws), B = JSON.parse(after.ws); for (const k of Object.keys(A)) if (JSON.stringify(A[k]) !== JSON.stringify(B[k])) console.log('  ws.' + k, JSON.stringify(A[k]).slice(0, 160), '→', JSON.stringify(B[k]).slice(0, 160)); }
console.log('story state equal:', same('story') ? 'OK' : 'DIFF');
console.log('flags equal:', same('flags') ? 'OK' : 'DIFF');
console.log('after load: chapter', after.chapter, 'active', after.active.join(','));
console.log('ERR', errs);
await b.close();
