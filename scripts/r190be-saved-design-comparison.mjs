/** R190-BE: saved direct-B143 vs BC/BD design-first; no provider import/call. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {inspectR190BDPrepared} from './r190bd-consented-design-first.mjs';
import {reviewR4PlannedProposal} from '../source/ai/b198zr4-planned-source.mjs';
import {compileDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {reviewR190BCOriginal,renderR190BCSectionSVG} from './r190bc-design-first-section.mjs';
import {compareR190TSource} from './r190t-source-comparison.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
import {renderR164Elevation} from './r164-exterior-audit.mjs';

const H=x=>createHash('sha256').update(x).digest('hex');
const fail=x=>{throw Error('R190BE_'+x)};
const safe=r=>r?.readiness==='NOT_PREPARED'&&r.constructionApproved===false&&
 r.executionAllowed===false&&r.worldContacts===0&&r.worldWrites===0&&
 r.gates?.length===9&&r.gates.every(x=>x==='BLOCKED')&&
 Array.isArray(r.BuildPlan?.operations)&&r.BuildPlan.operations.length===0;
const security=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
 worldContacts:0,worldWrites:0,modelCalls:0,art:'ART_HOLD',officialArtAdoptions:0});
const folder=p=>{try{const s=fs.lstatSync(p);return s.isDirectory()&&!s.isSymbolicLink()}
 catch{return false}};
function read(dir,name,max=200000){
 if(!folder(dir))fail('UNSAFE_DIRECTORY');
 const p=path.join(dir,name),s=fs.lstatSync(p);
 if(!s.isFile()||s.isSymbolicLink()||s.size<1||s.size>max)fail('UNSAFE_'+name);
 return fs.readFileSync(p);
}
const decode=b=>new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(b);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;',
 '>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Receipts are unsigned provenance claims. Recompute R4, BC and geometry;
// never infer completeness from parseable JSON or trust a saved PASS label.
function capture(dir,expectedPrompt){
 if(dir===null)return {summary:{status:'MISSING_SAVED_CAPTURE'},files:[]};
 const receiptFile=fs.existsSync(path.join(dir,'R190_H_RECEIPT.json'))?
  'R190_H_RECEIPT.json':'R190_I_CAPTURE_RECEIPT.json';
 const receiptBytes=read(dir,receiptFile,45000),receipt=JSON.parse(receiptBytes);
 const raw=read(dir,'R190_I_ORIGINAL_RESPONSE.txt');
 const prompt=read(dir,'R190_I_ORIGINAL_BRIEF.txt',25000);
 const full=receipt.schema==='minecraftaibuilder-r190-h-direct-b143-research-v1';
 if(!safe(receipt)||(!full&&receipt.schema!=='minecraftaibuilder-r190-j-capture-v1')||
  receipt.rawProviderBytesPreserved!==true||typeof receipt.modelRequested!=='string'||
  receipt.modelRequested.length>140||receipt.originalRawSha256!==H(raw)||
  receipt.originalRequestSha256!==H(prompt)||!prompt.equals(Buffer.from(expectedPrompt))||
  (full&&(receipt.hostModifiedModelSource!==false||receipt.hostFilledGeometry!==false)))
  fail('CAPTURE_SHA_PROMPT_OR_SAFETY');
 const summary={status:'HOLD_PROVIDER_COMPLETION_UNPROVEN',originalSha256:H(raw),
  promptSha256:H(prompt),receiptSha256:H(receiptBytes),
  modelClaimed:receipt.modelRequested,transportClaimed:receipt.transport??null,
  providerIdentityVerified:false,receiptIsUnsigned:true,
  providerCompletionClaimed:full||receipt.providerConfirmedComplete===true,
  r4Status:'NOT_RUN',sectionStatus:'NOT_RUN',geometrySha256:null};
 const files=[{name:receiptFile,sha256:H(receiptBytes)},
  {name:'R190_I_ORIGINAL_RESPONSE.txt',sha256:H(raw)},
  {name:'R190_I_ORIGINAL_BRIEF.txt',sha256:H(prompt)}];
 if(!summary.providerCompletionClaimed)return {summary,files};
 let design,compiled;
 try{
  design=JSON.parse(decode(raw)).design;compiled=compileDesign(design);
  if(!verifyCompiled(design,compiled))fail('COMPILER');
 }catch(e){summary.status='HOLD_INVALID_B143';
  summary.failure=String(e.message).slice(0,180);return {summary,files};}
 const source=receipt.sourceSha256??receipt.unapprovedGeometryEvidence?.sourceSha256;
 const geometry=receipt.geometrySha256??receipt.unapprovedGeometryEvidence?.geometrySha256;
 if(source!==compiled.sourceSha256||geometry!==compiled.geometrySha256)
  fail('CAPTURE_GEOMETRY_HASH_CHAIN');
 summary.sourceSha256=compiled.sourceSha256;summary.geometrySha256=compiled.geometrySha256;
 let plan=null;
 try{const r4=reviewR4PlannedProposal(decode(raw));
  summary.r4Status=r4.status;plan=r4.plan;
 }catch(e){summary.r4Status='HOLD_INVALID_R4';summary.r4Failure=String(e.message).slice(0,180);}
 const section=reviewR190BCOriginal(raw,{expectedSha256:H(raw)});
 summary.sectionStatus=section.status;
 summary.status=summary.r4Status!=='SOURCE_AND_DECLARED_SPATIAL_CLAIMS_FORMALLY_PASS'?
  'HOLD_R4_SOURCE_REFERENCE_ONLY':section.status!=='SOURCE_SECTION_PROXIES_AVAILABLE_ART_HOLD'?
   'HOLD_SECTION_SOURCE_REFERENCE_ONLY':'SOURCE_REVIEW_AVAILABLE_ART_HOLD';
 return {summary,files,design,compiled,plan,section};
}

/** Explicit paths only: no automatic search or fallback to a different design. */
export function compareR190BESaved({prepared,baseline=null,candidate=null,out}){
 if(typeof prepared!=='string'||typeof out!=='string'||
  [baseline,candidate].some(p=>p!==null&&typeof p!=='string'))fail('OPTIONS');
 const prep=path.resolve(prepared),source=inspectR190BDPrepared(prep);
 const briefBytes=read(prep,'ORIGINAL_BRIEF.txt',20000),brief=decode(briefBytes);
 const dirs=[baseline,candidate].map(p=>p===null?null:path.resolve(p));
 const target=path.resolve(out);
 for(const input of [prep,...dirs.filter(Boolean)]){
  const relative=path.relative(input,target);
  if(relative===''||(!relative.startsWith('..'+path.sep)&&relative!=='..'&&
    !path.isAbsolute(relative)))fail('OUTPUT_INSIDE_INPUT');
 }
 if(fs.existsSync(target)||!folder(path.dirname(target)))fail('FRESH_OUTPUT_REQUIRED');
 const A=capture(dirs[0],brief),B=capture(dirs[1],source.prompt);
 const pair=A.design&&B.design?compareR190TSource({beforeDesign:A.design,
  afterDesign:B.design,beforePlan:A.plan,afterPlan:B.plan}):null;
 const report={schema:'minecraftaibuilder-r190be-saved-design-comparison-v1',
  status:!baseline||!candidate?'HOLD_MISSING_SAVED_PAIR':!pair?
   'HOLD_SOURCE_PAIR_NOT_COMPARABLE':pair.samePhysicalVoxels?
    'NO_PHYSICAL_CHANGE_ART_HOLD':'SAVED_SOURCE_PAIR_AVAILABLE_ART_HOLD',
  originalBriefSha256:source.briefSha256,designFirstPromptSha256:source.promptSha256,
  A:A.summary,B:B.summary,physicalComparison:pair,
  sameClaimedModel:A.summary.modelClaimed&&B.summary.modelClaimed?
   A.summary.modelClaimed===B.summary.modelClaimed:null,
  sameClaimedTransport:A.summary.transportClaimed&&B.summary.transportClaimed?
   A.summary.transportClaimed===B.summary.transportClaimed:null,
  generationControls:'NOT_ESTABLISHED_FROM_LEGACY_RECEIPTS',
  confounders:['Provider/model digest, sampling, context and output budgets not jointly verified',
   'Single saved pair cannot establish generalization or causal improvement',
   'Model-declared zones are not independent program acceptance',
   'BC certifies only same-height two-wide access; vertical access remains unproven'],
  qualityImprovement:'NOT_ESTABLISHED',winner:'NOT_ESTABLISHED',
  humanReview:'UNSCORED',hostGeometryRepairs:0,actualMinecraftWalking:'NOT_TESTED',
  ...security()};
 const outputs=new Map();
 const template=fs.readFileSync(new URL('../source/ai/b143-viewer-template.html',import.meta.url),'utf8');
 for(const [id,entry] of [['A',A],['B',B]])if(entry.design){
  const gallery=compileB143Gallery([entry.design]);
  if(gallery.geometryHashes[0]!==entry.compiled.geometrySha256||
   gallery.sourceHashes[0]!==entry.compiled.sourceSha256)fail('VIEWER_HASH_CHAIN');
  outputs.set(id+'_3D.html',renderB143Html(gallery,template));
  for(const side of ['front','rear','west','east','roof'])
   outputs.set(id+'_'+side+'.svg',renderR164Elevation(entry.compiled,entry.design,side));
  outputs.set(id+'_SECTION.svg',renderR190BCSectionSVG(entry.section));
  outputs.set(id+'_SECTION.json',JSON.stringify(entry.section,null,2)+'\n');
 }
 // Unscored, brief- and geometry-bound rubric. No host-generated ratings.
 outputs.set('R190BE_HUMAN_REVIEW_TEMPLATE.json',JSON.stringify({
  schema:'r190be-unscored-human-review-v1',originalBriefSha256:source.briefSha256,
  A:A.summary.originalSha256??null,B:B.summary.originalSha256??null,
  geometryA:A.summary.geometrySha256,geometryB:B.summary.geometrySha256,
  reviewer:null,reviewedAt:null,criteria:[
   '元依頼の用途と利用者への適合','入口からの空間体験と使える内部',
   '質量・空洞・屋根・支持の造形的一貫性','独創性と依頼に応じた設計判断'
  ].map(criterion=>({criterion,scoreA:null,scoreB:null,evidenceA:null,evidenceB:null})),
  scale:'0..4; attach exact view and source observations; leave unassessed criteria null',
  art:'ART_HOLD',officialArtAdoptions:0},null,2)+'\n');
 const panel=(id,e)=>'<section><h2>'+id+'</h2><p>'+escape(e.summary.status)+'</p>'+
  (e.design?'<iframe title="'+id+' original B143" src="'+id+'_3D.html"></iframe>'+
   '<p>'+['front','rear','west','east','roof'].map(side=>'<a href="'+id+'_'+side+
    '.svg">'+side+'</a>').join(' / ')+' / <a href="'+id+'_SECTION.svg">断面</a></p>':
   '<p>検証済みの完成B143がないため3Dはありません。</p>')+'</section>';
 outputs.set('R190BE_COMPARE.html','<!doctype html><html lang="ja"><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<title>R190-BE 保存原文比較 — ART HOLD</title><style>'+ 
  'body{font:16px system-ui;background:#131c28;color:#eee;margin:24px;line-height:1.6}'+
  'a{color:#9fd4ff}main{display:grid;grid-template-columns:1fr 1fr;gap:20px}'+
  'iframe{width:100%;height:60vh;border:1px solid #789}pre{white-space:pre-wrap}'+
  '@media(max-width:850px){main{grid-template-columns:1fr}}</style>'+
  '<h1>保存原文の真正B143比較 — ART HOLD</h1><p>'+escape(report.status)+'</p>'+
  '<p>A＝元依頼の直接B143、B＝同じ元依頼＋BC設計先行。新規推論0、形状補修0。'+
  '形式・動線・断面のHOLDは各案で維持します。数値差から美術の勝者を選びません。</p>'+
  '<details><summary>元の日本語依頼</summary><pre>'+escape(brief)+'</pre></details>'+
  '<main>'+panel('A',A)+panel('B',B)+'</main>'+
  '<p>モデル名・予算・サンプリング等の生成条件は未確認。改善・因果・汎用性は未立証。</p>'+
  '<p><a href="R190BE_COMPARE.json">原文SHA・条件差・測定結果</a> / '+
  '<a href="R190BE_HUMAN_REVIEW_TEMPLATE.json">未採点の人間審査票</a></p></html>');
 // Recheck the exact input bytes before committing any derivative output.
 for(const [dir,entry] of [[dirs[0],A],[dirs[1],B]])for(const f of entry.files)
  if(H(read(dir,f.name))!==f.sha256)fail('INPUT_CHANGED');
 if(H(read(prep,'ORIGINAL_BRIEF.txt'))!==source.briefSha256||
  H(read(prep,'DESIGN_FIRST_PROMPT.txt'))!==source.promptSha256)fail('INPUT_CHANGED');
 outputs.set('R190BE_COMPARE.json',JSON.stringify(report,null,2)+'\n');
 fs.mkdirSync(target);
 for(const [name,content] of outputs)fs.writeFileSync(path.join(target,name),content,{flag:'wx'});
 return {...report,directory:target};
}
export function parseR190BEArgs(argv){
 if(argv.length===1&&argv[0]==='--help')return {help:true};
 if(argv.length%2)fail('ARGUMENTS');
 const keys={'--prepared':'prepared','--baseline':'baseline','--candidate':'candidate','--out':'out'},o={};
 for(let i=0;i<argv.length;i+=2){const key=keys[argv[i]];
  if(!key||Object.hasOwn(o,key)||!argv[i+1])fail('ARGUMENTS');o[key]=argv[i+1];}
 if(!o.prepared||!o.out)fail('ARGUMENTS');return o;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const o=parseR190BEArgs(process.argv.slice(2));
  const r=o.help?{help:'Offline only: --prepared BC_DIR --baseline SAVED_DIRECT_DIR --candidate SAVED_BD_MODEL_ORIGINAL_DIR --out NEW_DIR. Omitted capture => HOLD; never generates.'}:compareR190BESaved(o);
  console.log(JSON.stringify(r,null,2));if(r.status?.startsWith('HOLD'))process.exitCode=2;
 }catch(e){console.error(String(e.message));process.exitCode=1;}
}
