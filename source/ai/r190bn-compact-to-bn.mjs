/** ArchitecturePlan -> BN/B143: physically bounded first two-level vertical slice.
 * No building-type template, provider, world contact, or author-choice repair.
 * Narrow truthful capability gate: one room/story, straight east stair,
 * rectilinear form, flat roof. Unsupported authored design remains HOLD.
 */
import {createHash} from 'node:crypto';
import {inspectCompactArchitecturePlan} from './r190bn-compact-architecture-plan.mjs';
import {R190BN_SCHEMA,compileR190BNAssembly} from './r190bn-spatial-assembly.mjs';

const H=v=>createHash('sha256').update(v).digest('hex');
const no=(reason,details={})=>({schema:'minecraftaibuilder-architecture-plan-to-bn-v1',
 status:'HOLD_UNSUPPORTED_OR_UNREALIZABLE_AUTHORED_PLAN',reason,...details,
 geometryCompiled:false,authorDesignRepaired:false,modelCalls:0,worldContacts:0,
 worldWrites:0,BuildPlan:{operations:[]},readiness:'NOT_PREPARED',
 gates:Array(9).fill('BLOCKED'),art:'ART_HOLD'});
const fail=s=>{throw Error('R190_ARCHCOMP_'+s)};
const box=(id,mode,origin,size,material)=>({kind:'primitive',element:{
 id,shape:'box',mode,origin,size,...(mode==='add'?{material}:{})}});
const skin=(id,spaceId,materials)=>({kind:'enclosure',id,spaceId,thickness:1,materials});
const occupiedLookup=r=>new Set(r.compiled.primitives.map(p=>p.slice(0,3).join(',')));
const K=(x,y,z)=>x+','+y+','+z;

