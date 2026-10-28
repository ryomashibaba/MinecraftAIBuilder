/**
 * R190-AD offline, advisory multi-issue inspection.
 * Lists independent source contradictions; NEVER edits a model plan and
 * NEVER substitutes for compileR190SemanticPlan's fail-closed validator.
 */
import {createHash} from 'node:crypto';
const H=s=>createHash('sha256').update(s,'utf8').digest('hex');
const dirs=['north','south','east','west'];
const isObject=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const integer=x=>Number.isSafeInteger(x);
const validId=x=>typeof x==='string'&&/^[a-z][a-z0-9-]{2,39}$/.test(x);
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,worldContacts:0,worldWrites:0,
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}});
export function diagnoseR190ADRaw(raw){
 const issues=[],add=(code,path,reason,related={})=>{
  if(issues.length<100)issues.push({code,path,reason,...related});
 };
 const report={schema:'minecraftaibuilder-r190ad-offline-diagnostics-v1',
  rawSha256:typeof raw==='string'?H(raw):null,
  rawBytes:typeof raw==='string'?Buffer.byteLength(raw,'utf8'):null,
  mode:'ADVISORY_MULTI_ISSUE_SOURCE_ONLY',modelCalls:0,
  originalUnmodified:true,sourceGeometryBuilt:false,
  errors:issues,completePhysicalFeasibilityCertified:false,
  noRepairAttempted:true,independentArtReview:'ART_HOLD',...safety()};
 if(typeof raw!=='string'||Buffer.byteLength(raw,'utf8')>120000){
  add('RAW_NOT_ACCEPTABLE','$','Expected a UTF-8 model response under 120000 bytes');
  return {...report,status:'SOURCE_DIAGNOSIS_INCOMPLETE',issueCount:issues.length};
 }
 let p;
 try{p=JSON.parse(raw)}catch{
  add('MALFORMED_JSON','$','Cannot parse the original text as JSON');
  return {...report,status:'SOURCE_DIAGNOSIS_INCOMPLETE',issueCount:issues.length};
 }
 if(!isObject(p)){
  add('INVALID_ROOT','$','Root must be an object');
  return {...report,status:'SOURCE_DIAGNOSIS_INCOMPLETE',issueCount:issues.length};
 }
 if(p.schema!=='minecraftaibuilder-r190-semantic-space-v1')
  add('SCHEMA_MISMATCH','schema','Expected the R190 semantic-space schema');
 const site=isObject(p.site)?p.site:{};
 for(const [name,lo,hi] of [['width',24,80],['depth',24,80],['height',10,32]])
  if(!integer(site[name])||site[name]<lo||site[name]>hi)
   add('SITE_DIMENSION_INVALID','site.'+name,`Must be an integer in [${lo}, ${hi}]`);
 if(integer(site.width)&&integer(site.depth)&&integer(site.height)&&
   site.width*site.depth*site.height>500000)
  add('SITE_VOLUME_OVER_BUDGET','site','Site volume exceeds 500000 cells');
 const spaces=Array.isArray(p.spaces)?p.spaces:[];
 if(spaces.length<3||spaces.length>6)
  add('SPACE_COUNT_INVALID','spaces','AD requires 3 to 6 spaces');
 const ids=new Map(),valid=[];
 for(let i=0;i<spaces.length;i++){
  const path=`spaces[${i}]`,s=spaces[i];
  if(!isObject(s)){add('SPACE_NOT_OBJECT',path,'Space is not an object');continue}
  if(!validId(s.id))add('SPACE_ID_INVALID',path+'.id','Expected a unique lower-case slug');
  if(ids.has(s.id))add('SPACE_ID_DUPLICATE',path+'.id','Duplicate space ID');
  else ids.set(s.id,{...s,index:i});
  if(!integer(s.width)||s.width<7||s.width>22)
   add('SPACE_WIDTH_INVALID',path+'.width','Width must be between 7 and 22');
  if(!integer(s.depth)||s.depth<7||s.depth>22)
   add('SPACE_DEPTH_INVALID',path+'.depth','Depth must be between 7 and 22');
  if(!integer(s.height)||s.height<7||s.height>30)
   add('SPACE_HEIGHT_INVALID',path+'.height','Height must be between 7 and 30');
  if(integer(s.height)&&integer(site.height)&&s.height>site.height-2)
   add('SPACE_EXCEEDS_SITE_CLEARANCE',path+'.height',
    'Room height must not exceed site.height - 2',
    {actual:s.height,maximum:site.height-2,spaceId:s.id});
  if(!['enclosed','open-court'].includes(s.spatialRole))
   add('SPATIAL_ROLE_INVALID',path+'.spatialRole',
    'AD requires an explicit enclosed or open-court role');
  if(!['public','shared','private'].includes(s.privacy))
   add('PRIVACY_INVALID',path+'.privacy','Unknown privacy role');
  if(s.id===p.entrySpaceId){
   if(s.parentId!==null||s.side!==null)
    add('ENTRY_RELATION_INVALID',path,'Root needs parentId:null and side:null');
  }else if(!validId(s.parentId)||!dirs.includes(s.side))
   add('ROOM_RELATION_INVALID',path,'Non-root room must have a parent and cardinal side');
  valid.push(s);
 }
 if(!ids.has(p.entrySpaceId))
  add('ENTRY_MISSING','entrySpaceId','Root space not found');
 const courts=valid.filter(s=>s.spatialRole==='open-court');
 if(courts.length>1)add('TOO_MANY_COURTS','spaces',
  'Current compiler supports at most one open-air court');
 if(valid.length-courts.length<3)
  add('TOO_FEW_ENCLOSED','spaces','AD requires at least three enclosed rooms');
 for(const s of valid){
  if(s.id===p.entrySpaceId)continue;
  const path=`spaces[${s.index}]`;
  if(s.parentId===p.entrySpaceId&&s.side==='south')
   add('ENTRY_APPROACH_BLOCKED',path+'.side',
    'An entry-child south of the root blocks the required entrance approach',
    {spaceId:s.id,parentId:s.parentId});
  if(!ids.has(s.parentId))
   add('PARENT_NOT_FOUND',path+'.parentId','Parent room does not exist');
  if(s.parentId===s.id)
   add('SELF_PARENT',path+'.parentId','A room may not parent itself');
 }
 // Proven necessary Z span for directly attached root north/south rooms.
 // This is a LOWER BOUND, not a full site feasibility proof.
 const root=ids.get(p.entrySpaceId);
 if(root&&integer(root.depth)&&integer(site.depth)){
  const north=valid.filter(s=>s.parentId===root.id&&s.side==='north'&&integer(s.depth));
  const south=valid.filter(s=>s.parentId===root.id&&s.side==='south'&&integer(s.depth));
  if(north.length&&south.length){
   const northDepth=Math.max(...north.map(s=>s.depth)),
    southDepth=Math.max(...south.map(s=>s.depth)),
    necessary=root.depth+northDepth+southDepth-2;
   if(necessary>site.depth)
    add('OPPOSITE_WINGS_DEPTH_EXCEEDS_SITE','site.depth',
     'Root and opposing north/south wings cannot fit even with shared boundary walls',
     {minimumNecessaryDepth:necessary,actualSiteDepth:site.depth,
      limitation:'Necessary lower bound only; not an exhaustive layout proof'});
  }
 }
 if(!isObject(p.formIntent))
  add('FORM_INTENT_MISSING','formIntent','AD requires a model-selected faceted wing');
 else{
  const f=p.formIntent,s=ids.get(f.spaceId);
  if(!s)add('FORM_SPACE_MISSING','formIntent.spaceId','Selected space does not exist');
  else{
   if(s.spatialRole==='open-court')
    add('FACET_TARGET_IS_OPEN_COURT','formIntent.spaceId',
     'A faceted occupied wing cannot target an open-air court',{spaceId:f.spaceId});
   const ns=['north','south'].includes(f.face);
   if(dirs.includes(f.face)&&integer(f.cornerInset)&&
     integer(s.width)&&integer(s.depth)){
    const faceSpan=ns?s.width:s.depth,other=ns?s.depth:s.width;
    if(faceSpan<2*f.cornerInset+6||other<f.cornerInset+5)
     add('FACET_DIMENSIONS_INSUFFICIENT','formIntent',
      'Selected room cannot physically support its corner inset',
      {spaceId:s.id,cornerInset:f.cornerInset});
   }
  }
  if(!dirs.includes(f.face)||!integer(f.cornerInset)||f.cornerInset<2||f.cornerInset>3)
   add('FORM_INTENT_INVALID','formIntent','Face must be cardinal and cornerInset 2 or 3');
 }
 if(!isObject(p.roofFormIntent))
  add('ROOF_INTENT_MISSING','roofFormIntent','AD requires a chosen real roof');
 else{
  const f=p.roofFormIntent,s=ids.get(f.spaceId);
  if(!s)add('ROOF_SPACE_MISSING','roofFormIntent.spaceId','Selected space does not exist');
  else{
   if(s.spatialRole==='open-court')
    add('ROOF_TARGET_IS_OPEN_COURT','roofFormIntent.spaceId',
     'An open-air court must have no roof');
   if(isObject(p.formIntent)&&f.spaceId===p.formIntent.spaceId)
    add('FACET_ROOF_SAME_SPACE_UNSUPPORTED','roofFormIntent.spaceId',
     'Current source compiler cannot put a selected roof on the faceted wing');
   if(integer(s.height)&&integer(f.rise)&&integer(site.height)&&
     s.height+f.rise>=site.height)
    add('ROOF_EXCEEDS_SITE_HEIGHT','roofFormIntent',
     'Roof maximum height must be strictly below site.height',
     {roomHeight:s.height,roofRise:f.rise,siteHeight:site.height});
   const span=f.axis==='x'?s.width:f.axis==='z'?s.depth:null;
   if(f.profile==='sawtooth'&&integer(span)&&integer(f.toothWidth)&&
      span<2*f.toothWidth)
    add('SAWTOOTH_SPAN_TOO_SHORT','roofFormIntent',
     'Sawtooth room span must be at least twice its toothWidth',
     {span,toothWidth:f.toothWidth});
  }
  if(!['ridge','shed','sawtooth'].includes(f.profile)||
    !['x','z'].includes(f.axis)||!integer(f.rise)||
    f.rise<2||f.rise>5||
    (f.profile==='sawtooth'&&(!integer(f.toothWidth)||
      f.toothWidth<3||f.toothWidth>8)))
   add('ROOF_INTENT_INVALID','roofFormIntent','Invalid roof profile, axis, rise or toothWidth');
 }
 const glazings=Array.isArray(p.glazedOpenings)?p.glazedOpenings:[];
 if(glazings.length<1||glazings.length>5)
  add('GLAZING_COUNT_INVALID','glazedOpenings','AD requires 1 to 5 glazing sets');
 for(let i=0;i<glazings.length;i++){
  const g=glazings[i],at=`glazedOpenings[${i}]`;
  if(!isObject(g)){add('GLAZING_NOT_OBJECT',at,'Expected window object');continue}
  const s=ids.get(g.spaceId);
  if(!s){add('GLAZING_SPACE_MISSING',at+'.spaceId','Window target room not found');continue}
  if(s.spatialRole==='open-court')
   add('GLAZING_TARGET_IS_OPEN_COURT',at+'.spaceId',
    'Open-air court has no enclosed exterior wall for glazing',
    {spaceId:s.id});
  if(p.formIntent?.spaceId===g.spaceId)
   add('GLAZING_ON_FACET_UNSUPPORTED',at+'.spaceId',
    'Current source compiler does not support glass on faceted wing');
  const span=['north','south'].includes(g.face)?s.width:
    ['east','west'].includes(g.face)?s.depth:null;
  if(!dirs.includes(g.face)||!integer(g.offset)||
    !integer(g.width)||!integer(g.height)||!integer(g.baseY)||
    g.width<2||g.width>6||g.height<2||g.height>4)
   add('GLAZING_FIELDS_INVALID',at,'Invalid window face/size/position fields');
  if(integer(span)&&integer(g.offset)&&integer(g.width)&&
    (g.offset<2||g.offset+g.width>span-2))
   add('GLAZING_OUTSIDE_FACADE',at,'Window must be inside the usable facade',
    {span,offset:g.offset,width:g.width});
  if(integer(g.baseY)&&integer(g.height)&&integer(s.height)&&
     (g.baseY<5||g.baseY+g.height>s.height-1))
   add('GLAZING_OUTSIDE_ROOM_HEIGHT',at,'Glazing must fit within room wall',
    {roomHeight:s.height,baseY:g.baseY,glazingHeight:g.height});
  if(g.spaceId===p.entrySpaceId&&g.face==='south'&&g.baseY===5&&
      integer(g.offset)&&integer(g.width)&&integer(s.width)){
   const door=Math.floor((s.width-2)/2);
   if(g.offset<door+2&&g.offset+g.width>door)
    add('GLAZING_ENTRY_DOOR_CONFLICT',at,
     'Window bottom sill overlaps the actual three-block-high entrance door');
  }
 }
 if(Array.isArray(p.crossConnections)){
  if(p.crossConnections.length<1||p.crossConnections.length>4)
   add('CROSS_LINK_COUNT_INVALID','crossConnections','Requires 1 to 4 pairs if specified');
  const seen=new Set();
  for(let i=0;i<p.crossConnections.length;i++){
   const v=p.crossConnections[i],at=`crossConnections[${i}]`;
   if(!Array.isArray(v)||v.length!==2){add('CROSS_LINK_PAIR_INVALID',at,'Expected two IDs');continue}
   const [a,b]=v,aa=ids.get(a),bb=ids.get(b);
   if(!aa||!bb||a===b){add('CROSS_LINK_SPACE_INVALID',at,'Both IDs must be distinct known rooms');continue}
   if(aa.parentId===b||bb.parentId===a)
    add('CROSS_LINK_DUPLICATES_TREE',at,
     'Parent-child rooms already have a connection; extra link must be non-tree',
     {spaces:[a,b]});
   const k=[a,b].sort().join('|');
   if(seen.has(k))add('CROSS_LINK_DUPLICATE',at,'Duplicate undirected room pair');
   seen.add(k);
  }
 }
 report.issueCount=issues.length;
 report.status=issues.length?'SOURCE_ISSUES_FOUND_NO_GEOMETRY':'NO_STATIC_ISSUES_COMPILER_CHECK_REQUIRED';
 return report;
}
