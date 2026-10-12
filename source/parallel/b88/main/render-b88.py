#!/usr/bin/env python3
"""Static, self-contained readonly floor network audit viewer and cross-floor blocker backlog."""
import json,collections,html,pathlib
P=pathlib.Path(__file__).resolve().parent
SRC=P.parents[1]
r=json.loads((P/'B88_CORRIDOR_NETWORK_REPORT.json').read_text())
b=json.loads((SRC/'b66/main/B66_LOCAL_3D_ASSEMBLY.json').read_text())
by={s['id']:s for s in b['sections']}
viewer=[]
pattern=collections.defaultdict(lambda:{'rooms':[],'boundaryReasons':collections.Counter(),'floors':[],'representative':None})
for s in r['sections']:
 c=by[s['id']]
 row={'id':s['id'],'level':s['level'],'width':s['width'],'depth':s['depth'],'floorMaskRows':s['floorMaskRows'],
      'rooms':c['conceptRooms'],'corridors':c['conceptReservations']['corridors'],
      'stairs':c['conceptReservations']['stairs'],'elevators':c['conceptReservations']['elevators'],
      'components':s['nominalCorridorComponents'],'held':s['rooms']}
 viewer.append(row)
 for q in s['rooms']:
  room=next(v for v in c['conceptRooms'] if v['id']==q['roomId'])
  archetype=s['id'].split('/L')[0]+'/'+q['roomId'].split('-R')[-1]
  e=pattern[archetype];e['rooms'].append(s['id']+'/'+q['roomId']);e['floors'].append(s['level']);e['boundaryReasons'].update(q['diagnostics'])
  if e['representative'] is None:e['representative']={'sectionId':s['id'],'room':room,'diagnostics':q['diagnostics']}
backlog=[]
for k,p in pattern.items():
 counts=p['boundaryReasons'];reasons={x:y for x,y in counts.items() if x!='edgeCount'}
 primary=max(reasons,key=reasons.get) if reasons else 'UNKNOWN'
 category=('FLOOR_AND_ROOM_BOUNDS_REDESIGN_REVIEW' if primary=='occupiedReservation' else
 'PINNED_PRODUCTION_OPENING_REDRAFT_REVIEW' if primary=='doorBlocked' else
 'DOOR_FRAME_AND_WALL_CONTINUITY_REVIEW' if primary=='noFrame' else
 'ROOM_CORE_AND_SWING_REDESIGN_REVIEW' if primary in ('noSwing','noInteriorCore') else
 'CORRIDOR_NETWORK_RECONNECTION_REVIEW')
 backlog.append({'pattern':k,'repeatedFloors':sorted(p['floors']),'affectedRooms':p['rooms'],
  'affectedRoomCount':len(p['rooms']),'firstFailureBoundaries':dict(counts),'dominantClass':primary,
  'proposedDesignWork':category,'representative':p['representative'],
  'approval':'HOLD_CONCEPT_REDESIGN','productionEditsAuthorized':0,'constructionCommands':0})
backlog.sort(key=lambda a:(-a['affectedRoomCount'],a['pattern']))
summary={'schema':'minecraftaibuilder-b88-repeated-floor-archetype-blocker-backlog-v1',
 'provenance':{'b88':r['reportSha256']},'patterns':backlog,
 'totalHeldRooms':sum(p['affectedRoomCount'] for p in backlog),'uniqueHeldPatterns':len(backlog),
 'nonClaims':['FIRST_FAIL_ONLY_NOT_ALL_BLOCKERS','TOPOLOGY_NOT_EGRESS_PROOF','NO_WORLD_EDITS_OR_COMMANDS'],
 'approval':'HOLD_REVIEW_ONLY','executionAllowed':False,'constructionApproved':False,'readiness':'NOT_PREPARED',
 'BuildPlan':{'operations':[],'commandCount':0,'worldCoordinates':None}}
