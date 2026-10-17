import {chromium} from '../tools/node/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url).pathname;
const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const p=await b.newPage({viewport:{width:1280,height:800},acceptDownloads:true});const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto('http://127.0.0.1:8765/');await p.waitForFunction(()=>!!window.__game);await p.click('#newGame');await p.click('[data-pick="0"]');await p.waitForFunction(()=>!!window.__game.player);await p.waitForTimeout(200);for(let i=0;i<20;i++){if(!await p.locator('#modal').isVisible())break;const bs=p.locator('#modalBody button:enabled');const next=p.locator('[data-a="next"]');if(await next.count())await next.first().click();else await bs.first().click();await p.waitForTimeout(100);}
await p.evaluate(()=>window.__game.openMenu('journey'));
// Complete a genuine rest action at the selected world fire and claim through the UI.
const offer=await p.evaluate(async()=>{const C=await import('/site/continuance.js');const g=window.__game;const o=C.contracts(g.G).find(o=>o.kind==='rest');C.acceptContract(g.G,o.id);return o;});
await p.evaluate(id=>{const g=window.__game;document.querySelector('[data-close]').click();const fire=g.maps.world.restFires().find(f=>f.id===id);g.player.x=fire.x;g.player.y=fire.y;g.worldTick(false);g.doRest(fire);g.openMenu('journey');},offer.target);
const before=await p.evaluate(()=>window.__game.G.gold);await p.click('[data-a="exp_claim_'+offer.id+'"]');
const awarded=await p.evaluate(()=>({gold:window.__game.G.gold,meta:window.__game.EXP.meta(),completed:window.__game.G.journey.events.claims}));assert.equal(awarded.completed,1);assert.ok(awarded.gold>before);assert.equal(awarded.meta.collectibles.length,1);
await p.click('[data-a="next"]');assert.equal(await p.locator('[data-a="exp_claim_'+offer.id+'"]').count(),0);
// Make an actual bond and sacrifice it through the original game function.
await p.evaluate(()=>{const g=window.__game;document.querySelector('[data-close]').click();g.MEM.addCard(g.G,{id:'b_agafya',type:'bond',title:'Агафья',weight:5,links:{npc:'agafya'},journal:['Миска слева.']});g.G.memory.heroKnows.agafya=2;g.G.ws.rel.agafya={trust:8,respect:5,hostility:0,fear:0};g.doSacrifice(g.G.memory.cards.find(c=>c.id==='b_agafya'),'strong_thread');});
await p.click('[data-close]');
await p.evaluate(()=>{const g=window.__game;const pos=g.locPos('ford');g.player.x=pos[0];g.player.y=pos[1];g.worldTick(false);});await p.waitForTimeout(600);
await p.evaluate(()=>{const g=window.__game;const e=g.ents.find(e=>e.storyId==='agafya');g.talk(e);});
assert.equal(await p.locator('.memory-scene').count(),1);await p.screenshot({path:root+'out/memory-loss.png'});await p.locator('[data-a^="memory_"]').first().click();await p.click('[data-close]');
assert.equal(await p.evaluate(()=>window.__game.G.ws.rel.agafya.trust),8);assert.equal(await p.evaluate(()=>window.__game.G.memoryScenes.losses.agafya.firstDone),true);
await p.waitForTimeout(500);await p.evaluate(()=>window.__game.openMenu('options'));
const downloadPromise=p.waitForEvent('download',{timeout:5000}).catch(async e=>{console.log('EXPORT_MODAL',await p.locator('#modalBody').innerText());throw e;});await p.click('[data-a="exp_export"]');const dl=await downloadPromise;const saveFile=root+'out/browser-save.json';await dl.saveAs(saveFile);const data=JSON.parse(fs.readFileSync(saveFile));assert.equal(data.format,'pryazha-portable');assert.equal(data.meta.collectibles.length,1);
// New life: preserve album, don't accidentally copy previous ink/position/tree into a fresh hero.
await p.evaluate(()=>window.__game.openMenu('archive'));await p.click('[data-a="exp_new"]');await p.click('[data-a="new"]');await p.locator('[data-pick="1"]').click();await p.waitForTimeout(300);assert.equal(await p.evaluate(()=>window.__game.G.lvl),1);assert.equal(await p.evaluate(()=>window.__game.G.memory.sacrificed.length),0);assert.equal(await p.evaluate(()=>window.__game.EXP.meta().collectibles.length),1);
// Import the downloaded world using the file chooser and game's confirmation.
await p.evaluate(()=>window.__game.openMenu('options'));const chooserPromise=p.waitForEvent('filechooser');await p.click('[data-a="exp_import"]');await(await chooserPromise).setFiles(saveFile);await p.click('[data-a="load"]');await p.waitForTimeout(500);
assert.equal(await p.evaluate(()=>window.__game.G.memoryScenes.losses.agafya.firstDone),true);assert.equal(await p.evaluate(()=>window.__game.EXP.meta().collectibles.length),1);
if(errors.length)throw new Error(errors.join('; '));
fs.writeFileSync(root+'out/expansion-browser-results.json',JSON.stringify({actualRestReward:true,doubleClaimPrevented:true,bondLossScene:true,npcCarePreserved:true,portableSave:true,newLifeAlbumPreserved:true,importResumesWorld:true,errors},null,2));
await b.close();console.log('Поход, награда, забвение, новая Перевязь и импорт: OK');
