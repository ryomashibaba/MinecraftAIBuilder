/** B168 isolated, fail-closed, offline fractional collision experiment. */
import fs from 'node:fs';import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runCollisionLab,verifyCollisionLab} from '../source/ai/b168-fractional-collision-lab.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const original=JSON.parse(fs.readFileSync(path.join(root,
 'designs/ai/interiors/doppler-switchback-terminal-r0.json'),'utf8'));
const result=runCollisionLab(original),p=result.report;
if(!verifyCollisionLab(original,p)||
 p.fixtureResults.map(x=>x.reachable).join()!=='true,false,false,false'||
 p.actualStairs.length!==2||
 p.actualMinecraftCollisionCertified!==false||
 p.exactMovementPhysicsCertified!==false||
 p.minecraftHalfBlockShapesLoaded!==false||
 p.originalB166ModelUnchanged!==true||
 p.constructionApproved!==false||p.worldContacts!==0||
 p.gates.length!==9||!p.gates.every(x=>x==='BLOCKED')||
 p.BuildPlan.operations.length!==0)
 throw Error('B168_COLLISION_MODEL_OR_WORLD_GATE');
const proof={schema:'minecraftaibuilder-b168-rapid-proof-v1',
 inheritedSourceSha256:p.sceneSha256,geometrySha256:p.geometrySha256,
 labSha256:p.sha256,fixtureResults:p.fixtureResults,actualStairs:p.actualStairs,
 gamePhysicsCertified:false,halfBlockShapesFromMinecraft:false,
 constructionApproved:false,worldWrites:0,readiness:'NOT_PREPARED',
 gates:p.gates,BuildPlan:{operations:[]}};
fs.mkdirSync(path.join(root,'b168-evidence'),{recursive:true});
fs.writeFileSync(path.join(root,'b168-evidence/B168_HALF_HEIGHT.json'),
 JSON.stringify(proof,null,2)+'\n');
console.log('B168_EXPERIMENT_RESULT',JSON.stringify(proof));
