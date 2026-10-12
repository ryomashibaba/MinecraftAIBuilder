import json, pathlib, html
here=pathlib.Path(__file__).resolve().parent
root=here.parents[2]
r=json.load(open(here/'B86_JOINT_ENVELOPE_INTERIOR_REPORT.json',encoding='utf-8'))
b=json.load(open(root/'parallel/b66/main/B66_LOCAL_3D_ASSEMBLY.json',encoding='utf-8'))
shape={s['id']:s for s in b['sections']}
data=[]
for s in r['sections']:
 q=shape[s['id']]
 data.append({'id':s['id'],'mask':q['floorMaskRows'],'rooms':q['conceptRooms'],
   'corridors':q['conceptReservations']['corridors'],'stairs':q['conceptReservations']['stairs'],
   'elevators':q['conceptReservations']['elevators'],
   'candidates':[{'id':x['roomId'],'door':x['variants'][0]['doorRoomCell'],
     'hall':x['variants'][0]['doorHallCell'],'patches':x['variants'][0]['virtualLocalEnvelopePatch'],
     'structural':x['variants'][0]['structuralReviewRequired'],
     'path':x['variants'][0]['protectedRoute'],'core':x['variants'][0]['protectedRoomCore'],
     'glazing':x['variants'][0]['facadeGlazingCompensation']} for x in s['rooms'] if x['variants']],
   'held':[x['roomId'] for x in s['rooms'] if not x['variants']]})
