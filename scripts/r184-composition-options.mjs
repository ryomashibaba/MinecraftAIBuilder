/**
 * R184 matched-program THREE DIFFERENT architecture form grammars.
 * These are researcher-authored synthetic hypotheses, not LLM outputs.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {compileR184Hypothesis,R184_SCHEMA,FORM_FAMILIES}
 from '../source/ai/r184-composition-grammar.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
import {renderR164Elevation} from './r164-exterior-audit.mjs';

const fail=s=>{throw Error('R184_ART_OPTIONS_'+s);};
const safe=x=>x.readiness==='NOT_PREPARED'&&x.executionAllowed===false&&
 x.constructionApproved===false&&x.worldContacts===0&&
 x.worldWrites===0&&x.gates.length===9&&
 x.gates.every(g=>g==='BLOCKED')&&x.BuildPlan.operations.length===0;

export const R184_COMMON_CONCEPT_PROGRAM=Object.freeze([
 {id:'assembly',role:'gathering',areaPriority:'primary'},
 {id:'study',role:'focused',areaPriority:'secondary'},
 {id:'backstage',role:'support',areaPriority:'tertiary'}
]);
export const R184_EXPLICIT_STATIC_CHOICES=[
 {id:'curved-public-court',name:'01 / 円環中庭主体',
  grammar:'inhabited-rotunda',publicSpace:'central-court',
  verticalContrast:2},
 {id:'elevated-crossing',name:'02 / 空中横断主棟',
  grammar:'elevated-crossing',publicSpace:'underpass',
  verticalContrast:3},
 {id:'folded-ground',name:'03 / 段状地形建築',
  grammar:'folded-ground',publicSpace:'roof-walk',
  verticalContrast:2}
];
export function makeR184ResearchHypothesis(choice){
 if(!R184_EXPLICIT_STATIC_CHOICES.some(x=>x===choice))
  fail('STATIC_CHOICE_REQUIRED');
 return {
  schema:R184_SCHEMA,id:choice.id,title:choice.name,
  brief:'Same three conceptual building functions; independent ART research; no Minecraft construction',
  site:{width:48,height:32,depth:48},
  program:{zones:structuredClone(R184_COMMON_CONCEPT_PROGRAM),
   functionalVerification:'NOT_TESTED'},
  composition:{grammar:choice.grammar,publicSpace:choice.publicSpace,
   verticalContrast:choice.verticalContrast,dominantUse:'assembly'}
 };
}
function hashCoordinateSet(x){
 // Model-AUTOMATIC geometric crosscheck must ignore design title/source
 // metadata; this is the physical set of actual voxel coordinates.
 return new Set(x.compiled.primitives.map(p=>p.slice(0,3).join(',')));
}
export function buildR184ArtOptions(){
 const cases=R184_EXPLICIT_STATIC_CHOICES.map(choice=>{
  const raw=JSON.stringify(makeR184ResearchHypothesis(choice));
  const r=compileR184Hypothesis(raw);
  if(!safe(r)||!verifyCompiled(r.design,r.compiled)||
   r.modelCalls!==0||r.spatialMetrics.roomVolumes!=='NOT_MODELED'||
   r.spatialMetrics.actualEntranceRoute!=='NOT_TESTED'||
   r.spatialMetrics.furnitureAndFixtures!=='NOT_MODELED'||
   r.spatialMetrics.minecraftTraversal!=='NOT_TESTED'||
   r.aestheticStatus!=='ART_HOLD'||r.design.elements.length>160||
   r.spatialMetrics.realVoxels<1500)
   fail('SOURCE_ONLY_COMPOSITION_FAILED_'+choice.id);
  return {id:choice.id,name:choice.name,grammar:choice.grammar,
   ir:r.parsedIR,design:r.design,compiled:r.compiled,
   spatialMetrics:r.spatialMetrics,
   provenance:{originalRawSha256:r.originalRawSha256,
    authoredBy:'STATIC_SYNTHETIC_RESEARCHER',realModelCalls:0,
    noMinecraftSimulation:true,allRoomRoutes:'NOT_TESTED',
    functionAndArtNotProven:true},
   result:r};
 });
 if(cases.length!==3||new Set(cases.map(c=>c.compiled.geometrySha256)).size!==3)
  fail('NOT_THREE_UNIQUE_B143_FORMS');
 const geometricDistances=[];
 for(let i=0;i<cases.length;i++)for(let j=i+1;j<cases.length;j++){
  const a=hashCoordinateSet(cases[i]),b=hashCoordinateSet(cases[j]);
  let shared=0;for(const k of a)if(b.has(k))shared++;
  const differing=a.size+b.size-2*shared;
  const union=a.size+b.size-shared;
  if(differing<1000||differing/union<0.15)
   fail('ARCHITECTURE_NOT_DISTINCT_ENOUGH_'+i+'_'+j);
  geometricDistances.push({first:cases[i].id,second:cases[j].id,
   exactDifferentTrueVoxelCoordinates:differing,
   symmetricDifferenceOfUnion:differing/union,
   physicalIntersectionCount:shared});
 }
 const signatures=cases.map(c=>c.ir.program.zones.map(z=>
  [z.id,z.role,z.areaPriority].join('/')).join('|'));
 if(new Set(signatures).size!==1)
  fail('INCOMPARABLE_PROGRAMS');
 return {schema:'r184-three-competing-architecture-compositions-v1',
  publicProgramEquality:'THREE_IDENTICAL_SEMANTIC_PROGRAMS',
  builtB143VolumeStudies:3,realLocalModelCalls:0,
  actualMinecraftWorldWrites:0,
  spatialIndependenceChecks:geometricDistances,
  safetyStatus:'NOT_PREPARED_9_BLOCKED',
  decision:'ART_HOLD_HUMAN_SIDE_BY_SIDE_REVIEW_REQUIRED',
  // Deliberately NOT yet validating rooms and furniture here.
  nextGate:'ART_CANDIDATE_SELECTION_BEFORE_FURNISHED_ROUTE_QA',
  cases};
}
export function saveR184ArtOptions(out){
 if(typeof out!=='string'||!out||fs.existsSync(out))
  fail('NEW_OUTPUT_PATH_REQUIRED');
 const r=buildR184ArtOptions(),dir=path.resolve(out),
  root=path.dirname(fileURLToPath(import.meta.url));
 const template=fs.readFileSync(path.join(root,
  '../source/ai/b143-viewer-template.html'),'utf8');
 const files=new Map();
 for(const c of r.cases){
  files.set(c.id+'.html',
   renderB143Html(compileB143Gallery([c.design]),template));
  for(const view of ['front','rear','west','east','roof'])
   files.set(c.id+'-'+view+'.svg',
    renderR164Elevation(c.compiled,c.design,view));
 }
 files.set('R184_SOURCE_QA.json',JSON.stringify({...r,cases:r.cases.map(c=>({
  id:c.id,name:c.name,grammar:c.grammar,
  spatialMetrics:c.spatialMetrics,provenance:c.provenance,
  program:c.ir.program,originalRawIR:c.result.rawSyntheticIR,
  readiness:c.result.readiness,gates:c.result.gates,
  BuildPlan:c.result.BuildPlan,worldWrites:c.result.worldWrites
 }))},null,2)+'\n');
 files.set('index.html','<!doctype html><html lang="ja"><meta charset="utf-8">'+
  '<title>R184 三つの独立した全体建築構成研究</title>'+
  '<style>body{font:15px/1.55 system-ui;background:#142437;color:#edf4fd;'+
  'margin:0;padding:22px}section{background:#243f55;margin:18px 0;padding:16px}'+
  'iframe{height:500px;width:100%;border:1px solid #718196}img{width:19.5%;'+
  'max-height:350px}.note{background:#314c63;padding:12px}</style>'+
  '<h1>R184 — 3つの異なる全体建築構成</h1>'+
  '<p class="note">完全合成研究、実B143ソースから生成した3D。'+
  '美術選定ART HOLD。室内利用・家具・2幅動線・Minecraft施工は未検証。'+
  '本物のQwen/Gemma設計ではありません。世界書込み0。</p>'+
  r.cases.map(c=>'<section><h2>'+c.name+'</h2><p>'+
   '本物のB143ボクセル '+c.spatialMetrics.realVoxels+' / 外形高低差 '+
   c.spatialMetrics.distinctTopHeights+'段 / '+c.grammar+
   '</p><iframe loading="lazy" src="'+c.id+'.html"></iframe>'+
   ['front','rear','west','east','roof'].map(v=>'<img loading="lazy" alt="'+
    v+'" src="'+c.id+'-'+v+'.svg">').join('')+
   '</section>').join(''));
 fs.mkdirSync(dir,{recursive:false});
 for(const [file,content] of files)
  fs.writeFileSync(path.join(dir,file),content,{flag:'wx'});
 if(process.env.GITHUB_STEP_SUMMARY)
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
   ['### R184 actual B143 architecture form directions (synthetic)',
    'ART HOLD. **NOT real model-generated, NOT room/function verified**.',
    '| Form | True voxels | Top height levels |',
    '|---|---:|---:|',
    ...r.cases.map(c=>'| '+c.name+' | '+
     c.spatialMetrics.realVoxels+' | '+c.spatialMetrics.distinctTopHeights+' |'),
    ''].join('\n'));
 return r;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const a=process.argv.slice(2);
  if(a.length!==2||a[0]!=='--out')fail('USAGE');
  const result=saveR184ArtOptions(a[1]);
  console.log(JSON.stringify({forms:result.cases.length,
   realModelCalls:0,worldWrites:0,aestheticStatus:'ART_HOLD'}));
 }catch(e){console.error(String(e?.stack??e));process.exitCode=2}
}
