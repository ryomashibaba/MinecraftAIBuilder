/**
 * B146 topology audit for ChatGPT-designed conceptual local voxel models.
 * This is *connectivity evidence only*: adjacent voxels do NOT prove
 * load transfer, support, collision, egress, Minecraft block suitability,
 * or any building-code/physical structural certification.
 */
import {createHash} from 'node:crypto';

const SHA=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const K=(x,y,z)=>x+','+y+','+z;
const ensure=(v,m)=>{if(!v)throw Error('B146_'+m);};
export const TOPOLOGY_SCHEMA='minecraftaibuilder-b146-local-topology-v1';
const offsets=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];

export function reviewVoxelTopology(scene){
 ensure(scene?.designOnly===true&&scene?.readiness==='NOT_PREPARED'&&
  scene?.worldContacts===0&&scene?.BuildPlan?.operations?.length===0&&
  /^[a-f0-9]{64}$/.test(scene.geometrySha256||''),'UNTRUSTED_SOURCE');
 const voxels=scene.primitives;
 ensure(Array.isArray(voxels)&&voxels.length>0&&voxels.length<=160000,'VOXEL_COUNT');
 const look=new Map();
 const minY=scene.bounds?.minY;
 ensure(Number.isSafeInteger(minY),'LOCAL_BASE_NOT_FOUND');
 for(let i=0;i<voxels.length;i++){
  const p=voxels[i];
  ensure(Array.isArray(p)&&p.length===5&&p.every(Number.isSafeInteger),'INVALID_CELL');
  const k=K(p[0],p[1],p[2]);
  ensure(!look.has(k),'DUPLICATE_VOXEL');
  look.set(k,i);
 }
 const seen=new Uint8Array(voxels.length);
 let components=0,unanchoredComponents=0,unanchoredCells=0,largest=0,largestDetached=0,
  anchoredCells=0,exposedOverhangCandidates=0,anchorFootprintCells=0;
 const detachedSamples=[];
 for(const p of voxels){
  if(p[1]===minY)anchorFootprintCells++;
  else if(!look.has(K(p[0],p[1]-1,p[2])))exposedOverhangCandidates++;
 }
 for(let start=0;start<voxels.length;start++){
  if(seen[start])continue;
  components++;
  const queue=[start];
  seen[start]=1;
  let size=0,anchor=false;
  for(let head=0;head<queue.length;head++){
   const index=queue[head],p=voxels[index];
   size++;if(p[1]===minY)anchor=true;
   for(const [dx,dy,dz] of offsets){
    const next=look.get(K(p[0]+dx,p[1]+dy,p[2]+dz));
    if(next!==undefined&&!seen[next]){seen[next]=1;queue.push(next);}
   }
  }
  largest=Math.max(largest,size);
  if(anchor)anchoredCells+=size;
  else{
   unanchoredComponents++;unanchoredCells+=size;
   largestDetached=Math.max(largestDetached,size);
   if(detachedSamples.length<8)detachedSamples.push({
    localCell:voxels[start].slice(0,3),cells:size});
  }
 }
 ensure(anchoredCells+unanchoredCells===voxels.length&&
  components>0&&unanchoredComponents<=components,'TOPOLOGY_BOOKKEEPING');
 const result={
  schema:TOPOLOGY_SCHEMA,sourceGeometrySha256:scene.geometrySha256,
  metricMeaning:'FACE_ADJACENCY_TO_LOWEST_LOCAL_Y_ONLY_NOT_GROUND_SUPPORT',
  localMinY:minY,totalCells:voxels.length,
  components,anchoredComponents:components-unanchoredComponents,
  detachedComponents:unanchoredComponents,
  anchoredCells,detachedCells:unanchoredCells,
  largestComponentCells:largest,largestDetachedCells:largestDetached,
  anchorFootprintCells,exposedOverhangCandidates,
  detachedSamples,
  physicalLoadPathCertified:false,structuralStabilityCertified:false,
  collisionCertified:false,constructionApproved:false,worldWrites:0,
  readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),
  interpretation:'LOCAL_TOPOLOGY_ONLY_NO_STRUCTURAL_CERTIFICATION'
 };
 return {...result,auditSha256:SHA(result)};
}
export function verifyTopology(scene,report){
 try {
  const expected=reviewVoxelTopology(scene);
  return report?.auditSha256===expected.auditSha256&&
   report?.sourceGeometrySha256===scene.geometrySha256&&
   report?.constructionApproved===false&&report?.worldWrites===0&&
   report?.physicalLoadPathCertified===false&&
   report?.structuralStabilityCertified===false&&
   JSON.stringify(report)===JSON.stringify(expected);
 }catch{return false;}
}
