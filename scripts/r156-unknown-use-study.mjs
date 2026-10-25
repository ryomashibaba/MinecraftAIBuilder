/**
 * R156: three previously unseen uses -> the SAME existing local LLM and
 * B143 graph/roofline compiler. No world contact and no silent retries.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {runR134FreshModel,parseR134FreshArgs} from './r134-fresh-model-pilot.mjs';
export const R156_CASES=Object.freeze([
 {id:'home',use:'住宅',brief:'敷地32×32以内に、小さな住宅を独自に設計してください。睡眠、食事、くつろぎ、収納などに必要な活動を選び、3〜4室と各室の設備、入口、窓、実際に使える室内動線をまとめて構想してください。外形、部屋のつながり、屋根、素材も自分で選んでください。別用途の建物を名前だけ変えて流用しないでください。'},
 {id:'shop',use:'店舗',brief:'敷地32×32以内に、小さな店舗を独自に設計してください。来店客と店員が利用する場所を区別し、3〜4室と各室の設備、入口、窓、実際に使える動線をまとめて構想してください。扱う商品、部屋のつながり、外形、屋根、素材は自分で選んでください。住宅の部屋名だけを変えた構成にしないでください。'},
 {id:'laboratory',use:'研究施設',brief:'敷地32×32以内に、小さな研究施設を独自に設計してください。実験、観測、記録、議論などから必要な活動を選び、3〜4室と各室の設備、入口、窓、安全に使える動線をまとめて構想してください。研究分野、部屋のつながり、外形、屋根、素材は自分で選んでください。店舗の部屋名だけを変えた構成にしないでください。'}
]);
const fail=s=>{throw Error('R156_'+s);};
const hash=s=>createHash('sha256').update(s).digest('hex');
const write=(dir,name,o)=>fs.writeFileSync(path.join(dir,name),
 typeof o==='string'?o:JSON.stringify(o,null,2)+'\n',{flag:'wx'});
const uniq=arr=>new Set(arr.filter(x=>x!==null&&x!==undefined)).size;
const safe=r=>r?.readiness==='NOT_PREPARED'&&
 r?.constructionApproved===false&&r?.executionAllowed===false&&
 r?.worldWrites===0&&r?.worldContacts===0&&
 r?.gates?.length===9&&r.gates.every(x=>x==='BLOCKED')&&
 Array.isArray(r.BuildPlan?.operations)&&r.BuildPlan.operations.length===0;
function shapeSignature(p){
 if(!p||typeof p!=='object')return null;
 const rooms=p.layout?.spaces??[];
 return JSON.stringify({footprint:p.footprint,materials:p.materials,axis:p.layout?.axis,
  weights:rooms.map(z=>z.weight),form:p.form,
  roles:(p.objects??[]).map(o=>o.role).sort(),
  entryIndex:rooms.findIndex(z=>z.id===p.relations?.entryFacingZoneId),
  edges:(p.relations?.directAdjacencies??[]).map(e=>e.map(id=>rooms.findIndex(z=>z.id===id)).sort()).sort(),
  architecture:p.architecture});
}
export function evaluateR156Study(rows){
 if(rows?.length!==3||rows.some((r,i)=>r.id!==R156_CASES[i].id))fail('CASE_CONTRACT');
 const cases=rows.map(x=>{
  const r=x.report,raw=x.originalRawSha256;
  const verified=Boolean(r?.status?.startsWith('SOURCE_CANDIDATE_REAL_LOCAL_')&&
   r.modelAuthoredProgram===true&&r.testInjectionPresent===false&&
   r.originalModelResponseCaptured===true&&r.architectureIntentFromModel===true&&
   r.eachRoomHasModelChosenEquipment===true&&
   r.newRealB143Source===true&&
   r.sourceRoutes==='SOURCE_ROUTES_REACH_ALL_ZONES'&&
   typeof raw==='string'&&raw.length===64);
  return {id:x.id,use:x.use,brief:x.brief,status:r?.status??'MISSING_REPORT',
   model:r?.model??null,modelCalls:r?.modelCalls??0,rawSha256:raw,
   sourceSha256:r?.sourceSha256??null,geometrySha256:r?.geometrySha256??null,
   rooms:r?.zoneCount??null,equipment:r?.equipmentCount??null,
   voxels:r?.voxels??null,sourceRoutes:r?.sourceRoutes??'NOT_CHECKED',
   safe:safe(r),newLocalResponseCandidate:verified,
   provenance:r?.testInjectionPresent?'TEST_DOUBLE_NOT_REAL_INFERENCE':
    'LOCAL_HTTP_RESPONSE_NOT_EXTERNALLY_AUTHENTICATED',
   shapeSignature:shapeSignature(x.parsedRaw),
   humanArtReview:'ART_HOLD',minecraftWalking:'NOT_TESTED'};
 });
 const qualified=cases.filter(c=>c.newLocalResponseCandidate).length;
 const semantic=uniq(cases.map(c=>c.shapeSignature));
 const geometry=uniq(cases.map(c=>c.geometrySha256));
 const source=uniq(cases.map(c=>c.sourceSha256));
 const status=cases.some(c=>!c.safe)?'HOLD_SAFETY_INVARIANT':
  qualified!==3?'HOLD_REAL_MODEL_EVIDENCE_INCOMPLETE':
  semantic===1||geometry===1?'HOLD_DESIGN_CONVERGENCE':
  'HOLD_VISUAL_AND_MINECRAFT_REVIEW_PENDING';
 return {schema:'r156-unknown-use-v1',status,sourceOnly:true,
  realModelCandidateCases:qualified,
  semanticDistinctCount:semantic,sourceDistinctCount:source,geometryDistinctCount:geometry,
  diversityDisclaimer:'Signatures exclude room labels; distinct signatures do NOT prove attractive or usable buildings',
  authenticityDisclaimer:'Local HTTP provider identity cannot be independently authenticated here',
  humanArtReview:'ART_HOLD',minecraftWalking:'NOT_TESTED',modelGeneralization:'NOT_PROVEN',
  safeBlocked:cases.every(c=>c.safe),worldWrites:0,cases};
}
export function parseR156Args(argv){
 if(argv.length===1&&argv[0]==='--help')return {help:true};
 if(argv.length%2)fail('CLI_PAIRS');
 const opts={},allowed=new Set(['--model','--out','--architecture']);
 for(let i=0;i<argv.length;i+=2){
  if(!allowed.has(argv[i])||opts[argv[i]]!==undefined||!argv[i+1]||argv[i+1].startsWith('--'))fail('CLI');
  opts[argv[i]]=argv[i+1];
 }
 const model=opts['--model']??'qwen3:14b',architectureMode=opts['--architecture']??'roofline';
 if(!['roofline','volumes','massing','spatial','floorplan'].includes(architectureMode))fail('ARCHITECTURE');
 const suffix=new Date().toISOString().replace(/[-:.TZ]/g,'');
 const outDir=path.resolve(opts['--out']??('r156-unknown-use-'+suffix));
 parseR134FreshArgs(['--model',model,'--brief',R156_CASES[0].brief,
  '--out',outDir,'--equipment','assembled','--topology','graph',
  '--architecture',architectureMode]);
 return {model,architectureMode,outDir};
}
export async function runR156Study({model='qwen3:14b',architectureMode='roofline',outDir}={},
 {fetcher=fetch}={}){
 if(!outDir||fs.existsSync(outDir))fail('OUTPUT_MUST_BE_NEW');
 const cli=parseR134FreshArgs(['--model',model,'--brief',R156_CASES[0].brief,
  '--out',outDir,'--equipment','assembled','--topology','graph',
  '--architecture',architectureMode]);
 if(typeof fetcher!=='function')fail('FETCHER');
 const root=path.resolve(outDir);fs.mkdirSync(root,{recursive:false});
 const rows=[];
 for(const c of R156_CASES){
  const dir=path.join(root,c.id);
  const report=await runR134FreshModel({...cli,brief:c.brief,outDir:dir},{fetcher});
  if(!safe(report))fail('SAFETY_'+c.id);
  const rawFile=path.join(dir,'MODEL_RAW_ORIGINAL.txt');
  const raw=fs.existsSync(rawFile)?fs.readFileSync(rawFile,'utf8'):null;
  let parsedRaw=null;
  if(raw!==null){try{parsedRaw=JSON.parse(raw);}catch{/* Raw preserved for review. */}}
  rows.push({...c,report,parsedRaw,originalRawSha256:raw===null?null:hash(raw)});
 }
 const summary=evaluateR156Study(rows);
 write(root,'R156_STUDY_MANIFEST.json',{...summary,model,architectureMode,
  transport:'LOCALHOST_OLLAMA_VIA_EXISTING_R134',injectedFakeHttp:fetcher!==fetch,
  archivedQwenSourceUnchanged:true,
  evidencePaths:'<case>/MODEL_RAW_ORIGINAL.txt, R134_MODEL_REPORT.json, DERIVED_B143_SOURCE.json, index.html'});
 write(root,'R156_REVIEW_FIRST_JA.md','# R156 未知用途審査\n\nCI模擬入力は実推論ではない。元回答と真正B143 index.htmlを住宅・店舗・研究施設ごとに開き、入口、室内、屋根、設備、用途の成立を評価する。ART HOLD/施工BLOCKEDは維持。\n\n'+
  summary.cases.map(c=>'- '+c.use+': '+c.status+' / '+c.provenance).join('\n')+'\n');
 return summary;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const a=parseR156Args(process.argv.slice(2));
  if(a.help)console.log('node scripts/r156-unknown-use-study.mjs [--model qwen3:14b] [--out NEW_DIR] (3 localhost responses, no Minecraft writes)');
  else{
   const r=await runR156Study(a);
   console.log(JSON.stringify({status:r.status,out:a.outDir,cases:r.cases.map(c=>({use:c.use,status:c.status})),worldWrites:0},null,2));
   if(r.status==='HOLD_SAFETY_INVARIANT')process.exitCode=2;
  }
 }catch(e){console.error(String(e?.message??e));process.exitCode=2;}
}
