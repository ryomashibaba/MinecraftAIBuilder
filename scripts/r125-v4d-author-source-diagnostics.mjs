/**
 * R125 V4D PRIVATE, OFFLINE, syntax/IR/architecture-source diagnostic.
 *
 * Read only parsed model JSON. Report ONLY allowlisted boolean/count/code
 * evidence, NEVER authored labels, prompts, IDs, JSON values or source paths.
 * A plausible author plan is NOT a successful B143 or architectural ART proof.
 */
import {COMPACT_SCHEMA} from '../source/ai/r125-v4d-compact-model-ir.mjs';
import {RELATIVE_SCHEMA} from '../source/ai/r125-v4d-relative-author-ir.mjs';
import {RANKED_SCHEMA} from '../source/ai/r125-v4e-ranked-exterior-ir.mjs';
import {SECTIONED_SCHEMA} from '../source/ai/r125-v4e-sectioned-author-ir.mjs';
import {MASSING_SCHEMA} from '../source/ai/r125-v4e-massing-author-ir.mjs';
import {WING_SCHEMA} from '../source/ai/r125-v4e-wing-author-ir.mjs';
import {FLOORPLATE_SCHEMA} from '../source/ai/r125-v4f-floorplate-author-ir.mjs';
import {HEIGHT_SCHEMA} from '../source/ai/r125-v4g-height-author-ir.mjs';
import {MEZZANINE_SCHEMA} from '../source/ai/r125-v4h-mezzanine-author-ir.mjs';
import {CIVIC_ARCADE_SCHEMA} from '../source/ai/r125-v4j-civic-author-ir.mjs';

