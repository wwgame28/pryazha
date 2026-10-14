// ОБЩЕЕ: внешние функции игры. В игре их привязывает narrative.js;
// в Inky работают запасные версии ниже (значения по умолчанию).
// Документация переменных: docs/CHOICE_FLAGS.md

EXTERNAL flag(k)
EXTERNAL is(k)
EXTERNAL rep(fac)
EXTERNAL tier(fac)
EXTERNAL trust(n)
EXTERNAL fear(n)
EXTERNAL respect(n)
EXTERNAL hostile(n)
EXTERNAL knows(fact)
EXTERNAL heard(n, id)
EXTERNAL did(id)
EXTERNAL rumor_on(id)
EXTERNAL has(id)
EXTERNAL gold()
EXTERNAL echoes()
EXTERNAL promised(id)
EXTERNAL debt(n)
EXTERNAL qstate(q)
EXTERNAL chapter()
EXTERNAL day()
EXTERNAL night()
EXTERNAL cls()
EXTERNAL school()
EXTERNAL clarity()
EXTERNAL card(id)
EXTERNAL lost(id)
EXTERNAL dream(id)
EXTERNAL lvl()
EXTERNAL fem()
EXTERNAL hero()
EXTERNAL npcstate(id)
EXTERNAL met(id)
EXTERNAL val(k)
EXTERNAL set(k, v)
EXTERNAL inc(k, n)
EXTERNAL addrep(fac, n)
EXTERNAL addrel(n, kind, d)
EXTERNAL learn(fact)
EXTERNAL tell(n, id)
EXTERNAL deed(id)
EXTERNAL deed_public(id)
EXTERNAL rumor(id)
EXTERNAL refute(id)
EXTERNAL promise(id, n)
EXTERNAL keep(id)
EXTERNAL breakp(id)
EXTERNAL release(id)
EXTERNAL debt_add(n, amount, days)
EXTERNAL paydebt(n)
EXTERNAL betray(id)
EXTERNAL later(days, ev)
EXTERNAL at_chapter(ch, ev)
EXTERNAL give(id)
EXTERNAL take(id)
EXTERNAL pay(n)
EXTERNAL earn(n)
EXTERNAL echo(n)
EXTERNAL xp(n)
EXTERNAL fx(w)
EXTERNAL go(step)
EXTERNAL startq(q)
EXTERNAL failq(q)
EXTERNAL trade(m)
EXTERNAL learnpath(path)
EXTERNAL skip(when)
EXTERNAL toast(t)
EXTERNAL sfx(k)
EXTERNAL settrade(m, k, v)
EXTERNAL chapter_to(n)
EXTERNAL npc_to(id, st)

