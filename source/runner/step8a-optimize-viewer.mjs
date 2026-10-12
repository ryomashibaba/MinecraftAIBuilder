// Step8A.5 self-contained offline side-by-side schematic floor visualization.
export function renderOptimizationHtml(report){
 const data=report.candidates.map(c=>({title:c.title,dimensions:c.concept.BuildingComposition.dimensions,massing:c.concept.Massing.rectangles,
  floors:c.detail.roomsAndCorridors.floors.map(f=>({level:f.level,rooms:f.rooms,corridorCells:f.corridorCells,coreStairCells:f.coreStairCells,elevatorCells:f.elevatorCells})),
  optimization:c.optimization}));
 const json=JSON.stringify(data).replace(/[<>&\u2028\u2029]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));
 return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Step8A.5 設計自動改善レビュー</title>
 <style>:root{color-scheme:dark;font:14px system-ui,'Noto Sans JP',sans-serif;background:#0b1422;color:#f3f7ff}*{box-sizing:border-box}body{max-width:1500px;margin:auto;padding:22px}h1{font-size:25px}p{color:#b8c9df;line-height:1.65}.banner{border:1px solid #8a6c42;background:#2d2926;padding:12px;border-radius:10px}.tools{display:flex;gap:14px;flex-wrap:wrap;align-items:center;margin:18px 0}.tools select,.tools input{background:#1a2d47;color:white;border:1px solid #64809d;border-radius:6px;padding:5px}.panes{display:grid;grid-template-columns:1fr 1fr;gap:16px}.pane,.metrics{border:1px solid #3a5675;background:#14253c;padding:13px;border-radius:12px}.pane svg{width:100%;height:auto;max-height:630px;background:#0e1c2e}.key{display:inline-block;width:11px;height:11px;margin:0 4px 0 10px}.status{font-size:13px;color:#bce0c9}.error{color:#ffd39c}footer{padding:20px 0;font-size:12px;color:#b8c9df}@media(max-width:850px){.panes{grid-template-columns:1fr}body{padding:10px}}</style></head><body>
 <h1>Step 8A.5 — 平面再設計候補の比較</h1><p class="banner">**NOT PREPARED / 概念設計の比較専用** — 既存施工データを変更せず、Step8A.4の仮予約干渉を再評価した結果です。干渉0件はMinecraftでの施工可能・法令適合・階段昇降・材料安全を意味しません。部屋割りとドア位置は候補ごとに変わります。</p>
 <div class="tools"><label>建物 <select id="candidate"></select></label><label>改善案 <select id="proposal"></select></label><label>階 <input id="floor" type="range" min="1" max="10" value="1"></label><b id="floorNumber"></b></div>
 <div class="panes"><section class="pane"><h2>変更前（原案）</h2><svg id="before" viewBox="0 0 600 580" role="img" aria-label="原案の平面図"></svg></section><section class="pane"><h2>変更候補（自動承認しない）</h2><svg id="after" viewBox="0 0 600 580" role="img" aria-label="改善案の平面図"></svg></section></div>
 <p><span class="key" style="background:#b4c6d9"></span>床 <span class="key" style="background:#4c9ed9"></span>通路 <span class="key" style="background:#7f8fdb"></span>部屋 <span class="key" style="background:#e9a65b"></span>階段 <span class="key" style="background:#66dfc9"></span>EV <span class="key" style="background:#ffe0a7"></span>ドア意図</p>
 <section class="metrics"><h2 id="resultTitle"></h2><div id="metrics"></div><h3>棄却した案と理由</h3><div id="trials"></div></section>
 <footer>BuildPlan = NOT_PREPARED / operations = [] / commandCount = 0 / constructionApproved = false / executionAllowed = false。すべてローカル表示・外部通信なし。現地施工禁止。</footer>
 <script type="application/json" id="model">${json}</script><script>(()=>{'use strict';const values=JSON.parse(document.getElementById('model').textContent),$=id=>document.getElementById(id);let selected=0;
 const ns='http://www.w3.org/2000/svg';function el(tag,attrs){const e=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs||{}))e.setAttribute(k,String(v));return e;}
 function draw(target,building,floor,layout){const svg=$(target),w=building.dimensions.width,d=building.dimensions.depth,scale=Math.min(17,490/Math.max(w,d)),ox=(600-w*scale)/2,oz=(580-d*scale)/2;
  svg.textContent='';function tile(x,z,color){svg.appendChild(el('rect',{x:ox+x*scale,y:oz+z*scale,width:scale,height:scale,fill:color}));}
  for(const r of building.massing)if(r.start<=floor-1&&floor-1<r.end)for(let z=r.z;z<r.z+r.depth;z++)for(let x=r.x;x<r.x+r.width;x++)tile(x,z,'#b4c6d9');
  for(const p of layout.corridorCells)tile(p.x,p.z,'#4c9ed9');
  for(const room of layout.rooms){svg.appendChild(el('rect',{x:ox+room.x*scale,y:oz+room.z*scale,width:room.width*scale,height:room.depth*scale,fill:'#7f8fdb',stroke:'#20304c','stroke-width':Math.max(1,scale*.12)}));tile(room.door.x,room.door.z,'#ffe0a7');}
  for(const p of layout.coreStairCells)tile(p.x,p.z,'#e9a65b');for(const p of layout.elevatorCells)tile(p.x,p.z,'#66dfc9');
 }
 function write(target,text){const n=document.createElement('div');n.textContent=text;$(target).appendChild(n);}
 function update(){const b=values[selected],p=b.optimization.proposals[Number($('proposal').value)||0],f=Number($('floor').value);$('floorNumber').textContent=f+'F';draw('before',b,f,b.floors[f-1]);draw('after',b,f,p?p.floors[f-1]:b.floors[f-1]);$('resultTitle').textContent=b.optimization.status;
  $('metrics').textContent='';write('metrics','元の仮予約干渉: '+b.optimization.baseline.collisions+'件');
  if(p){write('metrics','候補: '+p.label);write('metrics','変更後の仮予約干渉: '+p.revised.collisionCount+'件');write('metrics','削減数: '+p.delta.collisionsRemoved+'件（実建築の保証ではありません）');write('metrics','部屋数差分: '+p.delta.roomCountDifference+' / 室内有効面積差分: '+p.delta.usableRoomAreaDifference+'ブロック相当');}else write('metrics','品質低下なしに改善を確認できた案はありません。原案を維持します。');
  $('trials').textContent='';for(const t of b.optimization.trials){write('trials',t.id+' — '+t.status+(t.reason?' / '+t.reason:''));}
 }
 function fillProposal(){const p=$('proposal'),items=values[selected].optimization.proposals;p.textContent='';if(!items.length){const o=document.createElement('option');o.value='0';o.textContent='改善なし（原案を表示）';p.appendChild(o);}else items.forEach((v,i)=>{const o=document.createElement('option');o.value=i;o.textContent=v.label;p.appendChild(o);});p.value='0';$('floor').max=values[selected].floors.length;$('floor').value='1';update();}
 values.forEach((v,i)=>{const o=document.createElement('option');o.value=i;o.textContent=(i+1)+'. '+v.title;$('candidate').appendChild(o);});
 $('candidate').onchange=e=>{selected=Number(e.target.value);fillProposal();};$('proposal').onchange=update;$('floor').oninput=update;fillProposal();})();</script></body></html>`;
}
