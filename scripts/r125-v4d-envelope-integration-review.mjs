/** A single real B143 review artifact for three safely opt-in envelope integrations. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {makeV4DEnvelopeIntegrationFixtures}
 from './r125-v4d-envelope-integration-fixtures.mjs';
import {compileEnvelopeIntegrity}
 from '../source/ai/r125-v4d-envelope-integration.mjs';
import {compileAuthoredGraph}
 from '../source/ai/r125-v4d-authored-topology.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
import {MATERIALS} from '../source/ai/b143-building-dsl.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const fail=s=>{throw Error('R125_V4D_ENCLOSURE_REVIEW_'+s)};
const palette={stone:'#b8bfc3',concrete:'#d7d1c9',metal:'#788fa4',
 glass:'#73d3e6',wood:'#c0a276',glow:'#ffd788',accent:'#d2a68b'};
function projection(results){
 const out=['<svg xmlns="http://www.w3.org/2000/svg" width="1248" height="550" viewBox="0 0 1248 550">',
  '<rect width="1248" height="550" fill="#102338"/>',
  '<text x="20" y="30" fill="white" font-family="sans-serif" font-size="20">ACTUAL final B143 — enclosed roofs, framed civic entries and shaded public courts</text>',
  '<text x="20" y="51" fill="#adc4d6" font-family="sans-serif" font-size="12">3 synthetic authors, same architectural engine; SOURCE only; human ART pending; no real model or Minecraft world</text>'];
 const sc=3.12;
 for(const [i,r] of results.entries()){
  const ox=17+i*414,z0=107,highest=new Map();
  out.push('<rect x="'+(ox-6)+'" y="70" width="408" height="457" rx="7" fill="#22394b"/>',
   '<text x="'+ox+'" y="94" fill="#fff" font-family="sans-serif" font-size="14">'+
   ['SERIAL / connected public spaces','STAR / publicly branching hub','LOOP / real multiple route doors'][i]+'</text>');
  for(const [x,y,z,m] of r.compiled.primitives){
   const k=x+','+z,old=highest.get(k);
   if(!old||y>old.y)highest.set(k,{x,y,z,m});
  }
  for(const a of highest.values()){
   const x=ox+a.x*sc,y=z0+a.z*sc;
   if(x+sc>ox+402||y+sc>524)fail('TOP_CLIP');
   out.push('<rect x="'+x+'" y="'+y+'" width="'+sc+'" height="'+sc+
    '" fill="'+(palette[MATERIALS[a.m]]||'#efb')+'"/>');
  }
 }
 out.push('</svg>');return out.join('\n');
}
export function exportEnvelopeIntegrationReview(folder){
 if(typeof folder!=='string'||!path.isAbsolute(folder)||
  fs.existsSync(folder)||!fs.existsSync(path.dirname(folder)))
  fail('OUTPUT_PATH');
 const inputs=makeV4DEnvelopeIntegrationFixtures();
 const prior=inputs.map(v=>compileAuthoredGraph(v.plan));
 const after=inputs.map(v=>compileEnvelopeIntegrity(v.plan,v.envelope));
 if(after.some(v=>v.worldWrites!==0||v.readiness!=='NOT_PREPARED'||
  v.architecturalArt!=='NOT_REVIEWED'))fail('SAFETY');
 const template=fs.readFileSync(path.join(ROOT,'source/ai/b143-viewer-template.html'),'utf8');
 const payload=compileB143Gallery(after.map(v=>v.design));
 const html=renderB143Html(payload,template);
 const report={
  schema:'r125-v4d-enclosure-three-graph-integration-true-b143-source-v1',
  syntheticAuthorCases:3,newRealQwenOrGemmaCalls:0,artCertifiedCount:0,
  originalArt:'REJECT_3_OF_3',candidateArt:'NOT_REVIEWED',
  designs:after.map((v,i)=>({
   id:v.design.id,
   beforeSourceSha256:prior[i].sourceSha256,
   beforeGeometrySha256:prior[i].geometrySha256,
   afterSourceSha256:v.sourceSha256,
   afterGeometrySha256:v.geometrySha256,
   beforeVoxels:prior[i].compiled.primitives.length,
   afterVoxels:v.compiled.primitives.length,
   sourceProof:v.sourceProof,
   routeStatus:v.sourceRoutes.status,
   authorGraphIRUnchanged:true,syntheticOnly:true
  })),
  safety:{readiness:'NOT_PREPARED',constructionApproved:false,
   executionAllowed:false,BuildPlan:{operations:[]},gates:Array(9).fill('BLOCKED'),
   worldContacts:0,worldWrites:0,minecraftWalking:'NOT_TESTED',
   realModelGeneration:'NOT_ATTESTED'}
 };
 fs.mkdirSync(folder);
 fs.writeFileSync(path.join(folder,'index.html'),html,{flag:'wx'});
 fs.writeFileSync(path.join(folder,'ACTUAL_B143_ENCLOSED_THREE_GRAPH_TOP.svg'),
  projection(after),{flag:'wx'});
 fs.writeFileSync(path.join(folder,'ENCLOSURE_SOURCE_EVIDENCE.json'),
  JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 return report;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const a=process.argv.slice(2);
  if(a.length!==2||a[0]!=='--out')fail('ARGS');
  console.log(JSON.stringify(exportEnvelopeIntegrationReview(path.resolve(a[1])),null,2));
 }catch(e){console.error('R125_V4D_ENCLOSURE_REVIEW_HOLD',String(e));process.exitCode=2;}
}
