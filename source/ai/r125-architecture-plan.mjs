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
import {auditR125SourceRoutes,auditR125VisitorRoutes} from './r125-source-routes.mjs';
import {SCHEMA as SPATIAL_SCHEMA,compileSpatialComposition} from './r125-spatial-composition.mjs';
import {addAuthoredRoomFixtures,addR125ActivityFloorInlays,restyleR125FixtureForms} from './r125-room-fixtures.mjs';
import {addAuthoredRoomDaylight,addR125SpatialDaylightBays} from './r125-room-daylight.mjs';
import {expandR125RoomScale} from './r125-room-scale.mjs';
import {detailR125Envelope} from './r125-spatial-detail.mjs';
import {addR125HipRoof} from './r125-hip-roof.mjs';
import {addR125AuthoredObservation} from './r125-room-observation.mjs';
export const SCHEMA='minecraftaibuilder-r125-architecture-plan-v1';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const refuse=code=>{throw Error('R125_PLAN_'+code);};
const check=(v,code)=>{if(!v)refuse(code);};
const keys=(v,names)=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).length===names.length&&names.every(k=>Object.hasOwn(v,k));
const slug=s=>typeof s==='string'&&/^[a-z][a-z0-9-]{2,39}$/.test(s);
const text=(s,max=180)=>typeof s==='string'&&s.length>=3&&s.length<=max&&
 !/[\u0000-\u001f<>]/.test(s);
const integer=(v,a,b)=>Number.isSafeInteger(v)&&v>=a&&v<=b;

/**
 * Pack adjacent equal-height raised-roof strips using B143's existing repeat
 * primitive. Pure SOURCE representation optimization: no room/roof redesign,
 * material swap, extra voxels, model calls or relaxation of B143's 160 limit.
 * Safe only for three HOST-generated roof strip families; all are additive,
 * within the same roof construction pass, with exact 1-cell axis strides.
 * Call conditionally when the ORIGINAL author has requested enough equipment
 * and daylight that uncompressed source would exceed the 160-element limit.
 */
export function packR125RaisedRoofStrips(elements,roofAxis){
 check(Array.isArray(elements)&&['x','z'].includes(roofAxis),
  'ROOF_PACK_INPUT');
 const axis=roofAxis==='x'?0:2;
 const groups=new Map(),changes=new Map(),drop=new Set();
 for(let i=0;i<elements.length;i++){
  const e=elements[i],match=/^(roof-(?:raised-(?:skin|eave-a|eave-b)|pitched-eave-(?:front|rear|west|east)))-(\d+)$/
   .exec(e.id??'');
  if(!match||e.shape!=='box'||e.mode!=='add'||e.repeat)continue;
  // Each B143 repeat preserves the original box volume. We never merge
  // unlike material, dimensions, y or coordinates on the other two axes.
  const other=[0,1,2].filter(n=>n!==axis);
  const key=JSON.stringify([match[1],e.material,
   ...other.map(n=>[e.origin[n],e.size[n]]),e.size[axis]]);
  if(!groups.has(key))groups.set(key,[]);
  groups.get(key).push({index:i,element:e,position:e.origin[axis]});
 }
 for(const group of groups.values()){
  group.sort((a,b)=>a.position-b.position);
  const all=new Map(group.map(x=>[x.position,x]));
  // Ridge often has a long constant-height plateau: repeat side-by-side.
  // Sawtooth has recurrent *identical* strips and eaves every six blocks.
  // Choosing the longest arithmetic subsequence first avoids unnecessarily
  // emitting 2-cell repeats when a 5-cell periodic repeat is available.
  while(true){
   let best=null;
   for(const candidate of group){
    if(drop.has(candidate.index)||changes.has(candidate.index))continue;
    const width=candidate.element.size[axis];
    for(const stride of new Set([width,6])){
     if(stride<width)continue;
     const run=[candidate];
     for(let pos=candidate.position+stride;run.length<32;pos+=stride){
      const next=all.get(pos);
      if(!next||drop.has(next.index)||changes.has(next.index))break;
      run.push(next);
     }
     if(run.length>=2&&(!best||run.length>best.run.length||
        (run.length===best.run.length&&stride<best.stride)))
      best={run,stride};
    }
   }
   if(!best)break;
   const head=best.run[0];
   const offset=[0,0,0];offset[axis]=best.stride;
   changes.set(head.index,{...head.element,repeat:{
    count:best.run.length,offset}});
   for(const item of best.run.slice(1))drop.add(item.index);
  }
 }
 return elements.flatMap((e,i)=>drop.has(i)?[]:[changes.get(i)??e]);
}
export const estimateR125AuthoredElementReserve=p=>p.levels.reduce((sum,level)=>sum+
 level.spaces.reduce((subtotal,room)=>{
  const roles=room.fixtures??(room.fixture?[room.fixture]:[]);
  const parts={counter:2,workbench:3,display:2,storage:4,seating:2,
   bed:4,desk:4,washbasin:5,electronics:5,oven:6,
   'service-bay':5,'tool-rack':4,'teaching-board':4,
   'inspection-stand':3,'assembly-table':6};
  const detail=room.fixtureDetail==='crafted'?{
   counter:1,workbench:1,display:1,storage:1,seating:2,bed:2,
   desk:2,washbasin:1,electronics:1,oven:1,
   'service-bay':1,'tool-rack':1,'teaching-board':1,
   'inspection-stand':1,'assembly-table':1}:{};
  return subtotal+roles.reduce((total,role)=>total+parts[role]+
   (detail[role]??0)+(room.fixtureScale==='expanded'?3:0),0)+(room.daylight==='paired-bays'?4:room.daylight?2:0);
 },0),0);
// Authored entry-zone choices always win. Otherwise, the opt-in path
// preserves a clear centered entrance and moves it only if a divider blocks
// the two-wide opening. This nearest-safe default is HOST geometry policy,
// not a claim that the model authored the unprovided entry-zone choice.
const groundEntryX=(axis,split,width,placement,zone)=>{
 const center=Math.floor(width/2)-1;
 if(axis!=='x')return center;
 if(zone==='first')return split-2;
 if(zone==='second')return split+2;
 if(placement!=='source-accessible'||center+1<split||center>split)return center;
 const first=split-2,second=split+2;
 return Math.abs(center-first)<=Math.abs(center-second)?first:second;
};

/** Additional author-owned space creates a real T plan only on opt-in. */
function tLayout(level,{x0,x1,z0,z1},split){
 if(level.spaces.length!==3)return null;
 const [first,second,third]=level.spaces;
 if(level.splitAxis==='x'){
  // Original three-room geometry stays identical when this is omitted.
  const k=Math.floor(z0+(z1-z0)*(level.secondarySplitPercent??50)/100);
  check(x1-split-1>=3&&k-z0-1>=3&&z1-k-1>=3,
   'THREE_ROOM_MINIMUM_CLEAR_SPAN');
  return {axis:'z',coordinate:k,
   wallAt:y=>[split+1,y,k],wallSize:[x1-split-1,4,1],
   doorAt:y=>[split+1,y,k],doorSize:[2,3,1],
   mainDoorZ:Math.min(k-3,Math.max(z0+2,Math.floor((z0+k)/2))),
   // Optional author-owned direct first-to-third connection, independent
   // of the second/third doorway. No retroactive changes to old plans.
   thirdDirectAt:y=>[split,y,Math.floor((k+z1-1)/2)],
   thirdDirectSize:[1,3,2],
   zones:[
    {id:first.id,purpose:first.purpose,
     range:{x:[x0+1,split-1],z:[z0+1,z1-1]}},
    {id:second.id,purpose:second.purpose,
     range:{x:[split+1,x1-1],z:[z0+1,k-1]}},
    {id:third.id,purpose:third.purpose,
     range:{x:[split+1,x1-1],z:[k+1,z1-1]}}
   ]};
 }
 const k=Math.floor(x0+(x1-x0)*(level.secondarySplitPercent??50)/100);
 check(z1-split-1>=3&&k-x0-1>=3&&x1-k-1>=3,
  'THREE_ROOM_MINIMUM_CLEAR_SPAN');
 return {axis:'x',coordinate:k,
  wallAt:y=>[k,y,split+1],wallSize:[1,4,z1-split-1],
  doorAt:y=>[k,y,split+1],doorSize:[1,3,2],
  thirdDirectAt:y=>[Math.floor((k+x1-1)/2),y,split],
  thirdDirectSize:[2,3,1],
  zones:[
   {id:first.id,purpose:first.purpose,
    range:{x:[x0+1,x1-1],z:[z0+1,split-1]}},
   {id:second.id,purpose:second.purpose,
    range:{x:[x0+1,k-1],z:[split+1,z1-1]}},
   {id:third.id,purpose:third.purpose,
    range:{x:[k+1,x1-1],z:[split+1,z1-1]}}
  ]};
}

/** Opt-in model-authored front hub connects three rear rooms directly.
 * Generic single-storey geometry, never relabels author-owned rooms/access.
 */
function fourRoomFrontHub(level,{x0,x1,z0,z1},split){
 if(level.spaces.length!==4||level.splitAxis!=='z')return null;
 const [k1,k2]=level.rearBayPercentages?
  level.rearBayPercentages.map(p=>Math.floor(x0+(x1-x0)*p/100)):
  [Math.floor(x0+(x1-x0)/3),Math.floor(x0+2*(x1-x0)/3)];
 const bays=[[x0+1,k1-1],[k1+1,k2-1],[k2+1,x1-1]];
 check(bays.every(([a,b])=>b-a+1>=5)&&
  split-z0-1>=4&&z1-split-1>=6,'FOUR_ROOM_HUB_CLEAR_SPANS');
 const doors=bays.map(([a,b])=>[Math.floor((a+b-1)/2),split]);
 return {partitions:[k1,k2],doors,bays,zones:[
  {id:level.spaces[0].id,purpose:level.spaces[0].purpose,
   range:{x:[x0+1,x1-1],z:[z0+1,split-1]}},
  ...level.spaces.slice(1).map((room,i)=>({id:room.id,purpose:room.purpose,
   range:{x:bays[i],z:[split+1,z1-1]}}))
 ]};
}
/** An authored public/shared longitudinal spine and three side rooms.
 * The HOST only constructs the partitions and independent two-wide doors. */
function fourRoomSideSpine(level,{x0,x1,z0,z1},split){
 if(level.spaces.length!==4||level.splitAxis!=='x')return null;
 const [k1,k2]=level.sideBayPercentages?
  level.sideBayPercentages.map(p=>Math.floor(z0+(z1-z0)*p/100)):
  [Math.floor(z0+(z1-z0)/3),Math.floor(z0+2*(z1-z0)/3)];
 const bays=[[z0+1,k1-1],[k1+1,k2-1],[k2+1,z1-1]];
 check(split-x0-1>=4&&x1-split-1>=5&&
  bays.every(([a,b])=>b-a+1>=5),'FOUR_ROOM_SIDE_SPINE_CLEAR_SPANS');
 return {partitions:[k1,k2],doors:bays.map(([a,b])=>
   [split,Math.floor((a+b-1)/2)]),zones:[
  {id:level.spaces[0].id,purpose:level.spaces[0].purpose,
   range:{x:[x0+1,split-1],z:[z0+1,z1-1]}},
  ...level.spaces.slice(1).map((room,i)=>({id:room.id,purpose:room.purpose,
   range:{x:[split+1,x1-1],z:bays[i]}}))
 ]};
}

/** Match the compiler's authored split coordinate without emitting SOURCE. */
function authoredLevelSplit(plan,index){
 const level=plan.levels[index],{width,depth}=plan.footprint,e=plan.expression;
 const x0=1,z0=1+(index===1&&e?.setbackSide==='front'?e.setbackDepth:0);
 const x1=width-2-(index===1&&e?.setbackSide==='east'?e.setbackDepth:0);
 const z1=depth-2-(index===1&&e?.setbackSide==='rear'?e.setbackDepth:0);
 if(e){
  const lo=level.splitAxis==='x'?x0:z0;
  const hi=level.splitAxis==='x'?x1:z1;
  return Math.max(lo+4,Math.min(hi-4,
   Math.round(lo+(hi-lo)*level.splitPercent/100)));
 }
 return level.splitAxis==='x'?
  Math.max(level.spaces.length===4?6:7,
   Math.min(width-7,Math.round(width*level.splitPercent/100))):
  Math.max(level.spaces.length===4?6:8,
   Math.min(depth-6,Math.round(depth*level.splitPercent/100)));
}

