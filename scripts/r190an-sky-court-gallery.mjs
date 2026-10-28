/** Synthetic only: native roof-ring atrium, never post-process a box.
 * Actual B143 voxels, no Minecraft or model requests.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {r190AMSyntheticPlan} from './r190am-author-layout-gallery.mjs';
import {compileR190SemanticPlan} from '../source/ai/r190-semantic-massing.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
import {renderR164Elevation} from './r164-exterior-audit.mjs';
const variants=[
 {name:'00-baseline',court:null,wingShift:0},
 {name:'01-center-court',court:{spaceId:'showroom',offsetX:4,offsetZ:3,width:9,depth:7},wingShift:0},
 {name:'02-offcenter-court',court:{spaceId:'showroom',offsetX:2,offsetZ:4,width:9,depth:7},wingShift:0},
 {name:'03-court-asymmetric-wing',court:{spaceId:'showroom',offsetX:2,offsetZ:4,width:9,depth:7},wingShift:8}
];
const views=['front','rear','west','east','roof'];
const write=(file,content)=>fs.writeFileSync(file,content,{flag:'wx'});
const json=(file,x)=>write(file,JSON.stringify(x,null,2)+'\n');
export function r190ANSyntheticPlan(name){
 const v=variants.find(x=>x.name===name);
 if(!v)throw Error('R190AN_UNKNOWN_CASE');
 const p=r190AMSyntheticPlan(v.wingShift);
 if(v.court)p.skyCourtIntent=structuredClone(v.court);
 return p;
}
export function writeR190ANGallery(out){
 if(!path.isAbsolute(out)||fs.existsSync(out)||
  !fs.existsSync(path.dirname(out))||
  !fs.statSync(path.dirname(out)).isDirectory())
  throw Error('R190AN_NEW_ABSOLUTE_OUTPUT_REQUIRED');
 const template=fs.readFileSync(new URL('../source/ai/b143-viewer-template.html',import.meta.url),'utf8');
 fs.mkdirSync(out);
 const scenes=[],links=[];
 for(const v of variants){
  const plan=r190ANSyntheticPlan(v.name);
  const built=compileR190SemanticPlan(plan);
  if(!verifyCompiled(built.design,built.compiled)||
     !built.audit.allProgramSpacesReachable||
     built.audit.witnesses.length!==plan.spaces.length||
     built.worldContacts!==0||built.worldWrites!==0||
     (v.court?built.audit.skyCourt?.actualOpenSkyColumns!==63:built.audit.skyCourt!==null))
   throw Error('R190AN_REAL_SOURCE_AUDIT_HOLD');
  const roof=plan.spaces[0].height;
  if(v.court&&built.design.elements.some(x=>x.id==='showroom-roof'||
    (x.id.startsWith('showroom-')&&x.mode==='cut'&&x.origin[1]===roof)))
   throw Error('R190AN_FORBIDDEN_POST_HOC_ROOF_CUT');
  json(path.join(out,v.name+'-IR.json'),plan);
  json(path.join(out,v.name+'-B143.json'),built.design);
  const html=renderB143Html(compileB143Gallery([built.design]),template);
  if(!html.includes('<body>'))throw Error('R190AN_VIEWER_INVALID');
  write(path.join(out,v.name+'-REAL-B143.html'),
    html.replace('<body>','<body><aside style="padding:14px;background:#542917;color:white;font:16px system-ui">R190-AN SYNTHETIC / '+v.name+' / TRUE B143 / ART HOLD / NO LLM / NO CONSTRUCTION</aside>'));
  for(const side of views)write(path.join(out,v.name+'-'+side+'.svg'),
   renderR164Elevation(built.compiled,built.design,side));
  scenes.push({name:v.name,wingShift:v.wingShift,court:v.court,
   provenance:'SYNTHETIC_NOT_MODEL_RESPONSE',
   geometrySha256:built.compiled.geometrySha256,
   sourceSha256:built.compiled.sourceSha256,
   trueB143VoxelCount:built.compiled.primitives.length,
   skyCourtAudit:built.audit.skyCourt,sourceRouteCertified:true,
   modelCalls:0,worldWrites:0,art:'ART_HOLD'});
  links.push('<li>'+v.name+'：<a href="'+v.name+'-REAL-B143.html">真正3D</a> / '+
   views.map(s=>'<a href="'+v.name+'-'+s+'.svg">'+s+'</a>').join(' / ')+'</li>');
 }
 if(new Set(scenes.map(x=>x.geometrySha256)).size!==4)
  throw Error('R190AN_NO_DISTINCT_SOURCE_GEOMETRY');
 json(path.join(out,'SUMMARY.json'),{schema:'minecraftaibuilder-r190an-synthetic-court-v1',
  provenance:'SYNTHETIC_NOT_REAL_MODEL',scenes,modelCalls:0,
  worldContacts:0,worldWrites:0,readiness:'NOT_PREPARED',
  constructionApproved:false,executionAllowed:false,
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
  art:'ART_HOLD',officialArtAdoptions:0,
  minecraftWalking:'NOT_TESTED',humanArtJudgment:'NOT_PERFORMED'});
 write(path.join(out,'index.html'),
  '<!doctype html><html lang="ja"><meta charset="utf-8"><title>R190-AN 空洞・翼棟の真正3D比較</title>'+
  '<h1>R190-AN：内部空洞を最初から設計した4案</h1>'+
  '<p>4案すべて合成設計。真正B143形状。実Qwen/Gemma推論なし。Minecraft施工なし。美術ART HOLD。</p>'+
  '<p>00→01は内部空洞の有無、01→02は空洞の偏心、02→03は翼棟の位置だけを変えている。</p>'+
  '<ul>'+links.join('')+'</ul><a href="SUMMARY.json">検証根拠</a></html>');
 return {count:4,uniqueGeometry:4,worldWrites:0,modelCalls:0,art:'ART_HOLD'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const a=process.argv.slice(2);
  if(a.length!==2||a[0]!=='--out')throw Error('R190AN_ARGS');
  console.log(JSON.stringify(writeR190ANGallery(a[1]),null,2));
 }catch(e){console.error(String(e?.message??e));process.exitCode=2;}
}
