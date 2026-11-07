/**
 * R123: Actual-source alternative R94 daylight rib spatial relocation.
 * The R120 7->0 sampled overhead result is not architectural acceptance:
 * R122 proved new strict piercings of upper terrace face 3477. Never edit
 * a historic source mesh, floor, entry, or R120 recorded candidate.
 * No Minecraft, model inference, external calls or user PC.
 */
import {createHash} from 'node:crypto';
import {buildR107CompactReadingStudy,auditR107AdjacentCorridor}
 from './b198zr107-compact-reading-table-recovery.mjs';
import {buildR121SourceArtPacket,SOURCE_SELECTED_SHA,SOURCE_DELTA,
 auditR121LocalSourceConnectivity}
 from './b198zr121-r120-source-art-packet.mjs';
import {deriveR110SourceLane} from './b198zr110-source-contoured-right-room-approach.mjs';
import {extractR104ActiveR91Throat} from './b198zr104-r91-active-throat-repair.mjs';
export const SCHEMA='minecraftaibuilder-b198zr123-r94-upper-terrace-piercing-trials-v1';
export const R123_RIB=4535,R123_EDGE=4536,R123_TERRACE=3477;
export const R123_TRIALS=Object.freeze([
 Object.freeze({id:'forward-relief-original-span',dx:0,dz:.010,dy:-.020}),
 Object.freeze({id:'forward-relief-moderate-span',dx:.020,dz:.010,dy:-.020}),
 Object.freeze({id:'forward-relief-narrow-span',dx:.035,dz:.010,dy:-.020}),
 Object.freeze({id:'high-near-wall-fin',dx:.050,dz:0,dy:0})
]);
const sha=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const R=n=>+n.toFixed(7);
const valid=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite);
const vertices=f=>[f.a,f.b,f.c];
const fail=s=>{throw Error('B198ZR123_'+s)};
const area=f=>{const u=f.b.map((v,i)=>v-f.a[i]),v=f.c.map((v,i)=>v-f.a[i]);return Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])/2};
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},modelCalls:0,worldContacts:0,worldReads:0,worldWrites:0});

/** Strict, non-coplanar interior-interior edge/triangle penetration only.
 * A shared point/edge, tangency, or coplanar overlap is NOT certified clear
 * by this predicate. Such cases need distinct follow-up checks.
 */
function segmentHitsInterior(p,q,t,eps=1e-9){
 const d=p.map((v,i)=>q[i]-v),u=t.b.map((v,i)=>v-t.a[i]),
  v=t.c.map((x,i)=>x-t.a[i]);
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const dot=(a,b)=>a.reduce((sum,x,i)=>sum+x*b[i],0),h=cross(d,v),det=dot(u,h);
 if(Math.abs(det)<eps)return false;
 const inv=1/det,s=p.map((x,i)=>x-t.a[i]),f=dot(s,h)*inv;
 if(f<=eps||f>=1-eps)return false;
 const k=cross(s,u),g=dot(d,k)*inv;
 if(g<=eps||f+g>=1-eps)return false;
 const step=dot(v,k)*inv;
 return step>eps&&step<1-eps;
}
export function strictlyPiercingTriangles(a,b){
 if(!a||!b||[...vertices(a),...vertices(b)].some(p=>!valid(p)))
  fail('TWO_FINITE_SOURCE_FACETS_REQUIRED');
 const av=vertices(a),bv=vertices(b);
 return av.some((p,i)=>segmentHitsInterior(p,av[(i+1)%3],b))||
  bv.some((p,i)=>segmentHitsInterior(p,bv[(i+1)%3],a));
}
/** Compare edited-to-unchanged source faces; not whole-building collision QA. */
export function sourceEditedExternalPiercings(faces,indices=SOURCE_DELTA){
 if(!Array.isArray(faces)||!Array.isArray(indices)||
  indices.some(i=>!Number.isInteger(i)||i<0||i>=faces.length)||
  new Set(indices).size!==indices.length||faces.some(f=>!f||vertices(f).some(p=>!valid(p))))
  fail('BOUNDED_ACTUAL_SOURCE_FACES_REQUIRED');
 const selected=new Set(indices),bounds=faces.map(f=>({
  lo:[0,1,2].map(k=>Math.min(...vertices(f).map(p=>p[k]))),
  hi:[0,1,2].map(k=>Math.max(...vertices(f).map(p=>p[k])))
 })),hits=[];
 for(const i of indices)for(let j=0;j<faces.length;j++){
  if(selected.has(j))continue;
  if(bounds[i].lo.some((min,k)=>min>bounds[j].hi[k]+1e-9||
    bounds[i].hi[k]<bounds[j].lo[k]-1e-9))continue;
  if(strictlyPiercingTriangles(faces[i],faces[j]))
   hits.push({edited:i,other:j,otherKind:faces[j].kind});
 }
 return hits.sort((a,b)=>a.edited-b.edited||a.other-b.other);
}
const pairs=h=>new Set(h.map(x=>x.edited+':'+x.other));
const newlyIntroduced=(historic,candidate)=>{
 const base=pairs(historic);return candidate.filter(x=>!base.has(x.edited+':'+x.other));
};
/** Edit the two connected R94 *tip* vertices only. Root and daylight
 * outer edge are untouched, all other real building triangles unchanged.
 */
