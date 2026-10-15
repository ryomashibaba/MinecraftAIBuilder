/** B126: design-only stair BLOCKSTATE candidates / upper-floor interference witness.
 * No runnables, setblock strings, world coordinates or acceptance of Education physics.
 * Bedrock generic reference: Microsoft Learn default block listings and aux-state map.
 */
import {transformStairBox} from '../../b114/main/b114-stair-grid-frame.mjs';
const K=p=>p.x+','+p.z;
const Q=p=>p.x+','+p.y+','+p.z;
const valid=p=>p&&Number.isSafeInteger(p.x)&&Number.isSafeInteger(p.z);
const inside=(r,p)=>p.x>=r.x&&p.x<r.x+r.width&&p.z>=r.z&&p.z<r.z+r.depth;
const ORIENTATIONS=Object.freeze([0,1,2,3]);
export const BEDROCK_STAIR_EVIDENCE=Object.freeze({
 blockId:'minecraft:oak_stairs',
 keys:['weirdo_direction','upside_down_bit'],
 fullBlockSideDirectionCandidates:[...ORIENTATIONS],
 source:'https://learn.microsoft.com/en-us/minecraft/creator/reference/content/blockreference/examples/auxvaluetoblockstatemap?view=minecraft-bedrock-stable',
 educationVersionParity:'UNVERIFIED',
 relativeFacingMapping:'UNVERIFIED',
 autoCornerStateOutcome:'UNVERIFIED',
 educationRealCollisionShape:'UNVERIFIED'
});
function requireFloor(f){
 if(!f||!Array.isArray(f.footprintRows)||!f.footprintRows.length||
 f.footprintRows.some(r=>typeof r!=='string'||!/^[01]+$/.test(r))||
 !Array.isArray(f.rooms)||!Array.isArray(f.gallery))
 throw Error('B126_INVALID_FLOOR_EVIDENCE');
}
function addIssue(m,code,p){
 let v=m.get(code);
 if(!v){v={code,count:0,samples:[]};m.set(code,v);}
 v.count++;
 if(v.samples.length<12)v.samples.push(p);
}
export function auditB126StairMaterialization({
 shape,model,upperFloor,sourceVoxels=[],b125CutCells=[],
 protectedWalk=new Set(),referenceCutCount
}){
 requireFloor(upperFloor);
 if(!model||!valid(model.origin)||!model.ascent||
 !Number.isSafeInteger(model.fromLevel)||model.fromLevel<0||
 !Array.isArray(model.footprint)||!model.footprint.every(valid)||
 !Array.isArray(model.upperLanding)||model.upperLanding.length!==2||
 !model.upperLanding.every(valid)||
 !Array.isArray(sourceVoxels)||!sourceVoxels.every(p=>[p.x,p.y,p.z].every(Number.isSafeInteger))||
 !Array.isArray(b125CutCells)||!b125CutCells.every(p=>valid(p)&&Number.isSafeInteger(p.y))||
 !(protectedWalk instanceof Set)||!Number.isInteger(referenceCutCount)||
 b125CutCells.length!==referenceCutCount)
 throw Error('B126_UNPINNED_SOURCE_INPUT');
 if(model.ascent.dx===undefined||model.ascent.dz===undefined||
 !Number.isInteger(model.ascent.dx)||!Number.isInteger(model.ascent.dz)||
 Math.abs(model.ascent.dx)+Math.abs(model.ascent.dz)!==1)
 throw Error('B126_INVALID_STAIR_ASCENT');
 const upperY=(model.fromLevel+1)*5;
 const issue=new Map();
 const cuts=new Set(b125CutCells.map(p=>Q(p)));
 const cutFoot=new Set(b125CutCells.map(K));
 const landingSet=new Set(model.upperLanding.map(K));
 if(cuts.size!==referenceCutCount)throw Error('B126_DUPLICATED_SLAB_CUTS');
 for(const p of b125CutCells){
  if(p.y!==upperY)throw Error('B126_CUT_Y_REFERENCE_DRIFT');
  if(upperFloor.footprintRows[p.z]?.[p.x]!=='1')
   addIssue(issue,'CUT_OUTSIDE_SOURCE_FLOOR',p);
  if(landingSet.has(K(p)))addIssue(issue,'CUT_REMOVES_UPPER_LANDING',p);
  if(protectedWalk.has(K(p)))addIssue(issue,'CUT_REMOVES_PROTECTED_GALLERY',p);
  if(upperFloor.rooms.some(r=>inside(r,p)))addIssue(issue,'CUT_TOUCHES_SOURCE_ROOM',p);
 }
 const sourceIndex=new Map(sourceVoxels.filter(x=>x.kind!=='EXTERIOR_PORTAL_VOID_PROXY')
  .map(p=>[Q(p),p]));
 const cells=[],frame={origin:model.origin,ascent:model.ascent,fromLevel:model.fromLevel};
 if(shape==='STRAIGHT_HALF_STEP_PROXY'){
  const foot=new Set(model.footprint.map(K));
  if(foot.size!==14)throw Error('B126_STRAIGHT_FOOTPRINT_DRIFT');
  for(let rise=0;rise<5;rise++)for(let lane=0;lane<2;lane++){
   const t=transformStairBox({x:rise+1,y:rise,z:lane,
    width:1,height:1,depth:1},frame);
   if(!Number.isSafeInteger(t.x)||!Number.isSafeInteger(t.y)||
     !Number.isSafeInteger(t.z)||t.width!==1||t.height!==1||t.depth!==1)
    throw Error('B126_NON_VOXEL_TRANSFORM');
   const loc={x:t.x,y:t.y,z:t.z};
   if(!foot.has(K(loc)))throw Error('B126_STAIR_BLOCK_OUTSIDE_SOURCE_FOOTPRINT');
   const isOnUpperSlab=loc.y===upperY;
   const sourceFloorPresent=upperFloor.footprintRows[loc.z]?.[loc.x]==='1';
   const preservedSlabConflict=isOnUpperSlab&&sourceFloorPresent&&!cuts.has(Q(loc));
   if(preservedSlabConflict)
    addIssue(issue,'STAIR_BLOCK_OCCUPIES_UNREMOVED_UPPER_SLAB',loc);
   if(sourceIndex.has(Q(loc))&&!cuts.has(Q(loc)))
    addIssue(issue,'PROPOSED_STAIR_BLOCK_REPLACES_SOURCE_B105_SOLID',{
     ...loc,sourceKind:sourceIndex.get(Q(loc)).kind});
   // Below-support is descriptive only; stairs require engine-level physics to validate.
   const below=sourceIndex.has(Q({x:loc.x,y:loc.y-1,z:loc.z}));
   cells.push({relativeDesignCell:loc,ascentBlockIndex:rise,
    lane,sourceVoxelDirectlyBelow:below,
    hypotheticalMaterial:BEDROCK_STAIR_EVIDENCE.blockId,
    possibleWeirdoDirections:[...ORIENTATIONS],
    upside_down_bit:false,
    actualFacingUnresolved:true,
    actualCollisionUnverified:true,
    scheduledForConstruction:false});
  }
 }else if(shape==='B120_BOUNDED_U_RETURN_5_RISE'){
  addIssue(issue,'U_TURN_REQUIRES_EXACT_BLOCK_CORNER_AND_PLATFORM_MAPPING',{
   firstRise:model.firstRise??null
  });
 }else throw Error('B126_UNRECOGNIZED_STAIR_SHAPE');
 const sortedIssues=[...issue.values()].sort((a,b)=>a.code.localeCompare(b.code));
 return {
  status:sortedIssues.length?'HOLD_STAIR_BLOCKSTATE_AND_SLAB_FIT':
   'NO_SCOPED_CANDIDATE_BLOCK_CONFLICT_BUT_STATE_UNVERIFIED',
  shape,fromLevel:model.fromLevel,toLevel:model.fromLevel+1,
  analyzedPotentialStairCells:cells.length,
  modelRiseBlocks:5,sourceFootprintCells:model.footprint.length,
  verifiedGenericBedrockStateDomain:[...ORIENTATIONS],
  candidateMaterial:BEDROCK_STAIR_EVIDENCE.blockId,
  genericBedrockEvidence:BEDROCK_STAIR_EVIDENCE,
  blocks:cells,sourceSlabY:upperY,
  conceptualCutCells:b125CutCells.length,
  sourceGalleryCutConflicts:sortedIssues.find(x=>x.code==='CUT_REMOVES_PROTECTED_GALLERY')?.count??0,
  retainedSlabBlockOverlapCount:sortedIssues.find(x=>x.code==='STAIR_BLOCK_OCCUPIES_UNREMOVED_UPPER_SLAB')?.count??0,
  findings:sortedIssues,
  stateMappingAuthorized:false,
  educationVersionBlockRegistryCertified:false,
  bedrockToEducationParityCertified:false,
  actualBlockFacingCertified:false,
  physicalPassageCertified:false,
  structuralSupportCertified:false,
  constructionAllowed:false,worldContacts:0,worldCoordinates:null,
  operations:[],sourceBuildingModified:false
 };
}
