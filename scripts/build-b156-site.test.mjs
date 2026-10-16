import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SCHEMA} from '../source/ai/b143-building-dsl.mjs';
import {buildBridgeCandidate,verifyBridgeCandidate} from '../source/ai/b156-candidate-proof.mjs';
import {readDesigns} from './build-b143-site.mjs';
import {readRevisionRequests} from './build-b144-site.mjs';
import {readContinuations} from './build-b145-site.mjs';
import {readStructuralRequests} from './build-b146-site.mjs';
import {readRepairRequest} from './build-b147-site.mjs';
import {readInteriorDesign} from './build-b149-site.mjs';
import {readUpperDesign} from './build-b150-site.mjs';
import {readWideDesign} from './build-b151-site.mjs';
import {readLoopDesign} from './build-b152-site.mjs';
import {readSkyDesign} from './build-b153-site.mjs';
import {readBypassDesign} from './build-b154-site.mjs';
import {readInterchangeR0,readInterchangeR1,TRANSIT_PROPOSAL} from './build-b155-site.mjs';
import {makeB156Bundle,renderB156Html} from './build-b156-site.mjs';
const box=(id,origin,size)=>({id,shape:'box',mode:'add',material:'concrete',origin,size});
const demo=elements=>({
 schema:SCHEMA,id:'new-bridge-preview-fixture',title:'Synthetic Bridge Design',
 brief:'Review-only generic geometry.',bounds:{width:40,height:20,depth:36},
 designOnly:true,elements
});
const split=()=>demo([box('west',[4,2,8],[6,1,8]),
 box('east',[17,2,8],[6,1,8])]);
const params={start:[7,3,10],goal:[18,3,10],
 footprintWidth:2,footprintDepth:2,corridorWidth:6,maxSpan:20};
test('generated floor is a new immutable validated design, not a world command',()=>{
 const original=split(),history=JSON.stringify(original);
 const c=buildBridgeCandidate(original,params,
  {candidateId:'synthetic-auto-bridge-candidate'});
 assert.equal(JSON.stringify(original),history);
 assert.equal(c.candidate.elements.length,original.elements.length+1);
 assert.equal(c.candidate.id,'synthetic-auto-bridge-candidate');
 assert.equal(c.report.originalStatus,'FOOTPRINT_UNREACHABLE');
 assert.equal(c.report.candidateStatus,'PASS_FLAT_FOOTPRINT_GEOMETRY');
 assert(c.report.addedFloorCellCount>0);
 assert.equal(c.report.structuralReviewRequired,true);
 assert.equal(c.report.railingReviewRequired,true);
 assert.equal(c.report.constructionApproved,false);
 assert.equal(c.report.worldContacts,0);
 assert.equal(c.report.BuildPlan.operations.length,0);
 assert(c.report.gates.every(g=>g==='BLOCKED'));
 assert.equal(c.after.targets[0].status,'PASS_FLAT_FOOTPRINT_GEOMETRY');
});
test('forged proof is rejected; no automatic approval for unsupported geometry',()=>{
 const original=readInterchangeR0();
 const r=buildBridgeCandidate(original,TRANSIT_PROPOSAL);
 assert(verifyBridgeCandidate(original,TRANSIT_PROPOSAL,r.report));
 const forged=structuredClone(r.report);
 forged.constructionApproved=true;
 assert.equal(verifyBridgeCandidate(original,TRANSIT_PROPOSAL,forged),false);
 const before=JSON.stringify(original);
 assert.throws(()=>buildBridgeCandidate(original,{...TRANSIT_PROPOSAL,
  goal:[64,21,37]}),/B156_NOT_A_SAFE_CANDIDATE/);
 assert.equal(JSON.stringify(original),before);
 assert.throws(()=>buildBridgeCandidate(original,TRANSIT_PROPOSAL,
  {candidateId:'../../evil'}),/B156_INPUTS/);
});
test('source-generated 20th model proves same 26-move corridor as authored R1',()=>{
 const inputs=[readDesigns(),readRevisionRequests(),readContinuations(),
  readStructuralRequests(),readRepairRequest(),readInteriorDesign(),
  readUpperDesign(),readWideDesign(),readLoopDesign(),readSkyDesign(),
  readBypassDesign(),readInterchangeR0(),readInterchangeR1()];
 const immutableHistory=JSON.stringify(inputs);
 const b=makeB156Bundle(...inputs);
 assert.equal(JSON.stringify(inputs),immutableHistory);
 assert.equal(b.gallery.scenes.length,20);
 assert.equal(b.gallery.scenes[17].id,'aurora-interchange-r0');
 assert.equal(b.gallery.scenes[18].id,'aurora-interchange-r1');
 assert.equal(b.gallery.scenes[19].id,'aurora-interchange-generated-candidate');
 assert.equal(b.candidate.before.targets[0].status,'FOOTPRINT_UNREACHABLE');
 assert.equal(b.candidate.after.targets[0].status,'PASS_FLAT_FOOTPRINT_GEOMETRY');
 assert.equal(b.candidate.after.targets[0].steps,26);
 assert.equal(b.manual.targets[0].steps,26);
 assert.equal(b.candidate.candidate.elements.at(-1).mode,'add');
 assert.equal(b.gallery.safety.minecraftWrites,0);
 assert.equal(b.candidate.report.BuildPlan.operations.length,0);
 const template=fs.readFileSync(new URL('../source/ai/b143-viewer-template.html',import.meta.url),'utf8');
 const html=renderB156Html(b,template);
 for(const x of ['id="b156-route"','id="b156-status"',
  'index=19;select.value="19";setScene()','NOT_PREPARED'])
  assert(html.includes(x),'Missing '+x);
 assert(!html.includes('fetch('));
});
