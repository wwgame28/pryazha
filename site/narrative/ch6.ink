// Глава 6: «Ночь Перевязки». Новый материал; узлы m10/m11 заменяют одноимённые узлы legacy_ch6.ink.

=== chapter_6_start ===
# scene: chapter_6_start
# place: Ольховый Брод, колодец
# time: рассвет после Красной зимы
# who: ivar, vesna
# trigger: переход после m9
# next: c6_allies_s1
narr: У колодца стоят трое. Один в телогрейке, одна в ситцевом платке, один совсем без лица — снегом его стёрло.
act: Ведро стукается о сруб. Никто не берёт его за ручку.
ivar: Не лезут. Ждут.
vesna: Я им каши вынесла. Поставила, а потом думаю: мёртвым-то зачем каша?
ivar: Живым тоже не до каши. К кладбищу все идут. И свои, и те, кто вчера друг другу горло мерил.
{ flag("truth") == "public":
    ivar: После Схода каждый знает, чего боится. Оттого ещё хуже. Но прятаться уже некуда.
}
{ flag("truth") == "private":
    ivar: Мы знаем, а остальные смотрят. Будто ждут, кто первый соврёт.
}
{ flag("truth") == "burned":
    ivar: Бумага сгорела. А запах всё равно по деревне ходит.
}
{ flag("truth") == "sold":
    ivar: Башня увезла правду в ящике. Не думал, что ящик может так давить на грудь.
}
~ learn("f_c6_graves_wait")
~ rumor("r_c6_dead_at_wells")
-> DONE

=== c6_allies_s1 ===
# scene: c6_allies_s1
# place: Ольховый Брод, площадь у колодца
# time: утро
# who: ivar, vesna
# trigger: квест c6_allies «Кто придёт», шаг s1: собраться у колодца
# next: s2 — решить, кого звать вниз
ivar: Я могу дать мужиков. Они дверь заколотят. А дальше что? Колодцы тоже заколотить?
vesna: Зови не тех, кто громче. Зови тех, кто помнит, за чью руку держался.
narr: До Ночи Перевязки ещё есть время на одну честную работу: позвать людей, которым есть что сказать внизу.
~ go("s2")
-> DONE

=== c6_allies_s2 ===
# scene: c6_allies_s2
# place: Ольховый Брод, от колодца к Тихой Стороне
# time: утро
# who: agafya, ulita, prosha, kudel, iskra, sivy, gurdym
# trigger: квест c6_allies «Кто придёт», шаг s2: собрать держащих
# next: s3 — сверить, кто остался рядом
narr: Не всем надо идти. Но каждый, кого позовёшь, спустится не за тебя — за своего.
{ not is("c6_holder_agafya") and flag("agafya_fate") != "dead":
    * [Позвать Агафью.] 
        agafya: Я думала, на старости лет самое трудное — дрова таскать. Видно, ошибалась.
        ~ set("c6_holder_agafya", true)
        ~ inc("c6_holders_called", 1)
        -> c6_allies_s2
}
{ not is("c6_holder_ulita"):
    * [Позвать Улиту.] 
        ulita: В склеп? Так Остап там и живёт. То есть... служит. Я ему пирожок заверну.
        ~ set("c6_holder_ulita", true)
        ~ inc("c6_holders_called", 1)
        -> c6_allies_s2
}
{ not is("c6_holder_prosha"):
    * [Позвать Прошу.] 
        prosha: Внизу я умею не бояться. Почти. Мама бы пошла, значит, и я пойду.
        ~ set("c6_holder_prosha", true)
        ~ inc("c6_holders_called", 1)
        -> c6_allies_s2
}
{ not is("c6_holder_kudel") and flag("kudel_fate") != "arrested":
    * [Позвать Кудель.] 
        kudel: Пойду, дитятко. Нитке одной туда страшно, а мне уже всё равно страшно.
        ~ set("c6_holder_kudel", true)
        ~ inc("c6_holders_called", 1)
        -> c6_allies_s2
}
{ not is("c6_holder_iskra"):
    * [Позвать Искру.] 
        iskra: Я не обещаю не орать. Но факел оставлю. Сегодня руками хватит натворить.
        ~ set("c6_holder_iskra", true)
        ~ inc("c6_holders_called", 1)
        -> c6_allies_s2
}
{ not is("c6_holder_sivy"):
    * [Позвать Сивого.] 
        sivy: Свисток взял. Стариковское оружие. Иногда сильнее копья.
        ~ set("c6_holder_sivy", true)
        ~ inc("c6_holders_called", 1)
        -> c6_allies_s2
}
{ not is("c6_holder_gurdym") and flag("gurdym") != "dead":
    * [Позвать Гурдыма.] 
        gurdym: Маленький Морвен там. Большой Морвен там. Пойду обоим скажу: хватит сидеть в сырости.
        ~ set("c6_holder_gurdym", true)
        ~ inc("c6_holders_called", 1)
        -> c6_allies_s2
}
* { val("c6_holders_called") >= 3 } [Нас достаточно. Пора идти.] 
    ~ go("s3")
    -> DONE
