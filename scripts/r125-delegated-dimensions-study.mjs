/**
 * V37 isolated explicit dimensional delegation experiment.
 * No adapter/runner integration, no model or world I/O. A trusted caller
 * supplies the existing offline SOURCE diagnostic. Never edits the author.
 * The ordered choices are authored, first choice = the authored baseline.
 */
const copy=x=>JSON.parse(JSON.stringify(x));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const exact=(x,ks)=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&
 Object.keys(x).length===ks.length&&ks.every(k=>Object.hasOwn(x,k));
const fail=m=>{throw Error('R125_DELEGATION_'+m)};
const integer=(x,min,max,step=1)=>Number.isInteger(x)&&x>=min&&x<=max&&x%step===0;
function resolveField(plan,path){
 if(path==='footprint.width'||path==='footprint.depth')
  return {parts:path.split('.'),valid:v=>integer(v,16,32)};
 const l=plan.levels[0],spatial=l.layoutMode==='spatial-tree';
 if(!spatial&&path==='levels.0.splitPercent')
  return {parts:path.split('.'),valid:v=>integer(v,30,70,5)};
 if(!spatial&&l.spaces.length===3&&path==='levels.0.secondarySplitPercent')
  return {parts:path.split('.'),valid:v=>integer(v,25,75,5)};
 const m=/^levels\.0\.spaces\.([0-3])\.volume\.(width|depth|attach\.shift)$/.exec(path);
 if(spatial&&m&&Number(m[1])<l.spaces.length&&
    (m[2]!=='attach.shift'||Number(m[1])>0))
  return {parts:path.split('.'),valid:v=>m[2]==='attach.shift'?integer(v,-3,3):integer(v,6,14)};
 fail('FIELD_NOT_DELEGATABLE');
}
function valueAt(x,parts){
 for(const k of parts){if(x==null||!Object.hasOwn(x,k))fail('FIELD_ABSENT');x=x[k];}
 return x;
}
function setAt(x,parts,value){
 for(const k of parts.slice(0,-1))x=x[k];
 x[parts.at(-1)]=value;
}
/** Explicit envelope: {plan: ordinary normalized R125 plan,
 * delegated:[{field:'footprint.width',choices:[20,24,28]}]}.
 * Single-floor only: current replay's public stair composition must not
 * silently change non-delegated fields. Empty/unknown delegation rejects.
 * Budget counts actual full diagnostic invocations, baseline included.
 */
export function resolveR125DelegatedDimensions(author,evaluate,{maxCandidates=16}={}){
 if(!exact(author,['plan','delegated'])||typeof evaluate!=='function'||
    !integer(maxCandidates,1,24))fail('INPUT');
 const p=author.plan;
 if(p?.schema!=='minecraftaibuilder-r125-architecture-plan-v1'||
    !Array.isArray(p.levels)||p.levels.length!==1||
    !Array.isArray(p.levels[0]?.spaces)||p.levels[0].spaces.length<2||
    p.levels[0].spaces.length>4||!Array.isArray(author.delegated)||
    !integer(author.delegated.length,1,4))fail('SCOPE');
 const snapshot=copy(author),seen=new Set();
 const axes=author.delegated.map(d=>{
  if(!exact(d,['field','choices'])||typeof d.field!=='string'||
     seen.has(d.field)||!Array.isArray(d.choices)||
     !integer(d.choices.length,2,5))fail('CHOICES');
  seen.add(d.field);
  const f=resolveField(p,d.field);
  if(new Set(d.choices).size!==d.choices.length||
     !d.choices.every(f.valid)||d.choices[0]!==valueAt(p,f.parts))
   fail('VALUES');
  return {...f,field:d.field,choices:[...d.choices]};
 });
 // Best-first in the author's ordered choices. All combinations of the
 // at most four 5-choice fields are represented, not just one-axis edits.
 const vectors=[[]];
 for(const a of axes){
  const old=vectors.splice(0);
  for(const v of old)for(let i=0;i<a.choices.length;i++)vectors.push([...v,i]);
 }
 // Explicit lexicographic tie-break, independent of engine sort stability.
 vectors.sort((a,b)=>{
  const rank=a.reduce((s,n)=>s+n,0)-b.reduce((s,n)=>s+n,0)||
   a.filter(Boolean).length-b.filter(Boolean).length;
  if(rank)return rank;
  for(let i=0;i<a.length;i++)if(a[i]!==b[i])return a[i]-b[i];
  return 0;
 });
 const attempts=[];
 const base={schema:'r125-explicit-dimensional-delegation-study-v1',
  modelAuthorship:'MODEL_INTENT_HOST_RESOLVED_NOT_RAW_MODEL_SOURCE',
  artStatus:'NOT_REVIEWED',modelCalls:0,worldWrites:0};
 for(const vector of vectors.slice(0,maxCandidates)){
  const candidate=copy(p);
  const changes=[];
  axes.forEach((a,i)=>{
   const value=a.choices[vector[i]];
   setAt(candidate,a.parts,value);
   if(vector[i]!==0)changes.push({field:a.field,from:a.choices[0],to:value});
  });
  const sent=JSON.stringify(candidate);
  const report=evaluate(candidate);
  if(JSON.stringify(candidate)!==sent||!same(author,snapshot))fail('AUTHOR_DRIFT');
  if(!report||typeof report.status!=='string'||typeof report.sourceVerified!=='boolean'||
     report.worldWrites!==0||report.worldContacts!==0||
     report.worldGates?.length!==9||report.worldGates.some(g=>g!=='BLOCKED')||
     report.constructionApproved!==false||report.executionAllowed!==false||
     report.modelCalls!==0||report.originalEdited!==false||
     report.structuralComposition&&report.structuralComposition.status!=='NOT_REQUIRED')
   fail('INVALID_DIAGNOSTIC');
  attempts.push({changes,status:report.status,reason:report.compilerReason??null});
  if(report.sourceVerified===true&&report.status==='B143_SOURCE_CANDIDATE_ART_HOLD'){
   if(report.structuralComposition?.status!=='NOT_REQUIRED')fail('MISSING_STRICT_COMPOSITION');
   const restored=copy(candidate);
   for(const a of axes)setAt(restored,a.parts,a.choices[0]);
   if(!same(restored,p))fail('UNDELEGATED_CHANGE');
   return {...base,status:'DELEGATED_SOURCE_CANDIDATE_ART_HOLD',
    candidate,changes,attempts,diagnostic:report,originalEdited:false};
  }
 }
 return {...base,status:'HOLD_NO_VERIFIED_DELEGATED_CANDIDATE',candidate:null,
  attempts,totalCombinations:vectors.length,budgetExhausted:attempts.length<vectors.length,
  originalEdited:false};
}
