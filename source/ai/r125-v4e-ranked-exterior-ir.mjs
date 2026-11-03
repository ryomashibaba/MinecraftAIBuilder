/**
 * V4E experimental opt-in: model AUTHORS all four facade orientation
 * preferences in rank order. HOST only resolves the first authored direction
 * proven exterior after interpreting ALL authored rooms, including children
 * declared later. Never silently moves a window to an unapproved facade.
 *
 * Research only. No model access, no Minecraft world access, no Art PASS.
 * Frozen V4D COMPACT_SCHEMA and Education success path remain unchanged.
 */
import {createHash} from 'node:crypto';
import {MATERIALS} from './b143-building-dsl.mjs';
import {COMPACT_SCHEMA,translateCompactModelIntent}
 from './r125-v4d-compact-model-ir.mjs';
import {translateRelativeAuthorIntent,compileRelativeAuthorIntent}
 from './r125-v4d-relative-author-ir.mjs';
export const RANKED_SCHEMA='minecraftaibuilder-r125-v4e-ranked-exterior-author-v1';
const dirs=['north','east','south','west'];
const fail=code=>{throw Error('R125_V4E_RANKED_'+code);};
const exact=(x,fields)=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&
 Object.keys(x).sort().join('|')===fields.slice().sort().join('|');
const endX=n=>n.x+n.width-1,endZ=n=>n.z+n.depth-1;
const interval=(a,b,c,d)=>Math.max(a,c)<=Math.min(b,d);
const faceTouches=(room,other,side)=>{
 if(side==='east')return (other.x===endX(room)||other.x===endX(room)+1||
   (other.x<endX(room)&&endX(other)>=endX(room)))&&
   interval(room.z,endZ(room),other.z,endZ(other));
 if(side==='west')return (endX(other)===room.x||endX(other)===room.x-1||
   (other.x<=room.x&&endX(other)>room.x))&&
   interval(room.z,endZ(room),other.z,endZ(other));
 if(side==='south')return (other.z===endZ(room)||other.z===endZ(room)+1||
   (other.z<endZ(room)&&endZ(other)>=endZ(room)))&&
   interval(room.x,endX(room),other.x,endX(other));
 if(side==='north')return (endZ(other)===room.z||endZ(other)===room.z-1||
   (other.z<=room.z&&endZ(other)>room.z))&&
   interval(room.x,endX(room),other.x,endX(other));
 fail('UNKNOWN_SIDE');
};
const digest=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
function authorContract(value){
 if(!exact(value,['schema','id','title','brief','materials','spaces'])||
  value.schema!==RANKED_SCHEMA||!Array.isArray(value.spaces)||
  value.spaces.length<3||value.spaces.length>5)
  fail('ROOT');
 for(const [i,s] of value.spaces.entries()){
  if(!exact(s,['id','purpose','kind','width','depth','roof','height',
   'facade','windowPriority','feature','featureMaterial','attach']))
   fail('SPACE_FIELDS_'+i);
  if(s.kind==='covered'){
   if(!Array.isArray(s.windowPriority)||s.windowPriority.length!==4||
     new Set(s.windowPriority).size!==4||
     s.windowPriority.some(x=>!dirs.includes(x)))
     fail('COVERED_REQUIRES_AUTHORED_FOUR_SIDE_RANKING_'+i);
  }else if(s.kind==='sky'){
   if(s.windowPriority!==null)fail('SKY_NO_RANKING_'+i);
  }else fail('KIND_'+i);
 }
}
function toBareCompact(original){
 const src=structuredClone(original);
 src.schema=COMPACT_SCHEMA;
 src.spaces=src.spaces.map(s=>{
  const v={...s,windowSide:s.kind==='sky'?null:'none'};
  delete v.windowPriority;
  return v;
 });
 return src;
}
export function translateRankedExteriorIntent(untrusted){
 const input=structuredClone(untrusted);
 authorContract(input);
 const mechanical=translateCompactModelIntent(toBareCompact(input));
 // Base topology is validated while all glazing is absent. This does NOT
 // change model authored adjacencies, dimensions, facade or roof decisions.
 const base=translateRelativeAuthorIntent(mechanical.expandedMechanicalIR);
 const indexed=base.plan.nodes;
 const chosenWindowFaces=[];
 for(const [i,s] of input.spaces.entries()){
  if(s.kind!=='covered')continue;
  const room=indexed[i];
  if(room?.id!==s.id)fail('HOST_GRAPH_ID_DRIFT_'+i);
  const blocked=dirs.filter(dir=>
   (i===0&&dir==='north')||indexed.some((n,j)=>i!==j&&faceTouches(room,n,dir))
  );
  const side=s.windowPriority.find(dir=>!blocked.includes(dir));
  if(!side)fail('NO_AUTHORED_EXTERIOR_OPTION_'+i);
  const dimension=side==='east'||side==='west'?s.depth:s.width;
  mechanical.expandedMechanicalIR.spaces[i].windows=[{
   side,offset:Math.floor((dimension-6)/2),span:6,sillY:5,height:3
  }];
  chosenWindowFaces.push({
   spaceIndex:i,selectedSide:side,
   authoredRank:s.windowPriority.indexOf(side)+1,
   excludedNonExteriorDirections:blocked,
   selection:'FIRST_AUTHORED_PROVEN_EXTERIOR_OPTION_NOT_SILENT_REPAIR'
  });
 }
 return {
  rankedAuthorOriginal:input,
  rankedAuthorSha256:digest(input),
  expandedMechanicalIR:mechanical.expandedMechanicalIR,
  chosenWindowFaces,
  normalizedBy:'AUTHOR_RANKED_EXTERIOR_SURFACE_CONSTRAINT_V1',
  modelAuthoredAllPreferences:true,
  autoRepairPerformed:false,
  modelSizeOrMacMemoryTested:false
 };
}

