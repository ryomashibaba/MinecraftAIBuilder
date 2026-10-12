"""Create standalone local SVG reviewer for B98 (no network, no Minecraft calls)."""
import json
from pathlib import Path
here=Path(__file__).parent
b98=json.loads((here/'B98_ATRIUM_WING_REPORT.json').read_text())
b97=json.loads((here.parent.parent/'b97/main/B97_CONNECTED_GALLERY_REPORT.json').read_text())
def floor_98(f):
    return dict(id=f['rooms'][0]['roomId'].split('-')[0],original=f['originalFloorMaskRows'],
        extension=f['proposalFloorMask']['addedCells'],gallery=f['gallery'],core=f['core'],
        reserved=f['reservedSites'],rooms=[{'id':r['roomId'],'rect':r['room'],
        'gate':bool(r['entranceBay']),'ratio':r['areaRetention']} for r in f['rooms']],
        diag=f['diagnostic'],stats=f['stats'])
def floor_b97(f):
    return dict(id=f['rooms'][0]['roomId'].split('-')[0],original=f['floorMaskRows'],
        extension=[],gallery=f['gallerySites'],core=f['core'],
        reserved=f['virtualReference']['stairs']+f['virtualReference']['elevators'],
        rooms=[{'id':r['roomId'],'rect':r['room'],'gate':bool(r['frontage'] and r['frontage']['pairedCorridorFrontage']),
           'ratio':r['retentionRatio']} for r in f['rooms']],
        diag={},stats={'pairedEntranceRooms':f['stats']['roomsWithTwoCellGalleryFrontage'],
          'allocatedRooms':f['stats']['allocatedRooms'],'nominalRooms':f['stats']['nominalRooms'],
          'addedFootprintCells':0})
D={}
for b in b97['buildings']:
    key=b['buildingId'];o=b['options'][0]
    D[key]={'name':key.replace('/candidate-01','').replace('/candidate-02','02').replace('/candidate-03','03'),
     'baseline':{'label':'B97 凍結基準・未承認','floors':[floor_b97(f) for f in o['sections']],
      'note':'B97の最良概念案。実施工・ドア動作は未検証。'},'options':[]}
for o in b98['apartment']['options']:
    D['apartment/candidate-01']['options'].append({'label':o['id'],
       'floors':[floor_98(f) for f in o['sections']],
       'note':'東側外周回廊は外壁採光リスク24室・構造再設計が必須。' if o['id']=='RING_OUTBOARD_EAST' else '中庭の元の開放領域を52%維持。実ブロック・窓・避難は未検証。'})
for o in b98['office01']['options']:
    D['office/candidate-01']['options'].append({'label':o['id'],
       'floors':[floor_98(f) for f in o['sections']],
       'note':'南側新棟。3～6階に旧未配置の各1室、1～2階は共用テラス案。荷重・外観は未検証。'})