* [Пойдём с теми, кто сам решился.] 
    ~ go("s3")
    -> DONE

=== c6_allies_s3 ===
# scene: c6_allies_s3
# place: Ольховый Брод, у амбара Гостены
# time: полдень
# who: ivar, gostena, tur, federot
# trigger: квест c6_allies «Кто придёт», шаг s3: закрыть старые счета
# next: конец квеста / c6_siege
act: Гостена сидит на мешке с мукой и считает не монеты, а людей, проходящих к кладбищу.
{ debt("gostena") > 0 and gold() >= debt("gostena"):
    * [Вернуть Гостене долг, пока есть кому считать.] 
        ~ paydebt("gostena")
        ~ set("c6_debt", "paid")
        ~ deed("d_c6_paid_gostena")
        gostena: Ну вот. А я думала, конец света — это когда должники становятся честными. Видно, ошиблась.
        -> c6_allies_s3_after_debt
}
{ debt("gostena") > 0:
    * [Сказать Гостене правду: сейчас не заплачу.] 
        ~ set("c6_debt", "unpaid")
        gostena: Ладно. Запишу. Если мир останется, напомню. Если нет — и расписка не нужна.
        -> c6_allies_s3_after_debt
}
* { debt("gostena") <= 0 } [Попросить Гостену беречь склад для живых.] 
    ~ set("c6_debt", "clear")
    gostena: Берегу. Соль, мука, три свечи. Богатство, стало быть.
    -> c6_allies_s3_after_debt

=== c6_allies_s3_after_debt ===
# scene: c6_allies_s3_after_debt
# place: Ольховый Брод, у амбара Гостены
# time: полдень
# who: ivar, tur, federot
# trigger: короткий отклик старых обещаний и долгов
# next: конец квеста / c6_siege
{ promised("p_tur_silence") == "broken":
    tur: Молот я всё равно взял. Не за тебя. За тех, кому дверь держать.
}
{ promised("p_agafya_knots") == "broken":
    ivar: Про узелки все уже знают. Не ты один болтливый был. Но Агафья тебе это ещё припомнит.
}
{ flag("efim") == "named" or flag("efim") == "federot_named":
    federot: Я к колодцу не пойду. Сети за мной. А если Чадовы полезут — веслом по зубам. Ефим бы так сделал.
    ~ set("c6_ally_federot", true)
}
{ flag("shurshok") == "freed" or flag("shurshok") == "guide":
    narr: На крыше амбара шуршит мелкая возня. Гоблины принесли верёвки и ни на кого не смотрят.
    ~ set("c6_ally_goblins", true)
}
{ val("c6_holders_called") >= 3:
    ~ deed("d_c6_called_holders")
    ~ set("c6_allies", "holders")
    ivar: Ладно. Не войско. Но, может, и не надо войско.
}
{ val("c6_holders_called") < 3:
    ~ set("c6_allies", "thin")
    ivar: Мало нас. Значит, каждому придётся говорить за двоих.
}
~ go("end")
-> DONE

=== c6_siege_s1 ===
# scene: c6_siege_s1
# place: Тихая Сторона, ворота кладбища
# time: сумерки
# who: yasna, ugar, kudel, ivar
# trigger: квест c6_siege «Тихая Сторона», шаг s1: прийти к воротам
# next: s2 — словом пройти осаду или прорваться
narr: У ворот теснее, чем в склепе. Белые лампы Архива, чадящие факелы, веретено Кудели и мужицкие доски лежат в одной грязи.
act: Ясна держит лампу двумя руками. Угар держит пустые руки. Ивар держит гвозди в шапке.
yasna: Заморозим вход до утра. Тогда никто не ошибётся.
ugar: Ошибка уже двести лет сидит внизу. Огонь хоть не врёт.
kudel: А вы оба всё хотите, чтоб нитка не шевелилась. Нитка живая, чудаки.
{ flag("chad_fate") == "stopped":
    narr: Чада нет. Его ревнители стоят поодаль и смотрят на Угара, как дети на отца, который вдруг заговорил тихо.
}
{ flag("chad_fate") == "fled":
    narr: Чада нет. От этого факелы кажутся злее: хозяина у злости не осталось.
}
{ flag("chad_fate") == "dead":
    narr: Чада нет. Никто не произносит его имени, но каждый видит пустое место у костра.
}
* [Сказать всем: «Никто не отнимет у вас мёртвых. Но и никто не будет решать за них».] 
    ~ set("c6_siege_route", "words")
    ~ set("c6_siege_passed", 1)
    ~ deed_public("d_c6_siege_words")
    ~ go("s2")
    -> DONE
