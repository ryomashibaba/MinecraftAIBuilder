/**
 * R107: preserve real reading function by a compact alternate R87 table,
 * if R106 only safely removed the obstructing original. Every proposed
 * tabletop/leg is grounded in actual R87 source geometry and real floor
 * witness checks; no roof / circulation geometry is generated.
 */
import {createHash} from 'node:crypto';
import {buildR106ReadingTableReflowStudy,extractR106TableUnit,
 sourceSupported,meshIntersections} from './b198zr106-reading-table-doorway-reflow.mjs';
import {extractR104ActiveR91Throat}
 from './b198zr104-r91-active-throat-repair.mjs';
import {screenR99FiniteRoute} from './b198zr99-finite-volume-route-witness.mjs';

export const SCHEMA='minecraftaibuilder-b198zr107-compact-real-r87-reading-table-v1';
export const SCALES=Object.freeze([.60,.75,.90]);
export const OFFSETS=Object.freeze([
 [.035,0],[.065,0],[.095,0],[.125,0],
 [.065,-.045],[.095,-.045],[.125,-.045],
 [.065,.045],[.095,.045],[.125,.045],
 [.085,-.10],[.125,-.10],[.085,.10],[.125,.10]
]);
const fail=s=>{throw Error('B198ZR107_'+s)};
const sha=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const R=x=>+x.toFixed(7);
const tri=f=>[f.a,f.b,f.c];
const centroid=f=>[0,1,2].map(i=>tri(f).reduce((sum,v)=>sum+v[i],0)/3);
const area=f=>{const u=f.b.map((x,i)=>x-f.a[i]),v=f.c.map((x,i)=>x-f.a[i]);
 return Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],
  u[0]*v[1]-u[1]*v[0])*.5;};
const mid=(a,b)=>a.map((v,i)=>(v+b[i])/2);
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},modelCalls:0,worldContacts:0,worldReads:0,worldWrites:0});

/**
 * Reproject only x/z of a REAL historical 7-triangle R87 table unit.
 * Preserve height and whole-triangle 7-piece furniture topology.
 */
export function designR107CompactTable(unit,{scale,dx,dz}={}){
 if(!unit?.provenOriginalR87Table||!Array.isArray(unit.faces)||
  unit.faces.length!==7||!Number.isFinite(scale)||scale<.45||scale>1||
  !Number.isFinite(dx)||!Number.isFinite(dz)||
  Math.hypot(dx,dz)>.24)fail('SOURCE_R87_TABLE_AND_BOUNDED_COMPACT_MOVE_REQUIRED');
 const center=centroid(unit.top);
 const p=v=>[R(center[0]+(v[0]-center[0])*scale+dx),
  R(v[1]),R(center[2]+(v[2]-center[2])*scale+dz)];
 const faces=unit.faces.map(f=>({kind:f.kind,a:p(f.a),b:p(f.b),c:p(f.c)}));
 if(faces.some(f=>area(f)<1e-11||tri(f).some(v=>v.some(x=>!Number.isFinite(x)))))
  fail('COMPACT_FURNITURE_DEGENERATE');
 return {faces,top:faces[0],sourceFaceCount:7,
  scale,dx,dz,
  originalSourceTopKind:unit.top.kind,
  originalFurnitureRestoredInAlternativeOnly:true};
}
function rayScan(mesh,route){
 const s=screenR99FiniteRoute(mesh,route);
 return {floor:s.witnessCounts.floor,headroom:s.witnessCounts.overhead,
  lateral:s.witnessCounts.lateral,
  incomplete:s.unscreenedSegmentCount,
  sourceCoverageComplete:s.allDeclaredSourceSegmentsWithinProbeCoverage};
}
function genuineCandidateFloor(faces){
 return faces.every(f=>tri(f).every(p=>p[0]>.400001&&
  p[0]<.91&&p[2]>-1.18&&p[2]<1.13));
}
/** Source R91 corridor widened laterally for RESEARCH collision checks only.
 * No metres/blocks, person-swept volume, continuous floor or legal code proof.
 */
