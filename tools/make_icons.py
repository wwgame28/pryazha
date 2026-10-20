# Рисует значок «Пряжи» (клубок красной нити на ночном фоне) в пиксельной сетке 32×32 и сохраняет
# увеличенные копии для установки на телефон: 512, 192, 180 (iPhone) и «маскируемый» 512 с полями.
# Использование: python3 -I tools/make_icons.py
import math, os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'site', 'icons')

def pixel_icon(pad=0):
    n = 32 + pad * 2
    im = Image.new('RGBA', (n, n), (15, 13, 22, 255))
    px = im.load()
    # ночной фон с мягким светом из-за клубка
    for y in range(n):
        for x in range(n):
            d = math.hypot(x - n / 2, y - n / 2 + 1) / (n / 2)
            g = max(0, 1 - d) ** 2
            px[x, y] = (int(15 + 34 * g), int(13 + 18 * g), int(22 + 22 * g), 255)
    cx, cy, r = n / 2, n / 2 - 1, 9.2
    base, light, dark, line = (198, 63, 55), (232, 96, 82), (130, 34, 30), (96, 22, 20)
    for y in range(n):
        for x in range(n):
            dx, dy = x + .5 - cx, y + .5 - cy
            if dx * dx + dy * dy <= r * r:
                shade = (dx * -.55 + dy * -.75) / r  # свет сверху слева
                c = light if shade > .35 else dark if shade < -.45 else base
                # витки нити: дуги поперёк клубка
                a = math.atan2(dy, dx); rr = math.hypot(dx, dy)
                if int((rr * 1.35 + math.sin(a * 2) * 1.6) * 1.0) % 3 == 0 and rr > 2: c = line if c != light else base
                px[x, y] = c + (255,)
    # хвост нити: вниз и вправо, с узелком на конце
    d = ImageDraw.Draw(im)
    tail = [(cx + 6, cy + 6), (cx + 9, cy + 9), (cx + 10, cy + 11), (cx + 12, cy + 12), (cx + 13, cy + 13)]
    for (x0, y0), (x1, y1) in zip(tail, tail[1:]): d.line([(x0, y0), (x1, y1)], fill=base + (255,), width=1)
    d.rectangle([cx + 12, cy + 12, cx + 14, cy + 14], fill=light + (255,))
    # блик
    d.point((cx - 4, cy - 5), fill=(255, 214, 196, 255)); d.point((cx - 5, cy - 4), fill=(255, 214, 196, 255))
    return im

os.makedirs(OUT, exist_ok=True)
icon = pixel_icon()
for size, name in ((512, 'app-512.png'), (192, 'app-192.png'), (180, 'apple-touch-icon.png')):
    icon.resize((size, size), Image.NEAREST).convert('RGB').save(os.path.join(OUT, name))
pixel_icon(pad=6).resize((512, 512), Image.NEAREST).convert('RGB').save(os.path.join(OUT, 'app-maskable-512.png'))  # поля под круглую маску
print('icons ->', OUT)
