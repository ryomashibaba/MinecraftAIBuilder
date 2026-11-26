/** Explicit bounded room-dimension delegation; never changes authored
 * roles, glazing, roof, topology or attachment shifts. SOURCE remains the gate. */
const fail=m=>{throw Error('R125_ROOM_FIT_'+m)};
const clone=x=>JSON.parse(JSON.stringify(x));
const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const int=(x,a,b)=>Number.isSafeInteger(x)&&x>=a&&x<=b;
export function r125RoomFitSchema(){
 return {type:'object',additionalProperties:false,minProperties:1,maxProperties:2,
  properties:Object.fromEntries(Array.from({length:4},(_,i)=>['Width','Depth'].map(k=>['r'+i+k,{type:'integer',minimum:6,maximum:14}])).flat())};
}
export function resolveR125DelegatedRoomFit(plan,declared,requestedBrief,evaluate,{maxCandidates=16}={}){
 if(!obj(plan)||plan.levels?.length!==1||plan.levels[0]?.layoutMode!=='spatial-tree'||
    !Array.isArray(plan.levels[0].spaces)||!int(plan.levels[0].spaces.length,2,4)||
    !obj(plan.footprint)||!['width','depth'].every(k=>int(plan.footprint[k],16,32))||
    !obj(declared)||!obj(declared.roomFit)||!int(Object.keys(declared.roomFit).length,1,2)||
    Object.keys(declared).some(k=>!['roomFit','siteFit'].includes(k))||
    (Object.hasOwn(declared,'siteFit')&&declared.siteFit!==true)||
    typeof requestedBrief!=='string'||!requestedBrief.trim()||typeof evaluate!=='function'||
    !int(maxCandidates,1,24))fail('CONTRACT');
 const snapshot=clone(plan),spaces=plan.levels[0].spaces,attempts=[];
 const axes=Object.entries(declared.roomFit).map(([k,max])=>{
  const m=/^r([0-3])(Width|Depth)$/.exec(k),i=m?Number(m[1]):-1;
  if(!m||i>=spaces.length)fail('ROOM_INDEX');
  const axis=m[2].toLowerCase(),from=spaces[i].volume?.[axis];
  if(!int(from,6,14)||!int(max,from+1,14))fail('ROOM_LIMIT');
  return {i,axis,from,max,field:'levels.0.spaces.'+i+'.volume.'+axis,room:spaces[i].id};
 });
 const changes=p=>{
  const list=axes.flatMap(a=>{const to=p.levels[0].spaces[a.i].volume[a.axis];return to===a.from?[]:[{field:a.field,from:a.from,to}]});
  for(const k of ['width','depth'])if(p.footprint[k]!==snapshot.footprint[k])
   list.push({field:'footprint.'+k,from:snapshot.footprint[k],to:p.footprint[k]});
  const restored=clone(p);
  for(const a of axes)restored.levels[0].spaces[a.i].volume[a.axis]=a.from;
  restored.footprint=clone(snapshot.footprint);
  if(!eq(restored,snapshot))fail('UNDELEGATED_CHANGE');
  return list;
 };
 const assess=p=>{
  if(attempts.length>=maxCandidates)fail('BUDGET');
  const before=clone(p),r=evaluate(p);
  if(!eq(before,p)||!eq(snapshot,plan)||typeof r?.sourceVerified!=='boolean'||typeof r.status!=='string'||
     r.worldContacts!==0||r.worldWrites!==0||r.modelCalls!==0||r.originalEdited!==false||
     r.constructionApproved!==false||r.executionAllowed!==false||
     r.worldGates?.length!==9||r.worldGates.some(x=>x!=='BLOCKED')||
     (r.sourceVerified&&(r.status!=='B143_SOURCE_CANDIDATE_ART_HOLD'||r.structuralComposition?.status!=='NOT_REQUIRED')))
   fail('DIAGNOSTIC');
  attempts.push({changes:changes(p),status:r.status,reason:r.compilerReason??null});return r;
 };
 const baseline=assess(clone(snapshot));
 const finish=(r,p,reason)=>({schema:'r125-explicit-room-fit-study-v1',
  status:r.sourceVerified?'DELEGATED_SOURCE_CANDIDATE_ART_HOLD':'HOLD_NO_VERIFIED_DELEGATED_CANDIDATE',
  sourceVerified:r.sourceVerified,candidate:r.sourceVerified?p:null,
  changes:r.sourceVerified?changes(p):[],attempts,diagnostic:r,roomFitReason:reason,
  originalEdited:false,modelAuthorship:'MODEL_INTENT_HOST_RESOLVED_NOT_RAW_MODEL_SOURCE',
  modelCalls:0,worldWrites:0,artStatus:'NOT_REVIEWED'});
 if(baseline.sourceVerified)return finish(baseline,snapshot,'BASELINE_ALREADY_FITS');
 // Conservative text guard, not a complete natural-language parser.
 if(/(?:\d+\s*(?:[xX×＊*]|ブロック|マス|メートル|m\b)|(?:幅|奥行(?:き)?|敷地|横幅|縦幅|上限|以内)\s*(?:は|が|を|：|:)?\s*\d+)/i.test(requestedBrief.normalize('NFKC')))
  return finish(baseline,null,'EXPLICIT_DIMENSION_TEXT_GUARD');
 const roomFailure=r=>{
  const daylight=/^R125_SPATIAL_DAYLIGHT_OPENING_UNAVAILABLE_(.+)$/.exec(r.compilerReason??'');
  return daylight?.[1]??(r.compilerReason==='R125_PLAN_FIXTURE_NO_REACHABLE_POSITION'?r.fixturePlacement?.failed?.zoneId:null);
 };
 const fitSite=(p,r)=>{
  if(declared.siteFit!==true||r.compilerReason!=='R125_PLAN_SPATIAL_VOLUMES_EXCEED_FOOTPRINT'||attempts.length>=maxCandidates)return {p,r};
  const f=r.spatialFootprint;
  if(!f||!['width','depth'].every(k=>f.declared?.[k]===p.footprint[k]&&int(f.required?.[k],1,128)))fail('SITE_EVIDENCE');
  const q=clone(p);
  for(const k of ['width','depth'])q.footprint[k]=Math.max(q.footprint[k],f.required[k]);
  if(!['width','depth'].every(k=>q.footprint[k]<=32)||eq(q,p))return {p,r};
  return {p:q,r:assess(q)};
 };
 const initial=fitSite(snapshot,baseline);
 if(initial.r.sourceVerified)return finish(initial.r,initial.p,'SITE_ONLY');
 const target=roomFailure(initial.r);
 if(!target||!axes.some(a=>a.room===target))return finish(initial.r,null,'NO_DELEGATED_FAILURE_ROOM');
 const vectors=[[]];
 for(const a of axes){const prior=vectors.splice(0);for(const v of prior)for(let n=0;n<=a.max-a.from;n++)vectors.push([...v,n]);}
 vectors.sort((a,b)=>a.reduce((s,n)=>s+n,0)-b.reduce((s,n)=>s+n,0)||a.filter(Boolean).length-b.filter(Boolean).length||a[0]-b[0]);
 let last=initial.r;
 const knownFailedRooms=new Set([target]);
 for(const v of vectors){
  if(attempts.length>=maxCandidates)break;
  if(!v.some(Boolean)||!v.some((n,i)=>n&&axes[i].room===target)||
     v.some((n,i)=>n&&!knownFailedRooms.has(axes[i].room)))continue;
  const p=clone(snapshot);
  axes.forEach((a,i)=>{p.levels[0].spaces[a.i].volume[a.axis]=a.from+v[i]});
  if(declared.siteFit===true)p.footprint=clone(initial.p.footprint);
  const candidate=fitSite(p,assess(p));last=candidate.r;
  if(last.sourceVerified)return finish(last,candidate.p,'ROOM_DIMENSIONS_FIT');
  const failed=roomFailure(last);if(failed)knownFailedRooms.add(failed);
 }
 return finish(last,null,attempts.length>=maxCandidates?'CANDIDATE_BUDGET_EXHAUSTED':'NO_VERIFIED_ROOM_FIT');
}
