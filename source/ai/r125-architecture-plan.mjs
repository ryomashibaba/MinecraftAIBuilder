/**
 * R125 compact ArchitecturePlan -> deterministic, TRUE B143 voxel source.
 * Prototype limit: rectangular, one/two levels, two functional zones per
 * level. The AI selects program, footprint, orientation, proportions, and
 * material palette; the universal geometry compiler owns ALL coordinates,
 * voids, supported floors, openings, stairs and shaft clearances.
 * No typology names, world APIs, scripts, or user code execution.
 */
import {createHash} from 'node:crypto';
import {compileDesign,verifyCompiled,SCHEMA as B143} from './b143-building-dsl.mjs';
export const SCHEMA='minecraftaibuilder-r125-architecture-plan-v1';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const refuse=code=>{throw Error('R125_PLAN_'+code);};
const check=(v,code)=>{if(!v)refuse(code);};
const keys=(v,names)=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).length===names.length&&names.every(k=>Object.hasOwn(v,k));
const slug=s=>typeof s==='string'&&/^[a-z][a-z0-9-]{2,39}$/.test(s);
const text=s=>typeof s==='string'&&s.length>=3&&s.length<=180&&
 !/[\u0000-\u001f<>]/.test(s);
const integer=(v,a,b)=>Number.isSafeInteger(v)&&v>=a&&v<=b;
export function validateArchitecturePlan(p){
 const standard=['schema','id','title','brief','footprint','levels','materials'];
 const expressive=Object.hasOwn(p??{},'expression');
 check(keys(p,expressive?[...standard,'expression']:standard),
  'TOP_LEVEL_FIELDS');
 check(p.schema===SCHEMA,'SCHEMA');
 check(slug(p.id)&&text(p.title)&&text(p.brief),'IDENTITY');
 check(keys(p.footprint,['width','depth'])&&
  integer(p.footprint.width,16,32)&&integer(p.footprint.depth,16,32),
  'FOOTPRINT_BOUNDS');
 check(Array.isArray(p.levels)&&[1,2].includes(p.levels.length),'LEVEL_COUNT');
 check(keys(p.materials,['floor','wall','roof'])&&
  ['wood','stone','concrete'].includes(p.materials.floor)&&
  ['concrete','stone','wood','metal'].includes(p.materials.wall)&&
  ['stone','metal','wood','concrete'].includes(p.materials.roof),
  'MATERIAL_PALETTE');
 if(expressive){
  const e=p.expression;
  check(keys(e,['setbackSide','setbackDepth','roofProfile','roofAxis','facadeLanguage']),
   'EXPRESSION_FIELDS');
  check(['none','east','rear'].includes(e.setbackSide)&&
   ((e.setbackSide==='none'&&e.setbackDepth===0)||
    (e.setbackSide!=='none'&&p.levels.length===2&&[2,3,4].includes(e.setbackDepth))),
   'EXPRESSION_SETBACK');
  check(['flat','ridge','sawtooth'].includes(e.roofProfile)&&
   ['x','z'].includes(e.roofAxis)&&
   ['plain','fins','screen'].includes(e.facadeLanguage),
   'EXPRESSION_STYLE');
 }
 const seen=new Set();
 for(const level of p.levels){
  check(keys(level,['splitAxis','splitPercent','spaces'])&&
   ['x','z'].includes(level.splitAxis)&&[40,50,60].includes(level.splitPercent)&&
   Array.isArray(level.spaces)&&level.spaces.length===2,'LEVEL_PROGRAM');
  for(const space of level.spaces){
   check(keys(space,['id','purpose'])&&slug(space.id)&&text(space.purpose),
    'SPACE_FIELDS');
   check(!seen.has(space.id),'DUPLICATE_SPACE_ID');
   seen.add(space.id);
  }
 }
 return true;
}
export function compileArchitecturePlan(plan){
 validateArchitecturePlan(plan);
 const original=structuredClone(plan);
 if(original.expression)return compileExpressiveArchitecturePlan(original);
 const {width:w,depth:d}=original.footprint;
 const count=original.levels.length;
 const floor=original.materials.floor,wall=original.materials.wall,
  roof=original.materials.roof;
 const elements=[],program=[];
 const box=(id,mode,material,origin,size)=>{
  const e={id,shape:'box',mode,...(mode==='add'?{material}:{}),origin,size};
  elements.push(e);
 };
 // Independent structural floors at y=1 and (if present) y=6.
 for(let l=0;l<count;l++)box('floor-'+l,'add',floor,
  [1,1+5*l,1],[w-2,1,d-2]);
 // A shaft is removed from the second-floor slab BEFORE adding the stair.
 if(count===2)box('stair-shaft','cut',null,[3,6,3],[2,1,5]);
 for(let l=0;l<count;l++){
  const base=1+5*l,tag='l'+l;
  box(tag+'-west','add',wall,[1,base+1,1],[1,4,d-2]);
  box(tag+'-east','add',wall,[w-2,base+1,1],[1,4,d-2]);
  box(tag+'-front','add',wall,[2,base+1,1],[w-4,4,1]);
  box(tag+'-rear','add',wall,[2,base+1,d-2],[w-4,4,1]);
  const level=original.levels[l],axis=level.splitAxis;
  const split=axis==='x'?
   Math.max(7,Math.min(w-7,Math.round(w*level.splitPercent/100))):
   Math.max(8,Math.min(d-6,Math.round(d*level.splitPercent/100)));
  if(axis==='x'){
   box(tag+'-divider','add',wall,[split,base+1,2],[1,4,d-4]);
   box(tag+'-inside-door','cut',null,
    [split,base+1,Math.floor(d/2)-1],[1,3,2]);
  }else{
   box(tag+'-divider','add',wall,[2,base+1,split],[w-4,4,1]);
   // The short doorway also allows a stair arrival from z=7 when
   // the second-storey partition happens to be at z=8.
   box(tag+'-inside-door','cut',null,[3,base+1,split],[2,3,1]);
  }
  // External ground-level opening, without inventing a world landing.
  if(l===0)box('exterior-entrance','cut',null,
   [Math.floor(w/2)-1,base+1,1],[2,3,1]);
  // True glazing is cut through an external wall THEN filled with glass.
  const windows=[
   {id:'front',at:[3,base+2,1],size:[2,2,1]},
   {id:'rear',at:[w-5,base+2,d-2],size:[2,2,1]},
   {id:'west',at:[1,base+2,d-5],size:[1,2,2]},
   {id:'east',at:[w-2,base+2,d-5],size:[1,2,2]}
  ];
  for(const win of windows){
   box(tag+'-window-'+win.id+'-void','cut',null,win.at,win.size);
   box(tag+'-window-'+win.id+'-glass','add','glass',win.at,win.size);
  }
  const [first,second]=level.spaces;
  program.push({
   level:l,splitAxis:axis,requestedPercent:level.splitPercent,
   splitCoordinate:split,standingFloorY:base+1,
   zones:axis==='x'?[
    {id:first.id,purpose:first.purpose,range:{x:[2,split-1],z:[2,d-3]}},
    {id:second.id,purpose:second.purpose,range:{x:[split+1,w-3],z:[2,d-3]}}
   ]:[
    {id:first.id,purpose:first.purpose,range:{x:[2,w-3],z:[2,split-1]}},
    {id:second.id,purpose:second.purpose,range:{x:[2,w-3],z:[split+1,d-3]}}
   ],
   partitionDoorModelled:true,doorAccessibleInMinecraft:'NOT_TESTED'
  });
 }
 if(count===2){
  elements.push({id:'interfloor-stair',shape:'staircase',mode:'add',
   material:floor,origin:[3,1,3],axis:'z',direction:1,width:2,
   steps:5,treadDepth:1});
 }
 box('roof','add',roof,[1,1+5*count,1],[w-2,1,d-2]);
 const design={schema:B143,id:original.id,title:original.title,
  brief:original.brief,bounds:{width:w,height:5*count+4,depth:d},
  elements,designOnly:true};
 const compiled=compileDesign(design);
 check(verifyCompiled(design,compiled),'COMPILED_SOURCE_MISMATCH');
 return {
  schema:'minecraftaibuilder-r125-plan-to-b143-result-v1',
  planSha256:hash(original),plan:original,design,compiled,program,
  sourceSha256:compiled.sourceSha256,geometrySha256:compiled.geometrySha256,
  modelAuthorship:'CALLER_PROVIDED_PLAN_UNVERIFIED',
  geometricRules:'GENERIC_TWO_ZONE_PROTOTYPE_NOT_STYLE_CERTIFIED',
  inGameWalking:'NOT_TESTED',architecturalQuality:'NOT_REVIEWED',
  constructionApproved:false,worldContacts:0,worldWrites:0,
  gates:Array(9).fill('BLOCKED')
 };
}

