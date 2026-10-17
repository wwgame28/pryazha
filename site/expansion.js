import * as C from './continuance.js';
import * as MS from './memory_scenes.js';
import { encodeSave, decodeSave } from './save_io.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const META_KEY = 'pryazha.album.v1', OPT_KEY = 'pryazha.options.v1';
const get = key => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } };
const put = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } };
const freshMeta = () => ({version:1,endings:[],collectibles:[],achievements:[],runs:0});
const freshOptions = () => ({combat:'normal',largeText:false,reducedMotion:false});

export function createExpansion(A) {
  let meta = get(META_KEY) || freshMeta(), options = {...freshOptions(), ...(get(OPT_KEY)||{})};
  let visitT = 0, autosaveT = 20, nav = null, tab = 'journey';
  const applyOptions = () => {
    document.body.classList.toggle('large-text', !!options.largeText);
    document.body.classList.toggle('reduce-motion', !!options.reducedMotion);
  };
  applyOptions();
  const persist = () => { if (A.G()) meta = C.mergeMeta(meta, A.G()); put(META_KEY,meta); };
  const rewardText = r => [r.gold && `${r.gold} зол.`,r.echoes && `${r.echoes} Отголосков`,r.xp && `${r.xp} опыта`].filter(Boolean).join(' · ');
  const linesHtml = lines => (lines||[]).map(l => (l.who==='narr'||l.who==='act') ? `<p class="aside narr">${esc(l.text)}</p>` : `<p class="line"><b class="sp">${esc(l.who==='hero'||l.who==='self'?'Ты':A.npcName(l.who))}:</b> «${esc(l.text)}»</p>`).join('');
  const boardHTML = () => {
    const G=A.G(); if(!G) return '<p>Сначала проснись у реки.</p>';
    C.initJourney(G,meta);
    const summary=C.journeySummary(G,meta), offers=C.contracts(G);
    return `<div class="exp-head"><small>ПОХОДЫ ПЕРЕВЯЗИ</small><h2>Оставь след в мире</h2><p class="aside">Небольшие дела между большими решениями. Их можно выполнять рядом с основной историей. Нет срока, штрафа за отсутствие или обязательной боевой специализации.</p></div><div class="journey-count"><b>${summary.completed||0}</b><span>завершённых походов</span><b>${meta.collectibles?.length||0}</b><span>находок в общем альбоме</span></div><div class="contract-grid">${offers.map(o=>`<article class="contract ${o.status==='ready'?'ready':''}"><small>${['hunt','kill'].includes(o.kind)?'ОХОТА':o.kind==='visit'?'ДОРОГА':'ЗАБОТА'} · ${esc({offered:'доступно',active:'в пути',ready:'можно завершить',claimed:'завершено',abandoned:'отложено'}[o.status]||o.status)}</small><h3>${esc(o.title)}</h3><p>${esc(o.desc)}</p><p class="aside">${rewardText(o.reward||{})}</p>${['active','ready'].includes(o.status)?`<div class="contract-progress"><i style="width:${Math.min(100,100*(o.progress||0)/Math.max(1,o.count))}%"></i></div><small>${o.progress||0} / ${o.count}</small>`:''}<div class="row">${o.status==='offered'?`<button class="btn primary" data-a="exp_accept_${esc(o.id)}">Взяться</button>`:''}${o.status==='ready'?`<button class="btn primary" data-a="exp_claim_${esc(o.id)}">Завершить поход</button>`:''}${o.destination&&o.status==='active'?`<button class="btn" data-a="exp_nav_${esc(o.id)}">Показать направление</button>`:''}${o.status==='active'?`<button class="btn ghost" data-a="exp_abandon_${esc(o.id)}">Отложить</button>`:''}</div></article>`).join('')}</div><div class="row"><button class="btn" data-a="exp_rotate">Другие дела</button><button class="btn ghost" data-a="exp_archive">Открыть альбом</button></div><p class="aside">Завершай походы, чтобы находить короткие истории, которых нет в основной линии. После развязки можно остаться в мире или начать новую Перевязь с другим героем.</p>`;
  };
  const archiveHTML = () => {
    persist(); const cat=C.catalog();
    const endings=A.endings()||[];
    return `<div class="exp-head"><small>ОБЩИЙ АЛЬБОМ</small><h2>Что остаётся между жизнями</h2><p class="aside">Этот альбом не исчезает при создании нового героя. Истории и судьбы заново переживаются в каждом мире; здесь остаются только найденные следы и увиденные концовки.</p></div><h3 class="sub">Семь развязок · ${meta.endings?.length||0} / ${endings.length}</h3><div class="album-grid">${endings.map(e=>{const seen=(meta.endings||[]).find(x=>(typeof x==='string'?x:x.id)===e.id);return `<article class="album-card ${seen?'found':'unknown'}"><small>${seen?'УВИДЕНО':'ЕЩЁ НЕ ПЕРЕЖИТО'}</small><h3>${seen?esc(e.title):'Нераспутанная нить'}</h3>${seen?`<p>${esc(e.text)}</p>`:'<p class="aside">Другое решение может привести сюда. Название и текст скрыты, чтобы не раскрывать финал.</p>'}</article>`;}).join('')}</div><h3 class="sub">Находки · ${meta.collectibles?.length||0} / ${(cat.collectibles||[]).length}</h3><div class="album-grid">${(cat.collectibles||[]).map(c=>{const found=(meta.collectibles||[]).includes(c.id);return `<article class="album-card ${found?'found':'unknown'}"><small>${found?'СОХРАНЕНО':'НЕ НАЙДЕНО'}</small><h3>${found?esc(c.title):'След на бересте'}</h3><p${found?'':' class="aside"'}>${found?esc(c.text):'Возвращается из одного из завершённых походов.'}</p></article>`;}).join('')}</div><h3 class="sub">Следы поступков · ${meta.achievements?.length||0} / ${(cat.achievements||[]).length}</h3><div class="shop">${(cat.achievements||[]).map(c=>`<div class="it"><span>${esc(c.title)}<small>${esc(c.desc)}</small></span><em>${(meta.achievements||[]).includes(c.id)?'оставлен':'ещё впереди'}</em></div>`).join('')}</div>${A.G()?'<div class="row"><button class="btn" data-a="exp_new">Начать новую Перевязь</button><button class="btn ghost" data-a="exp_export">Скачать сохранение</button></div>':''}`;
  };
  const optionsHTML = () => `<h2>Твой ритм</h2><p class="aside">Сложность можно менять в любой момент. Истории, достижения и финалы от неё не закрываются.</p><div class="settings-group"><h3>Бой</h3><button class="btn ${options.combat==='normal'?'primary':''}" data-a="exp_normal">Обычный — цена ошибки</button><button class="btn ${options.combat==='calm'?'primary':''}" data-a="exp_calm">Спокойный — ради истории</button><p class="aside">В спокойном режиме входящий урон снижен примерно вдвое, а при гибели Отголоски остаются у тебя. Противники и их приёмы сохраняются.</p></div><div class="settings-group"><button class="btn" data-a="exp_text">${options.largeText?'Обычный текст':'Крупнее текст диалогов'}</button><button class="btn" data-a="exp_motion">${options.reducedMotion?'Включить эффекты интерфейса':'Меньше анимаций интерфейса'}</button></div><h3 class="sub">Сохранение в твоих руках</h3><p class="aside">Игра хранит мир в этом браузере и автоматически сохраняется во время странствия. Для перехода на другой компьютер или перед очисткой браузера скачай копию. На телефоне надёжнее открыть игру через статический сайт; локальный HTML поддерживают не все мобильные браузеры.</p><div class="row">${A.G()?'<button class="btn" data-a="exp_export">Скачать сохранение</button>':''}<button class="btn" data-a="exp_import">Загрузить сохранение</button></div>`;
  const openExtra = name => {
    tab=name; A.modal(`${name==='archive'?archiveHTML():name==='options'?optionsHTML():boardHTML()}<div class="row"><button class="btn primary" data-close>${A.inGame()?'Вернуться в мир':'Назад'}</button></div>`);
    A.setHandlers(handlers());
  };
  const saveOptions = () => {put(OPT_KEY,options);applyOptions();if(A.inGame())A.openMenu('options');else openExtra('options');};
  const exportFile = () => {
    if(!A.G()) return A.toast('Сначала создай героя.');
    A.save(); persist();
    try {const blob=new Blob([encodeSave(JSON.parse(JSON.stringify(A.G())),JSON.parse(JSON.stringify(meta)))],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='Pryazha-save.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);A.toast('Сохранение скачано. В нём герой, мир и общий альбом.');} catch(e){A.toast(e.message);}
  };
  const importFile = () => {
    const input=document.createElement('input');input.type='file';input.accept='.json,application/json';
    input.onchange=async()=>{const file=input.files?.[0];if(!file)return;if(file.size>4*1024*1024)return A.toast('Сохранение больше 4 МБ.');
      try {const data=decodeSave(await file.text());A.validateImported(data.hero);A.modal(`<h2>Продолжить другую нить?</h2><p class="line">${esc(data.hero.char.name.first)}, уровень ${data.hero.lvl}.</p><p class="aside">Текущий мир будет заменён. Его копия останется в резерве этого браузера; для надёжности сначала скачай сохранение. Найденные концовки и истории будут объединены, а не удалены.</p><div class="row"><button class="btn primary" data-a="load">Загрузить этот мир</button><button class="btn" data-a="back">Отмена</button></div>`);A.setHandlers({back:()=>openExtra('options'),load:()=>{meta=C.mergeMeta({...meta,collectibles:[...new Set([...(meta.collectibles||[]),...(data.meta.collectibles||[])])],achievements:[...new Set([...(meta.achievements||[]),...(data.meta.achievements||[])])],endings:[...(meta.endings||[]),...(data.meta.endings||[])]},data.hero);put(META_KEY,meta);A.importHero(data.hero);}});}catch(e){A.toast(e.message||'Не удалось прочитать сохранение.');}};
    input.click();
  };
  const requestNew = () => {
    if(!A.hasSavedHero()){A.showCreate();return;}
    A.modal(`<h2>Новая Перевязь</h2><p class="line">Другая жизнь. Другое тело. Тот же мир — заново.</p><p class="aside">Альбом концовок и находок останется. Текущий герой не будет заменён, пока ты не выберешь нового. Перед этим можно скачать его сохранение.</p><div class="row col"><button class="btn" data-a="export">Скачать текущую нить</button><button class="btn primary" data-a="new">Выбрать нового героя</button><button class="btn ghost" data-a="back">Остаться</button></div>`);
    A.setHandlers({export:()=>{if(!A.G())A.loadSavedForExport();exportFile();},new:()=>{A.close();A.showCreate();},back:()=>{A.close();if(A.inGame())A.openMenu('archive');}});
  };
  function handlers() {
    const h={exp_archive:()=>A.inGame()?A.openMenu('archive'):openExtra('archive'),exp_options:()=>openExtra('options'),exp_new:requestNew,exp_export:exportFile,exp_import:importFile,exp_normal:()=>{options.combat='normal';saveOptions();},exp_calm:()=>{options.combat='calm';saveOptions();},exp_text:()=>{options.largeText=!options.largeText;saveOptions();},exp_motion:()=>{options.reducedMotion=!options.reducedMotion;saveOptions();},exp_rotate:()=>{const r=C.rotateContracts(A.G());if(!r.ok)A.toast(r.error||'Сначала заверши или отложи текущие походы.');A.save();A.openMenu('journey');}};
    if(A.G()) for(const offer of C.contracts(A.G())) {
      h['exp_accept_'+offer.id]=()=>{const r=C.acceptContract(A.G(),offer.id);if(!r.ok)A.toast(r.error);A.save();A.openMenu('journey');};
      h['exp_abandon_'+offer.id]=()=>{C.abandonContract(A.G(),offer.id);if(nav?.id===offer.id)nav=null;A.save();A.openMenu('journey');};
      h['exp_nav_'+offer.id]=()=>{nav={id:offer.id,destination:offer.destination,target:offer.target,kind:offer.kind,title:offer.title};A.close();A.toast('Синяя метка на карте показывает направление похода.',2500);};
      h['exp_claim_'+offer.id]=()=>{const r=C.claimContract(A.G(),offer.id);if(!r.ok)return A.toast(r.error);A.reward(r.reward||{});persist();A.save();const discovery=typeof r.discovery==='string'?(C.catalog().collectibles||[]).find(x=>x.id===r.discovery):r.discovery;A.modal(`<h2>${esc(discovery?.title||'Поход завершён')}</h2><p class="line">${esc(discovery?.text||r.message||'Есть дела, о которых не напишут летопись. От этого они не становятся меньше.')}</p><p class="aside">${rewardText(r.reward||{})}. Находки остаются в общем альбоме.</p><div class="row"><button class="btn primary" data-a="next">Дальше</button></div>`);A.setHandlers({next:()=>A.openMenu('journey')});};
    }
    return h;
  }
  const event = value => {
    const G=A.G();if(!G)return;
    const result=C.recordEvent(G,value);if(result?.completed?.length)A.toast('Поход завершён. Открой «Походы», чтобы забрать находку.',2400);
    if(result?.unlocked?.length)persist();
  };
  const encounter = (npc, onlyLoss=false) => {
    const G=A.G();if(!G)return false;const enc=MS.nextEncounter(G,npc);if(!enc||(onlyLoss&&!['forget','loss','after_loss'].includes(enc.kind)))return false;
    A.modal(`<div class="talk memory-scene"><small>${enc.kind==='forget'||enc.kind==='loss'?'НЕ УЗНАТЬ — НЕ ЗНАЧИТ ПЕРЕСТАТЬ БЫТЬ ДОРОГИМ':'МЕЖДУ БОЛЬШИМИ ДЕЛАМИ'}</small><h2>${esc(enc.title)}</h2>${linesHtml(enc.lines)}<div class="row col">${enc.choices.map((c,i)=>`<button class="btn ${i===0?'primary':''}" data-a="memory_${i}" ${c.disabled?'disabled':''}>${esc(c.text)}</button>`).join('')}</div></div>`);
    const h={};enc.choices.forEach((choice,i)=>{h['memory_'+i]=()=>{if(choice.disabled)return;const reply=MS.finishEncounter(G,enc,choice.id);if(reply?.ok===false)return A.toast(reply.error);A.refresh();A.save();if(reply?.lines?.length){A.modal(`<h2>${esc(enc.title)}</h2>${linesHtml(reply.lines)}<div class="row"><button class="btn primary" data-close>Дальше</button></div>`);A.setHandlers({});}else A.close();};});A.setHandlers(h);return true;
  };
  const tick = dt => {
    const G=A.G();if(!G)return;
    if((autosaveT-=dt)<=0){autosaveT=20;A.save();}
    if((visitT-=dt)>0)return;visitT=1;
    const player=A.player();if(!player||!A.isOverworld())return;
    const activeVisits=C.contracts(G).filter(o=>o.kind==='visit'&&o.status==='active').map(o=>o.target);
    for(const target of ['ford','village_well','tavern','ashes','oldgrave','ruins','tower','camp','witchhut','hamlet_dry','menhir']) {
      if(G.journey?.events?.visited?.[target]&&!activeVisits.includes(target))continue;
      const p=A.locPos(target);if(p&&Math.hypot(player.x-p[0],player.y-p[1])<160)event({kind:'visit',target,unique:target});
    }
    const el=document.getElementById('journeyHint');
    if(nav){const active=C.contracts(G).find(x=>x.id===nav.id);if(!active||active.status!=='active')nav=null;}
    const p=nav&&(nav.kind==='rest'?A.firePos(nav.target):A.locPos(nav.destination));
    if(el){el.hidden=!p;if(p){const dx=p[0]-player.x,dy=p[1]-player.y;const arrow=['→','↘','↓','↙','←','↖','↑','↗'][(Math.round(Math.atan2(dy,dx)/(Math.PI/4))+8)%8];el.textContent=`${arrow} ${nav.title} · ${Math.round(Math.hypot(dx,dy)/32)} шагов`;}}
  };
  const afterStart = fresh => {const G=A.G();C.initJourney(G,meta);MS.initScenes(G);if(fresh){put(META_KEY,meta);}nav=null;autosaveT=20;visitT=0;A.save();if(!fresh){const steps=A.mainSteps();const text=steps[0]?.s?.text;A.toast(text?'Ты вернулся. Сейчас: '+text:'Ты вернулся. У мира ещё есть истории для тебя.',4500);}else A.tip('journey','Походы и альбом','В меню появились «Походы»: короткие охоты и мирные дороги между большими делами. Их находки остаются с тобой даже в новой Перевязи.');};
  const ending = e => {C.recordEnding(meta,e.id,{name:A.heroName(),level:A.G().lvl});persist();};
  const title = () => {const el=document.getElementById('albumCount');if(el)el.textContent=`${meta.endings?.length||0} из 7 развязок · ${meta.collectibles?.length||0} находок между жизнями`;};
  return {boardHTML,archiveHTML,optionsHTML,handlers,event,encounter,tick,afterStart,ending,title,requestNew,openExtra,registerLoss:card=>MS.registerLoss(A.G(),card),greeting:npc=>MS.greetingOverride?.(A.G(),npc),calm:()=>options.combat==='calm',options:()=>({...options}),persist,navigation:()=>nav&&(nav.kind==='rest'?A.firePos(nav.target):A.locPos(nav.destination)),meta:()=>meta};
}
