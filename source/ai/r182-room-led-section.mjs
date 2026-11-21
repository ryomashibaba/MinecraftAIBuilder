/**
 * R182: model-declared room-focused roof sections, independent of building use.
 * A stepped upper envelope REPLACES the flat/legacy cap in ACTUAL B143 cells;
 * it cannot replace the source's rooms, furniture, connectivity or safety gates.
 *
 * R181 is still the only base massing grammar. This is NOT arbitrary
 * architecture and NOT a genuine local-LLM result.
 */
import {createHash} from 'node:crypto';
import {parseR181CourtyardGraphReply,R181_SCHEMA}
 from './r181-courtyard-graph.mjs';
import {compileDesign,verifyCompiled}
 from './b143-building-dsl.mjs';
import {auditR125SourceRoutes}
 from './r125-source-routes.mjs';

export const R182_SCHEMA='minecraftaibuilder-r182-room-led-section-v1';
const fail=s=>{throw Error('R182_ROOM_SECTION_'+s);};
const only=(x,keys)=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&
 Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
const k=(x,y,z)=>x+','+y+','+z;
const sha=raw=>createHash('sha256').update(raw).digest('hex');
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},worldContacts:0,worldWrites:0});

export const R182_MODEL_INSTRUCTIONS=[
 'Opt-in model reply: use R181 top-level keys plus roofSections.',
 'roofSections keys exactly schema,supersedesLegacyRoofProfile,sections.',
 'schema=minecraftaibuilder-r182-room-led-section-v1.',
 'supersedesLegacyRoofProfile must be true. This explicitly supersedes',
 'the old form.roofProfile only for the 3 model-declared roof sections.',
 'Three sections, exactly one per declared volume. Each has keys',
 'volumeId,raisedRoomId,highSide,breakZ,rise,insetX.',
 'highSide is front/rear; roomId must match that side of anchor,',
 'or must be the sole room in a satellite. No generic use templates.',
 'breakZ splits front/rear depth, rise 2..3, insetX 1..2.',
 'This is a bounded 32x32 three-volume geometry research gate.',
 'Invalid architectural intent is rejected without host re-targeting.',
 'Minecraft world operations and automatic approval are forbidden.'
].join('\n');

