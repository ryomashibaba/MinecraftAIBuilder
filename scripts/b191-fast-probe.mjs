import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {buildB191,verifyB191Report} from '../source/ai/b191-route-compare.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {candidates,chosen,report}=buildB191();
if(!verifyB191Report(report))throw Error('B191_SOURCE_ONLY_ROUTE_REPORT_HOLD');
const data={report,candidates,comparisonPolicy:'source-only shortest-with-turn-and-actual-floor penalty',
 sourceModelGeometryNotChanged:true};
fs.mkdirSync(path.join(root,'b191-evidence'),{recursive:true});
fs.writeFileSync(path.join(root,'b191-evidence/B191_TWO_ROUTE_COMPARISON.json'),
 JSON.stringify(data,null,2)+'\n');
console.log('B191_SOURCE_ROUTE_COMPARISON',JSON.stringify({
 mainCells:report.mainCells,annexCells:report.annexCells,
 comparedLevels:report.sourceComparedLevels,
 preferredLevel:chosen.standingY,
 routes:candidates.map(c=>({y:c.standingY,
  steps:c.metrics.sourceSteps,turns:c.metrics.turns,
  newFloorCells:c.newFloorCells,nearbyBlockedSourcePositions:c.metrics.minimalSideClearanceBodyNeighbours,
  evaluatedScore:c.metrics.sourceScore,routeDigest:c.sourcePathSha256})),
 previousHeldLevels:report.reviewRejectedLevels,
 sourceModelCount:2,worldWrites:0,constructionApproved:false,
 readiness:'NOT_PREPARED'}));