serialized=json.dumps(D,ensure_ascii=False,separators=(',',':')).replace('</','<\\/')
html='''<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>B98 | 建築再設計の比較</title><style>
:root{color-scheme:dark;font-family:system-ui,-apple-system,"Yu Gothic",Meiryo,sans-serif;background:#081322;color:#edf4fc}*{box-sizing:border-box}
body{margin:0;min-height:100vh;background:radial-gradient(ellipse at top left,#183451 0%,#081322 48%)}
header{padding:24px 32px 18px;border-bottom:1px solid #254363;background:#0a1c30df;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
h1{margin:0;font-size:1.55rem;letter-spacing:.03em}small, .sub{color:#a8bed1}.stamp{background:#263e51;border:1px solid #547084;border-radius:30px;padding:6px 12px;color:#e1e9f1;font-weight:600;font-size:.78rem}
main{max-width:1430px;margin:auto;padding:24px 26px 50px}.toolbar{display:grid;grid-template-columns:repeat(3,minmax(150px,1fr));gap:14px;margin-bottom:18px}
.tool{border:1px solid #28445c;border-radius:14px;background:#12263c;padding:12px}label{display:block;font-size:.75rem;font-weight:700;color:#a2bcd0;margin-bottom:8px}select{width:100%;font:inherit;background:#091928;color:#f2f8ff;border:1px solid #466078;border-radius:8px;padding:9px}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:18px 0}.stat{background:#102339;border:1px solid #2c4356;border-radius:12px;padding:13px}.stat strong{display:block;font-size:1.45rem;margin:5px 0}.stat span{font-size:.73rem;color:#a8c4db}
.content{display:grid;grid-template-columns:minmax(360px,1.9fr) minmax(300px,1fr);gap:20px}.panel{background:#0d2033;border:1px solid #30516b;border-radius:16px;padding:18px;min-width:0}
svg{width:100%;height:auto;max-height:72vh;background:#061323;border-radius:8px;border:1px solid #19394e}
.legend{display:flex;gap:10px;flex-wrap:wrap;margin:16px 0 2px}.legend span{font-size:.72rem;color:#b2c8dd;display:flex;align-items:center;gap:5px}.chip{width:13px;height:13px;border-radius:3px;display:inline-block;border:1px solid #e0ecff55}
h2{font-size:1.04rem;margin:0 0 14px;color:#f1f8ff}p{color:#bbcfe0;line-height:1.7}.info{font-size:.85rem;background:#162c41;border-left:3px solid #60d0e0;padding:10px 12px;border-radius:7px}.warn{border-color:#f0b858;color:#f4c78d}.mini{margin-top:16px;font-size:.8rem;color:#acc8d9}.mini code{color:#f1ecb8}
@media(max-width:880px){.content{grid-template-columns:1fr}.stats{grid-template-columns:repeat(2,1fr)}.toolbar{grid-template-columns:1fr}main{padding:16px}}
</style></head><body><header><div><h1>B98 · 建築再設計の比較</h1><div class="sub">中庭回廊 / 南側新棟 / 原本B97との比較 — 全5棟・30階</div></div><div class="stamp">NOT PREPARED · 9 Gates BLOCKED</div></header>
<main><div class="toolbar"><div class="tool"><label for="building">建物</label><select id="building"></select></div><div class="tool"><label for="option">設計候補</label><select id="option"></select></div><div class="tool"><label for="level">フロア</label><select id="level"></select></div></div>
<div class="stats"><div class="stat"><span>幅2セルの入口候補</span><strong id="front">—</strong><span>ドア本体の施工判定ではない</span></div><div class="stat"><span>配置維持の部屋</span><strong id="kept">—</strong><span>元の室数と比較</span></div><div class="stat"><span>仮想外殻の追加セル</span><strong id="extend">—</strong><span>新建物の床範囲</span></div><div class="stat"><span>面積維持率（最小）</span><strong id="area">—</strong><span>各室75%以上の基準</span></div></div>
<div class="content"><section class="panel"><h2>平面のオフライン比較</h2><svg id="drawing" viewBox="0 0 600 480" role="img" aria-label="Floor conceptual plan"></svg><div class="legend"><span><i class="chip" style="background:#263c51"></i>旧床範囲</span><span><i class="chip" style="background:#1e696f"></i>新設の廊下</span><span><i class="chip" style="background:#277f5b"></i>入口候補あり</span><span><i class="chip" style="background:#b86a48"></i>入口未接続室</span><span><i class="chip" style="background:#805caa"></i>共用コア</span><span><i class="chip" style="background:#e2bc5a"></i>旧階段・昇降機</span><span><i class="chip" style="background:#233c8c"></i>新しい外殻</span></div></section>
<aside class="panel"><h2>この設計案について</h2><p class="info" id="notes"></p><h2>保護条件と品質</h2><p>対象は独立した仮想の新建物です。現行のMinecraft建物、既存296室の未承認候補、B97以前のソースは変更していません。</p><p>緑の室は幅2セルの連続した廊下壁面を持つ概念候補です。<strong>実際のドア枠・開き空間・階段の構造・防火・避難経路を証明するものではありません。</strong></p><p id="details" class="mini"></p><p class="info warn">外殻の増築や中庭への回廊は、本番ブロックと適合する施工手順ではありません。実施工、世界通信、コマンド生成は0件です。</p></aside></div></main>
<script>const DB=__PAYLOAD__;
const building=document.getElementById('building'),option=document.getElementById('option'),level=document.getElementById('level');
const ns='http://www.w3.org/2000/svg';const pt=p=>p.x+','+p.z;
const attrs=(parent,tag,properties)=>{const e=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(properties))e.setAttribute(k,String(v));parent.append(e);return e};
function selected(){const b=DB[building.value];return [b,option.value==='baseline'?b.baseline:b.options[Number(option.value)]]}
function updateOptions(){const b=DB[building.value];option.innerHTML='';for(const [id,label] of [['baseline',b.baseline.label],...b.options.map((o,i)=>[String(i),o.label])]){const e=document.createElement('option');e.value=id;e.textContent=label;option.append(e)};option.value=b.options.length?'0':'baseline';updateLevels()}
function updateLevels(){const o=selected()[1];level.innerHTML='';for(let i=0;i<o.floors.length;i++){const el=document.createElement('option');el.value=String(i);el.textContent=o.floors[i].id.replace('F','')+'階';level.append(el)}render()}
function render(){const [b,o]=selected(),f=o.floors[Number(level.value)||0];if(!f)return;
const svg=document.getElementById('drawing');svg.replaceChildren();const mask=f.original;const ext=new Set(f.extension.map(pt)),gallery=new Set(f.gallery.map(pt));
const maxX=Math.max(mask[0].length-1,...f.extension.map(p=>p.x),...f.gallery.map(p=>p.x)),maxZ=Math.max(mask.length-1,...f.extension.map(p=>p.z),...f.gallery.map(p=>p.z));
const minX=Math.min(0,...f.extension.map(p=>p.x)),minZ=Math.min(0,...f.extension.map(p=>p.z)),w=maxX-minX+1,h=maxZ-minZ+1;
const pitch=Math.min(19,Math.max(9,650/Math.max(w,h)));svg.setAttribute('viewBox',`0 0 ${w*pitch+30} ${h*pitch+30}`);
const sq=(x,z,fill,stroke='none')=>attrs(svg,'rect',{x:(x-minX)*pitch+15,y:(z-minZ)*pitch+15,width:pitch,height:pitch,fill,stroke,'stroke-width':.3});
for(let z=0;z<mask.length;z++)for(let x=0;x<mask[z].length;x++)if(mask[z][x]==='1')sq(x,z,'#263c51');
for(const p of f.extension)sq(p.x,p.z,'#233c8c');for(const p of f.gallery)sq(p.x,p.z,'#1e696f');
for(const r of f.rooms){if(!r.rect)continue;const room=r.rect;attrs(svg,'rect',{x:(room.x-minX)*pitch+15+.5,y:(room.z-minZ)*pitch+15+.5,
width:room.width*pitch-1,height:room.depth*pitch-1,rx:Math.max(1,pitch/6),fill:r.gate?'#277f5b':'#b86a48',stroke:'#a7bcd1','stroke-width':.7});
const t=attrs(svg,'text',{x:(room.x+room.width/2-minX)*pitch+15,y:(room.z+room.depth/2-minZ)*pitch+18,
'font-size':Math.min(11,pitch*.72),'text-anchor':'middle','font-weight':700,fill:'#fff'});t.textContent=r.id.split('R').pop();}
for(const p of f.reserved)sq(p.x,p.z,'#e2bc5a');for(let z=f.core.z;z<f.core.z+f.core.depth;z++)for(let x=f.core.x;x<f.core.x+f.core.width;x++)sq(x,z,'#805caa');
const total=f.stats.nominalRooms||f.rooms.length;document.getElementById('front').textContent=(f.stats.pairedEntranceRooms||0)+' / '+total;
document.getElementById('kept').textContent=(f.stats.allocatedRooms||0)+' / '+total;
document.getElementById('extend').textContent=String(f.stats.addedFootprintCells||0);
const ratios=f.rooms.filter(r=>r.rect).map(r=>r.ratio);document.getElementById('area').textContent=(Math.min(1,...ratios)*100).toFixed(0)+'%';
document.getElementById('notes').textContent=o.note;
const d=f.diag||{};document.getElementById('details').textContent=`モデル: ${o.label} / ${f.id}　${d.courtyardOriginalVoidCells?'中庭元'+d.courtyardOriginalVoidCells+'セル、開放'+d.courtyardRetainedOpenCells+'セル。':''}${d.eastFacadeShadingRiskRooms?' 東側窓の影響懸念 '+d.eastFacadeShadingRiskRooms+'室。':''}${d.relocatedToExternalWing?.length?' 新棟へ移した室 '+d.relocatedToExternalWing.map(x=>x.id).join('、'):''}`;
}
for(const name of Object.keys(DB)){const el=document.createElement('option');el.value=name;el.textContent=DB[name].name;building.append(el)}
building.value='apartment/candidate-01';building.addEventListener('change',updateOptions);option.addEventListener('change',updateLevels);level.addEventListener('change',render);updateOptions();
</script></body></html>'''.replace('__PAYLOAD__',serialized)
(here/'B98_ARCHITECTURAL_REVIEW.html').write_text(html)
print('generated',here/'B98_ARCHITECTURAL_REVIEW.html',len(html))
