import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createOrbitalCrown,verifyOrbitalCrown,orbitalCrownElements}
 from '../source/ai/b164-orbital-crown.mjs';
import {readDesigns} from './build-b143-site.mjs';
import {readRevisionRequests} from './build-b144-site.mjs';
import {readContinuations} from './build-b145-site.mjs';
import {readStructuralRequests} from './build-b146-site.mjs';
import {readRepairRequest} from './build-b147-site.mjs';
import {readInteriorDesign} from './build-b149-site.mjs';
import {readUpperDesign} from './build-b150-site.mjs';
import {readWideDesign} from './build-b151-site.mjs';
import {readLoopDesign} from './build-b152-site.mjs';
import {readSkyDesign} from './build-b153-site.mjs';
import {readBypassDesign} from './build-b154-site.mjs';
import {readInterchangeR0,readInterchangeR1} from './build-b155-site.mjs';
import {readHeliosR0} from './build-b158-site.mjs';
import {readPolarisR0} from './build-b159-site.mjs';
import {readDopplerR0} from './build-b160-site.mjs';
import {makeB164Bundle,renderB164Html} from './build-b164-site.mjs';
test('major architectural additions compile as real geometry, preserving the exact previously approved 2x2 route shape',()=>{
 const model=readDopplerR0(),source=JSON.stringify(model);
 const c=createOrbitalCrown(model),p=c.report;
 assert.equal(JSON.stringify(model),source);
 assert.equal(orbitalCrownElements().length,43);
 assert.equal(c.finished.elements.length,c.monumental.variant.finished.elements.length+43);
 assert.equal(p.distinctNewCells,13133);
 assert.equal(p.maxHeight,52);
 assert.equal(p.minimumNewHeight>=21,true);
 assert.equal(p.changedAtOrBelowBodyHeight,0);
 assert.equal(p.newMezzanineCount,2);
 assert.equal(p.visuallyDistinctRoofCount,2);
 assert.equal(p.newHaloCount,1);
 assert.equal(p.newFacadeFinCount,8);
 assert.equal(p.flatMoves,127);
 assert.equal(c.route.targets[0].status,'PASS_FLAT_FOOTPRINT_GEOMETRY');
 assert.deepEqual(c.route.targets[0].path,
  c.monumental.variant.finalRoute.targets[0].path);
 assert.notEqual(c.compiled.sourceSha256,c.monumental.variant.finalScene.sourceSha256);
 assert.notEqual(c.compiled.geometrySha256,c.monumental.variant.finalScene.geometrySha256);
 assert.equal(c.compiled.BuildPlan.operations.length,0);
 assert.equal(p.worldContacts,0);
 assert.equal(p.constructionApproved,false);
 assert(p.gates.every(g=>g==='BLOCKED'));
 assert(verifyOrbitalCrown(model,p));
});
test('forged structural approvals and world permission cannot pass evidence replay',()=>{
 const model=readDopplerR0(),p=createOrbitalCrown(model).report;
 const tampered=structuredClone(p);
 tampered.structuralStrengthCertified=true;
 assert.equal(verifyOrbitalCrown(model,tampered),false);
 tampered.structuralStrengthCertified=false;
 tampered.BuildPlan.operations.push({command:'invalid'});
 assert.equal(verifyOrbitalCrown(model,tampered),false);
 assert.throws(()=>createOrbitalCrown({...model,designOnly:false}),
  /B143_SCHEMA_OR_MODE/);
});
test('34-scene orbital architecture page preserves all previous monuments and entire no-construction lineage',()=>{
 const args=[readDesigns(),readRevisionRequests(),readContinuations(),
  readStructuralRequests(),readRepairRequest(),readInteriorDesign(),
  readUpperDesign(),readWideDesign(),readLoopDesign(),readSkyDesign(),
  readBypassDesign(),readInterchangeR0(),readInterchangeR1(),
  readHeliosR0(),readPolarisR0(),readDopplerR0()];
 const frozen=JSON.stringify(args),bundle=makeB164Bundle(...args);
 assert.equal(JSON.stringify(args),frozen);
 assert.equal(bundle.gallery.scenes.length,34);
 assert.equal(bundle.gallery.scenes[32].id,'doppler-corridor-portfolio-monumental');
 assert.equal(bundle.gallery.scenes[33].id,'doppler-monumental-orbital-crown');
 assert.equal(new Set(bundle.gallery.scenes.map(s=>s.id)).size,34);
 assert.equal(bundle.gallery.safety.minecraftWrites,0);
 assert.deepEqual(bundle.gallery.safety.BuildPlan.operations,[]);
 const template=fs.readFileSync(new URL('../source/ai/b143-viewer-template.html',import.meta.url),'utf8');
 const html=renderB164Html(bundle,template);
 for(const part of ['id="b164-route"','id="b164-status"',
  'index=33;select.value="33";setScene()','NOT_PREPARED','13,133'])
  assert(html.includes(part),'Expected '+part);
 assert(!html.includes('fetch('));
});
