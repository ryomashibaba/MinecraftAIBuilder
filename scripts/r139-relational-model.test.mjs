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
