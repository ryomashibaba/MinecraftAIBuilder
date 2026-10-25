import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {parseR135FreshFurnishedReply}
 from './r135-furnished-program.mjs';
import {makeR134FreshRequest,runR134FreshModel,parseR134FreshArgs}
 from './r134-fresh-model-pilot.mjs';
const base=()=>({
 id:'new-community-innovation-center',
 title:'Creative experimental community workshop',
 footprint:{width:28,depth:28},
 materials:{floor:'wood',wall:'stone',roof:'metal'},
 layout:{axis:'z',spaces:[
  {id:'public-workshop',purpose:'A hands-on invention workspace',weight:3},
  {id:'gallery-space',purpose:'Interactive displays of inventions',weight:2},
  {id:'component-storage',purpose:'Equipment inventory and maintenance',weight:2}
 ]},
 form:{roofProfile:'ridge',facadeLanguage:'fins'}
});
const obj=[
 {id:'workbench',zoneId:'public-workshop',role:'work-surface',corner:'far-left'},
 {id:'merch-display',zoneId:'gallery-space',role:'display-stand',corner:'far-right'},
 {id:'storage-shelves',zoneId:'component-storage',role:'storage-rack',corner:'far-left'}
];
const proposal=()=>({...base(),objects:obj});
const brief='Design an original compact community invention workshop with exhibit space and storage.';
const req=()=>makeR134FreshRequest({brief});
const tmp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'r135-'));
const mock=reply=>async (url,opt)=>{
 if(opt.method==='GET')return {ok:true,text:async()=>JSON.stringify({
  models:[{name:'qwen3.5:2b'}]})};
 assert.equal(opt.method,'POST');
 assert.equal(url,'http://127.0.0.1:11434/v1/chat/completions');
 const sent=JSON.parse(opt.body);
 assert.equal(sent.model,'qwen3.5:2b');
 assert.equal(sent.max_tokens,1450);
 assert.ok(sent.messages[0].content.includes('objects'));
 const prompt=JSON.parse(sent.messages[1].content);
 assert.equal(prompt.naturalLanguageBrief,brief);
 assert.equal(prompt.semanticEquipment.perRoomAtLeastOne,true);
 assert.ok(!JSON.stringify(prompt).includes('independentAcceptance'));
 return {ok:true,text:async()=>JSON.stringify({
  choices:[{finish_reason:'stop',message:{content:JSON.stringify(reply)}}]})};
};
test('new model-authored meaning becomes distinct genuine shell and furnished B143 solids',()=>{
 const r=parseR135FreshFurnishedReply(JSON.stringify(proposal()),req());
 assert.equal(r.base.program[0].zones.length,3);
 assert.equal(r.featured.placements.length,3);
 assert.ok(r.addedTrueB143Voxels>25);
 assert.ok(r.featured.compiled.primitives.length>
  r.base.compiled.primitives.length);
 assert.notEqual(r.furnishedSourceSha256,r.originalShellSourceSha256);
 assert.equal(r.featured.everyFeatureSourceAccessible,true);
 assert.equal(r.sourceRoutes,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(r.physicallyRepresentedZoneCount,3);
 assert.equal(r.modelProvenance,'FROM_CALLER_RESPONSE_UNAUTHENTICATED');
 assert.equal(r.worldWrites,0);
 assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
});
test('single local model response saves both 3D shell and furnished architectural comparisons',async t=>{
 const root=tmp();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const out=path.join(root,'fresh-furnished');
 const r=await runR134FreshModel({
  model:'qwen3.5:2b',brief,outDir:out,equipmentMode:'assembled'
 },{fetcher:mock(proposal())});
 assert.equal(r.status,'HOLD_TEST_DOUBLE_NOT_REAL_INFERENCE');
 assert.equal(r.modelCalls,1);
 assert.equal(r.modelAuthoredProgram,false);
 assert.equal(r.zoneCount,3);
 assert.equal(r.equipmentCount,3);
 assert.equal(r.eachRoomHasModelChosenEquipment,true);
 assert.ok(r.addedEquipmentVoxels>25);
 assert.equal(r.sourceRoutes,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.ok(fs.existsSync(path.join(out,'shell.html')));
 assert.ok(fs.existsSync(path.join(out,'index.html')));
 assert.ok(fs.existsSync(path.join(out,'DERIVED_REAL_VOXELS.json')));
 assert.ok(fs.existsSync(path.join(out,'MODEL_CHOSEN_FUNCTIONAL_EQUIPMENT.json')));
 assert.equal(fs.readFileSync(path.join(out,'MODEL_RAW_ORIGINAL.txt'),'utf8'),
  JSON.stringify(proposal()));
 assert.equal(r.worldWrites,0);
 assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
});
test('a fourth room can be furnished by the same generic roles and source route checker',()=>{
 const p=proposal();
 p.layout.spaces.push({id:'meeting-hub',purpose:'Group learning and conversation',weight:2});
 p.objects.push({id:'shared-seating',zoneId:'meeting-hub',
  role:'seating',corner:'near-right'});
 const r=parseR135FreshFurnishedReply(JSON.stringify(p),req());
 assert.equal(r.base.program[0].zones.length,4);
 assert.equal(r.featured.placements.length,4);
 assert.equal(r.sourceRoutes,'SOURCE_ROUTES_REACH_ALL_ZONES');
});
test('unknown command, unknown room, missing room equipment and extra fields HOLD rather than invent fixtures',()=>{
 const bads=[
  {...proposal(),objects:obj.slice(0,2)},
  {...proposal(),objects:[...obj.slice(0,2),{...obj[2],zoneId:'ghost-area'}]},
  {...proposal(),objects:[...obj.slice(0,2),{...obj[2],role:'execute-shell'}]},
  {...proposal(),objects:[...obj.slice(0,2),{...obj[2],command:'setblock'}]},
  {...proposal(),script:'process.exit()'}
 ];
 for(const p of bads)assert.throws(()=>
  parseR135FreshFurnishedReply(JSON.stringify(p),req()),/R135_FURNISHED_/);
});
test('on unsafe model response original raw remains, no new geometry or Minecraft work is published',async t=>{
 const root=tmp();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const out=path.join(root,'invalid');
 const r=await runR134FreshModel({
  model:'qwen3.5:2b',brief,outDir:out,equipmentMode:'assembled'
 },{fetcher:mock({...proposal(),objects:obj.slice(0,2)})});
 assert.equal(r.status,'HOLD_MODEL_OUTPUT_OR_GEOMETRY');
 assert.equal(r.modelCalls,1);
 assert.ok(fs.existsSync(path.join(out,'MODEL_RAW_ORIGINAL.txt')));
 assert.equal(fs.existsSync(path.join(out,'DERIVED_B143_SOURCE.json')),false);
 assert.equal(r.worldWrites,0);
});
test('CLI accepts explicit assembled mode and rejects all unsupported mode values',()=>{
 const argv=['--model','qwen3.5:2b','--brief',brief,'--out','new',
  '--equipment','assembled'];
 const r=parseR134FreshArgs(argv);
 assert.equal(r.equipmentMode,'assembled');
 assert.throws(()=>parseR134FreshArgs([...argv.slice(0,-1),'danger']),
  /R134_MODEL_INVALID_EQUIPMENT_MODE/);
});
