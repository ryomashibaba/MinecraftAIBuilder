/**
 * B147: exact reproducible diagnosis of disjoint local voxel components.
 *
 * The witness is a *geometric adjacency suggestion*, not a structural plan.
 * Does not certify real support, loads, Minecraft coordinates, headroom,
 * block compatibility, or construction approval.
 */
import {createHash} from 'node:crypto';
import {reviewVoxelTopology,verifyTopology} from './b146-topology-review.mjs';
const key=(x,y,z)=>x+','+y+','+z;
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const dirs=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
const ok=(v,msg)=>{if(!v)throw Error('B147_'+msg);};
export const SCHEMA='minecraftaibuilder-b147-detachment-diagnosis-v1';
const xyz=p=>[p[0],p[1],p[2]];
const boundOf=p=>({min:[p[0],p[1],p[2]],max:[p[0],p[1],p[2]]});
export function diagnoseDetached(scene,{searchRadius=8}={}){
 ok(Number.isInteger(searchRadius)&&searchRadius>=1&&searchRadius<=16,'BAD_SEARCH_RADIUS');
 const topo=reviewVoxelTopology(scene);
 ok(verifyTopology(scene,topo),'BAD_TOPOLOGY_SOURCE');
 const positions=scene.primitives.map(xyz),indices=new Map();
 for(let i=0;i<positions.length;i++){
  const p=positions[i],k=key(...p);
  ok(!indices.has(k),'DUPLICATE_CELL');indices.set(k,i);
 }
 const seen=new Uint8Array(positions.length),component=new Int32Array(positions.length);
 component.fill(-1);
 const groups=[];
 for(let i=0;i<positions.length;i++){
  if(seen[i])continue;
  const id=groups.length;
  const queue=[i],start=positions[i];seen[i]=1;
  const bounds=boundOf(start);let anchored=false;
  for(let head=0;head<queue.length;head++){
   const index=queue[head],p=positions[index];component[index]=id;
   anchored ||=p[1]===scene.bounds.minY;
   for(let d=0;d<3;d++){
    bounds.min[d]=Math.min(bounds.min[d],p[d]);
    bounds.max[d]=Math.max(bounds.max[d],p[d]);
   }
   for(const v of dirs){
    const other=indices.get(key(p[0]+v[0],p[1]+v[1],p[2]+v[2]));
    if(other!==undefined&&!seen[other]){seen[other]=1;queue.push(other);}
   }
  }
  groups.push({id,anchored,cells:queue.length,bounds,indices:queue});
 }
 const detached=groups.filter(g=>!g.anchored);
 ok(groups.length===topo.components&&detached.length===topo.detachedComponents&&
   detached.reduce((sum,g)=>sum+g.cells,0)===topo.detachedCells,'AUDIT_MISMATCH');
 const detachedPoints=detached.flatMap(g=>g.indices.map(i=>positions[i]));
 // Face-adjacency path: nearest witness is a shortest Manhattan gap,
 // but proves nothing about load-bearing, obstruction, etc.
 const samples=[];
 for(const group of detached){
  let witness=null;
  outer:
  for(let radius=1;radius<=searchRadius;radius++){
   for(const index of group.indices){
    const p=positions[index];
    for(let dx=-radius;dx<=radius;dx++){
     for(let dy=-radius;dy<=radius;dy++){
      const remaining=radius-Math.abs(dx)-Math.abs(dy);
      if(remaining<0)continue;
      for(const dz of remaining===0?[0]:[-remaining,remaining]){
       const i=indices.get(key(p[0]+dx,p[1]+dy,p[2]+dz));
       if(i===undefined||!groups[component[i]].anchored)continue;
       const target=positions[i],bridge=[];
       // Candidate is an axis-aligned shortest Manhattan chain.
       let cursor=[...p];
       for(let axis=0;axis<3;axis++){
        while(cursor[axis]!==target[axis]){
         cursor=[...cursor];cursor[axis]+=Math.sign(target[axis]-cursor[axis]);
         if(cursor.some((v,a)=>v!==target[a]))bridge.push(cursor);
        }
       }
       witness={from:p,to:target,manhattanDistance:radius,
        conceptualMissingCells:bridge,
        meaning:'CANDIDATE_GEOMETRIC_BRIDGE_ONLY'};
       break outer;
      }
     }
    }
   }
  }
  samples.push({componentId:group.id,cellCount:group.cells,
   bounds:group.bounds,sampleCell:positions[group.indices[0]],
   nearestBasalConnectedWitness:witness});
 }
 const report={
  schema:SCHEMA,designId:scene.id,sourceGeometrySha256:scene.geometrySha256,
  localMinY:scene.bounds.minY,connectedComponents:topo.components,
  detachedComponentCount:detached.length,
  detachedCellCount:detachedPoints.length,
  components:samples,detachedPoints,
  searchRadius,physicalStructuralProof:false,
  geometryRepairSuggestionOnly:true,
  constructionApproved:false,worldContacts:0,
  readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]}
 };
 return {...report,sha256:hash(report)};
}
export function verifyDiagnosis(scene,report){
 try{
  const expected=diagnoseDetached(scene,{searchRadius:report?.searchRadius});
  return JSON.stringify(expected)===JSON.stringify(report)&&
   report.physicalStructuralProof===false&&
   report.constructionApproved===false&&report.worldContacts===0&&
   report.BuildPlan.operations.length===0&&report.gates.every(g=>g==='BLOCKED');
 }catch{return false;}
}
