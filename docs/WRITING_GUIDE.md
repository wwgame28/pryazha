# Как писать сцены и квесты «Пряжи»

Образец — глава 1: `site/narrative/ch1.ink` и квесты `c1_*`, `m1`, `m2` в `site/story.json`.

## Файлы
| Что | Где |
|---|---|
| Сцены (реплики, выборы, условия, изменения) | `site/narrative/chN.ink` |
| Внешние функции игры (их же видит Inky) | `site/narrative/common.ink` — не править без правки `narrative.js` |
| Квесты, NPC, места, концовки, эпилог | `site/story.json` |
| Последствия: поступки, слухи, факты, события, предметы, обещания, торговцы | `site/narrative/consequences.json` |
| Сборка ink | `node tools/build_ink.mjs` |
| Проверка связей | `node tools/validate_story.mjs` (0 ошибок обязательно) |
| Бот-прохождение | `node t24.mjs <класс> <стиль> <до главы>` |

## Сцена ink
```
=== c2_birch_s3 ===
# scene: c2_birch_s3
# place: Ольховый Брод, изба старосты
# time: день 6, накануне Проводов
# who: ivar
# trigger: квест c2_birch, шаг s3: принести старосте список имён
# next: s4 / конец квеста
ivar: Двенадцать. Читай.
act: Береста шуршит у него в руках.
* {knows("f_mitya_hidden")} [Восьмое имя не пиши.]
    ~ set("birch_mitya", "hidden")
    ~ addrel("agafya", "trust", 2)
    ~ go("s4")
* [Пиши всех.]
    ~ set("birch_mitya", "written")
- -> DONE
```
- Имя узла:
  - сцена шага квеста — `<квест>_<шаг>`;
  - разговор вне квеста — `talk_<npc>`;
  - предложение квеста — `offer_<квест>` (внутри `~ startq("<квест>")`);
  - отложенное событие — `ev_<id>`;
  - начало главы — `chapter_N_start`.
- **Теги обязательны:** `scene`, `place`, `time`, `who`, `trigger`, `next`. Из них собирается `docs/SCENES.md`.
- Реплика начинается с говорящего:
  - id NPC из `story.json` (`agafya:`);
  - `hero:` — герой;
  - `narr:` — рассказ;
  - `act:` — что человек делает (ремарка).
- Род героя: `{fem():пришла|пришёл}`. Имя героя: `{hero()}`.
- Каждый выбор кончается `-> DONE`, переходом или сборкой `-`. Компилятор ругается на «висящие» концы.
- Выбор, который нельзя сделать из-за забытой памяти, показывается зачёркнутым тегом `#struck`.
- Улики расследования: шаг `investigate` с `"clues": true` (метки вокруг места) или
  `"spots": [...]` (по метке в каждом месте). У каждой метки своя сцена `.c1`, `.c2`, `.c3`.
  Основной узел шага — итог, он играется после последней улики.
- Не использовать `VAR` для состояния игры. Состояние — через внешние функции. Исключение — счётчик
  внутри одной сцены, как `council_score` в гл.1.

## Внешние функции (полный список и описания — в `common.ink`)
- **Чтение:**
  - `flag`, `is`;
  - `rep`, `tier`;
  - `trust`, `fear`, `respect`, `hostile`;
  - `knows`, `heard`, `did`, `rumor_on`;
  - `has`, `gold`, `echoes`;
  - `promised`, `debt`, `qstate`;
  - `chapter`, `day`, `night`;
  - `cls`, `school`, `clarity`, `card`, `lost`, `dream`, `lvl`;
  - `fem`, `hero`, `npcstate`, `met`, `val`.
- **Изменение:**
  - флаги и отношения: `set`, `inc`, `addrep`, `addrel`;
  - знание и слухи: `learn`, `tell`, `deed`, `deed_public`, `rumor`, `refute`;
  - слово и долги: `promise`, `keep`, `breakp`, `release`, `debt_add`, `paydebt`, `betray`;
  - отложенные последствия: `later`, `at_chapter`;
  - предметы и деньги: `give`, `take`, `pay`, `earn`, `echo`, `xp`;
  - квесты: `fx`, `go`, `startq`, `failq`;
  - мир и интерфейс: `trade`, `skip`, `toast`, `sfx`, `settrade`, `chapter_to`, `npc_to`.

Все id поступков, слухов, фактов, событий, предметов и торговцев обязаны быть в `consequences.json`.
Валидатор это проверяет.

