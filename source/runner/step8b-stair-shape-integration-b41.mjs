/** B41: non-executable stair-shape screen and expanded straight-run alternative.
 * Consumes ONLY pinned local reference data; does not import/execute the engine or Bridge.
 * The 2-box model is a visual culling proxy, NOT collision/walkability validation.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {decomposeFloorMaskB33} from './step8b-emitter-fixture-b33.mjs';

const fail = reason => {throw Object.assign(new Error(`B41_${reason}`),{code:`B41_${reason}`});};
const sha=b=>createHash('sha256').update(b).digest('hex');
const hash=x=>sha(JSON.stringify(x));
const point=p=>`${p.x},${p.z}`;
const pin=Object.freeze({
 'B40_FILE_SHA256.json':'d9257973ee3591c2404145021ca689fba17e7eee20c01c100c81ef812004ed6c',
 'reports/B40_CROSSLEVEL_STAIR_AUDIT.json':'9bbfcdfa9aba64c3c43ccbf25616e464bfb029dbb04316e77b13fd874c549b25',
 'reports/B17_INTERIOR_INTEGRATION_IR.json':'e04e8ca2789bd8b65548a10e98e940e9537a562ebbf38a63e456ac9b73fb425d',
 'reports/B21_BLOCKSCALE_REVIEW.json':'2d7b1e3d71f252331dfe35e600411acc3354c43702e5b3db9fd9a5e0533932bc',
 'reports/B31_FLOOR_DOOR_OVERLAY.json':'6d233d5ad09b8138650f65d46e0cf2d2ab143577d3862696b562a3857545c430',
});
function checked(root,rel){
 if(typeof root!=='string'||!root||!Object.hasOwn(pin,rel))fail('PIN_ARGUMENT');
 let st;const f=path.join(root,rel);try{st=fs.lstatSync(f);}catch{fail('SOURCE_MISSING');}
 if(st.isSymbolicLink()||!st.isFile()||sha(fs.readFileSync(f))!==pin[rel])fail('SOURCE_TAMPERED');
 return JSON.parse(fs.readFileSync(f,'utf8'));
}
const vec=(a,b)=>({x:b.x-a.x,z:b.z-a.z});
const coord=p=>Number.isSafeInteger(p?.x)&&Number.isSafeInteger(p?.z);
const cmp=(a,b)=>a.x===b.x&&a.z===b.z;
const turn=(a,b)=>!cmp(a,b);

/** Limited two-box culling illustration; NOT the full engine collision shape or valid state encoding. */
export function cullingProxyBoxesB41(direction){
 if(!coord(direction)||Math.abs(direction.x)+Math.abs(direction.z)!==1)fail('DIRECTION');
 const back=direction.x===1?[.5,0,1,1]:direction.x===-1?[0,0,.5,1]:
  direction.z===1?[0,.5,1,1]:[0,0,1,.5];
 return [{xmin:0,ymin:0,zmin:0,xmax:1,ymax:.5,zmax:1},
  {xmin:back[0],ymin:.5,zmin:back[1],xmax:back[2],ymax:1,zmax:back[3]}];
}

