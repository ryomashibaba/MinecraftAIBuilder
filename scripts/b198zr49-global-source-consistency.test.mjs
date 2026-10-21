import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {r32Courtyard} from './b198zr32-synthetic-geometry-fixtures.mjs';
import {inspectR49GlobalConsistency}
 from '../source/ai/b198zr49-global-source-consistency.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const box=(id,mode,origin,size,material)=>({
 id,shape:'box',mode,origin,size,...(material?{material}:{})});
const scenario=()=>{
 const p=r32Courtyard();
 p.design.bounds={width:40,height:40,depth:40};
 p.design.elements=[
  box('base','add',[0,0,0],[40,1,40],'concrete'),
  box('core','add',[14,1,14],[12,38,12],'concrete'),
  box('atrium-cut','cut',[16,1,16],[8,38,8]),
  box('lounge-glow','add',[16,40,16],[8,1,8],'glow'),
  box('roof-glow','add',[0,40,0],[40,1,40],'glow'),
  {id:'left-stair',shape:'staircase',mode:'add',
   origin:[1,1,30],axis:'z',direction:-1,width:4,steps:32,
   treadDepth:1,material:'wood'},
  {id:'right-stair',shape:'staircase',mode:'add',
   origin:[35,1,30],axis:'z',direction:-1,width:4,steps:32,
   treadDepth:1,material:'wood'},
  box('atrium-glow','add',[16,38,16],[8,1,8],'glow')
 ];
 p.spatialPlan.entrance=[20,1,38];
 p.spatialPlan.headroom=3;
 p.spatialPlan.protectedVoids=[{
  id:'atrium',origin:[16,1,16],size:[8,38,8],maxOccupiedCells:0
 }];
 p.spatialPlan.destinations=[
  {id:'atrium',point:[20,1,20],maximumPathSteps:10},
  {id:'leftShelf',point:[7,1,20],maximumPathSteps:15},
  {id:'rightShelf',point:[33,1,20],maximumPathSteps:15},
  {id:'lounge',point:[20,40,20],maximumPathSteps:35}
 ];
 p.spatialPlan.functionalZones=[{
  id:'atrium',origin:[16,1,16],size:[8,38,8],
  minimumReachablePositions:100,minimumReachablePercent:80
 }];
 return p;
};
test('R49 reproduces R48 failure classes without storing or fixing the real R48 raw',()=>{
 const p=scenario(),before=structuredClone(p),raw=JSON.stringify(p);
 const r=inspectR49GlobalConsistency(raw);
 assert.equal(r.originalRawSha256,sha(raw));
 assert.equal(r.status,'HOLD_GLOBAL_COORDINATE_OR_PROGRAM_CONTRADICTIONS');
 assert.deepEqual(r.declaredDimensions,[40,40,40]);
 assert.equal(r.elementBoundsViolations.length,4);
 assert(r.elementBoundsViolations.some(x=>x.id==='roof-glow'&&
  x.outsideAxes.includes('height')));
 assert(r.elementBoundsViolations.some(x=>x.id==='left-stair'&&
  x.min[2]===-1&&x.outsideAxes.includes('depth')));
 assert.equal(r.declaredPointBoundsViolations.length,1);
 assert.equal(r.declaredPointBoundsViolations[0].id,'lounge');
 assert.equal(r.impossiblePathDeclarations.length,4);
 assert.deepEqual(r.impossiblePathDeclarations.map(x=>x.safeStepLowerBound),
  [18,31,31,39]);
 assert.deepEqual(r.impossiblePathDeclarations.map(x=>x.declaredMax),
  [10,15,15,35]);
 assert.deepEqual(r.duplicatedR3Ids[0],
  {id:'atrium',usedIn:['protectedVoids','destinations','functionalZones']});
 assert(r.possibleVoidRefillEvents.some(x=>x.protectedVoidId==='atrium'&&
  x.addId==='atrium-glow'&&x.bboxIntersectionCells===64));
 assert.equal(r.modelCalls,0);
 assert.equal(r.worldContacts,0);
 assert.equal(r.worldWrites,0);
 assert.equal(r.compilerPassCertified,false);
 assert.equal(r.finalVoxelAnalysisPerformed,false);
 assert.equal(r.modelQualityCertified,false);
 assert.equal(r.noAutoGeometryRepair,true);
 assert.equal(r.safety.readiness,'NOT_PREPARED');
 assert(r.safety.gates.every(x=>x==='BLOCKED'));
 assert.deepEqual(r.safety.BuildPlan.operations,[]);
 assert.deepEqual(p,before);
});
test('R49 proper authored synthetic courtyard is advisory not architectural PASS',()=>{
 const raw=JSON.stringify(r32Courtyard());
 const r=inspectR49GlobalConsistency(raw);
 assert.equal(r.status,'NO_OBVIOUS_CROSS_FIELD_CONTRADICTION_BUT_NOT_CERTIFIED');
 assert.equal(r.originalRawSha256,sha(raw));
 assert.equal(r.elementBoundsViolations.length,0);
 assert.equal(r.impossiblePathDeclarations.length,0);
 assert.equal(r.duplicatedR3Ids.length,0);
 assert.equal(r.modelQualityCertified,false);
});
test('R49 step lower bound allows simultaneous vertical and horizontal movement',()=>{
 const p=r32Courtyard();
 p.spatialPlan.entrance=[1,1,1];
 p.spatialPlan.destinations=[{id:'up',point:[5,4,1],maximumPathSteps:4}];
 let r=inspectR49GlobalConsistency(JSON.stringify(p));
 assert.equal(r.impossiblePathDeclarations.length,0);
 p.spatialPlan.destinations[0].maximumPathSteps=3;
 r=inspectR49GlobalConsistency(JSON.stringify(p));
 assert.equal(r.impossiblePathDeclarations.length,1);
 assert.equal(r.impossiblePathDeclarations[0].safeStepLowerBound,4);
});
test('R49 repeated final instance can exceed local bounds even if first fits',()=>{
 const p=r32Courtyard();
 p.design.elements.push({...box('repeated-fins','add',[4,1,4],[1,4,1],'metal'),
  repeat:{count:3,offset:[0,0,100]}});
 const r=inspectR49GlobalConsistency(JSON.stringify(p));
 assert(r.elementBoundsViolations.some(x=>x.id==='repeated-fins'));
});
test('R49 refuses truncated JSON and never guesses a replacement original',()=>{
 const raw='{"design":';
 const r=inspectR49GlobalConsistency(raw);
 assert.equal(r.status,'HOLD_MALFORMED_JSON');
 assert.equal(r.originalRawSha256,sha(raw));
 assert.equal(r.unmodifiedOriginal,true);
 assert.equal(r.modelCalls,0);
});