## Квест (story.json)
```json
{ "id": "c2_birch", "title": "Береста", "chain": "main", "chapter": 2, "giver": "ivar", "after": ["c1_council"],
  "summary": "…", "auto": false, "hidden": false, "endsChapter": 2,
  "steps": [ { "id": "s1", "type": "talk", "target": "ivar", "where": "village", "scene": "c2_birch_s1", "text": "Цель шага для журнала" } ],
  "fail": { "if": { "day_gte": 9 }, "text": "…", "effects": ["rep:village:-5"], "then": [] },
  "outcomes": [ { "if": { "birch_mitya": "hidden" }, "text": "Итог для журнала", "rewards": { "xp": 80, "echoes": 10 }, "worldEffects": ["card+:quest:q_c2_birch:3"] }, { "if": {}, "text": "…" } ] }
```
Типы шагов:
- `talk`, `choose` — `target` = id NPC или `self`;
- `goto`, `night`, `wait` — `target` = место;
- `investigate` — `count`, а также `clues` или `spots`;
- `defeat` — `target` = тип врага, `count`; `spawn`, `spawnName`, `tint` — враги появятся рядом;
- `collect` — `target` = `echo` или предмет;
- `enter` — `crypt1`/`crypt2`/`crypt3`/`mine1`;
- `cast` — школа: `fire`/`ice`/`holy`/`shadow`;
- `sacrifice` — тип карты памяти и `count` = минимальный вес;
- `escort` — NPC идёт за героем до `where`;
- `use` — метка-действие;
- `count` — флаг `target` дорастает до `count`, или выполнено `orIf`.

Места:
- канонические: `village`, `ford`, `village_well`, `tavern`, `tavern_cellar`, `boat`, `ashes`,
  `far_bank`, `oldgrave`, `crypt1..3`, `trollcamp`, `ruins`, `tower`, `witchhut`, `mine`, `mine1`,
  `camp`, `menhir`, `hamlet_dry`;
- природные: `wild:forest|steppe|lake|meadow|any`;
- свои места: `story.json → places: { "elder_house": { "at": "village", "dx": 9, "dy": 9, "r": 200 } }`.

## Условия
- Флаги: `{ "flag": значение }`; суффиксы `_not`, `_in`, `_gte`, `_lte`, `_lt`, `_gt`.
- Сочетания: `all`, `any`, `not`.
- Ключи по умолчанию «не меньше»:
  - `rep_<фракция>`;
  - `trust_|fear_|respect_|hostility_<npc>`;
  - `debt_<npc>`;
  - `chapter`, `day`, `clarity`, `gold`, `bond_<npc>`.
- Состояния:
  - `promise_<id>` → `open|kept|broken|released|none`;
  - `q_<квест>` → `none|active|done|failed`;
  - `step_<квест>` → id шага;
  - `npc_<id>` → состояние NPC.
- Особые ключи: `knows`, `heard` (`[npc, id]`), `rumor`, `did`, `item`, `card`, `night`.

## Мировые эффекты (worldEffects, `fx()`)
- Старые:
  - `card+:тип:id:вес`, `card-:id`;
  - `bond:npc:+n`, `npc:id:состояние`, `npcKnows:id:false`;
  - `flag:k=v`, `unlock:квест`, `lock:квест`;
  - `greeting:npc:ключ`, `line:npc:ключ`;
  - `shop:торговец:флаг`;
  - `spawn:тип:где:xN`, `fog:где:clear|regrow`, `biome:тип:grow|shrink:n`;
  - `item:id`, `perk:id:n`;
  - `sacrifice:тип:id`, `restore`, `remove:last_gift`;
  - `ending:resolve`.
- Новые:
  - `rep:фракция:n`, `rel:npc:вид:n`;
  - `deed:id[:public]`, `rumor:id`, `refute:id`, `learn:факт`;
  - `promise:id:npc`, `keep:id`, `break:id`;
  - `later:дни:событие`, `atchapter:N:событие`;
  - `start:квест`, `fail:квест`;
  - `scene:узел`;
  - `trade:торговец:флаг[:значение]`, `take:предмет`, `inc:флаг:n`.

## Обязательные правила сюжета
1. **Нет тупиков.**
   - Основной квест не проваливается без продолжения: `fail.then`.
   - Провал побочного не ломает основную линию.
   - Критичный предмет всегда имеет второй путь получения.
2. **Последствия видимы.** Если выбор важен, он записывается флагом или поступком и где-то потом
   откликается: в хабе, на Сходе, у торговца, в эпилоге.
3. **Особые реакции в хабах** (каждая один раз, затем обычный разговор):
   - выполненный или проваленный квест;
   - нарушенное обещание;
   - полученный предмет;
   - испорченные отношения с фракцией;
   - раскрытая тайна.
4. **Канон не переписывать.** Новое помечать в документах главы как [Н]. Старые реплики из
   `legacy.ink` не удалять: их можно дополнять, помечая `// [гл.N]`.
5. **Тон** — `STORY_BIBLE.md §9`: коротко, бытово, без пафоса и без «избранного».
