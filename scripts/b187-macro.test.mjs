import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import vm from 'node:vm';
import {MAX_CELLS,validateDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {buildCrownObservatory} from '../source/ai/b186-crown-observatory.mjs';
import {buildLegibleCivic,createLegibleCivicModule,legibleCivicElements,
 auditCivicSourceNetwork,PUBLIC_LEVELS,INTERHALL_LEVELS,
 verifyLegibleCivicReport} from '../source/ai/b187-legible-civic.mjs';
import {buildB187Preview} from './b187-build-preview.mjs';
test('15th separately valid strict B143 module increases source-authored real megacity volumes',()=>{
 const old=buildCrownObservatory(),now=buildLegibleCivic(),r=now.report;
 assert.equal(old.compiled.primitives.length,130647);
 assert.equal(old.report.totalElements,1355);
 assert(validateDesign(now.design));assert(verifyCompiled(now.design,now.addon));
 assert.equal(now.design.elements.length,legibleCivicElements().length);
 assert(now.design.elements.length>=90&&now.design.elements.length<=160);
 assert(r.additionalReal3dCells>=1200);
 assert.equal(r.totalSourceCells,130647+r.additionalReal3dCells);
 assert(r.totalSourceCells<=MAX_CELLS);
 assert.equal(r.remainingSourceCells,MAX_CELLS-r.totalSourceCells);
 assert.notEqual(r.geometrySha256,r.parentGeometrySha256);
 assert(verifyLegibleCivicReport(r));
});
test('21 nonfabricated 2wide floor waypoints, 30 edges with predecessor proof, complete BFS',()=>{
 const s=buildLegibleCivic(),v=auditCivicSourceNetwork(s.compiled);
 assert.equal(v.vertices.length,21);
 assert.equal(v.edges.length,30);
 assert.equal(v.joinedVertices,21);
 assert.equal(v.verifiedEdges,30);
 assert.equal(v.allHallsAllSevenLevelsReachable,true);
 assert.deepEqual(PUBLIC_LEVELS,[61,65,69,73,74,75,76]);
 assert.deepEqual(INTERHALL_LEVELS,[61,65,69,73,75,76]);
 assert(v.vertices.every(x=>x.supportedHeadroom2x2));
 assert(v.edges.every(x=>x.sourceGeometryOnly&&x.proofName.length>=18));
 assert.equal(v.exampleFloorToRoofRoute[0],'north:61');
 assert.equal(v.exampleFloorToRoofRoute.at(-1),'south:76');
 assert.equal(v.realMinecraftPlayerTraversalCertified,false);
 assert.equal(v.actualStepPhysicsCertified,false);
});
test('source-level route edges never assert arbitrary invented inter-floor or unsourced cross-hall ties',()=>{
 const d=buildLegibleCivic(),v=d.civic;
 assert.equal(v.edges.filter(x=>x.a.split(':')[0]===x.b.split(':')[0]).length,18);
 assert.equal(v.edges.filter(x=>x.a.split(':')[0]!==x.b.split(':')[0]).length,12);
 assert.equal(v.edges.filter(x=>x.a.endsWith(':74')||x.b.endsWith(':74')).length,6);
 assert(!v.edges.some(x=>
  x.a.split(':')[0]!==x.b.split(':')[0]&&(x.a.endsWith(':74')||x.b.endsWith(':74'))));
 assert.equal(d.report.protectedNineVerticalFlights,9);
 assert.equal(d.report.protectedThreeRoofGates,3);
 assert.equal(d.report.protectedEightBridges,8);
 const old=new Set(buildCrownObservatory().compiled.primitives.map(x=>x.slice(0,3).join(',')));
 const now=new Set(d.compiled.primitives.map(x=>x.slice(0,3).join(',')));
 for(const key of old)assert(now.has(key),'B187 must preserve every B186 physical source cell: '+key);
});
test('construction remains blocked and fake Minecraft walking certification rejects edits',()=>{
 const d=createLegibleCivicModule();d.elements[0].material='minecraft:command_block';
 assert.throws(()=>validateDesign(d),/B143_MATERIAL/);
 d.elements[0].material='concrete';d.bounds.height=97;
 assert.throws(()=>validateDesign(d),/B143_BOUNDS/);
 const r=buildLegibleCivic().report;
 for(const fn of [
  x=>x.worldWrites=1,x=>x.worldContacts=1,x=>x.worldCoordinates=[1,2,3],
  x=>x.constructionApproved=true,x=>x.readiness='PREPARED',
  x=>x.gates[0]='PASS',x=>x.BuildPlan.operations.push({cmd:'fill'}),
  x=>x.physicalWalkingCertified=true,
  x=>x.minecraftJumpPhysicsCertified=true]){
  const bad=structuredClone(r);fn(bad);
  assert.equal(verifyLegibleCivicReport(bad),false);
 }
});
test('offline viewer exports all 15 strict B143 modules, safe geometry and executable inline script',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'b187-'));
 try{
  const m=buildB187Preview({dir}),p=buildLegibleCivic();
  assert.equal(m.real3dCells,p.report.totalSourceCells);
  assert.equal(m.moduleCount,15);
  assert.equal(m.additionalReal3dCells,p.report.additionalReal3dCells);
  assert.equal(m.newConceptModelTotalOutsideHistoric36,37);
  assert.equal(m.worldWrites,0);assert.equal(m.constructionApproved,false);
  assert.equal(m.readiness,'NOT_PREPARED');
  assert.deepEqual(m.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(m.BuildPlan.operations,[]);
  const d=JSON.parse(fs.readFileSync(path.join(dir,'B187_DESIGN_MODULES.json')));
  assert.equal(d.modules.length,15);
  assert.deepEqual(d.modules.slice(0,14).map(x=>x.elements.length),
   [151,74,55,77,94,69,70,109,127,133,97,107,101,91]);
  assert(d.modules[14].elements.length>=90);
  const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
  for(const mode of ['overview','low','upper','ring'])
   assert(html.includes('id="b187-'+mode+'"'));
  assert(html.includes(p.report.totalAuthoredElements+'個'));
  assert(!html.includes('fetch(')&&!html.includes('new WebSocket('));
  const js=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert(js);assert.doesNotThrow(()=>new vm.Script(js));
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
