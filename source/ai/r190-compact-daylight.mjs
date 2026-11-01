/**
 * R190 compact minimum-window experiment.
 *
 * Keep the model-authored compact program, original host-derived geometry,
 * and geometry SHA unchanged. A second HOST-DERIVED candidate adds real
 * B143 apertures through the existing full semantic source + circulation QA.
 * These are NOT model-authored window decisions or an ART/World approval.
 */
import {compileR190SemanticPlan} from './r190-semantic-massing.mjs';
import {verifyCompiled} from './b143-building-dsl.mjs';
const fail=code=>{throw Error('R190_COMPACT_DAYLIGHT_'+code);};
const faces=['north','east','west','south'];
const match=(p,r)=>p?.spaces?.find(x=>x.id===r.id);
const dimension=(r,face)=>['north','south'].includes(face)?r.width:r.depth;
const offsets=(span,width=2)=>{
 const max=span-2-width;
 return [...new Set([Math.floor((span-width)/2),2,max].filter(x=>x>=2&&x<=max))];
};
export function deriveR190CompactMinimumWindows(base){
 if(!base||base.status!=='COMPILED_SOURCE_ONLY_ART_HOLD'||
  !base.hostDerivedPlan||!base.built||!verifyCompiled(base.built.design,base.built.compiled)||
  base.built.worldWrites!==0||base.built.constructionApproved!==false)
  fail('BASE_NOT_VERIFIED');
 const original=JSON.stringify(base.hostDerivedPlan);
 if(base.hostDerivedPlan.glazedOpenings!==undefined)fail('BASE_ALREADY_HAS_WINDOWS');
 const plan=structuredClone(base.hostDerivedPlan),applied=[],skipped=[];
 let current=base.built,candidateTests=0;
 for(const s of plan.spaces){
  const authored=base.modelProgram.spaces.find(r=>r.id===s.id);
  if(!authored)fail('ROOM_AUTHORSHIP_MISSING');
  if(s.spatialRole==='open-court'||authored.form==='facet'){
   skipped.push({spaceId:s.id,reason:authored.form==='facet'?
    'FACET_NOT_SUPPORTED_FOR_GLAZING':'OPEN_COURT_NO_ENCLOSED_WALL'});
   continue;
  }
  const rejected=new Map();
  let found=null,accepted=null;
  for(const face of faces){
   if(found)break;
   const span=dimension(s,face);
   for(const offset of offsets(span)){
    if(found)break;
    for(const baseY of [5,6]){
     if(baseY+2>s.height-1)continue;
     const request={spaceId:s.id,face,offset,baseY,width:2,height:2};
     const next=structuredClone(plan);
     next.glazedOpenings=[...(plan.glazedOpenings??[]),request];
     candidateTests++;
     try{
      const compiled=compileR190SemanticPlan(next);
      if(!verifyCompiled(compiled.design,compiled.compiled)||
       !compiled.audit.allProgramSpacesReachable||
       compiled.audit.realGlazingCells<2*2*(applied.length+1)||
       compiled.worldWrites!==0||compiled.worldContacts!==0||
       compiled.constructionApproved!==false||
       compiled.BuildPlan.operations.length!==0||
       compiled.gates.length!==9||
       compiled.gates.some(g=>g!=='BLOCKED'))fail('NEW_SOURCE_INVALID');
      found=request;accepted=compiled;
      break;
     }catch(e){
      const name=String(e?.message??e).slice(0,100);
      rejected.set(name,(rejected.get(name)??0)+1);
     }
    }
   }
  }
  if(found){
   plan.glazedOpenings=[...(plan.glazedOpenings??[]),found];
   applied.push({...found,authorship:'HOST_DERIVED_MINIMUM_DAYLIGHT',
    acceptedUnder:'FULL_R190_SOURCE_AND_CIRCULATION_QA'});
   current=accepted;
  }else skipped.push({spaceId:s.id,reason:'NO_VERIFIED_EXTERIOR_WINDOW',
   rejectedReasons:Object.fromEntries(rejected)});
 }
 if(JSON.stringify(base.hostDerivedPlan)!==original)fail('BASE_MUTATED');
 if(!applied.length)return {status:'WINDOW_RESEARCH_HOLD',reason:'NO_VALID_WINDOW',
  originalSourceSha256:base.built.compiled.sourceSha256,
  originalGeometrySha256:base.built.compiled.geometrySha256,
  modelOriginalUnaffected:true,attemptedCandidates:candidateTests,
  applied,skipped,modelRequests:0,worldWrites:0};
 if(current.compiled.geometrySha256===base.built.compiled.geometrySha256)
  fail('WINDOW_DID_NOT_CHANGE_GEOMETRY');
 return {status:'HOST_DERIVED_WINDOWS_SOURCE_ART_HOLD',
  originalSourceSha256:base.built.compiled.sourceSha256,
  originalGeometrySha256:base.built.compiled.geometrySha256,
  derivedSourceSha256:current.compiled.sourceSha256,
  derivedGeometrySha256:current.compiled.geometrySha256,
  modelOriginalUnaffected:true,attemptedCandidates:candidateTests,
  authorship:'MODEL_SPACE_AND_FORM_HOST_MINIMUM_WINDOWS',
  applied,skipped,modelRequests:0,worldContacts:0,worldWrites:0,
  art:'NOT_REVIEWED',minecraftWalking:'NOT_TESTED',
  constructionApproved:false,plan,current};
}

