/** Synthetic comparisons and unapproved 3D artifacts. No provider imports/calls. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {studyR190AG,r190AGSemanticProjection} from '../source/ai/r190ag-integrated-proposals.mjs';
import {inspectR190ABSemanticReply} from '../source/ai/r190ab-semantic-contract.mjs';
import {inspectR190ADReply} from '../source/ai/r190ad-expressive-semantic-contract.mjs';
import {inspectR190AEReply} from '../source/ai/r190ae-flexible-semantic-contract.mjs';
import {inspectR190AFIntent} from '../source/ai/r190af-program-intent.mjs';
import {jointWindowFixture,featuredFixture,plainFixtures} from './r190ag-synthetic-fixtures.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
import {renderR164Elevation} from './r164-exterior-audit.mjs';
const write=(file,s)=>fs.writeFileSync(file,s,{flag:'wx'});
const json=(file,v)=>write(file,JSON.stringify(v,null,2)+'\n');
export function writeR190AGComparison(out,{maxLayoutVariantsPerStrategy=1}={}){
 if(!path.isAbsolute(out)||fs.existsSync(out)||!fs.statSync(path.dirname(out)).isDirectory())throw Error('R190AG_NEW_ABSOLUTE_OUTPUT_REQUIRED');
 const template=fs.readFileSync(new URL('../source/ai/b143-viewer-template.html',import.meta.url),'utf8');
 fs.mkdirSync(out);
 const studies=[],links=[];
 const fixtures=[...plainFixtures(),jointWindowFixture(),featuredFixture()];
 for(const [i,p] of fixtures.entries()){
  const dir=path.join(out,'synthetic-'+i);fs.mkdirSync(dir);
  const raw=JSON.stringify(p),r=studyR190AG(raw,{maxLayoutVariantsPerStrategy}),semantic=JSON.stringify(r190AGSemanticProjection(p));
  const ab=inspectR190ABSemanticReply(semantic).report;
  const ad=inspectR190ADReply(semantic).report;
  const ae=inspectR190AEReply(semantic).report;
  const af=inspectR190AFIntent(raw);
  // AB/AD/AE are run on the SAME normalized no-coordinate intent projection.
  // Missing required feature fields are contract differences, not model failure.
  const comparison={input:'SYNTHETIC_NOT_A_MODEL_RESPONSE',
   comparisonScope:'STRUCTURAL_NO_GLAZING_COORDINATES_PROJECTION_NOT_MODEL_CAPABILITY',
   ab:{status:ab.status,error:ab.error},ad:{status:ad.status,error:ad.error},
   ae:{status:ae.status,error:ae.error},af:{status:af.status,error:af.error},ag:r.report};
  json(path.join(dir,'SYNTHETIC_INTENT.json'),p);
  json(path.join(dir,'COMPARISON.json'),comparison);
  const scenes=[];
  if(r.baseline)scenes.push(['original-no-glass',r.baseline]);
  for(const proposal of r.proposals){
   const variantTag=proposal.layoutVariantIndex>0?'-layout'+proposal.layoutVariantIndex:'';
   const name=proposal.strategy+variantTag;
   scenes.push([name+'-no-glass',proposal.baseline]);
   scenes.push([name+'-UNAPPROVED-glass',proposal.trial]);
  }
  for(const [name,built] of scenes){
   // Exact B143 source and exact template. Never change the design for a view.
   json(path.join(dir,name+'.b143.json'),built.design);
   const html=renderB143Html(compileB143Gallery([built.design]),template);
   if(!html.includes('<body>'))throw Error('R190AG_VIEWER_BODY_MISSING');
   const banner='<aside style="padding:14px;background:#542917;color:#fff;font:16px system-ui">'+
    'R190-AG SYNTHETIC / '+name+' / UNAPPROVED / ART HOLD / modelCalls=0 / worldContacts=0 / originalRawSha256='+r.report.originalRawSha256+'</aside>';
   write(path.join(dir,name+'.html'),html.replace('<body>','<body>'+banner));
   for(const side of ['front','rear','west','east','roof'])write(path.join(dir,name+'-'+side+'.svg'),renderR164Elevation(built.compiled,built.design,side));
   links.push(`<li>synthetic-${i}: ${name} — <a href="synthetic-${i}/${name}.html">真正B143 3D</a> / `+
    ['front','rear','west','east','roof'].map(s=>`<a href="synthetic-${i}/${name}-${s}.svg">${s}</a>`).join(' / ')+'</li>');
  }
  studies.push({case:'synthetic-'+i,proposalCount:r.proposals.length,comparison});
 }
 const summary={schema:'minecraftaibuilder-r190ag-synthetic-comparison-v1',
  fixtureCount:studies.length,maxLayoutVariantsPerStrategy,studies,
  modelCalls:0,worldContacts:0,worldWrites:0,
  art:'ART_HOLD',officialArtAdoptions:0,realModelCapability:'UNPROVEN',
  modelAuthoredB143:false,constructionApproved:false,executionAllowed:false,
  readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}};
 json(path.join(out,'SUMMARY.json'),summary);
 write(path.join(out,'index.html'),'<!doctype html><html lang="ja"><meta charset="utf-8"><title>R190-AG 合成比較・ART HOLD</title>'+
  '<style>body{font:17px/1.7 system-ui;max-width:1080px;margin:40px auto;padding:20px;background:#f5f4ef;color:#242a30}a{color:#174e8a}li{margin:14px 0}strong{color:#9b381a}</style>'+
  '<h1>R190-AG 設計意図と真正3Dの合成比較</h1><p><strong>ART HOLD・正式美術採用0件・全案未承認</strong></p>'+
  '<p>すべて合成入力です。実Qwen推論0回、Minecraft接触0回。モデル設計能力・日本語要求充足・美しさ・施工安全は未実証です。</p>'+
  '<p>元の窓なし形状と、ホストが提案した未承認の窓付き形状を分けて表示します。配置候補は同じ部屋・寸法・親子方向・材料・選択された屋根と外形を保持します。各窓付き案は同じ配置の窓なし案と比較してください。</p>'+
  '<p>AB/AD/AEは同じ「窓座標なし」の構造投影を評価するため、必須フィールドの不足は契約差であり、モデルの優劣ではありません。詳細はSUMMARY.jsonの各判定・SHA・配置・提案履歴を参照してください。</p>'+
  '<p>3用途の窓なし基準例、複数窓＋鋸歯屋根、中庭＋外形加工＋屋根＋窓の5例です。真の3Dは生成ソースから、5方向図は同じコンパイル済みボクセルから出力しています。単層限定、採光量・耐候性・実機歩行は未検証です。</p><ul>'+links.join('')+'</ul></html>');
 return {fixtureCount:studies.length,maxLayoutVariantsPerStrategy,
  proposalCounts:studies.map(s=>s.proposalCount),modelCalls:0,worldWrites:0,art:'ART_HOLD'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const a=process.argv.slice(2);
  if(![3,5].includes(a.length)||a[0]!=='--synthetic'||a[1]!=='--out')
   throw Error('ARGS: --synthetic --out ABSOLUTE_NEW [--layout-variants 1..4]');
  if(a.length===5&&(a[3]!=='--layout-variants'||!/^[1-4]$/.test(a[4])))
   throw Error('R190AI_LAYOUT_VARIANTS_EXPECT_1_TO_4');
  const maxLayoutVariantsPerStrategy=a.length===5?Number(a[4]):1;
  console.log(JSON.stringify(writeR190AGComparison(a[2],{maxLayoutVariantsPerStrategy}),null,2));
 }catch(e){console.error(String(e.message));process.exitCode=2;}
}
