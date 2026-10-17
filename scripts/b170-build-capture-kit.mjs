/**
 * B170 offline one-file measurement kit.
 * No application endpoints, web resources, minecraft commands or browser
 * storage. Each observation is *volunteered*, never runtime attested.
 * Upload import goes through scripts/b170-review-submission.mjs.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {makeProbePacket,verifyProbePacket} from
 '../source/ai/b170-readonly-probe-packet.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export function buildB170CaptureKit(out=path.join(ROOT,'b170-readonly-kit')){
 const packet=makeProbePacket();
 if(!verifyProbePacket(packet))throw Error('B170_OUTPUT_PACKET_INVALID');
 fs.mkdirSync(out,{recursive:true});
 fs.writeFileSync(path.join(out,'B170_PROBE_PACKET.json'),
  JSON.stringify(packet,null,2)+'\n');
 fs.writeFileSync(path.join(out,'B170_EMPTY_SUBMISSION.json'),
  JSON.stringify({packetSha256:packet.sha256,observations:[]},null,2)+'\n');
 const data=JSON.stringify(packet).replaceAll('<','\\u003c');
 const html=`<!doctype html>
<html lang="ja"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>B170 — Stair Observation Packet · READ ONLY</title>
<style>
:root{color-scheme:dark;font-family:system-ui,-apple-system,sans-serif;background:#071822;color:#e8fcff}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(ellipse 75% 35% at 50% -12%,#285b7688,transparent),#071822}
header,main,footer{max-width:1120px;margin:auto;padding:22px}
h1{font-size:clamp(29px,5vw,50px);line-height:1.1;letter-spacing:-.04em}
p,summary{color:#b5d0d7;line-height:1.6}.eyebrow{color:#6cecc9;font-weight:800;font-size:12px;letter-spacing:.16em}
.panel{padding:20px;margin:18px 0;background:#102c38;border-radius:15px;border:1px solid #315769}
table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:11px 8px;border-bottom:1px solid #2b505d;font-size:13px}
label{display:block;margin:7px 0 5px;color:#bad4d9;font-size:12px}
input,select,textarea{color:#ebfcff;background:#071e27;border:1px solid #476978;border-radius:8px;padding:10px;font:inherit;width:100%}
textarea{min-height:175px;font:11px ui-monospace,SFMono-Regular,monospace;line-height:1.5;resize:vertical}
button{background:#80efcb;color:#062326;border:0;border-radius:8px;padding:12px 17px;font-weight:800;cursor:pointer}
button.secondary{background:#214b58;color:#ddfff3;border:1px solid #518783}
.row{display:flex;gap:9px;flex-wrap:wrap;align-items:center}.small{font-size:12px;color:#a3c2c9}
.kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.kpi{padding:15px;background:#184150;border-radius:9px}.kpi b{display:block;font-size:23px}
.warning{border-left:3px solid #ffbf78;padding:14px 18px;background:#54412a8a;border-radius:7px}
details{margin:10px 0;border-radius:10px;background:#153844}
summary{padding:13px 15px;cursor:pointer;font-weight:700}
.content{padding:12px 18px 20px;display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.coord{font:12px ui-monospace,monospace;color:#7fe5d1}
.status{color:#93f3ca}.section-name{margin-top:30px}
@media(max-width:760px){.kpis{grid-template-columns:1fr}.content{grid-template-columns:1fr 1fr}}
@media(max-width:490px){.content{grid-template-columns:1fr}}
</style></head>
<body><header>
<div class="eyebrow">MINECRAFT AIBUILDER · B170 · NO-WRITE FIELD PACKET</div>
<h1>ORBITAL STAIR<br>OBSERVATION KIT</h1>
<p>北翼・南翼18地点のブロックID、階段の向き、上下状態を記録するためのオフライン入力画面です。Minecraftのワールド座標は確認されていません。手元の測定結果を入力・JSONで保存するための道具です。</p>
<div class="kpis"><div class="kpi"><span class="small">検査地点</span><b>18</b></div>
<div class="kpi"><span class="small">実ワールドの読取</span><b>0</b></div>
<div class="kpi"><span class="small">ワールド書き込み</span><b>0</b></div></div></header>
<main><div class="warning"><strong>元のMinecraftワールドには一切アクセスしません。</strong>
<p>各XYZはローカル設計座標です。実際のMinecraft世界との対応は未検証。入力内容はゲーム側で検証されず、ブロック設置やコマンド実行もできません。データをすべて入力しても「実機移動成功」「施工可能」にはなりません。</p>
<small>NOT_PREPARED · 9 BLOCKED · BuildPlan.operations=[]</small></div>
<div class="panel"><h2>確認状況</h2><p id="count" role="status" class="status">0 / 18 記録</p>
<p class="small">コマンドを実行せずに、既に確認した情報だけ入力してください。不要な項目は空欄で問題ありません。</p></div>
<section id="checks"></section>
<div class="panel"><h2>入力結果をJSONとして保存</h2><p>保存する内容は利用者提供の観察記録です。測定方法を明示できる場合だけ選択してください。</p>
<div class="row"><button id="make">JSONを更新</button>
<button id="download" class="secondary">JSONファイルを保存</button>
<button id="copy" class="secondary">JSONをコピー</button></div>
<label for="json">出力JSON</label><textarea id="json" spellcheck="false" readonly></textarea>
<p class="small" id="warning">データは外部送信しません。JSONを保存してからCIでの照合に使えます。</p></div>
<div class="panel"><h2>ソース固定情報</h2><p class="small">MinecraftAIBuilderのDOPPLER B166の幾何SHAとこの測定計画を固定しています。実ワールドのブロックIDに置き換えるための指示ではありません。</p>
<div id="hash" class="coord"></div></div></main>
<footer><small>READ-ONLY local record format · no Minecraft API, no network access, no browser storage</small></footer>
<script>
const packet=__PACKET__;
const $=id=>document.getElementById(id);
const options={
 facing:['unknown','north','south','east','west'],
 verticalHalf:['unknown','bottom','top','double'],
 stairShape:['unknown','straight','inner_left','inner_right','outer_left','outer_right'],
 captureMethod:['example_only','manual_observation','external_readonly_import'],
 movementOutcome:['not_tested','observed_pass','observed_fail']
};
const rows=new Map();
function select(name,id){
 const s=document.createElement('select');s.id=id;s.dataset.name=name;
 for(const option of options[name]){
  const el=document.createElement('option');el.value=option;el.textContent=option;
  s.append(el);
 }
 return s;
}
function field(name,id,labelText,placeholder=''){
 const container=document.createElement('div'),lab=document.createElement('label');
 lab.htmlFor=id;lab.textContent=labelText;container.append(lab);
 let ctrl;
 if(options[name])ctrl=select(name,id);
 else{ctrl=document.createElement('input');ctrl.type='text';
  ctrl.id=id;ctrl.placeholder=placeholder;ctrl.dataset.name=name;}
 container.append(ctrl);return container;
}
const wrap=$('checks');
for(const wing of ['north','south']){
 const heading=document.createElement('h2');heading.className='section-name';
 heading.textContent=wing==='north'?'NORTH / 北翼':'SOUTH / 南翼';
 wrap.append(heading);
 for(const stop of packet.checkpoints.filter(c=>c.wing===wing)){
  const d=document.createElement('details');d.dataset.checkpointId=stop.id;
  const summary=document.createElement('summary');
  summary.textContent=(stop.order+1)+'. '+stop.kind+
   '   LOCAL '+stop.localStanding.join(', ');
  d.append(summary);
  const content=document.createElement('div');content.className='content';
  const items=[
   ['blockId','MinecraftのブロックID','minecraft:stone'],
   ['facing','階段の向き'],
   ['verticalHalf','上下半分'],
   ['stairShape','階段接続形状'],
   ['captureMethod','どのように得た情報か'],
   ['minecraftVersion','Minecraftの版','Education 26.3'],
   ['worldXYZ','実ワールドXYZ（未確認なら空欄）','-100, 70, 30'],
   ['movementOutcome','実機移動の観察']
  ];
  for(const [name,lab,placeholder] of items)
   content.append(field(name,stop.id+'-'+name,lab,placeholder));
  const note=field('evidenceNote',stop.id+'-evidenceNote',
   '資料・スクリーンショットの参照（任意）');
  content.append(note);
  const date=field('observedAt',stop.id+'-observedAt',
   '観察日時（ISO 8601／任意）','2026-10-17T12:30:00+09:00');
  content.append(date);
  const legend=document.createElement('div');legend.className='coord';
  legend.textContent='floor: '+stop.localFloorCells.map(p=>p.join(',')).join(' / ')+
   ' · headroom: 8 cells';
  legend.style.gridColumn='1 / -1';content.append(legend);d.append(content);wrap.append(d);
  rows.set(stop.id,d);
 }
}
$('hash').textContent='Packet SHA256: '+packet.sha256+' · source '+packet.pinnedSourceSha256+
 ' · geometry '+packet.pinnedGeometrySha256;
function getControl(row,name){return row.querySelector('[data-name="'+name+'"]');}
function submission(){
 const observations=[];
 for(const cp of packet.checkpoints){
  const row=rows.get(cp.id),v=name=>getControl(row,name).value.trim();
  const blockId=v('blockId'),xyz=v('worldXYZ');
  const vals=xyz.split(',').map(t=>Number(t.trim()));
  const worldXYZ=xyz&&vals.length===3&&vals.every(Number.isSafeInteger)?vals:null;
  const dirty=blockId||xyz||v('evidenceNote')||
   v('facing')!=='unknown'||v('verticalHalf')!=='unknown'||
   v('stairShape')!=='unknown'||v('movementOutcome')!=='not_tested';
  if(!dirty)continue;
  observations.push({
   checkpointId:cp.id,blockId:blockId||null,
   facing:v('facing'),verticalHalf:v('verticalHalf'),
   stairShape:v('stairShape'),captureMethod:v('captureMethod'),
   minecraftVersion:v('minecraftVersion'),
   worldXYZ,movementOutcome:v('movementOutcome'),
   evidenceNote:v('evidenceNote').slice(0,320),
   observedAt:v('observedAt')||null
  });
 }
 return {packetSha256:packet.sha256,observations};
}
function render(){
 const r=submission();
 $('json').value=JSON.stringify(r,null,2);
 $('count').textContent=r.observations.length+' / 18 件の利用者入力（実機未認証）';
 return r;
}
$('make').addEventListener('click',render);
$('download').addEventListener('click',()=>{
 const t=JSON.stringify(render(),null,2)+'\n';
 const url=URL.createObjectURL(new Blob([t],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download='B170_OBSERVATIONS.json';
 a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
});
$('copy').addEventListener('click',()=>{
 const content=JSON.stringify(render(),null,2);
 if(navigator.clipboard?.writeText)
  navigator.clipboard.writeText(content).catch(()=>{
   $('json').focus();$('json').select();});
 else{$('json').focus();$('json').select();}
});
wrap.addEventListener('input',render);
wrap.addEventListener('change',render);render();
</script></body></html>`.replace('__PACKET__',data);
 if(html.includes('__PACKET__')||html.includes('fetch('))
  throw Error('B170_NONSTATIC_CONTENT');
 fs.writeFileSync(path.join(out,'index.html'),html);
 const guide=`B170 READ-ONLY PROBE PACKET

- Open index.html without installing software or contacting Minecraft.
- The 18 local design checkpoints are NOT yet mapped to world coordinates.
- Enter only observations you already have; leave unknowns blank.
- Use "JSONファイルを保存" to export B170_OBSERVATIONS.json.
- You can review the JSON offline with node scripts/b170-review-submission.mjs
  b170-readonly-kit/B170_PROBE_PACKET.json B170_OBSERVATIONS.json
- No automatic Minecraft commands or world changes; no Work required.
- Even a complete record is unauthenticated until an explicitly approved
  client-side read-only validation is available.
- NOT_PREPARED / 9 BLOCKED / worldWrites:0 / BuildPlan.operations:[]
`;
 fs.writeFileSync(path.join(out,'README.txt'),guide);
 return {file:path.join(out,'index.html'),checkpoints:18,worldWrites:0,
  sha256:packet.sha256};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 console.log('B170_CAPTURE_KIT',JSON.stringify(buildB170CaptureKit()));
}