/**
 * V4E-specific post-compile SOURCE witness. A direction selected from the
 * complete authored topology is not enough: verify that every intended
 * 6x3 glazing panel survived as actual glass in final B143 primitives and
 * that the immediately adjacent outward voxel is AIR. This is NOT a
 * Minecraft-world, weatherproofing, architecture-quality or ART proof.
 */
export function proveRankedExteriorPhysicalGlazing(source, choices){
 const plan=source?.plan,primitives=source?.b143?.compiled?.primitives;
 if(!Array.isArray(plan?.nodes)||!Array.isArray(plan?.windows)||
    !Array.isArray(primitives)||!Array.isArray(choices)||
    plan.windows.length!==choices.length)
    fail('PHYSICAL_WITNESS_INPUT');
 const glass=MATERIALS.indexOf('glass');
 if(glass<0)fail('PHYSICAL_GLASS_PALETTE');
 const vox=new Map(primitives.map(p=>[p[0]+','+p[1]+','+p[2],p[3]]));
 const key=(x,y,z)=>x+','+y+','+z;
 let glassCells=0,adjacentAirCells=0;
 const seen=new Set();
 for(const c of choices){
  if(!Number.isSafeInteger(c.spaceIndex)||seen.has(c.spaceIndex))
   fail('PHYSICAL_CHOICE_DUPLICATE');
  seen.add(c.spaceIndex);
  const room=plan.nodes[c.spaceIndex];
  const windows=plan.windows.filter(w=>w.nodeId===room?.id);
  if(room?.kind!=='covered'||windows.length!==1)
   fail('PHYSICAL_WINDOW_TO_ROOM_DRIFT');
  const w=windows[0],side=c.selectedSide;
  const dimension=side==='east'||side==='west'?room.depth:room.width;
  if(w.side!==side||w.span!==6||w.sillY!==5||w.height!==3||
    w.offset!==Math.floor((dimension-6)/2))
   fail('PHYSICAL_AUTHORED_SIDE_DRIFT');
  for(let t=0;t<w.span;t++)for(let dy=0;dy<w.height;dy++){
   const y=w.sillY+dy;
   const x=side==='west'?room.x:
    side==='east'?endX(room):room.x+w.offset+t;
   const z=side==='north'?room.z:
    side==='south'?endZ(room):room.z+w.offset+t;
   if(vox.get(key(x,y,z))!==glass)
    fail('PHYSICAL_GLAZING_NOT_PRESENT_'+c.spaceIndex);
   glassCells++;
   const ox=x+(side==='east'?1:side==='west'?-1:0);
   const oz=z+(side==='south'?1:side==='north'?-1:0);
   if(vox.has(key(ox,y,oz)))
    fail('PHYSICAL_OUTWARD_AIR_OBSTRUCTED_'+c.spaceIndex);
   adjacentAirCells++;
  }
 }
 return {
  status:'B143_WINDOW_GLASS_AND_IMMEDIATE_OUTWARD_AIR_SOURCE_VERIFIED',
  windowCount:choices.length,
  verifiedPanelGlassCells:glassCells,
  verifiedImmediateOutwardAirCells:adjacentAirCells,
  weatherproofing:'NOT_TESTED',minecraftWalking:'NOT_TESTED',
  humanArchitecturalArt:'NOT_REVIEWED',realModelIdentity:'NOT_ATTESTED',
  worldContacts:0,worldWrites:0
 };
}

