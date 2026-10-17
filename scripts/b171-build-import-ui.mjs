/**
 * B171 optional offline drag-and-drop import UI.
 * Adds existing B134/B135 JSON to a B170 source-pinned receipts archive.
 * It NEVER validates game authenticity in the browser: Node replay is mandatory.
 * No network, sockets, Minecraft commands, localStorage or background actions.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {makeProbePacket,verifyProbePacket}
 from '../source/ai/b170-readonly-probe-packet.mjs';
import {makeEmptyB171Receipts}
 from '../source/ai/b171-readback-reconciler.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export function buildB171ImportUi(out=path.join(ROOT,'b171-readback-output')){
 const packet=makeProbePacket(),archive=makeEmptyB171Receipts(packet);
 if(!verifyProbePacket(packet)||archive.receipts.length!==0)
  throw Error('B171_UI_SOURCE_PIN_HOLD');
 fs.mkdirSync(out,{recursive:true});
 const text=JSON.stringify({packetSha256:packet.sha256,
  checkpointIds:packet.checkpoints.map(x=>x.id)})
  .replaceAll('<','\\u003c');
 const html=`<!doctype html><html lang="ja"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>B171 · Offline Readback Importer</title>
<style>
:root{font-family:system-ui,-apple-system,sans-serif;color-scheme:dark;background:#081824;color:#ebf9f9}*{box-sizing:border-box}
body{background:radial-gradient(ellipse 80% 35% at 50% -12%,#235d7188,transparent),#081824;margin:0}
header,main,footer{max-width:900px;margin:auto;padding:22px}
h1{font-size:clamp(30px,5vw,48px);letter-spacing:-.045em;line-height:1.12}
p{color:#b5cfd8;line-height:1.6}.eyebrow{color:#84eaca;font-size:11px;font-weight:800;letter-spacing:.17em}
.panel{background:#102a37;border:1px solid #315b69;border-radius:16px;padding:20px;margin:17px 0}
label{display:block;font-size:12px;color:#c6dcdf;margin-bottom:8px}
select,input{font:inherit;width:100%;border-radius:9px;padding:11px;background:#061e2a;color:#eefefa;border:1px solid #456879}
button{font:inherit;border:0;border-radius:8px;background:#9beed5;color:#073132;font-weight:800;padding:12px;cursor:pointer}
button.alt{background:#274959;color:#e9fffa;border:1px solid #4a8691}
.row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.card{padding:12px;border:1px solid #38606b;border-radius:9px;margin:9px 0}
.notice{padding:18px;background:#493926a6;border-left:3px solid #ecc17e;border-radius:6px}
small{color:#bad2d7}code{font-family:ui-monospace,monospace;overflow-wrap:anywhere}
@media(max-width:680px){.row{grid-template-columns:1fr}}
</style></head><body><header><div class="eyebrow">MINECRAFT AIBUILDER · B171 · OFFLINE ONLY</div>
<h1>STAIR READBACK<br>IMPORTER</h1><p>B170の18地点のうち、実際にすでに取得済みのB134/B135「読み取り専用診断JSON」を、選んだ地点へ添付して保存します。</p>
</header><main><div class="notice"><b>元のMinecraftワールドは操作しません。</b><p>入力ファイルの内容をブラウザで一時的に保持するだけです。方向値0〜3の意味や設計座標からワールドXYZへの変換は未確認。ブラウザ表示はゲームからの認証ではありません。後でNodeのB171再判定が必要です。</p>
<small>NOT_PREPARED · 9 BLOCKED · 0 commands executed · 0 world writes</small></div>
<div class="panel"><h2>読み取り結果を追加</h2>
<div class="row"><div><label for="checkpoint">B170のチェックポイント</label><select id="checkpoint"></select></div>
<div><label for="diagnostic">既存のB134/B135診断JSON</label><input id="diagnostic" type="file" accept=".json,application/json"></div></div>
<p><button id="add">ファイルを追加</button></p>
<p id="status" role="status">未追加。実機の測定結果がない場合、何も入力しないで構いません。</p>
</div>
<div class="panel"><h2>取り込み済み診断</h2><div id="receipts"><p>0 件</p></div>
<button id="download">B171_READBACK_ARCHIVE.json を保存</button>
<button class="alt" id="reset" style="margin-left:9px">入力を破棄</button>
</div><p><small>B170 packet SHA256: <code id="sha"></code></small></p>
</main><footer><small>Read-only local preparation · No upload, WebSocket, fetch or Minecraft command integration</small></footer>
<script>
const info=__PACKET__,receipts=[];
const byId=id=>document.getElementById(id);
byId('sha').textContent=info.packetSha256;
info.checkpointIds.forEach(x=>{const o=document.createElement('option');o.value=x;o.textContent=x;byId('checkpoint').appendChild(o)});
function render(){
 const container=byId('receipts');container.textContent='';
 if(!receipts.length){container.textContent='0 件（未観測）';return;}
 receipts.forEach((v,i)=>{
  const div=document.createElement('div');div.className='card';
  div.textContent=(i+1)+'. '+v.checkpointId+' · '+v.source+' · 未認証診断候補';
  container.appendChild(div);
 });
}
byId('add').addEventListener('click',async()=>{
 try{
  const file=byId('diagnostic').files?.[0];
  if(!file)throw Error('診断JSONファイルを選択してください。');
  if(file.size>256*1024)throw Error('診断JSONが大きすぎます。');
  const raw=JSON.parse(await file.text());
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||
   raw.constructionAllowed!==false||!Array.isArray(raw.operations)||raw.operations.length)
   throw Error('未対応または施工禁止条件を確認できない診断ファイルです。');
  const kind=raw.schema==='minecraftaibuilder-b134-live-readonly-diagnostic-v1'?'B134':
   raw.schema==='minecraftaibuilder-b135-live-raw-control-v1'?'B135':null;
  if(!kind)throw Error('B134/B135の診断JSONだけ取り込めます。');
  const checkpointId=byId('checkpoint').value;
  if(!info.checkpointIds.includes(checkpointId))throw Error('チェックポイントが不明です。');
  const item={checkpointId,source:kind,diagnostic:raw};
  if(receipts.some(x=>JSON.stringify(x)===JSON.stringify(item)))
   throw Error('同じファイルとチェックポイントの重複登録です。');
  if(receipts.length>=72)throw Error('最大72診断までです。');
  receipts.push(item);render();
  byId('status').textContent='候補 '+receipts.length+' 件。重要：NodeのB171厳格な再判定をまだ通していません。';
 }catch(err){byId('status').textContent=String(err.message||err);}
});
byId('download').addEventListener('click',()=>{
 const record={schema:'minecraftaibuilder-b171-readback-receipts-v1',
 packetSha256:info.packetSha256,receipts};
 const blob=new Blob([JSON.stringify(record,null,2)+'\\n'],{type:'application/json'});
 const url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download='B171_READBACK_ARCHIVE.json';
 a.click();URL.revokeObjectURL(url);
});
byId('reset').addEventListener('click',()=>{
 receipts.splice(0);byId('diagnostic').value='';byId('status').textContent='入力破棄。';render();
});render();
</script></body></html>`.replace('__PACKET__',text);
 const file=path.join(out,'index.html');
 if(fs.existsSync(file))throw Error('B171_UI_REFUSE_TO_OVERWRITE');
 fs.writeFileSync(file,html,{flag:'wx'});
 return {file,checkpointCount:infoCheckpoint(packet),readbacks:0,
  authenticatedGameReadbacks:0,worldWrites:0};
}
const infoCheckpoint=packet=>packet.checkpoints.length;
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{console.log('B171_IMPORT_UI',JSON.stringify(buildB171ImportUi(process.argv[2])));}
 catch(e){console.error('B171_UI_HOLD',e.message);process.exitCode=1;}
}
