/**
 * R125 V4D PRIVATE, OFFLINE, syntax/IR/architecture-source diagnostic.
 *
 * Read only parsed model JSON. Report ONLY allowlisted boolean/count/code
 * evidence, NEVER authored labels, prompts, IDs, JSON values or source paths.
 * A plausible author plan is NOT a successful B143 or architectural ART proof.
 */
import {COMPACT_SCHEMA} from '../source/ai/r125-v4d-compact-model-ir.mjs';
import {RELATIVE_SCHEMA} from '../source/ai/r125-v4d-relative-author-ir.mjs';

export const DIAGNOSTIC_SCHEMA='minecraftaibuilder-v4d-private-model-structural-diagnostic-v1';
const ROOT_COMPACT=['schema','id','title','brief','materials','spaces'];
const ROOT_DETAILED=['schema','id','title','brief','materials','spaces','entry','extraLinks'];
const SPACE_COMPACT=['id','purpose','kind','width','depth','roof','height','facade','windowSide','feature','featureMaterial','attach'];
const SPACE_DETAILED=['id','purpose','kind','width','depth','roof','facade','shelter','windows','fixture'];
const enumSet=(arr,value)=>arr.includes(value);
const record=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const between=(v,a,b)=>Number.isSafeInteger(v)&&v>=a&&v<=b;
const blank=(contract,format='VALID_JSON')=>({
 schema:DIAGNOSTIC_SCHEMA,
 format,contract,
 missingTopLevelKeyCount:0,unexpectedTopLevelKeyCount:0,
 spacesProvided:null,coveredSpaceCount:0,openPublicSpaceCount:0,
 roofTypeDecisionCount:0,
 windowsDeclaredCount:0,
 modelNamedFunctionCount:0,
 authorParentAttachmentCount:0,
 issues:[],
 sourceModelCalls:0,
 diagnosticOnly:true,
 sourcePassNotInferred:true,
 artApproved:false,
 privateStringsIncluded:false
});
const MAX_ISSUES=24;
function add(report,code,index=null){
 if(report.issues.some(i=>i.code===code&&i.spaceIndex===index))return;
 if(report.issues.length>=MAX_ISSUES)return;
 report.issues.push({code,spaceIndex:index});
}
function keyCounts(source,expected){
 const existing=Object.keys(source);
 return {
  missing:expected.filter(k=>!Object.hasOwn(source,k)).length,
  unexpected:existing.filter(k=>!expected.includes(k)).length
 };
}
function safeName(value){return typeof value==='string'&&/^[a-z][a-z0-9-]{2,34}$/.test(value);}
function safeProse(value){return typeof value==='string'&&value.length>=3&&value.length<=150&&
 !/[\u0000-\u001f<>]/.test(value);}
