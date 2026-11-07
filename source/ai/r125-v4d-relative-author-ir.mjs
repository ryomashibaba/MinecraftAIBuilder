/**
 * V4D opt-in: compact MODEL/AUTHOR relative spatial intent -> frozen graph
 * and enclosure IR. AUTHOR chooses topology, functions, envelope, glazing,
 * service elements and exact relative relationships; HOST only anchors the
 * first node in LOCAL coordinates, and computes child coordinates without
 * silent repairs. No model access or Minecraft world actions here.
 */
import {createHash} from 'node:crypto';
import {SCHEMA as GRAPH,validateAuthoredGraph}
 from './r125-v4d-authored-topology.mjs';
import {ENVELOPE_SCHEMA,validateEnvelopeIntegrity,compileEnvelopeIntegrity}
 from './r125-v4d-envelope-integration.mjs';

export const RELATIVE_SCHEMA='minecraftaibuilder-r125-v4d-relative-author-intent-v1';
const fail=code=>{throw Error('R125_V4D_RELATIVE_'+code);};
const exact=(obj,names)=>!!obj&&typeof obj==='object'&&!Array.isArray(obj)&&
 Object.keys(obj).sort().join('|')===names.slice().sort().join('|');
const int=(n,lo,hi)=>Number.isSafeInteger(n)&&n>=lo&&n<=hi;
const slug=s=>typeof s==='string'&&/^[a-z][a-z0-9-]{2,34}$/.test(s);
const prose=s=>typeof s==='string'&&s.length>=3&&s.length<=150&&!/[\u0000-\u001f<>]/.test(s);
const sha=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const endX=n=>n.x+n.width-1,endZ=n=>n.z+n.depth-1;
function relativePosition(parent,spec,attach){
 const {side,shift}=attach;
 if(side==='east')return {x:endX(parent),
  z:parent.z+Math.floor((parent.depth-spec.depth)/2)+shift};
 if(side==='west')return {x:parent.x-spec.width+1,
  z:parent.z+Math.floor((parent.depth-spec.depth)/2)+shift};
 if(side==='south')return {x:parent.x+Math.floor((parent.width-spec.width)/2)+shift,
  z:endZ(parent)};
 if(side==='north')return {x:parent.x+Math.floor((parent.width-spec.width)/2)+shift,
  z:parent.z-spec.depth+1};
 fail('ATTACH_SIDE');
}
export function translateRelativeAuthorIntent(value){
 // The original user/model JSON must NOT be mutated, "repaired" or filled
 // with genre-specific architectural decisions.
 const src=structuredClone(value);
 if(!exact(src,['schema','id','title','brief','materials','spaces','entry','extraLinks'])||
  src.schema!==RELATIVE_SCHEMA||!slug(src.id)||
  !prose(src.title)||!prose(src.brief)||
  !exact(src.materials,['floor','wall','roof','public'])||
  !Array.isArray(src.spaces)||src.spaces.length<3||src.spaces.length>5||
  !Array.isArray(src.extraLinks)||src.extraLinks.length>2)
  fail('ROOT');
 if(!exact(src.entry,['offset','plazaWidth','plazaDepth','canopyDepth'])||
  !int(src.entry.offset,4,12)||!int(src.entry.plazaWidth,12,18)||
  !int(src.entry.plazaDepth,8,13)||!int(src.entry.canopyDepth,3,6))
  fail('ENTRY');
 const placed=[],seen=new Map(),links=[],gables=[],shelters=[],windows=[],fixtures=[];
 for(const [index,s] of src.spaces.entries()){
  const expected=['id','purpose','kind','width','depth','roof','facade',
   'shelter','windows','fixture',...(index?['attach']:[])];
  if(!exact(s,expected)||!slug(s.id)||seen.has(s.id)||!prose(s.purpose)||
   !['covered','sky'].includes(s.kind)||
   !int(s.width,18,30)||!int(s.depth,18,30)||
   !exact(s.fixture,['id','purpose','offsetX','offsetZ','width','depth','height','material'])||
   !slug(s.fixture.id)||!prose(s.fixture.purpose)||
   !int(s.fixture.offsetX,3,18)||!int(s.fixture.offsetZ,3,18)||
   !int(s.fixture.width,2,5)||!int(s.fixture.depth,2,5)||
   !int(s.fixture.height,1,3)||
   !['stone','wood','concrete','metal','accent'].includes(s.fixture.material)||
   !Array.isArray(s.windows)||s.windows.length>2)
   fail('SPACE_'+index);
  if(s.kind==='covered'){
   if(!exact(s.roof,['axis','type','eaveY','peakY','peakPercent'])||
    !['x','z'].includes(s.roof.axis)||
    !['shed','ridge'].includes(s.roof.type)||
    !int(s.roof.eaveY,10,15)||!int(s.roof.peakY,s.roof.eaveY+3,23)||
    !int(s.roof.peakPercent,35,65)||
    !['glass','wall'].includes(s.facade)||s.shelter!==null)
    fail('COVERED_INTENT_'+s.id);
   gables.push({nodeId:s.id,upperFacade:s.facade});
  }else{
   if(s.roof!==null||s.facade!==null||s.windows.length!==0||
    !exact(s.shelter,['edge','depth','roofY','material'])||
    !['east','west','north','south'].includes(s.shelter.edge)||
    !int(s.shelter.depth,3,5)||!int(s.shelter.roofY,7,10)||
    !['metal','wood','stone','concrete','accent'].includes(s.shelter.material))
    fail('SKY_INTENT_'+s.id);
   shelters.push({nodeId:s.id,...s.shelter});
  }
  let pos;
  if(index===0){
   if(s.kind!=='covered')fail('ROOT_MUST_BE_COVERED');
   pos={x:48,z:42};
  }else{
   const a=s.attach;
   if(!exact(a,['to','side','shift','doorOffset'])||
    !seen.has(a.to)||!['east','west','north','south'].includes(a.side)||
    !int(a.shift,-4,4)||!int(a.doorOffset,2,14))fail('ATTACH_'+s.id);
   const parent=seen.get(a.to);
   pos=relativePosition(parent,s,a);
   links.push({from:a.to,to:s.id,side:a.side,offset:a.doorOffset});
  }
  const n={id:s.id,purpose:s.purpose,kind:s.kind,
   ...pos,width:s.width,depth:s.depth,roof:s.roof};
  // Local anchor is arbitrary and never a Minecraft world coordinate.
  if(n.x<6||n.z<15||endX(n)>119||endZ(n)>119)
   fail('LOCAL_SITE_TOO_LARGE_OR_COLLIDING');
  seen.set(s.id,n);placed.push(n);
  for(const [i,w] of s.windows.entries()){
   if(!exact(w,['side','offset','span','sillY','height'])||
    !['north','south','west','east'].includes(w.side)||
    !int(w.offset,2,24)||!int(w.span,5,10)||
    !int(w.sillY,4,6)||!int(w.height,2,4))
    fail('WINDOW_INTENT_'+s.id+'_'+i);
   windows.push({id:s.id+'-glazing-'+(i+1),nodeId:s.id,...w});
  }
  fixtures.push({id:s.fixture.id,nodeId:s.id,purpose:s.fixture.purpose,
   offsetX:s.fixture.offsetX,offsetZ:s.fixture.offsetZ,
   width:s.fixture.width,depth:s.fixture.depth,
   height:s.fixture.height,material:s.fixture.material});
 }
 for(const [i,e] of src.extraLinks.entries()){
  if(!exact(e,['from','to','side','offset'])||
   !seen.has(e.from)||!seen.has(e.to)||e.from===e.to||
   !['north','south','west','east'].includes(e.side)||
   !int(e.offset,2,14))
   fail('EXTRA_LINK_'+i);
  links.push(structuredClone(e));
 }
 if(links.length>7)fail('TOO_MANY_LINKS');
 const root=placed[0],entry={nodeId:root.id,...src.entry};
 const plan={schema:GRAPH,id:src.id,title:src.title,brief:src.brief,
  materials:src.materials,nodes:placed,links,entry,windows,fixtures};
 const envelope={schema:ENVELOPE_SCHEMA,portalWidth:4,
  gables,publicShelters:shelters};
 // Existing strict B143 geometry and entry / roads MUST be the arbiter.
 validateAuthoredGraph(plan);
 validateEnvelopeIntegrity(plan,envelope);
 return {intent:src,originalIntentSha256:sha(src),plan,envelope,
  hostLocalOrigin:{x:48,z:42},
  translation:'RELATIVE_EXPLICIT_AUTHOR_DIRECTION_NO_AUTOREPAIR',
  modelIdentity:'NOT_ATTESTED',minecraftWorldCoordinates:null};
}
export function compileRelativeAuthorIntent(value){
 const translated=translateRelativeAuthorIntent(value);
 const b143=compileEnvelopeIntegrity(translated.plan,translated.envelope);
 if(!b143.sourceRoutes?.zones?.every(z=>z.reachedFromEntrance)||
  b143.worldWrites!==0||b143.constructionApproved!==false)
  fail('B143_ROUTE_AND_WORLD_HOLD');
 return {
  ...translated,b143,
  provenance:'MODEL_OR_AUTHOR_IDENTITY_FROM_EXECUTION_CONTEXT_ONLY',
  architectureArt:'NOT_REVIEWED',minecraftWalking:'NOT_TESTED',
  worldWrites:0,worldContacts:0,constructionApproved:false,
  executionAllowed:false,readiness:'NOT_PREPARED',
  BuildPlan:{operations:[]},gates:Array(9).fill('BLOCKED')
 };
}
