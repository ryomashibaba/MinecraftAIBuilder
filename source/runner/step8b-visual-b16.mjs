/** Offline visual-only corridor graph review. No network, Bridge, or build operations. */
import {validateB16Report} from './step8b-connectivity-b16.mjs';
export function renderB16Html(report,root){
 validateB16Report(report,root);
 const payload=JSON.stringify(report).replace(/&/g,'\\u0026').replace(/</g,'\\u003c').replace(/>/g,'\\u003e');
 return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MinecraftAIBuilder B16 Connectivity Review</title><style>
:root{color-scheme:dark;font:15px/1.5 system-ui,sans-serif;background:#101720;color:#ecf3fc}body{max-width:1140px;margin:auto;padding:24px}h1{font-size:1.65rem}section{background:#1b283a;border:1px solid #384d65;border-radius:12px;margin:16px 0;padding:16px}.warning{color:#ffd297}.muted{color:#b3c6db}.layout{display:grid;grid-template-columns:1.6fr 1fr;gap:16px}canvas{display:block;width:100%;height:auto;border-radius:8px;border:1px solid #43536a;background:#142132}table{width:100%;border-collapse:collapse}td{border-bottom:1px solid #36485f;padding:7px}select,button{padding:8px 10px;color:inherit;background:#283d55;border:1px solid #7990ae;border-radius:7px}label{display:inline-flex;gap:7px;align-items:center;margin:0 14px 12px 0}button{cursor:pointer}@media(max-width:820px){.layout{grid-template-columns:1fr}}</style></head><body>
<h1>B16 接続グラフ・上下階の概念経路レビュー</h1><p class="warning"><strong>NOT PREPARED / BLOCKED / 施工命令0件</strong></p><p>廊下の4近傍、部屋ドアの隣接位置、階段予約領域を使った<strong>概念上のグラフ</strong>です。物理的な通行可能性、建築完了、避難安全性を証明しません。</p>
<section><label>建物 <select id="building"></select></label><label>階 <select id="level"></select></label><label>比較 <select id="mode"><option value="ORIGINAL">元の設計</option><option value="TRIM_REVIEW">廊下端のレビュー補正（未適用）</option></select></label><div class="layout"><div><canvas id="map" width="760" height="690" aria-label="概念的な廊下・ドア・階段接続図"></canvas><p class="muted">青＝廊下、橙＝階段予約、紫＝EV予約、薄緑＝ドア接続点、赤枠＝予測外の廊下、×＝除外提案セル。上下階の位置一致は通行可能の保証ではありません。</p></div><div><h2>接続の診断</h2><table><tbody id="metrics"></tbody></table><p class="warning">行き止まり候補は次数1のセルを数えた参考値です。火災時の避難能力は評価していません。</p></div></div></section>
<section><h2>全体の制限</h2><ul id="limits"></ul><button id="export">未承認レビューJSONを保存</button><p class="muted">JSON保存では設計・施工は変更されません。</p></section>
<script type="application/json" id="report">${payload}</script><script>
(()=>{'use strict';const r=JSON.parse(document.getElementById('report').textContent),$=id=>document.getElementById(id);
const item=(el,v,label)=>{const op=document.createElement('option');op.value=String(v);op.textContent=label;el.appendChild(op)};
for(const b of r.candidates)item($('building'),b.key,b.key);
for(const s of r.limitations){const li=document.createElement('li');li.textContent=s;$('limits').appendChild(li)}
function updateLevels(){const b=r.candidates.find(b=>b.key===$('building').value);$('level').textContent='';for(const l of b.levels)item($('level'),l.level,l.level+'階');draw()}
function draw(){const b=r.candidates.find(b=>b.key===$('building').value),f=b.levels.find(l=>String(l.level)===$('level').value),mode=$('mode').value,g=mode==='ORIGINAL'?f.original:f.trimmed,d=f.reviewData,c=$('map'),ctx=c.getContext('2d'),{width:w,depth:h}=d.dimensions;
ctx.fillStyle='#142132';ctx.fillRect(0,0,c.width,c.height);const size=Math.min((c.width-58)/w,(c.height-58)/h,21),ox=(c.width-w*size)/2,oz=(c.height-h*size)/2;
const key=p=>p.x+','+p.z,rm=new Set(mode==='TRIM_REVIEW'?d.removed.map(key):[]),cor=new Set(d.corridor.map(key)),sta=new Set(d.stair.map(key)),ev=new Set(d.elevator.map(key));
for(let z=0;z<h;z++)for(let x=0;x<w;x++){const k=x+','+z,source=d.sourceMask[z*w+x]==='1';ctx.fillStyle=source?'#33475f':'#1a2636';if(cor.has(k)&&!rm.has(k))ctx.fillStyle=source?'#3886a8':'#b24c66';if(sta.has(k))ctx.fillStyle='#d8a35d';if(ev.has(k))ctx.fillStyle='#a78bc8';ctx.fillRect(ox+x*size+.6,oz+z*size+.6,size-1.2,size-1.2);
if(rm.has(k)){ctx.strokeStyle='#ff697f';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(ox+x*size+3,oz+z*size+3);ctx.lineTo(ox+(x+1)*size-3,oz+(z+1)*size-3);ctx.moveTo(ox+(x+1)*size-3,oz+z*size+3);ctx.lineTo(ox+x*size+3,oz+(z+1)*size-3);ctx.stroke();}}
for(const p of d.roomPorts){const q=p.hall;if(rm.has(key(q)))continue;ctx.fillStyle='#baf5bf';ctx.beginPath();ctx.arc(ox+(q.x+.5)*size,oz+(q.z+.5)*size,Math.max(2,size*.21),0,Math.PI*2);ctx.fill()}
const vals=[['棟 / 階',b.key+' / '+f.level],['ドア接続点',g.counts.roomDoorEdges],['廊下セル',g.counts.corridorCells],['廊下接続成分',g.counts.corridorComponents],['廊下次数1の候補',g.counts.degreeOneCorridorCells],['孤立廊下セル',g.counts.isolatedCorridorCells],['廊下未接続の部屋',g.counts.roomsWithoutCorridor],['階段への概念経路なし',g.counts.roomsWithoutNominalStairPath],['予測外の廊下セル',g.counts.corridorCellsOutsideSource],['未適用の除外候補',g.counts.reviewRemovedCells],['物理的な移動可能性','未検証']];$('metrics').textContent='';for(const [name,val] of vals){const tr=document.createElement('tr');for(const v of [name,val]){const td=document.createElement('td');td.textContent=String(v);tr.appendChild(td)}$('metrics').appendChild(tr)}
}
$('building').addEventListener('change',updateLevels);$('level').addEventListener('change',draw);$('mode').addEventListener('change',draw);
$('export').addEventListener('click',()=>{const o={schema:'minecraftaibuilder-b16-unsigned-review-v1',reportSha256:r.reportSha256,building:$('building').value,level:Number($('level').value),mode:$('mode').value,approved:false,applied:false,constructionApproved:false,executionAllowed:false,BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0}};
const url=URL.createObjectURL(new Blob([JSON.stringify(o,null,2)+'\\n'],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='B16_UNSIGNED_REVIEW.json';a.click();URL.revokeObjectURL(url)});
updateLevels();window.B16_UI_READY=true;})();
</script></body></html>`;
}
