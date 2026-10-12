#!/usr/bin/env python3
"""Portable, self-contained, read-only floor explorer. No network or Minecraft operations."""
import json, html
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3]
DATA=json.loads((ROOT/'parallel/b92/main/B92_FLOOR_RETILE_REPORT.json').read_text())
BASE=json.loads((ROOT/'parallel/b66/main/B66_LOCAL_3D_ASSEMBLY.json').read_text())
rows={r['sectionId']:[] for r in DATA['rooms']}
for r in DATA['rooms']:rows.setdefault(r['sectionId'],[]).append({'roomId':r['roomId'],'pattern':r['pattern'].split('/')[-1],
 'rect':r['originalRoom'],'attempts':r['retile']['tested'],'rejections':r['retile']['rejections'],
 'passing':r['retile']['passingTotal'],'localAudits':r['existingApertureCoreAudits']})
views=[]
for sec in BASE['sections']:
 views.append({'id':sec['id'],'level':sec['level'],'mask':sec['floorMaskRows'],
  'rooms':sec['conceptRooms'],'corridors':sec['conceptReservations']['corridors'],
  'stairs':sec['conceptReservations']['stairs'],'elevators':sec['conceptReservations']['elevators'],
  'held':rows.get(sec['id'],[])})
views.sort(key=lambda s:s['id'])
blob=json.dumps({'summary':DATA['totals'],'floor':views},ensure_ascii=False,separators=(',',':')).replace('</','<\\/')
page=r'''<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>B92 Floor Retile Review — MinecraftAIBuilder</title>
<style>
:root{font-family:Inter,"Segoe UI",system-ui,sans-serif;color:#dce7f5;background:#0b1221}
*{box-sizing:border-box}body{margin:0;padding:24px;max-width:1400px;margin:auto}header{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
h1{font-size:27px;margin:0 0 4px;font-weight:750;letter-spacing:-.03em}p{color:#9db2ca;line-height:1.6}small{color:#94a6be}
.pill{font-size:12px;color:#f7d39e;background:#322916;border:1px solid #60502a;border-radius:12px;padding:8px 10px;white-space:nowrap}
.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:18px 0 22px}.metric{background:#121e31;border:1px solid #28364b;border-radius:12px;padding:17px}
.metric b{display:block;font-size:30px;color:#f2f6fd;font-variant-numeric:tabular-nums;margin:4px 0}.metric span{font-size:12px;color:#92abc5}
.work{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(300px,.7fr);gap:18px}
.panel{border:1px solid #293b50;background:#111d2c;border-radius:16px;padding:20px;min-width:0}
select{font:inherit;color:#e6eef8;background:#142439;border:1px solid #37516c;border-radius:9px;padding:10px;max-width:100%;min-width:240px}
#map{width:100%;height:auto;max-height:640px;border-radius:10px;background:#0c1624;border:1px solid #2b3d51;display:block;margin:14px 0}
.legend{display:flex;gap:14px;flex-wrap:wrap;margin-top:12px;color:#aabbce;font-size:12px}.dot{display:inline-block;width:11px;height:11px;border-radius:3px;margin-right:5px;vertical-align:-1px}
.room{display:block;border:1px solid #2c4357;border-radius:10px;background:#142338;padding:12px;margin:12px 0}.room button{border:0;background:none;color:#eef4ff;font-size:15px;font-weight:700;padding:0;cursor:pointer}
.room p{margin:7px 0 0;font-size:12px}.room strong{color:#fed48b}.detail{font-size:12px;color:#9db2ca;margin:9px 0}.detail code{color:#c2dfff}button:hover{text-decoration:underline}
footer{margin-top:22px;color:#889eb5;font-size:12px;line-height:1.6}
@media(max-width:880px){.work{grid-template-columns:1fr}.metrics{grid-template-columns:repeat(2,1fr)}body{padding:14px}}
</style></head><body>
<header><div><h1>B92 · Floor & Corridor Retiling</h1><small>MinecraftAIBuilder · オフライン設計レビュー（読み取り専用）</small></div><span class="pill">NOT_PREPARED · 9 GATES BLOCKED · WORLD CONTACTS 0</span></header>
<p>部屋を動かし、回転させ、最大25%縮小する候補を、既存の部屋・共用廊下・床・既存部材との競合で検査。赤枠は未解決室です。設計案は未承認で、Minecraftを変更しません。</p>
<div class="metrics"><div class="metric"><span>調査対象</span><b id="m1">18</b><span>保留室・10フロア</span></div><div class="metric"><span>移動・縮小探索</span><b id="m2">1,844</b><span>候補配置の検査</span></div><div class="metric"><span>厳格検査を通過した新規配置</span><b id="m3">0</b><span>室の承認数も0</span></div><div class="metric"><span>実空間で共用コア隣接経路がある局所案</span><b id="m4">5</b><span>4室・出口到達は未証明</span></div></div>
<div class="work"><section class="panel"><label for="floor">フロアを選択</label> <select id="floor"></select>
<svg id="map" viewBox="0 0 100 80" xmlns="http://www.w3.org/2000/svg" aria-label="フロア平面図"></svg>
<div class="legend"><span><i class="dot" style="background:#2e5477"></i>部屋</span><span><i class="dot" style="background:#ed9461"></i>保留室</span><span><i class="dot" style="background:#46856f"></i>名目廊下</span><span><i class="dot" style="background:#9479d5"></i>階段/昇降機</span><span><i class="dot" style="background:#64d8ef"></i>2高の局所候補</span></div>
</section><aside class="panel"><h2 style="font-size:19px;margin-top:0">保留室の実ブロック評価</h2><p id="overview"></p><div id="rooms"></div><div class="detail">「共用コア到達」は、2ブロック高で通れる名目廊下のうち、階段・昇降機予約の隣接セルに達することのみを示します。階段そのもの、旧開口閉鎖、ドアの蝶番、外部出口への到達は未認証です。</div></aside></div>
<footer>固定本番Planner出力2棟を再照合。B91までの未承認296室候補は変更なし。構造物・ガラス・床・部屋数の変更と施工は行っていません。</footer>
<script id="review-data" type="application/json">__DATA__</script>
<script>
const data=JSON.parse(document.getElementById('review-data').textContent),sel=document.getElementById('floor');
for(const f of data.floor){const o=document.createElement('option');o.value=f.id;o.textContent=f.id+'  '+(f.held.length?'● 保留 '+f.held.length:'');sel.append(o)}
const first=data.floor.find(f=>f.held.length);if(first)sel.value=first.id;
const NS='http://www.w3.org/2000/svg',elem=(name,attrs={},text='')=>{let el=document.createElementNS(NS,name);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,String(v));if(text)el.textContent=text;return el};
function draw(f){const svg=document.getElementById('map');svg.replaceChildren();const S=22,w=f.mask[0].length,h=f.mask.length;svg.setAttribute('viewBox',`0 0 ${w*S} ${h*S}`);
for(let z=0;z<h;z++)for(let x=0;x<w;x++)if(f.mask[z][x]==='1')svg.append(elem('rect',{x:x*S,y:z*S,width:S,height:S,fill:'#152438',stroke:'#27374b','stroke-width':.55}));
for(const c of f.corridors)svg.append(elem('rect',{x:c.x*S+.4,y:c.z*S+.4,width:S-.8,height:S-.8,fill:'#326d58',opacity:.85}));
for(const c of f.stairs)svg.append(elem('rect',{x:c.x*S,y:c.z*S,width:S,height:S,fill:'#8a69c4'}));
for(const c of f.elevators)svg.append(elem('rect',{x:c.x*S,y:c.z*S,width:S,height:S,fill:'#7568a1'}));
let held=new Set(f.held.map(r=>r.roomId));for(const r of f.rooms){const bad=held.has(r.id);svg.append(elem('rect',{x:r.x*S+1.6,y:r.z*S+1.6,width:r.width*S-3.2,height:r.depth*S-3.2,rx:3,fill:bad?'#b87446':'#294666',stroke:bad?'#ffc084':'#7391af','stroke-width':bad?2:1,opacity:.94}));svg.append(elem('text',{x:(r.x+r.width/2)*S,y:(r.z+r.depth/2)*S+3,'font-size':11,'text-anchor':'middle',fill:'#fff','font-weight':bad?'bold':'normal'},r.id.slice(-3)))}
for(const r of f.held)for(const a of r.localAudits)if(a.considered&&a.corePathVerified){const c=a.door;svg.append(elem('circle',{cx:(c.x+.5)*S,cy:(c.z+.5)*S,r:S*.26,fill:'#64d8ef',stroke:'#08202c','stroke-width':2}))}}
function show(){const f=data.floor.find(v=>v.id===sel.value);if(!f)return;draw(f);document.getElementById('overview').textContent=`${f.id}  ·  保留 ${f.held.length} 室。未承認の局所3D案と、配置再検討の否決理由を表示。`;
const panel=document.getElementById('rooms');panel.replaceChildren();if(!f.held.length){panel.textContent='この階にはB92の追加保留室はありません。';return}
for(const r of f.held){const box=document.createElement('div');box.className='room';const title=document.createElement('div');title.innerHTML=`<strong>${r.roomId}</strong>　パターン ${r.pattern}`;box.append(title);
const successful=r.localAudits.filter(a=>a.considered&&a.corePathVerified);const p=document.createElement('p');p.textContent=`再配置 ${r.attempts}案を検証 / 成立 ${r.passing}案。空き廊下の共用コア近接経路 ${successful.length}案。`;box.append(p);
const explain=Object.entries(r.rejections).filter(([k,v])=>v).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k,v])=>`${k}: ${v}`).join(' / ');const reason=document.createElement('div');reason.className='detail';reason.textContent='主な除外要因: '+(explain||'なし');box.append(reason);panel.append(box)} }
sel.addEventListener('change',show);show();
</script></body></html>'''.replace('__DATA__',blob)
OUT=Path(__file__).with_name('B92_FLOOR_RETILE_REVIEW.html');OUT.write_text(page,encoding='utf8');print(OUT,OUT.stat().st_size)
