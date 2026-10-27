/**
 * R190-G independent request fidelity gate. This module NEVER authors a room,
 * chooses a coordinate, infers a building style, or contacts Minecraft.
 * Limited literal detection is a safety red flag, NOT NLP understanding.
 * An external acceptance spec asserts only functional expectations; the model
 * remains responsible for choosing space IDs, sizes, topology and massing.
 */
const fail=s=>{throw Error('R190_REQUEST_COVERAGE_'+s);};
const check=(p,s)=>{if(!p)fail(s);};
const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const fields=(x,k)=>obj(x)&&Object.keys(x).length===k.length&&k.every(y=>Object.hasOwn(x,y));
const phrase=s=>typeof s==='string'&&s.length>=3&&s.length<=100&&
 !/[\u0000-\u001f<>]/.test(s);
const norm=s=>s.normalize('NFKC').toLocaleLowerCase('en-US');
const scanners=[
 {capability:'multiple-levels',
  expression:/(?:[2-9]階建て|[2-9]階構造|[2-9]階建|[2-9](?:-?storey|-?story)\b|\b(?:two|three|four)[ -]?(?:storey|story|stories|storeys)\b|\bmulti[ -]?(?:storey|story|level)\b|複数階)/iu},
 {capability:'stairs',expression:/(?:階段|\bstair(?:case|way|s)?\b)/iu},
 {capability:'double-height-void',expression:/(?:吹き抜け|吹抜け|\bdouble[ -]height\b)/iu},
 {capability:'roof-profile-design',
  expression:/(?:鋸歯状の?屋根|片流れ屋根|切妻屋根|\bsawtooth[ -]roof\b|\bgabled?[ -]roof\b)/iu}
];
export function scanR190ExplicitBriefCapabilities(prompt){
 check(typeof prompt==='string'&&prompt.length>=8&&prompt.length<=8000,
  'INVALID_REQUEST_TEXT');
 const normalized=norm(prompt);
 return scanners.flatMap(({capability,expression})=>{
  const match=expression.exec(normalized);
  return match?[{capability,literalEvidence:match[0]}]:[];
 });
}
export function validateR190ProgramSpec(spec){
 if(spec===null)return null;
 check(fields(spec,['requiredProgram','requiredDirectConnections']),
  'SPEC_FIELDS');
 check(Array.isArray(spec.requiredProgram)&&spec.requiredProgram.length<=6&&
  Array.isArray(spec.requiredDirectConnections)&&
  spec.requiredDirectConnections.length<=8,'SPEC_ARRAYS');
 const labels=new Set();
 for(const item of spec.requiredProgram){
  check(fields(item,['label','purposeFragment'])||
   fields(item,['label','purposeFragment','privacy']),'ROOM_FIELDS');
  check(typeof item.label==='string'&&/^[a-z][a-z0-9-]{2,39}$/.test(item.label)&&
   !labels.has(item.label)&&phrase(item.purposeFragment)&&
   (item.privacy===undefined||
    ['public','shared','private'].includes(item.privacy)),
   'ROOM');
  labels.add(item.label);
 }
 const edges=new Set();
 for(const edge of spec.requiredDirectConnections){
  check(Array.isArray(edge)&&edge.length===2&&
   edge.every(x=>labels.has(x))&&edge[0]!==edge[1],'EDGE');
  const key=[...edge].sort().join('|');
  check(!edges.has(key),'DUPLICATE_EDGE');edges.add(key);
 }
 return structuredClone(spec);
}
export function auditR190ExplicitProgram(plan,spec){
 const expected=validateR190ProgramSpec(spec);
 if(expected===null)return {status:'NOT_SPECIFIED',
  independentlyVerified:false,requirementsCount:0,
  matchedRooms:[],directConnections:[],issues:[]};
 const used=new Set(),matched=[],issues=[];
 for(const requirement of expected.requiredProgram){
  const choices=plan.spaces.filter(s=>norm(s.purpose).includes(norm(requirement.purposeFragment)));
  if(choices.length!==1){
   issues.push({type:choices.length?'AMBIGUOUS_ROOM':'MISSING_ROOM',
    label:requirement.label});
   continue;
  }
  const found=choices[0];
  if(used.has(found.id)){
   issues.push({type:'ROOM_REUSED_FOR_TWO_REQUIREMENTS',
    label:requirement.label});continue;
  }
  used.add(found.id);
  if(requirement.privacy!==undefined&&requirement.privacy!==found.privacy){
   issues.push({type:'ROOM_PRIVACY_MISMATCH',label:requirement.label});
   continue;
  }
  matched.push({label:requirement.label,modelRoomId:found.id,
   width:found.width,depth:found.depth,height:found.height,privacy:found.privacy});
 }
 const byLabel=new Map(matched.map(r=>[r.label,r.modelRoomId]));
 const directConnections=[];
 for(const [a,b] of expected.requiredDirectConnections){
  const ia=byLabel.get(a),ib=byLabel.get(b);
  if(ia===undefined||ib===undefined){
   issues.push({type:'UNRESOLVED_EDGE_ROOM',labels:[a,b]});continue;
  }
  const direct=plan.spaces.some(s=>
   (s.id===ia&&s.parentId===ib)||(s.id===ib&&s.parentId===ia))||
   (plan.crossConnections??[]).some(([a,b])=>
    (a===ia&&b===ib)||(a===ib&&b===ia));
  if(!direct)issues.push({type:'MISSING_DIRECT_ADJACENCY',labels:[a,b]});
  else directConnections.push({labels:[a,b],modelIds:[ia,ib]});
 }
 return {status:issues.length?'FAILED':'SEMANTIC_MATCHED_AWAIT_SOURCE',
  independentlyVerified:false,
  requirementsCount:expected.requiredProgram.length+
   expected.requiredDirectConnections.length,
  matchedRooms:matched,directConnections,issues};
}
export function verifyR190ProgramInCompiledSource(audit,source){
 if(audit.status==='NOT_SPECIFIED')return {...audit,
  status:'NO_INDEPENDENT_PROGRAM_COVERAGE'};
 check(audit.status==='SEMANTIC_MATCHED_AWAIT_SOURCE','PRECHECK_NOT_PASSED');
 const rooms=new Map(source.layout.spaces.map(x=>[x.id,x]));
 const witnesses=new Map(source.audit.witnesses.map(x=>[x.id,x]));
 const issues=[];
 const matchedRooms=audit.matchedRooms.map(r=>{
  const physical=rooms.get(r.modelRoomId),witness=witnesses.get(r.modelRoomId);
  if(!physical||!witness||physical.w!==r.width||
   physical.d!==r.depth||physical.h!==r.height)
   issues.push({type:'SOURCE_ROOM_MISSING',label:r.label});
  return {...r,sourceBounds:physical?{
   x:physical.x,z:physical.z,width:physical.w,
   depth:physical.d,height:physical.h}:null,
   twoWideReachabilityWitness:witness?.reachableTwoWideSourceCell??null};
 });
 const directConnections=audit.directConnections.map(edge=>{
  const portal=source.layout.portals.find(p=>
   (p.a===edge.modelIds[0]&&p.b===edge.modelIds[1])||
   (p.b===edge.modelIds[0]&&p.a===edge.modelIds[1]));
  if(!portal)issues.push({type:'SOURCE_DIRECT_PORTAL_MISSING',labels:edge.labels});
  return {...edge,compiledPortal:portal??null};
 });
 check(issues.length===0&&source.audit.allProgramSpacesReachable===true,
  'PHYSICAL_PROGRAM_MISMATCH');
 return {...audit,status:'VERIFIED_EXPLICIT_PROGRAM_IN_B143',
  independentlyVerified:true,matchedRooms,directConnections};
}