* [Прорваться к двери, пока спорят.] 
    ~ set("c6_siege_route", "steel")
    ~ set("c6_siege_passed", 1)
    ~ startq("c6_siege_battle")
    ~ deed("d_c6_siege_steel")
    ~ go("s2")
    -> DONE

=== c6_siege_s2 ===
# scene: c6_siege_s2
# place: Тихая Сторона, у склепа
# time: сумерки
# who: yasna, ugar, kudel, ivar
# trigger: квест c6_siege «Тихая Сторона», шаг s2: пройти заслон
# next: s3 — назвать цену прохода
{ flag("c6_siege_route") == "words":
    yasna: Я всё ещё считаю это безумием. Но безумие хотя бы расписано по людям, а не по полкам.
    ugar: Я огонь убрал. Не потому, что стал добрый. Потому что руки помнят, чем он кончается.
    kudel: Вот и ладно. Спорьте потом. Ногами шевелите сейчас.
}
{ flag("c6_siege_route") == "steel":
    narr: Драка тянется у лестницы. Ты уже у двери, но сзади ещё звенит чужое железо.
    ivar: Дверь цела. Это уже лучше, чем я ждал. Только вернись, если сможешь.
}
{ flag("yasna_childhood") == "returned":
    yasna: Я помню дым. Не весь. Достаточно, чтобы не прятать его во льду.
}
{ flag("yasna_childhood") == "sealed":
    yasna: Я не помню, зачем боюсь огня. Но знаю, что не хочу решать из этого страха.
}
{ flag("ugar_fate") == "atoning":
    ugar: Я останусь снаружи. Чтоб мои не полезли за нами. Это немного, но больше, чем я умею.
    ~ set("c6_ally_ugar", true)
}
~ go("s3")
-> DONE

=== c6_siege_battle_s1 ===
# scene: c6_siege_battle_s1
# place: Тихая Сторона, у лестницы в склеп
# time: сумерки
# who: —
# trigger: добровольный боевой путь c6_siege_battle: отбиться от недопетых
# next: конец побочного квеста
narr: Недопетые лезут к лестнице не от злобы — им кажется, что там наверху их всё ещё ждут. Ты оттесняешь их обратно, пока живые спорят.
narr: Когда последний меч опускается, кто-то из мёртвых шепчет: «Извини». Это хуже победного крика.
-> DONE

=== c6_siege_s3 ===
# scene: c6_siege_s3
# place: Тихая Сторона, лестница в склеп
# time: сумерки
# who: ivar, kudel
# trigger: квест c6_siege «Тихая Сторона», шаг s4: решить, кому держать дверь
# next: конец квеста / c6_hall
ivar: Я снаружи останусь. Не потому, что боюсь. Боюсь. Но дверь никто вместо меня не подержит.
kudel: А ты, дитятко, вниз. Там не война. Там работа, которую все оттягивали двести лет.
* [Попросить их держать дверь для тех, кто захочет уйти.] 
    ~ set("c6_siege_door", "open")
    ivar: Держать дверь — это я умею. Открывать, стало быть, тоже научусь.
    ~ go("end")
    -> DONE
* [Попросить никого не пускать следом.] 
    ~ set("c6_siege_door", "barred")
    ivar: Заколочу. Только не насовсем. Насовсем я уже пробовал.
    ~ go("end")
    -> DONE

