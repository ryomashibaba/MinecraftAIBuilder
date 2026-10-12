#!/usr/bin/env node
/** B69 runner; source hashes verified by upstream frozen loaders. No CLI source is loaded. */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {buildB66FromSource} from '../../b66/main/run-b66.mjs';
import {buildB68FromSource} from '../../b68/main/run-b68.mjs';
import {compileB69,verifyB69} from './compile-b69.mjs';
export function buildB69FromSource(){
 const {report:b66,b65}=buildB66FromSource();
 const {report:b68,inventory}=buildB68FromSource();
 if(inventory.count.found!==0)throw Error('B69_EXPECTED_MISSING_SOURCE_CONTRACT');
 const report=compileB69(b65,b66,b68);verifyB69(report,b65,b66,b68);
 return {report,b65,b66,b68};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const argv=process.argv.slice(2);if(argv.length>2||argv.some(a=>a!=='--write'&&a!=='--json')||new Set(argv).size!==argv.length)throw Error('B69_USAGE');
 const {report}=buildB69FromSource();
 if(argv.includes('--write'))fs.writeFileSync(new URL('./B69_LOCAL_VOXEL_SHELL.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
 console.log('B69_LOCAL_SHELL_PASS',JSON.stringify({sections:report.summary.sections,
  nominalWalls:report.summary.nominalWallBoundaries,solidSlots:report.summary.solidVoxelPreviewSlots,
  doorOpeningSlots:report.summary.emptyDoorPreviewSlots,stairsGenerated:0,sourceFiles:0,gatesBlocked:9,commands:0}));
 if(argv.includes('--json'))console.log(JSON.stringify({summary:report.summary,integration:report.integration,claims:report.claims},null,2));
}
