/**
 * B109 - facade/roof visual consolidation, using B106/B107/B108 verified source cells.
 * A rectangular visual surface is a projection of existing design voxels, NOT a
 * Minecraft Education building block, waterproof roof or actual glazed window.
 */
import {createHash} from 'node:crypto';
import {validateB106Scene} from '../../b106/main/b106-review-scene.mjs';
import {validateB107Polish} from '../../b107/main/b107-visual-architecture.mjs';
import {validateB108Scene} from '../../b108/main/b108-fidelity.mjs';

export const B109_LAYERS=Object.freeze([
 'COHESIVE_FACADE','COHESIVE_SPANDREL','COHESIVE_ROOF',
 'LARGE_GLAZING','WINDOW_ACCENT'
]);
export const B109_COLORS=Object.freeze({
 timber:'#a88366',limestone:'#aab5bf',stucco:'#b9b2a4',
 sandstone:'#b9ad96',steel:'#7698ae',
 spandrel:'#b6b2a9',roofSlate:'#637f98',
 roofWarm:'#938d84',roofGlass:'#93c5d3',
 windowBlue:'#57bbd5',windowFrame:'#d4dbdc',
 terrace:'#9babae'
});
const sha=obj=>createHash('sha256').update(JSON.stringify(obj)).digest('hex');
const K=(x,y,z)=>x+','+y+','+z;
const S=p=>K(p.x,p.y,p.z);
const baseKind=(scene,kind)=>scene.primitives
 .filter(p=>scene.layerNames[p[3]]===kind)
 .map(p=>({x:p[0],y:p[1],z:p[2],level:p[4]}));
