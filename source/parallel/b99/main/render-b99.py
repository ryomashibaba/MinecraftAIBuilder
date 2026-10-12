"""Create a self-contained offline, read-only diagnostic page for 5 buildings / 30 nominal floors."""
import json, pathlib, html
HERE=pathlib.Path(__file__).resolve().parent
ROOT=HERE.parents[2]
b99=json.loads((HERE/'B99_ARCHITECTURE_SAFETY_REPORT.json').read_text())
b98=json.loads((ROOT/'parallel/b98/main/B98_ATRIUM_WING_REPORT.json').read_text())
b97=json.loads((ROOT/'parallel/b97/main/B97_CONNECTED_GALLERY_REPORT.json').read_text())
options=[]
for branch in (b98['apartment'],b98['office01']):
 for o in branch['options']:
  diag=(b99['apartment'] if branch is b98['apartment'] else b99['office01'])['options']
  au=next(x for x in diag if x['id']==o['id'])
  options.append({'id':o['id'],'buildingId':branch['buildingId'],'source':'B99_INDEPENDENT_B98_GEOMETRY_AUDIT',
                  'floors':[{'mask':f['originalFloorMaskRows'],'added':f['proposalFloorMask']['addedCells'],
                            'gallery':f['gallery'],'reserved':f['reservedSites'],'core':f['core'],
                            'rooms':f['rooms'],'columns':af['structure']['conceptualAtriumColumnSites'],
                            'bottlenecks':af['geometry']['singleAnchorCutSamples'],
                            'metrics':{'nominalBays':af['nominalTwoCellEntranceBays'],
                             'absentBays':len(af['failedOrMissingNominalBays']),
                             'deckCells':af['structure']['newConceptDeckCells'],
                             'anchorCuts':af['geometry']['singleAnchorCutCount'],
                             'corridorAnchors':af['geometry']['twoByTwoWalkableAnchorCount'],
                             'courtyardOpenRatio':af['structure']['retainedCourtyardOpeningFraction'],
                             'courtyardColumnRatio':af['structure']['conservativeOpeningAfterFourConceptColumns'],
                             'stairNeighborOnly':af['geometry']['conceptReachesReservedStairNeighbor']}}
                           for f,af in zip(o['sections'],au['floors'])],
                  'status':'検証前の新設計・施工不可'})
for b in b97['buildings']:
 if b['buildingId'] in ('apartment/candidate-01','office/candidate-01'):continue
 o=b['options'][0]
 options.append({'id':'B97_REFERENCE','buildingId':b['buildingId'],'source':'UNCHANGED_B97_REFERENCE_ONLY',
                 'floors':[{'mask':f['floorMaskRows'],'added':[],
                            'gallery':f['gallerySites'],'reserved':f['virtualReference']['stairs']+f['virtualReference']['elevators'],
                            'core':f['core'],'rooms':[{'roomId':r['roomId'],'room':r['room'],'entranceBay':r.get('frontage')} for r in f['rooms']],
                            'columns':[],'bottlenecks':[],
                            'metrics':{'nominalBays':sum(bool(r.get('frontage',{}).get('pairedCorridorFrontage')) for r in f['rooms'] if r.get('frontage')),
                            'absentBays':sum(not(r.get('frontage') and r['frontage'].get('pairedCorridorFrontage')) for r in f['rooms']),
                            'deckCells':0,'anchorCuts':None,'corridorAnchors':None,'courtyardOpenRatio':None,'courtyardColumnRatio':None,
                            'stairNeighborOnly':None}} for f in o['sections']],
                 'status':'B97参照のみ・B99未更新'})
