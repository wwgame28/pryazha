// Repeatable journeys, contracts and the shared album.  This module intentionally has no DOM,
// browser storage, clocks, timers, or random global state.  The host owns saving and rewards.
import { ENEMIES } from './data.js';

const JOURNEY_VERSION = 1;
const META_VERSION = 1;
const CYCLE_DIFFICULTY_CAP = 4;
const DUPLICATE_TALE_GOLD = 3;

const TALES = [
  { id: 'tale_alders', title: 'Ольховая кора', text: 'Весной кора на старой ольхе треснула, и из щели выпала записка: «Не зови меня по имени у воды». Рыбак прочёл её вслух — и всю неделю слышал, как река отвечает чужим голосом.' },
  { id: 'tale_salt_road', title: 'Соль на дороге', text: 'Возчик просыпал мешок соли на северной дороге. К утру каждая крупинка стала маленьким огоньком, и путники дошли до дома без фонарей. На третью ночь огоньки ушли к болоту.' },
  { id: 'tale_red_mitten', title: 'Красная рукавица', text: 'Девочка потеряла у брода красную рукавицу. Её нашёл волколак, носил всю зиму на хвосте и не тронул ни одной овцы: боялся, что хозяйка придёт за вещью.' },
  { id: 'tale_birch_bell', title: 'Берёзовый колокольчик', text: 'На сухой берёзе висел колокольчик без языка. Он звонил только тогда, когда кто-то проходил мимо и вспоминал дорогу, которой больше нет.' },
  { id: 'tale_snow_spoons', title: 'Ложки из снега', text: 'У Инея были семь снежных ложек. Кашу ими не съешь, зато каждая вычерпывала из сердца ровно одно лишнее слово. Восьмую ложку она так и не вырезала.' },
  { id: 'tale_mill_shadow', title: 'Тень мельницы', text: 'Старая мельница давно стояла без колеса, но её тень по вечерам всё равно молола тьму. Мельник собирал эту муку в мешки и подсыпал детям в страшные сказки, чтобы те заканчивались раньше.' },
  { id: 'tale_wolf_path', title: 'Волчья тропа', text: 'Охотник нашёл следы, которые шли от его дома в лес и обратно. Наутро волчица привела к порогу трёх щенков: оказалось, это он всю ночь ходил во сне и учил их не бояться людей.' },
  { id: 'tale_empty_cradle', title: 'Пустая колыбель', text: 'В заброшенной избе качалась пустая колыбель. Никто не смел её трогать, пока старуха не положила внутрь яблоко. К утру яблоко стало тёплым, а колыбель перестала скрипеть.' },
  { id: 'tale_coal_sparrow', title: 'Угольный воробей', text: 'После пожара на площади поселился воробей, чёрный как уголь. Он воровал только пуговицы и складывал их у печной трубы, будто чинил небо над Бродом.' },
  { id: 'tale_quiet_mine', title: 'Тихая штольня', text: 'В шахте есть поворот, где нельзя свистеть. Старики говорят, камень там повторяет свист через год — ровно в тот миг, когда путник уже забыл, что был один.' },
  { id: 'tale_ash_lantern', title: 'Фонарь из пепла', text: 'Парень сделал фонарь из стекла и холодного пепла. Он светил не вперёд, а назад: каждый видел на снегу следы тех, кому когда-то не сказал «останься».' },
  { id: 'tale_river_thread', title: 'Речная нить', text: 'По весне в реке появляется красная нить. Дети ловят её палками, а Агафья велит не трогать: нить ищет не руку, а место, где мир разошёлся по шву.' },
  { id: 'tale_lost_key', title: 'Ключ без двери', text: 'Ключ нашли в мху у менгира. Он открывал любую дверь, если за ней никого не ждали. Потому ключ оставили во мху: слишком много дверей стали бы одинокими.' },
  { id: 'tale_northern_window', title: 'Северное окно', text: 'В Башне есть окно на север, хотя стена там глухая. Если долго смотреть в камень, можно увидеть свой дом в вечернем свете — но войти в него уже нельзя.' },
  { id: 'tale_last_boat', title: 'Последняя лодка', text: 'Лодочник перевозил через реку тех, кто не умел прощаться. Однажды он перевёз самого себя и с тех пор берёт плату только историями, которые ещё можно рассказать.' },
];

