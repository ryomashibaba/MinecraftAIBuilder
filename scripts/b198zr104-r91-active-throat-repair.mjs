/**
 * R104: remove unjoined research aprons and build a source-congruent,
 * tapered shoulder around the ACTUAL R91 replacement in right tier 2.
 * Original R98 4692 faces exact prefix; no world/model use.
 */
import {createHash} from 'node:crypto';
import {buildR102TaperedGalleryStudy} from './b198zr102-tapered-gallery-aprons.mjs';
import {screenR99FiniteRoute} from './b198zr99-finite-volume-route-witness.mjs';

export const SCHEMA='minecraftaibuilder-b198zr104-active-r91-throat-repair-v1';
const fail=s=>{throw Error('B198ZR104_'+s)};
const SHA=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const R=n=>+n.toFixed(7);
const finite=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite);
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
const near=(a,b)=>distance(a,b)<.000002;
const lerp=(a,b,t)=>a.map((v,i)=>R(v+(b[i]-v)*t));
const area=f=>{
 const u=f.b.map((x,i)=>x-f.a[i]),v=f.c.map((x,i)=>x-f.a[i]);
 return Math.hypot(u[1]*v[2]-u[2]*v[1],
  u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])*.5;
};
const tri=(faces,a,b,c,kind)=>faces.push({a:a.map(R),b:b.map(R),c:c.map(R),kind});
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},modelCalls:0,worldReads:0,worldWrites:0});
const R91_KIND='right_R91_NARROWING_GALLERY_TURNOUT_NOT_CERTIFIED';

/** Not the obsolete R88 full-width endpoint: TWO live R91 source triangles. */
export function extractR104ActiveR91Throat(sourceFaces){
 if(!Array.isArray(sourceFaces))fail('SOURCE_FACES_REQUIRED');
 const found=sourceFaces.filter(f=>f.kind===R91_KIND);
 if(found.length!==2)fail('EXACT_TWO_R91_REPLACEMENT_FACES_REQUIRED');
 const [a,b]=found;
 if(![a.a,a.b,a.c,b.a,b.b,b.c].every(finite)||
  !near(a.a,b.a)||!near(a.c,b.b)||area(a)<1e-10||area(b)<1e-10)
  fail('R91_SOURCE_TWO_TRIANGLES_NOT_CONTIGUOUS');
 const middle=[a.a,a.b],terminal=[b.c,a.c];
 if(middle.some((p,i)=>distance(p,terminal[i])<.015)||
  middle.some(p=>p[0]<.400001)||terminal.some(p=>p[0]<.400001))
  fail('REAL_R91_THROAT_NOT_USABLE_AS_RESEARCH_SOURCE');
 return {middle,terminal,originalFaces:found,kind:R91_KIND,
  fromActiveR91Replacement:true,
  sourceEndNarrowingPreserved:true,
  noStructuralApproval:true};
}
function midpoint(a,b){return lerp(a,b,.5)}
function outwards(a,b,index,width){
 const center=midpoint(a,b),p=index===0?a:b;
 const dx=p[0]-center[0],dz=p[2]-center[2],
  norm=Math.hypot(dx,dz);
 if(norm<.003)fail('DEGENERATE_R91_CROSS_SECTION_WIDTH');
 return [R(p[0]+dx/norm*width),p[1],R(p[2]+dz/norm*width)];
}
/**
 * Zero extension at the original R91 middle and terminal cross-sections,
 * max .018 halfway, two pinched end wedges and inner strip across 5
 * source stations per side. Active R91 triangles unchanged.
 */
