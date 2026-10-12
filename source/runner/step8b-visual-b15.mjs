/** Standalone local-only visualization of B15 hypothetical space claims. */
import {validateB15Report} from './step8b-virtual-volume-b15.mjs';
import {buildB14Report,validateB14Report} from './step8b-interior-modules-b14.mjs';
export function renderB15Html(report,root){
 validateB15Report(report,root);
 const b14=buildB14Report(root);validateB14Report(b14,root);
 const structures=b14.candidates.map(c=>({key:c.key,levels:c.levels.map(l=>({level:l.level,dimensions:l.dimensions,sourceMask:l.sourcePredictedMask,
  boundaries:l.edgeContracts.map(e=>({a:e.a,b:e.b,door:e.kind==='NOMINAL_DOOR_INTERFACE'})),
  corridor:l.localCorridorReservation,stair:l.nominalStairReservation,elevator:l.nominalElevatorReservation}))}));
 const safe=v=>JSON.stringify(v).replace(/&/g,'\\u0026').replace(/</g,'\\u003c').replace(/>/g,'\\u003e');
 return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MinecraftAIBuilder B15 Virtual Space Review</title>
<style>:root{font:15px/1.5 system-ui,sans-serif;color-scheme:dark;background:#0c1422;color:#edf2fa}body{max-width:1220px;padding:22px;margin:auto}h1{font-size:1.8rem}section{background:#17243a;border:1px solid #364b67;border-radius:12px;padding:18px;margin:16px 0}.alert{color:#ffcc86}.dim{color:#adc2da;font-size:.9em}.layout{display:grid;grid-template-columns: minmax(320px, 1.7fr) minmax(250px,1fr);gap:16px}label{display:inline-flex;gap:8px;align-items:center;margin:0 12px 12px 0}select,button{padding:9px;background:#223652;color:#fff;border:1px solid #778ba9;border-radius:7px}button{cursor:pointer}canvas{width:100%;background:#101c2b;border:1px solid #435975;border-radius:8px}table{border-collapse:collapse;width:100%}td,th{padding:7px;border-bottom:1px solid #34475e;text-align:left}small{color:#a9bcd2}@media(max-width:780px){.layout{grid-template-columns:1fr}}</style></head><body>
<h1>B15 — 仮想壁体積・ドア・階段クリアランスの設計レビュー</h1>
<p class="alert"><strong>NOT PREPARED / BLOCKED / 施工命令0</strong></p><p>これらは<strong>概念セル・名目Yによる仮想試算</strong>です。実ブロック・材料・壁厚・物理的通行性・施工可否を証明するものではありません。</p>
<section><label>建築候補<select id="building"></select></label><label>階<select id="level"></select></label><label>仮想壁厚<select id="scenario"></select></label>
<div class="layout"><div><canvas width="840" height="630" id="scene" aria-label="非施工の概念上の2.5D壁・ドア・予約領域"></canvas><p class="dim">等角図：灰＝建物予測範囲、青＝廊下、橙＝階段予約、紫＝EV予約、白＝仮想壁、ピンク＝仮想開口候補。スケールは概念値です。</p></div><div><h2>仮想条件別の確認</h2><table><tbody id="metrics"></tbody></table><p class="alert">接触候補は「危険・衝突確定」を意味しません。壁と通路の隣接による接触も数えます。</p><p class="dim">オフィス02の外形123セル、廊下18セルの不一致は未解決です。</p></div></div></section>
<section><h2>未証明のエンジン入力</h2><ul id="unknown"></ul><p class="dim">確認済みソースは固定SHA-256付きの一部ファイルに限定。実プロセス、ワールド、Educationブロック状態への接続なし。</p></section>
<section><button id="export">未承認レビューJSONを保存</button><small>保存しても承認・施工を実行しません。</small></section>
<script type="application/json" id="b15-payload">${safe(report)}</script><script type="application/json" id="b15-geometries">${safe(structures)}</script><script>
(()=>{'use strict';const report=JSON.parse(document.getElementById('b15-payload').textContent),buildings=JSON.parse(document.getElementById('b15-geometries').textContent),$=x=>document.getElementById(x);const add=(el,v,label)=>{const o=document.createElement('option');o.value=String(v);o.textContent=label;el.appendChild(o)};const row=(k,v)=>{const tr=document.createElement('tr');for(const t of [k,v]){const td=document.createElement('td');td.textContent=String(t);tr.appendChild(td)}$('metrics').appendChild(tr)};
for(const b of buildings)add($('building'),b.key,b.key);for(const s of report.virtualScenarios)add($('scenario'),s.id,s.id+' (仮想厚 '+s.virtualParameters.thickness+')');
for(const x of report.interfaceContract.required){const li=document.createElement('li');li.textContent=x;$('unknown').appendChild(li)}
function project(x,z,y=0){return [420+(x-z)*11,145+(x+z)*6-y*21]}
function draw(){const b=buildings.find(x=>x.key===$('building').value),l=b.levels[Number($('level').value)-1],s=report.virtualScenarios.find(x=>x.id===$('scenario').value),metrics=s.buildings.find(x=>x.key===b.key).levels[l.level-1],canvas=$('scene'),ctx=canvas.getContext('2d');
 ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#101c2b';ctx.fillRect(0,0,canvas.width,canvas.height);
 const cell=(p,color)=>{const [x,z]=[p.x,p.z],corners=[[x,z],[x+1,z],[x+1,z+1],[x,z+1]].map(q=>project(...q));ctx.beginPath();ctx.moveTo(...corners[0]);for(const v of corners.slice(1))ctx.lineTo(...v);ctx.closePath();ctx.fillStyle=color;ctx.fill()};
 for(let z=0;z<l.dimensions.depth;z++)for(let x=0;x<l.dimensions.width;x++)if(l.sourceMask[z*l.dimensions.width+x]==='1')cell({x,z},'#2b425b');
 for(const [values,color] of [[l.corridor,'#367eae'],[l.stair,'#d39747'],[l.elevator,'#a27ec7']])for(const p of values)cell(p,color);
 const height=s.virtualParameters.wallHeight;for(const e of l.boundaries){const a=e.a,b=e.b;if(a.x!==b.x){const x=Math.max(a.x,b.x),z=a.z;stroke(x,z,x,z+1,e.door?'#ff88b9':'#f1f5fa',e.door?2.4:1.2,e.door?0:height)}else{const x=a.x,z=Math.max(a.z,b.z);stroke(x,z,x+1,z,e.door?'#ff88b9':'#f1f5fa',e.door?2.4:1.2,e.door?0:height)}}
 function stroke(x0,z0,x1,z1,color,width,h){const p=project(x0,z0,h),q=project(x1,z1,h);ctx.beginPath();ctx.moveTo(...p);ctx.lineTo(...q);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();if(h){const a=project(x0,z0),b=project(x1,z1);ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...p);ctx.moveTo(...b);ctx.lineTo(...q);ctx.strokeStyle='rgba(210,226,244,.3)';ctx.stroke()}}
 $('metrics').textContent='';for(const [k,v] of [['棟',b.key],['階',l.level],['仮想壁厚',s.virtualParameters.thickness],['仮想壁高さ',height],['概念壁境界',metrics.counts.nominalWalls],['概念ドア候補',metrics.counts.nominalDoors],['仮想境界外延伸',metrics.counts.edgeOutside],['廊下接触セル',metrics.counts.corridorContactCells],['廊下の接触面積合計',metrics.counts.projectedContactArea.corridor],['階段予約の接触面積合計',metrics.counts.projectedContactArea.stair],['物理検証','未確認']])row(k,v);
}
function refresh(){const b=buildings.find(x=>x.key===$('building').value);$('level').textContent='';for(const l of b.levels)add($('level'),l.level,l.level+'階');draw()}
$('building').addEventListener('change',refresh);$('level').addEventListener('change',draw);$('scenario').addEventListener('change',draw);
$('export').addEventListener('click',()=>{const o={schema:'minecraftaibuilder-b15-unsigned-review-v1',reportSha256:report.reportSha256,selectedBuilding:$('building').value,selectedLevel:Number($('level').value),selectedScenario:$('scenario').value,approved:false,applied:false,constructionApproved:false,executionAllowed:false,BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0}};const url=URL.createObjectURL(new Blob([JSON.stringify(o,null,2)+'\\n'],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='B15_UNSIGNED_REVIEW.json';a.click();URL.revokeObjectURL(url)});
refresh();window.B15_UI_READY=true;})();
</script></body></html>`;
}
