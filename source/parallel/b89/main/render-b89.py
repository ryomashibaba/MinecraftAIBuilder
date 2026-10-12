#!/usr/bin/env python3
"""Create a self-contained offline 30-floor visualization from frozen concept and B89 reports only."""
import json, pathlib, html
here=pathlib.Path(__file__).resolve().parent
root=here.parents[2]
load=lambda name: json.loads((root/name).read_text())
b66=load('parallel/b66/main/B66_LOCAL_3D_ASSEMBLY.json')
b89=load('parallel/b89/main/B89_FLOOR_ZONING_REPORT.json')
b88=load('parallel/b88/main/B88_CORRIDOR_NETWORK_REPORT.json')
by={s['id']:s for s in b89['sections']}
prior={s['id']:s for s in b88['sections']}
sections=[]
for sh in b66['sections']:
 id=sh['id']; z=by.get(id)
 sections.append({'id':id,'level':sh['level'],'floorMaskRows':sh['floorMaskRows'],
  'rooms':sh['conceptRooms'],'corridors':sh['conceptReservations']['corridors'],
  'stairs':sh['conceptReservations']['stairs'],'elevators':sh['conceptReservations']['elevators'],
  'held':[] if z is None else [{'roomId':r['roomId'],'selected':r['selected'],'conditional':r['conditionalProductionRedesigns'][:1],
   'reason':r['rejectionSummary'],'variants':r['totalConditionalVariants']} for r in z['rooms']]})
