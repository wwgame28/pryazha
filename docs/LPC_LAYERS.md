# Слои внешности NPC (LPC), доступные в атласе игры

Используются в `story.json → npcs[].look`:
- `body`: `male` | `female` | `teen`;
- `skin` (#rrggbb);
- `hair`: имя прически;
- `hairColor` (#rrggbb);
- `head`: особая голова без «hair_»/«head_»;
- `base`: `body_skeleton` | `body_zombie`;
- `layers`: `[[слой, #цвет]]`.

**Причёски (`hair`):** afro bedhead bob braid bunches buzzcut curly_long curly_short long long_messy longhawk messy1 parted pixie plain ponytail swoop topknot_short wavy xlong

**Особые головы (`head`):**
- goblin, troll, skeleton, zombie, wolf, minotaur, lizard, orc_m, orc_f;
- старческие: `head_m_old` / `head_f_old` указываются как `"head": "m_old"` / `"f_old"`.

**Слои одежды и снаряжения (`layers`):**
- шея: amulet_cross amulet_spider scarf;
- доспехи: armor_leather armor_legion armor_plate chainmail pauldrons epaulets bracers bandages;
- одежда: apron_full blouse_ls dress kimono ls2 ls_laced overalls robe tabard tshirt tunic vest;
- пояса: belt belt_robe belt_sash;
- лицо: beard_5oclock_shadow beard_beard beard_medium beard_winter stache brows_thick brows_thin face_angry face_happy face_neutral nose_straight ears_elven ears_medium eyepatch glasses mask;
- обувь: boots boots_fold boots_rim feet_armor sandals shoes;
- плащи: cape cape_tattered cape_trim mantle;
- головные уборы: cap_feather cavalier crown hat_celestial hat_large headband_rune helm_barbarian helm_greathelm helm_kettle helm_mail helm_nasal hood tiara wizard bandana;
- рога: horns_back horns_curled;
- ноги: leggings legs_armor pantaloons pants skirt skirt_legion;
- в руках: bow arrow quiver dagger spear staff sword shield shield_crusader gloves.

Цвета берите приглушённые: Перевязь бледна, ярки только огонь, лёд и свет.
