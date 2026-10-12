#!/usr/bin/env node
/** Offline only; freeze-verified inputs; stdout is a review summary, never build ops. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {compileB62,verifyB62} from './compile-b62.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const sha=b=>createHash('sha256').update(b).digest('hex');
const pinned=JSON.parse(fs.readFileSync(path.join(root,'B61_FILE_SHA256.json'),'utf8'));
function read(f){
 const expected=pinned.baselineFiles[f]||pinned.addedFiles[f];
 if(!expected)throw Error('B62_UNPINNED_SOURCE');
 const p=path.join(root,f),st=fs.lstatSync(p);if(!st.isFile()||st.isSymbolicLink())throw Error('B62_INVALID_SOURCE_FILE');
 const bytes=fs.readFileSync(p);if(sha(bytes)!==expected)throw Error('B62_FROZEN_SOURCE_HASH');
 return JSON.parse(bytes.toString('utf8'));
}
export function buildB62FromSource(){
 const b61=read('parallel/b61/main/B61_LOCAL_CONNECTOR_CONTRACT.json');
 const b57=read('parallel/b57/main/B57_ENVELOPE_TOPOLOGY.json');
 const b14=read('reports/B14_INPUT_CONTRACT_REPORT.json');
 const b17=read('reports/B17_INTERIOR_INTEGRATION_IR.json');
 const guard=read('reports/B43_GUARDED_LAYOUT_ASSEMBLY.json');
 const report=compileB62(b61,guard,b57,b14,b17);
 verifyB62(report,b61,guard,b57,b14,b17);
 return {report,b61,guard,b57,b14,b17};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==2)throw Error('B62_READONLY_NO_ARGS');
 const r=buildB62FromSource().report;
 console.log('B62_OFFLINE_REVIEW',JSON.stringify({b61ShaftCollision:r.findings.b61ThreeCellProposalCollidesWithElevatorReservation,
  alternatives:r.alternatives.map(a=>({id:a.id,newCells:a.minimumAddedCells,elevatorCollisions:a.reservationCollisions.elevator.length,stairCollisions:a.reservationCollisions.stair.length})),
  approved:false,readiness:r.readiness,constructionOps:r.BuildPlan.operations.length}));
}
