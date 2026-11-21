import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {R178_SYNTHETIC_CASES} from './r178-wing-comparison.mjs';
import {makeR183SyntheticReply,buildR183MatchedComparison,
 saveR183MatchedComparison} from './r183-courtyard-void-comparison.mjs';
import {parseR183CourtyardVoidReply}
 from '../source/ai/r183-courtyard-negative-mass.mjs';
import {verifyCompiled,compileDesign}
 from '../source/ai/b143-building-dsl.mjs';
import {auditR125SourceRoutes}
 from '../source/ai/r125-source-routes.mjs';
const request={naturalLanguageBrief:'STATIC SYNTHETIC R183 PROOF'};
const sample=()=>makeR183SyntheticReply(R178_SYNTHETIC_CASES[0],0);
const parse=x=>parseR183CourtyardVoidReply(JSON.stringify(x),request);

test('R183 subtracts three model-declared actual rooftop masses, encloses interiors, and proves three outdoor terraces plus all four enclosed rooms',()=>{
 const data=buildR183MatchedComparison();
 assert.equal(data.syntheticCases,3);
 assert.equal(data.realModelCalls,0);
 for(const c of data.cases){
  const p=c.after,e=p.r183VoidEvidence;
  assert.ok(verifyCompiled(p.design,p.compiled));
  assert.notEqual(c.before.geometrySha256,p.geometrySha256);
  assert.equal(e.requestedOutdoorPocketCount,3);
  assert.equal(e.usableOutdoorTerracesSourceReached,3);
  assert.equal(e.actualRoofVoidsAndReclosedWallsVerified,true);
  assert.equal(e.indoorWitness.length,4);
  assert.ok(e.indoorWitness.every(i=>i.pad));
  assert.equal(e.outdoorRouteWitnesses.length,4);
  assert.ok(e.outdoorRouteWitnesses.every(x=>x));
  assert.equal(p.sourceRouteAudit.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.ok(p.sourceRouteAudit.featureAccess.every(x=>x.reachableFromEntrance));
  assert.equal(p.placements.length,4);
  assert.ok(p.design.elements.length<=160);
  assert.equal(p.readiness,'NOT_PREPARED');
  assert.deepEqual(p.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(p.BuildPlan.operations,[]);
  assert.equal(p.worldWrites,0);
  assert.equal(p.worldContacts,0);
 }
});

test('R183 rejects moving caller furniture, unsupported graph, invalid pocket positions and unrequested dimensions rather than silently correcting',()=>{
 const valid=sample(),p=parse(valid);
 assert.equal(p.originalRawSha256,
  createHash('sha256').update(JSON.stringify(valid)).digest('hex'));
 assert.equal(p.modelAuthenticity,'CALLER_PROVIDED_UNVERIFIED');
 const mutants=[
  q=>{q.massingVoids.terraces.pop();},
  q=>{q.massingVoids.terraces[1].volumeId='anchor';},
  q=>{q.massingVoids.terraces[0].rect.x=4;},
  q=>{q.massingVoids.terraces[0].rect.z=14;},
  q=>{q.massingVoids.terraces[1].rect.z=7;},
  q=>{q.massingVoids.terraces[2].rect.width=9;},
  q=>{q.massingVoids.terraces[1].roomId='living';},
  q=>{q.massingVoids.terraces[1].accessZ=40;},
  q=>{q.massingVoids.terraces[0].rect.worldPos=[10,20,30];},
  q=>{q.architecture.schema='not-r181';}
 ];
 for(const edit of mutants){
  const q=structuredClone(valid);edit(q);
  assert.throws(()=>parse(q),/R183_COURTYARD_VOID_/);
 }
});

test('R183 laboratory matching comparison explicitly records a changed synthetic equipment corner',()=>{
 const input=makeR183SyntheticReply(R178_SYNTHETIC_CASES[2],2);
 const rawOriginal=R178_SYNTHETIC_CASES[2].objects.find(o=>o.id==='instrument');
 const rawNew=input.objects.find(o=>o.id==='instrument');
 assert.equal(rawOriginal.corner,'far-right');
 assert.equal(rawNew.corner,'near-right');
 assert.equal(input.massingVoids.terraces.length,3);
});
test('R183 deleting actual courtyard spur must fail source route verification, not just a metadata flag',()=>{
 const p=parse(sample()).designOnlySource;
 const cut=structuredClone(p.design);
 cut.elements=cut.elements.filter(e=>e.id!=='r183-north-two-wide-court-spur');
 const recomp=compileDesign(cut);
 assert.ok(verifyCompiled(cut,recomp));
 const north=p.r183VoidEvidence.terraceGeometry.find(t=>t.volumeId==='north');
 const z=north.accessZ;
 const physical={...p,schema:'minecraftaibuilder-r125-plan-to-b143-result-v1',
  design:cut,compiled:recomp,sourceSha256:recomp.sourceSha256,
  geometrySha256:recomp.geometrySha256,
  program:[{...p.program[0],zones:[...p.program[0].zones,
   {id:'r183-north-terrace-test',range:{
    x:[north.rect.x+1,north.rect.x+north.rect.width-1],
    z:[z,z+1]}}]}]};
 const audit=auditR125SourceRoutes(physical);
 assert.equal(audit.zones.find(z=>z.id==='r183-north-terrace-test')
  .reachedFromEntrance,false);
});

test('R183 source-only report writes six rotatable 3D models, thirty genuine voxel views, and independent QA without overwriting',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r183-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const out=path.join(dir,'report');
 const report=saveR183MatchedComparison(out);
 assert.equal(report.cases.length,3);
 assert.ok(fs.readFileSync(path.join(out,'index.html'),'utf8')
  .includes('STATIC SYNTHETIC'));
 for(const id of ['home','shop','laboratory'])
  for(const version of ['r181','r183']){
   assert.ok(fs.existsSync(path.join(out,id+'-'+version+'.html')));
   for(const view of ['front','rear','west','east','roof'])
    assert.ok(fs.readFileSync(path.join(out,id+'-'+version+'-'+view+'.svg'),'utf8')
     .startsWith('<svg'));
  }
 assert.throws(()=>saveR183MatchedComparison(out),
  /R183_COMPARE_OUTPUT_MUST_BE_NEW/);
});
