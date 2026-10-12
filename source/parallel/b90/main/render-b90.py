#!/usr/bin/env python3
"""B90 standalone read-only 30-floor zoning/floor-program viewer."""
import json,pathlib
here=pathlib.Path(__file__).resolve().parent
root=here.parents[2]
load=lambda n:json.loads((root/n).read_text())
b66=load('parallel/b66/main/B66_LOCAL_3D_ASSEMBLY.json')
b90=load('parallel/b90/main/B90_PROGRAM_ZONING_REPORT.json')
by={}
for r in b90['rooms']:by.setdefault(r['sectionId'],[]).append(r)
sections=[]
for s in b66['sections']:
 sections.append({'id':s['id'],'floorMaskRows':s['floorMaskRows'],'rooms':s['conceptRooms'],
 'corridors':s['conceptReservations']['corridors'],'stairs':s['conceptReservations']['stairs'],
 'elevators':s['conceptReservations']['elevators'],'held':by.get(s['id'],[])})
data=json.dumps({'sections':sections,'patterns':b90['patterns'],'totals':b90['totals'],'reportSha256':b90['reportSha256']},ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')
page=r'''<!doctype html><html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>B90 建築区画・用途再編ビューア</title><style>
:root{color-scheme:dark;font:14px system-ui,'Yu Gothic',sans-serif;background:#0c1424;color:#e5edf8}body{margin:0 auto;padding:22px;max-width:1250px;line-height:1.55}h1{font-size:27px;margin:0}h2{font-size:17px;margin:0 0 10px}p{color:#b5c5db}.small{font-size:12px;color:#9db0cd}.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:10px;margin:18px 0}.stat,.panel{background:#162338;border:1px solid #2e415d;border-radius:13px;padding:14px}.stat b{display:block;font-size:23px;color:#fff}select{font:inherit;padding:9px;background:#0b1b2f;color:#fff;border:1px solid #4e6b91;border-radius:8px}.grid{display:grid;grid-template-columns:minmax(0,1.8fr) minmax(270px,1fr);gap:14px}@media(max-width:850px){.grid{grid-template-columns:1fr}}canvas{display:block;width:100%;height:auto;background:#0a1526;border-radius:9px;image-rendering:pixelated}.controls,.legend{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-bottom:12px}.legend{font-size:12px;color:#cad6e7}.legend i{width:11px;height:11px;display:inline-block;border-radius:3px;vertical-align:middle;margin-right:4px}pre{white-space:pre-wrap;word-break:break-word;font:12px ui-monospace,monospace;max-height:440px;overflow:auto;background:#0a192a;border-radius:8px;padding:10px}.item{background:#102039;border:1px solid #2f476a;border-radius:8px;padding:10px;margin:8px 0}summary{cursor:pointer}footer{margin-top:18px;color:#92a5c1}a{color:#95c9ff}</style></head><body>
<h1>MinecraftAIBuilder B90 — フロア用途再編</h1><p>全30階の名目間取りと、18保留室に対するオフライン接続境界・ブロック干渉・用途変更の検討案。すべて未承認です。</p><div id="stats" class="stats"></div>
<div class="grid"><section class="panel"><div class="controls"><label>階を選択 <select id="floor"></select></label><label>表示 <select id="view"><option value="slots">ドア接続境界</option><option value="blocks">本番ブロックとの衝突</option><option value="base">元の間取り</option></select></label></div>
<div class="legend"><span><i style="background:#287caf"></i>名目廊下</span><span><i style="background:#53688a"></i>通常室</span><span><i style="background:#e6657b"></i>保留室</span><span><i style="background:#e8ba63"></i>接続境界（未承認）</span><span><i style="background:#a37def"></i>既存ブロック</span><span><i style="background:#62d9a0"></i>縦動線予約</span></div>
<canvas width="900" height="720" id="map"></canvas><p class="small" id="floorInfo"></p><p class="small">境界の空きは入口・階段・出口・建築可能性の証明ではありません。窓、壁、床、既存候補の改変は行っていません。</p></section>
<aside class="panel"><h2>保留室と再編の条件</h2><div id="details"></div><p class="small">「非居室区画へ変更」は部屋数が減る代替案であり、既存ブロックに変更や、自由な立入りを認めるものではありません。</p></aside></div>
<section class="panel" style="margin-top:14px"><h2>共通パターンの階別比較</h2><div id="patterns"></div></section><footer>READONLY / NOT_PREPARED / 施工前9ゲートBLOCKED / Minecraftへの接続なし / worldCoordinates = null</footer>
<script>
const DATA=__DATA__,q=id=>document.getElementById(id),enc=t=>String(t).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const t=DATA.totals;for(const [name,value] of [['既存候補（未承認）',t.previousUnapprovedCandidates],['保留室',t.unresolvedIndependentRooms],['接続境界の診断件数',t.reviewOnlyFrontiers],['局所枠の条件を満たす室',t.frameAndNominalHallLocallyClearRooms],['新規施工承認室',t.newlyApprovedRooms]])q('stats').insertAdjacentHTML('beforeend',`<div class="stat"><b>${value}</b><span class="small">${name}</span></div>`);
for(const s of DATA.sections){const o=document.createElement('option');o.value=s.id;o.textContent=s.id;q('floor').appendChild(o)}q('floor').value='office/candidate-01/L3';
function draw(){const s=DATA.sections.find(a=>a.id===q('floor').value);if(!s)return;const canvas=q('map'),ctx=canvas.getContext('2d');const w=s.floorMaskRows[0].length,h=s.floorMaskRows.length,cell=Math.min(32,Math.floor(Math.min(860/w,680/h))),left=Math.floor((900-w*cell)/2),top=Math.floor((720-h*cell)/2),view=q('view').value;
ctx.clearRect(0,0,900,720);ctx.fillStyle='#081221';ctx.fillRect(0,0,900,720);function box(p,color){ctx.fillStyle=color;ctx.fillRect(left+p.x*cell+1,top+p.z*cell+1,cell-2,cell-2)}
for(let z=0;z<h;z++)for(let x=0;x<w;x++)box({x,z},s.floorMaskRows[z][x]==='1'?'#1c324e':'#0b1729');s.corridors.forEach(p=>box(p,'#287caf'));
for(const r of s.rooms)for(let z=r.z;z<r.z+r.depth;z++)for(let x=r.x;x<r.x+r.width;x++)box({x,z},'#53688a');
for(const r of s.held){const rect=s.rooms.find(x=>x.id===r.roomId);if(!rect)continue;for(let z=rect.z;z<rect.z+rect.depth;z++)for(let x=rect.x;x<rect.x+rect.width;x++)box({x,z},'#e6657b');if(view!=='base')for(const f of r.doorFrontiers.frontiers){box(f.roomCell,'#e8ba63');if(view==='blocks')for(const b of f.openingProductionContacts)box(b,'#a37def')}}
[...s.stairs,...s.elevators].forEach(p=>box(p,'#62d9a0'));
ctx.font=`${Math.max(9,Math.floor(cell*.39))}px ui-monospace,monospace`;ctx.textAlign='center';ctx.textBaseline='middle';for(const r of s.rooms){ctx.fillStyle='#fff';ctx.fillText(r.id.split('-R').pop(),left+(r.x+r.width/2)*cell,top+(r.z+r.depth/2)*cell)}
q('floorInfo').textContent=`${s.id} · 名目室 ${s.rooms.length} · 保留 ${s.held.length}`;
q('details').innerHTML=s.held.length?s.held.map(r=>{const f=r.doorFrontiers.frontiers[0],o=f?.modificationBudget;return `<div class="item"><strong>${enc(r.roomId)}</strong> — 独立した室として保留<br>名目面積 ${r.roomArea}セル / 診断境界 ${r.doorFrontiers.scannedValidFrontiers}<br>${f?`最小干渉: 構造壁 ${o.structural}、ガラス ${o.glazing}、床・その他 ${o.other}、二次壁 ${o.secondary}<br>枠の局所検査 ${f.edgeFrameValidated?'PASS（局所）':'HOLD'}・廊下側空き ${f.hallPhysicallyClear?'Yes':'No'}`:'全保護条件を満たす接続境界なし'}<details><summary>区画用途の代替案・根拠</summary><pre>${enc(JSON.stringify({rejections:r.doorFrontiers.rejections,frontiers:r.doorFrontiers.frontiers,programAlternatives:r.programOptions},null,2))}</pre></details></div>`}).join(''):'この階にB90対象の保留室はありません。';
}
q('floor').addEventListener('change',draw);q('view').addEventListener('change',draw);draw();
q('patterns').innerHTML=DATA.patterns.map(p=>`<div class="item"><strong>${enc(p.pattern)}</strong> — ${p.count}室<br>局所接続境界のある階 ${p.localFrontierFloors}/${p.count} ／ 構造壁・ガラスへの直接変更なしの候補階 ${p.softCompatibleFloors}/${p.count}<br><span class="small">最終採用なし・階ごとの変更条件を必ず再評価（床やその他ブロックの衝突は別途保留）</span></div>`).join('');
</script></body></html>'''
page=page.replace('__DATA__',data)
(here/'B90_PROGRAM_ZONING_REVIEW.html').write_text(page)
print('B90 HTML',len(page.encode()),'bytes, floors',len(sections))