export function validateArchitecturePlan(p){
 const standard=['schema','id','title','brief','footprint','levels','materials'];
 const expressive=Object.hasOwn(p??{},'expression');
 const entrySpecified=Object.hasOwn(p??{},'entryZone');
 const observationSpecified=Object.hasOwn(p??{},'observationLink');
 check(keys(p,[...standard,...(expressive?['expression']:[]),
  ...(entrySpecified?['entryZone']:[]),
  ...(observationSpecified?['observationLink']:[])]),
  'TOP_LEVEL_FIELDS');
 check(p.schema===SCHEMA,'SCHEMA');
 // B143 permits up to 500 characters of brief; keep title and room-purpose
 // bounds unchanged so a valid model-authored design is never silently edited.
 check(slug(p.id)&&text(p.title)&&text(p.brief,500),'IDENTITY');
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
  check(keys(e,['setbackSide','setbackDepth','roofProfile','roofAxis',
   'facadeLanguage',...(Object.hasOwn(e,'rearCornerCut')?['rearCornerCut']:[]),
   ...(Object.hasOwn(e,'roofVolume')?['roofVolume']:[]),
   ...(Object.hasOwn(e,'daylightFacade')?['daylightFacade']:[]),
   ...(Object.hasOwn(e,'roofOverhang')?['roofOverhang']:[]),
   ...(Object.hasOwn(e,'ridgeProfile')?['ridgeProfile']:[]),
   ...(Object.hasOwn(e,'frontCornerCut')?['frontCornerCut']:[]),
   ...(Object.hasOwn(e,'rearCourt')?['rearCourt']:[])]),
   'EXPRESSION_FIELDS');
  check(['none','east','rear','front'].includes(e.setbackSide)&&
   ((e.setbackSide==='none'&&e.setbackDepth===0)||
    (e.setbackSide==='front'&&p.levels.length===2&&e.setbackDepth===2)||
    (['east','rear'].includes(e.setbackSide)&&
     p.levels.length===2&&[2,3,4,6,8].includes(e.setbackDepth)&&
      (e.setbackDepth<=4||(e.setbackSide==='east'?
       p.footprint.width>=28:p.footprint.depth>=28)))),
   'EXPRESSION_SETBACK');
  check(['flat','ridge','sawtooth','split-monitor','hip'].includes(e.roofProfile)&&
   ['x','z'].includes(e.roofAxis)&&
   ['plain','fins','screen','recessed-portico'].includes(e.facadeLanguage),
   'EXPRESSION_STYLE');
  // Only an explicitly authored new ridge profile may replace the broad
  // historical 3-block-rise plateau. Existing roofs are never reinterpreted.
  check(e.ridgeProfile===undefined||
   (e.ridgeProfile==='steep'&&e.roofProfile==='ridge'&&
    e.roofVolume==='raised'&&!Object.hasOwn(e,'rearCornerCut')&&
    !Object.hasOwn(e,'rearCourt')&&!Object.hasOwn(e,'frontCornerCut')),
   'EXPRESSION_RIDGE_PROFILE');
  // Explicit opt-in preserves the original B143 roof source for old plans.
  check(e.roofVolume===undefined||
   (e.roofVolume==='raised'&&['ridge','sawtooth','split-monitor','hip'].includes(e.roofProfile)),
   'EXPRESSION_ROOF_VOLUME');
  check(e.roofProfile!=='split-monitor'||
   (e.roofVolume==='raised'&&e.roofAxis==='x'&&
    e.setbackSide==='none'),
   'EXPRESSION_MONITOR_PROGRAM_CONFLICT');
  check(e.roofProfile!=='hip'||(e.roofVolume==='raised'&&
   !Object.hasOwn(e,'rearCornerCut')),'EXPRESSION_HIP_CONFLICT');
  // AUTHOR opt-in only; no implicit change to frozen source or prior massing.
  check(e.daylightFacade===undefined||
   (e.daylightFacade==='east-and-rear-bays'&&
    e.roofProfile==='split-monitor'&&e.roofVolume==='raised'&&
    e.roofAxis==='x'&&p.levels.length===1),
   'EXPRESSION_DAYLIGHT_FACADE_CONFLICT');
  // Explicit author opt-in only: no implied change to Qwen-authored roofs
  // or previously supported ridge/sawtooth/daylight geometry.
  // A single-cell eave is supported on author-selected RAISED roof masses.
  // Existing split-monitor semantics and all plans without opt-in are frozen.
  check(e.roofOverhang===undefined||
   (e.roofOverhang==='one-block'&&e.roofVolume==='raised'&&
    ((e.roofProfile==='split-monitor'&&p.levels.length===1)||
     (['ridge','sawtooth','hip'].includes(e.roofProfile)&&
      !Object.hasOwn(e,'rearCornerCut')))),
   'EXPRESSION_ROOF_OVERHANG_CONFLICT');
  if(Object.hasOwn(e,'rearCourt')){
   const c=e.rearCourt;
   check(keys(c,['width','depth','alignment','entrySide','access'])&&
    integer(c.width,6,14)&&integer(c.depth,4,10)&&
    ['west','center','east'].includes(c.alignment)&&
    ['west','east'].includes(c.entrySide)&&c.access==='paved'&&
    p.footprint.width>=c.width+12&&
    p.footprint.depth>=c.depth+14,
    'EXPRESSION_REAR_COURT');
   // A SINGLE story author may independently choose a true raised ridge.
   // No implicit change to any older flat U, L, or rectangular building.
   check(p.levels.length===1&&e.setbackSide==='none'&&
    ((e.roofProfile==='flat'&&!Object.hasOwn(e,'roofVolume'))||
     (e.roofProfile==='ridge'&&e.roofVolume==='raised'))&&
    e.facadeLanguage==='plain'&&
    !Object.hasOwn(e,'rearCornerCut')&&
    !Object.hasOwn(e,'frontCornerCut')&&
    !Object.hasOwn(e,'roofOverhang')&&
    !Object.hasOwn(e,'daylightFacade'),
    'EXPRESSION_REAR_COURT_CONFLICT');
  }
  if(Object.hasOwn(e,'frontCornerCut')){
   const c=e.frontCornerCut;
   check(keys(c,['width','depth','side','access'])&&
    integer(c.width,3,8)&&integer(c.depth,3,8)&&
    ['east','west'].includes(c.side)&&c.access==='paved'&&
    p.footprint.width>=2*c.width+8&&
    p.footprint.depth>=c.depth+10,
    'EXPRESSION_FRONT_COURT');
   check(p.levels.length===1&&e.setbackSide==='none'&&
    e.roofProfile==='flat'&&e.facadeLanguage==='plain'&&
    !Object.hasOwn(e,'rearCornerCut')&&
    !Object.hasOwn(e,'roofVolume')&&
    !Object.hasOwn(e,'roofOverhang')&&
    !Object.hasOwn(e,'daylightFacade'),
    'EXPRESSION_FRONT_COURT_CONFLICT');
  }
  if(Object.hasOwn(e,'rearCornerCut')){
   check((keys(e.rearCornerCut,['width','depth'])||
    (keys(e.rearCornerCut,['width','depth','side'])||
      keys(e.rearCornerCut,['width','depth','side','access'])))&&
     (e.rearCornerCut.access===undefined||e.rearCornerCut.access==='paved')&&
     (e.rearCornerCut.access!=='paved'||
      (e.rearCornerCut.width>=4&&e.rearCornerCut.depth>=4))&&
    (e.rearCornerCut.side===undefined||
     ['east','west'].includes(e.rearCornerCut.side))&&
    integer(e.rearCornerCut.width,3,8)&&integer(e.rearCornerCut.depth,3,8),
    'EXPRESSION_CORNER_CUT');
   // A full-height recess cannot share the current upper setback or
   // raised roof profiles without compromising the enclosing envelope.
   // A raised ridge is compatible with a rear corner only when its
   // full roof skin is explicitly clipped and the re-entrant eaves sealed.
   // Never infer a new roof form from a plain authored facade.
   check(e.setbackSide==='none'&&
    (e.roofProfile==='flat'||(['ridge','split-monitor'].includes(e.roofProfile)&&e.roofVolume==='raised')),
    'EXPRESSION_CORNER_CONFLICT');
  }
 }
 const seen=new Set();
 for(const level of p.levels){
  const spatialLevel=level.layoutMode==='spatial-tree';
  const expectedLevelKeys=spatialLevel?['layoutMode','spaces']:[
   'splitAxis','splitPercent','spaces',
   ...(Object.hasOwn(level??{},'secondarySplitPercent')?
    ['secondarySplitPercent']:[]),
   ...(Object.hasOwn(level??{},'thirdRoomLink')?
    ['thirdRoomLink']:[]),
   ...(Object.hasOwn(level??{},'rearBayPercentages')?
    ['rearBayPercentages']:[]),
   ...(Object.hasOwn(level??{},'sideBayPercentages')?
    ['sideBayPercentages']:[])];
  check(keys(level,expectedLevelKeys)&&
   (spatialLevel?
    (p.levels.length===1&&!expressive&&Array.isArray(level.spaces)&&
     [2,3,4].includes(level.spaces.length)):
    ['x','z'].includes(level.splitAxis)&&Number.isInteger(level.splitPercent)&&
     Array.isArray(level.spaces)&&
     level.splitPercent>=(level.spaces.length===4?20:30)&&
     level.splitPercent<=70&&level.splitPercent%5===0&&
     [2,3,4].includes(level.spaces.length)),
   'LEVEL_PROGRAM');
  check(level.secondarySplitPercent===undefined||
   (level.spaces.length===3&&Number.isInteger(level.secondarySplitPercent)&&
    level.secondarySplitPercent>=25&&level.secondarySplitPercent<=75&&
    level.secondarySplitPercent%5===0),
   'THREE_ROOM_SECONDARY_PERCENT');
  check(level.thirdRoomLink===undefined||
   (level.spaces.length===3&&level.thirdRoomLink==='first-and-second'),
   'THREE_ROOM_LINK');
  check(level.rearBayPercentages===undefined||
   (level.spaces.length===4&&level.splitAxis==='z'&&
    Array.isArray(level.rearBayPercentages)&&
    level.rearBayPercentages.length===2&&
    level.rearBayPercentages.every(n=>Number.isInteger(n)&&n>=20&&n<=80&&n%5===0)&&
    level.rearBayPercentages[0]<level.rearBayPercentages[1]),
   'FOUR_ROOM_REAR_BAY_WIDTHS');
  check(level.sideBayPercentages===undefined||
   (level.spaces.length===4&&level.splitAxis==='x'&&
    Array.isArray(level.sideBayPercentages)&&
    level.sideBayPercentages.length===2&&
    level.sideBayPercentages.every(n=>Number.isInteger(n)&&n>=20&&n<=80&&n%5===0)&&
    level.sideBayPercentages[0]<level.sideBayPercentages[1]),
   'FOUR_ROOM_SIDE_BAY_DEPTHS');
  if(level.spaces.length===4&&level.layoutMode!=='spatial-tree')
   check(p.levels.length===1&&
    ((level.splitAxis==='z'&&p.footprint.width>=22&&p.footprint.depth>=18)||
     (level.splitAxis==='x'&&p.footprint.width>=20&&p.footprint.depth>=22))&&
    // For the side-spine, the model MUST choose the public west entry.
    // Without entryZone:first a centered x entry may open into staff space.
    (level.splitAxis!=='x'||p.entryZone==='first')&&
    ['public','shared'].includes(level.spaces[0].access)&&
    !Object.hasOwn(p.expression??{},'rearCourt')&&
    !Object.hasOwn(p.expression??{},'rearCornerCut')&&
    !Object.hasOwn(p.expression??{},'frontCornerCut')&&
    p.expression?.facadeLanguage!=='recessed-portico',
    'FOUR_ROOM_HUB_PROGRAM');
  for(const space of level.spaces){
   check(keys(space,['id','purpose',
    ...(Object.hasOwn(space??{},'fixture')?['fixture']:[]),
    ...(Object.hasOwn(space??{},'fixtures')?['fixtures']:[]),
    ...(Object.hasOwn(space??{},'fixtureDetail')?['fixtureDetail']:[]),
    ...(Object.hasOwn(space??{},'fixtureArrangement')?['fixtureArrangement']:[]),
    ...(Object.hasOwn(space??{},'fixtureScale')?['fixtureScale']:[]),
    ...(Object.hasOwn(space??{},'ovenHearth')?['ovenHearth']:[]),
    ...(Object.hasOwn(space??{},'daylight')?['daylight']:[]),
    ...(Object.hasOwn(space??{},'spatialUse')?['spatialUse']:[]),
    ...(Object.hasOwn(space??{},'access')?['access']:[]),
    ...(Object.hasOwn(space??{},'volume')?['volume']:[])])&&
    slug(space.id)&&text(space.purpose),'SPACE_FIELDS');
   check(space.access===undefined||
    ['public','shared','staff'].includes(space.access),
    'SPACE_ACCESS');
   if(level.layoutMode==='spatial-tree'){
    const volume=space.volume;
    check(keys(volume,['width','depth','roofY',
     ...(Object.hasOwn(volume??{},'attach')?['attach']:[]),
     ...(Object.hasOwn(volume??{},'roofForm')?['roofForm']:[]),
     ...(Object.hasOwn(volume??{},'roofAxis')?['roofAxis']:[])])&&
     integer(volume.width,6,14)&&integer(volume.depth,6,14)&&
     integer(volume.roofY,6,10)&&
     ((volume.roofForm===undefined&&volume.roofAxis===undefined)||
      (volume.roofForm==='ridge'&&['x','z'].includes(volume.roofAxis)&&
       space.spatialUse!=='open-court')),'SPATIAL_ROOM_VOLUME');
    if(seen.size===0){
     check(!Object.hasOwn(volume,'attach')&&['public','shared'].includes(space.access),
      'SPATIAL_ROOT_MUST_BE_PUBLIC');
    }else{
     check(keys(volume.attach,['to','side','shift'])&&seen.has(volume.attach.to)&&
      ['east','west','north','south'].includes(volume.attach.side)&&
      integer(volume.attach.shift,-3,3),'SPATIAL_ATTACHMENT');
    }
    check(space.spatialUse===undefined||
     (seen.size===0&&space.spatialUse==='open-court'&&
      !Object.hasOwn(space,'daylight')),
     'SPATIAL_OPEN_COURT_REQUIRES_PUBLIC_ROOT');

   }else check(!Object.hasOwn(space,'volume')&&
    !Object.hasOwn(space,'spatialUse'),'SPATIAL_VOLUME_REQUIRES_LAYOUT_MODE');
   check(space.fixture===undefined||
    ['counter','workbench','display','storage','seating'].includes(space.fixture),
    'SPACE_FIXTURE_ROLE');
   check(space.daylight===undefined||
    ['wide-bay','clerestory','paired-bays'].includes(space.daylight),
    'SPACE_DAYLIGHT_ROLE');
   // Explicit author-owned equipment presentation, never an inferred
   // genre-specific decoration or a rewrite of old fixture geometry.
   check(space.fixtureDetail===undefined||
    (space.fixtureDetail==='crafted'&&
     (space.fixture!==undefined||space.fixtures!==undefined)),
    'SPACE_FIXTURE_DETAIL');
   check(space.fixtureArrangement===undefined||
    (space.fixtureArrangement==='focal-island'&&
     (space.fixture!==undefined||space.fixtures!==undefined)),
    'SPACE_FIXTURE_ARRANGEMENT');
   check(space.fixtureScale===undefined||
    (space.fixtureScale==='expanded'&&
     (space.fixture!==undefined||space.fixtures!==undefined)),
    'SPACE_FIXTURE_SCALE');
   const roles=['counter','workbench','display','storage','seating',
    'bed','desk','washbasin','electronics','oven',
    'service-bay','tool-rack','teaching-board','inspection-stand','assembly-table'];
   check(space.fixtureScale!=='expanded'||
    !(space.fixtures??[]).some(r=>
     ['service-bay','tool-rack','teaching-board','inspection-stand','assembly-table'].includes(r)),
    'NEW_ROLE_REQUIRES_DEFAULT_SCALE');
   check(space.ovenHearth===undefined||
    (space.ovenHearth==='accent'&&
     Array.isArray(space.fixtures)&&space.fixtures.includes('oven')),
    'SPACE_OVEN_HEARTH');
   check(space.fixtures===undefined||
    (space.fixture===undefined&&Array.isArray(space.fixtures)&&
     space.fixtures.length>=1&&space.fixtures.length<=5&&
     space.fixtures.every(x=>typeof x==='string'&&roles.includes(x))),
    'SPACE_FIXTURE_GROUP');
   check(!seen.has(space.id),'DUPLICATE_SPACE_ID');
   seen.add(space.id);
  }
 }
 if(observationSpecified){
  const relation=p.observationLink;
  check((expressive||p.levels.some(level=>level.layoutMode==='spatial-tree'))&&
   keys(relation,['viewerSpaceId','workSpaceId'])&&
   slug(relation.viewerSpaceId)&&slug(relation.workSpaceId)&&
   relation.viewerSpaceId!==relation.workSpaceId,
   'OBSERVATION_LINK_FIELDS');
  const sites=p.levels.map((l,i)=>l.spaces.map(s=>({s,i}))).flat();
  const viewer=sites.find(({s})=>s.id===relation.viewerSpaceId);
  const worker=sites.find(({s})=>s.id===relation.workSpaceId);
  check(viewer&&worker&&viewer.i===worker.i&&
   ['public','shared'].includes(viewer.s.access)&&
   ['staff','shared'].includes(worker.s.access),
   'OBSERVATION_LINK_PRIVACY_OR_LEVEL');
  const stationRoles=worker.s.fixtures??(worker.s.fixture?[worker.s.fixture]:[]);
  check(stationRoles.some(x=>[
   'assembly-table','inspection-stand','workbench','service-bay',
   'electronics','oven','tool-rack'].includes(x)),
   'OBSERVATION_LINK_NO_AUTHORED_WORKSTATION');
 }
 // A rear public room in a z-split cannot have a staff-only front room
 // as the ONLY path from the entrance. This is a narrow author-declared
 // privacy invariant: it does NOT certify all visitor routing or classify
 // rooms from their names. Legacy plans without access tags remain unchanged.
 if(p.levels[0].splitAxis==='z'&&
    p.levels[0].spaces[0].access==='staff'&&
    p.levels[0].spaces.slice(1).some(s=>s.access==='public'))
  refuse('VISITOR_ACCESS_THROUGH_STAFF');
 // Only the first z-split zone touches the front facade; no fake back entry.
 check(!entrySpecified||(['first','second'].includes(p.entryZone)&&
  (p.levels[0].splitAxis==='x'||p.entryZone==='first')),
  'ENTRY_ZONE_FRONT_ACCESS');
 return true;
}

