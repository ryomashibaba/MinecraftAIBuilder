/**
 * B198D: persistent human-approved natural-language architecture revisions.
 * Real LLM candidates NEVER modify the approved head. Explicit user approve
 * is the only operation that creates a new immutable source revision.
 * Every approved version remains undoable/redoable in the local project.
 *
 * This is a SOURCE DESIGN studio, not a Minecraft execution runtime.
 */
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {compileDesign,validateDesign,MAX_CELLS} from './b143-building-dsl.mjs';
import {proposeArchitecture} from './b198-natural-language-design.mjs';
import {inspectProtectedVoxelFidelity} from './b198b-architecture-quality.mjs';
import {critiqueArchitecture} from './b198c-spatial-critic.mjs';
export const SCHEMA='minecraftaibuilder-b198d-versioned-studio-v1';
const fail=s=>{throw Error('B198D_'+s)};
const ensure=(b,s)=>{if(!b)fail(s)};
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const K=(x,y,z)=>x+','+y+','+z;
const SAFETY=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,worldCoordinates:null,worldContacts:0,worldWrites:0,
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}});
const MAX_VERSIONS=40,MAX_EVENTS=150;
const copy=x=>structuredClone(x);
function inspectOldSourceOpenFloors(old,newScene){
 const present=new Set(newScene.primitives.map(p=>K(p[0],p[1],p[2])));
 const older=new Set(old.primitives.map(p=>K(p[0],p[1],p[2])));
 let checked=0,damaged=0;
 for(const [x,y,z] of old.primitives){
  let ok=true;
  for(let dx=0;dx<2;dx++)for(let dz=0;dz<2;dz++){
   const a=x+dx,c=z+dz;
   if(!older.has(K(a,y,c))||older.has(K(a,y+1,c))||
    older.has(K(a,y+2,c)))ok=false;
  }
  if(!ok)continue;checked++;
  for(let dx=0;dx<2;dx++)for(let dz=0;dz<2;dz++){
   const a=x+dx,c=z+dz;
   if(!present.has(K(a,y,c))||present.has(K(a,y+1,c))||
    present.has(K(a,y+2,c)))ok=false;
  }
  if(!ok)damaged++;
 }
 return {oldSourceClearFootprints:checked,
  damagedSourceClearFootprints:damaged,allPriorFloorsClear:damaged===0,
  realMinecraftWalkingNotCertified:true};
}
function inspectChange({before,after,protectedElementIds=[]}){
 const a=compileDesign(before),b=compileDesign(after);
 ensure(a.primitives.length<=MAX_CELLS&&b.primitives.length<=MAX_CELLS,'DSL_CAP_CHANGED');
 const clearance=inspectOldSourceOpenFloors(a,b);
 ensure(clearance.allPriorFloorsClear,'ORIGINAL_CLEARANCE_DAMAGED');
 let protectedVoxelProof=null;
 if(protectedElementIds.length){
  protectedVoxelProof=inspectProtectedVoxelFidelity({
   baseDesign:before,revisionDesign:after,protectedElementIds});
  ensure(protectedVoxelProof.exactProtectedVoxelPreservationPassed,
   'INDIRECT_PROTECTED_VOXEL_DESTRUCTION');
 }
 const critiqueBefore=critiqueArchitecture({design:before,compiled:a});
 const critiqueAfter=critiqueArchitecture({design:after,compiled:b});
 return {clearance,protectedVoxelProof,
  exactSourceVoxelDelta:b.primitives.length-a.primitives.length,
  oldCritic:critiqueBefore.objectiveAudit,
  proposedCritic:critiqueAfter.objectiveAudit,
  caveat:'Geometry only; no in-game motion, human semantic fidelity or visual beauty certified'};
}
function verifyState(state){
 ensure(state&&state.schema===SCHEMA,'INVALID_PROJECT_SCHEMA');
 ensure(Array.isArray(state.versions)&&state.versions.length>=1&&
  state.versions.length<=MAX_VERSIONS,'VERSION_HISTORY_CAP');
 const byId=new Map();
 for(const v of state.versions){
  ensure(typeof v.id==='string'&&!byId.has(v.id),'VERSION_DUPLICATE');
  validateDesign(v.design);
  const compiled=compileDesign(v.design);
  ensure(compiled.sourceSha256===v.sourceSha256,'VERSION_SHA_TAMPERED');
  ensure(v.parentId===null||byId.has(v.parentId),'VERSION_PARENT_INVALID');
  byId.set(v.id,v);
 }
 ensure(byId.has(state.headId),'INVALID_HEAD');
 ensure(Array.isArray(state.redoStack)&&state.redoStack.every(x=>byId.has(x)),
  'INVALID_REDO_STACK');
 ensure(Array.isArray(state.events)&&state.events.length<=MAX_EVENTS,
  'INVALID_EVENTS');
 ensure(state.safety?.readiness==='NOT_PREPARED'&&
  state.safety.constructionApproved===false&&
  state.safety.executionAllowed===false&&
  state.safety.worldContacts===0&&state.safety.worldWrites===0&&
  state.safety.worldCoordinates===null&&state.safety.gates?.length===9&&
  state.safety.gates.every(x=>x==='BLOCKED')&&
  state.safety.BuildPlan?.operations?.length===0,'WORLD_SAFETY_CORRUPTED');
 if(state.draft!==null){
  ensure(byId.has(state.draft.baseId),'ORPHAN_DRAFT');
  ensure(state.draft.baseId===state.headId,'DRAFT_ON_STALE_HEAD');
  validateDesign(state.draft.design);
  ensure(compileDesign(state.draft.design).sourceSha256===
   state.draft.sourceSha256,'DRAFT_TAMPERED');
 }
 return true;
}
function newEvent(type,detail={}){return {type,at:new Date().toISOString(),...detail};}
export function openArchitectureStudio({
 directory,initialDesign=null,generator=null
}={}){
 ensure(typeof directory==='string'&&directory.length>0,'DIRECTORY_REQUIRED');
 ensure(generator===null||typeof generator==='function','MODEL_ADAPTER_INVALID');
 const dir=path.resolve(directory),file=path.join(dir,'studio-state.json');
 fs.mkdirSync(dir,{recursive:true});
 let state;
 if(fs.existsSync(file)){
  const stat=fs.lstatSync(file);ensure(stat.isFile()&&!stat.isSymbolicLink(),
   'STATE_FILE_NOT_REGULAR');
  state=JSON.parse(fs.readFileSync(file,'utf8'));verifyState(state);
  if(initialDesign!==null){
   validateDesign(initialDesign);
   ensure(state.versions[0].sourceSha256===
    compileDesign(initialDesign).sourceSha256,'INITIAL_DOCUMENT_MISMATCH');
  }
 }else{
  ensure(initialDesign!==null,'NEW_STUDIO_NEEDS_STARTING_DESIGN');
  validateDesign(initialDesign);
  const sourceSha256=compileDesign(initialDesign).sourceSha256;
  const first={id:'v0001',parentId:null,sourceSha256,
   design:copy(initialDesign),createdAt:new Date().toISOString()};
  state={schema:SCHEMA,versions:[first],headId:first.id,redoStack:[],
   draft:null,events:[newEvent('STUDIO_CREATED',{version:first.id})],
   safety:SAFETY()};
  save();
 }
 let busy=false;
 function save(){
  verifyState(state);
  const temp=path.join(dir,'.b198d-write-'+randomUUID());
  try{
   fs.writeFileSync(temp,JSON.stringify(state,null,2)+'\n',
    {flag:'wx',mode:0o600});
   fs.renameSync(temp,file);
  }finally{
   if(fs.existsSync(temp))fs.rmSync(temp,{force:true});
  }
 }
 function addEvent(type,details={}){
  state.events.push(newEvent(type,details));
  state.events=state.events.slice(-MAX_EVENTS);
 }
 const head=()=>state.versions.find(v=>v.id===state.headId);
 function cleanSummary(){
  const h=head();
  return {schema:SCHEMA,headId:state.headId,
   approvedHeadSha256:h.sourceSha256,
   approvedDesign:copy(h.design),
   versionHistory:state.versions.map(v=>({
    id:v.id,parentId:v.parentId,sourceSha256:v.sourceSha256,
    createdAt:v.createdAt,
    isHead:v.id===state.headId
   })),
   canUndo:h.parentId!==null,
   canRedo:state.redoStack.length>0,
   proposedDraft:state.draft===null?null:{
    id:state.draft.id,baseId:state.draft.baseId,
    sourceSha256:state.draft.sourceSha256,
    design:copy(state.draft.design),
    sourceDelta:copy(state.draft.review.sourceDelta),
    changeList:copy(state.draft.review.changeList),
    protectedElementIds:[...state.draft.protectedElementIds],
    reviewStatus:'AWAITING_EXPLICIT_HUMAN_APPROVAL',
    sourceOnly:true
   },
   requiresRealModel:generator===null,
   recentEvents:copy(state.events.slice(-20)),
   safety:copy(state.safety)};
 }
 async function propose({prompt,protectedElementIds=[],maxChangedElements=18}={}){
  ensure(!busy,'CONCURRENT_PROPOSAL_IN_PROGRESS');
  ensure(state.draft===null,'UNREVIEWED_DRAFT_MUST_BE_DECIDED');
  ensure(typeof generator==='function','REAL_MODEL_NOT_CONNECTED');
  ensure(typeof prompt==='string'&&prompt.length>=8&&prompt.length<=7000,
   'INVALID_REVISION_REQUEST');
  ensure(Array.isArray(protectedElementIds)&&
   new Set(protectedElementIds).size===protectedElementIds.length,
   'PROTECTED_IDS_INVALID');
  const current=copy(head()),oldHeadId=state.headId;
  busy=true;
  try{
   const output=await proposeArchitecture({
    prompt,generator,baseDesign:current.design,
    expectedBaseSha256:current.sourceSha256,
    protectedElementIds,maxChangedElements,
    allowRemovals:false,maxAttempts:2
   });
   ensure(state.headId===oldHeadId&&state.draft===null,'STALE_PROPOSAL_REJECTED');
   const proof=inspectChange({
    before:current.design,after:output.design,protectedElementIds});
   const proposalId='p-'+randomUUID();
   state.draft={id:proposalId,baseId:state.headId,
    sourceSha256:output.compiled.sourceSha256,
    design:copy(output.design),protectedElementIds:[...protectedElementIds],
    review:{sourceDelta:proof,changeList:output.review.revisionDiff,
     modelAttemptCount:output.review.attemptCount,
     realPlayerMotionNotCertified:true}};
   addEvent('PROPOSAL_REVIEW_REQUIRED',{proposal:proposalId,
    sourceSha256:output.compiled.sourceSha256});
   save();
   return cleanSummary();
  }finally{busy=false;}
 }
 function approve({draftId,expectedHeadSha256}={}){
  ensure(!busy,'CONCURRENT_PROPOSAL_IN_PROGRESS');
  ensure(state.draft!==null&&state.draft.id===draftId,'DRAFT_ID_MISMATCH');
  ensure(head().sourceSha256===expectedHeadSha256,
   'STALE_APPROVAL_REJECTED');
  ensure(state.draft.baseId===state.headId,'DRAFT_BASE_STALE');
  const parent=copy(head()),draft=state.draft;
  inspectChange({before:parent.design,after:draft.design,
   protectedElementIds:draft.protectedElementIds});
  ensure(state.versions.length<MAX_VERSIONS,'VERSION_CAP_REACHED');
  const version={id:'v'+String(state.versions.length+1).padStart(4,'0'),
   parentId:state.headId,createdAt:new Date().toISOString(),
   sourceSha256:draft.sourceSha256,design:copy(draft.design)};
  state.versions.push(version);state.headId=version.id;
  state.redoStack=[];state.draft=null;
  addEvent('HUMAN_APPROVED_SOURCE_REVISION',{version:version.id,
   parentId:parent.id,sourceSha256:version.sourceSha256});
  save();return cleanSummary();
 }
 function reject({draftId}={}){
  ensure(!busy,'CONCURRENT_PROPOSAL_IN_PROGRESS');
  ensure(state.draft?.id===draftId,'DRAFT_ID_MISMATCH');
  state.draft=null;addEvent('PROPOSAL_REJECTED',{draftId});
  save();return cleanSummary();
 }
 function undo(){
  ensure(!busy&&state.draft===null,'PENDING_REVIEW_OR_BUSY');
  const current=head();
  ensure(current.parentId!==null,'NO_PRIOR_VERSION');
  state.redoStack.push(current.id);state.headId=current.parentId;
  addEvent('UNDO_TO_PRIOR_APPROVED_SOURCE',{version:state.headId});
  save();return cleanSummary();
 }
 function redo(){
  ensure(!busy&&state.draft===null,'PENDING_REVIEW_OR_BUSY');
  ensure(state.redoStack.length>0,'NO_REDO_VERSION');
  const id=state.redoStack.at(-1);
  const next=state.versions.find(x=>x.id===id);
  ensure(next?.parentId===state.headId,'REDO_BRANCH_NO_LONGER_APPLIES');
  state.redoStack.pop();state.headId=id;
  addEvent('REDO_RESTORED_APPROVED_SOURCE',{version:id});
  save();return cleanSummary();
 }
 function getStatus(){verifyState(state);return cleanSummary();}
 function getHistorySource(id){
  const v=state.versions.find(x=>x.id===id);
  ensure(v,'UNKNOWN_VERSION');return copy(v.design);
 }
 return {getStatus,propose,approve,reject,undo,redo,getHistorySource,
  storagePath:file};
}
