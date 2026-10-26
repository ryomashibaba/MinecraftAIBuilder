/**
 * R181 strictly synthetic three-volume courtyard topology.
 * Not an LLM architecture success or Minecraft execution permission.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseR181CourtyardGraphReply,R181_SCHEMA} from '../source/ai/r181-courtyard-graph.mjs';
import {R178_SYNTHETIC_CASES,makeR178SyntheticReply}
 from './r178-wing-comparison.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {renderB143Html,compileB143Gallery} from './b143-gallery-core.mjs';
import {renderR164Elevation} from './r164-exterior-audit.mjs';
const hold=s=>{throw Error('R181_GRAPH_PILOT_'+s);};
export const R181_SYNTHETIC_SETTINGS=[
 {mainWidth:11,north:{x:20,z:2,depth:12,roofY:8},
  south:{x:18,z:21,depth:10,roofY:11},roofY:12,links:[7,24]},
 {mainWidth:10,north:{x:21,z:1,depth:14,roofY:11},
  south:{x:19,z:20,depth:11,roofY:9},roofY:13,links:[6,25]},
 {mainWidth:12,north:{x:21,z:3,depth:10,roofY:10},
  south:{x:18,z:20,depth:11,roofY:13},roofY:11,links:[5,24]}
];
export function makeR181SyntheticReply(t,configuration){
 const r=makeR178SyntheticReply(t);
 // Declare ONE real main wing shared-wall link, not an invented cross-pavilion door.
 r.relations={entryFacingZoneId:t.westWing[0],
  directAdjacencies:[[...t.westWing]]};
 const rect=(x,z,depth)=>({x,z,width:31-x,depth});
 r.architecture={schema:R181_SCHEMA,entranceVolumeId:'anchor',
  volumes:[
   {id:'anchor',roomIds:[...t.westWing],
    rect:{x:1,z:1,width:configuration.mainWidth,depth:30},
    roofY:configuration.roofY},
   {id:'north',roomIds:[t.eastWing[0]],
    rect:rect(configuration.north.x,configuration.north.z,
     configuration.north.depth),roofY:configuration.north.roofY},
   {id:'south',roomIds:[t.eastWing[1]],
    rect:rect(configuration.south.x,configuration.south.z,
     configuration.south.depth),roofY:configuration.south.roofY}
  ],
  links:[{from:'anchor',to:'north',z:configuration.links[0]},
   {from:'anchor',to:'south',z:configuration.links[1]}]};
 return r;
}
const isSafe=r=>r.readiness==='NOT_PREPARED'&&
 r.worldWrites===0&&r.worldContacts===0&&
 r.executionAllowed===false&&r.constructionApproved===false&&
 r.gates.length===9&&r.gates.every(x=>x==='BLOCKED')&&
 r.BuildPlan.operations.length===0;
export function buildR181CampusComparisons(){
 const cases=R178_SYNTHETIC_CASES.map((t,i)=>{
  const reply=makeR181SyntheticReply(t,R181_SYNTHETIC_SETTINGS[i]);
  const raw=JSON.stringify(reply);
  const r=parseR181CourtyardGraphReply(raw,{
   naturalLanguageBrief:'Synthetic independent three volume graph '+t.id});
  const p=r.designOnlySource,w=p.r181GraphEvidence;
  if(!isSafe(r)||!isSafe(p)||!verifyCompiled(p.design,p.compiled)||
   p.design.elements.length>160||p.program[0].zones.length!==4||
   w.volumesInPhysicalB143!==3||w.coveredLinks!==2||
   w.modelRequestedIndoorDirectDoors!==1||
   !w.outdoorCourtReachableFromEntrance||!w.courtOpenToSky||
   p.placements.length!==reply.objects.length||
   p.sourceRouteAudit.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
   p.sourceRouteAudit.zones.some(x=>!x.reachedFromEntrance)||
   p.sourceRouteAudit.featureAccess.some(x=>!x.reachableFromEntrance)||
   p.compiled.primitives.length<1000||
   r.modelCalls!==0||r.originalRawString!==raw)
   hold('PROGRAM_OR_PHYSICAL_SOURCE_HOLD_'+t.id);
  return {id:t.id,use:t.use,reply,result:p,
   audit:{case:t.id,use:t.use,
    originalRawSha256:r.originalRawSha256,
    geometrySha256:p.geometrySha256,sourceSha256:p.sourceSha256,
    actualVoxels:p.compiled.primitives.length,
    b143ElementCount:p.design.elements.length,
    modelDeclaredVolumes:reply.architecture.volumes,
    modelDeclaredLinks:reply.architecture.links,
    actualPhysicalVolumes:3,actualCoveredConnections:2,
    directSharedWallDoors:1,interiorRooms:4,
    furnishedObjects:p.placements.length,
    courtSourceReachable:w.outdoorCourtReachableFromEntrance,
    roomSourceAccessVerified:true,equipmentSourceAccessVerified:true,
    rawIsSynthetic:true,localModelCalls:0,
    worldWrites:0,worldContacts:0,readiness:'NOT_PREPARED',
    gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
    art:'ART_HOLD',minecraftWalking:'NOT_TESTED'}};
 });
 if(new Set(cases.map(c=>c.result.geometrySha256)).size!==3)
  hold('NO_PHYSICAL_DIVERSITY');
 return {schema:'r181-independent-three-volume-graph-pilot-v1',
  syntheticCount:cases.length,genuineModelCalls:0,worldWrites:0,
  aestheticStatus:'ART_HOLD',cases};
}
export function saveR181CampusComparisons(out){
 if(!out||fs.existsSync(out))hold('OUTPUT_MUST_BE_NEW');
 const review=buildR181CampusComparisons(),
  dir=path.resolve(out),root=path.dirname(fileURLToPath(import.meta.url));
 const template=fs.readFileSync(path.join(root,
  '../source/ai/b143-viewer-template.html'),'utf8');
 const files=new Map();
 for(const c of review.cases){
  files.set(c.id+'.html',renderB143Html(
   compileB143Gallery([c.result.design]),template));
  for(const view of ['front','rear','west','east','roof'])
   files.set(c.id+'-'+view+'.svg',
    renderR164Elevation(c.result.compiled,c.result.design,view));
 }
 files.set('R181_CI_QA.json',JSON.stringify({...review,
  cases:review.cases.map(c=>c.audit)},null,2)+'\n');
 files.set('index.html','<!doctype html><html lang="ja"><meta charset="utf-8">'+
  '<title>R181 3ボリューム＋中庭 実B143</title>'+
  '<style>body{background:#132436;color:white;font:15px/1.5 system-ui;padding:24px}'+
  'section{background:#223b52;padding:16px;margin:14px 0}iframe{height:450px;width:100%}'+
  'img{width:19.5%;max-height:300px}</style>'+
  '<h1>R181 独立した主棟＋2離れ＋2接続通路・中庭</h1>'+
  '<p>**完全合成**の3用途比較。実Qwen/Gemma生成ではありません。'+
  'Minecraft施工0、ART HOLD。</p>'+
  review.cases.map(c=>'<section><h2>'+c.use+'</h2><p>実B143 '+c.audit.actualVoxels+
   'セル / '+c.audit.b143ElementCount+'要素</p><iframe src="'+
   c.id+'.html"></iframe>'+
   ['front','rear','west','east','roof'].map(view=>'<img src="'+c.id+
    '-'+view+'.svg" alt="'+view+'">').join('')+'</section>').join(''));
 fs.mkdirSync(dir,{recursive:false});
 for(const [name,content] of files)
  fs.writeFileSync(path.join(dir,name),content,{flag:'wx'});
 if(process.env.GITHUB_STEP_SUMMARY)
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
   ['### R181 three physically separate volumes — SYNTHETIC SOURCE ONLY',
    'No genuine local model or Minecraft world writes. ART HOLD.',
    '| Use | Physical voxels | B143 elements | Physical masses |',
    '|---|---:|---:|---:|',
    ...review.cases.map(c=>'| '+c.use+' | '+c.audit.actualVoxels+
      ' | '+c.audit.b143ElementCount+' | 3 |'),''].join('\n'));
 return review;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2);
  if(args.length!==2||args[0]!=='--out')hold('USAGE');
  const r=saveR181CampusComparisons(args[1]);
  console.log(JSON.stringify({cases:r.syntheticCount,worldWrites:0,modelCalls:0}));
 }catch(e){console.error(String(e?.stack??e));process.exitCode=2}
}
