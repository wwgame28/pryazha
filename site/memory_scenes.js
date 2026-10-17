// Memory loss encounters: small optional conversations around sacrificed bond cards.
// Pure state logic only: the caller chooses priority, renders `lines` and invokes finishEncounter.
import * as MEM from './memory.js';
import * as WS from './world_state.js';

export const SCENE_NPCS = Object.freeze({
  agafya: { name: 'Агафья', newTitle: 'Агафья — знакомство заново' },
  shurshok: { name: 'Шуршок', newTitle: 'Шуршок — новое «своё»' },
  tur: { name: 'Тур', newTitle: 'Тур — знакомство заново' },
  vesna: { name: 'Весна', newTitle: 'Весна — знакомство заново' },
  yasna: { name: 'Ясна', newTitle: 'Ясна — новая запись' },
  kudel: { name: 'Кудель', newTitle: 'Кудель — новая петля' },
});

const DAY = MEM.DAY || 480;
const npcIds = Object.keys(SCENE_NPCS);
const dayOf = (G) => Math.floor((G.time || 0) / DAY);
const chapterOf = (G) => (G.ws && G.ws.chapter) || (G.flags && +G.flags.chapter) || 1;
const own = (o, k) => Object.prototype.hasOwnProperty.call(o || {}, k);
const asObject = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});

const DOMESTIC = {
  agafya: [
    { title: 'Сеть на коленях', lines: [{ who: 'agafya', text: 'Сядь, милок. Сеть сама себя не переберёт.' }, { who: 'agafya', text: 'Вот эту ячею не тяни. Она ещё держится.' }], choices: [{ id: 'help', text: 'Перебирать сеть рядом.' }, { id: 'leave', text: 'Кивнуть и уйти.' }], reply: { help: 'Агафья молча подвигает тебе клубок.' } },
    { title: 'Каша без повода', lines: [{ who: 'agafya', text: 'Каша остыла. Значит, тебе достанется.' }, { who: 'agafya', text: 'Не хвали. Ешь.' }], choices: [{ id: 'help', text: 'Помыть миску.' }, { id: 'leave', text: 'Поблагодарить и уйти.' }], reply: { help: 'Она ворчит, но миску не отнимает.' } },
  ],
  shurshok: [
    { title: 'Пуговка с дырочкой', lines: [{ who: 'shurshok', text: 'Смотри! Пуговка, а дырочек пять. Лишняя — для удачи, честно-пречестно.' }], choices: [{ id: 'help', text: 'Попросить показать находку.' }, { id: 'leave', text: 'Не трогать пуговку.' }], reply: { help: 'Шуршок суёт пуговку в ладонь и сразу забирает обратно.' } },
    { title: 'Котелок', lines: [{ who: 'shurshok', text: 'Я суп варю. Вода, репа, ещё вода. Хороший суп, если голодный.' }], choices: [{ id: 'help', text: 'Отдать щепотку соли.' }, { id: 'leave', text: 'Сказать, что пахнет сносно.' }], reply: { help: 'Шуршок нюхает соль так серьёзно, будто это золото.' } },
  ],
  tur: [
    { title: 'Меха', lines: [{ who: 'tur', text: 'Подержи меха. Не рви ручку, она старше тебя.' }], choices: [{ id: 'help', text: 'Качать ровно.' }, { id: 'leave', text: 'Не мешать работе.' }], reply: { help: 'Огонь в горне отвечает коротким ровным гулом.' } },
    { title: 'Кривой гвоздь', lines: [{ who: 'tur', text: 'Гвоздь кривой. Выкинуть жалко. Выпрямить — упрямый.' }], choices: [{ id: 'help', text: 'Подержать клещи.' }, { id: 'leave', text: 'Оставить гвоздь в покое.' }], reply: { help: 'Тур бьёт раз. Гвоздь делается почти честным.' } },
  ],
  vesna: [
    { title: 'Кружки', lines: [{ who: 'vesna', text: 'Кружки сами не моются. Обидно, правда?' }, { who: 'vesna', text: 'Вот эту не разбей: она страшная, но моя.' }], choices: [{ id: 'help', text: 'Сполоснуть кружки.' }, { id: 'leave', text: 'Убрать руки от страшной кружки.' }], reply: { help: 'Весна ставит перед тобой чистую кружку, будто это награда.' } },
    { title: 'Лук к похлёбке', lines: [{ who: 'vesna', text: 'Режь лук. Плакать можно, жаловаться — нет.' }], choices: [{ id: 'help', text: 'Нарезать лук.' }, { id: 'leave', text: 'Спросить, не нужен ли кто другой.' }], reply: { help: 'Весна смеётся: «Вот, уже пахнет домом».' } },
  ],
  yasna: [
    { title: 'Неровный ярлык', lines: [{ who: 'yasna', text: 'Этот ярлык наклеен криво. Такое меня отвлекает.' }], choices: [{ id: 'help', text: 'Придержать склянку.' }, { id: 'leave', text: 'Не трогать архивную вещь.' }], reply: { help: 'Ясна поправляет ярлык и улыбается на миг позже, чем следовало.' } },
    { title: 'Чернила', lines: [{ who: 'yasna', text: 'Чернила густеют от холода. Им тоже требуется тепло, как выясняется.' }], choices: [{ id: 'help', text: 'Подать тёплую воду.' }, { id: 'leave', text: 'Пожелать сохранности.' }], reply: { help: '«Принято», — говорит Ясна так, словно это очень важное слово.' } },
  ],
  kudel: [
    { title: 'Клочок шерсти', lines: [{ who: 'kudel', text: 'Разбери шерсть, дитятко. Не дёргай: нить обижается.' }], choices: [{ id: 'help', text: 'Разбирать мягко.' }, { id: 'leave', text: 'Оставить шерсть на лавке.' }], reply: { help: 'Кудель кивает: «Вот, уже не колется».' } },
    { title: 'Одна петля', lines: [{ who: 'kudel', text: 'Петля убежала. Бывает: у неё свои ноги.' }], choices: [{ id: 'help', text: 'Подать веретено.' }, { id: 'leave', text: 'Подождать молча.' }], reply: { help: 'Кудель ловит петлю и прячет улыбку в рукав.' } },
  ],
};

