import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as MS from '../site/memory_scenes.js';

const bond = (npc, extra = {}) => ({ id: `b_${npc}`, type: 'bond', title: npc, links: { npc }, ...extra });
const fresh = (extra = {}) => ({
  time: 480,
  flags: {},
  memory: { cards: [], sacrificed: [], heroKnows: {}, npcKnows: {}, dreams: [], gifts: {}, lostSkills: [], foreign: [] },
  ws: { chapter: 1, rel: {} },
  story: { active: {}, done: {}, met: {} },
  ...extra,
});

test('registerLoss is idempotent and retains the first loss context', () => {
  const G = fresh();
  const card = bond('tur', { title: 'Тур у горна', journal: ['Старый контекст.'] });
  const a = MS.registerLoss(G, card);
  G.time += 480 * 4;
  const b = MS.registerLoss(G, { ...card, title: 'Не должен перезаписать' });

  assert.equal(a, b);
  assert.equal(Object.keys(G.memoryScenes.losses).length, 1);
  assert.equal(a.context.title, 'Тур у горна');
  assert.equal(a.waiting, true);
  assert.equal(a.lostDay, 1);
});

test('initScenes migrates a legacy sacrificed b_<npc> card exactly once', () => {
  const G = fresh({ memory: { cards: [], sacrificed: [bond('vesna', { day: 3, gift: 'empty_cup' })], heroKnows: {}, gifts: {} } });
  const S = MS.initScenes(G);

  assert.equal(S.losses.vesna.migrated, true);
  assert.equal(S.losses.vesna.context.source, 'legacy-sacrificed');
  assert.equal(S.losses.vesna.context.gift, 'empty_cup');
  assert.equal(S.losses.vesna.waiting, true);
  assert.equal(MS.nextEncounter(G, 'vesna').stage, 'loss');
  MS.initScenes(G);
  assert.equal(Object.keys(S.losses).length, 1);
});

test('loss of the hero bond never zeroes the NPC care/relations', () => {
  const G = fresh({ ws: { chapter: 1, rel: { tur: { trust: 5, hostility: 2, respect: 3, fear: 0 } } } });
  MS.registerLoss(G, bond('tur'));
  const enc = MS.nextEncounter(G, 'tur');
  const out = MS.finishEncounter(G, enc, 'stay');

  assert.equal(out.ok, true);
  assert.equal(G.ws.rel.tur.trust, 5);
  assert.equal(G.ws.rel.tur.hostility, 2);
  assert.ok(G.ws.rel.tur.respect >= 3);
  assert.equal(G.memoryScenes.losses.tur.waiting, false);
});

test('a new bond creates b_<npc>_new and never restores the surrendered b_<npc>', () => {
  const G = fresh({ memory: { cards: [], sacrificed: [bond('shurshok', { day: 1 })], heroKnows: {}, gifts: {} } });
  MS.initScenes(G);
  let enc = MS.nextEncounter(G, 'shurshok');
  assert.equal(MS.finishEncounter(G, enc, 'stay').ok, true);

  G.time += 480; // late echo requires an actual later day/chapter/main progress
  enc = MS.nextEncounter(G, 'shurshok');
  assert.equal(enc.stage, 'late');
  assert.equal(MS.finishEncounter(G, enc, 'listen').ok, true);

  enc = MS.nextEncounter(G, 'shurshok');
  assert.equal(enc.stage, 'renewal');
  assert.equal(MS.finishEncounter(G, enc, 'new').ok, true);
  assert.equal(G.memory.cards.some((c) => c.id === 'b_shurshok'), false);
  assert.equal(G.memory.cards.some((c) => c.id === 'b_shurshok_new'), true);
  assert.equal(G.memory.sacrificed.some((c) => c.id === 'b_shurshok'), true);
  assert.equal(G.memory.heroKnows.shurshok, 1);
});

test('invalid and disabled choices are no-ops, including flags', () => {
  const G = fresh({
    flags: { council_agafya_exposed: true },
    ws: { chapter: 1, rel: { agafya: { trust: 2, hostility: 3, respect: 0, fear: 0 } } },
  });
  MS.registerLoss(G, bond('agafya'));
  const enc = MS.nextEncounter(G, 'agafya');
  assert.equal(enc.npc, 'agafya');
  assert.equal(enc.choices.find((c) => c.id === 'ask').disabled, true);
  const before = JSON.stringify({ flags: G.flags, scenes: G.memoryScenes, rel: G.ws.rel });

  assert.deepEqual(MS.finishEncounter(G, enc, 'ask'), { ok: false, error: 'disabled-choice' });
  assert.equal(JSON.stringify({ flags: G.flags, scenes: G.memoryScenes, rel: G.ws.rel }), before);
  assert.deepEqual(MS.finishEncounter(G, enc, 'invented'), { ok: false, error: 'invalid-choice' });
  assert.equal(JSON.stringify({ flags: G.flags, scenes: G.memoryScenes, rel: G.ws.rel }), before);
});

test('all six NPCs may offer stage one after m1, while stage two waits for progress', () => {
  const G = fresh({ story: { active: { m1: { step: 's1' } }, done: {}, met: {} } });
  for (const npc of Object.keys(MS.SCENE_NPCS)) {
    const first = MS.nextEncounter(G, npc);
    assert.equal(first.stage, 'domestic1', npc);
    assert.equal(MS.finishEncounter(G, first, first.choices[0].id).ok, true, npc);
    assert.equal(MS.nextEncounter(G, npc), null, `${npc} does not repeat immediately`);
  }
  G.time += 480;
  for (const npc of Object.keys(MS.SCENE_NPCS)) assert.equal(MS.nextEncounter(G, npc).stage, 'domestic2', npc);
});
