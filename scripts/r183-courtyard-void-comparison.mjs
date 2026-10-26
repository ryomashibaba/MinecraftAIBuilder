/**
 * R183 matched-program source-only test data.
 * Not Qwen/Gemma output, not a user-confirmed art success.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {R178_SYNTHETIC_CASES} from './r178-wing-comparison.mjs';
import {R181_SYNTHETIC_SETTINGS,makeR181SyntheticReply}
 from './r181-courtyard-graph-comparison.mjs';
import {parseR181CourtyardGraphReply}
 from '../source/ai/r181-courtyard-graph.mjs';
import {parseR183CourtyardVoidReply,R183_SCHEMA}
 from '../source/ai/r183-courtyard-negative-mass.mjs';
import {compileB143Gallery,renderB143Html}
 from './b143-gallery-core.mjs';
import {renderR164Elevation} from './r164-exterior-audit.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';

const fail=s=>{throw Error('R183_COMPARE_'+s);};
// Three INDEPENDENT static notches, explicitly authored. These are
// geometry hypotheses, never regenerated from category-name heuristics.
export const R183_SYNTHETIC_TERRACES=[
 [
  {volumeId:'anchor',rect:{x:7,z:18,width:5,depth:6},accessZ:20},
  {volumeId:'north',rect:{x:20,z:10,width:5,depth:4},accessZ:11},
  {volumeId:'south',rect:{x:18,z:21,width:5,depth:4},accessZ:22}
 ],
 [
  {volumeId:'anchor',rect:{x:6,z:18,width:5,depth:6},accessZ:20},
  {volumeId:'north',rect:{x:21,z:11,width:4,depth:4},accessZ:12},
  {volumeId:'south',rect:{x:19,z:20,width:4,depth:4},accessZ:21}
 ],
 [
  {volumeId:'anchor',rect:{x:8,z:18,width:5,depth:6},accessZ:20},
  {volumeId:'north',rect:{x:21,z:10,width:3,depth:3},accessZ:10},
  {volumeId:'south',rect:{x:19,z:20,width:5,depth:4},accessZ:21}
 ]
];
export function makeR183SyntheticReply(t,i){
 const old=makeR181SyntheticReply(t,R181_SYNTHETIC_SETTINGS[i]);
 // The old room layout and furniture are passed through unchanged.
 const terraces=R183_SYNTHETIC_TERRACES[i].map(t=>{
  const v=old.architecture.volumes.find(v=>v.id===t.volumeId);
  return {...structuredClone(t),roomId:v.roomIds[
   v.roomIds.length===2?1:0]};
 });
 return {...old,massingVoids:{schema:R183_SCHEMA,terraces}};
}
const safe=x=>x.readiness==='NOT_PREPARED'&&
 x.executionAllowed===false&&x.constructionApproved===false&&
 x.worldWrites===0&&x.worldContacts===0&&
 x.gates.length===9&&x.gates.every(v=>v==='BLOCKED')&&
 x.BuildPlan.operations.length===0;

export function buildR183MatchedComparison(){
 const cases=R178_SYNTHETIC_CASES.map((t,i)=>{
  const input=makeR183SyntheticReply(t,i);
  const r181=structuredClone(input);delete r181.massingVoids;
  const req={naturalLanguageBrief:'SYNTHETIC COURTYARD VOID PROGRAM '+t.id};
  const before=parseR181CourtyardGraphReply(JSON.stringify(r181),req)
   .designOnlySource;
  const out=parseR183CourtyardVoidReply(JSON.stringify(input),req),
   after=out.designOnlySource,ev=after.r183VoidEvidence;
  if(!safe(out)||!safe(before)||!safe(after)||
   !verifyCompiled(after.design,after.compiled)||
   after.geometrySha256===before.geometrySha256||
   after.sourceRouteAudit.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
   !after.sourceRouteAudit.zones.every(z=>z.reachedFromEntrance)||
   !after.sourceRouteAudit.featureAccess.every(z=>z.reachableFromEntrance)||
   !ev.actualRoofVoidsAndReclosedWallsVerified||
   ev.usableOutdoorTerracesSourceReached!==3||
   ev.outdoorRouteWitnesses.length!==4||
   ev.indoorWitness.length!==4||
   ev.outdoorRouteWitnesses.some(x=>x===null)||
   ev.indoorWitness.some(x=>x.pad===null)||
   after.placements.length!==4||
   out.modelCalls!==0||after.design.elements.length>160)
   fail('PHYSICAL_MASS_OR_SOURCE_ROUTE_'+t.id);
  return {id:t.id,use:t.use,before,after,
   audit:{id:t.id,use:t.use,oldGeometrySha256:before.geometrySha256,
    newGeometrySha256:after.geometrySha256,
    originalRawSha256:out.originalRawSha256,
    trueB143VoxelsBefore:before.compiled.primitives.length,
    trueB143VoxelsAfter:after.compiled.primitives.length,
    trueElementsBefore:before.design.elements.length,
    trueElementsAfter:after.design.elements.length,
    declaredModelVoids:ev.terraceGeometry,
    actualRoofAndFacadeVoids:3,terracesReachedFromEntrance:3,
    existingRooms:4,unchangedAndAccessibleFurniture:4,
    sourceOnly:true,genuineLocalModelCalls:0,
    minecraftWalking:'NOT_TESTED',
    aestheticStatus:'ART_HOLD',
    readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),
    BuildPlan:{operations:[]},worldWrites:0,worldContacts:0}};
 });
 if(new Set(cases.map(c=>c.after.geometrySha256)).size!==3)
  fail('DIFFERENT_SYNTHETIC_CASES_SAME_VOXELS');
 return {schema:'r183-source-only-mass-void-v1',
  syntheticCases:3,realModelCalls:0,worldWrites:0,
  aestheticStatus:'ART_HOLD',cases};
}
export function saveR183MatchedComparison(out){
 if(typeof out!=='string'||!out||fs.existsSync(out))
  fail('OUTPUT_MUST_BE_NEW');
 const report=buildR183MatchedComparison();
 const dir=path.resolve(out),root=path.dirname(fileURLToPath(import.meta.url));
 const template=fs.readFileSync(path.join(root,
  '../source/ai/b143-viewer-template.html'),'utf8');
 const files=new Map();
 for(const c of report.cases){
  for(const [label,p] of [['r181',c.before],['r183',c.after]]){
   const prefix=c.id+'-'+label;
   files.set(prefix+'.html',renderB143Html(compileB143Gallery([p.design]),template));
   for(const view of ['front','rear','east','west','roof'])
    files.set(prefix+'-'+view+'.svg',
     renderR164Elevation(p.compiled,p.design,view));
  }
 }
 files.set('R183_SOURCE_QA.json',JSON.stringify({...report,
  cases:report.cases.map(c=>c.audit)},null,2)+'\n');
 files.set('index.html','<!doctype html><html lang="ja"><meta charset="utf-8">'+
  '<title>R183 negative mass three use source-only comparison</title>'+
  '<style>body{font:15px/1.5 system-ui;background:#152436;color:#f2f6fc;padding:18px}'+
  '.pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}section{margin:24px 0}'+
  'article{background:#31485d;padding:10px}iframe{width:100%;height:420px}'+
  'img{width:19%;margin:.5%}</style>'+
  '<h1>R183 — Courtyard-facing negative masses, genuine B143 geometry</h1>'+
  '<p>3 entirely STATIC SYNTHETIC designs. NOT model inference, ART HOLD, Minecraft writes=0.</p>'+
  report.cases.map(c=>'<section><h2>'+c.use+'</h2><div class="pair">'+
   ['r181','r183'].map(label=>'<article><h3>'+label.toUpperCase()+'</h3>'+
    '<iframe loading="lazy" src="'+c.id+'-'+label+'.html"></iframe>'+
    ['front','rear','east','west','roof'].map(s=>'<img src="'+c.id+'-'+label+
     '-'+s+'.svg" alt="'+s+'">').join('')+'</article>').join('')+
   '</div></section>').join(''));
 fs.mkdirSync(dir,{recursive:false});
 for(const [name,text] of files)
  fs.writeFileSync(path.join(dir,name),text,{flag:'wx'});
 if(process.env.GITHUB_STEP_SUMMARY)
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
   ['### R183 source-only courtyard-negative mass pilot',
    '**STATIC SYNTHETIC INPUT, NOT local LLM. ART HOLD / worldWrites=0.**',
    '| Use | R181 true voxels | R183 true voxels | R183 elements |',
    '|---|---:|---:|---:|',
    ...report.cases.map(c=>'| '+c.use+' | '+c.audit.trueB143VoxelsBefore+
     ' | '+c.audit.trueB143VoxelsAfter+' | '+c.audit.trueElementsAfter+' |'),
    ''].join('\n'));
 return report;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2);
  if(args.length!==2||args[0]!=='--out')fail('USAGE');
  const result=saveR183MatchedComparison(args[1]);
  console.log(JSON.stringify({cases:result.syntheticCases,modelCalls:0,worldWrites:0}));
 }catch(e){console.error(String(e?.stack??e));process.exitCode=2}
}
