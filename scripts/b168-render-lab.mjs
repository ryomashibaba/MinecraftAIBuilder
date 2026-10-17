/**
 * B168 self-contained interactive review artifact.
 * Displays source-computed laboratory profiles, not a client-side claim of
 * game physics. Can be opened from the Actions artifact without a webserver.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createFixture,planFractionalWalk,runCollisionLab}
 from '../source/ai/b168-fractional-collision-lab.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const original=JSON.parse(fs.readFileSync(path.join(ROOT,
 'designs/ai/interiors/doppler-switchback-terminal-r0.json'),'utf8'));
export function buildCollisionView(){
 const cases=[];
 for(const kind of ['half-step','full-step','low-ceiling','lateral-wall']){
  const fx=createFixture(kind);
  for(const width of [1,2]){
   for(const maxStepHeight of [.5,1]){
    const r=planFractionalWalk(fx.world,fx.start,fx.goal,
     {width,depth:width,maxStepHeight});
    cases.push({kind,width,maxStepHeight,status:r.status,
     reachable:r.reachable,moves:r.moves,path:r.path,
     modelSha256:r.sha256});
   }
  }
 }
 const result=runCollisionLab(original).report;
 const serialized=JSON.stringify({cases,
  stairs:result.actualStairs,
  inheritedSourceSha256:result.sceneSha256,
  assumptions:result.transitionSemantics,
  constructionApproved:false,worldWrites:0,
  verifiedMinecraftPhysics:false}).replaceAll('<','\\u003c');
 const document=`<!doctype html>
<html lang="ja"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>B168 — Fractional Collision Lab</title>
<style>
:root{color-scheme:dark;font-family:system-ui,-apple-system,sans-serif;background:#071520;color:#e6faf6}
*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(ellipse 90% 50% at 50% -15%,#174a5e 0%,transparent 80%),#071520}
header,main,footer{max-width:1060px;margin:auto;padding:25px 24px}
h1{font-size:clamp(28px,5vw,52px);line-height:1.09;letter-spacing:-.045em;margin:15px 0}
small,.muted{color:#aac1c5}p{line-height:1.7;color:#bad1d6}
.eyebrow{font-size:11px;font-weight:800;letter-spacing:.17em;color:#74ffe1}
.panel{border:1px solid #2b5360;border-radius:18px;background:#102732bf;padding:24px;margin:16px 0}
.kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.kpi{padding:16px;border-radius:12px;background:#183745}.kpi b{font-size:24px;display:block;margin-top:4px}
form{display:grid;grid-template-columns:2fr 1fr 1fr;gap:12px}
label{display:block;font-size:12px;color:#aac7c9;margin-bottom:9px}
select{display:block;width:100%;color:#f1fffc;background:#0b222d;border:1px solid #4d777c;border-radius:8px;padding:10px;font:inherit}
.result{font-size:21px;font-weight:800;margin:20px 0 12px}
svg{max-width:100%;border:1px solid #28505e;border-radius:12px;background:#091c26}
.status-pass{color:#83f5c4}.status-fail{color:#ffc292}
.two{display:grid;grid-template-columns:1fr 1fr;gap:16px}
code{word-break:break-all;font-size:11px;color:#acdad2}
.warning{border-left:3px solid #f2bc79;background:#49392270;padding:14px 18px;border-radius:6px}
@media(max-width:720px){.kpis,.two,form{grid-template-columns:1fr}header,main,footer{padding:18px}}
</style></head><body>
<header><div class="eyebrow">MINECRAFT AIBUILDER · DESIGN-ONLY EXPERIMENT B168</div>
<h1>PARTIAL HEIGHT<br>COLLISION LAB</h1>
<p>階段・半ブロックの通過条件を、仮想的なプレイヤー当たり判定の幅、昇段上限、頭上の衝突から比較。Minecraft実機の正確な再現ではありません。</p>
<div class="kpis"><div class="kpi"><small>段差の解像度</small><b>0.5 block</b></div>
<div class="kpi"><small>パラメータ比較</small><b>16 combinations</b></div>
<div class="kpi"><small>施工権限</small><b>0 writes</b></div></div></header>
<main>
<div class="panel">
<h2>01 — 仮想の段差実験</h2>
<form>
<div><label for="kind">実験条件</label><select id="kind">
<option value="half-step">半ブロック段差（高さ0.5）</option>
<option value="full-step">通常段差（高さ1）</option>
<option value="low-ceiling">低い天井</option>
<option value="lateral-wall">立体障壁</option></select></div>
<div><label for="width">仮想プレイヤー幅</label><select id="width"><option value="2">2×2</option><option value="1">1×1</option></select></div>
<div><label for="rise">昇段上限</label><select id="rise"><option value="0.5">0.5</option><option value="1">1.0</option></select></div>
</form>
<div class="result" id="status" aria-live="polite">解析結果</div>
<p id="explanation"></p>
<svg id="section" viewBox="0 0 900 310" role="img" aria-label="通路断面図"><g id="geometry"></g><g id="journey"></g></svg>
<p class="muted">黄色の線は2D断面に投影した離散的な経路です。再計算は下記のソース検証済みデータで行い、ブラウザ内で勝手に成功判定を生成しません。</p>
</div>
<div class="panel"><h2>02 — DOPPLERでの実設計比較</h2>
<div class="two" id="real"></div></div>
<div class="warning"><strong>建築許可・Minecraft移動の認証ではありません。</strong>
<p>ここでの衝突検査はAABBボックスと、試行的な「少しでも接地していれば支持あり」という接触率の仮定を使用しています。
Minecraft Educationの本物のプレイヤー寸法・階段のブロック状態・ジャンプ・速度・衝突処理を取得していません。
実モデルの階段は依然としてフルブロックで、仮想半ブロックは設置していません。</p>
<small>NOT_PREPARED · 9 BLOCKED · BuildPlan.operations=[]</small></div>
<p><small>Original model SHA256: <code id="sha"></code></small></p>
</main><footer><small>B168 offline experimental collision study · no external requests</small></footer>
<script>
const data=${serialized};
const $=id=>document.getElementById(id);
$('sha').textContent=data.inheritedSourceSha256;
const titles={north:'NORTH WING',south:'SOUTH WING'};
$('real').innerHTML=data.stairs.map(s=>'<div class="kpi"><small>'+titles[s.wing]+'</small>'+
 '<p>原形状: '+s.regionBoxes+'個の完全立方体ボクセル</p>'+
 '<div>2×2・昇段0.5：<b style="font-size:15px">'+
 (s.stepHalf2x2Reachable?'実験上通過':'実験上不通')+'</b></div>'+
 '<div>1×1・昇段1：<b style="font-size:15px">'+
 (s.step1x1Reachable?'実験上通過':'実験上不通')+'</b></div>'+
 '<p class="muted">Minecraft実機認証なし／この簡易モデル以外では結果が異なる可能性あり</p></div>').join('');
function render(){
 const kind=$('kind').value,width=Number($('width').value),rise=Number($('rise').value);
 const r=data.cases.find(x=>x.kind===kind&&x.width===width&&x.maxStepHeight===rise);
 const ok=r.reachable;
 $('status').className='result '+(ok?'status-pass':'status-fail');
 $('status').textContent=ok?'PASS · この簡易モデルで接続を検出':'HOLD · この簡易モデルでは到達不可';
 $('explanation').textContent=ok?'探索 '+r.moves+' 回の半ブロック移動。物理挙動の認証ではありません。':
  '状態: '+r.status+'。Minecraftで絶対に通れないという意味ではありません。';
 const y=val=>270-60*val,z=val=>55+70*val;
 let blocks='<rect x="40" y="'+y(1)+'" width="820" height="60" fill="#335a60"/>';
 const top=kind==='full-step'?2:1.5;
 if(kind==='full-step'||kind==='half-step'||kind==='low-ceiling'){
  blocks+='<rect x="'+z(3)+'" y="'+y(top)+'" width="'+(z(9)-z(3))+
   '" height="'+(60*(top-1))+'" fill="#58a5a7"/>';
 }
 if(kind==='low-ceiling')blocks+='<rect x="'+z(3)+'" y="'+y(3.5)+
 '" width="'+(z(9)-z(3))+'" height="30" fill="#e4a782"/>';
 if(kind==='lateral-wall')blocks+='<rect x="'+z(2)+'" y="'+y(4)+
 '" width="35" height="180" fill="#e4a782"/>';
 $('geometry').innerHTML=blocks;
 const xs=r.path.map(p=>z(p[2])+15),ys=r.path.map(p=>y(p[1]) - 6);
 $('journey').innerHTML=ok?'<polyline points="'+xs.map((x,i)=>x+','+ys[i]).join(' ')+
 '" fill="none" stroke="#ffe09a" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>':
 '<text x="70" y="46" fill="#ffcc9c" font-size="17">BLOCKED UNDER SELECTED ASSUMPTIONS</text>';
}
['kind','width','rise'].forEach(n=>$(n).addEventListener('change',render));
render();
</script></body></html>`;
 const dir=path.join(ROOT,'b168-evidence');
 fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'index.html'),document);
 return {file:path.join(dir,'index.html'),caseCount:cases.length,
  inheritedSourceSha256:result.sceneSha256};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 console.log('B168_VIEW_RESULT',JSON.stringify(buildCollisionView()));
}
