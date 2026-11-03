/** Offline-only 5 synthetic V4B real B143 review; no private model originals. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {compileAuthoredSiteV4B}
 from '../source/ai/r125-site-composition-v4b.mjs';
import {SYNTHETIC_GENRES,makeSyntheticV4BSite}
 from './r125-site-composition-v4b-fixtures.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const fail=s=>{throw Error('R125_V4B_PREVIEW_'+s)};
export function createSyntheticV4BPreview({outDir}={}){
 if(typeof outDir!=='string'||!path.isAbsolute(outDir)||
  fs.existsSync(outDir)||!fs.existsSync(path.dirname(outDir)))fail('OUTPUT_PATH');
 const plans=SYNTHETIC_GENRES.map((name,i)=>{
  const p=makeSyntheticV4BSite(i);
  if(p.id!=='v4b-'+name||!p.title.startsWith('SYNTHETIC'))
   fail('SYNTHETIC_CASE_LABEL');
  return p;
 });
 const connectionTopologies=plans.map(p=>p.links.map(l=>
  l.from+'>'+l.to+':'+l.side).join('|'));
 const distinctConnectionTopologyCount=new Set(connectionTopologies).size;
 const results=plans.map(p=>compileAuthoredSiteV4B(p));
 if(results.length!==5||new Set(results.map(x=>x.geometrySha256)).size!==5||
  results.some(x=>x.sourceRoutes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
   x.worldWrites!==0||x.constructionApproved!==false||
   x.authorship!=='CALLER_SUPPLIED_AUTHOR_DATA_NOT_REAL_QWEN_VERIFIED'))
  fail('SOURCE_OR_PROVENANCE_HOLD');
 const gallery=compileB143Gallery(results.map(x=>x.design));
 const template=fs.readFileSync(path.join(ROOT,'source','ai','b143-viewer-template.html'),'utf8');
 const html=renderB143Html(gallery,template);
 const report={schema:'r125-v4b-five-synthetic-sites-offline-review-v1',
  status:'SYNTHETIC_SITE_SOURCE_ART_HOLD',modelCalls:0,
  modelAuthorship:'TEST_DOUBLE_NOT_REAL_MODEL',
  generationMethod:'AUTHOR_SUPPLIED_SYNTHETIC_IR_REAL_B143',
  actualQwenArchitectureCount:0,siteReadyCount:results.length,
  independentArchitecturalDesignsCertified:0,
  distinctConnectionTopologyCount,
  allGenresShareOneConnectionTopology:distinctConnectionTopologyCount===1,
  geometryHashDifferenceDoesNotProveSemanticDiversity:true,
  cases:results.map((r,i)=>({id:SYNTHETIC_GENRES[i],
   sourceSha256:r.sourceSha256,geometrySha256:r.geometrySha256,
   sourceRoutesStatus:r.sourceRoutes.status,
   massCount:r.sourceProof.massCount,
   verifiedCourtyardFloorAndSkyCells:r.sourceProof.skyCourtCells,
   verifiedArrivalFloorCells:r.sourceProof.supportedArrivalCells,
   humanArt:'NOT_REVIEWED'})),
  noncertifications:{humanArt:'NOT_REVIEWED',minecraft:'NOT_TESTED',
   outdoorTerrain:'NOT_TESTED'},
  readiness:'NOT_PREPARED',worldContacts:0,worldWrites:0,
  BuildPlan:{operations:[]},gates:Array(9).fill('BLOCKED')};
 fs.mkdirSync(outDir);
 fs.writeFileSync(path.join(outDir,'index.html'),html,{flag:'wx'});
 fs.writeFileSync(path.join(outDir,'V4B_SYNTHETIC_SOURCE_REPORT.json'),
  JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 return report;
}
export function parseArgs(argv){
 if(argv.length===1&&argv[0]==='--help')return {help:true};
 if(argv.length!==2||argv[0]!=='--out')fail('ARGS');
 return {outDir:path.resolve(argv[1])};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const args=parseArgs(process.argv.slice(2));
  if(args.help)console.log('node scripts/r125-site-composition-v4b-preview.mjs --out NEW_EMPTY_DIR');
  else console.log(JSON.stringify({
   ...createSyntheticV4BPreview(args),out:args.outDir},null,2));
 }catch(e){console.error('R125_V4B_PREVIEW_HOLD',String(e?.message??e));process.exitCode=2}
}
