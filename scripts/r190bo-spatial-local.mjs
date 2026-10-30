/** BN -> native Ollama, explicit future approval, one POST, no discovery/retry.
 * prepare/replay never construct a network request. No Minecraft dependencies.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {buildSpatialRequest,hashBO} from '../source/ai/r190bo-spatial-model-contract.mjs';
import {compileR190BNAssembly} from '../source/ai/r190bn-spatial-assembly.mjs';
import {auditR190BQ} from '../source/ai/r190bq-independent-physical-program.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
import {renderR164Elevation} from './r164-exterior-audit.mjs';
import {reviewR190BCOriginal,renderR190BCSectionSVG} from './r190bc-design-first-section.mjs';

const ROOT=fileURLToPath(new URL('../',import.meta.url));
export const BO_ENDPOINT='http://127.0.0.1:11434/api/chat';
const fail=code=>{throw Error('R190BO_'+code)};
const json=x=>JSON.stringify(x,null,2)+'\n';
const write=(dir,name,bytes)=>fs.writeFileSync(path.join(dir,name),bytes,{flag:'wx'});
const safety=()=>({readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},constructionApproved:false,executionAllowed:false,
 worldContacts:0,worldWrites:0,art:'ART_HOLD',officialArtAdoptions:0});
function read(file,max=2000000){
 const st=fs.lstatSync(file);
 if(!st.isFile()||st.isSymbolicLink()||st.size>max)fail('INPUT_FILE');
 return fs.readFileSync(file);
}
function fresh(dir){
 if(fs.existsSync(dir)||!fs.lstatSync(path.dirname(dir)).isDirectory())fail('FRESH_OUTPUT_REQUIRED');
 fs.mkdirSync(dir);
}
// Pin the complete local static module graph plus viewer, not just the entry.
function sourcePins(){
 const seen=new Set(['source/ai/b143-viewer-template.html']);
 function visit(relative){
  if(seen.has(relative))return;seen.add(relative);
  const file=path.join(ROOT,relative),source=read(file).toString('utf8');
  for(const m of source.matchAll(/\bfrom\s*['"]([^'"]+)['"]/g)){
   if(!m[1].startsWith('.'))continue;
   const target=path.resolve(path.dirname(file),m[1]);
   if(!target.startsWith(ROOT))fail('SOURCE_OUTSIDE_REPOSITORY');
   visit(path.relative(ROOT,target).split(path.sep).join('/'));
  }
 }
 visit('scripts/r190bo-spatial-local.mjs');
 return [...seen].sort().map(file=>({file,sha256:hashBO(read(path.join(ROOT,file)))}));
}
export function verifyBM(){
 const base=path.join(ROOT,'evidence/r190bm');
 const inventory=JSON.parse(read(path.join(base,'INVENTORY.json')));
 for(const f of inventory.files)if(hashBO(read(path.join(base,f.file)))!==f.sha256)fail('BM_EVIDENCE_CHANGED');
 const brief=read(path.join(base,'USER_BRIEF.txt'),20000);
 if(hashBO(brief)!=='bbd44cc9f28234055601b4055466e2f3564e7e4565d408432de4c4fab0aa277a')fail('BM_BRIEF_CHANGED');
 return {brief,inventorySha256:hashBO(read(path.join(base,'INVENTORY.json'))),
  originalA:'e54f2abf87d36e0957d8393c960d2fce8075862d00ea1ea736365121a4b6a469',
  originalB:'8e2590128e8bd932cddc2df595fcc01c3cbd660298cedd445431d0787bb90c86'};
}
export function prepareBO({briefFile,model,out,...budgets}){
 const bm=verifyBM(),brief=briefFile?read(path.resolve(briefFile),20000):bm.brief;
 const request=buildSpatialRequest({brief,model,...budgets}),dir=path.resolve(out);
 const requestSha256=hashBO(request.bytes),approvalNonce=randomUUID();
 const approvalPhrase='R190BO-ONE-POST-'+requestSha256+'-'+approvalNonce;
 const preflight={schema:'minecraftaibuilder-r190bo-preflight-v1',status:'OFFLINE_READY_AWAITING_SEPARATE_HUMAN_APPROVAL',
  endpoint:BO_ENDPOINT,model,briefSha256:request.briefSha256,requestSha256,
  schemaPrompt:request.schemaPrompt,think:request.body.think??null,userMessageBytes:Buffer.byteLength(request.body.messages[1].content),
  schemaSha256:hashBO(JSON.stringify(request.schema)),sourcePins:sourcePins(),
  bmComparison:{sameOriginalBrief:hashBO(brief)===hashBO(bm.brief),inventorySha256:bm.inventorySha256,
   originalA:bm.originalA,originalB:bm.originalB,oldSourcesModified:false,
   causalComparison:'NOT_CONTROLLED: new IR, native transport, schema and context differ from BM'},
  approvalNonce,approvalPhrase,approvalGranted:false,previousBMApprovalReusable:false,
  maximumPostRequests:1,metadataRequests:0,automaticRetries:0,fallbacks:0,
  plannedTimeoutMs:900000,localModelInstalled:'NOT_QUERIED_OFFLINE',providerSchemaCompatibility:'NOT_TESTED_ON_REAL_OLLAMA',
  modelIdentityCryptographicallyVerified:false,networkRequests:0,modelCalls:0,
  requestBytes:request.bytes.length,mechanicalHashComputedByHost:true,
  designAuthorship:'MODEL_MUST_CHOOSE_PROGRAM_LAYOUT_LEVELS_MASSING_VOIDS_STAIRS_OPENINGS',...safety()};
 fresh(dir);
 write(dir,'ORIGINAL_BRIEF.txt',brief);write(dir,'EXACT_REQUEST.json',request.bytes);
 write(dir,'OUTPUT_SCHEMA.json',json(request.schema));write(dir,'PREFLIGHT.json',json(preflight));
 write(dir,'PREFLIGHT_JA.md',[
  '# R190-BO 実行前確認（通信0）',
  '状態：別途の人間の個別承認待ち。まだ実Ollamaへは一切接続していません。',
  'モデル：'+model+'。送信先：'+BO_ENDPOINT+'。POST最大1、GET 0、自動再試行0。',
  '元依頼SHA256：'+preflight.briefSha256+'。リクエストSHA256：'+requestSha256+'。',
  '思考制御：'+(request.body.think===undefined?'未指定':String(request.body.think))+'。',
  'Schema提示方式：'+request.schemaPrompt+'（repeated=既存二重提示、native-only=完全Schemaはnative formatのみ）。',
  'どちらも型、設計自由度、安全条件は同一。新モードの実モデル遵守率・美術の改善は未検証。',
  '元依頼・EXACT_REQUEST.json・OUTPUT_SCHEMA.jsonを確認してから個別承認してください。',
  '失敗や通信エラーでも同じ準備の試行ロックは消費され、再実行できません。再生成した準備も新たな承認が必要です。',
  'BM比較は同じ依頼を使う記述的研究です。IR・転送方式・型制約・contextの差があり、因果的優劣は認定しません。',
  '技術検査と原文忠実性・美術評価は別です。ART HOLD、Minecraft接触・施工禁止。',
  '承認フレーズ（このファイルの生成は承認ではありません）：`'+approvalPhrase+'`',''].join('\n'));
 return preflight;
}
export function inspectBO(prepared){
 const dir=path.resolve(prepared),p=JSON.parse(read(path.join(dir,'PREFLIGHT.json')));
 const brief=read(path.join(dir,'ORIGINAL_BRIEF.txt'),20000),request=read(path.join(dir,'EXACT_REQUEST.json'),64000);
 const body=JSON.parse(request);
 const rebuilt=buildSpatialRequest({brief,model:p.model,temperature:body.options?.temperature,
  seed:body.options?.seed,maxTokens:body.options?.num_predict,contextTokens:body.options?.num_ctx,schemaPrompt:p.schemaPrompt,think:body.think});
 if((p.think??null)!==(body.think??null)||!['repeated','native-only'].includes(p.schemaPrompt)||
  p.userMessageBytes!==Buffer.byteLength(rebuilt.body.messages[1].content)||
  p.endpoint!==BO_ENDPOINT||p.schema!=='minecraftaibuilder-r190bo-preflight-v1'||
  hashBO(brief)!==p.briefSha256||hashBO(request)!==p.requestSha256||!request.equals(rebuilt.bytes)||
  p.schemaSha256!==hashBO(JSON.stringify(rebuilt.schema))||
  !read(path.join(dir,'OUTPUT_SCHEMA.json')).equals(Buffer.from(json(rebuilt.schema)))||
  !/^[a-f0-9-]{36}$/.test(p.approvalNonce??'')||
  p.approvalPhrase!=='R190BO-ONE-POST-'+p.requestSha256+'-'+p.approvalNonce||
  JSON.stringify(p.sourcePins)!==JSON.stringify(sourcePins()))fail('PREFLIGHT_INTEGRITY');
 verifyBM();
 return {dir,p,brief,request,attemptConsumed:fs.existsSync(path.join(dir,'ATTEMPT_CONSUMED.json'))};
}
function inventoryBO(dir){
 const files=[];
 function walk(d,prefix=''){
  for(const ent of fs.readdirSync(d,{withFileTypes:true})){
   const name=prefix+ent.name;if(ent.isDirectory())walk(path.join(d,ent.name),name+'/');
   else if(name!=='INVENTORY.json'){const b=read(path.join(d,ent.name),20000000);files.push({file:name,bytes:b.length,sha256:hashBO(b)});}
  }
 }
 walk(dir);write(dir,'INVENTORY.json',json({files:files.sort((a,b)=>a.file.localeCompare(b.file)),exactSavedBytes:true}));
}

/** One local, source-anchored review entrypoint; no model, geometry or world operations. */
function emitReviewBO(dir,receipt){
 const escapeText=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const exists=file=>fs.existsSync(path.join(dir,file));
 const link=(file,label)=>exists(file)?'<a href="'+file+'">'+escapeText(label)+'</a>':'';
 const derivedStatus=receipt.status==='SOURCE_SPACE_AND_ROUTE_PROXIES_PRESENT_ART_HOLD'||
  receipt.status==='HOLD_DERIVED_SOURCE_FUNCTION'||
  receipt.status==='HOLD_INDEPENDENT_HIGHRISE_LEVELS';
 const show3D=derivedStatus&&exists('DERIVED_3D.html')&&!!receipt.geometrySha256;
 const original=read(path.join(dir,'MODEL_ORIGINAL.txt'),200000).toString('utf8');
 const brief=read(path.join(dir,'ORIGINAL_BRIEF.txt'),20000).toString('utf8');
 const views=show3D?['front','rear','west','east','roof'].filter(side=>exists('DERIVED_'+side+'.svg'))
  .map(side=>'<figure><a href="DERIVED_'+side+'.svg"><img loading="lazy" src="DERIVED_'+side+'.svg" alt="'+side+' exact projection"></a><figcaption>'+side+'</figcaption></figure>').join(''):'';
 const bqPath=path.join(dir,'PHYSICAL_PROGRAM_REVIEW.json');
 const bq=fs.existsSync(bqPath)?JSON.parse(read(bqPath)):null;
 const bqTable=bq?'<h2>3. 独立した最終ボクセル空間監査</h2>'+
  '<p class="warning">原依頼忠実性はHOLD。用途名はモデルの自己申告です。実立脚Y・支持床と空気のみ最終B143で再計測。</p>'+
  '<p>実際の空間の立脚Y：'+bq.physicalLevels.map(v=>escapeText(v)).join(', ')+
  '／高層ビル最低階数の前提：'+escapeText(bq.minimumLevelPrerequisite)+'</p>'+
  '<table style="width:100%;border-collapse:collapse"><thead><tr><th>宣言された用途</th><th>立脚Y</th><th>床面積</th><th>支持床</th><th>空気</th></tr></thead><tbody>'+
  bq.spaces.map(s=>'<tr>'+[
   s.id+' / '+s.sourceDeclaredPurpose,s.standingY,s.floorAreaCells,
   s.supportedFloorCells+'/'+s.floorAreaCells,s.verifiedAirCells+'/'+s.airVolumeCells
  ].map(v=>'<td style="border:1px solid #526079;padding:7px;overflow-wrap:anywhere">'+
   escapeText(v)+'</td>').join('')+'</tr>').join('')+'</tbody></table>'+
  '<h3>未認定の依頼条件</h3><ul>'+bq.mandatoryHumanChecks.map(c=>
   '<li>'+escapeText(c.question)+'：人間の審査待ち</li>').join('')+'</ul>':
  '<h2>3. 独立した最終ボクセル空間監査</h2>'+
  '<p class="warning">最終B143形状が成立しないため監査不能。依頼適合を推定しません。</p>';
 const links=[
  ['MODEL_ORIGINAL.txt','変更なしの元回答'],['ORIGINAL_BRIEF.txt','元の日本語依頼'],
  ['CAPTURE.json','出所・HOLD判定'],['DERIVATION.json','設計→幾何の対応'],
  ['FUNCTIONAL_REVIEW.json','最終ボクセル機能検査'],['DERIVED_B143_PROPOSAL.json','派生B143'],
  ['DERIVED_SECTION.svg','入口面・旧BC幅2限定断面'],
  ['DERIVED_SPACE_SECTIONS.json','作者空間中央断面'],
  ['HUMAN_REVIEW_TEMPLATE.json','未記入の人間審査項目'],
  ['PHYSICAL_PROGRAM_REVIEW.json','R190-BQ 完成ボクセル独立監査']
 ].map(([f,label])=>link(f,label)).filter(Boolean).concat(['<a href="INVENTORY.json">全ファイルSHA/bytes</a>']).join('　|　');
 const html=[
  '<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
  '<title>R190-BP 元回答と真正3Dの建築審査</title>',
  '<style>body{font:15px/1.7 system-ui,sans-serif;margin:0;background:#101827;color:#eff4fb}main{max-width:1200px;margin:auto;padding:20px}h1{font-size:1.6rem}h2{font-size:1.1rem;margin-top:32px}a{color:#a9d5ff}pre{white-space:pre-wrap;overflow-wrap:anywhere;max-height:400px;overflow:auto;background:#1a2739;padding:16px;border-radius:8px}iframe{height:590px;width:100%;border:1px solid #526079;background:white}img{width:100%;height:auto;background:white}.views{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:8px}figure{margin:0}figcaption{padding:4px}.warning{border-left:4px solid #f4bf63;padding:10px 16px;background:#202a37}details{margin:18px 0}nav{overflow-wrap:anywhere}</style>',
  '<main><h1>R190-BP｜原文・真正3D・5方向投影・機能の同時審査</h1>',
  '<p class="warning">正式美術採用0 / ART HOLD / Minecraft施工0。技術検査が成立しても元依頼への忠実性・建築美術・実歩行は未認定。モデル原文と派生形状の著作者を混同しない。</p>',
  '<p>出所：<strong>'+escapeText(receipt.origin)+'</strong>　結果：<strong>'+escapeText(receipt.status)+'</strong>　原文SHA256：<code>'+escapeText(receipt.originalRawSha256)+'</code></p>',
  '<nav>'+links+'</nav><h2>1. 完成ボクセル3D</h2>',
  show3D?'<p>モデルの空間数値からの決定論的B143派生。美術PASSではありません。<a href="DERIVED_3D.html">3Dを単独で開く</a></p><iframe title="厳格B143派生3D" src="DERIVED_3D.html"></iframe>':
   '<p class="warning">真正3D未認定／表示不可。無効なモデル原文や途中失敗に代替建築を付けません。CAPTURE.jsonの拒否理由を確認してください。</p>',
  show3D?'<h2>2. 同一完成形状の5方向投影</h2><div class="views">'+views+'</div>':'',
  bqTable,
  '<h2>4. 原依頼との照合（未採点）</h2><p>用途、階数、床と空気、連続上下動線、入口、開口、屋根、規模感、独創性を実際の日本語依頼と比較。新たな要求は後から追加しない。</p>',
  '<details><summary>元の日本語依頼</summary><pre>'+escapeText(brief)+'</pre></details>',
  '<details><summary>モデル原文（表示用にHTMLエスケープ。元ファイル無改変）</summary><pre>'+escapeText(original)+'</pre></details>',
  '<h2>5. 審査範囲</h2><p>R4は単一セルの抽象経路、旧BCは同一高さ・幅2の限定経路。構造耐力・避難・実Minecraft歩行は未認証。SYNTHETICやSAVED_SOURCE_UNVERIFIEDは実モデル成功ではない。</p>',
  '<p>World: NOT_PREPARED / 9 BLOCKED / BuildPlan.operations=[]。美術・依頼忠実性の判定は、手動レビュー記録が記入されるまでART HOLD。</p></main></html>'
 ].join('\n');
 write(dir,'REVIEW.html',html);
}

