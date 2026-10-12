// The only output is two new evidence-derived JSONs in a fresh directory.
// CLI: node tools/RUN_B43_B5_OFFLINE.mjs <snapshot-dir> <B4.json> <B42.json|NONE> <new-empty-output-dir>
import fs from 'node:fs';import path from 'node:path';
import {evaluateEvidenceDelta} from '../runner/step8b-evidence-b43.mjs';
import {evaluateBuildReadiness} from '../runner/step8b-readiness-b5.mjs';
try{
 const [snapshot,baseline,newer,output]=process.argv.slice(2);
 if(process.argv.length!==6||![snapshot,baseline,newer,output].every(Boolean))throw Error('USAGE: snapshot baselineB4 B42-or-NONE output-new-dir');
 const abs=path.resolve(output);
 if(fs.existsSync(abs))throw Error('EXISTING_OUTPUT_REFUSED');
 for(const source of [snapshot,baseline,...(newer==='NONE'?[]:[newer])]){
  const loc=fs.realpathSync(source);if(loc===abs||abs.startsWith(loc+path.sep)||loc.startsWith(abs+path.sep))throw Error('OUTPUT_OVERLAPS_INPUT');
 }
 const decode=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
 const delta=evaluateEvidenceDelta(snapshot,decode(baseline),newer==='NONE'?null:decode(newer));
 const root=path.resolve(import.meta.dirname,'..');
 const geometry=Object.fromEntries(['hotel','apartment','office'].map(k=>[k,decode(path.join(root,'reports',k.toUpperCase()+'_STATIC_B3.json'))]));
 const api=decode(path.join(root,'reports','STEP8B_B4_STATIC_API_AUDIT.json'));
 const readiness=evaluateBuildReadiness(geometry,api,delta);
 fs.mkdirSync(abs,{recursive:false,mode:0o700});
 fs.writeFileSync(path.join(abs,'B43_EVIDENCE_DELTA.json'),JSON.stringify(delta,null,2)+'\n',{flag:'wx',mode:0o600});
 fs.writeFileSync(path.join(abs,'B5_READINESS_GATES.json'),JSON.stringify(readiness,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log('B43_B5_OFFLINE_REPORT_PASS',delta.comparison.runtimeEvidenceLevel,'gatesBlocked='+readiness.gates.filter(g=>g.state==='BLOCKED').length,'NOT_PREPARED');
}catch(e){console.error('B43_B5_BLOCKED',e.code||'ERR',e.message);process.exitCode=1;}
