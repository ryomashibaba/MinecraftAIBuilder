import { lookupBlock } from './block-catalog.js';
import { architecturalModules } from '../../modules/architectural-library.js';
// Ordered fill replay counts surviving cells, including air/overwrite semantics.
// This analysis never changes generation or emits per-block Minecraft operations.
export function replayGeometry(plan) {
 const {from:a,to:b}=plan.bounds, sx=b.x-a.x+1, sz=b.z-a.z+1, sy=b.y-a.y+1;
 const cells=new Int32Array(sx*sz*sy); cells.fill(-1);
 const key=(x,y,z)=>((y-a.y)*sz+z-a.z)*sx+x-a.x;
 plan.operations.forEach((o,i)=>{for(let y=o.from.y;y<=o.to.y;y++)for(let z=o.from.z;z<=o.to.z;z++)for(let x=o.from.x;x<=o.to.x;x++)cells[key(x,y,z)]=i;});
 return { cells,key,sx,sz,sy,origin:a };
}
export function measureGeometry(plan) {
 const {cells,sx,sz,origin:a}=replayGeometry(plan), ops=plan.operations;
 const roles={}, roof=new Set(), depths=new Set(), zones=new Set(), modules=new Set(), secondary=new Set();
 const entranceCells=new Set();
 let opening=0,solid=0, commercial=0, bays=new Set(), dwelling=new Set(), guest=new Set(), balconies=new Set();
 const at=(x,y,z)=> x<0||x>=sx||z<0||z>=sz||y<0||y>=cells.length/(sx*sz)?-1:cells[(y*sz+z)*sx+x];
 const occupied=(i)=>i>=0&&ops[i].block!=='air';
 for(let k=0;k<cells.length;k++) {
  const i=cells[k]; if(i<0)continue;
  const o=ops[i],x=k%sx,z=Math.floor(k/sx)%sz,y=Math.floor(k/(sx*sz));
  if(o.phase==='entrance'&&o.block==='air') { // Count the opening face, not its volume.
   entranceCells.add(o.surface?.planeAxis==='x'?`${z},${y}`:`${x},${y}`); continue;
  }
  if(o.block==='air') continue;
  roles[o.role]=(roles[o.role]??0)+1;
  if(['roof','parapet','roof_crown','roof_terrace','roof_mechanical_cluster','core_extension'].includes(o.phase)) roof.add(y+a.y);
  const exposed=[at(x-1,y,z),at(x+1,y,z),at(x,y,z-1),at(x,y,z+1)].some(j=>!occupied(j));
  if(o.surface&&exposed) {
   const coord=o.surface.planeAxis==='x'?x+a.x:z+a.z;
   depths.add(Math.abs(coord-o.surface.wallPlane)); zones.add(`${o.surface.planeAxis}:${o.surface.wallPlane}:${Math.floor((y+a.y)/plan.composition.floorHeight)===0?'base':(y+a.y)>=(plan.composition.floorCount-1)*plan.composition.floorHeight?'crown':'middle'}:${o.block}:${o.from.x},${o.from.z}:${o.to.x},${o.to.z}`);
   if(lookupBlock(o.block)?.materialCategory==='glass') {opening++; if(y+a.y<plan.composition.floorHeight)commercial++; dwelling.add(i);guest.add(i);} else solid++;
   if(['balcony','balcony_rail'].includes(o.phase)) balconies.add(o.moduleInstance);
   if(o.phase==='primary_structure')bays.add(i);
   if(o.moduleId && ['entrances','cores','balconies','columns'].includes(architecturalModules.get(o.moduleId)?.category)) modules.add(o.moduleInstance);
   if(o.phase==='secondary_mass'||o.phase==='balcony'||o.phase==='vertical_core')secondary.add(o.moduleInstance??i);
  }
 }
 const total=opening+solid;
 return { uniqueDepthPlanes:depths.size,facadeDepthRange:depths.size?Math.max(...depths)-Math.min(...depths):0,facadeZoneCount:zones.size,programSpecificModuleCount:modules.size,materialRoleCount:Object.keys(roles).length,materialRoleVolumes:roles,roofHeightLevels:roof.size,roofProfile:[...roof].sort((a,b)=>a-b),entranceArea:entranceCells.size,secondaryMassCount:secondary.size,openingRatio:total?opening/total:0,solidRatio:total?solid/total:0,
 ...(plan.composition.program==='apartment'?{balconyCount:balconies.size,dwellingWindowCount:dwelling.size}:plan.composition.program==='hotel'?{guestRoomBayCount:guest.size,lobbyExpression:commercial}:{commercialGlazingRatio:total?commercial/total:0,structuralBayCount:bays.size}) };
}
