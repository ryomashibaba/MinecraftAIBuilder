/**
 * E1 read-only explanation of saved ORIGINAL responses, including R190_SPACE.
 * No fixes, no second model request, no world access, no artifact writes.
 * Only checks a subset of the current strict semantic validator; do not
 * report success if that subset finds no issue.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {validR190Purpose,validateR190SemanticPlan,layoutR190SemanticPlan,r190GlazingCells,compileR190SemanticPlan} from '../source/ai/r190-semantic-massing.mjs';

const idOk=s=>typeof s==='string'&&/^[a-z][a-z0-9-]{2,39}$/.test(s);
const textOk=(s,n)=>typeof s==='string'&&s.length>=3&&s.length<=n&&
 !/[\u0000-\u001f<>]/.test(s);
const int=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const issue=(list,where,rule,actual,expected)=>list.push({
 where,rule,actual:actual===undefined?'(missing)':actual,expected});
const expectedSpace=['id','purpose','width','depth','height','parentId','side','privacy'];
const permittedSpace=[...expectedSpace,'spatialRole','tangentShift'];
const faces=['north','south','east','west'];
export function diagnoseR190E1Plan(plan){
 const issues=[];
 if(!plan||typeof plan!=='object'||Array.isArray(plan)) {
  issue(issues,'plan','JSON_OBJECT_REQUIRED',typeof plan,'single object');
  return issues;
 }
 if(!Array.isArray(plan.spaces)) {
  issue(issues,'spaces','PROGRAM_SPACES',typeof plan.spaces,'array of 2..6 rooms');
  return issues;
 }
 const validSite=plan.site&&typeof plan.site==='object'&&
  int(plan.site.height,10,32);
 const ceiling=validSite?plan.site.height-2:null;
 const idSet=new Set();
 for(const [i,s] of plan.spaces.entries()){
  const at='spaces['+i+']'+(typeof s?.id==='string'?' ('+s.id+')':'');
  if(!s||typeof s!=='object'||Array.isArray(s)){
   issue(issues,at,'SPACE_OBJECT',typeof s,'room object');continue;
  }
  for(const k of expectedSpace)if(!Object.hasOwn(s,k))
   issue(issues,at+'.'+k,'SPACE_MISSING_FIELD',undefined,'required');
  for(const k of Object.keys(s))if(!permittedSpace.includes(k))
   issue(issues,at+'.'+k,'SPACE_UNEXPECTED_FIELD',s[k],'not supported');
  if(!idOk(s.id))issue(issues,at+'.id','SPACE_ID',s.id,'kebab-case: lowercase letters, digits, hyphens, 3..40');
  if(idSet.has(s.id))issue(issues,at+'.id','SPACE_DUPLICATE_ID',s.id,'unique ID');
  idSet.add(s.id);
  if(!validR190Purpose(s.purpose))issue(issues,at+'.purpose','SPACE_PURPOSE',s.purpose,'3..150 printable chars, or exactly two Japanese-script chars');
  for(const k of ['width','depth'])if(!int(s[k],7,22))
   issue(issues,at+'.'+k,'SPACE_DIMENSION',s[k],'integer 7..22');
  if(!validSite)issue(issues,at+'.height','SITE_HEIGHT_UNVERIFIABLE',s.height,'valid site.height needed');
  else if(!int(s.height,7,ceiling))
   issue(issues,at+'.height','SPACE_HEIGHT',s.height,'integer 7..'+ceiling);
  if(!['public','shared','private'].includes(s.privacy))
   issue(issues,at+'.privacy','SPACE_PRIVACY',s.privacy,'public, shared or private');
  if(s.spatialRole!==undefined&&!['enclosed','open-court'].includes(s.spatialRole))
   issue(issues,at+'.spatialRole','SPACE_ROLE',s.spatialRole,'enclosed or open-court');
  if(s.tangentShift!==undefined&&!int(s.tangentShift,-24,24))
   issue(issues,at+'.tangentShift','SPACE_TANGENT',s.tangentShift,'integer -24..24');
  if(s.id===plan.entrySpaceId&&s.tangentShift!==undefined)
   issue(issues,at+'.tangentShift','SPACE_ENTRY_TANGENT',s.tangentShift,'must be absent for entry room');
  if(s.id===plan.entrySpaceId&&(s.parentId!==null||s.side!==null))
   issue(issues,at,'SPACE_ENTRY_RELATION',[s.parentId,s.side],'parentId=null and side=null');
  if(s.id!==plan.entrySpaceId&&(!idOk(s.parentId)||!faces.includes(s.side)))
   issue(issues,at,'SPACE_CHILD_RELATION',[s.parentId,s.side],'valid parent id and north/south/east/west');
 }
 // Report the root cause hidden by the validator's umbrella ROOF_SPACE code.
 // This is diagnostic only: never mutate the model-selected roof or form.
 const roofForms=plan.roofFormIntents??(
  plan.roofFormIntent===undefined?[]:[plan.roofFormIntent]);
 if(plan.roofFormIntents!==undefined&&plan.roofFormIntent!==undefined)
  issue(issues,'roofFormIntents','ROOF_SINGLE_AND_PLURAL_CONFLICT',true,
   'choose only one roofFormIntent or roofFormIntents');
 if(plan.roofFormIntents!==undefined&&
   (!Array.isArray(plan.roofFormIntents)||plan.roofFormIntents.length<1||plan.roofFormIntents.length>2))
  issue(issues,'roofFormIntents','ROOF_COLLECTION_COUNT',
   Array.isArray(plan.roofFormIntents)?plan.roofFormIntents.length:typeof plan.roofFormIntents,
   'array of one or two roof forms');
 if(Array.isArray(roofForms)){
  for(const [i,f] of roofForms.entries()){
   if(!f||typeof f!=='object')continue;
   const prefix=plan.roofFormIntents===undefined?'roofFormIntent':'roofFormIntents['+i+']';
   const base=['spaceId','profile','axis','rise'];
   const expected=f.profile==='sawtooth'?[...base,'toothWidth']:base;
   for(const key of base)if(!Object.hasOwn(f,key))
    issue(issues,prefix+'.'+key,'ROOF_REQUIRED_FIELD',undefined,'required');
   for(const key of Object.keys(f))if(!expected.includes(key))
    issue(issues,prefix+'.'+key,'ROOF_UNRECOGNIZED_FIELD',f[key],'not allowed for this profile');
   if(!['ridge','shed','sawtooth'].includes(f.profile))
    issue(issues,prefix+'.profile','ROOF_PROFILE_INVALID',f.profile,'ridge, shed, sawtooth');
   if(!['x','z'].includes(f.axis))
    issue(issues,prefix+'.axis','ROOF_AXIS_INVALID',f.axis,'x or z');
   if(!int(f.rise,2,5))
    issue(issues,prefix+'.rise','ROOF_RISE_INVALID',f.rise,'integer 2..5');
   if(f.profile==='sawtooth'&&!int(f.toothWidth,3,8))
    issue(issues,prefix+'.toothWidth','ROOF_TOOTH_WIDTH_INVALID',f.toothWidth,'integer 3..8');
   const room=plan.spaces.find(s=>s?.id===f.spaceId);
   if(room&&int(f.rise,2,5)&&room.height+f.rise>=plan.site?.height)
    issue(issues,prefix+'.rise','ROOF_SITE_CLEARANCE',f.rise,
     'room.height + rise must be less than site.height');
   if(room&&f.profile==='sawtooth'&&int(f.toothWidth,3,8)){
    const span=f.axis==='x'?room.width:f.axis==='z'?room.depth:undefined;
    if(typeof span==='number'&&span<2*f.toothWidth)
     issue(issues,prefix+'.toothWidth','ROOF_SAWTOOTH_SPAN',f.toothWidth,
      'selected roof axis span must be at least 2 * toothWidth');
   }
   if(!room)issue(issues,prefix+'.spaceId','ROOF_SPACE_NOT_FOUND',f.spaceId,
    'must refer to a room in spaces[]');
   else if(room.spatialRole==='open-court')
    issue(issues,prefix+'.spaceId','ROOF_OPEN_COURT_CONFLICT',f.spaceId,
     'roofed room cannot have spatialRole=open-court');
   else if(plan.formIntent?.spaceId===f.spaceId)
    issue(issues,prefix+'.spaceId','ROOF_FORM_FACET_CONFLICT',f.spaceId,
     'faceted formIntent and roofForm cannot be assigned to the same room');
  }
 }
 // Full input window bounds: expose the constraints rejected under
 // R190_SEMANTIC_GLAZING_OUT_OF_WALL without mutating any model fields.
 for(const [i,g] of (Array.isArray(plan.glazedOpenings)?plan.glazedOpenings:[]).entries()){
  if(!g||typeof g!=='object')continue;
  const r=plan.spaces.find(s=>s?.id===g.spaceId);
  if(!r||!faces.includes(g.face))continue;
  const span=['north','south'].includes(g.face)?r.width:r.depth;
  const widthGood=int(g.width,2,6),heightGood=int(g.height,2,4);
  if(!widthGood||!heightGood||!Number.isSafeInteger(g.offset)||
    !Number.isSafeInteger(g.baseY))continue;
  if(!(g.offset>=2&&g.offset+g.width<=span-2))
   issue(issues,'glazedOpenings['+i+']','GLAZING_OUT_OF_WALL_HORIZONTAL',
    {spaceId:g.spaceId,face:g.face,wallSpan:span,offset:g.offset,
     width:g.width,lastColumn:g.offset+g.width-1},
    {minOffset:2,maxOffset:span-2-g.width});
  if(!(g.baseY>=5&&g.baseY+g.height<=r.height-1))
   issue(issues,'glazedOpenings['+i+']','GLAZING_OUT_OF_WALL_VERTICAL',
    {spaceId:g.spaceId,roomHeight:r.height,baseY:g.baseY,height:g.height,
     upperExclusive:g.baseY+g.height},
    {minBaseY:5,maxBaseY:r.height-1-g.height});
 }
 const f=plan.entranceFace??'south';
 const entry=plan.spaces.find(s=>s?.id===plan.entrySpaceId);
 for(const [i,g] of (Array.isArray(plan.glazedOpenings)?plan.glazedOpenings:[]).entries()){
  if(!g||typeof g!=='object')continue;
  if(!entry||g.spaceId!==plan.entrySpaceId||g.face!==f||g.baseY!==5)continue;
  const span=['north','south'].includes(g.face)?entry.width:entry.depth;
  if(!Number.isSafeInteger(span))continue;
  const offset=Math.floor((span-2)/2);
  if(Number.isSafeInteger(g.offset)&&Number.isSafeInteger(g.width)&&
    !(g.offset+g.width<=offset||g.offset>=offset+2))
   issue(issues,'glazedOpenings['+i+']','GLAZING_ENTRY_DOOR_CONFLICT',
    {spaceId:g.spaceId,face:g.face,window:[g.offset,g.offset+g.width-1],door:[offset,offset+1],baseY:g.baseY},
    'window must not overlap the entry doorway interval on the entry face at baseY=5');
 }
 // Only geometrically valid original plans can be laid out. A successful
 // layout is read-only and contains the authentic deterministic room positions.
 // No model retry, host-side selection or world contact.
 try{
  validateR190SemanticPlan(plan);
  const layout=layoutR190SemanticPlan(plan);
  for(const [i,g] of (Array.isArray(plan.glazedOpenings)?plan.glazedOpenings:[]).entries()){
   const room=layout.spaces.find(s=>s.id===g.spaceId);
   if(!room)continue;
   const cells=r190GlazingCells(room,g);
   const conflicts=new Map();
   for(const cell of cells){
    const externalX=cell.x+cell.dx,externalZ=cell.z+cell.dz;
    for(const other of layout.spaces){
     if(other.id===g.spaceId)continue;
     if(externalX>=other.x&&externalX<other.x+other.w&&
       externalZ>=other.z&&externalZ<other.z+other.d){
      if(!conflicts.has(other.id))
       conflicts.set(other.id,{blockingRoomId:other.id,
        blockingRoomBounds:{x:other.x,z:other.z,width:other.w,depth:other.d},
        firstBlockedOutsideCell:{x:externalX,z:externalZ}});
     }
    }
   }
   if(conflicts.size)issue(issues,'glazedOpenings['+i+']','GLAZING_NOT_EXTERIOR',
    {window:{spaceId:g.spaceId,face:g.face,offset:g.offset,width:g.width},
     blockers:[...conflicts.values()]},
    'window must face exterior air beyond the authored room layout');
  }
 }catch{
  // Previously reported invalid input or no feasible placement: no
  // speculative exterior geometry is claimed.
 }
 return issues;
}

/** Read-only geometric choices; a model must independently select a slot.
 * Slots are spatially screened, NOT a promise of a successful B143 build.
 * This is a future two-stage authoring primitive, not auto-repair.
 */
