# Переменные выбора и последствий (CHOICE_FLAGS)

Документ собирается автоматически: `node tools/gen_docs.mjs`. Источники — `site/story.json`,
`site/narrative/*.ink`, `site/narrative/consequences.json`. Не править руками: правки пропадут при
следующей сборке. Описания важных флагов — в словаре `MEANING` внутри генератора.

## Где живёт состояние
| Что | Где в сохранении | Как меняется | Как читается |
|---|---|---|---|
| флаги выборов | `G.flags` | `set`/`inc` в ink; `flag:`/`inc:` в исходах | `flag()`/`is()` в ink; ключи условий в story.json |
| квесты | `G.story.active/done/failed` | шаги и исходы | `qstate()`, `q_<id>`, `step_<id>` |
| глава | `G.ws.chapter` | `endsChapter` квеста | `chapter()` |
| репутация фракций | `G.ws.rep` (−100…100) | `addrep`, `rep:`, поступки, слухи | `rep()`, `tier()`, `rep_<f>` |
| отношения NPC | `G.ws.rel[npc]` = доверие/страх/уважение/вражда (0–10) | `addrel`, `rel:`, `bond:` | `trust()`… , `trust_<npc>`… |
| знание героя | `G.ws.know` | `learn`, `learn:` | `knows()`, `knows` |
| что знают NPC | `G.ws.heard` + слухи | `deed` (свидетели), `tell`, распространение слухов по дням | `heard()` |
| поступки | `G.ws.deeds` | `deed`, `deed:` | `did()`, `did_<id>` |
| слухи | `G.ws.rumors` (сила, кто знает) | `rumor`, поступки; растут по социальному графу каждый день, гаснут | `rumor_on()`, `rumor` |
| обещания | `G.ws.promises` | `promise`, `keep`, `breakp`, `release`, срок | `promised()`, `promise_<id>` |
| долги | `G.ws.debts` | `debt_add`, `paydebt` | `debt()`, `debt_<npc>` |
| предательства | `G.ws.betrayals` | `betray`, поступки с `betray: true` | `betrayed_<id>` |
| отложенные последствия | `G.ws.deferred` | `later`, `at_chapter`, `later:`, `atchapter:` | срабатывают сами (события) |
| торговля | `G.ws.trade` + правила торговцев | `settrade`, `shop:`, `trade:` | окно торговли |
| путь (класс) | `G.cls`, `G.paths` | `learnpath`, `path:` | `cls()`, `class` |
| диалоги | `G.ink` (состояние ink: счётчики посещений) | сам ink | счётчики узлов в ink |

