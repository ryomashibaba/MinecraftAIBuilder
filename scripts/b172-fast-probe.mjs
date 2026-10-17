/**
 * B172 fast independent design/geometry compiler & no-world evidence.
 * Produces source-pinned proof and gallery-ready surface count.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {surfaceOnly} from './build-b143-site.mjs';
import {buildNebulaArk,verifyNebulaArk}
 from '../source/ai/b172-nebula-ark.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const r=buildNebulaArk(),p=r.report;
if(!verifyNebulaArk(p)||p.elementCount<75||
 p.totalVoxels<16000||p.majorArchitecture.monumentalDomeCount!==3||
 p.majorArchitecture.orbitalRings!==2||
 p.routeLower.flatMoves!==102||p.routeUpper.flatMoves!==98||
 p.constructionApproved!==false||p.worldWrites!==0||
 p.gates.length!==9||p.gates.some(x=>x!=='BLOCKED')||
 p.BuildPlan.operations.length!==0)
 throw Error('B172_ARCHITECTURE_OR_WORLD_GATE');
const surface=surfaceOnly(r.compiled);
const report={...p,surfaceCells:surface.length,
 status:'PASS_OFFLINE_MONUMENTAL_ARCHITECTURE',
 originalHistoricModelsModified:false,
 actualMinecraftConstructionCertified:false};
fs.mkdirSync(path.join(root,'b172-evidence'),{recursive:true});
fs.writeFileSync(path.join(root,'b172-evidence/B172_ARCHITECTURE_PROOF.json'),
 JSON.stringify(report,null,2)+'\n');
console.log('B172_ARCHITECTURE_PROOF',JSON.stringify({
 designId:report.modelId,elements:report.elementCount,
 voxels:report.totalVoxels,surfaceCells:report.surfaceCells,
 maxY:r.compiled.bounds.maxY,routeLower:report.routeLower.flatMoves,
 routeUpper:report.routeUpper.flatMoves,
 newGeometrySha256:report.geometrySha256,
 worldWrites:0,readiness:'NOT_PREPARED',gatesBlocked:9}));
