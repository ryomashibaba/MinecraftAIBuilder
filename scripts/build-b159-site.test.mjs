import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SCHEMA} from '../source/ai/b143-building-dsl.mjs';
import {reviewBentBridge,buildFinishedBentBridge,verifyFinishedBentBridge} from '../source/ai/b159-bent-skybridge.mjs';
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
import {readInterchangeR0,readInterchangeR1} from './build-b155-site.mjs';
import {readHeliosR0} from './build-b158-site.mjs';
import {readPolarisR0,POLARIS_ROUTE,makeB159Bundle,renderB159Html} from './build-b159-site.mjs';
const box=(id,origin,size)=>({id,shape:'box',mode:'add',material:'concrete',origin,size});
const synthetic=()=>({
 schema:SCHEMA,id:'diagonal-independent-local-fixture',
 title:'Two unrelated elevated bridgeheads',
 brief:'No game-world data; geometry-only L route tests',
 bounds:{width:55,height:30,depth:55},designOnly:true,
 elements:[box('west-elevated',[6,11,6],[16,2,16]),
  box('east-elevated',[31,11,31],[16,2,16])]
});
const args={start:[13,13,13],goal:[37,13,37],
 footprintWidth:2,footprintDepth:2,corridorWidth:8};
test('generic right-angle planner creates a candidate only after rerouting the full 2x2 body',()=>{
 const d=synthetic(),frozen=JSON.stringify(d);
 const result=reviewBentBridge(d,args);
 assert.equal(JSON.stringify(d),frozen);
 assert.equal(result.before.targets[0].status,'FOOTPRINT_UNREACHABLE');
 assert.equal(result.attempts.length,2);
 assert.equal(result.attempts.filter(a=>a.status==='PASS_FLAT_FOOTPRINT_GEOMETRY').length,2);
 assert.equal(result.selected.floor.length,2);
 assert.equal(result.routeArgs.headroom,2);
 assert(result.selected.route.targets[0].path.every(p=>p[1]===13));
 assert.equal(result.report.constructionApproved,false);
 assert.equal(result.report.worldContacts,0);
 assert(result.report.gates.every(x=>x==='BLOCKED'));
 assert.equal(result.report.BuildPlan.operations.length,0);
});
test('malformed/non-flat or unsupported inputs fail without authoring a world',()=>{
 const d=synthetic();
 assert.throws(()=>reviewBentBridge(d,{...args,goal:[37,14,37]}),/B159_PARAMETERS/);
 assert.throws(()=>reviewBentBridge(d,{...args,goal:[13,13,37]}),/B159_PARAMETERS/);
 assert.throws(()=>reviewBentBridge({...d,designOnly:false},args),/B159_PARAMETERS/);
 assert.throws(()=>reviewBentBridge(d,{...args,corridorWidth:2}),/B159_PARAMETERS/);
});
test('POLARIS actual 25-scene gallery rejects tower corner, selects other L and preserves B141-B158',()=>{
 const inputs=[readDesigns(),readRevisionRequests(),readContinuations(),
  readStructuralRequests(),readRepairRequest(),readInteriorDesign(),
  readUpperDesign(),readWideDesign(),readLoopDesign(),readSkyDesign(),
  readBypassDesign(),readInterchangeR0(),readInterchangeR1(),
  readHeliosR0(),readPolarisR0()];
 const original=JSON.stringify(inputs);
 const gallery=makeB159Bundle(...inputs),b=gallery.result;
 assert.equal(JSON.stringify(inputs),original);
 assert.equal(gallery.gallery.scenes.length,25);
 assert.equal(gallery.gallery.scenes[22].id,'helios-freight-harbor-generated-finished');
 assert.equal(gallery.gallery.scenes[23].id,'polaris-orbital-switchyard-r0');
 assert.equal(gallery.gallery.scenes[24].id,'polaris-orbital-switchyard-generated-bent');
 assert.equal(b.before.targets[0].status,'FOOTPRINT_UNREACHABLE');
 assert.deepEqual(b.report.attemptStatuses.map(x=>x.status),
  ['FOOTPRINT_UNREACHABLE','PASS_FLAT_FOOTPRINT_GEOMETRY']);
 assert.equal(b.selected.bend,'Z_THEN_X');
 assert.equal(b.route.targets[0].steps,73);
 assert(b.route.targets[0].path.every(p=>p[1]===POLARIS_ROUTE.start[1]));
 assert.equal(b.finishReport.finishingElements,16);
 assert.equal(b.finishReport.glassRails,4);
 assert.equal(b.finishReport.underTrusses,4);
 assert.equal(b.finishReport.lightStrips,4);
 assert.equal(b.finishReport.pierDesigns,2);
 assert.equal(b.finishReport.structuralStrengthCertified,false);
 assert.equal(b.finishReport.constructionApproved,false);
 assert.equal(b.finishReport.BuildPlan.operations.length,0);
 assert.equal(gallery.gallery.safety.minecraftWrites,0);
 assert.equal(gallery.gallery.safety.BuildPlan.operations.length,0);
 const template=fs.readFileSync(new URL('../source/ai/b143-viewer-template.html',import.meta.url),'utf8');
 const html=renderB159Html(gallery,template);
 for(const fragment of ['id="b159-route"','id="b159-status"',
  'index=24;select.value="24";setScene()','NOT_PREPARED'])
   assert(html.includes(fragment),'Missing '+fragment);
 assert(!html.includes('fetch('));
});
