/**
 * B198D local-only 3D studio with real candidate escrow and version history.
 * No remote hosting or Minecraft world actions. Model secrets remain on host.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {compileDesign,verifyCompiled} from './b143-building-dsl.mjs';
import {openArchitectureStudio} from './b198d-studio-session.mjs';
import {createB198OpenAIAdapter} from './b198-openai-provider.mjs';
const TEMPLATE=path.resolve(path.dirname(fileURLToPath(import.meta.url)),
 '../../source/ai/b143-viewer-template.html');
const fail=s=>{throw Error('B198D_'+s)};
const neighbors=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
const surfaceOnly=scene=>{
 const vox=new Set(scene.primitives.map(p=>p.slice(0,3).join(',')));
 return scene.primitives.filter(p=>neighbors.some(d=>
  !vox.has([p[0]+d[0],p[1]+d[1],p[2]+d[2]].join(','))));
};
function viewerPayload(state){
 const docs=[{...state.approvedDesign,id:'b198d-approved',
  title:'APPROVED — '+state.approvedDesign.title.slice(0,60)}];
 if(state.proposedDraft!==null)
  docs.push({...state.proposedDraft.design,id:'b198d-draft',
   title:'DRAFT (NOT APPROVED) — '+state.proposedDraft.design.title.slice(0,55)});
 const scenes=docs.map(d=>{
  const comp=compileDesign(d);
  if(!verifyCompiled(d,comp))fail('VIEWER_GEOMETRY_INVALID');
  const {primitives,...meta}=comp;
  return {...meta,surface:surfaceOnly(comp),
   stats:{...comp.stats,renderedSurfaceCells:surfaceOnly(comp).length}};
 });
 return {schema:'minecraftaibuilder-b143-gallery-v1',
  edition:'MINECRAFT_EDUCATION',scenes,
  sourceHashes:scenes.map(s=>s.sourceSha256),
  geometryHashes:scenes.map(s=>s.geometrySha256),
  safety:state.safety};
}
const CSS=`<style>
#b198d-studio{margin:12px 0;padding:15px;border:1px solid #4385a0;border-radius:12px;background:#132d3d}
#b198d-studio h2{font-size:1.05rem;margin:0 0 10px}
#b198d-studio textarea{width:100%;min-height:90px;background:#071723;color:#e6f7ff;padding:9px;border:1px solid #587e98;border-radius:8px;font:inherit;resize:vertical}
#b198d-studio button{margin-top:8px}
#b198d-studio button:disabled{opacity:.38;cursor:not-allowed}
#b198d-summary,#b198d-diff,#b198d-history,#b198d-error{white-space:pre-wrap;overflow-wrap:anywhere;font-size:.79rem;line-height:1.6;margin:9px 0}
#b198d-error{color:#ffd0ad}
#b198d-protected label{display:flex;align-items:center;gap:7px;margin:5px 0;font-size:.78rem}
#b198d-protected input{width:16px;height:16px}
#b198d-studio .controls{display:grid;grid-template-columns:1fr 1fr;gap:8px}
#b198d-studio .hint{font-size:.77rem;color:#adc9da;line-height:1.5}
#b198d-comparison{display:none;margin:12px 0;padding:12px;border:1px solid #47687a;border-radius:12px;background:#102838}
#b198d-comparison img{width:100%;aspect-ratio:5 / 3;object-fit:contain;background:#081924;border-radius:8px}
#b198d-compare-images{display:grid;grid-template-columns:1fr 1fr;gap:12px}
#b198d-comparison figcaption{font-size:.77rem;margin:4px 0 8px;color:#c4e4f5}
@media(max-width:600px){#b198d-compare-images{grid-template-columns:1fr}}
</style>`;
const PANEL=`<section id="b198d-studio">
 <h2>B198D — 対話型建築設計 / 版管理</h2>
 <p class="hint">AIの修正案は承認されるまで原本を変更しません。上のモデル選択でAPPROVEDとDRAFTを比較できます。</p>
 <div id="b198d-summary" aria-live="polite"></div>
 <label for="b198d-request">自然言語の修正指示</label>
 <textarea id="b198d-request" placeholder="例：展望リングを大きくして、元の基礎と入口は保護して"></textarea>
 <p class="hint">変更してはいけない建築要素：</p>
 <div id="b198d-protected"></div>
 <button type="button" id="b198d-propose">AI修正案を作る（未承認）</button>
 <div id="b198d-diff"></div>
 <div class="controls">
  <button type="button" id="b198d-approve">修正案を承認</button>
  <button type="button" id="b198d-reject">修正案を却下</button>
  <button type="button" id="b198d-undo">Undo</button>
  <button type="button" id="b198d-redo">Redo</button>
 </div>
 <div id="b198d-history"></div>
 <div id="b198d-error" role="alert"></div>
 <p class="hint">AIの文章理解・美しさ・実Minecraftでの歩行・施工はいずれも未認証。NOT_PREPARED / 9 BLOCKED / ワールド書き込み0。AIモデル未接続時は閲覧と履歴操作のみ。</p>
</section>`;
const SCRIPT=`<script id="b198d-client">
"use strict";
(function(){
 const TOKEN=__TOKEN__;
 const E=id=>document.getElementById(id);
 let status=null,busy=false;
 const label=(id,value)=>{E(id).textContent=value};
 function controls(){
  if(!status)return;
  const d=status.proposedDraft;
  label('b198d-summary','承認済み '+status.headId+
   ' / 承認待ち '+(d?'あり':'なし')+
   ' / AI '+(status.requiresRealModel?'未接続':'利用可')+
   '\n原本SHA '+status.approvedHeadSha256.slice(0,24)+'…');
  const area=E('b198d-protected');area.replaceChildren();
  status.approvedDesign.elements.filter(x=>x.mode==='add').forEach((p,i)=>{
   const holder=document.createElement('label');
   const cb=document.createElement('input');cb.type='checkbox';cb.value=p.id;
   cb.checked=i===0;cb.disabled=busy||Boolean(d);
   holder.append(cb,document.createTextNode(p.id));area.append(holder);
  });
  label('b198d-diff',d?
   'DRAFT: '+d.id+'\n変更 '+d.changeList.totalTouched+
   ' / 追加 '+d.changeList.added.join(', ')+
   '\n修正 '+d.changeList.changed.join(', ')+
   ' / 削除 '+d.changeList.removed.join(', ')+
   '\n実ボクセル差 '+d.sourceDelta.exactSourceVoxelDelta+
   '\n以前の通行空間を塞いだ数 '+d.sourceDelta.clearance.damagedSourceClearFootprints+
   '\n承認前にAPPROVEDとDRAFTの3Dを見比べてください。':'');
  label('b198d-history','承認履歴（削除しません）\n'+
   status.versionHistory.map(v=>(v.isHead?'● ':'○ ')+v.id+
    ' '+v.sourceSha256.slice(0,16)+'…').join('\n'));
  E('b198d-propose').disabled=busy||Boolean(d)||status.requiresRealModel;
  E('b198d-approve').disabled=busy||!d;
  E('b198d-reject').disabled=busy||!d;
  E('b198d-undo').disabled=busy||Boolean(d)||!status.canUndo;
  E('b198d-redo').disabled=busy||Boolean(d)||!status.canRedo;
 }
 async function post(action,body){
  if(busy)return;busy=true;label('b198d-error','');controls();
  try{
   const res=await fetch('/api/'+action,{method:'POST',
    headers:{'Content-Type':'application/json','X-B198D-CSRF':TOKEN},
    credentials:'same-origin',body:JSON.stringify(body||{})});
   const info=await res.json();
   if(!res.ok)throw Error(info.error||'Action rejected');
   window.location.reload();
  }catch(e){busy=false;label('b198d-error',String(e.message||e));controls()}
 }
 async function boot(){
  try{
   const res=await fetch('/api/status',{credentials:'same-origin'});
   if(!res.ok)throw Error('Source state could not be read');
   status=await res.json();controls();if(status.proposedDraft)captureCompare();
  }catch(e){label('b198d-error',String(e.message||e))}
 }
 function captureCompare(){
  if(!status?.proposedDraft)return;
  const saved=index,canvas=E('view');
  index=0;select.value='0';setScene();draw();
  E('b198d-before-image').src=canvas.toDataURL('image/png');
  index=1;select.value='1';setScene();draw();
  E('b198d-after-image').src=canvas.toDataURL('image/png');
  index=saved;select.value=String(saved);setScene();draw();
  E('b198d-comparison').style.display='block';
 }
 E('b198d-compare-refresh').addEventListener('click',captureCompare);
 E('b198d-propose').addEventListener('click',()=>post('propose',{
  prompt:E('b198d-request').value,
  protectedElementIds:Array.from(document.querySelectorAll(
   '#b198d-protected input:checked')).map(e=>e.value)}));
 E('b198d-approve').addEventListener('click',()=>{
  if(status?.proposedDraft)post('approve',{
   draftId:status.proposedDraft.id,
   expectedHeadSha256:status.approvedHeadSha256});
 });
 E('b198d-reject').addEventListener('click',()=>{
  if(status?.proposedDraft)post('reject',{draftId:status.proposedDraft.id});
 });
 E('b198d-undo').addEventListener('click',()=>post('undo',{}));
 E('b198d-redo').addEventListener('click',()=>post('redo',{}));
 boot();
})();
</script>`;
export function renderB198DStudioHtml(state,token){
 const template=fs.readFileSync(TEMPLATE,'utf8');
 if(!template.includes('__B143_GALLERY_JSON__'))fail('TEMPLATE_SOURCE_MISSING');
 const safeJson=JSON.stringify(viewerPayload(state))
  .replaceAll('<','\\u003c').replaceAll('\u2028','\\u2028')
  .replaceAll('\u2029','\\u2029');
 return template.replace('__B143_GALLERY_JSON__',safeJson)
  .replace('</head>',CSS+'</head>')
  .replace('<h2>ChatGPTが設計した新規建築</h2>',PANEL)
  .replace('</main></div>','<section id="b198d-comparison" aria-label="修正前後の建築3D比較">'+
   '<h2>同じカメラ角度での修正前後比較</h2>'+
   '<button type="button" id="b198d-compare-refresh">現在の視点で比較画像を更新</button>'+
   '<div id="b198d-compare-images">'+
   '<figure><img id="b198d-before-image" alt="承認済み設計の3D形状比較"><figcaption>承認済み ORIGINAL</figcaption></figure>'+
   '<figure><img id="b198d-after-image" alt="未承認の修正提案の3D形状比較"><figcaption>未承認 DRAFT</figcaption></figure>'+
   '</div><p>同じ視点の静止画像です。上の3Dは選択・回転できます。画像の違いは自然言語の指示達成や実施工成功を証明しません。</p>'+
   '</section></main></div>')
  .replace('</body>',SCRIPT.replace('__TOKEN__',JSON.stringify(token))+'</body>');
}
async function bodyJson(req){
 let bytes=0,parts=[];
 for await(const b of req){
  bytes+=b.length;if(bytes>12000)fail('REQUEST_TOO_LARGE');parts.push(b);
 }
 let obj;
 try{obj=JSON.parse(Buffer.concat(parts).toString('utf8'))}
 catch{fail('INVALID_JSON')}
 if(!obj||typeof obj!=='object'||Array.isArray(obj))fail('INVALID_BODY');
 return obj;
}
export async function startB198DLocalStudio({
 projectDirectory,initialDesign=null,generator=null,model=null,port=0
}={}){
 if(!projectDirectory)fail('PROJECT_STORAGE_MISSING');
 if(!Number.isSafeInteger(port)||port<0||port>65535)fail('INVALID_PORT');
 const actual=generator??(model===null?null:createB198OpenAIAdapter({model}));
 const studio=openArchitectureStudio({
  directory:projectDirectory,initialDesign,generator:actual});
 const csrf=randomBytes(32).toString('hex');
 let base='';
 const server=http.createServer(async(req,res)=>{
  const json=(status,result)=>{
   const text=JSON.stringify(result);
   res.writeHead(status,{'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',
    'Referrer-Policy':'no-referrer','Content-Length':Buffer.byteLength(text)});
   res.end(text);
  };
  try{
   if(req.headers.host!==base.slice(7))return json(403,{error:'LOCAL_ONLY'});
   const url=new URL(req.url,base);
   if(req.method==='GET'&&url.pathname==='/'){
    const html=renderB198DStudioHtml(studio.getStatus(),csrf);
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8',
     'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',
     'Referrer-Policy':'no-referrer','Content-Length':Buffer.byteLength(html)});
    res.end(html);return;
   }
   if(req.method==='GET'&&url.pathname==='/api/status')
    return json(200,studio.getStatus());
   if(req.method!=='POST')return json(404,{error:'NOT_FOUND'});
   if(req.headers.origin!==base||
    req.headers['x-b198d-csrf']!==csrf||
    !String(req.headers['content-type']??'').startsWith('application/json'))
    return json(403,{error:'ORIGIN_OR_CSRF_BLOCKED'});
   const body=await bodyJson(req);
   let result;
   switch(url.pathname){
    case '/api/propose':result=await studio.propose(body);break;
    case '/api/approve':result=studio.approve(body);break;
    case '/api/reject':result=studio.reject(body);break;
    case '/api/undo':result=studio.undo();break;
    case '/api/redo':result=studio.redo();break;
    default:return json(404,{error:'UNKNOWN_ACTION'});
   }
   return json(200,{headId:result.headId,draft:!!result.proposedDraft,
    worldWrites:0,sourceOnly:true});
  }catch(e){return json(400,{error:String(e.message??e).slice(0,200)})}
 });
 await new Promise((resolve,reject)=>{
  server.once('error',reject);
  server.listen(port,'127.0.0.1',resolve);
 });
 base='http://127.0.0.1:'+server.address().port;
 return {url:base,studio,server,
  close:()=>new Promise((resolve,reject)=>{
   server.close(e=>e?reject(e):resolve());
  })};
}
