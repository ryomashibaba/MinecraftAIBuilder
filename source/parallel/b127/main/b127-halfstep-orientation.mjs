/** B127: quantify half-step surface geometry and orientation identifiability.
 * ALL coordinates are design-local; no Education operations, calibration or physics claims.
 */
import {transformStairBox} from '../../b114/main/b114-stair-grid-frame.mjs';
const K=p=>p.x+','+p.y+','+p.z;
const DIRS=[{dx:1,dz:0},{dx:0,dz:1},{dx:-1,dz:0},{dx:0,dz:-1}];
const hit=(a,b)=>a.x<b.x+b.width&&b.x<a.x+a.width&&a.y<b.y+b.height&&
 b.y<a.y+a.height&&a.z<b.z+b.depth&&b.z<a.z+a.depth;
const finite=p=>p&&Number.isSafeInteger(p.x)&&Number.isSafeInteger(p.y)&&Number.isSafeInteger(p.z);
const perms=a=>a.length===0?[[]]:a.flatMap((n,i)=>perms(a.filter((_,j)=>j!==i)).map(t=>[n,...t]));
export const DIRECTION_HYPOTHESES=Object.freeze(perms([0,1,2,3]).map(p=>Object.freeze(p)));
export const EDUCATION_CALIBRATION_UNVERIFIED=Object.freeze({
 targetEdition:'Minecraft Education',
 prototypeHalfStepShape:'STAIR_BOTTOM_SLAB_PLUS_ONE_HIGH_HALF',
 orientationMapping:'UNKNOWN_REQUIRES_EDUCATION_OBSERVATION',
 placementAndReadback:'NOT_PERFORMED',realStepPhysics:'UNVERIFIED',
 realDoorAndSlabSupport:'UNVERIFIED',
 referenceOnly:'https://learn.microsoft.com/en-us/minecraft/creator/reference/content/blockreference/examples/auxvaluetoblockstatemap?view=minecraft-bedrock-stable'
});
function sourceWitness(model,geometry){
 const frame={origin:model.origin,ascent:model.ascent,fromLevel:model.fromLevel};
 const halfHeightSamples=[],conflicts=[];
 for(let rise=0;rise<5;rise++)for(let lane=0;lane<2;lane++)
 for(const [quarter,offset] of [[0,.25],[1,.75]])
 for(const yOffset of [.25,.75]){
  const a=transformStairBox({x:rise+1+offset-.02,
   y:rise+yOffset-.02,z:lane+.5-.02,width:.04,height:.04,depth:.04},frame);
  const wasBlocked=model.treads.some(b=>hit(a,b));
  const projected= yOffset===.25 || (geometry==='FORWARD_UPPER_HALF'?quarter===1:quarter===0);
  const sample={step:rise,lane,relativeXQuarter:quarter,localHeight:yOffset,
   sourceTreadPresent:wasBlocked,prototypeStairPresent:projected};
  halfHeightSamples.push(sample);
  if(wasBlocked!==projected)conflicts.push(sample);
 }
 return {halfHeightSamples,conflicts};
}
export function reviewB127HalfStepOrientations({model,priorB126,sourceB125CutCells}){
 if(!model||!Number.isSafeInteger(model.origin?.x)||!Number.isSafeInteger(model.origin?.z)||
 !Number.isInteger(model.fromLevel)||model.fromLevel<0||
 !DIRS.some(d=>d.dx===model.ascent?.dx&&d.dz===model.ascent?.dz)||
 !Array.isArray(model.treads)||!Array.isArray(model.footprint)||
 !priorB126||!Array.isArray(priorB126.blocks)||
 !Array.isArray(sourceB125CutCells)||!sourceB125CutCells.every(finite)||
 priorB126.shape!=='STRAIGHT_HALF_STEP_PROXY')
 throw Error('B127_BAD_OR_UNPINNED_GEOMETRY');
 const listed=priorB126.blocks.map(x=>x.relativeDesignCell);
 if(listed.length!==10||new Set(listed.map(K)).size!==10||
 priorB126.conceptualCutCells!==sourceB125CutCells.length||
 priorB126.sourceSlabY!==(model.fromLevel+1)*5||
 priorB126.stateMappingAuthorized!==false||
 priorB126.constructionAllowed!==false||
 priorB126.physicalPassageCertified!==false)
 throw Error('B127_B126_STATE_OR_CELL_DRIFT');
 const frame={origin:model.origin,ascent:model.ascent,fromLevel:model.fromLevel};
 const expected=[];
 for(let step=0;step<5;step++)for(let lane=0;lane<2;lane++){
  const b=transformStairBox({x:step+1,y:step,z:lane,width:1,height:1,depth:1},frame);
  if(b.width!==1||b.height!==1||b.depth!==1||
   !Number.isSafeInteger(b.x)||!Number.isSafeInteger(b.y)||!Number.isSafeInteger(b.z))
   throw Error('B127_ROTATED_STAIR_NOT_UNIT_VOXEL');
  expected.push({x:b.x,y:b.y,z:b.z});
 }
 if(expected.some(p=>!listed.some(x=>K(x)===K(p))))
 throw Error('B127_STAIRS_DIFFER_FROM_B126_GEOMETRY');
 const geometries=['FORWARD_UPPER_HALF','REVERSE_UPPER_HALF'].map(kind=>{
  const c=sourceWitness(model,kind);
  return {kind,samplePoints:c.halfHeightSamples.length,
   mismatchedSourceTreadSamples:c.conflicts.length,
   mismatchExamples:c.conflicts.slice(0,12),
   localShapeOnly:true,educationBlockCollisionCertified:false};
 });
 const closest=Math.min(...geometries.map(x=>x.mismatchedSourceTreadSamples));
 const best=geometries.filter(x=>x.mismatchedSourceTreadSamples===closest);
 const cuts=new Set(sourceB125CutCells.map(K));
 const slabOverlap=expected.filter(p=>p.y===(model.fromLevel+1)*5&&!cuts.has(K(p)));
 if(slabOverlap.length)throw Error('B127_RETAINED_SLAB_OVERLAP_NOT_PROTECTED');
 const record={
  status:'CALIBRATION_REQUIRED_NON_EXECUTABLE',
  stairShape:'STRAIGHT_HALF_STEP_PROXY',fromLevel:model.fromLevel,
  toLevel:model.fromLevel+1,localAscent:model.ascent,
  analyzedCandidateStairCells:expected.length,
  sourceHalfStepSamplePoints:geometries[0].samplePoints,
  twoSourceProxyShapeTests:geometries,minimumShapeMismatchSamples:closest,
  sourceProxyPreferredHalfShape:best.length===1?best[0].kind:null,
  candidateDirectionCount:4,
  unverifiedDirectionBijections:DIRECTION_HYPOTHESES.length,
  // Individual state -> ascent mappings are ungrounded until actual Education evidence exists.
  directionHypotheses:DIRECTION_HYPOTHESES.map(p=>({valuesByDirection:p,
   calibrated:false,constructionAllowed:false})),
  genericBlockstateKey:'weirdo_direction',upsideDownBitCandidate:false,
  educationCalibration:EDUCATION_CALIBRATION_UNVERIFIED,
  experimentalReadbackReceiptRequired:true,
  verifiedEducationVersion:null,verifiedWorldStairStates:0,
  verifiedPhysicalStepPasses:0,actualBlockStateMapping:null,
  sourceB125CutCells:sourceB125CutCells.length,
  retainedUpperSlabOverlaps:0,
  originalStairGeometryChanged:false,worldContacts:0,
  executionAllowed:false,constructionAllowed:false,
  operations:[],worldCoordinates:null
 };
 return record;
}
