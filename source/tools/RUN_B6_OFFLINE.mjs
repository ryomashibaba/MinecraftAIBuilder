// Use separately extracted *exact* source snapshot and evidence JSON; writes only a brand-new output directory.
import fs from 'node:fs';
import path from 'node:path';
import {evaluateB6} from '../runner/step8b-static-planner-b6.mjs';
import {renderB6Dashboard} from '../runner/step8b-dashboard-b6.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
try {
 const [snapshot,oldFile,newFile,out]=process.argv.slice(2);
 if(process.argv.length!==6||![snapshot,oldFile,newFile,out].every(Boolean))throw Error('USAGE: snapshot-dir b4-evidence.json b42-evidence.json fresh-output-dir');
 const target=path.resolve(out);
 if(fs.existsSync(target))throw Error('OUTPUT_MUST_NOT_EXIST');
 for(const p of [snapshot,oldFile,newFile]){
  const s=fs.realpathSync(p);if(target===s||target.startsWith(s+path.sep)||s.startsWith(target+path.sep))throw Error('OUTPUT_INPUT_OVERLAP');
 }
 const root=path.resolve(import.meta.dirname,'..');
 const reports=Object.fromEntries(['hotel','apartment','office'].map(x=>[x,read(path.join(root,'reports',x.toUpperCase()+'_STATIC_B3.json'))]));
 const report=evaluateB6({snapshotDir:snapshot,geometryReports:reports,
  apiAudit:read(path.join(root,'reports','STEP8B_B4_STATIC_API_AUDIT.json')),
  oldCapture:read(oldFile),newCapture:read(newFile)});
 const html=renderB6Dashboard(report);
 fs.mkdirSync(target,{recursive:false,mode:0o700});
 fs.writeFileSync(path.join(target,'B6_STATIC_PREFLIGHT.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 fs.writeFileSync(path.join(target,'B6_REVIEW_DASHBOARD.html'),html,{flag:'wx',mode:0o600});
 console.log('B6_OFFLINE_PASS',JSON.stringify({matrix:report.matrix.casesVerified,rejected:report.matrix.hotelEntranceRejectedCases,candidates:report.candidates.length,risks:report.risks.length,gate:report.deploymentGate,construction:report.BuildPlan.status}));
}catch(error){console.error('B6_OFFLINE_BLOCKED',error.code||'ERROR',error.message);process.exitCode=1;}