## Флаги выборов (76)
| Флаг | Значения | Где ставится | Где читается | Смысл |
|---|---|---|---|---|
| `agafya_plea` | promised, doubted, keeper | m4_s2 | m4_s5 | см. сцену m4_s2 |
| `agafya_worried_federot` | true | c1_nets_s5 | — | см. сцену c1_nets_s5 |
| `artel` | sun, sealed, window | s9_s5 | s9 (исход) | см. сцену s9_s5 |
| `ashes_asked` | +n | talk_ivar, talk_vesna, talk_tur, talk_gostena, talk_pelageya, talk_federot | — | скольких спросил про пепелище (гл.1) |
| `ashes_done` | true | c1_ashes_s4 | — | см. сцену c1_ashes_s4 |
| `ashes_pressed` | true | c1_ashes_s4 | — | см. сцену c1_ashes_s4 |
| `ashes_scrap_kept` | true | c1_ashes_s4 | — | см. сцену c1_ashes_s4 |
| `ashes_scrap_thrown` | true | c1_ashes_s4 | — | см. сцену c1_ashes_s4 |
| `asked_grey_knot_ch1` | true | c1_council_s2 | — | см. сцену c1_council_s2 |
| `asked_mitya` | true | m1_s1 | m1_s2 | см. сцену m1_s1 |
| `asked_thirty_five` | true | c1_path_weaver_s1 | — | см. сцену c1_path_weaver_s1 |
| `asked_thread` | true | m1_s2 | — | см. сцену m1_s2 |
| `asked_who_taught_knots` | true | c1_nets_s5 | — | см. сцену c1_nets_s5 |
| `council_agafya_accused` | true | c1_council_s1 | c1_council_s1 | см. сцену c1_council_s1 |
| `council_agafya_exposed` | true | c1_council_s1 | c1_council_s1, c1_council_s2 | см. сцену c1_council_s1 |
| `council_said_like_dead` | true | c1_council_s1 | — | см. сцену c1_council_s1 |
| `echo_self` | returned, released, given | s15_s5 | s15 (исход) | см. сцену s15_s5 |
| `efim` | named, federot_named, killed, led | c1_nets_s3, c1_nets_s4, c1_nets_s5 | c1_council_s1, c1_trader_s2, talk_agafya, talk_federot, offer_c1_path_ranger, c1_nets (исход) | судьба утопленника у брода (гл.1): named / federot_named / killed / led |
| `efim_name_known` | true | c1_nets_s2 | c1_nets_s3 | см. сцену c1_nets_s2 |
| `faction` | archive, ash, weavers, none | m7_s4 | m9_s1, m10_s4, m7.s5, m7.s6, m7.s7, m7.s8 | решение о Сухом Логе (m7): archive / ash / weavers / none |
| `federot_father_ashes` | true | talk_federot | — | см. сцену talk_federot |
| `federot_suspects_agafya` | true | c1_nets_s1 | c1_nets_s5 | см. сцену c1_nets_s1 |
| `gordey` | face, release, keep | s14_s4 | s14.s5, s14 (исход) | см. сцену s14_s4 |
| `gostena_credit_council` | true | c1_well_s3 | c1_council_s1 | см. сцену c1_well_s3 |
| `gurdym` | dead, spared, eased | m3_s3, m3_s5 | m9_s6, m3.s4, m3.s6, m3 (исход), s5.s2, концовка e_own_name | судьба Гурдыма (m3): dead / eased / spared |
| `heard_of_kudel` | true | talk_agafya | — | см. сцену talk_agafya |
| `hero_first` | blank, tried | m1_s1 | — | см. сцену m1_s1 |
| `hero_name` | Митрий | m8_s6 | — | имя, выбранное героем |
| `hero_self` | many, one | m8_s6 | m10_s4, m8.s7, m8 (исход), концовка e_own_name | кто ты (m8): many / one |
| `inei` | melted, frozen, told, left | s4_s4 | s4.s5, s4 (исход) | см. сцену s4_s4 |
| `iskra` | burned, lesya_speaks, shared, healed | s7_s3 | s7.s4, s7 (исход) | см. сцену s7_s3 |
| `ivar_father_mentioned` | true | talk_ivar | — | см. сцену talk_ivar |
| `ivar_kerchief` | true | m1_s4 | talk_ivar, m1 (исход) | см. сцену m1_s4 |
| `ivar_trust` | 1, 0 | m1_s4 | — | см. сцену m1_s4 |
| `korney` | sung, fought | s5_s5 | s5.s6, s5 (исход) | см. сцену s5_s5 |
| `last_knot` | name, dreams, agafya, whole, rest | m11_s4 | m11.s5, концовка e_empty | последний узел (m11) |
| `lean` | archive, ash, weavers, none | m6_s4 | — | крен после «Трёх неправд» (m6) |
| `mal` | returned_holy, bought, sacrificed, stays | s1_s5 | s1 (исход) | см. сцену s1_s5 |
| `mentor_hollow` | pryazha | c1_path_hollow_s1 | c1_path_hollow (исход) | стал Беспамятным у Узла |
| `mentor_ranger` | federot | c1_path_ranger_s3 | c1_path_ranger (исход) | кто научил следопыта |
| `mentor_warrior` | tur | c1_path_warrior_s4 | c1_path_warrior (исход) | кто научил воина |
| `mentor_weaver` | agafya | c1_path_weaver_s4 | c1_path_weaver (исход) | кто научил ткача |
| `met_kudel` | true | m6 (исход) | m4_s6 | см. сцену m6 (исход) |
| `mirta` | returned, farewell, weavers, blame_ugar | s13_s4 | s13 (исход) | см. сцену s13_s4 |
| `mitya_hidden` | true | m4_s5 | m4 (исход) | см. сцену m4_s5 |
| `mitya_kept` | true, false, archive, hero | m4 (исход) | m8_s1, m8_s6, m11_s2 | держит ли Агафья Митрия после Проводов |
| `morven` | frozen, burned, released, keeper, persuaded, killed | m10_s4 | m10_s6, m11_s1, m10.s5, m10.s7, m10.s8, m10 (исход) | решение в нижнем зале (m10) |
| `morven_met` | 1 | m5 (исход) | — | см. сцену m5 (исход) |
| `morven_q1` | who, dead, kill | m5_s5 | m5_s6 | см. сцену m5_s5 |
| `morven_spiders` | true | m9 (исход) | m10_s3, m10_s4 | см. сцену m9 (исход) |
| `opis` | asked, stolen, ugar_jar, silent | s6_s3 | s6.s4, s6 (исход) | см. сцену s6_s3 |
| `ostap_asked` | who, home | m5_s3 | — | см. сцену m5_s3 |
| `ostap_rest` | true | s10 (исход) | — | см. сцену s10 (исход) |
| `pelageya_m_asked` | true | c1_shirts_s3 | — | см. сцену c1_shirts_s3 |
| `pisma` | silent, truth, meet | s10_s3 | s10.s4, s10 (исход) | см. сцену s10_s3 |
| `provody` | spoken, sold, taken | m4_s5 | m4.s6, m4 (исход), концовка e_own_name | Проводы (m4): spoken / sold / taken |
| `red_winter` | true, burned | m3_s5 | — | см. сцену m3_s5 |
| `ruins_open` | true | s5 (исход) | — | см. сцену s5 (исход) |
| `savva` | returned, dunya, wolf, killed | s8_s4 | s8.s5, s8 (исход) | см. сцену s8_s4 |
| `shirts` | bought, truth, left | c1_shirts_s2 | c1_shirts_s3, c1_council_s1 | рубашки Пелагеи: bought / truth / left |
| `shurshok` | freed, guide, captive | m2_s4 | m2_s5, c1_council_s1, c1_trader_s1, talk_agafya, talk_khrum, m3_s1 | судьба гоблинёнка (m2): freed / guide / captive |
| `shurshok_button` | true | m2_s4 | m2_s5, m2 (исход) | см. сцену m2_s4 |
| `shurshok_gift` | region, quest, shared | s12_s2 | s12.s4, s12.s5, s12 (исход) | см. сцену s12_s2 |
| `stakh` | robbed, bought, told, betrayed | s2_s4 | s2.s5, s2 (исход) | см. сцену s2_s4 |
| `t1_ask` | how, no | t1_s1 | — | см. сцену t1_s1 |
| `t1_lesson` | kept, power | t1_s4 | t1 (исход) | см. сцену t1_s4 |
| `trader_bag` | given, bought, taken, none | c1_trader_s2 | c1_trader_s3 | см. сцену c1_trader_s2 |
| `tur` | muscle, gift, let_go | s3_s4 | s3.s5, s3 (исход) | см. сцену s3_s4 |
| `tur_hint_mine` | true | c1_well_s4 | — | см. сцену c1_well_s4 |
| `verses` | +n | s5_s2, s5_s3, s5_s4 | s5_s5 | см. сцену s5_s2 |
| `vesna_said_gordey` | true | c1_wood_s1 | c1_path_warrior_s1 | см. сцену c1_wood_s1 |
| `village_stitch` | true | s14 (исход) | — | см. сцену s14 (исход) |
| `village_verdict` | own, probation, outcast | c1_council_s1 | c1_council_s2, talk_ivar, c1_council (исход) | решение Схода о герое (гл.1): own — свой, probation — на испытании, outcast — изгой |
| `well_asked_marfa` | true | c1_well_s2 | — | см. сцену c1_well_s2 |
| `well_voices` | true | c1_well_s2 | talk_tur | см. сцену c1_well_s2 |
| `yard_help` | +n | c1_well (исход), c1_shirts (исход), c1_wood (исход) | c1_council_s1 | сколько дворов Брода помог герой (гл.1) |