/** Read-only evidence of actual B143 clear supporting floor, not game walking. */
export function auditR190CompactInteriorEvidence(built){
 if(built?.schema!=='minecraftaibuilder-r190-source-research-v1'||
  !Array.isArray(built.layout?.spaces)||!built.layout.spaces.length||
  !Array.isArray(built.audit?.witnesses)||
  !verifyCompiled(built.design,built.compiled)||
  built.worldWrites!==0||built.constructionApproved!==false)
  fail('INTERIOR_UNVERIFIED_SOURCE');
 const cells=new Set(built.compiled.primitives.map(v=>v[0]+','+v[1]+','+v[2]));
 const has=(x,y,z)=>cells.has(x+','+y+','+z);
 const clear=(x,z)=>has(x,1,z)&&!has(x,2,z)&&!has(x,3,z);
 const rooms=built.layout.spaces.map(r=>{
  const x0=r.x+1,x1=r.x+r.w-2,z0=r.z+1,z1=r.z+r.d-2;
  if(x1<x0||z1<z0)fail('INTERIOR_BOUNDS');
  let supportedClearFloorCells=0,twoByTwoSupportedClearPads=0;
  for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++){
   if(clear(x,z))supportedClearFloorCells++;
   if(x<x1&&z<z1&&[0,1].every(dx=>[0,1].every(dz=>clear(x+dx,z+dz))))
    twoByTwoSupportedClearPads++;
  }
  const witness=built.audit.witnesses.find(w=>w.id===r.id)?.reachableTwoWideSourceCell;
  if(!Array.isArray(witness)||witness.length!==3||witness[1]!==2||
   witness[0]<x0||witness[0]+1>x1||witness[2]<z0||witness[2]+1>z1||
   ![0,1].every(dx=>[0,1].every(dz=>clear(witness[0]+dx,witness[2]+dz))))
   fail('INTERIOR_WITNESS_MISMATCH');
  const interiorFootprintCells=(x1-x0+1)*(z1-z0+1);
  return {spaceId:r.id,spatialRole:r.spatialRole??'enclosed',
   hostResolvedDimensions:[r.w,r.h,r.d],interiorFootprintCells,
   supportedClearFloorCells,twoByTwoSupportedClearPads,
   clearFloorFraction:Number((supportedClearFloorCells/interiorFootprintCells).toFixed(4)),
   connectedEntranceWitness:witness,
   furniture:'NOT_GENERATED',actualMinecraftWalking:'NOT_TESTED'};
 });
 return {schema:'r190-compact-interior-source-evidence-v1',
  sourceSha256:built.compiled.sourceSha256,geometrySha256:built.compiled.geometrySha256,
  status:'MEASURED_SOURCE_ONLY_NO_FUNCTION_OR_ART_APPROVAL',
  rooms,allRoomsHaveSourceEntranceWitness:true,
  note:'2 air cells over supporting floor; independent room pad count is not game physics or furnishing proof',
  modelCalls:0,worldContacts:0,worldWrites:0,constructionApproved:false,
  readiness:'NOT_PREPARED',art:'NOT_REVIEWED',actualMinecraftWalking:'NOT_TESTED'};
}
