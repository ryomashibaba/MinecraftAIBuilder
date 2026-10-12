/** B108: browser-visible corrections anchored to unchanged B105/B106/B107 sources.
 * Add facade sill/spandrel bands and differentiated sculpted roof silhouette.
 * Only browser REVIEW boxes. No blocks, world actions or existing scene modification.
 */
import {createHash} from 'node:crypto';
import {validateB106Scene} from '../../b106/main/b106-review-scene.mjs';
import {validateB107Polish} from '../../b107/main/b107-visual-architecture.mjs';
export const B108_LAYERS=Object.freeze(['FACADE_LOWER_BAND','FACADE_UPPER_BAND','SCULPTED_ROOF']);
export const B108_COLORS=Object.freeze({band:'#b9aca3',accent:'#9d9691',roof:'#677f95',roofLight:'#b2ccd3'});
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const key=p=>p[0]+','+p[1]+','+p[2];
const blockKey=(x,y,z)=>x+','+y+','+z;
const floorKey=(p)=>p[0]+','+p[2];
const safeBox=b=>B108_LAYERS.includes(b.kind)&&Object.hasOwn(B108_COLORS,b.material)&&
 [b.x,b.y,b.z,b.w,b.h,b.d].every(Number.isFinite)&&
 b.w>0&&b.w<=1&&b.h>0&&b.h<=1.6&&b.d>0&&b.d<=1&&
 Number.isInteger(b.level)&&b.level>=0;
