/**
 * V4E: source-only architecture evidence for a SYNTHETIC author example.
 * Five true B143 voxel orthographic views + original interactive B143 viewer.
 * No Ollama/model network, no Minecraft world, no ART PASS, no private inputs.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {makeV4DCompactSynthetic} from './r125-v4d-compact-model-fixture.mjs';
import {RANKED_SCHEMA,compileRankedExteriorIntent}
 from '../source/ai/r125-v4e-ranked-exterior-ir.mjs';
import {MATERIALS} from '../source/ai/b143-building-dsl.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const error=s=>{throw Error('R125_V4E_ART_EVIDENCE_'+s);};
const colors={stone:'#bec8ce',concrete:'#d8d8d1',metal:'#788d9b',
 glass:'#65cbe1',wood:'#bd9f72',glow:'#e4c782',accent:'#bca6a1'};
function syntheticAuthor(){
 const r=makeV4DCompactSynthetic();
 r.schema=RANKED_SCHEMA;
 const ranks=[['west','east','south','north'],['east','west','south','north']];
 for(const [i,s] of r.spaces.entries()){
  delete s.windowSide;
  s.windowPriority=s.kind==='sky'?null:ranks[i];
 }
 return r;
}
export function actualOrthographicSvg(primitives){
 if(!Array.isArray(primitives)||primitives.length<100)error('EMPTY_B143');
 const faces=[
  {id:'roof',name:'ROOF / true highest voxel'},
  {id:'north',name:'NORTH / entry elevation'},
  {id:'south',name:'SOUTH / rear elevation'},
  {id:'west',name:'WEST / side elevation'},
  {id:'east',name:'EAST / side elevation'}
 ];
 const items=['<svg xmlns="http://www.w3.org/2000/svg" width="1270" height="770" viewBox="0 0 1270 770">',
  '<rect width="1270" height="770" fill="#102638"/>',
  '<text x="20" y="30" fill="#fff" font-family="sans-serif" font-size="20">V4E SYNTHETIC AUTHOR — ACTUAL final B143 voxels</text>',
  '<text x="20" y="50" fill="#b5c7d3" font-family="sans-serif" font-size="12">SOURCE study only. Human ART NOT REVIEWED. No real Qwen/Gemma trial, no Minecraft world.</text>'];
 for(const [i,f] of faces.entries()){
  const visible=new Map();
  for(const p of primitives){
   const [x,y,z,m]=p;
   if(!Number.isSafeInteger(x)||!Number.isSafeInteger(y)||
      !Number.isSafeInteger(z)||!Number.isSafeInteger(m))error('INVALID_PRIMITIVE');
   const u=f.id==='west'||f.id==='east'?z:x;
   const v=f.id==='roof'?z:-y;
   const depth=f.id==='roof'?y:
    f.id==='north'?-z:f.id==='south'?z:
    f.id==='west'?-x:x;
   const key=u+','+v,previous=visible.get(key);
   if(previous===undefined||depth>previous.depth)
    visible.set(key,{u,v,m,depth});
  }
  const cells=[...visible.values()].sort((a,b)=>a.v-b.v||a.u-b.u);
  if(cells.length===0)error('EMPTY_PROJECTION');
  const minU=Math.min(...cells.map(c=>c.u)),maxU=Math.max(...cells.map(c=>c.u));
  const minV=Math.min(...cells.map(c=>c.v)),maxV=Math.max(...cells.map(c=>c.v));
  const width=maxU-minU+1,height=maxV-minV+1;
  const sc=Math.min(4.2,365/width,260/height);
  const px=16+(i%3)*420,py=75+Math.floor(i/3)*343;
  const left=px+(388-width*sc)/2,top=py+37+(270-height*sc)/2;
  items.push('<rect x="'+px+'" y="'+py+'" width="405" height="325" rx="8" fill="#244154"/>',
   '<text x="'+(px+12)+'" y="'+(py+24)+'" fill="#fff" font-family="sans-serif" font-size="14">'+f.name+'</text>');
  for(const c of cells){
   const col=colors[MATERIALS[c.m]];
   if(!col)error('MATERIAL_PALETTE');
   items.push('<rect x="'+(left+(c.u-minU)*sc).toFixed(2)+
    '" y="'+(top+(c.v-minV)*sc).toFixed(2)+
    '" width="'+sc.toFixed(2)+'" height="'+sc.toFixed(2)+
    '" fill="'+col+'"/>');
  }
 }
 items.push('</svg>');
 return items.join('\n')+'\n';
}
export function exportV4ESourceArtEvidence(folder){
 if(typeof folder!=='string'||!path.isAbsolute(folder)||fs.existsSync(folder)||
    !fs.existsSync(path.dirname(folder))||
    folder===ROOT||folder.startsWith(ROOT+path.sep))
  error('PRIVATE_REVIEW_OUTPUT_MUST_BE_NEW_AND_OUTSIDE_REPO');
 const result=compileRankedExteriorIntent(syntheticAuthor());
 const proof=result.rankedPhysicalGlazingSourceProof;
 if(result.worldContacts!==0||result.worldWrites!==0||
    result.readiness!=='NOT_PREPARED'||result.constructionApproved!==false||
    result.executionAllowed!==false||result.BuildPlan.operations.length!==0||
    result.gates.length!==9||result.gates.some(x=>x!=='BLOCKED')||
    result.humanArt!=='NOT_REVIEWED'||
    result.b143.sourceRoutes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
    proof.status!=='B143_WINDOW_GLASS_AND_IMMEDIATE_OUTWARD_AIR_SOURCE_VERIFIED'||
    proof.verifiedPanelGlassCells!==proof.windowCount*18||
    proof.verifiedImmediateOutwardAirCells!==proof.windowCount*18||
    proof.verifiedImmediateInwardAirCells!==proof.windowCount*18)
  error('FAIL_CLOSED_SOURCE_OR_SAFETY_GATE');
 const scene=result.b143.compiled;
 const b143=compileB143Gallery([result.b143.design]);
 const template=fs.readFileSync(path.join(ROOT,'source/ai/b143-viewer-template.html'),'utf8');
 const report={
  schema:'r125-v4e-synthetic-actual-b143-five-view-art-hold-v1',
  provenance:'LOCAL_STATIC_SYNTHETIC_FIXTURE_NOT_A_QWEN_GEMMA_RESPONSE',
  modelRequests:0,realModelIdentity:'NOT_ATTESTED',syntheticCases:1,
  sourceStatus:'SOURCE_ONLY',humanArt:'NOT_REVIEWED',artCertifications:0,
  minecraftWalking:'NOT_TESTED',
  authoredIntentSha256:result.rankedAuthorSha256,
  b143SourceSha256:result.b143.sourceSha256,
  b143GeometrySha256:result.b143.geometrySha256,
  actualFinalB143Voxels:scene.primitives.length,
  orthographicViews:['roof','north','south','west','east'],
  rankedPhysicalGlazingSourceProof:proof,
  safety:{readiness:'NOT_PREPARED',constructionApproved:false,
   executionAllowed:false,worldContacts:0,worldWrites:0,
   gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}}
 };
 fs.mkdirSync(folder);
 fs.writeFileSync(path.join(folder,'index.html'),
  renderB143Html(b143,template),{flag:'wx'});
 fs.writeFileSync(path.join(folder,'ACTUAL_FINAL_B143_FIVE_VIEWS.svg'),
  actualOrthographicSvg(scene.primitives),{flag:'wx'});
 fs.writeFileSync(path.join(folder,'SOURCE_ART_HOLD_REPORT.json'),
  JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 return report;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2);
  if(args.length!==2||args[0]!=='--out')error('ARGS');
  console.log(JSON.stringify(exportV4ESourceArtEvidence(path.resolve(args[1])),null,2));
 }catch(e){
  console.error('R125_V4E_ART_EVIDENCE_HOLD',String(e));
  process.exitCode=2;
 }
}
