import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildInterlevelNetwork,verifyInterlevelNetwork}
 from '../source/ai/b166-interlevel-network.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const d=JSON.parse(fs.readFileSync(path.join(ROOT,
 'designs/ai/interiors/doppler-switchback-terminal-r0.json'),'utf8'));
const r=buildInterlevelNetwork(d),p=r.report;
if(!verifyInterlevelNetwork(d,p)||p.originalLowerMoves!==127||
 p.changedLowerRouteBodyCells!==0||p.stairGridPaths.length!==2||
 p.upperFlatPlatforms.length!==2||
 p.stairGridPaths.some(s=>s.netHeightGain!==7||s.maxRise>1)||
 p.upperFlatPlatforms.some(s=>s.flatMoves<8)||
 p.mixedFootprintWholeJourneyCertified!==false||
 p.physicalActorMovementCertified!==false||
 p.constructionApproved!==false||p.worldContacts!==0||
 p.gates.length!==9||!p.gates.every(v=>v==='BLOCKED')||
 p.BuildPlan.operations.length!==0)
 throw Error('B166_FAST_NETWORK_OR_WORLD_HOLD');
const ev={schema:'minecraftaibuilder-b166-fast-network-v1',
 sourceSha256:p.sourceSha256,finishedSha256:p.afterSourceSha256,
 geometrySha256:p.afterGeometrySha256,routeSha256:p.lowerRouteProofSha256,
 architecturalParts:p.addedElements,addedCells:p.newlyOccupiedCells,
 stairPaths:p.stairGridPaths.map(s=>({wing:s.wing,moves:s.horizontalSteps,rise:s.netHeightGain,
  maxRise:s.maxRise,visited:s.visitedNodes})),
 upperPlatforms:p.upperFlatPlatforms.map(s=>({wing:s.wing,moves:s.flatMoves,
  nodes:s.reachableAnchors,destination:s.destination})),
 physicalPlayerCertified:false,mixed2x2TraversalCertified:false,
 readiness:'NOT_PREPARED',worldWrites:0,constructionApproved:false,
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}};
fs.mkdirSync(path.join(ROOT,'b166-fast-evidence'),{recursive:true});
fs.writeFileSync(path.join(ROOT,'b166-fast-evidence/B166_NETWORK.json'),
 JSON.stringify(ev,null,2)+'\n');
console.log('B166_INTERLEVEL_NETWORK',JSON.stringify(ev));
