/**
 * B165 — actual multi-level terminal interiors inside ORBITAL CROWN.
 *
 * Two 4-wide progressive stair flights, open mezzanine stairwells, panoramic
 * internal galleries and observation features. Stair progression is verified
 * for 2x2 local tread support / 2-cell standing headroom, rise <= 1 per
 * consecutive tread. No simulation of Minecraft entity stepping is claimed.
 *
 * All source files are offline local design DSL — NO world coordinates/writes.
 */
import {createHash} from 'node:crypto';
import {compileDesign,validateDesign,verifyCompiled} from './b143-building-dsl.mjs';
import {analyzeFootprint,verifyFootprint} from './b152-footprint-review.mjs';
import {createOrbitalCrown,verifyOrbitalCrown} from './b164-orbital-crown.mjs';
import {DEFAULT_ROUTE} from './b161-adaptive-skybridge.mjs';
export const SCHEMA='minecraftaibuilder-b165-inhabited-orbital-interiors-v1';
const H=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const ensure=(v,m)=>{if(!v)throw Error('B165_'+m);};
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const box=(id,origin,size,material='metal',mode='add')=>({
 id,shape:'box',mode,...(mode==='add'?{material}:{}),origin,size
});
const flightConfigs=Object.freeze([
 Object.freeze({
  id:'north',x:30,z:17,sign:1,entry:[30,19,15],
  top:[30,26,30],cut:[30,24,23],cutSize:[4,2,8]
 }),
 Object.freeze({
  id:'south',x:79,z:75,sign:1,entry:[79,19,73],
  top:[79,26,88],cut:[79,24,81],cutSize:[4,2,8]
 })
]);
export function orbitalInteriorElements(){
 const shapes=[];
 // Mezzanine stair openings: cut ONLY Y>=24, never touch former body-route
 // occupied solids at Y19 or Y20.
 for(const f of flightConfigs){
  shapes.push(box('b165-'+f.id+'-stairwell',f.cut,f.cutSize,undefined,'cut'));
  if(f.id==='south'){
   // The rightmost wing begins just beyond the old Y18 boarding deck,
   // outside the low orbital torus solid. Give it an actual entry foundation.
   shapes.push(box('b165-south-entry-platform',[79,18,73],[4,1,2],'concrete'));
  }
  // The first support steps use the 17/18 upper surface as a real foundation.
  // Each following tread is 4-wide x 2-deep, ascending one vertical voxel.
  for(let i=0;i<7;i++){
   const z=f.z+i*2;
   shapes.push(box('b165-'+f.id+'-tread-'+(i+1),
    [f.x,19+i,z],[4,1,2],'concrete'));
   // Lightweight luminous riser band below each tread.
   if(i>0)shapes.push(box('b165-'+f.id+'-riser-light-'+(i+1),
    [f.x,18+i,z],[4,1,1],'glow'));
  }
  // Wall-mounted light and side safety-looking elements. These are not
  // guardrail or fall-protection certification.
  shapes.push(box('b165-'+f.id+'-outer-light-a',
   [f.x-1,24,f.z+7],[1,2,5],'glow'));
  shapes.push(box('b165-'+f.id+'-outer-light-b',
   [f.x+4,24,f.z+7],[1,2,5],'glow'));
 }
 // Interconnected mezzanine promenades within the existing roof shells.
 // Architectural finishing stays outside the two flights' tested 2x2 footprint.
 shapes.push(
  box('b165-north-gallery-spine',[12,28,17],[24,1,2],'accent'),
  box('b165-north-gallery-west',[12,28,17],[2,1,15],'metal'),
  box('b165-north-gallery-east',[34,28,17],[2,1,15],'metal'),
  box('b165-north-gallery-overlook',[12,28,30],[24,1,2],'accent'),
  box('b165-south-gallery-spine',[58,28,74],[23,1,2],'accent'),
  box('b165-south-gallery-west',[58,28,74],[2,1,15],'metal'),
  box('b165-south-gallery-east',[79,28,74],[2,1,15],'metal'),
  box('b165-south-gallery-overlook',[58,28,87],[23,1,2],'accent'),
  box('b165-north-upper-light-pool',[15,29,19],[12,1,2],'glow'),
  box('b165-south-upper-light-pool',[61,29,82],[13,1,2],'glow'),
  box('b165-north-terminal-signage',[11,29,11],[14,2,1],'glow'),
  box('b165-south-terminal-signage',[56,29,92],[14,2,1],'glow'),
  box('b165-north-roof-bridge',[14,30,29],[16,1,2],'glass'),
  box('b165-south-roof-bridge',[60,30,87],[16,1,2],'glass'),
  box('b165-north-viewing-bay',[13,26,33],[13,1,3],'glass'),
  box('b165-south-viewing-bay',[64,26,70],[13,1,3],'glass')
 );
 return shapes;
}
function inspectTreads(compiled,originalRoute){
 const S=new Set(compiled.primitives.map(a=>a[0]+','+a[1]+','+a[2]));
 const solid=(x,y,z)=>S.has(x+','+y+','+z);
 const result=[];
 for(const f of flightConfigs){
  const checks=[];
  const positions=[{id:'entry',at:f.entry},...Array.from({length:7},
   (_,i)=>({id:'tread-'+(i+1),at:[f.x,20+i,f.z+2*i]})),
   {id:'upper-mezzanine',at:f.top}];
  for(const p of positions){
   const [x,y,z]=p.at;
   let supported=true,clear=true;
   for(let dx=0;dx<2;dx++)for(let dz=0;dz<2;dz++){
    if(!solid(x+dx,y-1,z+dz))supported=false;
    if(solid(x+dx,y,z+dz)||solid(x+dx,y+1,z+dz))clear=false;
   }
   if(!supported||!clear){
    const cells=[];
    for(let dx=0;dx<2;dx++)for(let dz=0;dz<2;dz++)
     cells.push({xyz:[x+dx,y,z+dz],foot:solid(x+dx,y-1,z+dz),
      blockedBody:solid(x+dx,y,z+dz),blockedHead:solid(x+dx,y+1,z+dz)});
    console.error('B165_TREAD_DIAGNOSTIC',JSON.stringify({wing:f.id,
     at:p.at,supported,clear,cells}));
   }
   ensure(supported&&clear,'TREAD_2X2_SUPPORT_OR_HEADROOM_'+f.id+'_'+p.id);
   checks.push({id:p.id,at:p.at,support2x2:true,headroom2:true});
  }
  for(let i=1;i<checks.length;i++){
   const a=checks[i-1].at,b=checks[i].at;
   ensure(b[1]-a[1]>=0&&b[1]-a[1]<=1&&
    Math.abs(b[2]-a[2])>=1&&Math.abs(b[2]-a[2])<=2&&a[0]===b[0],
    'BAD_RISER_PROGRESSION_'+f.id+'_'+i);
  }
  result.push({id:f.id,entry:f.entry,upper:f.top,
   rise:f.top[1]-f.entry[1],intermediateTreads:7,
   consecutiveRises:checks.length-1,checks});
 }
 return result;
}
export function createOrbitalInteriors(original){
 const frozen=JSON.stringify(original);
 const parent=createOrbitalCrown(original);
 ensure(verifyOrbitalCrown(original,parent.report),'PARENT_SOURCE_PROOF');
 const elements=orbitalInteriorElements();
 const base=parent.finished,old=parent.compiled;
 const model={...structuredClone(base),
  id:'doppler-orbital-crown-inhabited-interior',
  title:'DOPPLER ORBITAL CROWN — 二翼内部階段・展望回廊・吹抜け空間',
  brief:'巨大ガラス屋根の下に、2基の本格的な階段フライト、吹抜け付き上層フロア、光る内部ギャラリーと展望エリアを増築。屋根外観を維持し、施工前の立体設計と2×2踏面・頭上余裕を確認するモデル。',
  elements:[...structuredClone(base.elements),...elements]};
 ensure(eq(model.elements.slice(0,base.elements.length),base.elements),
  'MUTATED_ORBITAL_CROWN_PARENT');
 validateDesign(model);
 const compiled=compileDesign(model);
 ensure(verifyCompiled(model,compiled)&&
  compiled.geometrySha256!==old.geometrySha256&&
  compiled.sourceSha256!==old.sourceSha256,
  'NO_ACTUAL_INTERIOR_GEOMETRY');
 const stairs=inspectTreads(compiled,parent.route);
 const args={start:DEFAULT_ROUTE.start,
  destinations:[{id:'goal',at:DEFAULT_ROUTE.goal}],
  width:DEFAULT_ROUTE.footprintWidth,depth:DEFAULT_ROUTE.footprintDepth,headroom:2};
 const originalLower=parent.route,lower=analyzeFootprint(compiled,args);
 ensure(verifyFootprint(compiled,args,lower)&&
  lower.targets[0].status==='PASS_FLAT_FOOTPRINT_GEOMETRY'&&
  lower.targets[0].steps===127&&
  eq(lower.targets[0].path,originalLower.targets[0].path),
  'LOWER_TERMINAL_BRIDGE_DEGRADED');
 const before=new Set(old.primitives.map(p=>p.slice(0,3).join(',')));
 const after=new Set(compiled.primitives.map(p=>p.slice(0,3).join(',')));
 const newlyAdded=[...after].filter(k=>!before.has(k));
 const deleted=[...before].filter(k=>!after.has(k));
 const lowDiff=[...newlyAdded,...deleted]
  .filter(k=>Number(k.split(',')[1])<=20);
 const originalRouteKeys=new Set();
 for(const p of originalLower.targets[0].path)
  for(let dx=0;dx<2;dx++)for(let dz=0;dz<2;dz++)
   for(const y of [p[1],p[1]+1])
    originalRouteKeys.add((p[0]+dx)+','+y+','+(p[2]+dz));
 const touchedOriginalRoute=lowDiff.filter(k=>originalRouteKeys.has(k));
 const core={
  schema:SCHEMA,
  sourceDesignSha256:old.sourceSha256,
  sourceGeometrySha256:old.geometrySha256,
  finalDesignSha256:compiled.sourceSha256,
  finalGeometrySha256:compiled.geometrySha256,
  inheritedOrbitalCrownProofSha256:parent.report.sha256,
  unchanged127PathSha256:lower.sha256,
  original127PathSha256:originalLower.sha256,
  newAuthoringElements:elements.length,
  newSolidCells:newlyAdded.length,removedSolidCells:deleted.length,
  sourceChangeCellsAtOrBelowBody:lowDiff.length,
  changedCellsOnOriginalRoute:touchedOriginalRoute.length,
  interiorFlights:stairs.length,
  treadProofs:stairs,
  upperFloorsY:26,lowerFloorsY:19,
  whole2x2PerTread:true,
  maximumRisePerAdjacentTread:1,
  physicalStairTraversalCertified:false,
  connectedMezzanineTraversalCertified:false,
  structuralStrengthCertified:false,
  guardrailFallProtectionCertified:false,
  constructionApproved:false,worldContacts:0,worldCoordinates:null,
  readiness:'NOT_PREPARED',
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}
 };
 console.log('B165_INTERIOR_GATE_DIAGNOSTIC',JSON.stringify({
  elementCount:elements.length,newCells:newlyAdded.length,
  removedCells:deleted.length,lowChanges:lowDiff.length,
  routeTouches:touchedOriginalRoute.length,
  touches:touchedOriginalRoute.slice(0,12),
  wings:stairs.length,immutable:JSON.stringify(original)===frozen}));
 ensure(elements.length>=30&&newlyAdded.length>=400&&
  stairs.length===2&&touchedOriginalRoute.length===0&&
  JSON.stringify(original)===frozen,'INSUFFICIENT_INTERIOR_OR_LOW_PATH_MUTATED');
 return {parent,model,compiled,stairs,lower,elements,
  report:{...core,sha256:H(core)}};
}
export function verifyOrbitalInteriors(original,report){
 try{
  const expected=createOrbitalInteriors(original);
  return eq(expected.report,report)&&
   report.constructionApproved===false&&
   report.gates.length===9&&report.gates.every(g=>g==='BLOCKED')&&
   report.BuildPlan.operations.length===0;
 }catch{return false}
}