export function improveB108Scene(base,polish){
 if(!validateB106Scene(base)||!validateB107Polish(polish,base))throw Error('B108_UNSAFE_PARENT');
 const facade=base.layerNames.indexOf('FACADE_PANEL_PROXY');
 const roof=base.layerNames.indexOf('ROOF_CAP_PROXY');
 const walls=base.primitives.filter(p=>p[3]===facade),caps=base.primitives.filter(p=>p[3]===roof);
 const wallLookup=new Set(walls.map(key));
 const roofByY=new Map();
 for(const c of caps){
  const y=c[1],layer=roofByY.get(y)??new Set();
  layer.add(floorKey(c));roofByY.set(y,layer);
 }
 const shapes=[];
 const add=(x,y,z,kind,material,level,anchor,h=1)=>{
  const b={x,y,z,w:1,h,d:1,kind,material,level,anchor};
  if(!safeBox(b))throw Error('B108_BAD_VISUAL_SHAPE');
  shapes.push(b);
 };
 let lower=0,upper=0;
 for(const p of walls){
  const [x,y,z,_,level]=p,dy=y-level*5;
  if(dy===1){
   // For only EXISTING wall panels: close the floor-level visual gap.
   // Ground portal cells have AIR instead of a wall and remain open.
   add(x,level*5,z,'FACADE_LOWER_BAND','band',level,blockKey(x,y,z));lower++;
  }
  if(dy===3){
   add(x,level*5+4,z,'FACADE_UPPER_BAND','accent',level,blockKey(x,y,z));upper++;
  }
 }
 const roofCounts={};
 for(const p of caps){
  const [x,y,z,_,level]=p,roofSet=roofByY.get(y),anchor=blockKey(x,y,z);
  // Morphological roof interior distance, bounded so the existing roof footprint
  // never grows. Clear five distinct silhouettes rather than arbitrary tiling.
  let distance=0;
  while(distance<3){
   const n=distance+1;let complete=true;
   for(let dx=-n;dx<=n&&complete;dx++)for(let dz=-n;dz<=n;dz++){
    if(!roofSet.has((x+dx)+','+(z+dz))){complete=false;break;}
   }
   if(!complete)break;distance=n;
  }
  const count=(roofCounts[level]??0)+1;roofCounts[level]=count;
  let h=.24,material='roof';
  switch(base.typology){
   case 'house': h=.22+.38*distance;material='roof';break;
   case 'hotel': h=distance===0?.68:.23;material=distance===0?'accent':'roof';break;
   case 'apartment':h=distance===0?.56:.18;material=distance===0?'accent':'roof';break;
   case 'office':h=.23+.10*(distance===0?3:0);material=distance===0?'roofLight':'roof';break;
   case 'library':h=.18+.27*((x+z+10000)%4);material=(x+z)%4===0?'roofLight':'roof';break;
   default:throw Error('B108_UNKNOWN_ARCHITECTURE');
  }
  // Draw on top of the anchored original cap. Height is a conceptual diagram,
  // not an actual Minecraft Education slope/stair/blockstate.
  add(x,y+.10,z,'SCULPTED_ROOF',material,level,anchor,h);
 }
 const result={schema:'minecraftaibuilder-b108-visual-fidelity-v1',
  candidateId:base.id,typology:base.typology,levels:base.levels,
  sourceSha256:base.sceneSha256,polishSha256:polish.integritySha256,
  shapes,stats:{facadeLowerBands:lower,facadeUpperBands:upper,
   roofSculptCells:caps.length,originalRoofCells:caps.length,
   totalReviewOnlyShapes:shapes.length,modifiedBaseVoxels:0,createdWorldBlocks:0,
   validatedEducationBlockStates:0,realRoofCertified:false,
   externalExitCandidatesPreserved:base.stats.exteriorExitCandidates,
   visualHumanApproval:false},
  mode:'OFFLINE_NONPHYSICAL_REVIEW_ONLY',
  worldContacts:0,worldCoordinates:null,constructionApproved:false,
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}};
 return {...result,digest:hash(result)};
}
export function validateB108Scene(refined,base,polish){
 if(refined?.schema!=='minecraftaibuilder-b108-visual-fidelity-v1'||
 !validateB106Scene(base)||!validateB107Polish(polish,base)||
 refined.candidateId!==base.id||refined.typology!==base.typology||
 refined.sourceSha256!==base.sceneSha256||refined.polishSha256!==polish.integritySha256||
 refined.levels!==base.levels||refined.mode!=='OFFLINE_NONPHYSICAL_REVIEW_ONLY'||
 refined.worldContacts!==0||refined.worldCoordinates!==null||
 refined.constructionApproved!==false||refined.BuildPlan?.status!=='NOT_PREPARED'||
 refined.BuildPlan?.operations?.length!==0||refined.BuildPlan.commandCount!==0||
 refined.BuildPlan.worldCoordinates!==null||!Array.isArray(refined.shapes))return false;
 const {digest,...body}=refined;
 if(digest!==hash(body)||refined.shapes.some(b=>!safeBox(b)||b.level>=base.levels))return false;
 const walls=base.primitives.filter(p=>base.layerNames[p[3]]==='FACADE_PANEL_PROXY');
 const caps=base.primitives.filter(p=>base.layerNames[p[3]]==='ROOF_CAP_PROXY');
 const wallIds=new Set(walls.map(key)),roofIds=new Set(caps.map(key));
 let l=0,u=0,r=0;
 for(const b of refined.shapes){
  const ids=b.anchor?.split(',').map(Number);
  if(b.kind==='SCULPTED_ROOF'){
   if(!roofIds.has(b.anchor))return false;r++;
  }else{
   if(!wallIds.has(b.anchor)||ids.length!==3||!ids.every(Number.isInteger))return false;
   if(b.kind==='FACADE_LOWER_BAND'){
    if(ids[1]!==b.level*5+1||b.y!==b.level*5) return false;l++;
   }else{
    if(ids[1]!==b.level*5+3||b.y!==b.level*5+4)return false;u++;
   }
  }
 }
 const s=refined.stats;
 return l===s.facadeLowerBands&&u===s.facadeUpperBands&&r===s.roofSculptCells&&
 r===s.originalRoofCells&&r===caps.length&&
 s.totalReviewOnlyShapes===refined.shapes.length&&
 s.modifiedBaseVoxels===0&&s.createdWorldBlocks===0&&s.validatedEducationBlockStates===0&&
 s.realRoofCertified===false&&s.visualHumanApproval===false&&
 s.externalExitCandidatesPreserved===base.stats.exteriorExitCandidates;
}
