// Sound: recorded samples (sfx/*.ogg, listed in sfx/sfx.json) with a tiny synth as fallback, and looping music tracks.
const store = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };

export const audio = {
  ctx: null, on: store.get('alderford.sound') !== false, vol: store.get('alderford.vol') ?? .8, musicVol: store.get('alderford.mvol') ?? .45,
  buf: {}, groups: {}, base: 'sfx/', master: null, musicGain: null, last: {},
  unlock() {
    if (!this.ctx) {
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
      this.master = this.ctx.createGain(); this.master.gain.value = this.vol; this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = this.musicVol; this.musicGain.connect(this.ctx.destination);
      this.decodeAll();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },
  // sfx.json: { "groups": { "hit": ["hit1", "hit2"], ... }, "music": { "village": "music/village" } }
  async load(base = 'sfx/') {
    this.base = base;
    try { const m = await (await fetch(base + 'sfx.json')).json(); this.groups = m.groups || {}; this.musicMap = m.music || {}; this.raw = {}; } catch { this.groups = {}; this.musicMap = {}; return; }
    const names = new Set(Object.values(this.groups).flat());
    await Promise.all([...names].map(async (n) => { try { this.raw[n] = await (await fetch(base + n + '.ogg')).arrayBuffer(); } catch {} }));
    if (this.ctx) this.decodeAll();
  },
  decodeAll() {
    if (!this.raw || !this.ctx) return;
    for (const [n, ab] of Object.entries(this.raw)) { if (this.buf[n] || !ab) continue; this.buf[n] = 'pending'; this.ctx.decodeAudioData(ab.slice(0)).then((b) => { this.buf[n] = b; }, () => { delete this.buf[n]; }); }
  },
  // play a sample from a group; returns false when no sample is ready
  play(group, { vol = 1, rate = 1, jitter = .08, gap = .045 } = {}) {
    if (!this.on || !this.ctx) return true;
    const list = this.groups[group]; if (!list || !list.length) return false;
    const t = this.ctx.currentTime; if (this.last[group] && t - this.last[group] < gap) return true; this.last[group] = t;
    const name = list[Math.floor(Math.random() * list.length)], b = this.buf[name]; if (!b || b === 'pending') return false;
    const s = this.ctx.createBufferSource(), g = this.ctx.createGain(); s.buffer = b; s.playbackRate.value = rate * (1 + (Math.random() * 2 - 1) * jitter); g.gain.value = vol;
    s.connect(g).connect(this.master); s.start(); return true;
  },
  tone(f, d = .1, type = 'square', v = .06, slide = 0) {
    if (!this.on || !this.ctx) return; const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, c.currentTime); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), c.currentTime + d);
    g.gain.setValueAtTime(v, c.currentTime); g.gain.exponentialRampToValueAtTime(.0001, c.currentTime + d); o.connect(g).connect(this.master || c.destination); o.start(); o.stop(c.currentTime + d);
  },
  noise(d = .08, v = .05) { if (!this.on || !this.ctx) return; const c = this.ctx, b = c.createBuffer(1, c.sampleRate * d, c.sampleRate), a = b.getChannelData(0); for (let i = 0; i < a.length; i++) a[i] = (Math.random() * 2 - 1) * (1 - i / a.length); const s = c.createBufferSource(), g = c.createGain(); g.gain.value = v; s.buffer = b; s.connect(g).connect(this.master || c.destination); s.start(); },
  setVol(v) { this.vol = v; store.set('alderford.vol', v); if (this.master) this.master.gain.value = v; },
  setMusicVol(v) { this.musicVol = v; store.set('alderford.mvol', v); if (this.musicGain) this.musicGain.gain.value = v; },
  toggle() { this.on = !this.on; store.set('alderford.sound', this.on); if (this.musicEl) { if (this.on) this.musicEl.play().catch(() => {}); else this.musicEl.pause(); } return this.on; },
  // music: one looping <audio> element routed through WebAudio, cross-faded on zone change
  musicMap: {}, musicEl: null, musicKey: '',
  music(key) {
    if (key === this.musicKey) return; this.musicKey = key;
    const src = this.musicMap[key]; if (!src) return false;
    const old = this.musicEl, el = new Audio(this.base + src + '.ogg'); el.loop = true; el.volume = 0; this.musicEl = el;
    if (this.on) el.play().catch(() => {});
    let k = 0; const fade = setInterval(() => { k = Math.min(1, k + .05); el.volume = k * this.musicVol; if (old) old.volume = Math.max(0, (1 - k) * this.musicVol); if (k >= 1) { clearInterval(fade); if (old) old.pause(); } }, 60);
    return true;
  },
};

// Named effects: sample group first, synth fallback.
const S = (group, fallback, opt) => () => { if (!audio.play(group, opt)) fallback(); };
export const sfx = {
  swing: S('swing', () => audio.noise(.07, .05), { vol: .7 }),
  dodge: S('dodge', () => { audio.noise(.12, .04); audio.tone(240, .1, 'sine', .02, -120); }, { vol: .7 }),
  parry: S('parry', () => { audio.tone(1250, .12, 'square', .045, -200); audio.tone(1870, .16, 'triangle', .035, -300); audio.noise(.05, .05); }, { vol: .9 }),
  hit: S('hit', () => { audio.tone(160, .09, 'square', .06, -80); audio.noise(.05, .04); }, { vol: .8 }),
  hurt: S('hurt', () => audio.tone(110, .18, 'sawtooth', .06, -50)),
  arrow: S('arrow', () => audio.tone(900, .08, 'triangle', .04, -500), { vol: .7 }),
  cast: S('cast', () => audio.tone(520, .2, 'sine', .05, 400), { vol: .7 }),
  fire: S('fire', () => audio.tone(300, .25, 'sawtooth', .04, -150), { vol: .8 }),
  ice: S('ice', () => audio.tone(1400, .2, 'sine', .04, -600), { vol: .8 }),
  shadow: S('shadow', () => audio.tone(180, .3, 'sine', .05, -80), { vol: .8 }),
  holy: S('holy', () => [880, 1320].forEach((f, i) => setTimeout(() => audio.tone(f, .2, 'sine', .035), i * 60)), { vol: .8 }),
  memory: S('memory', () => [660, 990, 740].forEach((f, i) => setTimeout(() => audio.tone(f, .25, 'triangle', .03), i * 80)), { vol: .8 }),
  boom: S('boom', () => audio.noise(.3, .08)),
  thunder: S('thunder', () => audio.noise(.4, .09)),
  coin: S('coin', () => { audio.tone(988, .06, 'square', .03); setTimeout(() => audio.tone(1319, .08, 'square', .03), 60); }, { vol: .6, gap: .06 }),
  level: S('level', () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => audio.tone(f, .16, 'square', .05), i * 110))),
  chest: S('chest', () => [392, 523, 659].forEach((f, i) => setTimeout(() => audio.tone(f, .1, 'triangle', .05), i * 70))),
  potion: S('potion', () => audio.tone(400, .25, 'sine', .05, 300)),
  die: S('die', () => audio.tone(200, .5, 'sawtooth', .06, -170)),
  ui: S('ui', () => audio.tone(660, .04, 'square', .025), { vol: .5 }),
  door: S('door', () => audio.noise(.15, .04)),
  step: S('step', () => {}, { vol: .25, gap: .2 }),
  equip: S('equip', () => audio.tone(300, .08, 'square', .04)),
  forget: S('forget', () => [740, 622, 523, 392].forEach((f, i) => setTimeout(() => audio.tone(f, .4, 'sine', .04), i * 140))),
};
export const play = (key) => (sfx[key] || sfx.cast)();