export function parseR182RoomSectionReply(raw,request){
 if(typeof raw!=='string'||raw.length<30||raw.length>26000)
  fail('RAW_CONTRACT');
 let r;try{r=JSON.parse(raw)}catch{fail('INVALID_JSON')}
 if(!only(r,['id','title','footprint','materials','layout','form',
  'objects','relations','architecture','roofSections']))
  fail('TOP_LEVEL_FIELDS');
 const req=r.roofSections;
 if(!only(req,['schema','supersedesLegacyRoofProfile','sections'])||
  req.schema!==R182_SCHEMA||req.supersedesLegacyRoofProfile!==true||
  !Array.isArray(req.sections)||req.sections.length!==3)
  fail('ROOF_SECTION_CONTRACT');
 const baseReply=structuredClone(r);
 delete baseReply.roofSections;
 if(baseReply.architecture.schema!==R181_SCHEMA)
  fail('R181_BASE_REQUIRED');
 // The authoritative physical volumes, room assignments and connectivity
 // are validated by the previous independently verified source module.
 const base=parseR181CourtyardGraphReply(JSON.stringify(baseReply),request);
 const previous=base.designOnlySource;
 if(!verifyCompiled(previous.design,previous.compiled)||
  previous.r181GraphEvidence?.outdoorCourtReachableFromEntrance!==true)
  fail('UNVERIFIED_BASE_SOURCE');
 const byId=new Map(r.architecture.volumes.map(v=>[v.id,v]));
 const chosen=new Map();
 for(const q of req.sections){
  if(!only(q,['volumeId','raisedRoomId','highSide','breakZ','rise','insetX'])||
   typeof q.volumeId!=='string'||!byId.has(q.volumeId)||
   chosen.has(q.volumeId)||typeof q.raisedRoomId!=='string'||
   !['front','rear'].includes(q.highSide)||
   ![q.breakZ,q.rise,q.insetX].every(Number.isSafeInteger)||
   q.rise<2||q.rise>3||q.insetX<1||q.insetX>2)
   fail('SECTION_FIELDS');
  const v=byId.get(q.volumeId),rr=v.rect,zEnd=rr.z+rr.depth-1;
  if(v.roofY+q.rise>15||
   q.breakZ<rr.z+3||q.breakZ>zEnd-4||
   rr.width-2*q.insetX<7)
   fail('SECTION_OUT_OF_BOUNDS');
  if(v.roomIds.length===2?
   q.raisedRoomId!==v.roomIds[q.highSide==='front'?0:1]:
   q.raisedRoomId!==v.roomIds[0])
   fail('SECTION_ROOM_AUTHORED_INTENT');
  chosen.set(q.volumeId,q);
 }
 if(chosen.size!==3)fail('SECTION_COVERAGE');
 const originalElements=previous.design.elements;
 const transformed=[];
 const add=(id,mode,material,origin,size)=>transformed.push({
  id,shape:'box',mode,...(mode==='add'?{material}:{}),origin,size
 });
 const added=[];
 const roofMaterial=r.materials.roof,wallMaterial=r.materials.wall;
 // Keep source element ordering: replace a real physical roof where it
 // originally existed, before all gallery cuts and before all furniture.
 for(const e of originalElements){
  const v=byId.get(e.id.replace(/-roof$/,''));
  if(v&&e.id===v.id+'-roof'){
   const sec=chosen.get(v.id),rect=v.rect;
   const {x,z,width,depth}=rect;
   const end=z+depth-1,xEnd=x+width-1,baseY=v.roofY;
   const highStart=sec.highSide==='front'?z:sec.breakZ+1;
   const highEnd=sec.highSide==='front'?sec.breakZ:end;
   const lowStart=sec.highSide==='front'?sec.breakZ+1:z;
   const lowEnd=sec.highSide==='front'?end:sec.breakZ;
   const highDepth=highEnd-highStart+1,lowDepth=lowEnd-lowStart+1;
   const highX=x+sec.insetX,highWidth=width-2*sec.insetX;
   if(highDepth<4||lowDepth<4)fail('SECTION_MINIMUM_USABLE_DEPTH');
   const prefix=v.id+'-r182';
   add(prefix+'-low-roof','add',roofMaterial,[x,baseY,lowStart],
    [width,1,lowDepth]);
   add(prefix+'-high-roof','add',roofMaterial,
    [highX,baseY+sec.rise,highStart],[highWidth,1,highDepth]);
   // Side strips are real lower terraces, not painted labels.
   for(const [suffix,stripX] of [['left',x],['right',xEnd-sec.insetX+1]])
    add(prefix+'-terrace-'+suffix,'add',roofMaterial,
     [stripX,baseY,highStart],[sec.insetX,1,highDepth]);
   // Upper room-facing shell encloses the raised two-to-three-cell-high
   // clerestory, including an actual window facing the lower roof.
   for(const [suffix,wx] of [['west',highX],['east',highX+highWidth-1]])
    add(prefix+'-upper-'+suffix,'add',wallMaterial,
     [wx,baseY,highStart],[1,sec.rise,highDepth]);
   for(const [suffix,zFace] of [['front',highStart],['rear',highEnd]])
    add(prefix+'-upper-'+suffix,'add',wallMaterial,
     [highX+1,baseY,zFace],[highWidth-2,sec.rise,1]);
   const stepFace=sec.highSide==='front'?highEnd:highStart;
   add(prefix+'-clerestory-cut','cut',undefined,
    [highX+2,baseY+sec.rise-1,stepFace],
    [highWidth-4,1,1]);
   add(prefix+'-clerestory-glass','add','glass',
    [highX+2,baseY+sec.rise-1,stepFace],
    [highWidth-4,1,1]);
   added.push({volumeId:v.id,section:sec,
    highRoofY:baseY+sec.rise,stepFace,highX,highWidth,
    highStart,highEnd,lowStart,lowEnd});
  }else if([...byId.keys()].some(id=>e.id===id+'-ridge-step'||
   e.id===id+'-ridge-crest'||e.id.startsWith(id+'-saw-'))){
   // Explicit model opt-in supersedes the prior roof-profile grammar.
  }else transformed.push(e);
 }
 if(added.length!==3||transformed.length>160)
  fail('MISSING_ROOF_OR_ELEMENT_BUDGET');
 const design={...previous.design,elements:transformed};
 const compiled=compileDesign(design);
 if(!verifyCompiled(design,compiled))fail('B143_RECOMPILE');
 const cellBefore=new Map(previous.compiled.primitives.map(p=>
  [k(p[0],p[1],p[2]),p[3]]));
 const cellAfter=new Map(compiled.primitives.map(p=>
  [k(p[0],p[1],p[2]),p[3]]));
 const floorThreshold=Math.min(...r.architecture.volumes.map(v=>v.roofY));
 for(const [coord,material] of cellBefore)
  if(Number(coord.split(',')[1])<floorThreshold&&
   cellAfter.get(coord)!==material)
   fail('ORIGINAL_LOWER_ENVELOPE_OR_FURNITURE_CHANGED');
 // All three sections must be physically visible as roof, low terraces,
 // clear roof-height interior and clerestory glass, not merely metadata.
 for(const q of added){
  const v=byId.get(q.volumeId),y=v.roofY,high=q.highRoofY;
  const highX=q.highX+2;
  const sampleZ=q.highStart+2;
  const [left,right]=[v.rect.x,v.rect.x+v.rect.width-1];
  if(cellAfter.get(k(highX,high,sampleZ))!==
    cellAfter.get(k(highX,y,q.lowStart))||
   !cellAfter.has(k(left,y,sampleZ))||
   !cellAfter.has(k(right,y,sampleZ))||
   cellAfter.has(k(highX,y,sampleZ))||
   !cellAfter.has(k(q.highX,high-1,q.highStart))||
   !cellAfter.has(k(q.highX+q.highWidth-1,high-1,q.highEnd))||
   cellAfter.get(k(highX,high-1,q.stepFace))!==3)
   fail('STEP_ROOF_NOT_PRESENT_IN_TRUE_VOXELS');
 }
 const audited=auditR125SourceRoutes({
  ...previous,schema:'minecraftaibuilder-r125-plan-to-b143-result-v1',
  design,compiled,sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256},
  {featureTargets:previous.placements});
 if(audited.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  audited.zones.length!==4||
  audited.featureAccess.length!==r.objects.length||
  audited.zones.some(z=>!z.reachedFromEntrance)||
  audited.featureAccess.some(x=>!x.reachableFromEntrance))
  fail('ORIGINAL_ROOM_OR_FURNITURE_ROUTE_CHANGED');
 const court=previous.r181GraphEvidence.courtWitness;
 const courtyard=auditR125SourceRoutes({
  ...previous,schema:'minecraftaibuilder-r125-plan-to-b143-result-v1',
  design,compiled,sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256,
  program:[{...previous.program[0],
   zones:[...previous.program[0].zones,
    {id:'r182-public-court',range:{x:[court[0],court[0]+1],z:[court[2],court[2]]}}]}]});
 if(courtyard.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  !courtyard.zones.find(z=>z.id==='r182-public-court')?.reachedFromEntrance)
  fail('OUTDOOR_COURT_ROUTE_CHANGED');
 if(compiled.geometrySha256===previous.geometrySha256)
  fail('NO_PHYSICAL_SILHOUETTE_CHANGE');
 const result={...previous,design,compiled,
  sourceSha256:compiled.sourceSha256,geometrySha256:compiled.geometrySha256,
  sourceRouteAudit:audited,r182SectionEvidence:{
   schema:R182_SCHEMA,authorship:'CALLER_PROVIDED_UNVERIFIED',
   baseSourceSha256:previous.sourceSha256,
   explicitModelRoofIntent:structuredClone(req),
   trueVoxelSectionWitnesses:added,
   buildingShellsWithRaisedCeilings:3,
   changedRealGeometry:true,
   roomFurnitureAndCourtRoutesSourceVerified:true,
   roofRiseByVolume:added.map(a=>[a.volumeId,a.section.rise]),
   supersededRoofProfile:r.form.roofProfile,
   aestheticStatus:'ART_HOLD',realModelCalls:0,
   minecraftWalking:'NOT_TESTED',worldWrites:0},
  ...safe()};
 return {schema:'minecraftaibuilder-r182-source-only-section-review-v1',
  originalRawString:raw,originalRawSha256:sha(raw),
  modelAuthenticity:'CALLER_PROVIDED_UNVERIFIED',
  parsedCallerInput:r,designOnlySource:result,
  sourceOnly:true,modelCalls:0,...safe()};
}