page=r'''<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>MinecraftAIBuilder B86 | Envelope & Interior Review</title><style>
:root{color-scheme:dark;font-family:Inter,system-ui,-apple-system,'Yu Gothic UI',sans-serif;color:#e8eff6;background:#0c1420}
*{box-sizing:border-box}body{margin:0;padding:28px;max-width:1480px;margin-inline:auto}h1{letter-spacing:-.04em;font-size:30px;margin:0 0 6px}
.sub{color:#a9bccb;line-height:1.7;margin:4px 0 22px}.pills{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:18px}
.pill{border:1px solid #34485a;background:#172737;padding:10px 13px;border-radius:9px;font-size:13px}
.layout{display:grid;grid-template-columns:minmax(420px,1fr) 340px;gap:18px}.panel{background:#121f2c;border:1px solid #2d4255;border-radius:14px;padding:18px}
label{font-size:13px;color:#a8c3d7}select{border:1px solid #3b5771;background:#15293a;color:#f3f8fc;padding:10px;border-radius:7px;width:100%;margin:9px 0 18px}
canvas{background:#0b1724;width:100%;height:auto;image-rendering:pixelated;border-radius:8px}
.legend{display:flex;flex-wrap:wrap;gap:13px;margin-top:15px;color:#c4d4df;font-size:12px}.dot{width:10px;height:10px;display:inline-block;border-radius:2px;margin-right:5px}
.value{font-weight:750;font-size:24px}.muted{color:#a2b8c6}.note{padding:12px 0;border-bottom:1px solid #2d4052;font-size:13px;line-height:1.6}
.warn{border-left:3px solid #e1a954;padding:11px 13px;margin-top:15px;background:#292419;color:#f4deab;font-size:12px;line-height:1.7}
@media(max-width:900px){body{padding:16px}.layout{grid-template-columns:1fr}.panel{min-width:0}h1{font-size:24px}}
</style></head><body><h1>B86 — 外殻 × 室内の一体設計</h1>
<p class="sub">本番Planner固定出力から作った非施工オフライン設計レビュー。壁・ドア枠と窓の関係を階別に表示します。<b>未承認／NOT_PREPARED</b>。</p>
<div class="pills"><span class="pill"><b>5</b> 棟 / 30階</span><span class="pill"><b>9</b> 新しい候補</span><span class="pill"><b>6</b> 主要壁の審査が必要</span><span class="pill"><b>18</b> 保留</span><span class="pill">実施工 <b>0</b> 件</span></div>
<div class="layout"><section class="panel"><label for="floor">建物・階を選択</label><select id="floor"></select>
<canvas id="stage" width="850" height="660" aria-label="フロア平面図"></canvas>
<div class="legend"><span><i class="dot" style="background:#1c4663"></i>名目床</span><span><i class="dot" style="background:#47799b"></i>廊下</span><span><i class="dot" style="background:#587d71"></i>階段/EV</span><span><i class="dot" style="background:#29d5c7"></i>室内ドア候補</span><span><i class="dot" style="background:#f0b84e"></i>仮想的な主要壁変更</span><span><i class="dot" style="background:#de7a9b"></i>再設計が必要な部屋</span></div>
</section><aside class="panel"><div class="muted">選択中</div><div id="name" class="value"></div><p id="counts" class="muted"></p><div id="notes"></div>
<div class="warn"><b>施工不可</b>：黄点は主要壁・外観への仮想的な変更案であり、本番への変更ではありません。ドアの向き・蝶番、建物全体の避難動線、階段、耐力、安全法規は未検証です。</div>
</aside></div><script>
const DATA=__DATA__;
const select=document.getElementById('floor'),canvas=document.getElementById('stage'),ctx=canvas.getContext('2d');
DATA.forEach((s,i)=>{let o=document.createElement('option');o.value=i;o.textContent=s.id.replace('/candidate-01','').replace('/candidate-02',' ②').replace('/candidate-03',' ③');select.append(o)});
const ink=(s)=>{ctx.fillStyle=s};function block(x,z,size,ox,oz,color,pad=0){ink(color);ctx.fillRect(ox+x*size+pad,oz+z*size+pad,Math.max(1,size-2*pad),Math.max(1,size-2*pad))}
function draw(){const s=DATA[+select.value]||DATA[0],H=s.mask.length,W=s.mask[0].length;
 ctx.clearRect(0,0,850,660);ink('#091524');ctx.fillRect(0,0,850,660);
 const size=Math.min(26,760/W,590/H),ox=Math.round((850-W*size)/2),oz=Math.round((660-H*size)/2);
 for(let z=0;z<H;z++)for(let x=0;x<W;x++)if(s.mask[z][x]==='1')block(x,z,size,ox,oz,'#1c4663',.5);
 for(const p of s.corridors)block(p.x,p.z,size,ox,oz,'#47799b',.8);
 for(const p of [...s.stairs,...s.elevators])block(p.x,p.z,size,ox,oz,'#587d71',1.5);
 const held=new Set(s.held);
 for(const r of s.rooms){const flagged=held.has(r.id);ctx.strokeStyle=flagged?'#de7a9b':'#68859e';ctx.lineWidth=flagged?2.4:1;
  ctx.strokeRect(ox+r.x*size+.9,oz+r.z*size+.9,r.width*size-1.8,r.depth*size-1.8);
  ctx.font=`${Math.max(7,Math.min(11,size*.55))}px system-ui`;ctx.fillStyle=flagged?'#ffd0df':'#c5dbea';ctx.fillText(r.id.replace(/^F\d+-/,''),ox+r.x*size+2,oz+r.z*size+Math.max(8,size*.75));}
 for(const c of s.candidates){
  for(const k of [...c.core,...c.path]){const parts=k.split(',').map(Number);block(parts[0],parts[1],size,ox,oz,'#256e76',size*.26)}
  for(const v of c.patches)block(v.x,v.z,size,ox,oz,c.structural?'#f0b84e':'#45bf93',size*.17);
  block(c.hall.x,c.hall.z,size,ox,oz,'#23a8cb',size*.28);
  block(c.door.x,c.door.z,size,ox,oz,'#29d5c7',size*.14);
 }
 document.getElementById('name').textContent=s.id;
 document.getElementById('counts').textContent=`新候補 ${s.candidates.length} / 未解決 ${s.held.length}室`;
 document.getElementById('notes').innerHTML='';const add=t=>{const el=document.createElement('div');el.className='note';el.textContent=t;document.getElementById('notes').append(el)};
 if(!s.candidates.length)add('この階にはB86の新しい候補はありません。既存の設計候補は保持されています。');
 for(const c of s.candidates)add(`${c.id}: 面積100%維持。仮想変更 ${c.patches.length}ボクセル。${c.structural?'主要壁の構造確認が必須':'二次壁の再設計候補'}`);
 if(s.held.length)add(`保留: ${s.held.join('、')}`);
}
select.addEventListener('change',draw);draw();
</script></body></html>'''
out=page.replace('__DATA__',json.dumps(data,separators=(',',':'),ensure_ascii=False))
(here/'B86_JOINT_FLOOR_REVIEW.html').write_text(out,encoding='utf8')
print('saved',len(out),'bytes')
