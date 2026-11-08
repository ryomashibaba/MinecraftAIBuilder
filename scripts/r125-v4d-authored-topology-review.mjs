/** Three source-authored architectural graphs visualized from actual B143. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {makeV4DTopologyFixtures} from './r125-v4d-authored-topology-fixtures.mjs';
import {compileAuthoredGraph} from '../source/ai/r125-v4d-authored-topology.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
import {MATERIALS} from '../source/ai/b143-building-dsl.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const fail=s=>{throw Error('R125_V4D_GRAPH_REVIEW_'+s)};
const color={stone:'#c6cdce',concrete:'#c8d7d9',metal:'#7894a6',
 glass:'#65d9ee',wood:'#c9ae81',glow:'#ffdb6a',accent:'#c8957e'};
function actualTop(results){
 const scale=3.2,parts=[
  '<svg xmlns="http://www.w3.org/2000/svg" width="1260" height="530" viewBox="0 0 1260 530">',
  '<rect width="1260" height="530" fill="#102336"/>',
  '<text x="20" y="30" fill="white" font-family="sans-serif" font-size="20">V4D genuine B143: THREE distinct authored spatial graphs</text>',
  '<text x="20" y="50" fill="#abc4d5" font-family="sans-serif" font-size="12">Synthetic source test cases; no real model completion / no Minecraft world writes / no ART certification</text>'
 ];
 for(const [i,r] of results.entries()){
  const x0=16+i*416,z0=106,cells=new Map();
  for(const [x,y,z,m] of r.compiled.primitives){
   const k=x+','+z,old=cells.get(k);
   if(!old||y>old.y)cells.set(k,{x,y,z,m});
  }
  parts.push('<rect x="'+(x0-7)+'" y="70" width="409" height="435" rx="9" fill="#20394c"/>',
   '<text x="'+x0+'" y="93" fill="#fff" font-family="sans-serif" font-size="14">'+
   ['SERIAL / one public sequence','STAR / branched public hub','LOOP / four genuine door portals'][i]+'</text>');
  for(const v of cells.values()){
   const x=x0+v.x*scale,z=z0+v.z*scale;
   if(x+scale>x0+401||z+scale>505)fail('TOP_VIEW_BOUNDS');
   parts.push('<rect x="'+x+'" y="'+z+'" width="'+scale+'" height="'+scale+
    '" fill="'+(color[MATERIALS[v.m]]||'#f66')+'"/>');
  }
 }
 parts.push('</svg>');return parts.join('\n');
}
export function exportV4DAuthoredGraphReview(folder){
 if(typeof folder!=='string'||!path.isAbsolute(folder)||
   fs.existsSync(folder)||!fs.existsSync(path.dirname(folder)))
  fail('OUTPUT_PATH');
 const originals=makeV4DTopologyFixtures(),
  results=originals.map(compileAuthoredGraph);
 const sig=new Set(results.map(r=>
  r.sourceProof.degreeSignature+'/'+r.sourceProof.cycleRank));
 if(sig.size!==3||results.some(r=>
  r.worldWrites!==0||r.architecturalArt!=='NOT_REVIEWED'||
  r.sourceRoutes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'))
  fail('DISALLOWED_SOURCE_PROMOTION');
 const template=fs.readFileSync(path.join(ROOT,'source/ai/b143-viewer-template.html'),'utf8');
 const html=renderB143Html(compileB143Gallery(results.map(r=>r.design)),template);
 const report={
  schema:'r125-v4d-real-b143-three-distinct-synthetic-graph-audit-v1',
  provenance:'THREE_DISTINCT_SYNTHETIC_AUTHOR_INPUTS',
  newRealQwenOrGemmaCalls:0,syntheticAuthorTestCases:3,
  geometryHashes:results.map(r=>r.geometrySha256),
  sourceHashes:results.map(r=>r.sourceSha256),
  finishedB143VoxelCounts:results.map(r=>r.compiled.primitives.length),
  sourceProofs:results.map(r=>r.sourceProof),
  routeStatuses:results.map(r=>r.sourceRoutes.status),
  topologySignatureCount:sig.size,
  explicitlyDifferentAuthoredTopology:true,
  modelGeneralization:'NOT_ATTESTED',
  independentHumanArt:'NOT_REVIEWED',actualMinecraftWalking:'NOT_TESTED',
  artCertifications:0,constructionApproved:false,executionAllowed:false,
  readiness:'NOT_PREPARED',BuildPlan:{operations:[]},
  gates:Array(9).fill('BLOCKED'),worldContacts:0,worldWrites:0
 };
 fs.mkdirSync(folder);
 fs.writeFileSync(path.join(folder,'index.html'),html,{flag:'wx'});
 fs.writeFileSync(path.join(folder,'ACTUAL_B143_THREE_GRAPH_TOP.svg'),
   actualTop(results),{flag:'wx'});
 fs.writeFileSync(path.join(folder,'THREE_GRAPH_SOURCE_REPORT.json'),
   JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 return report;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const arg=process.argv.slice(2);
  if(arg.length!==2||arg[0]!=='--out')fail('ARGS');
  console.log(JSON.stringify(exportV4DAuthoredGraphReview(path.resolve(arg[1])),null,2));
 }catch(e){console.error('R125_V4D_GRAPH_REVIEW_HOLD',String(e));process.exitCode=2;}
}
