/** Conservative occupied cells + interaction space; all recipes remain unverified. */
import {K,neighbors,manhattan,reachable} from './b113-geometry.mjs';
export const RECIPES=Object.freeze({
 bed:{materials:['minecraft:bed'],height:1,cells:2,interaction:'SLEEP_AND_RESPAWN_UNVERIFIED',purpose:'PAIRED_FOOT_HEAD',support:'BOTH_CELLS_SUPPORTED'},
 shelf:{materials:['minecraft:bookshelf'],height:2,cells:1,interaction:'BOOK_DISPLAY_NO_CONTAINER',purpose:'TWO_STACKED_BOOKSHELVES',support:'FULL_FLOOR'},
 desk:{materials:['minecraft:oak_fence','minecraft:oak_slab'],height:2,cells:1,interaction:'WORK_SURFACE_NO_GUI',purpose:'POST_AND_TABLETOP',support:'TOP_SLAB_ON_POST_ACCEPTANCE_UNVERIFIED'},
 seating:{materials:['minecraft:oak_stairs'],height:1,cells:1,interaction:'DECORATIVE_CHAIR_NO_SEATED_PLAYER_FUNCTION',purpose:'BOTTOM_STAIR_CHAIR',support:'FULL_FLOOR'},
 generic:{materials:['minecraft:barrel'],height:1,cells:1,interaction:'INVENTORY_AND_FRONT_ACCESS_UNVERIFIED',purpose:'ACCESSIBLE_STORAGE',support:'FULL_FLOOR'}
});
const inner=(r,p)=>p.x>r.x&&p.x<r.x+r.width-1&&p.z>r.z&&p.z<r.z+r.depth-1;
const cells=r=>{const out=[];for(let z=r.z+1;z<r.z+r.depth-1;z++)for(let x=r.x+1;x<r.x+r.width-1;x++)out.push({x,z});return out;};
export function inspectDoorPair(lower,upper){
 const issues=[];
 if(!lower||!upper||lower.id!=='minecraft:spruce_door'||upper.id!==lower.id)issues.push('DOOR_ID_PAIR_MISMATCH');
 if(!lower?.local||!upper?.local||lower.local.x!==upper.local.x||lower.local.z!==upper.local.z||upper.local.y!==lower.local.y+1)issues.push('DOOR_HALVES_NOT_VERTICALLY_ADJACENT');
 if(lower?.states?.upper_block_bit!==false||upper?.states?.upper_block_bit!==true)issues.push('DOOR_UPPER_LOWER_FLAGS_INVALID');
 for(const n of ['minecraft:cardinal_direction','door_hinge_bit','open_bit'])if(lower?.states?.[n]===undefined||lower.states[n]!==upper?.states?.[n])issues.push('DOOR_SHARED_STATE_MISMATCH:'+n);
 if(!['north','south','east','west'].includes(lower?.states?.['minecraft:cardinal_direction'])||
 typeof lower?.states?.door_hinge_bit!=='boolean'||typeof lower?.states?.open_bit!=='boolean')issues.push('DOOR_STATE_TYPE_INVALID');
 return {offlinePairConsistent:issues.length===0,issues,educationStatus:'UNVERIFIED',executable:false};
}
export function inspectBedPair(foot,head){
 const issues=[];
 if(!foot?.local||!head?.local||manhattan(foot.local,head.local)!==1||foot.local.y!==head.local.y)issues.push('BED_NOT_ADJACENT_SAME_HEIGHT');
 if(foot?.headPiece!==false||head?.headPiece!==true)issues.push('BED_HEAD_FOOT_FLAGS_INVALID');
 if(!['N','S','E','W'].includes(foot?.semanticDirection)||foot.semanticDirection!==head?.semanticDirection)issues.push('BED_ORIENTATION_MISMATCH');
 const v={N:[0,-1],S:[0,1],E:[1,0],W:[-1,0]}[foot?.semanticDirection];
 if(v&&foot?.local&&head?.local&&(head.local.x-foot.local.x!==v[0]||head.local.z-foot.local.z!==v[1]))issues.push('BED_HEAD_VECTOR_MISMATCH');
 return {offlinePairConsistent:issues.length===0,issues,blockStateDirectionMapping:'UNVERIFIED',executable:false};
}
function evaluate(room,door,furniture){
 const floor=cells(room),floorSet=new Set(floor.map(K)),taken=new Set(),issues=[];
 const dx=door.interiorCell.x-door.localLower.x,dz=door.interiorCell.z-door.localLower.z;
 // Ergonomic approach reservation, not a claim about the game's door swing collision box.
 const approach=[door.interiorCell,{x:door.interiorCell.x+dx,z:door.interiorCell.z+dz}].filter(p=>inner(room,p));
 const fixtures=furniture.map(f=>{
  const recipe=RECIPES[f.role];if(!recipe)throw Error('B113_UNKNOWN_RECIPE');
  const footprint=f.footprint.map(p=>({...p}));
  if(footprint.length!==recipe.cells)issues.push('FURNITURE_CELL_COUNT:'+f.fixtureIndex);
  for(const p of footprint){if(!floorSet.has(K(p))||taken.has(K(p)))issues.push('FURNITURE_COLLISION:'+f.fixtureIndex);taken.add(K(p));}
  if(footprint.some(p=>approach.some(a=>K(a)===K(p))))issues.push('DOOR_APPROACH_RESERVED:'+f.fixtureIndex);
  let semanticDirection=null;
  if(f.role==='bed'&&footprint.length===2){
   const [a,b]=footprint;semanticDirection=b.x>a.x?'E':b.x<a.x?'W':b.z>a.z?'S':'N';
   if(manhattan(a,b)!==1)issues.push('BED_PAIR_NOT_ADJACENT:'+f.fixtureIndex);
  }
  return {fixtureIndex:f.fixtureIndex,role:f.role,anchor:{...f.anchor},footprint,
   recipe:{...recipe},semanticDirection,materialStatesAssigned:false,
   occupancyEnvelope:footprint.map(p=>({...p,y:room.level*5+1,width:1,depth:1,height:recipe.height})),
   physicallyUsableCertified:false};
 });
 const free=new Set([...floorSet].filter(k=>!taken.has(k))),visited=reachable(door.interiorCell,free);
 for(const f of fixtures){
  let possible=f.footprint.flatMap(neighbors);
  if(f.role==='bed'&&f.footprint.length===2){
   const [a,b]=f.footprint,dx=b.x-a.x,dz=b.z-a.z;
   possible=f.footprint.flatMap(p=>[{x:p.x-dz,z:p.z+dx},{x:p.x+dz,z:p.z-dx}]);
  }
  f.interactionApproaches=possible.filter(p=>visited.has(K(p)));
  if(!f.interactionApproaches.length)issues.push('NO_REACHABLE_INTERACTION_SIDE:'+f.fixtureIndex);
 }
 if(!visited.has(K(door.interiorCell)))issues.push('ENTRY_BLOCKED');
 if(visited.size<free.size)issues.push('DISCONNECTED_ROOM_SPACE');
 return {fixtures,issues:[...new Set(issues)],reservedDoorApproach:approach,
  freeCells:free.size,reachableCells:visited.size,offlineOccupancyClear:issues.length===0};
}
export function inspectRoomAssembly(room,door,b111Room){
 if(room.id!==door.roomId||room.id!==b111Room.roomId||room.level!==door.level||room.level!==b111Room.level)throw Error('B113_ROOM_PROVENANCE');
 const original=evaluate(room,door,b111Room.furniture);
 // Bounded refinement: preserve every source anchor; try only second-cell rotations of existing beds.
 const anchors=new Set(b111Room.furniture.map(f=>K(f.anchor))),choices=b111Room.furniture.map(f=>
  f.role==='bed'?neighbors(f.anchor).filter(p=>inner(room,p)&&!anchors.has(K(p))).map(p=>[f.anchor,p]):[f.footprint]);
 let best=original,trials=0;
 function visit(i,fs){
  if(trials>=64)return;
  if(i===choices.length){trials++;const candidate=evaluate(room,door,fs);
   if(candidate.issues.length<best.issues.length||candidate.issues.length===best.issues.length&&candidate.reachableCells>best.reachableCells)best=candidate;
   return;}
  for(const footprint of choices[i])visit(i+1,[...fs,{...b111Room.furniture[i],footprint}]);
 }
 if(original.issues.length)visit(0,[]);
 const changed=JSON.stringify(best.fixtures.map(f=>f.footprint))!==JSON.stringify(original.fixtures.map(f=>f.footprint));
 return {roomId:room.id,level:room.level,purpose:room.purpose,
  roomRectangle:{x:room.x,z:room.z,width:room.width,depth:room.depth},
  originalIssues:original.issues,...best,bedRotationsEvaluated:trials,bedLayoutRefined:changed,
  sourceAnchorsPreserved:true,entryToFurniture:'OFFLINE_OCCUPANCY_ONLY',
  door:{localLower:{...door.localLower},localUpper:{...door.localUpper},side:door.side,
   upperLowerOffsetValid:door.localUpper.y-door.localLower.y===1,
   closedPassage:'INTENTIONALLY_BLOCKED_UNTIL_OPEN',hinge:'UNVERIFIED',
   openCollisionBox:'UNVERIFIED',support:'OFFLINE_FLOOR_ONLY',executable:false},
  physicalRoomCertified:false};
}
