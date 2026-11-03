/** V4C true B143 gallery + one vector top-view sheet, SOURCE only. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {compileVoidMassingV4C} from '../source/ai/r125-void-massing-v4c.mjs';
import {MATERIALS} from '../source/ai/b143-building-dsl.mjs';
import {STRUCTURE_IDS,makeStructurePlan} from './r125-v4c-structural-fixtures.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const fail=s=>{throw Error('R125_V4C_REVIEW_'+s)};
const palette={stone:'#a9b8c4',concrete:'#e0e8eb',metal:'#647b8b',
 glass:'#3fd0d4',wood:'#ae8b65',glow:'#e3ce77',accent:'#d5a45b'};
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;');
export function sourceTopViewSvg(products){
 if(!Array.isArray(products)||products.length!==3||
  products.some((r,i)=>r.authorIR?.id!=='study-'+STRUCTURE_IDS[i]||
   r.worldWrites!==0||r.architecturalArt!=='NOT_REVIEWED'))
  fail('PROVENANCE');
 const w=1272,h=455,scale=5,parts=[
  '<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'">',
  '<rect width="'+w+'" height="'+h+'" fill="#0b1a28"/>',
  '<text x="16" y="28" font-family="system-ui" font-size="19" font-weight="700" fill="#f0f4f8">V4C / ACTUAL B143 — THREE DISTINCT TEST TOPOLOGIES</text>',
  '<text x="16" y="48" font-family="system-ui" font-size="12" fill="#acc3d1">SOURCE projection only / not Qwen inference / not human ART certification / zero world writes</text>'
 ];
 for(const [i,r] of products.entries()){
  const baseX=12+i*420,baseY=65;
  parts.push('<rect x="'+baseX+'" y="'+baseY+'" width="409" height="380" rx="5" fill="#193046"/>',
   '<text x="'+(baseX+14)+'" y="'+(baseY+23)+'" font-family="system-ui" font-size="15" fill="#ecf2f5">'+
   (i+1)+'. '+esc(STRUCTURE_IDS[i].toUpperCase())+'</text>',
   '<text x="'+(baseX+14)+'" y="'+(baseY+42)+'" font-family="system-ui" font-size="11" fill="#a9c0cc">COURT '+
   r.sourceProof.fullHeightCourtyardInteriorCells+' m²-equiv / PLAZA '+
   r.sourceProof.supportedPublicForecourtCells+' m²-equiv (blocks²)</text>');
  const visible=new Map();
  for(const p of r.compiled.primitives){
   const [x,y,z,mat]=p,k=x+','+z,old=visible.get(k);
   if(!old||y>old.y)visible.set(k,{x,y,z,mat});
  }
  for(const p of visible.values()){
   const x=baseX+15+p.x*scale,y=baseY+60+p.z*scale,
    c=palette[MATERIALS[p.mat]]??'#d7a2af';
   if(x+scale>baseX+409||y+scale>baseY+380)fail('PROJECTION_OUTSIDE');
   parts.push('<rect x="'+x+'" y="'+y+'" width="'+scale+'" height="'+scale+'" fill="'+c+'"/>');
  }
 }
 parts.push('</svg>');
 return parts.join('\n');
}
export function createV4CReview({outDir}={}){
 if(typeof outDir!=='string'||!path.isAbsolute(outDir)||
  fs.existsSync(outDir)||!fs.existsSync(path.dirname(outDir)))fail('OUTPUT_PATH');
 const plans=STRUCTURE_IDS.map((id,i)=>{
  const p=makeStructurePlan(i);
  if(p.id!=='study-'+id||!p.title.startsWith('SYNTHETIC'))fail('FIXTURE_ID');
  return p;
 });
 const signatures=plans.map(p=>p.links.map(l=>
  l.from+'>'+l.to+':'+l.side).join('|'));
 if(new Set(signatures).size!==3)fail('NO_TOPOLOGY_VARIETY');
 const products=plans.map(p=>compileVoidMassingV4C(p));
 if(new Set(products.map(p=>p.geometrySha256)).size!==3||
  products.some(p=>p.sourceRoutes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
   p.worldWrites!==0||p.constructionApproved!==false||
   p.architecturalArt!=='NOT_REVIEWED'||p.authorIsRealModel!=='NOT_ATTESTED'))
  fail('SOURCE_PROVENANCE');
 const gallery=compileB143Gallery(products.map(p=>p.design));
 const template=fs.readFileSync(path.join(ROOT,'source/ai/b143-viewer-template.html'),'utf8');
 const html=renderB143Html(gallery,template);
 const svg=sourceTopViewSvg(products);
 const report={schema:'r125-v4c-synthetic-source-review-v1',
  status:'SOURCE_ONLY_ART_HOLD',sourceReadyCount:3,modelCalls:0,
  realQwenDesignCount:0,verifiedIndependentModelDesignCount:0,
  syntheticTopologyCount:new Set(signatures).size,
  artisticSuccesses:0,humanArt:'NOT_REVIEWED',
  cases:products.map((r,i)=>({id:STRUCTURE_IDS[i],
   geometrySha256:r.geometrySha256,sourceSha256:r.sourceSha256,
   actualOpenSkyCourtInteriorCells:r.sourceProof.fullHeightCourtyardInteriorCells,
   supportedForecourtCells:r.sourceProof.supportedPublicForecourtCells,
   routeStatus:r.sourceRoutes.status,linkTopology:signatures[i],
   provenance:'SUPPLIED_TEST_FIXTURE_NOT_REAL_QWEN'})),
  constructionApproved:false,readiness:'NOT_PREPARED',
  BuildPlan:{operations:[]},gates:Array(9).fill('BLOCKED'),
  minecraftWalking:'NOT_TESTED',worldContacts:0,worldWrites:0};
 fs.mkdirSync(outDir);
 fs.writeFileSync(path.join(outDir,'index.html'),html,{flag:'wx'});
 fs.writeFileSync(path.join(outDir,'SOURCE_TOP_VIEWS.svg'),svg,{flag:'wx'});
 fs.writeFileSync(path.join(outDir,'V4C_SOURCE_REVIEW.json'),
  JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 return report;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2);
  if(args.length!==2||args[0]!=='--out')fail('ARGS');
  console.log(JSON.stringify(createV4CReview({outDir:path.resolve(args[1])}),null,2));
 }catch(e){console.error('R125_V4C_REVIEW_HOLD',String(e?.message??e));process.exitCode=2}
}
