/**
 * R190 compact architecture PROGRAM -> bounded real B143 source.
 * MODEL owns the room program, relative relationships and qualitative massing.
 * HOST resolves integer dimensions and viable adjacent sides. Every resolution
 * is explicitly labelled HOST_DERIVED, never misreported as model-authored.
 * No runtime/network imports, Minecraft commands, or world writes.
 */
import {createHash} from 'node:crypto';
import {R190_SCHEMA,compileR190SemanticPlan,validR190Purpose}
 from './r190-semantic-massing.mjs';

export const R190_COMPACT_SCHEMA='minecraftaibuilder-r190-compact-program-v1';
const H=x=>createHash('sha256').update(x).digest('hex');
const fail=x=>{throw Error('R190_COMPACT_'+x);};
const ok=(x,e)=>{if(!x)fail(e);};
const slug=x=>typeof x==='string'&&/^[a-z][a-z0-9-]{2,39}$/.test(x);
const txt=(x,max)=>typeof x==='string'&&x.length>=3&&x.length<=max&&
 !/[\u0000-\u001f<>]/.test(x);
const exact=(o,names)=>o&&typeof o==='object'&&!Array.isArray(o)&&
 Object.keys(o).length===names.length&&names.every(n=>Object.hasOwn(o,n));
const dirs=['north','east','west','south'];
const axis=(v)=>v==='long'?[-2,3]:v==='wide'?[3,-2]:[0,0];
const size={compact:9,balanced:13,generous:17};
const heights={low:8,medium:10,high:12};
const faces={
 north:['east','west','north'],east:['north','south','east'],
 west:['north','south','west'],south:['east','west','south']
};
const resolution={source:'HOST_DETERMINISTIC_GEOMETRY_NOT_MODEL_COORDINATES',
 sizeRule:'compact=9 balanced=13 generous=17; wide=+3/-2; long=-2/+3',
 heightRule:'low=8 medium=10 high=12',
 envelope:'host capacity 80x80x22, not a model-declared real site'};
