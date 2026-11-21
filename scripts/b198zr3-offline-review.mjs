/**
 * B198Z-R3 reusable OFFLINE functional design evaluator.
 * Usage:
 * node scripts/b198zr3-offline-review.mjs --design proposal.json
 *   --contract reviewer-contract.json [--out NEW-report.json]
 * Files are local design-only data; no AI, network, Minecraft or execution.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {evaluateFunctionalReviewContract}
 from '../source/ai/b198zr3-functional-review-contract.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const err=s=>{throw Error('B198ZR3_OFFLINE_'+s)};
export function parseArgs(argv=[]){
 const args={},allowed=new Set(['--design','--contract','--out']);
 for(let i=0;i<argv.length;i++){
  const key=argv[i],value=argv[++i];
  if(!allowed.has(key)||args[key]!==undefined||
   typeof value!=='string'||!value||value.startsWith('--'))err('BAD_ARGUMENT');
  args[key]=value;
 }
 if(!args['--design']||!args['--contract'])err('REQUIRED_DESIGN_AND_CONTRACT');
 return {designPath:path.resolve(args['--design']),
  contractPath:path.resolve(args['--contract']),
  outPath:args['--out']?path.resolve(args['--out']):null};
}
function readJson(filename){
 const info=fs.statSync(filename);
 if(!info.isFile()||info.size>200000||info.size<=0)err('FILE_NOT_ALLOWED');
 return JSON.parse(fs.readFileSync(filename,'utf8'));
}
export function runOfflineReview({designPath,contractPath,outPath=null}={}){
 if(!designPath||!contractPath)err('SOURCE_REQUIRED');
 if(outPath&&(fs.existsSync(outPath)||!fs.existsSync(path.dirname(outPath))))
  err('REFUSE_OUTPUT_OVERWRITE');
 const design=readJson(designPath),contract=readJson(contractPath);
 const compiled=compileDesign(design);
 const result=evaluateFunctionalReviewContract({design,compiled,contract});
 const report={...result,readiness:'NOT_PREPARED',
  sourceProvenanceNotIndependentlyAuthenticated:true,
  originalModelQualityProven:false,
  actualWorldBuildOrReadbackPerformed:false};
 if(outPath)fs.writeFileSync(outPath,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 return report;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const result=runOfflineReview(parseArgs(process.argv.slice(2)));
  console.log('B198ZR3_OFFLINE_FUNCTIONAL_REVIEW',JSON.stringify({
   status:result.status,caseId:result.caseId,
   sourceSha256:result.pinnedSourceSha256,
   destinationPass:result.results.destinations.filter(x=>x.passed).length,
   totalDestinations:result.results.destinations.length,
   zonePass:result.results.functionalZones.filter(x=>x.passed).length,
   totalZones:result.results.functionalZones.length,
   approved:false,worldWrites:0,modelCalls:0}));
  if(result.status!=='FORMAL_GEOMETRY_AND_ROUTE_CONSTRAINTS_PASS')
   process.exitCode=2;
 }catch(e){console.error('B198ZR3_REVIEW_HOLD',
  String(e?.message??e).slice(0,250));process.exitCode=1;}
}
