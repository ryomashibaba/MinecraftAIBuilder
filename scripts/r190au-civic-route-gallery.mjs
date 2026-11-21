/**
 * R190-AU: physical SOURCE witness of public mandatory sky crossing.
 * Compare reference same geometry sans author-specified ground relief to two
 * full co-designed circulation concepts, using the existing true B143 viewer.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {R190AU_AUTHOR_CASES} from './r190au-author-forum-fixtures.mjs';
import {reviewR190AUMandatoryForum} from '../source/ai/r190au-mandatory-forum.mjs';
import {reviewR190ATZones} from '../source/ai/r190at-functional-zones.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
import {renderR164Elevation} from './r164-exterior-audit.mjs';
const views=['front','rear','west','east','roof'];
const hash=s=>createHash('sha256').update(s).digest('hex');
const write=(p,s)=>fs.writeFileSync(p,s,{flag:'wx'});
const json=(p,x)=>write(p,JSON.stringify(x,null,2)+'\n');

function groundPlan(study,route){
 const p=study.original.parti,sky=p.voids.find(v=>v.role==='open-sky').geometry;
 const [sx,,sz]=sky.origin,[sw,,sd]=sky.size;
 const spaces=study.original.functionalZones;
 const ground=study.source.compiled.primitives.filter(v=>v[1]===1);
 const colored=ground.map(([x,,z])=>
  '<rect x="'+x+'" y="'+z+'" width="1" height="1" fill="#c2ced1"/>').join('');
 const zones=spaces.map(v=>
  '<rect x="'+v.origin[0]+'" y="'+v.origin[1]+'" width="'+v.size[0]+
  '" height="'+v.size[1]+'" fill="'+(v.kind==='open-sky'?'#3a9bb9':'#d3a368')+
  '" fill-opacity="0.3" stroke="'+(v.kind==='open-sky'?'#156585':'#8b6227')+
  '" stroke-width=".3"/>').join('');
 const routePath=route?.length?
  '<polyline points="'+route.map(([x,z])=>(x+1)+','+(z+1)).join(' ')+
  '" fill="none" stroke="#e04646" stroke-width=".5" stroke-linejoin="round"/>':'';
 const labels=spaces.map(v=>{
  const a=p.programAnchors.find(a=>a.id===v.anchorId);
  return '<circle cx="'+(a.x+1)+'" cy="'+(a.z+1)+'" r=".95" fill="#102d46"/>'+
   '<text x="'+(a.x+1)+'" y="'+(a.z-1)+'" font-size="2.7" fill="#102d46">'+a.id+'</text>';
 }).join('');
 const checks=p.voids.filter(v=>v.role==='spatial-relief')
  .map(v=>'<rect x="'+v.geometry.origin[0]+'" y="'+v.geometry.origin[2]+
   '" width="'+v.geometry.size[0]+'" height="'+v.geometry.size[2]+
   '" fill="none" stroke="#9d3232" stroke-width=".4" stroke-dasharray="1 0.5"/>')
  .join('');
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 76 64" width="912" height="768">'+
  '<rect width="76" height="64" fill="#f2f5f6"/>'+colored+zones+checks+routePath+labels+
  '<rect x="'+sx+'" y="'+sz+'" width="'+sw+'" height="'+sd+
   '" fill="none" stroke="#13688a" stroke-width=".6"/></svg>';
}
export function writeR190AUSourceGallery(out){
 if(!path.isAbsolute(out)||fs.existsSync(out)||
  !fs.existsSync(path.dirname(out))||!fs.statSync(path.dirname(out)).isDirectory())
  throw Error('R190AU_NEW_OUTPUT_REQUIRED');
 const template=fs.readFileSync(new URL('../source/ai/b143-viewer-template.html',import.meta.url),'utf8');
 const baseline=structuredClone(R190AU_AUTHOR_CASES[0]);
 baseline.design.parti.voids=baseline.design.parti.voids.filter(v=>v.role!=='spatial-relief');
 const variants=[
  {name:'00-open-sky-bypass-reference',input:baseline,requiresForum:false},
  ...R190AU_AUTHOR_CASES.map((input,i)=>({
   name:i?'02-folds-mandatory-forum':'01-strata-mandatory-forum',
   input,requiresForum:true}))
 ];
 const cases=[],links=[];fs.mkdirSync(out);
 for(const v of variants){
  const proof=v.requiresForum?reviewR190AUMandatoryForum(v.input):null;
  const study=proof?.source??reviewR190ATZones(v.input.design);
  if(!verifyCompiled(study.source.design,study.source.compiled)||
    study.structure.detachedVoxelCount!==0||
    !study.source.audit.allAnchorsReachable||
    study.worldContacts!==0||study.worldWrites!==0)
   throw Error('R190AU_B143_SOURCE_FAILED');
  if(!v.requiresForum){
   let rejected=false;
   try{reviewR190AUMandatoryForum(v.input);}
   catch(e){rejected=e.message==='R190AU_FORUM_HAS_WALKABLE_BYPASS';}
   if(!rejected)throw Error('R190AU_BASELINE_BYPASS_NOT_VERIFIED');
  }
  const name=v.name,design=study.source.design,compiled=study.source.compiled;
  json(path.join(out,name+'-ORIGINAL-IR.json'),v.input);
  json(path.join(out,name+'-TRUE-B143-SOURCE.json'),design);
  const html=renderB143Html(compileB143Gallery([design]),template);
  if(!html.includes('<body>'))throw Error('R190AU_REAL_VIEWER_INVALID');
  write(path.join(out,name+'-TRUE-B143.html'),
   html.replace('<body>','<body><aside style="padding:14px;background:#542917;color:white;font:15px system-ui">R190-AU SOURCE TRUE B143 / AUTHOR-SYNTHETIC / NO MODEL CALL / ART HOLD</aside>'));
  const faceSha={};
  for(const view of views){
   const svg=renderR164Elevation(compiled,design,view);
   faceSha[view]=hash(svg);
   write(path.join(out,name+'-'+view+'.svg'),svg);
  }
  write(path.join(out,name+'-ground-route.svg'),
   groundPlan(study,proof?.routeAudit.sourceRouteWitness??null));
  const result={name,source:'SYNTHETIC_NOT_AI',
   geometrySha256:compiled.geometrySha256,
   sourceSha256:compiled.sourceSha256,
   b143VoxelCount:compiled.primitives.length,
   verifiedSkyColumns:study.source.audit.openSkyColumns,
   routeStatus:v.requiresForum?'MANDATORY_OPEN_SKY_FORUM_SOURCE_PROVEN':
    'HOLD_FORUM_HAS_WALKABLE_BYPASS',
   routeWitnessLength:proof?.routeAudit.sourceRouteWitness.length??null,
   forumRoutePadSteps:proof?.routeAudit.shortestWitnessForumPadSteps??null,
   source2WideWalkingVerified:true,
   groundedUpperMass:true,elevationSha256:faceSha,
   specialGroundReliefSourceOperations:compiled.stats.designOperations
    .filter(op=>op.element.includes('forum-ground-threshold')),
   modelCalls:0,worldContacts:0,worldWrites:0,art:'ART_HOLD'};
  cases.push(result);
  links.push('<li>'+name+': <a href="'+name+'-TRUE-B143.html">TRUE B143 3D</a> / '+
   '<a href="'+name+'-ground-route.svg">actual ground and route</a> / '+
   views.map(x=>'<a href="'+name+'-'+x+'.svg">'+x+'</a>').join(' / ')+'</li>');
 }
 const changed=views.filter(v=>cases[0].elevationSha256[v]!==cases[1].elevationSha256[v]);
 if(!changed.length||cases.slice(1).some(x=>x.routeStatus!=='MANDATORY_OPEN_SKY_FORUM_SOURCE_PROVEN'))
  throw Error('R190AU_NO_ACTUAL_CIVIC_GATE_DIFFERENCE');
 const report={schema:'minecraftaibuilder-r190au-mandatory-public-forum-source-v1',
  cases,changedReferenceToMandatoryViews:changed,
  provenance:'SYNTHETIC_NOT_MODEL',
  evidence:'ALL_2WIDE_GROUND_ROUTE_BYPASSES_EXCLUDED_IN_FINAL_B143',
  artEvaluation:'NOT_CERTIFIED',manualVisualReview:'NOT_PERFORMED',
  sourceLevelOnly:true,actualMinecraftWalking:'NOT_TESTED',
  modelCalls:0,worldWrites:0,worldContacts:0,
  readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
  officialArtAdoptions:0,art:'ART_HOLD'};
 json(path.join(out,'SUMMARY.json'),report);
 write(path.join(out,'index.html'),
  '<!doctype html><html lang="ja"><meta charset="utf-8"><title>R190-AU 必ず天空広場を通る建築経路</title>'+
  '<h1>R190-AU: 入口から展示棟への全2幅動線が空庭を通るか</h1>'+
  '<p>全て人工合成設計。左の元案は空庭を回避でき、中央・右は作者が明示的に外側迂回床を除去。'+
  'Source geometry and route proof only, not actual model creativity, architecture engineering or Minecraft construction.</p>'+
  '<ul>'+links.join('')+'</ul><a href="SUMMARY.json">B143検証</a></html>');
 return {cases:3,source2WideRoutes:2,modelCalls:0,worldWrites:0,art:'ART_HOLD'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const a=process.argv.slice(2);
  if(a.length!==2||a[0]!=='--out')throw Error('R190AU_ARGS');
  console.log(JSON.stringify(writeR190AUSourceGallery(a[1]),null,2));
 }catch(e){console.error(String(e?.message??e));process.exitCode=2;}
}
