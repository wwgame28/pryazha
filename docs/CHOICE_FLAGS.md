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

## Флаги выборов (213)
| Флаг | Значения | Где ставится | Где читается | Смысл |
|---|---|---|---|---|
| `agafya_dodged_soot` | true | talk_agafya_ch3 | — | см. сцену talk_agafya_ch3 |
| `agafya_heard_red_winter` | true | talk_agafya_ch2 | — | см. сцену talk_agafya_ch2 |
| `agafya_knot_seen` | true | c3_deadnight_s9 | — | см. сцену c3_deadnight_s9 |
| `agafya_lied_luchina` | true | talk_agafya_ch2 | — | см. сцену talk_agafya_ch2 |
| `agafya_needle_proverb` | true | talk_agafya_ch3 | — | см. сцену talk_agafya_ch3 |
| `agafya_pebble_slip` | true | talk_agafya_ch2 | — | см. сцену talk_agafya_ch2 |
| `agafya_plea` | promised, doubted, keeper | m4_s2 | m4_s5 | см. сцену m4_s2 |
| `agafya_slip_bogdan` | true | talk_ivar_ch2 | — | см. сцену talk_ivar_ch2 |
| `agafya_worried_federot` | true | c1_nets_s5 | — | см. сцену c1_nets_s5 |
| `archive_service` | true | c2_buyer_s2 | c2_buyer_s4, c2_path_cryo | см. сцену c2_buyer_s2 |
| `artel` | sun, sealed, window | s9_s5 | s9 (исход) | см. сцену s9_s5 |
| `ashes_asked` | +n | talk_ivar, talk_vesna, talk_tur, talk_gostena, talk_pelageya, talk_federot | — | скольких спросил про пепелище (гл.1) |
| `ashes_done` | true | c1_ashes_s4 | — | см. сцену c1_ashes_s4 |
| `ashes_pressed` | true | c1_ashes_s4 | — | см. сцену c1_ashes_s4 |
| `ashes_scrap_kept` | true | c1_ashes_s4 | — | см. сцену c1_ashes_s4 |
| `ashes_scrap_thrown` | true | c1_ashes_s4 | — | см. сцену c1_ashes_s4 |
| `asked_agafya_gurdym` | true | chapter_2_start | — | см. сцену chapter_2_start |
| `asked_grey_knot_ch1` | true | c1_council_s2 | — | см. сцену c1_council_s2 |
| `asked_grey_knot_ch2` | true | talk_agafya_ch2 | — | см. сцену talk_agafya_ch2 |
| `asked_mitya` | true | m1_s1 | m1_s2 | см. сцену m1_s1 |
| `asked_spindle` | true | m3_s2_ch2 | — | см. сцену m3_s2_ch2 |
| `asked_sych` | true | s6_wing | — | см. сцену s6_wing |
| `asked_thirty_five` | true | c1_path_weaver_s1 | — | см. сцену c1_path_weaver_s1 |
| `asked_thread` | true | m1_s2 | — | см. сцену m1_s2 |
| `asked_ugar_burns` | true | c3_bonfire_s1 | — | см. сцену c3_bonfire_s1 |
| `asked_who_taught_knots` | true | c1_nets_s5 | — | см. сцену c1_nets_s5 |
| `birch_federot_accuses` | true | talk_federot_ch2 | — | см. сцену talk_federot_ch2 |
| `birch_holders` | +n | c2_birch_s3 | c2_birch_s3, m4_s1_ch2, m4_s5_pre, talk_ivar_ch2, c2_birch (исход) | см. сцену c2_birch_s3 |
| `birch_holders_refused` | true | c2_birch_s3 | — | см. сцену c2_birch_s3 |
| `birch_holders_torn` | true | c2_birch_s3 | c2_birch_s3, m4_s1_ch2, m4_s5_pre, talk_ivar_ch2, c2_birch (исход) | см. сцену c2_birch_s3 |
| `birch_lied_ivar` | true | c2_birch_s3 | — | см. сцену c2_birch_s3 |
| `birch_mitya` | told, hidden, written | c2_birch_s3, talk_agafya_ch2 | c2_birch_s3, talk_agafya_ch2, m4_s2_ch2, talk_ivar_ch2 | см. сцену c2_birch_s3 |
| `birch_mitya_ivar` | true | c2_birch_s3 | m4_s5_pre | см. сцену c2_birch_s3 |
| `birch_names` | +n | talk_agafya_ch2, talk_vesna_ch2, talk_ulita_ch2, talk_pelageya_ch2, talk_federot_ch2, talk_dunya_ch2 | c2_birch_s3, talk_ivar_ch2, c2_birch.s2 | см. сцену talk_agafya_ch2 |
| `birch_said_no_informing` | true | c2_birch_s1 | — | см. сцену c2_birch_s1 |
| `birch_ulita` | told | c2_birch_s3 | c2_birch_s3, talk_ulita_ch2, m4_s3, talk_ivar_ch2 | см. сцену c2_birch_s3 |
| `birch_ulita_known` | true | talk_ulita_ch2 | c2_birch_s3 | см. сцену talk_ulita_ch2 |
| `birch_vesna` | told | c2_birch_s3 | c2_birch_s3, talk_vesna_ch2, m4_s3, talk_ivar_ch2 | см. сцену c2_birch_s3 |
| `birch_vesna_known` | true | talk_vesna_ch2 | c2_birch_s3 | см. сцену talk_vesna_ch2 |
| `birch_vesna_suspect` | true | talk_vesna_ch2 | — | см. сцену talk_vesna_ch2 |
| `bonfire_burn` | true, false | c3_bonfire_s3 | c3_bonfire_s5, c3_bonfire.s4 | см. сцену c3_bonfire_s3 |
| `bonfire_burned` | true | c3_bonfire_s5 | c3_bonfire_s5, talk_ugar_ch3, talk_agafya_ch3, c3_bonfire (исход) | см. сцену c3_bonfire_s5 |
| `bonfire_chad` | asked, argued, agreed, silent | c3_bonfire_s3 | c3_bonfire_s3, c3_bonfire_s5, talk_ugar_ch3, talk_chad_ch3 | см. сцену c3_bonfire_s3 |
| `bonfire_night` | true | c3_bonfire_s3 | c3_path_pyro | см. сцену c3_bonfire_s3 |
| `buyer_heard_tur` | true | c2_buyer_s2 | c2_buyer_s3 | см. сцену c2_buyer_s2 |
| `c3_child_tracks` | true | c3_deadnight_s10 | — | см. сцену c3_deadnight_s10 |
| `c3_footprint_matched` | true | chapter_3_start | — | см. сцену chapter_3_start |
| `chad_child_hand` | true | talk_chad_ch3 | — | см. сцену talk_chad_ch3 |
| `chad_counts_on_hero` | true | talk_chad_ch3 | — | см. сцену talk_chad_ch3 |
| `chad_named_tlen` | true | c3_bonfire_s2 | c3_bonfire_s3 | см. сцену c3_bonfire_s2 |
| `council_agafya_accused` | true | c1_council_s1 | c1_council_s1 | см. сцену c1_council_s1 |
| `council_agafya_exposed` | true | c1_council_s1 | c1_council_s1, c1_council_s2, c3_deadnight_s1 | см. сцену c1_council_s1 |
| `council_said_like_dead` | true | c1_council_s1 | — | см. сцену c1_council_s1 |
| `cryo_jar` | delivered, read | c2_path_cryo_s3 | c2_path_cryo_s4 | см. сцену c2_path_cryo_s3 |
| `crypt_dead_mood` | calm, empty, hero | m5_s2 | m5_s2, talk_dead_pakhom_ch3, talk_dead_mavra_ch3 | см. сцену m5_s2 |
| `crypt_dead_said_outside` | true | m5_s2 | talk_dead_mavra_ch3 | см. сцену m5_s2 |
| `crypt_names_read` | +n | m5_s2, talk_dead_pakhom_ch3, talk_dead_mavra_ch3 | c3_names | см. сцену m5_s2 |
| `crypt_scroll_seen` | true | m5_s2 | — | см. сцену m5_s2 |
| `deadnight_way` | sword, names, knot | c3_deadnight_s1, c3_deadnight_s8 | talk_ostap_ch3, talk_morven_ch3, talk_ugar_ch3, talk_kudel_ch3, talk_yasna_ch3, c3_deadnight_s4 | см. сцену c3_deadnight_s1 |
| `dunya_savva` | wait, letgo, asked | talk_dunya_ch2 | — | см. сцену talk_dunya_ch2 |
| `echo_self` | returned, released, given | s15_s5 | s15 (исход) | см. сцену s15_s5 |
| `efim` | named, federot_named, killed, led | c1_nets_s3, c1_nets_s4, c1_nets_s5 | c1_council_s1, c1_trader_s2, talk_agafya, talk_federot, offer_c1_path_ranger, talk_federot_ch2 | судьба утопленника у брода (гл.1): named / federot_named / killed / led |
| `efim_deadnight` | spared, cut | c3_deadnight_s3 | c3_deadnight_s10, talk_federot_ch3 | см. сцену c3_deadnight_s3 |
| `efim_forgiven_try` | true | talk_dead_efim_ch3 | — | см. сцену talk_dead_efim_ch3 |
| `efim_message` | true | talk_dead_efim_ch3 | c3_deadnight_s3, c3_deadnight_s10, talk_federot_ch3 | см. сцену talk_dead_efim_ch3 |
| `efim_message_delivered` | true | c3_deadnight_s10, talk_federot_ch3 | c3_deadnight_s10, talk_federot_ch3 | см. сцену c3_deadnight_s10 |
| `efim_name_known` | true | c1_nets_s2 | c1_nets_s3 | см. сцену c1_nets_s2 |
| `faction` | archive, ash, weavers, none | m7_s4 | m9_s1, m10_s4, m7.s5, m7.s6, m7.s7, m7.s8 | решение о Сухом Логе (m7): archive / ash / weavers / none |
| `federot_father_ashes` | true | talk_federot | — | см. сцену talk_federot |
| `federot_knew_pakhom` | true | c3_deadnight_s2 | — | см. сцену c3_deadnight_s2 |
| `federot_listens_chad` | true | talk_federot_ch3 | — | см. сцену talk_federot_ch3 |
| `federot_read_efim` | true | m4_after_choice | talk_federot_ch2 | см. сцену m4_after_choice |
| `federot_reads` | true | talk_federot_ch2 | m4_s3, m4_after_choice | см. сцену talk_federot_ch2 |
| `federot_suspects_agafya` | true | c1_nets_s1 | c1_nets_s5, c3_deadnight_s9 | см. сцену c1_nets_s1 |
| `gordey` | face, release, keep | s14_s4 | talk_vesna_ch2, talk_vesna_ch3, s14.s5, s14 (исход) | см. сцену s14_s4 |
| `gostena_credit_council` | true | c1_well_s3 | c1_council_s1 | см. сцену c1_well_s3 |
| `gurdym` | dead, spared, eased | m3_s3, m3_s5 | m5_s1, m9_s6, talk_agafya_ch2, c2_pebbles_s1, c2_pebbles_s3, talk_ivar_ch2 | судьба Гурдыма (m3): dead / eased / spared |
| `gurdym_ashes_witness` | true | m3_s2_ch2 | — | см. сцену m3_s2_ch2 |
| `gurdym_boy_into_fire` | true | talk_gurdym_ch2 | — | см. сцену talk_gurdym_ch2 |
| `gurdym_counted` | true | c3_truth_s2 | — | см. сцену c3_truth_s2 |
| `gurdym_hint_agafya_winter` | true | m3_s7 | — | см. сцену m3_s7 |
| `gurdym_pebbles_missing` | true, false | m3_s2_ch2, m3 (исход) | — | см. сцену m3_s2_ch2 |
| `gurdym_smelled_thread` | true | m3_s2_ch2 | — | см. сцену m3_s2_ch2 |
| `gurdym_word` | agafya | m3_s3 | m3.s7 | см. сцену m3_s3 |
| `heard_of_kudel` | true | talk_agafya | — | см. сцену talk_agafya |
| `hero_first` | blank, tried | m1_s1 | — | см. сцену m1_s1 |
| `hero_name` | Митрий | m8_s6 | — | имя, выбранное героем |
| `hero_self` | many, one | m8_s6 | m10_s4, m8.s7, m8 (исход), концовка e_own_name | кто ты (m8): many / one |
| `hoard` | graves, goblins, fair | c2_hoard_s3 | talk_ivar_ch2, talk_khrum_ch2, talk_gurdym_ch2, talk_shurshok_ch2, c2_hoard.s4, c2_hoard.s5 | см. сцену c2_hoard_s3 |
| `hoard_seen` | true | s10_post, c2_hoard_s1, talk_shurshok_ch2 | talk_shurshok_ch2, c2_hoard | см. сцену s10_post |
| `hoard_soldier_button` | true | c2_hoard_s4 | — | см. сцену c2_hoard_s4 |
| `inei` | melted, frozen, told, left | s4_s4 | s4.s5, s4 (исход) | см. сцену s4_s4 |
| `iskra` | burned, lesya_speaks, shared, healed | s7_s3 | s7.s4, s7 (исход) | см. сцену s7_s3 |
| `iskra_baptism_planned` | true | c3_bonfire_s5 | talk_iskra_ch3 | см. сцену c3_bonfire_s5 |
| `ivar_chest_axe` | true | talk_ivar_ch2 | — | см. сцену talk_ivar_ch2 |
| `ivar_chest_mentioned` | true | c2_birch_s3 | — | см. сцену c2_birch_s3 |
| `ivar_father_mentioned` | true | talk_ivar, talk_ivar_ch2 | — | см. сцену talk_ivar |
| `ivar_kerchief` | true | m1_s4 | talk_ivar, m1 (исход) | см. сцену m1_s4 |
| `ivar_saw_scrap` | true | c2_birch_s3 | talk_ivar_ch2 | см. сцену c2_birch_s3 |
| `ivar_scroll_hint` | true | talk_ivar_ch3 | — | см. сцену talk_ivar_ch3 |
| `ivar_trust` | 1, 0 | m1_s4 | — | см. сцену m1_s4 |
| `kept_pakhom_birch` | true | m5_s2 | — | см. сцену m5_s2 |
| `khr_fears_for_yasna` | true | talk_khrustalina_ch3 | — | см. сцену talk_khrustalina_ch3 |
| `khrustalina_watching` | true | c3_orphans_s4 | — | см. сцену c3_orphans_s4 |
| `korney` | sung, fought | s5_s5 | s5.s6, s5 (исход) | см. сцену s5_s5 |
| `krivoy_met` | true | s2_s2_ch2 | — | см. сцену s2_s2_ch2 |
| `krivoy_price` | true | s2_late | — | см. сцену s2_late |
| `krivoy_tested` | true | c2_path_ranger_stakh_s3 | c2_path_ranger_stakh_s4 | см. сцену c2_path_ranger_stakh_s3 |
| `kudel_asked_cut` | true | talk_kudel_ch3 | — | см. сцену talk_kudel_ch3 |
| `kudel_banned_tower` | true | c3_orphans_s1 | — | см. сцену c3_orphans_s1 |
| `kudel_dodged_hand` | true | talk_kudel_ch3 | — | см. сцену talk_kudel_ch3 |
| `last_knot` | name, dreams, agafya, whole, rest | m11_s4 | m11.s5, концовка e_empty | последний узел (m11) |
| `lean` | archive, ash, weavers, none | m6_s4 | talk_ugar_ch3, talk_kudel_ch3, talk_yasna_ch3 | крен после «Трёх неправд» (m6) |
| `mal` | returned_holy, bought, sacrificed, stays, shirt | s1_s5 | talk_vesna_ch2, talk_mal_ch2, s1.s6, s1 (исход) | см. сцену s1_s5 |
| `mavra_heard_scratch` | true | talk_dead_mavra_ch3 | — | см. сцену talk_dead_mavra_ch3 |
| `mentor_cryo` | yasna | c2_path_cryo_s4 | c2_path_cryo (исход) | см. сцену c2_path_cryo_s4 |
| `mentor_hollow` | pryazha | c1_path_hollow_s1 | c1_path_hollow (исход) | стал Беспамятным у Узла |
| `mentor_priest` | kudel | c3_path_priest_s4 | c3_path_priest (исход) | см. сцену c3_path_priest_s4 |
| `mentor_pyro` | ugar, iskra | c3_path_pyro_s4, c3_path_pyro_s5 | c3_path_pyro (исход) | см. сцену c3_path_pyro_s4 |
| `mentor_ranger` | federot, stakh | c1_path_ranger_s3, c2_path_ranger_stakh_s4 | c1_path_ranger (исход), c2_path_ranger_stakh (исход) | кто научил следопыта |
| `mentor_warrior` | tur, gurdym, ostap | c1_path_warrior_s4, c2_path_warrior_gurdym_s4, c3_path_warrior_ostap_s4 | c2_buyer_s3, c2_path_warrior_gurdym_s1, c1_path_warrior (исход), c2_path_warrior_gurdym (исход), c3_path_warrior_ostap (исход) | кто научил воина |
| `mentor_weaver` | agafya | c1_path_weaver_s4 | c3_deadnight_s1, c1_path_weaver (исход) | кто научил ткача |
| `met_kudel` | true | m6 (исход) | m4_s6 | см. сцену m6 (исход) |
| `mirta` | returned, farewell, weavers, blame_ugar | s13_s4 | s13 (исход) | см. сцену s13_s4 |
| `mitya_hidden` | true | m4_s5 | m4_after_choice, c3_agafya_holds, m4 (исход) | см. сцену m4_s5 |
| `mitya_kept` | true, false, archive, hero | m4 (исход) | m8_s1, m8_s6, m11_s2 | держит ли Агафья Митрия после Проводов |
| `mitya_voice` | true | chapter_2_start | talk_agafya_ch2, m4_s2_ch2 | см. сцену chapter_2_start |
| `morven` | frozen, burned, released, keeper, persuaded, killed | m10_s4 | m10_s6, m11_s1, m10.s5, m10.s7, m10.s8, m10 (исход) | решение в нижнем зале (m10) |
| `morven_met` | 1 | m5 (исход) | — | см. сцену m5 (исход) |
| `morven_q1` | who, dead, kill | m5_s5 | m5_s6 | см. сцену m5_s5 |
| `morven_spiders` | true | m9 (исход) | m10_s3, m10_s4 | см. сцену m9 (исход) |
| `morven_warned` | true | m5_s6 | c3_deadnight_s1 | см. сцену m5_s6 |
| `name_mavra` | true | talk_dead_mavra_ch3 | talk_dead_mavra_ch3, c3_deadnight_s5 | см. сцену talk_dead_mavra_ch3 |
| `name_pakhom` | true | m5_s2, talk_dead_pakhom_ch3 | talk_dead_pakhom_ch3, c3_path_priest_s2, c3_deadnight_s5 | см. сцену m5_s2 |
| `opis` | asked, stolen, ugar_jar, silent | s6_s3 | c3_orphans_s3, talk_yasna_ch3, s6.s4, s6 (исход), c3_orphans | см. сцену s6_s3 |
| `orphan_kuzka_consent` | true | c3_orphans_s2 | — | см. сцену c3_orphans_s2 |
| `orphan_lasko_consent` | true | c3_orphans_s2 | — | см. сцену c3_orphans_s2 |
| `orphans_jars` | yasna_word, bought, taken, left | c3_orphans_s3 | c3_orphans_s4, talk_kudel_ch3, talk_yasna_ch3, talk_khrustalina_ch3, c3_orphans.s4, c3_orphans (исход) | см. сцену c3_orphans_s3 |
| `ostap_asked` | who, home | m5_s3 | — | см. сцену m5_s3 |
| `ostap_kin` | true | s10_crack | — | см. сцену s10_crack |
| `ostap_many` | true | talk_ostap_ch3 | — | см. сцену talk_ostap_ch3 |
| `ostap_rest` | true | s10 (исход) | — | см. сцену s10 (исход) |
| `pakhom_red_winter_hint` | true | talk_dead_pakhom_ch3 | — | см. сцену talk_dead_pakhom_ch3 |
| `pebbles_found` | +n | c2_pebbles_s2 | — | см. сцену c2_pebbles_s2 |
| `pelageya_knows_son` | true | s1_s6 | — | см. сцену s1_s6 |
| `pelageya_m_asked` | true | c1_shirts_s3 | — | см. сцену c1_shirts_s3 |
| `pelageya_through_water` | true | talk_pelageya_ch2 | — | см. сцену talk_pelageya_ch2 |
| `pin_leak` | true | c3_truth_s3 | — | см. сцену c3_truth_s3 |
| `pin_seam` | true | c3_truth_s3 | — | см. сцену c3_truth_s3 |
| `pin_splinter` | true | c3_truth_s3 | — | см. сцену c3_truth_s3 |
| `pisma` | silent, truth, meet | s10_s3 | talk_ulita_ch2, s10.s4, s10.s5, s10 (исход) | см. сцену s10_s3 |
| `pochtar` | scared, brave | s10_post | talk_ulita_ch2, s10_crack, s10_answer, c2_hoard_s1 | см. сцену s10_post |
| `priest_song_hint` | true | c3_path_priest_s2 | — | см. сцену c3_path_priest_s2 |
| `priest_thanked_thread` | true | c3_path_priest_s2 | — | см. сцену c3_path_priest_s2 |
| `provody` | spoken, sold, taken | m4_s5 | talk_federot_ch2, m4_after_choice, m4_dawn_text, c3_agafya_holds, c3_names, chapter_3_start | Проводы (m4): spoken / sold / taken |
| `provody_jars` | archive_wing | m4_after_choice, m4 (исход) | — | см. сцену m4_after_choice |
| `pyro_teacher` | ugar, iskra | c3_path_pyro_s1 | c3_path_pyro_s1, c3_path_pyro_s2, c3_path_pyro.s4, c3_path_pyro.s5 | см. сцену c3_path_pyro_s1 |
| `read_yasna_notes` | true | c2_path_cryo_s3 | — | см. сцену c2_path_cryo_s3 |
| `red_pebble` | kept, returned, river | c2_pebbles_s4, c2_pebbles_s5 | talk_gurdym_ch2, c2_pebbles.s5, c2_pebbles (исход) | см. сцену c2_pebbles_s4 |
| `red_winter` | true, burned | m3_s5 | — | см. сцену m3_s5 |
| `ruins_open` | true | s5 (исход) | — | см. сцену s5 (исход) |
| `s2_convoy_gone` | true | s2_late | s2 | см. сцену s2_late |
| `savva` | returned, dunya, wolf, killed | s8_s4 | s8.s5, s8 (исход) | см. сцену s8_s4 |
| `scroll_bogdan_hand` | true | talk_dead_scroll_ch3 | — | см. сцену talk_dead_scroll_ch3 |
| `scroll_matches_scrap` | true | talk_dead_scroll_ch3 | — | см. сцену talk_dead_scroll_ch3 |
| `seal_cut_seen` | true | m5_s1b | — | см. сцену m5_s1b |
| `seal_cut_wool` | true | m5_s1b | — | см. сцену m5_s1b |
| `shirts` | bought, truth, left | c1_shirts_s2 | c1_shirts_s3, c1_council_s1 | рубашки Пелагеи: bought / truth / left |
| `shurshok` | freed, guide, captive | m2_s4, talk_shurshok_ch2 | m3_s1, m3_s3, m5_s1, m2_s5, c1_council_s1, c1_trader_s1 | судьба гоблинёнка (m2): freed / guide / captive |
| `shurshok_button` | true | m2_s4 | m2_s5, m2 (исход) | см. сцену m2_s4 |
| `shurshok_gift` | region, quest, shared | s12_s2 | s12.s4, s12.s5, s12 (исход) | см. сцену s12_s2 |
| `stakh` | robbed, bought, told, betrayed | s2_s4 | talk_pelageya_ch2, s2_s4_ch2, offer_c2_path_ranger_stakh, talk_gostena_ch2, talk_stakh_ch2, s2.s5 | см. сцену s2_s4 |
| `t1_ask` | how, no | t1_s1 | — | см. сцену t1_s1 |
| `t1_lesson` | kept, power | t1_s4 | t1 (исход) | см. сцену t1_s4 |
| `trader_bag` | given, bought, taken, none | c1_trader_s2 | c1_trader_s3 | см. сцену c1_trader_s2 |
| `trial_archive` | true | s6 (исход) | m6_s4 | см. сцену s6 (исход) |
| `trial_ash` | true | c3_bonfire (исход) | m6_s4 | см. сцену c3_bonfire (исход) |
| `trial_weavers` | true | s11 (исход) | m6_s4 | см. сцену s11 (исход) |
| `trials_done` | +n | s6 (исход), s11 (исход), c3_bonfire (исход) | m6_s4 | см. сцену s6 (исход) |
| `trials_skip` | true | talk_morven_ch3 | talk_morven_ch3, m6.s3t | см. сцену talk_morven_ch3 |
| `truth_board` | stitched, wrong_mitya, wrong_morven, wrong_released, wrong | c3_truth_s4 | talk_agafya_ch3, c3_truth (исход) | см. сцену c3_truth_s4 |
| `truth_fifth` | agafya, gurdym | c3_truth_s1, c3_truth_s2 | c3_truth_s4 | см. сцену c3_truth_s1 |
| `truth_q1` | morven, leak | c3_truth_s4 | — | см. сцену c3_truth_s4 |
| `truth_wrong` | morven, ash, released, mitya | c3_truth_s4 | c3_truth_s4 | см. сцену c3_truth_s4 |
| `tur` | muscle, gift, let_go | s3_s4 | s3.s5, s3 (исход) | см. сцену s3_s4 |
| `tur_hint_mine` | true | c1_well_s4 | — | см. сцену c1_well_s4 |
| `tur_jar_bought` | true | c2_buyer_jar | — | см. сцену c2_buyer_jar |
| `tur_last` | kept, sold, returned, shelf | c2_buyer_s3, talk_tur_ch2 | c2_buyer_s4, talk_ivar_ch2, talk_tur_ch2, talk_yasna_ch2 | см. сцену c2_buyer_s3 |
| `tur_last_sold` | true | c2_buyer_s3 | talk_agafya_ch2, talk_vesna_ch2, talk_tur_ch2 | см. сцену c2_buyer_s3 |
| `ugar_cord_matches_jar` | true | c3_bonfire_s6 | — | см. сцену c3_bonfire_s6 |
| `ugar_jar_knot_seen` | true | s6_s2 | c3_bonfire_s6 | см. сцену s6_s2 |
| `ugar_on_tlen` | true | talk_ugar_ch3 | — | см. сцену talk_ugar_ch3 |
| `ulita_admitted` | true | talk_ulita_ch2 | — | см. сцену talk_ulita_ch2 |
| `verses` | +n | s5_s2, s5_s3, s5_s4 | s5_s5 | см. сцену s5_s2 |
| `vesna_noticed_candle` | true | talk_vesna_ch2 | talk_yasna_ch2 | см. сцену talk_vesna_ch2 |
| `vesna_said_gordey` | true | c1_wood_s1 | c1_path_warrior_s1, talk_vesna_ch2 | см. сцену c1_wood_s1 |
| `vesna_stitched_mirror` | true | talk_vesna_ch3 | — | см. сцену talk_vesna_ch3 |
| `village_stitch` | true | s14 (исход) | — | см. сцену s14 (исход) |
| `village_verdict` | own, probation, outcast | c1_council_s1 | c1_council_s2, talk_ivar, chapter_2_start, chapter_3_start, ev_c3_khrustalina_visit, c3_deadnight_s10 | решение Схода о герое (гл.1): own — свой, probation — на испытании, outcast — изгой |
| `well_asked_marfa` | true | c1_well_s2 | — | см. сцену c1_well_s2 |
| `well_voices` | true | c1_well_s2 | talk_tur | см. сцену c1_well_s2 |
| `wing_brod_night_hint` | true | s6_wing | — | см. сцену s6_wing |
| `woke_ugar` | true | c3_bonfire_s6 | — | см. сцену c3_bonfire_s6 |
| `yard_help` | +n | c1_well (исход), c1_shirts (исход), c1_wood (исход) | c1_council_s1 | сколько дворов Брода помог герой (гл.1) |
| `yasna_fire_asked` | true | talk_yasna_ch2 | — | см. сцену talk_yasna_ch2 |
| `yasna_fire_fear_seen` | true | talk_yasna_ch3 | — | см. сцену talk_yasna_ch3 |
| `yasna_hint_cryo` | true | c2_buyer_s4 | — | см. сцену c2_buyer_s4 |
| `yasna_offer` | promised, refused, stalled | c2_buyer_s4 | talk_agafya_ch2, m4_s4_ch2, m4_after_choice, talk_ivar_ch2, c2_buyer (исход) | см. сцену c2_buyer_s4 |
| `yasna_on_sych` | true | talk_yasna_ch3 | — | см. сцену talk_yasna_ch3 |
| `yasna_own_shelf` | true | talk_yasna_ch2 | — | см. сцену talk_yasna_ch2 |
| `yasna_said_collective` | true | c2_buyer_s4 | talk_yasna_ch2 | см. сцену c2_buyer_s4 |
| `yasna_trade_shown` | true | c2_buyer_s4 | c2_buyer_s4 | см. сцену c2_buyer_s4 |
| `zhdan` | burn, farewell, none | c3_bonfire_s2 | c3_bonfire_s3, c3_orphans_s2, c3_orphans_s5 | см. сцену c3_bonfire_s2 |

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
| `chad` | Брат Чад | ash | 0 / 0 / 0 / 2 | ugar, iskra, federot |
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
| `pochtar` | Почтарь | forest | 0 / 2 / 0 / 0 | shurshok, ulita |
| `dead_efim` | Утопленник | undead | 0 / 0 / 0 / 0 | — |
| `dead_pakhom` | Старик с веслом | undead | 0 / 0 / 0 / 0 | — |
| `dead_mavra` | Женщина в переднике | undead | 0 / 0 / 0 / 0 | — |
| `dead_scroll` | Скелет со свитком | undead | 0 / 0 / 0 / 0 | — |

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
| `d_named_dead` | Назвал недопетого по имени на кладбище | undead +2 (всегда) | r_speaks_to_dead |
| `d_hero_informer` | Назвал Ивару держащих |  | r_hero_informer |
| `d_dissuaded_tur` | Отговорил Тура продавать последнее | village +3 (всегда) | — |
| `d_promised_names` | Пообещал Ясне бересту Проводов | archive +5, village -5 | r_names_promised |
| `d_hoard_graves` | Вернул памятки с гоблинской свалки на могилы | village +2, undead +3 (всегда) | — |
| `d_hoard_goblins` | Оставил гоблинам их свалку | forest +2 (всегда) | r_hero_goblin_friend |
| `d_hoard_fair` | Поделил свалку по-честному через Хрума | forest +1, village +1 (всегда) | — |
| `d_pebble_river` | Бросил красный камешек Гурдыма в реку | forest +3 (всегда) | — |
| `d_stakh_robbed_alone` | Опоздал к обозу: Стах взял его сам, с кровью | archive -5, rootless -5 (всегда) | — |
| `d_burned_at_bonfire` | Сжёг память на Ночи костров | ash +8, archive -3 (всегда) | r_hero_burned_at_bonfire |
| `d_argued_chad` | Спорил с братом Чадом у костра: «держать — не грех» | ash -2, undead +2 | — |
| `d_held_circle` | Держал круг у костра против недопетых | ash +4 (всегда) | — |
| `d_freed_orphan_jars` | Унёс из Башни детские склянки и вернул детям | archive -15, weavers +10 (всегда) | r_jars_opened |
| `d_bought_orphan_jars` | Выкупил у Архива детские склянки | archive +2, weavers +4 (всегда) | — |
| `d_asked_yasna_word` | Уговорил Ясну дать слово Старшей хранительницы против устава | weavers +4, archive -2 (всегда) | — |
| `d_held_the_fence` | Держал околицу в Ночь недопетых | village +10, undead -10 (всегда) | r_hero_held_the_fence |
| `d_led_dead_names` | Увёл мёртвых, называя их по именам | undead +15, village -6 (всегда) | r_hero_leads_dead |
| `d_brought_agafya_out` | Вывел Агафью с узелком к мёртвым | undead +6, village +2 (всегда) | — |

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
| `r_hero_informer` | Мокрый держащих старосте на бересту записывает | правда | village -4, undead -3 |
| `r_hero_archive_spy` | Мокрого башенная подослала: имена наши выведывать | ложь | village -6 |
| `r_names_promised` | Мокрый наши имена Башне пообещал | правда | village -6, undead -4 |
| `r_hero_goblin_friend` | Мокрый с гоблинами заодно: наши ложки с могил им оставил | правда | village -3, forest 2 |
| `r_hero_for_sale` | Кривой ищет, кому продать мокрого: Башня за живой архив хорошо платит | правда | rootless -3 |
| `r_hero_burned_at_bonfire` | Мокрый у Пепельных память в костёр кидал | правда | village -2, archive -3, ash 2 |
| `r_tlen_was_right` | Брат Чад говорит: Тлен был прав, держащих — в огонь | правда | — |
| `r_jars_opened` | В Башне детские склянки открыли — без устава | правда | archive -5, weavers 3 |
| `r_hero_held_the_fence` | Мокрый всю ночь околицу держал | правда | village 6, undead -3 |
| `r_hero_leads_dead` | Мокрый мертвяков по именам водит | правда | village -5, undead 5, ash -3 |
| `r_agafya_led_dead` | Агафья ночью мёртвых узелком увела | правда | — |

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
| `f_spindle_smell` | «Пахнешь веретеном» | Гурдым учуял в тебе веретено: «Тебя кто-то крутил. Тонко-тонко. Как пряжу». Где он нюхал такое раньше — не помнит: «Значит, прятали». |
| `f_gurdym_house` | «Дом на том берегу горит. Я стою» | Гурдым помнит пепелище за бродом не пустым: дом горел, а он стоял на холме и смотрел. Первое прямое свидетельство. |
| `f_ivar_list` | «Список — это власть» | Ивар велел записать держащих отдельной строкой. Так говорил его отец, староста Богдан: «Кто держит, тот и печать гнёт. Список — это власть». |
| `f_bogdan_hand` | «Отец так "д" писал» | Ивар узнал на обгорелом клочке с пепелища почерк своего отца: «д» хвостом вниз, с петлёй. Слово на клочке — «…держит». |
| `f_ulita_letters` | Письма Улиты | Улита шестьдесят лет пишет Остапу и получает ответы. Просит не говорить старосте. |
| `f_vesna_gordey` | Гордей в погребе | Весна вяжет покойного мужа из чужих рассказов. Сшиток сидит у неё в погребе и плохо поёт. |
| `f_brod_sold_night` | «Брод уже продавал нам целую ночь» | Ясна обмолвилась: однажды Брод продал Архиву целую ночь, всей деревней. Полку опечатывал хранитель Сыч. В описи: «Ольховый Брод. Ночь. Коллективная». |
| `f_needle_knock` | «Снаружи стучали. Иголкой» | Остап сквозь печать: в ночь, когда треснуло, снаружи стучали — тонко, железно, по шву. «Будто кто шил. Или распарывал». Потом ударило изнутри, и всё стало мокрым. |
| `f_red_pebble` | Красный камешек | Зима, которую Гурдым не может забыть, — тёплый красный камешек. В руке видно: река у брода красная, на том берегу горит изба, на холме стоит кто-то огромный. |
| `f_seal_cut` | Надрез в шве печати | В шве печати склепа свежий ровный надрез длиной в ладонь. Как иглой по воску. Края загнуты внутрь — резали снаружи. |
| `f_four_in_soot` | Четверо в саже | Остап: «Обычно по одному приходят. А тридцать пять зим назад пришли разом четверо. Все в саже. И не помнят ни один». |
| `f_scroll_skeleton` | Скелет со свитком | В первом ярусе склепа старый скелет сжимает свиток бересты и не отдаёт. «Список — это…» Конца слов он не помнит. |
| `f_sych_seal` | Печать хранителя Сыча | Дверь запечатанного крыла Башни. На сургуче сова и подпись: «Хранитель Сыч. Не вскрывать». Номера описи уходят за эту дверь. Хрусталина не подпускает: «Устав». |
| `f_good_hand` | «Хорошая рука вязала» | Кудель нащупала серую нитку на твоём запястье: «Ровно затянуто. Хорошая рука вязала». И сразу заговорила о погоде. |
| `f_chad_tlen` | «Тлен был прав» | Брат Чад шепчет у костра чужие слова: «Тлен был прав. Держащих — в огонь вместе с их мёртвыми». Тлен правил Кругом до Угара. Угар от этого имени отворачивается. |
| `f_ugar_cord` | Пустой шнурок Угара | На шее у Угара пустой шнурок с узелком. Руки в ожогах от запястий до локтей. Под утро он плачет во сне, а проснувшись, смеётся и ничего не помнит. |
| `f_stitched` | Ты сшит | Сложил враньё: протечка, щепка, шов, «похож на нас», «много чужих». Ты сшит из тех, кого держали: мать держит сына узелком, сестра — сестру виной, невеста — солдата письмами. Кто сшил — неизвестно. |
| `f_wrong_self` | Ложная уверенность | Сложил три неправды — и вышла четвёртая, своя. Ты уверен, что знаешь, кто ты. Уверенность — тоже нитка: тянет, куда не надо. |

