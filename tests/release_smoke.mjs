import {chromium} from '../tools/node/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const dir=new URL('../',import.meta.url).pathname;
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const results=[];
for(const [mode,url] of [['http','http://127.0.0.1:8765/index.html'],['offline','file://'+dir+'dist/Pryazha.html']]) {
  const context=await browser.newContext({viewport:{width:1280,height:800}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const external=[];page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith('http://127.0.0.1'))external.push(r.url());});
  if(mode==='offline')await context.setOffline(true);else await page.route('https://fonts.**',r=>r.abort());
  await page.goto(url);await page.waitForFunction(()=>!!window.__game,{timeout:45000});
  await page.click('#titleSettings');await page.click('[data-a="exp_calm"]');
  if(!await page.locator('[data-a="exp_calm"]').evaluate(el=>el.classList.contains('primary')))throw new Error('calm mode was not applied');
  await page.click('[data-close]');await page.click('#newGame');await page.click('[data-pick="0"]');
  await page.waitForFunction(()=>!!window.__game.player);await page.waitForTimeout(400);await page.click('[data-close]');await page.waitForTimeout(400);
  await page.evaluate(()=>window.__game.openMenu('journey'));
  const contracts=await page.locator('.contract').count();if(contracts!==3)throw new Error('expected three contracts');
  await page.locator('[data-a^="exp_accept_"]').first().click();
  await page.evaluate(()=>window.__game.openMenu('archive'));await page.screenshot({path:dir+'out/smoke-'+mode+'-album.png'});
  await page.evaluate(()=>window.__game.openMenu('options'));
  const save=await page.evaluate(()=>{const g=window.__game;g.save();return JSON.parse(localStorage.getItem('alderford.save.v1'));});
  if(!save?.journey||!save?.memoryScenes)throw new Error('expansion state was not saved');
  await page.click('[data-close]');
  await page.evaluate(()=>{const g=window.__game;const p=g.locPos('ford');g.player.x=p[0];g.player.y=p[1];g.worldTick(false);});
  await page.waitForTimeout(500);await page.screenshot({path:dir+'out/smoke-'+mode+'-world.png'});
  if(errors.length)throw new Error(mode+' runtime errors: '+errors.join('; '));
  if(mode==='offline'&&external.length)throw new Error('offline file requested external assets');
  results.push({mode,contracts,errors,externalAssets:external.length,saved:true});await context.close();console.log(mode+' запуск, меню и сохранение: OK');
}
// Touch layout opens the same menus without dependence on keyboard input.
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage();
await page.route('https://fonts.**',r=>r.abort());await page.goto('http://127.0.0.1:8765/index.html');await page.waitForFunction(()=>!!window.__game);await page.click('#newGame');await page.locator('[data-pick="0"]').click();await page.waitForFunction(()=>!!window.__game.player);await page.waitForTimeout(400);await page.click('[data-close]');await page.waitForTimeout(200);for(let i=0;i<12;i++){if(!await page.locator('#modal').isVisible())break;const bs=page.locator('#modalBody button:enabled');const next=page.locator('[data-a="next"]');if(await next.count())await next.first().click();else await bs.first().click();await page.waitForTimeout(100);}await page.click('#bJourney');await page.screenshot({path:dir+'out/smoke-mobile.png'});
const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2);if(overflow)throw new Error('mobile horizontal overflow');
results.push({mode:'touch',overflow,contracts:await page.locator('.contract').count()});
fs.writeFileSync(dir+'out/smoke-results.json',JSON.stringify(results,null,2));
await browser.close();console.log('Сенсорный интерфейс: OK');
