#!/usr/bin/env node
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {buildB69FromSource} from '../../b69/main/run-b69.mjs';
import {compileB70,verifyB70} from './compile-b70.mjs';
export function buildB70FromSource(){
 const {report:b69,b65,b66,b68}=buildB69FromSource();
 const report=compileB70(b65,b66,b68,b69);
 verifyB70(report,b65,b66,b68,b69);
 return {report,b65,b66,b68,b69};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const argv=process.argv.slice(2);
 if(argv.length>2||argv.some(a=>!['--write','--json'].includes(a))||new Set(argv).size!==argv.length)throw Error('B70_USAGE');
 const {report}=buildB70FromSource();
 if(argv.includes('--write'))fs.writeFileSync(new URL('./B70_FLOOR_REGION_CANDIDATES.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
 console.log('B70_OFFLINE_FLOORS_PASS',JSON.stringify({floorCandidates:report.summary.floorCandidateCells,
  maskCells:report.summary.floorMaskCells,heldCells:report.summary.totalCellsHeld,
  offMask:report.summary.outOfMaskCorridorReservations,doorFloorIssues:report.summary.unresolvedDoorFloorSupports,
  productionSources:0,gatesBlocked:9,commands:0}));
 if(argv.includes('--json'))console.log(JSON.stringify(report.summary,null,2));
}