/**
 * Verify finite, model-independent SOURCE voxel evidence for this compiler's
 * program zones and, for two-level plans, every staircase tread and landing.
 * This is NOT Minecraft physics / walking or structural safety certification.
 */
export function auditArchitecturePlanCirculation(product){
 check(product?.schema==='minecraftaibuilder-r125-plan-to-b143-result-v1'&&
  product.design&&product.compiled&&Array.isArray(product.program),
  'INVALID_CIRCULATION_INPUT');
 check(verifyCompiled(product.design,product.compiled),'STALE_GEOMETRY');
 const occupied=new Set(product.compiled.primitives.map(v=>
  v[0]+','+v[1]+','+v[2]));
 const has=(x,y,z)=>occupied.has(x+','+y+','+z);
 const inBounds=(x,y,z)=>x>=0&&y>=0&&z>=0&&
  x<product.design.bounds.width&&y<product.design.bounds.height&&
  z<product.design.bounds.depth;
 const stand=(x,footY,z)=>inBounds(x,footY+1,z)&&
  has(x,footY-1,z)&&!has(x,footY,z)&&!has(x,footY+1,z);
 const failures=[],levels=[];
 const miss=(code,where)=>failures.push({code,...where});
 for(const level of product.program){
  const y=level.standingFloorY;
  const witnesses=level.zones.map(zone=>{
   const box=zone.range;
   let witness=null;
   for(let x=box.x[0];x<=box.x[1]&&!witness;x++)
    for(let z=box.z[0];z<=box.z[1]&&!witness;z++){
     if(stand(x,y,z)&&stand(x+1,y,z)&&
       stand(x,y,z+1)&&stand(x+1,y,z+1))witness=[x,y,z];
    }
   if(!witness)miss('ZONE_HAS_NO_TWO_WIDE_CLEAR_SOURCE_FLOOR',{
    level:level.level,zone:zone.id});
   return {zone:zone.id,twoWideClearWitness:witness};
  });
  // Partition openings must expose 2 adjacent columns/rows and have
  // real supported air on BOTH sides of the partition.
  const {splitAxis:axis,splitCoordinate:split}=level;
  let partitionPass=false;
  if(axis==='x'){
   for(let z=2;z<product.design.bounds.depth-2;z++)
    if([split-1,split,split+1].every(x=>stand(x,y,z)&&stand(x,y,z+1))){
     partitionPass=true;break;
    }
  }else{
   for(let x=2;x<product.design.bounds.width-2;x++)
    if([split-1,split,split+1].every(z=>stand(x,y,z)&&stand(x+1,y,z))){
     partitionPass=true;break;
    }
  }
  if(!partitionPass)miss('PARTITION_OPENING_NOT_SUPPORTED_AND_CLEAR',{
   level:level.level});
  levels.push({level:level.level,standingFloorY:y,
   zoneWitnesses:witnesses,partitionSourcePass:partitionPass});
 }
 const stairs=product.design.elements.filter(e=>e.shape==='staircase');
 const flights=[];
 if(product.program.length===2&&stairs.length!==1)
  miss('TWO_LEVEL_STAIRS_MISSING',{found:stairs.length});
 for(const e of stairs){
  let supportedTreads=0,blockedTreads=0;
  const across=e.axis==='z'?0:2,along=e.axis==='z'?2:0;
  const point=(offset,step)=>{const p=e.origin.slice();
   p[across]+=offset;p[along]+=step*e.treadDepth*e.direction;
   return p;};
  for(let step=0;step<e.steps;step++){
   const [ax,,az]=point(0,step);
   const top=e.origin[1]+step;
   let clear=true;
   for(let acrossOffset=0;acrossOffset<e.width;acrossOffset++)
    for(let tread=0;tread<e.treadDepth;tread++){
     const p=point(acrossOffset,step);
     p[along]+=tread*e.direction;
     const [x,,z]=p;
     if(!inBounds(x,top+2,z)||!has(x,top,z)||
      has(x,top+1,z)||has(x,top+2,z))clear=false;
    }
   if(clear)supportedTreads++;else{
    blockedTreads++;miss('STAIR_TREAD_BLOCKED_OR_UNSUPPORTED',{
     elementId:e.id,step,at:[ax,top,az]});
   }
  }
  // At the top of a straight run, the next adjacent cell is the required
  // higher landing slab. Also verify there is air above that landing.
  let landing=true;
  for(let i=0;i<e.width;i++){
   const p=point(i,e.steps);const [x,,z]=p;
   if(!stand(x,e.origin[1]+e.steps+1,z))landing=false;
  }
  if(!landing)miss('STAIR_UPPER_LANDING_MISSING_OR_BLOCKED',{elementId:e.id});
  flights.push({elementId:e.id,sourceTreadCount:e.steps,
   clearSupportedTreads:supportedTreads,blockedTreads,
   sourceUpperLandingPass:landing});
 }
 return {schema:'r125-plan-source-circulation-audit-v1',
  sourceSha256:product.sourceSha256,geometrySha256:product.geometrySha256,
  status:failures.length?'HOLD_SOURCE_CIRCULATION':'SOURCE_CLEARANCE_PROBES_PASS',
  failures,levels,stairFlights:flights,
  onlyDeterministicLocalSourceProbes:true,
  continuousRealPlayerPathCertified:false,
  worldWalking:'NOT_TESTED',worldWrites:0};
}