const ACHIEVEMENTS = [
  { id: 'a_first_blood', title: 'Первый след', desc: 'Победить первого врага.', goal: 1, metric: 'kills' },
  { id: 'a_warm_hearth', title: 'Тёплый огонь', desc: 'Отдохнуть у костра.', goal: 1, metric: 'rests' },
  { id: 'a_open_road', title: 'Дорога помнит', desc: 'Побывать в трёх разных названных местах.', goal: 3, metric: 'visits' },
  { id: 'a_steady_hand', title: 'Верная рука', desc: 'Трижды парировать удар.', goal: 3, metric: 'parries' },
  { id: 'a_helping_thread', title: 'Помочь по пути', desc: 'Завершить две сюжетные или обычные задачи.', goal: 2, metric: 'quests' },
  { id: 'a_hunter_north', title: 'Северный охотник', desc: 'Победить двадцать пять врагов.', goal: 25, metric: 'kills' },
  { id: 'a_board_keeper', title: 'Держать слово', desc: 'Забрать награду за три поручения.', goal: 3, metric: 'claims' },
  { id: 'a_chronicler', title: 'Собиратель сказок', desc: 'Открыть шесть северных историй.', goal: 6, metric: 'tales' },
  { id: 'a_many_paths', title: 'Много дорог', desc: 'Найти шесть разных названных мест.', goal: 6, metric: 'visits' },
];

// All locations below are valid game.js locPos identifiers. Chapter one only uses the
// first three locations, all on the opening map and reachable without class abilities.
const LOCATIONS = [
  { id: 'ford', name: 'Ольховый Брод', chapter: 1, desc: 'у воды, где начинается путь' },
  { id: 'village_well', name: 'Колодец на площади', chapter: 1, desc: 'на площади Ольхового Брода' },
  { id: 'tavern', name: '«Последняя кружка»', chapter: 1, desc: 'у таверны в Броде' },
  { id: 'ashes', name: 'Пепелище за рекой', chapter: 2, desc: 'за бродом, у чёрных камней' },
  { id: 'oldgrave', name: 'Тихая Сторона', chapter: 2, desc: 'у старого погоста' },
  { id: 'ruins', name: 'Руины Перевязчиков', chapter: 3, desc: 'среди старых стен' },
  { id: 'tower', name: 'Башня Неусыпных', chapter: 3, desc: 'у холодной башни' },
  { id: 'camp', name: 'Стан Пепельного Круга', chapter: 4, desc: 'у походных огней' },
  { id: 'witchhut', name: 'Изба Тётки Иней', chapter: 4, desc: 'у снежной избы' },
  { id: 'hamlet_dry', name: 'Сухой Лог', chapter: 5, desc: 'в южном посёлке' },
  { id: 'menhir', name: 'Менгир у Прорехи', chapter: 5, desc: 'у каменного круга' },
];

// These fire IDs come from Overworld.restFires(). A rest contract asks for one sincere
// stop, never for a daily streak or repeated rests at the same spot.
const RESTS = [
  { id: 'brod', name: 'Костёр у избы Агафьи', chapter: 1, destination: 'ford' },
  { id: 'north', name: 'Костёр на Северной тропе', chapter: 2, destination: 'trollcamp' },
  { id: 'grave', name: 'Костёр у Тихой Стороны', chapter: 2, destination: 'oldgrave' },
  { id: 'ruins', name: 'Костёр у руин', chapter: 3, destination: 'ruins' },
  { id: 'tower', name: 'Костёр под Башней', chapter: 3, destination: 'tower' },
  { id: 'dry', name: 'Костёр у Сухого Лога', chapter: 4, destination: 'hamlet_dry' },
];

