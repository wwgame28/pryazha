# Собирает чистую копию проекта для публичного репозитория (GitHub + GitHub Pages).
# Что попадает: игра (site/), документы (docs/), инструменты, тесты (без локальных путей), лицензии ассетов,
# корневой index.html для GitHub Pages. Что не попадает: черновики глав в работе, сборки, логи, скриншоты,
# node_modules, резервные копии, локальные настройки.
# Использование: python3 -I tools/export_repo.py <папка-назначение> [папка-с-лицензиями-ассетов]
import os, re, shutil, sys, json

SRC = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DST = os.path.abspath(sys.argv[1])
LIC = os.path.abspath(sys.argv[2]) if len(sys.argv) > 2 else None
# главы 2–6 ещё пишутся: их файлы попадут в репозиторий после слияния и проверки
WIP = re.compile(r'^narrative/(ch[2-6]\.ink|main_ch[2-6]\.ink)$')

def keep_site(rel):
    if rel in ('test.html',) or WIP.match(rel): return False
    return not rel.endswith(('.log', '.tmp'))

def copytree(src, dst, keep=lambda rel: True):
    for root, dirs, files in os.walk(src):
        dirs[:] = [d for d in dirs if d not in ('node_modules', '__pycache__', 'proto')]
        for f in files:
            full = os.path.join(root, f); rel = os.path.relpath(full, src).replace(os.sep, '/')
            if not keep(rel): continue
            out = os.path.join(dst, rel); os.makedirs(os.path.dirname(out), exist_ok=True); shutil.copy2(full, out)

# чистим всё, кроме .git
if os.path.isdir(DST):
    for n in os.listdir(DST):
        if n == '.git': continue
        p = os.path.join(DST, n); shutil.rmtree(p) if os.path.isdir(p) else os.remove(p)
os.makedirs(DST, exist_ok=True)

copytree(os.path.join(SRC, 'site'), os.path.join(DST, 'site'), keep_site)
copytree(os.path.join(SRC, 'docs'), os.path.join(DST, 'docs'))
# в документах — без путей рабочей машины
for root, _, files in os.walk(os.path.join(DST, 'docs')):
    for f in files:
        if not f.endswith('.md'): continue
        fp = os.path.join(root, f); s = open(fp, encoding='utf-8').read()
        s = s.replace('/home/user/pryazha', '<клон репозитория>').replace('`scratchpad/game/`', 'корень репозитория').replace(' (`/home/user/Www`)', '')
        s = re.sub(r'`scratchpad/backup/[^`]*`', 'резервная копия вне репозитория', s).replace('scratchpad/', '')
        open(fp, 'w', encoding='utf-8').write(s)
os.makedirs(os.path.join(DST, 'tools', 'node'), exist_ok=True)
for f in os.listdir(os.path.join(SRC, 'tools')):
    if f.endswith(('.mjs', '.py')) and f != 'proto_browser.mjs': shutil.copy2(os.path.join(SRC, 'tools', f), os.path.join(DST, 'tools', f))
for f in ('package.json', 'package-lock.json'):
    p = os.path.join(SRC, 'tools', 'node', f)
    if os.path.exists(p): shutil.copy2(p, os.path.join(DST, 'tools', 'node', f))
shutil.copy2(os.path.join(SRC, 'mktest.sh'), os.path.join(DST, 'mktest.sh'))

# тесты: без путей песочницы — Playwright из npm, скриншоты в ./out/
os.makedirs(os.path.join(DST, 'tests'), exist_ok=True)
shutil.copy2(os.path.join(SRC, 'tests', 'world_state.test.mjs'), os.path.join(DST, 'tests', 'world_state.test.mjs'))
for t in ('t10.mjs', 't24.mjs', 't25.mjs', 't26.mjs', 't27.mjs', 't28.mjs'):
    p = os.path.join(SRC, t)
    if not os.path.exists(p): continue
    s = open(p, encoding='utf-8').read()
    s = re.sub(r"from '/[^']*playwright/index\.mjs'", "from 'playwright'", s)
    s = re.sub(r"const OUT = '/[^']*';", "const OUT = (process.env.OUT || './out/'); (await import('node:fs')).mkdirSync(OUT, { recursive: true });", s)
    assert '/tmp/' not in s and '/opt/' not in s, t
    open(os.path.join(DST, 'tests', t), 'w', encoding='utf-8').write(s)