export function auditR107AdjacentCorridor(mesh,throat){
 if(!Array.isArray(mesh)||!Array.isArray(throat?.middle)||
  !Array.isArray(throat?.terminal))fail('SOURCE_R91_MESH_AND_CROSS_SECTIONS_REQUIRED');
 const a=mid(...throat.middle),b=mid(...throat.terminal),
  dx=b[0]-a[0],dz=b[2]-a[2],length=Math.hypot(dx,dz);
 if(length<.001)fail('REAL_R91_PLANAR_LENGTH_REQUIRED');
 const nx=dz/length,nz=-dx/length;
 const shifts=[-.035,-.023,0,.023,.035];
 const routes=shifts.map(offset=>{
  const move=p=>[R(p[0]+nx*offset),R(p[1]),R(p[2]+nz*offset)];
  const way=[move(a),move(b)],reading=rayScan(mesh,way);
  return {offset,...reading};
 });
 return {surrogateLanes:routes,allFiniteSourceLanesScreened:
  routes.every(x=>x.sourceCoverageComplete),
  testingActualR91SourceTriangles:true,
  actualHumanBodySweptVolumeCertified:false};
}
export function proposeR107CompactRecovery(r106){
 if(!r106||!Array.isArray(r106.faces)||!r106.report||
  !Array.isArray(r106.historicR98SourceFaces)||
  r106.historicR98SourceFaces.length!==4692||
  sha(r106.historicR98SourceFaces)!==r106.report.sourceR98Sha256||
  sha(r106.faces)!==r106.report.activeR106Sha256||
  !r106.report.historicR98RetainedSeparately)
  fail('AUTHENTICATED_R106_SOURCE_AND_FURNITURE_REQUIRED');
 const original=extractR106TableUnit(r106.historicR98SourceFaces),
  throat=extractR104ActiveR91Throat(r106.historicR98SourceFaces),
  route=[mid(...throat.middle),mid(...throat.terminal)];
 const current=rayScan(r106.faces,route);
 let candidate=null,candidates=[],status='PRESERVE_R106_NO_COMPACT_FURNITURE_REQUIRED';
 let active=r106.faces;
 const baselineLanes=auditR107AdjacentCorridor(r106.originalR105Faces,throat);
 const inheritedLanes=auditR107AdjacentCorridor(r106.faces,throat);
 let selectedLaneWitness=inheritedLanes,eligibleWholeLaneOffsets=[];
 const noNewLaneObstruction=(left,right)=>right.allFiniteSourceLanesScreened&&
  left.surrogateLanes.every((row,i)=>{
   const updated=right.surrogateLanes[i];
   return updated.floor<=row.floor&&updated.headroom<=row.headroom&&
    updated.lateral<=row.lateral;
  });
 if(r106.report.correctionMode==='ONE_OBSTRUCTING_R87_TABLE_WITHHELD_HEADROOM_GAIN_ART_HOLD'){
  for(const scale of SCALES)for(const [dx,dz] of OFFSETS){
   const test=designR107CompactTable(original,{scale,dx,dz});
   const inside=genuineCandidateFloor(test.faces);
   const supported=inside&&sourceSupported(r106.faces,test);
   const noMeshIntersection=supported&&!meshIntersections(r106.faces,test);
   const after=noMeshIntersection?rayScan([...r106.faces,...test.faces],route):null;
   const lateralFamily=noMeshIntersection?
    auditR107AdjacentCorridor([...r106.faces,...test.faces],throat):null;
   const preservesClearance=!!after&&after.sourceCoverageComplete&&
    after.floor<=current.floor&&after.headroom<=current.headroom&&
    after.lateral<=current.lateral&&
    !!lateralFamily&&noNewLaneObstruction(inheritedLanes,lateralFamily);
   const row={scale,dx,dz,inside,supported,noMeshIntersection,
    preservesClearance,after};
   candidates.push(row);
   if(preservesClearance&&
    (!candidate||scale>candidate.scale||
     scale===candidate.scale&&Math.hypot(dx,dz)<Math.hypot(candidate.dx,candidate.dz)))
    candidate={...row,faces:test.faces,lateralFamily};
  }
  status=candidate?'COMPACT_READING_TABLE_ON_ACTUAL_SOURCE_FLOOR_BUT_ART_HOLD':
   'HOLD_R106_TABLE_WITHHELD_NO_VERIFIED_REPLACEMENT_SURFACE';
  if(candidate){
   active=[...r106.faces,...candidate.faces];
   selectedLaneWitness=candidate.lateralFamily;
  }
 }else if(r106.report.correctionMode==='SUPPORTED_R87_TABLE_RELOCATED_HEADROOM_GAIN_ART_HOLD'){
  // R106 already moved one real full-size table (7 facets).
  // Audit the entire five-lane surrogate, including both shoulders.
  const originals=extractR106TableUnit(r106.historicR98SourceFaces);
  const clean=r106.faces.slice(0,-7);
  if(r106.faces.length<4685||r106.faces.at(-7)?.kind!==originals.top.kind||
   r106.faces.slice(-6).some(x=>x.kind!=='right_R87_TABLE_SIDE'))
   fail('R106_APPENDED_SOURCE_TABLE_END_CHANGED');
  const good=r106.report.candidateDisplacements.filter(x=>
   x.improvesHeadroomWithoutOtherProbeRegression);
  for(const {dx,dz} of good){
   const variant=designR107CompactTable(originals,{scale:1,dx,dz});
   const inside=genuineCandidateFloor(variant.faces);
   const supported=inside&&sourceSupported(clean,variant);
   const noMeshIntersection=supported&&!meshIntersections(clean,variant);
   const sideLanes=noMeshIntersection?
    auditR107AdjacentCorridor([...clean,...variant.faces],throat):null;
   const fixesCentre=noMeshIntersection&&
    noNewLaneObstruction(baselineLanes,sideLanes)&&
    sideLanes.surrogateLanes[2].headroom<
    baselineLanes.surrogateLanes[2].headroom;
   const witness={dx,dz,inside,supported,noMeshIntersection,
    preservesClearance:!!fixesCentre,
    sideLaneOverhead:sideLanes?.surrogateLanes.map(q=>q.headroom)??null};
   candidates.push(witness);
   if(fixesCentre)eligibleWholeLaneOffsets.push({dx,dz});
  }
  eligibleWholeLaneOffsets.sort((a,b)=>Math.hypot(a.dx,a.dz)-Math.hypot(b.dx,b.dz));
  const selected=eligibleWholeLaneOffsets[0];
  if(selected){
   const chosen=designR107CompactTable(originals,{scale:1,...selected});
   const newShape=[...clean,...chosen.faces];
   const isExisting=sha(newShape)===sha(r106.faces);
   active=isExisting?r106.faces:newShape;
   selectedLaneWitness=auditR107AdjacentCorridor(active,throat);
   status=isExisting?
    'R106_FULL_SIZE_RELOCATION_CONFIRMED_BY_FIVE_ADJACENT_SOURCE_LANES':
    'R107_DIFFERENT_VERIFIED_FULL_SIZE_R87_FURNITURE_OFFSET_ART_HOLD';
   candidate={scale:1,...selected,faces:chosen.faces,
    preservesClearance:true};
  }else status='HOLD_R106_CENTRAL_SUCCESS_BUT_ADJACENT_LANES_UNRESOLVED';
 }else status='R106_FURNITURE_NOT_CHANGED_PRESERVED';
 const changed=sha(active)!==sha(r106.faces);
 if(changed&&!(candidate?.preservesClearance&&
  (active.length-r106.faces.length===7||
   active.length===r106.faces.length)))
  fail('UNVERIFIED_COMPACT_OR_RELOCATED_FURNITURE_CHANGE');
 if(changed&&active.length===r106.faces.length&&
  sha(active.slice(0,-7))!==sha(r106.faces.slice(0,-7)))
  fail('OTHER_REAL_ARCHITECTURAL_FACES_CHANGED');
 return {faces:active,r106Faces:r106.faces,originalR98Faces:r106.historicR98SourceFaces,
  report:{schema:SCHEMA,originalR98Sha256:sha(r106.historicR98SourceFaces),
   originalR106Sha256:sha(r106.faces),alternativeR107Sha256:sha(active),
   originalR98Preserved:true,
   oldR106CandidateExactPrefix:sha(active.slice(0,r106.faces.length))===
    sha(r106.faces),
   previousR106FurnitureDisposition:r106.report.correctionMode,
   priorR106Headroom:current,proposalCount:candidates.length,
   priorR105SurrogateCorridorLanes:baselineLanes,
   priorR106SurrogateCorridorLanes:inheritedLanes,
   selectedR107SurrogateCorridorLanes:selectedLaneWitness,
   crossLaneVerifiedOffsets:eligibleWholeLaneOffsets,
   rejectedUnverifiedOrColliding:candidates.filter(x=>!x.preservesClearance).length,
   candidateProbes:candidates,
   furnitureRestoredInCompactForm:changed&&
    r106.report.correctionMode==='ONE_OBSTRUCTING_R87_TABLE_WITHHELD_HEADROOM_GAIN_ART_HOLD',
   repositionedExistingRealTable:changed&&
    r106.report.correctionMode==='SUPPORTED_R87_TABLE_RELOCATED_HEADROOM_GAIN_ART_HOLD',
   chosenScale:candidate?.scale??null,
   chosenOffset:candidate?{dx:candidate.dx,dz:candidate.dz}:null,
   evaluationStatus:status,artQuality:'NOT_REVIEWED',
   actualHumanWalkingCertified:false,
   actualFloorLoadSupportCertified:false,
   originalAIModelCapabilityUnchanged:true,safety:safety()}};
}
export function buildR107CompactReadingStudy(nodes){
 return proposeR107CompactRecovery(buildR106ReadingTableReflowStudy(nodes));
}
