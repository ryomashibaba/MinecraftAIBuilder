/**
 * R106: remove the actual R87 seven-face reading table blocking the active
 * R91 right-tier2 corridor; attempt supported relocation before withholding.
 * Source R98/R105 models remain independent and byte-preserved.
 * The active R106 alternative intentionally is NOT an exact R98 prefix.
 */
import {createHash} from 'node:crypto';
import {buildR105LiveR91ResearchVariant}
 from './b198zr105-active-r91-throat-width-selection.mjs';
import {extractR104ActiveR91Throat}
 from './b198zr104-r91-active-throat-repair.mjs';
import {screenR99FiniteRoute} from './b198zr99-finite-volume-route-witness.mjs';
import {intersectR81SegmentTriangle}
 from './b198zr81-envelope-portal-connection-review.mjs';

export const SCHEMA='minecraftaibuilder-b198zr106-r87-reading-table-source-reflow-v1';
export const BLOCKER_INDEX=4158;
const TOP='right_R87_READING_TABLE_NOT_OCCUPANCY',SIDE='right_R87_TABLE_SIDE';
const FLOOR=new Set(['right_reading_terrace',
 'right_R87_CONTIGUOUS_PROGRAM_TERRACE_NOT_WALKABLE']);
const fail=s=>{throw Error('B198ZR106_'+s)};
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const round=x=>+x.toFixed(7);
const finite=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite);
const tri=f=>[f.a,f.b,f.c];
const near=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]))<.000002;
const mid=(a,b)=>a.map((v,i)=>(v+b[i])/2);
const centroid=f=>[0,1,2].map(i=>tri(f).reduce((n,p)=>n+p[i],0)/3);
const area=f=>{
 const u=f.b.map((x,i)=>x-f.a[i]),v=f.c.map((x,i)=>x-f.a[i]);
 return .5*Math.hypot(u[1]*v[2]-u[2]*v[1],
  u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]);
};
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},modelCalls:0,worldReads:0,worldWrites:0});
/** Real R87 production: table top then 3 paired triangular vertical panels. */
export function extractR106TableUnit(source,index=BLOCKER_INDEX){
 if(!Array.isArray(source)||!Number.isInteger(index)||index<0||
  source.length<index+7)fail('HISTORIC_FURNITURE_INDEX_NOT_PRESENT');
 const faces=source.slice(index,index+7),top=faces[0];
 if(top.kind!==TOP||faces.slice(1).some(f=>f.kind!==SIDE)||
  faces.some(f=>tri(f).some(p=>!finite(p))||area(f)<1e-11))
  fail('R87_SEVEN_FURNITURE_TRIANGLES_CHANGED');
 const vertices=tri(top);
 for(let i=1;i<7;i+=2)
  if(!faces.slice(i,i+2).flatMap(tri).some(p=>
   vertices.some(q=>near(p,q))))fail('R87_TABLE_SIDE_PROVENANCE_CHANGED');
 return {sourceIndices:Array.from({length:7},(_,k)=>index+k),
  top,faces,sourceTopCenter:centroid(top),
  provenOriginalR87Table:true};
}
function readFloor(faces,p){
 // A load-bearing test is NOT claimed: this is a ray witness only.
 const from=[p[0],p[1]+.004,p[2]],
  to=[p[0],p[1]-.055,p[2]];
 return faces.some(f=>FLOOR.has(f.kind)&&
  intersectR81SegmentTriangle(from,to,f));
}
function sourceSupported(faces,unit){
 const y=Math.min(...tri(unit.top).map(p=>p[1]));
 const base=unit.faces.slice(1).flatMap(f=>tri(f).filter(p=>p[1]<y-.005));
 const unique=[...new Map(base.map(p=>[p.map(round).join(','),p])).values()];
 return unique.length>=3&&unique.every(p=>readFloor(faces,p));
}
function meshIntersections(other,unit){
 // Bounding gate and 2 study cross rays, excluding floor and original unit.
 const pts=unit.faces.flatMap(tri);
 const min=[0,1,2].map(i=>Math.min(...pts.map(p=>p[i])));
 const max=[0,1,2].map(i=>Math.max(...pts.map(p=>p[i])));
 const c=centroid(unit.top);
 for(const f of other){
  if(FLOOR.has(f.kind))continue;
  const ps=tri(f);
  if([0,1,2].some(i=>Math.max(...ps.map(p=>p[i]))<min[i]-1e-6||
   Math.min(...ps.map(p=>p[i]))>max[i]+1e-6))continue;
  for(const delta of [-.008,.008]){
   if(intersectR81SegmentTriangle(
    [min[0],c[1]+delta,c[2]],[max[0],c[1]+delta,c[2]],f))
    return true;
  }
 }
 return false;
}
function translated(original,dx,dz){
 const move=p=>[round(p[0]+dx),round(p[1]),round(p[2]+dz)];
 const faces=original.faces.map(f=>({
  kind:f.kind,a:move(f.a),b:move(f.b),c:move(f.c)}));
 return {...original,faces,top:faces[0]};
}
function probe(faces,route){
 const s=screenR99FiniteRoute(faces,route);
 return {floor:s.witnessCounts.floor,overhead:s.witnessCounts.overhead,
  lateral:s.witnessCounts.lateral,sourceGaps:s.unscreenedSegmentCount,
  coverageComplete:s.allDeclaredSourceSegmentsWithinProbeCoverage,
  overheadKinds:s.examples.flatMap(t=>t.observed.filter(o=>o.class==='overhead')
   .map(o=>o.kind)).slice(0,8)};
}
export function reflowR106SourceTable(r105){
 if(!r105||!r105.report||!Array.isArray(r105.faces)||
  !Array.isArray(r105.sourceFaces)||r105.sourceFaces.length!==4692||
  r105.report.sourceR98ExactPrefix!==true||
  hash(r105.sourceFaces)!==r105.report.sourceR98MeshSHA256||
  hash(r105.faces.slice(0,4692))!==hash(r105.sourceFaces))
  fail('AUTHENTICATED_R105_AND_R98_SOURCE_REQUIRED');
 const hit=r105.report.actualR91OverheadFirstHit;
 if(!hit||hit.sourceTriangle!==BLOCKER_INDEX||hit.sourceKind!==TOP||
  !finite(hit.intersection))
  fail('EXACT_R105_OBSTRUCTING_READING_TABLE_REQUIRED');
 const unit=extractR106TableUnit(r105.sourceFaces);
 const throat=extractR104ActiveR91Throat(r105.sourceFaces);
 const route=[mid(...throat.middle),mid(...throat.terminal)];
 const before=probe(r105.faces,route);
 if(!before.coverageComplete||before.overhead<=0||
  !before.overheadKinds.includes(TOP))
  fail('SOURCE_R91_HEADROOM_HIT_NOT_REPRODUCED');
 const toDrop=new Set(unit.sourceIndices);
 const retained=r105.faces.filter((_,i)=>!toDrop.has(i));
 if(retained.length!==r105.faces.length-7||
  hash(retained.slice(0,4692-7))!==
   hash(r105.sourceFaces.filter((_,i)=>!toDrop.has(i))))
  fail('UNRELATED_HISTORICAL_SOURCE_TRIANGLES_CHANGED');
 const removedOnly=probe(retained,route);
 const smallMoves=[
  [.025,0],[.045,0],[.065,0],[.085,0],
  [.045,-.055],[.065,-.055],[.085,-.055],
  [.045,.055],[.065,.055],[.085,.055],
  [.065,-.110],[.085,-.110],[.065,.110],[.085,.110]
 ];
 const proposals=[];
 for(const [dx,dz] of smallMoves){
  const moved=translated(unit,dx,dz);
  const inside=moved.faces.every(f=>tri(f).every(p=>
   p[0]>.400001&&p[0]<.91&&p[2]>-1.18&&p[2]<1.13));
  const supported=inside&&sourceSupported(retained,moved);
  const noOverlap=supported&&!meshIntersections(retained,moved);
  const after=noOverlap?probe([...retained,...moved.faces],route):null;
  const better=!!after&&after.coverageComplete&&
   after.floor<=before.floor&&after.lateral<=before.lateral&&
   after.overhead<before.overhead;
  proposals.push({dx,dz,inside,supported,noOverlap,
   routeStatus:after,improvesHeadroomWithoutOtherProbeRegression:better,
   faces:moved.faces});
 }
 const valid=proposals.filter(x=>x.improvesHeadroomWithoutOtherProbeRegression)
  .sort((a,b)=>Math.hypot(a.dx,a.dz)-Math.hypot(b.dx,b.dz));
 let mode='HOLD_NO_VERIFIED_TABLE_CORRECTION',active=r105.faces,offset=null;
 let after=before;
 if(valid.length){
  const winner=valid[0];
  active=[...retained,...winner.faces];
  after=winner.routeStatus;offset={dx:winner.dx,dz:winner.dz};
  mode='SUPPORTED_R87_TABLE_RELOCATED_HEADROOM_GAIN_ART_HOLD';
 }else if(removedOnly.coverageComplete&&removedOnly.floor<=before.floor&&
  removedOnly.lateral<=before.lateral&&removedOnly.overhead<before.overhead){
  active=retained;after=removedOnly;
  mode='ONE_OBSTRUCTING_R87_TABLE_WITHHELD_HEADROOM_GAIN_ART_HOLD';
 }
 const changed=hash(active)!==hash(r105.faces);
 if(changed&&hash(active.slice(0,4685))!==
  hash(r105.sourceFaces.filter((_,i)=>!toDrop.has(i))))
  fail('NON_FURNITURE_SOURCE_FACE_CHANGED');
 if(changed&&!(after.overhead<before.overhead&&
  after.floor<=before.floor&&after.lateral<=before.lateral))
  fail('FALSELY_CLAIMED_FURNITURE_CORRECTION');
 return {faces:active,originalR105Faces:r105.faces,
  historicR98SourceFaces:r105.sourceFaces,
  report:{schema:SCHEMA,sourceR98Sha256:hash(r105.sourceFaces),
   sourceR105Sha256:hash(r105.faces),activeR106Sha256:hash(active),
   historicR98RetainedSeparately:true,
   historicR105RetainedSeparately:true,
   originalSourceMeshExactPrefixInR106:!changed,
   onlyOneSevenTriangleR87TableTargeted:true,
   targetedHistoricSourceTriangleIndices:unit.sourceIndices,
   targetedOriginalFurnitureKind:TOP,
   priorCollisionPoint:hit.intersection,
   beforeRoute:before,afterRoute:after,
   correctionMode:mode,sourceFurnitureRelocatedTo:offset,
   sourceTableRemovedFromR106Only:changed,
   candidateDisplacements:proposals.map(({faces,...rest})=>rest),
   restOfReadingProgramUnchanged:true,
   noArtificialRoofOrFloorGenerated:true,
   architecturalAesthetics:'NOT_REVIEWED',
   personVolumeAndContinuousWalkingCertified:false,
   structuralSafetyCertified:false,
   generativeModelCapabilityCertified:false,
   safety:safe()}};
}
export function buildR106ReadingTableReflowStudy(nodes){
 return reflowR106SourceTable(buildR105LiveR91ResearchVariant(nodes));
}