/**
 * Compose stair clearance into a valid model-authored two-storey program.
 * Preserve each authored axis and raise only an undersized public first-zone
 * split enough to contain the fixed stair approach/landing. SOURCE audits
 * still decide whether the derived geometry is actually visitor-safe.
 */
export function composeR125PublicStairSpine(plan){
 validateArchitecturePlan(plan);
 const original=structuredClone(plan);
 const upperVisitors=original.levels.length===2&&
  original.levels[1].spaces.some(s=>['public','shared'].includes(s.access));
 const summary={
  schema:'r125-public-stair-clearance-composition-v1',
  status:'NOT_REQUIRED',modelCalls:0,worldWrites:0,
  originalPlanSha256:hash(original),
  originalEdited:false,roomOrderPreserved:true,
  accessRolesPreserved:true,fixtureRolesPreserved:true
 };
 if(!upperVisitors)return {plan:original,report:summary};
 const hasPublicFirst=p=>['public','shared'].includes(p.levels[0].spaces[0].access)&&
  ['public','shared'].includes(p.levels[1].spaces[0].access);
 if(!hasPublicFirst(original))return {plan:original,report:{...summary,
  status:'HOLD_PUBLIC_STAIR_ROOM_ORDER'} };
 const composed=structuredClone(original);
 composed.entryZone='first';
 const originalSplits=original.levels.map(level=>level.splitPercent);
 for(let i=0;i<composed.levels.length;i++){
  const level=composed.levels[i];
  const requiredCut=level.splitAxis==='x'?4:(i===0?9:10);
  if(authoredLevelSplit(composed,i)>=requiredCut)continue;
  let found=false;
  for(let percent=level.splitPercent+5;percent<=70;percent+=5){
   level.splitPercent=percent;
   if(authoredLevelSplit(composed,i)>=requiredCut){found=true;break;}
  }
  if(!found)return {plan:original,report:{...summary,
   status:'HOLD_PUBLIC_STAIR_ZONE_CAPACITY',originalAxes:original.levels.map(l=>l.splitAxis),
   originalSplitPercents:originalSplits}};
 }
 validateArchitecturePlan(composed);
 const roles=p=>JSON.stringify(p.levels.map(l=>l.spaces.map(s=>({
  id:s.id,access:s.access,fixtures:s.fixtures??null,fixture:s.fixture??null
 }))));
 return {plan:composed,report:{...summary,
  status:'APPLIED_MINIMUM_PUBLIC_STAIR_CLEARANCE',
  originalAxes:original.levels.map(l=>l.splitAxis),
  composedAxes:composed.levels.map(l=>l.splitAxis),
  originalSplitPercents:originalSplits,
  composedSplitPercents:composed.levels.map(l=>l.splitPercent),
  originalEntryZone:original.entryZone??null,
  composedEntryZone:composed.entryZone,
  roomOrderPreserved:JSON.stringify(original.levels.map(l=>
   l.spaces.map(s=>s.id)))===JSON.stringify(composed.levels.map(l=>
   l.spaces.map(s=>s.id))),
  accessRolesPreserved:JSON.stringify(original.levels.map(l=>
   l.spaces.map(s=>s.access)))===JSON.stringify(composed.levels.map(l=>
   l.spaces.map(s=>s.access))),
  fixtureRolesPreserved:roles(original)===roles(composed),
  composedPlanSha256:hash(composed),
  arrivalZoneId:composed.levels[1].spaces[0].id,
  spineRoomId:composed.levels[0].spaces[0].id
 }};
}

/**
 * Evidence-backed, non-blocking capacity advisory for AUTHOR-CHOSEN room
 * partitions, footprints, setbacks and furniture. Room areas are UPPER
 * BOUNDS: stairs, corner recesses and entrances reduce actual clear floor.
 * Risk flags do not assert that a placement is impossible or skip SOURCE.
 */
