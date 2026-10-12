/** B39: PURE OFFLINE/READ-ONLY grid-route redesign. Never an executable BuildPlan. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {validateLandingFloorHeightB38} from './step8b-landing-floor-height-b38.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const sign=x=>hash(JSON.stringify(x));
const reject=s=>{throw Object.assign(new Error('B39_'+s),{code:'B39_'+s});};
const PINS=Object.freeze({
 'B38_FILE_SHA256.json':'ffb0fa30fb9419fcea310ae8fc68082a45e298d9934c01633607796f750afacc',
 'reports/B38_LANDING_FLOOR_HEIGHT_REPORT.json':'2a544c49cacdcbaeee33078d12f0a8256284b1ee909e8647018a9c76ba614f5b',
 'reports/B35_CORRIDOR_REDESIGN_REPORT.json':'2d7cc85ffdf882013db1b932daabd47bc9ec720836974b814d88c0ab4076350c',
 'reports/B21_BLOCKSCALE_REVIEW.json':'2d7b1e3d71f252331dfe35e600411acc3354c43702e5b3db9fd9a5e0533932bc',
 'reports/B17_INTERIOR_INTEGRATION_IR.json':'e04e8ca2789bd8b65548a10e98e940e9537a562ebbf38a63e456ac9b73fb425d',
 'reports/B31_FLOOR_DOOR_OVERLAY.json':'6d233d5ad09b8138650f65d46e0cf2d2ab143577d3862696b562a3857545c430',
});
const point=p=>`${p.x},${p.z}`;
const toPoint=k=>{const [x,z]=k.split(',').map(Number);return {x,z};};
const distance=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.z-b.z);
const neigh=p=>[{x:p.x-1,z:p.z},{x:p.x+1,z:p.z},{x:p.x,z:p.z-1},{x:p.x,z:p.z+1}];
const int=n=>Number.isSafeInteger(n);
const unique=(a,w,d)=>{
 if(!Array.isArray(a)||a.some(p=>!p||!int(p.x)||!int(p.z)||p.x<0||p.z<0||p.x>=w||p.z>=d))reject('INVALID_CELLS');
 const s=new Set(a.map(point));if(s.size!==a.length)reject('DUPLICATE_CELL');return s;
};
function pinned(root,rel){
 if(typeof root!=='string'||!root||!(rel in PINS))reject('SOURCE');
 const f=path.join(root,rel),st=fs.lstatSync(f);if(st.isSymbolicLink()||!st.isFile())reject('SOURCE_TYPE');
 const bytes=fs.readFileSync(f);if(hash(bytes)!==PINS[rel])reject('PIN_'+rel.replace(/[^\w]/g,'_'));
 return JSON.parse(bytes.toString('utf8'));
}
/** Pure local four-rise candidate search. A flat approach is NON-rising, then four rising treads. */
export function evaluateStairRouteB39({width,depth,lowerHall,shaft,upperRows,upperCutout,landing,entrance,
 nominalLowerY,nominalUpperY,wallVoxels=[]}){
 if(!int(width)||!int(depth)||width<6||depth<6||width>64||depth>64||
 !int(nominalLowerY)||!int(nominalUpperY)||nominalLowerY<0||nominalUpperY-nominalLowerY!==4||
 !Array.isArray(upperRows)||upperRows.length!==depth||upperRows.some(r=>typeof r!=='string'||r.length!==width||!/^[#.o]+$/.test(r)))reject('GRID');
 const hall=unique(lowerHall,width,depth),sh=unique(shaft,width,depth),cut=unique(upperCutout,width,depth),pad=unique(landing,width,depth);
 if(cut.size!==2||pad.size!==4||sh.size!==9||!entrance||!pad.has(point(entrance))||
 [...cut].some(k=>pad.has(k)||upperRows[toPoint(k).z][toPoint(k).x]!=='o')||
 [...pad].some(k=>upperRows[toPoint(k).z][toPoint(k).x]!=='#'))reject('FOOTPRINT');
 if(!Array.isArray(wallVoxels)||wallVoxels.length>10000||wallVoxels.some(v=>
 !v||![v.x,v.y,v.z].every(int)||v.x<0||v.x>=width||v.z<0||v.z>=depth))reject('WALL_VOXELS');
 const wall=new Set(wallVoxels.map(v=>`${v.x},${v.y},${v.z}`));
 const options=[];
 for(const start of [...sh].sort()){
  const lead=toPoint(start);
  if(!neigh(lead).some(q=>hall.has(point(q))))continue;
  if([nominalLowerY,nominalLowerY+1,nominalLowerY+2].some(y=>wall.has(`${lead.x},${y},${lead.z}`)))continue;
  for(const first of neigh(lead).filter(q=>sh.has(point(q))&&!hall.has(point(q)))){
   const walk=(path)=>{
    if(path.length===4){
     const last=path[3];
     if(distance(last,entrance)!==1||!cut.has(point(last))||!cut.has(point(path[2])))return;
     const heads=path.flatMap((v,i)=>[1,2].map(t=>({x:v.x,y:nominalLowerY+i+t,z:v.z})));
     const occupied=path.map((v,i)=>({...v,y:nominalLowerY+i}));
     // Headspace above the upper floor plate MUST pass through the cutout.
     if(heads.some(v=>v.y>=nominalUpperY&&upperRows[v.z][v.x]!=='o'))return;
     const intersects=occupied.concat(heads).filter(v=>wall.has(`${v.x},${v.y},${v.z}`));
     if(intersects.length)return;
     options.push({flatLeadIn:lead,treads:occupied,topLandingEntry:{...entrance},
      nominalHeadspace:heads,nominalWallVoxelIntersections:0,
      cutoutHeadspaceCoverageExact:true,lowerHallEdgeContact:true,topPadEdgeContact:true,
      installedHeadroomCertified:false,installedWallJointsCertified:false,
      installedSupportCertified:false,constructionApproved:false});return;
    }
    for(const next of neigh(path.at(-1))){if(!sh.has(point(next))||path.some(p=>point(p)===point(next)))continue;
     walk([...path,next]);}
   };
   walk([first]);
  }
 }
 // Ranking is stable and only for REVIEW; no option is ever adopted automatically.
 options.sort((a,b)=>{
  const str=x=>[point(x.flatLeadIn),...x.treads.map(point)].join('|');return str(a).localeCompare(str(b));
 });
 return {candidateCount:options.length,candidates:options,
  result:options.length?'NOMINAL_ROUTE_FOUND_NOT_CONSTRUCTIBLE':'NO_SAFE_NOMINAL_CANDIDATE',
  certifiedPhysicalRoutes:0,automaticAdoptions:0};
}
export function buildB39(root){
 const manifest=pinned(root,'B38_FILE_SHA256.json');
 if(manifest.schema!=='minecraftaibuilder-step8b-b38-manifest-v1'||manifest.fileCount!==635)reject('MANIFEST');
 const b38=pinned(root,'reports/B38_LANDING_FLOOR_HEIGHT_REPORT.json');validateLandingFloorHeightB38(b38,root);
 const b35=pinned(root,'reports/B35_CORRIDOR_REDESIGN_REPORT.json');
 const b21=pinned(root,'reports/B21_BLOCKSCALE_REVIEW.json');
 const b17=pinned(root,'reports/B17_INTERIOR_INTEGRATION_IR.json');
 const b31=pinned(root,'reports/B31_FLOOR_DOOR_OVERLAY.json');
 if(b38.readiness!=='NOT_PREPARED'||b38.approvedVariant!==null||b38.BuildPlan?.operations?.length!==0||
 b35.readiness!=='NOT_PREPARED'||b35.approval?.adopted!==false||b35.BuildPlan?.operations?.length!==0)reject('BASELINE_SAFETY');
 const building='apartment/candidate-01';const house=arr=>arr.buildings.find(b=>b.id===building);
 const rooms=house(b17),walls=house(b21),plate=house(b31);
 if(!rooms||!walls||!plate||rooms.floors.length!==6||walls.floors.length!==6||plate.floors.length!==6||b38.levels.length!==5||b35.levels.length!==5)reject('MAPPING');
 const levels=[];
 for(let i=0;i<5;i++){
  const lower=rooms.floors[i],upper=rooms.floors[i+1],upperPlate=plate.floors[i+1];
  const lowerWalls=walls.floors[i],cut=b38.levels[i].upperFloorCutoutCells;
  if(lower.level!==i+1||upper.level!==i+2||upperPlate.level!==i+2||b38.levels[i].upperLevel!==i+2||
    lower.localYRange[1]!==upper.localYRange[0])reject('LEVEL_MAP');
  const shaft=upper.stairReservation.map(p=>({x:p.x,z:p.z+1}));
  const blockedWall=lowerWalls.wallCandidates.flatMap(w=>w.localGridVolumes);
  // A/B are options for the LOWER floor when present; the bottom level has no B35 corridor edit.
  const variants=b38.levels[i].variants.map((v,j)=>{
   const prev=i>0?b35.levels[i-1].options[j]:null;
   if(prev&&prev.id!==v.id)reject('OPTION_MAP');
   const rem=new Set(prev?.removedKeys??[]);
   const hall=lower.corridorReservation.filter(p=>!rem.has(point(p)));
   const input={width:upperPlate.width,depth:upperPlate.depth,
    lowerHall:hall,shaft,upperRows:upperPlate.overlayRows,upperCutout:cut,
    landing:v.candidatePadCells,entrance:v.assessment.entryCell,
    nominalLowerY:lower.localYRange[0],nominalUpperY:upper.localYRange[0],wallVoxels:blockedWall};
   const existing=evaluateStairRouteB39(input);
   // PROPOSAL ONLY: move one upper floor cutout from z=17 to z=19, not the frozen floor.
   if(cut.length!==2||!cut.some(p=>p.x===14&&p.z===17)||!cut.some(p=>p.x===14&&p.z===18)||
      upperPlate.overlayRows[17][14]!=='o'||upperPlate.overlayRows[19][14]!=='#')reject('CUTOUT_BASELINE');
   const altRows=[...upperPlate.overlayRows];
   altRows[17]=altRows[17].slice(0,14)+'#'+altRows[17].slice(15);
   altRows[19]=altRows[19].slice(0,14)+'o'+altRows[19].slice(15);
   if(altRows.join('').split('#').length!==input.upperRows.join('').split('#').length)reject('FLOOR_CELL_COUNT');
   const alternative=evaluateStairRouteB39({...input,upperRows:altRows,
     upperCutout:[{x:14,z:18},{x:14,z:19}]});
   return {id:v.id,existingFloorCutout:existing,unapprovedCutoutRelocation:{
      restoredToFloor:[{x:14,z:17}],proposedNewOpening:[{x:14,z:19}],
      floorCellsChanged:2,nominalSearch:alternative,committed:false},
      reviewPreference:alternative.candidates[0]??null,
    selected:false,installedHeadroomVerified:false,installedWalkabilityVerified:false,
    actualLandingLoadPathVerified:false};
  });
  levels.push({lowerLevel:lower.level,upperLevel:upper.level,variants});
 }
 const variants=levels.flatMap(l=>l.variants);
 const totals={levels:5,variants:10,existingCutoutNominalRoutes:variants.filter(v=>v.existingFloorCutout.candidateCount>0).length,
  proposedCutoutNominalRoutes:variants.filter(v=>v.unapprovedCutoutRelocation.nominalSearch.candidateCount>0).length,
  totalProposedAlternatives:variants.reduce((a,v)=>a+v.unapprovedCutoutRelocation.nominalSearch.candidateCount,0),
  nominalRoutesWithoutDoorOrStairStructureCertification:variants.length,verifiedPhysicalRoutes:0,
  producedBuildOperations:0};
 const report={schema:'minecraftaibuilder-step8b-b39-top-route-review-v1',
  purpose:'PURE_NONEXECUTABLE_STAIR_ROUTE_SEARCH_WITH_FLAT_APPROACH',
  provenance:{immutablePins:PINS,realEngineInvoked:false,bridgeContact:false,worldAccess:false},
  building,levels,totals,reviewNotes:[
  'A flat approach has nominal rise 0; exactly four treads then climb one more cell to upper floor',
  'All horizontal transitions, cutout headspace, lower hallway contact and 2D wall-model overlap checked',
  'No installed handrail, load path, wall stability, Minecraft door states, block material or physical headroom evidence',
  'ANY candidate remains design-only; no approvals or operations are generated'],
  blockers:Array.from({length:9},(_,i)=>({id:`M4-0${i+1}`,status:'BLOCKED'})),
  approvedVariant:null,readiness:'NOT_PREPARED',deployment:'BLOCKED',
  safety:{notPrepared:true,constructionApproved:false,executionAllowed:false,bridgeContact:false,worldAccess:false,
    legacyModified:false,frozenEvidenceModified:false,projectFilesModified:false},
  BuildPlan:{status:'NOT_PREPARED',operations:[],materialIds:[],worldCoordinates:null},constructionCommands:0};
 report.reportSha256=sign(report);return report;
}
export function validateB39(r,root){
 if(r?.schema!=='minecraftaibuilder-step8b-b39-top-route-review-v1'||r?.readiness!=='NOT_PREPARED'||
 r.deployment!=='BLOCKED'||r.approvedVariant!==null||r.constructionCommands!==0||
 r.safety?.notPrepared!==true||r.safety?.constructionApproved!==false||r.safety?.executionAllowed!==false||
 r.safety?.worldAccess!==false||r.safety?.bridgeContact!==false||r.safety?.frozenEvidenceModified!==false||
 r.BuildPlan?.status!=='NOT_PREPARED'||r.BuildPlan?.operations?.length!==0||
 r.BuildPlan?.materialIds?.length!==0||r.BuildPlan?.worldCoordinates!==null||
 r.blockers?.length!==9||r.blockers.some(x=>x.status!=='BLOCKED')||
 r.levels?.some(l=>l.variants?.some(v=>v.selected||v.installedHeadroomVerified||
 v.installedWalkabilityVerified||v.actualLandingLoadPathVerified||v.unapprovedCutoutRelocation.committed||v.reviewPreference?.constructionApproved!==false)))reject('SAFETY');
 const {reportSha256,...rest}=r;if(sign(rest)!==reportSha256||JSON.stringify(r)!==JSON.stringify(buildB39(root)))reject('REPORT_CHANGED');return true;
}