const shapeSources=(shapes,kind)=>{
 const s=new Set();
 for(const b of shapes.filter(p=>p.kind===kind))
  for(let z=b.z;z<b.z+b.d;z++)for(let x=b.x;x<b.x+b.w;x++){
   const k=K(x,b.y,z);
   if(s.has(k))throw Error('B109_DUPLICATED_VISUAL_SOURCE:'+kind+':'+k);
   s.add(k);
  }
 return s;
};
const eq=(a,b)=>a.size===b.size&&[...a].every(x=>b.has(x));
/** Greedy rectangular merging in the horizontal plane. The input cells remain exact. */
export function mergePlanarCells(cells,kind,materialForHeight=()=> 'stucco'){
 const byPlane=new Map();
 for(const p of cells){
  if(![p.x,p.y,p.z,p.level].every(Number.isInteger))
   throw Error('B109_NON_INTEGER_SOURCE_COORDINATE');
  const k=p.level+':'+p.y,arr=byPlane.get(k)??[];
  arr.push(p);byPlane.set(k,arr);
 }
 const merged=[];
 for(const [key,items] of [...byPlane.entries()].sort((a,b)=>{
  const [al,ay]=a[0].split(':').map(Number),[bl,by]=b[0].split(':').map(Number);
  return al-bl||ay-by;
 })){
  const [level,y]=key.split(':').map(Number),rows=new Map(),seen=new Set();
  for(const p of items){
   const k=p.x+','+p.z;
   if(seen.has(k))throw Error('B109_DUPLICATE_PARENT_CELL');
   seen.add(k);
   const arr=rows.get(p.z)??[];arr.push(p.x);rows.set(p.z,arr);
  }
  const runs=[];
  for(const z of [...rows.keys()].sort((a,b)=>a-b)){
   const xs=rows.get(z).sort((a,b)=>a-b);
   for(let i=0;i<xs.length;){
    const start=xs[i];let next=i+1;
    while(next<xs.length&&xs[next]===xs[next-1]+1)next++;
    runs.push({x:start,y,z,w:xs[next-1]-start+1,h:1,d:1,level});
    i=next;
   }
  }
  // Adjacent rows combine iff they have exactly the same x span.
  const tails=new Map();
  for(const r of runs){
   const k=r.x+','+r.w;
   const last=tails.get(k);
   if(last&&last.z+last.d===r.z)last.d++;
   else{tails.set(k,r);merged.push(r);}
  }
 }
 return merged.map(b=>({...b,kind,material:materialForHeight(b)}));
}
function safeInput(base,polish,corrected){
 return validateB106Scene(base)&&validateB107Polish(polish,base)&&
 validateB108Scene(corrected,base,polish);
}
export function buildB109Scene(base,polish,corrected){
 if(!safeInput(base,polish,corrected))throw Error('B109_UNSAFE_PARENT');
 const wall=baseKind(base,'FACADE_PANEL_PROXY');
 const bottom=corrected.shapes.filter(b=>b.kind==='FACADE_LOWER_BAND')
  .map(b=>({x:b.x,y:b.y,z:b.z,level:b.level}));
 const top=corrected.shapes.filter(b=>b.kind==='FACADE_UPPER_BAND')
  .map(b=>({x:b.x,y:b.y,z:b.z,level:b.level}));
 const roof=baseKind(base,'ROOF_CAP_PROXY');
 const windows=baseKind(base,'WINDOW_GLAZING_PROXY');
 const palette={
  house:'timber',hotel:'sandstone',apartment:'stucco',
  office:'steel',library:'limestone'
 };
 const facade=mergePlanarCells(wall,'COHESIVE_FACADE',()=>palette[base.typology]);
 const trim=mergePlanarCells([...bottom,...top],'COHESIVE_SPANDREL',
  ()=>base.typology==='house'?'timber':'spandrel');
 const roofs=mergePlanarCells(roof,'COHESIVE_ROOF',()=>base.typology==='library'?'roofGlass':
  base.typology==='house'?'roofSlate':base.typology==='hotel'?'roofWarm':
   base.typology==='apartment'?'terrace':'roofSlate');
 // An entire original roof row becomes a continuous visual span. Its conceptual
 // height is a smooth, typology-specific profile (bounded, NO footprint expansion).
 const byFloor=new Map();
 for(const b of roofs){
  const arr=byFloor.get(b.level)??[];
  arr.push(b);byFloor.set(b.level,arr);
 }
 for(const b of roofs){
  const current=byFloor.get(b.level);
  const min=Math.min(...current.map(x=>x.z));
  const max=Math.max(...current.map(x=>x.z+x.d-1));
  const distance=Math.min(b.z-min,max-(b.z+b.d-1));
  const n=Math.max(0,distance);
  if(base.typology==='house')b.h=.24+.17*Math.min(4,n);
  else if(base.typology==='hotel')b.h=n===0?.55:.22;
  else if(base.typology==='apartment')b.h=n===0?.42:.16;
  else if(base.typology==='office')b.h=.24;
  else b.h=.18+.07*((b.z-min)%5);
  b.y+=.10; // roof surfaces remain identified by sourceY below
  b.sourceY=b.y-.10;
 }
 const paneGroups=mergePlanarCells(windows,'LARGE_GLAZING',()=> 'windowBlue');
 // One glazed window group spans whole existing shell "window" cells rather
 // than being hidden in the middle of one opaque facade cube.
 const paneShapes=paneGroups.map(b=>({...b,
  x:b.x+.055,y:b.y+.09,z:b.z+.055,
  w:b.w-.11,h:.84,d:b.d-.11,sourceX:b.x,sourceY:b.y,sourceZ:b.z,
  sourceW:b.w,sourceD:b.d}));
 const accents=paneGroups.flatMap(b=>[{
  x:b.x+.04,y:b.y+.07,z:b.z+.035,w:b.w-.08,h:.08,d:b.d-.07,
  level:b.level,kind:'WINDOW_ACCENT',material:'windowFrame'
 },{
  x:b.x+.04,y:b.y+.86,z:b.z+.035,w:b.w-.08,h:.08,d:b.d-.07,
  level:b.level,kind:'WINDOW_ACCENT',material:'windowFrame'
 }]);
 // Visual-only surface box count falls compared with unmerged old B108 voxels.
 const groups={walls:facade,spandrels:trim,roof:roofs,glazing:paneShapes,accents};
 const surfaces=[...facade,...trim,...roofs,...paneShapes,...accents];
 const metrics={
  originalFacadeCells:wall.length,originalSpandrelCells:bottom.length+top.length,
  originalRoofCells:roof.length,originalGlazingCells:windows.length,
  mergedFacadePanels:facade.length,mergedSpandrelPanels:trim.length,
  mergedRoofSurfaces:roofs.length,mergedGlassPanels:paneShapes.length,
  decorativeFrames:accents.length,sourceCellsCovered:wall.length+bottom.length+top.length+roof.length+windows.length,
  facadePreservationErrors:0,roofPreservationErrors:0,windowPreservationErrors:0,
  geometricSourceAlterations:0,realEducationStatesVerified:0,
  humanVisualApproval:false,actualPhysicalCompletion:false,
  visualPrimitiveReductionVsOriginal:
   wall.length+bottom.length+top.length+roof.length+windows.length-
   (facade.length+trim.length+roofs.length+paneShapes.length)
 };
 const result={schema:'minecraftaibuilder-b109-continuous-architectural-review-v1',
  candidateId:base.id,typology:base.typology,levels:base.levels,
  baseSha256:base.sceneSha256,polishSha256:polish.integritySha256,
  correctedSha256:corrected.digest,groups,surfaces,metrics,
  mode:'OFFLINE_VISUAL_ONLY',worldContacts:0,worldCoordinates:null,
  executionAllowed:false,constructionApproved:false,
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}};
 return {...result,digest:sha(result)};
}
export function validateB109Scene(result,base,polish,corrected){
 if(!safeInput(base,polish,corrected)||
 result?.schema!=='minecraftaibuilder-b109-continuous-architectural-review-v1'||
 result.candidateId!==base.id||result.typology!==base.typology||
 result.baseSha256!==base.sceneSha256||
 result.polishSha256!==polish.integritySha256||
 result.correctedSha256!==corrected.digest||
 result.mode!=='OFFLINE_VISUAL_ONLY'||result.worldContacts!==0||
 result.worldCoordinates!==null||result.executionAllowed!==false||
 result.constructionApproved!==false||result.BuildPlan?.status!=='NOT_PREPARED'||
 result.BuildPlan.operations?.length!==0||result.BuildPlan.commandCount!==0||
 result.BuildPlan.worldCoordinates!==null)return false;
 const {digest,...plain}=result;
 if(digest!==sha(plain)||!Array.isArray(result.surfaces))return false;
 const g=result.groups;
 if(!g||result.surfaces.length!==
  g.walls.length+g.spandrels.length+g.roof.length+g.glazing.length+g.accents.length)return false;
 try{
  const wall=new Set(baseKind(base,'FACADE_PANEL_PROXY').map(S));
  const spandrel=new Set(corrected.shapes
   .filter(b=>b.kind==='FACADE_LOWER_BAND'||b.kind==='FACADE_UPPER_BAND').map(S));
  const roof=new Set(baseKind(base,'ROOF_CAP_PROXY').map(S));
  const glass=new Set(baseKind(base,'WINDOW_GLAZING_PROXY').map(S));
  // Roof boxes use offset sourceY and window shapes have fractions. Restore
  // the exact original integer grid before confirming one-to-one coverage.
  const resetRoof=g.roof.map(b=>({...b,y:b.sourceY}));
  const resetWindows=g.glazing.map(b=>({...b,x:b.sourceX,y:b.sourceY,z:b.sourceZ,
   w:b.sourceW,d:b.sourceD}));
  if(!eq(shapeSources(g.walls,'COHESIVE_FACADE'),wall)||
   !eq(shapeSources(g.spandrels,'COHESIVE_SPANDREL'),spandrel)||
   !eq(shapeSources(resetRoof,'COHESIVE_ROOF'),roof)||
   !eq(shapeSources(resetWindows,'LARGE_GLAZING'),glass))return false;
  if(result.surfaces.some(b=>!B109_LAYERS.includes(b.kind)||
   !Object.hasOwn(B109_COLORS,b.material)||
   ![b.x,b.y,b.z,b.w,b.h,b.d].every(Number.isFinite)||
   b.w<=0||b.h<=0||b.d<=0||b.level<0||b.level>=base.levels))return false;
  const m=result.metrics;
  return m.originalFacadeCells===wall.size&&m.originalSpandrelCells===spandrel.size&&
   m.originalRoofCells===roof.size&&m.originalGlazingCells===glass.size&&
   m.mergedFacadePanels===g.walls.length&&m.mergedSpandrelPanels===g.spandrels.length&&
   m.mergedRoofSurfaces===g.roof.length&&m.mergedGlassPanels===g.glazing.length&&
   m.decorativeFrames===g.accents.length&&m.facadePreservationErrors===0&&
   m.roofPreservationErrors===0&&m.windowPreservationErrors===0&&
   m.geometricSourceAlterations===0&&m.realEducationStatesVerified===0&&
   m.humanVisualApproval===false&&m.actualPhysicalCompletion===false&&
   m.visualPrimitiveReductionVsOriginal>0;
 }catch{return false;}
}
