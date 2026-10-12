/** B75 self-contained local review, never sends commands or fetches remote assets. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {massingFromPinnedRules,masksForMasses} from './compile-b75.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const base=path.resolve(here,'../../../..');
const b66=JSON.parse(fs.readFileSync(path.join(base,'source/parallel/b66/main/B66_LOCAL_3D_ASSEMBLY.json')));
const b65=JSON.parse(fs.readFileSync(path.join(base,'source/parallel/b65/main/B65_INTERIOR_ASSEMBLY_INTENTS.json')));
const report=JSON.parse(fs.readFileSync(path.join(here,'B75_RECONCILIATION_REPORT.json')));
const floors=[];
for(const r of report.results){
 const parts=b66.sections.filter(s=>s.id.startsWith(r.id+'/')).sort((a,b)=>a.level-b.level);
 const width=parts[0].floorMaskRows[0].length,depth=parts[0].floorMaskRows.length;
 const mass=massingFromPinnedRules(r.candidate.massing,width,depth,r.candidate.seed);
 const masks=masksForMasses(mass,width,depth);
 for(let i=0;i<6;i++){
  const s=parts[i],a=b65.sections.find(x=>x.id===s.id);
  floors.push({building:r.id,level:s.level,nominal:s.floorMaskRows,production:masks[i].map(row=>[...row].join('')),
   rooms:s.conceptRooms,doors:a.openingPorts.map(p=>({id:p.id,x:p.hallCell.x,z:p.hallCell.z,room:p.roomCell})),
   stairs:s.conceptReservations.stairs, elevators:s.conceptReservations.elevators,
   labels:{massing:r.candidate.massing,seed:r.candidate.seed,status:r.candidate.comparison.delta===0?'EXACT_FLOOR_MASK':'HELD_MISMATCH'}});
 }
}
const safeJSON=JSON.stringify(floors).replaceAll('<','\\u003c');
const html=`<!DOCTYPE html>
<html lang="ja"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"><title>B75 — Production / Interior Alignment</title>
<style>body{margin:0;background:#111820;color:#e9ecf3;font:15px system-ui,'Yu Gothic',sans-serif}.wrap{max-width:1060px;margin:32px auto;padding:0 24px}header{border-bottom:1px solid #35414b;padding-bottom:14px;margin-bottom:24px}h1{font-size:25px;letter-spacing:.01em}p{color:#aab7c8;line-height:1.6}select{background:#202c38;color:#fff;padding:10px 16px;border-radius:9px;border:1px solid #455563;margin-right:12px}canvas{max-width:100%;border:1px solid #344452;border-radius:9px;background:#171c24;image-rendering:pixelated}.layout{display:grid;grid-template-columns:minmax(0,1fr) 240px;gap:20px;align-items:start}.key{margin-bottom:16px;color:#bdc9d6}.sw{display:inline-block;width:13px;height:13px;margin-right:7px;border-radius:2px;vertical-align:middle}aside{background:#1b2530;border:1px solid #314251;border-radius:10px;padding:15px}strong{color:#fff}.held{color:#ffc77e}.foot{margin-top:22px;font-size:13px}button{background:#243748;border:1px solid #526879;color:#fff;border-radius:7px;padding:8px;margin:8px 8px 0 0;cursor:pointer}@media(max-width:740px){.layout{grid-template-columns:1fr}}</style></head>
<body><div class="wrap"><header><h1>B75 / 本番外形 × 室内の重ね合わせ</h1><p>公式本番Plannerで確認済みの外形候補と、B66の固定室内床マスクをローカル座標で比較した非施工レビューです。</p></header>
<label for="b">建物　</label><select id="b"></select><label for="f">階　</label><select id="f"></select>
<div style="height:20px"></div><div class="layout"><main><canvas id="map" width="760" height="650"></canvas></main><aside><div id="summary"></div><div class="key"><span class="sw" style="background:#5c8490"></span>本番床＋既存床<br><span class="sw" style="background:#e16c58"></span>既存床のみ（本番外）<br><span class="sw" style="background:#b8913e"></span>本番床のみ（既存外）<br><span class="sw" style="background:#516373"></span>両方とも床なし<br><span class="sw" style="background:#46c7dc"></span>ドア候補位置<br><span class="sw" style="background:#af80dc"></span>階段予約位置</div><p class="foot">原本・実ワールド座標・ブロック設置命令には変更なし。外形一致は施工安全やドア・階段完成を意味しません。</p></aside></div>
<script>const data=${safeJSON};const names=[...new Set(data.map(x=>x.building))];const b=document.getElementById('b'),f=document.getElementById('f');for(const name of names){const o=document.createElement('option');o.textContent=name;o.value=name;b.append(o)}for(let i=1;i<=6;i++){const o=document.createElement('option');o.value=i;o.textContent='L'+i;f.append(o)}
const can=document.getElementById('map'),ctx=can.getContext('2d');function render(){const d=data.find(x=>x.building===b.value&&x.level==f.value);if(!d)return;const rows=d.nominal,w=rows[0].length,h=rows.length;const tile=Math.floor(Math.min((can.width-40)/w,(can.height-40)/h)),ox=Math.floor((can.width-tile*w)/2),oy=Math.floor((can.height-tile*h)/2);ctx.clearRect(0,0,can.width,can.height);let matched=0,missing=0,extra=0;for(let z=0;z<h;z++)for(let x=0;x<w;x++){const p=d.production[z][x]==='1',n=rows[z][x]==='1';if(p&&n)matched++;else if(n)missing++;else if(p)extra++;ctx.fillStyle=p&&n?'#5c8490':p?'#b8913e':n?'#e16c58':'#2b3440';ctx.fillRect(ox+x*tile,oy+z*tile,tile-1,tile-1)}for(const a of d.stairs){ctx.fillStyle='#af80dc';ctx.fillRect(ox+a.x*tile+tile*.25,oy+a.z*tile+tile*.25,tile*.5,tile*.5)}for(const q of d.doors){ctx.beginPath();ctx.fillStyle='#46c7dc';ctx.arc(ox+(q.x+.5)*tile,oy+(q.z+.5)*tile,Math.max(2,tile*.25),0,Math.PI*2);ctx.fill()}document.getElementById('summary').innerHTML='<p><strong>'+d.building+'</strong><br>階 L'+d.level+' · '+d.labels.massing+' / seed '+d.labels.seed+'</p><p>一致 <strong>'+matched+'</strong><br>既存床のみ <strong class="held">'+missing+'</strong><br>本番床のみ <strong>'+extra+'</strong></p><p>ドア候補 '+d.doors.length+'<br>階段予約 '+d.stairs.length+'</p><p class="held">'+(missing+extra?'床形状不一致：施工禁止':'床形状一致：その他の検証は未完了')+'</p>'}b.addEventListener('change',render);f.addEventListener('change',render);render();</script></div></body></html>`;
fs.writeFileSync(path.join(here,'B75_ALIGNMENT_REVIEW.html'),html);
console.log(`B75 review rendered ${floors.length} floors`);