export function classifyB41Route(candidate){
 if(!candidate||!coord(candidate.flatLeadIn)||!coord(candidate.topLandingEntry)||
  !Array.isArray(candidate.treads)||candidate.treads.length!==4||
  candidate.treads.some((p,i)=>!coord(p)||!Number.isSafeInteger(p.y)||
    (i>0&&p.y!==candidate.treads[i-1].y+1)))fail('PATH');
 const sequence=[candidate.flatLeadIn,...candidate.treads,candidate.topLandingEntry];
 const reusedCells=sequence.length-new Set(sequence.map(point)).size;
 const headings=sequence.slice(1).map((p,i)=>vec(sequence[i],p));
 if(headings.some(v=>Math.abs(v.x)+Math.abs(v.z)!==1))fail('PATH_ADJACENCY');
 const changes=headings.slice(1).filter((h,i)=>turn(h,headings[i])).length;
 const betweenRisingTreads=headings.slice(2,5).filter((h,i)=>turn(h,headings[i+1])).length;
 const treads=candidate.treads.map((p,i)=>({
  at:{x:p.x,y:p.y,z:p.z},
  indicativeFacing:headings[i+1],
  exampleCullingBoxes:cullingProxyBoxesB41(headings[i+1])}));
 return {signature:sequence.map(point).join('|'),rises:4,
  planarTurnCount:changes,risingTurnCount:betweenRisingTreads,reusedCells,
  corridorToFirstTreadTurn:turn(headings[0],headings[1]),
  lastTreadToLandingTurn:turn(headings[3],headings[4]),
  treads,straightFourTreads:headings.slice(1,4).every(h=>cmp(h,headings[4])),
  shapeReviewStatus:reusedCells?'REVISITS_PLANAR_CELL_VERTICAL_CLEARANCE_UNVERIFIED':betweenRisingTreads>0?'TURNING_RISE_NEEDS_EXPLICIT_LANDING_OR_COLLISION_PROOF':'STRAIGHT_FLIGHT_SHAPE_STILL_UNVERIFIED',
  actualBlockStatesCertified:false,realCollisionShapeVerified:false,autoAdopted:false};
}

function reachable(corridor,start){
 const cells=new Set(corridor.map(point));const s=point(start);
 if(!cells.has(s))return new Set();
 const seen=new Set([s]);const q=[start];
 for(let i=0;i<q.length;i++){
  const p=q[i];for(const n of [{x:p.x+1,z:p.z},{x:p.x-1,z:p.z},{x:p.x,z:p.z+1},{x:p.x,z:p.z-1}]){
   const k=point(n);if(cells.has(k)&&!seen.has(k)){seen.add(k);q.push(n);}
  }
 }
 return seen;
}
/** Alternate 4-riser straight flight that borrows one lower corridor cell.
 * It is a design review option only; it does not edit masks or create operations.
 */
export function compareStraightRunB41(lower,upper,lowerWall,upperWall,plate){
 if(lower?.localYRange?.[1]!==upper?.localYRange?.[0]||
 upper.localYRange[0]-lower.localYRange[0]!==4||!Array.isArray(plate?.overlayRows))fail('LEVELS');
 const risers=[11,12,13,14].map((x,i)=>({x,y:lower.localYRange[0]+i,z:18}));
 const lead={x:10,z:18},landing={x:15,z:18};
 const lowerHall=new Set(lower.corridorReservation.map(point));
 if(!lowerHall.has(point(lead))||!lowerHall.has('11,18'))fail('CORRIDOR_ENTRY');
 const original=plate.overlayRows;
 if(original[17][14]!=='o'||original[18][14]!=='o'||original[18][13]!=='#')fail('FLOOR_BASELINE');
 const proposed=[...original];
 const change=(z,x,c)=>{proposed[z]=proposed[z].slice(0,x)+c+proposed[z].slice(x+1);};
 change(17,14,'#');change(18,13,'o');
 const mask=rows=>decomposeFloorMaskB33(rows.map(row=>[...row].map(c=>c==='#')));
 const a=mask(original),b=mask(proposed);
 if(!a.coverageExact||!b.coverageExact||a.cells!==b.cells)fail('FLOOR_COVERAGE');
 const worldset=new Set([lowerWall,upperWall].flatMap(f=>f.wallCandidates.flatMap(w=>w.localGridVolumes))
   .map(p=>`${p.x},${p.y},${p.z}`));
 const stairAndHead=risers.flatMap(p=>[p,{...p,y:p.y+1},{...p,y:p.y+2}]);
 const conceptWallCollisions=stairAndHead.filter(p=>worldset.has(`${p.x},${p.y},${p.z}`));
 const floorHeadspaceCollisions=risers.flatMap(p=>[p.y+1,p.y+2].filter(y=>y>=upper.localYRange[0])
   .map(y=>({x:p.x,y,z:p.z}))).filter(p=>proposed[p.z][p.x]!=='o');
 const originalReach=reachable(lower.corridorReservation,lead);
 const proposedHall=lower.corridorReservation.filter(p=>point(p)!=='11,18');
 const afterReach=reachable(proposedHall,lead);
 const doorStats=(seen)=>lower.roomDoorInterfaces.filter(d=>seen.has(point(d.hallCell))).length;
 const upperBlockedPorts=new Set([...upper.roomDoorInterfaces.flatMap(d=>[point(d.doorCell),point(d.hallCell)]),
 ...upper.elevatorReservation.map(point)]);
 const upperPortClashes=risers.filter(p=>upperBlockedPorts.has(point(p)));
 return {fromLevel:lower.level,toLevel:upper.level,
  corridorLeadIn:lead,lowerCorridorReallocated:[{x:11,z:18}],
  straightTreads:risers,upperLanding:landing,
  proposedUpperFloorChanges:{restore:[{x:14,z:17}],open:[{x:13,z:18}]},
  originalFloorCells:a.cells,proposedFloorCells:b.cells,
  originalFloorRectangles:a.rectangleCount,proposedFloorRectangles:b.rectangleCount,
  exactFloorMask:true,
  nominalConceptWallClashes:conceptWallCollisions.length,
  nominalFloorHeadspaceClashes:floorHeadspaceCollisions.length,
  upperDoorEvReservationClashes:upperPortClashes.length,
  baselineCorridorReachableCells:originalReach.size,
  alternateCorridorReachableCells:afterReach.size,
  baselineDoorReachableCount:doorStats(originalReach),
  alternateDoorReachableCount:doorStats(afterReach),
  totalDoorCount:lower.roomDoorInterfaces.length,
  stairFootprintExpandsOriginalShaft:true,
  materialStatesVerified:false,installedStairSupportVerified:false,actualWalkabilityVerified:false,
  shapeReviewOnly:true,autoAdopted:false};
}