export function compileRankedExteriorIntent(value){
 const m=translateRankedExteriorIntent(value);
 const source=compileRelativeAuthorIntent(m.expandedMechanicalIR);
 const rankedPhysicalGlazingSourceProof=proveRankedExteriorPhysicalGlazing(source,m.chosenWindowFaces);
 if(source.worldContacts!==0||source.worldWrites!==0||
  source.constructionApproved!==false||
  source.executionAllowed!==false)
  fail('WORLD_SAFETY');
 return {...source,...m,rankedPhysicalGlazingSourceProof,
  authorContract:RANKED_SCHEMA,
  sourceProvenance:'RANKED_AUTHOR_USER_OR_LLM_UNATTESTED',
  humanArt:'NOT_REVIEWED',modelIdentity:'NOT_ATTESTED',
  readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
  worldContacts:0,worldWrites:0,gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]}
 };
}
export const RANKED_SYSTEM_PROMPT=[
 'You are the original architect. Decide all spatial relationships, massing, room purposes, materials, roof and facade preferences. Output exactly ONE JSON object, no markdown.',
 'Root EXACT keys schema,id,title,brief,materials,spaces; schema="'+RANKED_SCHEMA+'". Never omit or rename keys.',
 'id lowercase hyphen slug 3..35, title and brief 3..150 characters, materials EXACT {floor,wall,roof,public} using the SAME legal material values as the existing V4D compact contract.',
 'spaces: 3..5, FIRST covered reception with attach:null, minimum 2 covered and 1 sky public, every following room attaches to an earlier room.',
 'Every space EXACT keys id,purpose,kind,width,depth,roof,height,facade,windowPriority,feature,featureMaterial,attach.',
 'Choose width/depth integers 18..30; roof covered ridgeX|ridgeZ|shedX|shedZ; height low|medium|high; facade wall|glass. Sky: roof,height,facade,windowPriority all null.',
 'Every covered room MUST author windowPriority, an ARRAY of the four distinct compass strings north,east,south,west IN YOUR PREFERRED ORDER, e.g. ["east","south","west","north"].',
 'Every other room attach EXACT {to:<PREVIOUS SPACE id>,side:north|south|east|west,shift:integer -3..3}. The connection side points from parent toward child.',
 'The host will choose ONLY the FIRST option from YOUR windowPriority list that is geometrically proven a completely exterior, unshared face after all child rooms are placed. Root north face reserved for main entry.',
 'The host will NEVER choose an unlisted option, move a window after SOURCE failure or create a genre-specific facade; if no authored listed face is exterior the whole design FAILS CLOSED.',
 'Please create a distinctive functioning civic facility with truly intentional relationships. No generic empty boxes, no fake built world, no claim of ART pass.',
 'Materials: floor wood|stone|concrete; wall/roof stone|wood|concrete|metal; public stone|concrete|accent; featureMaterial wood|stone|metal|concrete|accent.'
].join('\n');
