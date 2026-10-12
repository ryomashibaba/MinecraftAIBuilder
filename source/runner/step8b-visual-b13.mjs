// Standalone offline HTML, uses only B13 static JSON, never engine/API/browser network.
import {validateB13Report} from './step8b-module-contract-b13.mjs';
export function renderB13Html(report,root){
 validateB13Report(report,root);
 const data=JSON.stringify(report).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');
 return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MinecraftAIBuilder B13 非施工モジュール契約</title>
<style>:root{font-family:system-ui,sans-serif;color-scheme:dark;background:#0c1423;color:#ebf2ff}body{max-width:1150px;margin:28px auto;padding:0 16px}header{border-bottom:1px solid #40536f;padding-bottom:14px}h1{font-size:1.7rem}p,td{line-height:1.55}small,.muted{color:#9fb3cb}section{background:#142239;border:1px solid #344a63;border-radius:12px;padding:17px;margin:16px 0}table{border-collapse:collapse;width:100%;font-size:14px}td,th{padding:9px;border-bottom:1px solid #34465b;text-align:left}select,button,input{font:inherit;border:1px solid #62809c;background:#182b43;color:white;padding:8px;border-radius:7px}button{cursor:pointer}canvas{width:100%;max-width:580px;aspect-ratio:6/5;background:#0e1827;image-rendering:pixelated;border:1px solid #426081}.grid{display:grid;grid-template-columns:minmax(280px,600px) 1fr;gap:18px;align-items:start}.safe{color:#76e0b1}.warn{color:#ffcd8b}.mark{display:inline-block;padding:4px 9px;border-radius:5px;border:1px solid #bd9e68}@media(max-width:780px){.grid{grid-template-columns:1fr}}</style></head>
<body><header><div class="warn mark">BLOCKED / NOT PREPARED / 施工命令 0</div><h1>B13 実プランナーと内部設計の契約差分</h1><p>Windowsソースの固定ハッシュとB12凍結設計に基づく非施工レビュー。表示・JSON保存は施工承認になりません。</p></header>
<section><h2>モジュール対応範囲</h2><table><thead><tr><th>機能</th><th>照合結果</th><th>注意</th></tr></thead><tbody id="coverage"></tbody></table></section>
<section><h2>オフィス02 — 外形・廊下の根本原因</h2><p id="reason"></p><div class="grid"><div><label>階 <select id="floor"></select></label> <label>表示 <select id="layer"><option value="overlap">差分重ね合わせ</option><option value="concept">概念輪郭</option><option value="source">エンジン予測</option></select></label><canvas id="preview" width="480" height="400" aria-label="静的占有比較"></canvas><p class="muted">緑:共通 / 黄:概念だけ / 青:エンジンだけ。赤:はみ出した廊下端。</p></div><div><h3>代替案（未適用）</h3><select id="alternative" style="width:100%"></select><p id="altDetail"></p><p>外形差分の解消と、実際の室内ドア・壁・階段の施工能力は別問題です。</p></div></div></section>
<section><h2>5候補の静的集計</h2><table><thead><tr><th>候補</th><th>概念ドア点</th><th>外形差分</th><th>廊下補正候補</th></tr></thead><tbody id="candidates"></tbody></table><p class="warn">314個のドア点はブロック配置・通行性を保証しません。</p></section>
<section><button id="export">未承認レビューJSONを保存</button><p class="muted">保存先は利用者が選ぶローカルファイルのみ。ネットワーク接続なし。</p></section>
<script type="application/json" id="data">${data}</script><script>
(()=>{'use strict';const r=JSON.parse(document.getElementById('data').textContent);const $=id=>document.getElementById(id);const text=(e,s)=>{e.textContent=String(s)};
for(const a of r.coverage){const tr=document.createElement('tr');for(const v of [a.id,a.engine,a.concept]){const td=document.createElement('td');text(td,v);tr.appendChild(td)}$('coverage').appendChild(tr)}
for(const a of r.candidates){const tr=document.createElement('tr');for(const v of [a.key,a.doorPorts,a.sourceFootprintDiff,a.corridorOutside]){const td=document.createElement('td');text(td,v);tr.appendChild(td)}$('candidates').appendChild(tr)}
text($('reason'),'urban_japanese proportion='+r.office02.styleProportion+' / wing 概念'+r.office02.conceptWing+' → エンジン'+r.office02.sourceWing+'。外形差分'+r.office02.changedCells+'セル、廊下はみ出し'+r.office02.unplacedCorridorCells+'セル。');
for(let i=1;i<=6;i++){const o=document.createElement('option');o.value=String(i);text(o,i+'階');$('floor').appendChild(o)}
for(const a of r.office02ReviewAlternatives){const o=document.createElement('option');o.value=a.id;text(o,a.id);$('alternative').appendChild(o)}
const geometry=r.office02Visualization;
function draw(){const floor=Number($('floor').value)-1,data=geometry[floor],cnv=$('preview'),ctx=cnv.getContext('2d'),w=24,d=20;ctx.clearRect(0,0,cnv.width,cnv.height);const dx=cnv.width/w,dy=cnv.height/d,layer=$('layer').value;
for(let i=0;i<w*d;i++){const c=data.c[i]==='1',s=data.s[i]==='1',x=i%w,z=Math.floor(i/w);ctx.fillStyle=layer==='concept'?(c?'#d5c77b':'#0e1827'):layer==='source'?(s?'#70b6dd':'#0e1827'):(c&&s?'#57a58d':c?'#e7c65a':s?'#568ec1':'#0e1827');ctx.fillRect(x*dx,z*dy,dx-.8,dy-.8)}
if(layer==='overlap')for(const q of data.removed){ctx.fillStyle='#ec6978';ctx.fillRect(q.x*dx+dx*.16,q.z*dy+dy*.16,dx*.68,dy*.68)}
}
function showAlt(){const a=r.office02ReviewAlternatives.find(x=>x.id===$('alternative').value);text($('altDetail'),a.description+' | 外形差分 '+a.conceptualMismatchCells+' / 2D廊下はみ出し '+a.nominalCorridorOutsideCells+' / 通行性 未検証');}
$('floor').addEventListener('change',draw);$('layer').addEventListener('change',draw);$('alternative').addEventListener('change',showAlt);
$('export').addEventListener('click',()=>{const safe={schema:'minecraftaibuilder-b13-unsigned-review-v1',b13ReportSha256:r.reportSha256,selectedAlternative:$('alternative').value,selectedFloor:Number($('floor').value),approved:false,constructionApproved:false,executionAllowed:false,BuildPlan:{status:'NOT_PREPARED',commandCount:0,operations:[]}};
const href=URL.createObjectURL(new Blob([JSON.stringify(safe,null,2)+'\\n'],{type:'application/json'}));const a=document.createElement('a');a.href=href;a.download='B13_UNSIGNED_REVIEW.json';a.click();URL.revokeObjectURL(href)});
draw();showAlt();window.B13_UI_READY=true;})();
</script>
</body></html>`;
}
