// Dreams: the seven lives the hero is stitched from, shown as short first-person memories over a pixel vignette.
import { ART, drawSprite, drawAnim } from './art.js';

const W = 320, H = 184, T = 32;
const rnd = (i, k = 0) => { let h = Math.imul(i + 1, 2654435761) ^ Math.imul(k + 7, 40503); h = Math.imul(h ^ (h >>> 15), 2246822507); return ((h ^ (h >>> 13)) >>> 0) / 4294967296; };

// what each dream is, what it gives while remembered, and how it looks
export const DREAMS = {
  mitriy: {
    title: 'Сон Митрия', who: 'рыбак Митрий Вереск, сын Агафьи', gift: '+6 % к скорости бега и +10 % Отголосков у воды',
    lines: [
      'Сеть тяжёлая, мокрая, пахнет тиной. Руки знают узлы лучше, чем я сам.',
      'С крыльца кричат: «Митя! Остынет!» Голос молодой, сердитый. Родной.',
      'Я машу рукой и не иду. Ещё один заброс. У переката всегда стоит голавль.',
      'Мама вплетает в косу красную нитку. «Чтоб ты знал дорогу домой», — говорит она. Я смеюсь.',
      'Вода холодная. Как в тот раз. Как во все разы.',
    ],
    wake: 'Ты просыпаешься у брода. На отмели светятся нити. В доме Агафьи горит окно.',
    scene: 'ford',
  },
  lesya: {
    title: 'Сон Лёси', who: 'Лёся, младшая сестра Искры', gift: 'вода и топи больше не замедляют, +3 % к стойкости',
    lines: [
      '«Забирай свою брошку!» — Искра швыряет её в воду. Блестит, крутится, тонет.',
      'Я ныряю, потому что она моя. Потому что мама подарила её мне, а не ей.',
      'Внизу тихо и зелено. Брошка лежит на камне, рядом с чужой ракушкой.',
      'Я почти достала. Почти.',
      'Сверху кричат моё имя. Сначала зло. Потом страшно.',
    ],
    wake: 'Холодно до костей. В Стане Пепельного Круга Искра просыпается от того же сна.',
    scene: 'lake',
  },
  ostap: {
    title: 'Сон Остапа', who: 'Остап Ряд, солдат Пепельного года', gift: '+5 % к блоку и +10 к здоровью',
    lines: [
      'Пепел падает, как снег, только тёплый. Мы стоим цепью, копья в землю.',
      'Сотник говорит: «Что сгорит — то не наше». Сотник врёт: у него дочь в Броде.',
      'В нагрудном кармане письмо. Пишу его третью неделю и не знаю кому.',
      'По степи идёт белая кромка, и за ней ничего. Ни травы, ни крика.',
      'Если меня никто не вспомнит, я буду писать сам. Хоть кому-нибудь.',
    ],
    wake: 'В пальцах чужая мозоль от древка. Глубоко в склепе скелет макает перо в чернила.',
    scene: 'ash',
  },
  marfa: {
    title: 'Сон Марфы', who: 'знахарка Марфа, бабка Весны', gift: 'зелья лечат на 20 % сильнее',
    lines: [
      'На подоконнике остывает пирог со щавелем. Окно открыто, чтобы пахло на всю улицу.',
      'Мята, зверобой, три капли болотной росы. Руки считают сами, я только смотрю.',
      'Прошка приходит из шахты чёрный, как печная заслонка, и сразу к окну: «Мам, это мне?»',
      '«Сначала руки мыть». Он смеётся, и в смехе солнце, которого внизу нет.',
      'Внучке я потом скажу: травы помнят тех, кто их собирал. Береги.',
    ],
    wake: 'Пахнет мятой. Весна в трактире почему-то печёт пирог со щавелем, хотя никогда не умела.',
    scene: 'hut',
  },
  weaver: {
    title: 'Сон ткача', who: 'безымянный перевязчик', gift: '+10 % Отголосков с врагов',
    lines: [
      'Прореха дышит, как рана. Из неё тянет Небылью: недосмотренными снами, чужими голосами.',
      'Игла длинная, как ресница луны. Нить — моя песня. Других ниток у меня нет.',
      'Мать Кудель говорит: «Шей так, чтобы не было видно шва». Я шью так, чтобы было слышно.',
      'Стежок за стежком отдаю мелодию. Последний куплет я так и не придумал.',
      'Заплата держит. Как меня звали — уже не важно.',
    ],
    wake: 'Где-то у менгира тихо звучит музыка. Ты её не помнишь, но подпеваешь.',
    scene: 'rift',
  },
  shepherd: {
    title: 'Сон подпаска', who: 'Сенька, подпасок из Сухого Лога', gift: '+1 ячейка для Отпечатков',
    lines: [
      'Овцы считаются до сорока, а дальше пальцы кончаются. Я считаю ещё раз.',
      'Дед вырезал свисток из ивы. Свистнешь — все поднимают головы. Даже ветер.',
      'Край степи вдруг белеет, как молоко. Белое идёт к нам, тихо и ровно.',
      'Я свищу, пока не кончается воздух. Овцы бегут к Логу. Я — нет. Я считаю.',
      'Тридцать девять. Сорок. Все дома.',
    ],
    wake: 'Дети в Сухом Логе зовут это место «где Сенька стоял». Ты стоишь там же.',
    scene: 'steppe',
  },
  morven: {
    title: 'Сон юного Морвена', who: 'Морвен Тихий, каким он был до склепа', gift: 'навык-узел «Чужая походка»',
    lines: [
      'Мне двадцать. Сегодня я впервые читаю имена у воды. Береста дрожит в руках.',
      'Каждое имя — как камешек: бросишь, и круги, и тише. Тише. Тише.',
      'Куда они идут, когда их перестают говорить? Кто их там встречает?',
      'Никто. Их никто не встречает. Значит, буду я.',
      'Солнце над Бродом. Смотрю на него долго, чтобы запомнить. Не запомнил.',
    ],
    wake: 'Под кладбищем старый лич на миг поднимает голову, будто его окликнули по имени.',
    scene: 'provody',
  },
};
// passive bonuses of the dreams the hero still holds
export function dreamMods(dreams, ctx = {}) {
  const out = [];
  for (const d of dreams || []) {
    if (d === 'mitriy') { out.push({ stat: 'speed%', value: .06 }); if (ctx.nearWater) out.push({ stat: 'echoFind%', value: .1 }); }
    if (d === 'lesya') out.push({ stat: 'slowResist', value: .4 }, { stat: 'resist:all', value: .03 });
    if (d === 'ostap') out.push({ stat: 'block', value: .05 }, { stat: 'hp', value: 10 });
    if (d === 'weaver') out.push({ stat: 'echoFind%', value: .1 });
  }
  return out;
}

