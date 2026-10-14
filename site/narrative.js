// Narrative bridge: runs ink scenes (inkjs) on top of the game's world state.
// Scenes live in narrative/*.ink, are compiled by tools/build_ink.mjs into narrative/story.ink.json.
// Every persistent consequence goes through the external functions bound here (see docs/CHOICE_FLAGS.md).
import { Story as InkStory } from './vendor/ink.mjs';
import * as WS from './world_state.js';

const LINE_RE = /^([a-z][a-z0-9_]*)\s*:\s*([\s\S]*)$/;
const PAGE = 4;

export class Narrative {
  constructor(json, index, api) {
    this.A = api; this.index = index || { knots: {} };
    this.ink = new InkStory(json);
    this.ink.onError = (msg, type) => { if (type === 2) this.errors.push(msg); else console.warn('[ink]', msg); };
    this.errors = []; this.running = null; this.queue = [];
    this.bind();
  }
  get G() { return this.A.G(); }
  has(path) { if (!path) return false; const [k, s] = path.split('.'); const K = this.index.knots[k]; return !!K && (!s || (K.stitches || []).includes(s)); }
  tags(knot) { return (this.index.knots[knot] && this.index.knots[knot].tags) || {}; }
  save() { try { return this.ink.state.toJson(); } catch (e) { return null; } }
  load(json) { if (!json) return; try { this.ink.state.LoadJson(json); } catch (e) { console.warn('[ink] state reset:', e.message); this.ink.ResetState(); } }