## Фракции
| Код | Название | Старт |
|---|---|---|
| `village` | Провожающие | 0 |
| `archive` | Архив Неусыпных | 0 |
| `ash` | Пепельный Круг | 0 |
| `weavers` | Перевязчики | 5 |
| `undead` | Недопетые | 0 |
| `forest` | Лесной народ | -5 |
| `rootless` | Безродные | -10 |

## NPC: фракция и стартовое отношение
| NPC | Имя | Фракция | доверие/страх/уважение/вражда | Кому пересказывает слухи |
|---|---|---|---|---|
| `agafya` | Агафья Вереск | village | 3 / 0 / 0 / 0 | vesna, ivar |
| `ivar` | Ивар Ольха | village | 0 / 0 / 1 / 1 | vesna, agafya, federot |
| `vesna` | Весна Луговая | village | 1 / 0 / 0 / 0 | agafya, ivar, tur, pelageya, dunya, ulita, federot, gostena |
| `tur` | Тур Горн | village | 0 / 0 / 0 / 0 | vesna |
| `pelageya` | Пелагея | village | 0 / 0 / 0 / 0 | vesna |
| `dunya` | Дуня | village | 0 / 0 / 0 / 0 | vesna, sivy |
| `ulita` | Улита | village | 1 / 0 / 0 / 0 | vesna, shurshok |
| `prosha` | Проша | village | 0 / 0 / 0 / 0 | vesna |
| `marya` | Марья Сухая | village | 0 / 0 / 0 / 0 | — |
| `federot` | Федот Рябина | village | 0 / 2 / 0 / 3 | vesna, ivar, gostena, chad |
| `gostena` | Гостена | village | 0 / 0 / 0 / 0 | vesna, stakh, khrustalina, khrum |
| `yasna` | Ясна Стынь | archive | 1 / 0 / 1 / 0 | khrustalina |
| `khrustalina` | Хрусталина | archive | 0 / 0 / 0 / 0 | yasna, gostena |
| `ugar` | Брат Угар | ash | 2 / 0 / 0 / 0 | iskra, chad |
| `iskra` | Искра | ash | 0 / 0 / 0 / 1 | ugar, chad |
| `chad` | Чад | ash | 0 / 0 / 0 / 2 | ugar, iskra, federot |
| `kudel` | Мать Кудель | weavers | 2 / 0 / 0 / 0 | mirta |
| `mirta` | Мирта | — | 0 / 0 / 0 / 0 | kudel |
| `morven` | Морвен Тихий | undead | 0 / 0 / 0 / 0 | ostap |
| `ostap` | Остап Ряд | undead | 1 / 0 / 0 / 0 | morven, ulita |
| `efim` | Утопленник | undead | 0 / 0 / 0 / 0 | morven |
| `gurdym` | Гурдым | forest | 0 / 0 / 0 / 0 | shurshok |
| `shurshok` | Шуршок | forest | 0 / 3 / 0 / 0 | gurdym, mal, khrum, ulita |
| `mal` | Малой | forest | 0 / 0 / 0 / 0 | shurshok, pelageya |
| `khrum` | Хрум | forest | 0 / 0 / 0 / 0 | shurshok, gostena |
| `stakh` | Рябой Стах | rootless | 0 / 0 / 0 / 2 | krivoy, gostena |
| `krivoy` | Кривой | rootless | 0 / 0 / 0 / 0 | stakh, khrustalina |
| `sivy` | Дед Сивый | — | 0 / 0 / 0 / 0 | — |
| `inei` | Тётка Иней | — | 0 / 0 / 0 / 0 | — |
| `korney` | Корней | — | 0 / 0 / 0 / 0 | — |

