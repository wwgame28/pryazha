// Story engine: quests made of steps, chapters, conditions, world effects and endings from story.json.
// Dialogue text lives in ink scenes (narrative/*.ink); a step names its scene with "scene".
// Consequences (reputation, relations, rumours, promises…) live in world_state.js.
import * as WS from './world_state.js';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// interaction markers per step type
const SPOT_TYPES = new Set(['investigate', 'use', 'collect', 'night', 'wait', 'sacrifice', 'cast']);

export class Story {
  constructor(data, api) {
    this.data = data; this.A = api;
    this.npcById = Object.fromEntries(data.npcs.map((n) => [n.id, n]));
    this.qById = Object.fromEntries(data.quests.map((q) => [q.id, q]));
    this.MAIN = data.quests.filter((q) => q.chain === 'main').map((q) => q.id);
    // steps that are targets of a choice belong to a branch: sequential flow never falls into them
    const idx = (api.sceneIndex && api.sceneIndex()) || { knots: {} };
    // steps reached only through go() from another step's scene; a scene that repeats its own step ("think it over") is not a branch
    this.refs = Object.fromEntries(data.quests.map((q) => [q.id, new Set(q.steps.flatMap((st) => [...(st.branches || []), ...((st.scene && idx.knots[st.scene] && idx.knots[st.scene].go) || [])].filter((n) => n !== st.id)).filter((n) => n && n !== 'end'))]));
    this.markers = []; this.markerT = 0; this.spawned = new Map(); this.autoT = 0;
    // npcs that only appear when a story effect brings them
    this.late = new Set(data.lateNpcs || []); for (const q of data.quests) for (const o of q.outcomes) for (const w of o.worldEffects || []) { const p = w.split(':'); if (p[0] === 'npc' && p[2] === 'spawn') this.late.add(p[1]); }
  }
  get G() { return this.A.G(); }
  get S() { const G = this.G; const S = (G.story = G.story || {}); for (const k of ['active', 'done', 'failed', 'npc', 'met', 'counters', 'unlocked', 'greet', 'lines', 'shop']) S[k] = S[k] || {}; return S; }
  // ---------- conditions ----------
  value(k) {
    const G = this.G, M = G.memory || {};
    if (k === 'clarity') return this.A.clarity();
    if (k === 'class') return G.cls;
    if (k === 'school') return this.A.school();
    if (k === 'gold') return G.gold;
    if (k === 'dreams') return (M.dreams || []).length;
    if (k === 'sacrificed_any') return (M.sacrificed || []).length > 0;
    if (k === 'sacrificed_n') return (M.sacrificed || []).length;
    if (k.startsWith('bond_')) return (M.heroKnows || {})[k.slice(5)] || 0;
    if (k.startsWith('q_')) return this.questState(k.slice(2));
    if (k.startsWith('npc_')) return this.npcState(k.slice(4));
    if (k === 'night') return !!this.A.isNight();
    if (k.startsWith('step_')) { const a = this.S.active[k.slice(5)]; return a ? a.step : null; }
    const w = WS.value(G, k); if (w !== undefined) return w;
    return G.flags[k];
  }
  test(cond) {
    if (!cond) return true;
    for (const [k0, v] of Object.entries(cond)) {
      if (k0 === 'all') { if (!v.every((c) => this.test(c))) return false; continue; }
      if (k0 === 'any') { if (!v.some((c) => this.test(c))) return false; continue; }
      if (k0 === 'not') { if (this.test(v)) return false; continue; }
      if (k0 === 'card') { if (!this.A.hasCard(v)) return false; continue; }
      if (k0 === 'card_not') { if (this.A.hasCard(v)) return false; continue; }
      const sp = WS.testSpecial(this.G, k0, v); if (sp !== undefined) { if (!sp) return false; continue; }
      let k = k0, op = 'eq';
      for (const [suf, o] of [['_not', 'ne'], ['_in', 'in'], ['_gte', 'gte'], ['_lte', 'lte'], ['_lt', 'lt'], ['_gt', 'gt']]) if (k0.endsWith(suf)) { k = k0.slice(0, -suf.length); op = o; break; }
      const cur = this.value(k);
      const numeric = k === 'clarity' || k.startsWith('bond_') || k === 'gold' || /^(rep|trust|fear|respect|hostility|hostile|debt)_/.test(k) || k === 'chapter' || k === 'day';
      if (numeric && op === 'eq') { if (!((cur || 0) >= v)) return false; continue; }
      if (op === 'eq' && (v === true ? !cur : v === false ? !!cur : cur !== v)) return false;
      if (op === 'ne' && cur === v) return false;
      if (op === 'in' && !v.includes(cur)) return false;
      if (op === 'gte' && !((cur || 0) >= v)) return false;
      if (op === 'lte' && !((cur || 0) <= v)) return false;
      if (op === 'lt' && !((cur || 0) < v)) return false;
      if (op === 'gt' && !((cur || 0) > v)) return false;
    }
    return true;
  }
  resolve(t) {
    if (typeof t !== 'string' || t[0] !== '$') return t;
    const f = this.G.flags;
    if (t === '$faction_leader') return { archive: 'yasna', ash: 'ugar', weavers: 'kudel' }[f.faction] || 'kudel';
    if (t === '$faction_tool') return { archive: 'frost_lamp', ash: 'ash_torch', weavers: 'spindle' }[f.faction] || 'spindle';
    if (t === '$last_knot') return { name: 'name', dreams: 'dream', agafya: 'bond', rest: 'any' }[f.last_knot] || 'any';
    if (t === '$shurshok_gift') return f.shurshok_gift || 'any';
    if (t === '$last_sacrifice_place') return 'any';
    return t;
  }
  // ---------- npcs ----------
  npcName(id) {
    const n = this.npcById[id]; if (!n) return id;
    const M = this.G.memory || {};
    if (!M.cards?.some(c=>c.type==='bond' && c.links?.npc===id) && M.sacrificed && M.sacrificed.some((s) => s.type === 'bond' && s.links && s.links.npc === id)) return 'Кто-то знакомый?';
    return n.name;
  }
  npcState(id) { return this.S.npc[id] || (this.late.has(id) ? 'gone' : 'home'); }
  npcHome(id) { const st = this.npcState(id); if (st.startsWith('moved:')) return st.slice(6); return this.npcById[id] ? this.npcById[id].home : 'village'; }
  // ---------- chapters ----------
  chapter() { return WS.chapter(this.G); }
  qChapter(q) { return q.chapter || 1; }
  currentAct() { return this.chapter(); }
  // ---------- quests ----------
  isActive(qid) { return !!this.S.active[qid]; }
  isDone(qid) { return this.S.done[qid] !== undefined; }
  isFailed(qid) { return this.S.failed[qid] !== undefined; }
  questState(qid) { return this.isActive(qid) ? 'active' : this.isDone(qid) ? 'done' : this.isFailed(qid) ? 'failed' : 'none'; }
  available(q) {
    if (this.isActive(q.id) || this.isDone(q.id) || this.isFailed(q.id)) return false;
    if (this.S.unlocked[q.id] === false) return false;
    if (this.S.unlocked[q.id]) return true;
    if (this.qChapter(q) > this.chapter()) return false;
    if (q.untilChapter && this.chapter() > q.untilChapter) return false;
    if ((q.after || []).some((id) => !this.isDone(id))) return false;
    if (q.afterAny && !q.afterAny.some((id) => this.isDone(id))) return false;
    if (q.offerIf && !this.test(q.offerIf)) return false;
    if (q.needsUnlock) return false;
    return true;
  }
  start(qid, silent) {
    const q = this.qById[qid]; if (!q || this.isActive(qid) || this.isDone(qid) || this.isFailed(qid)) return;
    this.S.active[qid] = { step: q.steps[0].id, counter: 0, at: this.A.now() };
    if (qid === 't1') this.A.addCard({ id: 'r_well_path', type: 'region', title: 'Дорога до колодца', weight: 1, links: { region: '0,0' }, journal: ['От брода до колодца сорок шагов. Я их сосчитал.'] });
    for (const w of q.onStart || []) this.effect(w, q, {});
    if (!silent) this.A.toast(`${q.chain === 'main' ? 'Глава ' + this.qChapter(q) + ' · ' : ''}Новая история: «${q.title}»`, 2400);
    this.A.save(); this.A.updateHUD();
    // a step that needs nothing but being here begins right away
    const s = this.step(qid); if (s && s.type === 'choose' && ['self', 'hero'].includes(this.resolve(s.target))) this.markerT = 0;
  }
  step(qid) { const a = this.S.active[qid]; if (!a) return null; const q = this.qById[qid]; return q.steps.find((s) => s.id === a.step) || null; }
  activeSteps() { return Object.keys(this.S.active).map((qid) => ({ q: this.qById[qid], s: this.step(qid), a: this.S.active[qid] })).filter((x) => x.s && x.q); }
  // quests a giver can offer now
  offers(npcId) { return this.data.quests.filter((q) => q.giver === npcId && !q.auto && this.available(q)); }
  // next main quest that should be picked up automatically when its giver isn't reachable
  nextMain() { for (const id of this.MAIN) { if (this.isDone(id) || this.isFailed(id) || this.isActive(id)) continue; if (this.available(this.qById[id])) return id; } return null; }
  advance(qid, next) {
    const q = this.qById[qid], a = this.S.active[qid]; if (!a) return;
    if (this.closing) this.closing.delete(qid + ':' + a.step);
    const i = q.steps.findIndex((s) => s.id === a.step);
    const seq = !next;
    let target = next && next !== 'end' ? q.steps.find((s) => s.id === next) : next === 'end' ? null : q.steps[i + 1];
    // skip steps whose requirements fail, and (when moving on by itself) steps that belong to another branch
    while (target && ((target.requires && !this.test(target.requires)) || (seq && this.refs[qid].has(target.id)))) { const j = q.steps.indexOf(target); target = q.steps[j + 1]; }
    this.markers = this.markers.filter((m) => m.qid !== qid);
    if (!target) { this.finish(qid); return; }
    a.step = target.id; a.counter = 0; a.at = this.A.now(); a.played = false;
    this.A.toast(`«${q.title}»: ${target.text}`, 2600);
    this.A.save(); this.A.updateHUD();
    // a sacrifice that follows a decision on the spot is asked for right away
    if (target.type === 'sacrifice' && this.here(this.stepWhere(target))) this.play(q, target);
  }
  finish(qid) {
    const q = this.qById[qid]; delete this.S.active[qid];
    const o = q.outcomes.find((x) => this.test(x.if)) || q.outcomes[q.outcomes.length - 1];
    this.S.done[qid] = q.outcomes.indexOf(o);
    const r = o.rewards || {};
    if (r.gold) this.A.gold(r.gold); if (r.xp) this.A.xp(r.xp); if (r.echoes) this.A.echoes(r.echoes); if (r.item) this.A.item(this.resolve(r.item));
    const finale = (o.worldEffects || []).some(w=>w.split(':')[0]==='ending');
    for (const w of o.worldEffects || []) if(w.split(':')[0] !== 'ending') this.effect(w, q, o);
    // journal line for this quest goes onto its memory card
    const card = this.A.cardById('q_' + qid); if (card && o.text) card.journal = [...(card.journal || []), o.text];
    this.A.questDone(q, o);
    if(finale) this.A.ending(this.ending());
    for (const nx of q.then || []) this.start(nx);
    if (q.endsChapter && q.endsChapter < 6) this.A.chapterTo(q.endsChapter + 1);
    if (q.chain === 'main') { const nx = this.nextMain(); if (nx) { const n = this.qById[nx]; if (n.auto || !n.giver || !this.reachable(n.giver)) this.start(nx); } }
    this.A.save(); this.A.updateHUD();
  }
  // a quest that can no longer be done the way it was meant to. Never used to dead-end the main line.
  fail(qid, why) {
    const q = this.qById[qid]; if (!q || this.isDone(qid) || this.isFailed(qid)) return;
    delete this.S.active[qid]; this.markers = this.markers.filter((m) => m.qid !== qid);
    this.S.failed[qid] = why || 'failed';
    for (const w of (q.fail && q.fail.effects) || []) this.effect(w, q, { text: q.fail.text });
    for (const nx of (q.fail && q.fail.then) || []) this.start(nx);
    this.A.questFailed(q);
    this.A.save(); this.A.updateHUD();
  }
  reachable(npcId) { const st = this.npcState(npcId); return st !== 'gone'; }
  // ---------- world effects mini-language ----------
  effect(w, q, o) {
    const p = w.split(':'), G = this.G, M = G.memory; q = q || { id: 'world', title: '' }; o = o || {};
    switch (p[0]) {
      case 'card+': { const [, type, id, weight] = p; const title = (this.data.cardTitles || {})[id] || (type === 'quest' ? q.title : type === 'dream' ? DREAM_TITLES[id] || 'Сон' : type === 'name' ? (id === 'n_self' ? 'Своё имя' : 'Чужое имя') : type === 'shared' ? SHARED_TITLES[id] || 'Общая память' : type === 'bond' ? this.npcName(id.replace(/^b_/, '')) : FOREIGN_TITLES[id] || q.title);
        const links = type === 'quest' ? { quest: q.id } : type === 'dream' ? { dream: id.replace(/^d_/, '') } : type === 'bond' ? { npc: id.replace(/^b_/, '') } : {};
        const c = this.A.addCard({ id, type, title, weight: +weight || 1, links, journal: [o.text].filter(Boolean), sacrificable: type !== 'shared' });
        if (c && type === 'dream') { const dn = id.replace(/^d_/, ''); M.dreams = [...new Set([...(M.dreams || []), dn])]; if (dn === 'morven' && !(M.keyskills || []).includes('foreign_gait')) M.keyskills = [...(M.keyskills || []), 'foreign_gait']; this.A.dream(dn); }
        if (c && type === 'name' && id === 'n_self') M.name = M.name || this.G.flags.hero_name || null;
        break; }
      case 'card-': { this.A.removeCard(p[1]); if (p[1].startsWith('d_')) M.dreams = (M.dreams || []).filter((d) => d !== p[1].slice(2)); break; }
      case 'bond': { const id = p[1], n = parseInt(p[2], 10) || 0; M.heroKnows = M.heroKnows || {}; const before = M.heroKnows[id] || 0; M.heroKnows[id] = Math.max(0, Math.min(3, before + n)); WS.bond(G, id, n); if (before < 2 && M.heroKnows[id] >= 2) this.A.addCard({ id: 'b_' + id, type: 'bond', title: this.npcName(id), weight: ['agafya', 'shurshok'].includes(id) ? 5 : 3, links: { npc: id }, journal: [`${this.npcName(id)} — теперь мне не чужой человек.`] }); break; }
      case 'npcKnows': M.npcKnows = M.npcKnows || {}; M.npcKnows[p[1]] = p[2] !== 'false'; break;
      case 'npc': { const id = p[1], st = p.slice(2).join(':'); this.S.npc[id] = st === 'spawn:village' ? 'moved:village' : st; this.A.respawnNpcs(); break; }
      case 'flag': { const [k, v] = p.slice(1).join(':').split('='); G.flags[k] = v === 'true' ? true : v === 'false' ? false : isNaN(+v) ? v : +v; break; }
      case 'unlock': this.S.unlocked[p[1]] = true; break;
      case 'lock': this.S.unlocked[p[1]] = false; break;
      case 'greeting': this.S.greet[p[1]] = p[2]; break;
      case 'line': this.S.lines[p[1]] = p[2]; break;
      // shop:<merchant>:<discount25|hostile|open|tier+1|free_drink|…> → merchant flags read by world_state.tradeTerms
      case 'shop': { this.S.shop[p[1]] = [...(this.S.shop[p[1]] || []), p[2]]; const m = /^discount(\d+)$/.exec(p[2]); if (m) WS.setTrade(G, p[1], 'discount', +m[1]); else if (p[2] === 'hostile') { WS.setTrade(G, p[1], 'closed', true); WS.setTrade(G, p[1], 'closedLine', 'Архив закрыл перед тобой двери.'); } else WS.setTrade(G, p[1], p[2], true); break; }
      case 'spawn': { const type = p[1], mul = parseFloat((p[p.length - 1] || 'x1').slice(1)); const where = p.slice(2, -1).join(':'); G.flags['spawn:' + type + ':' + where] = mul; if (mul > 0 && this.here(where)) this.A.raid(type, Math.ceil(3 * mul)); break; }
      case 'fog': { const where = p.slice(1, -1).join(':'); this.A.fog(where, p[p.length - 1]); break; }
      case 'biome': G.flags['biome:' + p[1]] = (G.flags['biome:' + p[1]] || 0) + (p[2] === 'grow' ? 1 : -1) * (+p[3] || 10); break;
      case 'item': this.A.item(this.resolve(p[1])); break;
      case 'perk': G.flags['perk:' + p[1]] = (G.flags['perk:' + p[1]] || 0) + parseFloat(p[2]); break;
      case 'sacrifice': this.A.forceForget(p.slice(1).join(':')); break;
      case 'restore': this.A.restoreLast(); break;
      case 'remove': if (p[1] === 'last_gift') this.A.removeLastGift(); break;
      case 'ending': this.A.ending(this.ending()); break;
      // consequence system
      case 'rep': WS.addRep(G, p[1], parseInt(p[2], 10) || 0, q.title); break;
      case 'rel': WS.addRel(G, p[1], p[2], parseInt(p[3], 10) || 0, q.title); break;
      case 'deed': WS.deed(G, p[1], { witnesses: this.A.witnesses(), public: p[2] === 'public' }); break;
      case 'rumor': WS.startRumor(G, p[1], {}); break;
      case 'refute': WS.refute(G, p[1]); break;
      case 'learn': WS.learn(G, p[1], 'quest'); break;
      case 'promise': WS.promise(G, p[1], p[2]); break;
      case 'keep': WS.keepPromise(G, p[1]); break;
      case 'break': WS.breakPromise(G, p[1]); break;
      case 'later': WS.later(G, { days: +p[1] }, p[2]); break;
      case 'atchapter': WS.later(G, { chapter: +p[1] }, p[2]); break;
      case 'start': this.start(p[1]); break;
      case 'fail': this.fail(p[1], 'effect'); break;
      case 'scene': this.A.queueScene(p[1]); break;
      case 'trade': WS.setTrade(G, p[1], p[2], p[3] === undefined ? true : p[3] === 'false' ? false : isNaN(+p[3]) ? p[3] : +p[3]); break;
      case 'take': this.A.takeItem(p[1]); break;
      case 'inc': G.flags[p[1]] = (+G.flags[p[1]] || 0) + (parseFloat(p[2]) || 1); break;
      case 'path': if (this.A.learnPath) this.A.learnPath(p[1]); break;
    }
  }
  ending() { for (const e of this.data.endings) if (this.test(e.conditions)) return e; return this.data.endings[this.data.endings.length - 1]; }
  // ---------- locations ----------
  here(where) {
    if (!where || where === 'any') return true;
    const A = this.A, w = A.world();
    if (/^(crypt|mine)\d$/.test(where)) return w.tag === where;
    if (!w.infinite) return false;
    if (where.startsWith('wild:')) { const b = where.slice(5); return b === 'any' || A.biome() === b || (b === 'lake' && A.nearWater()); }
    const pos = A.locPos(where); if (!pos) return false;
    return Math.hypot(pos[0] - A.player().x, pos[1] - A.player().y) < (A.locRadius ? A.locRadius(where) : (where === 'ford' || where === 'tavern_cellar' ? 160 : 560));
  }
  stepWhere(s) { const t = this.resolve(s.target); if (s.type === 'goto' || s.type === 'night' && ['ford', 'lake', 'herd', 'old_forge', 'tavern_cellar'].includes(t)) return t === 'lake' ? 'wild:lake' : t === 'herd' ? 'wild:steppe' : t === 'old_forge' ? 'mine' : t; if (s.type === 'enter') return t; return s.where || 'any'; }
  // ---------- events ----------
  onTalk(npcId) {
    this.S.met[npcId] = true; this.G.flags['met_' + npcId] = true;
    const order = this.activeSteps().sort((x, y) => (x.q.chain === 'main' ? 0 : 1) - (y.q.chain === 'main' ? 0 : 1));
    for (const { q, s } of order) {
      if ((s.type === 'talk' || s.type === 'choose') && this.resolve(s.target) === npcId) { this.play(q, s); return true; }
      if (s.type === 'escort' && this.resolve(s.target) === npcId && this.npcState(npcId) !== 'follower') { this.S.npc[npcId] = 'follower'; this.A.respawnNpcs(); this.A.toast(`${this.npcName(npcId)} идёт за тобой`, 1800); return true; }
    }
    const offers = this.offers(npcId);
    if (offers.length) { this.offer(npcId, offers); return true; }
    return false;
  }
  offer(npcId, list) {
    const q = list[0];
    const begin = () => { this.start(q.id); const s = this.step(q.id); if (s && (s.type === 'talk' || s.type === 'choose') && this.resolve(s.target) === npcId) this.play(q, s); };
    if (this.A.hasScene('offer_' + q.id)) { this.A.scene('offer_' + q.id, { npc: npcId, onEnd: () => { if (this.isActive(q.id)) { const s = this.step(q.id); if (s && !this.S.active[q.id].played && (s.type === 'talk' || s.type === 'choose') && this.resolve(s.target) === npcId) this.play(q, s); } } }); return; }
    this.A.dialog({ npc: npcId, lines: [{ who: npcId, line: this.greeting(npcId) }], body: `<p class="aside">${esc(q.summary)}</p>`, options: [{ text: `Взяться: «${q.title}»`, cls: 'gold', go: () => { this.A.close(); begin(); } }, ...(this.A.hub && this.A.hub(npcId) ? [{ text: 'Поговорить о другом', go: () => { this.A.close(); this.A.scene(this.A.hub(npcId), { npc: npcId }); } }] : []), { text: 'Не сейчас', go: () => this.A.close() }] });
  }
  greeting(npcId) {
    const n = this.npcById[npcId], M = this.G.memory || {};
    if (M.sacrificed && M.sacrificed.some((s) => s.type === 'bond' && s.links && s.links.npc === npcId)) return 'Ты опять делаешь вид, что меня не знаешь?';
    if (M.npcKnows && M.npcKnows[npcId] === false) return 'Мы знакомы? Простите, не помню вашего лица.';
    return this.S.greet[npcId] && (this.data.greetings || {})[this.S.greet[npcId]] || n.greeting;
  }
  // plays a step's scene; when it ends the quest moves on
  play(q, s, opt = {}) {
    const a = this.S.active[q.id]; if (a) a.played = true;
    const end = (next) => { if (opt.then) opt.then(); if (this.step(q.id) !== s) return; this.afterStep(q, s, next); };
    if (s.scene && this.A.hasScene(s.scene)) { this.A.scene(s.scene, { q, s, npc: this.npcById[this.resolve(s.target)] ? this.resolve(s.target) : null, title: q.title, endLabel: s.type === 'sacrifice' ? 'Отдать память…' : null, onEnd: end }); return; }
    // a step without words: show its objective once
    if (s.type === 'sacrifice') return this.askSacrifice(q, s);
    end(null);
  }
  afterStep(q, s, next) {
    if (s.type === 'sacrifice' && !this.S.active[q.id]?.sacrificed) return this.askSacrifice(q, s, next);
    if (s.type === 'use' && s.target === 'name_input') return this.A.askName((name) => { this.G.flags.hero_name = name; this.G.memory.name = name; this.advance(q.id, next); });
    this.advance(q.id, next);
  }
  askSacrifice(q, s, next) {
    const t = this.resolve(s.target), min = s.count || 1;
    const knot = s.target === '$last_knot' ? this.G.flags.last_knot : null;
    this.A.sacrificeFor({ type: t === 'any' || !t ? null : t, id: knot === 'agafya' ? 'b_agafya' : null, minWeight: t === 'name' ? 10 : knot ? 1 : min, why: s.text, done: (card) => {
      const a = this.S.active[q.id]; if (a) a.sacrificed = true; this.G.flags.sacrificed_any = true;
      // giving the Dreams away lets every one of them go
      if (knot === 'dreams') { for (const c of [...(this.G.memory.cards || [])]) if (c.type === 'dream') this.A.forceForget('dream:' + c.id); this.G.memory.dreams = []; }
      this.advance(q.id, next);
    }, cancel: () => { const a = this.S.active[q.id]; if (a) a.played = false; } });
  }
  fill(t) { return String(t || '').replace(/\$hero/g, this.A.heroName()).replace(/\$faction_leader/g, this.npcName(this.resolve('$faction_leader'))); }
  // world events
  onKill(type) { for (const { q, s, a } of this.activeSteps()) if (s.type === 'defeat' && s.target === type && this.here(s.where === 'wild:forest' ? 'any' : this.stepWhere(s))) { a.counter++; if (a.counter >= (s.count || 1)) { this.done(q, s); } else this.A.toast(`${s.text}: ${a.counter} из ${s.count}`, 1200); } }
  onEcho(n) { for (const { q, s, a } of this.activeSteps()) if (s.type === 'collect' && s.target === 'echo') { a.counter += n; if (a.counter >= (s.count || 1)) this.done(q, s); } }
  onEnter(tag) { for (const { q, s } of this.activeSteps()) if (s.type === 'enter' && this.resolve(s.target) === tag) this.done(q, s); }
  onCast(school) { for (const { q, s, a } of this.activeSteps()) if (s.type === 'cast' && this.here(s.where) && (s.target === school || !this.A.hasSchool(s.target))) { a.counter++; if (a.counter >= (s.count || 1)) this.done(q, s); else this.A.toast(`${s.text}: ${a.counter} из ${s.count}`, 1000); } }
  onSacrifice(card) { /* handled through askSacrifice */ }
  // a step finished by the world: play its scene (if any) then advance
  done(q, s) {
    // one finish per step: an area attack can kill the third wolf in the same frame as the second
    const key = q.id + ':' + s.id; this.closing = this.closing || new Set();
    if (this.closing.has(key) || this.step(q.id) !== s) return; this.closing.add(key);
    if (s.scene && this.A.hasScene(s.scene)) this.play(q, s); else this.advance(q.id);
  }
  wantsEnemy(type) { if (type === 'troll') return !this.G.flags.troll && this.activeSteps().some(({ s }) => s.type === 'defeat' && s.target === 'troll'); if (type === 'lich' || type === 'minotaur') return this.activeSteps().some(({ s }) => s.type === 'defeat' && s.target === type); return true; }
  // ---------- per tick ----------
  tick(dt) {
    if (this.A.modalOpen()) return;
    this.autoT -= dt;
    if (this.autoT <= 0) {
      this.autoT = 1;
      // quests that begin by themselves, and quests that can no longer be done
      for (const q of this.data.quests) {
        if (q.auto && this.available(q) && (!q.autoIf || this.test(q.autoIf))) { this.start(q.id); return; }
        if (this.isActive(q.id) && q.fail && q.fail.if && this.test(q.fail.if)) { this.fail(q.id, 'time'); return; }
      }
      const nx = this.nextMain(); if (nx && (this.qById[nx].auto || !this.qById[nx].giver)) { this.start(nx); return; }
    }
    this.markerT -= dt; if (this.markerT > 0) return; this.markerT = .5;
    const A = this.A, night = A.isNight();
    for (const { q, s, a } of this.activeSteps()) {
      const where = this.stepWhere(s), here = this.here(where);
      if (s.type === 'goto' && here) { this.done(q, s); return; }
      if (s.type === 'count') { a.counter = +(this.G.flags[s.target] || 0); if (a.counter >= (s.count || 1) || (s.orIf && this.test(s.orIf))) { this.done(q, s); return; } }
      if (s.type === 'escort') { const t = this.resolve(s.target); if (this.npcState(t) === 'follower' && this.here(s.where)) { this.S.npc[t] = 'moved:' + s.where; A.respawnNpcs(); this.done(q, s); return; } }
      if (s.type === 'night' && here && night && !a.played) { this.done(q, s); return; }
      if (s.type === 'wait' && here && a.dawn) { this.done(q, s); return; }
      if (s.type === 'wait' && here && !night && a.sawNight) { this.done(q, s); return; }
      if (s.type === 'wait' && night) a.sawNight = true;
      if (s.type === 'enter' && A.world().tag === this.resolve(s.target)) { this.done(q, s); return; }
      if (s.type === 'collect' && s.target !== 'echo' && here) this.ensureMarkers(q, s, 1);
      if (s.type === 'investigate' && (here || s.spots)) this.ensureMarkers(q, s, s.count || 1);
      if ((s.type === 'use' || s.type === 'sacrifice' || s.type === 'cast') && here && s.target !== 'name_input') this.ensureMarkers(q, s, 1);
      if ((s.type === 'night' || s.type === 'wait') && here && !night) this.ensureMarkers(q, s, 1);
      if (s.type === 'use' && s.target === 'name_input' && !a.played) { this.play(q, s); return; }
      // a choice with yourself happens where you stand
      if ((s.type === 'talk' || s.type === 'choose') && ['self', 'hero'].includes(this.resolve(s.target)) && here && !a.played) { this.play(q, s); return; }
      // the fight begins: the boss shows up
      if (s.type === 'defeat' && ['troll', 'minotaur', 'lich'].includes(s.target) && here) A.ensureBoss(s.target);
      if (s.type === 'defeat' && s.spawn && here && !a.spawned) { a.spawned = true; A.raid(s.target, s.spawn, { name: s.spawnName, near: true, tint: s.tint }); }
      // npc steps in the wild: the npc comes to you
      if ((s.type === 'talk' || s.type === 'choose') && (where.startsWith('wild:') || where === 'any') && here && this.npcById[this.resolve(s.target)]) A.ensureWildNpc(this.resolve(s.target));
    }
  }
  ensureMarkers(q, s, n) {
    const have = this.markers.filter((m) => m.qid === q.id && m.sid === s.id);
    if (have.length) return;
    const a = this.S.active[q.id]; const left = Math.max(1, n - (s.type === 'investigate' ? (a.counter || 0) : 0));
    const found = a.found || [];
    if (s.spots) { for (let i = 0; i < n; i++) { if (found.includes(i)) continue; const p = this.A.markerSpots(s.spots[i % s.spots.length], 1, q.id + s.id + i)[0]; if (p) this.markers.push({ qid: q.id, sid: s.id, x: p[0], y: p[1], i, n, type: s.type }); } return; }
    if (s.clues) { const pts = this.A.markerSpots(this.stepWhere(s), n, q.id + s.id, s.near); pts.forEach((p, i) => { if (!found.includes(i)) this.markers.push({ qid: q.id, sid: s.id, x: p[0], y: p[1], i, n, type: s.type }); }); return; }
    const pts = this.A.markerSpots(this.stepWhere(s), left, q.id + s.id + (a.counter || 0), s.near);
    pts.forEach((p, i) => this.markers.push({ qid: q.id, sid: s.id, x: p[0], y: p[1], i, n: pts.length, type: s.type }));
  }
  useMarker(m) {
    const q = this.qById[m.qid], s = this.step(m.qid); if (!s || s.id !== m.sid) return;
    const a = this.S.active[m.qid];
    if (s.type === 'night') { this.A.dialog({ title: q.title, lines: [{ who: 'narr', line: 'Ты садишься и ждёшь, пока стемнеет.' }], options: [{ text: 'Дождаться ночи', cls: 'gold', go: () => { this.A.close(); this.A.skipTo('night'); } }, { text: 'Позже', go: () => this.A.close() }] }); return; }
    if (s.type === 'wait') { this.A.dialog({ title: q.title, lines: [{ who: 'narr', line: 'Ночь долгая. Можно просто сидеть и смотреть на воду.' }], options: [{ text: 'Дождаться рассвета', cls: 'gold', go: () => { this.A.close(); this.A.skipTo('dawn'); a.dawn = true; this.markers = this.markers.filter((x) => x !== m); } }, { text: 'Позже', go: () => this.A.close() }] }); return; }
    if (s.type === 'cast') { this.A.toast(`${s.text}: примените заклинание здесь (${a.counter}/${s.count || 1})`, 2400); return; }
    this.markers = this.markers.filter((x) => x !== m);
    a.counter++;
    // new-style investigations: every clue has its own scene (.c1, .c2 …) by place; the step's scene sums them up
    if (s.clues || s.spots) {
      a.found = [...(a.found || []), m.i]; a.counter = a.found.length;
      const clue = s.scene && `${s.scene}.c${m.i + 1}`, last = a.counter >= (s.count || 1);
      const then = () => { if (last && this.step(q.id) === s) this.play(q, s); };
      if (clue && this.A.hasScene(clue)) this.A.scene(clue, { q, s, title: q.title, onEnd: then }); else { this.A.toast(`Найдено: ${a.counter} из ${s.count}`, 2000); then(); }
      return;
    }
    const left = this.markers.filter((x) => x.qid === m.qid && x.sid === m.sid).length;
    if (left > 0 || (s.type === 'investigate' && a.counter < (s.count || 1))) {
      const clue = s.scene && `${s.scene}.c${a.counter}`;
      if (clue && this.A.hasScene(clue)) this.A.scene(clue, { q, s, title: q.title, onEnd: () => {} });
      else this.A.toast(`Найдено: ${a.counter} из ${s.count}`, 2400);
      return;
    }
    this.play(q, s);
  }
  // marker the hero stands next to
  markerNear(x, y) { let b = null, bd = 36; for (const m of this.markers) { const d = Math.hypot(m.x - x, m.y - y); if (d < bd) { bd = d; b = m; } } return b; }
  // guidance: where the hero should go for the main step
  target() {
    const list = this.activeSteps(); list.sort((a, b) => (a.q.chain === 'main' ? -1 : 1) - (b.q.chain === 'main' ? -1 : 1));
    for (const { q, s } of list) {
      const w = (s.type === 'talk' || s.type === 'choose' || s.type === 'escort') && this.npcById[this.resolve(s.target)] ? (s.type === 'escort' && this.npcState(this.resolve(s.target)) === 'follower' ? s.where : this.npcHome(this.resolve(s.target))) : this.stepWhere(s);
      const p = this.A.locPos(w); if (p) return { pos: p, q, s };
    }
    const nx = this.nextMain(); if (nx && this.qById[nx].giver) { const p = this.A.locPos(this.npcHome(this.qById[nx].giver)); if (p) return { pos: p, q: this.qById[nx], s: null, offer: true }; }
    return null;
  }
  // npcs that want something from the hero: '!' for offers, '?' for active steps
  marks(npcId) {
    for (const { s } of this.activeSteps()) if ((s.type === 'talk' || s.type === 'choose' || s.type === 'escort') && this.resolve(s.target) === npcId) return '?';
    return this.offers(npcId).length ? '!' : '';
  }
  journalRows() {
    const rows = [];
    for (const { q, s } of this.activeSteps()) rows.push({ q, s, active: true });
    for (const [qid, oi] of Object.entries(this.S.done)) { const q = this.qById[qid]; if (q) rows.push({ q, o: q.outcomes[oi], done: true }); }
    for (const qid of Object.keys(this.S.failed)) { const q = this.qById[qid]; if (q) rows.push({ q, failed: true }); }
    return rows;
  }
  onForgetBond(npc) { /* bond loss is read from memory.sacrificed by greeting() and npcName() */ }
}
const DREAM_TITLES = { d_mitriy: 'Сон Митрия', d_lesya: 'Сон Лёси', d_ostap: 'Сон Остапа', d_marfa: 'Сон Марфы', d_weaver: 'Сон ткача', d_shepherd: 'Сон подпаска', d_morven: 'Сон юного Морвена' };
const SHARED_TITLES = { sh_fishing: 'Рыбалка с Шуршком', sh_morven: 'Ночь у трона' };
const FOREIGN_TITLES = { f_twelve_names: 'Двенадцать имён', f_red_winter: 'Красная зима (чужая)', f_iskra_grief: 'Половина чужого горя' };
