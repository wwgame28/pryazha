// Game data: classes, gear tiers, enemies, loot and quest texts.

// Fantasy jobs (same order as the generator) -> suggested class. The player may pick any class.
export const CLASS_OF = ['warrior', 'pyro', 'priest', 'weaver', 'ranger', 'hollow', 'ranger', 'warrior', 'weaver', 'cryo', 'warrior', 'ranger', 'necro', 'hollow'];
// skills: [first, second (opens at level 3)]
export const CLASSES = {
  warrior: { name: 'Воин', weapon: 'sword', anim: 'slash', main: 'СИЛ', cd: .42, hitFrame: 3, desc: 'Меч и щит. Бьёт по дуге перед собой и держит удар.',
    skills: [{ id: 'dash', name: 'Рывок', cost: 12, cd: 1.1, desc: 'Бросок вперёд с ударом по всем на пути, без урона по себе' }, { id: 'cry', name: 'Боевой клич', cost: 20, cd: 8, desc: 'Оглушает врагов рядом и усиливает удары на 8 секунд' }] },
  ranger: { name: 'Следопыт', weapon: 'bow', anim: 'shoot', main: 'ЛОВ', cd: .5, hitFrame: 5, desc: 'Лук и быстрые ноги. Стреляет издалека.',
    skills: [{ id: 'fan', name: 'Веер стрел', cost: 14, cd: 1.1, desc: 'Три стрелы разом' }, { id: 'rain', name: 'Дождь стрел', cost: 22, cd: 6, desc: 'Град стрел накрывает область вокруг цели' }] },
  pyro: { name: 'Пиромант', weapon: 'staff', anim: 'spellcast', main: 'ИНТ', cd: .5, hitFrame: 4, bolt: 'fire', robe: '#8a2a1a', trim: '#e8a23a', desc: 'Маг огня. Огненные шары взрываются и поджигают врагов.',
    skills: [{ id: 'nova', name: 'Огненная волна', cost: 20, cd: 3, desc: 'Кольцо пламени вокруг мага, поджигает' }, { id: 'meteor', name: 'Метеор', cost: 32, cd: 6, desc: 'С неба падает пылающий камень' }] },
  cryo: { name: 'Криомант', weapon: 'staff', anim: 'spellcast', main: 'ИНТ', cd: .48, hitFrame: 4, bolt: 'ice', robe: '#2a5a8a', trim: '#bfe8ff', desc: 'Маг льда. Осколки замедляют, нова замораживает на месте.',
    skills: [{ id: 'frostnova', name: 'Ледяная нова', cost: 18, cd: 4, desc: 'Замораживает всех рядом на 2,5 секунды' }, { id: 'barrier', name: 'Ледяной щит', cost: 26, cd: 12, desc: 'Ледяная броня поглощает 60 % урона 7 секунд' }] },
  necro: { name: 'Некромант', weapon: 'staff', anim: 'spellcast', main: 'ИНТ', cd: .5, hitFrame: 4, bolt: 'shadow', robe: '#231a2e', trim: '#7dff9a', desc: 'Повелитель мёртвых. Теневые стрелы крадут жизнь, павшие встают на его сторону.',
    skills: [{ id: 'raise', name: 'Поднять мертвеца', cost: 24, cd: 2.5, desc: 'Скелет-союзник сражается рядом (до двух, с 5-го уровня — до трёх)' }, { id: 'harvest', name: 'Жатва душ', cost: 30, cd: 8, desc: 'Высасывает жизнь из всех врагов рядом и лечит мага' }] },
  priest: { name: 'Жрец', weapon: 'staff', anim: 'spellcast', main: 'МДР', cd: .5, hitFrame: 4, bolt: 'holy', robe: '#e8e2d0', trim: '#e8b84a', desc: 'Служитель света. Лечит себя и союзников, нежить горит от его чар вдвое сильнее.',
    skills: [{ id: 'heal', name: 'Исцеление', cost: 22, cd: 4, desc: 'Возвращает треть здоровья себе и союзникам' }, { id: 'smite', name: 'Небесная кара', cost: 28, cd: 6, desc: 'Столп света бьёт по области, нежити — вдвое' }] },
};
export const CASTER = new Set(['pyro', 'cryo', 'necro', 'priest']);
export const SCHOOL = { fire: 'огонь', ice: 'лёд', shadow: 'тьма', holy: 'свет' };
export const UNDEAD = new Set(['skeleton', 'archer', 'zombie', 'lich', 'wraith']);
export const METALS = [
  { name: 'Ржавый', hex: '#8a7f74', power: 0 }, { name: 'Железный', hex: '#9aa3ad', power: 3 }, { name: 'Стальной', hex: '#c9d3dc', power: 7 },
  { name: 'Мифриловый', hex: '#8fd6ff', power: 12 }, { name: 'Золотой', hex: '#f0c84a', power: 18 },
];
export const WEAPON_NAME = { sword: 'меч', bow: 'лук', staff: 'посох', dagger: 'кинжал', spear: 'копьё', knife: 'нож' };
export const ARMOR = {
  warrior: [{ name: 'Стёганая куртка', def: 0 }, { name: 'Кожаный доспех', def: 3 }, { name: 'Кольчуга с табаром', def: 6 }, { name: 'Латы', def: 10 }],
  ranger: [{ name: 'Дорожная одежда', def: 0 }, { name: 'Кожаный доспех', def: 3 }, { name: 'Доспех следопыта', def: 5 }, { name: 'Кольчуга', def: 8 }],
  human: [{ name: 'Сухое с чужого плеча', def: 0 }, { name: 'Крестьянская одёжа', def: 2 }, { name: 'Дорожная куртка', def: 4 }, { name: 'Стёганка ополченца', def: 6 }],
  mage: [{ name: 'Мантия ученика', def: 0 }, { name: 'Мантия адепта', def: 2 }, { name: 'Мантия мастера', def: 4 }, { name: 'Мантия архимага', def: 7 }],
};
export const HELMS = [
  { id: null, name: 'Нет', def: 0 }, { id: 'hood', name: 'Капюшон', def: 1 }, { id: 'cavalier', name: 'Шляпа с пером', def: 1, cha: 2 },
  { id: 'helm_nasal', name: 'Шлем с наносником', def: 3 }, { id: 'wizard', name: 'Шляпа мага', def: 1, int: 3 }, { id: 'helm_kettle', name: 'Шапель', def: 4 },
];

