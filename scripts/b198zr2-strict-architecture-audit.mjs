/** Independent R2 review: real B143 compiler + final-cell postconditions.
 * Includes negative adversarial examples, no user-world operations or model calls.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {compileDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {evaluateSpatialClaims} from '../source/ai/b198zr1-spatial-claims.mjs';
import {R2_FREEFORM_QUALITY_GUIDE} from '../source/ai/b198zr2-generic-quality-guide.mjs';
const source=path=>JSON.parse(fs.readFileSync(new URL(path,import.meta.url),'utf8'));
const before=source('../evidence/b198zr1/assistant-revised-library.json');
const d=source('../evidence/b198zr2/assistant-revised-library-r2.json');
const b=compileDesign(before),r=compileDesign(d);
assert(verifyCompiled(d,r)&&verifyCompiled(before,b),'official B143 integrity');
assert.equal(r.sourceSha256,'7e5b1885a398d5e98f1298915947bc66eae56d4ccf4b413274da780a3778c218');
assert.equal(r.stats.voxels,15312);
assert.equal(d.elements.length,156);
assert.equal(r.readiness,'NOT_PREPARED');
assert.equal(r.BuildPlan.operations.length,0);
assert.equal(r.worldContacts,0);
assert.equal(r.worldCoordinates,null);
const existing=new Map(before.elements.map(e=>[e.id,JSON.stringify(e)]));
let added=0,changed=0;
for(const x of d.elements){
 if(!existing.has(x.id))added++;
 else if(existing.get(x.id)!==JSON.stringify(x))changed++;
}
assert.equal(added,17);
assert.equal(changed,1,'only prior curved-roof geometry changed');
for(const id of ['base-platform','main-shell','central-void','sea-entry']){
 assert.equal(existing.get(id),JSON.stringify(d.elements.find(e=>e.id===id)),'preserved '+id);
}
const claims={
 protectedVoids:[{id:'atrium-protection',origin:[19,2,19],size:[11,36,11],maximumOccupied:0}],
 walkRoutes:[{id:'five-level-access-and-cantilevers',start:[24,2,45],
  headroom:2,maximumRise:1,maximumDrop:1,
  anchors:[2,10,18,26,34].flatMap(y=>
   [[16,y,13],[30,y,31],[24,y,32],[36,y,23]])
   .concat([[5,26,22],[42,18,24]])}]
};
const check=evaluateSpatialClaims({design:d,compiled:r,...claims});
assert(check.passed,'R2 actual final voids and routes');
assert.equal(check.routes[0].reached,22);
assert.equal(check.voids[0].occupied,0);
assert.equal(check.voids[0].volume,4356);
const filled=structuredClone(d);
filled.elements.push({id:'adversarial-refill',shape:'box',mode:'add',
 material:'metal',origin:[22,15,22],size:[3,4,3]});
const filledCompiled=compileDesign(filled);
const filledResult=evaluateSpatialClaims({design:filled,compiled:filledCompiled,...claims});
assert.equal(filledResult.voids[0].passed,false,'final ADD refills protected void: must HOLD');
assert.equal(filledResult.passed,false);
const fakeStairs={
 schema:d.schema,designOnly:true,id:'test-pillar-is-not-a-stair',
 title:'Negative disconnected upper floor example',
 brief:'Column misleadingly named staircase; no safe route to the upper floor',
 bounds:{width:16,height:16,depth:16},elements:[
  {id:'base',shape:'box',mode:'add',material:'stone',origin:[1,1,1],size:[14,1,14]},
  {id:'upper',shape:'box',mode:'add',material:'wood',origin:[1,7,1],size:[14,1,14]},
  {id:'staircore-cannot-walk',shape:'cylinder',mode:'add',material:'metal',
   origin:[9,2,9],axis:'y',radius:1,length:6}
 ]
};
const fakeCompiled=compileDesign(fakeStairs);
const fakeResult=evaluateSpatialClaims({design:fakeStairs,compiled:fakeCompiled,
 walkRoutes:[{id:'fake-stair-negative',start:[3,2,3],anchors:[[3,8,3]],
  headroom:2,maximumRise:1,maximumDrop:1}]});
assert.equal(fakeResult.passed,false,'vertical tube is not a real staircase');
assert(R2_FREEFORM_QUALITY_GUIDE.includes('not a staircase'));
assert(R2_FREEFORM_QUALITY_GUIDE.includes('FINAL geometry'));
const prior=new Set(b.primitives.map(p=>p.slice(0,3).join(',')));
const next=new Set(r.primitives.map(p=>p.slice(0,3).join(',')));
const additional=[...next].filter(x=>!prior.has(x)).length;
const deleted=[...prior].filter(x=>!next.has(x)).length;
console.log('B198ZR2_STRICT_ARCHITECTURE_AND_NEGATIVE_REGRESSIONS_PASS',JSON.stringify({
 sourceOnly:true,author:'ASSISTANT-AUTHORED_REVISION',
 sourceSha256:r.sourceSha256,geometrySha256:r.geometrySha256,
 oldOccupied:b.primitives.length,newOccupied:r.primitives.length,
 newCells:additional,removedCells:deleted,addedElements:added,changedOldElements:changed,
 protectedVoidEmpty:check.voids[0].volume,reachableAnchors:check.routes[0].reached,
 filledVoidNegativeCaught:true,fakeStairNegativeCaught:true,
 architectureVisualQuality:'HUMAN_REVIEW_REQUIRED',realMinecraftWalking:'NOT_TESTED',
 modelCalls:0,worldContacts:0,worldWrites:0,readiness:'NOT_PREPARED',
 constructionApproved:false,gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}
}));