=== c6_hall_s1 ===
# scene: c6_hall_s1
# place: склеп, зал имён
# time: ночь
# who: —
# trigger: квест c6_hall «Зал имён», шаг s1: войти в первый ярус
# next: s2 — выслушать держащих
narr: На стенах не полки — ленты. На каждой имя, рука, год. Некоторые ленты пусты: имя ушло, а место помнит ладонь.
act: Одна береста шевелится от сквозняка. На ней почерк Богдана Ольхи.
{ flag("ivar_list") == "burned":
    narr: Списка больше нет. Но береста под ногами помнит, как её писали, и не прощает огня.
}
{ flag("truth") == "public":
    narr: Среди лент лежат Лука, Дарья, Ерофеевна и Марфа. Их имена уже произносили наверху. Здесь от этого не легче, но тише.
}
{ flag("truth") != "public":
    narr: Среди лент лежат Лука, Дарья, Ерофеевна и Марфа. Ты называешь их про себя, чтобы хотя бы здесь они не были «тем пожаром».
}
{ flag("efim") != "named" and flag("efim") != "federot_named":
    narr: На мокрой ленте проступает: «Ефим Рябина». Из темноты будто тянет речной ил.
}
{ flag("gordey") == "keep":
    narr: У самого пола дрожит чужая нитка Гордея. Весна всё ещё держит её обеими руками, хотя её здесь нет.
}
~ learn("f_c6_hall_names")
~ set("c6_hall_met_bogdan", true)
~ set("c6_hall_met_marfa", true)
~ go("s2")
-> DONE

=== c6_hall_s2 ===
# scene: c6_hall_s2
# place: склеп, зал имён
# time: ночь
# who: agafya, ulita, prosha, kudel, iskra, sivy, gurdym
# trigger: квест c6_hall «Зал имён», шаг s2: дать держащим сказать своё
# next: s3 — идти к Морвену
narr: Те, кого ты позвал, остановились каждый у своей ленты. Никто не смотрит на тебя: решать всё равно им.
{ is("c6_holder_agafya") and not is("c6_choice_agafya"):
    * [Подойти к Агафье и Митрию.] 
        -> c6_holder_agafya
}
{ is("c6_holder_ulita") and not is("c6_choice_ulita"):
    * [Подойти к Улите и Остапу.] 
        -> c6_holder_ulita
}
{ is("c6_holder_prosha") and not is("c6_choice_prosha"):
    * [Подойти к Проше и Марфе.] 
        -> c6_holder_prosha
}
{ is("c6_holder_kudel") and not is("c6_choice_kudel"):
    * [Подойти к Кудели и её ученику.] 
        -> c6_holder_kudel
}
{ is("c6_holder_iskra") and not is("c6_choice_iskra"):
    * [Подойти к Искре и Лёсе.] 
        -> c6_holder_iskra
}
{ is("c6_holder_sivy") and not is("c6_choice_sivy"):
    * [Подойти к Сивому и Сеньке.] 
        -> c6_holder_sivy
}
{ is("c6_holder_gurdym") and not is("c6_choice_gurdym"):
    * [Подойти к Гурдыму и юному Морвену.] 
        -> c6_holder_gurdym
}
* [Не подгонять никого. Идти к Морвену.] 
    ~ go("s3")
    -> DONE

=== c6_holder_agafya ===
# scene: c6_holder_agafya
# place: склеп, зал имён
# time: ночь
# who: agafya
# trigger: короткий отклик c6_holders: Митрий
# next: c6_hall_s2
agafya: Митя, ты опять в мокрых сапогах. Вот ведь. Сорок лет ему, а я всё ругаюсь.
* [Сказать: «Развяжи. Он и так дорогу знает».] 
    agafya: Знает. А я — нет. Ладно. Пора и мне выучить.
    ~ set("c6_choice_agafya", true)
    ~ set("c6_holder_agafya", "released")
    ~ inc("c6_holders_released", 1)
    ~ fx("card-:d_mitriy")
    -> c6_hall_s2
* [Сказать: «Подержи ещё. Это не трусость».] 
    agafya: Не трусость. Но рукав-то истончился, милок.
    ~ set("c6_choice_agafya", true)
    ~ set("c6_holder_agafya", "kept")
    ~ inc("c6_holders_kept", 1)
    ~ fx("card+:dream:d_mitriy:5")
    -> c6_hall_s2

=== c6_holder_ulita ===
# scene: c6_holder_ulita
# place: склеп, зал имён
# time: ночь
# who: ulita, ostap
# trigger: короткий отклик c6_holders: Остап
# next: c6_hall_s2
ulita: Ты же обещал написать. И написал. Шестьдесят лет писал, дурень.
ostap: Почта нынче надёжная. Просто адрес длинный.
* [Попросить Улиту отпустить письмо, а не человека.] 
    ulita: Письмо я в печку не брошу. Сложу в ящик. А ты ступай, солдат.
    ~ set("c6_choice_ulita", true)
    ~ set("c6_holder_ulita", "released")
    ~ inc("c6_holders_released", 1)
    ~ fx("card-:d_ostap")
    -> c6_hall_s2
