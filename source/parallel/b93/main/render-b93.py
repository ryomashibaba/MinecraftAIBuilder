#!/usr/bin/env python3
"""Single-file, offline, read-only whole-floor architectural programme comparison."""
import json
from pathlib import Path
HERE=Path(__file__).resolve().parent
SRC=HERE.parents[2]
def load(p): return json.loads((SRC/p).read_text())
b66=load('parallel/b66/main/B66_LOCAL_3D_ASSEMBLY.json')
b93=load('parallel/b93/main/B93_ALTERNATE_PROGRAMME_REPORT.json')
held={f['sectionId']:f for f in b93['floors']}
sections=[]
for s in b66['sections']:
    r=s['conceptReservations']
    sections.append({'id':s['id'],'level':s['level'],'mask':s['floorMaskRows'],
        'rooms':s['conceptRooms'],'corridors':r['corridors'],'stairs':r['stairs'],'elevators':r['elevators'],
        'review':held.get(s['id'])})
allData=json.dumps({'sections':sections,'totals':b93['totals']},ensure_ascii=False,separators=(',',':')).replace('</','<\\/')
html='''<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>MinecraftAIBuilder B93 – 建築用途・共用廊下オフライン比較</title>
<style>
:root{font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color-scheme:dark;color:#dce6f5;background:#101726}
*{box-sizing:border-box}body{margin:0;padding:20px;max-width:1550px;margin-inline:auto}h1{font-size:24px;margin:0 0 7px}h2{font-size:17px;margin:0 0 12px}
small,.muted{color:#a3b5c8}header{margin:0 0 20px}.guard{border:1px solid #8a6260;border-radius:9px;background:#292126;padding:12px;margin-top:10px;color:#ffd4c7}
main{display:grid;grid-template-columns:minmax(400px,2fr) minmax(310px,1fr);gap:16px}.panel{border:1px solid #34465b;border-radius:12px;background:#192336;padding:16px;min-width:0}
label{display:inline-block;font-size:13px;margin-right:12px;margin-bottom:10px}select{background:#24364d;color:#eff6ff;border:1px solid #526986;border-radius:6px;padding:8px;max-width:100%}
#scene{width:100%;height:auto;max-height:680px;background:#111d2c;border-radius:7px;border:1px solid #37435a}
#scene text{font-size:3.7px;pointer-events:none;fill:#ebf2fc;font-family:system-ui}ul{padding-left:19px;line-height:1.6}.list{max-height:440px;overflow:auto}.item{padding:8px;border-bottom:1px solid #35445a;font-size:13px}
.metrics{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin:12px 0}.stat{border:1px solid #35465d;padding:9px;border-radius:7px}.stat b{font-size:22px;display:block}.legend{display:flex;flex-wrap:wrap;gap:12px;margin-top:12px;font-size:12px}
.legend i{width:13px;height:13px;display:inline-block;border-radius:2px;margin-right:4px;vertical-align:-1px}
#branchNote{line-height:1.65;white-space:pre-line;font-size:14px}#details{line-height:1.7;font-size:13px;color:#c3d0e1}footer{padding:20px 0;font-size:12px;color:#97a9bc}
@media(max-width:850px){main{grid-template-columns:1fr}body{padding:12px}}
</style></head><body><header><h1> B93｜建築用途と共用動線の代替設計</h1>
<small>5棟・30階の静的オフライン図面。色は未承認の構想位置であり、実ワールドの施工結果ではありません。</small>
<div class="guard"><b>施工禁止 / NOT_PREPARED</b>　9ゲート BLOCKED · BuildPlan.operations = [] · 本番ブロック変更ゼロ。経路はドアや避難出口の通行を保証しません。</div></header>
<main><section class="panel"><div><label>フロア <select id="floor"></select></label>
<label>比較する設計 <select id="branch"></select></label><label>開始室 <select id="room"></select></label></div>
<svg xmlns="http://www.w3.org/2000/svg" id="scene" viewBox="0 0 720 550"></svg>
<div class="legend"><span><i style="background:#405c71"></i>保護済み既存室</span><span><i style="background:#c27c41"></i>18保留室</span>
<span><i style="background:#437d86"></i>名目廊下</span><span><i style="background:#9a728d"></i>縦動線予約</span>
<span><i style="background:#eed18a"></i>転用予定の廊下セル</span></div></section>
<aside class="panel"><h2 id="branchTitle">比較結果</h2><p id="branchNote"></p><div id="stats" class="metrics"></div>
<h2>保留室別の診断</h2><div id="details" class="list"></div></aside></main>
<footer>図面セルは概念ローカル座標のみ。実装はB93のソースで再現できます。床・外壁・ガラス・凍結済み296案には変更を加えていません。</footer>
<script>const DATA=__DATA__;
const floor=document.getElementById('floor'),branch=document.getElementById('branch'),room=document.getElementById('room'),scene=document.getElementById('scene');
const B=[['KEEP_ALL_HELD_UNCERTIFIED','① 保留室を維持'],['REPURPOSE_HELD_ROOMS_AS_COMMON_SERVICE_ZONE','② 全保留室を共用化'],['MINIMAL_HELD_ROOM_CORE_LINK','③ 最小の共用コア接続'],['MERGE_HELD_INTO_EXISTING_ADJACENT_SUITES','④ 隣接室と統合（要設計変更）']];
DATA.sections.forEach((s,i)=>{const o=document.createElement('option');o.value=i;o.textContent=s.id+(s.review?' ● 保留あり':'');floor.append(o)});
for(const [id,name] of B){const o=document.createElement('option');o.value=id;o.textContent=name;branch.append(o)}
function svg(tag,attrs,text){const e=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs||{}))e.setAttribute(k,v);if(text!=null)e.textContent=text;scene.appendChild(e);return e}
function tile(p,color,alpha=1){svg('rect',{x:p.x+0.05,y:p.z+0.05,width:.9,height:.9,fill:color,opacity:alpha,rx:.05})}
function render(){const s=DATA.sections[Number(floor.value||0)],review=s.review,chosen=branch.value;scene.replaceChildren();
const h=s.mask.length,w=s.mask[0].length;scene.setAttribute('viewBox',`-1 -1 ${w+2} ${h+2}`);
for(let z=0;z<h;z++)for(let x=0;x<w;x++)if(s.mask[z][x]==='1')tile({x,z},'#304255');
for(const p of s.corridors)tile(p,'#437d86');for(const p of [...s.stairs,...s.elevators])tile(p,'#9a728d');
const heldIds=new Set(review?.roomGraph.map(x=>x.roomId)||[]);
for(const r of s.rooms){const color=heldIds.has(r.id)?'#c27c41':'#405c71';svg('rect',{x:r.x,y:r.z,width:r.width,height:r.depth,fill:color,stroke:heldIds.has(r.id)?'#ffe0b3':'#697d8b','stroke-width':.11,opacity:.91});
svg('text',{x:r.x+.2,y:r.z+.8},r.id.split('-').at(-1))}
let path=[];if(review&&chosen==='MINIMAL_HELD_ROOM_CORE_LINK'){
 const sel=review.roomGraph.find(x=>x.roomId===room.value)||review.roomGraph[0];path=sel?.serviceConnection?.withinConceptQualityBudget?sel.serviceConnection.conceptualCorridorCells:[];
}if(review&&chosen==='REPURPOSE_HELD_ROOMS_AS_COMMON_SERVICE_ZONE'){
 for(const r of s.rooms.filter(x=>heldIds.has(x.id)))svg('rect',{x:r.x,y:r.z,width:r.width,height:r.depth,fill:'#b0a066',opacity:.65,stroke:'#ffe2a7','stroke-width':.1})}
for(const p of path)tile(p,'#eed18a',.9);
const selected=review?.alternatives.find(x=>x.id===chosen),all=review?.roomGraph||[];
document.getElementById('branchTitle').textContent=B.find(x=>x[0]===chosen)[1];
const desc={KEEP_ALL_HELD_UNCERTIFIED:'元の独立室はすべて保留のまま。通行・使用承認なし。',REPURPOSE_HELD_ROOMS_AS_COMMON_SERVICE_ZONE:'保留室を独立室数から除外し、未承認の共用サービス区画として考える案。実際の通行可能な共用スペースと認定したわけではありません。',MINIMAL_HELD_ROOM_CORE_LINK:'保留室の一部を廊下用途に変更して、既存の縦動線コアに隣接する実際に空いた名目廊下につなぐ概念案。新しい廊下は未施工、実際の通行は未認証。長大な迂回経路は品質ゲートで保留。',MERGE_HELD_INTO_EXISTING_ADJACENT_SUITES:'近隣室との用途統合案。既存296室分の未承認設計を変更する可能性があるため、施工・自動採用禁止。'};
document.getElementById('branchNote').textContent=review?desc[chosen]:'この階にB93の18保留室はありません。従来図面の参照のみです。';
const met=[['保留の独立室',review?.heldRoomCount??0],['名目保留面積',review?.heldNominalArea??0],['構想接続数',all.filter(x=>x.serviceConnection.found).length],['短距離条件',all.filter(x=>x.serviceConnection.withinConceptQualityBudget).length]];
document.getElementById('stats').innerHTML=met.map(([l,v])=>`<div class="stat"><small>${l}</small><b>${v}</b></div>`).join('');
document.getElementById('details').innerHTML=all.map(x=>{const a=x.serviceConnection;return `<div class="item"><b>${x.roomId}</b>　${x.originalArea}セル\n<div>${a.found?`共用接続の構想 ${a.path.length}セル / 既存ブロック変更要求 ${a.productionContactCount}個 / ${a.withinConceptQualityBudget?'短距離案':'品質基準外'}`:a.reason}</div><div style="color:#91a7ba">近隣室 ${x.adjacentSuites.map(z=>z.otherRoomId).join(', ')||'なし'}</div></div>`}).join('')||'<p>保留の登録なし</p>';
}
function updateRooms(){const s=DATA.sections[Number(floor.value||0)];room.replaceChildren();for(const g of s.review?.roomGraph||[]){const o=document.createElement('option');o.value=g.roomId;o.textContent=g.roomId;room.append(o)}room.disabled=!s.review;render()}
floor.addEventListener('change',updateRooms);branch.addEventListener('change',render);room.addEventListener('change',render);
floor.value=DATA.sections.findIndex(x=>x.id==='apartment/candidate-01/L2');branch.value='MINIMAL_HELD_ROOM_CORE_LINK';updateRooms();
</script></body></html>'''.replace('__DATA__',allData)
(HERE/'B93_PROGRAMME_BRANCH_REVIEW.html').write_text(html,encoding='utf-8')
print('Review HTML bytes:',len(html.encode()))
