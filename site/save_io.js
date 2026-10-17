// Portable saves contain only bounded JSON data, never code or remote resources.
const MAX_BYTES = 4 * 1024 * 1024;
const unsafe = new Set(['__proto__', 'prototype', 'constructor']);
export function validateTree(value, depth = 0) {
  if (depth > 32) throw new Error('Сохранение слишком глубоко вложено.');
  if (value === null || typeof value === 'boolean') return;
  if (typeof value === 'number') { if (!Number.isFinite(value) || Math.abs(value) > 1e12) throw new Error('Некорректное число в сохранении.'); return; }
  if (typeof value === 'string') { if (value.length > 2000000) throw new Error('Слишком длинная строка.'); return; }
  if (Array.isArray(value)) { if (value.length > 20000) throw new Error('Слишком много записей.'); value.forEach(v => validateTree(v, depth + 1)); return; }
  if (typeof value !== 'object') throw new Error('Ожидались обычные данные JSON.');
  for (const [key, v] of Object.entries(value)) {
    if (unsafe.has(key)) throw new Error('Недопустимый ключ в сохранении.');
    validateTree(v, depth + 1);
  }
}
export function validateHero(hero) {
  validateTree(hero);
  if (!hero || !hero.char || !hero.char.name || typeof hero.char.name.first !== 'string' || !hero.char.body || !hero.char.hair || !hero.char.eyes || !hero.char.skin || !hero.char.big5 || !hero.char.drive || !hero.char.clothes) throw new Error('В файле нет полного героя «Пряжи».');
  if (!['human','warrior','ranger','pyro','cryo','necro','priest','weaver','hollow'].includes(hero.cls)) throw new Error('Неизвестный путь героя.');
  if (!['human','elf','dwarf','halfling','orc','tiefling'].includes(hero.char.race)) throw new Error('Неизвестный народ героя.');
  if (!Number.isInteger(hero.lvl) || hero.lvl < 1 || hero.lvl > 500) throw new Error('Некорректный уровень героя.');
  if (!Number.isInteger(hero.seed) || hero.seed < 0 || hero.seed > 2147483647) throw new Error('Некорректное зерно мира.');
  if (!hero.equip || !Number.isInteger(hero.equip.weapon) || hero.equip.weapon < 0 || hero.equip.weapon > 4 || !Number.isInteger(hero.equip.armor) || hero.equip.armor < 0 || hero.equip.armor > 3 || !Number.isInteger(hero.equip.helm) || hero.equip.helm < 0 || hero.equip.helm > 20) throw new Error('Некорректное снаряжение героя.');
  for (const key of ['gold','xp','echoes','time']) if (typeof hero[key] !== 'number' || hero[key] < 0 || hero[key] > 1e9) throw new Error('Некорректное значение: ' + key + '.');
  if (!Array.isArray(hero.bag) || !Array.isArray(hero.slots) || hero.slots.length !== 4 || !hero.flags || !hero.tree || !hero.potions || !hero.stats) throw new Error('Сохранение неполное.');
  return hero;
}
export function encodeSave(hero, meta) {
  validateHero(hero); validateTree(meta || {});
  return JSON.stringify({ format: 'pryazha-portable', version: 1, hero, meta: meta || {} }, null, 2);
}
export function decodeSave(text) {
  if (typeof text !== 'string' || text.length > MAX_BYTES) throw new Error('Файл слишком велик: максимум 4 МБ.');
  let data; try { data = JSON.parse(text); } catch { throw new Error('Это не файл сохранения JSON.'); }
  validateTree(data);
  const hero = data.format === 'pryazha-portable' ? data.hero : data;
  if (data.format && (data.format !== 'pryazha-portable' || data.version !== 1)) throw new Error('Неизвестная версия сохранения.');
  validateHero(hero);
  return { hero, meta: data.format ? data.meta || {} : {} };
}
