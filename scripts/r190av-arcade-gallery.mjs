/**
 * R190-AV: true B143 visual source comparison, not art adoption.
 * 00=last AU synthetic public building; 01/02=author-adjusted open colonnades.
 */
import fs from 'node:fs';import path from 'node:path';
import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
import {R190AV_AUTHOR_CASES} from './r190av-arcade-fixtures.mjs';
import {R190AU_AUTHOR_CASES} from './r190au-author-forum-fixtures.mjs';
import {reviewR190AUMandatoryForum} from '../source/ai/r190au-mandatory-forum.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
import {renderR164Elevation} from './r164-exterior-audit.mjs';
const views=['front','rear','west','east','roof'];
const sha=x=>createHash('sha256').update(x).digest('hex');
const write=(f,t)=>fs.writeFileSync(f,t,{flag:'wx'});
const json=(f,x)=>write(f,JSON.stringify(x,null,2)+'\n');
export function writeR190AVArcadeGallery(out){
 if(!path.isAbsolute(out)||fs.existsSync(out)||
  !fs.existsSync(path.dirname(out))||!fs.statSync(path.dirname(out)).isDirectory())
  throw Error('R190AV_FRESH_OUTPUT_REQUIRED');
 const htmlTemplate=fs.readFileSync(new URL('../source/ai/b143-viewer-template.html',import.meta.url),'utf8');
 const examples=[{name:'00-au-solid-walls',kind:'AU_PREVIOUS_REFERENCE',q:R190AU_AUTHOR_CASES[0]},
  ...R190AV_AUTHOR_CASES.map((q,i)=>({name:(i+1+'').padStart(2,'0')+'-'+q.design.parti.id,
    kind:'AV_AUTHOR_OPEN_COLONNADE',q}))];
 fs.mkdirSync(out);const scenes=[],links=[];
 for(const e of examples){
  const study=reviewR190AUMandatoryForum(e.q),source=study.source.source;
  if(!verifyCompiled(source.design,source.compiled)||
    study.source.structure.detachedVoxelCount!==0||
    !study.routeAudit.everyTwoWideGroundRouteRequiresSky)
   throw Error('R190AV_PHYSICAL_B143_FAILED');
  json(path.join(out,e.name+'-AUTHOR-IR.json'),e.q);
  json(path.join(out,e.name+'-SOURCE-B143.json'),source.design);
  const html=renderB143Html(compileB143Gallery([source.design]),htmlTemplate);
  if(!html.includes('<body>'))throw Error('R190AV_VIEWER_MISSING');
  write(path.join(out,e.name+'-REAL-B143.html'),
   html.replace('<body>','<body><aside style="padding:14px;background:#542917;color:white;font:15px system-ui">R190-AV ACTUAL B143 / SYNTHETIC ASSISTANT AUTHOR, NOT LOCAL MODEL / WORLD IO ZERO / ART HOLD</aside>'));
  const faceSHA={};
  for(const v of views){
   const svg=renderR164Elevation(source.compiled,source.design,v);
   faceSHA[v]=sha(svg);
   write(path.join(out,e.name+'-'+v+'.svg'),svg);
  }
  scenes.push({name:e.name,kind:e.kind,
   provenance:'ASSISTANT_AUTHORED_SYNTHETIC_NOT_QWEN_GEMMA',
   trueB143GeometrySha256:source.compiled.geometrySha256,
   b143Cells:source.compiled.primitives.length,
   skyFullyOpenColumns:source.audit.openSkyColumns,
   mandatorySkySourceWitnessSteps:study.routeAudit.shortestWitnessSteps,
   mandatorySkySourceWitnessSkySteps:study.routeAudit.shortestWitnessForumPadSteps,
   groundConnectedUpperComponents:study.source.structure.groundedComponentCount,
   floatingComponents:study.source.structure.detachedComponentCount,
   functionalRoofAreas:study.source.zones.filter(z=>z.kind==='sheltered')
    .map(z=>z.verifiedOverheadRoofCells),
   viewSha256:faceSHA,art:'ART_HOLD',modelCalls:0,worldWrites:0});
  links.push('<li>'+e.name+' / <a href="'+e.name+'-REAL-B143.html">SOURCE 3D</a> / '+
   views.map(v=>'<a href="'+e.name+'-'+v+'.svg">'+v+'</a>').join(' / ')+'</li>');
 }
 if(new Set(scenes.map(s=>s.trueB143GeometrySha256)).size!==3)
  throw Error('R190AV_GEOMETRY_CONTRAST_MISSING');
 const changes=(i,j)=>views.filter(v=>scenes[i].viewSha256[v]!==scenes[j].viewSha256[v]);
 const summary={schema:'minecraftaibuilder-r190av-functional-open-colonnade-v1',
  provenance:'SYNTHETIC_ARCHITECT_AUTHOR_ONLY',
  studyQuestion:'Do author-specified open colonnades and opposing rising roof ribs change macro facade while preserving functional spaces?',
  scenes,viewsChangedFromAU:changes(0,1),viewsChangedBetweenNewCases:changes(1,2),
  notControlledAestheticAB:true,aestheticQuality:'NOT_CERTIFIED',
  modelCalls:0,worldWrites:0,worldContacts:0,
  readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
  art:'ART_HOLD',officialArtAdoptions:0,
  realMinecraftWalking:'NOT_TESTED',structuralEngineering:'NOT_CERTIFIED'};
 json(path.join(out,'SUMMARY.json'),summary);
 write(path.join(out,'index.html'),'<html lang="ja"><meta charset="utf-8">'+
  '<h1>R190-AV: 巨大建築の壁を開く・斜め屋根と公開動線を一体化する研究</h1>'+
  '<p>旧AUの無地壁に対し開いた柱間/傾斜屋根で構成した作者合成2案。3Dは本物のB143。'+
  'AIの自律創作や美術採用は証明しない。工学的保証・施工は無し。</p><ul>'+
  links.join('')+'</ul><a href="SUMMARY.json">詳細レシート</a></html>');
 return {scenes:3,modelCalls:0,worldWrites:0,art:'ART_HOLD'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const a=process.argv.slice(2);if(a.length!==2||a[0]!=='--out')throw Error('R190AV_ARGS');
  console.log(JSON.stringify(writeR190AVArcadeGallery(a[1]),null,2));
 }catch(e){console.error(String(e?.message??e));process.exitCode=2;}
}