export function assessR125AuthoredRoomCapacity(plan){
 validateArchitecturePlan(plan);
 const w=plan.footprint.width,d=plan.footprint.depth,e=plan.expression;
 const zones=plan.levels.flatMap((level,index)=>{
  const x0=1,z0=1;
  const x1=w-2-(e?.setbackSide==='east'&&index===1?e.setbackDepth:0);
  const z1=d-2-(e?.setbackSide==='rear'&&index===1?e.setbackDepth:0);
  const ratio=level.splitPercent/100,axis=level.splitAxis;
  const split=axis==='x'?
   (e?Math.max(x0+4,Math.min(x1-4,Math.round(x0+(x1-x0)*ratio))):
    Math.max(level.spaces.length===4?6:7,
     Math.min(w-7,Math.round(w*ratio)))):
   (e?Math.max(z0+4,Math.min(z1-4,Math.round(z0+(z1-z0)*ratio))):
    Math.max(level.spaces.length===4?6:8,
     Math.min(d-6,Math.round(d*ratio))));
  const sizes=axis==='x'?
   [[split-x0-1,z1-z0-1],[x1-split-1,z1-z0-1]]:
   [[x1-x0-1,split-z0-1],[x1-x0-1,z1-split-1]];
  if(level.spaces.length===4){
   if(axis==='z'){
    const [k1,k2]=level.rearBayPercentages?
     level.rearBayPercentages.map(p=>Math.floor(x0+(x1-x0)*p/100)):
     [Math.floor(x0+(x1-x0)/3),Math.floor(x0+2*(x1-x0)/3)];
    sizes.splice(1,1,[k1-x0-1,z1-split-1],
     [k2-k1-1,z1-split-1],[x1-k2-1,z1-split-1]);
   }else{
    const [k1,k2]=level.sideBayPercentages?
     level.sideBayPercentages.map(p=>Math.floor(z0+(z1-z0)*p/100)):
     [Math.floor(z0+(z1-z0)/3),Math.floor(z0+2*(z1-z0)/3)];
    sizes.splice(0,sizes.length,[split-x0-1,z1-z0-1],
     [x1-split-1,k1-z0-1],[x1-split-1,k2-k1-1],
     [x1-split-1,z1-k2-1]);
   }
  }
  if(level.spaces.length===3){
   // Match the actual authored T partition, not an invented 50/50 zone.
   const secondaryStart=axis==='x'?z0:x0;
   const secondaryEnd=axis==='x'?z1:x1;
   const k=Math.floor(secondaryStart+(secondaryEnd-secondaryStart)*
    (level.secondarySplitPercent??50)/100);
   sizes.splice(1,1,...(axis==='x'?
    [[x1-split-1,k-z0-1],[x1-split-1,z1-k-1]]:
    [[k-x0-1,z1-split-1],[x1-k-1,z1-split-1]]));
  }
  return level.spaces.map((room,zi)=>{
   const [width,depth]=sizes[zi];
   const roles=room.fixtures??(room.fixture?[room.fixture]:[]);
   const roleDepth=k=>['bed','service-bay'].includes(k)?4:
    ['assembly-table','inspection-stand'].includes(k)?3:
    ['seating','electronics','washbasin','oven'].includes(k)?2:1;
   const roleWidth=k=>['service-bay','tool-rack','teaching-board','assembly-table'].includes(k)?5:3;
   const equipmentFootprintCells=roles.reduce((n,k)=>n+roleWidth(k)*roleDepth(k),0);
   const nominalFloorCellsUpperBound=Math.max(0,width*depth);
   const risks=[];
   if(roles.length>=2&&Math.min(width,depth)<=4)
    risks.push('NARROW_MULTIPLE_EQUIPMENT');
   if(roles.length>=2&&equipmentFootprintCells>nominalFloorCellsUpperBound/3)
    risks.push('HIGH_EQUIPMENT_FOOTPRINT_FRACTION');
   return {level:index,zoneIndex:zi,zoneId:room.id,
    splitAxis:axis,nominalWidth:width,nominalDepth:depth,
    nominalFloorCellsUpperBound,selectedEquipment:roles,
    equipmentFootprintCells,risks};
  });
 });
 return {schema:'r125-authored-room-capacity-advisory-v1',
  sourceOnly:true,originalPlanEdited:false,modelCalls:0,worldWrites:0,
  floorAreaIsUpperBound:true,impossibleVerdict:false,
  zones,flaggedZones:zones.filter(x=>x.risks.length>0).length};
}

function compileR125SpatialArchitecturePlan(original){
 const level=original.levels[0];
 const proposal={schema:SPATIAL_SCHEMA,id:original.id,title:original.title,
  brief:original.brief,materials:original.materials,
  rooms:level.spaces.map(space=>({id:space.id,purpose:space.purpose,
   width:space.volume.width,depth:space.volume.depth,roofY:space.volume.roofY,
   ...(space.volume.roofForm?{roofForm:space.volume.roofForm,
    roofAxis:space.volume.roofAxis}:{}),
   ...(space.volume.attach?{attach:space.volume.attach}:{}),
   ...(space.daylight?{daylight:space.daylight}:{}),
   ...(space.spatialUse?{spatialUse:space.spatialUse}:{})}))};
 const spatial=compileSpatialComposition(proposal);
 check(spatial.design.bounds.width<=original.footprint.width&&
  spatial.design.bounds.depth<=original.footprint.depth,
  'SPATIAL_VOLUMES_EXCEED_FOOTPRINT');
 const authored=new Map(level.spaces.map(space=>[space.id,space]));
 const program=[{level:0,standingFloorY:2,zones:spatial.layout.rooms.map(room=>({
  id:room.id,purpose:room.purpose,access:authored.get(room.id).access,
  range:{x:[room.x+1,room.x+room.width-2],
   z:[room.z+1,room.z+room.depth-2]}
 }))}];
 let product={...spatial,plan:original,program,fixtureTargets:[],
  planSha256:hash(original),spatialComposition:true,
  modelAuthorship:'CALLER_PROVIDED_PLAN_UNVERIFIED'};
 const auditCirculation=candidate=>{
  const routes=auditR125SourceRoutes(candidate,{
   featureTargets:candidate.fixtureTargets??[]});
  const failed=routes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
   (routes.featureAccess??[]).some(feature=>!feature.reachableFromEntrance);
  return {status:failed?'HOLD_SOURCE_CIRCULATION':'SOURCE_CLEARANCE_PROBES_PASS',
   failures:failed?(routes.issues??[]):[],routeStatus:routes.status};
 };
 product=addAuthoredRoomFixtures(product,{auditCirculation});
 const visitors=auditR125VisitorRoutes(product,original);
 check(visitors.status==='SOURCE_VISITOR_ROUTES_AVOID_STAFF',
  'SPATIAL_VISITOR_ROUTES');
 if(original.observationLink)
  product=addR125AuthoredObservation(product,original);
 const routes=auditR125SourceRoutes(product,{
  featureTargets:product.fixtureTargets});
 check(routes.status==='SOURCE_ROUTES_REACH_ALL_ZONES'&&
  !(routes.featureAccess??[]).some(feature=>!feature.reachableFromEntrance),
  'SPATIAL_SOURCE_ROUTES');
 return {...product,sourceRoutes:routes,visitorCirculation:visitors,
  spatialLayout:spatial.layout,worldWrites:0};
}

