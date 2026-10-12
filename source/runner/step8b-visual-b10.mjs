// Standalone interactive 2.5D review HTML. All data is generated offline.
import {validateB10Report} from './step8b-interior-contract-b10.mjs';
export function renderB10Html(report){
 validateB10Report(report);
 const items=report.frozenBuildings.map(x=>({key:x.key,title:x.program+' / '+x.massing+' · '+x.key.split('/')[1],type:'frozen',dims:x.dimensions,
  levels:x.levels.map(f=>({source:f.masks.source,concept:f.masks.concept,difference:f.conceptOnlyCells,areas:[f.conceptArea,f.sourceArea],category:f.categories})),
  orientation:x.orientation,summary:x.summary}))
  .concat(report.paretoGeometryOnly.map(x=>({key:'pareto/'+x.id,title:x.program+' / '+x.massing+' · '+x.id,type:'pareto',dims:x.dimensions,
   levels:x.levels.map(f=>({source:f,concept:f,difference:0})),orientation:x.orientation,summary:{conceptOnlyCells:0,interiorLayerOutsideCells:0}})));
 const json=JSON.stringify({items,reportSha256:report.reportSha256,sourceManifest:report.sourceEvidence.snapshotManifestSha256})
  .replace(/[<>&\u2028\u2029]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));
 return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>MinecraftAIBuilder B10 | 立体形状・内部予約領域レビュー</title>
