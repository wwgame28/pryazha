import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  initJourney, catalog, contracts, acceptContract, abandonContract, recordEvent,
  claimContract, rotateContracts, recordEnding, mergeMeta, journeySummary,
} from '../site/continuance.js';

const fresh = (seed = 101, chapter = 1) => ({
  seed, journeySeed: `manual-${seed}`, ws: { chapter }, flags: {}, gold: 25, echoes: 0, xp: 0,
  cls: 'warrior', lvl: 1, char: { name: { first: 'Тест' } },
});
const byKind = (G, kind) => contracts(G).find((offer) => offer.kind === kind);

function completeAndClaim(G, offer) {
  assert.equal(acceptContract(G, offer.id).ok, true);
  assert.equal(recordEvent(G, { kind: offer.kind === 'hunt' ? 'kill' : offer.kind, target: offer.target, count: offer.count }).ok, true);
  return claimContract(G, offer.id);
}

test('catalogue has the compact public schema and at least twelve original tales', () => {
  const C = catalog();
  assert.ok(C.collectibles.length >= 12);
  assert.ok(C.achievements.length >= 8);
  assert.deepEqual(Object.keys(C.collectibles[0]).sort(), ['id', 'text', 'title']);
  assert.deepEqual(Object.keys(C.achievements[0]).sort(), ['desc', 'id', 'title']);
  assert.notEqual(C.collectibles[0].text, C.collectibles[1].text);
});

test('the same manual seed produces the same three deterministic offers', () => {
  const first = fresh(77), second = fresh(77);
  initJourney(first); initJourney(second);
  assert.deepEqual(contracts(first), contracts(second));
  assert.deepEqual(contracts(first).map((offer) => offer.kind), ['hunt', 'visit', 'rest']);
  assert.ok(contracts(first).every((offer) => offer.status === 'offered' && Number.isInteger(offer.count) && Number.isInteger(offer.progress)));
  assert.ok(['goblin', 'wolf', 'bandit'].includes(byKind(first, 'hunt').target));
  assert.ok(['ford', 'village_well', 'tavern'].includes(byKind(first, 'visit').destination));
  assert.equal(byKind(first, 'rest').target, 'brod');

  for (const G of [first, second]) {
    const hunt = byKind(G, 'hunt');
    acceptContract(G, hunt.id); abandonContract(G, hunt.id); rotateContracts(G);
  }
  assert.deepEqual(contracts(first), contracts(second), 'the next manual board is deterministic too');
});

test('acceptance and claiming validate state and do not directly change the base economy', () => {
  const G = fresh(12);
  const hunt = byKind(G, 'hunt');
  assert.equal(claimContract(G, hunt.id).error, 'not_complete');
  assert.equal(acceptContract(G, hunt.id).ok, true);
  assert.equal(acceptContract(G, hunt.id).error, 'already_accepted');
  const before = { gold: G.gold, echoes: G.echoes, xp: G.xp };
  const progress = recordEvent(G, { kind: 'kill', target: hunt.target, count: hunt.count });
  assert.deepEqual(progress.completed, [hunt.id]);
  const claim = claimContract(G, hunt.id);
  assert.equal(claim.ok, true);
  assert.ok(claim.reward.gold > 0 && claim.reward.xp > 0);
  assert.deepEqual({ gold: G.gold, echoes: G.echoes, xp: G.xp }, before, 'parent applies returned reward exactly once');
  assert.equal(claimContract(G, hunt.id).error, 'already_claimed');
});

test('unknown IDs and invalid events fail safely', () => {
  const G = fresh(15);
  assert.equal(acceptContract(G, 'no-such-contract').error, 'unknown_contract');
  assert.equal(abandonContract(G, 'no-such-contract').error, 'unknown_contract');
  assert.equal(claimContract(G, 'no-such-contract').error, 'unknown_contract');
  assert.equal(recordEvent(G, { kind: 'dance', target: 'ford' }).error, 'invalid_event');
});

