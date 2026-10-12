/** B36 — NONEXECUTABLE local stair section / landing interface audit.
 * No engine imports, block materials, world positions, or construction operations.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {buildCorridorReviewB35,validateCorridorReviewB35} from './step8b-corridor-repair-b35.mjs';
const digest=b=>createHash('sha256').update(b).digest('hex');
const hash=x=>digest(JSON.stringify(x));
const fail=x=>{throw Object.assign(new Error('B36_'+x),{code:'B36_'+x});};
const key=p=>`${p.x},${p.z}`;
const parse=s=>{const [x,z]=s.split(',').map(Number);return {x,z};};
const ordered=s=>[...s].sort((a,b)=>{const p=parse(a),q=parse(b);return p.z-q.z||p.x-q.x;});
const adj=p=>[{x:p.x+1,z:p.z,side:'EAST'},{x:p.x-1,z:p.z,side:'WEST'},{x:p.x,z:p.z+1,side:'SOUTH'},{x:p.x,z:p.z-1,side:'NORTH'}];
const inside=(p,w,d)=>p&&Number.isSafeInteger(p.x)&&Number.isSafeInteger(p.z)&&p.x>=0&&p.z>=0&&p.x<w&&p.z<d;
function cells(arr,w,d){
 if(!Array.isArray(arr)||arr.some(x=>!inside(x,w,d)))fail('BAD_CELL');
 const set=new Set(arr.map(key));if(set.size!==arr.length)fail('DUPLICATE_CELL');return set;
}
const shaPins=Object.freeze({
  'reports/B17_INTERIOR_INTEGRATION_IR.json':'e04e8ca2789bd8b65548a10e98e940e9537a562ebbf38a63e456ac9b73fb425d',
  'reports/B31_FLOOR_DOOR_OVERLAY.json':'6d233d5ad09b8138650f65d46e0cf2d2ab143577d3862696b562a3857545c430',
  'reports/B34_SHAFT_ACCESS_REPORT.json':'ebab5ff1990deaf6d8ee0cd23ca852d2b4da7853a3b819d7f9845e0f0734a608',
  'reports/B21_BLOCKSCALE_REVIEW.json':'2d7b1e3d71f252331dfe35e600411acc3354c43702e5b3db9fd9a5e0533932bc',
});
function pinned(root,rel,expected){
 const file=path.join(root,rel),stat=fs.lstatSync(file);
 if(!stat.isFile()||stat.isSymbolicLink())fail('FILE_TYPE');
 const buf=fs.readFileSync(file);if(digest(buf)!==expected)fail('SOURCE_TAMPER_'+rel.replace(/\W/g,'_'));
 return JSON.parse(buf.toString('utf8'));
}
/** Landing ports are 2D shared edges, NEVER real doors, stairs or load-bearing landings. */
export function analyzeLandingInterfaceB36({width,depth,floorRows,corridorCells,shaftCells,openingCells,doorHallCells=[],wallBoundaries=[]}){
 if(!Number.isInteger(width)||!Number.isInteger(depth)||width<4||depth<4||width>64||depth>64||
  !Array.isArray(floorRows)||floorRows.length!==depth||floorRows.some(r=>typeof r!=='string'||r.length!==width||!/^[#.o]+$/.test(r)))fail('GRID');
 const cor=cells(corridorCells,width,depth),shaft=cells(shaftCells,width,depth),open=cells(openingCells,width,depth),doors=cells(doorHallCells,width,depth);
 if(open.size!==2||[...open].some(s=>!shaft.has(s)||floorRows[parse(s).z][parse(s).x]==='.'))fail('OPENING_CONTRACT');
 if([...cor].some(s=>shaft.has(s)))fail('CORRIDOR_SHAFT_OVERLAP');
 if([...doors].some(s=>!cor.has(s)))fail('DOOR_PORT_REMOVED');
 if([...cor,...shaft].some(s=>floorRows[parse(s).z][parse(s).x]==='.'))fail('FOOTPRINT_ESCAPE');
 if(!Array.isArray(wallBoundaries)||wallBoundaries.some(v=>!v||![v.from,v.to].every(p=>p&&Number.isSafeInteger(p.x)&&Number.isSafeInteger(p.z)&&p.x>=-1&&p.x<=width&&p.z>=-1&&p.z<=depth)||
   Math.abs(v.from.x-v.to.x)+Math.abs(v.from.z-v.to.z)!==1))fail('WALL_FORMAT');
 const boundary=new Set(wallBoundaries.map(b=>[key(b.from),key(b.to)].sort().join('|')));
 const edges=[];
 for(const c of cor)for(const next of adj(parse(c))){const sk=key(next);if(!shaft.has(sk))continue;
  const pair=[c,sk].sort().join('|');
  edges.push({corridorKey:c,shaftKey:sk,approachSide:next.side,shaftCutoutAdjacent:open.has(sk),
   nominalPartitionBoundaryOnSeam:boundary.has(pair),fromDoorHallCell:doors.has(c)});
 }
 edges.sort((a,b)=>a.corridorKey.localeCompare(b.corridorKey)||a.shaftKey.localeCompare(b.shaftKey));
 const bySide={EAST:0,WEST:0,SOUTH:0,NORTH:0};for(const e of edges)bySide[e.approachSide]++;
 const support=ordered(open).map(s=>{const p=parse(s);const ring=adj(p).filter(q=>inside(q,width,depth)&&floorRows[q.z][q.x]!=='.');
  return {openingKey:s,neighboringNominalFloorCells:ring.length,neighboringNonOpeningFloorCells:ring.filter(q=>!open.has(key(q))).length};
 });
 return {edgeCount:edges.length,edges,bySide,cutoutAdjacentEdgeCount:edges.filter(x=>x.shaftCutoutAdjacent).length,
  nonCutoutEdgeCount:edges.filter(x=>!x.shaftCutoutAdjacent).length,
  nominalSeamBoundaryMatches:edges.filter(x=>x.nominalPartitionBoundaryOnSeam).length,
  openingSupport2DNeighbors:support,
  faceProof:'SCHEMATIC_2D_ADJACENCY_ONLY',landingProof:'UNKNOWN_NO_PHYSICAL_LANDING',
  wallSupportProof:'UNKNOWN_NO_LOAD_BEARING_DATA',headroomProof:'UNKNOWN_NO_INSTALLED_CEILING_DATA'};
}
export function projectStepsB36({stair,offset,shiftedShaftCells,shiftedCutoutCells,lowerFloorWalls}){
 if(!stair||!offset||offset.dx!==0||offset.dz!==1||!Array.isArray(stair.candidateUnitStepCells)||
  !Array.isArray(stair.nominalTwoBlockHeadspaceCells)||!Array.isArray(stair.candidateUpperFloorCutouts)||
  !Array.isArray(lowerFloorWalls))fail('STEPS_FORMAT');
 const shaft=new Set(shiftedShaftCells.map(key)),cut=new Set(shiftedCutoutCells.map(key));
 if(shaft.size!==9||cut.size!==2)fail('STEPS_SHAPE');
 const moved=stair.candidateUnitStepCells.map(p=>({...p,x:p.x+offset.dx,z:p.z+offset.dz}));
 const head=stair.nominalTwoBlockHeadspaceCells.map(p=>({...p,x:p.x+offset.dx,z:p.z+offset.dz}));
 if([...moved,...head].some(p=>!Number.isSafeInteger(p.x)||!Number.isSafeInteger(p.y)||!Number.isSafeInteger(p.z)))fail('STEPS_COORD');
 const stepsOutside=moved.filter(p=>!shaft.has(key(p)));
 const headOutside=head.filter(p=>!shaft.has(key(p)));
 const projectedCut=stair.candidateUpperFloorCutouts.map(p=>key({x:p.x+offset.dx,z:p.z+offset.dz}));
 const wallVoxel=new Set(lowerFloorWalls.flatMap(w=>w.localGridVolumes.map(p=>`${p.x},${p.y},${p.z}`)));
 const stepWall=moved.filter(p=>wallVoxel.has(`${p.x},${p.y},${p.z}`));
 const headWall=head.filter(p=>wallVoxel.has(`${p.x},${p.y},${p.z}`));
 return {stepCells:moved.length,headspaceCells:head.length,stepsOutsideShaft:stepsOutside.length,
  projectedHeadspaceOutsideShaft:headOutside.length,
  projectedCutoutsEqual:projectedCut.length===2&&new Set(projectedCut).size===2&&projectedCut.every(s=>cut.has(s)),
  lowerFloorWallStepIntersections:stepWall.length,lowerFloorWallHeadspaceIntersections:headWall.length,
  verticalProof:'SCHEMATIC_PROJECTION_ONLY',floorSlabRemovalVerified:false,headroomPhysicallyVerified:false,
  supportsVerified:false};
}
export function buildStairSectionB36(root){
 const b35=buildCorridorReviewB35(root);validateCorridorReviewB35(b35,root);
 const b17=pinned(root,'reports/B17_INTERIOR_INTEGRATION_IR.json',shaPins['reports/B17_INTERIOR_INTEGRATION_IR.json']);
 const b31=pinned(root,'reports/B31_FLOOR_DOOR_OVERLAY.json',shaPins['reports/B31_FLOOR_DOOR_OVERLAY.json']);
 const b34=pinned(root,'reports/B34_SHAFT_ACCESS_REPORT.json',shaPins['reports/B34_SHAFT_ACCESS_REPORT.json']);
 const b21File=path.join(root,'reports/B21_BLOCKSCALE_REVIEW.json');
 const src=fs.readFileSync(b21File);if(!src.length)fail('B21_EMPTY');
 const b21=JSON.parse(src.toString('utf8'));
 const building=b17.buildings.find(b=>b.id==='apartment/candidate-01');
 const plates=b31.buildings.find(b=>b.id===building?.id);
 const pattern=b21.buildings.find(b=>b.id===building?.id);
 if(!building||!plates||!pattern||building.floors.length!==6||plates.floors.length!==6||pattern.stairs.length!==5||b35.levels.length!==5)fail('INPUT_STRUCTURE');
 const levels=[];
 for(let i=0;i<5;i++){
  const floor=building.floors[i+1],plate=plates.floors[i+1],source=b35.levels[i],stair=pattern.stairs[i];
  if(floor.level!==i+2||plate.level!==floor.level||source.level!==floor.level||!stair.upperFloor.endsWith('/L'+floor.level)||!stair.lowerFloor.endsWith('/L'+(floor.level-1)))fail('FLOOR_MAPPING');
  const shaft=floor.stairReservation.map(p=>({x:p.x,z:p.z+1})),cut=b34.reviews[0].floors[i].shiftedOpeningCellsLocal;
  const projections=projectStepsB36({stair,offset:{dx:0,dz:1},shiftedShaftCells:shaft,shiftedCutoutCells:cut,lowerFloorWalls:pattern.floors[i].wallCandidates});
  if(projections.stepsOutsideShaft||projections.projectedHeadspaceOutsideShaft||!projections.projectedCutoutsEqual||projections.lowerFloorWallStepIntersections||projections.lowerFloorWallHeadspaceIntersections)fail('PROJECTED_STAIRS_FAILED');
  const variants=source.options.map(opt=>{
   const del=new Set(opt.removedKeys),cor=floor.corridorReservation.filter(p=>!del.has(key(p)));
   const face=analyzeLandingInterfaceB36({width:plate.width,depth:plate.depth,floorRows:plate.overlayRows,
    corridorCells:cor,shaftCells:shaft,openingCells:cut,doorHallCells:floor.roomDoorInterfaces.map(p=>p.hallCell),
    wallBoundaries:floor.wallBoundaries});
   if(opt.unservedDoorIds.length||!opt.doorPathsPreserved||face.cutoutAdjacentEdgeCount<1)fail('NO_NOMINAL_ACCESS');
   return {id:opt.id,removedKeys:opt.removedKeys,isolatedCorridorKeys:opt.isolatedCells,
    nominalWallEndpointFlags:opt.nominalWallEndpointFlags,...face,autoApproved:false};
  });
  levels.push({level:floor.level,options:variants,stepProjection:projections,
   stairCutoutCellKeys:ordered(new Set(cut.map(key))),wallJointStatus:'UNKNOWN_NOMINAL_SEGMENT_ONLY',
   landingStatus:'UNKNOWN_MUST_DEFINE_ACCESS_AND_LANDING_FOOTPRINT',
   floorSupportStatus:'UNKNOWN_NO_PHYSICAL_SUPPORT_DATA'});
 }
 const sum=(ix,k)=>levels.reduce((n,l)=>n+l.options[ix][k],0);
 const totals={levels:5,doorHallPorts:65,optionAFaceEdges:sum(0,'edgeCount'),optionBFaceEdges:sum(1,'edgeCount'),
  optionACutoutAdjacentFaces:sum(0,'cutoutAdjacentEdgeCount'),optionBCutoutAdjacentFaces:sum(1,'cutoutAdjacentEdgeCount'),
  optionANominalSeamWallEdges:sum(0,'nominalSeamBoundaryMatches'),optionBNominalSeamWallEdges:sum(1,'nominalSeamBoundaryMatches'),
  stairStepsProjected:levels.reduce((n,l)=>n+l.stepProjection.stepCells,0),
  headspaceCellsProjected:levels.reduce((n,l)=>n+l.stepProjection.headspaceCells,0),
  physicallyProvenLandings:0,physicallyProvenSupports:0,verifiedDoorStates:0,approvedAlternatives:0,emittedOperations:0};
 const report={schema:'minecraftaibuilder-step8b-b36-local-section-v1',kind:'NONEXECUTABLE_STAIR_SECTION_DIAGNOSTIC',
  provenance:{source:'FROZEN_B35_B34_B31_B17_B21',B21SourceSha256:digest(src),
   shiftedStairGeometry:'TRANSLATED_B21_SCHEMATIC_PATTERN_NOT_REBUILT_ENGINE_STAIRS',runtimeCalled:false},
  building:building.id,shift:{dx:0,dz:1},levels,totals,
  assessment:{optionA:'REVIEW_ONLY_PRESERVES_ISOLATED_SOUTH_ACCESS_CANDIDATE',
   optionB:'REVIEW_ONLY_REMOVES_SOUTH_ACCESS_CANDIDATE',
   comparison:'NEITHER_PROVES_PHYSICAL_LANDING_OR_SUPPORT',chosenOption:null},
  nextIntegrationWork:['DEFINE_REAL_LANDING_FOOTPRINT','VALIDATE_REAL_WALL_JOINTS','VERIFY_FLOOR_SUPPORT_AND_HEADROOM',
   'MAP_REAL_STAIR_AND_DOOR_BLOCK_STATES','PROVE_RUNTIME_COORDINATE_AND_MATERIALS'],
  safety:{notPrepared:true,constructionApproved:false,executionAllowed:false,worldAccess:false,bridgeContact:false,
   existingConstructionModified:false,legacyModified:false,frozenEvidenceModified:false},
  readiness:'NOT_PREPARED',deployment:'BLOCKED',approval:'NONE',constructionCommands:0,
  BuildPlan:{status:'NOT_PREPARED',operations:[],materialIds:[],worldCoordinates:null,commandCount:0}};
 report.reportSha256=hash(report);return report;
}
export function validateStairSectionB36(report,root){
 if(report?.schema!=='minecraftaibuilder-step8b-b36-local-section-v1'||report?.readiness!=='NOT_PREPARED'||
  report.deployment!=='BLOCKED'||report.approval!=='NONE'||report.safety?.notPrepared!==true||
  report.safety?.constructionApproved!==false||report.safety?.executionAllowed!==false||
  report.safety?.worldAccess!==false||report.safety?.bridgeContact!==false||
  report.BuildPlan?.status!=='NOT_PREPARED'||report.BuildPlan?.operations?.length!==0||
  report.BuildPlan?.materialIds?.length!==0||report.BuildPlan?.worldCoordinates!==null||
  report.BuildPlan?.commandCount!==0||report.constructionCommands!==0||
  report.assessment?.chosenOption!==null||report.totals?.approvedAlternatives!==0||
  report.totals?.physicallyProvenLandings!==0||report.totals?.physicallyProvenSupports!==0)fail('UNSAFE_REPORT');
 const {reportSha256,...body}=report;
 if(reportSha256!==hash(body)||JSON.stringify(report)!==JSON.stringify(buildStairSectionB36(root)))fail('REPORT_CHANGED');
 return true;
}