const AFTER_LOSS = {
  agafya: { title: 'Незнакомая миска', lines: [{ who: 'agafya', text: 'Кашу будешь? Я тебе оставила. Как всегда.' }, { who: 'agafya', text: 'Не узнал, значит. Ничего. Миска слева — ты всегда туда ставил.' }], choices: [{ id: 'stay', text: 'Сесть у печки.' }, { id: 'leave', text: 'Не спорить и уйти.' }], reply: { stay: 'Агафья ставит миску слева, как привыкла.' } },
  shurshok: { title: 'Не тот человек', lines: [{ who: 'shurshok', text: 'Эй. Это же я. Шуршок. Ты мне эту пуговку сам отдал.' }, { who: 'shurshok', text: 'Если забыл — я не обижусь. Только не спрашивай, сколько она стоит.' }], choices: [{ id: 'stay', text: 'Рассмотреть пуговку.' }, { id: 'leave', text: 'Не брать чужое.' }], reply: { stay: 'Шуршок прячет пуговку и шмыгает носом.' } },
  tur: { title: 'Чужие руки', lines: [{ who: 'tur', text: 'Я же учил тебя клещи держать. Вон там стоял, у горна.' }, { who: 'tur', text: 'Ладно. Я — Тур. Для начала этого хватит. Рукавицы надень.' }], choices: [{ id: 'stay', text: 'Поправить хват молча.' }, { id: 'leave', text: 'Отойти от горна.' }], reply: { stay: 'Тур смотрит на руки и ничего не говорит.' } },
  vesna: { title: 'Кружка без имени', lines: [{ who: 'vesna', text: 'Тебе обычную? Ты всегда брал в этой кружке. Не той — вон этой.' }, { who: 'vesna', text: 'Не помнишь? Скажи, что теперь любишь. Я запомню ещё раз.' }], choices: [{ id: 'stay', text: 'Взять простую воду.' }, { id: 'leave', text: 'Сказать, что потом.' }], reply: { stay: 'Весна наливает воду и не берёт денег.' } },
  yasna: { title: 'Пропуск в книге', lines: [{ who: 'yasna', text: 'Ваше имя есть в книге. Здесь, на полях. Вы сами просили не вписывать в основной список.' }, { who: 'yasna', text: 'Вы не узнаёте меня. Запись этого не исправит. Можем просто поздороваться.' }], choices: [{ id: 'stay', text: 'Поздороваться в ответ.' }, { id: 'leave', text: 'Не трогать книгу.' }], reply: { stay: 'Ясна закрывает книгу ладонью, не стирая пустую строку.' } },
  kudel: { title: 'Шов не узнаёт', lines: [{ who: 'kudel', text: 'Дитятко… я тебя узнаю. Ты меня — нет, вижу.' }, { who: 'kudel', text: 'Не бойся. Я не стану тянуть за старую нитку. Дай запястье: рукав разошёлся.' }], choices: [{ id: 'stay', text: 'Дать ей посмотреть на шов.' }, { id: 'leave', text: 'Спрятать запястье.' }], reply: { stay: 'Кудель касается воздуха над ниткой, не касаясь кожи.' } },
};

