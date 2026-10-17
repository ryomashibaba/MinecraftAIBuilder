/**
 * B164 focused render-independent build gate: real 3D source compilation,
 * enough new geometry to materially change the architecture, zero low Y
 * obstructions, unchanged B163 monumental 2x2 route, zero Minecraft writes.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createOrbitalCrown,verifyOrbitalCrown} from '../source/ai/b164-orbital-crown.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const original=JSON.parse(fs.readFileSync(path.join(ROOT,
 'designs/ai/interiors/doppler-switchback-terminal-r0.json'),'utf8'));
const result=createOrbitalCrown(original),p=result.report;
if(!verifyOrbitalCrown(original,p)||
 p.flatMoves!==127||p.changedAtOrBelowBodyHeight!==0||
 p.maxHeight<50||p.minimumNewHeight<21||
 p.authoredArchitecturalElements<35||p.distinctNewCells<=1500||
 p.geometryOnly!==true||p.constructionApproved!==false||
 p.gates.length!==9||!p.gates.every(g=>g==='BLOCKED')||
 p.BuildPlan.operations.length!==0)
 throw Error('B164_MEGASTRUCTURE_OR_SAFETY_HOLD');
const evidence={
 schema:'minecraftaibuilder-b164-fast-architecture-v1',
 sourceBuildingSha256:p.sourceSha256,
 finishedDesignSha256:p.finishedSourceSha256,
 finishedGeometrySha256:p.finishedGeometrySha256,
 resultProofSha256:p.sha256,
 architecturalElements:p.authoredArchitecturalElements,
 new3DCells:p.distinctNewCells,heightReached:p.maxHeight,
 changedAtOrBelowPlayerBody:p.changedAtOrBelowBodyHeight,
 roofShells:p.visuallyDistinctRoofCount,skyDecks:p.newMezzanineCount,
 halo:p.newHaloCount,facadeFins:p.newFacadeFinCount,
 verified2x2RouteMoves:p.flatMoves,
 playerPhysicalCollisionCertified:false,
 structuralSafetyCertified:false,constructionApproved:false,
 readiness:'NOT_PREPARED',worldWrites:0,
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}};
fs.mkdirSync(path.join(ROOT,'b164-fast-evidence'),{recursive:true});
fs.writeFileSync(path.join(ROOT,'b164-fast-evidence/B164_ARCHITECTURE.json'),
 JSON.stringify(evidence,null,2)+'\n');
console.log('B164_ARCHITECTURE_RESULT',JSON.stringify(evidence));
