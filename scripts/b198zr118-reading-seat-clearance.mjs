/** R118: source R93 library canopy + connected reading-seat setback.
 * R117: after raised canopy, overhead first hit moves 4474 -> seat 4476.
 * Keep every original floor, entrance, and contiguous reading seat facet.
 */
import {createHash} from 'node:crypto';
import {buildR107CompactReadingStudy,auditR107AdjacentCorridor} from './b198zr107-compact-reading-table-recovery.mjs';
import {raiseR115LanternAndSupportedBookwall} from './b198zr115-integral-lantern-clerestory.mjs';
import {deriveR110SourceLane} from './b198zr110-source-contoured-right-room-approach.mjs';
import {identifyR111SourceOverhead} from './b198zr111-reversible-floor-finish-transition.mjs';
import {extractR104ActiveR91Throat} from './b198zr104-r91-active-throat-repair.mjs';
export const SCHEMA='minecraftaibuilder-b198zr118-seated-clerestory-v1';
export const SEAT='right_R93_CONTINUOUS_READING_SEAT_LEDGE_NOT_OCCUPANCY_CERTIFIED';
export const SETBACKS=[.35,.55,.70,.82];
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const R=x=>+x.toFixed(7),key=p=>p.map(R).join(',');
const fail=x=>{throw Error('B198ZR118_'+x)};
const verts=f=>[f.a,f.b,f.c];
const edges=f=>[[f.a,f.b],[f.b,f.c],[f.c,f.a]].map(([a,b])=>[key(a),key(b)].sort().join('|'));
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},modelCalls:0,worldContacts:0,worldReads:0,worldWrites:0});
export function insetR118ActualConnectedSeat(faces,index,fraction){
 if(!Array.isArray(faces)||faces[index]?.kind!==SEAT||!SETBACKS.includes(fraction))fail('AUTHENTIC_SEAT_REQUIRED');
 const byEdge=new Map(),component=new Set([index]),queue=[index];
 faces.forEach((f,i)=>{if(f.kind!==SEAT)return;
  for(const e of edges(f)){if(!byEdge.has(e))byEdge.set(e,[]);byEdge.get(e).push(i);}
 });
 while(queue.length)for(const e of edges(faces[queue.shift()]))for(const i of byEdge.get(e)||[]){
  if(!component.has(i)){component.add(i);queue.push(i);}
 }
 if(component.size<2||component.size>12||component.size%2)fail('SEAT_STRIP_TOPOLOGY_DRIFT');
 const groups=new Map(),changed=new Map(),sections=[];
 for(const i of component)for(const p of verts(faces[i])){
  const z=R(p[2]).toString();if(!groups.has(z))groups.set(z,new Map());
  groups.get(z).set(key(p),p);
 }
 if(groups.size<2||groups.size>8)fail('UNBOUNDED_SEATING_STATIONS');
 for(const station of groups.values()){
  const two=[...station.values()].sort((a,b)=>a[0]-b[0]);
  if(two.length!==2)fail('SOURCE_SEAT_FRONT_REAR_MISSING');
  const [front,rear]=two,oldDepth=rear[0]-front[0],depth=oldDepth*(1-fraction);
  if(oldDepth<.020||depth<.0085||depth<oldDepth*.17)fail('SEATING_SURFACE_TOO_THIN');
  const p=[R(front[0]+fraction*oldDepth),front[1],front[2]];
  changed.set(key(front),p);
  sections.push({oldFront:front,newFront:p,back:rear,preservedWidth:depth});
 }
 if(faces.some((f,i)=>!component.has(i)&&verts(f).some(p=>changed.has(key(p)))))
  fail('OTHER_REAL_ARCHITECTURE_SHARES_MOVED_SEAT_VERTEX');
 const updated=faces.map((f,i)=>!component.has(i)?f:({
  kind:f.kind,...Object.fromEntries(['a','b','c'].map(k=>[k,changed.get(key(f[k]))??f[k]]))
 }));
 const area=f=>{const u=f.b.map((v,i)=>v-f.a[i]),v=f.c.map((v,i)=>v-f.a[i]);
  return Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])/2;
 };
 if([...component].some(i=>area(updated[i])<1e-10)||hash(updated)===hash(faces))
  fail('DEGENERATE_REAL_SEAT');
 return {faces:updated,indices:[...component].sort((a,b)=>a-b),sections};
}
export function assessR118JoinedSeat(r107){
 if(!r107||r107.originalR98Faces?.length!==4692||
  hash(r107.faces)!==r107.report?.alternativeR107Sha256||
  hash(r107.originalR98Faces)!==r107.report?.originalR98Sha256)
  fail('IMMUTABLE_R107_AND_R98_SOURCE_REQUIRED');
 const base=r107.faces,oldHash=hash(base),r98=r107.originalR98Faces;
 const high=raiseR115LanternAndSupportedBookwall(base,4474,{rise:.16});
 const exposed=identifyR111SourceOverhead(deriveR110SourceLane(high.faces,r98,.035,{gap:.003}));
 if(!exposed.allCaptured||exposed.overheadCount!==7||exposed.sourceIndices.join(',')!=='4476')
  fail('R117_EXACT_SEAT_SOURCE_REQUIRED');
 const previous=auditR107AdjacentCorridor(base,extractR104ActiveR91Throat(r98));
 const records=[];let picked=null;
 for(const fraction of SETBACKS){
  try{
   const seat=insetR118ActualConnectedSeat(high.faces,4476,fraction);
   const newRoute=deriveR110SourceLane(seat.faces,r98,.035,{gap:.003});
   const adjacent=auditR107AdjacentCorridor(seat.faces,extractR104ActiveR91Throat(r98));
   const oldLanesGood=adjacent.allFiniteSourceLanesScreened&&previous.surrogateLanes.every((o,i)=>{
    const n=adjacent.surrogateLanes[i];return n.floor<=o.floor&&n.headroom<=o.headroom&&n.lateral<=o.lateral;
   });
   const h=newRoute.measured?.witnessCounts;
   const accepted=!!h&&newRoute.sourceCoverageComplete&&newRoute.measured.allDeclaredSourceSegmentsWithinProbeCoverage&&h.floor===0&&h.lateral===0&&h.overhead<7&&oldLanesGood;
   const record={fraction,actualSourceSeatTriangles:seat.indices,sourceFacetCount:seat.faces.length,
    minimumSeatWidth:Math.min(...seat.sections.map(x=>x.preservedWidth)),
    floor:h?.floor??null,overhead:h?.overhead??null,lateral:h?.lateral??null,
    originalFiveLanesNonregressing:oldLanesGood,accepted,
    firstHeadroomSourceIndices:h?identifyR111SourceOverhead(newRoute).sourceIndices:[]};
   records.push(record);
   if(accepted&&(!picked||h.overhead<picked.record.overhead||
     h.overhead===picked.record.overhead&&fraction<picked.record.fraction))
    picked={faces:seat.faces,record};
  }catch(e){
   if(!String(e.message).startsWith('B198ZR118_'))throw e;
   records.push({fraction,accepted:false,reason:e.message});
  }
 }
 if(records.length!==4||hash(base)!==oldHash)fail('COMPLETE_R118_EVIDENCE_REQUIRED');
 const mesh=picked?.faces??base;
 return {faces:mesh,report:{schema:SCHEMA,sourceR107Sha256:oldHash,
  candidateRecords:records,chosen:picked?.record??null,geometryChanged:!!picked,
  originalFloorAndReadingProgramPreserved:true,materialDeleted:false,
  status:picked?'SOURCE_MESH_CANDIDATE_REQUIRES_HUMAN_ART_REVIEW':'HOLD_NO_SOURCE_PROVED_SEAT_CLEARANCE',
  humanWalkingCertified:false,structuralSupportCertified:false,artReview:'NOT_REVIEWED',
  safety:safe()}};
}
export function buildR118JoinedSeat(nodes){return assessR118JoinedSeat(buildR107CompactReadingStudy(nodes));}
