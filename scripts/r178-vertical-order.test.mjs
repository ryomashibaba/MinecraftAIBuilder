import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {makeR134FreshRequest} from './r134-fresh-model-pilot.mjs';
import {parseR139RelationalFurnishedReply} from './r139-relational-model.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {R178_HEIGHT_SCHEMA,validateR178HeightOrderIntent,r178ToR160}
 from '../source/ai/r178-vertical-order-intent.mjs';

const room=[
 {id:'craftwork',purpose:'Workshop and craftsmanship',weight:4},
 {id:'storefront',purpose:'Visitors and product displays',weight:3},
 {id:'inventory',purpose:'Brightly lit storage and supplies',weight:2},
 {id:'employee',purpose:'Quiet administration and planning',weight:1}
];
const objects=[
 {id:'workbench',zoneId:'craftwork',role:'work-surface',corner:'near-left'},
 {id:'shelves',zoneId:'storefront',role:'display-stand',corner:'far-right'},
 {id:'stockrack',zoneId:'inventory',role:'storage-rack',corner:'far-left'},
 {id:'staffdesk',zoneId:'employee',role:'work-surface',corner:'near-right'}
];
const A=['employee','inventory','storefront','craftwork'];
const B=['craftwork','storefront','inventory','employee'];
const flags={allowTopologyComposition:true,allowHostGridResearch:true,
 allowHostVolumeResearch:true,allowHostSculpturalResearch:true,
 allowModelRoomHeightOrderResearch:true};
const req=makeR134FreshRequest({brief:'Synthetic four-room SOURCE author study'});
function plan(order){
 return {id:'r178-static-synthetic-study',title:'Synthetic four-room height-order study',
  footprint:{width:28,depth:28},
  materials:{floor:'stone',wall:'concrete',roof:'metal'},
  layout:{axis:'z',spaces:room},form:{roofProfile:'flat',facadeLanguage:'plain'},
  objects,relations:{entryFacingZoneId:'storefront',
   directAdjacencies:[['storefront','craftwork'],['storefront','inventory']]},
  architecture:{schema:R178_HEIGHT_SCHEMA,entryHierarchy:'quiet',
   daylightStrategy:'even',roofEdge:'fine',
   spatialTopology:'central-spine',roomHeightOrder:order}};
}
const cells=p=>new Map(p.compiled.primitives.filter(v=>v[1]<=5)
 .map(v=>[v.slice(0,3).join(','),v[3]]));
const eq=(x,y)=>x.size===y.size&&[...x].every(([k,v])=>y.get(k)===v);
const safe=x=>x.readiness==='NOT_PREPARED'&&x.worldWrites===0&&
 x.worldContacts===0&&x.constructionApproved===false&&x.executionAllowed===false&&
 x.gates?.length===9&&x.gates.every(y=>y==='BLOCKED')&&x.BuildPlan?.operations?.length===0;