* [Предложить им оставить одно письмо на завтра.] 
    ulita: На завтра — можно. Завтра всегда было наше.
    ~ set("c6_choice_ulita", true)
    ~ set("c6_holder_ulita", "kept")
    ~ inc("c6_holders_kept", 1)
    ~ fx("card+:dream:d_ostap:5")
    -> c6_hall_s2

=== c6_holder_prosha ===
# scene: c6_holder_prosha
# place: склеп, зал имён
# time: ночь
# who: prosha
# trigger: короткий отклик c6_holders: Марфа
# next: c6_hall_s2
prosha: У окна у неё герань стояла. Красная. Вот это я помню. Остальное — как шахта после обвала.
* [Сказать: «Поставь ей окно наверху. Не держи под землёй».] 
    prosha: Поставлю. И герань посажу, хоть мороз съест.
    ~ set("c6_choice_prosha", true)
    ~ set("c6_holder_prosha", "released")
    ~ inc("c6_holders_released", 1)
    ~ fx("card-:d_marfa")
    -> c6_hall_s2
* [Сказать: «Возьми этот свет с собой».] 
    prosha: Возьму. Только не как камень. Как окно.
    ~ set("c6_choice_prosha", true)
    ~ set("c6_holder_prosha", "kept")
    ~ inc("c6_holders_kept", 1)
    ~ fx("card+:dream:d_marfa:5")
    -> c6_hall_s2

=== c6_holder_kudel ===
# scene: c6_holder_kudel
# place: склеп, зал имён
# time: ночь
# who: kudel
# trigger: короткий отклик c6_holders: ученик Кудели
# next: c6_hall_s2
kudel: Имени не помню. Голос помню. Он смеялся носом, будто чайник кипит.
* [Сказать: «Назови хоть то, что осталось».] 
    kudel: Мой смешной. Мой ученик. Иди, куда я тебя не пустила.
    ~ set("c6_choice_kudel", true)
    ~ set("c6_holder_kudel", "released")
    ~ inc("c6_holders_released", 1)
    ~ set("c6_stitch_loose", true)
    ~ fx("card-:d_weaver")
    -> c6_hall_s2
* [Сказать: «Пой тихо. Нить ещё нужна».] 
    kudel: Нужна. Только не путай нужду с любовью, дитятко.
    ~ set("c6_choice_kudel", true)
    ~ set("c6_holder_kudel", "kept")
    ~ inc("c6_holders_kept", 1)
    ~ fx("card+:dream:d_weaver:5")
    -> c6_hall_s2

=== c6_holder_iskra ===
# scene: c6_holder_iskra
# place: склеп, зал имён
# time: ночь
# who: iskra
# trigger: короткий отклик c6_holders: Лёся
# next: c6_hall_s2
iskra: Она бы сейчас сказала: «Брошку-то верни». И была бы права.
* [Сказать: «Сестра — не долг. Отпусти её домой».] 
    iskra: Домой. Не в огонь. Вот этого я никак не могла выговорить.
    ~ set("c6_choice_iskra", true)
    ~ set("c6_holder_iskra", "released")
    ~ inc("c6_holders_released", 1)
    ~ fx("card-:d_lesya")
    -> c6_hall_s2
* [Сказать: «Расскажи ей о себе ещё раз».] 
    iskra: Ещё раз — можно. Только без вины. Попробую.
    ~ set("c6_choice_iskra", true)
    ~ set("c6_holder_iskra", "kept")
    ~ inc("c6_holders_kept", 1)
    ~ fx("card+:dream:d_lesya:5")
    -> c6_hall_s2

=== c6_holder_sivy ===
# scene: c6_holder_sivy
# place: склеп, зал имён
# time: ночь
# who: sivy
# trigger: короткий отклик c6_holders: Сенька
# next: c6_hall_s2
sivy: Свисток вырезал криво. Он свистел ещё хуже. Хороший был пастушок.
* [Сказать: «Пусть свисток останется тебе. Сеньку отпусти».] 
    sivy: Останется. Дерево не держит, если ладонь разжать.
    ~ set("c6_choice_sivy", true)
    ~ set("c6_holder_sivy", "released")
    ~ inc("c6_holders_released", 1)
    ~ fx("card-:d_shepherd")
    -> c6_hall_s2
* [Сказать: «Свистни ему, чтобы не потерялся».] 
    sivy: Один раз. Не звать. Просто попрощаться.
    ~ set("c6_choice_sivy", true)
    ~ set("c6_holder_sivy", "kept")
    ~ inc("c6_holders_kept", 1)
    ~ fx("card+:dream:d_shepherd:5")
    -> c6_hall_s2