  // ---------------- external functions ----------------
  bind() {
    const A = this.A, S = () => A.story(), G = () => this.G;
    const get = (name, fn) => this.ink.BindExternalFunction(name, (...a) => { const r = fn(...a); return r === null || r === undefined ? 0 : r; }, true);
    const prim = (r) => (typeof r === 'number' || typeof r === 'string' || typeof r === 'boolean' ? r : undefined);
    const act = (name, fn) => this.ink.BindExternalFunction(name, (...a) => { const r = fn(...a); A.dirty(); return prim(r); }, false);
    const num = (v) => (typeof v === 'number' ? v : v === true ? 1 : v === false || v === undefined || v === null ? 0 : v);
    // ---- reading ----
    get('flag', (k) => { const v = G().flags[k]; return v === undefined || v === null ? 0 : v; });
    get('is', (k) => !!G().flags[k]);
    get('rep', (f) => WS.rep(G(), f));
    get('tier', (f) => WS.tierOf(WS.rep(G(), f)).id);
    get('trust', (n) => WS.rel(G(), n).trust);
    get('fear', (n) => WS.rel(G(), n).fear);
    get('respect', (n) => WS.rel(G(), n).respect);
    get('hostile', (n) => WS.rel(G(), n).hostility);
    get('knows', (f) => WS.knows(G(), f));
    get('heard', (n, id) => !!WS.heard(G(), n, id));
    get('did', (id) => WS.did(G(), id));
    get('rumor_on', (id) => WS.rumorActive(G(), id));
    get('has', (id) => A.hasItem(id));
    get('gold', () => G().gold || 0);
    get('echoes', () => G().echoes || 0);
    get('promised', (id) => WS.promiseState(G(), id));
    get('debt', (n) => WS.debtOf(G(), n));
    get('qstate', (q) => S().questState(q));
    get('chapter', () => WS.chapter(G()));
    get('day', () => Math.floor((G().time || 0) / 480) + 1);
    get('night', () => !!A.night());
    get('cls', () => G().cls);
    get('school', () => A.school());
    get('clarity', () => A.clarity());
    get('card', (id) => A.hasCard(id));
    get('lost', (id) => A.wasSacrificed(id));
    get('dream', (id) => ((G().memory || {}).dreams || []).includes(id));
    get('lvl', () => G().lvl || 1);
    get('fem', () => !!(G().char && G().char.female));
    get('hero', () => A.heroName());
    get('npcstate', (id) => S().npcState(id));
    get('met', (id) => !!(S().S.met[id]));
    get('val', (k) => num(S().value(k)));
    // ---- changing ----
    act('set', (k, v) => { G().flags[k] = v; });
    act('inc', (k, n) => { G().flags[k] = (+G().flags[k] || 0) + (n ?? 1); });
    act('addrep', (f, n) => { const t = WS.addRep(G(), f, n); if (t) this.post(() => A.toast(`${WS.data().factions[f]?.name || f}: теперь «${t.name}»`, 2400)); });
    act('addrel', (npc, kind, n) => WS.addRel(G(), npc, kind, n));
    act('learn', (fact) => { if (WS.learn(G(), fact, 'scene')) { const F = WS.data().facts[fact]; if (F) this.post(() => A.toast(`✎ Узнано: ${F.title}`, 2600)); } });
    act('tell', (npc, id) => WS.tell(G(), npc, id, 'hero'));
    act('deed', (id) => WS.deed(G(), id, { witnesses: [...new Set([...(this.running?.npcs || []), ...A.witnesses()])] }));
    act('deed_public', (id) => WS.deed(G(), id, { witnesses: [...new Set([...(this.running?.npcs || []), ...A.witnesses()])], public: true }));
    act('rumor', (id) => WS.startRumor(G(), id, { knowers: this.running?.npcs || [] }));
    act('refute', (id) => WS.refute(G(), id, this.running?.npc));
    act('promise', (id, npc) => { WS.promise(G(), id, npc); this.post(() => A.toast('Ты дал слово. Оно в журнале.', 2200)); });
    act('keep', (id) => WS.keepPromise(G(), id));
    act('breakp', (id) => WS.breakPromise(G(), id));
    act('release', (id) => WS.releasePromise(G(), id));
    act('debt_add', (npc, n, days) => WS.addDebt(G(), npc, n, days || 0));
    act('paydebt', (npc) => { const r = WS.payDebt(G(), npc); A.updateHUD(); return r; });
    act('betray', (id) => WS.betray(G(), id, WS.data().deeds[id] || {}));
    act('later', (days, ev) => WS.later(G(), { days }, ev));
    act('at_chapter', (ch, ev) => WS.later(G(), { chapter: ch }, ev));
    act('give', (id) => A.giveItem(id));
    act('take', (id) => A.takeItem(id));
    act('pay', (n) => { if ((G().gold || 0) < n) return false; G().gold -= n; A.updateHUD(); return true; });
    act('earn', (n) => { A.addGold(n); });
    act('echo', (n) => { A.addEchoes(n); });
    act('xp', (n) => { A.addXp(n); });
    act('fx', (w) => S().effect(w, this.running?.q || { id: 'scene', title: '' }, { text: '' }));
    act('go', (step) => { if (this.running) this.running.next = step; });
    act('startq', (q) => this.post(() => S().start(q)));
    act('failq', (q) => this.post(() => S().fail(q)));
    act('trade', (mid) => this.post(() => A.trade(mid)));
    act('learnpath', (cls) => this.post(() => A.learnPath(cls)));
    act('skip', (when) => this.post(() => A.skipTo(when)));
    act('toast', (t) => this.post(() => A.toast(t, 2600)));
    act('sfx', (k) => A.sfx(k));
    act('settrade', (mid, flag, v) => WS.setTrade(G(), mid, flag, v));
    act('chapter_to', (n) => this.post(() => A.chapterTo(n)));
    act('npc_to', (id, st) => S().effect(`npc:${id}:${st}`, { id: 'scene', title: '' }, {}));
  }
  post(fn) { if (this.running) this.running.post.push(fn); else fn(); }
  busy() { return !!this.running; }