export function r190E1WindowSlotCandidates(plan,{maxSlots=120,verifySource=false}={}){
 if(!int(maxSlots,1,120)||typeof verifySource!=='boolean')throw Error('E1_WINDOW_CATALOG_ARGUMENTS');
 const copy=structuredClone(plan);
 delete copy.glazedOpenings;
 // fail closed on invalid authored geometry; do not adjust its walls or roofs.
 validateR190SemanticPlan(copy);
 const layout=layoutR190SemanticPlan(copy);
 const slots=[];
 for(const s of copy.spaces){
  const room=layout.spaces.find(r=>r.id===s.id);
  if(!room||s.spatialRole==='open-court'||copy.formIntent?.spaceId===s.id||s.height<8)
   continue;
  for(const face of faces){
   // E1 window study scope: reserve the model-chosen entrance face.
   if(s.id===copy.entrySpaceId&&face===(copy.entranceFace??'south'))continue;
   const span=['north','south'].includes(face)?s.width:s.depth;
   for(const width of [2,3,4]){
    for(let offset=2;offset+width<=span-2;offset++){
     const slot={spaceId:s.id,face,offset,baseY:5,width,height:2};
     const cells=r190GlazingCells(room,slot);
     if(cells.some(c=>layout.spaces.some(other=>other.id!==s.id&&
       c.x+c.dx>=other.x&&c.x+c.dx<other.x+other.w&&
       c.z+c.dz>=other.z&&c.z+c.dz<other.z+other.d)))continue;
     slots.push({slotId:'win-'+String(slots.length+1).padStart(4,'0'),
      ...slot});
    }
   }
  }
 }
 const all=slots.length;
 // Deterministic sampling across the full space of eligible real faces,
 // rather than proposing a single default template window.
 const selected=all>maxSlots?
  Array.from({length:maxSlots},(_,i)=>slots[Math.floor(i*(all-1)/Math.max(1,maxSlots-1))]):
  slots;
 const rejectReasons={},rejectExamples=[];
 const verified=verifySource?selected.filter(slot=>{
  try{
   const candidate={...copy,glazedOpenings:[{
    spaceId:slot.spaceId,face:slot.face,offset:slot.offset,
    baseY:slot.baseY,width:slot.width,height:slot.height
   }]};
   const compiled=compileR190SemanticPlan(candidate);
   if(compiled.audit?.glazedOpenings?.length===1&&compiled.worldWrites===0)
    return true;
   const reason='SOURCE_AUDIT_INCOMPLETE';
   rejectReasons[reason]=(rejectReasons[reason]??0)+1;
   if(rejectExamples.length<8)rejectExamples.push({slotId:slot.slotId,
    spaceId:slot.spaceId,face:slot.face,reason});
  }catch(e){
   const reason=String(e?.message??e).slice(0,140);
   rejectReasons[reason]=(rejectReasons[reason]??0)+1;
   if(rejectExamples.length<8)rejectExamples.push({slotId:slot.slotId,
    spaceId:slot.spaceId,face:slot.face,reason});
  }
  return false;
 }):selected;
 return {schema:'r190-e1-read-only-window-catalog-v1',
  authorship:'MODEL_MUST_SELECT_SLOTS',readOnly:true,modelRequests:0,
  worldWrites:0,totalPossibleSlots:all,
  sourceChecked:verifySource,slots:verified,
  testedRepresentativeSlots:selected.length,verifiedWindowSlots:verified.length,
  rejectedSourceReasonCounts:rejectReasons,
  rejectedSourceExamples:rejectExamples,
  exhaustiveSourceWindowCheck:verifySource&&all<=maxSlots,
  limitNote:all>maxSlots?'Representative deterministic sample; zero certified sampled slots DOES NOT prove no possible windows':null};
}

