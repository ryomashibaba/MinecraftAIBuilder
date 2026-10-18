import test from 'node:test';
import assert from 'node:assert/strict';
import {SCHEMA as B143,compileDesign}
 from '../source/ai/b143-building-dsl.mjs';
import {PLAN_SCHEMA,inspectPlanAgainstSource,generateModelDirectedArchitecture}
 from '../source/ai/b198i-design-director.mjs';
import {SCHEMA,inspectMultiLevelSourceCirculation}
 from '../source/ai/b198l-step-chain-proof.mjs';

const plan=()=>({
 schema:PLAN_SCHEMA,id:'b198l-two-storey-public-building',
 title:'Public multilevel building',
 designIntent:'明るい公共床と上階ギャラリーを二段の小さい階段型デッキで連結する設計。',
 visualDirection:'三つの高さで公共床が階段状に上がる、大きな開放的ホール。',
 bounds:{width:32,height:17,depth:16},
 zones:[
  {id:'lower-hall',name:'低層の公共ホール',purpose:'広い床で多くの人が集まる低層空間'},
  {id:'upper-hall',name:'上階のギャラリー',purpose:'吹き抜けに向く安全そうな上部床を構成'},
  {id:'step-core',name:'中間のデッキ',purpose:'高さが連続する中間の公共デッキを設ける'}
 ],
 anchors:[
  {id:'lower-floor',zoneId:'lower-hall',point:[4,2,4],
   expect:'SUPPORTED_FLOOR',purpose:'低層の幅二の公共床を保持する'},
  {id:'upper-floor',zoneId:'upper-hall',point:[12,4,4],
   expect:'SUPPORTED_FLOOR',purpose:'上階に幅二の独立した公共床を設ける'},
  {id:'lower-stone',zoneId:'lower-hall',point:[3,2,4],
   expect:'SOLID',purpose:'主階に実際の構造ブロックが存在する'},
  {id:'open-middle',zoneId:'step-core',point:[8,10,4],
   expect:'AIR',purpose:'中間デッキ上方に十分な空間を設ける'},
  {id:'upper-headroom',zoneId:'upper-hall',point:[12,6,4],
   expect:'AIR',purpose:'上階ギャラリーの頭上を塞がない'}
 ]
});
const base=()=>({
 schema:B143,id:plan().id,title:'Multilevel architecture fixture',
 brief:'Two separate public landings, real source only and no player movement assertion.',
 bounds:plan().bounds,designOnly:true,
 elements:[
  {id:'lower-floor-plate',shape:'box',mode:'add',material:'stone',
   origin:[2,2,3],size:[6,1,5]},
  {id:'upper-floor-plate',shape:'box',mode:'add',material:'metal',
   origin:[10,4,3],size:[6,1,5]}
 ]
});
const linked=()=>{
 const d=base();
 d.elements.push({id:'one-block-height-two-wide-step',shape:'box',
  mode:'add',material:'wood',origin:[8,3,3],size:[2,1,5]});
 return d;
};
const blocked=()=>{
 const d=linked();
 d.elements.push({id:'step-ceiling-intrusion',shape:'box',
  mode:'add',material:'glass',origin:[8,4,3],size:[2,2,5]});
 return d;
};
const proposal=d=>({design:d,explanation:'Deterministic fixture, not an actual LLM source',assumptions:[]});

test('separate valid upper/lower plan anchors are not mistakenly considered a connected multilevel path',()=>{
 const p=plan(),d=base(),compiled=compileDesign(d);
 assert.equal(inspectPlanAgainstSource({plan:p,design:d,compiled}).failedAnchors,0);
 const proof=inspectMultiLevelSourceCirculation({plan:p,design:d,compiled});
 assert.equal(proof.schema,SCHEMA);
 assert.equal(proof.distinctDeclaredFloorElevations,2);
 assert.equal(proof.testedDifferentElevationAnchorPairs,1);
 assert.equal(proof.connectedDifferentElevationAnchorPairs,0);
 assert.equal(proof.disconnectedDifferentElevationAnchorPairs,1);
 assert.equal(proof.declaredSourceStepChainsSupported,false);
 assert.deepEqual(proof.missingSupportedFloorAnchors,[]);
 assert.equal(proof.disconnectedPairs[0].reason,
  'NO_SUPPORTED_ADJACENT_ONE_BLOCK_STEP_CHAIN');
 assert.equal(proof.minecraftPlayerTraversalCertified,false);
 assert.equal(proof.worldWrites,0);
});

test('continuous two-wide floor landings rising one source block at a time produce a candidate chain, NOT actual walking',()=>{
 const d=linked();
 const proof=inspectMultiLevelSourceCirculation({
  plan:plan(),design:d,compiled:compileDesign(d)
 });
 assert.equal(proof.connectedDifferentElevationAnchorPairs,1);
 assert.equal(proof.disconnectedDifferentElevationAnchorPairs,0);
 assert.equal(proof.declaredSourceStepChainsSupported,true);
 assert.equal(proof.candidateStepPairs.length,1);
 assert(proof.anchorComponents.every(x=>x.componentId===1));
 assert(proof.supportedTwoWideSourceSquares>0);
 assert.equal(proof.realMinecraftStairGeometryCertified,false);
 assert.equal(proof.crossFloorAccessibilityCertified,false);
 assert.equal(proof.sourceStepAssumptions.maxRisePerTransitionBlocks,1);
});

