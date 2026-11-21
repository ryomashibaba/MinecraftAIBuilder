/** R190-AL offline source-only orientation gallery; synthetic input only.
 * Renders exact B143 voxels; no provider, no Minecraft client, no adoption.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {R190_STATIC_SYNTHETIC_CASES} from './r190-semantic-fixtures.mjs';
import {compileR190SemanticPlan} from '../source/ai/r190-semantic-massing.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
import {renderR164Elevation} from './r164-exterior-audit.mjs';
const faces=['south','north','west','east'];
const write=(dest,content)=>fs.writeFileSync(dest,content,{flag:'wx'});
const json=(dest,value)=>write(dest,JSON.stringify(value,null,2)+'\n');
export function writeR190ALEntranceGallery(out){
 if(!path.isAbsolute(out)||fs.existsSync(out)||
   !fs.existsSync(path.dirname(out))||
   !fs.statSync(path.dirname(out)).isDirectory())
  throw Error('R190AL_NEW_ABSOLUTE_OUTPUT_REQUIRED');
 const template=fs.readFileSync(new URL('../source/ai/b143-viewer-template.html',import.meta.url),'utf8');
 const models=[],gallery=[];
 fs.mkdirSync(out);
 for(const face of faces){
  // A synthetic 3-room research case, not a claimed Qwen answer.
  // North entry needs a different model-authored root-child side, so do
  // not pretend the four scenes differ ONLY in the entry location.
  const p=structuredClone(R190_STATIC_SYNTHETIC_CASES[1]);
  p.spaces=p.spaces.slice(0,3);
  if(face==='north')p.spaces[1].side='east';
  p.entranceFace=face;
  const built=compileR190SemanticPlan(p);
  if(!verifyCompiled(built.design,built.compiled)||
    !built.audit.allProgramSpacesReachable||built.audit.entranceFace!==face||
    !built.audit.entranceApproachTwoWide||
    built.worldWrites!==0||built.worldContacts!==0)
   throw Error('R190AL_REAL_B143_SAFETY_OR_SOURCE_PROOF');
  const door=built.design.elements.find(x=>x.id==='entry-cut'),
   approach=built.design.elements.find(x=>x.id==='approach-floor');
  if(!door||!approach)throw Error('R190AL_REAL_ENTRANCE_NOT_FOUND');
  json(path.join(out,face+'-SYNTHETIC-IR.json'),p);
  json(path.join(out,face+'-B143.json'),built.design);
  let html=renderB143Html(compileB143Gallery([built.design]),template);
  if(!html.includes('<body>'))throw Error('R190AL_INVALID_VIEWER');
  html=html.replace('<body>','<body><aside style="padding:14px;background:#542917;color:#fff;font:16px system-ui">R190-AL SYNTHETIC '+face+' ENTRANCE / NOT A MODEL / ART HOLD / CONSTRUCTION BLOCKED</aside>');
  write(path.join(out,face+'-REAL-B143.html'),html);
  for(const side of ['front','rear','west','east','roof'])
   write(path.join(out,face+'-'+side+'.svg'),
    renderR164Elevation(built.compiled,built.design,side));
  models.push({face,sourceKind:'SYNTHETIC_NOT_MODEL_RESPONSE',
   authoredEntranceFace:face,
   rootChildSide:p.spaces[1].side,
   roomTopologyIdenticalAcrossAllFour:false,
   realB143SourceSha256:built.compiled.sourceSha256,
   realB143GeometrySha256:built.compiled.geometrySha256,
   fullyReachableFromSelectedEntrance:built.audit.allProgramSpacesReachable,
   entranceActualTwoWide:true,entryDoor:door,exteriorApproach:approach,
   trueB143VoxelCount:built.compiled.primitives.length,
   noWorldWrites:built.worldWrites===0});
  gallery.push('<li><strong>'+face+'</strong>: <a href="'+face+'-REAL-B143.html">真正3D</a> / '+
   ['front','rear','west','east','roof'].map(side=>
    '<a href="'+face+'-'+side+'.svg">'+side+'</a>').join(' / ')+
   ' / <a href="'+face+'-B143.json">B143ソース</a></li>');
 }
 const summary={schema:'minecraftaibuilder-r190al-entrance-gallery-v1',
  analysisScope:'4 SYNTHETIC plans, north root-child orientation differs; NO art conclusion',
  modelCalls:0,worldContacts:0,worldWrites:0,readiness:'NOT_PREPARED',
  constructionApproved:false,executionAllowed:false,
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
  art:'ART_HOLD',officialArtAdoptions:0,
  models};
 json(path.join(out,'SUMMARY.json'),summary);
 write(path.join(out,'index.html'),
  '<!doctype html><html lang="ja"><meta charset="utf-8"><title>R190-AL 四方向入口 真正3D比較</title>'+
  '<style>body{font:17px/1.7 system-ui;max-width:1080px;margin:40px auto;padding:20px;background:#f5f4ef;color:#242a30}li{margin:18px 0}a{color:#174e8a}</style>'+
  '<h1>R190-AL：入口4方向・真正B143比較</h1>'+
  '<p>合成設計のみ・モデル推論0回・Minecraft施工0回。ART HOLD、全案未承認。</p>'+
  '<p>北入口案は、入口と根室の子室との干渉を避けるため、モデル意図として子室方向も変更している。従って4案の全違いを入口位置の効果と見なすことはできない。</p>'+
  '<p>各入口は本物の壁CUTと外側の実材質床を持ち、2幅で各室へ到達した。美しさ・日本語要求理解・実機での歩行は未評価。</p>'+
  '<ul>'+gallery.join('')+'</ul><a href="SUMMARY.json">検証結果（SHA含む）</a></html>');
 return {count:models.length,faces:models.map(x=>x.face),
  modelCalls:0,worldWrites:0,art:'ART_HOLD'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2);
  if(args.length!==2||args[0]!=='--out')
   throw Error('R190AL_ARGS: --out ABSOLUTE_NEW_DIR');
  console.log(JSON.stringify(writeR190ALEntranceGallery(args[1]),null,2));
 }catch(e){console.error(String(e?.message??e));process.exitCode=2;}
}
