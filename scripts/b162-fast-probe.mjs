/**
 * B162 rapid no-dependency gate: unlike the full B143→B162 site pipeline,
 * this validates ONLY the genuinely revised skyport and geometry. It lets a
 * draft PR detect route regressions before every historical site is rebuilt.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {planAdaptiveSkybridge,DEFAULT_ROUTE} from '../source/ai/b161-adaptive-skybridge.mjs';
import {reviewSkyportRevision,REVISIONS} from '../source/ai/b162-revision-replan.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const d=JSON.parse(fs.readFileSync(
 path.join(ROOT,'designs/ai/interiors/doppler-switchback-terminal-r0.json'),'utf8'));
const prior=planAdaptiveSkybridge(d,DEFAULT_ROUTE);
if(prior.report.final2x2FlatMoves!==101||
 prior.report.constructionApproved!==false)throw Error('B162_FAST_PARENT_ROUTE_REGRESSION');
const updated=reviewSkyportRevision(d,prior,REVISIONS.alpha);
const p=updated.report;
console.log('B162_FAST_DIAGNOSTICS',JSON.stringify({originalMoves:p.originalMoves,revisedMoves:p.revisedMoves,oldPathObstructedCells:p.oldRouteObstructedAnchors,newPathObstructedCells:p.newRouteObstructedAnchors,turns:updated.rebuilt.report.centerlineTurns,corridors:updated.rebuilt.report.corridorSegments,finishStatus:updated.rebuilt.finalRoute.targets[0].status,worldContacts:p.worldContacts,constructionApproved:p.constructionApproved,gates:p.gates,operations:p.BuildPlan.operations}));
if(p.originalMoves!==101||p.revisedMoves!==113||
 p.oldRouteObstructedAnchors<=0||p.newRouteObstructedAnchors!==0||
 updated.rebuilt.report.centerlineTurns!==4||
 updated.rebuilt.report.corridorSegments!==5||
 updated.rebuilt.finalRoute.targets[0].status!=='PASS_FLAT_FOOTPRINT_GEOMETRY'||
 p.worldContacts!==0||p.constructionApproved!==false||
 p.gates.length!==9||!p.gates.every(g=>g==='BLOCKED')||
 p.BuildPlan.operations.length!==0)throw Error('B162_FAST_REVISED_ROUTE_OR_SAFETY_HOLD');
const evidence={
 schema:'minecraftaibuilder-b162-rapid-gate-v1',status:'PASS',
 sourceSha256:p.originalSourceSha256,
 revisedSourceSha256:p.revisedSourceSha256,
 revisionReviewSha256:p.sha256,
 originalMoves:p.originalMoves,revisedMoves:p.revisedMoves,
 oldPathObstructedCells:p.oldRouteObstructedAnchors,
 newPathObstructedCells:p.newRouteObstructedAnchors,
 revisedTurns:updated.rebuilt.report.centerlineTurns,
 constructionApproved:false,readiness:'NOT_PREPARED',
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},worldWrites:0
};
fs.mkdirSync(path.join(ROOT,'b162-fast-evidence'),{recursive:true});
fs.writeFileSync(path.join(ROOT,'b162-fast-evidence/B162_FAST_GATE.json'),
 JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify(evidence));
