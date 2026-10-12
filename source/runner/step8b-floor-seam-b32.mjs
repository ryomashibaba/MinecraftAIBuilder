/**
 * B32: dev-only, fail-closed floor-emitter seam proof.
 * Reads frozen B31 artifacts and pinned planner SOURCE text; imports no engine,
 * creates no placement operations and never touches Windows or Minecraft.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {buildFloorDoorOverlayB31,validateFloorDoorOverlayB31} from './step8b-floor-door-overlay-b31.mjs';
const sha = x => createHash('sha256').update(Buffer.isBuffer(x)?x:typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const fail = c => {const e=Error(`B32_${c}`);e.code=`B32_${c}`;throw e;};
const B31_MANIFEST_SHA='9d78a0e70f48191bf49886e03d4c9f136f2dc375876c0b616b559f8cfbc18cb7';
const PLANNER_SHA='23be6e8b03827698fb890661f6fd0957a76ac4718f3347531121c8a7dc0450c8';
const EXACT_SEAM='plate(mask, base, "floor", "floor");';
const GATES=Object.freeze(Array.from({length:9},(_,i)=>`M4-${String(i+1).padStart(2,'0')}`));
function read(root,rel){
 if(typeof root!=='string'||!root||!/^[-\w./]+$/.test(rel)||rel.split('/').includes('..'))fail('PATH');
 const full=path.join(root,rel);let st;try{st=fs.lstatSync(full);}catch{fail('MISSING_FILE');}
 if(!st.isFile()||st.isSymbolicLink())fail('UNSAFE_INPUT');
 return fs.readFileSync(full);
}
/** Immutable predecessor check - all 553 files, not just report hashes. */
export function checkB31Immutable(root){
 const bytes=read(root,'B31_FILE_SHA256.json');
 if(sha(bytes)!==B31_MANIFEST_SHA)fail('BASELINE_MANIFEST_CHANGED');
 const m=JSON.parse(bytes.toString('utf8'));
 if(m.schema!=='minecraftaibuilder-b31-floor-door-checkpoint-manifest-v1'||m.fileCount!==553||Object.keys(m.files??{}).length!==553)fail('BASELINE_COUNT');
 for(const [rel,digest] of Object.entries(m.files))if(!/^[a-f0-9]{64}$/.test(digest)||sha(read(root,rel))!==digest)fail('BASELINE_FILE_CHANGED');
 return 553;
}
/** Proposed hook remains non-executable even if somebody imports the dev clone. */
export function createGuardedPlannerPrototype(source){
 if(typeof source!=='string'||sha(source)!==PLANNER_SHA)fail('PLANNER_SOURCE_NOT_PINNED');
 if(source.split(EXACT_SEAM).length!==2)fail('PLANNER_FLOOR_SEAM_CHANGED');
 const header='  fromComposition(composition, options = {}) {';
 if(source.split(header).length!==2)fail('PLANNER_ENTRY_CHANGED');
 const guard='\n    throw new Error("B32_NOT_EXECUTABLE_DEV_COPY_NO_CONSTRUCTION_AUTHORIZATION");';
 const seam='plate(b32FloorMaskSelector(mask, f), base, "floor", "floor");';
 // Intentionally NOT bound to the engine; used only to prove insertion point.
 const disabled='\n// B32 source-only seam. Intentionally disabled; no BuildPlan or engine invocation.\nconst b32FloorMaskSelector = () => { throw new Error("B32_SELECTOR_UNBOUND"); };\n';
 const result=source.replace(header,header+guard).replace(EXACT_SEAM,seam)+disabled;
 if(result.includes('B32_CONSTRUCTION_APPROVED')||result.split('B32_NOT_EXECUTABLE').length!==2)fail('DEV_COPY_UNSAFE');
 return result;
}
const key=(x,z)=>`${x},${z}`;
const digestMask=mask=>sha(mask.map(row=>row.map(x=>x?1:0).join('')).join('|'));
const count=mask=>mask.reduce((sum,row)=>sum+row.filter(Boolean).length,0);
const neighbors=[[0,-1],[1,0],[0,1],[-1,0]];
function perimeterEdges(mask){
 const h=mask.length,w=mask[0].length;let n=0;
 for(let z=0;z<h;z++)for(let x=0;x<w;x++)if(mask[z][x])for(const [dx,dz] of neighbors)if(!mask[z+dz]?.[x+dx])n++;
 return n;
}
function exposedMask(mask,next){return mask.map((row,z)=>row.map((v,x)=>!!v&&!next?.[z]?.[x]));}
function floorRowsToMasks(f){
 if(f.localFrame!=='LOCAL_XZ_INTEGER_FOOTPRINT_NOT_WORLD'||f.physicalFloorCut!==false||f.floorPlateEmitterInputModified!==false||
   !Number.isSafeInteger(f.width)||!Number.isSafeInteger(f.depth)||f.width>48||f.depth>40||
   f.overlayRows?.length!==f.depth||f.overlayRows.some(x=>typeof x!=='string'||x.length!==f.width||!/^[#.o]+$/.test(x)))fail('FLOOR_SOURCE');
 const original=f.overlayRows.map(row=>[...row].map(c=>c!=='.'));
 const proposed=f.overlayRows.map(row=>[...row].map(c=>c==='#'));
 const holePositions=[];for(let z=0;z<f.depth;z++)for(let x=0;x<f.width;x++)if(f.overlayRows[z][x]==='o')holePositions.push({x,z});
 if(count(original)!==f.originalFloorMaskCellCount||count(proposed)!==f.retainedFloorMaskCellCount||
    holePositions.length!==f.proposedCutoutCellCount||count(original)-count(proposed)!==holePositions.length)fail('FLOOR_CONSERVATION');
 return {original,proposed,holePositions};
}
/**
 * Public pure seam: returns only a boolean occupancy overlay, never commands.
 * `consumer` determines intent only; no flooring, foundation or roof operation is ever emitted.
 */
export function selectFloorMaskB32(source,holes,{consumer='floor'}={}){
 if(!['floor','foundation','roof','exterior'].includes(consumer)||!Array.isArray(source)||!source.length||
   !source.every(r=>Array.isArray(r)&&r.length===source[0].length&&r.every(v=>typeof v==='boolean')))fail('MASK_INPUT');
 if(!Array.isArray(holes))fail('HOLE_INPUT');
 const copy=source.map(row=>row.slice()), seen=new Set(),h=copy.length,w=copy[0].length;
 for(const p of holes){
  if(!p||!Number.isSafeInteger(p.x)||!Number.isSafeInteger(p.z)||p.x<0||p.z<0||p.x>=w||p.z>=h||!source[p.z][p.x]||seen.has(key(p.x,p.z)))fail('HOLE_OUTSIDE_OR_DUPLICATE');
  seen.add(key(p.x,p.z));
 }
 if(consumer==='floor')for(const p of holes)copy[p.z][p.x]=false;
 return copy;
}
export function compileFloorSeamB32(b31,source){
 if(b31?.schema!=='minecraftaibuilder-step8b-b31-inert-floor-door-contract-v1'||b31.deployment!=='BLOCKED'||
   b31.readiness!=='NOT_PREPARED'||b31.BuildPlan?.operations?.length!==0||
   b31.totals?.engineCalls!==0||b31.totals?.proposedCutoutCells!==50||
   b31.totals?.originalFloorCells!==12778||b31.totals?.doorPorts!==314||
   b31.blockers?.join(',')!==GATES.join(',')||b31.safety?.constructionApproved!==false)fail('BASELINE_GATE');
 const clone=createGuardedPlannerPrototype(source);
 const buildings=[];let sourceCells=0,selectedCells=0,cutCells=0,edgeAdjacent=0;
 for(const b of b31.buildings){
  if(b.floors?.length!==6)fail('FLOOR_COUNT');
  const arrays=b.floors.map(f=>floorRowsToMasks(f));
  const floors=[];
  for(let i=0;i<arrays.length;i++){
   const {original,proposed,holePositions}=arrays[i],f=b.floors[i];
   const selected=selectFloorMaskB32(original,holePositions);
   for(let z=0;z<selected.length;z++)for(let x=0;x<selected[z].length;x++)if(selected[z][x]!==proposed[z][x])fail('PROPOSED_REPLAY');
   const foundation=selectFloorMaskB32(original,holePositions,{consumer:'foundation'});
   const roof=selectFloorMaskB32(original,holePositions,{consumer:'roof'});
   const exterior=selectFloorMaskB32(original,holePositions,{consumer:'exterior'});
   const exposed=exposedMask(original,arrays[i+1]?.original);
   // Same source & next-floor masks are fed to all envelope consumers.
   if(digestMask(foundation)!==digestMask(original)||digestMask(roof)!==digestMask(original)||
      digestMask(exterior)!==digestMask(original)||perimeterEdges(original)!==perimeterEdges(exterior))fail('EXTERIOR_CHANGED');
   const near=[];
   for(const p of holePositions)if(neighbors.some(([dx,dz])=>!original[p.z+dz]?.[p.x+dx]))near.push(p);
   const doorCount=f.doors.length;
   if(f.doors.some(d=>d.actualFacing!==null||d.blockId!==null||d.lowerBlockStates!==null||
     d.upperBlockStates!==null||d.stateBinding!=='BLOCKED'||d.emitAllowed!==false))fail('DOOR_STATUS');
   sourceCells+=count(original);selectedCells+=count(selected);cutCells+=holePositions.length;edgeAdjacent+=near.length;
   floors.push({id:f.id,level:f.level,sourceFloorCellCount:count(original),selectedFloorCellCount:count(selected),
    cutoutCandidateCells:holePositions,nearOuterWallCutoutCandidates:near,
    originalFloorMaskSha256:digestMask(original),candidateFloorMaskSha256:digestMask(selected),
    untouchedFoundationMaskSha256:i===0?digestMask(foundation):null,
    untouchedExteriorOutlineSha256:digestMask(exterior),
    untouchedEnvelopePerimeterEdges:perimeterEdges(original),
    untouchedExposedRoofCells:count(exposed),untouchedExposedRoofSha256:digestMask(exposed),
    unchangedStructuralEnvelopeInput:true,physicalSupportValidated:false,
    doorPorts:doorCount,physicalDoorStatesValidated:0});
  }
  buildings.push({id:b.id,floors});
 }
 if(buildings.length!==5||sourceCells!==12778||selectedCells!==12728||cutCells!==50||edgeAdjacent!==5||
    sha(clone)===sha(source))fail('COUNT_OR_SEAM');
 const result={schema:'minecraftaibuilder-step8b-b32-floor-seam-v1',
  kind:'NON_EXECUTING_SOURCE_SEAM_AND_BOOLEAN_MASK_PROOF_NOT_BUILDPLAN',
  provenances:{b31Sha256:b31.reportSha256,archivedPlannerSha256:sha(source),
    inertDevCopySha256:sha(clone),engineRuntimeAttested:false,liveWorldAttested:false},
  seam:{oldExpression:EXACT_SEAM,newExpression:'plate(b32FloorMaskSelector(mask, f), base, "floor", "floor");',
    guardedDevCopy:true,plannerNotImported:true,plannerNotInvoked:true,selectorNotBoundToEngine:true,
    candidateOnly:true},
  buildings,totals:{buildings:5,floors:30,sourceFloorCells:sourceCells,selectedFloorCells:selectedCells,
    candidateCutoutCells:cutCells,nearOuterWallCandidates:edgeAdjacent,doors:314,
    foundationInputsChanged:0,roofInputsChanged:0,exteriorInputsChanged:0,parapetEnvelopeInputsChanged:0,
    physicalDoorsValidated:0,physicalStairSupportsValidated:0,engineCalls:0,operationsEmitted:0},
  blockers:[...GATES],additionalReviewGates:['EDGE_ADJACENT_FLOOR_CUTOUT_SUPPORT_UNVERIFIED','EXPOSED_ROOF_VS_INTERIOR_STAIR_HEADROOM_UNVERIFIED'],
  readiness:'NOT_PREPARED',deployment:'BLOCKED',
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,materialIds:[],worldCoordinates:null},
  safety:{constructionApproved:false,executionAllowed:false,worldAccess:false,bridgeContact:false,
    archivedSourceModified:false,legacyModified:false,engineCalled:false,buildOperations:0}};
 return {...result,reportSha256:sha(result)};
}
export function buildFloorSeamB32(root){
 checkB31Immutable(root);
 const b31=JSON.parse(read(root,'reports/B31_FLOOR_DOOR_OVERLAY.json'));
 validateFloorDoorOverlayB31(b31,root);
 const src=read(root,'dev/reference-engine-general-building-planner.js').toString('utf8');
 return compileFloorSeamB32(b31,src);
}
export function validateFloorSeamB32(report,root){
 if(report?.schema!=='minecraftaibuilder-step8b-b32-floor-seam-v1'||report.readiness!=='NOT_PREPARED'||
   report.deployment!=='BLOCKED'||report.totals?.operationsEmitted!==0||
   report.totals?.engineCalls!==0||report.BuildPlan?.operations?.length!==0||
   report.safety?.constructionApproved!==false||report.seam?.guardedDevCopy!==true||
   report.blockers?.length!==9)fail('REPORT_UNSAFE');
 const {reportSha256,...data}=report;
 if(sha(data)!==reportSha256)fail('REPORT_HASH');
 if(JSON.stringify(buildFloorSeamB32(root))!==JSON.stringify(report))fail('REGEN_MISMATCH');
 return true;
}
export function summarizeFloorSeamB32(r){
 return {schema:r.schema,kind:r.kind,provenances:r.provenances,seam:r.seam,totals:r.totals,
  blockers:r.blockers,additionalReviewGates:r.additionalReviewGates,
  readiness:r.readiness,deployment:r.deployment,BuildPlan:r.BuildPlan,safety:r.safety,reportSha256:r.reportSha256};
}