const HUNTS = [
  { id: 'goblin', chapter: 1 },
  { id: 'wolf', chapter: 1 },
  { id: 'bandit', chapter: 1 },
  { id: 'skeleton', chapter: 2 },
  { id: 'zombie', chapter: 2 },
  { id: 'shaman', chapter: 2 },
  { id: 'cultist', chapter: 3 },
  { id: 'witch', chapter: 3 },
  { id: 'wraith', chapter: 4 },
  { id: 'arachne', chapter: 4 },
  { id: 'golem', chapter: 5 },
  { id: 'big_worm', chapter: 5 },
].filter((entry) => ENEMIES[entry.id]);

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const copy = (value) => JSON.parse(JSON.stringify(value));
const int = (value, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.floor(n))) : fallback;
};
const keyCount = (object) => Object.keys(object || {}).length;
const chapterOf = (G) => Math.max(1, Math.min(6, int(G && G.ws && G.ws.chapter, int(G && G.chapter, 1, 1, 6), 1, 6)));

/** Converts a human-entered string/number seed into an unsigned 32-bit state. */
export function seedNumber(seed) {
  const text = String(seed ?? 'alderford');
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return (hash >>> 0) || 0x6d2b79f5;
}

/** Mulberry-style deterministic generator; use G.journeySeed before initJourney to set it manually. */
export function seeded(seed) {
  let state = seedNumber(seed);
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (items, random) => items[Math.min(items.length - 1, Math.floor(random() * items.length))];
const availableAt = (items, chapter) => items.filter((item) => item.chapter <= chapter);
const labelEnemy = (id) => (ENEMIES[id] && ENEMIES[id].name) || id;
const normalizeSeed = (G, meta, prior) => {
  const candidate = G && (G.journeySeed ?? prior ?? G.seed);
  if (typeof candidate === 'string' || typeof candidate === 'number') return String(candidate);
  return 'alderford';
};

function baseJourney(G, meta) {
  if (!isRecord(G)) throw new TypeError('initJourney requires a save object G');
  const newJourney = !isRecord(G.journey);
  const source = isRecord(G.journey) ? G.journey : {};
  const journey = source;
  journey.v = JOURNEY_VERSION;
  journey.seed = normalizeSeed(G, meta, journey.seed);
  journey.board = isRecord(journey.board) ? journey.board : {};
  journey.board.cycle = int(journey.board.cycle, 0, 0);
  journey.board.offers = Array.isArray(journey.board.offers) ? journey.board.offers : [];
  journey.collections = isRecord(journey.collections) ? journey.collections : {};
  journey.achievements = isRecord(journey.achievements) ? journey.achievements : {};
  journey.events = isRecord(journey.events) ? journey.events : {};
  for (const metric of ['kills', 'rests', 'parries', 'quests', 'claims']) journey.events[metric] = int(journey.events[metric], 0, 0);
  journey.events.visited = isRecord(journey.events.visited) ? journey.events.visited : {};
  G.journey = journey;
  // A new save counts as one run only when a shared album object is supplied.
  if (newJourney && isRecord(meta)) metaObject(meta).runs += 1;
  return journey;
}

function metaObject(meta) {
  const M = isRecord(meta) ? meta : {};
  M.version = META_VERSION;
  delete M.v;
  // Upgrade the early object form without losing any album entries.
  const ends = Array.isArray(M.endings) ? M.endings : isRecord(M.endings) ? Object.values(M.endings) : [];
  M.endings = [...new Map(ends.filter(e=>isRecord(e)&&typeof e.id==='string').map(e=>[e.id,e])).values()];
  const oldCollections = M.collectibles || M.collections || [];
  M.collectibles = [...new Set(Array.isArray(oldCollections) ? oldCollections.filter(id => TALES.some(t=>t.id===id)) : isRecord(oldCollections) ? Object.keys(oldCollections).filter(id=>TALES.some(t=>t.id===id)) : [])];
  delete M.collections;
  M.achievements = [...new Set(Array.isArray(M.achievements) ? M.achievements.filter(id=>ACHIEVEMENTS.some(a=>a.id===id)) : isRecord(M.achievements) ? Object.keys(M.achievements) : [])];
  M.runs = int(M.runs, 0, 0);
  delete M.journeySeed;
  return M;
}

function carryAlbumFromMeta(journey, meta) {
  if (!isRecord(meta)) return;
  const M = metaObject(meta);
  for (const id of M.collectibles) if (TALES.some((tale) => tale.id === id) && !journey.collections[id]) journey.collections[id] = { id, carried: true };
  for (const id of M.achievements) if (ACHIEVEMENTS.some((achievement) => achievement.id === id) && !journey.achievements[id]) journey.achievements[id] = { id, carried: true };
}

function difficulty(cycle) { return Math.min(CYCLE_DIFFICULTY_CAP, Math.floor(int(cycle, 0, 0) / 2)); }

function rewardFor(kind, count, cycle) {
  const tier = difficulty(cycle);
  const byKind = {
    hunt: { gold: 8 + count * 4 + tier * 2, echoes: 1 + Math.floor(tier / 2), xp: 8 + count * 5 + tier * 3 },
    visit: { gold: 12 + tier * 3, echoes: 1 + Math.floor(tier / 2), xp: 14 + tier * 4 },
    rest: { gold: 8 + tier * 2, echoes: 1 + Math.floor(tier / 2), xp: 10 + tier * 3 },
  }[kind] || { gold: 0, echoes: 0, xp: 0 };
  // Explicit caps keep a long-lived board rewarding, not mandatory or runaway.
  return { gold: Math.min(48, byKind.gold), echoes: Math.min(3, byKind.echoes), xp: Math.min(60, byKind.xp) };
}

function makeOffer(journey, chapter, random, kind) {
  const cycle = journey.board.cycle;
  if (kind === 'hunt') {
    const enemy = pick(availableAt(HUNTS, chapter), random);
    const count = Math.min(8, 3 + difficulty(cycle) + (random() < 0.45 ? 0 : 1));
    return {
      id: `j${seedNumber(journey.seed).toString(36)}-${cycle}-hunt-${enemy.id}`,
      title: `Следы: ${labelEnemy(enemy.id)}`,
      desc: `Победи врагов типа «${labelEnemy(enemy.id)}»: ${count}.`,
      kind: 'hunt', target: enemy.id, count, progress: 0, status: 'offered', seen: {}, reward: rewardFor('hunt', count, cycle), chapter,
    };
  }
  if (kind === 'visit') {
    const location = pick(availableAt(LOCATIONS, chapter), random);
    return {
      id: `j${seedNumber(journey.seed).toString(36)}-${cycle}-visit-${location.id}`,
      title: `Дойти до «${location.name}»`,
      desc: `Зайди ${location.desc}. Дорога не обязана быть опасной, чтобы быть настоящей.`,
      kind: 'visit', target: location.id, destination: location.id, count: 1, progress: 0, status: 'offered', seen: {}, reward: rewardFor('visit', 1, cycle), chapter,
    };
  }
  const fire = pick(availableAt(RESTS, chapter), random);
  return {
    id: `j${seedNumber(journey.seed).toString(36)}-${cycle}-rest-${fire.id}`,
    title: `Беречь огонь`,
    desc: `Передохни у костра: ${fire.name}. Никакой спешки — один честный привал.`,
    kind: 'rest', target: fire.id, destination: fire.destination, count: 1, progress: 0, status: 'offered', seen: {}, reward: rewardFor('rest', 1, cycle), chapter,
  };
}

function offerShape(offer) {
  if (!isRecord(offer) || typeof offer.id !== 'string' || !['hunt', 'visit', 'rest'].includes(offer.kind) || typeof offer.target !== 'string') return false;
  offer.count = int(offer.count, 1, 1, 8);
  offer.progress = int(offer.progress, 0, 0, offer.count);
  offer.status = offer.status === 'open' ? 'offered' : ['offered', 'active', 'ready', 'claimed', 'abandoned'].includes(offer.status) ? offer.status : 'offered';
  offer.seen = isRecord(offer.seen) ? offer.seen : {};
  offer.reward = isRecord(offer.reward) ? {
    gold: int(offer.reward.gold, 0, 0, 48),
    echoes: int(offer.reward.echoes, 0, 0, 3),
    xp: int(offer.reward.xp, 0, 0, 60),
  } : rewardFor(offer.kind, offer.count, 0);
  return true;
}

function ensureBoard(G, meta) {
  const journey = baseJourney(G, meta);
  carryAlbumFromMeta(journey, meta);
  const valid = journey.board.offers.length === 3 && journey.board.offers.every(offerShape) && new Set(journey.board.offers.map((offer) => offer.kind)).size === 3;
  if (!valid) {
    const chapter = chapterOf(G);
    const random = seeded(`${journey.seed}|${journey.board.cycle}|${chapter}`);
    journey.board.offers = ['hunt', 'visit', 'rest'].map((kind) => makeOffer(journey, chapter, random, kind));
  }
  return journey;
}

function publicOffer(offer) {
  const out = {
    id: offer.id, title: offer.title, desc: offer.desc, kind: offer.kind, target: offer.target,
    count: offer.count, progress: offer.progress, status: offer.status,
    reward: { gold: offer.reward.gold, echoes: offer.reward.echoes, xp: offer.reward.xp },
  };
  if (offer.destination) out.destination = offer.destination;
  return out;
}

function activeOffer(journey, id) { return journey.board.offers.find((offer) => offer.id === id); }
function taleFor(journey, offer) { return TALES[seedNumber(`${journey.seed}|${offer.id}|tale`) % TALES.length]; }
function rewardCopy(reward) { return { gold: int(reward.gold, 0, 0, 48), echoes: int(reward.echoes, 0, 0, 3), xp: int(reward.xp, 0, 0, 60) }; }

function achievementMetric(journey, achievement) {
  if (achievement.metric === 'tales') return keyCount(journey.collections);
  if (achievement.metric === 'visits') return keyCount(journey.events.visited);
  return int(journey.events[achievement.metric], 0, 0);
}

function unlockAchievements(journey) {
  const unlocked = [];
  for (const achievement of ACHIEVEMENTS) {
    if (!journey.achievements[achievement.id] && achievementMetric(journey, achievement) >= achievement.goal) {
      journey.achievements[achievement.id] = { id: achievement.id };
      unlocked.push(copy(achievement));
    }
  }
  return unlocked;
}

/** Initialize/recover local journey state. Meta album entries are imported as already known. */
export function initJourney(G, meta) {
  const journey = ensureBoard(G, meta);
  unlockAchievements(journey);
  return journey;
}

/** Immutable JSON-safe catalogue for the album UI. */
export function catalog() {
  return copy({
    collectibles: TALES.map(({ id, title, text }) => ({ id, title, text })),
    achievements: ACHIEVEMENTS.map(({ id, title, desc }) => ({ id, title, desc })),
  });
}

/** Return exactly three deterministic current-board offers: hunt, peaceful visit, and rest. */
export function contracts(G) {
  const journey = initJourney(G);
  return journey.board.offers.map(publicOffer);
}

export function acceptContract(G, id) {
  const journey = initJourney(G);
  const offer = activeOffer(journey, id);
  if (!offer) return { ok: false, error: 'unknown_contract' };
  if (offer.status === 'claimed') return { ok: false, error: 'already_claimed' };
  if (offer.status === 'abandoned') return { ok: false, error: 'abandoned_contract' };
  if (offer.status === 'ready') return { ok: false, error: 'ready_to_claim' };
  if (offer.status === 'active') return { ok: false, error: 'already_accepted' };
  offer.status = 'active';
  return { ok: true, contract: publicOffer(offer) };
}

export function abandonContract(G, id) {
  const journey = initJourney(G);
  const offer = activeOffer(journey, id);
  if (!offer) return { ok: false, error: 'unknown_contract' };
  if (offer.status !== 'active') return { ok: false, error: 'not_active' };
  offer.status = 'abandoned';
  return { ok: true, contract: publicOffer(offer) };
}

/**
 * Observe a single real game event. For visit/rest, the same target can only advance a
 * given active contract once. Kill amount defaults to one death and is capped by the goal.
 */
export function recordEvent(G, event) {
  if (!isRecord(event) || !['kill', 'visit', 'rest', 'parry', 'quest'].includes(event.kind)) return { ok: false, error: 'invalid_event' };
  const journey = initJourney(G);
  const target = typeof event.target === 'string' ? event.target : '';
  const amount = int(event.count, 1, 1, 99);
  const changed = [], completed = [];

  if (event.kind === 'kill') journey.events.kills += amount;
  if (event.kind === 'rest') journey.events.rests += 1;
  if (event.kind === 'parry') journey.events.parries += amount;
  if (event.kind === 'quest') journey.events.quests += amount;
  if (event.kind === 'visit' && target) journey.events.visited[target] = true;

  for (const offer of journey.board.offers) {
    if (offer.status !== 'active') continue;
    const matching = (offer.kind === 'hunt' && event.kind === 'kill') || (offer.kind === 'visit' && event.kind === 'visit') || (offer.kind === 'rest' && event.kind === 'rest');
    if (!matching || offer.target !== target) continue;
    const before = offer.progress;
    if (offer.kind === 'hunt') offer.progress = Math.min(offer.count, offer.progress + amount);
    else {
      // A location/fire is a binary observation; a render loop cannot turn it into progress.
      const uniqueKey = target;
      if (!offer.seen[uniqueKey]) { offer.seen[uniqueKey] = true; offer.progress = Math.min(offer.count, offer.progress + 1); }
    }
    if (offer.progress !== before) changed.push(offer.id);
    if (offer.progress >= offer.count && offer.status === 'active') { offer.status = 'ready'; completed.push(offer.id); }
  }
  const unlocked = unlockAchievements(journey).map((achievement) => achievement.id);
  return { ok: true, changed, completed, unlocked };
}

/**
 * Mark a ready contract as claimed and return (but never apply) the base-economy reward.
 * The parent must add reward.gold/reward.echoes/reward.xp exactly once after ok === true.
 */
export function claimContract(G, id) {
  const journey = initJourney(G);
  const offer = activeOffer(journey, id);
  if (!offer) return { ok: false, error: 'unknown_contract' };
  if (offer.status === 'claimed') return { ok: false, error: 'already_claimed' };
  if (offer.status !== 'ready') return { ok: false, error: 'not_complete' };

  offer.status = 'claimed';
  journey.events.claims += 1;
  const tale = taleFor(journey, offer);
  const wasKnown = !!journey.collections[tale.id];
  const reward = rewardCopy(offer.reward);
  let discovery;
  let message;
  if (wasKnown) {
    reward.gold = Math.min(51, reward.gold + DUPLICATE_TALE_GOLD);
    discovery = { ...copy(tale), duplicate: true, bonusGold: DUPLICATE_TALE_GOLD };
    message = `Эта сказка уже в альбоме. За бережное повторение: +${DUPLICATE_TALE_GOLD} золота.`;
  } else {
    journey.collections[tale.id] = { id: tale.id, foundBy: offer.id };
    discovery = { ...copy(tale), duplicate: false };
    message = `Найдена история: «${tale.title}».`;
  }
  const unlocked = unlockAchievements(journey).map((achievement) => achievement.id);
  return { ok: true, reward, discovery, message, unlocked };
}

/** Replace a board only after a claimed or abandoned contract and with no unclaimed work left. */
export function rotateContracts(G) {
  const journey = initJourney(G);
  const offers = journey.board.offers;
  if (!offers.some((offer) => offer.status === 'claimed' || offer.status === 'abandoned')) return { ok: false, error: 'finish_or_abandon_first' };
  if (offers.some((offer) => offer.status === 'active' || offer.status === 'ready')) return { ok: false, error: 'active_contracts' };
  journey.board.cycle += 1;
  const chapter = chapterOf(G);
  const random = seeded(`${journey.seed}|${journey.board.cycle}|${chapter}`);
  journey.board.offers = ['hunt', 'visit', 'rest'].map((kind) => makeOffer(journey, chapter, random, kind));
  return { ok: true, offers: journey.board.offers.map(publicOffer) };
}

function summaryHero(heroSummary) {
  const source = isRecord(heroSummary) ? heroSummary : {};
  const hero = {};
  for (const key of ['name', 'class', 'fate', 'title']) if (typeof source[key] === 'string') hero[key] = source[key].slice(0, 120);
  for (const key of ['level', 'chapter']) if (Number.isFinite(Number(source[key]))) hero[key] = int(source[key], 0, 0, 99);
  return hero;
}

/** Store an ending once in account-like plain JSON metadata; currencies and reward totals are never copied. */
export function recordEnding(meta, endingId, heroSummary) {
  const M = metaObject(meta);
  if (typeof endingId !== 'string' || !endingId.trim()) return M;
  const next = { id: endingId, hero: summaryHero(heroSummary) };
  const at = M.endings.findIndex((ending) => ending.id === endingId);
  if (at >= 0) M.endings[at] = next;
  else M.endings.push(next);
  return M;
}

/** Merge permanent album discoveries from a save without importing gold, XP, echoes, or contract rewards. */
export function mergeMeta(meta, G) {
  const M = metaObject(meta);
  const journey = initJourney(G, M);
  for (const id of Object.keys(journey.collections)) if (TALES.some((tale) => tale.id === id) && !M.collectibles.includes(id)) M.collectibles.push(id);
  for (const id of Object.keys(journey.achievements)) if (ACHIEVEMENTS.some((achievement) => achievement.id === id) && !M.achievements.includes(id)) M.achievements.push(id);
  if (G && G.flags && typeof G.flags.ending === 'string') recordEnding(M, G.flags.ending, {
    name: G.char && G.char.name && G.char.name.first,
    class: G.cls,
    level: G.lvl,
    chapter: chapterOf(G),
  });
  return M;
}

/** JSON-ready snapshot for an album/board UI. It intentionally reports no currency totals. */
export function journeySummary(G, meta) {
  const M = metaObject(meta);
  const journey = initJourney(G, M);
  const allTales = new Set([...M.collectibles, ...Object.keys(journey.collections)]);
  const allAchievements = new Set([...M.achievements, ...Object.keys(journey.achievements)]);
  const board = journey.board.offers.map(publicOffer);
  return copy({
    completed: journey.events.claims,
    cycle: journey.board.cycle,
    active: board.filter((offer) => offer.status === 'active'),
    ready: board.filter((offer) => offer.status === 'ready'),
    collectibles: TALES.filter((tale) => allTales.has(tale.id)).map((tale) => tale.id),
    achievements: ACHIEVEMENTS.filter((achievement) => allAchievements.has(achievement.id)).map((achievement) => achievement.id),
    stats: {
      kills: journey.events.kills,
      rests: journey.events.rests,
      parries: journey.events.parries,
      quests: journey.events.quests,
      visits: keyCount(journey.events.visited),
      claims: journey.events.claims,
    },
  });
}
