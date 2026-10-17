import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {buildB190,verifyB190Report} from '../source/ai/b190-source-gateway.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {gateway,report}=buildB190();
if(!verifyB190Report(report))throw Error('B190_SOURCE_GATE_INVALID');
fs.mkdirSync(path.join(root,'b190-evidence'),{recursive:true});
fs.writeFileSync(path.join(root,'b190-evidence/B190_OFFLINE_GATEWAY_PROOF.json'),
 JSON.stringify({report,gateway},null,2)+'\n');
console.log('B190_OFFLINE_GATEWAY_PROOF',JSON.stringify({
 sourceMainModelCells:report.mainOccupiedCells,
 sourceAnnexModelCells:report.annexOccupiedCells,
 reviewOnlyOffset:gateway.offset,
 overlapCells:gateway.modelToModelOccupiedCellCollisionCount,
 2wideSupportedStations:report.candidateGatewaySourceStations,
 proposedIndependentBridgeSlabCells:report.candidateGatewayNewFloorCells,
 historicalMainNetworkNodes:report.original21SupportedMainPublicWaypoints,
 oldAnnexPublicMoves:report.originalAnnex190TwoWideMoves,
 worldCoordinates:null,worldWrites:0,readiness:'NOT_PREPARED'}));
