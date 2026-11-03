/**
 * V4D optional small-model author IR: meaningful architectural decisions only.
 * Exact voxel/mechanical dimensions are normalized deterministically by a
 * generic compiler, never selected by building genre, room names or prompts.
 * No "repair" of invalid authored adjacency or semantic choices.
 *
 * Smaller contract is a HYPOTHESIS for 2B/4B efficiency, NOT measured proof.
 */
import {createHash} from 'node:crypto';
import {RELATIVE_SCHEMA,compileRelativeAuthorIntent}
 from './r125-v4d-relative-author-ir.mjs';

export const COMPACT_SCHEMA='minecraftaibuilder-r125-v4d-compact-spatial-intent-v1';
const fail=reason=>{throw Error('R125_V4D_COMPACT_'+reason);};
const exact=(x,fields)=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&
 Object.keys(x).sort().join('|')===fields.slice().sort().join('|');
const integer=(x,lo,hi)=>Number.isSafeInteger(x)&&x>=lo&&x<=hi;
const slug=x=>typeof x==='string'&&/^[a-z][a-z0-9-]{2,34}$/.test(x);
const phrase=x=>typeof x==='string'&&x.length>=3&&x.length<=150&&
 !/[\u0000-\u001f<>]/.test(x);
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const opposite={north:'south',south:'north',east:'west',west:'east'};
const heights={
 low:{eaveY:10,peakY:17},
 medium:{eaveY:12,peakY:19},
 high:{eaveY:14,peakY:22}
};
const roofTypes={ridgeX:['ridge','x'],ridgeZ:['ridge','z'],
 shedX:['shed','x'],shedZ:['shed','z']};