export const DIAGNOSTIC_SCHEMA='minecraftaibuilder-v4d-private-model-structural-diagnostic-v1';
const ROOT_COMPACT=['schema','id','title','brief','materials','spaces'];
const ROOT_SECTIONED=[...ROOT_COMPACT,'section'];
const ROOT_MASSING=[...ROOT_COMPACT,'massing'];
const ROOT_WING=[...ROOT_COMPACT,'massing','wing'];
const ROOT_FLOORPLATE=[...ROOT_WING,'floorplate'];
const ROOT_ATRIUM=[...ROOT_FLOORPLATE,'atrium'];
const ROOT_MEZZANINE=[...ROOT_ATRIUM,'mezzanine'];
const ROOT_CIVIC=[...ROOT_MEZZANINE,'arcade'];
const ROOT_DETAILED=['schema','id','title','brief','materials','spaces','entry','extraLinks'];
const SPACE_COMPACT=['id','purpose','kind','width','depth','roof','height','facade','windowSide','feature','featureMaterial','attach'];
const SPACE_RANKED=['id','purpose','kind','width','depth','roof','height','facade','windowPriority','feature','featureMaterial','attach'];
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
 if(![COMPACT_SCHEMA,RELATIVE_SCHEMA,RANKED_SCHEMA,SECTIONED_SCHEMA,MASSING_SCHEMA,WING_SCHEMA,FLOORPLATE_SCHEMA,HEIGHT_SCHEMA,MEZZANINE_SCHEMA,CIVIC_ARCADE_SCHEMA].includes(contract))
  throw Error('V4D_DIAG_UNRECOGNIZED_CONTRACT');
 const r=blank(contract);
 if(!record(author)){
  add(r,'TOP_LEVEL_NOT_OBJECT');return r;
 }
 const compact=contract===COMPACT_SCHEMA,sectioned=contract===SECTIONED_SCHEMA,
 massing=contract===MASSING_SCHEMA,winged=contract===WING_SCHEMA,
 floorplated=contract===FLOORPLATE_SCHEMA,heighted=contract===HEIGHT_SCHEMA,
  mezzanined=contract===MEZZANINE_SCHEMA,
   civic=contract===CIVIC_ARCADE_SCHEMA,
 ranked=contract===RANKED_SCHEMA||sectioned||massing||winged||floorplated||heighted||mezzanined||civic;
 const top=keyCounts(author,civic?ROOT_CIVIC:sectioned?ROOT_SECTIONED:
  mezzanined?ROOT_MEZZANINE:heighted?ROOT_ATRIUM:floorplated?ROOT_FLOORPLATE:winged?ROOT_WING:massing?ROOT_MASSING:
  (compact||ranked)?ROOT_COMPACT:ROOT_DETAILED);
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
  const required=ranked?SPACE_RANKED:compact?SPACE_COMPACT:[...SPACE_DETAILED,...(i?['attach']:[])];
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
  if(ranked){
   if(isCovered){
    if(!enumSet(['ridgeX','ridgeZ','shedX','shedZ'],space.roof)||
     !enumSet(['low','medium','high'],space.height))
      add(r,'ROOF_PROFILE_DECISION_INVALID',i);
    else r.roofTypeDecisionCount++;
    if(!enumSet(['glass','wall'],space.facade))add(r,'FACADE_DECISION_INVALID',i);
    if(!Array.isArray(space.windowPriority)||space.windowPriority.length!==4||
     new Set(space.windowPriority).size!==4||
     space.windowPriority.some(d=>!dirs.includes(d)))
     add(r,'RANKED_WINDOW_PRIORITY_INVALID',i);
    else r.windowsDeclaredCount++;
   }else if(space.kind==='sky'&&
    (space.roof!==null||space.height!==null||
     space.facade!==null||space.windowPriority!==null))
    add(r,'OPEN_SPACE_HAS_ENCLOSED_ROOF',i);
   if(!safeProse(space.feature)||
    !enumSet(['wood','stone','metal','concrete','accent'],space.featureMaterial))
    add(r,'PROGRAM_FUNCTION_OR_MATERIAL_INVALID',i);
   else r.modelNamedFunctionCount++;
  }else if(compact){
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
   if(space.kind!=='covered'||((compact||ranked)?space.attach!==null:
    Object.hasOwn(space,'attach')))add(r,'FIRST_SPACE_MUST_BE_ENTRY',i);
   if(compact&&space.windowSide==='north')
    add(r,'ENTRY_WINDOW_CONFLICT',i);
  }else{
   const a=space.attach;
   const expect=(compact||ranked)?['to','side','shift']:['to','side','shift','doorOffset'];
   const bad=!record(a)||keyCounts(a,expect).missing>0||
    keyCounts(a,expect).unexpected>0||!found.has(a.to)||
    !dirs.includes(a.side)||!between(a.shift,(compact||ranked)?-3:-4,(compact||ranked)?3:4)||
    (!compact&&!ranked&&!between(a.doorOffset,2,14));
   if(bad)add(r,'PARENT_ATTACHMENT_INVALID',i);
   else{
    r.authorParentAttachmentCount++;
    const old=connectedSides.get(a.to)??new Set();
    old.add(a.side);connectedSides.set(a.to,old);
    const self=connectedSides.get(space.id)??new Set();
    self.add(opposite[a.side]);connectedSides.set(space.id,self);
    if((compact||ranked)&&space.kind==='sky'&&
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
 // Section choices are checked as author intent only; no geometry is inferred
 // or corrected here. Detailed spatial collision is handled by true B143.
 if(sectioned){
  const s=author.section;
  if(!record(s)||keyCounts(s,['spaceId','corner','recessDepth']).missing||
     keyCounts(s,['spaceId','corner','recessDepth']).unexpected){
   add(r,'SECTION_AUTHOR_FIELDS');
  }else{
   if(!['NW','NE','SW','SE'].includes(s.corner))
    add(r,'SECTION_CORNER_INVALID');
   if(!between(s.recessDepth,5,6))
    add(r,'SECTION_DEPTH_INVALID');
   if(!author.spaces.some(v=>record(v)&&v.id===s.spaceId&&v.kind==='covered'))
    add(r,'SECTION_ROOM_NOT_COVERED');
  }
 }
 if(massing||winged||floorplated||heighted||mezzanined||civic){
  const v=author.massing;
  if(!record(v)||keyCounts(v,['spaceId','corner','cutWidth','cutDepth','publicAccessSide']).missing||
   keyCounts(v,['spaceId','corner','cutWidth','cutDepth','publicAccessSide']).unexpected)
   add(r,'PRIMARY_MASSING_AUTHOR_FIELDS');
  else {
   if(!['NW','NE','SW','SE'].includes(v.corner))add(r,'PRIMARY_MASSING_CORNER_INVALID');
   if(!between(v.cutWidth,7,10)||!between(v.cutDepth,7,10))add(r,'PRIMARY_MASSING_CUT_RANGE');
   if(!['X','Z'].includes(v.publicAccessSide))add(r,'PRIMARY_MASSING_PORTAL_SIDE_INVALID');
   if(!author.spaces.some(x=>record(x)&&x.id===v.spaceId&&x.kind==='covered'))
    add(r,'PRIMARY_MASSING_ROOM_NOT_COVERED');
  }
 }
 if(winged||floorplated||heighted||mezzanined||civic){
  const w=author.wing,expected=['spaceId','side','start','span','reach','roofY','purpose'];
  const fields=record(w)&&Object.hasOwn(w,'outline')?
   [...expected,'outline']:expected;
  if(!record(w)||keyCounts(w,fields).missing||keyCounts(w,fields).unexpected)
   add(r,'EXTERIOR_WING_AUTHOR_FIELDS');
  else {
   if(!dirs.includes(w.side))add(r,'EXTERIOR_WING_SIDE_INVALID');
   if(!between(w.start,3,12)||!between(w.span,10,18)||
    !between(w.reach,6,9)||!between(w.roofY,8,9))
    add(r,'EXTERIOR_WING_DIMENSIONS_INVALID');
   if(Object.hasOwn(w,'outline')&&
    (!Array.isArray(w.outline)||w.outline.length!==3||
     !between(w.reach,8,9)||w.outline.some(v=>!between(v,6,w.reach))||
     Math.max(...w.outline)!==w.reach||
     Math.min(...w.outline)>w.reach-2))
    add(r,'EXTERIOR_WING_CONTOUR_INVALID');
   if(!safeProse(w.purpose))add(r,'EXTERIOR_WING_PURPOSE_INVALID');
   if(!author.spaces.some(x=>record(x)&&x.id===w.spaceId&&x.kind==='covered'))
    add(r,'EXTERIOR_WING_ROOM_NOT_COVERED');
  }
 }
 if(floorplated||heighted||mezzanined||civic){
  const v=author.floorplate,fields=['spaceId','corner','width','depth'];
  if(!record(v)||keyCounts(v,fields).missing||keyCounts(v,fields).unexpected)
   add(r,'COVERED_FLOORPLATE_AUTHOR_FIELDS');
  else {
   if(!['NW','NE','SW','SE'].includes(v.corner))
    add(r,'COVERED_FLOORPLATE_CORNER_INVALID');
   if(!between(v.width,6,8)||!between(v.depth,6,8))
    add(r,'COVERED_FLOORPLATE_SIZE_INVALID');
   if(!author.spaces.some(s=>record(s)&&s.id===v.spaceId&&s.kind==='covered'))
    add(r,'COVERED_FLOORPLATE_SPACE_NOT_COVERED');
  }
 }
 if(heighted||mezzanined||civic){
  const v=author.atrium,fields=['spaceId','offsetX','offsetZ',
   'width','depth','lift','roofForm'];
  if(!record(v)||keyCounts(v,fields).missing||keyCounts(v,fields).unexpected)
   add(r,'TALL_ATRIUM_AUTHOR_FIELDS');
  else{
   if(!safeName(v.spaceId)||!author.spaces.some(s=>
    record(s)&&s.id===v.spaceId&&s.kind==='covered'))
    add(r,'TALL_ATRIUM_COVERED_ROOM_INVALID');
   if(!between(v.offsetX,3,7)||!between(v.offsetZ,3,7)||
    !between(v.width,10,16)||!between(v.depth,10,16)||
    !between(v.lift,7,11))
    add(r,'TALL_ATRIUM_SECTION_DIMENSION_INVALID');
   if(!['ridgeX','ridgeZ','shedX','shedZ'].includes(v.roofForm))
    add(r,'TALL_ATRIUM_ROOF_FORM_INVALID');
  }
 }
 if(mezzanined||civic){
  const m=author.mezzanine,fields=['side','stairLane','deckOffsetX',
   'deckWidth','rise','purpose'];
  if(!record(m)||keyCounts(m,fields).missing||keyCounts(m,fields).unexpected)
   add(r,'PUBLIC_MEZZANINE_AUTHOR_FIELDS');
  else{
   if(!['north','south'].includes(m.side)||
    !['west','east'].includes(m.stairLane))
    add(r,'PUBLIC_MEZZANINE_SIDE_OR_STAIR_LANE');
   if(!between(m.deckOffsetX,1,3)||!between(m.deckWidth,8,10)||
    !between(m.rise,6,8))
    add(r,'PUBLIC_MEZZANINE_AUTHOR_DIMENSIONS');
   if(!safeProse(m.purpose)||m.purpose.length<12||m.purpose.length>140)
    add(r,'PUBLIC_MEZZANINE_PURPOSE_INVALID');
  }
 }
 // Check linked wall window directions after reading ALL attachments.
 if(civic){
  const a=author.arcade,fields=['width','depth','setback','roofline',
   'postMaterial','roofMaterial','serviceMaterial','purpose'];
  if(!record(a)||keyCounts(a,fields).missing||keyCounts(a,fields).unexpected)
   add(r,'CIVIC_ARCADE_AUTHOR_FIELDS');
  else{
   if(![12,15].includes(a.width)||!between(a.depth,3,5)||
      !between(a.setback,0,1))add(r,'CIVIC_ARCADE_DIMENSIONS_INVALID');
   if(!Array.isArray(a.roofline)||a.roofline.length!==3||
      !a.roofline.every(x=>between(x,8,12))||
      a.roofline.every(x=>x===a.roofline[0]))
     add(r,'CIVIC_ARCADE_THREE_BAY_ROOFLINE_INVALID');
   if(!['stone','wood','concrete','metal','accent'].includes(a.postMaterial)||
      !['stone','wood','concrete','metal'].includes(a.roofMaterial)||
      !['stone','wood','concrete','metal','accent'].includes(a.serviceMaterial))
     add(r,'CIVIC_ARCADE_MATERIAL_INVALID');
   if(typeof a.purpose!=='string'||a.purpose.length<12||a.purpose.length>160||
      /[\u0000-\u001f<>]/.test(a.purpose))
     add(r,'CIVIC_ARCADE_PUBLIC_PURPOSE_INVALID');
  }
 }
 author.spaces.slice(0,6).forEach((space,i)=>{
  if(!record(space)||typeof space.id!=='string')return;
  const usedSides=connectedSides.get(space.id)??new Set();
  if(ranked){
   // A ranked set of authorized alternatives is NOT an actual glazed face.
   // The geometry resolver selects the FIRST proven exterior authorized face.
  }else if(compact){
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
 if(![COMPACT_SCHEMA,RELATIVE_SCHEMA,RANKED_SCHEMA,SECTIONED_SCHEMA,MASSING_SCHEMA,WING_SCHEMA,FLOORPLATE_SCHEMA,HEIGHT_SCHEMA,MEZZANINE_SCHEMA,CIVIC_ARCADE_SCHEMA].includes(contract))
  throw Error('V4D_DIAG_UNRECOGNIZED_CONTRACT');
 const report=blank(contract,'INVALID_JSON');
 add(report,'ORIGINAL_RESPONSE_NOT_JSON');
 return report;
}
