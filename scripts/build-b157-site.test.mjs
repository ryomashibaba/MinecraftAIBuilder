import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {designFinishedBridge,verifyFinishedBridge} from '../source/ai/b157-finished-bridge.mjs';
import {SCHEMA} from '../source/ai/b143-building-dsl.mjs';
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
import {makeB157Bundle,renderB157Html} from './build-b157-site.mjs';
const box=(id,origin,size)=>({id,shape:'box',mode:'add',material:'concrete',origin,size});
test('inert B157 finishing creates real guard, truss, pier and light geometry without blocking 2x2',()=>{
 const original=readInterchangeR0(),unchanged=JSON.stringify(original);
 const design=designFinishedBridge(original,TRANSIT_PROPOSAL);
 assert.equal(JSON.stringify(original),unchanged);
 assert.equal(design.finished.id,'aurora-interchange-generated-finished');
 assert.equal(design.finished.elements.length,
  design.generated.candidate.elements.length+14);
 assert.equal(JSON.stringify(design.finished.elements.slice(0,design.generated.candidate.elements.length)),
  JSON.stringify(design.generated.candidate.elements));
 assert.equal(design.report.finishingElementCount,14);
 assert.equal(design.report.guardrailPieces,2);
 assert.equal(design.report.foundationPiers,2);
 assert.equal(design.report.lightingStrips,2);
 assert.equal(design.report.portalFrames,2);
 assert.equal(design.report.connectedFlatMoves,26);
 assert.equal(design.reroute.targets[0].status,'PASS_FLAT_FOOTPRINT_GEOMETRY');
 assert.equal(design.report.structuralStrengthCertified,false);
 assert.equal(design.report.pierFoundationCertified,false);
 assert.equal(design.report.constructionApproved,false);
 assert(design.report.gates.every(x=>x==='BLOCKED'));
 assert.equal(design.report.BuildPlan.operations.length,0);
 assert(verifyFinishedBridge(original,TRANSIT_PROPOSAL,design.report));
});
test('unsupported topology, invalid support and tampered proof stay HOLD',()=>{
 const original=readInterchangeR0(),report=designFinishedBridge(original,TRANSIT_PROPOSAL).report;
 const forged=structuredClone(report);
 forged.constructionApproved=true;
 assert.equal(verifyFinishedBridge(original,TRANSIT_PROPOSAL,forged),false);
 forged.constructionApproved=false;forged.connectedFlatMoves=3;
 assert.equal(verifyFinishedBridge(original,TRANSIT_PROPOSAL,forged),false);
 assert.throws(()=>designFinishedBridge(original,TRANSIT_PROPOSAL,
  {supportBaseY:18}),/B157_TOO_NARROW_OR_LOW/);
 assert.throws(()=>designFinishedBridge(original,TRANSIT_PROPOSAL,
  {finishId:'../../malware'}),/B157_PARAMETERS/);
 assert.throws(()=>designFinishedBridge(original,{...TRANSIT_PROPOSAL,goal:[64,21,37]}),
  /B156_NOT_A_SAFE_CANDIDATE/);
});
test('same finisher works on a different supported straight hall gap',()=>{
 const d={schema:SCHEMA,id:'alternate-cargo-terminal',title:'Alternate Cargo Terminal',
  brief:'Isolated local test: large east-west gap in a warehouse.',
  designOnly:true,bounds:{width:65,height:38,depth:48},
  elements:[
   box('left-floor',[5,15,12],[12,2,15]),
   box('right-floor',[36,15,12],[12,2,15])
  ]};
 const params={start:[12,17,18],goal:[40,17,18],
  corridorWidth:8,footprintWidth:2,footprintDepth:2,maxSpan:45};
 const result=designFinishedBridge(d,params,{supportBaseY:5,
  finishId:'alternate-cargo-terminal-finished'});
 assert.equal(result.report.proposedBridgeAxis,'x');
 assert.equal(result.report.connectedFlatMoves,28);
 assert.equal(result.report.finishingElementCount,14);
 assert(result.finished.elements.at(-1).id.startsWith('b157-'));
 assert.equal(result.report.worldContacts,0);
 assert.equal(result.report.constructionApproved,false);
});
test('actual 21st design preserves all 20 prior models and compare-page has live controls',()=>{
 const inputs=[readDesigns(),readRevisionRequests(),readContinuations(),
  readStructuralRequests(),readRepairRequest(),readInteriorDesign(),
  readUpperDesign(),readWideDesign(),readLoopDesign(),readSkyDesign(),
  readBypassDesign(),readInterchangeR0(),readInterchangeR1()];
 const frozen=JSON.stringify(inputs);
 const b=makeB157Bundle(...inputs);
 assert.equal(JSON.stringify(inputs),frozen);
 assert.equal(b.gallery.scenes.length,21);
 assert.equal(b.gallery.scenes[17].id,'aurora-interchange-r0');
 assert.equal(b.gallery.scenes[18].id,'aurora-interchange-r1');
 assert.equal(b.gallery.scenes[19].id,'aurora-interchange-generated-candidate');
 assert.equal(b.gallery.scenes[20].id,'aurora-interchange-generated-finished');
 assert.equal(b.finish.report.connectedFlatMoves,26);
 assert.equal(b.gallery.safety.minecraftWrites,0);
 assert.equal(b.finish.report.BuildPlan.operations.length,0);
 const template=fs.readFileSync(new URL('../source/ai/b143-viewer-template.html',import.meta.url),'utf8');
 const html=renderB157Html(b,template);
 for(const x of ['id="b157-status"','id="b157-route"',
  'index=20;select.value="20";setScene()','NOT_PREPARED'])
  assert(html.includes(x),'Missing '+x);
 assert(!html.includes('fetch('));
});