export function deriveBO({dir,raw,brief,origin,complete=true,provider=null}){
 // Save the exact decoded message.content BEFORE JSON/contract validation.
 write(dir,'MODEL_ORIGINAL.txt',raw);write(dir,'ORIGINAL_BRIEF.txt',brief);
 const receipt={schema:'minecraftaibuilder-r190bo-source-capture-v1',status:'HOLD',origin,
  originalRawSha256:hashBO(raw),originalBriefSha256:hashBO(brief),originalUnmodified:true,
  rawMeaning:'Exact decoded message.content UTF-8; provider HTTP body is a separate file/hash',
  modelIdentityCryptographicallyVerified:false,provider,providerConfirmedComplete:origin==='LOCAL_PROVIDER'&&complete,
  hostRepairedSource:false,hostInventedGeometry:false,hostChoseLayoutOrLevels:false,
  outputIsOriginalModelAuthoredB143:false,automaticRetries:0,fallbacks:0,
  modelCalls:origin==='LOCAL_PROVIDER'?1:0,networkRequests:origin==='LOCAL_PROVIDER'?1:0,
  independentRequestFidelity:'NOT_CERTIFIED',architecturalQuality:'NOT_CERTIFIED',
  originality:'NOT_CERTIFIED',minecraftWalking:'NOT_TESTED',...safety()};
 try{
  if(!complete)fail('PROVIDER_INCOMPLETE_OR_ERROR');
  const result=compileR190BNAssembly(raw,{originalBrief:brief,
   authorship:origin==='SYNTHETIC_TEST_FIXTURE'?'SYNTHETIC_TEST_FIXTURE':'MODEL_ORIGINAL_UNVERIFIED'});
  const {proposal,compiled,...derivation}=result;
  const audit=auditR190BQ({originalBrief:brief,raw,compiled,programSpaces:result.programSpaces,
   levels:result.levels,geometrySha256:result.geometrySha256,origin});
  write(dir,'PHYSICAL_PROGRAM_REVIEW.json',json(audit));
  receipt.independentProgramStatus=audit.result;
  receipt.minimumLevelPrerequisite=audit.minimumLevelPrerequisite;
  receipt.sourceTechnicalStatus=result.status;
  receipt.status=audit.minimumLevelPrerequisite==='HOLD_MISSING_THIRD_LEVEL'?
   'HOLD_INDEPENDENT_HIGHRISE_LEVELS':result.status;
  receipt.geometrySha256=result.geometrySha256;
  receipt.sourceSha256=result.sourceSha256;
  receipt.outputAuthorship=result.outputAuthorship;
  receipt.technicalScope='BN full clear volume/support + R4 declared single-cell route; independent request/art not certified';
  write(dir,'DERIVED_B143_PROPOSAL.json',json(proposal));write(dir,'DERIVATION.json',json(derivation));
  write(dir,'FUNCTIONAL_REVIEW.json',json({origin:'DETERMINISTIC_FINAL_VOXEL_CHECKS_OF_MODEL_DECLARATIONS',
   geometrySha256:result.geometrySha256,spaces:result.spaceEvidence,r4:result.functionalReview,
   independentRequestFidelity:'NOT_CERTIFIED',art:'ART_HOLD'}));
  const gallery=compileB143Gallery([proposal.design]);
  if(gallery.geometryHashes[0]!==compiled.geometrySha256)fail('GALLERY_SHA');
  const banner='<aside style="padding:16px;background:#17243b;color:white">R190-BO | '+origin+
   ' | DETERMINISTIC B143 FROM SPATIAL ASSEMBLY | '+receipt.status+
   ' | ART HOLD | 模型は派生物。モデル原文はMODEL_ORIGINAL.txt。美術・依頼忠実性は未認定。</aside>';
  const html=renderB143Html(gallery,read(path.join(ROOT,'source/ai/b143-viewer-template.html')).toString('utf8'));
  write(dir,'DERIVED_3D.html',html.replace(/<body[^>]*>/,m=>m+banner));
  for(const side of ['front','rear','west','east','roof'])
   write(dir,'DERIVED_'+side+'.svg',renderR164Elevation(compiled,proposal.design,side));
  const bc=reviewR190BCOriginal(Buffer.from(JSON.stringify(proposal)));
  if(bc.geometrySha256!==result.geometrySha256)fail('SECTION_SHA');
  const section={...bc,inputAuthorship:result.outputAuthorship,inputIsOriginalModelResponse:false,
   originalSha256:undefined,originalBytes:undefined,originalUnmodified:undefined,
   derivedInputUnmodified:true,derivedInputBytes:bc.originalBytes,derivedProposalBytesSha256:bc.originalSha256,
   modelOriginalSha256:receipt.originalRawSha256,
   sectionEvidence:{...bc.sectionEvidence,isModelOriginalFinalB143:false,isExactDerivedB143:true}};
  write(dir,'DERIVED_SECTION.json',json(section));
  write(dir,'DERIVED_SECTION.svg',renderR190BCSectionSVG(section).replace('R190-BC original B143','R190-BO derived B143'));
  // The legacy entrance plane can miss the interiors entirely. Add explicit
  // mechanically selected space-centre sections; this never changes geometry.
  const slices=result.programSpaces.map(s=>({spaceId:s.id,
   fixedZ:s.origin[1]+Math.floor((s.size[1]-1)/2)}));
  const planes=[...new Set(slices.map(s=>s.fixedZ))].map(z=>({fixedZ:z,
   occupiedCells:compiled.primitives.filter(v=>v[2]===z).map(v=>v.slice(0,2))}));
  write(dir,'DERIVED_SPACE_SECTIONS.json',json({source:'EXACT_DERIVED_FINAL_B143_VOXELS',
   selectionRule:'Each authored space centre: origin.z + floor((depth-1)/2)',
   modelOriginalSha256:receipt.originalRawSha256,geometrySha256:result.geometrySha256,slices,planes,
   designChanges:0,art:'ART_HOLD'}));
  for(const plane of planes){
   const w=proposal.design.bounds.width,h=proposal.design.bounds.height,cell=9;
   write(dir,'DERIVED_SPACE_SECTION_z'+plane.fixedZ+'.svg',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+(w*cell+40)+' '+(h*cell+70)+'">'+
    '<rect width="100%" height="100%" fill="#101c2c"/><text x="12" y="25" fill="white" font-size="12">R190-BO DERIVED '+origin+' z='+plane.fixedZ+' ART HOLD</text>'+
    plane.occupiedCells.map(([x,y])=>'<rect x="'+(20+x*cell)+'" y="'+(50+(h-1-y)*cell)+'" width="8" height="8" fill="#93c5fd"/>').join('')+'</svg>');
  }
  receipt.legacyBCStatus=bc.status;
  receipt.legacyBCLimitation='Same-height two-wide graph; upper floors are not relabelled reachable';
 }catch(error){receipt.status='HOLD';receipt.failure=String(error.message);}
 write(dir,'HUMAN_REVIEW_TEMPLATE.json',json({status:'UNREVIEWED_ART_HOLD',
  originalBriefSha256:receipt.originalBriefSha256,originalRawSha256:receipt.originalRawSha256,
  derivedGeometrySha256:receipt.geometrySha256??null,reviewer:null,
  requestFidelity:{use:null,spaceProgram:null,floorHeights:null,upperFloorAccess:null,scale:null,omissions:null},
  art:{originality:null,exteriorComposition:null,spatialExperience:null,decision:'ART_HOLD'},
  evidenceRequired:'Cite original Japanese words, source IDs and exact derived views; no invented review or model success',
  constructionApproved:false}));
 write(dir,'CAPTURE.json',json(receipt));
 write(dir,'REVIEW_JA.md',[
  '# R190-BO 原文と派生成果物',
  '状態：'+receipt.status+'。出所：'+origin+'。ART HOLD。',
  'MODEL_ORIGINAL.txt は原文。DERIVED_*はBN数値を既存B143へ機械変換した派生物です。',
  'PHYSICAL_PROGRAM_REVIEW.jsonは完成ボクセルの床・空気・実立脚階を再計測。依頼忠実性は自動PASSにしません。',
  'DERIVATION.jsonはoperation/space→B143対応、FUNCTIONAL_REVIEW.jsonは最終空気・支持床とモデル申告のR4経路検査。',
  '原文が不適合・切断ならHOLD。原文の補修・再試行・代替建物はありません。',
  '真正3Dや技術代理検査の成立は、依頼忠実性・用途適合・独創性・美術PASSではありません。',
  '断面の旧BCは同一高さの幅2経路に限定。多層R4の結果と別に保存しています。DERIVED_SPACE_SECTION_z*.svgは各作者空間の中央z面を機械選択した追加断面です。',
  '施工・Minecraft歩行・構造耐力は未検証。NOT_PREPARED、9 BLOCKED、BuildPlan空。',
  receipt.failure??'',''].join('\n'));
 emitReviewBO(dir,receipt);
 return receipt;
}
export function replayBO({prepared,original,out,origin='SAVED_SOURCE_UNVERIFIED'}){
 if(!['SAVED_SOURCE_UNVERIFIED','SYNTHETIC_TEST_FIXTURE'].includes(origin))fail('REPLAY_ORIGIN');
 const {brief}=inspectBO(prepared),raw=read(path.resolve(original),200000),dir=path.resolve(out);
 fresh(dir);const r=deriveBO({dir,raw,brief,origin});inventoryBO(dir);return r;
}
export async function runBO({prepared,approval,out},{transport=fetch}={}){
 const {dir,p,brief,request}=inspectBO(prepared);
 // Possession of a preflight is NOT approval; caller must supply a NEW human grant.
 if(approval!==p.approvalPhrase)fail('SEPARATE_HUMAN_APPROVAL_REQUIRED');
 const target=path.resolve(out);
 if(fs.existsSync(target)||!fs.statSync(path.dirname(target)).isDirectory())fail('FRESH_OUTPUT_REQUIRED');
 // Atomic consumed lock BEFORE even a failed connection. Never remove it.
 write(dir,'ATTEMPT_CONSUMED.json',json({at:new Date().toISOString(),requestSha256:p.requestSha256,
  callerAssertedSeparateHumanApproval:true,approvalIndependentlyAuthenticated:false,
  maximumRequests:1,automaticRetries:0,...safety()}));
 fresh(target);write(target,'EXACT_REQUEST.json',request);
 write(target,'PREFLIGHT.json',read(path.join(dir,'PREFLIGHT.json')));
 let requestCount=0;
 const startedAt=new Date().toISOString();
 try{
  requestCount++;
  const response=await transport(BO_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},
   body:request,redirect:'error',signal:AbortSignal.timeout(900000)});
  const bytes=Buffer.from(await response.arrayBuffer());
  write(target,'PROVIDER_HTTP_BODY.json',bytes);
  let body;try{body=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{fail('INVALID_PROVIDER_HTTP_JSON');}
  const provider={httpStatus:response.status,httpBodySha256:hashBO(bytes),
   modelReported:body.model??null,done:body.done??null,doneReason:body.done_reason??null,
   promptEvalCount:body.prompt_eval_count??null,evalCount:body.eval_count??null,
   totalDuration:body.total_duration??null,thinkingPresent:typeof body.message?.thinking==='string'&&body.message.thinking.length>0};
  if(typeof body.message?.content!=='string')fail('NO_MODEL_CONTENT');
  const r=deriveBO({dir:target,raw:Buffer.from(body.message.content,'utf8'),brief,origin:'LOCAL_PROVIDER',provider,
   complete:response.ok&&body.done===true&&body.done_reason==='stop'&&body.model===p.model&&body.message.role==='assistant'});
  write(target,'TRANSPORT.json',json({requestCount,startedAt,finishedAt:new Date().toISOString(),automaticRetries:0,...safety()}));
  inventoryBO(target);return r;
 }catch(error){
  write(target,'TRANSPORT_HOLD.json',json({status:'HOLD',failure:String(error.message),requestCount,
   startedAt,finishedAt:new Date().toISOString(),automaticRetries:0,attemptConsumed:true,
   noModelOriginalInvented:!fs.existsSync(path.join(target,'MODEL_ORIGINAL.txt')),...safety()}));
  inventoryBO(target);return {status:'HOLD',failure:String(error.message),requestCount};
 }
}

