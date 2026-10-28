/** Synthetic contrast: same three rooms, model-addressable wing tangent offsets.
 * Genuine B143, zero local-model calls, zero Minecraft contacts.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {R190_STATIC_SYNTHETIC_CASES} from './r190-semantic-fixtures.mjs';
import {compileR190SemanticPlan} from '../source/ai/r190-semantic-massing.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
import {renderR164Elevation} from './r164-exterior-audit.mjs';
const shifts=[-8,0,8],views=['front','rear','west','east','roof'];
const write=(p,x)=>fs.writeFileSync(p,x,{flag:'wx'});
const json=(p,x)=>write(p,JSON.stringify(x,null,2)+'\n');
export function r190AMSyntheticPlan(shift){
 const p=structuredClone(R190_STATIC_SYNTHETIC_CASES[1]);
 p.spaces=[p.spaces[0],p.spaces[1],p.spaces[3]];
 p.spaces[1].tangentShift=shift;
 return p;
}
export function writeR190AMGallery(out){
 if(!path.isAbsolute(out)||fs.existsSync(out)||
   !fs.existsSync(path.dirname(out))||
   !fs.statSync(path.dirname(out)).isDirectory())
  throw Error('R190AM_NEW_ABSOLUTE_OUTPUT_REQUIRED');
 const template=fs.readFileSync(new URL('../source/ai/b143-viewer-template.html',import.meta.url),'utf8');
 const studies=[],links=[];
 fs.mkdirSync(out);
 for(const shift of shifts){
  const plan=r190AMSyntheticPlan(shift);
  const built=compileR190SemanticPlan(plan);
  if(!verifyCompiled(built.design,built.compiled)||
     !built.audit.allProgramSpacesReachable||
     built.audit.witnesses.length!==3||
     built.worldWrites!==0||built.worldContacts!==0)
   throw Error('R190AM_SOURCE_OR_SAFETY_FAILURE');
  const root=built.layout.spaces.find(x=>x.id==='showroom');
  const child=built.layout.spaces.find(x=>x.id==='workshop');
  if(child.x-root.x!==Math.floor((root.w-child.w)/2)+shift||
     built.layout.sitePlacement.authorLockedTangentialOffsets[0].tangentShift!==shift)
   throw Error('R190AM_AUTHOR_SHIFT_NOT_PRESERVED');
  const label=shift<0?'minus8':shift>0?'plus8':'zero';
  json(path.join(out,label+'-SYNTHETIC-IR.json'),plan);
  json(path.join(out,label+'-B143.json'),built.design);
  const html=renderB143Html(compileB143Gallery([built.design]),template);
  if(!html.includes('<body>'))throw Error('R190AM_NO_VIEWER_BODY');
  write(path.join(out,label+'-REAL-B143.html'),html.replace('<body>',
   '<body><aside style="padding:14px;background:#542917;color:white;font:16px system-ui">R190-AM SYNTHETIC / offset '+shift+' / TRUE B143 / NO MODEL RESPONSE / ART HOLD</aside>'));
  for(const view of views)write(path.join(out,label+'-'+view+'.svg'),
   renderR164Elevation(built.compiled,built.design,view));
  studies.push({label,shift,provenance:'SYNTHETIC_NOT_REAL_MODEL',
   geometrySha256:built.compiled.geometrySha256,
   sourceSha256:built.compiled.sourceSha256,
   rootRelativeWorkshop:[child.x-root.x,child.z-root.z],
   trueB143VoxelCount:built.compiled.primitives.length,
   sourceTwoWideWalking:true,modelCalls:0,worldWrites:0,art:'ART_HOLD'});
  links.push('<li>'+label+' ('+shift+') <a href="'+label+'-REAL-B143.html">3D</a> / '+
   views.map(v=>'<a href="'+label+'-'+v+'.svg">'+v+'</a>').join(' / ')+'</li>');
 }
 if(new Set(studies.map(x=>x.geometrySha256)).size!==3)
  throw Error('R190AM_NO_MACRO_DIFFERENCE');
 json(path.join(out,'SUMMARY.json'),{
  schema:'minecraftaibuilder-r190am-synthetic-massing-v1',
  comparison:'ONLY_WORKSHOP_TANGENT_SHIFT_CHANGED',
  provenance:'SYNTHETIC_NOT_REAL_MODEL',studies,
  modelCalls:0,worldContacts:0,worldWrites:0,
  readiness:'NOT_PREPARED',executionAllowed:false,constructionApproved:false,
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
  art:'ART_HOLD',officialArtAdoptions:0,minecraftWalking:'NOT_TESTED'});
 write(path.join(out,'index.html'),
  '<!doctype html><html lang="ja"><meta charset="utf-8"><title>R190-AM 翼配置の合成比較</title>'+
  '<h1>R190-AM 同一3室プログラム・接線方向オフセット -8/0/+8 比較</h1>'+
  '<p>真正B143・合成原案のみ。実モデル推論0、Minecraft接触0、美術ART HOLD、正式採択0。</p>'+
  '<ul>'+links.join('')+'</ul><a href="SUMMARY.json">安全レシート・SHA</a></html>');
 return {count:3,art:'ART_HOLD',worldWrites:0,modelCalls:0};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const a=process.argv.slice(2);
  if(a.length!==2||a[0]!=='--out')throw Error('R190AM_ARGS');
  console.log(JSON.stringify(writeR190AMGallery(a[1]),null,2));
 }catch(e){console.error(String(e?.message??e));process.exitCode=2;}
}
