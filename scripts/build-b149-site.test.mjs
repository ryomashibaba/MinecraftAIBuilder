import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SCHEMA,compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {analyzeTraversability,verifyTraversability} from '../source/ai/b149-traversability.mjs';
import {readDesigns} from './build-b143-site.mjs';
import {readRevisionRequests} from './build-b144-site.mjs';
import {readContinuations} from './build-b145-site.mjs';
import {readStructuralRequests} from './build-b146-site.mjs';
import {readRepairRequest} from './build-b147-site.mjs';
import {makeB149Bundle,readInteriorDesign,renderB149Html,WAYPOINTS} from './build-b149-site.mjs';
const box=(id,origin,size,mode='add')=>({
 id,shape:'box',mode,...(mode==='add'?{material:'stone'}:{}),origin,size});
const demo=elements=>({
 schema:SCHEMA,id:'sample-passage-review',title:'Walking topology',
 brief:'Bounded conceptual test',bounds:{width:18,height:18,depth:18},
 designOnly:true,elements});
test('door with two clear head cells joins horizontal corridors',()=>{
 const d=demo([box('floor',[2,2,2],[8,1,8]),
  box('divider',[5,3,2],[1,4,8]),box('opening',[5,3,5],[1,3,2],'cut')]);
 const s=compileDesign(d),p={entrance:[3,3,5],destinations:[{id:'inside',at:[8,3,5]}]};
 const r=analyzeTraversability(s,p);
 assert.equal(r.routes[0].status,'PASS_FLAT_GEOMETRY');
 assert(r.routes[0].flatSteps>=5);
 assert(verifyTraversability(s,p,r));
 assert.equal(r.gates.filter(x=>x==='BLOCKED').length,9);
 assert.equal(r.worldContacts,0);
});
test('one cell of headroom is insufficient even if feet voxel is empty',()=>{
 const s=compileDesign(demo([box('floor',[2,2,2],[6,1,6]),
  box('too-low-ceiling',[2,4,2],[6,1,6])]));
 const r=analyzeTraversability(s,{entrance:[3,3,3],destinations:[{id:'inside',at:[5,3,5]}]});
 assert.equal(r.routes[0].status,'INVALID_ENTRANCE');
});
test('one-block elevation does not silently gain certified stairs',()=>{
 const s=compileDesign(demo([box('low',[2,2,2],[2,1,2]),box('high',[4,3,2],[2,1,2])]));
 const r=analyzeTraversability(s,{entrance:[3,3,2],destinations:[{id:'upper',at:[4,4,2]}]});
 assert.equal(r.routes[0].status,'UNREACHABLE');
 assert(r.possibleOneBlockTransitions>0);
 assert.equal(r.stairsCertified,false);
 assert.equal(r.routes[0].physicallyCertified,false);
});
test('unsafe scene and invalid waypoints fail closed',()=>{
 const s=compileDesign(demo([box('floor',[2,2,2],[6,1,6])]));
 const p={entrance:[3,3,3],destinations:[{id:'inside',at:[4,3,4]}]};
 const r=analyzeTraversability(s,p);
 const forged=structuredClone(r);forged.constructionApproved=true;
 assert.equal(verifyTraversability(s,p,forged),false);
 assert.throws(()=>analyzeTraversability({...s,worldContacts:1},p),/B149_UNSAFE/);
 assert.throws(()=>analyzeTraversability(s,{...p,destinations:[{id:'inside',at:[-1,3,4]}]}),/B149_INVALID/);
});
test('real source-preserving hangar revision creates verified route to the hall',()=>{
 const designs=readDesigns(),interior=readInteriorDesign(),orig=designs.find(x=>x.id==='stratos-observatory');
 const source=JSON.stringify(orig);
 const b=makeB149Bundle(designs,readRevisionRequests(),readContinuations(),
  readStructuralRequests(),readRepairRequest(),interior);
 assert.equal(JSON.stringify(orig),source);
 assert.equal(b.prior.routes[0].status,'INVALID_ENTRANCE');
 assert(b.improved.routes.slice(0,2).every(x=>x.status==='PASS_FLAT_GEOMETRY'));
 assert.equal(b.gallery.scenes.length,12);
 assert.equal(b.gallery.scenes[11].id,interior.id);
 assert.equal(b.gallery.safety.minecraftWrites,0);
 assert.equal(b.improved.BuildPlan.operations.length,0);
 assert.equal(b.improved.geometryOnly,true);
 const t=fs.readFileSync(new URL('../source/ai/b143-viewer-template.html',import.meta.url),'utf8');
 const html=renderB149Html(b,t);
 for(const s of ['id="routeTarget"','id="showRoute"','id="routeStatus"',
  'PASS_FLAT_GEOMETRY','index=11;select.value="11";setScene()','NOT_PREPARED'])
  assert(html.includes(s),'Missing '+s);
 assert(!html.includes('fetch(')&&!html.includes('__B143_GALLERY_JSON__'));
});