export function compileArchitecturePlan(plan,{
 entrancePlacement='legacy',upperDoorPlacement='legacy',hostDetail='legacy',
 roofGlazing='none',roofMassing='default',fixtureArt='none',fixtureForm='default'
}={}){
 check(['legacy','spatial-v1','clear-front-fins'].includes(hostDetail),'HOST_DETAIL_MODE');
 check(['none','activity-inlays','activity-layout','activity-layout-inlays'].includes(fixtureArt),
  'FIXTURE_ART_MODE');
 check(!['activity-layout','activity-layout-inlays'].includes(fixtureArt)||
  hostDetail==='spatial-v1',
  'ACTIVITY_LAYOUT_REQUIRES_SPATIAL_DETAIL');
 check(['default','readable-v1','room-scale-v1','room-scale-v2'].includes(fixtureForm),'FIXTURE_FORM_MODE');
 check(fixtureArt==='none'||Boolean(plan?.expression),'FIXTURE_ART_REQUIRES_EXPRESSION');
 // Optional ART candidate only. Old authors and their original SOURCE are untouched.
 check(['none','sawtooth-ribbon'].includes(roofGlazing),'ROOF_GLAZING_MODE');
 check(['default','compact-sawtooth','steep-ridge-review'].includes(roofMassing),'ROOF_MASSING_MODE');
 check(roofMassing!=='compact-sawtooth'||(plan?.expression?.roofProfile==='sawtooth'&&
  plan.expression.roofVolume==='raised'),'ROOF_MASSING_REQUIRES_RAISED_SAWTOOTH');
 // Explicit ART A/B: use the existing six-block ridge ceiling without
 // rewriting the author's original plan, circulation, or furniture.
 // Courtyard seals are roof-height-specific and must remain unchanged.
 check(roofMassing!=='steep-ridge-review'||(
  plan?.expression?.roofProfile==='ridge'&&
  plan.expression.roofVolume==='raised'&&
  plan.expression.ridgeProfile===undefined&&
  plan.expression.rearCourt===undefined&&
  plan.expression.rearCornerCut===undefined),
  'ROOF_MASSING_REQUIRES_UNMODIFIED_RAISED_RIDGE');
 check(roofGlazing==='none'||(plan?.expression?.roofProfile==='sawtooth'&&
  plan.expression.roofVolume==='raised'),'ROOF_GLAZING_REQUIRES_RAISED_SAWTOOTH');
 check(hostDetail==='legacy'||Boolean(plan?.expression),'HOST_DETAIL_REQUIRES_EXPRESSION');
 validateArchitecturePlan(plan);
 check(['legacy','source-accessible'].includes(entrancePlacement),
  'ENTRANCE_PLACEMENT_MODE');
 if(plan.levels[0].layoutMode==='spatial-tree'){
  check(entrancePlacement==='legacy'&&upperDoorPlacement==='legacy'&&
   hostDetail==='legacy'&&roofGlazing==='none'&&roofMassing==='default'&&
   fixtureArt==='none'&&fixtureForm==='default',
   'SPATIAL_LAYOUT_INCOMPATIBLE_HOST_OPTIONS');
  return compileR125SpatialArchitecturePlan(structuredClone(plan));
 }
 // Opt-in HOST research only. Old callers retain byte-for-byte geometry.
 check(['legacy','stair-clear'].includes(upperDoorPlacement),
  'UPPER_DOOR_PLACEMENT_MODE');
 check(upperDoorPlacement==='legacy'||Boolean(plan.expression),
  'UPPER_DOOR_REQUIRES_EXPRESSION');
 const original=structuredClone(plan);
 if(original.expression)return compileExpressiveArchitecturePlan(original,{entrancePlacement,upperDoorPlacement,hostDetail,roofGlazing,roofMassing,fixtureArt,fixtureForm});
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
   Math.max(level.spaces.length===4?6:7,
    Math.min(w-7,Math.round(w*level.splitPercent/100))):
   Math.max(level.spaces.length===4?6:8,
    Math.min(d-6,Math.round(d*level.splitPercent/100)));
  const three=tLayout(level,{x0:1,x1:w-2,z0:1,z1:d-2},split);
  const side=fourRoomSideSpine(level,{x0:1,x1:w-2,z0:1,z1:d-2},split);
  const four=fourRoomFrontHub(level,{x0:1,x1:w-2,z0:1,z1:d-2},split);
  if(axis==='x'){
   box(tag+'-divider','add',wall,[split,base+1,2],[1,4,d-4]);
   if(!side)box(tag+'-inside-door','cut',null,
    [split,base+1,three?.mainDoorZ??Math.floor(d/2)-1],[1,3,2]);
  }else{
   box(tag+'-divider','add',wall,[2,base+1,split],[w-4,4,1]);
   // The short doorway also allows a stair arrival from z=7 when
   // the second-storey partition happens to be at z=8.
   if(!four)box(tag+'-inside-door','cut',null,[3,base+1,split],[2,3,1]);
  }
  if(four){
   for(let i=0;i<four.partitions.length;i++)
    box(tag+'-rear-divider-'+i,'add',wall,
     [four.partitions[i],base+1,split+1],[1,4,d-3-split]);
   for(let i=0;i<four.doors.length;i++)
    box(tag+'-front-hub-door-'+i,'cut',null,
     [four.doors[i][0],base+1,split],[2,3,1]);
  }
  if(side){
   for(let i=0;i<side.partitions.length;i++)
    box(tag+'-side-divider-'+i,'add',wall,
     [split+1,base+1,side.partitions[i]],[w-3-split,4,1]);
   for(let i=0;i<side.doors.length;i++)
    box(tag+'-side-spine-door-'+i,'cut',null,
     [split,base+1,side.doors[i][1]],[1,3,2]);
  }
  if(three){
   box(tag+'-secondary-divider','add',wall,three.wallAt(base+1),
    three.wallSize);
   box(tag+'-secondary-door','cut',null,three.doorAt(base+1),
    three.doorSize);
   if(level.thirdRoomLink==='first-and-second')
    box(tag+'-third-direct-door','cut',null,
     three.thirdDirectAt(base+1),three.thirdDirectSize);
  }
  // External ground-level opening, without inventing a world landing.
  if(l===0){
   // New practical exports opt into a generic geometry rule: avoid the
   // x-axis dividing wall just behind the formerly centered exterior door.
   // Legacy compilation remains byte-identical for frozen original hashes.
   const entryX=groundEntryX(axis,split,w,entrancePlacement,original.entryZone);
   box('exterior-entrance','cut',null,[entryX,base+1,1],[2,3,1]);
  }
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
  // The legacy rectangular compiler uses fixed interior bounds,
  // not expressive-envelope x0/x1/z0/z1 variables. Keep its pinned SOURCE
  // voxels and zone ranges byte-for-byte identical to historic plans.
  const roomZones=side?.zones??four?.zones??three?.zones??(axis==='x'?[
   {id:first.id,purpose:first.purpose,range:{x:[2,split-1],z:[2,d-3]}},
   {id:second.id,purpose:second.purpose,range:{x:[split+1,w-3],z:[2,d-3]}}
  ]:[
   {id:first.id,purpose:first.purpose,range:{x:[2,w-3],z:[2,split-1]}},
   {id:second.id,purpose:second.purpose,range:{x:[2,w-3],z:[split+1,d-3]}}
  ]);
  program.push({
   level:l,splitAxis:axis,requestedPercent:level.splitPercent,
   splitCoordinate:split,standingFloorY:base+1,
   ...(three?{secondarySplitAxis:three.axis,secondarySplitCoordinate:three.coordinate}:{}),
   zones:roomZones,
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
 const built={
  schema:'minecraftaibuilder-r125-plan-to-b143-result-v1',
  planSha256:hash(original),plan:original,design,compiled,program,
  sourceSha256:compiled.sourceSha256,geometrySha256:compiled.geometrySha256,
  modelAuthorship:'CALLER_PROVIDED_PLAN_UNVERIFIED',
  geometricRules:'GENERIC_TWO_ZONE_PROTOTYPE_NOT_STYLE_CERTIFIED',
  inGameWalking:'NOT_TESTED',architecturalQuality:'NOT_REVIEWED',
  constructionApproved:false,worldContacts:0,worldWrites:0,
  gates:Array(9).fill('BLOCKED')
 };
 const daylit=addAuthoredRoomDaylight(built,
  {auditCirculation:auditArchitecturePlanCirculation});
 const furnished=addAuthoredRoomFixtures(daylit,
  {auditCirculation:auditArchitecturePlanCirculation});
 return fixtureForm==='room-scale-v1'||fixtureForm==='room-scale-v2'||original.levels.some(l=>
  l.spaces.some(s=>s.fixtureScale==='expanded'))?
  expandR125RoomScale(furnished,{auditCirculation:auditArchitecturePlanCirculation,
   includeHostStudy:fixtureForm==='room-scale-v1'||fixtureForm==='room-scale-v2',
   profile:fixtureForm==='room-scale-v2'?'room-scale-v2':'room-scale-v1'}):furnished;
}

/**
 * Verify finite, model-independent SOURCE voxel evidence for this compiler's
 * program zones and, for two-level plans, every staircase tread and landing.
 * This is NOT Minecraft physics / walking or structural safety certification.
 */
export function auditArchitecturePlanCirculation(product){
 if(product?.spatialComposition===true){
  check(product.design&&product.compiled&&verifyCompiled(product.design,product.compiled),
   'INVALID_SPATIAL_CIRCULATION_INPUT');
  const routes=auditR125SourceRoutes(product,{
   featureTargets:product.fixtureTargets??[]});
  const failed=routes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
   (routes.featureAccess??[]).some(feature=>!feature.reachableFromEntrance);
  return {schema:'r125-plan-source-circulation-audit-v1',
   sourceSha256:product.sourceSha256,geometrySha256:product.geometrySha256,
   status:failed?'HOLD_SOURCE_CIRCULATION':'SOURCE_CLEARANCE_PROBES_PASS',
   failures:failed?(routes.issues??[]):[],levels:routes.zones??[],stairFlights:[],
   onlyDeterministicLocalSourceProbes:true,continuousRealPlayerPathCertified:false,
   worldWalking:'NOT_TESTED',worldWrites:0};
 }
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
  let secondaryPass=null;
  if(Number.isSafeInteger(level.secondarySplitCoordinate)){
   const k=level.secondarySplitCoordinate,zone=level.zones[1].range;
   secondaryPass=false;
   if(level.secondarySplitAxis==='z'){
    for(let x=zone.x[0];x<zone.x[1];x++)
     if([k-1,k,k+1].every(z=>stand(x,y,z)&&stand(x+1,y,z))){
      secondaryPass=true;break;
     }
   }else{
    for(let z=zone.z[0];z<zone.z[1];z++)
     if([k-1,k,k+1].every(x=>stand(x,y,z)&&stand(x,y,z+1))){
      secondaryPass=true;break;
     }
   }
   if(!secondaryPass)miss('SECONDARY_PARTITION_OPENING_NOT_CLEAR',
    {level:level.level});
  }
  levels.push({level:level.level,standingFloorY:y,
   zoneWitnesses:witnesses,partitionSourcePass:partitionPass,
   ...(secondaryPass===null?{}:{secondaryPartitionSourcePass:secondaryPass})});
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
function compileExpressiveArchitecturePlan(original,{entrancePlacement='legacy',upperDoorPlacement='legacy',hostDetail='legacy',roofGlazing='none',roofMassing='default',fixtureArt='none',fixtureForm='default'}={}){
 const {width:w,depth:d}=original.footprint;
 const count=original.levels.length;
 const {setbackSide,setbackDepth,roofProfile,roofAxis,facadeLanguage,
  rearCornerCut,frontCornerCut,rearCourt}=original.expression;
 const {floor,wall,roof}=original.materials,elements=[],program=[];
 const box=(id,mode,material,origin,size)=>elements.push({
  id,shape:'box',mode,...(mode==='add'?{material}:{}),origin,size});
 const envelope=l=>({
  x0:1,z0:1+(l===1&&setbackSide==='front'?setbackDepth:0),
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
  const three=tLayout(level,{x0,x1,z0,z1},split);
  const side=fourRoomSideSpine(level,{x0,x1,z0,z1},split);
  const four=fourRoomFrontHub(level,{x0,x1,z0,z1},split);
  const [first,second]=level.spaces;
  const roomZones=side?.zones??four?.zones??three?.zones??(axis==='x'?[
   {id:first.id,purpose:first.purpose,range:{x:[x0+1,split-1],z:[z0+1,z1-1]}},
   {id:second.id,purpose:second.purpose,range:{x:[split+1,x1-1],z:[z0+1,z1-1]}}
  ]:[
   {id:first.id,purpose:first.purpose,range:{x:[x0+1,x1-1],z:[z0+1,split-1]}},
   {id:second.id,purpose:second.purpose,range:{x:[x0+1,x1-1],z:[split+1,z1-1]}}
  ]);
  if(axis==='x'){
   box(tag+'-divider','add',wall,[split,y,z0+1],[1,4,z1-z0-1]);
   if(!side)box(tag+'-internal-door','cut',null,
    [split,y,three?.mainDoorZ??Math.floor((z0+z1)/2)-1],[1,3,2]);
  }else{
   box(tag+'-divider','add',wall,[x0+1,y,split],[x1-x0-1,4,1]);
   // At upper level, the legacy x0+2 doorway can align with the
    // first-floor stair-shaft void (x=3..4,z=3..7) and disconnect
    // the TWO-WIDE supported walkway at the split wall. Opt-in
    // generic rule sets it beyond the shaft with 2-cell clearance.
    // This is HOST research; no change to the Qwen-authored program.
    // A 2x2 standing pad needs TWO clear rows between the last tread
    // (z=7) and this doorway. A divider at z=9 leaves only row z=8;
    // the old z<=8 condition missed that horizontal turn obstruction.
    const clearGroundStair=l===0&&count===2&&entrancePlacement==='source-accessible'&&split>=3&&split<=9;
    const doorX=(l===1&&upperDoorPlacement==='stair-clear')||clearGroundStair?
     Math.max(x0+2,Math.min(x1-3,3+2+2)):
     x0+2;
    if(!four)box(tag+'-internal-door','cut',null,[doorX,y,split],[2,3,1]);
    // The fixed five-tread stair ends at z=7 and lands at z=8.
    // If an upper z-divider crosses either cell, moving the normal room
    // door clear of the shaft also blocks the ascent. Research opt-in only:
    // keep the normal room door and open a separate two-wide threshold.
    const stairLastTreadZ=3+5-1;
    if(l===1&&upperDoorPlacement==='stair-clear'&&
       split>=stairLastTreadZ&&split<=stairLastTreadZ+1)
     box(tag+'-stair-threshold-relief','cut',null,[3,y,split],[2,3,1]);
  }
  if(four){
   for(let i=0;i<four.partitions.length;i++)
    box(tag+'-rear-divider-'+i,'add',wall,
     [four.partitions[i],y,split+1],[1,4,z1-split-1]);
   for(let i=0;i<four.doors.length;i++)
    box(tag+'-front-hub-door-'+i,'cut',null,
     [four.doors[i][0],y,split],[2,3,1]);
  }
  if(side){
   for(let i=0;i<side.partitions.length;i++)
    box(tag+'-side-divider-'+i,'add',wall,
     [split+1,y,side.partitions[i]],[x1-split-1,4,1]);
   for(let i=0;i<side.doors.length;i++)
    box(tag+'-side-spine-door-'+i,'cut',null,
     [split,y,side.doors[i][1]],[1,3,2]);
  }
  if(three){
   box(tag+'-secondary-divider','add',wall,three.wallAt(y),three.wallSize);
   box(tag+'-secondary-door','cut',null,three.doorAt(y),three.doorSize);
   if(level.thirdRoomLink==='first-and-second')
    box(tag+'-third-direct-door','cut',null,
     three.thirdDirectAt(y),three.thirdDirectSize);
  }
  if(l===0&&facadeLanguage!=='recessed-portico')
   box('exterior-entrance','cut',null,
    [groundEntryX(axis,split,w,entrancePlacement,original.entryZone),y,z0],[2,3,1]);
  // A setback makes a real second-floor terrace. It must not be separated
  // from the interior by an uninterrupted exterior wall. Cut a 2-wide door
  // at upper-floor standing height without changing the 1st-floor envelope.
  if(l===1&&setbackSide==='east')
   box('upper-terrace-access','cut',null,
    [x1,y,Math.floor((z0+z1)/2)-1],[1,3,2]);
  else if(l===1&&setbackSide==='rear')
   box('upper-terrace-access','cut',null,
    [Math.floor((x0+x1)/2)-1,y,z1],[2,3,1]);
  else if(l===1&&setbackSide==='front')
   {
    let doorX=Math.floor((x0+x1)/2)-1;
    // On an x-split the old centered threshold could land directly on the
    // room divider, leaving only an isolated terrace standing cell. With
    // the explicit stair-clear HOST policy, align it to one authored room:
    // prefer a public/shared room, otherwise use the first room. No room or
    // fixture is moved, and the legacy geometry remains unchanged.
    if(upperDoorPlacement==='stair-clear'&&axis==='x'){
     const accessSpace=level.spaces.find(s=>
      ['public','shared'].includes(s.access))??first;
     const zone=roomZones.find(z=>z.id===accessSpace.id);
     check(Boolean(zone),'FRONT_TERRACE_DOOR_ZONE');
     const [left,right]=zone.range.x;
     check(right-left+1>=2,'FRONT_TERRACE_DOOR_TWO_WIDE_CLEARANCE');
     doorX=Math.max(left,Math.min(right-1,doorX));
    }
    box('upper-terrace-access','cut',null,
     [doorX,y,z0],[2,3,1]);
   }
  const windows=[
   ['front',[x0+2,y+1,z0],[2,2,1]],
   ['rear',[x1-3,y+1,z1],[2,2,1]],
   ['west',[x0,y+1,z1-3],[1,2,2]],
   ['east',[x1,y+1,z1-3],[1,2,2]]
  ];
  for(const [name,at,size] of windows){
   // HOST windows must not fill an AI-selected first-zone entry opening.
   const entryX=groundEntryX(axis,split,w,entrancePlacement,original.entryZone);
   if(l===0&&original.entryZone==='first'&&name==='front'&&
    entryX<=at[0]+size[0]-1&&entryX+1>=at[0])continue;
   box(tag+'-window-'+name+'-cut','cut',null,at,size);
   box(tag+'-window-'+name+'-glass','add','glass',at,size);
  }
  // An explicitly author-selected, genuinely recessed public entrance.
  // Its three-deep covered forecourt replaces real walls, not facade paint.
  // Historical plain/fins/screen plans remain exactly source-identical.
  if(l===0&&facadeLanguage==='recessed-portico'){
   const originalEntryX=groundEntryX(axis,split,w,entrancePlacement,
    original.entryZone);
   let entryX=originalEntryX;
   let left=entryX-6,right=entryX+2;
   const backZ=z0+3;
   // Keep every previously successful authored portico byte-for-byte.
   // Only a portico that would otherwise fail can shift ALONG the exterior
   // wall, retaining its original 9-wide shape and the SAME entrance zone.
   // x partitions allow the return wall on (not across) the divider.
   const fits=()=>left>=x0+2&&right<=x1-2&&backZ<z1-3&&
    (axis!=='x'||split<=left||split>=right);
   if(!fits()&&entrancePlacement==='source-accessible'){
    const firstSide=original.entryZone==='first'||
     (original.entryZone!=='second'&&originalEntryX<split);
    const minLeft=axis==='x'&&!firstSide?Math.max(x0+2,split):x0+2;
    const maxRight=axis==='x'&&firstSide?Math.min(x1-2,split):x1-2;
    // For a z partition there is no x-divider across the front wall.
    const minimum=minLeft+6,maximum=maxRight-2;
    if(minimum<=maximum){
     entryX=Math.max(minimum,Math.min(maximum,originalEntryX));
     left=entryX-6;right=entryX+2;
    }
   }
   check(fits(),'EXPRESSION_PORTICO_PROGRAM_CONFLICT');
   box('portico-open-forecourt','cut',null,
    [left,y,z0],[right-left+1,4,3]);
   box('portico-west-return','add',wall,[left,y,z0],[1,4,4]);
   box('portico-east-return','add',wall,[right,y,z0],[1,4,4]);
   // A two-level FRONT-setback portico can leave the fixed 2-wide stair
   // start (x=3..4,z=3) behind its west return at x=5. The old return
   // creates a source-only island: the top landing tests PASS, but no
   // connected pad reaches the first stair tread from the public entry.
   // Add a real 2-wide side threshold to that authored portico, never
   // rewrite room order, move stairs, or modify historical non-front plans.
   // The lintel remains overhead; each opening is true B143 air.
   if(count===2&&setbackSide==='front'&&left===5)
    box('portico-stair-vestibule-cut','cut',null,
     [left,y,z0+1],[1,3,2]);
   box('portico-rear-wall','add',wall,
    [left+1,y,backZ],[right-left-1,4,1]);
   // The daylight panel and the door are BOTH openings in the new rear wall.
   box('portico-display-cut','cut',null,[left+1,y,backZ],[4,3,1]);
   box('portico-display-glass','add','glass',
    [left+1,y,backZ],[4,3,1]);
   box('exterior-entrance','cut',null,[entryX,y,backZ],[2,3,1]);
   // Actual wall-to-wall lintel at the open forecourt, not floating posts.
   box('portico-front-spandrel','add','accent',
    [left,y+3,z0],[right-left+1,1,1]);
  }
  // Purely architectural articulation outside the envelope. Dynamic plan
  // controls the rhythm and materials; no fixed building-type switch.
  if(facadeLanguage==='fins'&&!(hostDetail==='spatial-v1'&&
    original.levels.some(level=>level.spaces.some(space=>space.daylight)))){
   // Keep real two-wide entry and terrace thresholds physically clear:
   // exterior fins must not obscure either author-selected front opening.
   // Outside the doorway clearance, retain the original authored rhythm.
   const frontDoors=hostDetail==='clear-front-fins'?
    elements.filter(e=>e.mode==='cut'&&
    (e.id==='exterior-entrance'||e.id==='upper-terrace-access')&&
    e.origin[1]===y&&e.origin[2]===z0):[];
   for(let x=x0+1;x<x1-1;x+=4){
    const shieldsDoor=frontDoors.some(e=>
     x>=e.origin[0]-1&&x<e.origin[0]+e.size[0]+1);
    if(!shieldsDoor)
     box(tag+'-fin-'+x,'add','accent',[x,y+1,z0-1],[1,3,1]);
   }
  }else if(facadeLanguage==='screen'){
   for(let z=z0+1;z<z1-1;z+=4)
    box(tag+'-screen-'+z,'add','metal',[x0-1,y+1,z],[1,3,1]);
  }
  // Author-chosen street-facing terrace on the existing upper slab.
  // Three 1-cell parapet segments frame the outer edge and the true door
  // remains open. Old east/rear and all earlier designs are unchanged.
  // Genuine deep upper retreat, only when the MODEL authored depth 6/8.
  // Three real one-high outer parapets; never interfere with inner doorway.
  // Shallow historical works are byte-identical, and railings are NOT
  // Minecraft player-safety certification.
  if(l===1&&setbackDepth>=6&&setbackSide==='east'){
   box('deep-east-parapet-outer','add',wall,
    [w-2,y,1],[1,1,d-2]);
   box('deep-east-parapet-front','add',wall,
    [x1+1,y,1],[w-x1-3,1,1]);
   box('deep-east-parapet-rear','add',wall,
    [x1+1,y,d-2],[w-x1-3,1,1]);
  }else if(l===1&&setbackDepth>=6&&setbackSide==='rear'){
   box('deep-rear-parapet-outer','add',wall,
    [1,y,d-2],[w-2,1,1]);
   box('deep-rear-parapet-west','add',wall,
    [1,y,z1+1],[1,1,d-z1-3]);
   box('deep-rear-parapet-east','add',wall,
    [w-2,y,z1+1],[1,1,d-z1-3]);
  }
  if(l===1&&setbackSide==='front'){
   box('front-terrace-parapet-street','add',wall,
    [x0,y,z0-setbackDepth],[x1-x0+1,1,1]);
   box('front-terrace-parapet-west','add',wall,
    [x0,y,z0-setbackDepth+1],[1,1,setbackDepth-1]);
   box('front-terrace-parapet-east','add',wall,
    [x1,y,z0-setbackDepth+1],[1,1,setbackDepth-1]);
  }
  program.push({level:l,splitAxis:axis,requestedPercent:level.splitPercent,
   splitCoordinate:split,standingFloorY:y,
   // The space ranges below are bounding boxes; the real occupied region
   // excludes this model-authored open-air corner. SOURCE audits use voxels.
   ...(rearCornerCut?{openAirRecess:{
    x:[rearCornerCut.side==='west'?1:w-1-rearCornerCut.width,
     rearCornerCut.side==='west'?rearCornerCut.width:w-2],
    z:[d-1-rearCornerCut.depth,d-2]
   }}:{}),
   ...(three?{secondarySplitAxis:three.axis,secondarySplitCoordinate:three.coordinate}:{}),
   zones:roomZones,
   partitionDoorModelled:true,doorAccessibleInMinecraft:'NOT_TESTED'});
 }
 if(count===2){
  elements.push({id:'interfloor-stair',shape:'staircase',mode:'add',
   material:floor,origin:[3,1,3],axis:'z',direction:1,
   width:2,steps:5,treadDepth:1});
 }
 const upper=envelope(count-1),top=1+5*count;
 const raisedRoof=original.expression.roofVolume==='raised';
 if(!raisedRoof)box('roof-base','add',roof,[upper.x0,top,upper.z0],
  [upper.x1-upper.x0+1,1,upper.z1-upper.z0+1]);
 if(roofProfile==='split-monitor'){
  // Host implementation of an explicit author-selected building mass.
  // An x partition retains its historical roof alignment. For a z
  // partition the roof still spans x: center its step within the envelope
  // instead of reinterpreting an authored z coordinate as an x coordinate.
  // Room axes, proportions and the author's roof family remain unchanged.
  const highX=program[count-1].splitAxis==='x'?
   program[count-1].splitCoordinate+1:
   Math.floor((upper.x0+upper.x1)/2)+1;
  check(highX>=upper.x0+5&&highX<=upper.x1-6,
   'EXPRESSION_MONITOR_VOLUME_BOUNDS');
  const spanZ=upper.z1-upper.z0+1;
  // HOST window dimensions adapt to the real roof span. Retain the
  // historical 10-cell light when it fits, leaving four near-end cells
  // and at least two far-end cells; never resize an author-owned dimension.
  const clerestoryLength=Math.min(10,spanZ-6);
  check(clerestoryLength>=2,'EXPRESSION_MONITOR_CLERESTORY_SPAN');
  box('roof-monitor-low','add',roof,
   [upper.x0,top,upper.z0],[highX-upper.x0,1,spanZ]);
  box('roof-monitor-high','add',roof,
   [highX,top+4,upper.z0],[upper.x1-highX+1,1,spanZ]);
  // Enclose all raised faces, including the shared high-low monitor wall.
  for(const [name,origin,size] of [
   ['step',[highX,top,upper.z0],[1,4,spanZ]],
   ['east',[upper.x1,top,upper.z0],[1,4,spanZ]],
   ['north',[highX,top,upper.z0],[upper.x1-highX+1,4,1]],
   ['south',[highX,top,upper.z1],[upper.x1-highX+1,4,1]]
  ])box('roof-monitor-riser-'+name,'add',wall,origin,size);
  // Real upper-face daylight, with outward air above the lower roof.
  box('roof-monitor-westerly-light-cut','cut',null,
   [highX,top+1,upper.z0+4],[1,2,clerestoryLength]);
  box('roof-monitor-westerly-light','add','glass',
   [highX,top+1,upper.z0+4],[1,2,clerestoryLength]);
  const frontSpan=Math.min(4,upper.x1-highX-2);
  check(frontSpan>=2,'EXPRESSION_MONITOR_FRONT_SPAN');
  box('roof-monitor-front-light-cut','cut',null,
   [highX+2,top+1,upper.z0],[frontSpan,2,1]);
  box('roof-monitor-front-light','add','glass',
   [highX+2,top+1,upper.z0],[frontSpan,2,1]);
  // Align a real ground-level glazed opening with the existing monitor high light.
  // Retain solid sill and lintel; historical and non-opt-in forms stay frozen.
  box('roof-monitor-ground-light-cut','cut',null,
   [highX+2,3,upper.z0],[frontSpan,2,1]);
  box('roof-monitor-ground-light','add','glass',
   [highX+2,3,upper.z0],[frontSpan,2,1]);
  if(original.expression.daylightFacade==='east-and-rear-bays'){
   // Physically opened daylight to occupied zones, not facade paint.
   // Paired upper/lower east glazing preserves solid end and middle piers.
   const nearZ=upper.z0+4,farZ=Math.floor((upper.z0+upper.z1)/2)+2;
   check(nearZ+5<farZ&&farZ+4<=upper.z1-2,
    'EXPRESSION_DAYLIGHT_EAST_SPAN');
   for(const [bay,z] of [['near',nearZ],['far',farZ]])
    for(const [band,y] of [['low',3],['high',top+1]]){
     box('daylight-east-'+bay+'-'+band+'-cut','cut',null,
      [upper.x1,y,z],[1,2,4]);
     box('daylight-east-'+bay+'-'+band+'-glass','add','glass',
      [upper.x1,y,z],[1,2,4]);
    }
   // The west-cut return wall and the authored x-divider are retained:
   // the west corner has a narrower second rear low bay.
   const westCut=rearCornerCut?.side==='west';
   const lowA=upper.x0+(westCut?5:2);
   const lowB=lowA+4,lowWidth=westCut?2:3,upperA=highX+1;
   check(lowB+lowWidth-1<=highX-2&&upperA+4<=upper.x1-2,
    'EXPRESSION_DAYLIGHT_REAR_SPAN');
   for(const [name,x,w,ys] of [
    ['low-a',lowA,3,[3]],['low-b',lowB,lowWidth,[3]],
    ['upper',upperA,4,[3,top+1]]
   ])for(const y of ys){
    box('daylight-rear-'+name+'-'+y+'-cut','cut',null,
     [x,y,upper.z1],[w,2,1]);
    box('daylight-rear-'+name+'-'+y+'-glass','add','glass',
     [x,y,upper.z1],[w,2,1]);
   }
  }
  if(original.expression.roofOverhang==='one-block'){
   // These one-cell roof-edge source solids shape the real silhouette
   // and shade the public entrance and monitor clerestory. They are not
   // painted fake geometry. Original low/high roofs remain intact.
   const x0=upper.x0,x1=upper.x1,z0=upper.z0,z1=upper.z1;
   for(const [id,at,size] of [
    ['low-west',[x0-1,top,z0],[1,1,spanZ]],
    ['low-front',[x0-1,top,z0-1],[highX-x0+1,1,1]],
    ['low-rear',[x0-1,top,z1+1],[highX-x0+1,1,1]],
    ['high-east',[x1+1,top+4,z0-1],[1,1,spanZ+2]],
    ['high-front',[highX-1,top+4,z0-1],[x1-highX+3,1,1]],
    ['high-rear',[highX-1,top+4,z1+1],[x1-highX+3,1,1]],
    ['high-clerestory',[highX-1,top+4,z0],[1,1,spanZ]]
   ])box('roof-one-cell-eave-'+id,'add',roof,at,size);
  }
 }else if(roofProfile==='hip'){
  addR125HipRoof(box,{upper,top,roof,wall,roofAxis,
   overhang:original.expression.roofOverhang==='one-block'});
 }else if(roofProfile!=='flat'){
  // Explicit HOST-only geometry candidate; default preserves past output.
  const sawtoothHeight=pos=>roofMassing==='compact-sawtooth'?
   Math.floor((pos%6)/2):(pos%6===0?0:Math.ceil((pos%6)/2));
  const span=roofAxis==='x'?upper.x1-upper.x0+1:upper.z1-upper.z0+1;
  const ridgeHeight=pos=>Math.min(
   (original.expression.ridgeProfile==='steep'||roofMassing==='steep-ridge-review')?6:3,
   Math.floor(Math.min(pos,span-1-pos)/2));
  for(let pos=0;pos<span;pos++){
   const height=roofProfile==='ridge'?ridgeHeight(pos):
    sawtoothHeight(pos);
   if(raisedRoof){
    // TRUE raised volume: continuous pitched roof is the interior ceiling,
    // with actual air underneath instead of a solid flat base at top.
    const origin=roofAxis==='x'?
     [upper.x0+pos,top+height,upper.z0]:
     [upper.x0,top+height,upper.z0+pos];
    const size=roofAxis==='x'?
     [1,1,upper.z1-upper.z0+1]:
     [upper.x1-upper.x0+1,1,1];
    // ART study: replace one solid roof strip per six with real skylight
    // glass, retaining the AUTHOR's geometry, pitch and occupied envelope.
    // Never enabled implicitly; explicit local replay is required.
    const skinMaterial=roofGlazing==='sawtooth-ribbon'&&
     roofProfile==='sawtooth'&&pos%6===4?'glass':roof;
    box('roof-raised-skin-'+pos,'add',skinMaterial,origin,size);
    if(height>0){
     // A source-enclosed eave on BOTH long sides of this strip.
     const a=roofAxis==='x'?
      [upper.x0+pos,top,upper.z0]:[upper.x0,top,upper.z0+pos];
     const b=roofAxis==='x'?
      [upper.x0+pos,top,upper.z1]:[upper.x1,top,upper.z0+pos];
     box('roof-raised-eave-a-'+pos,'add',wall,a,[1,height,1]);
     box('roof-raised-eave-b-'+pos,'add',wall,b,[1,height,1]);
    }
    // A deep sawtooth reset is its north-light clerestory: keep the real
    // raised roof profile and close the step with B143 glass, not a blind
    // wall. This gives the authored sawtooth a readable daylight face
    // without adding a roof cap or changing the model's chosen profile.
    // Ridge rises by <=1 and retains its frozen historical SOURCE.
    if(pos>0){
     const p=pos-1;
     const previous=roofProfile==='ridge'?ridgeHeight(p):
      sawtoothHeight(p);
     const rise=Math.abs(height-previous);
     if(rise>1){
      // Compact-only: place the vertical reset glass on the LOW strip,
      // outside the high ceiling's two-wide air pad. Preserve the exact
      // previous glazing coordinates for historical default roof output.
      const closurePos=height>previous?pos:
       roofMassing==='compact-sawtooth'?pos:p;
      const y=top+Math.min(height,previous)+1;
      const origin=roofAxis==='x'?
       [upper.x0+closurePos,y,upper.z0]:
       [upper.x0,y,upper.z0+closurePos];
      const size=roofAxis==='x'?
       [1,rise-1,upper.z1-upper.z0+1]:
       [upper.x1-upper.x0+1,rise-1,1];
      box('roof-raised-step-closure-'+pos,'add','glass',origin,size);
     }
    }
    // A nonzero final sawtooth strip has an otherwise open end gable.
    // This is on the outermost perimeter strip, not an occupied room slab.
    if(pos===span-1&&height>0){
     const end=roofAxis==='x'?
      [upper.x1,top,upper.z0]:[upper.x0,top,upper.z1];
     const size=roofAxis==='x'?
      [1,height,upper.z1-upper.z0+1]:
      [upper.x1-upper.x0+1,height,1];
     box('roof-raised-terminal-gable','add',wall,end,size);
    }
    continue;
   }
   // Non-opt-in expressive roofs preserve their exact historical geometry.
   if(height<1)continue;
   const origin=roofAxis==='x'?
    [upper.x0+pos,top+1,upper.z0]:[upper.x0,top+1,upper.z0+pos];
   const size=roofAxis==='x'?
    [1,height,upper.z1-upper.z0+1]:
    [upper.x1-upper.x0+1,height,1];
   box('roof-profile-'+pos,'add',roof,origin,size);
  }
  // AUTHOR opt-in only: continue each real roof profile one block beyond
  // the external walls. The overhang is in the same material and elevation
  // as the adjacent roof skin, and never fills usable interior air.
  // This is generic geometry for either roof axis, not a genre preset.
  if(raisedRoof&&original.expression.roofOverhang==='one-block'){
   const alongX=roofAxis==='x';
   const span=alongX?upper.x1-upper.x0+1:upper.z1-upper.z0+1;
   const eaveRise=pos=>roofProfile==='ridge'?ridgeHeight(pos):
    sawtoothHeight(pos);
   // Compress contiguous equally elevated eaves into B143 boxes.
   // Every occupied cell and material stays identical. Only the author-opt-in
   // eave representation changes, never the historical roof baseline.
   for(let pos=0;pos<span;){
    const atY=top+eaveRise(pos);
    let end=pos+1;
    while(end<span&&eaveRise(end)===eaveRise(pos))end++;
    const length=end-pos;
    if(alongX){
     const x=upper.x0+pos;
     box('roof-pitched-eave-front-'+pos,'add',roof,
      [x,atY,upper.z0-1],[length,1,1]);
     box('roof-pitched-eave-rear-'+pos,'add',roof,
      [x,atY,upper.z1+1],[length,1,1]);
    }else{
     const z=upper.z0+pos;
     box('roof-pitched-eave-west-'+pos,'add',roof,
      [upper.x0-1,atY,z],[1,1,length]);
     box('roof-pitched-eave-east-'+pos,'add',roof,
      [upper.x1+1,atY,z],[1,1,length]);
    }
    pos=end;
   }
   // Finish the two remaining eave edges and their four roof corners.
   if(alongX){
    box('roof-pitched-eave-low-end','add',roof,
     [upper.x0-1,top+eaveRise(0),upper.z0-1],
     [1,1,upper.z1-upper.z0+3]);
    box('roof-pitched-eave-high-end','add',roof,
     [upper.x1+1,top+eaveRise(span-1),upper.z0-1],
     [1,1,upper.z1-upper.z0+3]);
   }else{
    box('roof-pitched-eave-low-end','add',roof,
     [upper.x0-1,top+eaveRise(0),upper.z0-1],
     [upper.x1-upper.x0+3,1,1]);
    box('roof-pitched-eave-high-end','add',roof,
     [upper.x0-1,top+eaveRise(span-1),upper.z1+1],
     [upper.x1-upper.x0+3,1,1]);
   }
  }
 }
 // An opt-in model-selected full-height recess forms a true L-shaped floor,
 // matching roof, and re-entrant walls. Do not silently replace missing
 // floor voxels with a decorative notch on an otherwise rectangular shell.
 if(rearCornerCut){
  const westCut=rearCornerCut.side==='west';
  const xCut=westCut?1:w-1-rearCornerCut.width;
  const zCut=d-1-rearCornerCut.depth;
  box('rear-corner-void','cut',null,[xCut,1,zCut],
   [rearCornerCut.width,raisedRoof?top+5:top+1,rearCornerCut.depth]);
  for(let l=0;l<count;l++){
   const y=2+5*l,tag='l'+l;
   box(tag+(westCut?'-recess-west-wall':'-recess-east-wall'),'add',wall,
   [westCut?xCut+rearCornerCut.width:xCut-1,y,zCut],
   [1,4,rearCornerCut.depth]);
   box(tag+'-recess-rear-wall','add',wall,
    [xCut,y,zCut-1],[rearCornerCut.width,4,1]);
   // Restore daylight on both re-entrant faces after old rear/east
   // window voxels were removed with the former external corner.
   box(tag+(westCut?'-recess-west-window-cut':'-recess-east-window-cut'),'cut',null,
   [westCut?xCut+rearCornerCut.width:xCut-1,y+1,zCut+1],[1,2,2]);
  box(tag+(westCut?'-recess-west-window-glass':'-recess-east-window-glass'),'add','glass',
   [westCut?xCut+rearCornerCut.width:xCut-1,y+1,zCut+1],[1,2,2]);
   box(tag+'-recess-rear-window-cut','cut',null,
    [xCut+1,y+1,zCut-1],[2,2,1]);
   box(tag+'-recess-rear-window-glass','add','glass',
    [xCut+1,y+1,zCut-1],[2,2,1]);
  }
  if(raisedRoof){
   // The corner cut exposes two new perimeter faces beneath a raised
   // roof. Seal up to each authored ridge strip, not merely the old cap.
   // No additional floor, entry, or author-intent substitution is made.
   const roofExtra=(x,z)=>{
    const k=roofAxis==='x'?x-upper.x0:z-upper.z0;
    const span=roofAxis==='x'?upper.x1-upper.x0+1:upper.z1-upper.z0+1;
    return roofProfile==='split-monitor'?
     (x>=program[count-1].splitCoordinate+1?4:0):
     Math.min(3,Math.floor(Math.min(k,span-1-k)/2));
   };
   const edgeX=westCut?xCut+rearCornerCut.width:xCut-1;
   for(let z=zCut;z<zCut+rearCornerCut.depth;z++){
    const extra=roofExtra(edgeX,z);
    if(extra>0)box('recess-outer-roof-seal-x-'+z,'add',wall,
     [edgeX,top,z],[1,extra,1]);
   }
   const edgeZ=zCut-1;
   for(let x=xCut;x<xCut+rearCornerCut.width;x++){
    const extra=roofExtra(x,edgeZ);
    if(extra>0)box('recess-outer-roof-seal-z-'+x,'add',wall,
     [x,top,edgeZ],[1,extra,1]);
   }
  }
  if(rearCornerCut.access==='paved'){
   // Explicit AUTHOR opt-in: a paved usable outdoor court, NEVER silently
   // filled in a model-authored raw open-air L-corner.
   box('recess-paved-court-floor','add',floor,
    [xCut,1,zCut],[rearCornerCut.width,1,rearCornerCut.depth]);
   // A two-wide, three-high true opening replaces the re-entrant glass.
   box('recess-paved-court-access','cut',null,
    [xCut+1,2,zCut-1],[2,3,1]);
  }
 }
 // Independent author-selected U-shaped central/rear court. This is a
 // genuine open-sky VOLUME cut (walls, roof, floor), not facade ornament.
 // An exact B143 route witness below must reach its newly paved ground.
 if(rearCourt){
  const c=rearCourt;
  const spare=w-2-c.width,margin=c.alignment==='west'?5:
   c.alignment==='east'?spare-5:Math.floor(spare/2);
  const xCut=1+margin,zCut=d-1-c.depth;
  const innerZ=zCut-1,doorX=c.entrySide==='west'?xCut+1:
   xCut+c.width-3;
  const glassX=c.entrySide==='west'?xCut+c.width-3:xCut+1;
  box('u-court-open-sky','cut',null,[xCut,1,zCut],
   [c.width,raisedRoof?top+5:top+1,c.depth]);
  // New true re-entrant shell around all three sides of the U opening.
  box('u-court-return-west','add',wall,
   [xCut-1,2,zCut],[1,4,c.depth]);
  box('u-court-return-east','add',wall,
   [xCut+c.width,2,zCut],[1,4,c.depth]);
  box('u-court-interior-wall','add',wall,
   [xCut,2,innerZ],[c.width,4,1]);
  // Distinct author-chosen indoor access and a real air-backed window.
  box('u-court-door','cut',null,[doorX,2,innerZ],[2,3,1]);
  box('u-court-window-cut','cut',null,[glassX,3,innerZ],[2,2,1]);
  box('u-court-window-glass','add','glass',
   [glassX,3,innerZ],[2,2,1]);
  box('u-court-paving','add',floor,[xCut,1,zCut],
   [c.width,1,c.depth]);
  if(raisedRoof){
   // Remove the full original roof skin OVER the new open sky and close the
   // three re-entrant faces up to the author-selected true ridge elevation.
   // This is common roof geometry, independent of building genre.
   const u=envelope(0),extra=(x,z)=>{
    const pos=roofAxis==='x'?x-u.x0:z-u.z0;
    const span=roofAxis==='x'?u.x1-u.x0+1:u.z1-u.z0+1;
    return Math.min(3,Math.floor(Math.min(pos,span-1-pos)/2));
   };
   const seal=(id,x,z)=>{
    const n=extra(x,z);
    if(n>0)box(id,'add',wall,[x,top,z],[1,n,1]);
   };
   for(let z=zCut;z<zCut+c.depth;z++){
    seal('u-court-west-gable-'+z,xCut-1,z);
    seal('u-court-east-gable-'+z,xCut+c.width,z);
   }
   for(let x=xCut;x<xCut+c.width;x++)
    seal('u-court-inner-gable-'+x,x,innerZ);
  }
 }
 // Optional author-selected front court changes the primary building footprint.
 // It is not facade paint, a genre template or a historical-plan rewrite.
 if(frontCornerCut){
  const west=frontCornerCut.side==='west';
  const xCut=west?1:w-1-frontCornerCut.width;
  const width=frontCornerCut.width,depth=frontCornerCut.depth;
  const innerX=west?xCut+width:xCut-1,innerZ=1+depth;
  const doorX=xCut+Math.max(1,Math.floor((width-2)/2));
  const entry=elements.find(e=>e.id==='exterior-entrance');
  check(Boolean(entry)&&
   (entry.origin[0]+1<xCut||entry.origin[0]>=xCut+width),
   'EXPRESSION_FRONT_COURT_ENTRY_CONFLICT');
  box('front-court-sky-void','cut',null,[xCut,1,1],
   [width,top+1,depth]);
  box('front-court-side-wall','add',wall,[innerX,2,1],[1,4,depth]);
  box('front-court-inner-wall','add',wall,[xCut,2,innerZ],[width,4,1]);
  box('front-court-paving','add',floor,[xCut,1,1],[width,1,depth]);
  box('front-court-interior-door','cut',null,
   [doorX,2,innerZ],[2,3,1]);
  if(depth>=4){
   box('front-court-return-window-cut','cut',null,[innerX,3,2],[1,2,2]);
   box('front-court-return-window-glass','add','glass',[innerX,3,2],[1,2,2]);
  }
 }
 const spatialDetail=hostDetail==='spatial-v1'?
  detailR125Envelope(elements,original,program):null;
 // Leave old successful B143 SOURCE byte-for-byte unchanged. Only a new
 // author response whose requested equipment/daylight would exceed B143's
 // fixed 160-element budget gets a lossless roof-strip representation.
 // A fixed source that still exceeds the budget is a genuine HOLD.
 if(raisedRoof&&elements.length+estimateR125AuthoredElementReserve(original)>160){
  const packed=packR125RaisedRoofStrips(elements,roofAxis);
  elements.splice(0,elements.length,...packed);
 }
 // The upper floor is an occupied terrace plate beyond the upper envelope;
 // it is NOT proof of railings, weather safety, or accessible outdoor space.
 const design={schema:B143,id:original.id,title:original.title,
  brief:original.brief,bounds:{width:w,height:5*count+8,depth:d},
  elements,designOnly:true};
 const compiled=compileDesign(design);
 check(verifyCompiled(design,compiled),'EXPRESSION_COMPILER_NONDETERMINISTIC');
 const result={schema:'minecraftaibuilder-r125-plan-to-b143-result-v1',
  planSha256:hash(original),plan:original,design,compiled,program,
  sourceSha256:compiled.sourceSha256,geometrySha256:compiled.geometrySha256,
  modelAuthorship:'CALLER_PROVIDED_PLAN_UNVERIFIED',
  geometricRules:'GENERIC_EXPRESSIVE_ENVELOPE_NOT_STYLE_CERTIFIED',
  expression:structuredClone(original.expression),
  ...(spatialDetail?{spatialDetail,fixturePlacement:
   ['activity-layout','activity-layout-inlays'].includes(fixtureArt)?
    'activity-layout':'wall-aligned'}:{}),
  inGameWalking:'NOT_TESTED',architecturalQuality:'NOT_REVIEWED',
  constructionApproved:false,worldContacts:0,worldWrites:0,
  gates:Array(9).fill('BLOCKED')};
 if(rearCornerCut?.access==='paved'||frontCornerCut?.access==='paved'||
    rearCourt?.access==='paved'){
  const c=rearCourt??frontCornerCut??rearCornerCut;
  const x0=rearCourt?1+(c.alignment==='west'?5:
   c.alignment==='east'?w-2-c.width-5:
   Math.floor((w-2-c.width)/2)):
   c.side==='west'?1:w-1-c.width;
  const z0=frontCornerCut?1:d-1-c.depth;
  // Physical roofless paving must be exact; do not trust verbal intent.
  const cells=new Map(compiled.primitives.map(v=>
   [v[0]+','+v[1]+','+v[2],v[3]]));
  for(let x=x0;x<x0+c.width;x++)
   for(let z=z0;z<z0+c.depth;z++){
    check(cells.get(x+',1,'+z)!==undefined,
     'EXPRESSION_COURT_FLOOR_MISSING');
    for(let y=2;y<design.bounds.height;y++)
     check(!cells.has(x+','+y+','+z),
      'EXPRESSION_COURT_NOT_SKY_OPEN');
   }
  // Probe an OUTDOOR zone using the established real two-wide route graph,
  // independently of the two existing indoor program zone witnesses.
  const probe='__r125_court_source_probe__';
  const court={id:probe,purpose:'authored outdoor courtyard',
   range:{x:[x0,x0+c.width-1],
    z:[z0,z0+c.depth-1]}};
  const withCourt={...result,program:result.program.map((level,i)=>
   i===0?{...level,zones:[...level.zones,court]}:level)};
  const audit=auditR125SourceRoutes(withCourt);
  const witness=audit.zones.find(v=>v.id===probe);
  check(audit.status==='SOURCE_ROUTES_REACH_ALL_ZONES'&&
   witness?.reachedFromEntrance===true&&
   witness.reachedTwoWidePadCount>=2,
   'EXPRESSION_COURTYARD_SOURCE_ACCESS_HOLD');
  result.courtyardSourceOnly={
   status:'SOURCE_2_WIDE_PAVED_COURT_REACHABLE',
   ...(frontCornerCut?{face:'front'}:{}),
   ...(rearCourt?{face:'rear',massing:'U',alignment:c.alignment,
    entrySide:c.entrySide}:{}),
   sourceWitness:witness.sourceWitness,
   sourceGraphMoves:witness.sourceGraphMoves,
   reachedTwoWidePadCount:witness.reachedTwoWidePadCount,
   actualMinecraftWalking:'NOT_TESTED',
   architecturalArt:'NOT_REVIEWED',
   worldWrites:0};
 }
 const daylit=addAuthoredRoomDaylight(result,
  {auditCirculation:auditArchitecturePlanCirculation});
 const furnished=addAuthoredRoomFixtures(daylit,
  {auditCirculation:auditArchitecturePlanCirculation});
 const styled=fixtureForm==='readable-v1'?
  restyleR125FixtureForms(furnished,{auditCirculation:auditArchitecturePlanCirculation}):furnished;
 const scaled=fixtureForm==='room-scale-v1'||fixtureForm==='room-scale-v2'||original.levels.some(l=>
  l.spaces.some(s=>s.fixtureScale==='expanded'))?
  expandR125RoomScale(styled,{auditCirculation:auditArchitecturePlanCirculation,
   includeHostStudy:fixtureForm==='room-scale-v1'||fixtureForm==='room-scale-v2',
   profile:fixtureForm==='room-scale-v2'?'room-scale-v2':'room-scale-v1'}):styled;
 const articulated=hostDetail==='spatial-v1'&&original.expression.facadeLanguage==='fins'?
  addR125SpatialDaylightBays(scaled):scaled;
 const finished=['activity-inlays','activity-layout-inlays'].includes(fixtureArt)?
  addR125ActivityFloorInlays(articulated):articulated;
 // Authored relation only: the HOST must prove a glass boundary, a real
 // visitor-side two-wide pad and an unobstructed ray to a real workstation.
 return original.observationLink?
  addR125AuthoredObservation(finished,original):finished;
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
 // The B198C floor scanner sees roof strips too. Distinguish a surface
 // supported only ABOVE all non-roof structural elements from a real
 // program-floor problem, using verified FINAL B143 voxels (not labels).
 const nonRoofTop=Math.max(-1,...product.design.elements
  .filter(e=>e.mode==='add'&&!e.id.startsWith('roof-'))
  .map(e=>e.shape==='box'?
   e.origin[1]+e.size[1]-1:e.shape==='staircase'?
    e.origin[1]+e.steps-1:Infinity));
 const sourceSupportYs=new Set(product.compiled.primitives.map(p=>p[1]));
 const roofElementsPresent=product.design.elements.some(e=>
  e.mode==='add'&&e.id.startsWith('roof-'));
 const reports=critique.objectiveAudit.elevationConnectivity;
 const componentEvidence=critique.objectiveAudit.elevationComponentBounds??[];
 const programFloorEvidence=[];
 for(const y of [...levels].sort((a,b)=>a-b)){
  const row=reports.find(x=>x.standingY===y);
  const components=componentEvidence.find(x=>x.standingY===y)?.components??[];
  const doorwayCuts=product.design.elements
   .filter(e=>e.mode==='cut'&&e.shape==='box'&&
    /(?:door|entrance|threshold)/i.test(e.id)&&
    e.origin[1]<=y&&y<e.origin[1]+e.size[1])
   .map(e=>({id:e.id,origin:e.origin,size:e.size}));
  const zones=product.program.filter(l=>l.standingFloorY===y)
   .flatMap(l=>l.zones.map(z=>({id:z.id,range:z.range})));
  programFloorEvidence.push({standingY:y,
   totalStandingSquares:row?.totalStandingSquares??0,
   componentCount:row?.componentCount??0,
   components,doorwayCuts,zones,
   classification:'EXACT_B143_TWO_BY_TWO_SOURCE_PADS_NOT_MINECRAFT_PATH'});
  if(!row||row.componentCount!==1||row.totalStandingSquares<10)
   programFloorIssues.push({code:'PROGRAM_FLOOR_DISCONNECTED_OR_MISSING',
    standingY:y,componentCount:row?.componentCount??0,
    componentBounds:components});
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
  for(const x of exterior){
   const supportY=x.standingY-1;
   const roofOnly=roofElementsPresent&&Number.isFinite(nonRoofTop)&&
    supportY>nonRoofTop&&sourceSupportYs.has(supportY);
   exteriorSurfaceAdvisories.push({
    code:'NONPROGRAM_SURFACE_FRAGMENTATION',
    standingY:x.standingY,componentCount:x.componentCount,
    classification:roofOnly?'ROOF_ONLY_NONPROGRAM_SURFACE':
     'UNRESOLVED_NONPROGRAM_SURFACE',
    roofOnlySourceEvidence:roofOnly,
    thisDoesNotProveTraversableRoof:true});
  }
 }
 return {schema:'r125-program-floor-risk-v1',
  sourceSha256:product.sourceSha256,geometrySha256:product.geometrySha256,
  status:programFloorIssues.length?'HOLD_PROGRAM_FLOORS':
   exteriorSurfaceAdvisories.length?'PROGRAM_FLOORS_CLEAR_EXTERIOR_REVIEW_REQUIRED':
    'PROGRAM_FLOORS_CLEAR',
  programFloorIssues,programFloorEvidence,exteriorSurfaceAdvisories,
  genericB198CHighRiskCount:critique.highRiskCount,
  surfaceIsNotPlayerPath:true,worldWrites:0,worldWalking:'NOT_TESTED'};
}
