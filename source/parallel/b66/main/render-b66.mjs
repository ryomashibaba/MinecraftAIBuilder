/** Standalone browser review, no network and no construction APIs. */
const esc=x=>String(x).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
export function renderB66(report){
 if(report?.schema!=='minecraftaibuilder-b66-local-3d-nominal-assembly-v1'||report?.readiness!=='NOT_PREPARED'||report?.executionAllowed!==false||report?.BuildPlan?.operations?.length!==0||report.gates?.some(g=>g.status!=='BLOCKED'))throw Error('B66_RENDER_SAFETY');
 const light=report.sections.map(s=>({id:s.id,level:s.level,width:s.conceptRooms.reduce((x,r)=>Math.max(x,r.x+r.width),0),mask:s.floorMaskRows,rooms:s.conceptRooms,halls:s.conceptReservations.corridors,stairs:s.conceptReservations.stairs,lifts:s.conceptReservations.elevators,panels:s.virtualWallPanels,voids:s.virtualDoorVoids,metrics:s.metrics}));
 const packed=JSON.stringify({summary:report.summary,sections:light,hash:report.reportSha256}).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');
 return `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>B66 · Interior Geometry Atelier</title>
<style>
:root{color-scheme:dark;--bg:#10151c;--panel:#1a222c;--edge:#39424a;--text:#eef1e9;--dim:#aeb9b8;--gold:#d5b879;--teal:#77d0c5;--rose:#edaf9c}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 40% -10%,#243341 0%,var(--bg) 55%);color:var(--text);font:14px/1.55 system-ui,-apple-system,'Segoe UI',sans-serif}
header{padding:28px clamp(16px,4vw,50px) 18px;display:flex;justify-content:space-between;gap:24px;align-items:end;border-bottom:1px solid #52606b50}
h1{font-family:Georgia,'Times New Roman',serif;font-size:clamp(23px,3vw,39px);font-weight:400;letter-spacing:.025em;margin:6px 0}h2{font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:var(--gold);margin:0 0 12px}.kicker{font-size:11px;letter-spacing:.21em;text-transform:uppercase;color:var(--gold)}
header p{color:var(--dim);margin:0;max-width:630px}.flag{border:1px solid #7f694c;border-radius:3px;padding:7px 10px;color:#e6c491;font-size:11px;letter-spacing:.06em;white-space:nowrap}
.layout{max-width:1550px;margin:auto;padding:23px clamp(16px,4vw,50px) 45px;display:grid;grid-template-columns:minmax(0,1fr) 310px;gap:20px}
.panel{border:1px solid #36414b;background:linear-gradient(138deg,#19232e,#141b23);border-radius:7px;overflow:hidden}.stage-head{padding:15px 19px;display:flex;justify-content:space-between;align-items:center;gap:12px;border-bottom:1px solid #36414b}.stage-head .minor{color:var(--dim);font-size:12px}
canvas{width:100%;height:auto;display:block;aspect-ratio:1.36;background:radial-gradient(ellipse at 50% 46%,#27343c 0,#1a232d 58%,#111a23 100%)}
.legend{border-top:1px solid #36414b;display:flex;flex-wrap:wrap;gap:17px;padding:13px 18px;color:var(--dim);font-size:12px}.dot{display:inline-block;width:10px;height:10px;margin-right:7px;border-radius:2px}.sidebar{padding:19px;display:flex;flex-direction:column;gap:15px}
.field{display:flex;flex-direction:column;gap:6px;color:var(--dim);font-size:12px}select,button{font:inherit;background:#101a23;color:var(--text);border:1px solid #45515b;border-radius:4px;padding:8px 10px;cursor:pointer}select:focus,button:focus{outline:2px solid #d5b879;outline-offset:1px}
button.active{border-color:var(--gold);color:var(--gold);background:#43382435}.seg{display:flex;gap:6px}.seg button{flex:1;font-size:12px;padding:8px 5px}
hr{border:0;border-top:1px solid #33404a;margin:3px 0}.stat{display:flex;align-items:baseline;justify-content:space-between;border-bottom:1px solid #34414b80;padding:5px 0}.stat span{color:var(--dim);font-size:12px}.stat b{font-variant-numeric:tabular-nums;font-size:18px;font-weight:500;color:#f1e8d4}
.notice{border-left:3px solid #ae8962;background:#332c253b;padding:12px;color:#e5d7c4;font-size:12px}.fine{font-size:11px;color:#91a0a6;line-height:1.6}code{font-size:11px;word-break:break-all;color:#d9caab}
footer{color:#9ba7ab;font-size:11px;text-align:center;padding:0 20px 30px}@media(max-width:950px){header{flex-direction:column;align-items:start}.layout{grid-template-columns:1fr}.sidebar{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.sidebar .wide{grid-column:1/-1}}@media(max-width:550px){.sidebar{grid-template-columns:1fr}canvas{aspect-ratio:1.08}}
</style></head>
<body><header><div><div class="kicker">MinecraftAIBuilder / B66 / Offline Geometry Atelier</div><h1>Interior Assembly · Local 3D</h1><p>部屋境界を壁パネルとして立ち上げ、概念ドア位置に仮想開口を設けたオフライン設計ビューです。実ブロック施工・物理通行の証明ではありません。</p></div><div class="flag">NOT PREPARED · 9 GATES BLOCKED</div></header>
<main class="layout"><section class="panel"><div class="stage-head"><div><h2 style="margin:0">Architectural Section</h2><div class="minor" id="viewTitle">Nominal partitions / local coordinates</div></div><div class="minor">NO ENGINE · NO WORLD</div></div><canvas id="scene" width="1180" height="850" aria-label="壁面とドア開口の仮想立体表示"></canvas><div class="legend"><span><i class="dot" style="background:#879ba5"></i>壁パネル</span><span><i class="dot" style="background:#e4b778"></i>開口上部（まぐさ）</span><span><i class="dot" style="background:#5bbab1"></i>概念廊下</span><span><i class="dot" style="background:#bf829f"></i>階段予約</span><span><i class="dot" style="background:#7e83b7"></i>EV予約</span></div></section>
<aside class="panel sidebar"><h2 class="wide">Review Controls</h2><label class="field wide">Building<select id="building"></select></label><label class="field">Level<select id="level"></select></label><label class="field">Geometry<select id="mode"><option value="all">壁 + 床</option><option value="openings">開口のみ</option><option value="walls">壁のみ</option><option value="floor">床のみ</option></select></label>
<div class="field wide">View Rotation<div class="seg" id="rotation"><button data-angle="0" class="active">NE</button><button data-angle="1">SE</button><button data-angle="2">SW</button><button data-angle="3">NW</button></div></div>
<div class="field wide">Scale<div class="seg"><button id="minus">−</button><button id="reset">Fit</button><button id="plus">＋</button></div></div><hr class="wide"><h2 class="wide">Assembly Metrics</h2><div class="wide" id="stats"></div>
<div class="notice wide">壁厚 0.125、壁高 3.0、ドア空間高 2.25 は、表示のための仮定値です。Minecraftの1ブロック寸法やブロック配置への換算は未承認です。</div>
<div class="fine wide">Provenance SHA-256: <code id="hash"></code><div style="margin-top:9px">操作はすべてこのHTML内で完結します。ネットワーク通信、Bridge接続、ゲーム操作、実施工コマンドは存在しません。</div></div></aside></main>
<footer>© OFFLINE DESIGN EVIDENCE · B66 · ALL PHYSICAL IMPLEMENTATION CLAIMS HELD</footer>
<script id="b66-data" type="application/json">${packed}</script>
<script>
(()=>{'use strict';
const data=JSON.parse(document.getElementById('b66-data').textContent),canvas=document.getElementById('scene'),cx=canvas.getContext('2d');
const controls={building:document.getElementById('building'),level:document.getElementById('level'),mode:document.getElementById('mode')};
let angle=0,zoom=1;const buildings=[...new Set(data.sections.map(s=>s.id.split('/L')[0]))];
for(const x of buildings){const opt=document.createElement('option');opt.value=x;opt.textContent=x.split('/')[0].toUpperCase().replace('_',' ');controls.building.append(opt)}
function levels(){controls.level.innerHTML='';for(const s of data.sections.filter(s=>s.id.startsWith(controls.building.value+'/L'))){const o=document.createElement('option');o.value=s.level;o.textContent='Level '+s.level;controls.level.append(o)}}
function current(){return data.sections.find(s=>s.id===controls.building.value+'/L'+controls.level.value)}
function colorFloor(s){const m=new Map();for(const r of s.rooms)for(let z=r.z;z<r.z+r.depth;z++)for(let x=r.x;x<r.x+r.width;x++)m.set(x+','+z,'room');for(const p of s.halls)m.set(p.x+','+p.z,'hall');for(const p of s.stairs)m.set(p.x+','+p.z,'stair');for(const p of s.lifts)m.set(p.x+','+p.z,'lift');return m}
function draw(){const s=current();if(!s)return;const w=s.mask[0].length,d=s.mask.length,bY=(s.level-1)*5;
const scale=Math.min(canvas.width/(w+d+9)*1.25,canvas.height/(w+d+10)*2.0)*zoom;
const center={x:canvas.width*.51,y:canvas.height*.53};
function turn(x,z){x-=w/2;z-=d/2;return angle===0?[x,z]:angle===1?[-z,x]:angle===2?[-x,-z]:[z,-x]}
function proj(x,y,z){const t=turn(x,z);return [center.x+(t[0]-t[1])*scale,center.y+(t[0]+t[1])*scale*.47-(y-bY)*scale*1.25]}
function depth(x,z){const t=turn(x,z);return t[0]+t[1]}
function path(points,fill,stroke){cx.beginPath();points.forEach(([x,y],i)=>{if(i)cx.lineTo(x,y);else cx.moveTo(x,y)});cx.closePath();cx.fillStyle=fill;cx.fill();if(stroke){cx.strokeStyle=stroke;cx.lineWidth=.6;cx.stroke()}}
function shade(hex,f){let n=parseInt(hex.slice(1),16),r=Math.max(0,Math.min(255,Math.round((n>>16)*f))),g=Math.max(0,Math.min(255,Math.round(((n>>8)&255)*f))),b=Math.max(0,Math.min(255,Math.round((n&255)*f)));return 'rgb('+r+','+g+','+b+')'}
function drawBox(b,opening){const [a,y0,c,x1,y1,z1]=b;const face=(p,fill)=>path(p.map(q=>proj(...q)),fill,'#111e29');
const base=opening?'#d4a96e':'#8da7b1';const xSide=angle===0||angle===1?x1:a,zSide=angle===0||angle===3?z1:c;
const visible=[{depth:depth(xSide,(c+z1)/2),points:[[xSide,y0,c],[xSide,y0,z1],[xSide,y1,z1],[xSide,y1,c]],fill:shade(base,.77)},
{depth:depth((a+x1)/2,zSide),points:[[a,y0,zSide],[x1,y0,zSide],[x1,y1,zSide],[a,y1,zSide]],fill:shade(base,.60)}];
visible.sort((p,q)=>p.depth-q.depth);for(const item of visible)face(item.points,item.fill);
face([[a,y1,c],[x1,y1,c],[x1,y1,z1],[a,y1,z1]],shade(base,1.18));}
cx.clearRect(0,0,canvas.width,canvas.height);
const showFloor=controls.mode.value!=='walls'&&controls.mode.value!=='openings',showWalls=controls.mode.value!=='floor';
if(showFloor){const owner=colorFloor(s),tiles=[];for(let z=0;z<d;z++)for(let x=0;x<w;x++)if(s.mask[z][x]==='1')tiles.push({x,z,depth:depth(x+.5,z+.5)});tiles.sort((a,b)=>a.depth-b.depth);
const colors={room:'#344451',hall:'#347d78',stair:'#985d7a',lift:'#596194',other:'#253540'};
for(const tile of tiles){const {x,z}=tile;const k=owner.get(x+','+z)||'other';path([proj(x,bY,z),proj(x+1,bY,z),proj(x+1,bY,z+1),proj(x,bY,z+1)],colors[k],'#111a23');}}
if(showWalls){const p=controls.mode.value==='openings'?s.panels.filter(x=>x.kind==='VIRTUAL_DOOR_LINTEL'):s.panels;const items=p.map(q=>({q,depth:depth((q.box[0]+q.box[3])/2,(q.box[2]+q.box[5])/2)})).sort((a,b)=>a.depth-b.depth);for(const it of items)drawBox(it.q.box,it.q.kind==='VIRTUAL_DOOR_LINTEL');}
document.getElementById('viewTitle').textContent=s.id+' · '+(controls.mode.selectedOptions[0]?.textContent||'');
document.getElementById('stats').innerHTML=[['仮想壁境界',s.metrics.nominalWallBoundaries],['ドア開口',s.metrics.doorVoidBoxes],['開口上部パネル',s.metrics.lintelPanels],['部屋数',s.rooms.length],['仮想壁体積',s.metrics.nominalSolidVolume.toFixed(3)],['仮想開口体積',s.metrics.nominalVoidVolume.toFixed(3)]].map(([k,v])=>'<div class="stat"><span>'+k+'</span><b>'+v+'</b></div>').join('');
}
controls.building.addEventListener('change',()=>{levels();draw()});controls.level.addEventListener('change',draw);controls.mode.addEventListener('change',draw);
for(const btn of document.querySelectorAll('[data-angle]'))btn.addEventListener('click',()=>{angle=Number(btn.dataset.angle);document.querySelectorAll('[data-angle]').forEach(b=>b.classList.toggle('active',b===btn));draw()});
document.getElementById('plus').addEventListener('click',()=>{zoom=Math.min(2.5,zoom*1.2);draw()});document.getElementById('minus').addEventListener('click',()=>{zoom=Math.max(.4,zoom/1.2);draw()});document.getElementById('reset').addEventListener('click',()=>{zoom=1;draw()});
document.getElementById('hash').textContent=data.hash;levels();draw();
})();
</script></body></html>`;
}
