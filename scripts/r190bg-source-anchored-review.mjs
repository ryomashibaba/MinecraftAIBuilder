/**
 * R190-BG: actual SOURCE review workbench, not a model or architectural judge.
 * Copies exact saved B143/section views from BE for an offline, evidence-
 * anchored HUMAN observation. No LLM or Minecraft calls, no auto art pass.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

export const R190BG_SCHEMA='minecraftaibuilder-r190bg-source-anchored-review-v1';
const H=x=>createHash('sha256').update(x).digest('hex');
const fail=x=>{throw Error('R190BG_'+x)};
const folder=p=>{try{let s=fs.lstatSync(p);return s.isDirectory()&&!s.isSymbolicLink()}
 catch{return false}};
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},modelCalls:0,worldContacts:0,worldWrites:0,
 art:'ART_HOLD',officialArtAdoptions:0});
const file=(dir,name,max=3000000)=>{
 if(!folder(dir)||!/^[A-Z0-9_-]+\.(?:json|html|svg)$/i.test(name))
  fail('INPUT_PATH');
 const p=path.join(dir,name),s=fs.lstatSync(p);
 if(!s.isFile()||s.isSymbolicLink()||s.size<2||s.size>max)
  fail('INPUT_FILE_'+name);
 return fs.readFileSync(p);
};
const fresh=x=>{
 if(fs.existsSync(x)||!folder(path.dirname(x)))fail('NEW_OUTPUT_REQUIRED');
};
const guard=(out,input)=>{
 if(out===input||out.startsWith(input+path.sep))fail('OUTPUT_INSIDE_INPUT');
};
const parse=(raw,label)=>{try{return JSON.parse(raw)}catch{fail(label+'_JSON')}};
const ids=['A','B'];
const views=['3D.html','front.svg','rear.svg','west.svg','east.svg','roof.svg',
 'SECTION.svg','SECTION.json'];
const criterionLabels=[
 '元の日本語依頼に対する用途・利用者の適合',
 '入口からの空間体験・実際に使える内部',
 '質量・空洞・屋根・床支持の美的な一貫性',
 '依頼に応じて生み出された独創性'
];
const escape=x=>String(x).replace(/[&<>"']/g,c=>({
 '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const escapedJSON=x=>JSON.stringify(x).replace(/</g,'\\u003c').replace(/>/g,'\\u003e');
const viewFiles=id=>views.map(ext=>id+'_'+ext);

/**
 * The HTML is a self-contained/offline reviewer, except for copied static
 * companion views. The JS does not call fetch, make network requests, or
 * produce ART PASS. A saved JSON is only one person's observations.
 */
