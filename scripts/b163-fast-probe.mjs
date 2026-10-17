import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createCorridorPortfolio} from '../source/ai/b163-corridor-portfolio.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const design=JSON.parse(fs.readFileSync(
 path.join(ROOT,'designs/ai/interiors/doppler-switchback-terminal-r0.json'),'utf8'));
const portfolio=createCorridorPortfolio(design);
const p=portfolio.report;
if(p.optionCount!==3||p.options.some(x=>!x.verifiedFlatWholeBody||
 x.constructionApproved!==false||x.actuallyOccupiedCellsAdded<=0)||
 p.constructionApproved!==false||p.worldContacts!==0||
 p.gates.length!==9||!p.gates.every(g=>g==='BLOCKED')||
 p.BuildPlan.operations.length!==0)
 throw Error('B163_FAST_PORTFOLIO_FAIL_CLOSED');
const evidence={schema:'minecraftaibuilder-b163-fast-proof-v1',
 sourceSha256:p.sourceSha256,portfolioSha256:p.sha256,
 candidates:p.options,pareto:p.paretoByRouteAndSolids,bestFor:p.bestFor,
 worldWrites:0,constructionApproved:false,readiness:'NOT_PREPARED',
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}};
fs.mkdirSync(path.join(ROOT,'b163-fast-evidence'),{recursive:true});
fs.writeFileSync(path.join(ROOT,'b163-fast-evidence/B163_PORTFOLIO.json'),
 JSON.stringify(evidence,null,2)+'\n');
console.log('B163_PORTFOLIO_METRICS',JSON.stringify(p.options.map(x=>({
 width:x.corridorDesignWidth,moves:x.flatMoves,turns:x.directionChanges,
 added:x.actuallyOccupiedCellsAdded,finishing:x.finishingElements,
 source:x.finalSourceSha256.slice(0,12)}))));
console.log('B163_FAST_PASS',JSON.stringify({sha256:p.sha256,pareto:p.paretoByRouteAndSolids,bestFor:p.bestFor}));