export function diagnoseR190E1SavedDirectory(directory){
 if(typeof directory!=='string'||!path.isAbsolute(directory))throw Error('E1_DIAG_ABSOLUTE_DIRECTORY_REQUIRED');
 const summaryPath=path.join(directory,'E1_STUDY_REPORT.json');
 const summary=JSON.parse(fs.readFileSync(summaryPath,'utf8'));
 if(summary.schema!=='r190-e1-three-use-source-comparison-v1')
  throw Error('E1_DIAG_INVALID_REPORT_SCHEMA');
 const rows=[];
 for(const row of summary.rows){
  if(!['modern-home','flower-shop','research-lab'].includes(row.id))
   throw Error('E1_DIAG_UNEXPECTED_USE_ID');
  const dir=path.join(directory,row.id,'model'),rawFile=path.join(dir,'MODEL_RESPONSE_ORIGINAL.txt');
  if(!fs.existsSync(rawFile)){
   rows.push({id:row.id,reason:row.reason??null,rawAvailable:false,issues:[],originalSha256Verified:false,
    note:'Original absent; cannot diagnose JSON (do not infer)'});continue;
  }
  const raw=fs.readFileSync(rawFile,'utf8'),hash=createHash('sha256').update(raw).digest('hex');
  const shaMatches=hash===row.originalResponseSha256;
  let plan,issues,parseError=null;
  try{plan=JSON.parse(raw);issues=diagnoseR190E1Plan(plan);}
  catch(e){parseError=String(e?.message??e);issues=[];}
  rows.push({id:row.id,reason:row.reason??null,rawAvailable:true,
   originalSha256Verified:shaMatches,originalSha256:hash,issues,
   parseError, note:parseError?'JSON parse failed':issues.length?
    'Diagnostic issues are explanations only; original remains unchanged':
    'No cause found in diagnostic subset; full engine HOLD still authoritative'});
 }
 return {schema:'r190-e1-read-only-diagnosis-v1',runDirectory:directory,
  sourceCompiledCount:summary.sourceCompiledCount,
  readsOnly:true,modelRequests:0,worldWrites:0,checksArePartial:true,rows};
}
function main(args){
 if(args.length!==1)throw Error('Usage: node scripts/r190-e1-diagnose.mjs ABSOLUTE_E1_STUDY_FOLDER');
 const result=diagnoseR190E1SavedDirectory(path.resolve(args[0]));
 console.log('E1 ORIGINAL read-only diagnosis; no model request, no world activity');
 console.log('Source compiled: '+result.sourceCompiledCount+'/3');
 for(const row of result.rows){
  console.log('\n'+row.id+' / '+String(row.reason)+' / SHA verified: '+row.originalSha256Verified);
  for(const x of row.issues)
   console.log('  '+x.where+' '+x.rule+': '+JSON.stringify(x.actual)+'; expected '+JSON.stringify(x.expected));
  if(!row.issues.length)console.log('  '+row.note);
 }
 console.log('\nDiagnoses are partial; original engine HOLD status unchanged.');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{main(process.argv.slice(2));}
 catch(e){console.error(String(e?.message??e));process.exitCode=2;}
}
