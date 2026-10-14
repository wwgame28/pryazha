// Звуки мира: река у воды, ветер, птицы днём, сверчки ночью, треск костра, дождь; шаги по траве, песку, воде и камню.
// Всё синтезируется WebAudio (шум через фильтры и короткие тона), без новых файлов. Громкость слоёв плавно следует
// за местом, погодой и временем суток; при выключенном звуке слои молчат.
import { audio } from './audio.js';
import { TILE } from './world.js';

let beds = null, noiseBuf = null, birdT = 1, cricketT = 1, crackT = 0;
function noiseBuffer(c) {
  // белый шум с примесью «бурого»: мягче для ушей, похоже на воду и ветер
  const b = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), a = b.getChannelData(0); let last = 0;
  for (let i = 0; i < a.length; i++) { const w = Math.random() * 2 - 1; last = (last + .02 * w) / 1.02; a[i] = w * .5 + last * 3; }
  return b;
}
function bed(c, type, freq, q) {
  const s = c.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
  const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = c.createGain(); g.gain.value = 0; s.connect(f).connect(g).connect(audio.master); s.start(Math.random() * .1);
  return { g, f };
}
function ready() {
  const c = audio.ctx; if (!c || !audio.master) return false;
  if (!beds) { noiseBuf = noiseBuffer(c); beds = { river: bed(c, 'bandpass', 700, .6), wind: bed(c, 'lowpass', 380, .5), rain: bed(c, 'highpass', 1300, .4) }; }
  return true;
}
const level = (b, v, k = .8) => { const c = audio.ctx; b.g.gain.setTargetAtTime(audio.on ? v : 0, c.currentTime, k); };
// env: { water: 0..1 (сколько воды рядом), biome, dark: 0..1, rain: 0..1, fire: 0..1 (близость костра), indoor }
export function ambientTick(dt, env) {
  if (!ready()) return;
  const now = performance.now() / 1000;
  level(beds.river, .055 * env.water);
  const wind = env.indoor ? 0 : (env.biome === 'snow' || env.biome === 'hills' ? .05 : env.biome === 'steppe' ? .038 : .018) * (1 + env.rain * .6);
  level(beds.wind, wind * (.7 + .3 * Math.sin(now / 4.3)), 1.5);
  beds.wind.f.frequency.setTargetAtTime(300 + 180 * Math.sin(now / 5.1), audio.ctx.currentTime, 1);
  level(beds.rain, env.indoor ? 0 : .075 * env.rain, 1.2);
  if (!audio.on) return;
  const day = 1 - (env.dark || 0);
  if (!env.indoor && day > .6 && env.rain < .3 && (env.biome === 'meadow' || env.biome === 'forest') && (birdT -= dt) <= 0) { birdT = 2.5 + Math.random() * 6; chirp(); }
  if (!env.indoor && env.dark > .45 && env.rain < .3 && env.biome !== 'snow' && (cricketT -= dt) <= 0) { cricketT = .8 + Math.random() * 1.8; cricket(); }
  if (env.fire > 0 && (crackT -= dt) <= 0) { crackT = .1 + Math.random() * .5; audio.noise(.015 + Math.random() * .03, .03 * env.fire); }
}
function chirp() {
  const n = 2 + Math.floor(Math.random() * 4), f0 = 2500 + Math.random() * 1700;
  for (let i = 0; i < n; i++) setTimeout(() => audio.tone(f0 + Math.random() * 400, .06, 'sine', .011, 500 + Math.random() * 900), i * (70 + Math.random() * 70));
}
function cricket() { for (let i = 0; i < 3; i++) setTimeout(() => audio.tone(4300 + Math.random() * 300, .03, 'square', .0035), i * 55); }
// шаг по поверхности (зовётся на кадрах, где нога касается земли)
export function footstep(tile) {
  if (!audio.ctx || !audio.on) return;
  // записанные шаги (sfx/step*) с разной высотой под поверхность; синтез — если записи не загрузились
  if (tile === TILE.SHALLOW || tile === TILE.WATER || tile === TILE.SWAMP) { audio.noise(.07, .02); audio.tone(260 + Math.random() * 80, .05, 'sine', .008, -100); }
  else if (tile === TILE.SAND || tile === TILE.SNOW || tile === TILE.DRY || tile === TILE.FIELD) { if (!audio.play('step', { vol: .22, rate: .75, gap: .12 })) audio.noise(.045, .013); }
  else if (tile === TILE.STONE || tile === TILE.COBBLE || tile === TILE.WALL || tile === TILE.BRIDGE || tile === TILE.WOOD || tile === TILE.GRAVEL || tile === TILE.CLIFF) { if (!audio.play('step', { vol: .3, rate: 1.25, gap: .12 })) audio.tone(130 + Math.random() * 30, .03, 'triangle', .011); }
  else if (!audio.play('step', { vol: .16, rate: .95, gap: .12 })) audio.noise(.025, .007); // трава и земля
}
