// Unit tests of the consequence system (node --test tests/)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const WS = await import('../site/world_state.js');
const data = JSON.parse(fs.readFileSync(new URL('../site/narrative/consequences.json', import.meta.url), 'utf8'));
WS.setData(data);
const fresh = () => { const G = { time: 0, flags: {}, gold: 100, seed: 42 }; WS.initWS(G); WS.newDay(G); return G; };
const passDays = (G, n) => { G.time += 480 * n; WS.newDay(G); };

test('reputation tiers and clamping', () => {
  const G = fresh();
  assert.equal(WS.tierOf(0).id, 'stranger');
  WS.addRep(G, 'village', 30); assert.equal(WS.tierOf(WS.rep(G, 'village')).id, 'own');
  WS.addRep(G, 'village', 500); assert.equal(WS.rep(G, 'village'), 100);
  WS.addRep(G, 'archive', -60); assert.equal(WS.tierOf(WS.rep(G, 'archive')).id, 'enemy');
});
test('relations: trust and hostility pull against each other', () => {
  const G = fresh();
  WS.addRel(G, 'federot', 'trust', 4);
  assert.equal(WS.rel(G, 'federot').hostility, 1); // default 3, minus ceil(4/2)
  WS.addRel(G, 'federot', 'hostile', 6);
  assert.equal(WS.rel(G, 'federot').hostility, 7);
  assert.equal(WS.attitude(G, 'federot').id, 'hostile');
});
test('a witnessed deed changes the witnesses faction and starts its rumour', () => {
  const G = fresh();
  WS.deed(G, 'd_struck_federot', { witnesses: ['federot', 'vesna'] });
  assert.ok(WS.rep(G, 'village') < 0);
  assert.ok(WS.rumorActive(G, 'r_beat_federot'));
  assert.equal(WS.heard(G, 'vesna', 'd_struck_federot'), 'witness');
});
test('rumours spread along the social graph day by day, deterministically', () => {
  const run = () => { const G = fresh(); WS.startRumor(G, 'r_wet_lures_dead', { knowers: ['federot'] }); passDays(G, 4); return Object.keys(G.ws.rumors.r_wet_lures_dead.knowers).sort().join(','); };
  const a = run(), b = run();
  assert.equal(a, b);
  assert.ok(a.split(',').length > 1, 'spread beyond the origin: ' + a);
});
test('a false rumour, once refuted, gives back the reputation it took', () => {
  const G = fresh();
  WS.startRumor(G, 'r_wet_lures_dead', { knowers: ['federot', 'vesna'] }); // vesna is an ear of the village
  const hit = WS.rep(G, 'village');
  assert.ok(hit < 0);
  WS.refute(G, 'r_wet_lures_dead', 'agafya');
  assert.equal(WS.rep(G, 'village'), 0);
  assert.ok(!WS.rumorActive(G, 'r_wet_lures_dead'));
});
test('promises: kept, broken, and broken by deadline', () => {
  const G = fresh();
  WS.promise(G, 'p_agafya_knots', 'agafya');
  assert.equal(WS.promiseState(G, 'p_agafya_knots'), 'open');
  WS.keepPromise(G, 'p_agafya_knots'); assert.equal(WS.promiseState(G, 'p_agafya_knots'), 'kept');
  WS.promise(G, 'p_tur_silence', 'tur', { due: 1 });
  passDays(G, 3);
  assert.equal(WS.promiseState(G, 'p_tur_silence'), 'broken');
  assert.ok(WS.did(G, 'd_broke_promise'));
});
test('debts: overdue and paid', () => {
  const G = fresh();
  WS.addDebt(G, 'gostena', 30, 2);
  passDays(G, 3);
  assert.ok(WS.debtOverdue(G, 'gostena'));
  assert.equal(WS.payDebt(G, 'gostena'), 30);
  assert.equal(G.gold, 70);
  assert.equal(WS.debtOf(G, 'gostena'), 0);
});
test('deferred events fire by day, chapter or quest', () => {
  const G = fresh();
  WS.later(G, { days: 2 }, 'ev_goblin_raid');
  WS.later(G, { chapter: 3 }, 'ev_federot_cools');
  assert.equal(WS.dueEvents(G).length, 0);
  passDays(G, 2);
  assert.deepEqual(WS.dueEvents(G).map((e) => e.ev), ['ev_goblin_raid']);
  WS.setChapter(G, 3);
  assert.deepEqual(WS.dueEvents(G).map((e) => e.ev), ['ev_federot_cools']);
  assert.equal(WS.dueEvents(G).length, 0, 'fires once');
});
test('merchant terms: closed by rumour with a restore path, secret door, prices by standing', () => {
  const G = fresh(); const test = (c) => Object.entries(c || {}).every(([k, v]) => { const sp = WS.testSpecial(G, k, v); if (sp !== undefined) return sp; const m = /^(\w+?)_(lt|gte)$/.exec(k); const cur = WS.value(G, m ? m[1] : k); return m ? (m[2] === 'lt' ? cur < v : cur >= v) : cur === v; });
  WS.startRumor(G, 'r_wet_lures_dead', { knowers: ['federot', 'vesna'] });
  let t = WS.tradeTerms(G, 'vesna', test);
  assert.equal(t.open, false); assert.ok(t.restore.length > 0);
  WS.refute(G, 'r_wet_lures_dead');
  t = WS.tradeTerms(G, 'vesna', test); assert.equal(t.open, true);
  WS.addRep(G, 'village', 30); t = WS.tradeTerms(G, 'vesna', test); assert.ok(t.priceMul < 1);
  WS.addRep(G, 'archive', -80); t = WS.tradeTerms(G, 'yasna', test); assert.equal(t.open, false);
  WS.addRel(G, 'yasna', 'trust', 6); t = WS.tradeTerms(G, 'yasna', test); assert.ok(t.secret, 'secret door when Ясна trusts the hero');
});
test('betrayal is remembered and closes the fence', () => {
  const G = fresh(); const test = (c) => Object.entries(c || {}).every(([k, v]) => WS.value(G, k) === v);
  WS.deed(G, 'd_betrayed_stakh', { witnesses: ['stakh'] });
  assert.ok(WS.betrayed(G, 'd_betrayed_stakh'));
  assert.ok(WS.rep(G, 'rootless') <= -50);
  assert.equal(WS.tradeTerms(G, 'stakh', test).open, false);
});