const LATE_ECHO = {
  agafya: { title: 'Сухая ячея', lines: [{ who: 'agafya', text: 'Сеть опять зацепилась за ту же ячею.' }, { who: 'agafya', text: 'Ты всегда тут тянул слишком сильно. А теперь не тянешь. Хорошая ячея, только непривычная.' }], reply: 'Она сама распутывает сеть и качает головой.' },
  shurshok: { title: 'Пуговка в кармане', lines: [{ who: 'shurshok', text: 'Вот она, пятиядырочная. Твой подарок. Я его не отдал.' }, { who: 'shurshok', text: 'Ты её не узнаёшь. Я всё равно берегу.' }], reply: 'Шуршок завязывает пуговку на шнурок.' },
  tur: { title: 'Ровный удар', lines: [{ who: 'tur', text: 'Молот стукнул — и я ждал, что ты скажешь: «ещё раз».' }, { who: 'tur', text: 'Глупость. Но стук был ровный.' }], reply: 'Тур кладёт молот на место без обычного грохота.' },
  vesna: { title: 'Лишняя кружка', lines: [{ who: 'vesna', text: 'Поставила две кружки. Одну убрала. Руки сами.' }, { who: 'vesna', text: 'Руки сплетничают хуже меня.' }], reply: 'Весна вытирает вторую кружку досуха.' },
  yasna: { title: 'Край страницы', lines: [{ who: 'yasna', text: 'Пустая строка всё ещё на месте. Я не стала её выскребать.' }, { who: 'yasna', text: 'Иногда сохранность — это не трогать.' }], reply: 'Ясна переворачивает страницу осторожнее обычного.' },
  kudel: { title: 'Тихая петля', lines: [{ who: 'kudel', text: 'Рукав опять разошёлся. Новый шов рядом со старым.' }, { who: 'kudel', text: 'Значит, можно не латать назад.' }], reply: 'Кудель отпускает нить, и та не рвётся.' },
};