(P/'B88_PATTERN_BACKLOG.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
data=json.dumps({'sections':viewer,'backlog':backlog,'totals':r['totals']},ensure_ascii=False,separators=(',',':')).replace('</','<\\/')
body='''<!doctype html><html lang="ja"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>B88 Corridor Network Review — Offline</title>
<style>
:root{color-scheme:dark;font-family:Inter,"Yu Gothic UI",Meiryo,system-ui,sans-serif}*{box-sizing:border-box}
body{background:#0b1120;color:#eef4ff;margin:0;padding:28px}header{max-width:1280px;margin:0 auto 20px}
small{color:#99aac9}h1{font-size:27px;margin:8px 0 10px;letter-spacing:-.025em}h2{font-size:18px;margin:0 0 12px}
.kicker{color:#6ed9ef;font-size:12px;letter-spacing:.11em;font-weight:700}.sub{color:#a6b5ce;line-height:1.65;font-size:14px}
.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;max-width:1280px;margin:0 auto 20px}
.metric,.panel{border:1px solid #293850;border-radius:15px;background:linear-gradient(155deg,#18253b,#111c30);padding:17px}
.metric b{display:block;font-size:27px;margin:5px 0;color:#f9fbff}.metric span{font-size:12px;color:#a7b9d2}
.main{max-width:1280px;margin:auto;display:grid;grid-template-columns: minmax(0,1.5fr) minmax(330px,1fr);gap:16px}
.panel{min-width:0}.bar{display:flex;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:12px}
select{appearance:none;background:#0c182b;border:1px solid #3b5471;border-radius:9px;color:#f2f8ff;padding:11px;min-width:260px;font-weight:600;font-size:14px}
.legend{display:flex;flex-wrap:wrap;gap:10px;margin:10px 0 6px;color:#a3b6d1;font-size:12px}
.dot{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px}
canvas{display:block;width:100%;height:auto;border-radius:10px;border:1px solid #283957;background:#0b1424;cursor:crosshair}
.notice{padding:11px 13px;border-radius:9px;border:1px solid #4a5972;background:#1b2c43;color:#dce8f7;font-size:12px;line-height:1.5}
.legend .held{color:#ffd3a5}.rooms{overflow:auto;max-height:400px}.entry{padding:11px 0;border-bottom:1px solid #2b3e56;font-size:13px;line-height:1.55}
.entry b{color:#f0f5ff}.pill{font-size:11px;border-radius:6px;background:#263751;color:#bacce8;padding:3px 6px;margin-left:6px}
.tag{color:#fec67e}.table{border-collapse:collapse;width:100%;font-size:12px}.table td{padding:9px 6px;border-bottom:1px solid #304057}.table td:last-child{text-align:right;color:#aee2ee;font-weight:700}
button{cursor:pointer;background:#152c42;color:#bdeeff;border:1px solid #385676;border-radius:8px;padding:7px 10px}
@media(max-width:850px){.metrics{grid-template-columns:repeat(2,1fr)}.main{grid-template-columns:1fr}body{padding:14px}}
</style></head><body><header><div class="kicker">MINECRAFT AIBUILDER · B88 · OFFLINE INSPECTOR</div>
<h1>フロア廊下網とドア配置の診断</h1><div class="sub">5棟・30階の名目廊下と室内空間を表示。本番Planner最終ブロックを使った局所判定で、残る18室はすべてHOLD。<strong>施工データではなく、避難経路の適合性も証明しません。</strong></div></header>
<section class="metrics"><div class="metric"><span>既存の未承認候補</span><b id="mOld">296</b><span>施工できる室数ではありません</span></div>
<div class="metric"><span>B88新規候補</span><b id="mNew">0</b><span>厳格な本番ブロック保護</span></div>
<div class="metric"><span>保留室</span><b id="mHeld">18</b><span>共通パターン別に再設計</span></div>
<div class="metric"><span>名目廊下の連結成分</span><b id="mComponents">48</b><span>実際の歩行可能性とは別</span></div></section>
<section class="main"><div class="panel"><div class="bar"><h2>フロア図</h2><select id="floor" aria-label="階を選択"></select></div>
<canvas id="map" width="950" height="750"></canvas>
<div class="legend"><span><i class="dot" style="background:#244562"></i>名目廊下</span><span><i class="dot" style="background:#4e7d9e"></i>部屋</span><span><i class="dot" style="background:#e69c48"></i>HOLD室</span><span><i class="dot" style="background:#79cea7"></i>階段</span><span><i class="dot" style="background:#a89cec"></i>エレベーター</span></div>
<div id="floorStats" class="notice"></div><div id="hover" class="sub" style="margin-top:10px">セルにマウスを重ねると座標を確認できます。</div></div>
<div class="panel"><h2>選択階の保留室</h2><div id="held" class="rooms"></div>
<h2 style="margin-top:22px">18室の境界検証</h2><table class="table"><tbody id="reasons"></tbody></table>
<h2 style="margin-top:22px">共通間取りの再設計</h2><div id="archetypes" class="rooms"></div></div></section>
<script>'''+ 'const DATA='+data+';'+'''
const floor=document.getElementById('floor'),canvas=document.getElementById('map'),ctx=canvas.getContext('2d');
const ids=DATA.sections.map(x=>x.id);for(const id of ids){const o=document.createElement('option');o.textContent=id;o.value=id;floor.append(o)}
const tone={room:'#456b86',hold:'#dd9549',corridor:'#284a67',stairs:'#53b59d',elevators:'#a497e0'};
const k=p=>p.x+','+p.z;
const box={left:34,top:34,size:24};let current=DATA.sections[0];
function draw(){current=DATA.sections.find(x=>x.id===floor.value)||DATA.sections[0];
 ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#0b1526';ctx.fillRect(0,0,canvas.width,canvas.height);
 const w=current.width,d=current.depth,cell=Math.min((canvas.width-80)/w,(canvas.height-80)/d,29),x0=Math.round((canvas.width-cell*w)/2),y0=Math.round((canvas.height-cell*d)/2);
 box.left=x0;box.top=y0;box.size=cell;
 function rect(x,z,color){ctx.fillStyle=color;ctx.fillRect(x0+x*cell+.8,y0+z*cell+.8,cell-1.6,cell-1.6)}
 for(let z=0;z<d;z++)for(let x=0;x<w;x++)if(current.floorMaskRows[z][x]==='1')rect(x,z,'#192a3f');
 for(const p of current.corridors)rect(p.x,p.z,tone.corridor);
 for(const r of current.rooms){const held=current.held.some(a=>a.roomId===r.id);for(let z=r.z;z<r.z+r.depth;z++)for(let x=r.x;x<r.x+r.width;x++)rect(x,z,held?tone.hold:tone.room)}
 for(const p of current.stairs)rect(p.x,p.z,tone.stairs);for(const p of current.elevators)rect(p.x,p.z,tone.elevators);
 ctx.strokeStyle='rgba(216,231,255,.13)';ctx.lineWidth=1;
 for(let x=0;x<=w;x++){ctx.beginPath();ctx.moveTo(x0+x*cell,y0);ctx.lineTo(x0+x*cell,y0+d*cell);ctx.stroke()}
 for(let z=0;z<=d;z++){ctx.beginPath();ctx.moveTo(x0,y0+z*cell);ctx.lineTo(x0+w*cell,y0+z*cell);ctx.stroke()}
 ctx.font=`${Math.max(10,Math.min(13,cell*.48))}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';
 for(let i=0;i<current.rooms.length;i++){const r=current.rooms[i],held=current.held.some(a=>a.roomId===r.id);ctx.fillStyle=held?'#291609':'#e8f1fc';ctx.fillText(r.id.split('R').pop(),x0+(r.x+r.width/2)*cell,y0+(r.z+r.depth/2)*cell)}
 document.getElementById('floorStats').textContent=`名目廊下 ${current.corridors.length}セル / 連結成分 ${current.components.length}（縦動線予約に隣接: ${current.components.filter(c=>c.coreAdjacent).length}）/ 部屋 ${current.rooms.length}室 / HOLD ${current.held.length}室。廊下と縦動線が隣接しても、物理的な通行・出口到達を保証しません。`;
 document.getElementById('held').innerHTML=current.held.length?current.held.map(h=>`<div class="entry"><b>${h.roomId}</b><span class="pill">HOLD</span><div>外周候補 ${h.diagnostics.edgeCount} / 開口競合 ${h.diagnostics.doorBlocked} / 枠問題 ${h.diagnostics.noFrame} / 室内空間 ${h.diagnostics.noInteriorCore+h.diagnostics.noSwing} / 経路 ${h.diagnostics.noCorridorRoute}</div></div>`).join(''):'<div class="sub">この階にB87からの保留室はありません。</div>';
}
floor.addEventListener('change',draw);floor.value=ids[0];draw();
canvas.addEventListener('mousemove',ev=>{const b=canvas.getBoundingClientRect(),x=Math.floor((ev.clientX-b.left)*canvas.width/b.width-box.left)/box.size,z=Math.floor((ev.clientY-b.top)*canvas.height/b.height-box.top)/box.size;
 const X=Math.floor(x),Z=Math.floor(z);if(X<0||Z<0||X>=current.width||Z>=current.depth)return;
 const rr=current.rooms.find(r=>X>=r.x&&X<r.x+r.width&&Z>=r.z&&Z<r.z+r.depth);
 document.getElementById('hover').textContent=`ローカルセル (${X},${Z}) / ${rr?'部屋 '+rr.id:current.corridors.some(p=>p.x===X&&p.z===Z)?'名目廊下':'その他床・外形'} ※ Minecraftのワールド座標ではありません`;
});
const reasons={occupiedReservation:'床・他室・既存予約',doorBlocked:'ドア開口のブロック競合',noFrame:'左右の枠',noSwing:'開き空間',noInteriorCore:'室内空間・経路',noCorridorRoute:'廊下接続'};
const counts=Object.fromEntries(Object.keys(reasons).map(k=>[k,DATA.backlog.reduce((n,v)=>n+(v.firstFailureBoundaries[k]||0),0)]));
document.getElementById('reasons').innerHTML=Object.entries(reasons).map(([k,v])=>`<tr><td>${v}</td><td>${counts[k]}</td></tr>`).join('');
document.getElementById('archetypes').innerHTML=DATA.backlog.map(p=>`<div class="entry"><b>${p.pattern}</b> <span class="pill">${p.affectedRoomCount}室</span><div>階: ${p.repeatedFloors.join(', ')} / 主な初回拒否: <span class="tag">${reasons[p.dominantClass]||p.dominantClass}</span></div></div>`).join('');
document.getElementById('mOld').textContent=DATA.totals.previousUnapprovedLocalCandidates;
document.getElementById('mNew').textContent=DATA.totals.networkResolvedProposalOnly;
document.getElementById('mHeld').textContent=DATA.totals.remainingHeld;
document.getElementById('mComponents').textContent=DATA.totals.namedCorridorComponents;
</script></body></html>'''
(P/'B88_OFFLINE_CORRIDOR_REVIEW.html').write_text(body)
print('Viewer bytes',len(body.encode()),'patterns',len(backlog),'floors',len(viewer),'hold',summary['totalHeldRooms'])