test('one-block middle riser with blocked headroom cannot count as usable 2-wide floor chain',()=>{
 const d=blocked();
 const proof=inspectMultiLevelSourceCirculation({
  plan:plan(),design:d,compiled:compileDesign(d)
 });
 assert.equal(proof.declaredSourceStepChainsSupported,false);
 assert.equal(proof.connectedDifferentElevationAnchorPairs,0);
 assert.equal(proof.disconnectedPairs.length,1);
});

test('B198I model regeneration is now directed by real failed vertical source pair evidence',async()=>{
 let designCalls=0;
 const outcome=await generateModelDirectedArchitecture({
  prompt:'低いホールと上階の公共ギャラリーを二幅の一段ずつ上るデッキでつないでください。',
  planner:async()=>plan(),
  generator:async req=>{
   designCalls++;
   assert.equal(req.mode,'creation');
   if(designCalls===2)assert(req.prompt.includes('NO_SUPPORTED_ADJACENT_ONE_BLOCK_STEP_CHAIN'));
   return proposal(designCalls===1?base():linked());
  },maxRepairRounds:0,maxSourceAttempts:3
 });
 assert.equal(designCalls,2);
 assert.equal(outcome.report.planProof.passedAnchors,5);
 assert.deepEqual(outcome.report.attempts.map(x=>x.connectedDifferentElevationPairs),[0,1]);
 assert.equal(outcome.report.status,'SOURCE_MULTILEVEL_STEP_CHAIN_REVIEW_REQUIRED');
 assert.equal(outcome.report.multiLevelSourceProof.declaredSourceStepChainsSupported,true);
 assert.equal(outcome.report.humanAestheticJudgment,'UNREVIEWED');
 assert.equal(outcome.report.independentlyVerifiedJapaneseIntent,false);
 assert.equal(outcome.report.world.worldWrites,0);
});

test('unresolved multilevel route stays HOLD and original source remains available for review',async()=>{
 const outcome=await generateModelDirectedArchitecture({
  prompt:'低層のホールから上階の大ギャラリーへの内部通行路を備えてください。',
  planner:async()=>plan(),generator:async()=>proposal(base()),
  maxRepairRounds:0,maxSourceAttempts:2
 });
 assert.equal(outcome.report.status,'HOLD_SOURCE_VERTICAL_CIRCULATION_UNVERIFIED');
 assert.equal(outcome.report.planProof.failedAnchors,0);
 assert.equal(outcome.report.multiLevelSourceProof.disconnectedDifferentElevationAnchorPairs,1);
 assert.equal(outcome.report.attempts[1].decision,'REJECTED_NO_EVIDENCE_GAIN');
 assert.equal(outcome.design.elements.length,2);
 assert.equal(outcome.report.world.readiness,'NOT_PREPARED');
 assert(outcome.report.world.gates.every(x=>x==='BLOCKED'));
});

test('the source verifier refuses forged compiler hashes, mismatched plan dimensions and missing support',()=>{
 const p=plan(),d=linked(),compiled=compileDesign(d);
 assert.throws(()=>inspectMultiLevelSourceCirculation({
  plan:p,design:d,compiled:{...compiled,sourceSha256:'fake'}
 }),/B198L_SOURCE_NOT_INDEPENDENTLY_VERIFIED/);
 const invalid=linked();invalid.bounds.width=30;
 assert.throws(()=>inspectMultiLevelSourceCirculation({
  plan:p,design:invalid,compiled:compileDesign(invalid)
 }),/B198L_BOUNDS_MISMATCH/);
 const withoutTop=linked();withoutTop.elements=withoutTop.elements.filter(e=>
  e.id!=='upper-floor-plate');
 const proof=inspectMultiLevelSourceCirculation({
  plan:p,design:withoutTop,compiled:compileDesign(withoutTop)
 });
 assert(proof.missingSupportedFloorAnchors.includes('upper-floor'));
 assert.equal(proof.declaredSourceStepChainsSupported,false);
});

test('diagonal/corner contact is not accepted as a wide stepped public route',()=>{
 const d=base();
 d.elements[1]={id:'diagonal-upper-platform',shape:'box',mode:'add',
  material:'metal',origin:[10,4,9],size:[6,1,5]};
 const p=plan();
 p.anchors[1].point=[12,4,10];
 p.anchors[4].point=[12,6,10];
 const result=inspectMultiLevelSourceCirculation({
  plan:p,design:d,compiled:compileDesign(d)
 });
 assert.equal(result.connectedDifferentElevationAnchorPairs,0);
 assert.equal(result.declaredSourceStepChainsSupported,false);
});