«Уши» фракций (через кого слух доходит до фракции): village: vesna, ivar; archive: khrustalina, yasna; ash: ugar, chad; forest: gurdym, shurshok; rootless: stakh, krivoy; weavers: kudel; undead: morven, ostap.

## Поступки (deeds)
| id | Что | Репутация у видевших | Слух |
|---|---|---|---|
| `d_broke_promise` | Не сдержал слово | village -3 | r_breaks_word |
| `d_sold_memory` | Продал память Архиву | archive +2, village -2 | — |
| `d_freed_shurshok` | Отпустил гоблинёнка | forest +10 (всегда) | — |
| `d_captured_shurshok` | Привёл гоблинёнка в деревню на суд | forest -15, village +5 (всегда) | r_goblin_captive |
| `d_killed_gurdym` | Убил Гурдыма | forest -40, village +5 (всегда) | r_killed_troll |
| `d_eased_gurdym` | Забрал у Гурдыма красную зиму | forest +15 (всегда) | — |
| `d_spared_gurdym` | Получил ключ миром | forest +20 (всегда) | — |
| `d_read_names` | Прочёл имена на Проводах | village +10, undead +5 (всегда) | — |
| `d_sold_names` | Продал имена Архиву | village -15, archive +15 (всегда) | r_sold_names |
| `d_took_names` | Взял двенадцать имён в себя | village -10, undead +15 (всегда) | r_names_in_hero |
| `d_hid_mitya` | Утаил на Проводах имя Митрия |  | — |
| `d_robbed_caravan` | Ограбил обоз Архива | archive -30, rootless +20 (всегда) | r_robbed_caravan |
| `d_bought_wife` | Выкупил память о жене Стаха | rootless +15, archive +3 (всегда) | — |
| `d_told_stakh` | Сказал Стаху, где Пелагея | rootless +20 (всегда) | — |
| `d_betrayed_stakh` | Сдал Безродных Архиву | archive +15 (всегда) · предательство | r_betrayed_stakh |
| `d_stole_jars` | Унёс детские склянки из Архива | archive -25, weavers +10 (всегда) | r_stole_jars |
| `d_took_ugar_jar` | Унёс склянку Угара | archive -5 (всегда) | — |
| `d_named_efim` | Назвал утопленника по имени у брода | undead +15, village -5 (всегда) | r_speaks_to_dead |
| `d_killed_efim` | Зарубил утопленника у брода | undead -10, village +5 (всегда) | r_cut_the_drowned |
| `d_led_efim` | Увёл утопленника узелком Агафьи | undead +10 (всегда) | — |
| `d_helped_yard` | Помог двору в Броде | village +4 (всегда) | — |
| `d_shamed_tur` | Рассказал всем, что Тур продал ремесло | village -4 | r_tur_sold |
| `d_lied_council` | Солгал на Сходе |  | — |
| `d_struck_federot` | Ударил Федота | village -6 (всегда) | r_beat_federot |
| `d_paid_federot` | Заплатил Федоту за порванные сети |  | — |
| `d_asked_ashes` | Расспрашивал про пепелище |  | — |

