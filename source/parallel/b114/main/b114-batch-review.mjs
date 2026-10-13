/** Single pinned reference parent, all independent non-executable B114 report outputs. */
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assembleReferenceParent} from '../../b113/main/b113-reference-parent.mjs';
import {buildB113,validateB113} from '../../b113/main/compile-b113.mjs';
import {buildB114,validateB114,writeB114} from './compile-b114.mjs';
import {auditB114Stack,writeB114Stack} from './b114-stack-3d-audit.mjs';
import {inspectHouse,writeHouse} from './b114-house-v3-integrated.mjs';
import {buildHouseUnified3D,validateHouseUnified3D,writeUnified} from './b114-house-unified-3d.mjs';
import {auditHouseArchitecture,writeArchitecture} from './b114-house-architecture.mjs';

export async function writeB114ReviewBatch(output){
 const start=Date.now();
 const parent=await assembleReferenceParent();
 const b113=buildB113(parent);
 if(!validateB113(b113))throw Error('B114_BATCH_SOURCE_B113_INVALID');
 const b114=buildB114(parent,b113);
 if(!validateB114(b114))throw Error('B114_BATCH_SOURCE_B114_INVALID');
 const b114Files=writeB114(b114,output);
 const stack=auditB114Stack(b114);
 const stackFiles=writeB114Stack(stack,output);
 const house=inspectHouse(parent,b113,b114);
 const houseFiles=writeHouse(house,output);
 const unified=buildHouseUnified3D(parent,b113,b114,house);
 if(!validateHouseUnified3D(unified))throw Error('B114_BATCH_UNIFIED_INVALID');
 const unifiedFiles=writeUnified(unified,output);
 const architectural=auditHouseArchitecture(parent,b113,b114,house,unified);
 if(architectural.worldContacts!==0||architectural.constructionApproved!==false||
  architectural.executionAllowed!==false||architectural.gates.length!==9||
  architectural.gates.some(g=>g.status!=='BLOCKED'))
  throw Error('B114_BATCH_ARCHITECTURAL_REPORT_UNSAFE');
 const architecturalFiles=writeArchitecture(architectural,output);
 return {batch:'ONE_REFERENCE_PARENT_FOR_FIVE_REPORTS',
  sourceIntegrity:b114.integritySha256,buildings:b114.totals.buildings,
  elapsedMs:Date.now()-start,
  houseThreeDimensionalTotals:unified.totals,
  architecturalTotals:architectural.totals,
  reports:[b114Files,stackFiles,houseFiles,unifiedFiles,architecturalFiles],
  readiness:'NOT_PREPARED',constructionApproved:false,worldContacts:0,commandCount:0};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 console.log(JSON.stringify(await writeB114ReviewBatch(path.resolve('b114-review-output')),null,2));
}