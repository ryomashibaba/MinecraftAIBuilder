/** Self-contained offline browser review from locally pinned B62 and frozen B57/B17/B43 data. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const digest=b=>createHash('sha256').update(b).digest('hex');
const baseline=JSON.parse(fs.readFileSync(path.join(root,'B61_FILE_SHA256.json'),'utf8'));
function frozen(name){const sha=baseline.baselineFiles[name]||baseline.addedFiles[name];if(!sha)throw Error('B62_UNPINNED');const b=fs.readFileSync(path.join(root,name));if(digest(b)!==sha)throw Error('B62_FROZEN_TAMPER');return JSON.parse(b.toString('utf8'));}
const doc=JSON.parse(fs.readFileSync(path.join(root,'parallel/b62/main/B62_RESERVATION_CONFLICT_REVIEW.json'),'utf8'));
const {reportSha256,...rest}=doc;if(digest(Buffer.from(JSON.stringify(rest)))!==reportSha256)throw Error('B62_REPORT_HASH');
if(doc.readiness!=='NOT_PREPARED'||doc.gates?.length!==9||doc.gates.some(g=>g.status!=='BLOCKED')||doc.BuildPlan?.operations?.length!==0)throw Error('B62_UNSAFE');
const b57=frozen('parallel/b57/main/B57_ENVELOPE_TOPOLOGY.json').buildings.find(x=>x.id==='apartment/candidate-01');
const b17=frozen('reports/B17_INTERIOR_INTEGRATION_IR.json').buildings.find(x=>x.id==='apartment/candidate-01').floors[0];
const hall=frozen('reports/B43_GUARDED_LAYOUT_ASSEMBLY.json').sixLevels[0].conceptualCorridorCells;
const floor=[];for(const r of b57.preview.levels[0].floorRectangles)for(let z=r.z;z<r.z+r.depth;z++)for(let x=r.x;x<r.x+r.width;x++)floor.push({x,z});
const data={width:b57.site.width,depth:b57.site.depth,floor,hall,stairs:b17.stairReservation,elevator:b17.elevatorReservation,
 alternatives:doc.alternatives,sha:doc.reportSha256,gates:doc.gates.map(g=>g.status),door:{x:17,z:18},entrance:{x:10,z:18}};
const safe=JSON.stringify(data).replace(/</g,'\\u003c');
const html=`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>MinecraftAIBuilder B62 — 予約領域干渉レビュー</title>
<style>:root{color-scheme:dark;font-family:system-ui,-apple-system,Meiryo,sans-serif}*{box-sizing:border-box}body{margin:0;background:#0c1421;color:#eef3fb}main{max-width:1100px;margin:auto;padding:24px}h1{font-size:clamp(21px,3vw,32px);margin:4px 0}p{line-height:1.65;color:#adbed1}.small{font-size:12px;color:#91a9c2}.kicker{letter-spacing:.15em;text-transform:uppercase;color:#69cde0;font-size:12px;font-weight:750}.panel{background:#121f30;border:1px solid #304259;border-radius:16px;padding:18px;margin-top:18px}.alert{border-left:3px solid #ffc46a;padding-left:12px;background:#2a251e;border-radius:4px}.layout{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(245px,1fr);gap:18px}.map{width:100%;height:auto;background:#091220;border-radius:12px;cursor:crosshair}.actions{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0 8px}button{background:#1c2e43;border:1px solid #42627f;border-radius:10px;padding:10px 12px;color:#e8f3ff;cursor:pointer;font-size:14px}button[aria-pressed=true]{background:#12536c;border-color:#58cbe3}button:focus-visible{outline:3px solid #ffe2a0}table{border-collapse:collapse;width:100%;font-size:14px}th,td{text-align:left;padding:10px 8px;border-bottom:1px solid #2a435b}th{color:#aec8e0;font-weight:600;width:48%}.legend{display:flex;gap:13px;flex-wrap:wrap;margin-top:14px;font-size:12px}.chip:before{content:' ';display:inline-block;width:11px;height:11px;border-radius:2px;margin-right:5px;background:var(--c)}.mono{font-family:ui-monospace,Consolas,monospace;font-size:12px;overflow-wrap:anywhere}.em{font-weight:700;color:#f8d488}footer{color:#8a9fb9;font-size:12px;margin:20px 0}@media(max-width:780px){.layout{grid-template-columns:1fr}main{padding:14px}}</style></head><body><main>
<div class="kicker">MinecraftAIBuilder · B62 · Read-only review</div><h1>通路候補と設備予約の干渉</h1>
<p>アパート1階の D012 について、B61の3セル案と設備予約を除外した2案を、凍結されたローカル床・廊下データ上で比較します。<strong>実施工データではありません。</strong></p>
<div class="panel alert"> <strong>NOT_PREPARED · 施工前9ゲートすべてBLOCKED</strong><div class="small">Minecraft接続、スキャン、施工コマンド、物理的な通行可能性の承認はありません。</div></div>
<div class="actions" id="actions" role="group" aria-label="迂回経路の比較"></div><div class="layout">
<div class="panel"><canvas id="map" class="map" width="672" height="528" aria-label="アパート1階の床・廊下・エレベーターと階段予約・候補ルートの平面図"></canvas>
<div class="legend"><span class="chip" style="--c:#26394e">床</span><span class="chip" style="--c:#398da7">既存の概念廊下</span><span class="chip" style="--c:#f3af59">エレベーター予約</span><span class="chip" style="--c:#b68bff">階段予約</span><span class="chip" style="--c:#d05e6f">衝突する追加案</span><span class="chip" style="--c:#52d8b0">設備予約と重複しない追加案</span></div>
<div class="small" id="hover" aria-live="polite">セルにカーソルを合わせるとローカル座標を表示します。</div></div>
<div class="panel"><h2 id="scenario" style="margin-top:0"></h2><table><tbody id="metrics"></tbody></table><p id="description"></p><div class="alert"><p>床マスク・設備予約との平面重複だけの評価です。壁厚、実ドア、部屋占有、頭上空間、通路幅と設備離隔は不明です。</p></div><p class="small mono" id="cells"></p></div></div>
<div class="panel"><h2>この図から判断できること</h2><p>B61の3セル直線案はエレベーター予約の内部を横断します。階段側の4セル案も設備予約と衝突します。5セル迂回案は両方の予約セルを避けますが、エレベーターへの隣接部があり、採用を承認できません。</p><p class="small mono">B62 report SHA-256: <span id="sha"></span></p></div><footer>オフライン単体HTML · 外部URL・API通信・Minecraft操作なし · すべて未承認の設計表示</footer>
<script type="application/json" id="data">${safe}</script>
<script>(()=>{'use strict';const d=JSON.parse(document.getElementById('data').textContent);let selected=2;
const k=p=>p.x+','+p.z;const sets=Object.fromEntries(['floor','hall','stairs','elevator'].map(x=>[x,new Set(d[x].map(k))]));
const actions=document.getElementById('actions'),canvas=document.getElementById('map'),ctx=canvas.getContext('2d');const dx=canvas.width/d.width,dy=canvas.height/d.depth;
const names=['B61：3セル（設備と衝突）','エレベーターのみ回避：4セル','両設備を回避：5セル'];
d.alternatives.forEach((a,i)=>{const b=document.createElement('button');b.type='button';b.textContent=names[i];b.addEventListener('click',()=>{selected=i;refresh();});actions.append(b);});
function refresh(){let a=d.alternatives[selected];[...actions.children].forEach((b,i)=>b.setAttribute('aria-pressed',String(i===selected)));
 ctx.clearRect(0,0,canvas.width,canvas.height);for(let z=0;z<d.depth;z++)for(let x=0;x<d.width;x++){const p={x,z},v=k(p);let color=sets.floor.has(v)?'#26394e':'#0b1724';if(sets.hall.has(v))color='#398da7';if(sets.elevator.has(v))color='#f3af59';if(sets.stairs.has(v))color='#b68bff';ctx.fillStyle=color;ctx.fillRect(x*dx+1,z*dy+1,dx-2,dy-2);}
 const extra=new Set(a.newCorridorCells.map(k));for(const p of a.newCorridorCells){const v=k(p);ctx.fillStyle=sets.elevator.has(v)||sets.stairs.has(v)?'#d05e6f':'#52d8b0';ctx.fillRect(p.x*dx+2,p.z*dy+2,dx-4,dy-4);}
 ctx.beginPath();a.localPath.forEach((p,i)=>i?ctx.lineTo((p.x+.5)*dx,(p.z+.5)*dy):ctx.moveTo((p.x+.5)*dx,(p.z+.5)*dy));ctx.strokeStyle='#fcf6e2';ctx.lineWidth=2;ctx.stroke();
 for(const [pt,label,color] of [[d.door,'D012','#f8eefc'],[d.entrance,'入口','#ffffff']]){ctx.strokeStyle=color;ctx.lineWidth=2;ctx.strokeRect(pt.x*dx+2,pt.z*dy+2,dx-4,dy-4);ctx.fillStyle=color;ctx.font='bold 13px system-ui';ctx.fillText(label,(pt.x+.5)*dx-13,pt.z*dy-5);}
 const rows=[['新規廊下候補',a.minimumAddedCells+'セル'],['エレベーター予約と重複',a.reservationCollisions.elevator.length+'セル'],['階段予約と重複',a.reservationCollisions.stair.length+'セル'],['エレベーターへの辺隣接',a.touchesElevatorReservationAtCellEdge.length+'セル'],['概念ドア接続',a.conceptualDoorsReachable+'/78'],['施工承認','なし']];
 document.getElementById('scenario').textContent=names[selected];document.getElementById('metrics').innerHTML=rows.map(r=>'<tr><th>'+r[0]+'</th><td>'+r[1]+'</td></tr>').join('');
 document.getElementById('description').textContent=selected===2?'予約セルと重ならない平面候補。ただし設備クリアランス・部屋占有・壁厚・通路幅は未検証。':'設備予約と平面上で重複するため採用できない模式案。';
 document.getElementById('cells').textContent='追加セル: '+a.newCorridorCells.map(k).join(' · ');
 document.getElementById('sha').textContent=d.sha;
 }canvas.addEventListener('mousemove',e=>{const r=canvas.getBoundingClientRect(),x=Math.floor((e.clientX-r.left)*d.width/r.width),z=Math.floor((e.clientY-r.top)*d.depth/r.height);if(x<0||z<0||x>=d.width||z>=d.depth)return;const a=d.alternatives[selected],v=x+','+z;const roles=[];if(sets.floor.has(v))roles.push('床');if(sets.hall.has(v))roles.push('概念廊下');if(sets.elevator.has(v))roles.push('EV予約');if(sets.stairs.has(v))roles.push('階段予約');if(a.newCorridorCells.some(p=>k(p)===v))roles.push('追加候補');document.getElementById('hover').textContent='ローカル '+v+' · '+(roles.join(' / ')||'床外');});refresh();})();</script></main></body></html>`;
const out=path.join(root,'parallel/b62/main/B62_OFFLINE_CONFLICT_REVIEW.html');fs.writeFileSync(out,html,'utf8');
console.log('B62_RENDERED',out,Buffer.byteLength(html));