## Обещания
| id | Кому | Что |
|---|---|---|
| `p_tur_silence` | Тур Горн | Никому не говорить, что Тур разучился ковать |
| `p_agafya_knots` | Агафья Вереск | Молчать о том, что Агафья вяжет узелки |
| `p_agafya_teach` | Агафья Вереск | Никому не говорить, что Агафья учила узелкам |
| `p_agafya_gurdym` | Агафья Вереск | Не убивать Гурдыма: он старый |
| `p_mitya_list` | Агафья Вереск | Не отдавать имя Митрия на Проводах |
| `p_ulita_letters` | Улита | Не говорить старосте про письма Улиты |
| `p_yasna_list` | Ясна Стынь | Отдать Ясне бересту с именами Проводов |
| `p_gurdym_pebble` | Гурдым | Бросить красный камешек в реку у брода |
| `p_stakh_convoy` | Рябой Стах | Прийти к обозу Архива на лесной дороге в срок |
| `p_iskra_witness` | Искра | Быть свидетелем на крещении Искры, когда встанет первый лёд |
| `p_khrustalina_watch` | Хрусталина | Взят Хрусталиной на заметку: не подходить к запечатанному крылу Башни без слова Старшей хранительницы |

## Отложенные последствия (события)
| id | Что | Эффекты | Сцена |
|---|---|---|---|
| `ev_goblin_raid` | Гоблины мстят за Гурдыма | rep:village:-3, spawn:goblin:village:x1 | — |
| `ev_federot_cools` | Федот остывает | rel:federot:hostility:-1 | — |
| `ev_ivar_visits` | Ивар ходит по дворам |  | — |
| `ev_tur_empty` | Тур без дочки | rel:tur:trust:-1 | ev_tur_empty |
| `ev_goblin_gift` | Гоблины благодарят | rep:forest:2 | ev_goblin_gift |
| `ev_graves_quiet` | Тихая Сторона | rep:undead:2 | — |
| `ev_s2_convoy` | Обоз Башни уходит лесной дорогой | flag:s2_convoy_gone=true | — |
| `ev_archive_remembers` | Архив помнит | rel:yasna:hostility:1, rep:archive:-3 | — |
| `ev_federot_full_net` | Полная сеть | rel:federot:trust:1, rep:village:2 | — |
| `ev_c3_chad_federot` | Чад в Броде | rumor:r_tlen_was_right | — |
| `ev_c3_snow_girl` | Первый снег Ласки |  | — |
| `ev_c3_khrustalina_visit` | Хрусталина в Броде |  | ev_c3_khrustalina_visit |
| `ev_c3_efim_oar` | Сухое весло | rel:federot:trust:1 | — |

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
| `tur_jar` | склянка «Тур Горн. Дочь. Смех» |
| `ulita_letters` | письма Улиты Остапу |
| `ostap_reply` | ответ Остапа, сложенный вчетверо |
| `stakh_knife` | нож Безродных (брата Стаха) |
| `yasna_vial` | склянка Ясны «Мокрый. Наблюдения» (опечатана) |
| `ugar_jar` | тёплая склянка «Брат Угар. Поступок. Не выдавать» |
| `first_coal` | первый уголь (в тряпице — от Угара, в синей ленте — от Искры) |
| `weaver_lamp` | четвёртая лампадка Перевязчиков |
| `ostap_spear` | копьё Остапа с ремнём, сшитым Улитой |
| `orphan_jars` | две детские склянки: «Первый снег» и «Мамин голос» |
| `pakhom_birch` | мокрая береста с Проводов, читается одна буква «П» |

