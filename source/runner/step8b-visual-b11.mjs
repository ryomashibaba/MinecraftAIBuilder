// Offline self-contained read-only browser review. No remote script, API or network access.
import {validateB11Report} from './step8b-interior-repair-b11.mjs';
export function renderB11Html(report,b10){
 validateB11Report(report,b10);
 const embedded=JSON.stringify(report).replaceAll('<','\\u003c').replaceAll('>','\\u003e').replaceAll('&','\\u0026');
 return `<!doctype html><html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Step 8B/B11 — Local Corridor Review</title>
<style>
:root{color-scheme:dark;font-family:ui-sans-serif,system-ui,"Yu Gothic",sans-serif;color:#e9f1ff;background:#09111e}
*{box-sizing:border-box}body{margin:0}.wrap{max-width:1350px;margin:auto;padding:28px 22px 60px}
header{border-bottom:1px solid #263950;padding-bottom:20px;margin-bottom:24px}.eyebrow{font-size:12px;font-weight:700;color:#82d4ff;letter-spacing:.15em}h1{font-size:clamp(27px,3.3vw,44px);line-height:1.2;margin:9px 0}h2{font-size:21px;margin:0 0 12px}p{line-height:1.65;color:#acc0d5} .safe{color:#fec78d} .muted{color:#a8bfd4;font-size:13px}
.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:11px;margin:20px 0}.stat{padding:15px;border:1px solid #28415a;border-radius:13px;background:#102236}.stat strong{display:block;font-size:28px;color:white}.stat small{font-size:12px;color:#a1b5c8}
.layout{display:grid;grid-template-columns:minmax(310px,1fr) minmax(340px,1.3fr);gap:17px}.panel{background:#102034;border:1px solid #2b435c;border-radius:15px;padding:20px;min-width:0} select,button{color:#e8f3ff;border:1px solid #385976;border-radius:9px;padding:9px 11px;background:#172d45;font:inherit}button{cursor:pointer}button:hover{background:#265071}button.active{border-color:#6dd4ff;background:#195875}button:focus-visible,select:focus-visible{outline:3px solid #77dfff}select{max-width:100%;width:100%}.controls{display:flex;gap:6px;flex-wrap:wrap;margin:13px 0 20px}
canvas{width:100%;height:auto;background:#0a1626;border:1px solid #314a60;border-radius:9px;image-rendering:pixelated}.legend{display:flex;gap:10px;flex-wrap:wrap;margin:15px 0}.legend span{font-size:12px;color:#c8d9e9}.sw{display:inline-block;width:11px;height:11px;border-radius:2px;margin-right:6px;vertical-align:middle}
.details{display:grid;gap:9px;font-size:14px}.detail{padding:10px 12px;border:1px solid #2b4259;border-radius:9px}.detail b{color:#e6f8ff}.fine{border-left:3px solid #f4ba80;padding-left:12px;margin-top:14px;font-size:13px;color:#b7cbde;line-height:1.7}.status{font-weight:700;color:#9cdeb8}.smallcaps{font-size:11px;color:#a6bdd1;letter-spacing:.07em;text-transform:uppercase}.bottom{margin-top:18px}.notice{background:#1e2c3a;padding:13px 16px;border-radius:11px;border:1px solid #566071;color:#ffd19c;font-size:13px;line-height:1.6}
@media(max-width:760px){.layout{grid-template-columns:1fr}.stats{grid-template-columns:repeat(2,1fr)}.wrap{padding:18px 12px}}
</style></head><body><div class="wrap"><header><div class="eyebrow">MINECRAFT AI BUILDER • STATIC DESIGN REVIEW</div><h1>B11 / 局所廊下補正のレビュー</h1><p>概念上の廊下と、Windowsソースから予測した建築輪郭を比較。<b class="safe">NOT PREPARED / 施工未承認 / データの自動適用なし</b></p></header>
<div class="stats"><div class="stat"><small>凍結候補</small><strong id="countCandidates">5</strong></div><div class="stat"><small>照合対象階</small><strong id="countFloors">30</strong></div><div class="stat"><small>修正提案セル</small><strong id="countRemoved">18</strong></div><div class="stat"><small>追加セル</small><strong>0</strong></div></div>
<div class="layout"><section class="panel"><h2>建物・階の選択</h2><label class="smallcaps" for="candidate">対象候補</label><select id="candidate"></select><div class="smallcaps" style="margin-top:15px">階数</div><div class="controls" id="floors"></div>
<h2>静的診断</h2><div class="details" id="details"></div><p class="fine">現行の修正案は「予測輪郭の外に出た廊下端を削除する」というレビュー提案です。部屋・階段・EVの予約位置はそのまま。実際の階段接続や避難路、ドア、内壁、ブロック配置は未検証です。</p></section>
<section class="panel"><h2>階別マスク比較</h2><canvas id="map" width="700" height="650" aria-label="Selected floor geometry and corridor overlay"></canvas>
<div class="legend"><span><i class="sw" style="background:#19344e"></i>輪郭内</span><span><i class="sw" style="background:#2d92e0"></i>現行廊下 (提案後も維持)</span><span><i class="sw" style="background:#ff7378"></i>外側の廊下（レビュー上の削除提案）</span><span><i class="sw" style="background:#9c6dfa"></i>階段予約</span><span><i class="sw" style="background:#36c9b9"></i>EV予約</span></div>
<p class="muted">青・赤の色は概念上の廊下セルを表します。灰色の輪郭外も元設計の空間を示すだけで、Minecraftワールドの測量結果ではありません。</p></section></div>
<section class="panel bottom"><h2>証拠とレビュー記録</h2><div class="notice">このHTMLはオフラインの静的診断資料です。候補の選択やJSONの保存は設計の承認・適用・施工に一切連動しません。実機エンジンの動作、材料ID、ワールド原点、実際のモジュール干渉は未確認のままです。</div><p class="muted">レポート SHA-256: <code id="sha"></code></p><button id="export">未承認レビューJSONを保存</button></section></div>
<script>
'use strict';
const data=${embedded};
const $=id=>document.getElementById(id);
const names={'hotel/candidate-01':'ホテル01','apartment/candidate-01':'集合住宅01','office/candidate-01':'オフィス01','office/candidate-02':'オフィス02','office/candidate-03':'オフィス03'};
let current=3,level=0;
$('countCandidates').textContent=data.findings.reviewedBuildings;
$('countFloors').textContent=data.findings.reviewedFloors;
$('countRemoved').textContent=data.findings.proposedRemovedCorridorCells;
$('sha').textContent=data.reportSha256;
for(let i=0;i<data.candidates.length;i++){const x=data.candidates[i];const e=document.createElement('option');e.value=String(i);e.textContent=(names[x.key]||x.key)+' — '+x.summary.nonAppliedRemovals+'セル';$('candidate').append(e);}
$('candidate').value=String(current);
$('candidate').addEventListener('change',()=>{current=Number($('candidate').value);level=0;draw()});
const rect=(ctx,x,y,s,color)=>{ctx.fillStyle=color;ctx.fillRect(x*s+1,y*s+1,Math.max(s-2,1),Math.max(s-2,1))};
function draw(){const c=data.candidates[current],f=c.levels[level],w=c.dimensions.width,d=c.dimensions.depth;
 $('floors').replaceChildren();for(let i=0;i<c.levels.length;i++){const b=document.createElement('button');b.textContent=(i+1)+'F';b.className=i===level?'active':'';b.addEventListener('click',()=>{level=i;draw()});$('floors').append(b)}
 const ctx=$('map').getContext('2d');ctx.clearRect(0,0,700,650);const step=Math.min(24,Math.floor(608/Math.max(w,d)));const left=Math.floor((700-w*step)/2),top=Math.floor((650-d*step)/2);ctx.save();ctx.translate(left,top);
 for(let z=0;z<d;z++)for(let x=0;x<w;x++){const i=z*w+x,inside=f.sourceMask[i]==='1';rect(ctx,x,z,step,inside?'#19344e':'#0b1421');}
 for(const p of f.originalCorridorCells)rect(ctx,p.x,p.z,step,'#2d92e0');
 for(const p of f.removedLocalCells)rect(ctx,p.x,p.z,step,'#ff7378');
 for(const p of f.stairLocalCells)rect(ctx,p.x,p.z,step,'#9c6dfa');
 for(const p of f.elevatorLocalCells)rect(ctx,p.x,p.z,step,'#36c9b9');
 ctx.restore();
 const lines=[['判定',f.resolution],['既存廊下',f.corridorBefore+' セル'],['レビュー後',f.corridorAfter+' セル (未適用)'],['削除提案',f.removedLocalCells.length+' セル'],['接続成分',f.originalConnectionComponents+' → '+f.trimmedConnectionComponents],['新たな分断',f.splitOriginalComponents+' 件'],['概念的な重なり',f.existingOverlap.corridorVsRoom+f.existingOverlap.corridorVsStair+f.existingOverlap.corridorVsElevator+' 件'],['廊下に含まれない室内ドア隣接点',f.schematicRoomHallMissingFromCorridor+' 件']];
 $('details').replaceChildren();for(const [k,v] of lines){const box=document.createElement('div');box.className='detail';const label=document.createElement('b');label.textContent=k+'：';box.append(label,document.createTextNode(String(v)));$('details').append(box)}
}
$('export').addEventListener('click',()=>{const c=data.candidates[current];const review={schema:'minecraftaibuilder-b11-unsigned-review-v1',sourceReportSha256:data.reportSha256,selection:{key:c.key,level:level+1},status:'REVIEW_ONLY_NOT_PREPARED',constructionApproved:false,executionAllowed:false,autoApplied:false,BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0}};
 const blob=new Blob([JSON.stringify(review,null,2)+'\\n'],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='B11_REVIEW_NOT_PREPARED.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)});
draw();
</script></body></html>`;
}
