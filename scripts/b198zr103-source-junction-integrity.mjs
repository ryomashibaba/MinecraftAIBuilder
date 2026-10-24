/* R103: exact R88 end-cross-section edge and apron corner audit. */
export const SCHEMA='minecraftaibuilder-b198zr103-source-junction-check-v1';
const fail=s=>{throw Error('B198ZR103_'+s)};
const finite=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite);
const near=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]))<.000002;
const KIND='R86_RESEARCH_DECK_NOT_CERTIFIED';
function endCorners(a,b,t){
 if(!finite(a)||!finite(b)||![0,1].includes(t))fail('FINITE_SOURCE_ENDPOINT_REQUIRED');
 const dx=b[0]-a[0],dz=b[2]-a[2],run=Math.hypot(dx,dz);
 if(run<.00001||run>.42001)fail('BAD_SOURCE_SPAN');
 const n=[-dz/run,0,dx/run],p=a.map((x,i)=>x+t*(b[i]-x));
 return [-1,1].map(sign=>p.map((x,i)=>+(x+sign*.016*n[i]).toFixed(7)));
}
function sourceHasEdge(mesh,pair){
 return mesh.some(f=>f.kind===KIND&&[f.a,f.b,f.c].some(v=>near(v,pair[0]))&&
  [f.a,f.b,f.c].some(v=>near(v,pair[1])));
}
function addedHasCorners(faces,pair){
 const v=faces.flatMap(f=>[f.a,f.b,f.c]);
 return pair.every(e=>v.some(p=>near(p,e)));
}
export function auditR103SourceJoint({sourceFaces,addedFaces,sourceAnchor,sourcePad}={}){
 if(!Array.isArray(sourceFaces)||!Array.isArray(addedFaces)||
  !finite(sourceAnchor)||!finite(sourcePad))fail('SOURCE_DATA_REQUIRED');
 const ends=[0,1].map(t=>{
  const corners=endCorners(sourceAnchor,sourcePad,t);
  return {site:t===0?'ramp_anchor':'reading_landing',
   corners,actualSourceR88CrossSectionEdge:sourceHasEdge(sourceFaces,corners),
   addedApronTouchesBothCorners:addedHasCorners(addedFaces,corners)};
 });
 return {endpoints:ends,
  sourceEndpointEdgesVerified:ends.every(v=>v.actualSourceR88CrossSectionEdge),
  addedApronEndpointCornersVerified:ends.every(v=>v.addedApronTouchesBothCorners),
  humanTraversalCertified:false,structuralLoadTransferCertified:false};
}
export function auditR103SevenJunctions({sourceFaces,activeFaces,records}={}){
 if(!Array.isArray(sourceFaces)||sourceFaces.length!==4692||
  !Array.isArray(activeFaces)||!Array.isArray(records)||records.length!==7)
  fail('REAL_SOURCE_AND_SEVEN_RECORDS_REQUIRED');
 let index=sourceFaces.length;
 const details=records.map(r=>{
  if(!Array.isArray(r.sourceLine)||r.sourceLine.length!==2||
   !Number.isInteger(r.addedTriangles)||r.addedTriangles<0||
   index+r.addedTriangles>activeFaces.length)fail('SOURCE_OR_APPEND_METADATA_INVALID');
  const added=activeFaces.slice(index,index+r.addedTriangles);index+=r.addedTriangles;
  return {id:r.id,addedTriangles:r.addedTriangles,
   ...auditR103SourceJoint({sourceFaces,addedFaces:added,
    sourceAnchor:r.sourceLine[0],sourcePad:r.sourceLine[1]})};
 });
 if(index!==activeFaces.length)fail('SOURCE_APPEND_FACE_MISMATCH');
 return {schema:SCHEMA,sourceRoutesAssessed:7,
  originalR88EndpointEdgeRoutes:details.filter(x=>x.sourceEndpointEdgesVerified).length,
  sourceJoinedSelectedAprons:details.filter(x=>x.addedTriangles>0&&
   x.sourceEndpointEdgesVerified&&x.addedApronEndpointCornersVerified).length,
  selectedApronEndpointDefects:details.filter(x=>x.addedTriangles>0&&
   !(x.sourceEndpointEdgesVerified&&x.addedApronEndpointCornersVerified)).length,
  details,fullSharedEdgeContinuityNotProven:true,
  loadBearingCertified:false,humanWalkingCertified:false};
}
