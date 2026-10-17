import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {surfaceOnly} from './build-b143-site.mjs';
import {buildQuadTier,verifyQuadTierReport} from '../source/ai/b179-quad-tier.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {compiled,report,bridges}=buildQuadTier();
if(!verifyQuadTierReport(report))throw Error('B179_UNSAFE_REPORT');
const output={...report,bridgeEvidence:bridges,
 real3dSurfaceCells:surfaceOnly(compiled).length};
fs.mkdirSync(path.join(root,'b179-evidence'),{recursive:true});
fs.writeFileSync(path.join(root,'b179-evidence/B179_ARCHITECTURE_PROOF.json'),
 JSON.stringify(output,null,2)+'\n');
console.log('B179_ARCHITECTURE_PROOF',JSON.stringify({
 voxels:report.voxels,added:report.addedUniqueVoxels,
 newParts:report.addonAuthoredElements,totalParts:report.authoredElements,
 surfaces:output.real3dSurfaceCells,modules:report.moduleCount,
 inspectedBridges:report.bridgeInterfacesChecked,clearBridges:report.bridgeInterfacesVerified,
 worldWrites:0,readiness:'NOT_PREPARED'}));
