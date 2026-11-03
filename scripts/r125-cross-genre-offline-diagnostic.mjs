/**
 * Offline, read-only diagnosis of a PRESERVED five-genre local study.
 * Never calls Ollama, does not repair generated plans or change existing files.
 * The ORIGINAL JSON is authoritative; this emits field-specific, genre-neutral
 * validation findings and checks previously successful B143 geometry SHA.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {compileSpatialComposition,SCHEMA} from '../source/ai/r125-spatial-composition.mjs';
import {GENRES} from './r125-cross-genre-pilot.mjs';

const sha=s=>createHash('sha256').update(s).digest('hex');
const fail=why=>{throw Error('R125_SAVED_GENRE_DIAGNOSTIC_'+why)};
const isObj=o=>o!==null&&typeof o==='object'&&!Array.isArray(o);
const slug=s=>typeof s==='string'&&/^[a-z][a-z0-9-]{2,39}$/.test(s);
const word=s=>typeof s==='string'&&s.length>=3&&s.length<=500&&!/[<>]/.test(s);
const int=(n,a,b)=>Number.isSafeInteger(n)&&n>=a&&n<=b;
const keys=(obj,expected,field,issues)=>{
 if(!isObj(obj)){issues.push({path:field,code:'OBJECT_REQUIRED'});return false}
 for(const k of expected)if(!Object.hasOwn(obj,k))
  issues.push({path:field+'.'+k,code:'MISSING_REQUIRED_FIELD'});
 for(const k of Object.keys(obj))if(!expected.includes(k))
  issues.push({path:field+'.'+k,code:'UNSUPPORTED_FIELD'});
 return true;
};
export function inspectSpatialPlanFields(plan){
 const issues=[];
 if(!isObj(plan))return [{path:'plan',code:'OBJECT_REQUIRED'}];
 keys(plan,['schema','id','title','brief','materials','rooms'],'plan',issues);
 if(plan.schema!==SCHEMA)issues.push({path:'plan.schema',code:'SCHEMA_MISMATCH'});
 if(!slug(plan.id))issues.push({path:'plan.id',code:'INVALID_SLUG'});
 if(!word(plan.title))issues.push({path:'plan.title',code:'INVALID_TITLE'});
 if(!word(plan.brief))issues.push({path:'plan.brief',code:'INVALID_BRIEF'});
 if(keys(plan.materials,['floor','wall','roof'],'plan.materials',issues)){
  for(const [name,values] of Object.entries({
   floor:['wood','stone','concrete'],wall:['concrete','stone','wood','metal'],
   roof:['stone','metal','wood','concrete']}))
   if(!values.includes(plan.materials[name]))
    issues.push({path:'plan.materials.'+name,code:'INVALID_MATERIAL'});
 }
 if(!Array.isArray(plan.rooms)||plan.rooms.length<2||plan.rooms.length>5){
  issues.push({path:'plan.rooms',code:'ROOM_COUNT_OUT_OF_RANGE',actualCount:
   Array.isArray(plan.rooms)?plan.rooms.length:null});return issues;
 }
 const seen=new Set();
 for(const [i,r] of plan.rooms.entries()){
  const key='plan.rooms['+i+']';
  if(!keys(r,i===0?['id','purpose','width','depth','roofY']:
   ['id','purpose','width','depth','roofY','attach'],key,issues))continue;
  if(!slug(r.id))issues.push({path:key+'.id',code:'INVALID_ROOM_SLUG'});
  if(seen.has(r.id))issues.push({path:key+'.id',code:'DUPLICATE_ROOM_ID'});
  if(!word(r.purpose))issues.push({path:key+'.purpose',code:'INVALID_PURPOSE'});
  for(const field of ['width','depth']){
   if(!int(r[field],7,14))
    issues.push({path:key+'.'+field,code:'DIMENSION_OUT_OF_RANGE',
     expected:'integer 7..14',actual:Number.isFinite(r[field])?r[field]:typeof r[field]});
  }
  if(!int(r.roofY,6,10))
   issues.push({path:key+'.roofY',code:'ROOF_HEIGHT_OUT_OF_RANGE',
    expected:'integer 6..10',actual:Number.isFinite(r.roofY)?r.roofY:typeof r.roofY});
  if(i>0&&keys(r.attach,['to','side','shift'],key+'.attach',issues)){
   if(!seen.has(r.attach.to))
    issues.push({path:key+'.attach.to',code:'PARENT_NOT_PREVIOUS_ROOM'});
   if(!['east','west','north','south'].includes(r.attach.side))
    issues.push({path:key+'.attach.side',code:'INVALID_DIRECTION'});
   if(!int(r.attach.shift,-3,3))
    issues.push({path:key+'.attach.shift',code:'SHIFT_OUT_OF_RANGE',
     expected:'integer -3..3',
     actual:Number.isFinite(r.attach.shift)?r.attach.shift:typeof r.attach.shift});
  }
  seen.add(r.id);
 }
 return issues.slice(0,64);
}
function fileText(folder,name,maxBytes){
 const file=path.join(folder,name),stat=fs.lstatSync(file);
 if(stat.isSymbolicLink()||!stat.isFile()||stat.size<1||stat.size>maxBytes)
  fail('UNSAFE_FILE_'+name);
 return fs.readFileSync(file,'utf8');
}
function isChild(root,p){return p.startsWith(root+path.sep)}
export function diagnoseSavedGenreBatch({studyDir,outDir}={}){
 if(typeof studyDir!=='string'||!path.isAbsolute(studyDir)||
  typeof outDir!=='string'||!path.isAbsolute(outDir)||fs.existsSync(outDir))
  fail('PATHS');
 if(fs.lstatSync(studyDir).isSymbolicLink())fail('SOURCE_SYMLINK');
 const study=fs.realpathSync(studyDir),out=path.resolve(outDir);
 if(isChild(study,out)||isChild(out,study)||
    fs.realpathSync(path.dirname(out))!==path.dirname(study))
  fail('PRIVATE_SIBLING_ONLY');
 const original=JSON.parse(fileText(study,'CROSS_GENRE_REPORT.json',600000));
 if(original.schema!=='r125-local-cross-genre-study-v1'||
  original.model!=='qwen3:14b'||original.testInjectionPresent!==false||
  original.modelCalls!==5||!Array.isArray(original.cases)||
  original.cases.length!==GENRES.length)
  fail('ORIGINAL_REPORT_NOT_ELIGIBLE');
 const checked=[];
 for(const [i,g] of GENRES.entries()){
  const saved=original.cases[i],folder=path.join(study,'cases',g.id);
  if(saved?.id!==g.id||saved.genre!==g.genre||!isChild(study,folder))
   fail('CASE_ORDER_OR_ID');
  if(fs.lstatSync(folder).isSymbolicLink())fail('CASE_SYMLINK');
  const caseReport=JSON.parse(fileText(folder,'CASE_REPORT.json',50000));
  if(caseReport.id!==saved.id||caseReport.status!==saved.status||
   caseReport.rawSha256!==saved.rawSha256||
   caseReport.geometrySha256!==saved.geometrySha256)
   fail('CASE_RECEIPT_DRIFT_'+g.id);
  const row={id:g.id,genre:g.genre,originalStatus:saved.status,
   originalRawSha256:saved.rawSha256,storedGeometrySha256:saved.geometrySha256,
   rawIntegrity:'NOT_CHECKED',sourceReplay:'NOT_TESTED',
   issues:[],inGameWalking:'NOT_TESTED',humanArt:'NOT_REVIEWED'};
  if(saved.rawSha256){
   const raw=fileText(folder,'MODEL_RESPONSE_ORIGINAL.txt',40000);
   if(sha(raw)!==saved.rawSha256)fail('RAW_INTEGRITY_'+g.id);
   row.rawIntegrity='SHA256_MATCHED';
   let plan;
   try{plan=JSON.parse(raw)}catch{row.issues=[{path:'modelRaw',code:'NOT_JSON'}]}
   if(plan){
    row.issues=inspectSpatialPlanFields(plan);
    if(!row.issues.length){
     try{
      const product=compileSpatialComposition(plan);
      row.replayedGeometrySha256=product.geometrySha256;
      row.sourceReplay=saved.geometrySha256===product.geometrySha256?
       'MATCHED_SAVED_GEOMETRY':'SOURCE_NEW_OR_OLD_NO_MATCH';
      if(saved.geometrySha256&&row.sourceReplay!=='MATCHED_SAVED_GEOMETRY')
       row.issues.push({path:'source',code:'SAVED_GEOMETRY_DRIFT'});
      if(!saved.geometrySha256)
       row.sourceReplay='OFFLINE_SOURCE_NOW_COMPILED_NOT_ORIGINAL_QWEN_RETRY';
     }catch(e){
      row.sourceReplay='HOLD_ORIGINAL_SOURCE';
      row.issues.push({path:'source',code:'SOURCE_COMPILER_HOLD',
       reason:String(e?.message??e).slice(0,160)});
     }
    }else row.sourceReplay='HOLD_ORIGINAL_IR';
   }
  }else row.issues=[{path:'originalRaw',code:'RAW_NOT_CAPTURED'}];
  checked.push(row);
 }
 const report={schema:'r125-saved-cross-genre-offline-diagnostic-v1',
  originalStatus:original.status,originalStudyPath:study,
  originalReportSha256:sha(fileText(study,'CROSS_GENRE_REPORT.json',600000)),
  cases:checked,
  errorsByField:Object.entries(checked.flatMap(c=>c.issues).reduce((a,i)=>{
   const k=i.code;a[k]=(a[k]??0)+1;return a},{}))
   .map(([code,caseCount])=>({code,issueCount:caseCount})),
  originalCompiledCount:original.analysis?.sourceCompiled,
  inspectedCases:checked.length,reInferenceCalls:0,
  originalModelCalls:original.modelCalls,
  status:'OFFLINE_DIAGNOSTIC_COMPLETE_EXISTING_HOLD_PRESERVED',
  worldContacts:0,worldWrites:0,readiness:'NOT_PREPARED',
  BuildPlan:{operations:[]},gates:Array(9).fill('BLOCKED'),
  humanArt:'NOT_REVIEWED',minecraftWalking:'NOT_TESTED'};
 fs.mkdirSync(out);
 fs.writeFileSync(path.join(out,'DIAGNOSTIC_REPORT.json'),
  JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 return {...report,outputFolder:out};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const argv=process.argv.slice(2);
  if(argv.length!==4||argv[0]!=='--study'||argv[2]!=='--out')fail('ARGS');
  const result=diagnoseSavedGenreBatch({studyDir:path.resolve(argv[1]),
   outDir:path.resolve(argv[3])});
  console.log(JSON.stringify({status:result.status,
   cases:result.cases.map(c=>({genre:c.genre,sourceReplay:c.sourceReplay,
    issues:c.issues})),out:result.outputFolder,
   reInferenceCalls:0,worldWrites:0},null,2));
 }catch(e){console.error(String(e.message??e));process.exitCode=2}
}
