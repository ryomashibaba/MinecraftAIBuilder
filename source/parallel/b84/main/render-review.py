"""Render compact, self-contained B84 offline top-down review. No network or game IO."""
import json, pathlib
root=pathlib.Path(__file__).resolve().parents[3]
here=pathlib.Path(__file__).resolve().parent
report=json.loads((here/'B84_LAYOUT_OPTIONS_REPORT.json').read_text())
shapes=json.loads((root/'parallel/b66/main/B66_LOCAL_3D_ASSEMBLY.json').read_text())
shape_by={s['id']:s for s in shapes['sections']}
rows=[]
for sec in report['sections']:
    s=shape_by[sec['id']]
    rows.append({'id':sec['id'],'level':sec['level'],'rooms':s['conceptRooms'],'floorMaskRows':s['floorMaskRows'],
      'namedCorridors':s['conceptReservations']['corridors'],'stairs':s['conceptReservations']['stairs'],
      'elevators':s['conceptReservations']['elevators'],
      'options':[{'portId':r['portId'],'status':r['status'],'best':r['best'],'rejections':r['rejections'],
                  'templateId':r['templateId']} for r in sec['rooms']]})
embedded=json.dumps({'sections':rows,'totals':report['totals']},ensure_ascii=False,separators=(',',':')).replace('</','<\\/')
html='''<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>B84 室内・廊下レイアウト案</title><style>
:root{color-scheme:dark;font-family:system-ui,"Yu Gothic",sans-serif;background:#10151f;color:#e7edf7}
body{margin:0;padding:24px;max-width:1240px;margin-inline:auto}header{margin-bottom:18px}h1{font-size:1.6rem;margin:0 0 8px}
small,.muted{color:#adbbd0}.summary{background:#1b2434;border:1px solid #34425c;border-radius:12px;padding:14px;line-height:1.8}
main{display:grid;grid-template-columns:minmax(440px,1fr) minmax(290px,400px);gap:20px;margin-top:16px}
@media(max-width:850px){main{grid-template-columns:1fr}body{padding:13px}}
.panel{border:1px solid #34425c;border-radius:13px;background:#172031;padding:15px;min-width:0}
select{background:#233046;color:#f4f7fd;border:1px solid #485875;border-radius:8px;padding:8px;font:inherit;max-width:100%}
.map{overflow:auto;background:#0d1422;border-radius:9px;margin-top:12px;padding:12px}
svg{display:block;min-width:420px;max-width:100%;height:auto} .list{display:flex;flex-direction:column;gap:8px;max-height:680px;overflow:auto;margin-top:12px}
.item{border:1px solid #34445b;border-radius:8px;padding:11px;background:#1d2a3b;text-align:left;color:inherit;cursor:pointer;font:inherit}
.item.selected{outline:2px solid #4bb7ff}.item strong{display:block;font-size:0.92rem}.item span{font-size:0.79rem;color:#bdc9d9}
.legend{display:flex;flex-wrap:wrap;gap:13px;font-size:12px;margin-top:10px}.swatch{display:inline-block;width:11px;height:11px;border-radius:2px;margin-right:4px}
.info{margin-top:12px;white-space:pre-wrap;background:#101927;border-radius:9px;padding:13px;font-size:13px;line-height:1.65;overflow:auto}
</style></head><body><header><h1>B84｜室内・廊下レイアウトのオフラインレビュー</h1>
<div class="muted">MinecraftAIBuilder — 固定された本番Plannerに照合した設計候補。Minecraftへの施工は一切実行されません。</div></header>
<div class="summary"><b>既存候補 275室は変更なし</b> ／ B84新規レイアウト候補 <b id="count"></b> ／ 保留 <b id="hold"></b><br>
<b>NOT_PREPARED</b>　施工前9ゲート BLOCKED　｜　施工命令 0　｜　現実の歩行・扉開閉は未検証</div>
<main><section class="panel"><label for="section">対象建物・階：</label> <select id="section"></select>
<div class="map"><svg id="map" viewBox="0 0 600 480" aria-label="局所平面マップ"></svg></div>
<div class="legend"><span><i class="swatch" style="background:#566580"></i>部屋</span><span><i class="swatch" style="background:#234e65"></i>既存の名目廊下</span><span><i class="swatch" style="background:#ffd166"></i>新廊下セル候補</span><span><i class="swatch" style="background:#55d5a4"></i>新ドア候補</span><span><i class="swatch" style="background:#f17c7c"></i>保留室</span></div></section>
<aside class="panel"><b>対象階の未解決・再設計候補</b><div class="list" id="items"></div><div class="info" id="info"></div></aside></main>
<script>const data=__B84_DATA__;
const $=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';let selected='';
function el(tag,attrs={},text){const e=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));if(text!=null)e.textContent=text;return e;}
function xy(p){return `${p.x},${p.z}`}
const sec=$('section');for(const s of data.sections){const opt=document.createElement('option');opt.value=s.id;opt.textContent=s.id;sec.append(opt)}
$('count').textContent=data.totals.layoutChangeAlternatives+'室';$('hold').textContent=data.totals.stillHeldWithoutLayoutAlternative+'室';
function draw(){const s=data.sections.find(x=>x.id===sec.value);if(!s)return;
 if(!s.options.some(x=>x.portId===selected))selected=s.options[0]?.portId||'';
 const svg=$('map');svg.replaceChildren();const width=s.floorMaskRows[0].length,height=s.floorMaskRows.length;
 const unit=Math.min(21,Math.floor(570/Math.max(width,height))),pad=16;
 svg.setAttribute('viewBox',`0 0 ${width*unit+2*pad} ${height*unit+2*pad}`);
 const rectangle=(x,z,w,h,fill,stroke='none',opacity=1)=>svg.append(el('rect',{x:pad+x*unit,y:pad+z*unit,width:w*unit,height:h*unit,fill,stroke,'stroke-width':1.3,opacity}));
 for(let z=0;z<height;z++)for(let x=0;x<width;x++)rectangle(x,z,1,1,s.floorMaskRows[z][x]==='1'?'#28384d':'#0e1623','#1d293a');
 for(const p of s.namedCorridors)rectangle(p.x,p.z,1,1,'#234e65');
 for(const r of s.rooms)rectangle(r.x,r.z,r.width,r.depth,'#566580','#c3d4eb',.45);
 const o=s.options.find(x=>x.portId===selected);for(const a of s.options.filter(x=>!x.best)){
  const id=a.portId.split('/').at(-1);const n=Number(id.slice(1))-1,r=s.rooms[n];if(r)rectangle(r.x,r.z,r.width,r.depth,'#f17c7c','#ff9999',.16)}
 for(const r of s.rooms){const t=el('text',{x:pad+(r.x+.12)*unit,y:pad+(r.z+.62)*unit,fill:'#dae4f7','font-size':Math.min(10,unit*.46)},r.id.replace(/^F\\d+-/,''));svg.append(t)}
 for(const a of s.options){if(!a.best)continue;const b=a.best;
  for(const p of b.proposedNewCorridorCells)rectangle(p.x,p.z,1,1,'#ffd166','#e9b54d',.84);
  rectangle(b.doorRoomCell.x,b.doorRoomCell.z,1,1,'#55d5a4','#beffea');
 }
 if(o?.best){const b=o.best;for(const p of b.proposedCorridorAirCells)rectangle(p.x+.19,p.z+.19,.62,.62,'#ffd166','#ffe0a1',.65);
  rectangle(b.newRoomRect.x,b.newRoomRect.z,b.newRoomRect.width,b.newRoomRect.depth,'none','#6be0fa');
  rectangle(b.doorRoomCell.x,b.doorRoomCell.z,1,1,'#48e9c9','#ffffff');
 }
 $('items').replaceChildren();for(const a of s.options){const button=document.createElement('button');button.className='item'+(a.portId===selected?' selected':'');
  const lbl=a.portId.split('/').at(-1),flag=a.best?'局所変更候補あり':'保留（より大きな改修が必要）';
  button.innerHTML=`<strong>${lbl} ／ ${a.templateId||'その他の分類'}</strong><span>${flag}</span>`;button.onclick=()=>{selected=a.portId;draw()};$('items').append(button)}
 if(!o){$('info').textContent='この階のB84追加対象はありません。';return}
 const p=o.best;if(!p){const reasons=Object.entries(o.rejections).sort((a,b)=>b[1]-a[1]).slice(0,6);
 $('info').textContent=`${o.portId}：保留\\n既知の障害：\\n${reasons.map(([k,v])=>`・${k}: ${v}`).join('\\n')}\\n\\n施工・削除・開口は未承認`;return}
 $('info').textContent=`${o.portId}：設計候補のみ\\n部屋形状：${p.changeType}\\n新廊下セル：${p.requiredCorridorReclassification}\\nドア位置変更：${p.doorMoved?'必要':'不要'}\\n新位置：(${p.doorRoomCell.x},${p.doorRoomCell.z})\\n接続先：(${p.verifiedNamedCorridorTarget.x},${p.verifiedNamedCorridorTarget.z})\\n\\nMinecraft実機のドア状態、建物全体の出口接続、レイアウト変更の承認は未完了。`;
}sec.addEventListener('change',()=>{selected='';draw()});sec.value=data.sections.find(s=>s.options.some(a=>a.best))?.id||data.sections[0].id;draw();
</script></body></html>'''
html=html.replace('__B84_DATA__',embedded)
(here/'B84_LAYOUT_REVIEW.html').write_text(html,encoding='utf-8')
print('B84_REVIEW_GENERATED',len(rows),'floors',len(html),'chars')
