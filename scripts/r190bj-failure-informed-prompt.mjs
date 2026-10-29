/** R190-BJ: failure-informed alternate prompt. OFFLINE only: no model, network or world use. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {buildR190BCDesignFirstPrompt} from './r190bc-design-first-section.mjs';
import {inspectR190BHArchivedOriginal} from './r190bh-actual-original-postmortem.mjs';

export const R190BJ_SCHEMA='minecraftaibuilder-r190bj-failure-informed-prepared-v1';
const H=b=>createHash('sha256').update(b).digest('hex');
const fail=s=>{throw Error('R190BJ_'+s)};
const sha=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const dir=p=>{try{const st=fs.lstatSync(p);return st.isDirectory()&&!st.isSymbolicLink()}catch{return false}};
function read(p,max=120000){
 const st=fs.lstatSync(p);if(!st.isFile()||st.isSymbolicLink()||
   st.size<2||st.size>max)fail('UNSAFE_INPUT');
 return fs.readFileSync(p);
}
const text=b=>new TextDecoder('utf-8',{fatal:true}).decode(b);
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
 worldContacts:0,worldWrites:0,modelCalls:0,art:'ART_HOLD',officialArtAdoptions:0});
const validSafe=x=>x?.readiness==='NOT_PREPARED'&&
 x.constructionApproved===false&&x.executionAllowed===false&&x.worldContacts===0&&
 x.worldWrites===0&&x.modelCalls===0&&x.art==='ART_HOLD'&&
 x.officialArtAdoptions===0&&x.gates?.length===9&&
 x.gates.every(v=>v==='BLOCKED')&&Array.isArray(x.BuildPlan?.operations)&&
 x.BuildPlan.operations.length===0;
// Code -> non-category-specific design instruction; NEVER provide a prefabricated building.
const RULES={
 TOP_LEVEL_CONTRACT_DRIFT:'JSONの最上位はdesign, explanation, assumptions, spatialPlanの4キーだけ。attemptやmaxAttemptsなどを回答に入れない。',
 B143_SCHEMA_MISMATCH:'design.schemaにはminecraftaibuilder-b143-building-dsl-v1を正確に指定し、省略形のb143は禁止。',
 CUT_HAS_FORBIDDEN_MATERIAL:'CUT要素はmaterialキーを完全に省略する。material:nullも不正。ADD要素には認められた材質を使う。',
 STAIRCASE_UNSUPPORTED_AXIS:'B143階段のaxisはxまたはzのみ。y方向の上昇はstepsとorigin.yで定め、両端の立脚床・頭上空気・着地点を設計する。',
 STANDING_POINT_INTERSECTS_LITERAL_ADD_BOX:'入口と目的地[x,y,z]は固体でなく立脚空気点にし、真下y-1に支持床、頭上にheadroom分の空気を残す。最終ADD/CUT順序で照合する。',
 HEADROOM_EXTENDS_PAST_BOUNDS:'入口・目的地のy+headroomはbounds.height以下とする。上階の床と人が立つ空間を重ねない。',
 MODEL_STANDING_POINT_OUT_OF_BOUNDS:'入口・目的地をbounds内へ置き、床支持と空気を最終形状で一致させる。',
 DECLARED_VOID_INTERSECTS_LITERAL_ADD_BOX:'吹抜けや保護空洞は、名前でなく最後のADD/CUT後の真の空洞として確保する。'
};
export function buildR190BJPrompt(brief,diagnosis){
 if(!diagnosis||!sha(diagnosis.originalSha256)||
  diagnosis.originalUnmodified!==true||diagnosis.sourceGeometryProduced!==false||
  !Array.isArray(diagnosis.literalFindings))fail('DIAGNOSIS');
 const observed=[...new Set(diagnosis.literalFindings.map(x=>x.code))]
  .filter(x=>Object.hasOwn(RULES,x)).sort();
 if(observed.length<3||!observed.includes('B143_SCHEMA_MISMATCH')||
  !observed.includes('STANDING_POINT_INTERSECTS_LITERAL_ADD_BOX'))
   fail('NOT_RELEVANT_ARCHIVED_FAILURE');
 const prompt=[buildR190BCDesignFirstPrompt(brief),'',
  '【R190-BJ 実保存原文の失敗を踏まえた設計者自身による自己整合チェック】',
  '以下は過去の別モデル回答に見つかった一般的な失敗型です。今回の用途・寸法・形はあなた自身が元の依頼から決めてください。',
  ...observed.map(code=>RULES[code]),
  '最終ADD/CUTの床・開口・入口・階段・空洞・屋根と立脚空間を自分で照合し、未成立は未成立と記してください。形式的な正しさだけで、美観や実際の歩行の合格は主張しないでください。'
 ].join('\n');
 if(prompt.length>8000)fail('PROMPT_TOO_LONG');
 return {prompt,observed};
}
export function prepareR190BJOffline({briefPath,archivedOriginalPath,
 expectedBriefSha256,expectedOriginalSha256,outDir}){
 if([briefPath,archivedOriginalPath,outDir].some(p=>
  typeof p!=='string'||!path.isAbsolute(p))||
  !sha(expectedBriefSha256)||!sha(expectedOriginalSha256))fail('INPUTS');
 if(!dir(path.dirname(outDir))||fs.existsSync(outDir))fail('FRESH_DIR');
 const input=read(briefPath,20000),raw=read(archivedOriginalPath);
 if(H(input)!==expectedBriefSha256||H(raw)!==expectedOriginalSha256)
  fail('INPUT_SHA');
 const diagnosis=inspectR190BHArchivedOriginal(raw,{expectedSha256:H(raw)});
 const {prompt,observed}=buildR190BJPrompt(text(input),diagnosis);
 const p=Buffer.from(prompt,'utf8'),d=Buffer.from(JSON.stringify(diagnosis,null,2)+'\n');
 const receipt={schema:R190BJ_SCHEMA,variant:'BJ_FAILURE_INFORMED',
  originalBriefSha256:H(input),modelRequestPromptSha256:H(p),
  archivedOriginalSha256:H(raw),archivedDiagnosisSha256:H(d),
  observedFailureCodes:observed,originalUnmodified:true,
  sourceOnly:true,originalModelIdentityIndependentlyVerified:false,
  hostGeneratedGeometry:false,newModelRequests:0,architecturalQuality:'NOT_CERTIFIED',
  ...safe()};
 if(H(read(briefPath,20000))!==H(input)||H(read(archivedOriginalPath))!==H(raw))
  fail('INPUT_CHANGED');
 fs.mkdirSync(outDir);
 for(const [name,data] of [
  ['ORIGINAL_BRIEF.txt',input],['DESIGN_FIRST_PROMPT.txt',p],
  ['R190BJ_ARCHIVED_ORIGINAL.txt',raw],['R190BJ_ARCHIVED_DIAGNOSIS.json',d],
  ['R190BJ_PROMPT_RECEIPT.json',Buffer.from(JSON.stringify(receipt,null,2)+'\n')]
 ])fs.writeFileSync(path.join(outDir,name),data,{flag:'wx'});
 return {directory:outDir,...receipt};
}
export function inspectR190BJPrepared(root){
 if(typeof root!=='string'||!path.isAbsolute(root)||!dir(root)||
   fs.existsSync(path.join(root,'R190BC_PROMPT_RECEIPT.json')))
   fail('PREPARED_DIR');
 const get=(n,max)=>read(path.join(root,n),max);
 const input=get('ORIGINAL_BRIEF.txt',20000),
  raw=get('R190BJ_ARCHIVED_ORIGINAL.txt'),
  prompt=get('DESIGN_FIRST_PROMPT.txt',25000),
  dbytes=get('R190BJ_ARCHIVED_DIAGNOSIS.json'),
  receipt=JSON.parse(text(get('R190BJ_PROMPT_RECEIPT.json',16000)));
 if(receipt.schema!==R190BJ_SCHEMA||receipt.variant!=='BJ_FAILURE_INFORMED'||
   !validSafe(receipt)||receipt.originalUnmodified!==true||
   receipt.newModelRequests!==0||receipt.hostGeneratedGeometry!==false||
   receipt.originalModelIdentityIndependentlyVerified!==false||
   receipt.originalBriefSha256!==H(input)||receipt.modelRequestPromptSha256!==H(prompt)||
   receipt.archivedOriginalSha256!==H(raw)||
   receipt.archivedDiagnosisSha256!==H(dbytes))fail('PREPARED_SHA_OR_SAFETY');
 const actual=inspectR190BHArchivedOriginal(raw,{expectedSha256:H(raw)});
 if(!dbytes.equals(Buffer.from(JSON.stringify(actual,null,2)+'\n')))
  fail('EVIDENCE_DRIFT');
 const rebuilt=buildR190BJPrompt(text(input),actual);
 if(!prompt.equals(Buffer.from(rebuilt.prompt))||
  JSON.stringify(rebuilt.observed)!==JSON.stringify(receipt.observedFailureCodes))
  fail('PROMPT_DRIFT');
 return {briefSha256:H(input),promptSha256:H(prompt),prompt:rebuilt.prompt,
  promptKind:'BJ_FAILURE_INFORMED',archivedOriginalSha256:H(raw)};
}
export function parseR190BJArgs(argv){
 if(argv.length===1&&argv[0]==='--help')return {help:true};
 if(argv.length!==10)fail('FLAGS');
 const opts={};
 for(let i=0;i<argv.length;i+=2){
  const k={'--brief':'briefPath','--brief-sha':'expectedBriefSha256',
   '--archived-original':'archivedOriginalPath','--archived-sha':'expectedOriginalSha256',
   '--out':'outDir'}[argv[i]];
  if(!k||Object.hasOwn(opts,k)||!argv[i+1])fail('FLAGS');
  opts[k]=argv[++i];
 }
 if(Object.keys(opts).length!==5)fail('FLAGS');
 for(const k of ['briefPath','archivedOriginalPath','outDir'])
  opts[k]=path.resolve(opts[k]);
 return opts;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const opts=parseR190BJArgs(process.argv.slice(2));
  console.log(JSON.stringify(opts.help?{help:'Offline only: --brief FILE --brief-sha HASH --archived-original FILE --archived-sha HASH --out NEW_DIR; no model calls'}:
   prepareR190BJOffline(opts),null,2));
 }catch(e){console.error(String(e?.message??e));process.exitCode=1}
}