data=json.dumps({'sections':sections,'totals':b89['totals'],'sourceSha256':b89['reportSha256']},ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')
page=r'''<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>B89 · Floor Zoning Review</title><style>
:root{font-family:ui-sans-serif,system-ui,"Yu Gothic",sans-serif;color-scheme:dark;background:#0a1222;color:#e4eefa}body{margin:0;padding:20px;max-width:1250px;margin:auto}h1{font-size:clamp(24px,3vw,34px);margin:0 0 6px}p{line-height:1.65;color:#b7c8e4}.top{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap}.panel{background:#152338;border:1px solid #304766;border-radius:14px;padding:16px;margin:12px 0}.labels{display:flex;gap:18px;flex-wrap:wrap;font-size:14px}.dot{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:5px}.controls{display:flex;align-items:center;gap:12px;flex-wrap:wrap}select{font-size:15px;background:#0e1d31;color:white;border:1px solid #4b678a;border-radius:9px;padding:9px}canvas{background:#07111e;border-radius:12px;width:100%;height:auto;image-rendering:pixelated;cursor:crosshair}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#0b182b;border-radius:9px;padding:12px;max-height:420px;overflow-y:auto;font:13px ui-monospace,Consolas,monospace}.stat{background:#102842;border-radius:8px;padding:10px;min-width:130px}.stats{display:flex;gap:12px;flex-wrap:wrap}.big{font-size:23px;font-weight:700}.muted{color:#95abc6;font-size:12px}</style></head><body>
<header class="top"><div><h1>MinecraftAIBuilder B89</h1><p>Floor-Wide Room & Corridor Zoning · オフライン未承認レビュー</p></div><div class="muted">Minecraftとの接続なし・施工命令なし・NOT_PREPARED</div></header>
<div class="stats panel" id="stats"></div><div class="panel"><div class="controls"><label>対象フロア <select id="floor"></select></label><label>表示 <select id="layer"><option value="floor">元の名目間取り</option><option value="conditional">条件付き再設計案</option></select></label><span class="muted" id="position"></span></div><div class="labels" style="margin:15px 0"><span><i class="dot" style="background:#256f9c"></i>名目廊下</span><span><i class="dot" style="background:#4b6389"></i>部屋</span><span><i class="dot" style="background:#eb5c71"></i>保留18室</span><span><i class="dot" style="background:#e9b352"></i>条件付き室案</span><span><i class="dot" style="background:#6cdda0"></i>階段・昇降機予約</span><span><i class="dot" style="background:#c37bf2"></i>本番ブロック干渉</span></div><canvas id="map" width="1120" height="680" aria-label="フロア区画・廊下可視化"></canvas><p class="muted">座標は各フロアのローカル概念格子です。通行幅、避難経路、Bedrockドアの動作、建築可能性を証明するものではありません。</p></div>
<div class="panel"><h2 style="font-size:17px;margin-top:0">保留室・条件付き候補の詳細</h2><div id="details"></div><p class="muted">右図は施工指示ではありません。紫のセルに位置する本番ブロックの除去・移設は承認されていません。</p></div>
<script>const DATA=__DATA__;
const $=id=>document.getElementById(id);let current=null;const cell=22;
function render(){const s=DATA.sections.find(x=>x.id===$('floor').value);if(!s)return;current=s;const c=$('map'),ctx=c.getContext('2d');const W=s.floorMaskRows[0].length,H=s.floorMaskRows.length;const scale=Math.min(31,Math.floor(Math.min(1080/W,620/H)));const offX=Math.floor((1120-W*scale)/2),offZ=Math.floor((680-H*scale)/2);
ctx.clearRect(0,0,1120,680);ctx.fillStyle='#09182b';ctx.fillRect(0,0,1120,680);const paint=(p,col)=>{ctx.fillStyle=col;ctx.fillRect(offX+p.x*scale+1,offZ+p.z*scale+1,scale-2,scale-2)};
for(let z=0;z<H;z++)for(let x=0;x<W;x++)paint({x,z},s.floorMaskRows[z][x]==='1'?'#1f314e':'#0a1021');s.corridors.forEach(p=>paint(p,'#256f9c'));
for(const r of s.rooms)for(let z=r.z;z<r.z+r.depth;z++)for(let x=r.x;x<r.x+r.width;x++)paint({x,z},'#4b6389');
for(const r of s.held){const room=s.rooms.find(p=>p.id===r.roomId);if(!room)continue;for(let z=room.z;z<room.z+room.depth;z++)for(let x=room.x;x<room.x+room.width;x++)paint({x,z},'#e25b70');}
if($('layer').value==='conditional')for(const r of s.held){const opt=r.conditional[0];if(!opt)continue;const p=opt.proposedRoom;for(let z=p.z;z<p.z+p.depth;z++)for(let x=p.x;x<p.x+p.width;x++)paint({x,z},'#e9b352');for(const k of opt.productionContacts)paint(k,'#c37bf2');}
[...s.stairs,...s.elevators].forEach(p=>paint(p,'#6cdda0'));
ctx.font=`${Math.max(9,Math.round(scale*.39))}px ui-monospace,monospace`;ctx.textAlign='center';ctx.textBaseline='middle';for(const r of s.rooms){const h=s.held.some(x=>x.roomId===r.id);ctx.fillStyle=h?'#fff':'#d7e4f8';ctx.fillText(r.id.split('-R').pop(),offX+(r.x+r.width/2)*scale,offZ+(r.z+r.depth/2)*scale)}
$('position').textContent=`${s.id} | 名目部屋 ${s.rooms.length} / 保留 ${s.held.length}`;
const rows=s.held.map(r=>{const opt=r.conditional[0];return `<div class="panel" style="margin:8px 0;background:#0e1c30"><strong>${escapeHTML(r.roomId)}</strong> · HOLD · 条件付き検討案 ${r.variants}件<br>${opt?`<span style="color:#efbd73">仮想変更: 室 ${opt.proposedRoom.width}×${opt.proposedRoom.depth}、元の面積比 ${Math.round(opt.areaRatio*100)}%、本番占有 ${opt.contactCount}ブロック、分類 ${escapeHTML(opt.interventionClasses.join(', '))}</span>`:'<span style="color:#f0a4b0">保護条件をすべて満たす変更案なし</span>'}<details><summary>拒否数・座標を見る</summary><pre>${escapeHTML(JSON.stringify({rejectionSummary:r.reason,firstConditional:opt},null,2))}</pre></details></div>`});
$('details').innerHTML=rows.length?rows.join(''):'このフロアにB89対象の保留室はありません。既存設計候補は変更していません。';
}
function escapeHTML(v){return String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')}
const t=DATA.totals;for(const [label,value] of [['既存候補（未承認）',t.previousUnapprovedLocalCandidates],['新規・無変更候補',t.newlyReviewableFloorZoningOptions],['保留室',t.remainingHeldRooms],['条件付き再設計案（未採用）',t.conditionalArchitecturalRedesignRoomsNotAdopted]])$('stats').insertAdjacentHTML('beforeend',`<div class="stat"><div class="big">${value}</div><div class="muted">${label}</div></div>`);
for(const s of DATA.sections){const opt=document.createElement('option');opt.value=s.id;opt.textContent=s.id.replace('/candidate-01','');$('floor').appendChild(opt)}$('floor').value='office/candidate-01/L3';$('floor').addEventListener('change',render);$('layer').addEventListener('change',render);render();
</script></body></html>'''
page=page.replace('__DATA__',data)
(here/'B89_FLOOR_ZONING_REVIEW.html').write_text(page)
print('html',len(page.encode()),'sections',len(sections))