export function buildB41(root){
 const manifest=checked(root,'B40_FILE_SHA256.json');
 const b40=checked(root,'reports/B40_CROSSLEVEL_STAIR_AUDIT.json');
 if(manifest.schema!=='minecraftaibuilder-step8b-b40-manifest-v1'||manifest.fileCount!==656||
 b40.readiness!=='NOT_PREPARED'||b40.BuildPlan?.operations?.length!==0||
 b40.totals?.nominalRouteInstances!==44||b40.commonSignaturesAcrossAllVariants?.length!==3)fail('BASELINE');
 const ir=checked(root,'reports/B17_INTERIOR_INTEGRATION_IR.json');
 const blocks=checked(root,'reports/B21_BLOCKSCALE_REVIEW.json');
 const plate=checked(root,'reports/B31_FLOOR_DOOR_OVERLAY.json');
 const get=o=>o.buildings?.find(b=>b.id===b40.building);
 const rooms=get(ir),walls=get(blocks),floors=get(plate);
 if(!rooms||!walls||!floors||rooms.floors.length!==6||walls.floors.length!==6||floors.floors.length!==6)fail('BUILDING');
 const classified=b40.variants.flatMap(v=>v.candidates.map(classifyB41Route));
 const common=b40.commonSignaturesAcrossAllVariants.map(signature=>{
  const c=classified.find(x=>x.signature===signature);if(!c)fail('COMMON_SIGNATURE');
  return {signature,planarTurns:c.planarTurnCount,risingTurns:c.risingTurnCount,
   shapeReviewStatus:c.shapeReviewStatus};
 });
 const alternates=Array.from({length:5},(_,i)=>compareStraightRunB41(
   rooms.floors[i],rooms.floors[i+1],walls.floors[i],walls.floors[i+1],floors.floors[i+1]));
 const blockers=Array.from({length:9},(_,i)=>({id:`M4-0${i+1}`,status:'BLOCKED'}));
 const report={schema:'minecraftaibuilder-step8b-b41-stair-redesign-v1',
  intent:'OFFLINE_NONEXECUTABLE_STAIRS_AND_EXPANDED_SHAFT_COMPARISON',
  provenance:{pins:pin,engineInvoked:false,worldAccess:false,bridgeContact:false,
   referenceDocs:[
    'https://learn.microsoft.com/en-us/minecraft/creator/documents/voxelshapes?view=minecraft-bedrock-stable',
    'https://learn.microsoft.com/en-us/minecraft/creator/reference/content/blockreference/examples/auxvaluetoblockstatemap?view=minecraft-bedrock-stable']},
  shapeContract:{example:'TWO_BOX_CULLING_PROXY_NOT_COLLISION_SHAPE',
   stairStateHints:['weirdo_direction','upside_down_bit'],
   stateValueMapCertified:false,engineBlockCatalogCertified:false,
   exactCollisionAndWalkabilityCertified:false},
  baseline:{nominalRouteCount:classified.length,uniqueNominalRoutes:b40.totals.uniqueLocalRouteSignatures,
   commonNominalRoutes:common.length,withTurningRises:classified.filter(c=>c.risingTurnCount>0).length,
   withReusedApproachCells:classified.filter(c=>c.reusedCells>0).length,minimumFourConsecutiveRiserSpan:4,originalShaftWidth:3,originalShaftDepth:3,
   fourStraightRisersFitInsideOriginalShaft:false,
   physicalStairRoutesVerified:0},
  commonRouteExamples:common,
  expandedStraightRun:alternates,
  alternativeDesignDecision:'PREFER_REVIEW_OF_STRAIGHT_SHAFT_EXPANSION_OVER_UNVERIFIED_TURNING_RISE',
  unverified:[
   'Minecraft Education v26.3 actual stair state mapping and corner voxel/collision shapes',
   'Real player passage, landing transition and half-step mechanics',
   'First riser occupies lower corridor cell (11,18); corridor layout and width must be reconsidered',
   'Floor/support under every riser and changed upper-level cutout (13,18)',
   'Door materials, wall/rail joints, exact world origin and runtime planner integration',
   'Any synthetic shape/route remains design-only; no real block placement or world operation'],
  totals:{straightProposals:alternates.length,proposalsWithNoConceptualClashes:alternates.filter(x=>
   x.nominalConceptWallClashes===0&&x.nominalFloorHeadspaceClashes===0&&x.upperDoorEvReservationClashes===0).length,
   proposalsWithNewDoorReachabilityLoss:alternates.filter(x=>x.alternateDoorReachableCount<x.baselineDoorReachableCount).length,
   physicalRoutesVerified:0,buildOperations:0},
  blockers,readiness:'NOT_PREPARED',deployment:'BLOCKED',approvedVariant:null,
  safety:{notPrepared:true,constructionApproved:false,executionAllowed:false,worldAccess:false,
   bridgeContact:false,legacyModified:false,frozenEvidenceModified:false,projectFilesModified:false},
  BuildPlan:{status:'NOT_PREPARED',operations:[],materialIds:[],worldCoordinates:null},constructionCommands:0};
 report.reportSha256=hash(report);return report;
}
export function validateB41(report,root){
 if(report?.schema!=='minecraftaibuilder-step8b-b41-stair-redesign-v1'||
 report?.readiness!=='NOT_PREPARED'||report?.deployment!=='BLOCKED'||
 report?.approvedVariant!==null||report?.constructionCommands!==0||
 report?.safety?.constructionApproved!==false||report?.safety?.executionAllowed!==false||
 report?.safety?.worldAccess!==false||report?.safety?.bridgeContact!==false||
 report?.BuildPlan?.status!=='NOT_PREPARED'||report?.BuildPlan?.operations?.length!==0||
 report?.BuildPlan?.materialIds?.length!==0||report?.BuildPlan?.worldCoordinates!==null||
 report?.blockers?.length!==9||report.blockers.some(b=>b.status!=='BLOCKED')||
 report.expandedStraightRun?.some(a=>a.autoAdopted||a.actualWalkabilityVerified||a.materialStatesVerified)||
 report.totals?.buildOperations!==0||report.totals?.physicalRoutesVerified!==0)fail('SAFETY');
 const {reportSha256,...payload}=report;
 if(hash(payload)!==reportSha256||JSON.stringify(buildB41(root))!==JSON.stringify(report))fail('TAMPER');
 return true;
}