## Торговцы
| id | Где | Фракция | Правила (кратко) |
|---|---|---|---|
| `vesna` | «Последняя кружка» | village | закрыто: Пока про тебя такое болтают, дверь закрыта. Мне людей не пугай. · Весна помнит про долг. · особый товар · цена ×1.2 |
| `gostena` | лавка Гостены | village | цена ×1.2 · тайная сделка · цена ×1.15 · тайная сделка |
| `tur` | кузня Тура | village | закрыто: Беру молот — и не знаю, куда бить. Не кую я. Не могу. · закрыто: Кузню я закрыл. Подметаю у Весны. Так спокойнее. · цена ×0.9 · Тур работает молча. В углу лежит маленький молоток, которого он не замечает. |
| `yasna` | Башня Неусыпных | archive | тайная сделка · особый товар · цена ×1.3 · цена ×0.9 · закрыто: Вы унесли детские склянки. Архив вам ничего не продаст. Это не личное. Это опись. · цена ×1.25 · Ясна отпускает товар чуть быстрее, чем раньше. И улыбается почти вовремя. · особый товар |
| `ugar` | костёр Угара | ash | особый товар · цена ×0.9 · Брат Чад стоит за плечом Угара и считает твои монеты. |
| `kudel` | узелки Кудели | weavers | цена ×0.85 · особый товар |
| `stakh` | стоянка Безродных | rootless | закрыто: Ты нас Башне сдал. Уходи, пока ноги носят. · цена ×1.25 · цена ×0.85 |
| `khrum` | мена Хрума | forest | цена ×0.85 · цена ×0.9 · цена ×1.2 · Хрум помнит про долг. Хрум всё помнит про долги. |

Цены зависят от ступени репутации фракции торговца (Враг — закрыто, Неприязнь ×1.5 без редкого товара, Свой ×0.9, Близкий ×0.8) и от доверия самого торговца (≥ 6 — ×0.9; вражда ≥ 7 — закрыто). Закрытый торговец всегда показывает, как вернуть доверие.