export function inspectR190CompactProgram(program){
 const p=typeof program==='string'?JSON.parse(program):program;
 ok(exact(p,['schema','id','title','brief','entranceFace','spaces','materials',
   ...(Object.hasOwn(p??{},'daylightIntent')?['daylightIntent']:[]),
   ...(Object.hasOwn(p??{},'arrivalIntent')?['arrivalIntent']:[])])&&
  p.schema===R190_COMPACT_SCHEMA&&slug(p.id)&&txt(p.title,100)&&txt(p.brief,400)&&
  dirs.includes(p.entranceFace),'IDENTITY');
 ok(Array.isArray(p.spaces)&&p.spaces.length>=2&&p.spaces.length<=4,'ROOM_COUNT');
 ok(exact(p.materials,['floor','wall','roof'])&&
  Object.values(p.materials).every(x=>['stone','wood','concrete','metal'].includes(x)),
  'MATERIALS');
 const ids=new Set(),seen=new Set();
 for(let i=0;i<p.spaces.length;i++){
  const s=p.spaces[i];
  ok(exact(s,['id','purpose','size','proportion','height','parentId',
    'preferredSide','privacy','form']),'SPACE_FIELDS');
  ok(slug(s.id)&&!ids.has(s.id)&&validR190Purpose(s.purpose)&&
   Object.hasOwn(size,s.size)&&['square','wide','long'].includes(s.proportion)&&
   Object.hasOwn(heights,s.height)&&
   ['public','shared','private'].includes(s.privacy)&&
   ['plain','facet','ridge','shed','sky-court','open-court'].includes(s.form),
   'SPACE_VALUES');
  ok(i===0?(s.parentId===null&&s.preferredSide===null):
   (seen.has(s.parentId)&&dirs.includes(s.preferredSide)),'RELATION');
  ids.add(s.id);seen.add(s.id);
 }
 ok(p.spaces.filter(x=>x.form==='facet').length<=2,'FACET_BUDGET');
 ok(p.spaces.filter(x=>['ridge','shed'].includes(x.form)).length<=2,'ROOF_BUDGET');
 ok(p.spaces.filter(x=>x.form==='sky-court').length<=1,'SKY_COURT_BUDGET');
 ok(p.spaces.filter(x=>x.form==='open-court').length<=1,'OPEN_COURT_BUDGET');
 ok(p.spaces[0].form!=='open-court','ENTRANCE_MUST_BE_ENCLOSED');
 // Optional MODEL-selected sheltered threshold, without numeric authoring.
 if(Object.hasOwn(p,'arrivalIntent'))
  ok(exact(p.arrivalIntent,['form','projection','span'])&&
   p.arrivalIntent.form==='sheltered'&&
   ['compact','deep'].includes(p.arrivalIntent.projection)&&
   ['door','wide'].includes(p.arrivalIntent.span),'ARRIVAL_INTENT');
 // New optional MODEL intent, without numeric B143 geometry or source writes.
 if(Object.hasOwn(p,'daylightIntent')){
  ok(Array.isArray(p.daylightIntent)&&p.daylightIntent.length>=1&&
   p.daylightIntent.length<=p.spaces.length,'DAYLIGHT_INTENT_COUNT');
  const claimed=new Set();
  for(const choice of p.daylightIntent){
   ok(exact(choice,['spaceId','preferredFace','scale'])&&
    ids.has(choice.spaceId)&&!claimed.has(choice.spaceId)&&
    dirs.includes(choice.preferredFace)&&
    ['modest','balanced','generous'].includes(choice.scale),
    'DAYLIGHT_INTENT_FIELDS');
   claimed.add(choice.spaceId);
  }
 }
 return structuredClone(p);
}
function chooseFacetFace(space,rooms,entranceFace){
 const side=space.side;
 const blocked=new Set(rooms.filter(c=>c.parentId===space.id).map(c=>c.side));
 if(space.parentId!==null){
  blocked.add({north:'south',south:'north',east:'west',west:'east'}[side]);
 }else blocked.add(entranceFace);
 return dirs.find(d=>!blocked.has(d))??'north';
}
function derive(p,sides){
 const dims=p.spaces.map((s,i)=>{
  const [dw,dd]=axis(s.proportion),n=size[s.size];
  let w=n+dw,d=n+dd;
  // Faceted geometry requires ≥10 in either facing span. This is a HOST
  // interpretation of a qualitative scale, not silent alteration of mm.
  if(s.form==='facet'){w=Math.max(w,10);d=Math.max(d,10);}
  return {id:s.id,purpose:s.purpose,width:w,depth:d,height:heights[s.height],
   parentId:s.parentId,side:i===0?null:sides[i-1],privacy:s.privacy,
   ...(s.form==='open-court'?{spatialRole:'open-court'}:{})};
 });
 const plan={schema:R190_SCHEMA,id:p.id,title:p.title,brief:p.brief,
  site:{width:80,depth:80,height:22},entrySpaceId:p.spaces[0].id,
  entranceFace:p.entranceFace,spaces:dims,materials:structuredClone(p.materials)};
 if(p.arrivalIntent)plan.entranceCanopyIntent={
  projection:p.arrivalIntent.projection==='deep'?3:2,
  overhang:p.arrivalIntent.span==='wide'?1:0};
 const roofs=[],facets=[];
 for(const [i,s] of p.spaces.entries()){
  if(s.form==='facet'){
   facets.push({spaceId:s.id,face:chooseFacetFace(dims[i],dims,p.entranceFace),
    cornerInset:2});
  }
  if(s.form==='ridge'||s.form==='shed'){
   roofs.push({spaceId:s.id,profile:s.form,axis:
    dims[i].width>=dims[i].depth?'x':'z',rise:2});
  }
  if(s.form==='sky-court'){
   const width=4,depth=4;
   plan.skyCourtIntent={spaceId:s.id,
    offsetX:Math.floor((dims[i].width-width)/2),
    offsetZ:Math.floor((dims[i].depth-depth)/2),width,depth};
  }
 }
 if(facets.length===1)plan.formIntent=facets[0];
 if(facets.length===2)plan.formIntents=facets;
 if(roofs.length===1)plan.roofFormIntent=roofs[0];
 if(roofs.length===2)plan.roofFormIntents=roofs;
 return plan;
}
export function compileR190CompactProgram(raw){
 const p=inspectR190CompactProgram(raw);
 const immutable=JSON.stringify(p);
 const children=p.spaces.slice(1);
 // The authored side is a preference, but the root's exterior entrance
 // approach is a hard safety corridor. Never ask the semantic compiler to
 // accept a child over the entrance door.
 const choices=children.map(s=>
  [s.preferredSide,...dirs.filter(d=>d!==s.preferredSide)]
   .filter(d=>s.parentId!==p.spaces[0].id||d!==p.entranceFace));
 const excludedEntrySideBranches=children.filter(s=>
  s.parentId===p.spaces[0].id).length;
 const combinations=[];
 function enumerate(index,chosen,changes){
  if(index===choices.length){
   combinations.push({sides:[...chosen],changes});
   return;
  }
  for(const d of choices[index]){
   enumerate(index+1,[...chosen,d],
    changes+(d===children[index].preferredSide?0:1));
  }
 }
 enumerate(0,[],0);
 combinations.sort((a,b)=>a.changes-b.changes);
 const rejected=new Map();
 let attempts=0;
 for(const c of combinations){
  const plan=derive(p,c.sides);
  attempts++;
  try{
   const built=compileR190SemanticPlan(plan);
   ok(built.audit.allProgramSpacesReachable===true&&
    built.worldContacts===0&&built.worldWrites===0&&
    built.constructionApproved===false&&built.executionAllowed===false&&
    built.readiness==='NOT_PREPARED'&&
    built.gates.length===9&&built.gates.every(x=>x==='BLOCKED')&&
    built.BuildPlan.operations.length===0,'SOURCE_OR_SAFETY');
   ok(JSON.stringify(p)===immutable,'MODEL_PROGRAM_MUTATED');
   return {status:'COMPILED_SOURCE_ONLY_ART_HOLD',
    originalProgramSha256:H(Buffer.from(immutable)),
    modelProgram:structuredClone(p),hostDerivedPlan:plan,
    hostResolution:{...resolution,attemptedPlacements:attempts,
     excludedRootEntranceSides:excludedEntrySideBranches,
     examinedCandidateCount:combinations.length,
     rejectedReasons:Object.fromEntries(rejected),
     relativeSideDeviations:children.flatMap((s,i)=>
      c.sides[i]===s.preferredSide?[]:[{
       spaceId:s.id,preferredSide:s.preferredSide,resolvedSide:c.sides[i]}]),
     modelRoomDimensionsPreservedAsNumbers:false,
     modelRelationsPreserved:true,modelSelectedShapeTypesPreserved:true},
    built};
  }catch(e){
   const reason=String(e?.message??e).replace(/[^A-Z0-9_]/g,'_').slice(0,100);
   rejected.set(reason,(rejected.get(reason)??0)+1);
  }
 }
 // Report ALL independent failure classes, not merely the final attempted
 // branch, which previously gave misleading ENTRY_COLLISION diagnoses.
 const reasons=[...rejected.entries()].sort((a,b)=>b[1]-a[1]||
  a[0].localeCompare(b[0]));
 const error=new Error('R190_COMPACT_NO_CONSTRAINT_SOLUTION_'+
  reasons.slice(0,5).map(([name,count])=>name+'_'+count).join('__'));
 error.diagnostics={totalCandidates:combinations.length,
  attemptedPlacements:attempts,excludedRootEntranceSides:excludedEntrySideBranches,
  allReasons:Object.fromEntries(reasons)};
 throw error;
}
