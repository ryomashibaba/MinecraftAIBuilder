#!/usr/bin/env python3
"""Create standalone Japanese 30-floor offline concept viewer. No browser/network dependencies."""
from pathlib import Path
import json,html
here=Path(__file__).resolve().parent
parallel=here.parents[1]
report=json.loads((here/'B94_BUILDING_COMPOSITION_REPORT.json').read_text())
sections=json.loads((parallel/'b66/main/B66_LOCAL_3D_ASSEMBLY.json').read_text())['sections']
prior=json.loads((parallel/'b93/main/B93_ALTERNATE_PROGRAMME_REPORT.json').read_text())
held={f['sectionId']:[g['roomId'] for g in f['roomGraph']] for f in prior['floors']}
reduced=[]
for s in sections:
 reduced.append({'id':s['id'],'level':s['level'],'floorMaskRows':s['floorMaskRows'],
 'rooms':s['conceptRooms'],'corridors':s['conceptReservations']['corridors'],
 'stairs':s['conceptReservations']['stairs'],'elevators':s['conceptReservations']['elevators'],
 'held':held.get(s['id'],[])})
data={'buildings':report['buildings'],'sections':reduced,'totals':report['totals']}
payload=json.dumps(data,ensure_ascii=False,separators=(',',':')).replace('</','<\\/')
view=r'''<!doctype html><html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>MinecraftAIBuilder B94｜建物全体の構成比較（非施工）</title>
<style>*{box-sizing:border-box}body{margin:0;background:#0b1220;color:#e5edf7;font:15px/1.55 system-ui,-apple-system,"Yu Gothic",sans-serif}
header{padding:20px 26px;background:#111e31;border-bottom:1px solid #263d56}h1{margin:0 0 5px;font-size:22px}h2{font-size:17px;margin:0 0 10px}.muted{color:#9caec6}.pill{display:inline-block;border:1px solid #51647e;color:#d5e3f3;border-radius:16px;padding:2px 9px;font-size:12px}
main{padding:20px;display:grid;grid-template-columns:minmax(320px,1fr) minmax(325px,430px);gap:18px;max-width:1400px;margin:auto}
.panel{background:#121e2e;border:1px solid #293a50;border-radius:12px;padding:17px;margin-bottom:16px}
.controls{display:flex;gap:10px;flex-wrap:wrap;margin:10px 0 15px}label{font-size:13px;color:#aabbd0}select{display:block;width:100%;min-width:145px;border-radius:7px;padding:9px;background:#0b192b;color:#f1f5f9;border:1px solid #46617d}
canvas{width:100%;max-height:600px;aspect-ratio:1.25;border-radius:8px;background:#091423}.legend{display:flex;flex-wrap:wrap;gap:11px;font-size:12px;color:#bbcadd;padding-top:10px}.sw{display:inline-block;width:11px;height:11px;margin-right:5px;border-radius:2px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.metric{background:#0a192a;border:1px solid #26384c;padding:12px;border-radius:8px}.metric strong{font-size:25px;display:block;color:#eaf6fe}.metric small{color:#9fb2c6}
.branch{padding:12px;margin:8px 0;background:#0c1a2c;border-left:3px solid #648cbb;border-radius:6px}.branch b{display:block}.branch small{color:#a5b9cf}
.note{border-top:1px solid #30405a;padding-top:12px;font-size:13px}.tag{color:#e4c692}.id{font:12px ui-monospace,monospace;color:#9cc4e9;word-break:break-word}
@media(max-width:850px){main{display:block}}@media(prefers-color-scheme:light){body{background:#edf2f8;color:#152238}.panel{background:white}header{background:#dce7f5}.metric,.branch{background:#edf4fa}label{color:#374559}select{color:#121b29;background:white}.note{color:#304358}}
</style></head><body><header><h1>B94｜建物全体の外殻・区画・共用コア設計</h1><div class="muted">5棟・30階／オフライン検査。凍結Plannerの原本変更なし。新建築案はすべて未承認・施工不可。</div><span class="pill">NOT_PREPARED</span> <span class="pill">9 GATES BLOCKED</span></header>
<main><section><div class="panel"><h2>フロアマップ</h2><div class="controls"><label>建物<select id="building"></select></label><label>階層<select id="floor"></select></label><label>表示する比較枝<select id="mode"><option value="baseline">原構成</option><option value="service">保留室を共用区画へ転用（未承認）</option><option value="shaft">2×2縦動線コア候補（未承認）</option><option value="reset">建物一体で再設計（設計方針のみ）</option></select></label></div>
<canvas id="plan" width="780" height="560" aria-label="建物階の概念平面図"></canvas><div class="legend"><span><i class="sw" style="background:#365977"></i>既存の名目室</span><span><i class="sw" style="background:#f4b65c"></i>18保留室</span><span><i class="sw" style="background:#3c7587"></i>既存名目廊下</span><span><i class="sw" style="background:#a684de"></i>階段・昇降機予約</span><span><i class="sw" style="background:#22d3a9"></i>新コアの検査通過位置（未施工）</span></div></div>
<div class="panel"><h2>表示について</h2><p id="floorDescription" class="muted"></p><p class="note">縦動線コア候補の「空き」は各階の2〜3ブロック高で本番ブロックとの衝突が見つからないという限定的な結果です。階床・屋根を貫通する許可、階段・昇降機の動作、出口までの避難は未検証です。</p></div></section>
<aside><div class="panel"><h2>建物ごとの評価</h2><div class="grid" id="metrics"></div><div id="shaftDetail"></div></div><div class="panel"><h2>4種類の建物構成案</h2><div id="branches"></div></div><div class="panel"><h2>保護条件</h2><p class="tag">実施工・世界接続・本番ソース変更を一切実施しません。</p><p class="note">以前の296室は未承認の設計候補です。廊下への転用は独立した室数を減らします。主要壁・ガラス・既存の建築部材を変更する案は別途承認が必要です。</p></div></aside></main>
<script id="embedded-data" type="application/json">__DATA__</script><script>
'use strict';const data=JSON.parse(document.getElementById('embedded-data').textContent);
const bSel=document.getElementById('building'),fSel=document.getElementById('floor'),mode=document.getElementById('mode');
const human={"hotel/candidate-01":"ホテル01","apartment/candidate-01":"集合住宅01","office/candidate-01":"オフィス01","office/candidate-02":"オフィス02","office/candidate-03":"オフィス03"};
for(const b of data.buildings){let o=document.createElement('option');o.value=b.buildingId;o.textContent=human[b.buildingId]||b.buildingId;bSel.append(o)}
bSel.value='apartment/candidate-01';
function floorList(){const old=fSel.value;fSel.innerHTML='';const floors=data.sections.filter(s=>s.id.startsWith(bSel.value+'/'));for(const s of floors){let o=document.createElement('option');o.value=s.id;o.textContent=`${s.level}階`;fSel.append(o)}fSel.value=floors.some(s=>s.id===old)?old:floors[0].id;draw()}
function draw(){const b=data.buildings.find(b=>b.buildingId===bSel.value),s=data.sections.find(s=>s.id===fSel.value);
 if(!s)return;const canvas=document.getElementById('plan'),ctx=canvas.getContext('2d'),W=s.floorMaskRows[0].length,H=s.floorMaskRows.length;
 ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#071320';ctx.fillRect(0,0,canvas.width,canvas.height);
 const cell=Math.min((canvas.width-40)/W,(canvas.height-50)/H),ox=Math.floor((canvas.width-cell*W)/2),oz=Math.floor((canvas.height-cell*H)/2);
 const rect=(x,z,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(ox+x*cell+.5,oz+z*cell+.5,w*cell-1,h*cell-1)};
 for(let z=0;z<H;z++)for(let x=0;x<W;x++){if(s.floorMaskRows[z][x]==='1')rect(x,z,1,1,'#1d344b');}
 for(const p of s.corridors)rect(p.x,p.z,1,1,'#3c7587');
 for(const r of s.rooms){let c=s.held.includes(r.id)?'#d99544':'#365977';if(mode.value==='service'&&s.held.includes(r.id))c='#94794e';rect(r.x,r.z,r.width,r.depth,c)}
 for(const p of [...s.stairs,...s.elevators])rect(p.x,p.z,1,1,'#a684de');
 if(mode.value==='shaft'&&b.verticalCoreSearch?.top?.length){let top=b.verticalCoreSearch.top[0];for(const p of top.localColumnSites)rect(p.x,p.z,1,1,'#22d3a9')}
 if(mode.value==='reset'){ctx.save();ctx.strokeStyle='#badeff';ctx.lineWidth=3;ctx.setLineDash([7,7]);ctx.strokeRect(ox+3,oz+3,W*cell-6,H*cell-6);ctx.restore()}
 ctx.font=`${Math.max(9,Math.min(cell*.36,16))}px ui-monospace,monospace`;ctx.fillStyle='#f9f9f9';ctx.textAlign='center';ctx.textBaseline='middle';
 for(const r of s.rooms){if(r.width>=3&&r.depth>=3)ctx.fillText(r.id.split('-').at(-1),(ox+(r.x+r.width/2)*cell),(oz+(r.z+r.depth/2)*cell))}
 let extra='';if(mode.value==='shaft')extra=b.verticalCoreSearch?.top?.length?'緑＝位置・2高廊下の部分検査を通過。上下床の開口は禁止。':'本番ブロックまで確認した新コア候補は未検出、または当該棟は本番Plannerの全量再照合対象外。';
 if(mode.value==='service')extra='橙色の保留室を共用サービス区画に再分類する比較案。居室数を減らすだけで実際の動線成立は未認証。';
 if(mode.value==='reset')extra='原本の床マスクと外殻を参照する別建物再設計の方針。図中の破線は建築変更を表す施工位置ではありません。';
 document.getElementById('floorDescription').textContent=`${s.id} — 名目室 ${s.rooms.length}・保留室 ${s.held.length}。${extra}`;
 document.getElementById('metrics').innerHTML=[['名目室数',b.reference.originalNominalRoomCount],['保留室数',b.affectedHeldRooms],['保留対象面積',b.heldProgrammeArea+' セル'],['新規承認室',0]].map(([n,v])=>`<div class="metric"><small>${n}</small><strong>${v}</strong></div>`).join('');
 const sh=b.verticalCoreSearch;
 document.getElementById('shaftDetail').innerHTML=sh?`<p class="note"><b>縦動線2×2候補：</b>候補位置探索 ${sh.checked}件。ブロック・窓・既存候補と衝突しない位置 ${sh.strictEmptyFootprints}か所。表示可能な優先候補は ${sh.top.length}か所。<br><span class="tag">物理的に階を貫通する構造物としての承認：0件</span></p>`:'<p class="note">この建物では新コアの本番ブロック照合を実施していません。名目間取りによる比較のみです。</p>';
 const names=['元の建物構成を保持','保留室を共用サービス空間へ転用','縦にそろった新コア位置の検討','外殻と室構成を一体で再生成'];
 document.getElementById('branches').innerHTML=b.alternatives.map((a,i)=>`<div class="branch"><b>${i+1}. ${names[i]}</b><small>独立室数（構想）：${a.claimedIndependentRoomCount??'新計画未定'}。判定：${a.qualityStatus}。施工・完成認定なし。</small></div>`).join('');
}
bSel.addEventListener('change',floorList);fSel.addEventListener('change',draw);mode.addEventListener('change',draw);floorList();
</script></body></html>'''
(here/'B94_BUILDING_COMPOSITION_REVIEW.html').write_text(view.replace('__DATA__',payload),encoding='utf-8')
print('wrote html', (here/'B94_BUILDING_COMPOSITION_REVIEW.html').stat().st_size)