const RENEWAL = {
  agafya: { lines: [{ who: 'agafya', text: 'Можешь звать меня Агафьей. Остальное не обязано возвращаться.' }], text: 'Спросить, можно ли зайти на кашу.', reply: '«Можно», — говорит она. «Только миску мой».' },
  shurshok: { lines: [{ who: 'shurshok', text: 'Давай сначала: я Шуршок. У меня есть пуговка и почти нет важного.' }], text: 'Назвать себя заново.', reply: 'Шуршок кивает так, будто обмен состоялся честно.' },
  tur: { lines: [{ who: 'tur', text: 'Тур. Кузнец. Ругаюсь громко, работаю тише.' }], text: 'Попросить показать кузню.', reply: 'Тур отодвигает тебе табурет, не глядя.' },
  vesna: { lines: [{ who: 'vesna', text: 'Весна. Трактир, суп, слухи. Слухи — по желанию.' }], text: 'Представиться за кружкой воды.', reply: 'Весна стукает кружкой о стол: «Вот и познакомились».' },
  yasna: { lines: [{ who: 'yasna', text: 'Ясна Стынь. Можем начать новую запись, если вы не возражаете.' }], text: 'Согласиться на новую запись.', reply: 'Ясна пишет дату, оставляя старую пустую строку нетронутой.' },
  kudel: { lines: [{ who: 'kudel', text: 'Я Кудель, дитятко. Новая петля тоже держит, если не тянуть её назад.' }], text: 'Взять конец новой нити.', reply: 'Кудель вкладывает в ладонь сухую тёплую нитку.' },
};

function sceneState(G) {
  MEM.initMemory(G);
  WS.initWS(G);
  const S = (G.memoryScenes = asObject(G.memoryScenes));
  S.v = Math.max(+S.v || 0, 1);
  S.losses = asObject(S.losses);
  S.domestic = asObject(S.domestic);
  S.completed = asObject(S.completed);
  migrateSacrificed(G, S);
  return S;
}

function bondNpc(card) {
  if (!card || typeof card !== 'object') return null;
  if (card.links && typeof card.links.npc === 'string') return card.links.npc;
  const m = /^b_([a-z0-9_]+?)(?:_new)?$/i.exec(card.id || '');
  return m ? m[1] : null;
}

function snapshotCard(card, source) {
  return {
    id: card.id || null,
    title: card.title || null,
    type: card.type || 'bond',
    links: { ...asObject(card.links) },
    gift: card.gift || null,
    day: Number.isFinite(card.day) ? card.day : undefined,
    source,
  };
}

function migrateSacrificed(G, S) {
  const sacrificed = (G.memory && G.memory.sacrificed) || [];
  for (const card of sacrificed) {
    const npcId = bondNpc(card);
    if (!npcIds.includes(npcId) || S.losses[npcId]) continue;
    if (card.type && card.type !== 'bond') continue;
    S.losses[npcId] = {
      npcId,
      cardId: card.id || `b_${npcId}`,
      lostDay: Number.isFinite(card.day) ? card.day : dayOf(G),
      lostChapter: chapterOf(G),
      context: snapshotCard(card, 'legacy-sacrificed'),
      waiting: true,
      firstDone: false,
      lateDone: false,
      renewalDone: false,
      migrated: true,
    };
  }
}

/** Initialise serialisable encounter state and migrate old `memory.sacrificed` saves. */
export function initScenes(G) {
  if (!G || typeof G !== 'object') throw new TypeError('initScenes needs a save object');
  return sceneState(G);
}

/**
 * Register the sacrifice of an old b_<npc> bond card. Repeating the call is safe
 * and preserves the first loss context.
 */
export function registerLoss(G, card) {
  const S = initScenes(G);
  const npcId = bondNpc(card);
  if (!npcIds.includes(npcId) || (card && card.type && card.type !== 'bond')) return null;
  if (S.losses[npcId]) return S.losses[npcId];
  const loss = {
    npcId,
    cardId: (card && card.id) || `b_${npcId}`,
    lostDay: dayOf(G),
    lostChapter: chapterOf(G),
    context: snapshotCard(card || { id: `b_${npcId}`, links: { npc: npcId } }, 'registered'),
    waiting: true,
    firstDone: false,
    lateDone: false,
    renewalDone: false,
  };
  S.losses[npcId] = loss;
  return loss;
}

function met(G, npcId) {
  return !!((G.story && G.story.met && G.story.met[npcId]) || (G.flags && G.flags[`met_${npcId}`]));
}

function hasCard(G, id) {
  return !!(G.memory && Array.isArray(G.memory.cards) && G.memory.cards.some((c) => c && c.id === id));
}

