/** R5 offline comparison CLI: saved responses only, never calls providers. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {compareR5SavedCaptures}
 from '../source/ai/b198zr5-model-comparison.mjs';
const error=x=>{throw Error('B198ZR5_CLI_'+x)};
const valid=new Set(['--case','--baseline','--r4','--baseline-receipt',
 '--r4-receipt','--baseline-human','--r4-human','--out']);
function jsonFile(file){
 const stat=fs.statSync(file);
 if(!stat.isFile()||stat.size<1||stat.size>100000)error('INVALID_JSON_FILE_SIZE');
 return JSON.parse(fs.readFileSync(file,'utf8'));
}
function sourceFile(file){
 const stat=fs.statSync(file);
 if(!stat.isFile()||stat.size<1||stat.size>120000)error('INVALID_SOURCE_FILE_SIZE');
 return fs.readFileSync(file,'utf8');
}
export function parseArgs(argv=[]){
 const vals={};
 for(let i=0;i<argv.length;i++){
  const name=argv[i],value=argv[++i];
  if(!valid.has(name)||Object.hasOwn(vals,name)||typeof value!=='string'||
   value.length===0||value.startsWith('--'))error('INVALID_FLAGS');
  vals[name]=value;
 }
 if(!vals['--baseline']||!vals['--out'])error('BASELINE_AND_OUTPUT_REQUIRED');
 if(vals['--r4-human']&&!vals['--r4'])error('HUMAN_WITHOUT_SOURCE');
 return {
  caseId:vals['--case']??'c01',
  baselinePath:path.resolve(vals['--baseline']),
  r4Path:vals['--r4']?path.resolve(vals['--r4']):null,
  baselineReceipt:vals['--baseline-receipt']?path.resolve(vals['--baseline-receipt']):null,
  r4Receipt:vals['--r4-receipt']?path.resolve(vals['--r4-receipt']):null,
  baselineHuman:vals['--baseline-human']?path.resolve(vals['--baseline-human']):null,
  r4Human:vals['--r4-human']?path.resolve(vals['--r4-human']):null,
  out:path.resolve(vals['--out'])
 };
}
export function runR5Comparison({
 caseId='c01',baselinePath,r4Path=null,
 baselineReceipt=null,r4Receipt=null,
 baselineHuman=null,r4Human=null,out
}={}){
 if(!baselinePath||!out)error('PATH_REQUIRED');
 if(fs.existsSync(out)||!fs.existsSync(path.dirname(out)))error('REFUSE_OVERWRITE');
 const report=compareR5SavedCaptures({
  caseId,baselineRaw:sourceFile(baselinePath),
  plannedRaw:r4Path===null?null:sourceFile(r4Path),
  baselineReceipt:baselineReceipt===null?null:jsonFile(baselineReceipt),
  plannedReceipt:r4Receipt===null?null:jsonFile(r4Receipt),
  baselineHuman:baselineHuman===null?null:jsonFile(baselineHuman),
  plannedHuman:r4Human===null?null:jsonFile(r4Human)
 });
 fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 return report;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const result=runR5Comparison(parseArgs(process.argv.slice(2)));
  console.log('B198ZR5_EVIDENCE_COMPARISON',JSON.stringify({
   status:result.status,caseId:result.caseId,
   baselineSourceStatus:result.baseline.status,
   plannedSourceStatus:result.planned.status,
   baselineRawSha256:result.baseline.originalRawSha256,
   r4RawSha256:result.planned.originalRawSha256,
   modelCalls:0,worldWrites:0,
   noClaimOfModelImprovement:true
  }));
  // Missing R4 is an intentionally incomplete HOLD report, not CI success.
  if(result.status.startsWith('HOLD_'))process.exitCode=2;
 }catch(e){
  console.error('B198ZR5_COMPARISON_HOLD',String(e?.message??e).slice(0,200));
  process.exitCode=1;
 }
}
