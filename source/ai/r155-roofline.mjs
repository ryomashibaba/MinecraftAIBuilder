/**
 * R155 genuine stepped roofline. Supersedes ONLY the two R154 flat roof
 * caps and edge strips; conserves source interiors, high windows, rooms,
 * equipment, existing entrance and the original saved Qwen reply.
 * Architectural decisions are generic ridge vs shed, independent of type.
 * Strict B143 160-element constraint; paired eave/gable risers use repeat.
 */
import {compileDesign,verifyCompiled} from './b143-building-dsl.mjs';
import {auditR125SourceRoutes} from './r125-source-routes.mjs';
export const R155_ROOFLINE_SCHEMA='minecraftaibuilder-r155-roofline-ir-v1';
const fail=s=>{throw Error('R155_ROOFLINE_'+s);};
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const key=p=>p.slice(0,3).join(',');
export function validateR155RooflineIntent(intent){
 const fields=['schema','entryHierarchy','daylightStrategy','roofEdge',
  'volumeHierarchy','arrivalSpace','roofSilhouette'];
 if(!intent||Array.isArray(intent)||typeof intent!=='object'||
  Object.keys(intent).length!==fields.length||
  !fields.every(f=>Object.hasOwn(intent,f))||
  intent.schema!==R155_ROOFLINE_SCHEMA||
  !['quiet','emphasized'].includes(intent.entryHierarchy)||
  !['even','focused'].includes(intent.daylightStrategy)||
  !['fine','parapet'].includes(intent.roofEdge)||
  !['single','paired'].includes(intent.volumeHierarchy)||
  !['flush','covered'].includes(intent.arrivalSpace)||
  !['ridge','shed'].includes(intent.roofSilhouette))
  fail('STRICT_ROOFLINE_IR');
 return true;
}
const lower=compiled=>new Map(compiled.primitives.filter(p=>p[1]<=5)
 .map(p=>[key(p),p[3]]));
