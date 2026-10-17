// Build a fully offline HTML file: original canvas game, bundled code, local art/audio/story.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from './node/node_modules/esbuild/lib/main.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const site = path.join(root, 'site'), dist = path.join(root, 'dist');
fs.mkdirSync(dist, { recursive: true });
const assets = {};
const types = { '.png':'image/png', '.ogg':'audio/ogg', '.json':'application/json', '.woff2':'font/woff2', '.woff':'font/woff', '.ttf':'font/ttf' };
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) { if (!['node_modules'].includes(entry.name)) walk(file); continue; }
    const mime = types[path.extname(file)]; if (!mime) continue;
    assets[path.relative(site, file).split(path.sep).join('/')] = [mime, fs.readFileSync(file).toString('base64')];
  }
}
walk(site);
const result = await build({ entryPoints: [path.join(site, 'game.js')], bundle: true, format: 'iife', target: 'es2020', write: false, minify: true, legalComments: 'inline' });
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
html = html.replace(/<base\b[^>]*>/gi, '').replace(/<link\b[^>]*(?:fonts.googleapis|fonts.gstatic|fonts\/fonts.css)[^>]*>/gi, '');
const prelude = String.raw`(() => {
  const files = ${JSON.stringify(assets)};
  const blobs = new Map();
  const keyOf = input => {
    let raw = typeof input === 'string' ? input : input?.url || String(input);
    if (/^(data:|blob:)/.test(raw)) return null;
    if (/^https?:/.test(raw)) { try { const u = new URL(raw); if (u.origin !== location.origin) return null; raw = u.pathname; } catch { return null; } }
    raw = decodeURIComponent(raw.split('?')[0].split('#')[0]).replace(/^file:\/\/[^/]*\//, '').replace(/^\.\//, '');
    const keys = [raw, raw.replace(/^\/?site\//, ''), raw.replace(/^\//,'')];
    for (const k of keys) if (files[k]) return k;
    for (const k of Object.keys(files)) if (raw.endsWith('/' + k)) return k;
    return null;
  };
  const blob = key => {
    if (!blobs.has(key)) {
      const [mime, b64] = files[key]; const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      blobs.set(key, new Blob([bytes], {type:mime}));
    }
    return blobs.get(key);
  };
  const urls = new Map();
  window.__assetUrl = input => { const key = keyOf(input); if (!key) return input; if (!urls.has(key)) urls.set(key, URL.createObjectURL(blob(key))); return urls.get(key); };
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input, options) => { const key = keyOf(input); return key ? Promise.resolve(new Response(blob(key), {status:200, headers:{'Content-Type':files[key][0]}})) : nativeFetch(input,options); };
  const patchSrc = proto => { const d = Object.getOwnPropertyDescriptor(proto,'src'); if (d?.set) Object.defineProperty(proto,'src',{...d,set(value){d.set.call(this,window.__assetUrl(value));}}); };
  patchSrc(HTMLImageElement.prototype); patchSrc(HTMLMediaElement.prototype);
  const NativeAudio = window.Audio;
  window.Audio = function(src) { return new NativeAudio(src ? window.__assetUrl(src) : undefined); };
  window.Audio.prototype = NativeAudio.prototype;
  const sheet = document.createElement('style');
  sheet.textContent = ${JSON.stringify(fs.readFileSync(path.join(site, 'fonts/fonts.css'), 'utf8').replaceAll('url(', 'url(fonts/'))}.replace(/url\(([^)]+)\)/g, (_,u) => 'url('+window.__assetUrl(u)+')');
  document.head.append(sheet);
  document.querySelectorAll('[style]').forEach(el => {el.style.cssText=el.style.cssText.replace(/url\(([^)]+)\)/g,(_,u)=>'url('+window.__assetUrl(u.replace(/["']/g,''))+')');});
})();`;
const scriptSafe = s => s.replace(/<\/script/gi, '<\\/script');
html = html.replace(/<script type="module" src="game.js"><\/script>/, () => `<script>${scriptSafe(prelude)}</script>\n<script>${scriptSafe(result.outputFiles[0].text)}</script>`);
html = html.replace(/<script type="module">/g, '<script>');
const notices={source:'https://github.com/wwgame28/pryazha',credits:fs.readFileSync(path.join(root,'CREDITS.md'),'utf8'),fontLicenses:{}};
for(const n of fs.readdirSync(path.join(site,'fonts')).filter(n=>n.endsWith('LICENSE.txt')))notices.fontLicenses[n]=fs.readFileSync(path.join(site,'fonts',n),'utf8');
html=html.replace(/<\/body>/i,()=>`<script type="application/json" id="pryazha-attribution">${scriptSafe(JSON.stringify(notices))}</script></body>`);
const output = path.join(dist, 'Pryazha.html');
fs.writeFileSync(output, html);
fs.writeFileSync(path.join(dist, 'release-manifest.json'), JSON.stringify({ title:'Пряжа', format:'standalone-html', assets:Object.keys(assets).length, bytes:fs.statSync(output).size, storyKnots:Object.keys(JSON.parse(fs.readFileSync(path.join(site,'narrative/story.index.json'))).knots).length }, null, 2));
console.log('Автономная игра:', output, '—', fs.statSync(output).size, 'байт, ресурсов:', Object.keys(assets).length);