## Слухи
| id | Текст | Правда? | Удар по репутации, когда дойдёт |
|---|---|---|---|
| `r_wet_lures_dead` | Мокрый мертвяков приманивает | ложь | village -8 |
| `r_grave_digger` | Мокрый сам по ночам могилы роет | ложь | village -6 |
| `r_breaks_word` | Мокрый слова не держит | правда | village -4, rootless -2 |
| `r_goblin_captive` | Мокрый гоблинёнка на верёвке в деревню привёл | правда | forest -5 |
| `r_killed_troll` | Мокрый старого тролля зарубил | правда | forest -10, village 3 |
| `r_sold_names` | Мокрый наши имена Башне продал | правда | village -6, weavers -5 |
| `r_names_in_hero` | В мокром теперь двенадцать покойников разговаривают | правда | village -4, ash -6 |
| `r_robbed_caravan` | Обоз Башни на лесной дороге разбили, и мокрый там был | правда | archive -10, village -2 |
| `r_betrayed_stakh` | Мокрый своих Башне сдаёт | правда | rootless -10, forest -3 |
| `r_stole_jars` | Из Башни склянки пропали, детские | правда | archive -5, weavers 3 |
| `r_speaks_to_dead` | Мокрый с мертвяками по именам разговаривает | правда | village -3, undead 5 |
| `r_cut_the_drowned` | Мокрый утопленника у брода зарубил, и тот не встал | правда | village 2 |
| `r_tur_sold` | Тур ремесло Башне продал, а дочку не спас | правда | — |
| `r_beat_federot` | Мокрый Федота при всех ударил | правда | village -3 |

