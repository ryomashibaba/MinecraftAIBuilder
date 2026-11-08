/** R27 synthetic tests. NO model, HTTP, or Minecraft connections. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {analyzeR27SavedOriginal,writeR27SavedOriginal}
 from './b198zr27-space-connectivity-offline.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
function fixture(){
 return {
  design:{
   schema:'minecraftaibuilder-b143-building-dsl-v1',
   id:'r27-fake-hall',title:'R27 QA fixture',brief:'No Qwen used',
   bounds:{width:16,height:10,depth:16},designOnly:true,
   elements:[
    {id:'base-shell',shape:'box',mode:'add',material:'concrete',
     origin:[0,0,0],size:[16,7,16]},
    {id:'hollow-core',shape:'box',mode:'cut',
     origin:[1,1,1],size:[14,6,14]},
    {id:'reading-shelf',shape:'box',mode:'add',material:'wood',
     origin:[3,1,3],size:[3,3,3]},
    {id:'doorway',shape:'box',mode:'cut',material:'glass',
     origin:[0,1,7],size:[1,3,2]}
   ]
  },
  spatialPlan:{
   designIntent:'QA-only reading hall with real internal voids',
   massStrategy:'Solid shell carved by a cut to form a room',
   circulationStrategy:'An entrance and a reachable open zone',
   entrance:[0,0,7],headroom:2,protectedVoids:[],
   destinations:[{id:'open-space',point:[8,1,8],maximumPathSteps:50}],
   functionalZones:[
    {id:'full-bookshelf',origin:[3,1,3],size:[3,3,3],
     minimumReachablePositions:1,minimumReachablePercent:50},
    {id:'open-reading',origin:[8,1,8],size:[3,2,3],
     minimumReachablePositions:6,minimumReachablePercent:30}
   ]
  },
  explanation:'Synthetic data only',
  assumptions:[]
 };
}
test('R27 sees impossible 100%-occupied shelf zone and nonstandable y=0 entrance',()=>{
 const raw=JSON.stringify(fixture());
 const r=analyzeR27SavedOriginal(raw,{expectedSha256:sha(raw)});
 assert.equal(r.sourceElementCount,4);
 assert.equal(r.invalidCutMaterialCount,1);
 assert.equal(r.originalB143Review,'B143_MATERIAL');
 assert.equal(r.analysisStatus,'OFFLINE_DIAGNOSTICS_COMPLETE_ORIGINAL_STILL_UNAPPROVED');
 const d=r.spatialDiagnostics;
 assert.equal(d.entrance.isStandable,false);
 assert.equal(d.entrance.boundaryAtYZero,true);
 assert.equal(d.zones[0].occupiedCells,27);
 assert.equal(d.zones[0].regionVolume,27);
 assert.equal(d.zones[0].standablePositions,0);
 assert.equal(d.zones[0].impossibleToMeetReachabilityThreshold,true);
 assert(d.zones[1].standablePositions>0);
 assert(d.nearestStandableCandidates.length>0);
 assert(d.connectedComponentCount>=1);
 assert.equal(d.destinations[0].standable,true);
 assert.equal(d.destinations[0].reachableFromDeclaredEntrance,null);
 assert.equal(d.namedShellBoxAdvisories[0].actuallySolidPrimitive,true);
 assert.equal(d.boxCuts.find(c=>c.id==='doorway').entranceDeclaredPointInsideCut,false);
 assert.equal(r.modelRequests,0);
 assert.equal(r.worldWrites,0);
 assert.equal(r.safety.readiness,'NOT_PREPARED');
 assert.equal(r.safety.gates.length,9);
});
test('R27 does not auto-approve even if original CUT is legal',()=>{
 const x=fixture();delete x.design.elements[3].material;
 x.spatialPlan.entrance=[1,1,7];
 const raw=JSON.stringify(x),r=analyzeR27SavedOriginal(raw,{expectedSha256:sha(raw)});
 assert.equal(r.invalidCutMaterialCount,0);
 assert.equal(r.analysisStatus,'OFFLINE_DIAGNOSTICS_COMPLETE_ORIGINAL_STILL_UNAPPROVED');
 assert.equal(r.spatialDiagnostics.entrance.isStandable,true);
 assert.equal(r.spatialDiagnostics.destinations[0].reachableFromDeclaredEntrance,true);
 assert.equal(r.diagnosticDoesNotApproveRepairOrConstruction,true);
});
test('R27 never guesses missing ADD material',()=>{
 const x=fixture();delete x.design.elements[2].material;
 const raw=JSON.stringify(x),r=analyzeR27SavedOriginal(raw,{expectedSha256:sha(raw)});
 assert.equal(r.invalidAddMaterialCount,1);
 assert.equal(r.analysisStatus,'HOLD_SOURCE_UNPARSEABLE_OR_NOT_ELIGIBLE');
 assert.equal(r.spatialDiagnostics,null);
});
test('R27 rejects wrong hash and never writes to original or existing report',()=>{
 const x=JSON.stringify(fixture());
 assert.throws(()=>analyzeR27SavedOriginal(x,{expectedSha256:'f'.repeat(64)}),
  /B198ZR27_SOURCE_SHA_MISMATCH/);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r27-fake-'));
 try{
  const source=path.join(dir,'original.txt'),out=path.join(dir,'R27.json');
  fs.writeFileSync(source,x);
  const r=writeR27SavedOriginal({rawPath:source,expectedSha256:sha(x),outPath:out});
  assert.equal(r.rawSha256,sha(x));
  assert.equal(fs.readFileSync(source,'utf8'),x);
  assert.equal(JSON.parse(fs.readFileSync(out,'utf8')).modelRequests,0);
  assert.throws(()=>writeR27SavedOriginal({rawPath:source,
   expectedSha256:sha(x),outPath:source}),/B198ZR27_NO_SOURCE_OVERWRITE/);
  assert.throws(()=>writeR27SavedOriginal({rawPath:source,
   expectedSha256:sha(x),outPath:out}),/B198ZR27_OUTPUT_EXISTS/);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