=== c6_holder_gurdym ===
# scene: c6_holder_gurdym
# place: склеп, зал имён
# time: ночь
# who: gurdym
# trigger: короткий отклик c6_holders: юный Морвен
# next: c6_hall_s2
gurdym: Маленький Морвен пел фальшиво. Большой Морвен забыл, что можно смеяться.
* [Сказать: «Отпусти малого. Пусть большой вспомнит сам».] 
    gurdym: Отпускаю. Память не рыба. В реку бросил — не значит утонула.
    ~ set("c6_choice_gurdym", true)
    ~ set("c6_holder_gurdym", "released")
    ~ inc("c6_holders_released", 1)
    ~ fx("card-:d_morven")
    -> c6_hall_s2
* [Сказать: «Напомни ему смешное. Пусть не один сидит».] 
    gurdym: Это могу. Это я умею всю жизнь.
    ~ set("c6_choice_gurdym", true)
    ~ set("c6_holder_gurdym", "kept")
    ~ inc("c6_holders_kept", 1)
    ~ fx("card+:dream:d_morven:5")
    -> c6_hall_s2

=== c6_hall_s3 ===
# scene: c6_hall_s3
# place: склеп, лестница к нижнему залу
# time: ночь
# who: ostap
# trigger: квест c6_hall «Зал имён», шаг s3: подойти к нижнему залу
# next: конец квеста / m10
ostap: Слышишь? Тишина там не пустая. Она просто очень давно работает.
{ val("c6_holders_released") > 0:
    narr: Несколько лент стали легче. Не исчезли — перестали тянуть руки.
}
{ val("c6_holders_kept") > 0:
    narr: Несколько лент теплеют от голоса. Держать можно по-разному; это всё равно тяжело.
}
~ set("c6_hall_done", true)
~ go("end")
-> DONE

=== m10_s2 ===
# scene: m10_s2
# place: склеп, нижний зал
# time: ночь
# who: ostap
# trigger: квест m10 «Двести лет тишины», шаг s2: последнее слово Остапа
# next: s3 — говорить с Морвеном
ostap: Слышь. Если выберешь плохо — не выбирай один. Ну, то есть всё равно ты выберешь. Просто помни: у каждого тут была кружка, работа, дурная привычка.
ostap: Передай Улите, что я жив не был. А любил — был. Она разберётся.
{ flag("c6_holder_ulita") == "released":
    ostap: И письмо у неё осталось. Этого достаточно.
}
-> DONE

=== m10_s3 ===
# scene: m10_s3
# place: склеп, нижний зал
# time: ночь
# who: morven
# trigger: квест m10 «Двести лет тишины», шаг s3: говорить с Морвеном
# next: s4 — решение Морвена
morven: Пришёл. Мокрый ещё. Ты всегда будешь немного мокрый.
morven: Девятьсот сорок три. Я помню каждое имя. А своё — только молодое, когда Гурдым дразнил меня за пауков.
{ is("morven_spiders") or flag("c6_holder_gurdym") == "kept":
    morven: Боялся. Надо же. Я забыл, что боялся.
}
morven: Ты — то, что выпало у меня из рук. Не сын. Не спасение. Кусок работы, которую я не довёл до конца.
{ flag("truth") == "public" or knows("f_red_winter_truth"):
    morven: Марфа. Лука. Дарья. Ерофеевна. Они пришли ко мне в одну ночь, а наверху сделали вид, что ночи не было.
    morven: Я не судья. Я запоминал. Это тоже оказалось тяжёлым.
}
{ flag("kudel_fate") == "arrested":
    morven: Ткачихи нет. Но её песня в тебе есть. Нить не становится невинной, если хозяина увели.
}
-> DONE

=== m10_s4 ===
# scene: m10_s4
# place: склеп, нижний зал
# time: ночь
# who: morven
# trigger: квест m10 «Двести лет тишины», шаг s4: решить судьбу Морвена и имён
# next: end, s5, s6, s7, s8
morven: Решай. Я двести лет решал. Устал.
* { flag("faction") == "archive" } [(Лампа) Замри. Пусть всё будет сохранно.] 
    ~ set("morven", "frozen")
    ~ go("s5")
    -> DONE
* { flag("faction") == "ash" } [(Факел) Пусть горит. Всем станет легко.] 
    ~ set("morven", "burned")
    ~ go("s6")
    -> DONE
* { flag("faction") == "weavers" } [(Веретено) Распустим их вместе. По нитке. Домой.] 
    ~ set("morven", "released")
    ~ go("s7")
    -> DONE