export function designR104LiveR91Shoulders(throat,{peak=.018}={}){
 if(!throat||!Array.isArray(throat.middle)||!Array.isArray(throat.terminal)||
  !throat.middle.every(finite)||!throat.terminal.every(finite)||
  !Number.isFinite(peak)||peak<=.003||peak>.025)
  fail('VALID_SOURCE_R91_THROAT_REQUIRED');
 const stations=[0,.2,.5,.8,1],facets=[],
  kind='right_R104_R91_TRUE_SOURCE_JOINED_APRON_NOT_WALKABLE';
 for(const side of [0,1]){
  const cross=stations.map(t=>{
   const p0=lerp(throat.middle[0],throat.terminal[0],t);
   const p1=lerp(throat.middle[1],throat.terminal[1],t);
   const inside=side===0?p0:p1;
   const width=peak*Math.sin(Math.PI*t)**2;
   return {inside,outside:outwards(p0,p1,side,width)};
  });
  tri(facets,cross[0].inside,cross[1].outside,cross[1].inside,kind);
  for(let k=1;k<3;k++){
   tri(facets,cross[k].inside,cross[k].outside,cross[k+1].outside,kind);
   tri(facets,cross[k].inside,cross[k+1].outside,cross[k+1].inside,kind);
  }
  tri(facets,cross[3].inside,cross[3].outside,cross[4].inside,kind);
 }
 if(facets.length!==12||facets.some(f=>!Number.isFinite(area(f))||area(f)<1e-10))
  fail('REAL_R91_SHOULDER_TRIANGLES_DEGENERATE');
 return {faces:facets,middle:throat.middle,terminal:throat.terminal,
  sourceEndpointVerticesPreserved:true,
  preservesSourceInnerDeckWithoutOverwriting:true,
  peakNormalizedAddedShoulderWidth:peak};
}
function corridorWitness(source,extended,throat){
 const route=[midpoint(...throat.middle),midpoint(...throat.terminal)];
 const a=screenR99FiniteRoute(source,route),b=screenR99FiniteRoute(extended,route);
 return {source:a.witnessCounts,candidate:b.witnessCounts,
  sourceUnscreened:a.unscreenedSegmentCount,
  candidateUnscreened:b.unscreenedSegmentCount,
  floorWitnessGain:a.witnessCounts.floor-b.witnessCounts.floor,
  noNewOverheadOrLateralIntersections:
   b.witnessCounts.overhead<=a.witnessCounts.overhead&&
   b.witnessCounts.lateral<=a.witnessCounts.lateral,
  sourceCoverageComplete:a.allDeclaredSourceSegmentsWithinProbeCoverage&&
   b.allDeclaredSourceSegmentsWithinProbeCoverage};
}
export function reconcileR104SourceMesh(study){
 if(!study||!Array.isArray(study.sourceR98Faces)||
  study.sourceR98Faces.length!==4692||!Array.isArray(study.faces)||
  !study.report?.junctionAudit||study.report.junctionAudit.details.length!==7)
  fail('R102_FULL_SOURCE_AND_JOINT_AUDIT_REQUIRED');
 const source=study.sourceR98Faces,next=[...source],keep=[],drop=[];
 let i=source.length;
 for(const row of study.report.records){
  const audit=study.report.junctionAudit.details.find(q=>q.id===row.id);
  if(!audit||!Number.isInteger(row.addedTriangles)||
   i+row.addedTriangles>study.faces.length)
   fail('SOURCE_JOINT_RECORD_ORDER_CHANGED');
  const proposed=study.faces.slice(i,i+row.addedTriangles);
  i+=row.addedTriangles;
  if(!proposed.length)continue;
  if(audit.sourceEndpointEdgesVerified&&audit.addedApronEndpointCornersVerified){
   next.push(...proposed);keep.push(row.id);
  }else{
   drop.push({id:row.id,reason:'R103_SOURCE_ENDPOINT_NOT_PROVED',
    withheldTriangles:row.addedTriangles,
    sourceEdgeAvailable:audit.sourceEndpointEdgesVerified,
    apronCornersAvailable:audit.addedApronEndpointCornersVerified});
  }
 }
 if(i!==study.faces.length)fail('R102_APPENDED_TRIANGLE_ACCOUNTING_CHANGED');
 const previous=SHA(source);
 if(SHA(next.slice(0,4692))!==previous)fail('R98_ORIGINAL_SOURCE_CHANGED');
 const needsR91Correction=!keep.includes('right_tier2');
 const r91=extractR104ActiveR91Throat(source);
 let r91Status='SOURCE_R91_ALREADY_REGISTERED_NO_EXTRA_SHOULDER',r91Added=0;
 let witness=null;
 if(needsR91Correction){
  const candidate=designR104LiveR91Shoulders(r91);
  const fits=candidate.faces.every(f=>[f.a,f.b,f.c].every(p=>p[0]>.400001));
  witness=corridorWitness(next,[...next,...candidate.faces],r91);
  if(fits&&witness.floorWitnessGain>0&&
   witness.noNewOverheadOrLateralIntersections&&witness.sourceCoverageComplete){
   next.push(...candidate.faces);r91Added=candidate.faces.length;
   r91Status='R91_ACTIVE_SOURCE_GEOMETRIC_FLOOR_GAIN_BUT_ART_HOLD';
  }else r91Status='R91_REPAIR_HOLD_NO_MEASURED_SAFE_GAIN';
 }
 if(SHA(next.slice(0,4692))!==previous)
  fail('R98_BASELINE_NOT_EXACT_PREFIX');
 return {faces:next,originalSourceFaces:source,priorR102Faces:study.faces,
  report:{schema:SCHEMA,originalR98Sha256:previous,
   originalR102Sha256:SHA(study.faces),alternativeR104Sha256:SHA(next),
   sourceR98ExactPrefix:true,sourceFaces:source.length,
   keptR102JointVerifiedAprons:keep,
   withheldUnjoinedAprons:drop,withheldCount:drop.length,
   originalR91RealSourceVerified:true,
   r91ProposedCorrectionStatus:r91Status,r91AddedTriangles:r91Added,
   r91ScreeningWitness:witness,
   newActiveTriangles:next.length,
   realWorldHumanWalkingCertified:false,
   allSevenRoutesSafeCertified:false,
   actualStructuralSupportCertified:false,
   architecturalBeauty:'NOT_REVIEWED',
   originalHistoricalOutputsKept:true,
   safety:safe()}};
}
export function buildR104R91ActiveRepairStudy(nodes){
 return reconcileR104SourceMesh(buildR102TaperedGalleryStudy(nodes));
}