// Enemies. look: how the sprite is built; ai: melee | ranged | caster.
export const ENEMIES = {
  goblin: { name: 'Гоблин', hp: 22, dmg: 5, speed: 62, xp: 12, gold: [2, 7], ai: 'melee', reach: 26, cd: 1.1, look: { body: 'teen', skin: '#7fa04a', layers: ['head_goblin', ['pants', '#6b5440'], ['dagger', null, '#8a7f74']] } },
  wolf: { name: 'Волколак', hp: 38, dmg: 8, speed: 84, xp: 20, gold: [0, 4], ai: 'melee', heavy: 0.2, reach: 26, cd: 1, look: { body: 'male', skin: '#6b4a2e', layers: ['head_wolf', ['pants', '#3b3f46']] } },
  bandit: { name: 'Разбойник', hp: 34, dmg: 7, speed: 66, xp: 18, gold: [6, 16], ai: 'melee', heavy: 0.25, reach: 26, cd: 1, look: { body: 'male', skin: '#c99a6e', human: true, layers: [['armor_leather', '#5a4636'], ['pants', '#3b3f46'], ['boots', '#24201c'], ['hood', '#2f2f36'], ['dagger', null, '#9aa3ad']] } },
  troll: { name: 'Гурдым', hp: 260, dmg: 16, speed: 52, xp: 160, gold: [60, 90], ai: 'melee', heavy: 0.35, reach: 40, cd: 1.5, scale: 1.45, boss: true, look: { body: 'male', skin: '#6f8a7a', layers: ['head_troll', ['pants', '#4a3a30'], ['belt', '#3a2a20']] } },
  skeleton: { name: 'Скелет', hp: 34, dmg: 8, speed: 58, xp: 18, gold: [3, 9], ai: 'melee', heavy: 0.15, reach: 30, cd: 1.1, look: { body: 'male', base: 'body_skeleton', skin: '#e8e2cf', layers: [['head_skeleton', '#e8e2cf'], ['sword', null, '#8a7f74']] } },
  archer: { name: 'Скелет-лучник', hp: 26, dmg: 7, speed: 54, xp: 20, gold: [3, 9], ai: 'ranged', range: 190, cd: 1.8, proj: 'arrow', look: { body: 'male', base: 'body_skeleton', skin: '#e8e2cf', layers: [['head_skeleton', '#e8e2cf'], ['bow', '#6a4a2a', '#8a7f74'], ['arrow', '#6a4a2a', '#8a7f74']] } },
  zombie: { name: 'Зомби', hp: 52, dmg: 9, speed: 38, xp: 22, gold: [1, 6], ai: 'melee', heavy: 0.3, reach: 26, cd: 1.4, look: { body: 'male', base: 'body_zombie', skin: '#7a9a6a', layers: [['head_zombie', '#7a9a6a'], ['ls2', '#6a6a60'], ['pants', '#4a4038']] } },
  necro: { name: 'Некромант', hp: 44, dmg: 9, speed: 50, xp: 34, gold: [10, 24], ai: 'caster', range: 210, cd: 2.1, proj: 'bone', summon: 10, look: { body: 'male', skin: '#b9b4c0', human: true, layers: [['ls2', '#2a2236'], ['cape', '#4a2a5a'], ['pants', '#1f1c26'], ['shoes', '#1b1b1b'], ['hood', '#2a2236'], ['staff', '#4a3a2a', '#8a7f74']] } },
  shaman: { name: 'Гоблин-шаман', hp: 26, dmg: 6, speed: 50, xp: 22, gold: [5, 12], ai: 'caster', range: 200, cd: 2, proj: 'poison', heals: 6, look: { body: 'teen', skin: '#6f9a3a', layers: ['head_goblin', ['pants', '#5a4030'], ['cape_tattered', '#6a4a2a'], ['staff', '#5a3b22', '#9aa3ad']] } },
  cultist: { name: 'Огненный культист', hp: 38, dmg: 9, speed: 52, xp: 30, gold: [8, 20], ai: 'caster', range: 220, cd: 2, proj: 'efire', look: { body: 'male', skin: '#c99a6e', human: true, layers: [['ls2', '#5a1a14'], ['cape', '#8a2a1a'], ['pants', '#2a1a14'], ['shoes', '#1b1b1b'], ['hood', '#5a1a14'], ['staff', '#3a1a10', '#e8a23a']] } },
  witch: { name: 'Ледяная ведьма', hp: 42, dmg: 9, speed: 54, xp: 34, gold: [10, 22], ai: 'caster', range: 220, cd: 2.2, proj: 'eice', look: { body: 'female', group: 'female', skin: '#c9d6e8', human: true, head: 'head_f', layers: [['robe', '#2a4a7a'], ['wizard', '#1f3560', '#bfe8ff'], ['staff', '#2a3a5a', '#bfe8ff']] } },
  minotaur: { name: 'Минотавр', hp: 220, dmg: 15, speed: 60, xp: 140, gold: [40, 70], ai: 'melee', heavy: 0.4, reach: 40, cd: 1.3, scale: 1.4, boss: true, look: { body: 'male', skin: '#6a4a36', layers: ['head_minotaur', ['legs_armor', null, '#6d6a66'], ['belt', '#3a2a20'], ['sword', null, '#9aa3ad']] } },
  lich: { name: 'Лич Морвен', hp: 520, dmg: 14, speed: 46, xp: 400, gold: [150, 200], ai: 'caster', range: 260, cd: 1.3, proj: 'lich', scale: 1.5, boss: true, final: true, look: { body: 'male', base: 'body_skeleton', skin: '#cfd8e8', layers: [['head_skeleton', '#cfd8e8'], ['cape', '#4a1f6a'], ['crown', null, '#f0c84a'], ['staff', '#2a1f3a', '#8fd6ff']] } },
  bat: { name: 'Нетопырь-шептун', hp: 16, dmg: 4, speed: 96, xp: 8, gold: [0, 2], ai: 'melee', reach: 22, cd: .9, look: { sheet: 'bat' } },
  slime: { name: 'Студень забытья', hp: 40, dmg: 6, speed: 34, xp: 14, gold: [0, 4], ai: 'ranged', range: 150, cd: 2.2, proj: 'poison', look: { sheet: 'slime' } },
  wraith: { name: 'Недопетый', hp: 36, dmg: 9, speed: 62, xp: 26, gold: [2, 8], ai: 'melee', reach: 26, cd: 1.1, look: { sheet: 'ghost' } },
  eyeball: { name: 'Глаз Архива', hp: 30, dmg: 8, speed: 40, xp: 22, gold: [3, 9], ai: 'caster', range: 200, cd: 2.2, proj: 'orb', look: { sheet: 'eyeball' } },
  big_worm: { name: 'Ползун', hp: 70, dmg: 11, speed: 34, xp: 30, gold: [1, 6], ai: 'melee', heavy: 0.3, reach: 30, cd: 1.4, look: { sheet: 'big_worm' } },
  snake: { name: 'Гадюка', hp: 20, dmg: 7, speed: 72, xp: 10, gold: [0, 3], ai: 'melee', reach: 22, cd: 1, look: { sheet: 'snake' } },
  arachne: { name: 'Прядильщица', hp: 60, dmg: 10, speed: 58, xp: 40, gold: [6, 14], ai: 'caster', range: 180, cd: 2, proj: 'poison', look: { sheet: 'arachne' } },
  golem: { name: 'Каменная память', hp: 180, dmg: 16, speed: 40, xp: 90, gold: [10, 30], ai: 'melee', heavy: 0.4, reach: 34, cd: 1.6, look: { sheet: 'golem' } },
};
export const SPAWNS = {
  forest: [['goblin', 8], ['shaman', 3], ['wolf', 4], ['bandit', 3]],
  crypt1: [['skeleton', 5], ['zombie', 4], ['cultist', 2], ['bat', 3], ['wraith', 1]],
  crypt2: [['skeleton', 4], ['archer', 3], ['zombie', 2], ['necro', 2], ['wraith', 2], ['eyeball', 2]],
  crypt3: [['archer', 3], ['necro', 2], ['witch', 1], ['skeleton', 3]],
  mine1: [['skeleton', 3], ['zombie', 2], ['bat', 3], ['big_worm', 2], ['golem', 1]],
  mine2: [['skeleton', 3], ['archer', 2], ['bat', 3], ['golem', 2], ['eyeball', 1]],
};