test('a repeated visit target cannot advance the same active contract twice', () => {
  const G = fresh(44);
  const visit = byKind(G, 'visit');
  assert.equal(acceptContract(G, visit.id).ok, true);
  const first = recordEvent(G, { kind: 'visit', target: visit.target, unique: 'frame-1' });
  const second = recordEvent(G, { kind: 'visit', target: visit.target, unique: 'frame-2' });
  assert.deepEqual(first.changed, [visit.id]);
  assert.deepEqual(first.completed, [visit.id]);
  assert.deepEqual(second.changed, []);
  assert.equal(contracts(G).find((offer) => offer.id === visit.id).progress, 1);
});

test('manual rotation needs a terminal offer and rewards remain bounded over many cycles', () => {
  const G = fresh(201, 5);
  assert.equal(rotateContracts(G).error, 'finish_or_abandon_first');
  for (let cycle = 0; cycle < 24; cycle++) {
    const hunt = byKind(G, 'hunt');
    assert.equal(acceptContract(G, hunt.id).ok, true);
    assert.equal(abandonContract(G, hunt.id).ok, true);
    const rotation = rotateContracts(G);
    assert.equal(rotation.ok, true);
    for (const offer of rotation.offers) {
      assert.ok(offer.count <= 8, `count bounded: ${offer.count}`);
      assert.ok(offer.reward.gold <= 48, `gold bounded: ${offer.reward.gold}`);
      assert.ok(offer.reward.echoes <= 3, `echoes bounded: ${offer.reward.echoes}`);
      assert.ok(offer.reward.xp <= 60, `xp bounded: ${offer.reward.xp}`);
    }
  }
});

test('summary and journey state serialize as plain JSON with the documented UI fields', () => {
  const G = fresh(91), meta = {};
  initJourney(G, meta);
  const rest = byKind(G, 'rest');
  assert.equal(acceptContract(G, rest.id).ok, true);
  const S = journeySummary(G, meta);
  assert.deepEqual(Object.keys(S).sort(), ['achievements', 'active', 'collectibles', 'completed', 'cycle', 'ready', 'stats']);
  assert.equal(S.active[0].id, rest.id);
  assert.deepEqual(JSON.parse(JSON.stringify(S)), S);
  assert.deepEqual(JSON.parse(JSON.stringify(G.journey)), G.journey);
});

test('meta preserves endings and imports discoveries without economy totals', () => {
  const meta = {};
  recordEnding(meta, 'e_ash', { name: 'Ива', class: 'priest', level: 4, gold: 9999, echoes: 777 });
  recordEnding(meta, 'e_return', { name: 'Ива', chapter: 6, xp: 8888 });
  const G = fresh(301);
  initJourney(G, meta);
  G.journey.collections.tale_alders = { id: 'tale_alders' };
  G.journey.achievements.a_first_blood = { id: 'a_first_blood' };
  mergeMeta(meta, G);
  assert.deepEqual(meta.endings.map((ending) => ending.id).sort(), ['e_ash', 'e_return']);
  assert.ok(meta.collectibles.includes('tale_alders'));
  assert.ok(meta.achievements.includes('a_first_blood'));
  assert.ok(meta.runs >= 1);
  assert.deepEqual(Object.keys(meta).sort(), ['achievements', 'collectibles', 'endings', 'runs', 'version']);
  assert.equal(JSON.stringify(meta).includes('9999'), false);
  assert.equal(JSON.stringify(meta).includes('8888'), false);
});

test('natural kill, rest, parry and quest events unlock early achievements', () => {
  const G = fresh(401);
  const first = recordEvent(G, { kind: 'kill', target: 'goblin' });
  assert.ok(first.unlocked.includes('a_first_blood'));
  const rest = recordEvent(G, { kind: 'rest', target: 'brod' });
  assert.ok(rest.unlocked.includes('a_warm_hearth'));
  recordEvent(G, { kind: 'parry', target: 'wolf', count: 3 });
  const q = recordEvent(G, { kind: 'quest', target: 'm1', count: 2 });
  assert.ok(q.unlocked.includes('a_helping_thread'));
});


test('old metadata collections migrates to the documented public collectibles field',()=>{const G=fresh(42);const meta={version:1,collections:['tale_alders'],endings:[{id:'e_return'},{id:'e_return'}]};mergeMeta(meta,G);assert.deepEqual(meta.collectibles,['tale_alders']);assert.equal(meta.collections,undefined);assert.equal(meta.endings.length,1);});
