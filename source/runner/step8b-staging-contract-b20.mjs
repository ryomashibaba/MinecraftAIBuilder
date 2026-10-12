/**
 * B20: read-only, non-executable staging contract for M3 planner integration.
 * Calculates *candidate* upper-floor slab apertures and measures exact integer
 * lattice compatibility. Never turns geometry into an operation, Block ID, or
 * world-coordinate plan. Explicitly preserves all frozen originals.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {compileB18M2, readB18PinnedInput, validateB18M2} from './step8b-interior-geometry-b18.mjs';
import {buildM3ReadOnlyAdapter,validateM3Report,rotateM3LocalBox,M3_SOURCE_SHA256} from './step8b-planner-contract-m3.mjs';
import {loadB10Frozen,maskForFloor} from './step8b-interior-contract-b10.mjs';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const fail=c=>{const e=new Error('B20_'+c);e.code='B20_'+c;throw e;};
const key=p=>`${p.x},${p.z}`;
const at=(p,w)=>p.z*w+p.x;
const block={status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]};
const pad=1e-9;
const isInt=x=>Number.isSafeInteger(x);
const actualKeys=['PARTITION','DOOR','STAIR_TREAD','FLOOR_CUTOUT'];
export function measureB20IntegerLattice(bounds){
 if(!bounds||!Array.isArray(bounds.min)||!Array.isArray(bounds.max)||bounds.min.length!==3||bounds.max.length!==3||
    !bounds.min.every((x,i)=>Number.isFinite(x)&&Number.isFinite(bounds.max[i])&&x<bounds.max[i]))fail('INVALID_AABB');
 const exact=bounds.min.every(isInt)&&bounds.max.every(isInt);
 const nonIntegerAxes=['x','y','z'].filter((_,i)=>!isInt(bounds.min[i])||!isInt(bounds.max[i]));
 return {exactIntegerBoundaries:exact,nonIntegerAxes,policy:exact?'INTEGER_BOUNDARIES_ONLY_NO_EMISSION':'REJECT_LOSSY_ROUNDING',
   integerBlockPlacementVerified:false,blockStateVerified:false};
}
export function proposeB20UpperSlabAperture(route,lower,upper,upperSourceMask,dimensions){
 const {width:w,depth:d}=dimensions??{};
 if(!isInt(w)||!isInt(d)||w<1||d<1||!route||route.kind!=='HYPOTHETICAL_STAIR_RISER_ROUTE'||
  !route.routeFound||route.physicalStatus!=='NOT_VERIFIED'||route.floorAndCeilingCutouts!=='NOT_GENERATED'||
  route.lowerFloor!==lower?.id||route.upperFloor!==upper?.id||!Array.isArray(route.treads)||
  !Array.isArray(lower.localYRange)||!Array.isArray(upper.localYRange)||
  lower.localYRange[1]!==upper.localYRange[0]||
  !(Array.isArray(upperSourceMask)||upperSourceMask instanceof Uint8Array)||upperSourceMask.length!==w*d)fail('STAIR_PROVENANCE');
 const plane=upper.localYRange[0];
 if(!isInt(plane)||!route.treads.length||route.treads.length!==route.riserCount)fail('STAIR_HEIGHT');
 const loSet=new Set(lower.stairReservation.map(key)),upSet=new Set(upper.stairReservation.map(key));
 const cut=[];
 for(const tread of route.treads){
  const c=tread.cell, v=tread.nominalClearanceEnvelope;
  if(!c||!isInt(c.x)||!isInt(c.z)||c.x<0||c.z<0||c.x>=w||c.z>=d||!loSet.has(key(c))||!upSet.has(key(c))||
    !v||!Array.isArray(v.min)||!Array.isArray(v.max)||v.min.length!==3||v.max.length!==3||
    !Number.isFinite(v.min[1])||!Number.isFinite(v.max[1])||v.min[1]>=v.max[1])fail('TREAD_OUTSIDE_RESERVATION');
  // Source `plate(masks[f], base, "floor", "floor")` fills a 1-block layer at upper base.
  // A nominal stair head envelope overlapping [plane, plane+1) requires a review cutout.
  if(v.min[1]<plane+1-pad && v.max[1]>plane+pad)cut.push({x:c.x,z:c.z});
 }
 if(new Set(cut.map(key)).size!==cut.length||cut.length===0)fail('EMPTY_OR_DUPLICATE_CUTOUT');
 const inside=cut.filter(p=>!!upperSourceMask[at(p,w)]),outside=cut.filter(p=>!upperSourceMask[at(p,w)]);
 return {id:route.id,lowerFloorId:lower.id,upperFloorId:upper.id,upperSourceFloorPlateY:plane,
  openingCandidates:cut,sourcePlateCellsPotentiallyAffected:inside.length,
  candidateOutsideSourceFloorPlate:outside,cutoutMode:'CELL_MASK_REVIEW_ONLY_NO_SUBTRACTION',
  nominalHeadroomOnly:true,clearancePhysicallyTested:false,loadBearingChecked:false,
  cutoutActuallyApplied:false,roofAndFacadeInteractionVerified:false,
  sourceEngineFloorPlate:'plate(masks[f], base, "floor", "floor")',
  instructions:[],blockIds:[],worldCoordinates:null};
}
/** Review-only copy of an existing source-predicted floor mask. No plan patch. */
export function previewB20SlabMask(sourceMask, aperture, dimensions){
 const {width:w,depth:d}=dimensions??{};
 if(!isInt(w)||!isInt(d)||w<1||d<1||!(Array.isArray(sourceMask)||sourceMask instanceof Uint8Array)||
  sourceMask.length!==w*d||!aperture||aperture.cutoutMode!=='CELL_MASK_REVIEW_ONLY_NO_SUBTRACTION'||
  aperture.cutoutActuallyApplied!==false||!Array.isArray(aperture.openingCandidates)||!aperture.openingCandidates.length)fail('MASK_INPUT');
 const next=Array.from(sourceMask,x=>x?1:0),originalCount=next.reduce((a,b)=>a+b,0),visited=new Set();
 for(const p of aperture.openingCandidates){
  if(!isInt(p?.x)||!isInt(p?.z)||p.x<0||p.z<0||p.x>=w||p.z>=d||visited.has(key(p))||next[at(p,w)]!==1)fail('MASK_CUTOUT_NOT_IN_PLATE');
  visited.add(key(p));next[at(p,w)]=0;
 }
 return {originalSourcePlateCells:originalCount,retainedPreviewCells:next.reduce((a,b)=>a+b,0),
  reviewExcludedCells:visited.size,previewMask:next,onlyCopyModified:true,
  appliedToEngine:false,structuralAdequacy:'UNKNOWN',buildOperations:[]};
}
export function buildB20Staging(root){
 if(typeof root!=='string'||!root)fail('ROOT');
 const saved=JSON.parse(fs.readFileSync(path.join(root,'reports/B19_M3_READONLY_ADAPTER.json'),'utf8'));
 if(saved.schema!=='minecraftaibuilder-step8b-b19-m3-readonly-adapter-v1'||saved.provenance?.sourceVerification!=='PINNED_DISK_SOURCE_MATCH'||
    saved.BuildPlan?.status!=='NOT_PREPARED'||saved.BuildPlan?.operations?.length!==0||saved.deploymentGate!=='BLOCKED')fail('B19_UNSAFE');
 const {reportSha256,...payload}=saved;if(hash(payload)!==reportSha256)fail('B19_DIGEST');
 const m3=buildM3ReadOnlyAdapter(root);validateM3Report(m3,root);
 // Saved B19 report was produced with source snapshot attested; offline replay uses pinned hashes.
 if(JSON.stringify(saved.counts)!==JSON.stringify(m3.counts)||JSON.stringify(saved.provenance.pinnedSourceSha256)!==JSON.stringify(M3_SOURCE_SHA256))fail('B19_SOURCE_MISMATCH');
 const m2=compileB18M2(root);validateB18M2(m2,root);
 const ir=readB18PinnedInput(root);
 const {b7}=loadB10Frozen(root);
 const model=new Map(m2.buildings.map(b=>[b.id,b]));
 const b17=new Map(ir.buildings.map(b=>[b.id,b]));
 const frozen=new Map(b7.candidates.map(c=>[`${c.program}/${c.id}`,c]));
 let nominalCutCells=0,cutCellsOutside=0,integerAlignedVolumes=0,nonIntegerVolumes=0,panels=0,openings=0;
 const projects=[];
 for(const [id,b] of model){
  const bi=b17.get(id),c=frozen.get(id);
  if(!bi||!c||bi.floors.length!==b.floors.length||b.floors.length!==c.dimensions.floors)fail('BASELINE_CANDIDATE');
  const byFloor=new Map(bi.floors.map(f=>[f.id,f]));
  const cutouts=b.stairRoutes.map(r=>{
   const low=byFloor.get(r.lowerFloor),up=byFloor.get(r.upperFloor);
   if(!low||!up||!isInt(up.level)||up.level<2||up.level>b.floors.length)fail('STAIR_LEVEL');
   const predicted=maskForFloor(c.sourcePredictedRectangles,b.dimensions.width,b.dimensions.depth,up.level-1);
   const a=proposeB20UpperSlabAperture(r,low,up,predicted,b.dimensions);
   nominalCutCells+=a.openingCandidates.length;cutCellsOutside+=a.candidateOutsideSourceFloorPlate.length;return a;
  });
  const latticeCounts={exactIntegerBoundaryVolumes:0,requiresExplicitRedesignVolumes:0};
  let nonIntegerExample=null;
  for(const floor of b.floors){
   panels+=floor.partitions.length;openings+=floor.openings.length;
   for(const partition of floor.partitions){
    if(partition.modelOnly!==true||!Array.isArray(partition.solids))fail('UNSAFE_PANEL');
    for(const solid of partition.solids){
     const rotated=rotateM3LocalBox(solid.bounds,b.dimensions,c.orientation);
     const feasibility=measureB20IntegerLattice(rotated);
     if(feasibility.exactIntegerBoundaries){integerAlignedVolumes++;latticeCounts.exactIntegerBoundaryVolumes++;}
     else {nonIntegerVolumes++;latticeCounts.requiresExplicitRedesignVolumes++;nonIntegerExample??={panelId:partition.id,role:solid.role,nonIntegerAxes:feasibility.nonIntegerAxes};}
    }
   }
  }
  projects.push({id,orientation:c.orientation,cutouts,stageOnly:true,quantization:{...latticeCounts,nonIntegerExample,
    policy:'EXACT_INTEGER_ENDPOINTS_ONLY; NO FLOOR/CEIL/ROUND EMISSION',
    doorAndWallDiscretization:'UNRESOLVED',stairShapeBlockMapping:'UNRESOLVED'},
   localToWorldAnchor:'UNKNOWN',sourcePredictedFootprintOnly:true});
 }
 if(projects.length!==5||panels!==5704||openings!==314||nominalCutCells<25)fail('COUNTS');
 const materialContracts=actualKeys.map(role=>({role,minecraftEducationBlockId:null,blockStates:null,
  sourceAllowlistVerified:false,roleMappingVerified:false,status:'MATERIAL_UNKNOWN_BLOCKED'}));
 const blockers=[
  'SINGLE_SOURCE_ENGINE_PLANNER_HOOK_NOT_IMPLEMENTED','SOURCE_FLOOR_PLATES_NOT_SUBTRACTED',
  'STAIR_STRUCTURAL_SUPPORT_AND_HEADROOM_UNVERIFIED','INTEGER_LATTICE_GEOMETRY_UNRESOLVED',
  'MATERIAL_AND_BLOCK_STATES_UNATTESTED','WORLD_ANCHOR_AND_SITE_SCAN_MISSING',
  'OFFICE02_FOOTPRINT_MISMATCH_NOT_APPLIED','RUNNING_WINDOWS_ENGINE_NOT_ATTESTED',
  'LEGACY_AND_WORLD_PROTECTION_MUST_REMAIN','USER_CONSTRUCTION_APPROVAL_MISSING'
 ].map(id=>({id,status:'BLOCKED'}));
 const result={schema:'minecraftaibuilder-step8b-b20-m3-staging-v1',purpose:'MODEL_ONLY_APERTURE_AND_QUANTIZATION_FEASIBILITY',
  source:{b17BytesPinned:true,b18ReportSha256:m2.reportSha256,b19ReportSha256:saved.reportSha256,
   priorSourceVerification:saved.provenance.sourceVerification,sourceSnapshotCurrentRun:'NOT_RECHECKED'},
  counts:{buildings:projects.length,floors:30,partitionPanels:panels,nominalDoors:openings,stairInterfaces:25,
   candidateUpperFloorCutoutCells:nominalCutCells,candidateCutCellsOutsidePredictedPlate:cutCellsOutside,
   exactIntegerVolumeAabbs:integerAlignedVolumes,nonIntegerVolumeAabbs:nonIntegerVolumes},
  projects,materials:materialContracts,blockers,
  modelContract:{sourceFloorSlabThickness:'ONE_ENGINE_BLOCK_AT_NOMINAL_BASE',
   physicalSlabCutouts:false,physicalStairConstruction:false,actualHeadroomChecked:false,
   quantizationAllowed:false,materialReady:false,untrustedSourceExecution:false,engineCodeExecuted:false,
   emittedWorldOperations:0,executableSchemaProduced:false},
  M3Stage:'MODEL_ONLY_NO_ENGINE_HOOK',approval:'NOT_REQUESTED',deploymentGate:'BLOCKED',
  safety:{notPrepared:true,constructionApproved:false,executionAllowed:false,legacyModified:false,
   frozenEvidenceModified:false,existingWorldModified:false,bridgeContact:false,networkAccess:false},
  BuildPlan:{...block}};
 result.reportSha256=hash(result);return result;
}
export function validateB20Staging(report,root){
 if(report?.schema!=='minecraftaibuilder-step8b-b20-m3-staging-v1'||report.purpose!=='MODEL_ONLY_APERTURE_AND_QUANTIZATION_FEASIBILITY'||
  report.deploymentGate!=='BLOCKED'||report.approval!=='NOT_REQUESTED'||report.M3Stage!=='MODEL_ONLY_NO_ENGINE_HOOK'||
  report.BuildPlan?.status!=='NOT_PREPARED'||report.BuildPlan?.commandCount!==0||
  report.BuildPlan?.operations?.length!==0||report.BuildPlan?.worldCoordinates!==null||report.BuildPlan?.materialIds?.length!==0||
  report.safety?.notPrepared!==true||report.safety?.constructionApproved!==false||report.safety?.executionAllowed!==false||
  report.safety?.existingWorldModified!==false||report.safety?.legacyModified!==false||report.safety?.frozenEvidenceModified!==false||
  report.safety?.bridgeContact!==false||report.safety?.networkAccess!==false||
  report.modelContract?.engineCodeExecuted!==false||report.modelContract?.quantizationAllowed!==false||
  report.modelContract?.physicalSlabCutouts!==false||report.modelContract?.executableSchemaProduced!==false||
  report.materials?.length!==4||report.materials.some(m=>m.minecraftEducationBlockId!==null||m.blockStates!==null||m.sourceAllowlistVerified!==false)||
  report.blockers?.length!==10||report.blockers.some(x=>x.status!=='BLOCKED')||
  report.projects?.length!==5||report.projects.some(p=>p.stageOnly!==true||p.quantization.policy!=='EXACT_INTEGER_ENDPOINTS_ONLY; NO FLOOR/CEIL/ROUND EMISSION'||p.cutouts.some(c=>c.cutoutActuallyApplied!==false||c.instructions.length)))fail('UNSAFE_REPORT');
 const {reportSha256,...data}=report;
 if(hash(data)!==reportSha256)fail('DIGEST');
 if(hash(buildB20Staging(root))!==hash(report))fail('RECOMPUTED_MISMATCH');
 return true;
}