// ---------- drawing helpers ----------
const SEASON_IMG = (s) => ART.img['terrain_' + (s || 'summer')];
function tile(x, kind, tx, ty, ox = 0, oy = 0) {
  const v = Math.floor(rnd(tx * 31 + ty, 3) * 3);
  let im, cx, cy;
  switch (kind) {
    case 'grass': im = SEASON_IMG('summer'); cx = 3 + v; cy = 1 + (ty & 1); break;
    case 'dry': im = SEASON_IMG('autumn'); cx = 3 + v; cy = 1 + (ty & 1); break;
    case 'snow': im = SEASON_IMG('winter'); cx = 3 + v; cy = 1 + (ty & 1); break;
    case 'sand': im = SEASON_IMG('summer'); cx = 3 + v; cy = 5; break;
    case 'dirt': im = SEASON_IMG('summer'); cx = 3 + v; cy = 3 + (ty & 1); break;
    case 'water': im = SEASON_IMG('summer'); cx = 1; cy = 11; break;
    case 'floor': im = ART.img.dungeon; if (im) { x.drawImage(im, (tx & 1) * 32, 96, 32, 32, ox + tx * T, oy + ty * T, T, T); return; } break;
  }
  if (im) x.drawImage(im, cx * T, cy * T, T, T, ox + tx * T, oy + ty * T, T, T);
  else { x.fillStyle = { grass: '#4f7a3a', dry: '#a08a4a', snow: '#e8eef4', sand: '#d8c08a', dirt: '#7a5a3a', water: '#3a6a8a' }[kind] || '#333'; x.fillRect(ox + tx * T, oy + ty * T, T, T); }
}
function rows(x, kind, y0, y1, ox = 0) { for (let ty = y0; ty < y1; ty++) for (let tx = 0; tx < 11; tx++) tile(x, kind, tx, ty, ox, 0); }
function shimmer(x, y0, y1, t, col = 'rgba(255,255,255,.25)') { x.fillStyle = col; for (let i = 0; i < 26; i++) { const px = (rnd(i, 1) * W + t * 8 * (rnd(i, 2) + .3)) % W, py = y0 + rnd(i, 3) * (y1 - y0); x.fillRect(px, py, 4 + rnd(i, 4) * 6, 1); } }
function sheep(x, X, Y, t, i) {
  const b = Math.sin(t * 3 + i) * .6; x.fillStyle = 'rgba(0,0,0,.2)'; x.beginPath(); x.ellipse(X, Y + 1, 8, 2.5, 0, 0, 7); x.fill();
  x.fillStyle = '#f2efe6'; x.beginPath(); x.ellipse(X, Y - 6 + b, 8, 5, 0, 0, 7); x.fill(); x.fillStyle = '#d8d2c4'; x.fillRect(X - 6, Y - 3 + b, 12, 2);
  x.fillStyle = '#4a4440'; x.fillRect(X + (i % 2 ? 6 : -9), Y - 9 + b, 4, 4); x.fillRect(X - 5, Y - 2, 2, 3); x.fillRect(X + 3, Y - 2, 2, 3);
}
function particles(x, kind, t) {
  const N = 40;
  for (let i = 0; i < N; i++) {
    const a = rnd(i, 11), b = rnd(i, 12), c = rnd(i, 13);
    if (kind === 'ash') { const px = (a * W + Math.sin(t * .7 + i) * 10) % W, py = (b * H + t * (8 + c * 10)) % H; x.fillStyle = c < .2 ? 'rgba(255,150,60,.8)' : 'rgba(200,190,180,.7)'; x.fillRect(px, py, c < .2 ? 1 : 2, c < .2 ? 1 : 2); }
    if (kind === 'fireflies') { const px = a * W + Math.sin(t * (.5 + c) + i) * 12, py = 40 + b * 90 + Math.cos(t * (.4 + c) + i) * 8, on = (Math.sin(t * 2 + i * 1.7) + 1) / 2; x.fillStyle = `rgba(255,240,150,${on * .9})`; x.fillRect(px, py, 2, 2); }
    if (kind === 'bubbles' && i < 18) { const px = 150 + a * 80 + Math.sin(t * 2 + i) * 3, py = H - ((t * (12 + c * 14) + b * H) % H); x.strokeStyle = 'rgba(220,255,250,.6)'; x.beginPath(); x.arc(px, py, 1 + c * 2, 0, 7); x.stroke(); }
    if (kind === 'dust') { const px = (a * W + t * (6 + c * 6)) % W, py = b * H; x.fillStyle = 'rgba(255,240,200,.35)'; x.fillRect(px, py, 1, 1); }
  }
}
function overlay(x, kind) {
  const g = x.createLinearGradient(0, 0, 0, H);
  const C = { dusk: ['rgba(255,150,90,.22)', 'rgba(60,30,90,.38)'], night: ['rgba(20,30,70,.45)', 'rgba(5,8,25,.6)'], ash: ['rgba(150,110,90,.3)', 'rgba(60,40,40,.4)'], warm: ['rgba(255,210,140,.18)', 'rgba(120,80,40,.25)'], deep: ['rgba(40,120,120,.3)', 'rgba(5,40,50,.65)'], pale: ['rgba(255,255,255,.08)', 'rgba(200,190,160,.2)'] }[kind];
  if (C) { g.addColorStop(0, C[0]); g.addColorStop(1, C[1]); x.fillStyle = g; x.fillRect(0, 0, W, H); }
  const v = x.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, W * .62); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.65)'); x.fillStyle = v; x.fillRect(0, 0, W, H);
}
const walkF = (t, sp = 8) => 1 + Math.floor(t * sp) % 8;

