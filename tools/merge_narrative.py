"""Include authored chapters and remove only overridden knots from legacy sources."""
import re
from pathlib import Path
root = Path(__file__).resolve().parents[1]
narr = root / 'site/narrative'
backup = root / 'work/legacy-original'
backup.mkdir(parents=True, exist_ok=True)
pattern = re.compile(r'^\s*===\s*(?:function\s+)?(\w+)', re.M)
all_new = set()
for chapter in range(2, 7):
    new = narr / f'ch{chapter}.ink'
    if not new.exists():
        raise SystemExit(f'Нет готовой главы: {new}')
    knots = set(pattern.findall(new.read_text()))
    if all_new & knots:
        raise SystemExit(f'Повтор узлов новых глав: {all_new & knots}')
    all_new |= knots
    legacy = narr / f'legacy_ch{chapter}.ink'
    original = backup / legacy.name
    if not original.exists():
        original.write_bytes(legacy.read_bytes())
    text = original.read_text()
    matches = list(pattern.finditer(text))
    pieces = [text[:matches[0].start()]] if matches else [text]
    removed = []
    for i, m in enumerate(matches):
        end = matches[i+1].start() if i+1 < len(matches) else len(text)
        if m.group(1) in knots:
            removed.append(m.group(1))
        else:
            pieces.append(text[m.start():end])
    legacy.write_text(''.join(pieces))
    print(f'Глава {chapter}: {len(knots)} новых узлов; заменено старых: {len(removed)}')
main = '// Корень завершённой арки «Пряжи». Сборка: node tools/build_ink.mjs\nINCLUDE common.ink\n'
main += ''.join(f'INCLUDE legacy_ch{n}.ink\n' for n in range(1, 7))
main += ''.join(f'INCLUDE ch{n}.ink\n' for n in range(1, 7))
main += '\n-> DONE\n'
(narr / 'main.ink').write_text(main)