export function bendR123RibTip(faces,spec){
 if(!Array.isArray(faces)||faces.length!==4716||
  !R123_TRIALS.some(s=>s.id===spec?.id&&s.dx===spec.dx&&s.dz===spec.dz&&s.dy===spec.dy)||
  faces[R123_RIB]?.kind!=='right_R94_SUSPENDED_LIGHT_RIB_NOT_HEADROOM_CERTIFIED'||
  faces[R123_EDGE]?.kind!=='right_R94_DAYLIGHT_EDGE_NOT_GUARD')
  fail('SIGNED_R120_LIGHT_RIB_AND_APPROVED_SPATIAL_OPTIONS_REQUIRED');
 const rib=faces[R123_RIB],edge=faces[R123_EDGE];
 if(JSON.stringify(rib.a)!==JSON.stringify(edge.a)||
  JSON.stringify(rib.c)!==JSON.stringify(edge.b))
  fail('ORIGINAL_R94_SHARED_TIP_TOPOLOGY_REQUIRED');
 const move=p=>[R(p[0]+spec.dx),R(p[1]+spec.dy),R(p[2]+spec.dz)];
 const changed=faces.slice();
 changed[R123_RIB]={kind:rib.kind,a:rib.a,b:move(rib.b),c:move(rib.c)};
 changed[R123_EDGE]={kind:edge.kind,a:edge.a,b:move(edge.b),c:edge.c};
 if(area(changed[R123_RIB])<1e-7||area(changed[R123_EDGE])<1e-7||
  JSON.stringify(changed[R123_RIB].c)!==JSON.stringify(changed[R123_EDGE].b)||
  JSON.stringify(changed[R123_RIB].a)!==JSON.stringify(rib.a)||
  JSON.stringify(changed[R123_EDGE].c)!==JSON.stringify(edge.c)||
  changed.some((f,i)=>i!==R123_RIB&&i!==R123_EDGE&&f!==faces[i]))
  fail('RIB_DEGENERACY_OR_NONLOCAL_EDIT');
 return changed;
}
export function studyR123RealRibTerrace(r107){
 if(!r107||r107.originalR98Faces?.length!==4692||
  sha(r107.faces)!==r107.report?.alternativeR107Sha256||
  sha(r107.originalR98Faces)!==r107.report?.originalR98Sha256)
  fail('IMMUTABLE_R107_AND_R98_SOURCE_REQUIRED');
 const packet=buildR121SourceArtPacket(r107),original=r107.faces;
 if(packet.evidence.r120SelectedSha256!==SOURCE_SELECTED_SHA||
  sha(packet.faces)!==SOURCE_SELECTED_SHA||
  packet.evidence.sourceTriangleCount!==4716)
  fail('SIGNED_R121_R120_ART_PACKET_REQUIRED');
 const historic=sourceEditedExternalPiercings(original),oldR120=sourceEditedExternalPiercings(packet.faces);
 const historicSet=pairs(historic),r120Novel=newlyIntroduced(historic,oldR120);
 const novelKeys=[...pairs(r120Novel)].sort();
 if(novelKeys.join(',')!=='4535:3477,4536:3477')
  fail('R122_REPRODUCED_TWO_NEW_TERRACE_PIERCINGS_REQUIRED');
 const oldFive=auditR107AdjacentCorridor(original,extractR104ActiveR91Throat(r107.originalR98Faces));
 if(!oldFive.allFiniteSourceLanesScreened)
  fail('SOURCE_BASELINE_FIVE_CORRIDORS_REQUIRED');
 const trialRows=[];let qualified=null;
 for(const spec of R123_TRIALS){
  const candidate=bendR123RibTip(packet.faces,spec);
  const shared=auditR121LocalSourceConnectivity(original,candidate,SOURCE_DELTA);
  const now=sourceEditedExternalPiercings(candidate);
  const newPairs=newlyIntroduced(historic,now);
  const ribAreaRatio=area(candidate[R123_RIB])/area(packet.faces[R123_RIB]);
  const edgeAreaRatio=area(candidate[R123_EDGE])/area(packet.faces[R123_EDGE]);
  const revised={id:spec.id,dx:spec.dx,dy:spec.dy,dz:spec.dz,
   modifiedFromR120SourceFaces:[R123_RIB,R123_EDGE],
   candidateSha256:sha(candidate),newStrictExternalPiercings:newPairs,
   retainedRibTriangleAreaFraction:R(ribAreaRatio),
   retainedEdgeTriangleAreaFraction:R(edgeAreaRatio),
   priorSeamsStillIntact:shared.noNewlyDisconnectedPreviouslySharedSourceFaces,
   verifiedNewExternalPiercingsZero:newPairs.length===0,
   floor:null,overhead:null,lateral:null,oldFiveSourceCorridorsNonregressing:null,
   acceptedAsLimitedGeometry:false,architecturalApproval:'HOLD'};
  if(!newPairs.length&&shared.noNewlyDisconnectedPreviouslySharedSourceFaces&&
    ribAreaRatio>=.5&&edgeAreaRatio>=.5){
    const lane=deriveR110SourceLane(candidate,r107.originalR98Faces,.035,{gap:.003});
    const five=auditR107AdjacentCorridor(candidate,extractR104ActiveR91Throat(r107.originalR98Faces));
    const counts=lane.measured?.witnessCounts;
    const nonregressing=five.allFiniteSourceLanesScreened&&
      oldFive.surrogateLanes.every((old,i)=>{
       const now=five.surrogateLanes[i];
       return now.floor<=old.floor&&now.headroom<=old.headroom&&now.lateral<=old.lateral;
      });
    revised.floor=counts?.floor??null;
    revised.overhead=counts?.overhead??null;
    revised.lateral=counts?.lateral??null;
    revised.oldFiveSourceCorridorsNonregressing=nonregressing;
    revised.sourceWidthAndStationsCovered=lane.sourceCoverageComplete;
    revised.acceptedAsLimitedGeometry=!!counts&&lane.sourceCoverageComplete&&
      lane.measured.allDeclaredSourceSegmentsWithinProbeCoverage&&
      counts.floor===0&&counts.overhead===0&&counts.lateral===0&&nonregressing;
  }else revised.rejection='PIERCING_SEAM_OR_RIB_AREA_NOT_PRESERVED';
  trialRows.push(revised);
  if(revised.acceptedAsLimitedGeometry&&
    (!qualified||revised.dx+Math.abs(revised.dz)+Math.abs(revised.dy)<
     qualified.record.dx+Math.abs(qualified.record.dz)+Math.abs(qualified.record.dy)))
   qualified={record:revised,faces:candidate};
 }
 if(sha(original)!==packet.evidence.sourceR107Sha256||
  trialRows.length!==R123_TRIALS.length)
  fail('HISTORIC_SOURCE_OR_TRIAL_COUNT_CHANGED');
 return {faces:original,possibleCandidate:qualified?.faces??null,
  report:{schema:SCHEMA,r121SourceSha256:packet.evidence.sourceR107Sha256,
   historicalR120Sha256:SOURCE_SELECTED_SHA,
   r122ReproducedBaselineStrictExternalPairs:historic,
   r120NewStrictExternalPiercings:r120Novel,
   trials:trialRows,proposedGeometryCandidate:qualified?.record??null,
   realSourceGeometryChanged:false,originalBuildingPreserved:true,
   seatWidthAlreadyReducedToApprox45PercentUnresolved:true,
   roomLightAndTerraceUtilityUncertified:true,
   status:qualified?'LOCAL_GEOMETRY_CANDIDATE_ARCHITECTURAL_HOLD':
     'HOLD_NO_NONREGRESSING_LOCAL_RIB_REDIRECTION',
   fullBuildingSelfIntersectionCertified:false,bodySweepCertified:false,
   humanReadingSeatCertified:false,independentHumanArt:'NOT_REVIEWED',
   originalModelGenerativeAbilityUnchanged:true,safety:safety()}};
}
export function buildR123RealRibTerrace(nodes){
 return studyR123RealRibTerrace(buildR107CompactReadingStudy(nodes));
}
