#!/usr/bin/env python3
"""Generate self-contained offline canvas inspector of NEW-BUILD geometry only. Does not touch Minecraft."""
import json, pathlib, html
here=pathlib.Path(__file__).resolve().parent
src=json.loads((here/'B97_CONNECTED_GALLERY_REPORT.json').read_text(encoding='utf8'))
data={"meta":{"stage":"B97","totals":src['totals'],"provenance":src['provenance']},"buildings":[]}
for b in src['buildings']:
    opts=[]
    for option in b['options']:
        floors=[]
        for floor in option['sections']:
            floors.append({k:floor[k] for k in ['sectionId','level','profile','core','floorMaskRows','coreRouteSites','gallerySites','galleryBands','bridgeAddedCells','rooms','virtualReference','stats','correctedB96StairOverlapCells']})
        opts.append({'id':option['id'],'methodology':option['methodology'],'parentB96Focus':option['parentB96Focus'],'summary':option['summary'],'quality':option['quality'],'sections':floors})
    data['buildings'].append({'buildingId':b['buildingId'],'options':opts})
embedded=json.dumps(data,ensure_ascii=False,separators=(',',':')).replace('</','<\\/')
page=r'''<!doctype html><html lang="ja"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>MinecraftAIBuilder B97 — 2-wide gallery architecture review</title><style>
:root{color-scheme:dark;--ink:#e7eefb;--muted:#a0adc3;--blue:#48c4ff;--gold:#ffcf65;--bg:#0a101f;--card:#151e31;--line:#293752}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(ellipse at 72% -20%,#202d4c,#0a101f 54%);color:var(--ink);font:14px/1.5 ui-sans-serif,system-ui,'Noto Sans JP',sans-serif}
main{max-width:1480px;margin:0 auto;padding:30px 22px 80px}h1{font-size:25px;letter-spacing:-.04em;margin:10px 0 5px}h2{font-size:17px;margin:0 0 12px}
.kicker{letter-spacing:.14em;text-transform:uppercase;color:#80d7fe;font-weight:700;font-size:11px}.sub{color:var(--muted);max-width:900px}
.stats{display:grid;grid-template-columns:repeat(4,minmax(120px,1fr));gap:10px;margin:20px 0}.metric{border:1px solid var(--line);background:rgba(19,28,46,.8);padding:15px;border-radius:14px}
.metric b{display:block;font-size:25px;font-variant-numeric:tabular-nums}.metric small{color:var(--muted)}
.layout{display:grid;grid-template-columns:minmax(420px,1.6fr) minmax(320px,1fr);gap:18px}.panel{border:1px solid var(--line);background:rgba(19,28,46,.84);border-radius:18px;padding:17px;min-width:0}
.controls{display:grid;grid-template-columns:1fr 1fr 95px;gap:9px;margin-bottom:14px}label{font-size:11px;color:var(--muted);display:block;margin-bottom:3px}select{width:100%;background:#0d1628;color:var(--ink);padding:9px 10px;border:1px solid #374762;border-radius:9px;font:inherit;}
#plan{display:block;width:100%;height:auto;border-radius:12px;background:#091326;outline:1px solid #2b3850}.legend{display:flex;flex-wrap:wrap;gap:13px;color:var(--muted);font-size:12px;margin:13px 0}.dot{display:inline-block;width:11px;height:11px;border-radius:3px;vertical-align:middle;margin-right:5px}
.flag{display:inline-block;font-size:11px;border:1px solid #547287;border-radius:6px;padding:2px 7px;color:#aed5ee;margin-right:5px}.warn{color:#ffc37c}.note{padding:13px;border-left:3px solid #7087a9;background:#1b2b43;border-radius:4px;margin:12px 0;color:#d4dcea}
.tableWrap{overflow:auto;max-height:400px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{text-align:left;border-bottom:1px solid #2a3a54;padding:7px 5px}th{position:sticky;top:0;background:#17243b}tr:hover{background:#22314a}
#summaryText{line-height:1.65}p{margin:7px 0 12px}strong{color:white}a{color:var(--blue)}footer{margin-top:22px;color:var(--muted);font-size:12px}
@media(max-width:980px){.layout{grid-template-columns:1fr}.stats{grid-template-columns:repeat(2,1fr)}}@media(max-width:600px){main{padding:15px 10px}.controls{grid-template-columns:1fr 1fr}.stats{grid-template-columns:repeat(2,1fr)}h1{font-size:20px}}
</style></head><body><main><div class="kicker">MinecraftAIBuilder · Offline-only / independent architecture</div>
<h1>B97 — 2セル幅の共用通路と居室を同時に設計</h1><p class="sub">B96の仮想建物18案から、新しい共用通路網を備えた54案を作成。下の色は仮想配置を示すもので、現在のMinecraft建築・本番ソースへの変更ではありません。</p>
<section class="stats"><div class="metric"><b>54</b><small>未承認の独立建物案</small></div><div class="metric"><b>324</b><small>延べ仮想フロア</small></div><div class="metric"><b>29</b><small>暫定面積・採光代理基準に適合</small></div><div class="metric"><b>0</b><small>完成承認・実施工</small></div></section>
<section class="layout"><article class="panel"><div class="controls"><div><label for="building">建物</label><select id="building"></select></div><div><label for="option">新設計・通路タイプ</label><select id="option"></select></div><div><label for="floor">階</label><select id="floor"></select></div></div>
<canvas id="plan" width="900" height="720"></canvas>
<div class="legend"><span><i class="dot" style="background:#253652"></i>床</span><span><i class="dot" style="background:#468fc0"></i>居室</span><span><i class="dot" style="background:#ffbc56"></i>通路2セル幅</span><span><i class="dot" style="background:#ae75fa"></i>新縦動線コア</span><span><i class="dot" style="background:#fe7587"></i>旧階段予約</span><span><i class="dot" style="background:#7de3c2"></i>入口候補</span><span><i class="dot" style="background:#c94e55"></i>入口不足室</span></div>
<p class="sub">幅2セル判定は2×2正方形を連続させた接続成分に基づきます。入口候補の緑色は「同じ壁面に隣接する廊下セルが2個以上」の代理評価であり、実際のドアを設置・開閉できる保証ではありません。</p></article>
<aside class="panel"><h2>選択した案の評価</h2><div id="summaryText"></div><div class="note"><strong>未施工・未承認</strong><p>NOT_PREPARED / 9 Gate BLOCKED / BuildPlan 0命令 / 世界接続0。窓・荷重・屋根防水・ドア枠／開閉・避難・階段寸法の物理検証は未完了です。</p></div>
<h2>この階の居室判定</h2><div class="tableWrap"><table><thead><tr><th>部屋</th><th>面積維持</th><th>共用通路</th><th>採光代理</th></tr></thead><tbody id="roomTable"></tbody></table></div></aside></section>
<footer>他建物の実Plannerハッシュを新たに検証したと誤認しないでください。B96継承の本番固定出力は集合住宅・オフィス01の2棟のみ。図の基準はB66名目平面図です。B98引継ぎ資料と機械可読JSONが設計判断の正式な原本です。</footer>
</main><script id="dataset" type="application/json">__DATA__</script><script>
const d=JSON.parse(document.querySelector('#dataset').textContent);const $=id=>document.getElementById(id);
const B=$('building'),O=$('option'),L=$('floor'),canvas=$('plan'),ctx=canvas.getContext('2d');
const select=(element,items,label)=>{element.replaceChildren(...items.map((v,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=label(v,i);return o;}));};
select(B,d.buildings,b=>b.buildingId);B.onchange=()=>{select(O,d.buildings[+B.value].options,o=>`${o.id} | ${o.summary.connectedTwoCellDoorwayFrontageRooms}/${o.summary.nominalRooms}室`);O.onchange=()=>{select(L,currentOption().sections,s=>`${s.level}階`);paint();};O.onchange();};
const currentOption=()=>d.buildings[+B.value].options[+O.value];const currentFloor=()=>currentOption().sections[+L.value];
function paint(){const o=currentOption(),f=currentFloor(),rows=f.floorMaskRows,h=rows.length,w=rows[0].length;
 const unit=Math.floor(Math.min(880/w,690/h));canvas.width=w*unit+24;canvas.height=h*unit+24;
 ctx.fillStyle='#091326';ctx.fillRect(0,0,canvas.width,canvas.height);const cell=(x,z,color)=>{ctx.fillStyle=color;ctx.fillRect(12+x*unit+1,12+z*unit+1,unit-2,unit-2);};
 for(let z=0;z<h;z++)for(let x=0;x<w;x++)if(rows[z][x]==='1')cell(x,z,'#273954');
 for(const r of f.rooms.filter(x=>x.room))for(let z=r.room.z;z<r.room.z+r.room.depth;z++)for(let x=r.room.x;x<r.room.x+r.room.width;x++)cell(x,z,r.frontage?.pairedCorridorFrontage?'#28799e':'#894b57');
 f.gallerySites.forEach(p=>cell(p.x,p.z,'#e3ac42'));f.virtualReference.stairs.forEach(p=>cell(p.x,p.z,'#c85b70'));f.virtualReference.elevators.forEach(p=>cell(p.x,p.z,'#728ed5'));
 for(let z=f.core.z;z<f.core.z+f.core.depth;z++)for(let x=f.core.x;x<f.core.x+f.core.width;x++)cell(x,z,'#9870d5');
 ctx.font=`${Math.max(9,Math.floor(unit*.34))}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
 for(const r of f.rooms.filter(x=>x.room)){const p=r.room;const n=r.roomId.match(/R\d+/)?.[0]||'?';ctx.fillStyle='#eaf3ff';ctx.fillText(n,12+(p.x+p.width/2)*unit,12+(p.z+p.depth/2)*unit);
 if(r.frontage){const q=r.frontage.hallCell;cell(q.x,q.z,r.frontage.pairedCorridorFrontage?'#7de3c2':'#e2d587');}}
 const s=o.summary,st=f.stats;const fmt=n=>n.toLocaleString('ja-JP');
 $('summaryText').innerHTML=`<span class="flag">${o.methodology}向き通路</span><span class="flag">${o.parentB96Focus||'一般案'}</span>
 <p><strong>建物全6階：</strong>間取り ${s.allocatedRooms}/${s.nominalRooms}室、幅2セル通路に2連続の入口候補 ${s.connectedTwoCellDoorwayFrontageRooms}室、名目室面積維持率 ${(100*s.retentionRatio).toFixed(1)}%</p>
 <p><strong>${f.level}階：</strong>配置 ${st.allocatedRooms}/${st.nominalRooms}室、入口候補 ${st.roomsWithTwoCellGalleryFrontage}室、未接続 ${st.roomsWithoutGalleryFrontage}室、仮想廊下 ${fmt(f.gallerySites.length)}セル</p>
 <p><strong>留意点：</strong>採光代理リスク ${s.windowDaylightProxyRisks}室。B96由来の階段予約重複セルをこの階で ${f.correctedB96StairOverlapCells}件検出し、新通路では保護。</p>
 <p><strong>暫定品質：</strong>${o.quality.interimQualityGatesPass?'室数90%以上・採光代理リスク0を満たす':'室数または採光代理に課題あり'}。全居室入口の検証は ${o.quality.meetsFullEntranceCoverageGate?'概念のみ達成':'未達'}。</p>`;
 const table=$('roomTable');table.replaceChildren(...f.rooms.map(r=>{const t=document.createElement('tr');const vals=[r.roomId,`${Math.round(r.retentionRatio*100)}%`,!r.room?'配置不可':r.frontage?.pairedCorridorFrontage?'2連続接続候補':r.frontage?'1セルのみ':'接続なし',r.daylightProxyRisk?'要再設計':'代理問題なし'];vals.forEach(v=>{const td=document.createElement('td');td.textContent=v;t.appendChild(td);});return t;}));
}
L.onchange=paint;B.onchange();
</script></body></html>'''
(here/'B97_CONNECTED_GALLERY_REVIEW.html').write_text(page.replace('__DATA__',embedded),encoding='utf8')
print(here/'B97_CONNECTED_GALLERY_REVIEW.html',(here/'B97_CONNECTED_GALLERY_REVIEW.html').stat().st_size)
