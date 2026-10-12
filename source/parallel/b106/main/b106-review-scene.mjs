/** B106: READ ONLY 3D review scene from B104 layout and B105 VoxelIR.
 * Data coordinates are strictly LOCAL, with no executable Minecraft BuildPlan.
 * Physical solidity, Bedrock compatibility and aesthetics remain unverified.
 */
import {createHash} from 'node:crypto';
import {auditB105} from '../../b105/main/b105-building-volume.mjs';
const hash=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
export const REVIEW_LAYERS=Object.freeze([
 'FACADE_PANEL_PROXY','WINDOW_GLAZING_PROXY','ROOF_CAP_PROXY',
 'EXTERIOR_PORTAL_VOID_PROXY','FURNITURE_PLACEHOLDER',
 'ROOM_FLOOR_TRACE','GALLERY_FLOOR_TRACE','CORE_LANDING_TRACE'
]);
const lookup=new Map(REVIEW_LAYERS.map((k,i)=>[k,i]));
function safe(design,volume){
 return design?.schema==='minecraftaibuilder-b104-co-design-v1'&&
 design.readonlyDesign===true&&design.constructionApproved===false&&
 design.worldContacts===0&&design.worldCoordinates===null&&
 design.blockOperations?.length===0&&design.BuildPlan?.status==='NOT_PREPARED'&&
 design.BuildPlan.operations?.length===0&&design.BuildPlan.commandCount===0&&
 design.BuildPlan.worldCoordinates===null&&design.layout?.constructionApproved===false&&
 design.plan?.constructionApproved===false&&design.plan?.worldContacts===0&&
 volume?.schema==='minecraftaibuilder-b105-building-volume-ir-v1'&&
 volume.readonlyArchitecturalIR===true&&volume.constructionApproved===false&&
 volume.worldContacts===0&&volume.worldCoordinates===null&&
 volume.blockOperations?.length===0&&volume.BuildPlan?.status==='NOT_PREPARED'&&
 volume.BuildPlan.operations?.length===0&&volume.BuildPlan.commandCount===0&&
 volume.BuildPlan.worldCoordinates===null&&
 volume.candidateId===design.candidateId;
}
function scanB105(design,volume){
 if(!safe(design,volume))throw Error('B106_UNSAFE_PARENT');
 const a=auditB105(volume,design.plan);
 if(a.envelopeConflicts||a.issueCount||a.roofCoverageGaps||a.portalVoidGaps||
 a.furniturePathViolations||a.stairInterfaceGaps||
 volume.summary.conceptRooms!==design.result.connected)
 throw Error('B106_UNSAFE_PARENT_GEOMETRY');
 return a;
}
function signature(scene){
 const {sceneSha256,...material}=scene;
 return hash(material);
}
/** Each packed primitive is [x,y,z,layerIndex,level], one local logical voxel.
 * Ghost portal air is a VIEW ANNOTATION, not a solid / fill-air operation.
 */