# лицензии сторонних ассетов (копии файлов авторов)
if LIC and os.path.isdir(LIC):
    for root, _, files in os.walk(LIC):
        for f in files:
            if re.search(r'(credit|licen|source|readme)', f, re.I) and f.lower().endswith(('.txt', '.md')):
                rel = os.path.relpath(os.path.join(root, f), LIC).replace(os.sep, '__').replace(' ', '_')
                os.makedirs(os.path.join(DST, 'licenses'), exist_ok=True)
                shutil.copy2(os.path.join(root, f), os.path.join(DST, 'licenses', rel))

# страница для GitHub Pages: весь документ, ресурсы — из site/
frag = open(os.path.join(SRC, 'site', 'index.html'), encoding='utf-8').read()
head = ('<!doctype html><html lang="ru"><head><meta charset="utf-8"><base href="site/">'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
        '<meta name="theme-color" content="#0f0d16"><meta name="apple-mobile-web-app-capable" content="yes">'
        '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><title>Пряжа</title>'
        '<meta name="description" content="Пряжа — браузерная сюжетная RPG о памяти, нитях и долгах.">'
        # установка на телефон: манифест и значок (пути — от site/ из-за <base>), офлайн-кэш — sw.js в корне
        '<link rel="manifest" href="manifest.webmanifest"><link rel="apple-touch-icon" href="icons/apple-touch-icon.png">'
        '<script>if ("serviceWorker" in navigator && location.protocol === "https:") addEventListener("load", () => '
        'navigator.serviceWorker.register(location.href.split("#")[0].split("?")[0].replace(/[^/]*$/, "") + "sw.js").catch(() => {}));</script>'
        '</head><body>\n')
open(os.path.join(DST, 'index.html'), 'w', encoding='utf-8').write(head + frag + '\n</body></html>\n')
open(os.path.join(DST, '.nojekyll'), 'w').write('')  # GitHub Pages отдаёт файлы как есть
# офлайн: service worker кэширует игру целиком при установке и потом отдаёт из кэша, обновляясь из сети
import hashlib
files = ['index.html']
for root, _, fs in os.walk(os.path.join(DST, 'site')):
    for f in fs:
        rel = os.path.relpath(os.path.join(root, f), DST).replace(os.sep, '/')
        if not rel.endswith('.ink'): files.append(rel)
files.sort()
ver = hashlib.sha1(''.join(f + str(os.path.getsize(os.path.join(DST, f))) for f in files).encode()).hexdigest()[:10]
sw = '''// Офлайн-кэш «Пряжи» (собирается tools/export_repo.py). Версия меняется вместе с файлами игры.
const VERSION = 'pryazha-%s';
const FILES = %s;
self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(['./', ...FILES])).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return; // шрифты — из сети как есть
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => {
    const net = fetch(req).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); } return res; });
    return hit || net.catch(() => (req.mode === 'navigate' ? caches.match('./') : Response.error()));
  }));
});
''' % (ver, json.dumps(files, ensure_ascii=False))
open(os.path.join(DST, 'sw.js'), 'w', encoding='utf-8').write(sw)
for f in os.listdir(os.path.join(SRC, 'repo_files')): shutil.copy2(os.path.join(SRC, 'repo_files', f), os.path.join(DST, f))  # README, CREDITS
open(os.path.join(DST, '.gitignore'), 'w').write('node_modules/\nout/\n*.log\nsite/test.html\nwork/\n')

# главы 2–6 ещё пишутся: их правки в старых сценах (legacy_chN.ink) не выкладываем, пока главы не слиты и не проверены —
# в репозитории остаётся последняя выложенная версия этих файлов
import subprocess
KEEP_FROM_REPO = [f'site/narrative/legacy_ch{n}.ink' for n in range(2, 7)]
if os.path.isdir(os.path.join(DST, '.git')):
    for rel in KEEP_FROM_REPO:
        r = subprocess.run(['git', '-C', DST, 'show', f'HEAD:{rel}'], capture_output=True)
        if r.returncode == 0: open(os.path.join(DST, rel), 'wb').write(r.stdout)

# проверка: ни секретов, ни локальных путей
bad = []
for root, _, files in os.walk(DST):
    if '/.git' in root: continue
    files = [f for f in files if f != 'export_repo.py']
    for f in files:
        if f.endswith(('.js', '.mjs', '.py', '.md', '.json', '.html', '.sh', '.ink', '.txt')):
            s = open(os.path.join(root, f), encoding='utf-8', errors='ignore').read()
            if ('/tmp/' + 'claude-0') in s or '/home/' + 'user/' in s or re.search(r'(api[_-]?key|secret|token)\s*[:=]\s*["\'][A-Za-z0-9_\-]{16,}', s, re.I): bad.append(os.path.relpath(os.path.join(root, f), DST))
print('exported to', DST, '| suspicious:', bad or 'none')
