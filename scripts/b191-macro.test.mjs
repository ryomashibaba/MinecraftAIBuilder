import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import vm from 'node:vm';
import {MAX_CELLS} from '../source/ai/b143-building-dsl.mjs';
import {buildB190} from '../source/ai/b190-source-gateway.mjs';
import {buildB191,compareOneLevel,verifyB191Report} from '../source/ai/b191-route-compare.mjs';
import {buildB191Preview} from './b191-build-preview.mjs';
test('two real immutable original B143 models, 2 source-complete paths Y69/Y65 with honest geometry',()=>{
 const s=buildB191(),r=s.report;
 assert.equal(r.mainCells,142773);
 assert.equal(r.annexCells,19152);
 assert.equal(r.sourceModelCount,2);
 assert.equal(r.originalB143Modules,17);
 assert.equal(r.sourcePerModelCap,MAX_CELLS);
 assert.equal(r.crossModelMonolithAssembled,false);
 assert.deepEqual(r.originalB190ProvenLevels,[69,65]);
 assert.deepEqual(r.sourceComparedLevels,[69,65]);
 assert.deepEqual(r.reviewRejectedLevels,[73,61]);
 assert.equal(s.candidates.length,2);
 assert(s.candidates.every(c=>c.levelStatus==='SOURCE_ONLY_PASS'&&c.strictFootprints>=29));
 assert(verifyB191Report(r));
});
test('replay every coordinate and floor support, precise new-floor non-overwriting, 2-block head clearance',()=>{
 const s=buildB191(),main=s.parent.compiled,annex=s.annex.compiled;
 const fixed=new Set(main.primitives.map(p=>p.slice(0,3).join(',')));
 for(const p of annex.primitives)fixed.add([p[0]+132,p[1],p[2]].join(','));
 for(const c of s.candidates){
  assert.equal(c.path.length,c.strictFootprints);
  assert.equal(c.path.length-1,c.metrics.sourceSteps);
  assert.equal(c.bodyHeadroomCheckPassed,true);
  assert.equal(c.path[0][0],108);assert.equal(c.path[0][1],29);
  assert.equal(c.path.at(-1)[0],136);assert.equal(c.path.at(-1)[1],31);
  assert.match(c.sourcePathSha256,/^[a-f0-9]{64}$/);
  assert.match(c.sourceFootSlabSha256,/^[a-f0-9]{64}$/);
  assert(c.metrics.turns>=0&&c.metrics.turns<c.path.length);
  assert(c.newFloorCells>0&&c.newFloorCells<=480);
  for(let i=1;i<c.path.length;i++){
   const [x,z]=c.path[i],[px,pz]=c.path[i-1];
   assert.equal(Math.abs(x-px)+Math.abs(z-pz),1);
  }
  for(const [x,z] of c.path)for(let dx=0;dx<2;dx++)for(let dz=0;dz<2;dz++){
   assert(!fixed.has([x+dx,c.standingY,z+dz].join(',')));
   assert(!fixed.has([x+dx,c.standingY+1,z+dz].join(',')));
  }
  assert.equal(c.modelCollisionCells,0);
  assert.equal(c.originalModelsModified,false);
  assert.equal(c.actualMinecraftPlayerPathCertified,false);
 }
});
test('preferred level is computed from route effort, turns and unique additional floor source cells',()=>{
 const s=buildB191(),[a,b]=s.candidates;
 const sorted=[a,b].sort((x,y)=>x.metrics.sourceScore-y.metrics.sourceScore||
  x.metrics.newFootCells-y.metrics.newFootCells||x.standingY-y.standingY);
 assert.equal(s.chosen.standingY,sorted[0].standingY);
 assert.equal(s.other.standingY,sorted[1].standingY);
 assert(s.report.preferredSourceScore<=s.report.alternateSourceScore);
 assert.equal(s.report.primaryNewFloorCells,s.chosen.newFloorCells);
 assert.equal(s.report.otherNewFloorCells,s.other.newFloorCells);
 assert.equal(s.report.primaryTurns,s.chosen.metrics.turns);
});
test('deny fabricated physical walking, construction permission, coordinates, overlay model or arbitrary levels',()=>{
 const s=buildB191(),r=s.report;
 for(const fn of [
  x=>x.worldWrites=1,x=>x.worldContacts=1,x=>x.worldCoordinates=[2,3,4],
  x=>x.constructionApproved=true,x=>x.readiness='PREPARED',
  x=>x.gates[0]='PASS',x=>x.BuildPlan.operations.push({cmd:'fill'}),
  x=>x.realWorldPlacementApproved=true,x=>x.actualMinecraftWalkingCertified=true,
  x=>x.crossModelMonolithAssembled=true,x=>x.originalBuildingsUnchanged=false]){
  const fake=structuredClone(r);fn(fake);
  assert.equal(verifyB191Report(fake),false);
 }
 assert.throws(()=>compareOneLevel(s.parent.compiled,s.annex.compiled,73),/B191_/);
 assert.throws(()=>compareOneLevel(s.parent.compiled,s.annex.compiled,69,
  {sourceLocalDeltaX:132,sourceLocalDeltaY:0,sourceLocalDeltaZ:0,
   placementSpace:'MINECRAFT_WORLD',worldPlacementAuthorized:true}),/B191_/);
});
test('5-scene offline viewer provides two interactive actual source-topology maps and keeps all 17 modules',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'b191-'));
 try{
  const v=buildB191Preview({dir}),s=buildB191();
  assert.equal(v.real3dCells,142773);
  assert.equal(v.annexReal3dCells,19152);
  assert.equal(v.moduleCount,17);
  assert.equal(v.viewerSceneCount,5);
  assert.equal(v.numberOfActualNew3dScenes,2);
  assert.equal(v.worldWrites,0);
  assert.equal(v.constructionApproved,false);
  assert.equal(v.readiness,'NOT_PREPARED');
  assert.deepEqual(v.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(v.BuildPlan.operations,[]);
  assert.deepEqual(v.comparedStandingY,[69,65]);
  assert.equal(v.preferredStandingY,s.chosen.standingY);
  assert.equal(v.comparedRouteDataSha256,s.report.routeDataSha256);
  const d=JSON.parse(fs.readFileSync(path.join(dir,'B191_DESIGN_MODULES.json')));
  assert.equal(d.modules.length,17);assert.equal(d.modules.at(-1).id,'horizon-dock-annex');
  const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
  for(const token of ['id="b191-route-69"','id="b191-route-65"',
    'id="b191-level-69"','id="b191-level-65"','id="b191-gateway-proof"',
    'OFFLINE_REVIEW_COORDINATES','HORIZON DOCK','role="img"']){
   assert(html.includes(token),'missing source visual evidence: '+token);
  }
  assert(!html.includes('fetch(')&&!html.includes('new WebSocket('));
  const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert(script);assert.doesNotThrow(()=>new vm.Script(script));
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
