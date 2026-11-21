/** R190-AT complete source-view AESTHETIC research, no model or Minecraft.
 * Compare prior AR to two non-ellipsoid author-built functional urban wings.
 */
import fs from 'node:fs';import path from 'node:path';
import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
import {R190AT_AUTHOR_CASES} from './r190at-functional-fixtures.mjs';
import {R190AR_AUTHOR_SUPPORTED_TWIN} from './r190ar-supported-fixtures.mjs';
import {compileR190AQParti} from '../source/ai/r190aq-architectural-parti.mjs';
import {auditR190ARStructuralContinuity} from '../source/ai/r190ar-structure-audit.mjs';
import {reviewR190ATZones} from '../source/ai/r190at-functional-zones.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
import {renderR164Elevation} from './r164-exterior-audit.mjs';
const views=['front','rear','west','east','roof'];
const sha=s=>createHash('sha256').update(s,'utf8').digest('hex');
const write=(file,s)=>fs.writeFileSync(file,s,{flag:'wx'});
const json=(file,s)=>write(file,JSON.stringify(s,null,2)+'\n');
export function writeR190ATGallery(out){
 if(!path.isAbsolute(out)||fs.existsSync(out)||
  !fs.existsSync(path.dirname(out))||!fs.statSync(path.dirname(out)).isDirectory())
  throw Error('R190AT_FRESH_OUTPUT_REQUIRED');
 const template=fs.readFileSync(new URL('../source/ai/b143-viewer-template.html',import.meta.url),'utf8');
 const cases=[],links=[];fs.mkdirSync(out);
 const variants=[{name:'00-r190ar-support-retrofit',kind:'PREVIOUS_AR_REFERENCE',input:R190AR_AUTHOR_SUPPORTED_TWIN},
  ...R190AT_AUTHOR_CASES.map((input,i)=>({name:'0'+(i+1)+'-'+input.parti.id,
   kind:'FUNCTIONAL_NON_POD_AT',input}))];
 for(const v of variants){
  const result=v.kind==='PREVIOUS_AR_REFERENCE'?null:reviewR190ATZones(v.input);
  const study=result?result.source:compileR190AQParti(v.input);
  const structural=result?result.structure:auditR190ARStructuralContinuity(study);
  if(!verifyCompiled(study.design,study.compiled)||
   structural.detachedVoxelCount!==0||!study.audit.allAnchorsReachable||
   study.worldWrites!==0||study.worldContacts!==0)
   throw Error('R190AT_SOURCE_MASS_NOT_VERIFIED');
  json(path.join(out,v.name+'-AUTHORED-IR.json'),v.input);
  json(path.join(out,v.name+'-SOURCE-B143.json'),study.design);
  const html=renderB143Html(compileB143Gallery([study.design]),template);
  if(!html.includes('<body>'))throw Error('R190AT_INVALID_HTML_3D');
  write(path.join(out,v.name+'-REAL-B143.html'),
   html.replace('<body>','<body><aside style="padding:14px;background:#542917;color:white;font:15px system-ui">R190-AT TRUE B143 - HUMAN SYNTHETIC, NOT MODEL - NO CONSTRUCTION - ART HOLD</aside>'));
  const svgs={};
  for(const view of views){
   const pic=renderR164Elevation(study.compiled,study.design,view);
   svgs[view]=sha(pic);write(path.join(out,v.name+'-'+view+'.svg'),pic);
  }
  cases.push({name:v.name,kind:v.kind,authorship:'HUMAN_SYNTHETIC_NOT_MODEL',
   geometrySha256:study.compiled.geometrySha256,sourceSha256:study.compiled.sourceSha256,
   voxelCount:study.compiled.primitives.length,svgSha256:svgs,
   elevatedDetachedCells:structural.detachedVoxelCount,
   sourceEllipsoidsCylindersToruses:result?.sourceEllipsoidsCylindersToruses??null,
   sourceOpenSkyColumns:study.audit.openSkyColumns,
   verifiedSource2WidePath:study.audit.allAnchorsReachable,
   zones:result?.zones??'NOT_TESTED_IN_AR',
   structuralEngineering:'NOT_CERTIFIED',purposeMeaning:'NOT_CERTIFIED',
   officialArtAdoption:false,art:'ART_HOLD',modelCalls:0,worldWrites:0});
  links.push('<li>'+v.name+': <a href="'+v.name+'-REAL-B143.html">3D</a> / '+
   views.map(x=>'<a href="'+v.name+'-'+x+'.svg">'+x+'</a>').join(' / ')+'</li>');
 }
 if(new Set(cases.map(c=>c.geometrySha256)).size!==3)
  throw Error('R190AT_GEOMETRY_VARIANTS_NOT_DISTINCT');
 const diff=(i,j)=>views.filter(x=>cases[i].svgSha256[x]!==cases[j].svgSha256[x]);
 const report={schema:'minecraftaibuilder-r190at-architecture-functional-visual-v1',
  comparisonType:'RESEARCH_NO_CONTROLLED_AB_ABOUT_AESTHETIC',
  cases,changeFromARToAT:diff(0,1),changeBetweenATCases:diff(1,2),
  note:'Source voxel geometry difference is not better art. Public zone weather status is SOURCE only.',
  modelCalls:0,worldWrites:0,worldContacts:0,
  readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
  art:'ART_HOLD',officialArtAdoptions:0,modelAuthorship:'NOT_PROVEN',
  actualMinecraftWalking:'NOT_TESTED',engineering:'NOT_CERTIFIED'};
 json(path.join(out,'SUMMARY.json'),report);
 write(path.join(out,'index.html'),
  '<!doctype html><html lang="ja"><meta charset="utf-8"><title>R190-AT 用途を実体化する都市的量塊研究</title>'+
  '<h1>R190-AT: sheltered halls + truly open civic canyon</h1>'+
  '<p>人が作成した合成ソース3案。真正B143実体。実モデル生成0・美術未採用・施工禁止。</p>'+
  '<p>AR参考案とATは部屋用途も違い、厳密な美術A/B比較ではない。</p>'+
  '<ul>'+links.join('')+'</ul><a href="SUMMARY.json">機能ゾーン実体と監査</a></html>');
 return {count:3,modelCalls:0,worldWrites:0,art:'ART_HOLD'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const a=process.argv.slice(2);
  if(a.length!==2||a[0]!=='--out')throw Error('R190AT_ARGS');
  console.log(JSON.stringify(writeR190ATGallery(a[1]),null,2));
 }catch(e){console.error(String(e?.message??e));process.exitCode=2;}
}