function relation(G, npcId) {
  const current = (G.ws && G.ws.rel && G.ws.rel[npcId]) || (G.relations && G.relations[npcId]) || {};
  return {
    trust: +current.trust || 0,
    hostility: +current.hostility || +current.hostile || 0,
  };
}

function domesticAllowed(G, npcId) {
  const r = relation(G, npcId);
  const story = G.story || {};
  const afterM1 = own(story.active, 'm1') || own(story.done, 'm1');
  return met(G, npcId) || afterM1 || r.trust > 0 || hasCard(G, `b_${npcId}`);
}

function mainProgress(G) {
  const story = G.story || {};
  if (Number.isFinite(story.mainProgress)) return story.mainProgress;
  if (Number.isFinite(G.flags && G.flags.main_progress)) return G.flags.main_progress;
  return Object.keys(story.done || {}).filter((id) => /^(m\d|main_|chapter_)/.test(id)).length;
}

function stamp(G) {
  return { day: dayOf(G), chapter: chapterOf(G), main: mainProgress(G) };
}

function advancedSince(G, at) {
  if (!at) return false;
  const now = stamp(G);
  return now.day > (at.day ?? now.day) || now.chapter > (at.chapter ?? now.chapter) || now.main > (at.main ?? now.main);
}

function scene(id, npcId, title, lines, choices, kind, stage) {
  // `npc` is the UI-facing field. `npcId` stays as a harmless compatibility alias.
  return { id, npc: npcId, npcId, title, lines: lines.map((x) => ({ who: x.who, text: x.text })), choices: choices.map((x) => ({ ...x })), kind, stage };
}

function hostileLoss(G, npcId) {
  const name = SCENE_NPCS[npcId].name;
  return scene(`memory:${npcId}:loss`, npcId, 'Неловкая встреча', [
    { who: npcId, text: `Не подходи. То, что ты забыл, не отменяет сделанного.` },
  ], [{ id: 'leave', text: 'Не спорить.' }], 'loss', 'loss');
}

function firstLossScene(G, npcId) {
  const r = relation(G, npcId);
  if (npcId === 'agafya' && G.flags && G.flags.council_agafya_exposed) {
    return scene('memory:agafya:loss', npcId, 'Каша без ответа', [
      { who: 'agafya', text: 'Кашу бери сам. Секрет мой ты уже на площади раздал.' },
      { who: 'agafya', text: 'А теперь ещё и не помнишь, кому навредил.' },
    ], [{ id: 'stay', text: 'Молча вымыть миску.' }, { id: 'ask', text: 'Спросить про узелок.', disabled: true }], 'loss', 'loss');
  }
  if (r.hostility >= 7) return hostileLoss(G, npcId);
  const d = AFTER_LOSS[npcId];
  const sensory = {
    agafya: 'Ты знаешь, что здесь должно быть спокойно. Но женщина у печки — чужая. Рука сама тянется поставить миску слева.',
    shurshok: 'Он бежит к тебе, будто радовался ещё до встречи. Ты отступаешь на шаг. Его улыбка остаётся на месте чуть дольше, чем надо.',
    tur: 'Запах железа знаком. Человек, который подаёт тебе рукавицы, — нет. Они почему-то точно твоего размера.',
    vesna: 'Ты собираешься спросить цену. Она уже поставила кружку перед тобой. На ручке старая трещина; палец ложится в неё сам.',
    yasna: 'В книге твой почерк. Под записью — чужие аккуратные буквы. Женщина ждёт, пока ты дочитаешь, не подсказывая.',
    kudel: 'Ты прячешь запястье, хотя она ещё не протянула руки. Она замечает это и садится подальше.',
  };
  return scene(`memory:${npcId}:loss`, npcId, d.title, [{who:'narr',text:sensory[npcId]},...d.lines], d.choices, 'loss', 'loss');
}

function lateScene(npcId) {
  const d = LATE_ECHO[npcId];
  return scene(`memory:${npcId}:late`, npcId, d.title, d.lines, [{ id: 'listen', text: 'Остаться и выслушать.' }, { id: 'leave', text: 'Не мешать.' }], 'echo', 'late');
}

