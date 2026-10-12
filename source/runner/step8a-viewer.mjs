// Portable review visualization. No external JS/CSS URLs, no network calls, no edit/build controls.
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderReviewHtml(report){
 const data=JSON.stringify(report.candidates.map(c=>({title:c.title,composition:c.concept.BuildingComposition,massing:c.concept.Massing,facade:c.concept.Facade,colors:c.concept.MaterialGrammar.conceptColors,assessment:c.assessment,ranking:c.ranking,assumptions:c.concept.assumptions,issues:c.assessment.reviewIssues,status:c.status}))).replace(/[<>&\u2028\u2029]/g,ch=>'\\u'+ch.charCodeAt(0).toString(16).padStart(4,'0'));
 return `<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Step 8A｜建築設計レビュー</title>
<style>
:root{color-scheme:dark;font-family:system-ui,-apple-system,'Noto Sans JP',sans-serif;background:#07101e;color:#eaf1fa}*{box-sizing:border-box}body{max-width:1420px;margin:0 auto;padding:24px}h1{margin:0;font-size:clamp(23px,2.6vw,37px)}p{line-height:1.6;color:#b1c2d6}h2{font-size:18px}.eyebrow{color:#6fdbcb;font-size:12px;font-weight:700;letter-spacing:.14em;margin-bottom:10px}.layout{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:16px;margin-top:22px}.stage,.panel,.foot{border:1px solid #263951;background:#101e32;border-radius:18px;padding:17px}canvas{width:100%;height:auto;display:block;touch-action:none;cursor:grab;border-radius:12px;background:radial-gradient(circle at 50% 25%,#193252,#0b1727 70%)}canvas:active{cursor:grabbing}.buttons{display:flex;gap:8px;flex-wrap:wrap;margin:13px 0}button{padding:9px 13px;background:#203550;color:#edf8fb;border:1px solid #446482;border-radius:9px;cursor:pointer;font:inherit}button[aria-pressed="true"]{background:#216b75;border-color:#6fdbcb}.kv{display:flex;justify-content:space-between;gap:14px;padding:10px 0;border-bottom:1px solid #2d4057;font-size:14px}.kv span{color:#a3b7d1;text-align:right}.warn{margin-top:12px;padding:12px;background:#302b2b;border:1px solid #715f4b;border-radius:10px;color:#f2cf8d;font-size:13px}.muted{font-size:13px;color:#99adc4}.foot{margin-top:15px;font-size:13px;color:#aac1d5}.pill{display:inline-flex;background:#233a44;color:#91e1d0;padding:6px 10px;border-radius:99px;font-size:12px}.controls{display:flex;gap:12px;align-items:center;flex-wrap:wrap;font-size:13px;color:#b5c6d9}input[type=range]{accent-color:#60d4c7;width:140px}ul{padding-left:20px;line-height:1.8}@media(max-width:860px){.layout{grid-template-columns:1fr}body{padding:14px}}
</style></head><body>
<div class="eyebrow">MINECRAFT AI BUILDER / STEP 8A / OFFLINE</div>
<h1>建築設計レビュー <span class="pill">NOT PREPARED</span></h1>
<p>実際の敷地・ブロック材料・動線・耐久性を検証した完成建築ではありません。形状と用途の候補を比較するための<b>独立したオフライン概念ビューア</b>です。マウスドラッグ・タッチで回転できます。</p>
<div class="layout"><section class="stage"><div class="buttons" id="tabs" aria-label="設計候補を選ぶ"></div><canvas id="scene" width="980" height="630" aria-label="回転できる建築マスモデル"></canvas><div class="controls"><button id="reset">視点を戻す</button><label>表示階数 <input id="floors" type="range" min="1" max="10" value="10"/></label><span id="floorLabel"></span></div><p class="muted">立体表示は矩形マスと開口リズムを模式的に描画。窓・入口・支持構造などの実施工図ではありません。</p></section>
<aside class="panel"><h2 id="title"></h2><div id="stats"></div><h2>レビュー上の制約・留意点</h2><div id="warnings"></div><h2>設計上の仮定</h2><div id="assumptions" class="muted"></div></aside></div>
<div class="foot"><b>安全状態：</b>constructionApproved=false / executionAllowed=false / noBridge / noScan / noPackGeneration / noWorldMutation。Step 7P・7Qの凍結証拠、Legacy設定、既存建築には触れません。候補順位は機械的な比較指標であり、品質保証ではありません。</div>
<script type="application/json" id="model">${data}</script><script>
(()=>{'use strict';
const items=JSON.parse(document.getElementById('model').textContent);const $=x=>document.getElementById(x);const ctx=$('scene').getContext('2d');let selected=0,yaw=.72,pitch=.55,maxFloors=10,dragging=false,prevX=0,prevY=0;
function grid(model,f){const w=model.composition.dimensions.width,d=model.composition.dimensions.depth,a=Array.from({length:d},()=>new Uint8Array(w));for(const r of model.massing.rectangles)if(r.start<=f&&r.end>f)for(let z=r.z;z<r.z+r.depth;z++)for(let x=r.x;x<r.x+r.width;x++)a[z][x]=1;return a;}
function quads(model){const width=model.composition.dimensions.width,depth=model.composition.dimensions.depth,n=Math.min(maxFloors,model.composition.floorCount),fh=model.composition.floorHeight;const faces=[];
for(let f=0;f<n;f++){const g=grid(model,f),next=f+1<model.composition.floorCount?grid(model,f+1):Array.from({length:depth},()=>new Uint8Array(width)),low=f*fh,high=low+fh;
const add=(pts,kind,bright,windows)=>faces.push({pts,kind,bright,windows,f});
// Four boundary directions, coalesced into contiguous exposed runs.
for(let z=0;z<depth;z++){
 for(const mode of [0,1]){let x=0;while(x<width){const visible=g[z][x]&&(!g[z+(mode?1:-1)]||!g[z+(mode?1:-1)][x]);if(!visible){x++;continue;}const start=x;while(x<width&&g[z][x]&&(!g[z+(mode?1:-1)]||!g[z+(mode?1:-1)][x]))x++;const zz=z+(mode?1:0);add([[start,low,zz],[x,low,zz],[x,high,zz],[start,high,zz]],'wall',mode?.68:1.0,true);}}
 let x=0;while(x<width){if(!g[z][x]||next[z][x]){x++;continue;}const start=x;while(x<width&&g[z][x]&&!next[z][x])x++;add([[start,high,z],[x,high,z],[x,high,z+1],[start,high,z+1]],'roof',1.13,false);}
}
for(let x=0;x<width;x++)for(const mode of [0,1]){let z=0;while(z<depth){const current=g[z][x]&&(!g[z][x+(mode?1:-1)]);if(!current){z++;continue;}const start=z;while(z<depth&&g[z][x]&&!g[z][x+(mode?1:-1)])z++;const xx=x+(mode?1:0);add([[xx,low,start],[xx,low,z],[xx,high,z],[xx,high,start]],'wall',mode?.8:.9,true);}}
}
return faces;
}
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));function shade(h,s){const c=rgb(h);return 'rgb('+c.map(v=>Math.max(0,Math.min(255,Math.round(v*s)))).join(',')+')';}
function proj(m,pt){const w=m.composition.dimensions.width,d=m.composition.dimensions.depth,h=m.composition.floorHeight*Math.min(maxFloors,m.composition.floorCount);const x=pt[0]-w/2,y=pt[1]-h/2,z=pt[2]-d/2;const a=x*Math.cos(yaw)-z*Math.sin(yaw),b=x*Math.sin(yaw)+z*Math.cos(yaw);const scale=Math.min(11,440/Math.max(w,d,h*.9));return [490+a*scale,330+(b*Math.sin(pitch)-y*Math.cos(pitch))*scale,b*Math.cos(pitch)+y*Math.sin(pitch)];}
function quad(pts,fill,stroke){ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0],pts[i][1]);ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=.5;ctx.stroke();}}
function draw(){const item=items[selected],m=item,colors=m.colors;const canvas=$('scene');ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#0d192b';ctx.fillRect(0,0,canvas.width,canvas.height);
const floorpts=[[0,0,0],[m.composition.dimensions.width,0,0],[m.composition.dimensions.width,0,m.composition.dimensions.depth],[0,0,m.composition.dimensions.depth]].map(p=>proj(m,p));quad(floorpts,'#1b3045','#5c7b9f');
const faces=quads(m).map(f=>({...f,screen:f.pts.map(p=>proj(m,p))}));faces.sort((a,b)=>b.screen.reduce((s,p)=>s+p[2],0)-a.screen.reduce((s,p)=>s+p[2],0));
for(const f of faces){quad(f.screen,f.kind==='roof'?shade(colors.trim,f.bright):shade(colors.surface,f.bright),'#30465c');
 if(!f.windows)continue;
 const width=Math.hypot(f.pts[1][0]-f.pts[0][0],f.pts[1][2]-f.pts[0][2]);if(width<2.6)continue;
 const bays=Math.max(1,Math.floor(width/(m.facade.grid.bay||4)));for(let i=0;i<bays;i++){const t0=(i+.19)/bays,t1=(i+.81)/bays;const blend=(a,b,t)=>a.map((v,j)=>v+(b[j]-v)*t);const bot0=blend(f.pts[0],f.pts[1],t0),bot1=blend(f.pts[0],f.pts[1],t1),top0=blend(f.pts[3],f.pts[2],t0),top1=blend(f.pts[3],f.pts[2],t1);const vb=(p,q,t)=>blend(p,q,t);const win=[vb(bot0,top0,.28),vb(bot1,top1,.28),vb(bot1,top1,.77),vb(bot0,top0,.77)].map(p=>proj(m,p));quad(win,shade(colors.glass,.96),'#a8c9d1');}
}
ctx.font='bold 18px system-ui';ctx.fillStyle='#e5f7f8';ctx.fillText(m.title,24,35);ctx.font='13px system-ui';ctx.fillStyle='#92acc7';ctx.fillText('SITE '+m.composition.dimensions.width+'×'+m.composition.dimensions.depth+' · '+m.composition.floorCount+'F · ORBIT VIEW (schematic)',24,60);
ctx.fillStyle='#9be9d9';ctx.fillText('NO BUILD / NOT PREPARED',24,607);
}
function info(){const p=items[selected],dims=p.composition.dimensions,as=p.assessment.measures;const fmt=(a,b)=>'<div class="kv"><b>'+a+'</b><span>'+b+'</span></div>';
$('title').textContent=p.title;
$('stats').innerHTML=fmt('建物用途',p.composition.program)+fmt('敷地上限',dims.width+' × '+dims.depth)+fmt('階数・高さ',p.composition.floorCount+'階 / '+as.buildingHeightBlocks+' blocks')+fmt('延床概算',as.totalFloorAreaBlocks+' block²')+fmt('1階敷地占有率',as.groundCoveragePercent+'%')+fmt('正面入口候補',p.assessment.geometricEntranceCandidate?'外壁連続 '+as.frontageLengthBlocks+' blocks':'未成立')+fmt('全階コア候補',p.assessment.commonCoreCandidate?'3×3の幾何空間のみ':'なし')+fmt('相対レビュー点',p.ranking.relativeReviewPoints+' / 100 (保証値ではない)');
$('warnings').innerHTML='';const issues=p.issues.length?p.issues:['形状の基本チェックで警告なし。ただし階段・EV・建築構造・敷地安全性は未検証'];for(const s of issues){const d=document.createElement('div');d.className='warn';d.textContent=s;$('warnings').appendChild(d);}
$('assumptions').textContent=p.assumptions.join(' / ')||'明示した条件を優先';$('floors').max=String(p.composition.floorCount);$('floors').value=String(p.composition.floorCount);maxFloors=p.composition.floorCount;$('floorLabel').textContent=maxFloors+'/'+p.composition.floorCount+'F';draw();}
items.forEach((p,i)=>{const b=document.createElement('button');b.textContent=(i+1)+'. '+p.composition.massing;b.setAttribute('aria-pressed',String(i===0));b.onclick=()=>{selected=i;for(const el of $('tabs').children)el.setAttribute('aria-pressed',String(el===b));info();};$('tabs').appendChild(b);});
$('reset').onclick=()=>{yaw=.72;pitch=.55;draw();};$('floors').oninput=e=>{maxFloors=Number(e.target.value);$('floorLabel').textContent=maxFloors+'/'+items[selected].composition.floorCount+'F';draw();};
const canvas=$('scene');canvas.addEventListener('pointerdown',e=>{dragging=true;prevX=e.clientX;prevY=e.clientY;canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointermove',e=>{if(!dragging)return;yaw+=(e.clientX-prevX)*.009;pitch=Math.min(1.32,Math.max(.13,pitch+(e.clientY-prevY)*.006));prevX=e.clientX;prevY=e.clientY;draw();});for(const event of ['pointerup','pointercancel'])canvas.addEventListener(event,()=>dragging=false);
info();
})();
</script></body></html>`;
}
