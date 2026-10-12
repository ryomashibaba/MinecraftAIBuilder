/** B38 — Offline landing / slab / stair-height contract. NEVER imports a Minecraft engine or Bridge.
 * A retained nominal floor plate, a top tread and an adjacent port are *separate* proofs.
 * No material states, world coordinates, commands or executable BuildPlan are emitted.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {validateLandingEnvelopeB37} from './step8b-landing-envelope-b37.mjs';

const sha=b=>createHash('sha256').update(b).digest('hex');
const fingerprint=x=>sha(JSON.stringify(x));
const fail=s=>{throw Object.assign(new Error('B38_'+s),{code:'B38_'+s});};
const pins=Object.freeze({
 'B37_FILE_SHA256.json':'31aeb78d1a9d34f5ac61fc507610b8bea9e29bf687b77c70cb50c1b6479de08b',
 'reports/B37_LANDING_ENVELOPE_REPORT.json':'3d99695daab6d31a8789b1aa385fc0f10a79e278a434052198920373acc70b98',
 'reports/B36_LOCAL_STAIR_SECTION_REPORT.json':'bf58d8200c430908030dbdc72d6149c40023a1bf0f05a87cc881c687373fd842',
 'reports/B33_RECTANGLE_EMITTER_LEDGER.json':'a8c130190d53bc25489bac27ae007cdb96fa37c980515329d04300f229322c9d',
 'reports/B21_BLOCKSCALE_REVIEW.json':'2d7b1e3d71f252331dfe35e600411acc3354c43702e5b3db9fd9a5e0533932bc',
 'reports/B17_INTERIOR_INTEGRATION_IR.json':'e04e8ca2789bd8b65548a10e98e940e9537a562ebbf38a63e456ac9b73fb425d',
 'reports/B31_FLOOR_DOOR_OVERLAY.json':'6d233d5ad09b8138650f65d46e0cf2d2ab143577d3862696b562a3857545c430',
});
function pin(root,rel){
 if(typeof root!=='string'||!root)fail('ROOT');
 const file=path.join(root,rel),stat=fs.lstatSync(file);
 if(stat.isSymbolicLink()||!stat.isFile())fail('SOURCE_TYPE');
 const b=fs.readFileSync(file);if(sha(b)!==pins[rel])fail('PIN_MISMATCH_'+rel.replace(/\W/g,'_'));
 return JSON.parse(b.toString('utf8'));
}
const key=p=>`${p.x},${p.z}`;
const point=s=>{if(typeof s!=='string'||!/^\d+,\d+$/.test(s))fail('KEY');const [x,z]=s.split(',').map(Number);return {x,z};};
const delta=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.z-b.z);
const isInt=n=>Number.isSafeInteger(n);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function uniqueCells(cells,w,d){
 if(!Array.isArray(cells)||!cells.length||cells.length>100||cells.some(p=>!p||!isInt(p.x)||!isInt(p.z)||p.x<0||p.z<0||p.x>=w||p.z>=d))fail('CELLS');
 const s=new Set(cells.map(key));if(s.size!==cells.length)fail('DUPLICATE_CELL');return s;
}
/** The only proof derived here is NOMINAL grid coverage; load bearing is explicitly unproven. */
export function assessB38Landing({width,depth,upperRows,upperFloorY,cutoutCells,landingCells,entryCell,
  upperFloorCandidateRectangles,stairTreads,headspaceCells}){
 if(!isInt(width)||!isInt(depth)||width<4||depth<4||width>64||depth>64||
 !isInt(upperFloorY)||upperFloorY<4||upperFloorY>1024||
 !Array.isArray(upperRows)||upperRows.length!==depth||upperRows.some(r=>typeof r!=='string'||r.length!==width||!/^[#.o]+$/.test(r)))fail('GRID');
 const landing=uniqueCells(landingCells,width,depth),open=uniqueCells(cutoutCells,width,depth);
 if(landing.size!==4||open.size!==2||!entryCell||!landing.has(key(entryCell)))fail('LANDING_OR_CUTOUT');
 if(!Array.isArray(upperFloorCandidateRectangles)||upperFloorCandidateRectangles.length>500||upperFloorCandidateRectangles.some(r=>
  !r||![r.x,r.z,r.width,r.depth].every(isInt)||r.x<0||r.z<0||r.width<=0||r.depth<=0||r.x+r.width>width||r.z+r.depth>depth))fail('RECTANGLES');
 if(!Array.isArray(stairTreads)||stairTreads.length<2||stairTreads.length>20||
 stairTreads.some(v=>!v||![v.x,v.y,v.z].every(isInt)||v.x<0||v.z<0||v.x>=width||v.z>=depth))fail('TREADS');
 if(!Array.isArray(headspaceCells)||headspaceCells.length!==stairTreads.length*2||headspaceCells.some(v=>
 !v||![v.x,v.y,v.z].every(isInt)||v.x<0||v.z<0||v.x>=width||v.z>=depth))fail('HEADSPACE');
 const highest=stairTreads.at(-1),lastSurfaceY=highest.y+1;
 if(stairTreads.some((v,i)=>i&&v.y!==stairTreads[i-1].y+1))fail('TREAD_HEIGHT_ORDER');
 const overlap=[...landing].filter(s=>open.has(s));
 const plate=[...landing].filter(s=>{const p=point(s);return upperRows[p.z][p.x]==='#';});
 const rectCoverage=landingCells.map(p=>upperFloorCandidateRectangles.filter(r=>
  p.x>=r.x&&p.x<r.x+r.width&&p.z>=r.z&&p.z<r.z+r.depth).length);
 const plateOpen=[...open].filter(s=>{const p=point(s);return upperRows[p.z][p.x]==='o';});
 const headCross=headspaceCells.filter(v=>landing.has(key(v))&&(v.y===upperFloorY||v.y===upperFloorY+1));
 const directLandingAdjacency=landingCells.filter(c=>delta(c,highest)===1).map(key);
 const portTreadDist=delta(entryCell,highest);
 const topTreadOverlapsPad=landing.has(key(highest));
 const nominalDirectEdge=portTreadDist===1&&!topTreadOverlapsPad;
 const penultimate=stairTreads.at(-2);
 return {
  nominalFloorY:upperFloorY,lastTreadBottomY:highest.y,lastTreadTopY:lastSurfaceY,
  stairTopAlignedToFloor: lastSurfaceY===upperFloorY,
  landingFootprintCells:landing.size,landingRetainedNominalFloorCells:plate.length,
  landingCutoutOverlap:overlap.length,cutoutCellsMarkedOpen:plateOpen.length,
  rectangleCoveragePerLandingCell:rectCoverage,rectangleCoverageExact:rectCoverage.every(n=>n===1),
  landingHeadspaceProxyIntersections:headCross.length,
  lastTreadLocal:{x:highest.x,y:highest.y,z:highest.z},
  precedingTreadLocal:{x:penultimate.x,y:penultimate.y,z:penultimate.z},
  entryCell:{...entryCell},entryToLastTreadManhattan:portTreadDist,topTreadOverlapsPad,topTreadInsideCutout:open.has(key(highest)),
  landingCellsEdgeAdjacentToLastTread:directLandingAdjacency,
  directTopTreadToLandingProven:nominalDirectEdge,
  nominalFloorCoveragePass:plate.length===4&&overlap.length===0&&plateOpen.length===2&&rectCoverage.every(n=>n===1),
  bottomSupportCertainty:'UNKNOWN_NO_LOAD_PATH',
  topTransitionCertainty:nominalDirectEdge?'NOMINAL_EDGE_CONTACT_ONLY':'NO_DIRECT_EDGE_CONTACT_REDESIGN_REQUIRED',
  installedCeilingHeadroomCertified:false,installedLandingSupportCertified:false,
  physicalStairAccessCertified:false,
 };
}

export function buildLandingFloorHeightB38(root){
 pin(root,'B37_FILE_SHA256.json');
 const b37=pin(root,'reports/B37_LANDING_ENVELOPE_REPORT.json');validateLandingEnvelopeB37(b37,root);
 const b36=pin(root,'reports/B36_LOCAL_STAIR_SECTION_REPORT.json');
 const b33=pin(root,'reports/B33_RECTANGLE_EMITTER_LEDGER.json');
 const b21=pin(root,'reports/B21_BLOCKSCALE_REVIEW.json');
 const b17=pin(root,'reports/B17_INTERIOR_INTEGRATION_IR.json');
 const b31=pin(root,'reports/B31_FLOOR_DOOR_OVERLAY.json');
 if(b37.readiness!=='NOT_PREPARED'||b37.approvedVariant!==null||b37.BuildPlan?.operations?.length!==0||
 b36.shift?.dx!==0||b36.shift?.dz!==1||b36.readiness!=='NOT_PREPARED'||
 b33.readiness!=='NOT_PREPARED'||b31.readiness!=='NOT_PREPARED')fail('BASELINE_SAFETY');
 const id='apartment/candidate-01';
 const plate=b31.buildings.find(x=>x.id===id),ir=b17.buildings.find(x=>x.id===id),
  floors=b33.buildings.find(x=>x.id===id),stairs=b21.buildings.find(x=>x.id===id);
 if(!plate||!ir||!floors||!stairs||b37.levels.length!==5||stairs.stairs.length!==5)fail('BUILDING');
 const levels=[];
 for(let i=0;i<5;i++){
  const src=b37.levels[i],upper=plate.floors[i+1],rect=floors.floors[i+1],irFloor=ir.floors[i+1],stair=stairs.stairs[i],prior=ir.floors[i];
  if(src.floor!==i+2||upper.level!==src.floor||rect.level!==src.floor||irFloor.level!==src.floor||
   prior.level!==i+1||stair.upperFloor!==irFloor.id||stair.lowerFloor!==prior.id||
   irFloor.localYRange[0]!==prior.localYRange[1]||!Array.isArray(src.variants)||src.variants.length!==2||
   rect.candidateCutouts.length!==2||!rect.coverageExact||!rect.noOverlaps)fail('MAPPING');
  const cutouts=rect.candidateCutouts.map(({x,z})=>({x,z})),shift=b36.shift;
  const tread=stair.candidateUnitStepCells.map(({x,y,z})=>({x:x+shift.dx,y,z:z+shift.dz}));
  const head=stair.nominalTwoBlockHeadspaceCells.map(({x,y,z})=>({x:x+shift.dx,y,z:z+shift.dz}));
  const variants=src.variants.map(v=>{
   const east=v.ports.filter(p=>p.corridor2x2Available&&p.directlyTouchesCandidateFloorCutout&&p.corridorKey==='15,18');
   if(east.length!==1||east[0].corridor2x2Alternatives.length!==1)fail('EAST_PAD');
   const p=east[0],pad=p.corridor2x2Alternatives[0].map(point);
   const measured=assessB38Landing({width:upper.width,depth:upper.depth,upperRows:upper.overlayRows,
    upperFloorY:irFloor.localYRange[0],landingCells:pad,entryCell:point(p.corridorKey),cutoutCells:cutouts,
    upperFloorCandidateRectangles:rect.candidateRectangles,stairTreads:tread,headspaceCells:head});
   return {id:v.id,corridorToStairPort:p.edgeId,candidatePadCells:pad,assessment:measured,
    constructible:false,selected:false,landingSupportVerified:false,
    futureDesignInputs:['STAIR_TOP_TREAD_REORIENTATION_OR_LANDING_TRANSITION','LANDING_LOAD_PATH',
      'PHYSICAL_HEADROOM','WALL_JOINT','BLOCK_STATES_AND_MATERIALS']};
  });
  levels.push({upperLevel:src.floor,nominalUpperFloorY:irFloor.localYRange[0],lowerLevel:prior.level,
   variants,upperFloorCutoutCells:cutouts,nominalRectangleEmitterValidated:true});
 }
 const variants=levels.flatMap(l=>l.variants);
 const totals={upperLevels:5,variantComparisons:variants.length,
  nominalPadsWithAll4FloorCells:variants.filter(v=>v.assessment.landingRetainedNominalFloorCells===4).length,
  candidateEmitterExact:variants.filter(v=>v.assessment.rectangleCoverageExact).length,
  treadSurfaceYAligned:variants.filter(v=>v.assessment.stairTopAlignedToFloor).length,
  lastTreadDirectlyAdjacent:variants.filter(v=>v.assessment.directTopTreadToLandingProven).length,
  topTransitionsStillRequireRedesign:variants.filter(v=>!v.assessment.directTopTreadToLandingProven).length,
  physicalLandingSupportsVerified:0,emittedOperations:0};
 const report={schema:'minecraftaibuilder-step8b-b38-landing-section-v1',purpose:'LANDING_FLOOR_HEIGHT_AND_RECTANGLE_COMPATIBILITY_READONLY',
  provenance:{pinnedSourceSha256:{...pins},runtimePlannerInvoked:false,windowsProbePerformed:false,worldContact:false},
  building:id,levels,totals,approvedVariant:null,unresolved:[
   'STAIR_TO_LANDING_DIRECT_EDGE_TRANSITION','LANDING_PHYSICAL_SUPPORT','ACTUAL_HEADROOM_AND_UPPER_SLAB',
   'WALL_JOINT_AND_GUARD','MATERIALS_AND_BLOCK_STATES','WORLD_COORDINATES','ENGINE_RUNTIME','CONSTRUCTION_APPROVAL'],
  interpretation:'FOUR_RETAINED_2D_CELLS_NOT_A_CERTIFIED_LANDING',
  readiness:'NOT_PREPARED',deployment:'BLOCKED',safety:{notPrepared:true,constructionApproved:false,executionAllowed:false,
   legacyModified:false,existingWorldModified:false,frozenEvidenceModified:false,bridgeContact:false,worldAccess:false},
  BuildPlan:{status:'NOT_PREPARED',operations:[],materialIds:[],worldCoordinates:null},constructionCommands:0};
 report.reportSha256=fingerprint(report);return report;
}
export function validateLandingFloorHeightB38(report,root){
 if(report?.schema!=='minecraftaibuilder-step8b-b38-landing-section-v1'||report.readiness!=='NOT_PREPARED'||
 report.deployment!=='BLOCKED'||report.approvedVariant!==null||report.constructionCommands!==0||
 report.safety?.notPrepared!==true||report.safety?.constructionApproved!==false||report.safety?.executionAllowed!==false||
 report.safety?.legacyModified!==false||report.safety?.existingWorldModified!==false||report.safety?.frozenEvidenceModified!==false||
 report.safety?.bridgeContact!==false||report.safety?.worldAccess!==false||
 report.BuildPlan?.status!=='NOT_PREPARED'||report.BuildPlan?.operations?.length!==0||
 report.BuildPlan?.worldCoordinates!==null||report.BuildPlan?.materialIds?.length!==0||
 report.totals?.physicalLandingSupportsVerified!==0||report.totals?.emittedOperations!==0||
 report.levels?.some(l=>l.variants?.some(v=>v.constructible!==false||v.selected!==false||v.landingSupportVerified!==false||v.assessment?.physicalStairAccessCertified!==false)))fail('UNSAFE_REPORT');
 const {reportSha256,...body}=report;
 if(fingerprint(body)!==reportSha256||!same(report,buildLandingFloorHeightB38(root)))fail('REPORT_MODIFIED');
 return true;
}