## Знание и улики (facts)
| id | Что | Описание |
|---|---|---|
| `f_thread_wrist` | Нитка на запястье | Серая шерстяная нитка, ткачья вязка. Не развязывается и не рвётся. Агафья сказала: «не моя вязка». |
| `f_two_knots` | Два узелка в косе Агафьи | Красный, свежий — про Митю. Под ним серый, старый. «Это не твоё». |
| `f_ashes_phrase` | «Всегда пустой был» | Про пепелище у брода все говорят одними и теми же словами. Будто выучили. |
| `f_ashes_doll` | Обгоревшая берестяная кукла | В крапиве на пепелище. Детская. Кто-то делал её для девочки. |
| `f_ashes_ladle` | Оплавленный черпак с буквой «М» | Медный, для отваров. Буква выбита неровно, своей рукой. |
| `f_ashes_scrap` | Клочок бересты: «держит» | Обгорелый край списка. Угольное слово «держит» и половина чьей-то буквы. |
| `f_efim_name` | Имя утопленника | Утопленник у брода — Ефим, брат Федота. Отпущен прошлой весной. |
| `f_crypt_tight` | «Тесно» | Мёртвые у брода говорят одно слово: «тесно». Под кладбищем им не хватает места. |
| `f_red_winter_gurdym` | Красная зима Гурдыма | Тролль помнит зиму, когда река у брода стала красной: люди в огне и мальчик с факелом. |
| `f_shirts_m` | Буква «М» на рубашках | Пелагея каждую зиму шьёт рубашки на мальчика лет семи. На каждом вороте вышита «М». |
| `f_agafya_knots` | Агафья вяжет узелки | Агафья умеет уводить мёртвых узелком. По обычаю Брода это грех. |
| `f_well_voices` | Голоса в колодце | На дне колодца кто-то смеётся: «Воды, Марфушка, воды!» |

## Обещания
| id | Кому | Что |
|---|---|---|
| `p_tur_silence` | Тур Горн | Никому не говорить, что Тур разучился ковать |
| `p_agafya_knots` | Агафья Вереск | Молчать о том, что Агафья вяжет узелки |
| `p_agafya_teach` | Агафья Вереск | Никому не говорить, что Агафья учила узелкам |

## Отложенные последствия (события)
| id | Что | Эффекты | Сцена |
|---|---|---|---|
| `ev_goblin_raid` | Гоблины мстят за Гурдыма | rep:village:-3, spawn:goblin:village:x1 | — |
| `ev_federot_cools` | Федот остывает | rel:federot:hostility:-1 | — |

## Сюжетные предметы
| id | Название |
|---|---|
| `efim_spoon` | ложка с буквой «Е» |
| `efim_hook` | крючок Ефима |
| `net_mended` | починенная сеть |
| `pelageya_shirts` | детские рубашки Пелагеи |
| `well_chain` | колодезная цепь |
| `ashes_doll` | обгоревшая берестяная кукла |
| `red_pebble` | красный камешек Гурдыма |
| `ashes_scrap` | клочок бересты со словом «держит» |
| `efim_bow` | лук Ефима (рябиновый, с выжженной «Е») |
| `tur_sword` | отцов меч Тура |

## Торговцы
| id | Где | Фракция | Правила (кратко) |
|---|---|---|---|
| `vesna` | «Последняя кружка» | village | закрыто: Пока про тебя такое болтают, дверь закрыта. Мне людей не пугай. · Весна помнит про долг. · особый товар |
| `gostena` | лавка Гостены | village | цена ×1.2 · тайная сделка |
| `tur` | кузня Тура | village | закрыто: Беру молот — и не знаю, куда бить. Не кую я. Не могу. · закрыто: Кузню я закрыл. Подметаю у Весны. Так спокойнее. |
| `yasna` | Башня Неусыпных | archive | тайная сделка |
| `ugar` | костёр Угара | ash | — |
| `kudel` | узелки Кудели | weavers | — |
| `stakh` | стоянка Безродных | rootless | закрыто: Ты нас Башне сдал. Уходи, пока ноги носят. |
| `khrum` | мена Хрума | forest | — |

Цены зависят от ступени репутации фракции торговца (Враг — закрыто, Неприязнь ×1.5 без редкого товара, Свой ×0.9, Близкий ×0.8) и от доверия самого торговца (≥ 6 — ×0.9; вражда ≥ 7 — закрыто). Закрытый торговец всегда показывает, как вернуть доверие.