test('strict R178 schema accepts exactly four distinct existing-looking room IDs',()=>{
 const ir=plan(A).architecture;
 assert.equal(validateR178HeightOrderIntent(ir),true);
 assert.equal(r178ToR160(ir).schema,'minecraftaibuilder-r160-topology-ir-v1');
 for(const order of [[],A.slice(0,3),[A[0],A[0],A[2],A[3]],['employee','inventory','bad space','craftwork']])
  assert.throws(()=>validateR178HeightOrderIntent(plan(order).architecture),/R178_/);
 assert.throws(()=>validateR178HeightOrderIntent({...ir,extra:1}),/R178_EXACT_ARCHITECTURE_FIELDS/);
});
test('two caller-selected vertical hierarchies change real B143 roofs, keep every low voxel/room/fixture and all safety gates',()=>{
 const first=parseR139RelationalFurnishedReply(JSON.stringify(plan(A)),req,flags);
 const second=parseR139RelationalFurnishedReply(JSON.stringify(plan(B)),req,flags);
 const p=first.architectural.completed,q=second.architectural.completed;
 assert(verifyCompiled(p.design,p.compiled)&&verifyCompiled(q.design,q.compiled));
 assert(safe(p)&&safe(q)&&safe(first)&&safe(second));
 assert.deepEqual(first.r178ExplicitHeightOrderFromCaller,A);
 assert.deepEqual(second.r178ExplicitHeightOrderFromCaller,B);
 assert.equal(first.modelReplyAuthenticity,'CALLER_PROVIDED_UNVERIFIED');
 assert.equal(first.architectural.verticalHeightOrderAuthority,
  'EXPLICIT_CALLER_REPLY_UNVERIFIED_NOT_HOST_RANKED');
 assert.equal(first.architectural.roomSectionScope,
  'FOUR_ROOMS_R178_EXPLICIT_CALLER_VERTICAL_RANK_REAL_B143');
 assert.equal(p.r170FourRoomVolumeEvidence.verticalOrderAuthority,
  'EXPLICIT_CALLER_NOT_MODEL_ATTESTED');
 assert.deepEqual(p.r170FourRoomVolumeEvidence.callerHeightOrder,A);
 const heights=x=>Object.fromEntries(x.r170FourRoomVolumeEvidence.roomSections.map(z=>[z.zoneId,z.roofY]));
 const ha=heights(p),hb=heights(q);
 assert.equal(ha.craftwork,14);assert.equal(ha.employee,9);
 assert.equal(hb.craftwork,9);assert.equal(hb.employee,14);
 assert.notEqual(p.geometrySha256,q.geometrySha256);
 assert(eq(cells(p),cells(q)),'MODEL_SELECTED_LOWER_VOXELS_MUST_NOT_CHANGE');
 for(const t of [p,q]){
  assert.equal(t.sourceRouteAudit.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.equal(t.sourceRouteAudit.zones.length,4);
  assert.equal(t.sourceRouteAudit.featureAccess.length,4);
  assert(t.sourceRouteAudit.featureAccess.every(z=>z.reachableFromEntrance));
  assert(t.r170FourRoomVolumeEvidence.realExteriorClerestoryWindows>=4);
  assert(t.r170FourRoomVolumeEvidence.originalLowerFiveLevelsUnchanged);
  assert(t.r170FourRoomVolumeEvidence.roomSections.every(z=>z.extraAirColumnsAtY6Y7>=30));
 }
 if(process.env.R178_REVIEW_DIR){
  fs.mkdirSync(process.env.R178_REVIEW_DIR,{recursive:true});
  for(const [name,t] of [['order-A',p],['order-B',q]]){
   fs.writeFileSync(path.join(process.env.R178_REVIEW_DIR,name+'-B143.json'),JSON.stringify(t.design));
   fs.writeFileSync(path.join(process.env.R178_REVIEW_DIR,name+'-VOXELS.json'),JSON.stringify(t.compiled));
  }
  fs.writeFileSync(path.join(process.env.R178_REVIEW_DIR,'R178_RECEIPT.json'),
   JSON.stringify({NOT_REAL_MODEL_EVIDENCE:true,authorship:'STATIC_SYNTHETIC_CALLER',
    modelCalls:0,worldWrites:0,art:'NOT_REVIEWED',minecraft:'NOT_TESTED',
    scenarios:[{order:A,heights:ha,voxels:p.compiled.primitives.length,geometrySha256:p.geometrySha256},
    {order:B,heights:hb,voxels:q.compiled.primitives.length,geometrySha256:q.geometrySha256}]},null,2));
 }
 console.log(JSON.stringify({R178_SYNTHETIC_PASS:true,heightsA:ha,heightsB:hb,
  sameLowerCells:true,rooms:4,equipment:4,modelCalls:0,worldWrites:0}));
});
test('invalid height orders/unsanctioned combinations HOLD, unmodified R160 source still works',()=>{
 const raw=JSON.stringify(plan(A));
 for(const opts of [{...flags,allowModelRoomHeightOrderResearch:false},
  {...flags,allowHostSculpturalResearch:false},
  {...flags,allowHostVolumeResearch:false},
  {...flags,allowModelGroundShapeResearch:true},
  {...flags,allowHostMassingResearch:true}]){
  assert.throws(()=>parseR139RelationalFurnishedReply(raw,req,opts));
 }
 const invalid=plan(['employee','inventory','storefront','not-available']);
 assert.throws(()=>parseR139RelationalFurnishedReply(JSON.stringify(invalid),req,flags),
  /R170_FOUR_ROOM_EXPLICIT_ROOM_HEIGHT_ORDER_MISMATCH/);
 const legacy=plan(A);legacy.architecture={
  schema:'minecraftaibuilder-r160-topology-ir-v1',entryHierarchy:'quiet',
  daylightStrategy:'even',roofEdge:'fine',spatialTopology:'central-spine'};
 const old=parseR139RelationalFurnishedReply(JSON.stringify(legacy),req,{
  allowTopologyComposition:true,allowHostGridResearch:true,
  allowHostVolumeResearch:true,allowHostSculpturalResearch:true});
 assert(verifyCompiled(old.architectural.completed.design,old.architectural.completed.compiled));
 assert.equal(old.architectural.completed.r170FourRoomVolumeEvidence.verticalOrderAuthority,
  'HOST_DERIVED_FROM_MODEL_WEIGHT');
 assert.equal(old.r178ExplicitHeightOrderFromCaller,null);
});