// ---------- the scenes ----------
const SCENES = {
  ford(x, t, L) {
    rows(x, 'grass', 0, 3); for (let tx = 0; tx < 11; tx++) tile(x, 'sand', tx, 3); rows(x, 'water', 4, 6);
    shimmer(x, 128, H, t);
    drawSprite(x, 'oak3', 30, 80, 'autumn'); drawSprite(x, 'houseB', 236, 92); x.fillStyle = `rgba(255,210,120,${.6 + Math.sin(t * 3) * .2})`; x.fillRect(214, 50, 8, 8);
    drawSprite(x, 'reed2', 120, 132, 'summer'); drawSprite(x, 'reed4', 290, 130, 'summer');
    L.agafya.draw(x, 'walk', 'down', 0, 200, 100, 1);
    const sx = 110 + Math.sin(t * .6) * 4; L.mitriy.draw(x, t % 5 < 1.2 ? 'slash' : 'walk', 'down', t % 5 < 1.2 ? Math.min(5, (t % 5) * 5) : 0, sx, 136, 1);
    x.strokeStyle = 'rgba(230,230,220,.5)'; x.beginPath(); x.moveTo(sx + 10, 118); x.quadraticCurveTo(sx + 40, 140 + Math.sin(t) * 4, sx + 70, 158); x.stroke();
    x.fillStyle = '#c03030'; x.fillRect(197, 82, 2, 3);
    particles(x, 'fireflies', t); overlay(x, 'dusk');
  },
  lake(x, t, L) {
    // above water at first, then under it
    const under = t > 6;
    if (!under) {
      rows(x, 'grass', 0, 2); for (let tx = 0; tx < 11; tx++) tile(x, 'sand', tx, 2); rows(x, 'water', 3, 6); shimmer(x, 96, H, t);
      drawSprite(x, 'reed1', 40, 92, 'summer'); drawSprite(x, 'lily2', 170, 150, 'summer'); drawSprite(x, 'lily1', 250, 130, 'summer');
      L.iskra.draw(x, t < 1.5 ? 'spellcast' : 'walk', 'down', t < 1.5 ? Math.min(6, t * 5) : 0, 140, 76, 1);
      const k = Math.min(1, t / 1.6), bx = 140 + k * 60, by = 64 + k * 60 - Math.sin(k * 3.1) * 40; x.fillStyle = '#ffd25a'; x.fillRect(bx, by, 3, 3); x.fillStyle = 'rgba(255,255,255,.8)'; if (Math.floor(t * 8) % 2) x.fillRect(bx + 1, by - 2, 1, 1);
      if (t > 1.6) { x.strokeStyle = `rgba(255,255,255,${Math.max(0, 1 - (t - 1.6) / 2)})`; x.beginPath(); x.ellipse(200, 124, (t - 1.6) * 14, (t - 1.6) * 5, 0, 0, 7); x.stroke(); }
      overlay(x, 'pale');
    } else {
      x.fillStyle = '#1d4a4a'; x.fillRect(0, 0, W, H); for (let i = 0; i < 9; i++) { x.fillStyle = `rgba(80,160,150,${.06 + i * .01})`; x.fillRect(0, i * 20, W, 20); }
      x.fillStyle = '#2a3a30'; x.fillRect(0, 160, W, 24); drawSprite(x, 'rockS2', 210, 170); drawSprite(x, 'reed5', 60, 172, 'autumn');
      x.fillStyle = '#ffd25a'; x.fillRect(206, 150, 3, 3); x.fillStyle = '#e8e2d4'; x.fillRect(214, 152, 4, 2);
      const sink = Math.min(1, (t - 6) / 6); L.lesya.draw(x, 'walk', 'down', walkF(t, 3), 160 + sink * 30, 70 + sink * 70, 1);
      x.fillStyle = 'rgba(200,255,240,.12)'; for (let i = 0; i < 6; i++) { const px = 40 + i * 50 + Math.sin(t + i) * 10; x.beginPath(); x.moveTo(px, 0); x.lineTo(px + 30, 0); x.lineTo(px + 10 + Math.sin(t * .5 + i) * 20, H); x.lineTo(px - 10, H); x.fill(); }
      particles(x, 'bubbles', t); overlay(x, 'deep');
    }
  },
  ash(x, t, L) {
    rows(x, 'dry', 0, 6); x.fillStyle = 'rgba(40,30,25,.25)'; x.fillRect(0, 0, W, H);
    drawSprite(x, 'tent', 60, 92); drawAnim(x, 'campfire', 150, 104, t);
    // the white edge on the horizon
    const edge = 40 + Math.sin(t * .2) * 6; const g = x.createLinearGradient(W - edge - 60, 0, W, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,.9)'); x.fillStyle = g; x.fillRect(W - edge - 60, 0, edge + 60, H);
    L.soldier1.draw(x, 'walk', 'right', 0, 120, 150, 1); L.ostap.draw(x, 'walk', 'right', 0, 170, 156, 1); L.soldier2.draw(x, 'walk', 'right', 0, 220, 150, 1);
    particles(x, 'ash', t); overlay(x, 'ash');
  },
  hut(x, t, L) {
    rows(x, 'grass', 0, 6); for (let tx = 0; tx < 11; tx++) tile(x, 'dirt', tx, 4);
    drawSprite(x, 'houseA', 110, 116); x.fillStyle = '#c88a4a'; x.fillRect(96, 58, 14, 4); x.fillStyle = '#7a4a2a'; x.fillRect(96, 62, 14, 2);
    for (let i = 0; i < 3; i++) { const k = (t * .4 + i * .33) % 1; x.fillStyle = `rgba(255,255,255,${.35 * (1 - k)})`; x.fillRect(100 + Math.sin(t + i * 2) * 4, 54 - k * 22, 3, 3); }
    drawAnim(x, 'cauldron', 236, 128, t);
    L.marfa.draw(x, 'spellcast', 'left', Math.floor(t * 4) % 7, 266, 130, 1);
    const bx = Math.min(150, 10 + t * 12); L.prosha.draw(x, bx < 150 ? 'walk' : 'walk', bx < 150 ? 'right' : 'up', bx < 150 ? walkF(t) : 0, bx, 158, 1);
    particles(x, 'dust', t); overlay(x, 'warm');
  },
  rift(x, t, L) {
    rows(x, 'grass', 0, 6); x.fillStyle = 'rgba(10,12,30,.35)'; x.fillRect(0, 0, W, H);
    // the Rift: a dark wound in the air
    const rx = 200, ry = 80, pulse = 1 + Math.sin(t * 1.3) * .08;
    x.save(); x.translate(rx, ry); x.scale(pulse, pulse); const g = x.createRadialGradient(0, 0, 4, 0, 0, 46); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(.6, 'rgba(30,10,40,.85)'); g.addColorStop(1, 'rgba(60,20,80,0)'); x.fillStyle = g; x.beginPath(); x.ellipse(0, 0, 26, 50, .2, 0, 7); x.fill(); x.restore();
    const stitched = Math.min(1, t / 14);
    for (let i = 0; i < 9; i++) { const yy = ry - 40 + i * 10; if (i / 9 > stitched) break; x.strokeStyle = `rgba(255,154,160,${.5 + Math.sin(t * 3 + i) * .3})`; x.beginPath(); x.moveTo(rx - 22, yy); x.lineTo(rx + 22, yy + 6); x.stroke(); }
    x.strokeStyle = 'rgba(255,190,200,.7)'; x.beginPath(); x.moveTo(118, 120); for (let s = 0; s <= 10; s++) { const k = s / 10; x.lineTo(118 + (rx - 118) * k, 120 + (ry - 120) * k + Math.sin(t * 4 + k * 9) * 6); } x.stroke();
    for (const [a, b] of [[30, 150], [80, 170], [290, 160], [300, 60], [40, 70]]) { drawSprite(x, 'pillar3', a, b); }
    L.weaver.draw(x, 'spellcast', 'right', Math.floor(t * 5) % 7, 110, 140, 1);
    L.kudel.draw(x, 'walk', 'right', 0, 60, 120, 1);
    particles(x, 'fireflies', t); overlay(x, 'night');
  },
  steppe(x, t, L) {
    rows(x, 'dry', 0, 6);
    const edge = Math.min(W * .55, t * 9); const g = x.createLinearGradient(0, 0, edge + 50, 0); g.addColorStop(0, 'rgba(255,255,255,.97)'); g.addColorStop(Math.max(0, edge / (edge + 50) - .01), 'rgba(255,255,255,.85)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, edge + 50, H);
    for (let i = 0; i < 9; i++) { const run = Math.min(1, Math.max(0, (t - 4) / 8)); sheep(x, 110 + rnd(i, 21) * 120 + run * 90, 70 + rnd(i, 22) * 90, t, i); }
    drawSprite(x, 'deadbush', 70, 160); drawSprite(x, 'rockS1', 280, 70);
    L.senka.draw(x, 'walk', 'left', t > 4 && t < 9 ? 0 : 0, 150, 120, 1);
    if (t > 3 && t < 10) { x.fillStyle = 'rgba(255,255,255,.8)'; const k = (t * 2) % 1; x.beginPath(); x.arc(140 - k * 12, 92 - k * 6, 2 + k * 4, 0, 7); x.strokeStyle = `rgba(255,255,255,${1 - k})`; x.stroke(); }
    particles(x, 'dust', t); overlay(x, 'pale');
  },
  provody(x, t, L) {
    rows(x, 'grass', 0, 3); for (let tx = 0; tx < 11; tx++) tile(x, 'sand', tx, 3); rows(x, 'water', 4, 6); shimmer(x, 128, H, t, 'rgba(255,220,160,.2)');
    // birch-bark lights drifting away
    for (let i = 0; i < 12; i++) { const k = (t * .05 + rnd(i, 31)) % 1, px = 60 + k * 280, py = 140 + rnd(i, 32) * 36 + Math.sin(t + i) * 2; x.fillStyle = `rgba(255,200,110,${.9 * (1 - k)})`; x.fillRect(px, py, 3, 2); x.fillStyle = `rgba(255,200,110,${.25 * (1 - k)})`; x.fillRect(px - 2, py + 2, 7, 1); }
    L.v1.draw(x, 'walk', 'down', 0, 60, 96, 1); L.v2.draw(x, 'walk', 'down', 0, 250, 92, 1); L.v3.draw(x, 'walk', 'down', 0, 280, 100, 1);
    L.morven.draw(x, 'spellcast', 'down', t % 4 < 1 ? Math.floor((t % 4) * 7) : 6, 160, 118, 1);
    x.fillStyle = '#e8dcc0'; x.fillRect(157, 100, 7, 4);
    particles(x, 'fireflies', t); overlay(x, t > 18 ? 'warm' : 'night');
  },
};

// plays one dream in the modal. api: { modal, close, handlers(obj), look(spec), npcLook(id, over), sfx }
export function playDream(id, api, done) {
  const D = DREAMS[id]; if (!D) { if (done) done(); return; }
  const L = {
    agafya: api.npcLook('agafya', { hairColor: '#5a3a24' }),
    mitriy: api.look({ body: 'male', skin: '#d8b39a', hair: 'messy1', hairColor: '#6a4a2a', layers: [['ls2', '#5a6a7a'], ['pants', '#4a3a30'], ['boots', '#3a2a20']] }),
    iskra: api.npcLook('iskra', { body: 'teen' }),
    lesya: api.look({ body: 'teen', skin: '#e8c4a8', hair: 'bunches', hairColor: '#c84a1a', layers: [['tunic', '#8ab4d8'], ['leggings', '#5a6a8a']] }),
    ostap: api.look({ body: 'male', skin: '#c99a6e', hair: 'buzzcut', hairColor: '#4a3a2a', layers: [['chainmail', null, '#6d6a66'], ['tabard', '#5a3a2a'], ['pants', '#3b3f46'], ['boots', '#2a201a'], ['helm_kettle', null, '#6d6a66'], ['spear', '#5a3b22', '#9aa3ad']] }),
    soldier1: api.look({ body: 'male', skin: '#e0b090', hair: 'plain', hairColor: '#8a6a3a', layers: [['armor_leather', '#5a3a24'], ['pants', '#3b3f46'], ['boots', '#2a201a'], ['helm_nasal', null, '#7d7a76'], ['spear', '#5a3b22', '#9aa3ad']] }),
    soldier2: api.look({ body: 'male', skin: '#b88a5e', hair: 'buzzcut', hairColor: '#2a2a2a', layers: [['chainmail', null, '#6d6a66'], ['pants', '#4a3a30'], ['boots', '#2a201a'], ['helm_kettle', null, '#6d6a66'], ['spear', '#5a3b22', '#9aa3ad']] }),
    marfa: api.look({ body: 'female', skin: '#d8b39a', hair: 'braid', hairColor: '#b8b0a0', layers: [['blouse_ls', '#6a7a5a'], ['skirt', '#4a3a30'], ['apron_full', '#e8e2d4'], ['shoes', '#3a2a20']] }),
    prosha: api.look({ body: 'teen', skin: '#c99a6e', hair: 'bedhead', hairColor: '#3a2a20', layers: [['tshirt', '#4a4a4a'], ['pants', '#3a3a3a'], ['boots', '#2a2a2a']] }),
    weaver: api.look({ body: 'male', skin: '#d8c0a8', hair: 'long', hairColor: '#8a7a6a', layers: [['ls2', '#6a4a5a'], ['pants', '#3a2a3a'], ['cape', '#8a3a4a'], ['shoes', '#2a1a1a'], ['staff', '#5a3b22', '#ff9aa0']] }),
    kudel: api.npcLook('kudel'),
    senka: api.look({ body: 'teen', skin: '#d8a878', hair: 'messy1', hairColor: '#c8a050', layers: [['tunic', '#a89870'], ['pants', '#6a5a40'], ['sandals', '#5a4030'], ['bandana', '#8a2a2a']] }),
    morven: api.look({ body: 'male', skin: '#e0c8b0', hair: 'long', hairColor: '#2a2a3a', layers: [['ls2', '#4a3a6a'], ['cape', '#4a1f6a'], ['pants', '#2a2a3a'], ['shoes', '#1b1b1b']] }),
    v1: api.look({ body: 'female', skin: '#d8b39a', hair: 'long', hairColor: '#4a3020', layers: [['dress', '#6a5a7a'], ['shoes', '#3a2a20']] }),
    v2: api.look({ body: 'male', skin: '#c9a07a', hair: 'parted', hairColor: '#6a5a4a', layers: [['ls2', '#c8b89a'], ['pants', '#4a3a30'], ['boots', '#2a201a']] }),
    v3: api.look({ body: 'teen', skin: '#e0b090', hair: 'bob', hairColor: '#8a6a3a', layers: [['tunic', '#7a6a4a'], ['pants', '#4a3a30']] }),
  };
  let step = 0, alive = true, t0 = performance.now();
  const render = () => {
    const lines = D.lines.slice(0, step + 1).map((l, i) => `<p class="dline ${i === step ? 'new' : ''}">${l}</p>`).join('');
    const last = step >= D.lines.length;
    api.modal(`<div class="dream"><div class="dtitle"><b>${D.title}</b><small>чужое воспоминание · ${D.who}</small></div><canvas id="dreamCv" width="${W}" height="${H}"></canvas>
      <div class="dtext">${last ? D.lines.map((l) => `<p class="dline old">${l}</p>`).join('') + `<p class="dwake">${D.wake}</p><p class="aside">Пока ты помнишь этот Сон: ${D.gift}. Если отдать его Пряже, этот человек исчезнет навсегда.</p>` : lines}</div>
      <div class="row"><button class="btn ${last ? 'primary' : 'gold'}" data-a="${last ? 'wake' : 'next'}">${last ? 'Проснуться' : 'Дальше'}</button></div></div>`, () => { alive = false; if (done) done(); });
    api.handlers({ next: () => { step++; render(); }, wake: () => api.close() });
    const cv = document.getElementById('dreamCv'); if (!cv) return;
    const x = cv.getContext('2d'); x.imageSmoothingEnabled = false;
    const draw = () => {
      if (!alive || !cv.isConnected) return;
      const t = (performance.now() - t0) / 1000;
      x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, W, H);
      try { SCENES[D.scene](x, t, L); } catch (e) { x.fillStyle = '#111'; x.fillRect(0, 0, W, H); }
      // fade in from white
      if (t < 1.2) { x.fillStyle = `rgba(255,255,255,${1 - t / 1.2})`; x.fillRect(0, 0, W, H); }
      requestAnimationFrame(draw);
    };
    draw();
  };
  if (api.sfx) api.sfx();
  render();
}
