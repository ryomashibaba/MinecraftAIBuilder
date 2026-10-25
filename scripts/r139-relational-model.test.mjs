import test from 'node:test';
import assert from 'node:assert/strict';
import {makeR134FreshRequest}
 from './r134-fresh-model-pilot.mjs';
import {parseR139RelationalFurnishedReply,RELATIONAL_INSTRUCTIONS}
 from './r139-relational-model.mjs';

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
