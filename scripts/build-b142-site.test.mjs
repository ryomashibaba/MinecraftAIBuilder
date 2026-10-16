import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {B142_LAYERS,verifyPayload,renderB142Html,assertSafeInput} from './build-b142-site.mjs';
const h='a'.repeat(64);
function fixture(){
 const kinds=['FACADE_PANEL_PROXY','WINDOW_GLAZING_PROXY','ROOF_CAP_PROXY',
  'EXTERIOR_PORTAL_VOID_PROXY','FURNITURE_PLACEHOLDER','ROOM_FLOOR_TRACE',
  'GALLERY_FLOOR_TRACE','CORE_LANDING_TRACE',...B142_LAYERS];
 return {meta:{schema:'minecraftaibuilder-b142-offline-design-preview-v1',
  target:'MINECRAFT_EDUCATION',conceptualOnly:true,readyForWorld:false,
  constructionApproved:false,executionAllowed:false,worldContacts:0,
  worldCoordinates:null,operations:[],gates:Array(9).fill('BLOCKED'),
  b141IntegritySha256:h,b140IntegritySha256:h,b106SourceSha256:h,
  totals:{buildings:15,floors:66,stairs:102,selectedIndependent:70,held:32}},
  scenes:Array.from({length:15},(_,i)=>({
   id:'FIXTURE_'+i,typology:'house',levels:2,
   primitives:[[0,0,0,0,0]],layerNames:kinds,
   stats:{b142CollisionProven:false,b142ConstructionApproved:false}
  }))};
}
test('B142 site payload is source-limited and explicitly non-executable',()=>{
 const f=fixture();assert.equal(verifyPayload(f),true);
 f.meta.executionAllowed=true;assert.equal(verifyPayload(f),false);
 f.meta.executionAllowed=false;f.meta.operations.push({command:'setblock'});
 assert.equal(verifyPayload(f),false);
 f.meta.operations=[];f.meta.gates[2]='PASSED';
 assert.equal(verifyPayload(f),false);
});
test('B142 refuses source records without verifiable B141-B140-B106 safety',()=>{
 assert.throws(()=>assertSafeInput({b141:{},b140:{},b106:{}}),
  /B142_PARENT_INTEGRITY_OR_SAFETY_FAILURE/);
});
test('B142 augments established B106 renderer with live design annotations',()=>{
 const html=fs.readFileSync(new URL('../source/parallel/b106/main/review-template.html',import.meta.url),'utf8');
 const result=renderB142Html(fixture(),html);
 assert.match(result,/B142_PROPOSED_FIVE_RISE_STAIR/);
 assert.match(result,/上階開口（未承認）/);
 assert.match(result,/NOT_PREPARED \/ 9 BLOCKED/);
 assert.match(result,/B142_JOINT_HEADROOM_HOLD/);
 assert(!result.includes('__B106_SCENE_PAYLOAD__'));
 assert(!result.includes('fetch('));
});