data=json.dumps({'options':options,'totals':b99['totals']},ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')
page=r'''<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>B99｜建築・通路リスク審査（施工不可）</title><style>
:root{font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color-scheme:dark;background:#071121;color:#e7effc}
*{box-sizing:border-box}body{max-width:1520px;margin:auto;padding:24px}h1{font-size:clamp(1.4rem,3vw,2.3rem);margin:0 0 12px}
p{line-height:1.6;color:#bac9dc}.warn{padding:12px 16px;border:1px solid #dc9d52;background:#2a2118;border-radius:12px;color:#ffe3b9;margin:16px 0}
.panel{background:#101f32;border:1px solid #2c4159;border-radius:15px;padding:17px}.controls{display:flex;gap:14px;flex-wrap:wrap;align-items:end}
label{display:flex;flex-direction:column;gap:6px;font-size:13px;color:#9bb0ca}select,input{background:#0a1828;color:#f1f7ff;border:1px solid #405775;border-radius:8px;padding:9px;min-width:175px;font:inherit}
#floor{min-width:220px;accent-color:#77bdf7}.columns{display:grid;grid-template-columns:minmax(360px,1.7fr) minmax(280px,1fr);gap:14px;margin-top:14px}
@media(max-width:800px){.columns{grid-template-columns:1fr}}svg{width:100%;height:auto;max-height:670px;border-radius:9px;background:#081420}
.metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.stat{background:#0b1728;border-radius:8px;padding:12px;min-height:88px}.stat strong{display:block;font-size:20px;margin-top:8px;color:#fff}.stat span{color:#9db3cd;font-size:12px}
.legend{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0;font-size:12px}.legend b{padding:6px 10px;border-radius:8px;background:#1c2c40;font-weight:500}
footer{font-size:12px;color:#8ea4bc;margin:20px 0}.detail{font-size:13px;color:#bbcadb;line-height:1.6}
</style></head><body><h1>B99 建物全体・安全フロンティア</h1>
<p>中庭回廊・南側新棟の入口候補、片方向に依存する通路、基礎と支持が未検証の増床を重ねて表示します。ホテルとオフィス02/03はB97設計の無変更参照です。</p>
<div class="warn"><strong>NOT_PREPARED｜施工禁止｜9 Gate BLOCKED</strong><br>表示する柱・廊下・ドアはすべて概念図です。構造安全・避難経路・実ドア開閉・採光の実測を検証したものではありません。元の建物および296室の候補には変更を加えていません。</div>
<div class="panel controls"><label>建物<select id="building"></select></label><label>設計比較<select id="variant"></select></label><label>階数：<strong id="floorname">1階</strong><input type="range" id="floor" min="1" max="6" step="1" value="1"></label></div>
<div class="columns"><section class="panel"><svg id="plan" aria-label="建物平面図" viewBox="0 0 800 640"></svg>
<div class="legend"><b style="color:#9fb4ca">■ 旧床</b><b style="color:#5aaffb">■ 新回廊</b><b style="color:#ffb975">■ 室</b><b style="color:#e85d74">■ 未接続室</b><b style="color:#b6a0fd">■ 階段予約</b><b style="color:#fff27c">● 柱案／弱点</b></div>
</section><aside class="panel"><h2 id="buildingname">設計監査</h2><p id="status"></p><div class="metrics" id="metrics"></div><h3>確認上の限界</h3><div class="detail" id="detail"></div></aside></div>
<footer>オフライン専用レビュー｜世界接続0｜生成コマンド0｜原本の変更0｜いずれの建築案も未承認</footer>
<script>const DATA=/*DATA*/;
const $=id=>document.getElementById(id),unique=x=>[...new Set(x)],key=x=>x.x+','+x.z;
const groups=unique(DATA.options.map(x=>x.buildingId));$('building').innerHTML=groups.map(x=>'<option value="'+x+'">'+x+'</option>').join('');
function variants(){let opts=DATA.options.filter(x=>x.buildingId===$('building').value);$('variant').innerHTML=opts.map(x=>'<option value="'+x.id+'">'+x.id+'</option>').join('');
 if(opts.find(x=>x.id==='RING_NORTH_WEST_SOUTH'))$('variant').value='RING_NORTH_WEST_SOUTH';update()}
function update(){const opt=DATA.options.find(x=>x.buildingId===$('building').value&&x.id===$('variant').value);if(!opt)return;
 let idx=+$('floor').value-1,f=opt.floors[Math.min(idx,opt.floors.length-1)],w=f.mask[0].length,h=f.mask.length;
 $('floorname').textContent=(idx+1)+'階';$('buildingname').textContent=opt.buildingId+' / '+opt.id;$('status').textContent=opt.status;
 let m=f.metrics;let badges=[['幅2セル入口候補',m.nominalBays+'室'],['未接続・未配置',m.absentBays+'室'],['新設床概念セル',m.deckCells],['単一点に依存する経路',m.anchorCuts===null?'B99未検査':m.anchorCuts],['幅2セル通路基点',m.corridorAnchors===null?'B99未検査':m.corridorAnchors],['中庭開放比率',m.courtyardOpenRatio===null?'対象外':(m.courtyardOpenRatio*100).toFixed(1)+'%']];
 $('metrics').innerHTML=badges.map(x=>'<div class="stat"><span>'+x[0]+'</span><strong>'+x[1]+'</strong></div>').join('');
 $('detail').textContent='階段・昇降機は予約位置への近接判定だけ。実際の避難出口・二方向避難・3D頭上空間・柱梁荷重・基礎・屋根防水・採光は未検証。'+(m.courtyardColumnRatio===null?'':'仮想柱4本で中庭開放比率は'+(m.courtyardColumnRatio*100).toFixed(1)+'%相当（構造検証なし）。');
 let S=600/Math.max(w,h),X=(800-w*S)/2,Z=(640-h*S)/2;
 let shapes=[],rc=(x,z,color,opacity=.85,stroke='none')=>`<rect x="${X+x*S+.35}" y="${Z+z*S+.35}" width="${S-.7}" height="${S-.7}" fill="${color}" fill-opacity="${opacity}" stroke="${stroke}" stroke-width=".4"/>`;
 for(let z=0;z<h;z++)for(let x=0;x<w;x++)if(f.mask[z][x]==='1')shapes.push(rc(x,z,'#32445a',.9));
 for(let q of f.added)shapes.push(rc(q.x,q.z,'#1767aa',.8));
 for(let q of f.gallery)shapes.push(rc(q.x,q.z,'#4baefa',.8));
 for(let r of f.rooms)if(r.room){let fill=r.entranceBay?'#f2b35c':'#e56881';for(let z=r.room.z;z<r.room.z+r.room.depth;z++)for(let x=r.room.x;x<r.room.x+r.room.width;x++)shapes.push(rc(x,z,fill,.7));}
 for(let q of f.reserved)shapes.push(rc(q.x,q.z,'#a992fd',1));
 if(f.core)for(let z=f.core.z;z<f.core.z+f.core.depth;z++)for(let x=f.core.x;x<f.core.x+f.core.width;x++)shapes.push(rc(x,z,'#b6daff',.85));
 for(let q of f.columns)shapes.push(`<circle cx="${X+(q.x+.5)*S}" cy="${Z+(q.z+.5)*S}" r="${S*.32}" fill="#f9d76e"/>`);
 for(let q of f.bottlenecks)shapes.push(`<circle cx="${X+(q.x+1)*S}" cy="${Z+(q.z+1)*S}" r="${S*.11}" fill="#e73f71"/>`);
 $('plan').setAttribute('viewBox','0 0 800 640');$('plan').innerHTML=shapes.join('');}
$('building').addEventListener('change',variants);$('variant').addEventListener('change',update);$('floor').addEventListener('input',update);$('building').value='apartment/candidate-01';variants();
</script></body></html>'''
(HERE/'B99_ARCHITECTURE_REVIEW.html').write_text(page.replace('/*DATA*/',data),encoding='utf8')
print('viewer bytes',(HERE/'B99_ARCHITECTURE_REVIEW.html').stat().st_size,'options',len(options),'floors',sum(len(o['floors']) for o in options))
