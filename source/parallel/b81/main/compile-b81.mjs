/** B81 - concrete typed local block-intents from B80 immutable 3D mock.
 * THIS IS NOT A WORLD PLAN. No game imports, world coordinates, bridges, or executable commands.
 * Every Bedrock door-facing/hinge choice remains uncalibrated; block IDs and state KEYS
 * are checked against the pinned official catalogue, not runtime behavior.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {hash,safe} from '../../b79/main/compile-b79.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../..');
const get=n=>JSON.parse(fs.readFileSync(path.join(root,n),'utf8'));
const error=s=>{throw Error('B81_'+s)};
const voxel=v=>`${v.x},${v.y},${v.z}`;
const flat=p=>`${p.x},${p.z}`;
const directions=new Map([['1,0','east'],['-1,0','west'],['0,1','south'],['0,-1','north']]);
const FROZEN='minecraftaibuilder-b80-readonly-local-3d-door-frame-mock-v1';
const BLOCKS='parallel/b75/main/evidence/Blocks.md';
export const MATERIALS=Object.freeze({door:'minecraft:spruce_door',frame:'minecraft:stone_bricks',partition:'minecraft:white_concrete'});
export const REQUIRED_DOOR_STATES=Object.freeze(['door_hinge_bit','minecraft:cardinal_direction','open_bit','upper_block_bit']);
export function parseCatalog(source){
 const result=new Map();
 for(const line of source.split(/\r?\n/)){
  const m=line.match(/^\|\s*(minecraft:[a-z0-9_]+)\s*\|([^|]*)\|\s*$/);
  if(m){if(result.has(m[1]))error('CATALOG_DUPLICATE');result.set(m[1],new Set(m[2].split(',').map(x=>x.trim()).filter(Boolean)));}
 }
 if(result.size<1000)error('CATALOG_TRUNCATED');return result;
}
export function validatePalette(catalog,materials=MATERIALS){
 for(const v of Object.values(materials))if(!catalog.has(v))error('UNKNOWN_MATERIAL_'+v);
 const door=catalog.get(materials.door);for(const state of REQUIRED_DOOR_STATES)if(!door.has(state))error('DOOR_STATE_UNSUPPORTED_'+state);
 return {door:materials.door,frame:materials.frame,partition:materials.partition,doorStateKeys:[...REQUIRED_DOOR_STATES]};
}
export function classifyHeld(entry){
 if(entry.selected)return null;
 const details=new Set([...(entry.bestRejected?.reasons??[]),...(entry.b79MinimalBlockers??[]),...(entry.heldReason??'').split('|')]);
 const reasons=[...details].filter(Boolean);
 const category=entry.candidateCount===0?'NO_VALID_DOOR_BOUNDARY':
  details.has('HALL_CLEAR_COMPONENT_TOO_SMALL')||details.has('HALL_SIDE_PRODUCTION_BLOCK')?'CORRIDOR_TOPOLOGY_OR_OCCUPANCY':
  details.has('JAMB_NOT_ALIGNED_WITH_NOMINAL_BOUNDARY')?'JAMB_OR_CORNER_TOPOLOGY':
  details.has('FRAME_COLLIDES_WITH_PRODUCTION')?'PRODUCTION_VOXEL_COLLISION':
  details.has('NO_FREE_2X2_AND_CONNECTED_APPROACH')?'ROOM_CORE_ROUTE': 'UNRESOLVED_LOCAL_GEOMETRY';
 const action=({NO_VALID_DOOR_BOUNDARY:'REGENERATE_LOCAL_ROOM_CORRIDOR_EDGE',CORRIDOR_TOPOLOGY_OR_OCCUPANCY:'REDESIGN_NAMED_CORRIDOR_WITHOUT_REMOVING_PRODUCTION',JAMB_OR_CORNER_TOPOLOGY:'REWORK_ROOM_BOUNDARY_AND_TWO_FLANK_CELLS',PRODUCTION_VOXEL_COLLISION:'REVIEW_FIXED_PRODUCTION_SHELL_VOXELS',ROOM_CORE_ROUTE:'REWORK_ROOM_CORE_AND_PROTECTED_ROUTE',UNRESOLVED_LOCAL_GEOMETRY:'MANUAL_GEOMETRY_REVIEW'})[category];
 return {portId:entry.portId,roomId:entry.roomId,category,action,sourceReasons:reasons.sort(),autoFixAllowed:false,worldCoordinates:null};
}
function entryAt(x,y,z,blockId,role,roomId,extra={}){
 if(![x,y,z].every(Number.isSafeInteger))error('NON_INTEGER_VOXEL');
 return {x,y,z,blockId,role,roomId,blockStates:{},...extra};
}
export function stageSection(s,origin,b65section,palette){
 if(!s||s.id!==b65section?.id)error('SOURCE_SCOPE');
 const originalPorts=new Map(b65section.openingPorts.map(p=>[p.id,p]));
 const solids=new Map(),doorPairs=[],closures=[],held=[],riskFlags=[];
 const addSolid=v=>{const k=voxel(v);if(solids.has(k))error('SOLID_DUPLICATE_'+k);solids.set(k,v)};
 const occupiedNew=new Set(),reserved=new Set();
 for(const r of s.rooms){
  if(!r.selected){held.push(classifyHeld(r));continue;}
  const d=r.selected,p=originalPorts.get(r.portId);
  if(!p||p.roomId!==r.roomId)error('PORT_SOURCE_LINK');
  if(d.rejects.length||d.emitAllowed!==false||d.worldCoordinates!==null)error('UNSAFE_DOOR');
  if(d.opening.length!==2||d.opening[1].y!==d.opening[0].y+1)error('DOOR_HEIGHT');
  if(d.local3DVoxels.length!==9||d.frame.length!==3||!d.chosenMockSwingSide)error('FRAME_SHAPE');
  const dir=directions.get(`${d.normal.dx},${d.normal.dz}`);if(!dir)error('DIRECTION');
  const lower=d.opening[0],upper=d.opening[1];
  for(const v of d.local3DVoxels)if(v.role!=='DOOR_VOID'){
   const newV=entryAt(v.x,v.y,v.z,palette.frame,v.role,r.roomId);
   addSolid(newV);occupiedNew.add(voxel(newV));
  }
  for(const v of [lower,upper]){
   const k=voxel(v);if(occupiedNew.has(k)||reserved.has(k))error('DOOR_OCCUPIED_OR_RESERVED');reserved.add(k);
  }
  for(const v of d.localSwingAirReservation){const k=voxel(v);if(occupiedNew.has(k))error('SWING_SOLID_COLLISION');reserved.add(k);}
  const statesBase={'minecraft:cardinal_direction':dir,open_bit:false,door_hinge_bit:null};
  const parts=[lower,upper].map((v,i)=>entryAt(v.x,v.y,v.z,palette.door,i===0?'DOOR_LOWER':'DOOR_UPPER',r.roomId,{
   blockStates:{...statesBase,upper_block_bit:i===1},pendingHingeOptions:[false,true],cardinalDirectionSemantic:'ROOM_TO_HALL_NORMAL__NOT_VERIFIED_IN_EDUCATION'}));
  doorPairs.push({portId:r.portId,roomId:r.roomId,sourceWallId:d.wallBoundaryId,normal:d.normal,parts,
   mockSwingSide:d.chosenMockSwingSide,requiresOldOpeningRedesign:d.requiresOldOpeningRedesign,
   hingeCalibration:'UNRESOLVED',facingCalibration:'UNRESOLVED',swingPhysicalValidity:'UNVERIFIED',
   supportedByOfficialCatalogStateKeys:true,notPlaced:true});
  if(d.requiresOldOpeningRedesign){
   const old=p.roomCell;
   if(!old||!Number.isSafeInteger(old.x)||!Number.isSafeInteger(old.z))error('MISSING_ORIGINAL_PORT_CELL');
   const base=lower.y-1;
   const changes=[1,2,3].map(n=>entryAt(old.x,base+n,old.z,palette.partition,'OLD_APERTURE_REPAIR_UNVERIFIED',r.roomId));
   closures.push({portId:r.portId,oldRoomCell:old,proposedVoxels:changes,status:'UNAPPROVED_REQUIRES_PRODUCTION_AND_PATH_RECHECK',autoApply:false});
  }
 }
 for(const wall of s.partitionCells){
  if(wall.emitAllowed!==false||wall.localBlockVoxels.length!==3)error('UNSAFE_PARTITION');
  for(const v of wall.localBlockVoxels){const k=voxel(v);if(reserved.has(k))error('PARTITION_IN_DOOR_AIR');
   addSolid(entryAt(v.x,v.y,v.z,palette.partition,'PARTITION',wall.roomId));
  }
 }
 for(const d of doorPairs)for(const p of d.parts)if(solids.has(voxel(p)))error('DOOR_INTERSECTS_SOLID');
 const closureOverlaps=closures.flatMap(c=>c.proposedVoxels.filter(v=>solids.has(voxel(v))||reserved.has(voxel(v))).map(v=>({portId:c.portId,voxel:voxel(v)})));
 const closureOverlapKeys=new Set(closureOverlaps.map(x=>x.portId));
 for(const c of closures)if(closureOverlapKeys.has(c.portId))c.status='UNAPPROVED_CONFLICTS_WITH_CURRENT_LOCAL_ASSEMBLY';
 if(closureOverlaps.length)riskFlags.push('OLD_OPENING_CLOSURES_OVERLAP_NEW_ASSEMBLY');
 return {id:s.id,level:s.level,doorPairs,held,solidVoxelIntents:[...solids.values()],oldOpeningClosures:closures,
  oldOpeningClosureConflicts:closureOverlaps,riskFlags,
  counts:{doorPairs:doorPairs.length,doorBlocks:2*doorPairs.length,frameBlocks:7*doorPairs.length,
   partitionBlocks:s.partitionCellCount*3,oldClosureProposals:closures.length,held:held.length,localSolidBlocks:solids.size},
  localOnly:true,worldCoordinates:null,commandCount:0,operations:[],placementAuthorized:false};
}
export function compileB81(){
 const b80=get('parallel/b80/main/B80_LOCAL_3D_FRAME_REPORT.json');safe(b80,FROZEN);
 const b65=get('parallel/b65/main/B65_INTERIOR_ASSEMBLY_INTENTS.json');safe(b65,'minecraftaibuilder-b65-interior-assembly-intents-v1');
 if(b80.provenance.b65!==b65.reportSha256)error('PROVENANCE');
 const official=fs.readFileSync(path.join(root,BLOCKS));
 if(hash(official)!==b80.provenance.officialBlocksSha256)error('CATALOG_SHA');
 const palette=validatePalette(parseCatalog(official.toString('utf8')));
 const sources=new Map(b65.sections.map(x=>[x.id,x]));
 const sections=b80.sections.map(s=>stageSection(s,null,sources.get(s.id),palette));
 const all=sections.flatMap(s=>s.doorPairs),held=sections.flatMap(s=>s.held),closure=sections.flatMap(s=>s.oldOpeningClosures);
 const byCategory={};for(const h of held)byCategory[h.category]=(byCategory[h.category]??0)+1;
 const totals={buildings:5,sections:sections.length,originalRooms:314,typedDoorPairs:all.length,typedDoorBlockCandidates:all.length*2,
  concreteLocalSolidIntents:sections.reduce((a,s)=>a+s.counts.localSolidBlocks,0),
  typedFrameIntents:all.length*7,typedPartitionIntents:sections.reduce((a,s)=>a+s.counts.partitionBlocks,0),
  blockedRooms:held.length,oldOpeningClosureUnapproved:closure.length,
  oldOpeningClosureConflictSites:sections.reduce((a,s)=>a+s.oldOpeningClosureConflicts.length,0),
  heldReasons:byCategory,actualMinecraftBlocksPlaced:0,worldCommands:0};
 if(totals.typedDoorPairs!==260||totals.blockedRooms!==54||totals.sections!==30||totals.oldOpeningClosureUnapproved!==137)error('COUNTS');
 const body={schema:'minecraftaibuilder-b81-typed-local-construction-intents-v1',kind:'NON_EXECUTABLE_LOCAL_BLOCK_INTENTS',
  provenance:{b80:b80.reportSha256,b65:b65.reportSha256,officialBlocksSha256:hash(official)},
  palette:{...palette,temporaryPaletteForReview:true,approved:false},totals,sections,
  pendingReview:['DOOR_FACING_HINGE_REAL_GAME_CALIBRATION','OLD_OPENING_CLOSURE_AND_ITS_PRODUCTION_BLOCK_STATE','54_ROOM_CORRIDOR_FRAME_REDESIGN','25_STAIRS_240_SLAB_CUTS','18_OFF_MASK_CORRIDOR_RESERVATIONS','HOTEL_FACADE_APPROVAL','COMPLETE_EGRESS_AND_SWING_WALKABILITY'],
  conclusions:['260_TYPED_DOOR_PAIRS_ARE_UNEXECUTABLE_CANDIDATES','CATALOG_VALIDATE_BLOCK_ID_AND_STATE_KEYS_ONLY','HINGE_NULL_NEEDS_CALIBRATION','OLD_OPENING_CLOSURE_IS_UNAPPROVED','NO_WORLD_ANCHOR_NO_COMMANDS'],
  approval:'PROPOSED_ONLY',readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,worldContacts:0,
  gates:b80.gates.map(g=>({...g,status:'BLOCKED'})),
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]}};
 return {...body,reportSha256:hash(body)};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const r=compileB81();if(process.argv.includes('--write'))fs.writeFileSync(path.join(here,'B81_TYPED_LOCAL_ASSEMBLY.json'),JSON.stringify(r,null,2)+'\n');
 console.log(JSON.stringify(r.totals,null,2));
}