* { val("c6_holders_called") >= 3 } [Помины. Пусть каждый назовёт своего сам.] 
    ~ set("morven", "persuaded")
    ~ set("pominy", true)
    ~ promise("p_c6_pominy", "ivar")
    ~ keep("p_c6_pominy")
    ~ deed_public("d_c6_pominy")
    morven: Не за меня? Хорошо. Тогда я только начну.
    narr: Голоса идут по лентам: Митрий, Лёся, Остап, Марфа. Не заклинание. Обычная перекличка, от которой плачут.
    ~ go("end")
    -> DONE
* { val("c6_holders_released") >= 3 } [Отпустить их по одному. Не инструментом — руками.] 
    ~ set("morven", "released")
    ~ go("s7")
    -> DONE
* [Ты устал. Отдай мне свою ношу.] 
    ~ set("morven", "keeper")
    ~ go("s8")
    -> DONE
* { flag("hero_self") == "one" and flag("gurdym") != "dead" } [Отпусти их сам. Я буду рядом, пока ты отпускаешь.] 
    ~ set("morven", "persuaded")
    ~ set("c6_morven_choice", "shared")
    ~ go("end")
    -> DONE
* [Хватит слов.] 
    ~ set("morven", "killed")
    ~ go("s6")
    -> DONE

=== m10_s5 ===
# scene: m10_s5
# place: склеп, нижний зал
# time: ночь
# who: morven, yasna
# trigger: квест m10 «Двести лет тишины», шаг s5: поставить лампу у трона
# next: конец квеста
morven: Холодно. Как утром на реке. Спасибо... наверное.
yasna: Я запишу все имена. Не чтобы спрятать. Чтобы у них были полки и окна.
-> DONE

=== m10_s6 ===
# scene: m10_s6
# place: склеп, нижний зал
# time: ночь
# who: morven
# trigger: квест m10 «Двести лет тишины», шаг s6: бой с Морвеном
# next: конец квеста
{ flag("morven") == "burned":
    morven: Быстро. Они боятся огня. Я тоже, оказывается.
}
{ flag("morven") == "killed":
    morven: Только не задень их. Они и так достаточно были задеты.
}
-> DONE

=== m10_s7 ===
# scene: m10_s7
# place: склеп, нижний зал
# time: ночь
# who: kudel
# trigger: квест m10 «Двести лет тишины», шаг s7: отдать память весом от 5
# next: конец квеста
kudel: Девятьсот сорок три нити. Каждой нужен проводник. Отдай что-нибудь большое.
narr: Нити уходят вверх, сквозь землю, к домам. В Броде кто-то просыпается и плачет, не понимая от чего.
-> DONE

=== m10_s8 ===
# scene: m10_s8
# place: склеп, нижний зал
# time: ночь
# who: morven
# trigger: квест m10 «Двести лет тишины», шаг s8: отдать имя и сесть на трон
# next: конец квеста
morven: Имя придётся оставить. Здесь имена только у них.
morven: Корона не тяжёлая. Тяжело то, что под ней.
narr: Морвен рассыпается в иней и улыбается. Наверное, впервые за двести лет.
-> DONE

=== m11_s1 ===
# scene: m11_s1
# place: Ольховый Брод
# time: вечер после склепа
# who: ivar
# trigger: квест m11 «Ночь Перевязки», шаг s1: узнать, что стало с Бродом
# next: s2 — поговорить у избы Агафьи
{ flag("morven") == "frozen":
    ivar: Тихо стало. Как в сугробе. Даже собаки не лают.
}
{ flag("morven") == "burned":
    ivar: Проводы скоро, а провожать некого. Легко. От этой лёгкости страшно.
}
{ flag("morven") == "released":
    ivar: Я вспомнил. Её звали Ольга. Платок её. Зачем ты мне это вернул? Не отвечай. Сам знаю.
}
{ flag("morven") == "keeper":
    ivar: Говорят, ты теперь под кладбищем живёшь. Если это жизнь — держись там, что ли.
}
{ flag("morven") == "killed":
    ivar: Мертвецы у колодца стоят. Не злые. Ждут, пока их позовут. Будем учиться.
}
{ flag("morven") == "persuaded":
    ivar: Ночью мы все слышали голоса. Я назвал её следом. Ольга.
}
{ flag("c6_siege_door") == "barred":
    ivar: Доски снял. Сразу. Второй раз я дверь навсегда не заколочу.
}
-> DONE

