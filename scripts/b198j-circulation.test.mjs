import test from 'node:test';
import assert from 'node:assert/strict';
import {SCHEMA as B143,compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {PLAN_SCHEMA,inspectPlanAgainstSource,generateModelDirectedArchitecture}
 from '../source/ai/b198i-design-director.mjs';
import {inspectPlannedPublicCirculation,SCHEMA}
 from '../source/ai/b198j-circulation-proof.mjs';

const program=()=>({
 schema:PLAN_SCHEMA,id:'public-circulation-test',
 title:'Independent circulation proof building',
 designIntent:'離れた二つの公共ギャラリーを明瞭な水平回廊で接続する計画。',
 visualDirection:'二つの離れた館と、見通しのよい低層の明るい連絡デッキ。',
 bounds:{width:36,height:16,depth:20},
 zones:[
  {id:'east-hall',name:'東側ギャラリー',purpose:'来場者が展示を見る大きな公共床を作る'},
  {id:'west-hall',name:'西側ギャラリー',purpose:'別棟の広い床から展示を見ることができる'},
  {id:'connector',name:'連絡デッキ',purpose:'両棟をつなぐ安全そうな通路を確保する'}
 ],
 anchors:[
  {id:'east-floor',zoneId:'east-hall',point:[5,2,5],expect:'SUPPORTED_FLOOR',
   purpose:'東館に幅二ブロックの公共床を備える'},
  {id:'west-floor',zoneId:'west-hall',point:[25,2,5],expect:'SUPPORTED_FLOOR',
   purpose:'西館にも十分な広さの公共床を備える'},
  {id:'east-solid',zoneId:'east-hall',point:[4,2,4],expect:'SOLID',
   purpose:'床の一部を実際の石材ボクセルにする'},
  {id:'sky-air',zoneId:'connector',point:[16,8,8],expect:'AIR',
   purpose:'デッキの上空には開放的な空間を設ける'},
  {id:'gallery-air',zoneId:'west-hall',point:[25,5,5],expect:'AIR',
   purpose:'西館の室内空間の頭上高さを保つ'}
 ]
});
const separated=()=>({
 schema:B143,id:'public-circulation-test',title:'Real disconnected floors',
 brief:'Both floor anchors are source-truthful, but the floor islands are apart.',
 bounds:{width:36,height:16,depth:20},designOnly:true,
 elements:[
  {id:'east-platform',mode:'add',shape:'box',material:'stone',
   origin:[3,2,3],size:[8,1,8]},
  {id:'west-platform',mode:'add',shape:'box',material:'concrete',
   origin:[23,2,3],size:[8,1,8]}
 ]
});
const joined=()=>{
 const d=separated();
 d.elements.push({
  id:'real-two-wide-public-connector',mode:'add',
  shape:'box',material:'metal',origin:[10,2,5],size:[14,1,3]
 });
 return d;
};
const output=design=>({
 design,explanation:'Compiled B143 geometry, fixture only; model quality unknown.',
 assumptions:[]
});

test('all five individual plan anchors can PASS while public floors are disconnected',()=>{
 const p=program(),d=separated(),c=compileDesign(d);
 const independent=inspectPlanAgainstSource({plan:p,design:d,compiled:c});
 assert.equal(independent.passedAnchors,5);
 assert.equal(independent.allDeclaredPlanAnchorsMatchSource,true);
 const result=inspectPlannedPublicCirculation({plan:p,design:d,compiled:c});
 assert.equal(result.schema,SCHEMA);
 assert.equal(result.declaredPublicFloorAnchors,2);
 assert.equal(result.evaluatedSameElevationAnchorPairs,1);
 assert.equal(result.connectedSameElevationAnchorPairs,0);
 assert.equal(result.disconnectedSameElevationAnchorPairs,1);
 assert.equal(result.allDeclaredSameElevationPairsConnected,false);
 assert.deepEqual(result.missingSupportedFloorAnchors,[]);
 assert.deepEqual(result.disconnectedPairs.map(x=>[x.fromAnchor,x.toAnchor]),
  [['east-floor','west-floor']]);
 assert.equal(result.crossElevationTransfersCertified,false);
 assert.equal(result.actuallyTraversableInMinecraft,false);
 assert.equal(result.worldWrites,0);
});

test('actual added width-3 deck creates a continuous two-wide same-elevation source route',()=>{
 const p=program(),d=joined();
 const result=inspectPlannedPublicCirculation({plan:p,design:d,compiled:compileDesign(d)});
 assert.equal(result.allDeclaredSameElevationPairsConnected,true);
 assert.equal(result.connectedSameElevationAnchorPairs,1);
 assert.equal(result.disconnectedPairs.length,0);
 assert(result.elevations[0].sourceSupportedSquareCount>100);
 assert(result.elevations[0].anchors.every(x=>x.hasSourceSupportedFloor));
 assert.equal(result.elevations[0].anchors[0].componentId,
  result.elevations[0].anchors[1].componentId);
});

test('B198I source selector regenerates a truly new corridor when all anchor points already passed',async()=>{
 let calls=0;
 const result=await generateModelDirectedArchitecture({
  prompt:'東西の二つの公共館を、内部を本当に移動できそうな幅二の回廊でつないでください。',
  planner:async()=>program(),
  generator:async req=>{
   calls++;
   assert.equal(req.mode,'creation');
   if(calls===2)assert(req.prompt.includes('NO_CONTIGUOUS_SOURCE_TWO_WIDE_SAME_ELEVATION_ROUTE'));
   return output(calls===1?separated():joined());
  },
  maxRepairRounds:0,maxSourceAttempts:3
 });
 assert.equal(calls,2);
 assert.equal(result.report.attempts.length,2);
 assert.deepEqual(result.report.attempts.map(x=>x.connectedSameElevationPairs),[0,1]);
 assert.equal(result.report.planProof.passedAnchors,5);
 assert.equal(result.report.status,'SOURCE_PLAN_ANCHORS_PASS_HUMAN_REVIEW_REQUIRED');
 assert.deepEqual(result.report.independentHoldReasons,[]);
 assert.equal(result.report.allExplicitSourceHoldsCleared,true);
 assert.equal(result.report.circulationProof.allDeclaredSameElevationPairsConnected,true);
 assert.equal(result.design.elements.length,3);
 assert.equal(result.report.humanAestheticJudgment,'UNREVIEWED');
 assert.equal(result.report.world.worldWrites,0);
 assert(result.report.world.gates.every(x=>x==='BLOCKED'));
});

test('a model repeatedly providing isolated connected-looking platforms is HOLD, never source-circulation PASS',async()=>{
 let calls=0;
 const result=await generateModelDirectedArchitecture({
  prompt:'東西の二つの展示室を同じ高さの大きな連絡デッキで確実に接続してください。',
  planner:async()=>program(),
  generator:async()=>{calls++;return output(separated());},
  maxRepairRounds:0,maxSourceAttempts:2
 });
 assert.equal(calls,2);
 assert.equal(result.report.planProof.failedAnchors,0);
 assert.equal(result.report.status,'HOLD_SOURCE_PLAN_OR_TOPOLOGY');
 assert(result.report.independentHoldReasons.includes('HIGH_RISK_SOURCE_TOPOLOGY'));
 assert(result.report.independentHoldReasons.includes('DISCONNECTED_SAME_ELEVATION_PUBLIC_ROUTE'));
 assert.equal(result.report.allExplicitSourceHoldsCleared,false);
 assert.equal(result.report.circulationProof.disconnectedSameElevationAnchorPairs,1);
 assert.equal(result.report.circulationProof.actuallyTraversableInMinecraft,false);
 assert.equal(result.report.attempts[1].decision,'REJECTED_NO_EVIDENCE_GAIN');
 assert.equal(result.report.world.BuildPlan.operations.length,0);
});

test('unverifiable floor anchor and mismatched model source are not called connected',()=>{
 const p=program(),d=separated();
 const modified=separated();
 modified.elements.push({id:'blocking-roof',mode:'add',shape:'box',
  material:'glass',origin:[5,3,5],size:[2,2,2]});
 const proof=inspectPlannedPublicCirculation({
  plan:p,design:modified,compiled:compileDesign(modified)
 });
 assert(proof.missingSupportedFloorAnchors.includes('east-floor'));
 assert.equal(proof.allDeclaredSameElevationPairsConnected,false);
 const mismatched=separated();mismatched.bounds.width=35;
 assert.throws(()=>inspectPlannedPublicCirculation({
  plan:p,design:mismatched,compiled:compileDesign(mismatched)
 }),/B198J_PROGRAM_SOURCE_BOUNDS_MISMATCH/);
});

test('separate vertical floors are explicitly noncertified instead of pretending a stair route exists',()=>{
 const p=program();
 p.anchors.push({id:'upper-floor',zoneId:'connector',
  point:[5,8,5],expect:'SUPPORTED_FLOOR',
  purpose:'別の高さに置いた上層回廊の床'});
 const d=joined();
 d.elements.push({id:'upper-floor-plate',mode:'add',shape:'box',
  material:'wood',origin:[3,8,3],size:[8,1,8]});
 const result=inspectPlannedPublicCirculation({plan:p,design:d,
  compiled:compileDesign(d)});
 assert.equal(result.differentElevationGroups,2);
 assert.equal(result.crossElevationTransfersCertified,false);
 assert.equal(result.allDeclaredSameElevationPairsConnected,true);
 assert.equal(result.evidenceForMultiplePublicPoints,true);
 assert.equal(result.actuallyTraversableInMinecraft,false);
});


test('multi-elevation floor anchors are never promoted to independently verified vertical access',async()=>{
 const p=program();
 p.anchors.push({id:'upper-floor',zoneId:'connector',
  point:[5,8,5],expect:'SUPPORTED_FLOOR',
  purpose:'二階にも上部閲覧床を設ける'});
 const d=joined();
 d.elements.push({id:'unconnected-second-level-floor',mode:'add',
  shape:'box',material:'wood',origin:[3,8,3],size:[8,1,8]});
 let calls=0;
 const generated=await generateModelDirectedArchitecture({
  prompt:'二つの展示室を低層でつなぎ、もう一階に上層の閲覧床を設ける。',
  planner:async()=>p,generator:async()=>{calls++;return output(d);},
  maxRepairRounds:0,maxSourceAttempts:3
 });
 // B198L now makes one genuine repair request for a missing vertical route,
 // then stops when the model returns the exact same source SHA again.
 assert.equal(calls,2);
 assert.equal(generated.report.planProof.failedAnchors,0);
 assert.equal(generated.report.circulationProof.allDeclaredSameElevationPairsConnected,true);
 assert.equal(generated.report.circulationProof.differentElevationGroups,2);
 assert.equal(generated.report.status,'HOLD_SOURCE_VERTICAL_CIRCULATION_UNVERIFIED');
 assert.equal(generated.report.circulationProof.crossElevationTransfersCertified,false);
});
