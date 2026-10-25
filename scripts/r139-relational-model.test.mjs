import test from 'node:test';
import assert from 'node:assert/strict';
import {makeR134FreshRequest}
 from './r134-fresh-model-pilot.mjs';
import {parseR139RelationalFurnishedReply,RELATIONAL_INSTRUCTIONS}
 from './r139-relational-model.mjs';

import {parseR135FreshFurnishedReply}
 from './r135-furnished-program.mjs';
const request=makeR134FreshRequest({brief:
 'Invent a small independent learning and fabrication workspace with distinct use areas.'});
const reply=()=>({
 id:'new-unfixed-facility',
 title:'Three dimensional program from one response',
 footprint:{width:26,depth:30},
 materials:{floor:'wood',wall:'stone',roof:'metal'},
 layout:{axis:'z',spaces:[1,2,3,4].map(n=>({
  id:'activity-'+n,purpose:'Independent functional zone '+n,weight:1}))},
 form:{roofProfile:'flat',facadeLanguage:'plain'},
 objects:[1,2,3,4].map((n,i)=>({
  id:'object-'+n,zoneId:'activity-'+n,
  role:['seating','work-surface','display-stand','storage-rack'][i],
  corner:['far-left','near-right','near-left','far-right'][i]
 })),
 relations:{entryFacingZoneId:'activity-4',
  directAdjacencies:[['activity-1','activity-2'],['activity-3','activity-4']]}
});
test('one explicit synthetic model reply selects room topology and furnished real B143',()=>{
 const raw=JSON.stringify(reply());
 const result=parseR139RelationalFurnishedReply(raw,request);
 assert.equal(result.semanticIntent.entryFacingZoneId,'activity-4');
 assert.equal(result.semanticIntent.directAdjacencies.length,2);
 assert.equal(result.relationalBase.directAdjacencyDoorEvidence.length,2);
 assert.equal(result.featured.placements.length,4);
 assert.equal(result.featured.sourceRouteAudit.status,
  'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.notEqual(result.originalSequentialBase.sourceSha256,
  result.relationalBase.sourceSha256);
 assert.ok(result.derivedGeometrySha256);
 assert.equal(result.modelReplyAuthenticity,'CALLER_PROVIDED_UNVERIFIED');
 assert.equal(result.modelCallsDuringParsing,0);
 assert.equal(result.readiness,'NOT_PREPARED');
 assert.deepEqual(result.BuildPlan.operations,[]);
 assert.equal(result.worldWrites,0);
 assert.ok(RELATIONAL_INSTRUCTIONS.includes('directAdjacencies'));
});
test('legacy reply without a genuine relation object cannot claim model-selected geometry',()=>{
 const old=reply();delete old.relations;
 assert.throws(()=>parseR139RelationalFurnishedReply(
  JSON.stringify(old),request),/R139_MODEL_FULL_REPLY_CONTRACT/);
 const forged=reply();forged.relations.entryFacingZoneId='not-a-room';
 assert.throws(()=>parseR139RelationalFurnishedReply(
  JSON.stringify(forged),request),/R139_RELATIONS_INVALID_ENTRY_ZONE/);
});