/**
 * Optional generative massing. Legacy ArchitecturePlan compiles byte-for-byte
 * identically without expression; do NOT change the old pinned Qwen 14B 2620-
 * voxel result or its source digest. No typology-specific templates.
 */
function compileExpressiveArchitecturePlan(original){
 const {width:w,depth:d}=original.footprint;
 const count=original.levels.length;
 const {setbackSide,setbackDepth,roofProfile,roofAxis,facadeLanguage}=original.expression;
 const {floor,wall,roof}=original.materials,elements=[],program=[];
 const box=(id,mode,material,origin,size)=>elements.push({
  id,shape:'box',mode,...(mode==='add'?{material}:{}),origin,size});
 const envelope=l=>({
  x0:1,z0:1,
  x1:w-2-(l===1&&setbackSide==='east'?setbackDepth:0),
  z1:d-2-(l===1&&setbackSide==='rear'?setbackDepth:0)
 });
 for(let l=0;l<count;l++)
  box('floor-'+l,'add',floor,[1,1+5*l,1],[w-2,1,d-2]);
 if(count===2)box('stair-shaft','cut',null,[3,6,3],[2,1,5]);
 for(let l=0;l<count;l++){
  const {x0,x1,z0,z1}=envelope(l);
  const y=2+5*l,tag='l'+l;
  box(tag+'-west','add',wall,[x0,y,z0],[1,4,z1-z0+1]);
  box(tag+'-east','add',wall,[x1,y,z0],[1,4,z1-z0+1]);
  box(tag+'-front','add',wall,[x0+1,y,z0],[x1-x0-1,4,1]);
  box(tag+'-rear','add',wall,[x0+1,y,z1],[x1-x0-1,4,1]);
  const level=original.levels[l];
  const axis=level.splitAxis,ratio=level.splitPercent/100;
  const split=axis==='x'?
   Math.max(x0+4,Math.min(x1-4,Math.round(x0+(x1-x0)*ratio))):
   Math.max(z0+4,Math.min(z1-4,Math.round(z0+(z1-z0)*ratio)));
  if(axis==='x'){
   box(tag+'-divider','add',wall,[split,y,z0+1],[1,4,z1-z0-1]);
   box(tag+'-internal-door','cut',null,
    [split,y,Math.floor((z0+z1)/2)-1],[1,3,2]);
  }else{
   box(tag+'-divider','add',wall,[x0+1,y,split],[x1-x0-1,4,1]);
   box(tag+'-internal-door','cut',null,[x0+2,y,split],[2,3,1]);
  }
  if(l===0)
   box('exterior-entrance','cut',null,
    [Math.floor(w/2)-1,y,z0],[2,3,1]);
  // A setback makes a real second-floor terrace. It must not be separated
  // from the interior by an uninterrupted exterior wall. Cut a 2-wide door
  // at upper-floor standing height without changing the 1st-floor envelope.
  if(l===1&&setbackSide==='east')
   box('upper-terrace-access','cut',null,
    [x1,y,Math.floor((z0+z1)/2)-1],[1,3,2]);
  else if(l===1&&setbackSide==='rear')
   box('upper-terrace-access','cut',null,
    [Math.floor((x0+x1)/2)-1,y,z1],[2,3,1]);
  const windows=[
   ['front',[x0+2,y+1,z0],[2,2,1]],
   ['rear',[x1-3,y+1,z1],[2,2,1]],
   ['west',[x0,y+1,z1-3],[1,2,2]],
   ['east',[x1,y+1,z1-3],[1,2,2]]
  ];
  for(const [name,at,size] of windows){
   box(tag+'-window-'+name+'-cut','cut',null,at,size);
   box(tag+'-window-'+name+'-glass','add','glass',at,size);
  }
  // Purely architectural articulation outside the envelope. Dynamic plan
  // controls the rhythm and materials; no fixed building-type switch.
  if(facadeLanguage==='fins'){
   for(let x=x0+1;x<x1-1;x+=4)
    box(tag+'-fin-'+x,'add','accent',[x,y+1,z0-1],[1,3,1]);
  }else if(facadeLanguage==='screen'){
   for(let z=z0+1;z<z1-1;z+=4)
    box(tag+'-screen-'+z,'add','metal',[x0-1,y+1,z],[1,3,1]);
  }
  const [first,second]=level.spaces;
  program.push({level:l,splitAxis:axis,requestedPercent:level.splitPercent,
   splitCoordinate:split,standingFloorY:y,
   zones:axis==='x'?[
    {id:first.id,purpose:first.purpose,range:{x:[x0+1,split-1],z:[z0+1,z1-1]}},
    {id:second.id,purpose:second.purpose,range:{x:[split+1,x1-1],z:[z0+1,z1-1]}}
   ]:[
    {id:first.id,purpose:first.purpose,range:{x:[x0+1,x1-1],z:[z0+1,split-1]}},
    {id:second.id,purpose:second.purpose,range:{x:[x0+1,x1-1],z:[split+1,z1-1]}}
   ],
   partitionDoorModelled:true,doorAccessibleInMinecraft:'NOT_TESTED'});
 }
 if(count===2){
  elements.push({id:'interfloor-stair',shape:'staircase',mode:'add',
   material:floor,origin:[3,1,3],axis:'z',direction:1,
   width:2,steps:5,treadDepth:1});
 }
 const upper=envelope(count-1),top=1+5*count;
 box('roof-base','add',roof,[upper.x0,top,upper.z0],
  [upper.x1-upper.x0+1,1,upper.z1-upper.z0+1]);
 if(roofProfile!=='flat'){
  const span=roofAxis==='x'?upper.x1-upper.x0+1:upper.z1-upper.z0+1;
  for(let pos=0;pos<span;pos++){
   const height=roofProfile==='ridge'?
    Math.min(3,Math.floor(Math.min(pos,span-1-pos)/2)):
    (pos%6===0?0:Math.ceil((pos%6)/2));
   if(height<1)continue;
   const origin=roofAxis==='x'?
    [upper.x0+pos,top+1,upper.z0]:[upper.x0,top+1,upper.z0+pos];
   const size=roofAxis==='x'?
    [1,height,upper.z1-upper.z0+1]:
    [upper.x1-upper.x0+1,height,1];
   box('roof-profile-'+pos,'add',roof,origin,size);
  }
 }
 // The upper floor is an occupied terrace plate beyond the upper envelope;
 // it is NOT proof of railings, weather safety, or accessible outdoor space.
 const design={schema:B143,id:original.id,title:original.title,
  brief:original.brief,bounds:{width:w,height:5*count+8,depth:d},
  elements,designOnly:true};
 const compiled=compileDesign(design);
 check(verifyCompiled(design,compiled),'EXPRESSION_COMPILER_NONDETERMINISTIC');
 return {schema:'minecraftaibuilder-r125-plan-to-b143-result-v1',
  planSha256:hash(original),plan:original,design,compiled,program,
  sourceSha256:compiled.sourceSha256,geometrySha256:compiled.geometrySha256,
  modelAuthorship:'CALLER_PROVIDED_PLAN_UNVERIFIED',
  geometricRules:'GENERIC_EXPRESSIVE_ENVELOPE_NOT_STYLE_CERTIFIED',
  expression:structuredClone(original.expression),
  inGameWalking:'NOT_TESTED',architecturalQuality:'NOT_REVIEWED',
  constructionApproved:false,worldContacts:0,worldWrites:0,
  gates:Array(9).fill('BLOCKED')};
}