export function compileCompactArchitecturePlan(p,{originalBrief,authorship='UNVERIFIED_AUTHOR'}={}){
 let validated;
 try{validated=inspectCompactArchitecturePlan(p,{originalBrief});}
 catch(e){return no('INVALID_AUTHOR_CONTRACT',{failure:String(e.message)});}
 if(!(originalBrief instanceof Uint8Array))return no('ORIGINAL_BRIEF_REQUIRED');
 if(!['UNVERIFIED_AUTHOR','SYNTHETIC_TEST_FIXTURE','MODEL_ORIGINAL_UNVERIFIED'].includes(authorship))
  return no('UNSUPPORTED_PROVENANCE');
 const originalInputSha256=H(Buffer.from(JSON.stringify(p)));
 const sourceMeta={originalInputSha256,originalBriefSha256:H(originalBrief),
  authorship,sourceOriginalUnchanged:true};
 if(p.stories.length!==2||p.stories.some(s=>s.spaces.length!==1))
  return no('FIRST_SLICE_ONLY_TWO_STORIES_ONE_ROOM_EACH',sourceMeta);
 if(p.adjacency.length!==0)return no('UNSUPPORTED_AUTHORED_ADJACENCY',sourceMeta);
 if(p.entry.face!=='south')return no('UNSUPPORTED_AUTHORED_ENTRY_FACE',{...sourceMeta,authorEntryFace:p.entry.face});
 if(p.verticalLinks.length!==1)return no('SINGLE_VERTICAL_LINK_ONLY',sourceMeta);
 const v=p.verticalLinks[0];
 if(v.kind!=='straight'||v.side!=='east')
  return no('UNSUPPORTED_AUTHORED_STAIR_KIND_OR_SIDE',{...sourceMeta,authoredStair:v.kind,authoredSide:v.side});
 if(p.roof.kind!=='flat')return no('UNSUPPORTED_AUTHORED_ROOF',{...sourceMeta,authoredRoof:p.roof.kind});
 const [s0,s1]=p.stories,[a,b]=[s0.spaces[0],s1.spaces[0]];
 if(p.massing.forms.length!==2||p.massing.forms.some(f=>f.kind!=='rectilinear')||
   !p.massing.forms.some(f=>f.spaceId===a.id)||!p.massing.forms.some(f=>f.spaceId===b.id))
  return no('UNSUPPORTED_AUTHORED_MASSING',{...sourceMeta,authoredForms:p.massing.forms.map(f=>f.kind)});
 if(p.unmetRequirements.length)return no('AUTHOR_DECLARED_UNMET_REQUIREMENTS',{...sourceMeta,requirements:p.unmetRequirements});
 if(v.fromSpace!==a.id||v.toSpace!==b.id)return no('STAIR_SPACE_TOPOLOGY',sourceMeta);
 if(b.width>a.width||b.depth>a.depth)return no('UNSUPPORTED_UPPER_OVERHANG',sourceMeta);
 const floor0=validated.computedLevels[0].standingY,floor1=validated.computedLevels[1].standingY;
 const steps=floor1-floor0+1,run=steps-1;
 // Preserve room widths and levels; solve only relative translation and stair run.
 if(steps>32||a.depth<steps+8||b.depth<steps+8||a.width<8||b.width<8)
  return no('STAIR_ROUTE_CANNOT_FIT_AUTHORED_ROOMS',{...sourceMeta,requiredDepth:steps+8,actualDepths:[a.depth,b.depth]});
 // Ground and upper rooms share the author-selected stair-facing east facade.
 const lower={x:3,z:3,w:a.width,d:a.depth,y:floor0,h:s0.clearHeight};
 const upper={x:3+a.width-b.width,z:3,w:b.width,d:b.depth,y:floor1,h:s1.clearHeight};
 const faceX=lower.x+lower.w,shaftX=faceX+2,stairX=shaftX+1;
 const stairStart=lower.z+3,stairEnd=stairStart+run;
 const shaftZ=lower.z+1,shaftDepth=Math.max(a.depth,b.depth)-2;
 const shaftWidth=v.width+3,fullHeight=floor1+s1.clearHeight+1;
 if(shaftX+shaftWidth>p.site.width-1||shaftZ+shaftDepth>p.site.depth-1||
  fullHeight>p.site.height||stairEnd+4>=shaftZ+shaftDepth)
  return no('STAIR_SHAFT_OUTSIDE_AUTHOR_SITE',{...sourceMeta,shaft:{shaftX,shaftZ,shaftWidth,shaftDepth,fullHeight}});
 const lowerDoorX=lower.x+Math.floor((lower.w-2)/2);
 const operations=[
  skin('lower-envelope',a.id,p.materials),skin('upper-envelope',b.id,p.materials),
  {kind:'primitive',element:{id:'stair-core-shell',shape:'box',mode:'add',
   material:p.materials.wall,origin:[shaftX,0,shaftZ],
   size:[shaftWidth,fullHeight,shaftDepth],shell:1}},
  box('entry-approach','add',[lowerDoorX,0,0],[2,1,3],p.materials.floor),
  box('entrance-opening','cut',[lowerDoorX,floor0,lower.z-1],[2,3,1]),
  box('lower-core-portal','cut',[faceX,floor0,stairStart],[3,3,2]),
  box('upper-core-portal','cut',[faceX,floor1,stairEnd+1],[3,3,2]),
  box('lower-landing','add',[faceX-1,floor0-1,stairStart-1],
   [shaftX+shaftWidth-faceX-1,1,3],p.materials.floor),
  box('upper-landing','add',[faceX-1,floor1-1,stairEnd],
   [shaftX+shaftWidth-faceX-1,1,4],p.materials.floor),
  {kind:'flight',id:'authored-stair',fromLevelId:s0.id,toLevelId:s1.id,
   start:[stairX,stairStart],end:[stairX,stairEnd],width:v.width,
   treadDepth:1,material:p.materials.floor}
 ];
 for(const [i,o] of p.openings.entries()){
  const room=o.spaceId===a.id?lower:upper;
  if(o.role==='ventilation'||o.face==='east'||o.pattern==='ribbon'||o.pattern==='clerestory')
   return no('UNSUPPORTED_AUTHORED_GLAZING',{...sourceMeta,index:i,authoredOpening:o});
  const y=room.y+2,hh=o.pattern==='tall'?3:2;
  if(y+hh>room.y+room.h)return no('WINDOW_CANNOT_FIT_CLEAR_HEIGHT',{...sourceMeta,index:i});
  const xyz=o.face==='south'?[room.x+2,y,room.z-1]:
   o.face==='north'?[room.x+2,y,room.z+room.d]:
   [room.x-1,y,room.z+4];
  const size=o.face==='west'?[1,hh,2]:[2,hh,1];
  // Reject overlap with a centered ground entrance instead of moving the author's facade.
  if(o.spaceId===a.id&&o.face==='south'&&room.x+2+2>lowerDoorX&&room.x+2<lowerDoorX+2)
   return no('AUTHOR_WINDOW_ENTRANCE_COLLISION',{...sourceMeta,index:i});
  operations.push(box('window-cut-'+i,'cut',xyz,size));
  operations.push(box('window-glass-'+i,'add',xyz,size,'glass'));
 }
 const brief=Buffer.from(originalBrief);
 const intendedDestination=[upper.x+Math.floor(upper.w/2),floor1,upper.z+Math.floor(upper.d/2)];
 const bn={schema:R190BN_SCHEMA,id:p.id,title:p.title,
  brief:'Compact ArchitecturePlan: '+p.title,originalBriefSha256:H(brief),
  bounds:{width:p.site.width,height:p.site.height,depth:p.site.depth},
  intent:{use:'Author purposes: '+a.purpose+'; '+b.purpose,
   experience:'Spatial relation authored in Compact ArchitecturePlan.',
   massing:p.massing.intent,
   circulation:'Author straight eastern staircase connects the ground and upper rooms.'},
  levels:[{id:s0.id,standingY:floor0},{id:s1.id,standingY:floor1}],
  spaces:[{id:a.id,levelId:s0.id,purpose:a.purpose,origin:[lower.x,lower.z],size:[lower.w,lower.d],
    clearHeight:lower.h,minimumReachablePositions:1,minimumReachablePercent:1},
   {id:b.id,levelId:s1.id,purpose:b.purpose,origin:[upper.x,upper.z],size:[upper.w,upper.d],
    clearHeight:upper.h,minimumReachablePositions:1,minimumReachablePercent:1}],
  operations,entrance:[lowerDoorX,floor0,1],
  headroom:3,destinations:[{id:'upper-target',point:intendedDestination,maximumPathSteps:500}],
  protectedVoids:[],assumptions:['First straight-east stair compiler slice. No Minecraft use or ART pass.']};
 let translated;
 try{translated=compileR190BNAssembly(Buffer.from(JSON.stringify(bn)),{originalBrief:brief,authorship});}
 catch(e){return no('BN_COMPILE_REJECTED',{...sourceMeta,failure:String(e.message)});}
 const occupied=occupiedLookup(translated);
 const has=(x,y,z)=>occupied.has(K(x,y,z));
 const supported=translated.spaceEvidence.every(s=>s.unsupportedFloorCells===0&&s.obstructedAirCells===0);
 const stair=translated.proposal.design.elements.find(e=>e.id==='authored-stair');
 const destination=translated.functionalReview?.evidence?.results?.destinations?.[0];
 const bottom=[stairX,floor0,stairStart],top=[stairX,floor1,stairEnd+1];
 const flightPresent=stair?.shape==='staircase'&&stair.steps===steps&&stair.axis==='z';
 const endpointFloors=has(bottom[0],floor0-1,bottom[2])&&
  has(top[0],floor1-1,top[2]);
 const entranceFloor=has(lowerDoorX,floor0-1,1)&&
  !has(lowerDoorX,floor0,2)&&!has(lowerDoorX,floor0+1,2);
 const upperAir=!has(intendedDestination[0],floor1,intendedDestination[2])&&
  !has(intendedDestination[0],floor1+1,intendedDestination[2]);
 const route=destination?.reachable===true&&
  translated.functionalReview.status==='SOURCE_AND_DECLARED_SPATIAL_CLAIMS_FORMALLY_PASS';
 const evidence={supported,flightPresent,endpointFloors,entranceFloor,upperAir,route,
  destination:destination??null,spaceEvidence:translated.spaceEvidence,
  authoredFeaturesPreserved:true,allOpeningsModelSelected:p.openings.length,
  verifiedWindowPairs:operations.filter(o=>o.element?.id?.startsWith('window-glass-')).length};
 const physical=Object.entries(evidence).filter(([k,v])=>
  ['supported','flightPresent','endpointFloors','entranceFloor','upperAir','route'].includes(k)&&v!==true);
 const pass=physical.length===0&&translated.status==='SOURCE_SPACE_AND_ROUTE_PROXIES_PRESENT_ART_HOLD';
 return {schema:'minecraftaibuilder-architecture-plan-to-bn-v1',
  status:pass?'SOURCE_TWO_LEVEL_VOXEL_ROUTE_PROXIES_ART_HOLD':'HOLD_PHYSICAL_CIRCULATION_OR_SPACE',
  reason:pass?null:'PHYSICAL_QA_FAILED',...sourceMeta,
  geometryCompiled:true,BNSource:bn,derived:translated,evidence,
  architecturePlanSha256:originalInputSha256,
  geometrySha256:translated.geometrySha256,sourceSha256:translated.sourceSha256,
  authorDesignRepaired:false,hostInventedFeature:false,
  modelCalls:0,worldContacts:0,worldWrites:0,BuildPlan:{operations:[]},
  readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),art:'ART_HOLD',
  minecraftWalking:'NOT_TESTED',functional2WideWalking:'NOT_CERTIFIED',
  artisticQuality:'NOT_CERTIFIED'};
}
