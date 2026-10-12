/** Standalone canvas schematic: offline, read-only, no network and no exports to Minecraft. */
export function renderB57(report){
 if(report?.schema!=='minecraftaibuilder-b57-offline-envelope-topology-v1'||report.readiness!=='NOT_PREPARED'||report.BuildPlan?.operations?.length!==0)throw Error('B57_RENDER_UNSAFE');
 const payload=JSON.stringify({buildings:report.buildings.map(b=>({id:b.id,site:b.site,levels:b.levels,preview:b.preview,variants:b.variants})),totals:report.totals,hash:report.reportSha256})
  .replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');
 return `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MinecraftAIBuilder B57 | 建築外形3D設計レビュー</title>
<style> :root{color-scheme:dark;font-family:system-ui,-apple-system,sans-serif;background:#0a111f;color:#e9f2ff}*{box-sizing:border-box}body{margin:0;background:linear-gradient(135deg,#0a111f,#101b32);min-height:100vh}header{border-bottom:1px solid #2b3b51;padding:22px max(24px,4vw)}h1{font-size:24px;margin:5px 0 8px}h2{font-size:16px;margin:0 0 12px}.eyebrow{letter-spacing:2px;color:#76bdfb;font-size:11px;font-weight:800}.muted{color:#9cb1cd;font-size:13px;line-height:1.65}main{display:grid;grid-template-columns:minmax(450px,1fr) 320px;gap:16px;margin:22px auto;max-width:1500px;padding:0 22px}.panel{background:#111e32;border:1px solid #2b3b51;border-radius:16px;padding:18px;box-shadow:0 10px 26px #0002}.controls{display:flex;gap:12px;flex-wrap:wrap;align-items:end;margin-bottom:12px}.controls label{font-size:12px;color:#aab9d1;display:grid;gap:5px}select,button{background:#1c2c47;color:#e8f2ff;border:1px solid #425976;border-radius:8px;padding:8px 10px;font:inherit;cursor:pointer}button:focus-visible,select:focus-visible{outline:2px solid #55dafa}canvas{display:block;width:100%;height:640px;border-radius:12px;background:radial-gradient(circle at 60% 35%,#1d3451,#0a1325 76%)}.stats{display:grid;grid-template-columns:1fr 1fr;gap:9px}.stat{border:1px solid #304560;background:#16273c;border-radius:9px;padding:10px}.stat b{font-size:21px;display:block}.stat small{font-size:11px;color:#9eb4cc}.alert{background:#283047;border-left:3px solid #efb97d;padding:12px;font-size:12px;line-height:1.7;border-radius:7px}table{width:100%;border-collapse:collapse;font-size:12px}td,th{border-bottom:1px solid #283951;text-align:left;padding:8px}th{color:#9bb3cd}.legend{display:flex;gap:16px;flex-wrap:wrap;margin:13px 0;color:#acc0d6;font-size:12px}.sw{width:10px;height:10px;border-radius:2px;display:inline-block;margin-right:5px}.code{word-break:break-all;font-family:monospace;color:#9eb0d3;font-size:11px}footer{padding:20px 26px;text-align:center;color:#92a7c1;font-size:12px}@media(max-width:980px){main{grid-template-columns:1fr}canvas{height:480px}}</style></head>
<body><header><div class="eyebrow">MINECRAFT AI BUILDER / B57 / OFFLINE ARCHITECTURE</div><h1>建築外形・接合レビュー / 3D schematic</h1><div class="muted">5棟・30階の平面形状から外壁エッジと露出屋根を再構成。表示色は設計用の抽象マーカーであり、実際のガラス・壁・施工済み建築ではありません。</div></header>
<main><section class="panel"><div class="controls"><label>建築<select id="building"></select></label><label>設計案<select id="variant"></select></label><label>外壁表示<select id="graphic"><option value="original">原本の表示役割</option><option value="overlay">B53試案（未承認）</option></select></label><label>視点<select id="camera"><option value="0">南東</option><option value="1">南西</option><option value="2">北西</option><option value="3">北東</option></select></label><label>描画する最上階<select id="level"></select></label></div><canvas id="scene" width="1100" height="680" aria-label="建築外形の設計用三次元模式図"></canvas><div class="legend"><span><i class="sw" style="background:#5dd8f4"></i>窓表示</span><span><i class="sw" style="background:#f0b969"></i>フィン表示</span><span><i class="sw" style="background:#536f96"></i>未割当外壁</span><span><i class="sw" style="background:#89a6c5"></i>屋根面</span><span><i class="sw" style="background:#ff648c"></i>入口の位置候補</span></div><p class="muted">描画はローカル概念座標（階高は見やすさのための仮値）。3D表示と色分けは実際の開口、材料、階段、屋上の構造強度を示しません。</p></section>
<aside class="panel"><h2>外形の独立検証</h2><div class="stats" id="stats"></div><div id="buildingStats"></div><h2 style="margin-top:20px">候補の未検証条件</h2><div class="alert">入口・屋上設備は位置の候補であり、扉開口、通行、荷重、支持、材料の実証はありません。施工可否は判定しません。</div><h2 style="margin-top:20px">検証の根拠</h2><p class="muted">屋根 = 当該階の床 - 上階の床 を全セルで独立再計算。外壁は各階の床セル4近傍から再構成し、既存の外壁マーカーと集合一致を確認。</p><p class="code" id="sourceHash"></p><div class="alert">NOT_PREPARED · 施工前9ゲートすべてBLOCKED · 実Minecraft接続なし</div></aside></main><footer>Local, static, display-only. No connection to Minecraft, bridge, network or building operations.</footer>
<script type="application/json" id="payload">${payload}</script><script>
'use strict';
const DATA=JSON.parse(document.getElementById('payload').textContent);
const $=id=>document.getElementById(id);
const buildings=DATA.buildings;
for(const [i,b] of buildings.entries())$('building').add(new Option(b.id,i));
for(let l=1;l<=6;l++)$('level').add(new Option(l+'階',l));$('level').value='6';
$('sourceHash').textContent='B57 report SHA-256: '+DATA.hash;
function poly(ctx,pts,color,stroke='#0b1726'){ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(let j=1;j<pts.length;j++)ctx.lineTo(pts[j][0],pts[j][1]);ctx.closePath();ctx.fillStyle=color;ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=.58;ctx.stroke();}
function draw(){
 const b=buildings[Number($('building').value)],v=Number($('variant').value),limit=Number($('level').value);
 const canvas=$('scene'),ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);
 const angle=.75+Math.PI*.5*Number($('camera').value);
 const ca=Math.cos(angle),sa=Math.sin(angle),s=Math.min(27,780/Math.max(b.site.width,b.site.depth)*.64);
 const transform=(x,y,z)=>{let dx=x-b.site.width/2,dz=z-b.site.depth/2;let rx=dx*ca-dz*sa,rz=dx*sa+dz*ca;return [550+rx*s,365+rz*s*.47-y*s*.56];};
 const depth=(x,z)=>((x-b.site.width/2)*sa+(z-b.site.depth/2)*ca);
 const polys=[],add=(pts,c,sortY=0)=>{let d=pts.reduce((a,p)=>a+depth(p[0],p[2]),0)/pts.length;polys.push({pts,c,dep:d,sortY});};
 const role=role=>role==='WINDOW_VISUAL_ONLY'?'#5dd8f4':role==='FIN_GRAPHIC_ONLY'?'#f0b969':'#536f96';
 for(const layer of b.preview.levels){if(layer.level>limit)continue;const l=layer.level-1,y=l*2.6;
  for(const [x,z,f,orig,overlay,cls] of layer.facadeSections){
   const [x0,z0,x1,z1]=f==='N'?[x,z,x+1,z]:f==='S'?[x,z+1,x+1,z+1]:f==='W'?[x,z,x,z+1]:[x+1,z,x+1,z+1];
   const col=role($('graphic').value==='overlay'?overlay:orig);add([[x0,y,z0],[x1,y,z1],[x1,y+2.4,z1],[x0,y+2.4,z0]],cls==='ENCLOSED_VOID_EDGE'?'#7c779f':col);
  }
  for(const rect of layer.roofRectangles)for(let x=rect.x;x<rect.x+rect.width;x++)for(let z=rect.z;z<rect.z+rect.depth;z++)add([[x,y+2.54,z],[x+1,y+2.54,z],[x+1,y+2.54,z+1],[x,y+2.54,z+1]],'#89a6c5',1);
 }
 polys.sort((a,b)=>a.dep-b.dep||a.sortY-b.sortY);
 for(const item of polys)poly(ctx,item.pts.map(p=>transform(...p)),item.c);
 const selected=b.preview.profiles[v], [from,to]=selected.entry;
 ctx.lineWidth=6;ctx.strokeStyle='#ff648c';const a=transform(from,0,0),c=transform(to+1,0,0);ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...c);ctx.stroke();
 const [rx,rz,rw,rd]=selected.rooftop;
 const top=6*2.6+.12;
 if(limit===6){ctx.lineWidth=3;ctx.strokeStyle='#ffd277';ctx.setLineDash([7,4]);let pts=[[rx,top,rz],[rx+rw,top,rz],[rx+rw,top,rz+rd],[rx,top,rz+rd]].map(p=>transform(...p));ctx.beginPath();ctx.moveTo(...pts[0]);for(const p of pts.slice(1))ctx.lineTo(...p);ctx.closePath();ctx.stroke();ctx.setLineDash([]);}
 ctx.textAlign='left';ctx.font='bold 18px system-ui';ctx.fillStyle='#e9f3ff';ctx.fillText(b.id,24,38);
 ctx.font='13px system-ui';ctx.fillStyle='#a3bbd6';ctx.fillText('概念3D / ローカル座標 / 未施工',24,60);
 const T=b.levels.slice(0,limit),mkStat=(label,num)=>'<div class="stat"><b>'+num+'</b><small>'+label+'</small></div>';
 $('stats').innerHTML=mkStat('外壁境界の欠落',T.reduce((a,l)=>a+l.facadeMissing,0))+mkStat('外壁境界の過剰',T.reduce((a,l)=>a+l.facadeExtra,0))+mkStat('階別の床連結島数（最大）',Math.max(...T.map(x=>x.connectedFloorIslands)))+mkStat('屋根被覆差異',T.reduce((a,l)=>a+l.roofProjectionDifference,0));
 const d=b.variants[v],e=d.entry,r=d.rooftop;
 $('buildingStats').innerHTML='<table><tr><th>総床セル</th><td>'+T.reduce((s,x)=>s+x.floorCells,0)+'</td></tr><tr><th>表示外壁単位</th><td>'+T.reduce((s,x)=>s+x.facadeEdgeUnits,0)+'</td></tr><tr><th>屋上候補</th><td>'+r.roofCellsCovered+'/'+r.requestedCells+' セル投影一致</td></tr><tr><th>入口の正面境界</th><td>'+(e.northBoundaryCovered?'一致':'不一致')+'</td></tr><tr><th>下階に重ならない床セル</th><td>'+T.reduce((s,x)=>s+x.localOverhangCells,0)+'</td></tr></table>';
}
function selectBuilding(){const b=buildings[Number($('building').value)];$('variant').replaceChildren();b.variants.forEach((v,i)=>$('variant').add(new Option(v.profile,i)));draw();}
$('building').addEventListener('change',selectBuilding);
for(const key of ['variant','graphic','camera','level'])$(key).addEventListener('change',draw);
selectBuilding();
</script></body></html>`;
}
