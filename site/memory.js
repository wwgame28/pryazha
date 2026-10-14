// Memory: Отголоски (echoes), memory cards, Ясность, Забвение (sacrifice for gifts), enemy imprints and the Летопись.
const rand = Math.random;
export const DAY = 480;
export const dayOf = (G) => Math.floor((G.time || 0) / DAY);

export function initMemory(G) {
  G.memory = G.memory || { cards: [], sacrificed: [], heroKnows: {}, npcKnows: {}, dreams: [], name: null, gifts: {}, lostSkills: [], foreign: [], lastSnap: -1 };
  G.echoes = G.echoes || 0; G.imprints = G.imprints || []; G.flags = G.flags || {};
  return G.memory;
}
// ---------- cards ----------
export const CARD_TYPES = {
  region: { name: 'Край', icon: '⛰', color: '#8ec07c' }, quest: { name: 'История', icon: '✎', color: '#e8c85a' }, bond: { name: 'Связь', icon: '❦', color: '#ff9aa0' },
  skill: { name: 'Навык', icon: '✦', color: '#c8b6ff' }, craft: { name: 'Ремесло', icon: '⚒', color: '#d6a46a' }, dream: { name: 'Сон', icon: '☾', color: '#9ab8ff' },
  foreign: { name: 'Чужая', icon: '◈', color: '#b9a8d8' }, shared: { name: 'Общая', icon: '∞', color: '#7fe0c0' }, name: { name: 'Имя', icon: '✧', color: '#ffffff' },
};
export function addCard(G, c) {
  const M = initMemory(G);
  if (M.cards.some((x) => x.id === c.id) || M.sacrificed.some((x) => x.id === c.id)) return null;
  const card = { weight: 1, links: {}, journal: [], sacrificable: true, gainedDay: dayOf(G), ...c };
  M.cards.push(card);
  return card;
}
export const hasCard = (G, id) => !!(G.memory && G.memory.cards.some((c) => c.id === id));
export function removeCard(G, id) { const M = initMemory(G); const i = M.cards.findIndex((c) => c.id === id); if (i < 0) return null; const [c] = M.cards.splice(i, 1); return c; }
// skill cards are derived from the tree: every learned active skill is a memory
export function skillCards(G, nodeOf) {
  const out = [];
  for (const [id, r] of Object.entries(G.tree || {})) { const n = nodeOf(G.cls, id); if (!n || !r || n.kind !== 'active') continue; out.push({ id: 'sk_' + id, type: 'skill', title: n.name, weight: 3 + r, links: { skill: id }, journal: [`Руки помнят: ${n.name.toLowerCase()}.`], sacrificable: true, derived: true }); }
  return out;
}
export function allCards(G, nodeOf) { const M = initMemory(G); return [...M.cards, ...skillCards(G, nodeOf)]; }
export function clarity(G, nodeOf) { return allCards(G, nodeOf).reduce((s, c) => s + (c.weight || 0), 0); }
export function clarityState(v) {
  if (v < 8) return { id: 'hollow', name: 'Порожний', mods: [{ stat: 'dmg%', value: .2 }], desc: '+20 % урона. Люди смотрят сквозь тебя.' };
  if (v < 20) return { id: 'holey', name: 'Дырявый', mods: [{ stat: 'dmg%', value: .1 }], desc: '+10 % урона. Часть слов теряется.' };
  if (v < 40) return { id: 'whole', name: 'Цельный', mods: [], desc: 'Ты помнишь достаточно, чтобы быть собой.' };
  return { id: 'full', name: 'Полный', mods: [{ stat: 'dmg%', value: -.1 }], desc: '−10 % урона: тяжело нести. Зато открываются новые слова в разговорах.' };
}
// ---------- echoes ----------
export const echoCap = (G) => 100 + 10 * G.lvl + (G.cls === 'cryo' ? 100 : 0);
export function tickEchoes(G, dt) {
  const cap = echoCap(G);
  if (G.echoes > cap && G.cls !== 'cryo') { G.echoFade = (G.echoFade || 0) + dt; if (G.echoFade >= 30) { G.echoFade = 0; G.echoes -= 1; return true; } }
  return false;
}
export function echoesFor(e, night) {
  const E = e.E; let n = E.boss ? 25 : ['shaman', 'necro', 'witch', 'cultist'].includes(e.type) ? 3 : 1;
  if (night && ['skeleton', 'archer', 'zombie', 'lich', 'wraith', 'necro'].includes(e.type)) n *= 1.5;
  return n;
}
// ---------- gifts of oblivion ----------
export const GIFTS = {
  sold: { name: 'Продано Архиву', from: '*', per: [], cap: 0, hidden: true, desc: () => 'серебро вместо дара' },
  ember: { name: 'Жар', from: '*', per: [{ stat: 'fire%', value: .03 }], cap: .6, desc: (p) => `+${Math.round(p * 3)} % урона огнём` },
  rime: { name: 'Иней в жилах', from: '*', per: [{ stat: 'ice%', value: .03 }, { stat: 'freezeDur', value: .01 }], cap: .6, desc: (p) => `+${Math.round(p * 3)} % урона льдом` },
  other_shadow: { name: 'Чужая тень', from: ['bond', 'foreign', 'shared'], per: [{ stat: 'lifesteal', value: .02 }], cap: .3, desc: (p) => `+${Math.round(p * 2)} % похищения жизни` },
  nameless_light: { name: 'Свет без имени', from: '*', per: [{ stat: 'holy%', value: .04 }, { stat: 'healPower%', value: .04 }], cap: .8, desc: (p) => `+${Math.round(p * 4)} % лечения и урона светом` },
  firm_hand: { name: 'Твёрдая рука', from: ['skill', 'quest'], per: [{ stat: 'dmg%', value: .02 }, { stat: 'atkSpeed%', value: .01 }], cap: .5, desc: (p) => `+${Math.round(p * 2)} % урона, +${Math.round(p)} % скорости атаки` },
  light_step: { name: 'Лёгкий шаг', from: ['region'], per: [{ stat: 'speed%', value: .02 }], cap: .3, desc: (p) => `+${Math.round(p * 2)} % к скорости бега` },
  void_skin: { name: 'Шкура пустоты', from: '*', per: [{ stat: 'armor', value: 2 }], cap: 40, desc: (p) => `+${Math.round(p * 2)} к броне` },
  empty_cup: { name: 'Пустая чаша', from: ['bond', 'quest', 'craft'], per: [{ stat: 'mp', value: 4 }], cap: 120, desc: (p) => `+${Math.round(p * 4)} к мане` },
  strong_thread: { name: 'Крепкая нить', from: '*', per: [{ stat: 'hp', value: 5 }], cap: 200, desc: (p) => `+${Math.round(p * 5)} к здоровью` },
  nonbeing: { name: 'Чутьё Небыли', from: ['region'], per: [{ stat: 'imprint%', value: .03 }], cap: .4, desc: (p) => `+${Math.round(p * 3)} % к шансу Отпечатка` },
  hunger: { name: 'Голод Пряжи', from: ['quest', 'dream', 'craft'], per: [{ stat: 'echoFind%', value: .04 }], cap: .8, desc: (p) => `+${Math.round(p * 4)} % Отголосков с врагов` },
  keyword: { name: 'Слово-ключ', from: ['dream', 'name', 'shared'], minPower: 5, once: true, skill: true, desc: () => 'новый навык-узел, которого нет ни у одного класса' },
  ash_crown: { name: 'Пепельная корона', from: ['name'], once: true, per: [{ stat: 'dmg%', value: .25 }], flat: true, desc: () => '+25 % ко всему урону. Тебя больше никто не позовёт по имени.' },
};
export function offers(G, card, reroll = 0) {
  const M = initMemory(G), pool = Object.entries(GIFTS).filter(([id, g]) => !g.hidden && (g.from === '*' || g.from.includes(card.type)) && !(g.once && M.gifts[id]) && !(g.minPower && card.weight < g.minPower));
  // seeded by card + reroll so the offer is stable until rerolled
  let h = 2166136261; for (const ch of card.id + ':' + reroll) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const R = () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
  const pick = []; const p = [...pool];
  const special = p.findIndex(([id]) => id === 'keyword' || id === 'ash_crown'); if (special >= 0) pick.push(p.splice(special, 1)[0]);
  while (pick.length < 3 && p.length) pick.push(p.splice(Math.floor(R() * p.length), 1)[0]);
  return pick.map(([id, g]) => ({ id, ...g }));
}
export function giftMods(G) {
  const M = initMemory(G), out = [];
  for (const [id, pw] of Object.entries(M.gifts)) {
    const g = GIFTS[id]; if (!g || !g.per) continue;
    for (const m of g.per) { const v = g.flat ? m.value : Math.min(g.cap, m.value * pw * (g.cap > 1 ? 1 : 1)); out.push({ stat: m.stat, value: g.flat ? v : Math.sign(m.value) * Math.min(Math.abs(g.cap), Math.abs(m.value * pw)) }); }
  }
  return out;
}
export const POWER_MUL = (G, card, snap) => (card.weight || 1) * ((G.cls === 'warrior' || G.cls === 'ranger') && card.type === 'skill' ? 1.25 : 1) * (snap ? .5 : 1);
// what will be lost: human-readable consequences
export function consequences(G, card, names) {
  const L = [];
  switch (card.type) {
    case 'region': L.push(`Край «${card.title}» снова уйдёт в туман, метки с карты пропадут.`); break;
    case 'bond': L.push(`Ты перестанешь узнавать ${names(card.links.npc)}. Он${'(а)'} будет помнить тебя.`); L.push('Его поручения и скидки, если они в процессе, сломаются.'); break;
    case 'quest': L.push(`В Летописи сотрутся строки истории «${card.title}».`); L.push('Мир помнит, что ты сделал. Ты — нет.'); break;
    case 'skill': L.push(`Навык «${card.title}» исчезнет навсегда вместе с рангами. Переучить его нельзя.`); break;
    case 'dream': L.push(`Тот, кем был этот Сон, исчезнет окончательно.`); L.push('Те, кто его помнил, потеряют слова о нём.'); break;
    case 'craft': L.push('Цены у торговцев вырастут на четверть.'); break;
    case 'foreign': L.push('Хозяин памяти почувствует холодок.'); break;
    case 'shared': L.push('Эту память вы делили на двоих. Второй тоже её потеряет.'); break;
    case 'name': L.push('Тебя больше никто не позовёт по имени. Летопись подпишется: «никто».'); break;
  }
  if (card.journal && card.journal.length) L.push(`Строк Летописи сотрётся: ${card.journal.length}.`);
  return L;
}
// sacrifice: returns the gift actually granted
export function sacrifice(G, card, giftId, { snap = false, onSkill, onRegion, onBond } = {}) {
  const M = initMemory(G), g = GIFTS[giftId];
  const power = POWER_MUL(G, card, snap);
  if (g.skill) M.keyskills = [...(M.keyskills || []), ['cut_thread', 'foreign_gait', 'nameless_cry'].find((k) => !(M.keyskills || []).includes(k)) || 'cut_thread'];
  M.gifts[giftId] = (M.gifts[giftId] || 0) + power;
  if (card.derived) { if (onSkill) onSkill(card.links.skill); M.lostSkills.push(card.links.skill); }
  else removeCard(G, card.id);
  M.sacrificed.push({ id: card.id, type: card.type, title: card.title, weight: card.weight, gift: giftId, day: dayOf(G), journal: card.journal || [], links: card.links });
  if (card.type === 'bond' && card.links.npc) { M.heroKnows[card.links.npc] = 0; if (onBond) onBond(card.links.npc); }
  if (card.type === 'region' && onRegion) onRegion(card.links.region);
  if (card.type === 'quest' && card.links.quest) G.flags['hero_remembers_' + card.links.quest] = false;
  if (card.type === 'name') M.name = null, M.nameLost = true;
  if (card.type === 'dream') M.dreams = M.dreams.filter((d) => d !== card.links.dream);
  if (card.type === 'craft') G.flags.priceUp = (G.flags.priceUp || 0) + .25;
  if (snap) M.lastSnap = dayOf(G);
  return { gift: g, power };
}
// ---------- imprints: memory of slain enemies ----------
export const IMPRINTS = {
  goblin: { name: 'Донашивать', desc: '10 % шанс при ударе выбить 1–3 золота', hooks: [{ hook: 'onHit', effect: { type: 'gold', chance: .1, min: 1, max: 3 } }] },
  shaman: { name: 'Колыбельная', desc: 'Тихое восстановление здоровья вне боя', mods: [{ stat: 'regen', value: 1.5 }] },
  wolf: { name: 'Ночная стая', desc: 'Ночью +20 % скорости и +10 % урона', night: [{ stat: 'speed%', value: .2 }, { stat: 'dmg%', value: .1 }] },
  bandit: { name: 'Безродный', desc: '+5 % шанса крита', mods: [{ stat: 'crit', value: .05 }] },
  troll: { name: 'Каменная память', desc: 'Раз в минуту каменная кожа гасит удар', hooks: [{ hook: 'onHurt', icd: 60, effect: { type: 'shield', value: .12, dur: 3 } }] },
  skeleton: { name: 'Пост', desc: 'Раз в 10 минут встать после смерти с четвертью здоровья', hooks: [{ hook: 'onDeath', icd: 600, effect: [{ type: 'heal', value: .25 }, { type: 'buff', kind: 'invulnerable', dur: 1 }] }] },
  archer: { name: 'Последний выстрел', desc: 'Каждая пятая атака прошивает насквозь', hooks: [{ hook: 'onCast', counter: 5, effect: { type: 'pierce', count: 3 } }] },
  zombie: { name: 'Надо домой', desc: '−30 % замедлений, убийства лечат', mods: [{ stat: 'slowResist', value: .3 }], hooks: [{ hook: 'onKill', effect: { type: 'heal', value: .02 } }] },
  necro: { name: 'Одолжить кости', desc: 'Раз в 20 с убитый встаёт на твою сторону', hooks: [{ hook: 'onKill', icd: 20, effect: { type: 'summon', unit: 'skeleton', at: 'hit', life: 15, ignoreMax: true, dmg: .4 } }] },
  cultist: { name: 'Подбросить в огонь', desc: '+10 % урона огнём', mods: [{ stat: 'fire%', value: .1 }] },
  witch: { name: 'Мгновение', desc: 'При смертельной опасности застываешь во льду', hooks: [{ hook: 'lowHp', threshold: .3, icd: 45, effect: { type: 'freeze', at: 'self', dur: 1.5 } }] },
  minotaur: { name: 'Круг вины', desc: 'Удары иногда оглушают', hooks: [{ hook: 'onHit', effect: { type: 'stun', dur: .8, chance: .06 } }] },
  lich: { name: 'Двести имён', desc: 'Каждая упокоенная нежить роняет Отголосок', hooks: [{ hook: 'onKill', cond: 'target:undead', effect: { type: 'dropEcho', count: 1 } }] },
};
export const imprintChance = (e, cls, bonus = 0) => (e.E.boss ? 1 : ['shaman', 'necro', 'witch', 'cultist'].includes(e.type) ? .1 : .04) * (cls === 'necro' ? 2 : 1) * (1 + bonus);
export const imprintSlots = (G) => (G.lvl >= 6 ? 2 : 1) + (G.memory && G.memory.dreams.includes('shepherd') ? 1 : 0);
export function offerImprint(G, type) {
  if (!IMPRINTS[type]) return null;
  const list = G.imprints, same = list.find((i) => i.enemy === type);
  if (same) { same.expiresDay = dayOf(G) + 3; return { refreshed: same }; }
  const slots = imprintSlots(G);
  const imp = { enemy: type, fixed: false, expiresDay: dayOf(G) + 3 };
  if (list.length >= slots) { const loose = list.findIndex((i) => !i.fixed); if (loose < 0) return { full: true }; list.splice(loose, 1); }
  list.push(imp); return { added: imp };
}
export function tickImprints(G) { const d = dayOf(G); const before = G.imprints.length; G.imprints = G.imprints.filter((i) => i.fixed || i.expiresDay > d); return before - G.imprints.length; }
export function imprintMods(G, night) { const out = []; for (const i of G.imprints) { const I = IMPRINTS[i.enemy]; if (!I) continue; if (I.mods) out.push(...I.mods); if (night && I.night) out.push(...I.night); } return out; }
export function imprintHooks(G) { const out = []; for (const i of G.imprints) { const I = IMPRINTS[i.enemy]; if (I && I.hooks) for (const h of I.hooks) out.push({ ...h, src: 'imp:' + i.enemy, rank: 1 }); } return out; }
// ---------- Летопись ----------
export function journal(G, nodeOf) {
  const M = initMemory(G), rows = [];
  for (const c of allCards(G, nodeOf)) for (const l of c.journal || []) rows.push({ text: l, card: c, day: c.gainedDay || 0 });
  for (const s of M.sacrificed) for (const l of s.journal || []) rows.push({ erased: true, len: l.length, card: s, day: s.day, foreign: (s.foreignNotes || []) });
  return rows.sort((a, b) => (a.day - b.day));
}
