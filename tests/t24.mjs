// Story bot with play styles. Usage: node t24.mjs <class|human> <style> [untilChapter] [seed] [path]
// path: learn this path from a mentor quest as soon as one is offered (warrior, ranger, weaver, hollow, cryo...)
// styles: first | peaceful | breaker (breaks promises, lies) | skipper (no side quests) | random | violent | all (takes every side quest)
import { chromium } from 'playwright';
const OUT = (process.env.OUT || './out/'); (await import('node:fs')).mkdirSync(OUT, { recursive: true });
const CLS = process.argv[2] || 'human', STYLE = process.argv[3] || 'first', UNTIL = +(process.argv[4] || 2), SEED = +(process.argv[5] || 1), PATH = process.argv[6] || '';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1100, height: 760 } });
const errs = []; p.on('pageerror', e => errs.push('PAGE ' + e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' '))); p.on('console', m => { if (m.type() === 'error' && !m.text().includes('404')) errs.push(m.text()); if (m.text().startsWith('[ink]')) errs.push(m.text()); if (m.text().startsWith('BOT')) console.log(m.text()); });
await p.route('https://fonts.**', r => r.abort());
await p.goto('http://127.0.0.1:8765/test.html'); await p.waitForTimeout(2500);
await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(2200);
await p.click('#newGame'); await p.waitForTimeout(300); await p.evaluate((c) => { window.__wantCls = c; }, CLS); await p.click('[data-pick="0"]'); await p.waitForTimeout(1500);
const res = await p.evaluate(async ([STYLE, UNTIL, SEED, PATH]) => {
  const g = window.__game, sleep = (ms) => new Promise(r => setTimeout(r, ms)), log = (...a) => console.log('BOT', ...a);
  let rs = SEED * 9301 + 49297; const rnd = () => ((rs = (rs * 9301 + 49297) % 233280) / 233280);
  const modalOpen = () => !document.getElementById('modal').hidden;
  const btns = () => [...document.querySelectorAll('#modalBody button')].filter(b => !b.disabled && b.offsetParent);
  const choices = [];
  // playtime estimate: what a human would spend on the same route (the bot teleports and kills instantly)
  const TT = {}; const T = () => (TT[G.ws.chapter] = TT[G.ws.chapter] || { words: 0, pages: 0, choices: 0, walk: 0, kills: 0, bosses: 0, clues: 0, dungeons: 0 });
  let lastPage = '';
  function countPage() {
    const body = document.getElementById('modalBody'); if (!body) return;
    const c = body.cloneNode(true); c.querySelectorAll('button, canvas').forEach((b) => b.remove());
    const txt = c.textContent.replace(/\s+/g, ' ').trim(); if (!txt || txt === lastPage) return; lastPage = txt;
    T().words += txt.split(' ').length; T().pages++;
  }
  const walkTo = (x, y) => { if (g.world.infinite) T().walk += Math.hypot(x - g.player.x, y - g.player.y); };
  const VIOLENT = /Взять оружие|Драться|силой|Хватит слов|Убить|убью|заберу|Грабим|Сдам|Схватить/i;
  const BREAK = /Агафья увела|Сдам|при всех|Грабим|Продать|Отдать бересту Ясне/i;
  const AVOID = /Поговорить о другом|^Пока|^Не сейчас|Позже|Уйти$/;
  function pickChoice(cs) {
    const txt = cs.map(c => c.textContent.trim());
    const ok = cs.map((c, i) => i).filter(i => !AVOID.test(txt[i]));
    const pool = ok.length ? ok : cs.map((c, i) => i);
    let i = pool[0];
    if (STYLE === 'random') i = pool[Math.floor(rnd() * pool.length)];
    if (STYLE === 'peaceful') { const pe = pool.filter(k => !VIOLENT.test(txt[k])); i = (pe.length ? pe : pool)[0]; }
    if (STYLE === 'violent') { const v = pool.filter(k => VIOLENT.test(txt[k])); i = (v.length ? v : pool)[0]; }
    if (STYLE === 'breaker') { const v = pool.filter(k => BREAK.test(txt[k])); i = (v.length ? v : pool)[Math.min(1, (v.length ? v : pool).length - 1)]; }
    choices.push((g.NARR && g.NARR.running ? g.NARR.running.knot : '?') + ' → ' + txt[i]); T().choices++;
    return cs[i];
  }
  async function handleModal() {
    const inp = document.getElementById('nameIn'); if (inp) inp.value = 'Безымянный';
    countPage();
    const bs = btns();
    const nxt = bs.find(b => b.dataset.a === 'next'); if (nxt) { nxt.click(); return; }
    const cs = bs.filter(b => /^c\d/.test(b.dataset.a || ''));
    if (cs.length) { pickChoice(cs).click(); return; }
    const o = bs.filter(b => /^o\d/.test(b.dataset.a || ''));
    const take = o.find(b => b.textContent.startsWith('Взяться'));
    if (take && STYLE === 'skipper' && !/«(Три дня|Пустые сети|Сход|Разрытые|Тот, кто|Проводы|Из воды)/.test(take.textContent)) { const no = o.find(b => /Не сейчас/.test(b.textContent)); if (no) { no.click(); return; } }
    const pickB = take || (o.length ? o[0] : null) || bs.find(b => b.dataset.a && b.dataset.a.startsWith('gift_')) || bs.find(b => b.dataset.a === 'doit') || bs.find(b => b.dataset.a === 'ok') || null;
    const card = document.querySelector('#modalBody [data-card]');
    if (!pickB && card && !document.querySelector('[data-a^="gift_"]')) { card.click(); return; }
    (pickB || bs.find(b => b.hasAttribute('data-close')) || bs[0])?.click();
  }
  const G = g.G; G.potions.hp = 99;
  let lastKey = '', same = 0, steps = 0; const stalls = [], asked = new Set();
  for (let it = 0; it < 4000; it++) {
    g.player.hp = g.player.ds.maxHp; g.player.inv = 1;
    if (modalOpen()) { await handleModal(); await sleep(70); continue; }
    if (G.ws.chapter > UNTIL) { log('REACHED chapter', G.ws.chapter); break; }
    const S = g.STORY; const act = S.activeSteps();
    let main = null;
    if (PATH && !(G.paths || []).includes(PATH)) {
      // a mentor quest for the wanted path goes first
      const isMine = (q) => q.chain === 'path' && (q.id.endsWith('_path_' + PATH) || q.id.includes('_path_' + PATH + '_'));
      main = act.find(x => isMine(x.q)) || null;
      if (!main) { const q = S.data.quests.find(q => isMine(q) && S.available(q)); if (q && q.giver) { if (!S.S.offered || !S.S.offered[q.id]) log('path offer', q.id, 'from', q.giver); await goTalk(q.giver); if (S.S.active[q.id]) continue; } }
    }
    if (!main && STYLE === 'all') {
      // completionist: every side quest that is offered gets taken and finished before the main line moves on
      const side = act.find(x => x.q.chain !== 'main' && x.q.chain !== 'path' && x.s.type !== 'count');
      if (side) main = side;
      else { const q = S.data.quests.find(q => q.giver && q.chain !== 'main' && q.chain !== 'path' && !q.auto && S.available(q) && !asked.has(q.id)); if (q) { asked.add(q.id); log('side offer', q.id, 'from', q.giver); await goTalk(q.giver); continue; } }
    }
    if (!main) main = act.find(x => x.q.chain === 'main' && !(x.s.type === 'count' && !x.s.ask));
    const cnt = act.find(x => x.q.chain === 'main' && x.s.type === 'count');
    if (!main && cnt) {
      // the main line waits for small quests: help the yards
      main = act.find(x => x.q.chain === 'yard');
      if (!main) { const q = S.data.quests.find(q => q.chain === 'yard' && S.available(q)); if (q) { log('take', q.id, 'from', q.giver); await goTalk(q.giver); continue; } }
    }
    if (!main) {
      const nx = S.nextMain();
      if (!nx) { const anyMain = S.data.quests.find(q => q.chain === 'main' && q.auto && S.available(q)); if (anyMain) { log('waiting auto', anyMain.id); g.skipTo('night'); await sleep(1500); continue; } log('NO MAIN'); break; }
      const qq = S.qById[nx]; if (qq.auto || !qq.giver) { g.skipTo('night'); await sleep(1200); continue; }
      log('offer', nx, 'from', qq.giver); await goTalk(qq.giver); continue;
    }
    const { q, s, a } = main, key = q.id + ':' + s.id;
    if (key !== lastKey) { log(q.id, s.id, s.type, s.target || '', s.where || ''); lastKey = key; same = 0; steps++; } else if (++same > 40) { stalls.push(key); log('STALL', key, s.type, s.target, s.where); S.advance(q.id); same = 0; continue; }
    const t = S.resolve(s.target);
    try {
      if ((s.type === 'talk' || s.type === 'choose') && ['self', 'hero'].includes(t)) { await goto(s.where || 'any'); await sleep(800); }
      else if (s.type === 'escort' && S.npcState(t) === 'follower') { await goto(s.where); await sleep(900); }
      else if (s.type === 'talk' || s.type === 'choose' || s.type === 'escort') await goTalk(t, s.where);
      else if (s.type === 'defeat') { await goto(S.stepWhere(s)); await sleep(500); T().kills += Math.max(1, (s.count || 1) - a.counter); if (['troll', 'minotaur', 'lich'].includes(t)) T().bosses++; for (const e of g.ents.filter(e => e.kind === 'enemy' && e.type === t && e.hp > 0)) { e.hp = 1; g.killEnemy(e); } for (let i = 0; i < (s.count || 1) - a.counter; i++) { const e = g.addEnemy(t, g.player.x + 40, g.player.y); e.hp = 1; g.killEnemy(e); } await sleep(300); }
      else if (s.type === 'enter') { await enterDun(t); }
      else if (s.type === 'collect' && t === 'echo') { g.drops.push({ type: 'echo', x: g.player.x, y: g.player.y, v: 1, t: 1 }); await sleep(100); }
      else if (s.type === 'cast') { await goto(S.stepWhere(s)); for (let i = 0; i < 4; i++) { g.player.sk.cds = {}; g.player.mp = 999; g.player.atk = 0; g.useSkill(0); await sleep(150); } }
      else if (s.type === 'count' && s.ask) { for (const [npc, path] of Object.entries(s.ask)) { if (g.NARR.visited(path)) continue; await goTalk(npc, s.where); while (modalOpen()) { await handleModal(); await sleep(70); } g.NARR.run(path); await sleep(200); while (modalOpen()) { await handleModal(); await sleep(70); } } await sleep(300); }
      else if (s.type === 'count') { log('count step', s.target, a.counter, '/', s.count); await sleep(300); }
      else if (s.spots) { const ms = S.markers.filter(m => m.qid === q.id); if (!ms.length) { await sleep(600); } for (const m of ms) { walkTo(m.x, m.y); T().clues++; g.player.x = m.x + 10; g.player.y = m.y; await sleep(150); S.useMarker(m); await sleep(200); while (modalOpen()) { await handleModal(); await sleep(70); } } }
      else if (s.type === 'night' && !g.world.dark) { await goto(S.stepWhere(s)); g.skipTo('night'); await sleep(900); }
      else { await goto(S.stepWhere(s)); await sleep(700); const m = S.markers.find(m => m.qid === q.id); if (m) { walkTo(m.x, m.y); if (s.type === 'investigate') T().clues++; g.player.x = m.x + 10; g.player.y = m.y; await sleep(100); S.useMarker(m); } else if (s.type === 'night' || s.type === 'wait') { g.skipTo(s.type === 'night' ? 'night' : 'dawn'); await sleep(600); if (s.type === 'wait') { a.dawn = true; } } await sleep(200); }
    } catch (err) { log('ERR', key, err.message); }
    await sleep(100);
  }
  async function goto(where) {
    if (/^(crypt|mine)\d$/.test(where)) return enterDun(where);
    if (!g.world.infinite) { T().walk += 600; g.enterZone('world', 'start'); await sleep(300); }
    if (where.startsWith('wild:')) { const b = where.slice(5); if (b === 'any') return; for (let r = 10; r < 900; r += 12) for (let k = 0; k < 12; k++) { const ang = k / 12 * 6.28; const tx = Math.round(Math.cos(ang) * r), ty = Math.round(Math.sin(ang) * r); if (g.world.biomeAt(tx * 32, ty * 32) === b) { g.player.x = tx * 32 + 16; g.player.y = ty * 32 + 16; g.worldTick(false); await sleep(400); return; } } log('no biome', b); return; }
    if (where === 'any') return;
    const pos = g.locPos(where); if (!pos) { log('no locPos', where); return; }
    walkTo(pos[0], pos[1] + 30); g.player.x = pos[0]; g.player.y = pos[1] + 30; g.worldTick(false); await sleep(500);
  }
  async function enterDun(tag) {
    if (g.world.tag === tag) return;
    const region = tag.startsWith('crypt') ? '1,0' : '1,1';
    if (g.world.infinite) { await goto(tag.startsWith('crypt') ? 'oldgrave' : 'mine'); const st = g.world.structure(...region.split(',').map(Number)); const stairs = st.props.find(p => p.type === 'stairs_down'); g.player.x = stairs.x; g.player.y = stairs.y + 10; await sleep(200); g.useStairs(stairs); await sleep(600); }
    for (let i = 0; i < 4 && g.world.tag !== tag && !g.world.infinite; i++) { const st = g.world.props.find(p => p.type === 'stairs_down' && p.to); if (!st) break; T().dungeons++; T().walk += Math.hypot(st.x - g.player.x, st.y - g.player.y) * 1.5; g.player.x = st.x; g.player.y = st.y; g.useStairs(st); await sleep(600); }
  }
  async function goTalk(id, where) {
    const S = g.STORY, home = S.npcHome(id);
    let e = g.ents.find(x => x.storyId === id);
    if (!e) { if (/^(crypt|mine)\d$/.test(home)) await enterDun(home); else await goto(home.startsWith('wild:') || home === 'any' ? (where || home) : home); await sleep(900); e = g.ents.find(x => x.storyId === id); }
    if (!e) { await sleep(700); e = g.ents.find(x => x.storyId === id); }
    if (!e) { log('npc not found', id, 'home', home, 'state', S.npcState(id)); await sleep(300); return; }
    walkTo(e.x + 18, e.y + 4); g.player.x = e.x + 18; g.player.y = e.y + 4; await sleep(150); g.interact(); await sleep(250);
  }
  const W = g.WS.summary(G);
  // minutes: reading 150 words/min, 5 s per choice, walking at ~100 px/s with 30% detours, 10 s per enemy, 90 s per boss, 15 s to find a clue, 60 s per dungeon level
  const est = Object.fromEntries(Object.entries(TT).map(([ch, t]) => { const m = { read: t.words / 150, choose: t.choices * 5 / 60, walk: t.walk / 100 * 1.3 / 60, fight: (t.kills * 10 + t.bosses * 90) / 60, clues: t.clues * 15 / 60, dungeons: t.dungeons }; m.total = Math.round(m.read + m.choose + m.walk + m.fight + m.clues + m.dungeons); for (const k in m) m[k] = Math.round(m[k] * 10) / 10; return [ch, { ...t, walk: Math.round(t.walk), min: m }]; }));
  return { est, cls: G.cls, paths: G.paths || [], chapter: G.ws.chapter, day: Math.floor(G.time / 480) + 1, steps, stalls, done: Object.keys(g.STORY.S.done), failed: Object.keys(g.STORY.S.failed), active: Object.keys(g.STORY.S.active),
    rep: G.ws.rep, people: W.npcs.map(n => `${n.id}:t${n.trust}/f${n.fear}/r${n.respect}/h${n.hostility}`).join(' '), promises: W.promises.map(p => p.id + ':' + p.state), rumors: W.rumors.map(r => r.id + '@' + r.reach), facts: W.facts.map(f => f.id), debts: W.debts,
    flags: Object.fromEntries(Object.entries(G.flags).filter(([k]) => !k.startsWith('met_'))), scenes: (g.NARR.played || []).length, choices };
}, [STYLE, UNTIL, SEED, PATH]);
const { choices, ...rest } = res;
console.log(JSON.stringify(rest, null, 1));
console.log('CHOICES:\n' + choices.join('\n'));
await p.screenshot({ path: OUT + `bot24_${STYLE}${PATH ? '_' + PATH : ''}.png` });
console.log('ERR', JSON.stringify(errs.slice(0, 12), null, 1));
await b.close();
