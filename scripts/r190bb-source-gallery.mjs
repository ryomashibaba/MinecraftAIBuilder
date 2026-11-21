/** R190-BB B143-source-only synthesized route-exposure comparison. */
import fs from 'node:fs';import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {R190BB_AUTHOR_CASES} from './r190bb-source-fixtures.mjs';
import {reviewR190BBOutdoorTransition,renderR190BBPlanSVG} from './r190bb-outdoor-transition-source.mjs';
export function writeR190BBFixtureGallery(outDir){
 if(!path.isAbsolute(outDir)||fs.existsSync(outDir)||
  !fs.existsSync(path.dirname(outDir)))throw Error('R190BB_FRESH_GALLERY');
 const result={schema:'minecraftaibuilder-r190bb-synthetic-source-witness-v1',
  authoredBy:'TEST_AUTHOR_NOT_LLM',sourceGeometryRepairs:0,
  status:'RESEARCH_ONLY_ART_HOLD',modelCalls:0,worldContacts:0,worldWrites:0,
  trueMinecraftWorldExterior:'NOT_VERIFIED',officialArtAdoptions:0,cases:[]};
 fs.mkdirSync(outDir);
 for(const name of ['covered','outdoors','alternate','tooNarrow','openEntrance']){
  const source=R190BB_AUTHOR_CASES[name](),raw=Buffer.from(JSON.stringify(source));
  const report=reviewR190BBOutdoorTransition(raw);
  fs.writeFileSync(path.join(outDir,name+'-SOURCE-2WIDE-PLAN.svg'),
   renderR190BBPlanSVG(report),{flag:'wx'});
  result.cases.push({name,originalSha256:report.originalSha256,
   geometrySha256:report.sourceGeometrySha256,
   status:report.status,
   priorBAStatus:report.priorBAStatus,
   skyBoundaryPadCount:report.sourceTransitionEvidence?.skyOpenBoundaryPadCount??null,
   shelteredEntrancePadCount:report.sourceTransitionEvidence?.shelteredEntrancePadCount??null,
   originalBytesPersisted:false});
 }
 fs.writeFileSync(path.join(outDir,'SUMMARY.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(path.join(outDir,'index.html'),[
  '<!doctype html><html lang="ja"><meta charset="utf-8"><title>R190-BB SOURCE歩行路と天空開放</title>',
  '<h1>R190-BB: 真正B143ボクセルの通路幅と屋根の違い</h1>',
  '<p>人が記述した合成B143ソースのみ。LLM生成例ではありません。実Minecraft世界の屋外ではありません。</p>',
  ...result.cases.map(c=>'<p>'+c.name+': '+c.status+' <a href="'+c.name+
   '-SOURCE-2WIDE-PLAN.svg">SOURCE平面図</a></p>'),
  '<p>グレー=覆われた2幅床、橙=一部屋根あり、水色=完全天空開放、赤線=証明した2幅経路。</p>',
  '<a href="SUMMARY.json">署名つき監査レシート</a>'
 ].join('\n'),{flag:'wx'});
 return {cases:result.cases.length,worldWrites:0,modelCalls:0,art:'ART_HOLD'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const a=process.argv.slice(2);
  if(a.length!==2||a[0]!=='--out')throw Error('R190BB_ARGS');
  console.log(JSON.stringify(writeR190BBFixtureGallery(a[1]),null,2));
 }catch(e){console.error(String(e?.message??e));process.exitCode=2;}
}
