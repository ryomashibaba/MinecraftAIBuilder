#!/usr/bin/env node
/** B63 read-only offline runner, frozen B62 input signature pin. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {compileB63,verifyB63} from './compile-b63.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const hash=b=>createHash('sha256').update(b).digest('hex');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'B62_FILE_SHA256.json')));
function read(file){
 const expected=manifest.baselineFiles[file]||manifest.addedFiles[file];
 if(!expected)throw Error('B63_UNPINNED_SOURCE_'+file);
 const p=path.join(root,file),st=fs.lstatSync(p);
 if(!st.isFile()||st.isSymbolicLink())throw Error('B63_NOT_REGULAR');
 const data=fs.readFileSync(p);if(hash(data)!==expected)throw Error('B63_FROZEN_SOURCE_CHANGED');
 return JSON.parse(data);
}
export function buildB63FromSource(){
 const b62=read('parallel/b62/main/B62_RESERVATION_CONFLICT_REVIEW.json');
 const b18=read('reports/B18_M2_LOCAL_GEOMETRY.json');
 const b17=read('reports/B17_INTERIOR_INTEGRATION_IR.json');
 const report=compileB63(b62,b18,b17);
 verifyB63(report,b62,b18,b17);
 return {report,b62,b18,b17};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==2)throw Error('B63_READ_ONLY_NO_ARGS');
 const r=buildB63FromSource().report;
 console.log('B63_HYPOTHETICAL_WALL_REVIEW',JSON.stringify({alternatives:r.alternatives.map(a=>({id:a.id,cells:a.cellCount,profiles:a.wallModelProfiles.map(p=>({width:p.hypotheticalCenteredWidth,wallCollisionCells:p.modelWallCollisionCellCount,elevatorOverlapCells:p.nominalElevatorOverlapCells.length,stairOverlapCells:p.nominalStairOverlapCells.length}))})),
 ready:r.readiness,operations:r.BuildPlan.operations.length}));
}
