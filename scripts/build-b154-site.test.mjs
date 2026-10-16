import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SCHEMA,compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {analyzeBypassIntervention,verifyBypassIntervention} from '../source/ai/b154-bypass-evidence.mjs';
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
import {readBypassDesign,makeB154Bundle,renderB154Html,BYPASS_TARGETS} from './build-b154-site.mjs';
const box=(id,origin,size,mode='add')=>({id,shape:'box',mode,
 ...(mode==='add'?{material:'concrete'}:{}),origin,size});
const design=e=>({schema:SCHEMA,id:'true-floor-intervention',title:'Supported Floor Example',
 brief:'Purely local offline geometry example',bounds:{width:28,height:18,depth:28},
 designOnly:true,elements:e});
test('genuinely added supported floor changes 2x2 target from invalid to pass',()=>{
 const before=compileDesign(design([box('left',[4,2,4],[5,1,5])]));
 const after=compileDesign(design([box('left',[4,2,4],[5,1,5]),
  box('right',[9,2,4],[5,1,5])]));
 const args={start:[5,3,5],destinations:[{id:'new-area',at:[11,3,5]}],
  width:2,depth:2,headroom:2};
 const r=analyzeBypassIntervention(before,after,args);
 assert.equal(r.targets[0].before,'INVALID_GOAL_FOOTPRINT');
 assert.equal(r.targets[0].after,'PASS_FLAT_FOOTPRINT_GEOMETRY');
 assert.equal(r.targets[0].improvedByActualVoxels,true);
 assert(r.physicallyAddedVoxels>0);
 assert(verifyBypassIntervention(before,after,args,r));
 assert.equal(r.constructionApproved,false);
});
test('report cannot certify Minecraft movement or contain trusted world commands',()=>{
 const before=compileDesign(design([box('left',[4,2,4],[5,1,5])]));
 const after=compileDesign(design([box('left',[4,2,4],[5,1,5]),
  box('right',[9,2,4],[5,1,5])]));
 const args={start:[5,3,5],destinations:[{id:'new-area',at:[11,3,5]}],
  width:2,depth:2};
 const r=analyzeBypassIntervention(before,after,args);
 const tamper=structuredClone(r);tamper.constructionApproved=true;
 assert.equal(verifyBypassIntervention(before,after,args,tamper),false);
 assert.throws(()=>analyzeBypassIntervention({...before,worldContacts:1},after,args),
  /B154_INVALID_REVISIONS/);
 assert.throws(()=>analyzeBypassIntervention(before,after,{...args,width:1}),
  /B154_EXPECTED_BODY_CLEARANCE/);
 assert.equal(r.BuildPlan.operations.length,0);
 assert.equal(r.gates.every(s=>s==='BLOCKED'),true);
});
test('R6 physically connects a four-cell-wide promenade without any vertical motion',()=>{
 const inputs=[readDesigns(),readRevisionRequests(),readContinuations(),
  readStructuralRequests(),readRepairRequest(),readInteriorDesign(),readUpperDesign(),
  readWideDesign(),readLoopDesign(),readSkyDesign(),readBypassDesign()];
 const source=JSON.stringify(inputs.slice(0,10));
 const b=makeB154Bundle(...inputs);
 assert.equal(JSON.stringify(inputs.slice(0,10)),source);
 assert.equal(b.gallery.scenes.length,17);
 assert.equal(b.gallery.scenes[15].id,'stratos-observatory-interior-r5');
 assert.equal(b.gallery.scenes[16].id,'stratos-observatory-interior-r6');
 assert.equal(b.before.targets[2].status,'INVALID_GOAL_FOOTPRINT');
 assert.equal(b.after.targets[2].status,'PASS_FLAT_FOOTPRINT_GEOMETRY');
 assert.equal(b.after.targets[2].steps,26);
 assert(b.after.targets[2].path.every(p=>p[1]===13));
 assert(b.proof.targets[2].turnCount>=1);
 assert(b.proof.physicallyAddedVoxels>0);
 assert.equal(b.gallery.safety.minecraftWrites,0);
 assert.equal(b.gallery.safety.BuildPlan.operations.length,0);
 const template=fs.readFileSync(new URL('../source/ai/b143-viewer-template.html',import.meta.url),'utf8');
 const html=renderB154Html(b,template);
 for(const token of ['id="b154-target"','id="b154-show-route"','id="b154-status"',
  'index=16;select.value="16";setScene()','NOT_PREPARED'])
  assert(html.includes(token),'missing '+token);
 assert(!html.includes('fetch('));
});
