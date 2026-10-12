#!/usr/bin/env python3
"""Build a fully offline architecture-impact viewer from immutable B66 and B95 artifacts."""
from pathlib import Path
import json, html
here=Path(__file__).resolve().parent
source=here.parents[2]
report=json.loads((here/'B95_VERTICAL_CORE_SLAB_AUDIT_REPORT.json').read_text())
sections=json.loads((source/'parallel/b66/main/B66_LOCAL_3D_ASSEMBLY.json').read_text())['sections']
data={
 'sections':[{k:s[k] for k in ('id','level','floorMaskRows','conceptRooms','conceptReservations')} for s in sections],
 'audit':report['verticalAudit'],'bypasses':report['shaftBypassFloors'],'patterns':report['remediationPatterns'],
 'totals':report['totals'],'provenance':report['provenance']}
jsdata=json.dumps(data,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c').replace('>','\\u003e')
page='''<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MinecraftAIBuilder B95 — Vertical Core & Slab Audit</title>
<style>
:root{color-scheme:dark;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;background:#0d1523;color:#eaf1ff}*{box-sizing:border-box}body{margin:0}header{background:#17253c;border-bottom:1px solid #354763;padding:20px 28px}h1{margin:0 0 7px;font-size:22px}h2{margin:0 0 12px;font-size:16px}p{color:#bccce1;line-height:1.6;margin:6px 0}.lead{max-width:970px}.warn{color:#ffd99b}main{max-width:1600px;margin:0 auto;padding:20px;display:grid;grid-template-columns:minmax(500px,1.7fr) minmax(330px,1fr);gap:18px}.card{background:#18253a;border:1px solid #31445e;border-radius:12px;padding:16px;min-width:0;margin-bottom:16px}select{background:#0c1829;color:#eaf1ff;border:1px solid #485a73;border-radius:7px;padding:9px 10px;margin:5px 7px 7px 0;max-width:100%}label{font-size:13px;color:#d1e0f4}canvas{width:100%;height:auto;background:#111e30;border-radius:9px;display:block}.legend{display:flex;flex-wrap:wrap;gap:12px;font-size:12px;color:#d0dceb;margin:12px 0}.dot{display:inline-block;width:12px;height:12px;border-radius:2px;margin-right:4px;vertical-align:middle}.metric{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.metric>div{background:#0e1b2c;padding:10px;border-radius:8px}.metric strong{display:block;font-size:22px}.metric span{font-size:12px;color:#b2c4db}.table{width:100%;border-collapse:collapse;font-size:13px}.table th,.table td{border-bottom:1px solid #35445b;text-align:left;padding:8px 6px;vertical-align:top}.table th{color:#abc2dc}code{font-size:12px;color:#b4d9ff}.small{font-size:12px;color:#b7c7df}.pill{display:inline-block;padding:3px 6px;background:#454031;border-radius:4px;color:#ffe4a8;font-size:11px}ul{color:#c4d2e4;padding-left:19px;line-height:1.7}section#evidence{max-height:300px;overflow:auto}footer{padding:15px 28px;color:#91a8c1;font-size:12px}@media(max-width:900px){main{display:block;padding:12px}.card{margin-bottom:12px}}
</style></head><body>
<header><h1>B95　上下階コア・床・廊下の実ブロック検証</h1><p class="lead">5棟・30階を参照したオフライン建築レビュー。<strong class="warn">NOT_PREPARED / 9ゲートBLOCKED / 実施工0</strong>。設計の想定図であり施工済みワールドではありません。B94の「空き2×2」仮説を、床・屋根・廊下分断まで確認した記録です。</p></header>
<main><div><div class="card"><h2>1. フロア形状と影響範囲</h2><label>建物 <select id="building"></select></label><label>階 <select id="floor"></select></label><label>表示 <select id="overlay"><option value="selected">B94コア 2×2（B95で詳細検査）</option><option value="alternative">周辺の比較形状</option><option value="plain">本来の間取りだけ</option></select></label><label>比較形状 <select id="trial"></select></label><canvas id="plan"></canvas><div class="legend"><span><i class="dot" style="background:#537597"></i>一般室</span><span><i class="dot" style="background:#be805f"></i>保留室</span><span><i class="dot" style="background:#347aaa"></i>名目廊下</span><span><i class="dot" style="background:#56b39f"></i>既存階段/昇降機</span><span><i class="dot" style="background:#fae283"></i>新コア候補</span><span><i class="dot" style="background:#ee777e"></i>接続が失われる廊下</span><span><i class="dot" style="background:#b9a2ff"></i>1階の迂回案</span></div><p class="small" id="plotnote"></p></div>
<div class="card"><h2>2. 比較対象の保留室4パターン</h2><table class="table"><thead><tr><th>建物・室</th><th>室数</th><th>共用区画化・再設計の課題</th></tr></thead><tbody id="patterns"></tbody></table><p class="small">過去296室の候補は未承認です。B95でそれらを編集・実施工した室はありません。</p></div></div>
<div><div class="card"><h2>候補2×2の重要測定</h2><div class="metric" id="metrics"></div><p class="small" id="classify"></p></div><div class="card"><h2>上下5境界＋屋根</h2><table class="table"><thead><tr><th>境界</th><th>本番ブロック変更要求</th><th>扱い</th></tr></thead><tbody id="boundaries"></tbody></table></div><div class="card"><h2>階別の廊下再接続</h2><div id="routes"></div></div><div class="card"><h2>注意・保護条件</h2><ul><li>本番壁・ガラス・床・屋根の削除や置換は一切していません。</li><li>最上部の防水・支持、段差・階段形状、エレベーター動作、避難出口は未確認。</li><li>「迂回路あり」は用途変更・通路幅の承認ではありません。</li><li>集合住宅とオフィス01以外の本番3D照合は実施していません。</li><li>ワールド座標、施工命令、Minecraft接続はありません。</li></ul></div></div></main><footer>2026-10-12　MinecraftAIBuilder B95 · local-only · planning evidence, not construction approval</footer>
<script>const DATA=__JSON__;
const $=id=>document.getElementById(id),sections=DATA.sections,selected=DATA.audit.selected;
const buildingIds=[...new Set(sections.map(s=>s.id.split('/').slice(0,2).join('/')))];
function option(select,label,val){const el=document.createElement('option');el.textContent=label;el.value=val;select.appendChild(el)}
for(const id of buildingIds)option($('building'),id,id);
for(const t of DATA.audit.topScoringConcepts)option($('trial'),`${t.width}×${t.depth} (${t.x},${t.z}) ・ ${t.reviewClass}`,`${t.x},${t.z},${t.width},${t.depth}`);
for(const p of DATA.patterns){const row=document.createElement('tr');for(const v of [p.pattern,p.roomCount,p.direction]){const c=document.createElement('td');c.textContent=v;row.appendChild(c)}$('patterns').appendChild(row)}
const classText={'REJECT_PROTECTED_GEOMETRY':'保護された室・ガラス・階段予約等と衝突：却下','HOLD_CORRIDOR_DISCONNECTION':'名目廊下の連結が損なわれる：未承認','HOLD_STRUCTURAL_CUT_OR_HEADROOM':'構造床・室内高さの再設計が必要：未承認','HOLD_VERTICAL_ACCESS_UNVERIFIED':'上下動線・避難経路の成立未確認：未承認'};
function updateFloors(){const id=$('building').value,current=$('floor').value;$('floor').innerHTML='';for(const s of sections.filter(s=>s.id.startsWith(id+'/')))option($('floor'),`L${s.level}`,s.id);if([...$('floor').options].some(o=>o.value===current))$('floor').value=current;update()}
function draw(section,shape){const mask=section.floorMaskRows,w=mask[0].length,d=mask.length,size=18,cv=$('plan'),ctx=cv.getContext('2d'),scale=window.devicePixelRatio||1;cv.width=(w*size+24)*scale;cv.height=(d*size+24)*scale;ctx.scale(scale,scale);ctx.fillStyle='#0b1725';ctx.fillRect(0,0,w*size+24,d*size+24);
 const fill=(x,z,color)=>{ctx.fillStyle=color;ctx.fillRect(12+x*size+1,12+z*size+1,size-2,size-2)};
 for(let z=0;z<d;z++)for(let x=0;x<w;x++)if(mask[z][x]==='1')fill(x,z,'#263951');
 for(const r of section.conceptRooms){const held=(section.id.startsWith('apartment/')&&['R006','R012','R013'].some(n=>r.id.endsWith(n)))||(section.id.startsWith('office/candidate-01')&&r.id.endsWith('R004'));for(let z=r.z;z<r.z+r.depth;z++)for(let x=r.x;x<r.x+r.width;x++)fill(x,z,held?'#be805f':'#537597')}
 for(const p of section.conceptReservations.corridors)fill(p.x,p.z,'#347aaa');for(const p of section.conceptReservations.stairs)fill(p.x,p.z,'#56b39f');for(const p of section.conceptReservations.elevators)fill(p.x,p.z,'#55b7a6');
 const isApartment=section.id.startsWith('apartment/candidate-01/');if(isApartment&&$('overlay').value!=='plain'){
 const f=DATA.bypasses.find(f=>f.sectionId===section.id);if(f){for(const p of selected.slices.find(x=>x.sectionId===section.id)?.lostOutsideCorridorSites||[]){const [x,z]=p.split(',').map(Number);fill(x,z,'#ee777e')}for(const b of f.localBypasses.filter(b=>b.resolved)){for(const k of b.newCorridorSites){const [x,z]=k.split(',').map(Number);fill(x,z,'#b9a2ff')}}}
 for(let z=shape.z;z<shape.z+shape.depth;z++)for(let x=shape.x;x<shape.x+shape.width;x++)fill(x,z,'#fae283');ctx.strokeStyle='#f7d155';ctx.lineWidth=3;ctx.strokeRect(12+shape.x*size,12+shape.z*size,size*shape.width,size*shape.depth);
 }
 ctx.font='11px system-ui';ctx.fillStyle='#f7faff';ctx.fillText(`L${section.level} · ${section.id.split('/')[0]}`,14,10);
}
function update(){const section=sections.find(s=>s.id===$('floor').value);if(!section)return;
 const [x,z,width,depth]=$('trial').value.split(',').map(Number),shape=$('overlay').value==='alternative'?{x,z,width,depth}:selected;
 draw(section,shape);const s=selected.slices.find(v=>v.sectionId===section.id),f=DATA.bypasses.find(v=>v.sectionId===section.id);
 $('plotnote').textContent=s?`この階のコア候補では、名目廊下 ${s.nominalCorridorSitesConverted.length} セルを転用し、既存コアからの到達可能廊下 ${s.outsideCorridorDisconnectedFromCore} セルが失われます。`: 'この建物のローカル間取りのみ表示。本番3Dのコア監査は対象外です。';
 $('routes').textContent='';if(f){for(const b of f.localBypasses){const p=document.createElement('p');p.textContent=`${b.from} → ${b.resolved?`概念的経路 ${b.path.length} セル（新規共用化 ${b.newCorridorSites.length} セル、保留室転用 ${b.convertedHeldRooms.join(',')||'なし'}）`:`未成立：${b.reason}`}`;$('routes').appendChild(p)}}else $('routes').textContent='この階にはB95の迂回路診断がありません。';
 const m=selected.counts;$('metrics').innerHTML='';for(const [val,label] of [[m.allProductionVoxelContacts,'6階内の本番ブロック'],[m.interFloorProductionCutRequests,'階間の床変更要求'],[m.roofPenetrationContacts,'屋根開口の変更要求'],[m.physicallyReachableCorridorSitesLostOutsideFootprint,'切断される廊下'],[m.hardGlassContacts,'ガラス干渉'],[m.prior296Reservations,'先行候補干渉']]){const box=document.createElement('div'),v=document.createElement('strong'),l=document.createElement('span');v.textContent=val;l.textContent=label;box.append(v,l);$('metrics').appendChild(box)}
 $('classify').textContent='採用判定：'+classText[selected.designReviewClass]+'。実施工・承認：0件。';
}
for(const g of selected.interFloorGaps){const tr=document.createElement('tr');for(const v of [`L${g.lowerLevel} → L${g.upperLevel}`,`${g.productionCutCount} ブロック`,'床開口・構造確認が必要']){const td=document.createElement('td');td.textContent=v;tr.appendChild(td)}$('boundaries').appendChild(tr)}
const roof=document.createElement('tr');for(const v of ['屋根',`${selected.roofBoundary.productionContacts.length} ブロック`,'開口・防水・支持が未承認']){const td=document.createElement('td');td.textContent=v;roof.appendChild(td)}$('boundaries').appendChild(roof);
$('building').addEventListener('change',updateFloors);$('floor').addEventListener('change',update);$('overlay').addEventListener('change',update);$('trial').addEventListener('change',update);window.addEventListener('resize',update);updateFloors();</script></body></html>'''
page=page.replace('__JSON__',jsdata)
(here/'B95_VERTICAL_CORE_REVIEW.html').write_text(page,encoding='utf8')
print('HTML',len(page),'bytes','floors',len(sections),'shafts',len(data['audit']['trialOutcomes']))