/**
 * R125 geometry classification is PROGRAM-aware and source-pinned:
 * conservatively HOLD if any requested standing floor has multiple disconnected
 * 2-wide components, or if B198C flags any HIGH other than exterior/massing
 * elevations. Roof surface fragmentation remains separately reported as a
 * B198C advisory. No release to Minecraft is implied.
 */
export function assessR125ProgramGeometry(product,critique){
 check(product?.schema==='minecraftaibuilder-r125-plan-to-b143-result-v1'&&
  product.design&&product.compiled&&Array.isArray(product.program)&&
  verifyCompiled(product.design,product.compiled),'BAD_PROGRAM_GEOMETRY');
 check(critique?.sourceSha256===product.sourceSha256&&
  critique?.objectiveAudit?.geometrySha256===product.geometrySha256&&
  Array.isArray(critique.objectiveAudit.elevationConnectivity)&&
  Array.isArray(critique.findings),'UNTRUSTED_CRITIQUE');
 const levels=new Set(product.program.map(x=>x.standingFloorY));
 const programFloorIssues=[];
 const exteriorSurfaceAdvisories=[];
 const reports=critique.objectiveAudit.elevationConnectivity;
 for(const y of levels){
  const row=reports.find(x=>x.standingY===y);
  if(!row||row.componentCount!==1||row.totalStandingSquares<10)
   programFloorIssues.push({code:'PROGRAM_FLOOR_DISCONNECTED_OR_MISSING',
    standingY:y,componentCount:row?.componentCount??0});
 }
 for(const finding of critique.findings.filter(x=>x.severity==='HIGH')){
  if(finding.id!=='FRAGMENTED_PUBLIC_SOURCE_FLOORS'||
   !Array.isArray(finding.evidence?.fragmentedElevations)){
   programFloorIssues.push({code:'B198C_HIGH_PROGRAM_UNRESOLVED',
    findingId:finding.id});
   continue;
  }
  const relevant=finding.evidence.fragmentedElevations.filter(x=>levels.has(x.standingY));
  const exterior=finding.evidence.fragmentedElevations.filter(x=>!levels.has(x.standingY));
  for(const x of relevant)programFloorIssues.push({
   code:'FRAGMENTED_PROGRAM_FLOOR',standingY:x.standingY,
   componentCount:x.componentCount});
  for(const x of exterior)exteriorSurfaceAdvisories.push({
   code:'NONPROGRAM_SURFACE_FRAGMENTATION',
   standingY:x.standingY,componentCount:x.componentCount});
 }
 return {schema:'r125-program-floor-risk-v1',
  sourceSha256:product.sourceSha256,geometrySha256:product.geometrySha256,
  status:programFloorIssues.length?'HOLD_PROGRAM_FLOORS':
   exteriorSurfaceAdvisories.length?'PROGRAM_FLOORS_CLEAR_EXTERIOR_REVIEW_REQUIRED':
    'PROGRAM_FLOORS_CLEAR',
  programFloorIssues,exteriorSurfaceAdvisories,
  genericB198CHighRiskCount:critique.highRiskCount,
  surfaceIsNotPlayerPath:true,worldWrites:0,worldWalking:'NOT_TESTED'};
}
