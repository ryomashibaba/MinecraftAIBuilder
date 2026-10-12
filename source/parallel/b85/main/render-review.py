#!/usr/bin/env python3
"""Render a network-free B85 planning review. No edit/apply buttons."""
import json
from pathlib import Path
base=Path(__file__).resolve().parents[3] # source root
rep=json.loads((base/'parallel/b85/main/B85_FLOOR_LAYOUT_REPORT.json').read_text())
shapes=json.loads((base/'parallel/b66/main/B66_LOCAL_3D_ASSEMBLY.json').read_text())
pre=json.loads((base/'parallel/b84/main/B84_LAYOUT_OPTIONS_REPORT.json').read_text())
keys={s['id']:s for s in shapes['sections']}
old={s['id']:s for s in pre['sections']}
frames=[]
for section in rep['sections']:
 shape=keys[section['id']]
 frames.append({'id':section['id'],'level':section['level'],'mask':shape['floorMaskRows'],
  'rooms':shape['conceptRooms'],'corridors':shape['conceptReservations']['corridors'],
  'held':section['rooms'],'b84':[{ 'portId':r['portId'],'best':r['best']} for r in old[section['id']]['rooms'] if r['best']]})
data=json.dumps({'totals':rep['totals'],'frames':frames},ensure_ascii=False,separators=(',',':')).replace('</','<\\/')
html='''<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>MinecraftAIBuilder B85 Offline Floor Design Review</title>
<style>
:root{font-family:system-ui,-apple-system,"Yu Gothic",sans-serif;color:#e9edf5;background:#0d1320}*{box-sizing:border-box}body{margin:0 auto;max-width:1180px;padding:24px}
h1{font-size:1.5rem}h2{font-size:1.05rem}.muted{color:#9eacc0}.panel{background:#192234;border:1px solid #2c3a50;border-radius:12px;padding:18px;margin:16px 0}
select{padding:11px;color:#e9edf5;background:#131d2a;border:1px solid #576581;border-radius:8px;margin-right:14px;max-width:100%}
main{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(250px,.75fr);gap:16px}.map{overflow:auto}svg{width:100%;height:auto;max-height:620px;background:#101722;border-radius:8px}.room{fill:#28374a;stroke:#586879;stroke-width:.65}.held{fill:rgba(200,65,86,.23);stroke:#ef6b84;stroke-width:1.4;stroke-dasharray:2 1}.candidate{fill:rgba(250,197,87,.30);stroke:#ffc85a;stroke-width:1.8}.old{fill:none;stroke:#39b6c7;stroke-width:1.5} .label{font-size:2.1px;fill:#dce7f4;font-weight:600}
.entry{background:#101926;padding:10px;border-radius:8px;margin:8px 0;border-left:3px solid #dc7184}.entry.good{border-color:#e0ad57}.cell{display:inline-block;width:11px;height:11px;margin-right:6px;border-radius:2px}.wide{display:flex;gap:16px;flex-wrap:wrap}.wide>div{min-width:130px}.wide b{font-size:1.45rem}footer{margin-top:24px;font-size:.86rem;color:#a9b5c8}@media(max-width:740px){main{display:block}body{padding:12px}}
</style></head><body>
<h1>B85 フロア全体の再配置・保留理由レビュー</h1><p class="muted">オフライン専用。施工、設計承認、Minecraft通信は一切行いません。</p>
<section class="panel wide"><div>従来候補<br><b>287室</b></div><div>新しい形状候補<br><b>4室（条件付き）</b></div><div>面積75%以上の新候補<br><b>0室</b></div><div>引き続き設計対象<br><b>27室</b></div></section>
<section class="panel"><label for="floor">建物・階層：</label><select id="floor"></select> <span id="summary" class="muted"></span></section>
<main><section class="panel map"><h2>名目フロア図</h2><svg id="plan" role="img" aria-label="フロアの部屋、廊下、条件付き候補の配置図"></svg>
<p class="muted"><span class="cell" style="background:#2d6b80"></span>名目廊下　<span class="cell" style="background:#db657b"></span>未解決室　<span class="cell" style="background:#dba949"></span>40%縮小が必要な候補　<span class="cell" style="background:#39b6c7"></span>B84までの候補</p></section>
<section class="panel"><h2>保留中の部屋と変更案</h2><div id="details"></div></section></main>
<footer>注：赤い部屋は設計が失敗した証明ではなく、現在の拘束条件では未解決。黄色は衝突のない局所幾何候補であり、部屋面積・ドア状態・出口経路・承認を満たした施工案ではありません。建物の実世界座標やブロック施工命令は含まれません。</footer>
<script id="dataset" type="application/json">__DATA__</script>
<script>
'use strict';const data=JSON.parse(document.getElementById('dataset').textContent),pick=document.getElementById('floor');
const svg=document.getElementById('plan'), details=document.getElementById('details');
const NS='http://www.w3.org/2000/svg';const el=(tag,attrs,txt)=>{const e=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);if(txt!==undefined)e.textContent=txt;svg.append(e);return e};
for(const [i,s]of data.frames.entries()){const op=document.createElement('option');op.value=i;op.textContent=s.id;pick.appendChild(op)}
function render(){const s=data.frames[Number(pick.value)||0],rows=s.mask,w=rows[0].length,h=rows.length;svg.replaceChildren();svg.setAttribute('viewBox',`-1 -1 ${w+2} ${h+2}`);
for(let z=0;z<h;z++)for(let x=0;x<w;x++)if(rows[z][x]==='1')el('rect',{x,y:z,width:1,height:1,fill:'#192b36',stroke:'#223341','stroke-width':'.10'});
for(const p of s.corridors)el('rect',{x:p.x,y:p.z,width:1,height:1,fill:'#2d6b80',opacity:.63});
for(const r of s.rooms)el('rect',{x:r.x,y:r.z,width:r.width,height:r.depth,class:'room'});
for(const x of s.held){const r=s.rooms.find(r=>r.id===x.roomId);if(r)el('rect',{x:r.x,y:r.z,width:r.width,height:r.depth,class:'held'});
if(x.best){const r=x.best.newRoomRect;el('rect',{x:r.x,y:r.z,width:r.width,height:r.depth,class:'candidate'});el('circle',{cx:x.best.doorRoomCell.x+.5,cy:x.best.doorRoomCell.z+.5,r:.38,fill:'#ffc85a',stroke:'#111','stroke-width':.15})}}
for(const x of s.b84){const p=x.best.doorRoomCell;el('circle',{cx:p.x+.5,cy:p.z+.5,r:.35,class:'old'})}
for(const r of s.rooms)el('text',{x:r.x+.25,y:r.z+.8,class:'label'},r.id.split('-').at(-1));
document.getElementById('summary').textContent=`B85設計対象 ${s.held.length}室（新形状 ${s.held.filter(r=>r.best).length}室）`;
details.replaceChildren();for(const x of s.held){const item=document.createElement('div');item.className='entry'+(x.best?' good':'');
const role=(x.blockers.preferredDiagnostic?.productionTouches||[]).map(v=>v.role);const counts={};for(const k of role)counts[k]=(counts[k]||0)+1;
const area=x.best?`${Math.round(x.best.retainedFloorAreaRatio*100)}%（品質ゲート75%に未達）`:'候補なし';
const h=document.createElement('strong');h.textContent=x.roomId+(x.templateId?' · '+x.templateId:'');const p=document.createElement('p');p.textContent=`状態: ${area} / 調査した入口境界: ${x.blockers.edgeCount} / 最小干渉: ${x.blockers.minimumProductionConflictCount??'なし'} ブロック`;
const m=document.createElement('small');m.className='muted';m.textContent='代表干渉: '+(Object.entries(counts).map(([k,v])=>k+'×'+v).join('、')||'入口経路・既存予約との競合');item.append(h,p,m);details.append(item)}
if(!s.held.length){const p=document.createElement('p');p.textContent='B85時点の未解決室はありません。';details.append(p)}
}pick.addEventListener('change',render);render();
</script></body></html>'''.replace('__DATA__',data)
out=Path(__file__).with_name('B85_FLOOR_REVIEW.html');out.write_text(html,encoding='utf-8')
print(out,len(html))