function renewalScene(G, npcId) {
  const blocked = relation(G, npcId).hostility >= 7 || (npcId === 'agafya' && !!(G.flags && G.flags.council_agafya_exposed));
  const d = RENEWAL[npcId];
  const choices = [{ id: 'new', text: d.text, ...(blocked ? { disabled: true } : {}) }, { id: 'leave', text: 'Оставить всё как есть.' }];
  return scene(`memory:${npcId}:renewal`, npcId, 'Новая нить', d.lines, choices, 'renewal', 'renewal');
}

/**
 * Return one optional encounter for this NPC, without consuming it or applying outcomes.
 * The caller may defer `kind: domestic` while a main quest has priority.
 */
export function nextEncounter(G, npcId) {
  if (!G || !npcIds.includes(npcId)) return null;
  const S = initScenes(G);
  const loss = S.losses[npcId];
  if (loss) {
    if (!loss.firstDone) return firstLossScene(G, npcId);
    if (!loss.lateDone && advancedSince(G, loss.firstAt || { day: loss.lostDay, chapter: loss.lostChapter, main: 0 })) return lateScene(npcId);
    if (loss.lateDone && !loss.renewalDone && !hasCard(G, `b_${npcId}_new`)) return renewalScene(G, npcId);
    return null;
  }

  // Everyday scenes are deliberately gated: merely loading a save never yields six introductions.
  if (!domesticAllowed(G, npcId)) return null;
  const D = (S.domestic[npcId] = asObject(S.domestic[npcId]));
  if (!D.stage1) {
    const d = DOMESTIC[npcId][0];
    return scene(`memory:${npcId}:domestic1`, npcId, d.title, d.lines, d.choices, 'domestic', 'domestic1');
  }
  if (!D.stage2 && advancedSince(G, D.stage1)) {
    const d = DOMESTIC[npcId][1];
    return scene(`memory:${npcId}:domestic2`, npcId, d.title, d.lines, d.choices, 'domestic', 'domestic2');
  }
  return null;
}

function addNewBond(G, npcId) {
  const M = MEM.initMemory(G);
  const id = `b_${npcId}_new`;
  const card = MEM.addCard(G, {
    id,
    type: 'bond',
    title: SCENE_NPCS[npcId].newTitle,
    weight: 1,
    links: { npc: npcId, renewed: true },
    journal: [`${SCENE_NPCS[npcId].name} — новое знакомство, не возвращённое старое.`],
  });
  // A new acquaintance is enough to speak, but it never recreates the surrendered b_<npc> card.
  M.heroKnows[npcId] = Math.max(M.heroKnows[npcId] || 0, 1);
  return card;
}

function replyFor(enc, choiceId) {
  const npcId = enc.npcId;
  if (enc.stage === 'domestic1' || enc.stage === 'domestic2') return DOMESTIC[npcId][enc.stage === 'domestic1' ? 0 : 1].reply[choiceId] || 'Обычное дело заканчивается без лишних слов.';
  if (enc.stage === 'loss') {
    if (npcId === 'agafya' && enc.title === 'Каша без ответа') return 'Агафья отходит к печке. Разговор тоже.';
    return AFTER_LOSS[npcId].reply[choiceId] || 'Вы расходитесь, не найдя нужного слова.';
  }
  if (enc.stage === 'late') return LATE_ECHO[npcId].reply;
  if (enc.stage === 'renewal' && choiceId === 'new') return RENEWAL[npcId].reply;
  return 'Разговор на этом заканчивается.';
}

/**
 * Validate and finish the exact currently offered scene. Invalid, stale or disabled choices
 * are a no-op, so UI code can safely decline to call it for disabled buttons.
 */
