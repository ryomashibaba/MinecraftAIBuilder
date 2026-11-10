/**
 * Real archived-Qwen roof seam regression (original raw byte SHA protected).
 * Independently flood actual compiled B143 air, not the generator's proof flag.
 * B143 is SOURCE ONLY. Weatherproof Minecraft/ART remains not tested.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {makeR134FreshRequest} from './r134-fresh-model-pilot.mjs';
import {CASE} from './r141-local-graph-evidence.mjs';
import {parseR139RelationalFurnishedReply} from './r139-relational-model.mjs';
import {deriveR149EnvelopeExpression} from '../source/ai/r149-architectural-expression.mjs';
import {deriveR170FourRoomVolumes} from '../source/ai/r170-four-room-volumes.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
const raw=fs.readFileSync(path.join(
 path.dirname(fileURLToPath(import.meta.url)),
 'fixtures/r146-user-qwen14b-20261025-raw.json'),'utf8');
const originalSha='d67dc624744b4745e8e8c228e20bde00ccd39c7b506d0ad82753f54f1db82591';
const cell=p=>p.slice(0,3).join(',');
function independentFlood(source){
 const voxels=new Set(source.compiled.primitives.map(cell));
 const bounds=source.design.bounds;
 const directions=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
 const result=[];
 for(const section of source.r170FourRoomVolumeEvidence.roomSections){
  const [cx,cz]=section.clearanceWitness,seed=[cx,section.roofY-1,cz];
  const queue=[seed],visited=new Set([cell(seed)]);
  assert(!voxels.has(cell(seed)),'high air must be genuinely empty');
  let escape=null;
  for(let i=0;i<queue.length;i++){
   const [x,y,z]=queue[i];
   if(x<1||x>bounds.width-2||z<1||z>bounds.depth-2||
    y>=bounds.height-1){escape=[x,y,z];break;}
   for(const [dx,dy,dz] of directions){
    const p=[x+dx,y+dy,z+dz],k=cell(p);
    if(p[1]<6||p[1]>=bounds.height||p[0]<0||p[0]>=bounds.width||
     p[2]<0||p[2]>=bounds.depth||voxels.has(k)||visited.has(k))continue;
    visited.add(k);queue.push(p);
    assert(queue.length<100000,'independent flood budget');
   }
  }
  result.push({zoneId:section.zoneId,escaped:escape!==null,
   escape,visited:visited.size});
 }
 return result;
}
test('R146 model-selected room and 8 fixtures survive R175 real weather seam repair',()=>{
 assert.equal(createHash('sha256').update(raw).digest('hex'),originalSha);
 const parsed=parseR139RelationalFurnishedReply(raw,
  makeR134FreshRequest({brief:CASE.brief}),{allowRoofMaterialCorrection:true});
 assert.equal(parsed.boundedHostRepairRequired,true);
 const base=parsed.featured;
 const glazed=deriveR149EnvelopeExpression(base,{plan:parsed.derivedModelReply});
 const massed=deriveR170FourRoomVolumes(glazed,{studyStyle:'R175_SETBACK_TERRACES'});
 for(const output of [base,glazed,massed]){
  assert(verifyCompiled(output.design,output.compiled));
  assert.equal(output.sourceRouteAudit.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.equal(output.sourceRouteAudit.zones.length,4);
  assert.equal(output.sourceRouteAudit.featureAccess.length,8);
  assert(output.sourceRouteAudit.featureAccess.every(f=>f.reachableFromEntrance));
 }
 const preserve=p=>new Map(p.compiled.primitives.filter(v=>v[1]<=5&&
  v[0]>=2&&v[0]<=p.design.bounds.width-3&&
  v[2]>=2&&v[2]<=p.design.bounds.depth-3).map(v=>[cell(v),v[3]]));
 assert.deepEqual([...preserve(base)].sort(),[...preserve(massed)].sort());
 assert.equal(massed.worldWrites,0);
 assert.deepEqual(massed.gates,Array(9).fill('BLOCKED'));
 assert.equal(massed.BuildPlan.operations.length,0);
 assert.equal(massed.r170FourRoomVolumeEvidence.allFourSourceUpperAirComponentsClosed,true);
 const seam=massed.design.elements.find(x=>x.id==='r175-terrace-weather-riser');
 assert(seam,'real upper terrace step riser must exist');
 assert.deepEqual(seam.origin,[24,10,12]);
 assert.deepEqual(seam.size,[3,2,1]);
 const materialIndex=2; // B143 MATERIALS['metal']
 for(let x=24;x<=26;x++)for(let y=10;y<=11;y++){
  const cellFound=massed.compiled.primitives.find(p=>
   p[0]===x&&p[1]===y&&p[2]===12);
  assert(cellFound&&cellFound[3]===materialIndex,
   'actual source cell missing at stepped roof seam');
 }
 const flood=independentFlood(massed);
 assert.equal(flood.length,4);
 assert(flood.every(r=>r.escaped===false),
  'all four upper-air SOURCE components must be enclosed');
 assert.equal(massed.r170FourRoomVolumeEvidence.actualSixFaceUpperAirFloodAudit.length,4);
 console.log(JSON.stringify({R175_ARCHIVED_QWEN_UPPER_SHELL_REAL_SOURCE_PASS:true,
  newStepClosureCells:6,openUpperRooms:0,rooms:4,equipment:8,
  originalRawSha:originalSha,modelPOSTs:0,worldWrites:0}));
});
test('R170 generic sculpted remains closed without claiming human weather certification',()=>{
 const parsed=parseR139RelationalFurnishedReply(raw,
  makeR134FreshRequest({brief:CASE.brief}),{allowRoofMaterialCorrection:true});
 const glazed=deriveR149EnvelopeExpression(parsed.featured,{plan:parsed.derivedModelReply});
 const sculpted=deriveR170FourRoomVolumes(glazed,{studyStyle:'R173_SCULPTED_CLERESTORY'});
 const flood=independentFlood(sculpted);
 assert.equal(flood.length,4);
 assert(flood.every(r=>!r.escaped));
 assert.equal(sculpted.r170FourRoomVolumeEvidence.realMinecraftWeatherTightness,'NOT_TESTED');
 assert.equal(sculpted.r170FourRoomVolumeEvidence.allFourSourceUpperAirComponentsClosed,true);
});