test('R141: cramped legacy strip furniture cannot block genuinely viable graph-first layout',()=>{
 const response=reply();
 response.footprint.depth=24;
 const {relations,...legacy}=response;
 assert.throws(()=>parseR135FreshFurnishedReply(
  JSON.stringify(legacy),request),/R125_FEATURE_|R135_FURNISHED_/);
 const graph=parseR139RelationalFurnishedReply(JSON.stringify(response),request);
 assert.equal(graph.legacyStripFurnitureNotRequired,true);
 assert.equal(graph.relationalBase.directAdjacencyDoorEvidence.length,2);
 assert.equal(graph.featured.placements.length,4);
 assert.equal(graph.featured.sourceRouteAudit.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(graph.worldWrites,0);
 assert.deepEqual(graph.gates,Array(9).fill('BLOCKED'));
});

test('R151 optional one-model-reply architecture intent produces genuinely different B143 geometry without changing the chosen functional program',()=>{
 const ordinary=parseR139RelationalFurnishedReply(JSON.stringify(reply()),request);
 const upgraded=reply();
 upgraded.architecture={
  schema:'minecraftaibuilder-r151-envelope-intent-v1',
  entryHierarchy:'quiet',daylightStrategy:'focused',roofEdge:'parapet'};
 assert.throws(()=>parseR139RelationalFurnishedReply(JSON.stringify(upgraded),request),
  /R139_MODEL_FULL_REPLY_CONTRACT/);
 const one=parseR139RelationalFurnishedReply(JSON.stringify(upgraded),request,
  {allowArchitecturalExpression:true});
 assert.deepEqual(one.semanticIntent,ordinary.semanticIntent);
 assert.equal(one.featured.sourceSha256,ordinary.featured.sourceSha256);
 assert.equal(one.featured.placements.length,ordinary.featured.placements.length);
 assert.equal(one.architectural.intentAuthorship,'IN_THIS_SAME_MODEL_REPLY_NOT_HOST_INFERRED');
 assert.equal(one.architectural.completed.sourceRouteAudit.status,
  'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(one.architectural.completed.sourceRouteAudit.featureAccess.length,4);
 assert.notEqual(one.architectural.completed.geometrySha256,ordinary.featured.geometrySha256);
 assert.equal(one.architectural.envelope.r149ExpressionEvidence.modelExpressionIntentProvided,true);
 assert.equal(one.architectural.completed.worldWrites,0);
 assert.deepEqual(one.architectural.completed.gates,Array(9).fill('BLOCKED'));
 const twoRaw=reply();twoRaw.architecture={
  schema:'minecraftaibuilder-r151-envelope-intent-v1',
  entryHierarchy:'emphasized',daylightStrategy:'even',roofEdge:'fine'};
 const two=parseR139RelationalFurnishedReply(JSON.stringify(twoRaw),request,
  {allowArchitecturalExpression:true});
 assert.notEqual(one.architectural.completed.geometrySha256,
  two.architectural.completed.geometrySha256);
});
test('R151 malformed, non-opted-in, or invented architecture choices HOLD instead of defaulting to a style',()=>{
 for(const bad of [
  {schema:'minecraftaibuilder-r151-envelope-intent-v1',entryHierarchy:'quiet',
   daylightStrategy:'all-glass',roofEdge:'fine'},
  {schema:'minecraftaibuilder-r151-envelope-intent-v1',entryHierarchy:'quiet',
   daylightStrategy:'focused',roofEdge:'parapet',extra:'fake'},
  {schema:'invalid',entryHierarchy:'quiet',daylightStrategy:'even',roofEdge:'fine'},
  null
 ]){
  const candidate=reply();candidate.architecture=bad;
  assert.throws(()=>parseR139RelationalFurnishedReply(JSON.stringify(candidate),
   request,{allowArchitecturalExpression:true}),/R149_EXPRESSION_MODEL_EXPRESSION_INTENT_CONTRACT/);
 }
});

test('R152 opt-in raised entry room has a real roof and remains accessible (synthetic model choice)',()=>{
 const variant=reply();
 variant.architecture={schema:'minecraftaibuilder-r152-envelope-intent-v1',
  entryHierarchy:'quiet',daylightStrategy:'even',
  roofEdge:'fine',section:'raised-entry'};
 assert.throws(()=>parseR139RelationalFurnishedReply(JSON.stringify(variant),
  request,{allowArchitecturalExpression:true}),
  /R149_EXPRESSION_MODEL_EXPRESSION_INTENT_CONTRACT/);
 const actual=parseR139RelationalFurnishedReply(JSON.stringify(variant),request,
  {allowArchitecturalMassing:true});
 const section=actual.architectural.envelope.r149ExpressionEvidence.r152RealRoomRaisedSection;
 assert.ok(section);
 assert.equal(section.roofHeight,9);
 assert.equal(section.oldCeilingHeight,6);
 assert.equal(actual.featured.placements.length,4);
 assert.equal(actual.architectural.completed.sourceRouteAudit.status,
  'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(actual.architectural.completed.sourceRouteAudit.featureAccess.length,4);
 assert.equal(actual.architectural.completed.r150EquipmentEvidence.noExteriorWallFloorRoofCorridorChanged,true);
 assert.equal(actual.architectural.completed.readiness,'NOT_PREPARED');
 assert.deepEqual(actual.architectural.completed.BuildPlan.operations,[]);
 const flat=reply();
 flat.architecture={...variant.architecture,section:'continuous'};
 const flatResult=parseR139RelationalFurnishedReply(JSON.stringify(flat),request,
  {allowArchitecturalMassing:true});
 assert.equal(flatResult.architectural.envelope.r149ExpressionEvidence.r152RealRoomRaisedSection,null);
 assert.notEqual(actual.architectural.completed.geometrySha256,
  flatResult.architectural.completed.geometrySha256);
 for(const invalid of ['floating','fake-second-floor',null]){
  const bad=reply();bad.architecture={...variant.architecture,section:invalid};
  assert.throws(()=>parseR139RelationalFurnishedReply(JSON.stringify(bad),request,
   {allowArchitecturalMassing:true}),/R149_EXPRESSION_MODEL_R152_SECTION_CONTRACT/);
 }
});
test('R152 source geometry depends on shared semantic architecture choices, never building-kind templates',()=>{
 const cases=[
  {purpose:'A private residence with living, study and sleeping activities',section:'continuous'},
  {purpose:'A community retail space with cashier, stock and customer circulation',section:'raised-entry'},
  {purpose:'A laboratory supporting sample handling, observation and review',section:'raised-entry'}
 ];
 const built=cases.map((item,i)=>{
  const design=reply();
  design.id='unseen-case-'+i;
  design.title='Unseen functional building '+i;
  design.layout.spaces=design.layout.spaces.map((space,j)=>({
   ...space,purpose:item.purpose+' zone '+j}));
  design.architecture={schema:'minecraftaibuilder-r152-envelope-intent-v1',
   entryHierarchy:'quiet',daylightStrategy:'even',roofEdge:'fine',
   section:item.section};
  return parseR139RelationalFurnishedReply(JSON.stringify(design),request,
   {allowArchitecturalMassing:true});
 });
 assert.equal(built.length,3);
 assert.ok(built.every(x=>x.featured.placements.length===4));
 assert.ok(built.every(x=>x.architectural.completed.sourceRouteAudit.status===
  'SOURCE_ROUTES_REACH_ALL_ZONES'));
 assert.equal(built[0].architectural.envelope.r149ExpressionEvidence.r152RealRoomRaisedSection,null);
 assert.ok(built[1].architectural.envelope.r149ExpressionEvidence.r152RealRoomRaisedSection);
 assert.ok(built[2].architectural.envelope.r149ExpressionEvidence.r152RealRoomRaisedSection);
 // These are deliberately TEST DOUBLEs, not real LLM generalization.
 assert.ok(built.every(x=>x.modelReplyAuthenticity==='CALLER_PROVIDED_UNVERIFIED'));
 assert.ok(built.every(x=>x.worldWrites===0));
});

test('R154 model-selected genuine multi-height rooms and supported arrival stay functional in ONE reply',()=>{
 const old=parseR139RelationalFurnishedReply(JSON.stringify(reply()),request);
 const model=reply();
 model.architecture={
  schema:'minecraftaibuilder-r154-volume-ir-v1',
  entryHierarchy:'quiet',daylightStrategy:'even',
  roofEdge:'fine',volumeHierarchy:'paired',arrivalSpace:'covered'};
 assert.throws(()=>parseR139RelationalFurnishedReply(JSON.stringify(model),request,
  {allowArchitecturalMassing:true}),
  /R149_EXPRESSION_MODEL_R152_SECTION_CONTRACT/);
 const result=parseR139RelationalFurnishedReply(JSON.stringify(model),request,
  {allowVolumeComposition:true});
 assert.equal(result.architectural.volume.r154VolumeEvidence.volumeCount,2);
 const proof=result.architectural.volume.r154VolumeEvidence;
 assert.deepEqual(proof.raised.map(x=>x.roofHeight),[10,9]);
 assert.ok(proof.portico);
 assert.equal(proof.immutabilityBelowRoof,true);
 assert.equal(proof.realHighVolumeInteriorAndRoof,true);
 assert.equal(proof.sourceRoutes,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(proof.fullyAccessibleEquipment,4);
 assert.equal(proof.authorship,'CALLER_ARCHITECTURE_IR_NOT_AUTHENTICATED');
 assert.equal(result.featured.sourceSha256,old.featured.sourceSha256);
 assert.equal(result.featured.geometrySha256,old.featured.geometrySha256);
 assert.equal(result.architectural.completed.sourceRouteAudit.featureAccess.length,4);
 assert.equal(result.architectural.completed.worldWrites,0);
 assert.equal(result.architectural.completed.readiness,'NOT_PREPARED');
 assert.deepEqual(result.architectural.completed.gates,Array(9).fill('BLOCKED'));
 assert.deepEqual(result.architectural.completed.BuildPlan.operations,[]);
 const simpler=reply();
 simpler.architecture={...model.architecture,volumeHierarchy:'single',
  arrivalSpace:'flush'};
 const one=parseR139RelationalFurnishedReply(JSON.stringify(simpler),request,
  {allowVolumeComposition:true});
 assert.equal(one.architectural.volume.r154VolumeEvidence.volumeCount,1);
 assert.equal(one.architectural.volume.r154VolumeEvidence.portico,null);
 assert.notEqual(result.architectural.completed.geometrySha256,
  one.architectural.completed.geometrySha256);
});
test('R154 input failures HOLD; existing baseline and model choices are never silently repaired',()=>{
 for(const issue of [
  {volumeHierarchy:'mock-third-floor'},
  {arrivalSpace:'unbounded-courtyard'},
  {roofEdge:'ornamental'},
  {unexpected:true}
 ]){
  const raw=reply();
  raw.architecture={schema:'minecraftaibuilder-r154-volume-ir-v1',
   entryHierarchy:'quiet',daylightStrategy:'even',
   roofEdge:'fine',volumeHierarchy:'paired',arrivalSpace:'covered',...issue};
  assert.throws(()=>parseR139RelationalFurnishedReply(JSON.stringify(raw),request,
   {allowVolumeComposition:true}),/R154_VOLUME_STRICT_INTENT_CONTRACT/);
 }
 const raw=reply();
 raw.architecture={schema:'minecraftaibuilder-r154-volume-ir-v1',
  entryHierarchy:'quiet',daylightStrategy:'even',
  roofEdge:'fine',volumeHierarchy:'paired',arrivalSpace:'covered'};
 assert.throws(()=>parseR139RelationalFurnishedReply(JSON.stringify(raw),request),
  /R139_MODEL_FULL_REPLY_CONTRACT/);
});

test('R155 pitch creates a real inhabited roofline without corrupting frozen semantic building',()=>{
 const raw=reply();raw.architecture={
  schema:'minecraftaibuilder-r155-roofline-ir-v1',
  entryHierarchy:'quiet',daylightStrategy:'even',roofEdge:'fine',
  volumeHierarchy:'paired',arrivalSpace:'covered',roofSilhouette:'ridge'};
 const parsed=parseR139RelationalFurnishedReply(JSON.stringify(raw),request,
  {allowRooflineComposition:true});
 const roof=parsed.architectural.roofline.r155RooflineEvidence;
 assert.equal(roof.authorship,'CALLER_ARCHITECTURE_IR_NOT_AUTHENTICATED');
 assert.equal(roof.upperVolumes.length,2);
 assert.equal(roof.unchangedAllInteriorBelowY6,true);
 assert.equal(roof.routeStatus,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(roof.reachedEquipment,4);
 assert.ok(roof.newB143ElementCount<=160);
 assert.ok(roof.upperVolumes.every(v=>v.roofHeightAtPeak>v.roofHeightBefore));
 assert.ok(roof.upperVolumes.every(v=>v.slopeLevels[0]===0));
 assert.equal(parsed.architectural.completed.sourceRouteAudit.featureAccess.length,4);
 assert.equal(parsed.architectural.completed.worldWrites,0);
 assert.deepEqual(parsed.architectural.completed.gates,Array(9).fill('BLOCKED'));
 assert.deepEqual(parsed.architectural.completed.BuildPlan.operations,[]);
 const original=parseR139RelationalFurnishedReply(JSON.stringify(reply()),request);
 assert.equal(parsed.featured.geometrySha256,original.featured.geometrySha256);
 assert.equal(parsed.featured.sourceSha256,original.featured.sourceSha256);
 const shed=reply();shed.architecture={...raw.architecture,roofSilhouette:'shed'};
 const shedProduct=parseR139RelationalFurnishedReply(JSON.stringify(shed),request,
  {allowRooflineComposition:true});
 assert.notEqual(parsed.architectural.completed.geometrySha256,
  shedProduct.architectural.completed.geometrySha256);
 assert.ok(shedProduct.architectural.roofline.r155RooflineEvidence
  .upperVolumes.every(v=>v.silhouette==='shed'));
 assert.equal(shedProduct.architectural.completed.sourceRouteAudit.status,
  'SOURCE_ROUTES_REACH_ALL_ZONES');
});
test('R155 fail-closed IR does not mutate or silently downgrade model roof selections',()=>{
 for(const invalid of [
  {roofSilhouette:'gabled-random'},
  {roofSilhouette:null},
  {arrivalSpace:'massive-unbounded-porch'},
  {aNewField:'disallowed'}
 ]){
  const r=reply();r.architecture={schema:'minecraftaibuilder-r155-roofline-ir-v1',
   entryHierarchy:'quiet',daylightStrategy:'even',roofEdge:'fine',
   volumeHierarchy:'paired',arrivalSpace:'covered',
   roofSilhouette:'ridge',...invalid};
  assert.throws(()=>parseR139RelationalFurnishedReply(JSON.stringify(r),request,
   {allowRooflineComposition:true}),/R155_ROOFLINE_STRICT_ROOFLINE_IR/);
 }
 const past=reply();past.architecture={
  schema:'minecraftaibuilder-r155-roofline-ir-v1',
  entryHierarchy:'quiet',daylightStrategy:'even',roofEdge:'fine',
  volumeHierarchy:'paired',arrivalSpace:'covered',roofSilhouette:'ridge'};
 assert.throws(()=>parseR139RelationalFurnishedReply(JSON.stringify(past),request,
  {allowVolumeComposition:true}),/R154_VOLUME_STRICT_INTENT_CONTRACT/);
});


test('R168: four-room R160 topology compiles REAL B143 and feature access without falsely claiming three-room high sections',()=>{
 const model=reply();
 model.architecture={schema:'minecraftaibuilder-r160-topology-ir-v1',
  entryHierarchy:'emphasized',daylightStrategy:'even',
  roofEdge:'fine',spatialTopology:'central-spine'};
 const result=parseR139RelationalFurnishedReply(JSON.stringify(model),request,
  {allowTopologyComposition:true});
 assert.equal(result.architectural.roomSectionScope,
  'FOUR_ROOMS_BASIC_ENVELOPE_NO_HIGHROOM_CLAIM');
 assert.equal(result.architectural.integrated,null);
 assert.equal(result.architectural.completed.program[0].zones.length,4);
 assert.equal(result.architectural.completed.sourceRouteAudit.status,
  'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(result.architectural.completed.sourceRouteAudit.featureAccess.length,4);
 assert.equal(result.architectural.completed.worldWrites,0);
 assert.deepEqual(result.architectural.completed.BuildPlan.operations,[]);
});


test('R168: opt-in grid research makes TWO model shared-node direct links through real four-room shared walls and adds minimal visible host access',()=>{
 const model=reply();
 model.footprint={width:24,depth:24};
 model.form.facadeLanguage='plain';
 model.relations.entryFacingZoneId='activity-2';
 model.relations.directAdjacencies=[
  ['activity-2','activity-1'],['activity-2','activity-3']
 ];
 model.architecture={schema:'minecraftaibuilder-r160-topology-ir-v1',
  entryHierarchy:'emphasized',daylightStrategy:'even',
  roofEdge:'fine',spatialTopology:'central-spine'};
 const raw=JSON.stringify(model);
 assert.throws(()=>parseR139RelationalFurnishedReply(raw,request,
  {allowTopologyComposition:true}),/R139_RELATIONS_GRAPH_REQUIRES_RICHER_GEOMETRY/);
 const result=parseR139RelationalFurnishedReply(raw,request,
  {allowTopologyComposition:true,allowHostGridResearch:true});
 const grid=result.hostGridResearchOverride;
 assert.equal(grid.modelRequestedDoorCount,2);
 assert.equal(grid.hostExtraDoorCount,1);
 assert.equal(grid.modelExplicitTopologyNotImplemented,true);
 assert.equal(result.architectural.roomSectionScope,
  'FOUR_ROOMS_BASIC_ENVELOPE_NO_HIGHROOM_CLAIM');
 assert.equal(result.relationalBase.sourceRouteAudit.status,
  'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(result.architectural.completed.sourceRouteAudit.status,
  'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(result.architectural.completed.sourceRouteAudit.featureAccess.length,4);
 assert.deepEqual(result.architectural.completed.BuildPlan.operations,[]);
 assert.equal(result.worldWrites,0);
});


test('R169: synthetic four-room eight-fixture observatory arrangement keeps original functional furniture when optional detailing threatens true service routes',()=>{
 // Reconstructs the physical *shape* of the failed user local case with
 // synthetic room purposes; no model call and no copied user raw evidence.
 const model=reply();
 model.id='synthetic-four-room-observatory';
 model.title='Synthetic four-room general instrument workshop';
 model.footprint={width:24,depth:24};
 model.materials={floor:'stone',wall:'concrete',roof:'metal'};
 model.form={roofProfile:'ridge',facadeLanguage:'screen'};
 model.layout.spaces=[
  {id:'observation-terrace',purpose:'Fixture access zone',weight:2},
  {id:'data-analysis-room',purpose:'Analysis and equipment zone',weight:3},
  {id:'instrument-storage',purpose:'Secure instrument storage',weight:1},
  {id:'discussion-studio',purpose:'Team meeting zone',weight:4}
 ];
 model.objects=[
  {id:'telescope-control-table',zoneId:'observation-terrace',role:'work-surface',corner:'near-left'},
  {id:'instrument-shelves',zoneId:'instrument-storage',role:'equipment-bank',corner:'far-right'},
  {id:'monitor-stand',zoneId:'data-analysis-room',role:'display-stand',corner:'near-right'},
  {id:'data-storage-rack',zoneId:'data-analysis-room',role:'storage-rack',corner:'far-left'},
  {id:'collaboration-table',zoneId:'discussion-studio',role:'work-surface',corner:'near-left'},
  {id:'seating-near-telescope',zoneId:'observation-terrace',role:'seating',corner:'far-right'},
  {id:'seating-for-meetings',zoneId:'discussion-studio',role:'seating',corner:'far-left'},
  {id:'instrument-access-aisle',zoneId:'instrument-storage',role:'work-surface',corner:'near-left'}
 ];
 model.relations={entryFacingZoneId:'discussion-studio',
  directAdjacencies:[['observation-terrace','instrument-storage']]};
 model.architecture={schema:'minecraftaibuilder-r160-topology-ir-v1',
  entryHierarchy:'emphasized',daylightStrategy:'focused',
  roofEdge:'fine',spatialTopology:'central-spine'};
 const a=parseR139RelationalFurnishedReply(JSON.stringify(model),request,
  {allowTopologyComposition:true,allowHostGridResearch:true});
 const completed=a.architectural.completed,ev=completed.r150EquipmentEvidence;
 assert.equal(a.hostGridResearchOverride,null);
 assert.equal(completed.program[0].zones.length,4);
 assert.equal(completed.placements.length,8);
 assert.equal(ev.originalEquipmentCount,8);
 assert.equal(ev.preservedModelEquipmentChoices,true);
 assert.equal(ev.originalEquipmentUnmodified,true);
 assert.equal(completed.sourceRouteAudit.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(completed.sourceRouteAudit.featureAccess.length,8);
 assert.ok(completed.sourceRouteAudit.featureAccess.every(f=>f.reachableFromEntrance));
 assert.equal(completed.worldWrites,0);
 assert.deepEqual(completed.gates,Array(9).fill('BLOCKED'));
 assert.deepEqual(completed.BuildPlan.operations,[]);
 if(ev.optionalDetailSuppressionOccurred)
  assert.equal(ev.suppressedUnsafeComponentCount,ev.suppressedUnsafeComponents.length);
});
