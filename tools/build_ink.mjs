// Compiles site/narrative/main.ink (+ INCLUDEs) into story.ink.json, builds the scene index and docs/SCENES.md.
// Fails on any compiler error or warning. Usage: node tools/build_ink.mjs
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const NARR = path.join(ROOT, 'site/narrative');
const { Compiler, CompilerOptions, Story } = await import(path.join(ROOT, 'tools/node/node_modules/inkjs/dist/ink-full.mjs'));
const files = [];
const fileHandler = {
  ResolveInkFilename: (name) => path.join(NARR, name),
  LoadInkFileContents: (full) => { files.push(full); return fs.readFileSync(full, 'utf8'); },
};
const errors = [], warnings = [];
const errorHandler = (msg, type) => { (type === 2 ? errors : type === 1 ? warnings : []).push(msg); };
const MAIN = process.argv[2] || 'main.ink';
const OUTDIR = process.argv[3] ? path.resolve(process.argv[3]) : NARR;
const DOCS = process.argv[3] ? null : path.join(ROOT, 'docs/SCENES.md');
fs.mkdirSync(OUTDIR, { recursive: true });
const mainSrc = fs.readFileSync(path.join(NARR, MAIN), 'utf8');
const t0 = Date.now();
const c = new Compiler(mainSrc, new CompilerOptions(MAIN, [], true, errorHandler, fileHandler));
let story;
try { story = c.Compile(); } catch (e) { errors.push(String(e && e.message || e)); }
for (const e of c.errors || []) if (!errors.includes(e)) errors.push(e);
for (const w of c.warnings || []) if (!warnings.includes(w)) warnings.push(w);
if (errors.length || warnings.length || !story) {
  for (const e of errors) console.error('ERROR', e);
  for (const w of warnings) console.error('WARN ', w);
  console.error(`ink build failed: ${errors.length} errors, ${warnings.length} warnings`);
  process.exit(1);
}
const json = story.ToJson();
fs.writeFileSync(path.join(OUTDIR, 'story.ink.json'), json);
// ---- index: knots, stitches, tags, go() targets, speakers, source file ----
const rt = new Story(json);
const root = JSON.parse(json).root;
const named = root[root.length - 1] || {};
const index = { built: new Date().toISOString(), knots: {} };
for (const [k, cont] of Object.entries(named)) {
  if (k === '#f' || k === 'global decl' || !Array.isArray(cont)) continue;
  const last = cont[cont.length - 1];
  const stitches = last && typeof last === 'object' && !Array.isArray(last) ? Object.keys(last).filter((x) => !x.startsWith('#') && Array.isArray(last[x])) : [];
  let tags = {};
  try { for (const t of rt.TagsForContentAtPath(k) || []) { const m = /^(\w+)\s*:\s*(.*)$/.exec(t); if (m) tags[m[1]] = m[2].trim(); } } catch (e) { /* functions have no tags */ }
  index.knots[k] = { tags, stitches, go: [], speakers: [], file: null };
}
const SPK = /^\s*([a-z][a-z0-9_]*)\s*:\s*\S/;
for (const f of files) {
  const rel = path.relative(NARR, f); let cur = null;
  for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    const m = /^\s*===\s*(?:function\s+)?([\w]+)/.exec(line); if (m) { cur = index.knots[m[1]] || null; if (cur) cur.file = rel; continue; }
    if (!cur) continue;
    for (const g of line.matchAll(/\bgo\("([^"]+)"\)/g)) if (!cur.go.includes(g[1])) cur.go.push(g[1]);
    const s = SPK.exec(line); if (s && !/^\s*(~|\*|\+|-|#|=|\/\/)/.test(line) && !cur.speakers.includes(s[1])) cur.speakers.push(s[1]);
  }
}
fs.writeFileSync(path.join(OUTDIR, 'story.index.json'), JSON.stringify(index));
// ---- docs/SCENES.md ----
const scenes = Object.entries(index.knots).filter(([, k]) => k.tags.scene);
const byFile = {};
for (const [name, k] of scenes) (byFile[k.file] = byFile[k.file] || []).push([name, k]);
let md = `# Указатель сцен\n\nСобирается автоматически (\`node tools/build_ink.mjs\`) из тегов сцен в \`site/narrative/*.ink\`. Не править руками.\n\nВсего сцен: ${scenes.length}. Файлов: ${Object.keys(byFile).length}.\n`;
for (const [file, list] of Object.entries(byFile).sort()) {
  md += `\n## ${file}\n\n| Сцена | Место | Время | Участники | Условие запуска | Дальше |\n|---|---|---|---|---|---|\n`;
  for (const [name, k] of list) md += `| \`${name}\` | ${k.tags.place || ''} | ${k.tags.time || ''} | ${k.tags.who || ''} | ${(k.tags.trigger || '').replace(/\|/g, '/')} | ${k.tags.next || ''} |\n`;
}
if (DOCS) fs.writeFileSync(DOCS, md);
console.log(`ink ok: ${Object.keys(index.knots).length} knots (${scenes.length} scenes) from ${files.length + 1} files, ${json.length} bytes, ${Date.now() - t0} ms`);