export function makeB106Scene(design,volume){
 const audit=scanB105(design,volume),packed=[];
 const push=(x,y,z,kind,level)=>{
  if(![x,y,z,level].every(Number.isInteger)||!lookup.has(kind))
   throw Error('B106_BAD_SCENE_COORDINATES');
  packed.push([x,y,z,lookup.get(kind),level]);
 };
 for(const v of volume.voxels)push(v.x,v.y,v.z,v.kind,v.level);
 const voxelCount=packed.length;
 for(const f of design.plan.floors){
  for(const r of f.rooms)for(let z=r.z+1;z<r.z+r.depth-1;z++)
   for(let x=r.x+1;x<r.x+r.width-1;x++)
    push(x,f.level*5,z,'ROOM_FLOOR_TRACE',f.level);
  for(const p of f.gallery)push(p.x,f.level*5,p.z,'GALLERY_FLOOR_TRACE',f.level);
 }
 for(const q of volume.junctions){
  push(q.coreLanding.x,q.coreLanding.y,q.coreLanding.z,'CORE_LANDING_TRACE',q.level);
 }
 const bounds={minX:Math.min(...packed.map(p=>p[0])),maxX:Math.max(...packed.map(p=>p[0])),
  minY:Math.min(...packed.map(p=>p[1])),maxY:Math.max(...packed.map(p=>p[1])),
  minZ:Math.min(...packed.map(p=>p[2])),maxZ:Math.max(...packed.map(p=>p[2]))};
 const perLayer=Object.fromEntries(REVIEW_LAYERS.map((kind,i)=>
  [kind,packed.filter(p=>p[3]===i).length]));
 const scene={schema:'minecraftaibuilder-b106-read-only-review-scene-v1',
  id:volume.candidateId,typology:volume.typology,levels:volume.levels,
  facadeProfile:volume.facadeProfile,roofProfile:volume.roofProfile,
  layerNames:[...REVIEW_LAYERS],primitives:packed,bounds,voxelCount,
  stats:{...perLayer,conceptRooms:volume.summary.conceptRooms,
   connectedRooms:design.result.connected,roofCaps:volume.summary.roofCaps,
   allRoofGaps:audit.roofCoverageGaps,interiorPathObstructions:audit.furniturePathViolations,
   exteriorExitCandidates:volume.summary.exteriorPortalPairs,
   conceptualVerticalLinks:volume.summary.conceptualVerticalLinks,
   physicalFinishedRooms:0,verifiedEducationBlockStates:0,visualReviewStatus:'HUMAN_NOT_REVIEWED'},
  scope:'LOCAL_DESIGN_REVIEW_ONLY',displayScale:'ONE_VISUAL_UNIT_PER_LOGICAL_CELL',
  annotation:'Minecraft Education 3D conceptual review — not actual blocks, real doors, stairs, furniture or finished construction',
  worldCoordinates:null,worldContacts:0,constructionApproved:false,
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}};
 return {...scene,sceneSha256:signature(scene)};
}
export function validateB106Scene(scene){
 if(scene?.schema!=='minecraftaibuilder-b106-read-only-review-scene-v1'||
 scene.scope!=='LOCAL_DESIGN_REVIEW_ONLY'||scene.worldCoordinates!==null||
 scene.worldContacts!==0||scene.constructionApproved!==false||
 scene.BuildPlan?.status!=='NOT_PREPARED'||scene.BuildPlan.operations?.length!==0||
 scene.BuildPlan.commandCount!==0||scene.BuildPlan.worldCoordinates!==null||
 !Array.isArray(scene.primitives)||scene.primitives.length<1||
 !Array.isArray(scene.layerNames)||JSON.stringify(scene.layerNames)!==JSON.stringify(REVIEW_LAYERS)||
 scene.voxelCount>scene.primitives.length||!scene.bounds||
 ['minX','maxX','minY','maxY','minZ','maxZ'].some(k=>!Number.isInteger(scene.bounds[k]))||
 scene.stats?.physicalFinishedRooms!==0||
 scene.stats?.verifiedEducationBlockStates!==0||scene.stats?.visualReviewStatus!=='HUMAN_NOT_REVIEWED'||
 scene.stats?.conceptRooms!==scene.stats?.connectedRooms||
 scene.stats?.allRoofGaps!==0||scene.stats?.interiorPathObstructions!==0||
 scene.sceneSha256!==signature(scene))return false;
 const counts=Array(REVIEW_LAYERS.length).fill(0);
 for(const p of scene.primitives){
  if(!Array.isArray(p)||p.length!==5||!p.every(Number.isInteger)||
   p[3]<0||p[3]>=counts.length||p[4]<0||p[4]>=scene.levels)return false;
  counts[p[3]]++;
 }
 if(counts.slice(0,5).reduce((n,v)=>n+v,0)!==scene.voxelCount)return false;
 return REVIEW_LAYERS.every((kind,i)=>scene.stats[kind]===counts[i])&&
 scene.stats.ROOF_CAP_PROXY===scene.stats.roofCaps;
}
export const EDUCATION_RESEARCH_REGISTRY=Object.freeze({
 schema:'minecraftaibuilder-b106-education-block-candidates-v1',
 targetEdition:'MINECRAFT_EDUCATION',targetVersion:'26.3',
 referenceScope:'BEDROCK_STABLE_DOCUMENTATION_NOT_EDUCATION_VERSION_LOCK',
 referenceUrl:'https://learn.microsoft.com/en-us/minecraft/creator/commands/enums/block?view=minecraft-bedrock-stable',
 stateDefinitionReferenceUrl:'https://github.com/MicrosoftDocs/minecraft-creator/blob/main/creator/Reference/Content/BlockReference/Examples/BlockStatesAndPermutations.md',
 readingMode:'OFFLINE_READ_ONLY',
 candidates:{
  FACADE_PANEL_PROXY:{ids:['minecraft:stone','minecraft:oak_planks'],state:'UNKNOWN'},
  WINDOW_GLAZING_PROXY:{ids:['minecraft:glass'],state:'UNKNOWN'},
  ROOF_CAP_PROXY:{ids:['minecraft:stone'],state:'UNKNOWN'},
  EXTERIOR_PORTAL_VOID_PROXY:{ids:[],state:'SPATIAL_VOID_NOT_A_BLOCK_COMMAND'},
  FURNITURE_PLACEHOLDER:{ids:[],state:'ABSTRACT_FURNITURE_UNMAPPED'},
  ROOM_FLOOR_TRACE:{ids:[],state:'VISUAL_ANNOTATION_ONLY'},
  GALLERY_FLOOR_TRACE:{ids:[],state:'VISUAL_ANNOTATION_ONLY'},
  CORE_LANDING_TRACE:{ids:[],state:'UNVERIFIED_STAIR_LANDING'}
 },
 validatedOnEducationVersion:false,verifiedBlockStates:0,canEmitOperations:false,
 constructionApproved:false,worldContacts:0
});
/** Candidate IDs are REFERENCES, not a compatible Minecraft block-state translation. */
export function auditB106Registry(scene,registry=EDUCATION_RESEARCH_REGISTRY){
 if(!validateB106Scene(scene)||registry?.targetEdition!=='MINECRAFT_EDUCATION'||
 registry.targetVersion!=='26.3'||registry.readingMode!=='OFFLINE_READ_ONLY'||
 registry.validatedOnEducationVersion!==false||registry.verifiedBlockStates!==0||
 registry.canEmitOperations!==false||registry.constructionApproved!==false||
 registry.worldContacts!==0)throw Error('B106_UNSAFE_REGISTRY');
 const unresolved=scene.layerNames.filter(k=>!registry.candidates?.[k]||
 registry.candidates[k].state!=='UNKNOWN'||
 !registry.candidates[k].ids?.length);
 const candidateCount=scene.layerNames.filter(k=>registry.candidates[k]?.ids?.length).length;
 const result={schema:'minecraftaibuilder-b106-compatibility-audit-v1',
  candidateId:scene.id,targetVersion:registry.targetVersion,
  semanticLayers:scene.layerNames.length,layersWithReferenceIds:candidateCount,
  versionPinnedVerifiedStates:0,certifiedRealBlocks:0,
  unsupportedOrAbstractLayers:unresolved,
  status:'NEEDS_VERSION_PINNED_EDUCATION_REGISTRY_AND_REAL_BLOCKSTATE_TEST',
  worldContacts:0,constructionApproved:false,
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}};
 return result;
}