function html(manifest){
 const m=escapedJSON(manifest);
 const scoreRows=criterionLabels.map((criterion,i)=>{
  const cells=ids.map(id=>'<td><label>評価 0〜4（未評価可）<select data-score="'+id+'-'+i+'">'+
   '<option value="">未評価</option>'+[0,1,2,3,4].map(n=>
    '<option value="'+n+'">'+n+'</option>').join('')+'</select></label>'+
   '<label>根拠にした視点<select data-view="'+id+'-'+i+'"><option value="">未指定</option>'+
   viewFiles(id).filter(f=>!f.endsWith('.json')).map(f=>
    '<option value="'+f+'">'+escape(f)+'</option>').join('')+'</select></label>'+
   '<label>観察した事実<textarea data-note="'+id+'-'+i+'" rows="3" placeholder="何が見え、なぜその点数か（8文字以上）"></textarea></label></td>').join('');
  return '<tr><th>'+escape(criterion)+'</th>'+cells+'</tr>';
 }).join('');
 return [
 '<!doctype html><html lang="ja"><head><meta charset="utf-8">',
 '<meta name="viewport" content="width=device-width,initial-scale=1">',
 '<title>R190-BG 元形状を見て評価する — ART HOLD</title>',
 '<style>body{font:15px system-ui,sans-serif;line-height:1.5;margin:20px;background:#101b2c;color:#f3f5f8}a{color:#9dd4ff}h1,h2{margin:.6em 0}p{max-width:1000px}section{padding:12px}main{display:grid;grid-template-columns:1fr 1fr;gap:14px}iframe{width:100%;height:55vh;border:1px solid #71809a;background:#fafafa}table{width:100%;border-collapse:collapse}td,th{border:1px solid #617087;padding:8px;vertical-align:top}th{width:20%}td{width:40%}label{display:block;margin-bottom:7px}textarea,select,input{font:inherit;color:#111;background:#f5f6fa;border:1px solid #9ba9b9;border-radius:4px;padding:6px;width:100%;box-sizing:border-box}textarea{min-height:78px}button{background:#c2e3ff;border:0;border-radius:4px;padding:12px 18px;font:inherit;font-weight:bold;cursor:pointer}aside{border-left:3px solid #ffcf75;padding:10px;margin:14px 0;background:#263447}small{color:#b9c8dc}#status{white-space:pre-wrap} @media(max-width:850px){main{grid-template-columns:1fr}table,tbody,tr,td,th{display:block;width:100%;box-sizing:border-box}}</style>',
 '</head><body><h1>R190-BG｜真正B143を観察するための人間審査</h1>',
 '<aside><strong>美術採用ではありません：ART HOLD。</strong> 実モデルが作成した場合も人間が独立に評価します。SOURCE PASS・写真・材質・数値差だけで高品質とは認定しません。階段のMinecraft歩行・構造強度・用途の成立は未認定です。既存のモデル名・ファイル名が画面に見える場合があり、厳密な盲検ではありません。写真・3Dは保存済み原形状だけです。</aside>',
 '<details><summary>評価対象のSHA256と技術判定</summary><pre id="info"></pre></details>',
 '<main>',
 ...ids.map(id=>'<section><h2>候補'+id+'</h2><p id="state-'+id+'"></p>'+
  '<iframe title="候補'+id+' 本物のB143 3D" src="'+id+'_3D.html" sandbox="allow-scripts"></iframe>'+
  '<p>'+viewFiles(id).filter(f=>!f.endsWith('.json')).map(f=>
   '<a href="'+f+'" target="_blank" rel="noopener noreferrer">'+escape(f)+'</a>').join(' / ')+'</p></section>'),
 '</main><h2>同じ4基準で観察</h2>',
 '<p>0＝成立していない／4＝非常に高い。未評価も可能です。得点を入力する場合は、観察した視点と具体的な根拠の両方が必須です。数値はレビューアーの意見であり、AIによる自動得点ではありません。</p>',
 '<label>レビューアー識別名（本名不要）<input id="reviewer" maxlength="80" placeholder="例: reviewer-01"></label>',
 '<table><thead><tr><th>評価項目</th><th>候補A</th><th>候補B</th></tr></thead><tbody>',
 scoreRows,'</tbody></table>',
 '<p><button id="save" type="button">根拠付きレビューJSONを保存</button></p>',
 '<p role="status" id="status" aria-live="polite"></p>',
 '<script>',
 'const manifest='+m+';',
 'document.getElementById("info").textContent=JSON.stringify({comparisonSha256:manifest.comparisonSha256,originalBriefSha256:manifest.originalBriefSha256,A:manifest.candidates.A,B:manifest.candidates.B,limitations:manifest.limitations},null,2);',
 'for(const id of ["A","B"])document.getElementById("state-"+id).textContent=manifest.candidates[id].status+" / geometry "+manifest.candidates[id].geometrySha256;',
 'function field(kind,id,index){return document.querySelector("[data-"+kind+"="+JSON.stringify(id+"-"+index)+"]");}',
 'document.getElementById("save").addEventListener("click",()=>{',
 ' const reviewer=document.getElementById("reviewer").value.trim();',
 ' if(reviewer.length<2||reviewer.length>80){document.getElementById("status").textContent="レビューアー名（2〜80文字）を入力してください。";return;}',
 ' const criteria=[];let errors=[];',
 ' for(let i=0;i<4;i++){const scores={};',
 '  for(const id of ["A","B"]){const value=field("score",id,i).value;',
 '   const view=field("view",id,i).value,note=field("note",id,i).value.trim();',
 '   if(value!==""&&(!view||note.length<8||note.length>1000))errors.push("項目 "+(i+1)+"、候補"+id+"の根拠/視点を確認");',
 '   if(value===""&&(view||note))errors.push("項目 "+(i+1)+"、候補"+id+"は点数と根拠を同時に記入");',
 '   scores[id]={score:value===""?null:Number(value),evidenceView:view||null,observation:note||null};',
 '  }criteria.push({criterion:manifest.criterionLabels[i],A:scores.A,B:scores.B});}',
 ' if(errors.length){document.getElementById("status").textContent=errors.join("。");return;}',
 ' const receipt={schema:"minecraftaibuilder-r190bg-human-observations-v1",reviewManifestSha256:manifest.manifestSha256,comparisonSha256:manifest.comparisonSha256,originalBriefSha256:manifest.originalBriefSha256,reviewer,criteria,art:"ART_HOLD",officialArtAdoptions:0,architecturalQualityCertified:false,sourceOnly:true};',
 ' const data=JSON.stringify(receipt,null,2)+"\\n";',
 ' const blob=new Blob([data],{type:"application/json"}),url=URL.createObjectURL(blob);',
 ' const a=document.createElement("a");a.href=url;a.download="R190BG_HUMAN_OBSERVATIONS.json";document.body.append(a);a.click();a.remove();URL.revokeObjectURL(url);',
 ' document.getElementById("status").textContent="証拠に結びついたレビューJSONを保存しました。ART HOLDは変わりません。";',
 '});',
 '</script></body></html>'
 ].join('\n');
}
export function createR190BGReview({comparisonDir,outDir}){
 if(typeof comparisonDir!=='string'||typeof outDir!=='string')fail('ARGUMENTS');
 const src=path.resolve(comparisonDir),out=path.resolve(outDir);
 guard(out,src);fresh(out);
 const reportBytes=file(src,'R190BE_COMPARE.json',1000000);
 const report=parse(reportBytes,'BE_COMPARISON');
 const templateBytes=file(src,'R190BE_HUMAN_REVIEW_TEMPLATE.json',80000);
 const template=parse(templateBytes,'BE_TEMPLATE');
 if(report.schema!=='minecraftaibuilder-r190be-saved-design-comparison-v1'||
  template.schema!=='r190be-unscored-human-review-v1'||
  report.originalBriefSha256!==template.originalBriefSha256||
  report.A?.originalSha256!==template.A||report.B?.originalSha256!==template.B||
  !/^[0-9a-f]{64}$/.test(report.originalBriefSha256??'')||
  !['NO_PHYSICAL_CHANGE_ART_HOLD','SAVED_SOURCE_PAIR_AVAILABLE_ART_HOLD'].includes(report.status)||
  report.A?.status!=='SOURCE_REVIEW_AVAILABLE_ART_HOLD'||
  report.B?.status!=='SOURCE_REVIEW_AVAILABLE_ART_HOLD'||
  ![report.A?.geometrySha256,report.B?.geometrySha256].every(x=>
   /^[0-9a-f]{64}$/.test(x??''))||
  !Array.isArray(template.criteria)||template.criteria.length!==4||
  !template.criteria.every(x=>x.scoreA===null&&x.scoreB===null)||
  report.winner!=='NOT_ESTABLISHED'||report.art!=='ART_HOLD'||report.modelCalls!==0||
  report.worldWrites!==0||report.worldContacts!==0)
  fail('SOURCE_PAIR_NOT_HUMAN_REVIEWABLE');
 // Source-view bytes are copied verbatim; we do not redraw/refashion models.
 const files=new Map();
 for(const id of ids)for(const filename of viewFiles(id)){
  const bytes=file(src,filename);
  if(filename.endsWith('_SECTION.json')){
   const section=parse(bytes,'SECTION');
   if(section.geometrySha256!==report[id].geometrySha256||
    section.originalSha256!==report[id].originalSha256||
    section.art!=='ART_HOLD')fail('SECTION_HASH_CHAIN');
  }
  files.set(filename,bytes);
 }
 const evidence=Object.fromEntries([...files].map(([name,bytes])=>[name,H(bytes)]));
 const manifest={schema:R190BG_SCHEMA,sourceOnly:true,
  comparisonSha256:H(reportBytes),templateSha256:H(templateBytes),
  originalBriefSha256:report.originalBriefSha256,
  comparisonStatus:report.status,
  candidates:Object.fromEntries(ids.map(id=>[id,{
   status:report[id].status,originalSha256:report[id].originalSha256,
   geometrySha256:report[id].geometrySha256,
   sectionStatus:report[id].sectionStatus,r4Status:report[id].r4Status
  }])),criterionLabels,evidenceViewSha256:evidence,
  limitations:['Saved model/provenance receipts are not cryptographically signed',
   'Model identity and generation controls not independently authenticated',
   'Not a blind trial: views may disclose source labels',
   'Visual human scores cannot certify Minecraft path or structural safety',
   'A single pair cannot establish causal model quality improvement'],...safe()};
 const manifestData=Buffer.from(JSON.stringify(manifest,null,2)+'\n');
 const pageManifest={...manifest,manifestSha256:H(manifestData)};
 // Input drift check before writing any new artifact.
 if(H(file(src,'R190BE_COMPARE.json',1000000))!==H(reportBytes)||
    H(file(src,'R190BE_HUMAN_REVIEW_TEMPLATE.json',80000))!==H(templateBytes)||
    [...files].some(([name,bytes])=>H(file(src,name))!==H(bytes)))
  fail('INPUT_DRIFT');
 fs.mkdirSync(out);
 for(const [name,bytes] of files)fs.writeFileSync(path.join(out,name),bytes,{flag:'wx'});
 fs.writeFileSync(path.join(out,'R190BG_REVIEW_MANIFEST.json'),manifestData,{flag:'wx'});
 fs.writeFileSync(path.join(out,'R190BG_REVIEW.html'),html(pageManifest),{flag:'wx'});
 return {...manifest,manifestSha256:H(manifestData),outDir:out};
}
export function validateR190BGObservations({reviewDir,observationsFile}){
 const dir=path.resolve(reviewDir);
 const bytes=file(dir,'R190BG_REVIEW_MANIFEST.json',100000);
 const m=parse(bytes,'MANIFEST');
 if(m.schema!==R190BG_SCHEMA||m.art!=='ART_HOLD'||m.worldWrites!==0||
  m.officialArtAdoptions!==0||m.modelCalls!==0)fail('MANIFEST_INVALID');
 const oPath=path.resolve(observationsFile);
 const st=fs.lstatSync(oPath);
 if(!st.isFile()||st.isSymbolicLink()||st.size>40000||st.size<2)
  fail('OBSERVATIONS_FILE');
 const r=parse(fs.readFileSync(oPath),'OBSERVATIONS');
 if(r.schema!=='minecraftaibuilder-r190bg-human-observations-v1'||
  r.reviewManifestSha256!==H(bytes)||r.comparisonSha256!==m.comparisonSha256||
  r.originalBriefSha256!==m.originalBriefSha256||
  r.art!=='ART_HOLD'||r.officialArtAdoptions!==0||
  r.architecturalQualityCertified!==false||
  typeof r.reviewer!=='string'||r.reviewer.trim().length<2||
  r.reviewer.length>80||!Array.isArray(r.criteria)||r.criteria.length!==4)
  fail('OBSERVATIONS_SOURCE_OR_SAFETY');
 let filled=0;
 for(let i=0;i<4;i++){
  const c=r.criteria[i];
  if(c.criterion!==m.criterionLabels[i])fail('CRITERION_DRIFT');
  for(const id of ids){
   const o=c[id];
   if(!o||typeof o!=='object')fail('CRITERION_MISSING');
   if(o.score===null){
    if(o.observation!==null||o.evidenceView!==null)fail('INCOMPLETE_CRITERION');
   }else{
    if(!Number.isInteger(o.score)||o.score<0||o.score>4||
       typeof o.observation!=='string'||o.observation.trim().length<8||
       o.observation.length>1000||
       !Object.hasOwn(m.evidenceViewSha256,o.evidenceView)||
       !o.evidenceView.startsWith(id+'_')||o.evidenceView.endsWith('.json'))
      fail('UNSUPPORTED_CRITERION');
    filled++;
   }
  }
 }
 // Reviewers may leave some criteria blank; output never auto-promotes ART.
 for(const [name,hash] of Object.entries(m.evidenceViewSha256))
  if(H(file(dir,name))!==hash)fail('EVIDENCE_VIEW_TAMPERED');
 return {schema:R190BG_SCHEMA,status:'HUMAN_OBSERVATIONS_RECORDED_ART_HOLD',
  observationsSha256:H(fs.readFileSync(oPath)),
  manifestSha256:H(bytes),filledCriteriaCells:filled,totalCriteriaCells:8,
  reviewerClaim:r.reviewer,winner:'NOT_AUTOMATICALLY_CHOSEN',
  humanReviewNotIndependentlyAuthenticated:true,modelQuality:'NOT_CERTIFIED',
  ...safe()};
}
export function parseR190BGArgs(argv){
 if(argv.length===1&&argv[0]==='--help')return {help:true};
 if(argv.length!==4)fail('ARGUMENTS');
 const p={};for(let i=0;i<4;i+=2){
  const name={'--compare':'comparisonDir','--out':'outDir'}[argv[i]];
  if(!name||Object.hasOwn(p,name)||!argv[i+1])fail('ARGUMENTS');
  p[name]=argv[i+1];
 }
 if(!p.comparisonDir||!p.outDir)fail('ARGUMENTS');
 return p;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const o=parseR190BGArgs(process.argv.slice(2));
  console.log(JSON.stringify(o.help?{help:'Offline only: --compare R190BE_COMPARE_DIR --out NEW_REVIEW_DIR; open R190BG_REVIEW.html and export JSON. No model calls.'}:createR190BGReview(o),null,2));
 }catch(e){console.error(String(e?.message??e));process.exitCode=1}
}
