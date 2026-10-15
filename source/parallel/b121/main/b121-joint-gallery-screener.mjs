/** B121 — jointly review an unbuilt stair AND unbuilt B114 gallery overlay.
 * Original source gallery and B113 repair baseline remain immutable.
 * Output is diagnostic only: no executable plan or Minecraft I/O.
 */
import {buildB120UTurn,screenB120UTurn} from '../../b120/main/b120-u-return-screener.mjs';
import {searchB118Exit} from '../../b118/main/b118-exit-alternatives.mjs';
const K=p=>p.x+','+p.z;
const DIRS=[{dx:1,dz:0},{dx:0,dz:1},{dx:-1,dz:0},{dx:0,dz:-1}];
const point=p=>p&&Number.isSafeInteger(p.x)&&Number.isSafeInteger(p.z);
const unique=items=>new Set(items.map(K));
const countHits=(cells,set)=>cells.filter(p=>set.has(K(p))).length;
export function auditB121JointPose({model,design,stair,otherModels=[],solidMap,
 protectedWalkByLevel,stagedGalleryByLevel,occupiedByLevel,aperturesByLevel}){
 if(!model||!design?.plan||!stair||!Array.isArray(otherModels)||
 !(solidMap instanceof Map)||!Array.isArray(protectedWalkByLevel)||
 !Array.isArray(stagedGalleryByLevel)||!Array.isArray(occupiedByLevel)||
 !Array.isArray(aperturesByLevel))
 throw Error('B121_SOURCE_INPUT_REQUIRED');
 const levels=[stair.fromLevel,stair.toLevel];
 for(const L of levels){
  if(!(protectedWalkByLevel[L] instanceof Set)||
    !(stagedGalleryByLevel[L] instanceof Set)||
    !(occupiedByLevel[L] instanceof Set)||
    !(aperturesByLevel[L] instanceof Set))throw Error('B121_SOURCE_SET_REQUIRED');
 }
 const stagedOverlap={};
 const combined=protectedWalkByLevel.map((s,i)=>new Set([...(s??[]),...(stagedGalleryByLevel[i]??[])]));
 for(const level of levels){
  const onlyTentative=new Set([...stagedGalleryByLevel[level]].filter(x=>!protectedWalkByLevel[level].has(x)));
  stagedOverlap[level]={footprintCells:countHits(model.footprint,onlyTentative),
   displacedTentativeCells:[...new Set(model.footprint.map(K))].filter(k=>onlyTentative.has(k)).sort()};
 }
 const before=screenB120UTurn({model,design,stair,otherModels,solidMap,
  walkByLevel:combined,occupiedByLevel,aperturesByLevel});
 const counterfactual=screenB120UTurn({model,design,stair,otherModels,solidMap,
  walkByLevel:protectedWalkByLevel,occupiedByLevel,aperturesByLevel});
 const immutableProblems=counterfactual.reasonCodes;
 const onlyStagedObstacle=before.reasonCodes.includes('PRESERVED_GALLERY_FOOTPRINT')&&
  !counterfactual.reasonCodes.includes('PRESERVED_GALLERY_FOOTPRINT');
 const routes={};
 if(counterfactual.status==='CONDITIONAL_U_TURN_DESIGN_ONLY'){
  for(const [side,level,landing] of [
   ['LOWER',stair.fromLevel,model.lowerLanding],
   ['UPPER',stair.toLevel,model.upperLanding]]){
   const f=design.plan.floors[level],occupied=new Set(occupiedByLevel[level]);
   for(const p of model.footprint)occupied.add(K(p));
   const reroute=searchB118Exit({floor:f,rooms:f.rooms,cores:design.plan.cores,
    stairCells:occupied,apertures:aperturesByLevel[level],
    landing,walk:protectedWalkByLevel[level],maxPaths:1});
   if(!reroute.candidates.length)throw Error('B121_ROUTE_RECONSTRUCTION_MISMATCH');
   routes[side]={level,addedCells:reroute.candidates[0].addedCells,
    routeFootprint:reroute.candidates[0].routeFootprint,
    localTwoWideOnly:true};
  }
 }
 const newlyViable=before.status!=='CONDITIONAL_U_TURN_DESIGN_ONLY'&&
   counterfactual.status==='CONDITIONAL_U_TURN_DESIGN_ONLY';
 return {status:newlyViable?'SIMULTANEOUS_UNBUILT_STAIR_GALLERY_REPLAN_IDEA':
  counterfactual.status==='CONDITIONAL_U_TURN_DESIGN_ONLY'?
   'ALREADY_POSSIBLE_WITH_PROTECTED_GALLERY':'IMMUTABLE_SOURCE_OR_OTHER_CONSTRAINT_HOLD',
  beforeAllProposalsStatus:before.status,beforeReasonCodes:before.reasonCodes,
  counterfactualReasonCodes:immutableProblems,onlyStagedObstacle,
  stagedOverlap,routeReplacementConcepts:routes,
  addedRouteCellCount:Object.values(routes).reduce((n,r)=>n+r.addedCells.length,0),
  originalSourceGalleryUntouched:true,protectedB113BaselineUntouched:true,
  originalStagedGalleryStillHeld:true,
  stageWideNetworkNeedsIndependentRevalidation:true,
  currentConstructionHOLD:true,worldContacts:0,
  actualMinecraftWalkabilityCertified:false,
  executableOperations:[]};
}
export function searchB121Joint({design,stair,otherModels=[],solidMap,
 protectedWalkByLevel,stagedGalleryByLevel,occupiedByLevel,aperturesByLevel,
 maxShift=3,nearest=4}){
 if(![0,1,2,3].includes(maxShift)||!Number.isInteger(nearest)||nearest<1||nearest>8||
 !point(stair?.proposedOrigin))throw Error('B121_UNBOUNDED_SEARCH');
 const all=[],reasonTally=new Map(),summary={examined:0,alreadyClear:0,
  newlyViable:0,sourceBlocked:0,displacedTentativeFootprintCandidates:0};
 for(const firstRise of [2,3])for(const ascent of DIRS)
  for(let dx=-maxShift;dx<=maxShift;dx++)for(let dz=-maxShift;dz<=maxShift;dz++){
   if(Math.abs(dx)+Math.abs(dz)>maxShift)continue;
   const origin={x:stair.proposedOrigin.x+dx,z:stair.proposedOrigin.z+dz};
   const model=buildB120UTurn({origin,ascent,fromLevel:stair.fromLevel,firstRise});
   const report=auditB121JointPose({model,design,stair,otherModels,solidMap,
    protectedWalkByLevel,stagedGalleryByLevel,occupiedByLevel,aperturesByLevel});
   summary.examined++;
   const shifted=Object.values(report.stagedOverlap).reduce((n,x)=>n+x.footprintCells,0);
   if(shifted)summary.displacedTentativeFootprintCandidates++;
   if(report.status==='SIMULTANEOUS_UNBUILT_STAIR_GALLERY_REPLAN_IDEA')summary.newlyViable++;
   else if(report.status==='ALREADY_POSSIBLE_WITH_PROTECTED_GALLERY')summary.alreadyClear++;
   else summary.sourceBlocked++;
   for(const code of report.counterfactualReasonCodes)
    reasonTally.set(code,(reasonTally.get(code)??0)+1);
   if(report.status==='SIMULTANEOUS_UNBUILT_STAIR_GALLERY_REPLAN_IDEA'||
      report.status==='ALREADY_POSSIBLE_WITH_PROTECTED_GALLERY'){
    all.push({...report,pose:{firstRise,origin,ascent},
     translationDistance:Math.abs(dx)+Math.abs(dz)});
   }
  }
 all.sort((a,b)=>a.translationDistance-b.translationDistance||
  (Object.values(a.stagedOverlap).reduce((n,x)=>n+x.footprintCells,0)-
   Object.values(b.stagedOverlap).reduce((n,x)=>n+x.footprintCells,0))||
  a.addedRouteCellCount-b.addedRouteCellCount||
  a.pose.firstRise-b.pose.firstRise||
  a.pose.origin.z-b.pose.origin.z||a.pose.origin.x-b.pose.origin.x);
 return {schema:'B121_SOURCE_PROTECTED_GALLERY_REPLAN_SEARCH',
  totals:summary,shortlist:all.slice(0,nearest),
  reasonCounts:Object.fromEntries([...reasonTally].sort(([a],[b])=>a.localeCompare(b))),
  allNineOriginalHoldsRemain:true,sourceChanged:false,constructionAuthorized:false,
  globalConnectivityCertified:false,physicalTraversalCertified:false,
  worldContacts:0,BuildPlan:{operations:[]}};
}