=== m11_s2 ===
# scene: m11_s2
# place: Ольховый Брод, изба Агафьи
# time: вечер
# who: vesna, agafya
# trigger: квест m11 «Ночь Перевязки», шаг s2: поговорить у избы Агафьи
# next: s3 — ночь у брода
{ flag("agafya_fate") == "dead":
    vesna: Я кашу сварила. Агафья бы ругалась, что жидкая. Значит, сварила правильно.
    vesna: Узелок Митрия у тебя. Не держи его из жалости. Жалость — тоже верёвка.
}
{ flag("agafya_fate") == "burned":
    agafya: Не трогай косу. Обгорела, а держится. Как я, значит.
    agafya: Митя уже не за рукав тянет. Так, за палец. Отпущу. Не сегодня — но отпущу.
}
{ flag("agafya_fate") != "dead" and flag("agafya_fate") != "burned":
    agafya: Пришёл? Садись. Каша с утра. Чего глядишь так?
    agafya: Я узелок развяжу, когда руки перестанут дрожать. А они перестанут. Не врут же они мне всю жизнь.
}
-> DONE

=== m11_s3 ===
# scene: m11_s3
# place: Ольховый Брод, брод
# time: Ночь Перевязки
# who: —
# trigger: квест m11 «Ночь Перевязки», шаг s3: прийти к броду ночью
# next: s4 — выбрать последний узел
narr: Над рекой небо распускается петлями. Мир перевязывается заново — от края к броду.
narr: Пряжа просит последний узел. Он должен быть твоим.
-> DONE

=== m11_s4 ===
# scene: m11_s4
# place: Ольховый Брод, брод
# time: Ночь Перевязки
# who: —
# trigger: квест m11 «Ночь Перевязки», шаг s4: решить, чем завязать последний узел
# next: s5 — завязать узел
* { card("n_self") } [Отдать Имя.] 
    ~ set("last_knot", "name")
    ~ go("s5")
    -> DONE
* { lost("n_self") } [Отдать Имя. #struck] 
    -> DONE
* [Отдать Сны: отпустить тех, из кого я сшит.] 
    ~ set("last_knot", "dreams")
    ~ go("s5")
    -> DONE
* { flag("agafya_fate") != "dead" and val("bond_agafya") >= 2 } [Отдать то, что связывает меня с Агафьей.] 
    ~ set("last_knot", "agafya")
    ~ go("s5")
    -> DONE
* { clarity() >= 40 } [Ничего не отдавать. Завязать узел тем, что я есть.] 
    ~ set("last_knot", "whole")
    ~ go("s5")
    -> DONE
* [Отдать то, что осталось. Мне не жалко.] 
    ~ set("last_knot", "rest")
    ~ go("s5")
    -> DONE

=== m11_s5 ===
# scene: m11_s5
# place: Ольховый Брод, брод
# time: Ночь Перевязки
# who: —
# trigger: квест m11 «Ночь Перевязки», шаг s5: завязать узел
# next: s6 — дождаться рассвета
{ flag("last_knot") == "name":
    narr: Нить тянется из имени. Оно не рвётся — просто становится тихим, как слово в чужой избе.
}
{ flag("last_knot") == "dreams":
    narr: Семь голосов расходятся по воде. Не прощаются. Просто перестают говорить хором.
}
{ flag("last_knot") == "agafya":
    narr: Красный узелок теплеет в ладони. Ты помнишь её кашу, но уже не знаешь, почему от этого не одиноко.
}
{ flag("last_knot") == "whole":
    narr: Ты не отдаёшь ничего. Впервые это не жадность. Ты держишь себя целиком, чтобы было кому помнить.
}
{ flag("last_knot") == "rest":
    narr: Нить тянется из груди. Тонкая. Тёплая. Твоя.
}
~ learn("f_c6_last_knot")
~ deed("d_c6_last_knot")
-> DONE

=== m11_s6 ===
# scene: m11_s6
# place: Ольховый Брод, брод
# time: рассвет
# who: —
# trigger: квест m11 «Ночь Перевязки», шаг s6: дождаться рассвета
# next: конец главы / концовка
narr: Светает. Мир снова на месте. Каким его помнят.
narr: На краю Выцвети шевелится тонкая нить. Кто-то будто пробует твоё имя на голос.
{ flag("kudel_fate") == "arrested":
    narr: Ветер перебирает серую нитку на запястье. Голоса Кудели нет, но нить узнаёт чужая рука.
}
{ flag("kudel_fate") != "arrested":
    kudel: Эта нитка не моя, дитятко.
}
~ learn("f_c6_eighth_thread")
-> DONE
