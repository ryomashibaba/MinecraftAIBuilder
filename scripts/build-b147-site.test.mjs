import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SCHEMA,compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {diagnoseDetached,verifyDiagnosis} from '../source/ai/b147-detachment-diagnosis.mjs';
import {readDesigns} from './build-b143-site.mjs';
import {readRevisionRequests} from './build-b144-site.mjs';
import {readContinuations} from './build-b145-site.mjs';
import {readStructuralRequests} from './build-b146-site.mjs';
import {readRepairRequest,makeB147Bundle,renderB147Html} from './build-b147-site.mjs';

const original=readDesigns(),r2=readRevisionRequests(),r3=readContinuations(),r4=readStructuralRequests(),repair=readRepairRequest();
const before=JSON.stringify({original,r2,r3,r4});
const box=(id,origin,size)=>({id,shape:'box',mode:'add',material:'metal',origin,size});
const example=()=>({schema:SCHEMA,id:'test-pavilion',title:'独立した屋根',brief:'構造検査用',
  bounds:{width:30,height:30,depth:30},designOnly:true,
  elements:[box('foundation',[2,0,2],[8,5,8]),box('floating-roof',[2,9,2],[8,2,8])]});
test('generic exact voxel diagnosis finds disjoint region, bounding box and nearest conceptual bridge',()=>{
 const d=example(),scene=compileDesign(d);
 const diagnosis=diagnoseDetached(scene);
 assert.equal(diagnosis.detachedComponentCount,1);
 assert.equal(diagnosis.detachedCellCount,128);
 assert.deepEqual(diagnosis.components[0].bounds,{min:[2,9,2],max:[9,10,9]});
 assert.equal(diagnosis.components[0].nearestBasalConnectedWitness.manhattanDistance,5);
 assert.equal(diagnosis.physicalStructuralProof,false);
 assert.equal(diagnosis.constructionApproved,false);
 assert.equal(verifyDiagnosis(scene,diagnosis),true);
 const forged=structuredClone(diagnosis);forged.detachedCellCount=0;
 assert.equal(verifyDiagnosis(scene,forged),false);
});
test('explicit geometric support reconnects a deliberately floating element',()=>{
 const d=example(),unfixed=diagnoseDetached(compileDesign(d));
 d.elements.push(box('pillar',[4,4,4],[2,6,2]));
 const fixed=diagnoseDetached(compileDesign(d));
 assert.equal(unfixed.detachedComponentCount,1);
 assert.equal(fixed.detachedCellCount,0);
 assert.equal(fixed.detachedComponentCount,0);
 assert.equal(fixed.worldContacts,0);
});
test('ChatGPT source-pinned R5 repair fixes exactly the historic 390-cell canyon detached component',()=>{
 const result=makeB147Bundle(original,r2,r3,r4,repair);
 assert.equal(result.repairEvidence.beforeDetachedCells,390);
 assert.equal(result.repairEvidence.afterDetachedCells,0);
 assert.equal(result.repairEvidence.beforeDetachedGroups,1);
 assert.equal(result.repairEvidence.afterDetachedGroups,0);
 assert.equal(result.repairEvidence.witness.manhattanDistance,2);
 assert.deepEqual(result.repairEvidence.witness.conceptualMissingCells,[[24,47,57]]);
 assert.equal(result.gallery.scenes.length,9);
 assert.deepEqual(result.gallery.scenes[6].repairDiagnostics.components[0].bounds,{
  min:[24,48,57],max:[62,49,61]});
 assert.equal(result.gallery.scenes[6].repairDiagnostics.detachedPoints.length,390);
 assert.equal(result.gallery.scenes[8].repairDiagnostics.detachedPoints.length,0);
 assert.equal(JSON.stringify({original,r2,r3,r4}),before);
 assert.equal(result.gallery.safety.minecraftWrites,0);
 assert.equal(result.gallery.safety.original15BuildingSafetyGates,'9 BLOCKED');
 assert(result.repairEvidence.gates.every(g=>g==='BLOCKED'));
});
test('stale hash, extra commands, fake repairs and rejected user instructions never deploy',()=>{
 const stale=structuredClone(repair);stale.baseSourceSha256='0'.repeat(64);
 assert.throws(()=>makeB147Bundle(original,r2,r3,r4,stale),/B144_STALE_OR_FORGED_BASE/);
 const command=structuredClone(repair);command.worldCoordinates=[99,80,99];
 assert.throws(()=>makeB147Bundle(original,r2,r3,r4,command),/B144_PROPOSAL_FIELDS/);
 const ineffective=structuredClone(repair);
 ineffective.edits=ineffective.edits.filter(e=>e.action==='setTitle'||e.action==='setBrief');
 assert.throws(()=>makeB147Bundle(original,r2,r3,r4,ineffective),/B144_NOT_MEANINGFUL_GEOMETRY_CHANGE/);
});
test('B147 static viewer includes real R4 highlighted defect and independent fixed R5',()=>{
 const result=makeB147Bundle(original,r2,r3,r4,repair);
 const template=fs.readFileSync(new URL('../source/ai/b143-viewer-template.html',import.meta.url),'utf8');
 const html=renderB147Html(result,template);
 assert(html.includes('id="highlightDetached"')&&html.includes('diagnosticStatus'));
 assert(html.includes('b147Missing')&&html.includes('390セル'));
 assert(html.includes('canyon-data-sanctuary-r4')&&html.includes('canyon-data-sanctuary-r5'));
 assert(!html.includes('fetch(')&&!html.includes('__B143_GALLERY_JSON__'));
});
