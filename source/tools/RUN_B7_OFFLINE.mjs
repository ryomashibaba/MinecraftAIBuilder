// Reads verified source snapshot and prior reports. Output must not exist before execution.
import fs from 'node:fs';
import path from 'node:path';
import {buildB7Review} from '../runner/step8b-review-b7.mjs';
import {renderB7Dashboard} from '../runner/step8b-visual-b7.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
try{
 const [snapshot,output]=process.argv.slice(2);
 if(process.argv.length!==4||!snapshot||!output)throw Error('USAGE snapshot-directory new-output-directory');
 const dest=path.resolve(output);
 if(fs.existsSync(dest))throw Error('OUTPUT_ALREADY_EXISTS');
 const root=path.resolve(import.meta.dirname,'..');
 for(const input of [snapshot,root]){
  const real=fs.realpathSync(input);
  if(dest===real||dest.startsWith(real+path.sep)||real.startsWith(dest+path.sep))throw Error('INPUT_OUTPUT_OVERLAP');
 }
 const geometry=Object.fromEntries(['hotel','apartment','office'].map(x=>[x,read(path.join(root,'reports',x.toUpperCase()+'_STATIC_B3.json'))]));
 const result=buildB7Review({snapshotDir:snapshot,b3Reports:geometry,b6Report:read(path.join(root,'reports/B6_STATIC_PREFLIGHT.json'))});
 const html=renderB7Dashboard(result);
 fs.mkdirSync(dest,{recursive:false,mode:0o700});
 fs.writeFileSync(path.join(dest,'B7_RECONCILED_REVIEW.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
 fs.writeFileSync(path.join(dest,'B7_DUAL_LAYER_REVIEW.html'),html,{flag:'wx',mode:0o600});
 console.log('B7_NONEXECUTING_REVIEW_PASS',JSON.stringify({candidates:result.candidates.length,officeDriftCells:result.visualReconciliation.officeDriftCells,entranceFailures:result.entranceMatrix.rejected,gate:result.deploymentGate,buildPlan:result.BuildPlan.status}));
}catch(e){console.error('B7_REVIEW_BLOCKED',e.code||'ERROR',e.message);process.exitCode=1;}
