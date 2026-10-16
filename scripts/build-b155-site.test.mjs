import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SCHEMA,compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {analyzeFootprint} from '../source/ai/b152-footprint-review.mjs';
import {proposeSkybridge,verifySkybridgeProposal} from '../source/ai/b155-bridge-proposal.mjs';
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
import {readInterchangeR0,readInterchangeR1,TRANSIT_ROUTE,TRANSIT_PROPOSAL,
 makeB155Bundle,renderB155Html} from './build-b155-site.mjs';
const box=(id,origin,size)=>({id,shape:'box',mode:'add',material:'concrete',origin,size});
const demo=elements=>({schema:SCHEMA,id:'generic-bridge-fixture',title:'Bridge Test',
 brief:'Geometry evidence, never world commands',bounds:{width:40,height:20,depth:36},
 designOnly:true,elements});
const split=()=>compileDesign(demo([
 box('left',[4,2,8],[6,1,8]),
 box('right',[17,2,8],[6,1,8])
]));
test('straight gap emits a bounded inert floor proposal that can be independently compiled',()=>{
 const scene=split(),args={start:[7,3,10],goal:[18,3,10],
  footprintWidth:2,footprintDepth:2,corridorWidth:6};
 const report=proposeSkybridge(scene,args);
 assert.equal(report.status,'GEOMETRIC_FLOOR_PROPOSAL_ONLY');
 assert.equal(report.proposedFloor?.mode,'add');
 assert.equal(report.proposedFloor?.shape,'box');
 assert.equal(report.proposedFloor?.material,'concrete');
 assert.equal(report.constructionApproved,false);
 assert.equal(report.worldContacts,0);
 assert(verifySkybridgeProposal(scene,args,report));
 const candidate=compileDesign(demo([
  box('left',[4,2,8],[6,1,8]),box('right',[17,2,8],[6,1,8]),
  report.proposedFloor]));
 const route=analyzeFootprint(candidate,{start:args.start,
  destinations:[{id:'target',at:args.goal}],width:2,depth:2,headroom:2});
 assert.equal(route.targets[0].status,'PASS_FLAT_FOOTPRINT_GEOMETRY');
});
test('other geometry is rejected without auto-construction',()=>{
 const scene=split();
 for(const [params,expected] of [
  [{start:[7,3,10],goal:[18,4,10]},'INVALID_ENDPOINT'],
  [{start:[7,3,10],goal:[18,3,11]},'NEEDS_L_SHAPE_OR_OTHER_DESIGN'],
  [{start:[7,3,10],goal:[18,3,10],maxSpan:3},'SPAN_BEYOND_LIMIT']
 ]){
  const r=proposeSkybridge(scene,{...params});
  assert.equal(r.status,expected);
  assert.equal(r.proposedFloor,null);
  assert.equal(r.BuildPlan.operations.length,0);
 }
});
test('forged source, forged proposal or unsafe footprint fail closed',()=>{
 const scene=split(),params={start:[7,3,10],goal:[18,3,10]};
 const proof=proposeSkybridge(scene,params),bad=structuredClone(proof);
 bad.constructionApproved=true;
 assert.equal(verifySkybridgeProposal(scene,params,bad),false);
 bad.constructionApproved=false;bad.proposedFloor.size[0]=200;
 assert.equal(verifySkybridgeProposal(scene,params,bad),false);
 assert.throws(()=>proposeSkybridge({...scene,worldContacts:1},params),/B152_INVALID_SCENE/);
 assert.throws(()=>proposeSkybridge(scene,{...params,corridorWidth:1}),/B155_PARAMETERS/);
});
test('two unrelated real architectures prove actual bridge proposal versus L-shaped change-level rejection',()=>{
 const inputs=[readDesigns(),readRevisionRequests(),readContinuations(),
  readStructuralRequests(),readRepairRequest(),readInteriorDesign(),readUpperDesign(),
  readWideDesign(),readLoopDesign(),readSkyDesign(),readBypassDesign(),
  readInterchangeR0(),readInterchangeR1()];
 const historical=JSON.stringify(inputs.slice(0,11));
 const bundle=makeB155Bundle(...inputs);
 assert.equal(JSON.stringify(inputs.slice(0,11)),historical);
 assert.equal(bundle.gallery.scenes.length,19);
 assert.equal(bundle.gallery.scenes[17].id,'aurora-interchange-r0');
 assert.equal(bundle.gallery.scenes[18].id,'aurora-interchange-r1');
 assert.equal(bundle.proposal.status,'GEOMETRIC_FLOOR_PROPOSAL_ONLY');
 assert.equal(bundle.baseline.targets[0].status,'FOOTPRINT_UNREACHABLE');
 assert.equal(bundle.repaired.targets[0].status,'PASS_FLAT_FOOTPRINT_GEOMETRY');
 assert.equal(bundle.repaired.targets[0].steps,26);
 assert.equal(bundle.candidateRoute.targets[0].status,'PASS_FLAT_FOOTPRINT_GEOMETRY');
 assert.equal(bundle.declined.status,'DIFFERENT_ELEVATIONS');
 assert.equal(bundle.gallery.safety.minecraftWrites,0);
 assert.equal(bundle.proposal.BuildPlan.operations.length,0);
 const template=fs.readFileSync(new URL('../source/ai/b143-viewer-template.html',import.meta.url),'utf8');
 const html=renderB155Html(bundle,template);
 for(const item of ['id="b155-route"','id="b155-status"',
  'index=18;select.value="18";setScene()','NOT_PREPARED'])assert(html.includes(item),'Missing '+item);
 assert(!html.includes('fetch('));
});
