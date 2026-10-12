/** Offline report viewer; no editor or execution controls. */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {buildB72} from '../../b72/main/run-b72.mjs';
import {massingFromPinnedRules,masksForMasses} from '../../b75/main/compile-b75.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const rpt=JSON.parse(fs.readFileSync(path.join(here,'B76_STAGING_REPORT.json')));
const {report:b72,b65,b66}=buildB72();
const floors=[];
for(const b of rpt.buildings){const job=b72.jobs.find(j=>j.id===b.id),{width,depth}=job.createBuildingPlanInputCandidate;
 const masks=masksForMasses(massingFromPinnedRules(b.massing,width,depth,b.seed),width,depth);
 for(let i=0;i<6;i++){
  const id=`${b.id}/L${i+1}`,s=b66.sections.find(x=>x.id===id),a=b65.sections.find(x=>x.id===id);
  floors.push({id,building:b.id,level:i+1,width,depth,mask:masks[i].map(row=>[...row].join('')),
   rooms:s.conceptRooms,corridors:s.conceptReservations.corridors,stairs:s.conceptReservations.stairs,
   elevators:s.conceptReservations.elevators,ports:a.openingPorts.map(p=>({room:p.roomCell,hall:p.hallCell,normal:p.normal})),
   heldCorridors:s.conceptReservations.corridors.filter(p=>s.floorMaskRows[p.z]?.[p.x]!=='1')});
 }
}
const data=JSON.stringify({floors,counts:rpt.counts,buildings:rpt.buildings.map(b=>({id:b.id,massing:b.massing,seed:b.seed,extraReview:b.requiresExplicitCrossProgramDesignReview}))}).replace(/</g,'\\u003c');
const html=`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>B76 | MinecraftAIBuilder offline integration inspection</title><style>
:root{color-scheme:dark;font-family:ui-sans-serif,system-ui,'Segoe UI',sans-serif;background:#0d121a;color:#ebf0f6}body{max-width:1160px;margin:0 auto;padding:28px}h1{font-size:28px;font-weight:700;margin:0}p{color:#a9bac9;line-height:1.65}.tag{display:inline-block;padding:5px 10px;border:1px solid #55627b;border-radius:30px;color:#c4cfdf;font-size:11px;letter-spacing:.12em;margin-bottom:14px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:22px 0}.metric,.panel{background:#18212d;border:1px solid #2d3a4c;border-radius:14px;padding:18px}.metric strong{display:block;font-size:27px;color:#b1e0ca}.metric span{display:block;color:#a9bac9;font-size:12px;margin-top:5px}select{background:#263449;color:#f4f8ff;border:1px solid #45617c;border-radius:8px;font-size:15px;padding:9px;margin:6px 8px 6px 0}.controls{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.layout{display:grid;grid-template-columns:minmax(0,2fr) minmax(280px,1fr);gap:16px}.floor{background:#121a24;border-radius:12px;padding:12px;overflow:auto}canvas{max-width:100%;height:auto;image-rendering:pixelated}.note{border-left:3px solid #d9b26d;padding-left:14px;color:#e2c89a;font-size:13px}.legend{display:flex;gap:12px;flex-wrap:wrap;margin:13px 0}.legend b{width:12px;height:12px;display:inline-block;border-radius:3px;vertical-align:middle;margin-right:5px}.legend span{font-size:12px;color:#c3d2e0}dl{display:grid;grid-template-columns:1fr auto;gap:8px;font-size:13px}dt{color:#9eb1c4}dd{margin:0;font-variant-numeric:tabular-nums}.muted{color:#93a4b8;font-size:12px}@media(max-width:750px){body{padding:16px}.layout{grid-template-columns:1fr}.grid{grid-template-columns:1fr}}
</style></head><body><span class="tag">READ-ONLY / NOT_PREPARED / 9 GATES BLOCKED</span><h1>B76 — 建築外形と室内の統合確認</h1><p>固定された本番Plannerの形状と、凍結された室内設計の比較。表示はローカルの設計データであり、Minecraftの世界での建築結果ではありません。</p><div class="grid"><div class="metric"><strong>5 / 5</strong><span>建築外形と名目床マスク一致</span></div><div class="metric"><strong>314</strong><span>ドア開口・名目床支持（物理設置は未検証）</span></div><div class="metric"><strong>25</strong><span>階段の接続予約（実階段は0）</span></div></div>
<div class="layout"><section class="panel"><div class="controls"><label>建物 <select id="building"></select></label><label>階 <select id="floor"></select></label></div><div class="legend"><span><b style="background:#345b56"></b>床</span><span><b style="background:#3e94b3"></b>部屋</span><span><b style="background:#d5a865"></b>廊下</span><span><b style="background:#bf77af"></b>階段</span><span><b style="background:#f6e9b8"></b>ドア</span><span><b style="background:#df6868"></b>原本外の予約</span></div><div class="floor"><canvas id="map" aria-label="floor layout"></canvas></div><p class="muted">セル単位の模式図。外壁とドアの衝突を判定する完成施工図ではありません。</p></section>
<aside class="panel"><h2 id="heading">照合結果</h2><dl id="details"></dl><p class="note" id="message"></p><p class="muted">共通未解決：実ドア蝶番／設置グリッド／外壁衝突、階段の傾斜・支持・上部開口、ゲーム内アンカー。</p></aside></div>
<script type="application/json" id="data">${data}</script><script>
const d=JSON.parse(document.getElementById('data').textContent),b=document.getElementById('building'),f=document.getElementById('floor');const canvas=document.getElementById('map'),c=canvas.getContext('2d');
for(const x of d.buildings){const o=document.createElement('option');o.textContent=x.id;o.value=x.id;b.append(o)}
for(let i=1;i<=6;i++){const o=document.createElement('option');o.value=i;o.textContent=i+'階';f.append(o)}
b.value='hotel/candidate-01';function show(){const r=d.floors.find(x=>x.building===b.value&&x.level===Number(f.value||1));if(!r)return;const scale=17;canvas.width=r.width*scale;canvas.height=r.depth*scale;const cells=new Map();const mark=(a,col)=>{for(const p of a)cells.set(p.x+','+p.z,col)};
for(let z=0;z<r.depth;z++)for(let x=0;x<r.width;x++){c.fillStyle=r.mask[z][x]==='1'?'#345b56':'#15202d';c.fillRect(x*scale,z*scale,scale-1,scale-1)}
for(const room of r.rooms)for(let z=room.z;z<room.z+room.depth;z++)for(let x=room.x;x<room.x+room.width;x++)cells.set(x+','+z,'#3e94b3');
mark(r.corridors,'#d5a865');mark(r.elevators,'#969ba3');mark(r.stairs,'#bf77af');mark(r.heldCorridors,'#df6868');
for(const [key,col] of cells){const [x,z]=key.split(',').map(Number);c.fillStyle=col;c.fillRect(x*scale,z*scale,scale-1,scale-1)}
for(const p of r.ports){const x=(p.room.x+p.hall.x+1)/2,z=(p.room.z+p.hall.z+1)/2;c.beginPath();c.fillStyle='#f6e9b8';c.arc(x*scale,z*scale,3.8,0,Math.PI*2);c.fill()}
const building=d.buildings.find(x=>x.id===b.value);document.getElementById('heading').textContent=b.value;
const values=[['本番外形',building.massing],['階数','6'],['階高','5（候補）'],['床マスク','完全一致'],['階の名目ドア開口',r.ports.length+'件'],['階の床外廊下予約',r.heldCorridors.length+'セル'],['施工命令','0']];
document.getElementById('details').replaceChildren(...values.flatMap(([k,v])=>{const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=k;dd.textContent=v;return[dt,dd]}));
document.getElementById('message').textContent=building.extraReview?'ホテルの slab 指定は本番APIで動作したものの、ホテル標準プリセットの外です。外観デザインの承認はまだありません。':'床外形の一致は確認済みですが、外壁・内装・実ブロック状態の互換性は未検証です。';}
b.onchange=show;f.onchange=show;f.value='3';show();
</script></body></html>`;
fs.writeFileSync(path.join(here,'B76_OFFLINE_REVIEW.html'),html);console.log('B76 viewer written',floors.length,'floors',Buffer.byteLength(html));