=== function is(k) ===
// флаг задан и истинен
~ return false
=== function flag(k) ===
// значение флага (0, если не задан)
~ return 0
=== function rep(fac) ===
// репутация фракции −100…100
~ return 0
=== function tier(fac) ===
// ступень репутации: enemy/dislike/stranger/own/close
~ return "stranger"
=== function trust(n) ===
// доверие NPC 0–10
~ return 0
=== function fear(n) ===
// страх NPC 0–10
~ return 0
=== function respect(n) ===
// уважение NPC 0–10
~ return 0
=== function hostile(n) ===
// вражда NPC 0–10
~ return 0
=== function knows(fact) ===
// герой знает факт
~ return false
=== function heard(n, id) ===
// NPC знает о поступке/факте/слухе
~ return false
=== function did(id) ===
// герой совершил поступок
~ return false
=== function rumor_on(id) ===
// слух жив
~ return false
=== function has(id) ===
// у героя есть сюжетный предмет
~ return false
=== function gold() ===
// золото
~ return 0
=== function echoes() ===
// Отголоски
~ return 0
=== function promised(id) ===
// состояние обещания: none/open/kept/broken/released
~ return "none"
=== function debt(n) ===
// долг перед NPC
~ return 0
=== function qstate(q) ===
// состояние квеста: none/active/done/failed
~ return "none"
=== function chapter() ===
// текущая глава
~ return 1
=== function day() ===
// день (с 1)
~ return 1
=== function night() ===
// сейчас ночь
~ return false
=== function cls() ===
// класс героя
~ return "warrior"
=== function school() ===
// школа магии героя
~ return "phys"
=== function clarity() ===
// Ясность
~ return 20
=== function card(id) ===
// есть карта памяти
~ return false
=== function lost(id) ===
// карта памяти отдана Забвению
~ return false
=== function dream(id) ===
// есть Сон (mitriy, lesya, …)
~ return false
=== function lvl() ===
// уровень
~ return 1
=== function fem() ===
// герой — женщина
~ return false
=== function hero() ===
// имя героя
~ return "Мокрый"
=== function npcstate(id) ===
// состояние NPC: home/gone/follower/moved:…
~ return "home"
=== function met(id) ===
// герой встречал NPC
~ return false
=== function val(k) ===
// значение по ключу условий story.js (bond_*, clarity, gold, …)
~ return 0
=== function set(k, v) ===
// задать флаг
~ return
=== function inc(k, n) ===
// прибавить к числовому флагу
~ return
=== function addrep(fac, n) ===
// изменить репутацию фракции
~ return
=== function addrel(n, kind, d) ===
// изменить отношение NPC: trust/fear/respect/hostile
~ return
=== function learn(fact) ===
// герой узнал факт
~ return
=== function tell(n, id) ===
// герой рассказал NPC о факте/поступке
~ return
=== function deed(id) ===
// поступок героя (свидетели — участники сцены и NPC рядом)
~ return
=== function deed_public(id) ===
// поступок при всём поселении
~ return
=== function rumor(id) ===
// пустить/усилить слух
~ return
=== function refute(id) ===
// опровергнуть слух
~ return
=== function promise(id, n) ===
// дать слово NPC
~ return
=== function keep(id) ===
// сдержать слово
~ return
=== function breakp(id) ===
// нарушить слово
~ return
=== function release(id) ===
// NPC освобождает от слова
~ return
=== function debt_add(n, amount, days) ===
// взять в долг (срок в днях, 0 — без срока)
~ return
=== function paydebt(n) ===
// отдать долг: сумма, −1 если не хватает, 0 если долга нет
~ return 0
=== function betray(id) ===
// предательство (описано в deeds)
~ return
=== function later(days, ev) ===
// отложенное последствие через N дней
~ return
=== function at_chapter(ch, ev) ===
// отложенное последствие в начале главы
~ return
=== function give(id) ===
// дать герою сюжетный предмет
~ return
=== function take(id) ===
// забрать сюжетный предмет
~ return
=== function pay(n) ===
// заплатить: false, если не хватает
~ return true
=== function earn(n) ===
// получить золото
~ return
=== function echo(n) ===
// получить Отголоски
~ return
=== function xp(n) ===
// получить опыт
~ return
=== function fx(w) ===
// мировой эффект в формате story.json (card+:…, npc:…, unlock:…)
~ return
=== function go(step) ===
// следующий шаг квеста после сцены
~ return
=== function startq(q) ===
// начать квест
~ return
=== function failq(q) ===
// провалить квест
~ return
=== function learnpath(path) ===
// выучить путь (класс): warrior, ranger, pyro, cryo, necro, priest, weaver, hollow. Прежний путь забывается
~ return
=== function trade(m) ===
// открыть торговлю после сцены
~ return
=== function skip(when) ===
// промотать время: night/dawn
~ return
=== function toast(t) ===
// всплывающая строка
~ return
=== function sfx(k) ===
// звук
~ return
=== function settrade(m, k, v) ===
// флаг торговца
~ return
=== function chapter_to(n) ===
// перейти к главе
~ return
=== function npc_to(id, st) ===
// состояние NPC (gone, moved:village, follower)
~ return