  // ---------------- playing ----------------
  // opts: { npc, npcs, q, s, onEnd(next), title }
  run(knot, opts = {}) {
    if (!this.has(knot)) { console.warn('[ink] no scene', knot); if (opts.onEnd) opts.onEnd(null); return false; }
    if (this.running) { this.queue.push([knot, opts]); return true; }
    const T = this.tags(knot.split('.')[0]);
    const who = (T.who || '').split(',').map((s) => s.trim()).filter((s) => this.A.isNpc(s));
    this.running = { knot, npc: opts.npc || who[0] || null, npcs: [...new Set([opts.npc, ...who, ...(opts.npcs || [])].filter(Boolean))], q: opts.q, s: opts.s, onEnd: opts.onEnd, next: null, post: [], title: opts.title || T.title || null, lines: [], endLabel: opts.endLabel || null };
    (this.played = this.played || []).push(knot);
    try { this.ink.ChoosePathString(knot); } catch (e) { console.error('[ink]', e); this.finish(); return false; }
    this.advance();
    return true;
  }
  advance() {
    const R = this.running; if (!R) return;
    try {
      while (this.ink.canContinue) {
        const raw = this.ink.Continue(); const tags = this.ink.currentTags || [];
        for (const t of tags) this.lineTag(t);
        const text = raw.trim(); if (!text) continue;
        R.lines.push(this.parse(text));
      }
    } catch (e) { console.error('[ink]', e); R.lines.push({ who: 'narr', text: '…' }); this.ink.ResetCallstack?.(); }
    this.show();
  }
  lineTag(t) { const m = /^(\w+)\s*:\s*(.*)$/.exec(t); if (!m) return; if (m[1] === 'sfx') this.A.sfx(m[2]); if (m[1] === 'face' && this.running) this.running.npc = m[2]; }
  parse(text) {
    const m = LINE_RE.exec(text);
    if (m) { const id = m[1]; if (id === 'narr' || id === 'act' || id === 'hero' || this.A.isNpc(id)) return { who: id, text: this.A.fill(m[2]) }; }
    return { who: 'narr', text: this.A.fill(text) };
  }
  show() {
    const R = this.running, A = this.A;
    const choices = this.ink.currentChoices || [];
    const page = R.lines.splice(0, PAGE);
    const more = R.lines.length > 0;
    if (!page.length && !more && !choices.length) return this.finish();
    const speaker = page.find((l) => A.isNpc(l.who))?.who || R.npc;
    const html = `<div class="talk">${speaker ? `<div class="who"><canvas id="talkFace" width="64" height="64"></canvas><div><b>${A.esc(A.npcName(speaker))}</b><small>${A.esc(A.npcRole(speaker))}</small></div></div>` : R.title ? `<h2>${A.esc(R.title)}</h2>` : ''}
      <div class="lines">${page.map((l) => this.lineHtml(l)).join('')}</div>
      ${R.s && R.s.text && !more && choices.length ? `<p class="aside">◇ ${A.esc(R.s.text)}</p>` : ''}
      <div class="row col">${more || !choices.length ? `<button class="btn primary" data-a="next">${more ? 'Дальше ▸' : R.endLabel || 'Дальше'}</button>` : choices.map((c, i) => { const struck = (c.tags || []).includes('struck'); return `<button class="btn ${(c.tags || []).includes('gold') ? 'gold' : ''} ${struck ? 'struck' : ''}" data-a="c${i}" ${struck ? 'disabled' : ''}>${A.esc(A.fill(c.text))}${struck ? ' <small>— ты что-то об этом знал…</small>' : ''}</button>`; }).join('')}</div></div>`;
    A.modal(html, null, () => { if (speaker) A.drawFace(speaker); });
    const h = {};
    if (more) h.next = () => this.show();
    else if (!choices.length) h.next = () => this.finish();
    else choices.forEach((c, i) => { h['c' + i] = () => { try { this.ink.ChooseChoiceIndex(i); } catch (e) { console.error('[ink]', e); return this.finish(); } this.advance(); }; });
    A.setHandlers(h);
  }
  lineHtml(l) {
    const A = this.A;
    if (l.who === 'narr') return `<p class="aside narr">${A.esc(l.text)}</p>`;
    if (l.who === 'act') return `<p class="act">${A.esc(l.text)}</p>`;
    const name = l.who === 'hero' ? 'Ты' : A.npcName(l.who);
    return `<p class="line"><b class="sp">${A.esc(name)}:</b> «${A.esc(l.text)}»</p>`;
  }
  finish() {
    const R = this.running; this.running = null;
    this.A.close();
    if (!R) return;
    for (const fn of R.post) try { fn(); } catch (e) { console.error(e); }
    this.A.save();
    if (R.onEnd) R.onEnd(R.next);
    if (this.queue.length && !this.A.modalOpen()) { const [k, o] = this.queue.shift(); this.run(k, o); }
  }
}