const opposite={east:'west',west:'east',south:'north',north:'south'};
const dirs=['north','south','east','west'];
export function diagnosePrivateV4DAuthor(author,contract){
 if(![COMPACT_SCHEMA,RELATIVE_SCHEMA].includes(contract))
  throw Error('V4D_DIAG_UNRECOGNIZED_CONTRACT');
 const r=blank(contract);
 if(!record(author)){
  add(r,'TOP_LEVEL_NOT_OBJECT');return r;
 }
 const compact=contract===COMPACT_SCHEMA;
 const top=keyCounts(author,compact?ROOT_COMPACT:ROOT_DETAILED);
 r.missingTopLevelKeyCount=top.missing;
 r.unexpectedTopLevelKeyCount=top.unexpected;
 if(top.missing||top.unexpected)add(r,'TOP_LEVEL_FIELDS');
 if(author.schema!==contract)add(r,'CONTRACT_SCHEMA');
 if(!safeName(author.id))add(r,'ARCHITECTURE_IDENTIFIER_FORMAT');
 if(!safeProse(author.title)||!safeProse(author.brief))
  add(r,'ARCHITECTURE_DESCRIPTION_INVALID');
 if(!record(author.materials)||Object.keys(author.materials).length!==4||
  !['floor','wall','roof','public'].every(k=>Object.hasOwn(author.materials,k))){
  add(r,'GLOBAL_MATERIAL_FIELDS');
 }else if(!['wood','stone','concrete'].includes(author.materials.floor)||
  !['wood','stone','concrete','metal'].includes(author.materials.wall)||
  !['wood','stone','concrete','metal'].includes(author.materials.roof)||
  !['stone','concrete','accent'].includes(author.materials.public)){
  add(r,'GLOBAL_MATERIAL_VALUE');
 }
 if(!Array.isArray(author.spaces)){
  add(r,'SPACES_NOT_ARRAY');return r;
 }
 r.spacesProvided=author.spaces.length;
 if(author.spaces.length<3||author.spaces.length>5)add(r,'SPACES_COUNT_OUT_OF_RANGE');
 const found=new Set(),used=new Set(),connectedSides=new Map();
 for(const [i,space] of author.spaces.entries()){
  if(i>=6){add(r,'EXCESS_SPACES_NOT_INSPECTED');break;}
  if(!record(space)){add(r,'SPACE_NOT_OBJECT',i);continue;}
  const required=compact?SPACE_COMPACT:[...SPACE_DETAILED,...(i?['attach']:[])];
  const counts=keyCounts(space,required);
  if(counts.missing||counts.unexpected)add(r,'SPACE_FIELD_SHAPE',i);
  if(!safeName(space.id)||used.has(space.id))add(r,'SPACE_IDENTIFIER_FORMAT_OR_DUPLICATE',i);
  if(typeof space.id==='string')used.add(space.id);
  if(!safeProse(space.purpose))add(r,'SPACE_PURPOSE_INVALID',i);
  if(!between(space.width,18,30)||!between(space.depth,18,30))
   add(r,'SPACE_DIMENSION_RANGE',i);
  if(space.kind==='covered')r.coveredSpaceCount++;
  else if(space.kind==='sky')r.openPublicSpaceCount++;
  else add(r,'SPACE_KIND_INVALID',i);
  const isCovered=space.kind==='covered';
  if(compact){
   if(isCovered){
    if(!enumSet(['ridgeX','ridgeZ','shedX','shedZ'],space.roof)||
     !enumSet(['low','medium','high'],space.height))
      add(r,'ROOF_PROFILE_DECISION_INVALID',i);
    else r.roofTypeDecisionCount++;
    if(!enumSet(['glass','wall'],space.facade))add(r,'FACADE_DECISION_INVALID',i);
    if(!enumSet([...dirs,'none'],space.windowSide))
     add(r,'WINDOW_SIDE_INVALID',i);
    else if(space.windowSide!=='none')r.windowsDeclaredCount++;
   }else if(space.kind==='sky'){
    if(space.roof!==null||space.height!==null||space.facade!==null||
     space.windowSide!==null)add(r,'OPEN_SPACE_HAS_ENCLOSED_ROOF',i);
   }
   if(!safeProse(space.feature)||
    !enumSet(['wood','stone','metal','concrete','accent'],space.featureMaterial))
    add(r,'PROGRAM_FUNCTION_OR_MATERIAL_INVALID',i);
   else r.modelNamedFunctionCount++;
  }else{
   if(isCovered){
    if(!record(space.roof)||
     !['ridge','shed'].includes(space.roof.type)||
     !dirs.slice(0,0).concat(['x','z']).includes(space.roof.axis)||
     !between(space.roof.eaveY,10,15)||
     !between(space.roof.peakY,(space.roof.eaveY??-99)+3,23))
     add(r,'DETAILED_ROOF_INVALID',i);
    else r.roofTypeDecisionCount++;
    if(!enumSet(['wall','glass'],space.facade)||space.shelter!==null)
     add(r,'DETAILED_FACADE_OR_SHELTER_INVALID',i);
   }else if(space.kind==='sky'){
    if(space.roof!==null||space.facade!==null||!record(space.shelter))
     add(r,'DETAILED_OPEN_SKY_INVALID',i);
   }
   if(!Array.isArray(space.windows)||space.windows.length>2)
    add(r,'DETAILED_WINDOWS_INVALID',i);
   else{
    r.windowsDeclaredCount+=space.windows.length;
    for(const w of space.windows)
     if(!record(w)||!dirs.includes(w.side))
      add(r,'DETAILED_WINDOW_SIDE_INVALID',i);
   }
   if(!record(space.fixture)||!safeProse(space.fixture.purpose))
    add(r,'DETAILED_FUNCTION_INVALID',i);
   else r.modelNamedFunctionCount++;
  }
  if(i===0){
   if(space.kind!=='covered'||(compact?space.attach!==null:
    Object.hasOwn(space,'attach')))add(r,'FIRST_SPACE_MUST_BE_ENTRY',i);
   if(compact&&space.windowSide==='north')
    add(r,'ENTRY_WINDOW_CONFLICT',i);
  }else{
   const a=space.attach;
   const expect=compact?['to','side','shift']:['to','side','shift','doorOffset'];
   const bad=!record(a)||keyCounts(a,expect).missing>0||
    keyCounts(a,expect).unexpected>0||!found.has(a.to)||
    !dirs.includes(a.side)||!between(a.shift,compact?-3:-4,compact?3:4)||
    (!compact&&!between(a.doorOffset,2,14));
   if(bad)add(r,'PARENT_ATTACHMENT_INVALID',i);
   else{
    r.authorParentAttachmentCount++;
    const old=connectedSides.get(a.to)??new Set();
    old.add(a.side);connectedSides.set(a.to,old);
    const self=connectedSides.get(space.id)??new Set();
    self.add(opposite[a.side]);connectedSides.set(space.id,self);
    if(compact&&space.kind==='sky'&&
     author.spaces.slice(0,i).find(n=>record(n)&&n.id===a.to)?.kind!=='covered')
     add(r,'PUBLIC_SKY_NEEDS_COVERED_PARENT',i);
    if(!compact&&space.kind==='sky'&&record(space.shelter)&&
     space.shelter.edge!==opposite[a.side])
     add(r,'PUBLIC_SHELTER_EDGE_MISMATCH',i);
   }
  }
  if(typeof space.id==='string')found.add(space.id);
 }
 if(r.coveredSpaceCount<2||r.openPublicSpaceCount<1)
  add(r,'PROGRAM_REQUIRES_TWO_COVERED_AND_PUBLIC_OPEN_SPACE');
 // Check linked wall window directions after reading ALL attachments.
 author.spaces.slice(0,6).forEach((space,i)=>{
  if(!record(space)||typeof space.id!=='string')return;
  const usedSides=connectedSides.get(space.id)??new Set();
  if(compact){
   if(usedSides.has(space.windowSide))add(r,'WINDOW_ON_SHARED_PARTITION',i);
  }else if(Array.isArray(space.windows)){
   for(const w of space.windows)
    if(record(w)&&usedSides.has(w.side))
     add(r,'WINDOW_ON_SHARED_PARTITION',i);
  }
 });
 return r;
}
export function diagnosePrivateV4DInvalidJSON(contract){
 if(![COMPACT_SCHEMA,RELATIVE_SCHEMA].includes(contract))
  throw Error('V4D_DIAG_UNRECOGNIZED_CONTRACT');
 const report=blank(contract,'INVALID_JSON');
 add(report,'ORIGINAL_RESPONSE_NOT_JSON');
 return report;
}
