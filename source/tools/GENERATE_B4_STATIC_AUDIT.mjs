// Source-only API review, never touches running processes.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {auditSourceDirectory} from '../runner/step8b-compatibility.mjs';
import {PINNED_PATHS} from '../runner/step8b-runtime-b4.mjs';
const sha=v=>createHash('sha256').update(v).digest('hex');
try{
 const [snapshotDir,dest]=process.argv.slice(2);
 if(!snapshotDir||!dest)throw Error('Usage: node tools/GENERATE_B4_STATIC_AUDIT.mjs <extracted_source_dir> <NEW_report.json>');
 const audit=auditSourceDirectory(snapshotDir);
 if(audit.sourceManifestSha256!=='34ef239cd1d6e59c7d36fb070bd305e7572d944dee949c0648312ec94090534c'||audit.sourceFilesVerified!==249)throw Error('SOURCE_PIN_MISMATCH');
 const files=PINNED_PATHS.map(p=>({path:p,sha256:sha(fs.readFileSync(path.join(snapshotDir,p)))}));
 const pkg=JSON.parse(fs.readFileSync(path.join(snapshotDir,'package.json'),'utf8'));
 const general=fs.readFileSync(path.join(snapshotDir,'bridge/src/general-building.js'),'utf8');
 const server=fs.readFileSync(path.join(snapshotDir,'bridge/src/server-step7j.js'),'utf8');
 const planner=fs.readFileSync(path.join(snapshotDir,'engine/src/general-building-planner.js'),'utf8');
 const out={schema:'minecraftaibuilder-step8b-b4-static-source-audit-v1',
  status:'STATIC_SOURCE_API_REVIEW_ONLY',sourceFilesVerified:audit.sourceFilesVerified,
  snapshotManifestSha256:audit.sourceManifestSha256,criticalFiles:files,
  bridgeEntrypoint:pkg.scripts?.bridge==='node bridge/src/server-step7j.js'?'bridge/src/server-step7j.js':'UNRESOLVED',
  staticAPISignals:{planBuilding:general.includes('route === "/plan/building"')&&server.includes('"/plan/building"')?'SOURCE_PRESENT_DO_NOT_CALL':'UNKNOWN',
   buildBuilding:general.includes('route !== "/build/building"')&&server.includes('"/build/building"')?'SOURCE_PRESENT_DO_NOT_CALL':'UNKNOWN',
   createBuildingPlan:planner.includes('export const createBuildingPlan =')?'SOURCE_PRESENT_DO_NOT_INVOKE':'UNKNOWN'},
  activeWindowsProcess:'NOT_OBSERVED',networkAPI:'NOT_CONTACTED',runtimeIdentity:'NOT_PROVEN',
  deploymentGate:'BLOCKED',BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0},
  safety:{constructionApproved:false,executionAllowed:false,noWorldMutation:true,noBridge:true,noScan:true,noPackGeneration:true}};
 fs.writeFileSync(dest,JSON.stringify(out,null,2)+'\n',{flag:'wx'});
 console.log('B4_STATIC_SOURCE_AUDIT_ONLY',out.sourceFilesVerified,out.runtimeIdentity);
}catch(e){console.error('B4_STATIC_AUDIT_BLOCKED',e.message);process.exitCode=1;}
