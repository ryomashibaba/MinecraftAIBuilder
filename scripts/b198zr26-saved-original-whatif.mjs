/**
 * R26: offline-only forensic dry run against a SAVED Qwen original.
 * A disallowed material on CUT is *never* silently accepted by B143.
 * Simulate exactly that one deletion in a memory-only clone to expose
 * further geometry/space flaws without additional model requests.
 *
 * NO output clone, no model, HTTP, Minecraft client or placements.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {compileDesign,verifyCompiled,MATERIALS}
 from '../source/ai/b143-building-dsl.mjs';
import {reviewR4PlannedProposal}
 from '../source/ai/b198zr4-planned-source.mjs';
import {inspectR21SavedOriginal}
 from '../source/ai/b198zr21-offline-forensics.mjs';

export const SCHEMA='minecraftaibuilder-b198zr26-immutable-source-whatif-v1';
const hash=s=>createHash('sha256').update(s).digest('hex');
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,worldContacts:0,worldWrites:0,
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}});
const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const validHash=h=>typeof h==='string'&&/^[0-9a-f]{64}$/.test(h);
const code=e=>{
 const m=String(e?.message??'').match(/\b(?:B143|B198[A-Z0-9]+)_[A-Z0-9_]+/);
 return m?m[0]:'HOLD_UNCLASSIFIED_ERROR_DETAILS_OMITTED';
};
function zoneReview(compiled,plan){
 const points=compiled.primitives??[];
 const zones=Array.isArray(plan?.functionalZones)?plan.functionalZones:[];
 return zones.map((zone,index)=>{
  const origin=zone?.origin,size=zone?.size;
  const id=typeof zone?.id==='string'?zone.id.slice(0,48):'UNNAMED';
  if(!Array.isArray(origin)||origin.length!==3||
     !Array.isArray(size)||size.length!==3||
     !origin.every(Number.isSafeInteger)||
     !size.every(v=>Number.isSafeInteger(v)&&v>0))
   return {index,id,geometryAvailable:false};
  const total=size[0]*size[1]*size[2];
  if(!Number.isSafeInteger(total)||total>500000)
   return {index,id,geometryAvailable:false,reason:'ZONE_VOLUME_BOUNDS'};
  const inside=p=>[0,1,2].every(i=>
   p[i]>=origin[i]&&p[i]<origin[i]+size[i]);
  const occupied=points.filter(inside);
  const materialCounts={};
  for(const p of occupied){
   const name=MATERIALS[p[3]]??'UNKNOWN';
   materialCounts[name]=(materialCounts[name]??0)+1;
  }
  // A functional zone can legitimately contain fixtures/furniture.
  // Occupancy is exact, but *not* by itself evidence of unusable
  // reading space or certified avatar reachability.
  return {index,id,geometryAvailable:true,volumeCells:total,
   occupiedCells:occupied.length,
   occupiedPercent:Number((100*occupied.length/total).toFixed(3)),
   materialCounts,zoneIntendedUseIndependentlyVerified:false,
   furniturePlacementAndAvatarClearanceCertified:false};
 });
}
export function analyzeR26Original(raw,{expectedSha256}={}){
 if(typeof raw!=='string'||!raw.length||Buffer.byteLength(raw)>120000)
  throw Error('B198ZR26_ORIGINAL_SIZE');
 const rawSha256=hash(raw);
 if(!validHash(expectedSha256)||expectedSha256!==rawSha256)
  throw Error('B198ZR26_ORIGINAL_SHA_MISMATCH');
 const originalBefore=raw;
 const staticAudit=inspectR21SavedOriginal(raw,{
  expectedRawSha256:rawSha256,sourceLabel:'R26_SAVED_ORIGINAL'});
 let parsed=null;
 try{parsed=JSON.parse(raw)}catch{}
 const elements=Array.isArray(parsed?.design?.elements)?
  parsed.design.elements:[];
 const invalidCuts=elements.flatMap((e,index)=>
  e?.mode==='cut'&&Object.hasOwn(e,'material')?
   [{index,id:String(e.id??'UNNAMED').slice(0,48),
    materialPresent:true,materialValueType:typeof e.material}]:[]);
 const invalidAdds=elements.flatMap((e,index)=>
  e?.mode==='add'&&!MATERIALS.includes(e.material)?
   [{index,id:String(e.id??'UNNAMED').slice(0,48),
    materialPresent:Object.hasOwn(e,'material')}]:[]);
 let originalReview='HOLD_ORIGINAL_INVALID_OR_UNREVIEWED';
 try{originalReview=reviewR4PlannedProposal(raw).status}
 catch(e){originalReview=code(e)}
 let whatIfStatus='SKIPPED_NO_UNAMBIGUOUS_CUT_MATERIAL_ONLY';
 let whatIfReview=null,cloneStructureSha256=null;
 let spatialZoneOccupancy=[],compiledVoxelCount=null,declaredPlanReview=null;
 if(parsed&&obj(parsed.design)&&Array.isArray(parsed.design.elements)&&
  invalidCuts.length>0&&invalidAdds.length===0){
  const clone=structuredClone(parsed);
  for(const cut of invalidCuts)delete clone.design.elements[cut.index].material;
  // Never write this clone to disk; it is not a model output or a
  // legitimate accepted revision of the model-authored source.
  cloneStructureSha256=hash(JSON.stringify(clone));
  try{
   const compiled=compileDesign(clone.design);
   if(!verifyCompiled(clone.design,compiled))
    throw Error('B143_SOURCE_INTEGRITY');
   compiledVoxelCount=compiled.primitives.length;
   spatialZoneOccupancy=zoneReview(compiled,clone.spatialPlan);
   try{
    const review=reviewR4PlannedProposal(clone);
    whatIfReview=review.status;
    declaredPlanReview=review.declaredPlanReview?.status??null;
   }catch(e){
    whatIfReview=code(e);
   }
   whatIfStatus='SIMULATED_COMPILED_NOT_AN_ACCEPTED_ORIGINAL';
  }catch(e){
   whatIfStatus='SIMULATED_COMPILE_HOLD';
   whatIfReview=code(e);
  }
 }
 if(raw!==originalBefore||hash(raw)!==rawSha256)
  throw Error('B198ZR26_ORIGINAL_MUTATION_DETECTED');
 return {
  schema:SCHEMA,rawSha256,rawUtf8Bytes:Buffer.byteLength(raw),
  sourceElements:elements.length,
  exactFourKeys:staticAudit.exactFourKeyJsonParseable,
  originalReview,originalAlreadyB143Certified:false,
  invalidCutMaterialElements:invalidCuts,
  invalidAddMaterialElements:invalidAdds,
  otherStaticCriticalFindings:staticAudit.criticalSourceFindings.filter(
   f=>!['CUT_MUST_OMIT_MATERIAL',
        'ADD_MATERIAL_MISSING_OR_INVALID'].includes(f.code)),
  architecturalAdvisories:staticAudit.advisoryArchitecturalFindings,
  whatIf:{
   status:whatIfStatus,
   transformationsOnlyRemoveMaterialFromCut:invalidCuts.length>0&&
    invalidAdds.length===0,
   transformationCount:whatIfStatus.startsWith('SIMULATED')?
    invalidCuts.length:0,
   hypotheticalCloneSha256:cloneStructureSha256,
   strictB143SimulatedVoxelCount:compiledVoxelCount,
   simulatedR4ReviewStatus:whatIfReview,
   modelDeclaredSpatialReviewStatus:declaredPlanReview,
   exactFinalVoxelZoneOccupancy:spatialZoneOccupancy,
   simulatedSourceNeverPersisted:true,
   neverEligibleForConstructionOrQualityApproval:true,
   actualOriginalIsStillInvalid:originalReview!==
    'SOURCE_AND_DECLARED_SPATIAL_CLAIMS_FORMALLY_PASS'
  },
  attribution:{
   modelAuthorshipIndependentlyAuthenticated:false,
   originalRawReadOnly:true,originalShaVerified:true,
   modelRequests:0,automaticRetries:0,worldContacts:0,worldWrites:0,
   noActualSourceRepairApproved:true,
   humanArchitecturalReviewRequired:true
  },
  sourceQuality:'HOLD_UNLESS_SEPARATELY_VERIFIED',
  safety:safe()
 };
}
export function writeR26OriginalWhatIf({
 rawPath,expectedSha256,outPath
}={}){
 if(![rawPath,outPath].every(p=>typeof p==='string'&&p.length>0))
  throw Error('B198ZR26_PATH_REQUIRED');
 const input=path.resolve(rawPath),output=path.resolve(outPath);
 if(input===output)throw Error('B198ZR26_NO_SOURCE_OVERWRITE');
 if(fs.existsSync(output))throw Error('B198ZR26_NEW_REPORT_ONLY');
 const raw=fs.readFileSync(input,'utf8');
 const report=analyzeR26Original(raw,{expectedSha256});
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 return report;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2);
  if(args.length!==6||args[0]!=='--raw'||args[2]!=='--sha256'||
    args[4]!=='--out')
   throw Error('B198ZR26_ARGS_RAW_SHA_OUT_REQUIRED');
  const r=writeR26OriginalWhatIf({
   rawPath:args[1],expectedSha256:args[3],outPath:args[5]});
  console.log('R26_READ_ONLY_FORENSIC_REPORT',JSON.stringify({
   sourceElements:r.sourceElements,originalReview:r.originalReview,
   invalidCuts:r.invalidCutMaterialElements.length,
   invalidAdds:r.invalidAddMaterialElements.length,
   whatIfStatus:r.whatIf.status,
   originalSha256:r.rawSha256,modelCalls:0,worldWrites:0}));
 }catch(e){
  console.error('R26_HOLD',code(e));
  process.exitCode=2;
 }
}
