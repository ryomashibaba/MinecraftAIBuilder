/** R190: actual B143 3D evidence, with STATIC SYNTHETIC provenance. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {compileR190SemanticPlan} from '../source/ai/r190-semantic-massing.mjs';
import {R190_STATIC_SYNTHETIC_CASES} from './r190-semantic-fixtures.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
import {renderR164Elevation} from './r164-exterior-audit.mjs';
const fail=s=>{throw Error('R190_REVIEW_'+s);};
const sides=['front','rear','west','east','roof'];
export function buildR190SourceReview(){
 const cases=R190_STATIC_SYNTHETIC_CASES.map(p=>compileR190SemanticPlan(p));
 if(cases.length!==3||new Set(cases.map(c=>c.compiled.geometrySha256)).size!==3)
  fail('DISTINCT_SOURCE_GEOMETRY_REQUIRED');
 for(const c of cases){
  if(!c.audit.allProgramSpacesReachable||c.art!=='ART_HOLD'||
   c.modelAuthorship!=='CALLER_PROVIDED_IR_UNVERIFIED'||
   c.constructionApproved||c.executionAllowed||c.worldWrites!==0||
   c.worldContacts!==0||c.readiness!=='NOT_PREPARED'||
   c.gates.some(g=>g!=='BLOCKED')||c.BuildPlan.operations.length!==0)
   fail('SOURCE_SAFETY_OR_ROUTE');
 }
 return {schema:'minecraftaibuilder-r190-review-v1',
  realLocalModelCalls:0,provenance:'STATIC_SYNTHETIC_RESEARCHER',
  artsStatus:'ART_HOLD',minecraftWalking:'NOT_TESTED',cases};
}
export function saveR190SourceReview(out){
 if(typeof out!=='string'||!out||fs.existsSync(out))fail('NEW_OUTPUT_PATH_REQUIRED');
 const result=buildR190SourceReview(),dir=path.resolve(out);
 const template=fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)),
  '../source/ai/b143-viewer-template.html'),'utf8');
 const files=new Map();
 for(const c of result.cases){
  files.set(c.design.id+'.html',renderB143Html(compileB143Gallery([c.design]),template));
  for(const v of sides)
   files.set(c.design.id+'-'+v+'.svg',renderR164Elevation(c.compiled,c.design,v));
 }
 files.set('R190_SOURCE_QA.json',JSON.stringify({schema:result.schema,
  realLocalModelCalls:0,provenance:result.provenance,art:result.artsStatus,
  minecraftWalking:'NOT_TESTED',worldWrites:0,
  cases:result.cases.map(c=>({id:c.inputPlan.id,
   inputPlan:c.inputPlan,layout:c.layout,audit:c.audit,
   voxels:c.compiled.primitives.length,sourceSha256:c.compiled.sourceSha256,
   geometrySha256:c.compiled.geometrySha256,
   worldWrites:c.worldWrites,gates:c.gates,art:c.art}))},null,2)+'\n');
 const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;');
 files.set('index.html','<!doctype html><html lang="ja"><meta charset="utf-8">'+
  '<title>R190 - semantic source comparison</title>'+
  '<style>body{font:15px/1.5 system-ui;margin:24px;background:#182532;'+
  'color:#eef3f8}article{padding:18px;margin:20px 0;background:#293e50}'+
  'iframe{width:100%;height:500px;border:0}img{width:19.5%}</style>'+
  '<h1>R190 - semantic room graph -> actual B143 source</h1>'+
  '<p>STATIC SYNTHETIC IR (not model-generated). Route checks are SOURCE-only. '+
  'ART HOLD. No Minecraft walking, world writes, or art adoption.</p>'+
  result.cases.map(c=>'<article><h2>'+escape(c.inputPlan.id)+'</h2><p>'+
   c.compiled.primitives.length+' genuine B143 voxels; '+
   c.audit.witnesses.length+' rooms reachable (source only)</p>'+
   '<iframe loading="lazy" src="'+c.design.id+'.html"></iframe>'+
   sides.map(v=>'<img loading="lazy" alt="'+v+'" src="'+c.design.id+'-'+v+'.svg">').join('')+
   '</article>').join(''));
 fs.mkdirSync(dir,{recursive:false});
 for(const [name,contents] of files)
  fs.writeFileSync(path.join(dir,name),contents,{flag:'wx'});
 if(process.env.GITHUB_STEP_SUMMARY)
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
   '### R190 synthetic semantic source 3D comparison\n'+
   'Three source-only B143 reviews, ART HOLD. NOT real model or Minecraft.\n');
 return {cases:result.cases.length,sourceOnly:true,art:'ART_HOLD'};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const a=process.argv.slice(2);
  if(a.length!==2||a[0]!=='--out')fail('USAGE');
  console.log(JSON.stringify(saveR190SourceReview(a[1])));
 }catch(e){console.error(String(e?.stack??e));process.exitCode=2}
}
