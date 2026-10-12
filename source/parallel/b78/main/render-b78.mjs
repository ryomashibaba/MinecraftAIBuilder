/** Offline read-only B78 review. No network, game APIs, commands or editable cells. */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const home=path.dirname(fileURLToPath(import.meta.url));const source=path.resolve(home,'../../b66/main/B66_LOCAL_3D_ASSEMBLY.json');
const r=JSON.parse(fs.readFileSync(path.join(home,'B78_GLOBAL_GRID_REPORT.json')));
const shape=JSON.parse(fs.readFileSync(source));
const index=new Map(shape.sections.map(x=>[x.id,x]));
const data=r.sections.map(s=>{const a=index.get(s.id);return {id:s.id,level:s.level,rows:a.floorMaskRows,rooms:a.conceptRooms,
 corridors:a.conceptReservations.corridors,stairs:a.conceptReservations.stairs,elevators:a.conceptReservations.elevators,
 walls:s.wallDecisions,doors:s.doorDecisions,staged:s.stagedCells,roomPaths:s.rooms,summary:s.summary};});
const injected=JSON.stringify({totals:r.totals,sections:data,hash:r.reportSha256}).replaceAll('<','\\u003c');
const html=`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>B78 | 全局所格子の調停レビュー（非施工）</title><style>
:root{color-scheme:dark;font-family:system-ui,'Yu Gothic UI',sans-serif;background:#08101e;color:#e7edf7}*{box-sizing:border-box}
body{margin:0;background:radial-gradient(circle at 18% -10%,#17335b 0,transparent 48%),#08101e}
header{border-bottom:1px solid #30435d;padding:22px max(18px,calc((100vw - 1300px)/2))}
h1{margin:4px 0;font-size:clamp(20px,2vw,29px);font-weight:800;letter-spacing:.012em}
.small{font-size:12px;color:#a9b8cd}.tag{display:inline-block;border:1px solid #6b5361;background:#36252c;color:#f9bec1;padding:5px 10px;border-radius:40px;font-size:11px;font-weight:800;letter-spacing:.08em}
main{max-width:1340px;margin:auto;padding:22px;display:grid;gap:16px}.statgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}.stat{background:#101c2d;border:1px solid #2e415b;padding:16px;border-radius:13px}.stat b{display:block;font-size:25px;margin:3px 0}.stat .small{line-height:1.4}
.layout{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(285px,.75fr);gap:16px}section{border:1px solid #2c415a;background:#111d2d;border-radius:14px;padding:16px;min-width:0}.controls{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:15px}
select{padding:9px 11px;color:#fff;background:#192a42;border:1px solid #455c7d;border-radius:9px;font-size:14px;flex:1;min-width:150px}
.canvas{width:100%;overflow:auto;border:1px solid #2c435e;border-radius:10px;background:#091421;padding:12px;min-height:200px;display:flex;justify-content:center}
canvas{max-width:100%;height:auto;image-rendering:pixelated;align-self:flex-start;cursor:crosshair}
.legend{display:flex;gap:10px 16px;flex-wrap:wrap;margin-top:13px}.legend span{font-size:12px;color:#bfcee1;display:flex;align-items:center;gap:6px}.sw{display:inline-block;width:11px;height:11px;border-radius:3px}
.value{font-weight:800;font-size:19px}.row{display:flex;justify-content:space-between;gap:15px;border-bottom:1px solid #263c54;padding:11px 0;align-items:center}.row:last-child{border:0}
.disclaimer{padding:13px;border:1px solid #75534b;border-radius:10px;background:#271d23;color:#f2cbc3;line-height:1.7;font-size:13px}
#inspect{min-height:100px;line-height:1.8;overflow-wrap:anywhere}footer{font-size:12px;color:#8fa5c2;padding:0 0 16px}
@media(max-width:850px){.layout{grid-template-columns:1fr}.controls{flex-direction:column;align-items:stretch}header{padding:22px 16px}main{padding:15px}}
</style></head><body><header><span class="tag">NOT_PREPARED · 施工命令0</span><h1>Global Grid Arbitration <span style="color:#79bcff">/ B78</span></h1><div class="small">固定本番PlannerのB77占有証拠 × 30階の室内幾何 — 読み取り専用。実建築可能性・避難経路の認証ではありません。</div></header>
<main><div class="statgrid" id="stats"></div><div class="layout"><section><div class="controls"><label for="building">建物</label><select id="building"></select><label for="level">階</label><select id="level"></select></div><div class="canvas"><canvas id="map" width="650" height="520"></canvas></div>
<div class="legend"><span><i class="sw" style="background:#53d6b7"></i>調停済み壁候補</span><span><i class="sw" style="background:#ec9f5b"></i>本番ブロック衝突等でHOLD</span><span><i class="sw" style="background:#e96f9a"></i>ドア開口（配置保留）</span><span><i class="sw" style="background:#398fc5"></i>廊下予約</span><span><i class="sw" style="background:#a4a5fc"></i>室内2×2・動線保護</span><span><i class="sw" style="background:#60677b"></i>外形外</span></div>
<div class="small" style="margin-top:12px">壁の色は「Minecraftにそのまま置ける」ことを意味しません。外壁との一体化、厚さ、材質、ドアの蝶番、全体の回遊性は未認証です。</div></section>
<section><h3 style="margin:0 0 7px">この階の調停結果</h3><div id="numbers"></div><h3>座標を調べる</h3><div id="inspect" class="small">左のマップにカーソルを重ねるとセル情報を表示します。</div><h3>建築前に残る制約</h3><div class="disclaimer">本番外壁・ガラス・入口は不変更。314件のドアは実ブロック未実装、25階段接続と上階スラブ240セルも未施工。ホテルslab意匠は未承認、office/candidate-02の廊下予約18セルは未解決。施工前9ゲートはすべてBLOCKEDです。</div></section></div><footer id="checksum"></footer></main>
<script>const DATABASE=${injected};
const $=q=>document.querySelector(q),S=DATABASE.sections;
const tint={floor:'#1a2b40',outside:'#60677b',corridor:'#398fc5',vertical:'#d5af59',core:'#a4a5fc',staged:'#53d6b7',hold:'#ec9f5b',door:'#e96f9a'};
const f=(n)=>Number(n).toLocaleString('ja-JP');
const stat=[['室内壁セル候補','stagedLocalPartitionCells'],['部屋（名目経路あり）','roomCoresWithNominalRoutes'],['保留された部屋','roomsHeld'],['床外の廊下予約','outOfMaskCorridorsHeld'],['実際の施工命令','worldCommands']];
$('#stats').innerHTML=stat.map(([name,k])=>'<div class="stat"><div class="small">'+name+'</div><b>'+f(DATABASE.totals[k])+'</b><div class="small">'+(k==='worldCommands'?'施工不可の安全状態':'非実行の解析結果')+'</div></div>').join('');
const buildings=[...new Set(S.map(x=>x.id.split('/L')[0]))];
$('#building').innerHTML=buildings.map((s,i)=>'<option value="'+i+'">'+s+'</option>').join('');
$('#level').innerHTML=Array.from({length:6},(_,i)=>'<option value="'+(i+1)+'">'+(i+1)+'階</option>').join('');
const cvs=$('#map'),ctx=cvs.getContext('2d');let active=null,hover=null,scale=22;
const key=p=>p.x+','+p.z;
function draw(){let group=buildings[Number($('#building').value)],level=Number($('#level').value);active=S.find(x=>x.id===group+'/L'+level);if(!active)return;
const rows=active.rows,w=rows[0].length,h=rows.length;scale=Math.min(23,Math.floor(780/w));cvs.width=w*scale;cvs.height=h*scale;
const corridor=new Set(active.corridors.map(key)),vertical=new Set([...active.stairs,...active.elevators].map(key));
const staged=new Map(active.staged.map(x=>[x.site,x]));const reserved=new Set(active.roomPaths.filter(r=>r.nominalRouteAndCorePossible).flatMap(r=>[...r.reservedMinimumRoomCore,...r.reservedDoorToCorePaths.flat()]));
const held=new Map();for(const v of active.walls)if(v.decision.startsWith('HOLD_')){const k=key(v.insideCell);held.set(k,(held.get(k)||0)+1);}
const doors=new Map(active.doors.map(d=>[key(d.roomCell),d]));
for(let z=0;z<h;z++)for(let x=0;x<w;x++){const k=x+','+z;let c=rows[z][x]==='1'?tint.floor:tint.outside;
 if(corridor.has(k))c=tint.corridor;if(vertical.has(k))c=tint.vertical;
 if(reserved.has(k))c=tint.core;if(held.has(k))c=tint.hold;if(staged.has(k))c=tint.staged;if(doors.has(k))c=tint.door;
 ctx.fillStyle=c;ctx.fillRect(x*scale,z*scale,scale,scale);ctx.strokeStyle='#0b1423';ctx.lineWidth=.45;ctx.strokeRect(x*scale,z*scale,scale,scale);}
if(hover){ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.strokeRect(hover.x*scale+1,hover.z*scale+1,scale-2,scale-2);}
const row=(a,b)=>'<div class="row"><span class="small">'+a+'</span><strong>'+f(b)+'</strong></div>';const q=active.summary;
$('#numbers').innerHTML=row('名目壁境界',q.nominalWalls)+row('壁候補セル（重複を統合）',q.stagedUniquePartitionCells)+row('対応済み壁境界の参照',q.stagedWallBoundaryReferences)+row('名目経路ありの部屋',q.roomsWithNominalConnectedCore)+row('保留した部屋',q.roomsHeld)+row('本番ブロックに重なる壁候補',q.heldProductionSolidEdges)+row('名目ドア開口',q.nominalDoors)+row('開口セル予約（蝶番未検証）',q.geometricallyReservedPassageSites);
if(hover)inspectPoint(hover.x,hover.z);else $('#inspect').textContent='マップを指すとセルの壁・ドアと保留理由を表示します。';}
function inspectPoint(x,z){const k=x+','+z;const walls=active.walls.filter(v=>key(v.insideCell)===k),door=active.doors.filter(d=>key(d.roomCell)===k),parts=['ローカル座標 X='+x+' / Z='+z,'壁境界: '+walls.length+'件'];for(const w of walls.slice(0,8))parts.push(w.wallId.split('/').at(-1)+' : '+w.decision);for(const d of door)parts.push('ドア '+d.portId.split('/').at(-1)+' : '+d.siteStatus);$('#inspect').textContent=parts.join('　|　');}
$('#map').addEventListener('mousemove',e=>{if(!active)return;const rect=cvs.getBoundingClientRect();const x=Math.floor((e.clientX-rect.left)*cvs.width/rect.width/scale),z=Math.floor((e.clientY-rect.top)*cvs.height/rect.height/scale);if(x<0||z<0||z>=active.rows.length||x>=active.rows[0].length)return;if(hover?.x===x&&hover?.z===z)return;hover={x,z};draw();});
$('#map').addEventListener('mouseleave',()=>{hover=null;draw();});
$('#building').addEventListener('change',()=>{hover=null;draw();});$('#level').addEventListener('change',()=>{hover=null;draw();});
$('#checksum').textContent='B78 SHA-256 report: '+DATABASE.hash+' / 施工API・外部通信なし';draw();</script></body></html>`;
fs.writeFileSync(path.join(home,'B78_GLOBAL_GRID_REVIEW.html'),html);
console.log('B78 HTML generated:',Buffer.byteLength(html),'bytes');
