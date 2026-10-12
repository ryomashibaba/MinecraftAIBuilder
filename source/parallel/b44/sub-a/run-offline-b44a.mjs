#!/usr/bin/env node
/** Read pinned B43 source JSON; recompute offline study. Never overwrite a file. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {buildB44ASubA,verifyB44ASubA} from './circulation-b44a.mjs';
const sources={
 b43:['reports/B43_VERTICAL_CIRCULATION.json','f0939e578d1f01d4465ab78d3990652a7e889d3ee3d401c1d43f4610028fe19d'],
 assembly:['reports/B43_GUARDED_LAYOUT_ASSEMBLY.json','cf55ebdcd7dd6c14fed32d93e772a53e386bf42edb55dcdd266a5fe3ced36bc0'],
 b42:['reports/B42_MACRO_STAIR_MODULE.json','3a2a13a2676b67099260531778272a149766ee24c10e6b67bd37061cbdf1637e'],
 interior:['reports/B17_INTERIOR_INTEGRATION_IR.json','e04e8ca2789bd8b65548a10e98e940e9537a562ebbf38a63e456ac9b73fb425d'],
 walls:['reports/B21_BLOCKSCALE_REVIEW.json','2d7b1e3d71f252331dfe35e600411acc3354c43702e5b3db9fd9a5e0533932bc']};
const sha=b=>createHash('sha256').update(b).digest('hex');
const defaultSourceRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const err=c=>{throw new Error(`B44A_RUN_${c}`);};
export function readPinnedInputs(root=defaultSourceRoot){
 const obj={};
 for(const [k,[rel,digest]] of Object.entries(sources)){
  const file=path.join(root,rel);
  const stat=fs.lstatSync(file);if(!stat.isFile()||stat.isSymbolicLink())err('SOURCE_TYPE');
  const bytes=fs.readFileSync(file);if(sha(bytes)!==digest)err('BASELINE_SHA_MISMATCH');
  obj[k]=JSON.parse(bytes.toString('utf8'));
 }
 return obj;
}
export function generate(root=defaultSourceRoot){
 const inputs=readPinnedInputs(root);const report=buildB44ASubA(inputs);
 if(!verifyB44ASubA(report,inputs))err('REPORT_FAILED');
 return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 if(args.length%2!==0||args.some((v,i)=>i%2===0 && !['--source-root','--output'].includes(v)) || new Set(args.filter((v,i)=>i%2===0)).size!==args.length/2)err('ARGS');
 const opt=Object.fromEntries(Array.from({length:args.length/2},(_,i)=>[args[2*i],args[2*i+1]]));
 const root=path.resolve(opt['--source-root']??defaultSourceRoot),r=generate(root);
 if(opt['--output']){
  const out=path.resolve(opt['--output']);const relative=path.relative(root,out);
  if(!relative || (!relative.startsWith('..'+path.sep) && relative!=='..') || fs.existsSync(out))err('OUTPUT_MUST_BE_NEW_AND_OUTSIDE_BASELINE');
  fs.writeFileSync(out,JSON.stringify(r,null,2)+'\n',{flag:'wx',mode:0o644});
  console.log('B44A_OFFLINE_REPORT_WRITTEN',out,r.reportSha256);
 }else{
  console.log(JSON.stringify({status:'B44A_OFFLINE_PASS',reportSha256:r.reportSha256,
   variants:r.variants.map(v=>({id:v.id,metrics:v.metrics,constructionApproved:v.constructionApproved})),
   readiness:r.safety.readiness,buildOperations:r.safety.buildOperations},null,2));
 }
}
