/** R190-AP: actual B143 built-source architectural massing study.
 * Reuses existing open-court, faceted wings, roof profile, and author shift.
 * This is not a model response or an ART approval.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {R190_COURT_STATIC_SYNTHETIC_CASE} from './r190-semantic-fixtures.mjs';
import {compileR190SemanticPlan} from '../source/ai/r190-semantic-massing.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
import {renderR164Elevation} from './r164-exterior-audit.mjs';
const variants=['00-open-court-plain','01-three-wing-articulated','02-articulated-shifted'];
const views=['front','rear','west','east','roof'];
const sha=s=>createHash('sha256').update(s,'utf8').digest('hex');
const write=(p,s)=>fs.writeFileSync(p,s,{flag:'wx'});
const json=(p,o)=>write(p,JSON.stringify(o,null,2)+'\n');
export function r190APSourceProgram(variant){
 if(!variants.includes(variant))throw Error('R190AP_UNKNOWN_VARIANT');
 const p=structuredClone(R190_COURT_STATIC_SYNTHETIC_CASE);
 if(variant!=='00-open-court-plain'){
  p.formIntent={spaceId:'public-hall',face:'south',cornerInset:3};
  p.roofFormIntent={spaceId:'studio',profile:'sawtooth',axis:'x',rise:3,toothWidth:3};
 }
 if(variant==='02-articulated-shifted')
  p.spaces.find(s=>s.id==='public-hall').tangentShift=6;
 return p;
}
export function writeR190APMassingComparison(out){
 if(!path.isAbsolute(out)||fs.existsSync(out)||
    !fs.existsSync(path.dirname(out))||
    !fs.statSync(path.dirname(out)).isDirectory())
  throw Error('R190AP_NEW_ABSOLUTE_OUTPUT_REQUIRED');
 const template=fs.readFileSync(new URL('../source/ai/b143-viewer-template.html',import.meta.url),'utf8');
 const scenes=[],links=[];fs.mkdirSync(out);
 for(const name of variants){
  const p=r190APSourceProgram(name),b=compileR190SemanticPlan(p);
  if(!verifyCompiled(b.design,b.compiled)||
     b.audit.outdoorCourtCount!==1||b.audit.verifiedOpenSkyColumns<100||
     !b.audit.allProgramSpacesReachable||
     b.audit.witnesses.length!==4||
     b.worldWrites!==0||b.worldContacts!==0)
   throw Error('R190AP_SOURCE_PUBLIC_SPATIAL_PROOF_HOLD');
  const articulated=name!=='00-open-court-plain';
  if(articulated&&(!b.audit.facetedEnvelope||
     !b.audit.roofForm||b.audit.roofForm.profile!=='sawtooth'))
   throw Error('R190AP_PHYSICAL_FORM_NOT_REALIZED');
  json(path.join(out,name+'-IR.json'),p);
  json(path.join(out,name+'-B143.json'),b.design);
  const html=renderB143Html(compileB143Gallery([b.design]),template);
  if(!html.includes('<body>'))throw Error('R190AP_3D_VIEWER_BODY_MISSING');
  write(path.join(out,name+'-TRUE-B143.html'),
   html.replace('<body>','<body><aside style="padding:14px;background:#542917;color:white;font:16px system-ui">R190-AP SYNTHETIC / '+name+' / TRUE B143 / UNAPPROVED ART HOLD / NO MODEL CALL / WORLD IO ZERO</aside>'));
  const elevationSha256={};
  for(const side of views){
   const svg=renderR164Elevation(b.compiled,b.design,side);
   write(path.join(out,name+'-'+side+'.svg'),svg);
   elevationSha256[side]=sha(svg);
  }
  const root=b.layout.spaces.find(s=>s.id==='arrival');
  const hall=b.layout.spaces.find(s=>s.id==='public-hall');
  scenes.push({name,provenance:'SYNTHETIC_CALLER_IR_NOT_MODEL',
   geometrySha256:b.compiled.geometrySha256,sourceSha256:b.compiled.sourceSha256,
   elevationSha256,realB143VoxelCount:b.compiled.primitives.length,
   openSkyColumns:b.audit.verifiedOpenSkyColumns,
   actualSupportedTwoWideRoutes:b.audit.allProgramSpacesReachable,
   facet:b.audit.facetedEnvelope,
   roof:b.audit.roofForm,
   hallOffsetRelativeToCourt:[hall.x-root.x,hall.z-root.z],
   safety:{readiness:b.readiness,constructionApproved:b.constructionApproved,
    executionAllowed:b.executionAllowed,gates:b.gates,BuildPlan:b.BuildPlan,
    worldContacts:b.worldContacts,worldWrites:b.worldWrites},
   art:'ART_HOLD'});
  links.push('<li>'+name+' : <a href="'+name+'-TRUE-B143.html">真正3D</a> / '+
   views.map(v=>'<a href="'+name+'-'+v+'.svg">'+v+'</a>').join(' / ')+'</li>');
 }
 if(new Set(scenes.map(x=>x.geometrySha256)).size!==3)
  throw Error('R190AP_GEOMETRY_VARIANTS_NOT_DISTINCT');
 const changed=(a,b)=>views.filter(v=>
  scenes[a].elevationSha256[v]!==scenes[b].elevationSha256[v]);
 const report={schema:'minecraftaibuilder-r190ap-macro-study-v1',
  provenance:'SYNTHETIC_NOT_MODEL_RESPONSE',
  studyDesign:'SAME_FOUR_SPACES_SAME_PROGRAM_AND_MATERIALS',
  viewChanges:{plainToArticulated:changed(0,1),
   articulatedToAuthorShifted:changed(1,2),
   silhouetteChangeIsNotBeautyProof:true},
  scenes,modelCalls:0,worldContacts:0,worldWrites:0,
  readiness:'NOT_PREPARED',constructionApproved:false,
  executionAllowed:false,gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]},art:'ART_HOLD',officialArtAdoptions:0,
  humanArtJudgment:'NOT_PERFORMED',minecraftWalking:'NOT_TESTED',
  aOComparisonWarning:'AO_HAS_DIFFERENT_ROOM_PROGRAM_NOT_A_CONTROLLED_AB_TEST'};
 json(path.join(out,'SUMMARY.json'),report);
 write(path.join(out,'index.html'),
  '<!doctype html><html lang="ja"><meta charset="utf-8"><title>R190-AP 空間構成による大形態比較</title>'+
  '<h1>R190-AP：開放中庭+3独立翼棟のマクロ構成</h1>'+
  '<p>①単純構成→②ファセットと鋸歯屋根→③設計者指定の翼棟非対称位置。同じ4空間の用途・寸法・材料・関係は維持。</p>'+
  '<p>合成ソース／実Qwen推論なし／真正B143／Minecraft施工なし。外形差は美術品質の証明ではない。</p>'+
  '<ul>'+links.join('')+'</ul><a href="SUMMARY.json">形態比較レシート</a></html>');
 return {count:3,distinctB143:3,modelCalls:0,worldWrites:0,art:'ART_HOLD'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const args=process.argv.slice(2);
  if(args.length!==2||args[0]!=='--out')throw Error('R190AP_ARGS');
  console.log(JSON.stringify(writeR190APMassingComparison(args[1]),null,2));
 }catch(e){console.error(String(e?.message??e));process.exitCode=2;}
}