<style>:root{font:14px system-ui,-apple-system,'Segoe UI',sans-serif;color-scheme:dark;color:#eaf0f8;background:#07111f}*{box-sizing:border-box}body{margin:0}main{max-width:1300px;margin:auto;padding:24px 18px 52px}h1{font-size:27px;line-height:1.3;margin:8px 0 10px}h2{font-size:17px;margin:0 0 12px}.muted{color:#a6bbd5;line-height:1.6}.banner{background:#352923;border-left:4px solid #ffa96b;border-radius:10px;padding:12px 16px;margin:17px 0}.layout{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(290px,.8fr);gap:16px}.panel{background:#122136;border:1px solid #294565;border-radius:16px;padding:18px;margin:0 0 16px}.controls{display:flex;flex-wrap:wrap;align-items:end;gap:13px}.controls label{display:flex;flex-direction:column;gap:6px;font-size:12px;color:#b1c8e4;max-width:100%}select,button,input{font:inherit;color:#f0f6ff;background:#233850;border:1px solid #607b98;border-radius:8px;padding:8px;max-width:100%}select{min-width:190px}button{cursor:pointer}button[aria-pressed="true"]{border-color:#80d8e8;background:#185465}input[type="range"]{width:140px;accent-color:#66d6e0}canvas{width:100%;height:auto;border-radius:12px;background:#0a1729;display:block;margin:13px 0}button:focus-visible,select:focus-visible,input:focus-visible{outline:3px solid #ffcf80;outline-offset:3px}dl{display:grid;grid-template-columns:1fr auto;gap:8px;margin:12px 0}dt{color:#a7c0dc}dd{margin:0;font-variant-numeric:tabular-nums}.warn{color:#ffc391}.good{color:#a0f0d5}.legend{display:flex;flex-wrap:wrap;gap:10px;font-size:12px;color:#c4d6ec}.swatch{display:inline-block;width:12px;height:12px;border-radius:2px;margin-right:4px}.small{font-size:12px}.box{background:#1b2e45;padding:11px;border-radius:9px;margin:10px 0}.danger{background:#2c2933;border-left:3px solid #e7aa98;padding:10px}.note{line-height:1.8}a{color:#8de1f3}@media(max-width:790px){.layout{grid-template-columns:1fr}main{padding:12px}.panel{padding:12px}}</style></head><body><main><div class="muted">MinecraftAIBuilder / Step 8B · B10 — Offline Evidence Review</div><h1>建築形状 2.5D・内部予約領域の静的照合</h1>
<div class="banner"><strong>NOT PREPARED — 施工不可</strong><div>立体表示は階ごとの占有マスクを視覚化したものです。部屋・壁・階段・屋根・材料・実機施工の成立を保証しません。</div></div>
<div class="layout"><section class="panel"><h2>立体プレビュー</h2><div class="controls"><label>対象<select id="candidate"></select></label><label>表示階（断面）<input type="range" id="floor" min="1" max="6" value="6"></label><strong id="floorLabel" aria-live="polite">6F</strong><button id="layer" aria-pressed="false">全階 / 分解図</button><button id="overlay" aria-pressed="true">概念差分を表示</button></div>
<canvas id="model" width="1000" height="680" role="img" aria-label="建築の静的立体プレビュー"></canvas><div class="legend"><span><i class="swatch" style="background:#5bced4"></i>エンジン予測の占有</span><span><i class="swatch" style="background:#f09977"></i>元の概念設計にのみ存在</span><span><i class="swatch" style="background:#7cb6f5"></i>予測側にのみ存在</span></div><p class="muted small">形状はローカルX/Z座標による投影。表示回転は画面操作用で、ワールド座標・ブロックIDの変換ではありません。</p></section>
<aside><section class="panel"><h2>照合結果</h2><div id="details"></div></section><section class="panel"><h2>今回の対象</h2><p class="note">凍結された5つの建築案と、B9の14 Pareto形状を表示します。</p><p class="muted">5案の内部データには、Step 8Aで予約された階段・EV・廊下・部屋の2D占有が含まれます。Pareto14形状は外形のみで、内部設計はありません。</p></section><section class="panel"><h2>未証明の安全条件</h2><div class="danger small">実プランナーを未実行、実行中エンジン未特定、ワールド位置・材料・階段の通行性・建築安全性は未確認。施工承認はありません。</div></section></aside></div>
<section class="panel"><h2>根拠データと取扱い</h2><p class="muted">Step 8Aのconcept/detailと、Step 8Bのソース予測マスクを非施工で比較。元の凍結成果物のハッシュを固定して照合。レビュー結果を保存・選択しても、Minecraftへ操作を送信しません。</p><div class="small muted">Source manifest: ${report.sourceEvidence.snapshotManifestSha256} / Contract SHA: ${report.reportSha256}</div></section></main>
<script type="application/json" id="data">${json}</script><script>
'use strict';
const db=JSON.parse(document.getElementById('data').textContent);const get=k=>document.getElementById(k);
for(const c of db.items){const opt=document.createElement('option');opt.value=c.key;opt.textContent=c.title;get('candidate').append(opt);}
get('candidate').value='office/candidate-02';let exploded=false,showDiff=true;
function polygon(ctx,points,color){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fillStyle=color;ctx.fill();ctx.strokeStyle='#102638';ctx.lineWidth=.38;ctx.stroke();}
function cube(ctx,x,z,h,color,size,originX,originY){const xx=(x-z)*size,zz=(x+z)*size*.5;const X=originX+xx,Y=originY+zz-h;
 const top=[[X,Y],[X+size,Y+size*.5],[X,Y+size],[X-size,Y+size*.5]];
 polygon(ctx,[[X-size,Y+size*.5],[X,Y+size],[X,Y+size+size*.55],[X-size,Y+size*.5+size*.55]],color==='concept'?'#864a43':'#245b67');
 polygon(ctx,[[X,Y+size],[X+size,Y+size*.5],[X+size,Y+size*.5+size*.55],[X,Y+size+size*.55]],color==='concept'?'#9d5c4a':'#317885');
 polygon(ctx,top,color==='concept'?'#f09977':color==='sourceOnly'?'#7cb6f5':'#5bced4');}
function redraw(){const c=db.items.find(x=>x.key===get('candidate').value)||db.items[0];const n=c.dims.floors;get('floor').max=String(n);if(+get('floor').value>n)get('floor').value=String(n);const level=+get('floor').value;get('floorLabel').textContent=level+'F';
 const canvas=get('model'),ctx=canvas.getContext('2d');if(!ctx)return;ctx.clearRect(0,0,canvas.width,canvas.height);const w=c.dims.width,d=c.dims.depth,s=Math.max(5,Math.min(11,420/(w+d)));const ox=canvas.width*.50,oy=exploded?canvas.height*.69:canvas.height*.72;
 const floors=exploded?Array.from({length:level},(_,i)=>i):[level-1];
 const steps=exploded?Math.min(38,350/Math.max(1,level)):0;
 for(const f of floors){const info=c.levels[f];if(!info)continue;const baseY=oy-(exploded?f*steps:0);
 for(let z=0;z<d;z++)for(let x=0;x<w;x++){const i=z*w+x;const inS=info.source[i]==='1',inC=info.concept[i]==='1';if(!inS&&!inC)continue;
  if(inS)cube(ctx,x,z,0,inC?'normal':'sourceOnly',s,ox,baseY);
  else if(showDiff)cube(ctx,x,z,0,'concept',s,ox,baseY);
 }}
 const l=c.levels[level-1],st=c.summary,aside=get('details');aside.replaceChildren();const heading=document.createElement('p');heading.textContent=c.title;aside.append(heading);
 const dl=document.createElement('dl');const rows=[['表示階',level+'/'+n],['敷地（ローカル）',c.dims.width+'×'+c.dims.depth],['方向（ラベルのみ）',c.orientation],['全階の元設計のみ残るセル',String(st.conceptOnlyCells||0)],['内部領域の予測範囲外セル',c.type==='frozen'?String(st.interiorLayerOutsideCells):'未設計']];
 if(c.type==='frozen')rows.push(['現在階の差分',l.difference+'セル'],['現在階の廊下はみ出し',l.category.corridor.outsideSourceCells+'セル'],['部屋数（現在階）','レビュー専用']);
 for(const [k,v] of rows){const dt=document.createElement('dt');dt.textContent=k;const dd=document.createElement('dd');dd.textContent=v;dl.append(dt,dd);}aside.append(dl);
 const note=document.createElement('p');note.className=c.type==='frozen'&&st.interiorLayerOutsideCells?'warn':'muted';note.textContent=c.type==='pareto'?'外形のみ。内部設計データなし。':st.interiorLayerOutsideCells?'概念上の廊下等が予測された建物外へ出るため、設計差分の解消が必要です。':'表示上、予約領域の2Dはみ出しなし。ただし通行性は未証明です。';aside.append(note);
}
get('candidate').addEventListener('change',()=>{get('floor').value=String(db.items.find(x=>x.key===get('candidate').value).dims.floors);redraw()});get('floor').addEventListener('input',redraw);get('layer').addEventListener('click',()=>{exploded=!exploded;get('layer').setAttribute('aria-pressed',String(exploded));redraw()});get('overlay').addEventListener('click',()=>{showDiff=!showDiff;get('overlay').setAttribute('aria-pressed',String(showDiff));redraw()});redraw();
</script></body></html>`;
}
