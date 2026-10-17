import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SCHEMA} from '../source/ai/b143-building-dsl.mjs';
import {DEFAULT_ROUTE,planAdaptiveSkybridge,verifyAdaptiveSkybridge} from '../source/ai/b161-adaptive-skybridge.mjs';
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
import {readPolarisR0} from './build-b159-site.mjs';
import {readDopplerR0} from './build-b160-site.mjs';
import {makeB161Bundle,renderB161Html} from './build-b161-site.mjs';
const box=(id,origin,size,material='concrete')=>({id,shape:'box',mode:'add',material,origin,size});
test('adaptive route avoids existing 3-tower architecture and improves 117 to 101 flat steps',()=>{
 const original=readDopplerR0(),immutable=JSON.stringify(original);
 const r=planAdaptiveSkybridge(original,DEFAULT_ROUTE);
 assert.equal(JSON.stringify(original),immutable);
 assert.equal(r.before.targets[0].status,'FOOTPRINT_UNREACHABLE');
 assert.equal(r.floorRoute.targets[0].status,'PASS_FLAT_FOOTPRINT_GEOMETRY');
 assert.equal(r.finalRoute.targets[0].status,'PASS_FLAT_FOOTPRINT_GEOMETRY');
 assert.equal(r.report.centerlineSteps,101);
 assert.equal(r.report.final2x2FlatMoves,101);
 assert.equal(r.report.centerlineTurns,3);
 assert.equal(r.report.corridorSegments,4);
 assert.equal(r.report.finishingElementCount,32);
 assert(r.report.searchExpansionCount>0);
 assert(r.report.searchExpansionCount<45000);
 assert.equal(r.report.corridorWidth,4);
 assert.equal(r.report.originalDesignUnmodified,true);
 assert.equal(r.report.structuralStrengthCertified,false);
 assert.equal(r.report.constructionApproved,false);
 assert.equal(r.report.worldContacts,0);
 assert.equal(r.report.BuildPlan.operations.length,0);
 assert(r.report.gates.every(v=>v==='BLOCKED'));
 assert(r.finalRoute.targets[0].path.every(p=>p[1]===DEFAULT_ROUTE.start[1]));
 assert(verifyAdaptiveSkybridge(original,DEFAULT_ROUTE,r.report));
});
test('general planner adapts to an independent source building and route parameters',()=>{
 const design={schema:SCHEMA,id:'rheia-independent-alt-port',
  title:'Independent Twin-Hall Transit Architecture',
  brief:'A completely new local geometry for validating arbitrary path planning.',
  designOnly:true,bounds:{width:80,height:40,depth:84},
  elements:[
   box('north-foot',[6,14,6],[12,2,12]),
   box('south-foot',[56,14,55],[12,2,12]),
   box('middle-obstruction',[31,16,25],[9,14,18],'metal')
  ]};
 const params={start:[12,16,11],goal:[61,16,61],
  corridorWidth:4,footprintWidth:2,footprintDepth:2,
  maxNodes:45000,turnPenalty:12,maxBends:14};
 const unchanged=JSON.stringify(design);
 const r=planAdaptiveSkybridge(design,params);
 assert.equal(JSON.stringify(design),unchanged);
 assert.equal(r.finalRoute.targets[0].status,'PASS_FLAT_FOOTPRINT_GEOMETRY');
 assert(r.report.centerlineSteps>=99);
 assert(r.report.corridorSegments>=2);
 assert(r.report.searchExpansionCount>0);
 assert.equal(r.report.worldContacts,0);
 assert.equal(r.report.constructionApproved,false);
 assert.equal(r.report.BuildPlan.operations.length,0);
});
test('malformed, unsupported and unsafe requests are rejected instead of becoming construction commands',()=>{
 const original=readDopplerR0(),p=DEFAULT_ROUTE;
 for(const invalid of [
  {...p,goal:[67,20,78]}, {...p,maxNodes:200000},
  {...p,corridorWidth:1}, {...p,turnPenalty:-1},
  {...p,maxBends:400}
 ])assert.throws(()=>planAdaptiveSkybridge(original,invalid),/B161_PARAMETERS/);
 assert.throws(()=>planAdaptiveSkybridge({...original,designOnly:false},p),
  /B143_SCHEMA_OR_MODE/);
 assert.throws(()=>planAdaptiveSkybridge(original,p,{supportBaseY:19}),
  /B161_SUPPORT_SETTING/);
});
test('28-scene gallery preserves B142 through B160 and renders interactive comparison',()=>{
 const inputs=[readDesigns(),readRevisionRequests(),readContinuations(),
  readStructuralRequests(),readRepairRequest(),readInteriorDesign(),
  readUpperDesign(),readWideDesign(),readLoopDesign(),readSkyDesign(),
  readBypassDesign(),readInterchangeR0(),readInterchangeR1(),
  readHeliosR0(),readPolarisR0(),readDopplerR0()];
 const immutable=JSON.stringify(inputs);
 const b=makeB161Bundle(...inputs);
 assert.equal(JSON.stringify(inputs),immutable);
 assert.equal(b.gallery.scenes.length,28);
 assert.equal(b.gallery.scenes[26].id,'doppler-switchback-terminal-generated-detour');
 assert.equal(b.gallery.scenes[27].id,'doppler-switchback-terminal-adaptive-r2');
 assert.equal(b.result.report.final2x2FlatMoves,101);
 assert.equal(b.gallery.safety.minecraftWrites,0);
 assert.equal(b.gallery.safety.BuildPlan.operations.length,0);
 const template=fs.readFileSync(new URL('../source/ai/b143-viewer-template.html',import.meta.url),'utf8');
 const html=renderB161Html(b,template);
 for(const id of ['id="b161-route"','id="b161-status"',
  'index=27;select.value="27";setScene()','NOT_PREPARED'])
  assert(html.includes(id),'Missing '+id);
 assert(!html.includes('fetch('));
});
