from pathlib import Path
import zipfile, json, shutil, hashlib
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'dist'
SKIP={'node_modules','.git','out','dist','__pycache__','.DS_Store'}
TRANSITIONAL={'integrate_expansion.py','update_shell.py','refine_memory.py','normalize_album.py'}
archive=OUT/'Pryazha_Complete.zip'
with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    z.write(OUT/'Pryazha.html','Pryazha/Pryazha.html')
    for name in ['START_HERE.md','RELEASE_NOTES.md','QA_RESULTS.md','CREDITS.md','index.html']:
        if (ROOT/name).exists():z.write(ROOT/name,'Pryazha/'+name)
    for folder in ['site','licenses','docs','tools','tests','work']:
        for p in sorted((ROOT/folder).rglob('*')):
            rel=p.relative_to(ROOT)
            if not p.is_file() or p.is_symlink() or set(rel.parts)&SKIP or p.name in TRANSITIONAL:continue
            if folder=='work' and not (p.suffix=='.json' or 'legacy-original' in p.parts):continue
            z.write(p,'Pryazha/'+str(rel))
manifest={'files':[]}
for p in [OUT/'Pryazha.html',archive]:
    manifest['files'].append({'name':p.name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
(OUT/'release-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(manifest,ensure_ascii=False,indent=2))
with zipfile.ZipFile(archive) as z:
    bad=z.testzip()
    if bad:raise RuntimeError('Повреждён ZIP: '+bad)
    names=set(z.namelist())
    for name in ['Pryazha/Pryazha.html','Pryazha/START_HERE.md','Pryazha/site/game.js','Pryazha/site/narrative/ch6.ink','Pryazha/site/fonts/PTSans-LICENSE.txt','Pryazha/tools/node/package-lock.json']:
        assert name in names,name
print('Архив проверен; автономная игра и полные исходники включены.')
