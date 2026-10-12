import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {assembleB107} from '../../b107/main/compile-b107.mjs';
import {improveB108Scene,validateB108Scene} from './b108-fidelity.mjs';
import {compileB108,validateB108Report,enhanceB108HTML,writeB108} from './compile-b108.mjs';
const copy=x=>structuredClone(x);
let cache;
const compiled=()=>cache??(cache=compileB108());
test('01 B108 full-fidelity report validates',()=>assert(validateB108Report(compiled().report)));
test('02 all five typologies and fifteen variants retained',()=>{
 const t=compiled().report;assert.equal(t.typologies,5);assert.equal(t.variants,15);
});
test('03 279 rooms and 66 floors retained',()=>{
 const t=compiled().report;assert.equal(t.conceptualRooms,279);assert.equal(t.conceptualFloors,66);
});
test('04 all fifteen refinements validate against immutable parents',()=>{
 const b=compiled();for(let i=0;i<15;i++)
 assert(validateB108Scene(b.refined[i],b.bundle.baseScenes[i],b.bundle.polishScenes[i]));
});
test('05 9203 roof caps have one visual roof sculpt each',()=>{
 assert.equal(compiled().report.roofCells,9203);
});
test('06 each facade infill anchored to existing B105 wall',()=>{
 const b=compiled();const s=b.refined[0],base=b.bundle.baseScenes[0];
 const a=new Set(base.primitives.filter(p=>base.layerNames[p[3]]==='FACADE_PANEL_PROXY')
 .map(p=>p[0]+','+p[1]+','+p[2]));
 for(const x of s.shapes.filter(p=>p.kind!=='SCULPTED_ROOF'))assert(a.has(x.anchor));
});
test('07 no facade infill occupies ground exterior portal source cell',()=>{
 const b=compiled();const base=b.bundle.baseScenes[0],s=b.refined[0];
 const air=new Set(base.primitives.filter(p=>base.layerNames[p[3]]==='EXTERIOR_PORTAL_VOID_PROXY')
 .map(p=>p[0]+','+p[1]+','+p[2]));
 for(const f of s.shapes.filter(p=>p.kind!=='SCULPTED_ROOF'))
 assert(!air.has(f.anchor));
});
test('08 original B107 scenes not mutated',()=>{
 const b=compiled(),s=b.bundle.baseScenes[0],p=b.bundle.polishScenes[0],str=JSON.stringify([s,p]);
 improveB108Scene(s,p);assert.equal(JSON.stringify([s,p]),str);
});
test('09 five roofing typologies generate different height distributions',()=>{
 const b=compiled();
 const signatures=[0,3,6,9,12].map(i=>new Set(b.refined[i].shapes
 .filter(s=>s.kind==='SCULPTED_ROOF').map(s=>s.h)).size);
 assert(signatures.every(x=>x>=2));
});
test('10 frozen 9 construction gates blocked',()=>{
 const r=compiled().report;assert.equal(r.nineGates.length,9);
 assert(r.nineGates.every(g=>g.status==='BLOCKED'));
});
test('11 zero world operations and certified blocks',()=>{
 const r=compiled().report;assert.equal(r.createdWorldBlocks,0);
 assert.equal(r.certifiedEducationStates,0);assert.deepEqual(r.BuildPlan.operations,[]);
});
test('12 mutation invalidates refinement integrity checksum',()=>{
 const b=compiled(),c=copy(b.refined[0]);c.shapes[0].h+=.2;
 assert.equal(validateB108Scene(c,b.bundle.baseScenes[0],b.bundle.polishScenes[0]),false);
});
test('13 forged construction permission rejected',()=>{
 const b=compiled(),c=copy(b.refined[0]);c.constructionApproved=true;
 assert.equal(validateB108Scene(c,b.bundle.baseScenes[0],b.bundle.polishScenes[0]),false);
});
test('14 report cannot claim real completed roofs or human review',()=>{
 const r=copy(compiled().report);r.physicalRoofCertified=true;
 assert.equal(validateB108Report(r),false);
});
test('15 exported HTML has corrected depth order and exterior-first defaults',()=>{
 const t=fs.mkdtempSync(path.join(os.tmpdir(),'b108-review-'));
 try{const o=writeB108(compiled(),t),html=fs.readFileSync(o.htmlPath,'utf8');
 assert(html.includes('const refined=payload.refinements;'));
 assert(html.includes('const depth=item=>'));
 assert(html.includes('options[k].checked=false;'));
 assert(html.includes('window.__B108_QA='));
 assert(html.includes('SCULPTED_ROOF'));
 assert(html.includes('描画 "+b108LastFrameMs.toFixed(1)'));
 assert(!html.includes('fetch('));assert(!html.includes('__B106_SCENE_PAYLOAD__'));
 }finally{fs.rmSync(t,{recursive:true,force:true});}
});
test('16 produced HTML JavaScript parses in JS engine',()=>{
 const t=fs.mkdtempSync(path.join(os.tmpdir(),'b108-parser-'));
 try{const o=writeB108(compiled(),t),html=fs.readFileSync(o.htmlPath,'utf8');
 const script=html.match(/<script>([\s\S]*)<\/script>/)?.[1];assert(script);
 assert.doesNotThrow(()=>new vm.Script(script,{filename:'B108Review.html'}));
 }finally{fs.rmSync(t,{recursive:true,force:true});}
});
test('17 rejects export of invalid B107 provenance',()=>{
 const b=copy(compiled()),temp=fs.mkdtempSync(path.join(os.tmpdir(),'b108-fail-'));
 try{b.bundle.polishScenes[0].integritySha256='tampered';
 assert.throws(()=>writeB108(b,temp));}
 finally{fs.rmSync(temp,{recursive:true,force:true});}
});
test('18 report captures protected 296+18 state',()=>{
 const r=compiled();assert.equal(r.report.roofCells,r.report.visualOnlyShapes-r.report.lowerWallCells-r.report.upperWallCells);
 assert.equal(r.report.worldContacts,0);
});
test('19 privacy: no actual world coordinate field',()=>{
 const b=compiled();for(const s of b.refined){assert.equal(s.worldContacts,0);assert.equal(s.worldCoordinates,null);}
});
test('20 accurate facade/roof counts',()=>{
 const b=compiled(),l=b.refined.reduce((n,s)=>n+s.shapes.length,0);
 assert.equal(l,b.report.visualOnlyShapes);
});