export function deriveR155Roofline(base,{intent,authorship=
 'HOST_RESEARCH_NOT_QWEN_SELECTED'}={}){
 validateR155RooflineIntent(intent);
 if(base?.schema!=='minecraftaibuilder-r125-featured-source-v1'||
  !base.r154VolumeEvidence||!base.r149ExpressionEvidence||
  !base.design||!base.compiled||
  !verifyCompiled(base.design,base.compiled)||
  base.sourceSha256!==base.compiled.sourceSha256||
  base.geometrySha256!==base.compiled.geometrySha256||
  base.sourceRouteAudit?.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  !Array.isArray(base.program)||base.program.length!==1||
  !Array.isArray(base.placements)||
  !['HOST_RESEARCH_NOT_QWEN_SELECTED','CALLER_ARCHITECTURE_IR_NOT_AUTHENTICATED'].includes(authorship))
  fail('VERIFIED_R154_SOURCE_REQUIRED');
 const raised=base.r154VolumeEvidence.raised;
 if(!Array.isArray(raised)||raised.length<1||
  ![1,2].includes(raised.length)||
  raised.length!==(intent.volumeHierarchy==='paired'?2:1)||
  Boolean(base.r154VolumeEvidence.portico)!==(intent.arrivalSpace==='covered'))
  fail('INTENT_NOT_SAME_AS_R154_PARENT');
 const old=base.design,remove=new Set();
 for(let i=0;i<raised.length;i++){
  remove.add('r154-wing'+(i+1)+'-roof-cap');
  remove.add('r154-wing'+(i+1)+'-roof-overhang');
 }
 const copy=structuredClone(old);
 const matches=copy.elements.filter(e=>remove.has(e.id));
 if(matches.length!==raised.length*2||new Set(matches.map(e=>e.id)).size!==matches.length)
  fail('EXACT_R154_ROOF_SOURCE_NOT_FOUND');
 copy.elements=copy.elements.filter(e=>!remove.has(e.id));
 copy.bounds.height=Math.max(copy.bounds.height,16);
 const roof=old.elements.find(e=>e.id==='roof-base')?.material;
 const wall=old.elements.find(e=>e.id==='shell-front')?.material;
 if(!['wood','metal','concrete','stone'].includes(roof)||
  !['wood','metal','concrete','stone'].includes(wall))
  fail('ORIGINAL_MATERIALS_NOT_FOUND');
 const add=(id,mode,material,origin,size,repeat)=>{
  copy.elements.push({id:'r155-'+id,shape:'box',mode,
   ...(mode==='add'?{material}:{}),origin,size,
   ...(repeat?{repeat}:{})});
 };
 const certificates=[];
 for(let i=0;i<raised.length;i++){
  const v=raised[i],id='wing'+(i+1),h=v.roofHeight,
   [x0,x1]=v.volumeFootprint.x,[z0,z1]=v.volumeFootprint.z,
   sx=x1-x0+1,sz=z1-z0+1;
  if(sx<7||sz<7||h<9||h>10||x1>=copy.bounds.width||
   z1>=copy.bounds.depth)
   fail('UPPER_VOLUME_FOOTPRINT_INVALID');
  // R134 sawtooth roof profiles can extend ABOVE the old R154 cap
  // (especially the 9-high secondary wing). Remove those residual
  // interior slabs BEFORE placing the new roof surface; otherwise a
  // visually pitched shell still has a hidden false interior ceiling.
  add(id+'-clear-residual-old-roof','cut',null,
   [x0+1,h,z0+1],[sx-2,5,sz-2]);
  const slope=Array.from({length:sx},(_,k)=>
   intent.roofSilhouette==='ridge'?
    Math.min(2,Math.floor((Math.min(k,sx-1-k)+1)/2)):
    Math.floor(2*k/(sx-1)));
  const runs=[];
  for(let k=0;k<sx;k++){
   if(k===0||slope[k]!==slope[k-1])
    runs.push({first:k,last:k,level:slope[k]});
   else runs[runs.length-1].last=k;
  }
  // Horizontal thin roof strips at varying heights are REAL roof cells.
  // Unlike a full wedge block they leave interior y>=h breathable.
  for(let k=0;k<runs.length;k++){
   const a=runs[k];
   add(id+'-roof'+k,'add',roof,[x0+a.first,h+a.level,z0],
    [a.last-a.first+1,1,sz]);
   if(a.level>0){
    // Two gable ends, one B143 repeat element. The height is SOLID
    // only at outer two faces, not inside the inhabitable ceiling.
    add(id+'-gable'+k,'add',wall,[x0+a.first,h,z0],
     [a.last-a.first+1,a.level,1],
     {count:2,offset:[0,0,sz-1]});
   }
  }
  // Close roof level-change seams (1-cell vertical risers). When the
  // transitions are symmetric, pack both in one repeated source element.
  const byLevel=new Map();
  for(let k=1;k<sx;k++){
   if(slope[k]===slope[k-1])continue;
   const higher=Math.max(slope[k],slope[k-1]),
    x=k+(slope[k]<slope[k-1]?-1:0);
   const group=byLevel.get(higher)??[];
   group.push(x);byLevel.set(higher,group);
  }
  for(const [level,xs] of byLevel){
   if(xs.length>2)fail('UNSUPPORTED_ROOF_SEAM_PATTERN');
   const x=x0+xs[0];
   add(id+'-seam'+level,'add',roof,[x,h+level-1,z0],
    [1,1,sz],xs.length===2?
    {count:2,offset:[xs[1]-xs[0],0,0]}:undefined);
  }
  if(intent.roofSilhouette==='shed'){
   // End-wall to underside of the high shed cap, so elevated interior
   // isn't openly exposed across the end face.
   add(id+'-shed-end','add',wall,[x1,h,z0+1],[1,2,sz-2]);
  }
  const highest=Math.max(...slope),
   peaks=slope.map((level,k)=>level===highest?k:-1).filter(k=>k>=0),
   mid=peaks[Math.floor(peaks.length/2)],
   roomIndex=intent.roofSilhouette==='shed'?Math.max(1,mid-1):mid;
  certificates.push({zoneId:v.zoneId,roofHeightBefore:h,
   silhouette:intent.roofSilhouette,roofHeightAtPeak:h+highest,
   footprint:v.volumeFootprint,slopeLevels:slope,
   witnessAboveRoom:[x0+mid,h+highest,z0+Math.floor(sz/2)],
   // Y=h was the OLD flat ceiling. It must now be physically empty.
   // A narrow ridge may require an opaque riser at y=h+highest-1,
   // which is structurally valid but not a reason to label y=h sealed.
   sectionCavity:[x0+roomIndex,h,z0+Math.floor(sz/2)],
   sourceElementsAdded:copy.elements.length});
 }
 if(copy.elements.length>160)
  fail('B143_SOURCE_ELEMENT_BUDGET_EXCEEDED');
 const compiled=compileDesign(copy);
 if(!verifyCompiled(copy,compiled))fail('B143_SOURCE_COMPILATION_FAILED');
 if(!eq([...lower(base.compiled).entries()].sort(),
  [...lower(compiled).entries()].sort()))
  fail('HISTORICAL_ROOMS_EQUIPMENT_FLOOR_CHANGED');
 const vox=new Set(compiled.primitives.map(key));
 for(const c of certificates){
  if(!vox.has(c.witnessAboveRoom.join(','))||
   vox.has(c.sectionCavity.join(',')))
   fail('FAKE_ROOFLINE_OR_NO_LIVING_HEADROOM');
 }
 const entry=copy.elements.find(e=>e.id==='exterior-entrance');
 for(const x of [entry.origin[0],entry.origin[0]+1])
  for(const y of [2,3,4])
   for(const z of [0,1,2])
    if(vox.has([x,y,z].join(',')))fail('REAL_THRESHOLD_BLOCKED');
 const targets=base.placements.map(p=>({id:p.id,zoneId:p.zoneId,
  origin:p.origin,size:p.size}));
 const audit=auditR125SourceRoutes({
  schema:'minecraftaibuilder-r125-plan-to-b143-result-v1',
  design:copy,compiled,program:base.program,
  sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256
 },{featureTargets:targets});
 if(audit.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  audit.featureAccess.length!==targets.length||
  !audit.featureAccess.every(a=>a.reachableFromEntrance))
  fail('ROOM_OR_EQUIPMENT_ACCESS_REGRESSED');
 const evidence={
  schema:'minecraftaibuilder-r155-genuine-roofline-proof-v1',
  intent:structuredClone(intent),authorship,
  originalB143ElementCount:old.elements.length,
  newB143ElementCount:copy.elements.length,
  upperVolumes:certificates,
  originalSourceSha256:base.sourceSha256,
  newSourceSha256:compiled.sourceSha256,
  originalVoxelCount:base.compiled.primitives.length,
  newVoxelCount:compiled.primitives.length,
  unchangedAllInteriorBelowY6:true,
  originalRooms:base.program[0].zones.length,
  originalEquipment:base.placements.length,
  reachedEquipment:audit.featureAccess.length,
  routeStatus:audit.status,
  upperRoofColumnContinuityChecked:false,
  realMinecraftWeatherproofing:'NOT_TESTED',
  actualPlayerWalking:'NOT_TESTED',
  humanVisualArtReview:'NOT_REVIEWED',
  modelUnknownGenreGeneralization:'NOT_TESTED',
  safety:'NOT_PREPARED_9_BLOCKED_BUILDPLAN_EMPTY_WORLD0'
 };
 return {...base,design:copy,compiled,
  parentSourceSha256:base.sourceSha256,
  parentGeometrySha256:base.geometrySha256,
  sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256,
  sourceRouteAudit:audit,r155RooflineEvidence:evidence,
  architecturalQuality:'HUMAN_REVIEW_REQUIRED',aestheticApproved:false,
  constructionApproved:false,executionAllowed:false,
  readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]},worldContacts:0,worldWrites:0};
}