export async function cliBO(argv){
 const [mode,...args]=argv,opts={};
 const allowed={prepare:['--brief','--model','--out','--temperature','--seed','--max-tokens','--context-tokens','--schema-prompt','--think'],
  inspect:['--prepared'],replay:['--prepared','--original','--out'],run:['--prepared','--approval','--out']}[mode];
 if(!allowed||args.length%2)fail('CLI_USAGE: prepare|inspect|replay|run with named pairs');
 for(let i=0;i<args.length;i+=2){
  if(!allowed.includes(args[i])||Object.hasOwn(opts,args[i])||!args[i+1])fail('CLI_FLAGS');
  opts[args[i]]=args[i+1];
 }
 const required=mode==='prepare'?['--model','--out']:mode==='inspect'?['--prepared']:
  mode==='replay'?['--prepared','--original','--out']:['--prepared','--approval','--out'];
 if(required.some(k=>!opts[k]))fail('CLI_REQUIRED');
 if(mode==='prepare'){
  const budgets={};for(const [flag,key] of [['--temperature','temperature'],['--seed','seed'],['--max-tokens','maxTokens'],['--context-tokens','contextTokens']])
   if(opts[flag]!==undefined)budgets[key]=Number(opts[flag]);
  if(opts['--think']!==undefined){if(!['true','false'].includes(opts['--think']))fail('THINK_MODE');budgets.think=opts['--think']==='true';}
  return prepareBO({briefFile:opts['--brief'],model:opts['--model'],out:opts['--out'],...(opts['--schema-prompt']?{schemaPrompt:opts['--schema-prompt']}:{}),...budgets});
 }
 if(mode==='inspect'){
  const r=inspectBO(opts['--prepared']);
  return {...r.p,status:r.attemptConsumed?'HOLD_ATTEMPT_ALREADY_CONSUMED':'OFFLINE_VERIFIED_AWAITING_SEPARATE_APPROVAL',attemptConsumed:r.attemptConsumed};
 }
 const common={prepared:opts['--prepared'],out:opts['--out']};
 if(mode==='replay')return replayBO({...common,original:opts['--original']});
 return runBO({...common,approval:opts['--approval']});
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const result=await cliBO(process.argv.slice(2));console.log(json(result));
 if(typeof result?.status==='string'&&result.status.startsWith('HOLD'))process.exitCode=2;
}catch(error){console.error(error.message);process.exitCode=1;}
}
