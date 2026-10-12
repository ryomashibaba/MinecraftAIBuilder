"""B100: independent local plan concept viewer. Does not connect to Minecraft."""
from pathlib import Path
import json, html
HERE=Path(__file__).resolve().parent
r=json.loads((HERE/'B100_GENERIC_DESIGN_REPORT.json').read_text())
cases=[]
for case in r['architectureCases']:
 b=case['brief']
 items=[]
 for v in case['options']:
  items.append({'id':v['id'],'variant':v['variant'],'core':v['core'],'area':v['footprintAreaByLevel'],
   'rooms':v['summary']['programmeRetainedRooms'],'doors':v['summary']['nominalTwoCellFrontageRooms'],
   'floors':[{'rows':f['footprintRows'],'room':f['rooms'],'gallery':f['gallery'],'level':f['level'],
    'floorMaskArea':v['footprintAreaByLevel'][f['level']]} for f in v['floors']]})
 cases.append({'id':case['caseId'],'brief':b,'variants':items,'diversity':case['diversity']})
data=json.dumps(cases,ensure_ascii=False,separators=(',',':')).replace('</','<\\/')
page='''<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>MinecraftAIBuilder B100 - 汎用建築コンセプト比較</title><style>
:root{color-scheme:dark;--bg:#101520;--panel:#192232;--border:#2f3b4f;--white:#e6edf6;--muted:#9caabe;--accent:#5dcac4;--room:#7ca9d4;--core:#e6a45b}
*{box-sizing:border-box}body{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;margin:0;background:var(--bg);color:var(--white)}
main{max-width:1400px;margin:auto;padding:25px}h1{font-size:1.6rem;margin:0 0 8px}p{line-height:1.7;color:var(--muted)}.top{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:20px}
.label{border:1px solid #7c5342;color:#ffbc92;border-radius:20px;padding:7px 12px;font-size:12px}.frame{border:1px solid var(--border);background:var(--panel);border-radius:16px;padding:20px}
.controls{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-bottom:16px}label{color:var(--muted);font-size:14px}
select,input{font:inherit;color:var(--white);background:#101722;border:1px solid var(--border);padding:10px;border-radius:9px;min-width:105px}
.row{display:grid;grid-template-columns:minmax(310px,3fr) minmax(260px,1fr);gap:18px}.plan{min-width:0;position:relative;background:#101926;border-radius:12px;overflow:hidden;padding:14px}
svg{width:100%;height:auto;max-height:680px;display:block}.aside{display:flex;flex-direction:column;gap:12px}.stat{background:#121b28;padding:14px;border-radius:10px;border:1px solid #293447}
.stat b{font-size:25px}.muted{color:var(--muted);font-size:12px}h2{font-size:1.05rem;margin:0 0 12px}.legend{display:flex;gap:15px;flex-wrap:wrap;color:var(--muted);font-size:12px;margin-top:12px}.dot{display:inline-block;width:11px;height:11px;border-radius:3px;margin-right:5px}
.small{font-size:12px;line-height:1.6;color:var(--muted)}.warnings{background:#29211e;color:#ffd7bb;padding:13px;border-radius:10px;font-size:13px;line-height:1.6}
.variantgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin:12px 0}.variant{border:1px solid var(--border);border-radius:10px;text-align:left;background:#131b29;color:var(--white);padding:12px;cursor:pointer;font:inherit}.variant.active{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent)}.variant small{display:block;color:var(--muted);margin-top:5px}
pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;color:#a7b7c9}
@media(max-width:800px){.row{grid-template-columns:1fr}main{padding:14px}.variantgrid{grid-template-columns:1fr}}
</style></head><body><main><div class="top"><div><h1>建築を用途に固定しない — B100 設計比較</h1><p>住宅・ホテル・集合住宅・オフィス・図書館。各3案、計15案／66仮想フロア。色違いでなく床の形を比較。</p></div><span class="label">未承認・施工禁止 / NOT_PREPARED</span></div>
<div class="frame"><div class="controls"><label>用途 <select id="case"></select></label><label>階層 <select id="level"></select></label></div>
<div class="variantgrid" id="variants"></div><div class="row"><section class="plan"><h2 id="planTitle"></h2><svg id="svg" role="img" aria-label="建物の概念平面図"></svg>
<div class="legend"><span><i class="dot" style="background:#34495f"></i>床</span><span><i class="dot" style="background:#55b3b2"></i>幅2セル通路</span><span><i class="dot" style="background:#8ea6cd"></i>居室</span><span><i class="dot" style="background:#e9a75c"></i>縦動線予約</span><span><i class="dot" style="background:#263347"></i>中庭・吹抜け等の非床空間</span></div></section>
<div class="aside"><div class="stat"><div class="muted">日本語指示（入力原文）</div><p id="prompt"></p></div><div class="stat"><div class="muted">設計案の平面変化率（最小）</div><b id="diversity"></b><p class="small">床形状全体を比較。素材・色の違いは含みません。</p></div><div class="stat" id="stats"></div><div class="warnings">⚠ この図はローカル座標の概念平面図です。実際の3Dドア、階段、家具、構造、日照、避難出口、Minecraft Educationへの施工は未検証。入口候補がある＝完成ではありません。</div></div></div></div>
<p class="small">B99以前の設計・安全条件は凍結参照。B100は新しい独立設計枝であり、既存ワールドや本番設計を変更しません。</p></main>
<script>const DATA=__DATA__;let selected=0,variant=0,level=0;
const $=id=>document.getElementById(id);
function el(tag,attrs){const e=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));return e;}
function refresh(){const b=DATA[selected],c=b.variants[variant];$('planTitle').textContent=b.id+'　案 '+(variant+1)+'　｜　'+(level+1)+'階';$('prompt').textContent=b.brief.originalInstruction;
$('diversity').textContent=(b.diversity.minimumDifference*100).toFixed(1)+'%';$('level').innerHTML=c.floors.map((f,i)=>'<option value="'+i+'">'+(i+1)+'階</option>').join('');$('level').value=String(level);
$('variants').innerHTML=b.variants.map((v,i)=>'<button class="variant '+(variant===i?'active':'')+'" data-id="'+i+'">設計案 '+(i+1)+'<small>全階居室 '+v.rooms+' / 幅2通路に面する入口候補 '+v.doors+'</small></button>').join('');
for(const bt of document.querySelectorAll('.variant'))bt.addEventListener('click',()=>{variant=+bt.dataset.id;level=0;refresh()});
let f=c.floors[level],rows=f.rows,h=rows.length,w=rows[0].length;
const svg=$('svg');svg.replaceChildren();svg.setAttribute('viewBox',`-1 -1 ${w+2} ${h+2}`);svg.setAttribute('preserveAspectRatio','xMidYMid meet');
for(let z=0;z<h;z++)for(let x=0;x<w;x++)if(rows[z][x]==='1')svg.appendChild(el('rect',{x,z,width:1,height:1,fill:'#34495f'}));
for(const p of f.gallery)svg.appendChild(el('rect',{x:p.x,z:p.z,width:.94,height:.94,fill:'#55b3b2'}));
for(const r of f.room){const v=el('rect',{x:r.x,z:r.z,width:r.width,height:r.depth,fill:'#8ea6cd',stroke:'#142033','stroke-width':.19});const t=el('title',{});t.textContent=r.id+' '+r.purpose+' / 名目入口候補 '+r.nominalDoorBays.length;v.appendChild(t);svg.appendChild(v);
 for(const p of r.nominalDoorBays)svg.appendChild(el('circle',{cx:p.x+.5,cy:p.z+.5,r:.24,fill:'#f2f0aa'}));}
svg.appendChild(el('rect',{x:c.core.x,z:c.core.z,width:c.core.width,height:c.core.depth,fill:'#e9a75c',stroke:'#402b1a','stroke-width':.23}));
$('stats').innerHTML='<div class="muted">この階の検査結果</div><b>'+f.room.length+' 室</b><p class="small">通路に面した入口候補 '+f.room.filter(r=>r.entranceConnectedNominal).length+'室 / 床面積 '+f.floorMaskArea+'セル / 回廊 '+f.gallery.length+'セル</p>';
}
$('case').innerHTML=DATA.map((c,i)=>'<option value="'+i+'">'+({HOUSE:'一戸建て',HOTEL:'ホテル',APARTMENT:'集合住宅',OFFICE:'オフィス',LIBRARY:'図書館'}[c.id])+'</option>').join('');
$('case').addEventListener('change',e=>{selected=Number(e.target.value);variant=0;level=0;refresh()});$('level').addEventListener('change',e=>{level=Number(e.target.value);refresh()});refresh();
</script></body></html>'''.replace('__DATA__',data)
(HERE/'B100_UNIVERSAL_DESIGN_REVIEW.html').write_text(page,encoding='utf-8')
print('rendered',len(page),'bytes, cases',len(cases))