const allSides=['north','south','east','west'];
const validMaterials={
 floor:['wood','stone','concrete'],
 wall:['stone','wood','concrete','metal'],
 roof:['stone','wood','concrete','metal'],
 public:['stone','concrete','accent']
};
function checkUntrustedCompact(v){
 if(!exact(v,['schema','id','title','brief','materials','spaces'])||
   v.schema!==COMPACT_SCHEMA||!slug(v.id)||
   !phrase(v.title)||!phrase(v.brief)||
   !exact(v.materials,['floor','wall','roof','public']))
   fail('ROOT');
 for(const key of Object.keys(validMaterials))
  if(!validMaterials[key].includes(v.materials[key]))
   fail('MATERIALS_'+key);
 if(!Array.isArray(v.spaces)||v.spaces.length<3||v.spaces.length>5)
  fail('SPACES_COUNT');
 const seen=new Set(),featureIDs=new Set(),covered=[],outdoor=[];
 for(const [i,s] of v.spaces.entries()){
  if(!exact(s,['id','purpose','kind','width','depth','roof','height',
   'facade','windowSide','feature','featureMaterial','attach'])||
   !slug(s.id)||seen.has(s.id)||!phrase(s.purpose)||
   !integer(s.width,18,30)||!integer(s.depth,18,30)||
   !phrase(s.feature)||!['wood','stone','metal','concrete','accent']
    .includes(s.featureMaterial))
   fail('SPACE_'+i);
  seen.add(s.id);
  if(s.kind==='covered'){
   if(!Object.hasOwn(roofTypes,s.roof)||
    !Object.hasOwn(heights,s.height)||
    !['glass','wall'].includes(s.facade)||
    ![...allSides,'none'].includes(s.windowSide))
    fail('COVERED_'+i);
   covered.push(s);
  }else if(s.kind==='sky'){
   if(s.roof!==null||s.height!==null||s.facade!==null||
    s.windowSide!==null)fail('SKY_'+i);
   outdoor.push(s);
  }else fail('KIND_'+i);
  const featureID=s.id+'-fixture';
  if(featureIDs.has(featureID))fail('FEATURE_ID');
  featureIDs.add(featureID);
  if(i===0){
   if(s.kind!=='covered'||s.attach!==null)fail('ENTRY_COVERED');
   if(s.windowSide==='north')fail('ENTRY_WINDOW_OVERLAP');
  }else{
   if(!exact(s.attach,['to','side','shift'])||
    !seen.has(s.attach.to)||s.attach.to===s.id||
    !allSides.includes(s.attach.side)||
    !integer(s.attach.shift,-3,3))
    fail('PARENT_BEFORE_CHILD_'+i);
  }
 }
 if(covered.length<2||outdoor.length<1)
  fail('REQUIRES_ENCLOSED_ROOMS_AND_OPEN_PUBLIC_SPACE');
 // A roofed public edge must be backed by an actually linked space.
 // A SKY node is allowed to attach directly to a previous SKY node only if
 // its roofed arcade's own edge faces a connected, physically enclosed room.
 for(const s of outdoor){
  if(!covered.some(n=>n.id===s.attach?.to))fail('SKY_ARCADE_NEEDS_COVERED_PARENT');
 }
 return v;
}
export function translateCompactModelIntent(untrusted){
 const input=structuredClone(untrusted);
 checkUntrustedCompact(input);
 const spaces=input.spaces.map((s,i)=>{
  const covered=s.kind==='covered',roofChoice=covered?
   {axis:roofTypes[s.roof][1],type:roofTypes[s.roof][0],
    ...heights[s.height],peakPercent:50}:null;
  // Generic mechanical placement: never based on style, genre or purpose.
  // LLM chooses all functional names, relative topology, spans, roof type,
  // relative prominence, outer facade style and exterior window direction.
  const windowSide=s.windowSide;
  const dimension=windowSide==='east'||windowSide==='west'?s.depth:s.width;
  const windows=covered&&windowSide!=='none'?[{
   side:windowSide,offset:Math.floor((dimension-6)/2),
   span:6,sillY:5,height:3
  }]:[];
  const attach=i?{
   to:s.attach.to,side:s.attach.side,
   shift:s.attach.shift,doorOffset:7
  }:undefined;
  return {
   id:s.id,purpose:s.purpose,kind:s.kind,
   width:s.width,depth:s.depth,
   roof:roofChoice,facade:covered?s.facade:null,
   shelter:covered?null:{
    edge:opposite[s.attach.side],depth:4,roofY:8,
    material:input.materials.roof
   },
   windows,
   fixture:{
    id:s.id+'-fixture',purpose:s.feature,
    offsetX:7,offsetZ:8,width:3,depth:2,height:2,
    material:s.featureMaterial
   },
   ...(i?{attach}: {})
  };
 });
 const detailed={
  schema:RELATIVE_SCHEMA,id:input.id,title:input.title,brief:input.brief,
  materials:input.materials,spaces,
  entry:{offset:7,plazaWidth:14,plazaDepth:10,canopyDepth:4},
  extraLinks:[]
 };
 // The STRICT previously validated author-to-graph and B143 path decides
 // validity; neither IR is mutated or silently repaired after rejection.
 return {
  compactAuthorOriginal:input,
  compactAuthorSha256:digest(input),
  expandedMechanicalIR:detailed,
  normalization:{
   label:'GENERIC_CONST_V1_NOT_MODEL_SELECTED_ARCHITECTURE',
   roofPeakPercent:50,doorOffset:7,entryOffset:7,
   perExteriorWindowSpan:6,featureSize:[3,2,2],
   shelteredPublicDepth:4,
   madeGenreSpecificChoices:false,
   modelSizeOrMacMemoryTested:false
  }
 };
}
export function compileCompactModelIntent(value){
 const expanded=translateCompactModelIntent(value);
 const checked=compileRelativeAuthorIntent(expanded.expandedMechanicalIR);
 if(checked.worldWrites!==0||checked.constructionApproved!==false)
  fail('WORLD_SAFETY');
 return {...checked,...expanded,
  sourceProvenance:'COMPACT_AUTHOR_USER_OR_LLM_UNATTESTED',
  art:'NOT_REVIEWED',modelIdentity:'NOT_ATTESTED',
  readiness:'NOT_PREPARED',constructionApproved:false,
  executionAllowed:false,worldContacts:0,worldWrites:0,
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}
 };
}
export const COMPACT_SYSTEM_PROMPT=[
 'You are an original architect. Choose spatial function, relative adjacencies, silhouettes, open public space and materials.',
 'Return ONLY one compact JSON object. No markdown, prose outside JSON, coordinates, code or construction approval.',
 'Top-level EXACT schema,id,title,brief,materials,spaces. schema='+COMPACT_SCHEMA,
 'id: unique lowercase hyphen slug 3..35; title/brief meaningful 3..150 characters.',
 'materials EXACT {floor,wall,roof,public}: floor=wood|stone|concrete, wall=stone|wood|concrete|metal, roof=stone|wood|concrete|metal, public=stone|concrete|accent.',
 'spaces: 3..5 entries in PARENT BEFORE CHILD order, first is covered reception, at least TWO covered and ONE sky-open public space.',
 'Every space EXACT fields: id,purpose,kind,width,depth,roof,height,facade,windowSide,feature,featureMaterial,attach.',
 'Choose width,depth integer 18..30, purpose and feature as authentic functional descriptions, and featureMaterial wood|stone|metal|concrete|accent.',
 'Covered: kind="covered", roof=ridgeX|ridgeZ|shedX|shedZ, height=low|medium|high, facade=wall|glass, windowSide=north|south|east|west|none.',
 'Sky open public space: kind="sky", roof:null,height:null,facade:null,windowSide:null. It MUST attach directly to a covered space.',
 'FIRST covered space: attach:null and windowSide NOT north (north is main entrance).',
 'Every other space: attach EXACT {to:<EARLIER space id>,side:north|south|east|west,shift:integer -3..3}. Relative side is FROM the parent TO the child.',
 'Choose connections with no interior overlaps, no hidden wall contacts, no windows on touching shared walls and no blocked north entrance.',
 'Host derives ONLY generic mechanical dimensions: entrance/door positions, window span, roof slope amplitude from author low/medium/high, fixture voxel sizes, shelter roof on sky-to-covered edge.',
 'Do NOT output low-level voxel locations, arbitrary scripts, building genre templates or claims of ART PASS or Minecraft completion.',
 'A wrong design FAILS CLOSED: there is NO automatic repair, no model retry. Favor small coherent distinct rooms and a real public space.'
].join('\n');
