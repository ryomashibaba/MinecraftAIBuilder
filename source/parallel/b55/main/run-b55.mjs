#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildB54FromSource} from '../../b54/main/run-b54.mjs';
import {inspectEvidenceRoot} from './intake-b55.mjs';
import {compileB55,verifyB55} from './compile-b55.mjs';
const DIR=path.dirname(fileURLToPath(import.meta.url));
export function buildB55FromSource(evidenceRoot=null){
 const {report:b54,b53,b52}=buildB54FromSource();
 const report=compileB55(b54,b53,b52,{snapshot:inspectEvidenceRoot(evidenceRoot)});
 verifyB55(report,b54,b53,b52);
 return {report,b54,b53,b52};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const a=process.argv.slice(2);
 const valid=(a.length===0)||(a.length===1&&a[0]==='--export')||(a.length===2&&a[0]==='--evidence');
 if(!valid)throw Error('B55_FLAGS_ALLOWED_DEFAULT_EXPORT_OR_EVIDENCE_DIRECTORY');
 const r=buildB55FromSource(a[0]==='--evidence'?a[1]:null).report;
 if(a[0]==='--export'){
  const out=path.join(DIR,'B55_PRODUCTION_SOURCE_GATE.json');
  fs.writeFileSync(out,JSON.stringify(r,null,2)+'\n',{flag:'wx'});
 }
 console.log('B55_SOURCE_GATE_PASS',JSON.stringify({snapshot:r.intake.snapshotStatus,
  pinned:r.intake.counts.PINNED_MATCH,missing:r.intake.counts.MISSING,
  verifiedSourceTracks:r.counts.sourceTracksPinned,unresolvedSourceTracks:r.counts.sourceTracksUnresolved,
  parity:r.productionFacadeParity,approval:r.decision,M4Blocked:r.blockers.M4Gates.length,operations:r.actualConstructionOperations}));
}
