/** B53 read-only visual-review compiler. Produces only LOCAL masks and GRAPHIC markers.
 * Absolutely no placement, world transform, material IDs, runtime, scanning, or commands.
 */
import {createHash} from 'node:crypto';
import {verifyB52} from '../../b52/main/compile-b52.mjs';
import {validateSafety} from '../../b50/main/compile-b50.mjs';
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const fail=s=>{throw Error('B53_'+s)};
const roles=new Set(['WINDOW_VISUAL_ONLY','FIN_GRAPHIC_ONLY','UNASSIGNED_FACADE_EDGE']);
const faces=new Set(['N','S','E','W']);
const safeInt=x=>Number.isSafeInteger(x)&&x>=0;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function rectReview(rects,w,d,want){
 if(!Array.isArray(rects))fail('RECTANGLES');
 const occupied=new Set(),out=[];
 for(const r of rects){
  if(![r.x,r.z,r.width,r.depth].every(safeInt)||!r.width||!r.depth||
   r.x+r.width>w||r.z+r.depth>d)fail('OUT_OF_BOUNDS');
  out.push({x:r.x,z:r.z,width:r.width,depth:r.depth});
  for(let z=r.z;z<r.z+r.depth;z++)for(let x=r.x;x<r.x+r.width;x++){
   const k=z*w+x;if(occupied.has(k))fail('OVERLAP');occupied.add(k);
  }
 }
 if(occupied.size!==want)fail('CELL_COVERAGE');
 return out;
}
function visualStrips(b51){
 const groups=new Map(),floorCounts=Array(6).fill(0);let baseChanged=0;
 let patchedMarkers=0,smoothedChanges=0;
 for(const stack of b51.facadeRhythm.columnStacks){
  const parts=stack.localWallColumn.split('/');
  if(parts.length!==3||!faces.has(parts[0])||
   ![parts[1],parts[2]].every(s=>/^\d+$/.test(s)))fail('FACADE_COLUMN');
  const [face,fixed,t]=[parts[0],Number(parts[1]),Number(parts[2])];
  const key=`${face}/${fixed}`;
  const levels=Array(6).fill(null);
  for(const s of stack.segments){
   if(!roles.has(s.role)||!['OUTER_FOOTPRINT_EDGE','ENCLOSED_VOID_EDGE'].includes(s.edgeClass)||
    !Number.isSafeInteger(s.from)||!Number.isSafeInteger(s.to)||s.from<1||s.to>6||s.from>s.to)fail('ROLE_SEGMENT');
   for(let i=s.from;i<=s.to;i++){
    if(levels[i-1])fail('DUPLICATE_FACADE_CELL');
    levels[i-1]={role:s.role,edgeClass:s.edgeClass};floorCounts[i-1]++;
   }
  }
  for(let i=1;i<6;i++)if(levels[i]&&levels[i-1]&&(
   levels[i].role!==levels[i-1].role||levels[i].edgeClass!==levels[i-1].edgeClass))baseChanged++;
  const suggested=levels.map(v=>v?{...v}:null);
  // Isolated graphic-role flips only: geometry class and both neighbors must match.
  // Uses unmodified originals, so consecutive updates cannot propagate.
  let lastPatched=-10;
  for(let i=1;i<5;i++){
   if(i-lastPatched<2)continue;
   const a=levels[i-1],b=levels[i],c=levels[i+1];
   if(a&&b&&c&&a.edgeClass===b.edgeClass&&b.edgeClass===c.edgeClass&&
    a.role===c.role&&a.role!==b.role){suggested[i]={...b,role:a.role};patchedMarkers++;lastPatched=i;}
  }
  for(let i=1;i<6;i++)if(suggested[i]&&suggested[i-1]&&(
   suggested[i].role!==suggested[i-1].role||suggested[i].edgeClass!==suggested[i-1].edgeClass))smoothedChanges++;
  if(!groups.has(key))groups.set(key,{face,fixed,columns:[]});
  groups.get(key).columns.push({localT:t,original:levels.map(x=>x?.role??null),
   overlay:suggested.map(x=>x?.role??null),edgeClasses:levels.map(x=>x?.edgeClass??null)});
 }
 if(floorCounts.reduce((a,b)=>a+b,0)!==b51.facadeRhythm.sourceVisualUnits||
  baseChanged!==b51.facadeRhythm.changedGraphicAdjacentPairs)fail('FACADE_SOURCE_COUNTS');
 const strips=[...groups.values()].sort((a,b)=>a.face.localeCompare(b.face)||a.fixed-b.fixed);
 for(const s of strips){
  s.columns.sort((a,b)=>a.localT-b.localT);
  for(let i=1;i<s.columns.length;i++)if(s.columns[i].localT===s.columns[i-1].localT)fail('DUPLICATE_STRIP_COLUMN');
 }
 return {strips,originalGraphicTransitions:baseChanged,previewGraphicTransitions:smoothedChanges,
  isolatedGraphicCellsSuggested:patchedMarkers,sourceFloorVisualUnits:floorCounts,
  previewOnly:true,originalMarkersPreserved:true,physicalWindowsVerified:false};
}
export function compileB53(b52,b51,b50,b49,b48,b47,b46,b45,structure,main,evidence){
 verifyB52(b52,b51,b50,b49,b48,b47,b46,b45,structure,main,evidence);
 validateSafety(b52);
 if(b52.buildings.length!==5||b48.buildings.length!==5||b51.buildings.length!==5)fail('BUILDINGS');
 const buildings=[];
 for(let i=0;i<5;i++){
  const p=b52.buildings[i],g=b48.buildings[i],r=b51.buildings[i];
  if(p.id!==g.id||p.id!==r.id||p.program!==g.program||p.program!==r.program||g.levels.length!==6)fail('BUILDING_ID');
  const w=g.selection.site.width,d=g.selection.site.depth;
  if(![w,d].every(safeInt)||w>48||d>40||!w||!d)fail('SITE');
  const floors=g.levels.map((f,index)=>{
   if(f.level!==index+1)fail('LEVEL_SEQUENCE');
   return {level:f.level,siteLocalWidth:w,siteLocalDepth:d,
    floor:rectReview(f.canonical.floorRectangles,w,d,f.geometry.floorCells),
    roof:rectReview(f.canonical.roofRectangles,w,d,f.geometry.roofCells),
    floorCells:f.geometry.floorCells,roofCells:f.geometry.roofCells};
  });
  const facade=visualStrips(r);
  for(let level=0;level<6;level++)if(facade.sourceFloorVisualUnits[level]!==g.levels[level].geometry.facadeEdgeUnits)fail('EDGE_DRIFT');
  const variants=p.variants.map(v=>{
   if(v.approved!==false||v.entry.physicalPassageVerified!==false||
    v.roof.verifiedPhysicalSupport!==false||v.physicalSafetyVerified!==false)fail('VARIANT_UNSAFE');
   return {profile:v.profile,entry:{start:v.entry.start,endInclusive:v.entry.endInclusive,
    frontFixed:g.entranceSurfaceCandidate?.fixed??null,frontFace:'N',
    facadeGraphicOverlaps:v.entry.facadeGraphicOverlaps,verifiedPhysicalPassage:false},
    rooftop:{x:v.roof.x,z:v.roof.z,width:v.roof.width,depth:v.roof.depth,
     bufferRadius:v.roof.roofEdgeBufferRadius,verifiedPhysicalSupport:false},
    reviewFlags:[...v.reviewFlags],approved:false,sameLocalPositionsAs:v.sameLocalPositionsAs};
  });
  if(variants.length!==3)fail('VARIANTS');
  buildings.push({id:p.id,program:p.program,source:{b48BuildingSha256:p.evidence.b48BuildingSha256,
   b51BuildingSha256:p.evidence.b51BuildingSha256,b52BuildingSha256:sha(p)},
   localSite:{width:w,depth:d,floors:6},floorPlans:floors,facade,variants,
   previewOnly:true,actualFacadeGeometry:false,designApproved:false,
   productionPlannerParity:'UNVERIFIED'});
 }
 const totals={buildings:buildings.length,levels:buildings.reduce((n,b)=>n+b.floorPlans.length,0),
  floorCells:buildings.reduce((n,b)=>n+b.floorPlans.reduce((m,f)=>m+f.floorCells,0),0),
  roofCells:buildings.reduce((n,b)=>n+b.floorPlans.reduce((m,f)=>m+f.roofCells,0),0),
  facadeVisualEdges:buildings.reduce((n,b)=>n+b.facade.sourceFloorVisualUnits.reduce((x,y)=>x+y,0),0),
  originalGraphicTransitions:buildings.reduce((n,b)=>n+b.facade.originalGraphicTransitions,0),
  previewGraphicTransitions:buildings.reduce((n,b)=>n+b.facade.previewGraphicTransitions,0),
  isolatedGraphicCellsSuggested:buildings.reduce((n,b)=>n+b.facade.isolatedGraphicCellsSuggested,0),
  designVariants:buildings.reduce((n,b)=>n+b.variants.length,0),
  physicalConstructionOperations:0,scans:0,plannerRuntimeCalls:0};
 if(totals.levels!==30||totals.floorCells!==b48.totals.floorCells||
  totals.roofCells!==b48.totals.roofCells||totals.facadeVisualEdges!==3022||
  totals.originalGraphicTransitions!==1807||totals.designVariants!==15||
  totals.previewGraphicTransitions>totals.originalGraphicTransitions)fail('TOTALS');
 const body={schema:'minecraftaibuilder-b53-offline-visual-comparison-v1',
  kind:'LOCAL_GRAPHIC_ARCHITECTURE_REVIEW_NO_CONSTRUCTION',
  provenance:{b52ReportSha256:b52.reportSha256,b51ReportSha256:b51.reportSha256,
   b48ReportSha256:b48.reportSha256,productionFacadeSourceAvailable:false,productionParity:'UNVERIFIED'},
  buildings,totals,
  warnings:['LOCAL_NOT_WORLD_COORDINATES','FACADE_COLOURS_ARE_VISUAL_MARKERS_NOT_REAL_OPENINGS',
   'RHYTHM_OVERLAY_IS_PROPOSAL_ONLY_SOURCE_UNCHANGED','ENTRANCE_AND_ROOF_FOOTPRINTS_NOT_INSTALLED',
   'NO_PHYSICAL_CLEARANCE_STRUCTURAL_LOAD_MATERIAL_OR_BLOCK_STATE_VERIFICATION'],
  readiness:'NOT_PREPARED',deployment:'BLOCKED',constructionApproved:false,
  executionAllowed:false,worldCoordinates:null,materialIds:[],engineCalls:0,
  minecraftCommands:0,scans:0,buildOperations:0,
  blockers:b52.blockers,BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,
   worldCoordinates:null,materialIds:[]}};
 return {...body,reportSha256:sha(body)};
}
export function verifyB53(report,b52,b51,b50,b49,b48,b47,b46,b45,structure,main,evidence){
 validateSafety(report);
 if(report.schema!=='minecraftaibuilder-b53-offline-visual-comparison-v1'||
  report.readiness!=='NOT_PREPARED'||report.deployment!=='BLOCKED'||
  report.executionAllowed!==false||report.constructionApproved!==false||
  report.worldCoordinates!==null||report.materialIds.length!==0||
  report.BuildPlan.operations.length!==0||report.BuildPlan.commandCount!==0||
  report.blockers.M4Gates.length!==9||report.blockers.M4Gates.some(g=>g.status!=='BLOCKED')||
  report.engineCalls!==0||report.minecraftCommands!==0||report.scans!==0||report.buildOperations!==0||
  report.provenance.productionParity!=='UNVERIFIED'||
  report.buildings.some(b=>b.designApproved!==false||b.actualFacadeGeometry!==false||
    b.variants.some(v=>v.approved!==false||v.entry.verifiedPhysicalPassage!==false||
    v.rooftop.verifiedPhysicalSupport!==false)))fail('UNSAFE_REPORT');
 const {reportSha256,...body}=report;
 if(sha(body)!==reportSha256)fail('REPORT_SHA');
 if(!same(report,compileB53(b52,b51,b50,b49,b48,b47,b46,b45,structure,main,evidence)))fail('REPLAY');
 return true;
}