export function finishEncounter(G, enc, choiceId) {
  const npcId = enc && (enc.npc || enc.npcId);
  if (!G || !enc || typeof enc !== 'object' || !npcIds.includes(npcId)) return { ok: false, error: 'invalid-encounter' };
  const current = nextEncounter(G, npcId);
  if (!current || current.id !== enc.id || current.stage !== enc.stage) return { ok: false, error: 'stale-encounter' };
  const choice = current.choices.find((c) => c.id === choiceId);
  if (!choice) return { ok: false, error: 'invalid-choice' };
  if (choice.disabled) return { ok: false, error: 'disabled-choice' };

  const S = initScenes(G);
  const at = stamp(G);
  S.completed[current.id] = { choiceId, ...at };
  const flags = (G.flags = G.flags || {});

  if (current.stage === 'domestic1' || current.stage === 'domestic2') {
    const D = (S.domestic[current.npcId] = asObject(S.domestic[current.npcId]));
    D[current.stage === 'domestic1' ? 'stage1' : 'stage2'] = { choiceId, ...at };
    flags[`memory_${current.npcId}_${current.stage}`] = true;
    if (choiceId === 'help') WS.addRel(G, current.npcId, 'trust', 1, 'тихое дело рядом');
  } else if (current.stage === 'loss') {
    const loss = S.losses[current.npcId];
    if (!loss) return { ok: false, error: 'missing-loss' }; // Defensive: it cannot be offered without a registered loss.
    loss.waiting = false;
    loss.firstDone = true;
    loss.firstAt = { choiceId, ...at };
    flags[`memory_loss_${current.npcId}`] = true;
    // Loss never punishes the NPC's relation to the hero. A quiet, chosen kindness may improve it.
    if (choiceId === 'stay') WS.addRel(G, current.npcId, 'respect', 1, 'остался после утраты связи');
  } else if (current.stage === 'late') {
    const loss = S.losses[current.npcId];
    if (!loss) return { ok: false, error: 'missing-loss' };
    loss.lateDone = true;
    loss.lateAt = { choiceId, ...at };
    flags[`memory_echo_${current.npcId}`] = true;
    if (choiceId === 'listen') WS.addRel(G, current.npcId, 'respect', 1, 'выслушал отголосок');
  } else if (current.stage === 'renewal') {
    const loss = S.losses[current.npcId];
    if (!loss) return { ok: false, error: 'missing-loss' };
    loss.renewalDone = true;
    loss.renewalAt = { choiceId, ...at };
    if (choiceId === 'new') {
      addNewBond(G, current.npcId);
      loss.newBond = true;
      flags[`memory_new_bond_${current.npcId}`] = true;
      WS.addRel(G, current.npcId, 'trust', 1, 'знакомство заново');
    } else {
      loss.newBond = false;
      flags[`memory_new_bond_${current.npcId}`] = false;
    }
  }

  return { ok: true, lines: [{ who: 'narr', text: replyFor(current, choiceId) }] };
}


/** Quiet repeat greeting after a loss scene; a renewed bond is genuinely new. */
export function greetingOverride(G, npcId) {
  if (!G || !SCENE_NPCS[npcId]) return null;
  const loss = initScenes(G).losses[npcId];
  if (!loss || !loss.firstDone) return null;
  if (hasCard(G, `b_${npcId}_new`)) return {
    agafya: 'Заходи. Прошлое не спрашивай, если не хочется. Каша свежая.',
    shurshok: 'Привет! На этот раз я сразу скажу: пуговка не продаётся.',
    tur: 'А, ты. Рукавицы там же. Уже сам найдёшь.',
    vesna: 'Новая обычная? Я помню, что ты теперь любишь.',
    yasna: 'Здравствуйте. Новая запись на месте. Старую я не трогала.',
    kudel: 'Здравствуй, дитятко. Новая петля держит.',
  }[npcId];
  return {
    agafya: 'Если не узнаёшь — всё равно заходи. Миска слева.',
    shurshok: 'Это я, Шуршок. Не торопись вспоминать.',
    tur: 'Тур. Кузнец. Могу ещё раз показать.',
    vesna: 'Я — Весна. Суп горячий. Остальное подождёт.',
    yasna: 'Вы можете не узнавать меня. Договорённости я помню.',
    kudel: 'Не тяни назад, дитятко. Тут можно посидеть и без прошлого.',
  }[npcId];
}
