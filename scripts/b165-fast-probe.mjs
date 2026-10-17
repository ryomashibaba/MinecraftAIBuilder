/**
 * B165 compact offline proof — compile full detailed 3D model and check
 * two independently occupied 2x2 stair tread sequences and untouched 127 route.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createOrbitalInteriors,verifyOrbitalInteriors}
 from '../source/ai/b165-orbital-interiors.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const d=JSON.parse(fs.readFileSync(path.join(ROOT,
 'designs/ai/interiors/doppler-switchback-terminal-r0.json'),'utf8'));
const r=createOrbitalInteriors(d),p=r.report;
if(!verifyOrbitalInteriors(d,p)||p.interiorFlights!==2||
 p.changedCellsOnOriginalRoute!==0||p.newSolidCells<500||
 p.newAuthoringElements<30||p.constructionApproved!==false||
 p.gates.length!==9||!p.gates.every(v=>v==='BLOCKED')||
 p.BuildPlan.operations.length!==0)
 throw Error('B165_GEOMETRY_OR_WORLD_GATES');
const evidence={
 schema:'minecraftaibuilder-b165-interior-proof-v1',
 sourceSha256:p.sourceDesignSha256,
 finalSha256:p.finalDesignSha256,
 finalGeometrySha256:p.finalGeometrySha256,
 stairFlightCount:p.interiorFlights,
 treads:p.treadProofs.map(f=>({wing:f.id,rise:f.rise,checks:f.checks})),
 newArchitectureElements:p.newAuthoringElements,
 newlySolidCells:p.newSolidCells,removedSolidCells:p.removedSolidCells,
 modifiedLowCells:p.sourceChangeCellsAtOrBelowBody,
 originalCorridorConflicts:p.changedCellsOnOriginalRoute,
 inherited127Moves:r.lower.targets[0].steps,
 physicalStairTraversalCertified:false,
 playerCollisionCertified:false,
 structuralStrengthCertified:false,constructionApproved:false,
 worldWrites:0,readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]}
};
fs.mkdirSync(path.join(ROOT,'b165-fast-evidence'),{recursive:true});
fs.writeFileSync(path.join(ROOT,'b165-fast-evidence/B165_INTERIOR_PROOF.json'),
 JSON.stringify(evidence,null,2)+'\n');
console.log('B165_REAL_INTERIOR_PROOF',JSON.stringify(evidence));
