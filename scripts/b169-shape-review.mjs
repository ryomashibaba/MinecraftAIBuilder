/**
 * B169 self-contained, browser-only shape comparator:
 * displays EXACT source-parsed test AABBs, no network and no construction.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dir=path.join(ROOT,'b169-fast-evidence');
const proof=JSON.parse(fs.readFileSync(path.join(dir,'B169_OFFLINE_COMPONENTS.json'),'utf8'));
const r=proof.report;
if(r.orientationVariants?.length!==8||
 r.constructionApproved!==false||
 r.educationVersionCustomMultiBoxVerified!==false||
 r.vanillaStairCollisionGeometryCertified!==false||
 r.gates?.some(x=>x!=='BLOCKED'))
 throw Error('B169_VIEW_FAIL_CLOSED');
const data=JSON.stringify({variants:r.orientationVariants,
 parentSourceSha256:r.originalSourceSha256,
 sourceBlocks:r.modelCells,collisionComponentsInSource:r.authoredCollisionComponents,
 exampleSlab:r.exampleSlabAabbs,
 documentation:r.bedrockDocs,
 schema:r.schema,
 proofSha256:r.sha256,
 worldWrites:0,
 minecraftEducationPhysicsVerified:false}).replaceAll('<','\\u003c');
const html=`<!doctype html><html lang="ja"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>B169 — Bedrock Pixel Collision Study</title>
<style>
:root{color-scheme:dark;font-family:system-ui,-apple-system,sans-serif;background:#081722;color:#edf9ff}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(ellipse 75% 45% at 50% -15%,#2c667b88,transparent),#081722}
main,header,footer{max-width:1030px;margin:auto;padding:22px 24px}
h1{font-size:clamp(29px,5vw,50px);line-height:1.08;letter-spacing:-.05em;margin:15px 0}
h2{font-size:20px}p{line-height:1.68;color:#afcbd8}
.eyebrow{color:#76ebce;font-size:11px;font-weight:800;letter-spacing:.17em}
.columns{display:grid;grid-template-columns:1fr 1fr;gap:15px}
.panel{background:#102935;border:1px solid #2a5264;border-radius:14px;padding:20px;margin-bottom:15px}
select{padding:11px;background:#08232c;color:white;border:1px solid #567f8b;border-radius:9px;font:inherit;width:100%}
label{display:block;font-size:12px;color:#d5e9ee;margin-bottom:8px}svg{width:100%;border:1px solid #365b64;background:#081b26;border-radius:12px}
.data{display:block;margin:10px 0;font:12px ui-monospace,monospace;color:#9dd6cd;word-break:break-all}
.warning{border-left:3px solid #f5b678;background:#45372688;padding:18px;border-radius:6px;margin:15px 0}
small{color:#acc5cc}a{color:#91eacc}.metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.metric{background:#183d4a;border-radius:10px;padding:16px}.metric b{font-size:22px;display:block}
@media(max-width:740px){.columns,.metrics{grid-template-columns:1fr}}
</style></head><body><header><div class="eyebrow">MINECRAFT AIBUILDER · B169 GEOMETRY LAB</div>
<h1>BEDROCK PIXEL<br>COLLISION STUDY</h1>
<p>公式の <code>minecraft:collision_box</code> の16分割座標形式を扱い、南北東西・上下反転で変化する「直線階段の仮想2箱モデル」を切り替えて確認します。</p>
<div class="metrics"><div class="metric"><small>座標単位</small><b>16 px</b></div><div class="metric"><small>階段モデル</small><b>8通り</b></div><div class="metric"><small>ワールド変更</small><b>0</b></div></div>
</header><main>
<div class="warning"><strong>このモデルは、Minecraft Educationの実際の階段形状を証明するものではありません。</strong><p>公式資料はデータ形式についての根拠であり、ここで表示する2箱階段はあくまで開発用の近似です。原作ゲームの階段、内角・外角、移動物理やMinecraft Education 26.3での新機能対応は確認していません。</p></div>
<div class="panel"><h2>01 — ブロックの衝突箱を表示</h2>
<div class="columns"><div><label for="face">階段の向き</label><select id="face"><option value="north">北</option><option value="south">南</option><option value="east">東</option><option value="west">西</option></select></div>
<div><label for="half">上下の設置状態</label><select id="half"><option value="bottom">下段</option><option value="top">上段（逆さ階段）</option></select></div></div>
<div class="columns" style="margin-top:16px"><div><small>上から見た衝突箱</small><svg id="top" viewBox="0 0 340 340" role="img" aria-label="水平XYではなくXZ平面の衝突投影"></svg></div>
<div><small>正面（Z側）から見た断面</small><svg id="front" viewBox="0 0 340 340" role="img" aria-label="XZ方向を奥行きで畳み込んだ正面投影"></svg></div></div>
<div id="parts" class="data"></div></div>
<div class="panel"><h2>02 — 実モデルとの照合</h2><p>現在のDOPPLERは<strong>フルブロックの建築セル</strong>としてコンパイルされます。衝突箱付きの実ブロックID、向き、上下半分などを持つデータは保存されておらず、仮想的な階段衝突箱に置き換えると「別の設計」になります。</p>
<div id="source" class="data"></div></div>
<div class="panel"><h2>03 — 仕様根拠</h2><div id="refs"></div><p>衝突箱 <code>minecraft:collision_box</code> と支持形状 <code>minecraft:support</code> は別のコンポーネントです。16px単位の箱を解析できても、実プレイヤーで通行できる保証にはなりません。</p></div>
</main><footer><small>READ-ONLY · NOT_PREPARED · 9 BLOCKED · no game writes</small></footer>
<script>
const data=__DATA__,el=id=>document.getElementById(id);
el('source').textContent='Source SHA256: '+data.parentSourceSha256+' | '+data.sourceBlocks+' voxel cells | Explicit collision components: '+data.collisionComponentsInSource+' | Game physics verified: NO';
el('refs').innerHTML=data.documentation.map((url,i)=>'<p><a rel="noopener noreferrer" target="_blank" href="'+url+'">公式資料 '+(i+1)+'</a></p>').join('');
function draw(svg,boxes,side){
 const k=v=>45+v*250;
 let out='<rect x="45" y="45" width="250" height="250" fill="none" stroke="#688d9d" stroke-width="2"/>';
 boxes.forEach((b,i)=>{
  const x0=k(b[0]),x1=k(b[3]);
  const z0=side?k(b[1]):k(b[2]);
  const z1=side?k(b[4]):k(b[5]);
  const y=side?340-z1:z0;
  out+='<rect x="'+x0+'" y="'+y+'" width="'+(x1-x0)+'" height="'+(z1-z0)+
   '" fill="'+(i===0?'#4fb6bb':'#ffc68e')+'" fill-opacity="'+(i===0?.57:.81)+
   '" stroke="'+(i===0?'#87ecdf':'#ffe0ad')+'" stroke-width="2"/>';
 });
 out+='<text x="48" y="28" fill="#aacdd7" font-size="12">local block 0...1</text>';
 svg.innerHTML=out;
}
function update(){
 const v=data.variants.find(x=>x.face===el('face').value&&x.half===el('half').value);
 draw(el('top'),v.aabbs,false);draw(el('front'),v.aabbs,true);
 el('parts').textContent=v.aabbs.map((b,i)=>'BOX '+(i+1)+' ['+b.join(', ')+']').join('  |  ')+
  '  |  Simulation geometry only · Not game-certified';
}
el('face').addEventListener('change',update);
el('half').addEventListener('change',update);update();
</script></body></html>`.replace('__DATA__',data);
fs.writeFileSync(path.join(dir,'index.html'),html);
console.log('B169_REVIEW_CREATED',JSON.stringify({
 html:dir+'/index.html',orientations:r.orientationVariants.length,
 proofSha256:r.sha256,gameCertified:false,worldWrites:0}));
