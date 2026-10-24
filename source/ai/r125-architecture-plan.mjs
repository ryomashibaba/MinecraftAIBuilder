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
 check(keys(p,['schema','id','title','brief','footprint','levels','materials']),
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
