/**
 * MinecraftAIBuilder V6 - private original, read-only spatial witness.
 * No network, no Ollama API, no inference, no Minecraft, no file mutations.
 * Prints only allowlisted structural counts/categories. For local use only.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';

const PINNED_HEAD='1e336a991d4f817dc3a08eb67d424434aa859fb6';
const TARGET_PROMPT='d97831b3b0fcdd3af8675799a64e3e9e3842d5dd7bb124f692032fe880255111';
const SIDES=['north','east','south','west'];
const report=(status,details={})=>{
 console.log(JSON.stringify({status,modelGenerationAttempts:0,worldWrites:0,
  networkCalls:0,privateRawTextIncluded:false,...details},null,2));
};
const hold=reason=>{throw Error(reason)};
const isFile=p=>{try{const s=fs.lstatSync(p);return s.isFile()&&!s.isSymbolicLink()}catch{return false}};
const isDir=p=>{try{const s=fs.lstatSync(p);return s.isDirectory()&&!s.isSymbolicLink()}catch{return false}};
function findSource(base){
 const root=path.join(base,'MinecraftAIBuilder','OfflineReview');
 if(!isDir(root))hold('LOCAL_OFFLINE_SOURCE_NOT_FOUND');
 for(const d of fs.readdirSync(root,{withFileTypes:true}).sort((a,b)=>b.name.localeCompare(a.name))){
  if(!d.isDirectory()||!/^source-[A-Za-z0-9-]+$/.test(d.name))continue;
  const src=path.join(root,d.name);
  try{
   const sha=execFileSync('git.exe',['-C',src,'rev-parse','HEAD'],{encoding:'utf8',timeout:5000,windowsHide:true}).trim();
   if(sha!==PINNED_HEAD)continue;
   const dirty=execFileSync('git.exe',['-C',src,'status','--porcelain'],{encoding:'utf8',timeout:5000,windowsHide:true}).trim();
   if(dirty)continue;
   return src;
  }catch{continue}
 }
 hold('EXACT_HEAD_CLEAN_LOCAL_SOURCE_NOT_FOUND');
}
function findStudy(base){
 const root=path.join(base,'MinecraftAIBuilder','PrivateModelStudies');
 if(!isDir(root))hold('PRIVATE_ROOT_NOT_FOUND');
 const stack=[root],found=[];
 let scanned=0;
 while(stack.length){
  if(++scanned>5000)hold('PRIVATE_DIR_SCAN_LIMIT');
  const dir=stack.pop();
  for(const item of fs.readdirSync(dir,{withFileTypes:true})){
   if(item.isDirectory())stack.push(path.join(dir,item.name));
   if(!item.isFile()||item.name!=='V4D_LOCAL_AUTHOR_REPORT.json')continue;
   const p=path.join(dir,item.name);
   try{
    if(!isFile(p)||fs.statSync(p).size>400000)continue;
    const meta=JSON.parse(fs.readFileSync(p,'utf8'));
    if(meta.systemPromptSha256!==TARGET_PROMPT||meta.modelCalls!==1||meta.testInjectionPresent!==false||
      meta.promptProtocol!=='V4J_SINGLE_RESPONSE_AUTHOR_PARENT_INDEX_V6'||
      !/^R125_V4E_RANKED_NO_AUTHORED_EXTERIOR_OPTION_([0-4])$/.test(meta.reason??''))continue;
    const rawPath=path.join(dir,'MODEL_RESPONSE_ORIGINAL.txt');
    if(!isFile(rawPath)||fs.statSync(rawPath).size>250000)continue;
    found.push({meta,rawPath});
   }catch{/* other private studies do not matter */}
  }
 }
 if(found.length!==1)hold(found.length===0?'MATCHING_PRIVATE_STUDY_NOT_FOUND':'AMBIGUOUS_MATCHING_PRIVATE_STUDIES');
 return found[0];
}
function rangesOverlap(a,b,c,d){return Math.max(a,c)<=Math.min(b,d)}
const endX=n=>n.x+n.width-1,endZ=n=>n.z+n.depth-1;
// Exact public R125 V4E faceTouches predicate, as audited at PINNED_HEAD.
function faceTouches(room,other,side){
 if(side==='east')return (other.x===endX(room)||other.x===endX(room)+1||
  (other.x<endX(room)&&endX(other)>=endX(room)))&&
  rangesOverlap(room.z,endZ(room),other.z,endZ(other));
 if(side==='west')return (endX(other)===room.x||endX(other)===room.x-1||
  (other.x<=room.x&&endX(other)>room.x))&&
  rangesOverlap(room.z,endZ(room),other.z,endZ(other));
 if(side==='south')return (other.z===endZ(room)||other.z===endZ(room)+1||
  (other.z<endZ(room)&&endZ(other)>=endZ(room)))&&
  rangesOverlap(room.x,endX(room),other.x,endX(other));
 if(side==='north')return (endZ(other)===room.z||endZ(other)===room.z-1||
  (other.z<=room.z&&endZ(other)>room.z))&&
  rangesOverlap(room.x,endX(room),other.x,endX(other));
 hold('BAD_SIDE');
}
function centerSixClear(room,other,side){
 const len=(side==='east'||side==='west')?room.depth:room.width;
 const offset=Math.floor((len-6)/2);
 if(side==='east'||side==='west'){
  const face=side==='east'?endX(room):room.x;
  const outside=side==='east'?face+1:face-1;
  const xLo=Math.min(face,outside),xHi=Math.max(face,outside);
  return !(rangesOverlap(other.x,endX(other),xLo,xHi)&&
    rangesOverlap(other.z,endZ(other),room.z+offset,room.z+offset+5));
 }
 const face=side==='south'?endZ(room):room.z;
 const outside=side==='south'?face+1:face-1;
 const zLo=Math.min(face,outside),zHi=Math.max(face,outside);
 return !(rangesOverlap(other.z,endZ(other),zLo,zHi)&&
   rangesOverlap(other.x,endX(other),room.x+offset,room.x+offset+5));
}
function linkedSide(plan,nodeId,side){
 const reverse={north:'south',south:'north',east:'west',west:'east'};
 return plan.links.some(l=>(l.from===nodeId&&l.side===side)||
  (l.to===nodeId&&reverse[l.side]===side));
}
async function main(){
 if(process.platform!=='win32')hold('WINDOWS_ONLY');
 const appdata=process.env.LOCALAPPDATA;
 if(!appdata||!isDir(appdata))hold('LOCALAPPDATA_NOT_FOUND');
 const source=findSource(appdata);
 const {meta,rawPath}=findStudy(appdata);
 const raw=fs.readFileSync(rawPath,'utf8');
 if(createHash('sha256').update(raw).digest('hex')!==meta.responseRawSha256)hold('RAW_SHA256_MISMATCH');
 const author=JSON.parse(raw);
 const modules=[
  ['source/ai/r125-v4j-feasible-envelope.mjs','materializeV4JParentIndexAuthor'],
  ['source/ai/r125-v4d-compact-model-ir.mjs','translateCompactModelIntent'],
  ['source/ai/r125-v4d-relative-author-ir.mjs','translateRelativeAuthorIntent']
 ];
 const [a,b,c]=await Promise.all(modules.map(async ([p,key])=>{
  const m=await import(pathToFileURL(path.join(source,p)).href);
  if(typeof m[key]!=='function')hold('EXACT_SOURCE_EXPORT_UNAVAILABLE');
  return m[key];
 }));
 const expanded=a(author);
 // Exact V4E toBareCompact transformation; no authored geometry is changed.
 const ranked={schema:'minecraftaibuilder-r125-v4e-ranked-exterior-author-v1',
  id:expanded.id,title:expanded.title,brief:expanded.brief,
  materials:expanded.materials,spaces:expanded.spaces};
 const bare=structuredClone(ranked);
 bare.schema='minecraftaibuilder-r125-v4d-compact-spatial-intent-v1';
 bare.spaces=bare.spaces.map(s=>{
  const v={...s,windowSide:s.kind==='sky'?null:'none'};
  delete v.windowPriority;return v;
 });
 const mechanical=b(bare);
 const translated=c(mechanical.expandedMechanicalIR);
 const nodes=translated.plan.nodes;
 const idx=Number(meta.reason.slice(-1));
 const room=nodes[idx];
 if(!room||room.kind!=='covered'||room.id!==ranked.spaces[idx]?.id)hold('ROOM_OR_INDEX_NOT_VERIFIED');
 const hardBlocked=SIDES.filter(side=>(idx===0&&side==='north')||
  nodes.some((n,i)=>i!==idx&&faceTouches(room,n,side)));
 if(hardBlocked.length!==4)hold('RANKED_REJECTION_NOT_REPRODUCED');
 const centerOpen=SIDES.filter(side=>!(idx===0&&side==='north')&&
  nodes.every((n,i)=>i===idx||centerSixClear(room,n,side)));
 const centerNonlinked=centerOpen.filter(side=>!linkedSide(translated.plan,room.id,side));
 const possibleOverblock=centerNonlinked.filter(side=>hardBlocked.includes(side));
 report('EXACT_ORIGINAL_REJECT_WITNESS_CONFIRMED',{
  verifiedExactGitHead:PINNED_HEAD,
  originalRawSHA256:'MATCH',
  failedRoomIndex:idx,
  countedRooms:nodes.length,
  blockedFullFacadeDirections:hardBlocked.length,
  centerSixGeometricallyClearDirections:centerOpen.length,
  centerSixClearAndNotLinkedDirections:centerNonlinked.length,
  potentialPartialFacadeOverrejectDirections:possibleOverblock.length,
  interpretation:possibleOverblock.length>0?
   'POTENTIAL_HOST_WHOLE_SIDE_OVERBLOCK_REQUIRES_TRUE_B143_PROOF':
   'NO_CENTERED_SIX_WIDE_NONLINKED_FACE_IN_THIS_SOURCE',
  trueB143Recompiled:false,
  structuralAndArtApproval:false,
  newModelInferenceAuthorized:false
 });
}
main().catch(e=>{
 const allow=new Set(['WINDOWS_ONLY','LOCALAPPDATA_NOT_FOUND','LOCAL_OFFLINE_SOURCE_NOT_FOUND',
 'EXACT_HEAD_CLEAN_LOCAL_SOURCE_NOT_FOUND','PRIVATE_ROOT_NOT_FOUND','PRIVATE_DIR_SCAN_LIMIT',
 'MATCHING_PRIVATE_STUDY_NOT_FOUND','AMBIGUOUS_MATCHING_PRIVATE_STUDIES','RAW_SHA256_MISMATCH',
 'EXACT_SOURCE_EXPORT_UNAVAILABLE','ROOM_OR_INDEX_NOT_VERIFIED','RANKED_REJECTION_NOT_REPRODUCED',
 'BAD_SIDE']);
 const reason=allow.has(e?.message)?e.message:'SOURCE_DIAGNOSTIC_UNVERIFIED';
 report('HOLD',{reason});process.exitCode=2;
});
