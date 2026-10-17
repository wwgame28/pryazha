import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Story} from '../site/story.js';
import * as WS from '../site/world_state.js';
const data=JSON.parse(fs.readFileSync(new URL('../site/story.json',import.meta.url)));
const index=JSON.parse(fs.readFileSync(new URL('../site/narrative/story.index.json',import.meta.url)));
const cons=JSON.parse(fs.readFileSync(new URL('../site/narrative/consequences.json',import.meta.url)));
WS.setData(cons);
function setup(flags={},clarity=40,{dreams=0,agafya=0,cards=[]}={}) {
  const G={char:{name:{first:'Гость'}},cls:'human',lvl:1,gold:50,time:30,flags,memory:{dreams:Array.from({length:dreams},(_,i)=>'d'+i),heroKnows:{agafya},cards,sacrificed:[]},ws:{chapter:6}},calls=[];
  const api={G:()=>G,clarity:()=>clarity,school:()=>'',isNight:()=>false,hasCard:id=>cards.some(c=>c.id===id),sceneIndex:()=>index,now:()=>0,save:()=>calls.push('save'),updateHUD:()=>{},gold:()=>{},xp:()=>{},echoes:()=>{},cardById:()=>null,questDone:()=>calls.push('questDone'),ending:e=>{calls.push('ending');G.flags.ending=e.id;},chapterTo:n=>calls.push('chapter:'+n),hasScene:()=>false,toast:()=>{}};
  return {G,calls,story:new Story(data,api)};
}
test('all six chapters have a connected main line and registered late NPC IDs',()=>{
  assert.equal(data.endings.length,7);assert.ok(Array.isArray(data.npcs));assert.ok(Array.isArray(data.lateNpcs||[]));
  const npcs=new Set(data.npcs.map(n=>n.id)),quests=new Set(data.quests.map(q=>q.id));
  for(const id of data.lateNpcs||[])assert.ok(npcs.has(id),'late NPC '+id+' exists');
  for(let ch=1;ch<=6;ch++)assert.ok(data.quests.some(q=>q.chapter===ch&&q.chain==='main'));
  for(const q of data.quests){for(const id of q.after||[])assert.ok(quests.has(id));for(const s of q.steps)if(s.scene)assert.ok(index.knots[s.scene],q.id+':'+s.scene);}
  assert.equal(data.quests.find(q=>q.id==='m3').after[0],'c1_council');
});
test('all seven endings are achievable under their intended conditions',()=>{
  const cases=[['e_empty',{},5,{}],['e_keeper',{morven:'keeper'},40,{}],['e_own_name',{morven:'persuaded',pominy:true,gurdym:'spared',hero_self:'one'},40,{dreams:5,agafya:2,cards:[{id:'n_self'}]}],['e_return',{morven:'released'},40,{}],['e_glass',{morven:'frozen'},40,{}],['e_ash',{morven:'burned'},40,{}],['e_living_dead',{morven:'killed',faction:'weavers'},40,{}]];
  for(const [id,flags,clarity,extra]of cases)assert.equal(setup(flags,clarity,extra).story.ending().id,id);
});
test('finale is shown after the quest reward and cannot create a seventh chapter',()=>{
  const {G,calls,story}=setup({morven:'frozen'});G.story={active:{m11:{step:'s6',counter:0,at:0}}};story.finish('m11');
  assert.equal(G.flags.ending,'e_glass');assert.ok(calls.indexOf('ending')>calls.indexOf('questDone'));assert.equal(calls.some(x=>x==='chapter:7'),false);assert.notEqual(story.S.done.m11,undefined);
});
test('renewed bond shows a known name without restoring the surrendered memory',()=>{
  const {G,story}=setup({},40,{cards:[{id:'b_agafya_new',type:'bond',links:{npc:'agafya'}}]});G.memory.sacrificed=[{id:'b_agafya',type:'bond',links:{npc:'agafya'}}];
  assert.equal(story.npcName('agafya'),data.npcs.find(n=>n.id==='agafya').name);assert.equal(G.memory.cards.some(c=>c.id==='b_agafya'),false);
});
