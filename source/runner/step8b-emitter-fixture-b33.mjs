/** B33: pinned pure envelope fixture; no engine / planner / Bridge / BuildPlan execution. */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { rectangles, edges } from '../dev/pinned-building-envelope.B33.mjs';
import { validateFloorSeamB32, selectFloorMaskB32 } from './step8b-floor-seam-b32.mjs';
const sha=x=>createHash('sha256').update(Buffer.isBuffer(x)?x:typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const fail=code=>{throw Object.assign(new Error(`B33_${code}`),{code:`B33_${code}`});};
const BASELINE_MANIFEST_SHA='bfc6e5da707d60994d85af38311e64e5f302b2dfeaa73e00487ba6eb303912ef';
const ENVELOPE_SHA='c63037c51937b0e5ec03b17274452bf1771fe47f8fe01dcececda6a8508766a0';
const NEIGHBORS=[[1,0],[-1,0],[0,1],[0,-1]];
const count=x=>x.reduce((t,r)=>t+r.filter(Boolean).length,0);
const maskDigest=mask=>sha(mask.map(row=>row.map(x=>x?1:0).join('')).join('|'));
const key=(x,z)=>`${x},${z}`;
function safeRead(root,rel){
 if(typeof root!=='string'||typeof rel!=='string'||!/^[-\w./]+$/.test(rel)||rel.split('/').includes('..'))fail('UNSAFE_PATH');
 const p=path.join(root,rel);let st;
 try{st=fs.lstatSync(p);}catch{fail('MISSING_INPUT');}
 if(!st.isFile()||st.isSymbolicLink())fail('UNSAFE_FILE');
 return fs.readFileSync(p);
}
export function verifyB32Frozen(root){
 const raw=safeRead(root,'B32_FILE_SHA256.json');
 if(sha(raw)!==BASELINE_MANIFEST_SHA)fail('FROZEN_MANIFEST_TAMPERED');
 const m=JSON.parse(raw.toString());
 if(m.schema!=='minecraftaibuilder-b32-floor-seam-manifest-v1'||m.fileCount!==566||Object.keys(m.files??{}).length!==566)fail('FROZEN_COUNT');
 for(const [p,h] of Object.entries(m.files))if(!/^[a-f0-9]{64}$/.test(h)||sha(safeRead(root,p))!==h)fail('FROZEN_FILE_TAMPERED');
 if(sha(safeRead(root,'dev/pinned-building-envelope.B33.mjs'))!==ENVELOPE_SHA)fail('ENVELOPE_CHANGED');
 return m.fileCount;
}
function assertMask(mask){
 if(!Array.isArray(mask)||!mask.length||mask.length>64||!Array.isArray(mask[0])||mask[0].length<1||mask[0].length>64||
  mask.some(row=>!Array.isArray(row)||row.length!==mask[0].length||row.some(v=>typeof v!=='boolean')))fail('MASK_INVALID');
}
export function decomposeFloorMaskB33(mask){
 assertMask(mask);
 const raw=rectangles(mask),h=mask.length,w=mask[0].length;
 const replay=Array.from({length:h},()=>Array(w).fill(false));
 let cells=0;
 for(const r of raw){
  if(![r.x,r.z,r.width,r.depth].every(Number.isSafeInteger)||r.width<1||r.depth<1||r.x<0||r.z<0||r.x+r.width>w||r.z+r.depth>h)fail('RECTANGLE_OUTSIDE');
  for(let z=r.z;z<r.z+r.depth;z++)for(let x=r.x;x<r.x+r.width;x++){
   if(replay[z][x]||!mask[z][x])fail('RECTANGLE_OVERLAP_OR_INVALID');
   replay[z][x]=true;cells++;
  }
 }
 if(cells!==count(mask)||JSON.stringify(replay)!==JSON.stringify(mask))fail('RECTANGLE_COVERAGE');
 return {rectangles:raw,rectangleCount:raw.length,cells,coverageExact:true,overlaps:0};
}
export function classifyFootprintVoids(mask){
 assertMask(mask);
 const h=mask.length,w=mask[0].length, seen=new Set(), queue=[];
 // Treat the exterior grid beyond the image as open air. Boundary-connected
 // empty cells are outside; remaining empties are closed cavities/courtyards.
 for(let z=0;z<h;z++)for(let x=0;x<w;x++)if(!mask[z][x]&&(x===0||z===0||x===w-1||z===h-1)){let k=key(x,z);if(!seen.has(k)){seen.add(k);queue.push([x,z]);}}
 for(let i=0;i<queue.length;i++)for(const [dx,dz] of NEIGHBORS){
  const [x,z]=[queue[i][0]+dx,queue[i][1]+dz],k=key(x,z);
  if(x>=0&&x<w&&z>=0&&z<h&&!mask[z][x]&&!seen.has(k)){seen.add(k);queue.push([x,z]);}
 }
 const classify=(x,z)=>{
  if(!Number.isSafeInteger(x)||!Number.isSafeInteger(z)||x<0||z<0||x>=w||z>=h||!mask[z][x])fail('INVALID_CUTOUT_CELL');
  const adjacent=NEIGHBORS.flatMap(([dx,dz])=>{
   const xx=x+dx,zz=z+dz;
   if(xx<0||zz<0||xx>=w||zz>=h)return ['EXTERIOR_EDGE'];
   if(!mask[zz][xx])return [seen.has(key(xx,zz))?'BOUNDARY_CONNECTED_VOID':'ENCLOSED_VOID'];
   return [];
  });
  return adjacent.length? (adjacent.some(v=>v!=='ENCLOSED_VOID')?'EXTERIOR_ADJACENT':'ENCLOSED_VOID_ADJACENT'):'FOOTPRINT_INTERIOR';
 };
 return {externalVoidCells:seen.size,enclosedVoidCells:h*w-count(mask)-seen.size,classify};
}
function holeRows(f){
 if(!Number.isSafeInteger(f.width)||!Number.isSafeInteger(f.depth)||f.width<1||f.depth<1||f.overlayRows?.length!==f.depth||f.floorPlateEmitterInputModified!==false||f.physicalFloorCut!==false||f.overlayRows.some(row=>typeof row!=='string'||row.length!==f.width||!/^[#.o]+$/.test(row)))fail('FLOOR_ROWS');
 const original=f.overlayRows.map(row=>[...row].map(c=>c!==' '&&c!=='.'));
 const holes=[];
 for(let z=0;z<f.depth;z++)for(let x=0;x<f.width;x++)if(f.overlayRows[z][x]==='o')holes.push({x,z});
 return {original,holes};
}
function translatedCandidates(building,limit=6){
 if(building.id!=='apartment/candidate-01')return [];
 const levels=building.floors.slice(1), offsets=[[0,1],[0,2],[-1,1],[1,1],[0,-1],[-1,0],[1,0]];
 const proposals=[];
 for(const [dx,dz] of offsets){
  const floors=[];let valid=true,near=0,doorOverlap=0;
  for(const f of levels){
   const {original,holes}=holeRows(f);const doors=new Set(f.doors.map(d=>key(d.localLower.x,d.localLower.z)));
   const h=original.length,w=original[0].length;
   const ps=holes.map(p=>({x:p.x+dx,z:p.z+dz}));
   if(ps.some(p=>p.x<0||p.z<0||p.x>=w||p.z>=h||!original[p.z][p.x])){valid=false;break;}
   const voids=classifyFootprintVoids(original);
   near+=ps.filter(p=>voids.classify(p.x,p.z)!=='FOOTPRINT_INTERIOR').length;
   doorOverlap+=ps.filter(p=>doors.has(key(p.x,p.z))).length;
   floors.push({level:f.level,cells:ps});
  }
  if(!valid||doorOverlap)continue;
  if(floors.some(f=>JSON.stringify(f.cells)!==JSON.stringify(floors[0].cells)))fail('VERTICAL_SHIFT_MISMATCH');
  proposals.push({offset:{dx,dz},levels:floors,edgeAdjacentCells:near,doorPortOverlaps:doorOverlap,
   requiresStairShaftRelocation:true,requiresCorridorAccessRedesign:true,physicalSupportVerified:false,
   headroomVerified:false,reviewStatus:'HOLD_NOT_APPROVED',autoApplied:false});
 }
 return proposals.sort((a,b)=>a.edgeAdjacentCells-b.edgeAdjacentCells||
     Math.abs(a.offset.dx)+Math.abs(a.offset.dz)-Math.abs(b.offset.dx)-Math.abs(b.offset.dz)||a.offset.dx-b.offset.dx).slice(0,limit);
}
function withoutHash(x){let {reportSha256,...rest}=x;return rest;}
export function compileEmitterFixtureB33(b32,b31){
 if(b32?.schema!=='minecraftaibuilder-step8b-b32-floor-seam-v1'||b32.readiness!=='NOT_PREPARED'||b32.deployment!=='BLOCKED'||b32.BuildPlan?.operations?.length!==0||b32.safety?.constructionApproved!==false||b32.totals?.candidateCutoutCells!==50||b32.totals?.sourceFloorCells!==12778||b32.totals?.selectedFloorCells!==12728)fail('BASELINE_UNSAFE');
 if(b31?.schema!=='minecraftaibuilder-step8b-b31-inert-floor-door-contract-v1'||b31.buildings?.length!==5||b31.BuildPlan?.operations?.length!==0)fail('IR_UNSAFE');
 const buildings=[];let before=0,after=0,allHoleCells=0,rectangleSource=0,rectangleCandidate=0,externalAdj=0,enclosedAdj=0,near=0,unapproved=0;
 for(const old of b32.buildings){
  const raw=b31.buildings.find(b=>b.id===old.id);if(!raw||raw.floors.length!==old.floors.length)fail('FLOOR_PAIRING');
  const floors=[];
  for(let i=0;i<raw.floors.length;i++){
   const src=raw.floors[i],f=old.floors[i],{original,holes}=holeRows(src);
   if(src.id!==f.id||src.level!==f.level||JSON.stringify(holes)!==JSON.stringify(f.cutoutCandidateCells))fail('HOLE_PROVENANCE');
   const candidate=selectFloorMaskB32(original,holes);
   if(maskDigest(original)!==f.originalFloorMaskSha256||maskDigest(candidate)!==f.candidateFloorMaskSha256)fail('MASK_PROVENANCE_SHA');
   const a=decomposeFloorMaskB33(original),b=decomposeFloorMaskB33(candidate);
   if(a.cells!==f.sourceFloorCellCount||b.cells!==f.selectedFloorCellCount||a.cells-b.cells!==holes.length)fail('FLOOR_COUNTS');
   // Compare the exact exported envelope helper's edges before/after (never emit ops).
   const originalEdges=edges(original),candidateEdges=edges(candidate);
   const v=classifyFootprintVoids(original);
   const classifications=holes.map(p=>({...p,boundary:v.classify(p.x,p.z)}));
   const roofInput=original.map((row,z)=>row.map((cell,x)=>cell&&!raw.floors[i+1]?.overlayRows?.[z]?.[x]?.match(/[\#o]/)));
   const roof=decomposeFloorMaskB33(roofInput);
   if(roof.cells!==f.untouchedExposedRoofCells||maskDigest(roofInput)!==f.untouchedExposedRoofSha256)fail('ROOF_INPUT_CHANGED');
   before+=a.cells;after+=b.cells;allHoleCells+=holes.length;rectangleSource+=a.rectangleCount;rectangleCandidate+=b.rectangleCount;
   externalAdj+=classifications.filter(p=>p.boundary==='EXTERIOR_ADJACENT').length;
   enclosedAdj+=classifications.filter(p=>p.boundary==='ENCLOSED_VOID_ADJACENT').length;
   near+=classifications.filter(p=>p.boundary!=='FOOTPRINT_INTERIOR').length;
   floors.push({id:f.id,level:f.level,width:src.width,depth:src.depth,
    inputOriginalMaskSha256:f.originalFloorMaskSha256,inputCandidateMaskSha256:f.candidateFloorMaskSha256,
    sourceRectangleCount:a.rectangleCount,candidateRectangleCount:b.rectangleCount,
    sourceRectangleSha256:sha(a.rectangles),candidateRectangleSha256:sha(b.rectangles),
    // Local symbolic rectangles from the archived pure helper, not world fills.
    sourceRectangles:a.rectangles,candidateRectangles:b.rectangles,
    reconstructedBefore:a.cells,reconstructedAfter:b.cells,coverageExact:true,noOverlaps:true,
    originalFootprintEdges:originalEdges.length,candidateFootprintEdges:candidateEdges.length,
    candidateCutouts:classifications,enclosedVoidCellCount:v.enclosedVoidCells,boundaryConnectedVoidCells:v.externalVoidCells,
    untouchedRoofRectangleCount:roof.rectangleCount,untouchedRoofCells:roof.cells,
    structuralSupportProven:false,physicalConstructionReady:false});
  }
  const options=translatedCandidates(raw);
  unapproved+=options.length;
  buildings.push({id:old.id,floors,stairCoreRelocationProposals:options});
 }
 if(before!==12778||after!==12728||allHoleCells!==50||near!==5||enclosedAdj!==5||externalAdj!==0)fail('TOTALS_OR_BOUNDARY_CLASSIFICATION');
 const data={schema:'minecraftaibuilder-step8b-b33-pure-rectangle-fixture-v1',
  kind:'PINNED_ENVELOPE_SOURCE_PURE_FIXTURE_NOT_BUILDPLAN',
  provenance:{b32ReportSha256:b32.reportSha256,archivedEnvelopeSha256:ENVELOPE_SHA,
   pinnedRectangleFunction:true,plannerImported:false,plannerInvoked:false,bridgeInvoked:false},
  buildings,totals:{buildings:5,floors:30,originalCells:before,candidateCells:after,candidateHoles:allHoleCells,
   originalRectangles:rectangleSource,candidateRectangles:rectangleCandidate,
   footprintBoundaryAdjacentCutouts:near,enclosedVoidAdjacentCutouts:enclosedAdj,exteriorAdjacentCutouts:externalAdj,
   unapprovedStairStackRelocationOptions:unapproved,rectanglesWithOverlap:0,lossOfFloorCells:0,
   roofInputChanged:0,foundationInputChanged:0,exteriorInputChanged:0,engineCalls:0,operationsEmitted:0},
  interpretation:{fiveCells:'ADJACENT_TO_ENCLOSED_INTERIOR_VOID_NOT_BOUNDARY_CONNECTED_EXTERIOR_IN_2D_FOOTPRINT',
   remainingSupportRisk:'UNRESOLVED',courtyardBoundaryPhysicalClassification:'UNVERIFIED',
   allRelocationOptions:'CONCEPT_ONLY_REQUIRES_STAIR_SHAFT_AND_ACCESS_REDESIGN',
   floorsActuallyModified:false},
  blockers:[...b32.blockers],additionalReviewGates:[...b32.additionalReviewGates,'INNER_COURTYARD_EDGE_SUPPORT_UNVERIFIED','RELOCATED_STAIR_STACK_ACCESS_UNVERIFIED'],
  readiness:'NOT_PREPARED',deployment:'BLOCKED',
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,materialIds:[],worldCoordinates:null},
  safety:{constructionApproved:false,executionAllowed:false,worldAccess:false,bridgeContact:false,
   legacyModified:false,archivedEvidenceModified:false,engineCalled:false,buildOperations:0}};
 return {...data,reportSha256:sha(data)};
}
export function buildEmitterFixtureB33(root){
 verifyB32Frozen(root);
 const b32=JSON.parse(safeRead(root,'reports/B32_FLOOR_SEAM_LEDGER.json'));
 validateFloorSeamB32(b32,root);
 const b31=JSON.parse(safeRead(root,'reports/B31_FLOOR_DOOR_OVERLAY.json'));
 return compileEmitterFixtureB33(b32,b31);
}
export function validateEmitterFixtureB33(report,root){
 if(report?.schema!=='minecraftaibuilder-step8b-b33-pure-rectangle-fixture-v1'||report.readiness!=='NOT_PREPARED'||report.deployment!=='BLOCKED'||report.BuildPlan?.operations?.length!==0||report.safety?.constructionApproved!==false||report.totals?.engineCalls!==0||report.totals?.operationsEmitted!==0||report.blockers?.length!==9)fail('REPORT_UNSAFE');
 if(sha(withoutHash(report))!==report.reportSha256)fail('REPORT_HASH');
 if(JSON.stringify(buildEmitterFixtureB33(root))!==JSON.stringify(report))fail('REGEN_MISMATCH');
 return true;
}
export function summarizeEmitterFixtureB33(r){return {schema:r.schema,kind:r.kind,provenance:r.provenance,totals:r.totals,interpretation:r.interpretation,
 blockers:r.blockers,additionalReviewGates:r.additionalReviewGates,readiness:r.readiness,deployment:r.deployment,BuildPlan:r.BuildPlan,safety:r.safety,reportSha256:r.reportSha256};}
