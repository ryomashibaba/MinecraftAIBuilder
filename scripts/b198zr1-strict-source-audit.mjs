/** B198Z-R1: independent STRICT B143 geometry and abstract connectivity audit.
 * The source is ASSISTANT-AUTHORED; this is not model or Minecraft evidence.
 * No side effects outside reading the local JSON and printing a summary.
 */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {compileDesign, verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
const d=JSON.parse(fs.readFileSync(new URL('../evidence/b198zr1/assistant-revised-library.json',import.meta.url),'utf8'));
const scene=compileDesign(d);
assert.equal(verifyCompiled(d,scene),true,'B143 independent deterministic verification');
assert.equal(scene.sourceSha256,'177b6ae1f90e6cfece4bb54398b677d651cf31048c6d50b765c5c3544ac98303');
assert.equal(scene.geometrySha256,'a47cbfbea8200600922a136dc4f605a77bd82433f13edba629f25b0775c5f8aa');
assert.equal(scene.stats.voxels,14472);
assert.equal(d.elements.length,139);
assert.equal(scene.BuildPlan.operations.length,0);
assert.equal(scene.readiness,'NOT_PREPARED');
assert.equal(scene.worldContacts,0);
assert.equal(scene.worldCoordinates,null);
// Independent final cell check: not an element-label check and not a 3D preview approximation.
const [W,H,Z]=[48,40,48],grid=new Uint8Array(W*H*Z);
const key=(x,y,z)=>(y*Z+z)*W+x;
for(const [x,y,z,m] of scene.primitives)grid[key(x,y,z)]=m+1;
let air=0;
for(let y=2;y<38;y++)for(let z=19;z<=29;z++)for(let x=19;x<=29;x++)if(!grid[key(x,y,z)])air++;
assert.equal(air,11*11*36,'atrium must remain air all the way to its roof');
const stand=(x,y,z)=>x>=0&&x<W&&z>=0&&z<Z&&y>0&&y+1<H&&
 !grid[key(x,y,z)]&&!grid[key(x,y+1,z)]&&!!grid[key(x,y-1,z)];
const start=[24,2,45],queue=[start],seen=new Set([start.join(',')]);let head=0;
assert.ok(stand(...start),'entrance');
while(head<queue.length){
 const [x,y,z]=queue[head++];
 for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]])for(const dy of [0,1,-1]){
  const [nx,ny,nz]=[x+dx,y+dy,z+dz];const id=[nx,ny,nz].join(',');
  if(seen.has(id)||!stand(nx,ny,nz))continue;
  if(dy===1&&grid[key(x,y+2,z)])continue;
  seen.add(id);queue.push([nx,ny,nz]);
 }
}
let targets=0;
for(const y of [2,10,18,26,34]){
 for(const [x,z] of [[16,13],[30,31],[24,32],[36,23]]){
  assert.equal(seen.has([x,y,z].join(',')),true,'unreachable '+[x,y,z].join(','));
  targets++;
 }
}
const stairs=d.elements.filter(x=>x.id.startsWith('stair-')&&x.mode==='add');
assert.equal(stairs.length,36,'32 risers + 4 turn landings');
const shelves=d.elements.filter(x=>x.id.startsWith('bookbay-'));
assert.equal(shelves.length,72,'24 visibly framed shelves / three geometry pieces each');
console.log('B198ZR1_STRICT_B143_AND_ABSTRACT_CONNECTIVITY_PASS',JSON.stringify({
 proven:'SOURCE_ONLY',sourceSha256:scene.sourceSha256,geometrySha256:scene.geometrySha256,
 voxels:scene.stats.voxels,elements:d.elements.length,atriumAir:air,
 reachableAbstractStandCells:seen.size,reachableTargets:targets,
 qualityHumanReview:'UNREVIEWED',MinecraftWalking:'NOT_TESTED',
 modelCalls:0,worldContacts:0,worldWrites:0,constructionApproved:false,
 readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}
}));