// Сложность: у героя мало здоровья (10–20 на старте), обычный враг убивает за 3–4 удара.
// HERO_HP — во сколько раз здоровье героя меньше «старой» шкалы (на ней считаются урон врагов, броня и вампиризм);
// HURT_MUL — какая доля удара врага доходит до героя.
export const HERO_HP = .125, HURT_MUL = .7;
export const POTIONS = { hp: { name: 'Зелье здоровья', price: 18, color: '#e0464e' }, mp: { name: 'Зелье маны', price: 18, color: '#4a7be0' } };

export const MAIN_QUESTS = [
  { id: 'm1', title: 'Гоблины у дороги', text: 'Гоблины в округе грабят обозы. Прогони их: победи шестерых, где бы ни встретил.', type: 'kill', target: 'goblin', count: 6, zone: 'forest', reward: { gold: 60, xp: 60 } },
  { id: 'm2', title: 'Вожак стаи', text: 'Гоблинов ведёт тролль. Его лагерь к северу от деревни — иди по жёлтой метке на карте. Положи этому конец.', type: 'kill', target: 'troll', count: 1, zone: 'forest', reward: { gold: 120, xp: 120 } },
  { id: 'm3', title: 'Печать склепа', text: 'Тролль нёс ключ от склепа на Старом кладбище к востоку от деревни. Кто-то сорвал печать изнутри. Спустись и узнай, что там проснулось.', type: 'reach', target: 'crypt2', count: 1, zone: 'crypt1', reward: { gold: 80, xp: 100 } },
  { id: 'm4', title: 'Лич Морвен', text: 'Внизу, в зале под катакомбами, ждёт Лич Морвен. Убей его, и мёртвые снова уснут.', type: 'kill', target: 'lich', count: 1, zone: 'crypt3', reward: { gold: 300, xp: 300 } },
];
export const SIDE_TARGETS = [
  ['wolf', 'волколаков', 4, 'forest'], ['bandit', 'разбойников', 3, 'forest'], ['goblin', 'гоблинов', 5, 'forest'],
  ['skeleton', 'скелетов', 6, 'crypt1'], ['zombie', 'зомби', 4, 'crypt1'], ['archer', 'скелетов-лучников', 4, 'crypt2'],
];
export const RELICS = ['серебряный медальон', 'старое обручальное кольцо', 'дедовский компас', 'шкатулка с письмами', 'деревянная игрушка-лошадка', 'фамильная брошь'];

export const ZONE_MUSIC = { village: [262, 330, 392], forest: [220, 262, 330], crypt: [147, 175, 208] };
