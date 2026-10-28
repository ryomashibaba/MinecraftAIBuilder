/**
 * R190-AF source-only architectural-program proof of concept.
 *
 * The ROOT object has no parent/side fields; its child rooms declare
 * their relations. Daylight is an intent, NOT a model-selected voxel:
 * the host may suggest possible coordinates but NEVER applies them.
 *
 * Existing AD/AE formats, capture runners, saved response bytes and
 * Minecraft worlds are intentionally untouched.
 */
import {createHash} from 'node:crypto';
import {R190_SCHEMA,compileR190SemanticPlan,r190GlazingCells} from './r190-semantic-massing.mjs';
const H=s=>createHash('sha256').update(s,'utf8').digest('hex');
const field=(x,names)=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&
 Object.keys(x).length===names.length&&names.every(k=>Object.hasOwn(x,k));
const integer=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const slug=s=>typeof s==='string'&&/^[a-z][a-z0-9-]{2,39}$/.test(s);
const dirs=['north','south','east','west'];
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},worldContacts:0,worldWrites:0});
const rootFields=['id','purpose','width','depth','height','privacy','spatialRole'];
const childFields=[...rootFields,'parentId','side'];
const copy=x=>JSON.parse(JSON.stringify(x));
const bad=code=>{throw Error('R190AF_'+code)};
const check=(ok,code)=>{if(!ok)bad(code)};
const validRoom=(r,site,root)=>{
 const keys=root?rootFields:childFields;
 check(field(r,keys),'ROOM_SHAPE');
 check(slug(r.id)&&typeof r.purpose==='string'&&
  r.purpose.length>=3&&r.purpose.length<=150,'ROOM_IDENTITY');
 check(integer(r.width,7,22)&&integer(r.depth,7,22)&&
  integer(r.height,7,site.height-2),'ROOM_DIMENSIONS');
 check(['public','shared','private'].includes(r.privacy)&&
  ['enclosed','open-court'].includes(r.spatialRole),'ROOM_ROLE');
 if(!root)check(slug(r.parentId)&&dirs.includes(r.side),'CHILD_RELATION');
};
export const R190AF_INTENT_SCHEMA='minecraftaibuilder-r190af-program-intent-v1';
/** No provider calls, no output file writes, no world contact. */
export function inspectR190AFIntent(raw){
 const report={schema:'minecraftaibuilder-r190af-intent-review-v1',
  status:'HOLD_INVALID_PROGRAM_INTENT',
  originalRawSha256:typeof raw==='string'?H(raw):null,
  originalUnmodified:true,modelCalls:0,
  modelAuthoredCoordinates:false,hostChoseBuildingType:false,
  sourcePreview:null,windowOptions:[],error:null,
  approvalRequiredForAnyWindow:true,independentUseCaseCoverage:'NOT_CERTIFIED',
  humanArchitectureQuality:'ART_HOLD',minecraftWalking:'NOT_TESTED',
  ...safety()};
 if(typeof raw!=='string'||Buffer.byteLength(raw,'utf8')>120000){
  report.error='R190AF_RAW_INVALID';return report;
 }
 try{
  const p=JSON.parse(raw);
  check(p&&typeof p==='object'&&!Array.isArray(p)&&
   Object.keys(p).every(k=>['schema','id','title','brief','site',
    'root','children','materials','formIntent','roofFormIntent',
    'additionalPassages','daylightIntents','entranceFace'].includes(k))&&
   ['schema','id','title','brief','site','root','children','materials']
    .every(k=>Object.hasOwn(p,k)),'FIELDS');
  check(p.entranceFace===undefined||dirs.includes(p.entranceFace),'ENTRANCE_FACE');
  check(p.schema===R190AF_INTENT_SCHEMA&&slug(p.id)&&
   typeof p.title==='string'&&p.title.length>=3&&p.title.length<=100&&
   typeof p.brief==='string'&&p.brief.length>=3&&p.brief.length<=400,'IDENTITY');
  check(field(p.site,['width','depth','height'])&&
   integer(p.site.width,24,80)&&integer(p.site.depth,24,80)&&
   integer(p.site.height,10,32),'SITE');
  check(field(p.materials,['floor','wall','roof'])&&
   Object.values(p.materials).every(v=>['wood','stone','concrete','metal'].includes(v)),
   'MATERIALS');
  check(Array.isArray(p.children)&&p.children.length>=2&&p.children.length<=5,
   'ROOM_COUNT');
  validRoom(p.root,p.site,true);
  for(const r of p.children)validRoom(r,p.site,false);
  const all=[p.root,...p.children],ids=new Set(all.map(r=>r.id));
  check(all.every(r=>slug(r.id))&&ids.size===all.length,'DUPLICATE_ROOM');
  check(p.children.every(c=>ids.has(c.parentId)&&c.parentId!==c.id),
   'PARENT_UNKNOWN');
  check(all.filter(s=>s.spatialRole==='open-court').length<=1&&
   all.filter(s=>s.spatialRole==='enclosed').length>=2,'COURT_BUDGET');
  check(p.additionalPassages===undefined||
   (Array.isArray(p.additionalPassages)&&
    p.additionalPassages.length>=1&&p.additionalPassages.length<=3),
   'PASSAGE_COUNT');
  const edges=p.additionalPassages??[];
  const knownEdges=new Set();
  for(const pair of edges){
   check(Array.isArray(pair)&&pair.length===2&&
    pair.every(id=>ids.has(id))&&pair[0]!==pair[1],'PASSAGE_PAIR');
   const child=all.find(r=>r.id===pair[0]),
    other=all.find(r=>r.id===pair[1]);
   check(child.parentId!==other.id&&other.parentId!==child.id,
    'PASSAGE_DUPLICATES_TREE');
   const key=[...pair].sort().join(':');
   check(!knownEdges.has(key),'PASSAGE_DUPLICATE');
   knownEdges.add(key);
  }
  check(p.daylightIntents===undefined||
   (Array.isArray(p.daylightIntents)&&p.daylightIntents.length>=1&&
    p.daylightIntents.length<=5),'DAYLIGHT_COUNT');
  const model={schema:R190_SCHEMA,id:p.id,title:p.title,brief:p.brief,
   site:copy(p.site),entrySpaceId:p.root.id,
   spaces:all.map((r,i)=>({...copy(r),...(
    i===0?{parentId:null,side:null}:{})})),
   materials:copy(p.materials)};
  if(p.entranceFace!==undefined)model.entranceFace=p.entranceFace;
  if(p.formIntent!==undefined)model.formIntent=copy(p.formIntent);
  if(p.roofFormIntent!==undefined)model.roofFormIntent=copy(p.roofFormIntent);
  if(edges.length)model.crossConnections=copy(edges);
  // No glazing is ever generated by this stage. The compiler validates the
  // author's structural choices as a separate provisional source preview.
  const built=compileR190SemanticPlan(model);
  report.sourcePreview={
   sourceSha256:built.compiled.sourceSha256,
   geometrySha256:built.compiled.geometrySha256,
   allProgramSpacesReachable:built.audit.allProgramSpacesReachable,
   roomCount:all.length,
   geometryGeneratedWithoutDaylight: true,
   independentWalkingCertified:false,
   noAutomaticWindowPlacement:true
  };
  // Check the *actual* pre-glazing B143 voxels and room geometry.
  // This stage makes no persistent glass; each possible window is merely
  // compiled in memory to prove that one option can be realized.
  const layoutRooms=new Map(built.layout.spaces.map(s=>[s.id,s]));
  const occupied=new Set(built.compiled.primitives.map(v=>
   v[0]+','+v[1]+','+v[2]));
  const key=(x,y,z)=>x+','+y+','+z;
  const has=(x,y,z)=>occupied.has(key(x,y,z));
  const physicalCandidate=(room,g)=>{
   const along=['north','south'].includes(g.face);
   const low=(along?room.x:room.z)+g.offset;
   return r190GlazingCells(room,g).every(q=>{
    if(!has(q.x,q.y,q.z)||
       has(q.x+q.dx,q.y,q.z+q.dz)||
       has(q.x-q.dx,q.y,q.z-q.dz))return false;
    // A neighbor may have clear air behind its shared boundary; it is still
    // not OUTDOORS. The exterior test uses actual placed room footprints.
    if(built.layout.spaces.some(s=>s.id!==g.spaceId&&
      q.x+q.dx>=s.x&&q.x+q.dx<s.x+s.w&&
      q.z+q.dz>=s.z&&q.z+q.dz<s.z+s.d))return false;
    if(q.y===g.baseY&&!has(q.x,q.y-1,q.z))return false;
    if(q.y===g.baseY+g.height-1&&!has(q.x,q.y+1,q.z))return false;
    const u=along?q.x:q.z;
    if(u===low&&!has(q.x-(along?1:0),q.y,q.z-(along?0:1)))return false;
    if(u===low+g.width-1&&!has(q.x+(along?1:0),q.y,q.z+(along?0:1)))return false;
    return true;
   });
  };
  const intents=p.daylightIntents??[];
  for(let i=0;i<intents.length;i++){
   const request=intents[i],at='daylightIntents['+i+']';
   check(field(request,['spaceId','face','width','height'])&&
    slug(request.spaceId)&&dirs.includes(request.face)&&
    integer(request.width,2,6)&&integer(request.height,2,4),
    'DAYLIGHT_FIELDS_'+i);
   const room=all.find(r=>r.id===request.spaceId);
   check(room&&room.spatialRole==='enclosed'&&
    p.formIntent?.spaceId!==room.id,'DAYLIGHT_TARGET_'+i);
   const span=['north','south'].includes(request.face)?room.width:room.depth;
   const minOffset=2,maxOffset=span-2-request.width;
   const minBaseY=5,maxBaseY=room.height-1-request.height;
   const dimensional=maxOffset>=minOffset&&maxBaseY>=minBaseY;
   let proposedOnly=null,independentlyAuditedGlassCells=0;
   if(dimensional){
    const placed=layoutRooms.get(room.id);
    // Center-first deterministic ordering is only a candidate search,
    // not a host decision to alter architecture or approve the window.
    const mid=(minOffset+maxOffset)/2;
    const offsets=Array.from({length:maxOffset-minOffset+1},
     (_,i)=>minOffset+i).sort((a,b)=>Math.abs(a-mid)-Math.abs(b-mid)||a-b);
    for(const offset of offsets){
     for(let baseY=minBaseY;baseY<=maxBaseY;baseY++){
      const g={spaceId:room.id,face:request.face,offset,baseY,
       width:request.width,height:request.height};
      if(!physicalCandidate(placed,g))continue;
      try{
       const trial=compileR190SemanticPlan({...model,glazedOpenings:[g]});
       const glazing=trial.audit.glazedOpenings?.[0];
       if(trial.audit.realGlazingCells!==g.width*g.height||
          glazing?.realExteriorGlassCells!==g.width*g.height||
          trial.worldWrites!==0||trial.worldContacts!==0||
          trial.layout.spaces.some((s,j)=>{
           const original=built.layout.spaces[j];
           return s.id!==original.id||s.x!==original.x||s.z!==original.z;
          }))continue;
       proposedOnly=g;independentlyAuditedGlassCells=g.width*g.height;
       break;
      }catch{/* Another impossible in-memory geometry is NOT accepted. */}
     }
     if(proposedOnly)break;
    }
   }
   report.windowOptions.push({path:at,requestedIntent:copy(request),
    status:!dimensional?'NO_FEASIBLE_COORDINATES':
     proposedOnly?'UNAPPROVED_PHYSICALLY_VERIFIED_CANDIDATE':
      'NO_VERIFIED_EXTERIOR_WALL_OR_FRAME',
    proposedOnly,
    independentlyAuditedGlassCells,
    physicallyCheckedAgainstActualB143:dimensional,
    ephemeralSingleWindowSourceAudit:proposedOnly!==null,
    multipleWindowCombinationCertified:false,
    original3DPreviewHasNoGlass:true,
    approvalRequired:true,
    feasibleOffsetRange:dimensional?[minOffset,maxOffset]:null,
    feasibleBaseYRange:dimensional?[minBaseY,maxBaseY]:null});
  }
  // Multiple singly feasible window proposals may compete for the same
  // real wall voxels. Reject an overlapping proposal set BEFORE any
  // permission-to-apply stage. A combination preview is STILL unapproved.
  report.multipleWindowCombinationCertified=false;
  const selected=report.windowOptions.map(x=>x.proposedOnly);
  report.jointWindowProposalAudit={status:intents.length>1?
   'NOT_EVALUATED':'NOT_REQUIRED_SINGLE_OR_ZERO',
   overlappingGlassCells:0,sourceProofOnly:true,
   approved:false,worldWrites:0};
  if(intents.length>1&&selected.every(Boolean)){
   const occupiedGlass=new Set();let duplicates=0;
   for(const g of selected){
    const placed=layoutRooms.get(g.spaceId);
    for(const q of r190GlazingCells(placed,g)){
     const k=key(q.x,q.y,q.z);
     if(occupiedGlass.has(k))duplicates++;
     occupiedGlass.add(k);
    }
   }
   if(duplicates>0){
    report.jointWindowProposalAudit={
     status:'HOLD_OVERLAPPING_WINDOW_CANDIDATES',
     overlappingGlassCells:duplicates,sourceProofOnly:true,
     approved:false,worldWrites:0};
   }else{
    try{
     const trial=compileR190SemanticPlan({...model,glazedOpenings:selected});
     const required=selected.reduce((n,g)=>n+g.width*g.height,0);
     const valid=trial.audit.realGlazingCells===required&&
      trial.audit.glazedOpenings.length===selected.length&&
      trial.layout.spaces.every((s,i)=>{
       const original=built.layout.spaces[i];
       return s.id===original.id&&s.x===original.x&&s.z===original.z;
      })&&trial.worldContacts===0&&trial.worldWrites===0;
     report.jointWindowProposalAudit={
      status:valid?'UNAPPROVED_COMBINED_SOURCE_VALID':
       'HOLD_COMBINED_SOURCE_AUDIT_MISMATCH',
      overlappingGlassCells:0,sourceProofOnly:true,approved:false,
      glassCellsVerified:valid?required:0,worldWrites:0};
    }catch{
     report.jointWindowProposalAudit={
      status:'HOLD_COMBINED_SOURCE_COMPILER_REJECTED',
      overlappingGlassCells:0,sourceProofOnly:true,approved:false,
      worldWrites:0};
    }
   }
  }
  if(report.windowOptions.some(x=>x.status==='NO_FEASIBLE_COORDINATES')){
   report.status='HOLD_DAYLIGHT_INTENT_INFEASIBLE';
  }else if(report.windowOptions.some(x=>
   x.status==='NO_VERIFIED_EXTERIOR_WALL_OR_FRAME')){
   report.status='HOLD_DAYLIGHT_NO_VERIFIED_EXTERIOR';
  }else if(report.jointWindowProposalAudit.status.startsWith('HOLD_')){
   report.status='HOLD_DAYLIGHT_JOINT_PROPOSAL';
  }else{
   report.status=intents.length?'HOLD_WINDOW_PROPOSAL_REQUIRES_APPROVAL':
    'PROVISIONAL_SOURCE_ONLY_NO_ART_APPROVAL';
  }
 }catch(e){report.error=String(e?.message??e).slice(0,180);
  report.sourcePreview=null;report.windowOptions=[];
  report.status='HOLD_INVALID_PROGRAM_INTENT'}
 return report;
}
