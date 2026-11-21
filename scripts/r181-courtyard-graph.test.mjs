import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {R178_SYNTHETIC_CASES} from './r178-wing-comparison.mjs';
import {makeR181SyntheticReply,R181_SYNTHETIC_SETTINGS,
 buildR181CampusComparisons,saveR181CampusComparisons}
 from './r181-courtyard-graph-comparison.mjs';
import {parseR181CourtyardGraphReply}
 from '../source/ai/r181-courtyard-graph.mjs';
import {verifyCompiled,compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {auditR125SourceRoutes} from '../source/ai/r125-source-routes.mjs';
const raw=x=>JSON.stringify(x);
const request={naturalLanguageBrief:'Static synthetic test program'};
const candidate=()=>makeR181SyntheticReply(R178_SYNTHETIC_CASES[0],R181_SYNTHETIC_SETTINGS[0]);
const parse=x=>parseR181CourtyardGraphReply(raw(x),request);
test('R181 independently verifies all three distinct physical compositions, rooms, equipment, outdoor route and 9 gates',()=>{
 const r=buildR181CampusComparisons();
 assert.equal(r.syntheticCount,3);
 assert.equal(r.genuineModelCalls,0);
 assert.equal(r.worldWrites,0);
 for(const c of r.cases){
  const p=c.result;
  assert.ok(verifyCompiled(p.design,p.compiled));
  assert.equal(p.r181GraphEvidence.volumesInPhysicalB143,3);
  assert.equal(p.r181GraphEvidence.modelDeclaredMassCoreVerified,true);
  assert.equal(p.r181GraphEvidence.coveredLinks,2);
  assert.equal(p.r181GraphEvidence.modelRequestedIndoorDirectDoors,1);
  assert.equal(p.r181GraphEvidence.outdoorCourtReachableFromEntrance,true);
  assert.equal(p.r181GraphEvidence.courtOpenToSky,true);
  assert.equal(p.program[0].zones.length,4);
  assert.equal(p.placements.length,4);
  assert.ok(p.sourceRouteAudit.zones.every(z=>z.reachedFromEntrance));
  assert.ok(p.sourceRouteAudit.featureAccess.every(z=>z.reachableFromEntrance));
  assert.ok(p.design.elements.length<=160);
  assert.equal(p.readiness,'NOT_PREPARED');
  assert.deepEqual(p.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(p.BuildPlan.operations,[]);
  assert.equal(p.executionAllowed,false);
  assert.equal(p.constructionApproved,false);
  assert.equal(p.worldWrites,0);
  assert.equal(p.worldContacts,0);
 }
});
test('R181 source cannot fake model intent by silently moving masses, inferring direct room links or invalid extents',()=>{
 const base=candidate(),good=parse(base);
 assert.equal(good.originalRawSha256,
  createHash('sha256').update(raw(base)).digest('hex'));
 assert.equal(good.designOnlySource.r181GraphEvidence.sourceModelAuthenticity,
  'CALLER_PROVIDED_UNVERIFIED');
 const cases=[
  x=>{x.architecture.volumes[1].rect.x=12;},
  x=>{x.architecture.volumes[2].rect.z=13;},
  x=>{x.architecture.links.pop();},
  x=>{x.architecture.links[1].to='north';},
  x=>{x.architecture.links[0].z=17;},
  x=>{x.architecture.volumes[1].roomIds=['living'];},
  x=>{x.relations.directAdjacencies=[['living','kitchen']];},
  x=>{x.architecture.worldCoordinates=[0,0,0];},
  x=>{x.architecture.volumes[0].rect.depth=27;}
 ];
 for(const mutate of cases){
  const invalid=structuredClone(base);mutate(invalid);
  assert.throws(()=>parse(invalid),/R181_COURTYARD_GRAPH_/);
 }
});
test('R181 genuine enclosed satellite room walls require model-declared gallery doors',()=>{
 const p=parse(candidate()).designOnlySource;
 const design=structuredClone(p.design);
 const doorIds=new Set(['gallery-north-pavilion-door','gallery-south-pavilion-door']);
 assert.ok([...doorIds].every(id=>design.elements.some(e=>e.id===id&&e.mode==='cut')));
 design.elements=design.elements.filter(e=>!doorIds.has(e.id));
 const compiled=compileDesign(design);
 assert.ok(verifyCompiled(design,compiled));
 const audit=auditR125SourceRoutes({
  ...p,schema:'minecraftaibuilder-r125-plan-to-b143-result-v1',
  design,compiled,sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256
 });
 assert.equal(audit.status,'HOLD_SOURCE_ROUTES');
 for(const id of [candidate().architecture.volumes[1].roomIds[0],
  candidate().architecture.volumes[2].roomIds[0]]){
  assert.equal(audit.zones.find(z=>z.id===id).reachedFromEntrance,false);
  assert.ok(audit.issues.includes('UNREACHABLE_ZONE_'+id));
 }
});
test('R181 writes a rotatable true B143 source viewer and all 15 real directional projections',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r181-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const output=path.join(dir,'review');
 const result=saveR181CampusComparisons(output);
 assert.equal(result.syntheticCount,3);
 assert.ok(fs.readFileSync(path.join(output,'index.html'),'utf8')
  .includes('完全合成'));
 for(const id of ['home','shop','laboratory']){
  assert.ok(fs.existsSync(path.join(output,id+'.html')));
  for(const direction of ['front','rear','east','west','roof'])
   assert.ok(fs.readFileSync(path.join(output,id+'-'+direction+'.svg'),'utf8')
    .startsWith('<svg'));
 }
 assert.throws(()=>saveR181CampusComparisons(output),
  /R181_GRAPH_PILOT_OUTPUT_MUST_BE_NEW/);
});
