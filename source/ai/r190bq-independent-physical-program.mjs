/** R190-BQ: independent physical program evidence from final B143 voxels.
 * Pure source audit. No LLM, geometry repair, world, or typology templates.
 */
import {createHash} from 'node:crypto';
export const BM_ORIGINAL_BRIEF_SHA='bbd44cc9f28234055601b4055466e2f3564e7e4565d408432de4c4fab0aa277a';
const hash=b=>createHash('sha256').update(b).digest('hex');
const key=(x,y,z)=>x+','+y+','+z;
const review=(id,question)=>({id,question,status:'HUMAN_REVIEW_REQUIRED',automaticPass:false});
export function auditR190BQ({originalBrief,raw,compiled,programSpaces,levels,geometrySha256,origin}){
 if(!(originalBrief instanceof Uint8Array)||!(raw instanceof Uint8Array)||
    !Array.isArray(compiled?.primitives)||!Array.isArray(programSpaces)||!Array.isArray(levels))
   throw Error('R190BQ_EVIDENCE_INPUT');
 if(compiled.geometrySha256!==geometrySha256)throw Error('R190BQ_GEOMETRY_SHA');
 const voxels=new Set(compiled.primitives.map(v=>key(v[0],v[1],v[2])));
 const elevations=new Map(levels.map(v=>[v.id,v.standingY]));
 const spaces=programSpaces.map(s=>{
  const y=elevations.get(s.levelId),[x,z]=s.origin,[w,d]=s.size;
  if(!Number.isSafeInteger(y))throw Error('R190BQ_LEVEL');
  let supportedFloorCells=0,obstructedAirCells=0;
  for(let xx=x;xx<x+w;xx++)for(let zz=z;zz<z+d;zz++){
   if(voxels.has(key(xx,y-1,zz)))supportedFloorCells++;
   for(let yy=y;yy<y+s.clearHeight;yy++)if(voxels.has(key(xx,yy,zz)))obstructedAirCells++;
  }
  const floorAreaCells=w*d,airVolumeCells=floorAreaCells*s.clearHeight;
  return {id:s.id,sourceDeclaredPurpose:s.purpose,sourceDeclaredPurposeIsProof:false,
   levelId:s.levelId,standingY:y,originXZ:[x,z],dimensionsXZ:[w,d],clearHeight:s.clearHeight,
   floorAreaCells,supportedFloorCells,missingSupportCells:floorAreaCells-supportedFloorCells,
   airVolumeCells,obstructedAirCells,verifiedAirCells:airVolumeCells-obstructedAirCells,
   physicallyOpenAndSupported:supportedFloorCells===floorAreaCells&&obstructedAirCells===0};
 });
 const physicalLevels=[...new Set(spaces.map(s=>s.standingY))].sort((a,b)=>a-b);
 const bmExactOriginalBrief=hash(originalBrief)===BM_ORIGINAL_BRIEF_SHA;
 const minimumLevelPrerequisite=!bmExactOriginalBrief?'NOT_APPLICABLE':physicalLevels.length<3?
  'HOLD_MISSING_THIRD_LEVEL':'OBSERVED_NOT_SUFFICIENT';
 const mandatoryHumanChecks=bmExactOriginalBrief?[
  review('first-hall','1階の独立した大広間は本当に使える空間か'),
  review('second-hall','2階の別の大広間と床は成立しているか'),
  review('upper-offices','3階以上に実用的なオフィス空間があるか'),
  review('upper-restaurant','最上階付近に利用できるレストランがあるか'),
  review('large-tall','高層・大規模として用途に見合う規模と比例か'),
  review('continuous-route','外部入口から全用途へ人間が上下移動できるか')
 ]:[review('source-request','元日本語依頼の用途・空間・意匠を満たすか')];
 return {schema:'minecraftaibuilder-r190bq-independent-physical-program-v1',
  origin,originalBriefSha256:hash(originalBrief),rawSourceSha256:hash(raw),geometrySha256,
  source:'INDEPENDENT_RECOUNT_OF_FINAL_B143_VOXELS',
  bmExactOriginalBrief,physicalLevels,spaces,minimumLevelPrerequisite,mandatoryHumanChecks,
  counts:{authoredSpaces:spaces.length,distinctStandingLevels:physicalLevels.length,
   fullyOpenSupportedSpaces:spaces.filter(s=>s.physicallyOpenAndSupported).length,
   totalFloorAreaCells:spaces.reduce((a,s)=>a+s.floorAreaCells,0),
   totalVerifiedAirCells:spaces.reduce((a,s)=>a+s.verifiedAirCells,0)},
  independentRequestFidelity:'NOT_CERTIFIED',result:'HOLD_HUMAN_INDEPENDENT_BRIEF_REVIEW',
  art:'ART_HOLD',minecraftWalking:'NOT_TESTED',worldWrites:0,worldContacts:0,
  readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
  constructionApproved:false,executionAllowed:false};
}
