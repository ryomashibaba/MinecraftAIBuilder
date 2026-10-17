/**
 * B198C test-only actual source DSL fixtures.
 * Not a language model, and never interpreted as proof of model intelligence.
 */
import {SCHEMA as DSL} from '../source/ai/b143-building-dsl.mjs';
export const fragmentedGallery=()=>({
 schema:DSL,id:'b198c-source-fragmented-hall',
 title:'Two disjoint public decks — repair benchmark',
 brief:'Two 2-wide supported public decks, separated by an unbridged floor gap.',
 bounds:{width:48,height:20,depth:32},designOnly:true,
 elements:[
  {id:'west-original-platform',shape:'box',mode:'add',origin:[4,5,7],
   size:[12,1,12],material:'concrete'},
  {id:'east-original-platform',shape:'box',mode:'add',origin:[22,5,7],
   size:[12,1,12],material:'wood'},
  {id:'upper-floating-hall',shape:'box',mode:'add',origin:[10,14,24],
   size:[18,1,5],material:'glass'},
  {id:'exterior-beacon',shape:'box',mode:'add',origin:[3,6,23],
   size:[2,11,2],material:'glow'}
 ]});
export const bridgedGallery=()=>{
 const design=fragmentedGallery();
 design.elements.push({id:'real-width-four-source-bridge',
  shape:'box',mode:'add',origin:[16,5,8],size:[6,1,10],
  material:'metal'});
 return design;
};
export const enclosedAtrium=()=>({
 schema:DSL,id:'b198c-enclosed-void-detection',
 title:'Enclosed hollow architectural chamber',
 brief:'A real hollow shell with a broad enclosed air chamber for voxel flood validation.',
 bounds:{width:32,height:28,depth:32},designOnly:true,
 elements:[
  {id:'hollow-room-shell',shape:'box',mode:'add',
   origin:[5,5,5],size:[18,14,18],shell:1,material:'stone'},
  {id:'gallery-lantern',shape:'box',mode:'add',
   origin:[11,18,11],size:[6,1,6],material:'glow'}
 ]});
export const candidate=design=>({
 design,explanation:'Test fixture proposal to verify source topology, not actual AI understanding.',
 assumptions:['Test-only B143 geometry','Minecraft world untouched']
});
