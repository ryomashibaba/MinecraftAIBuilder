"""Self-contained local-only 2D review, no execution/network/navigation to Minecraft."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[3]
here=Path(__file__).resolve().parent
report=json.loads((here/'B87_STRUCTURAL_FREE_REPORT.json').read_text())
b66=json.loads((root/'parallel/b66/main/B66_LOCAL_3D_ASSEMBLY.json').read_text())
shapes={s['id']:s for s in b66['sections']}
sections=[]
for s in report['sections']:
 sh=shapes[s['id']]
 sections.append(dict(id=s['id'],level=s['level'],floorMaskRows=sh['floorMaskRows'],rooms=sh['conceptRooms'],corridors=sh['conceptReservations']['corridors'],
   new=[dict(roomId=r['roomId'],room=r['selected']['doorRoomCell'],hall=r['selected']['doorHallCell'],sourceRisk=r['selected']['sourceB86RiskClass'],jambs=r['selected']['existingWallJambEvidence'],
   retained=r['selected']['retainedRoomAreaRatio'],oldOpeningReview=r['selected'].get('requiresOldOpeningReview',False)) for r in s['rooms'] if r['selected']],
   held=[r['roomId'] for r in s['rooms'] if not r['selected']]))
payload=json.dumps({'totals':report['totals'],'sections':sections},separators=(',',':'),ensure_ascii=False).replace('</','<\\/')
html='''<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>B87 建築設計レビュー — 既存壁をそのまま活用</title>
<style>:root{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color-scheme:dark;background:#101827;color:#e6edf8}
body{max-width:1140px;margin:30px auto;padding:0 16px}h1{font-size:28px;margin:0 0 8px}p{line-height:1.6;color:#c8d6e8}h2{font-size:17px}
.header{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.pill{font-size:12px;background:#313f52;padding:6px 12px;border-radius:20px}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:20px 0}.stat,.panel{background:#172336;border:1px solid #2b3d55;border-radius:14px;padding:14px}
.stat strong{display:block;font-size:25px;margin-bottom:3px;color:#aeeccc}.stat small{color:#aab9cc}
main{display:grid;grid-template-columns:minmax(0,2fr) minmax(260px,1fr);gap:16px}.control{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0}
select{padding:9px 12px;border-radius:7px;background:#243249;color:#fff;border:1px solid #4e6383;min-width:170px}
canvas{width:100%;max-height:660px;aspect-ratio:1;border:1px solid #3e5473;background:#0d1522;border-radius:9px}
.legend{display:flex;flex-wrap:wrap;gap:12px;color:#d1d9e6;font-size:12px;margin:10px 0}.swatch{display:inline-block;width:11px;height:11px;margin-right:4px;vertical-align:middle;border-radius:2px}
.note{font-size:12px;color:#b9c9da;border-top:1px solid #31415a;padding-top:12px;margin-top:14px}
.room{border-bottom:1px solid #35475e;padding:9px 0;font-size:14px}.room small{display:block;color:#b6cbe0;margin-top:3px}
@media(max-width:820px){main{grid-template-columns:1fr}.stats{grid-template-columns:repeat(2,1fr)}}
</style></head><body><div class="header"><h1>B87 建築・室内配置レビュー</h1><span class="pill">非施工・未承認</span></div>
<p>既存の壁を削らずドア枠として活用するB87の提案を、5棟・30階から選んで確認できます。水色は二次壁、緑は既存の主要壁をそのまま横枠に利用する案です。</p>
<div class="stats"><div class="stat"><strong>9</strong><small>既存壁を活用した設計候補</small></div><div class="stat"><strong>6</strong><small>主要壁の置換を回避</small></div><div class="stat"><strong>27</strong><small>既存壁ブロックを保持</small></div><div class="stat"><strong>18</strong><small>引き続き保留</small></div></div>
<div class="control"><label>建物と階 <select id="select"></select></label></div>
<main><section class="panel"><canvas id="map" width="760" height="760"></canvas><div class="legend">
<span><i class="swatch" style="background:#31516a"></i>部屋</span><span><i class="swatch" style="background:#c4a76d"></i>名目廊下</span>
<span><i class="swatch" style="background:#a5f36b"></i>主要壁を再利用</span><span><i class="swatch" style="background:#65d9ff"></i>二次壁を再利用</span>
<span><i class="swatch" style="background:#fc868c"></i>保留室</span></div></section>
<aside class="panel"><h2 id="selectedName">階の概要</h2><div id="results"></div><p class="note">これはローカル座標によるオフライン形状レビューです。本番ブロック変更ゼロでも、ドアの蝶番・通路幅・旧開口・建物全体の安全性は未検証です。施工命令、世界座標、通信機能は含みません。</p></aside></main>
<script id="data" type="application/json">__DATA__</script><script>
const payload=JSON.parse(document.getElementById('data').textContent),select=document.getElementById('select'),c=document.getElementById('map'),ctx=c.getContext('2d'),res=document.getElementById('results');
for(const [i,s] of payload.sections.entries()){const o=document.createElement('option');o.value=i;o.textContent=s.id;select.appendChild(o);}
const escapeHtml=x=>String(x).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
function draw(){const s=payload.sections[Number(select.value)||0],rows=s.floorMaskRows,w=rows[0].length,h=rows.length,step=Math.min(730/w,730/h),left=(760-w*step)/2,top=(760-h*step)/2;
ctx.fillStyle='#0d1522';ctx.fillRect(0,0,760,760);
const rect=(x,z,color,pad=0)=>{ctx.fillStyle=color;ctx.fillRect(left+x*step+pad,top+z*step+pad,step-2*pad,step-2*pad)};
for(let z=0;z<h;z++)for(let x=0;x<w;x++)if(String(rows[z][x])==='1')rect(x,z,'#203248',0.8);
for(const r of s.rooms)for(let z=r.z;z<r.z+r.depth;z++)for(let x=r.x;x<r.x+r.width;x++)rect(x,z,'#31516a',1.5);
for(const p of s.corridors)rect(p.x,p.z,'#c4a76d',1.6);
for(const r of s.rooms){ctx.fillStyle='#c6d9ec';ctx.font=`${Math.max(8,step*.35)}px system-ui`;ctx.textAlign='center';ctx.fillText(r.id.replace(/^F\\d+-/,''),left+(r.x+r.width/2)*step,top+(r.z+r.depth/2)*step+2);}
for(const candidate of s.new){let color=candidate.sourceRisk.includes('PRIMARY')?'#a5f36b':'#65d9ff';for(const p of candidate.jambs){ctx.strokeStyle=color;ctx.lineWidth=Math.max(2,step*.10);ctx.strokeRect(left+p.x*step+3,top+p.z*step+3,step-6,step-6);}rect(candidate.room.x,candidate.room.z,color,3);}
for(const heldId of s.held){const r=s.rooms.find(v=>v.id===heldId);if(r){ctx.strokeStyle='#fc868c';ctx.lineWidth=2;ctx.strokeRect(left+r.x*step+1,top+r.z*step+1,r.width*step-2,r.depth*step-2);}}
document.getElementById('selectedName').textContent=s.id;res.innerHTML=`<div class="room">既存壁再利用: <b>${s.new.length}室</b><small>保留 ${s.held.length}室</small></div>`+s.new.map(x=>`<div class="room"><b>${escapeHtml(x.roomId)}</b><small>${x.sourceRisk.includes('PRIMARY')?'既存の主要壁（コンクリート）を保持':'既存の二次壁を保持'} / 横枠3ブロック</small><small>ドア候補 (${x.room.x}, ${x.room.z}) ・ 面積維持 ${Math.round(100*x.retained)}%</small></div>`).join('')+s.held.map(x=>`<div class="room">${escapeHtml(x)} <small>設計保留 — 施工不可</small></div>`).join('');}
select.addEventListener('change',draw);select.value='0';draw();
</script></body></html>'''
(here/'B87_REVIEW.html').write_text(html.replace('__DATA__',payload),encoding='utf-8')
print('viewer', (here/'B87_REVIEW.html').stat().st_size)
