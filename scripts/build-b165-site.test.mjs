import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createOrbitalInteriors,verifyOrbitalInteriors,orbitalInteriorElements}
 from '../source/ai/b165-orbital-interiors.mjs';
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
import {makeB165Bundle,renderB165Html} from './build-b165-site.mjs';
test('two genuine terminal wings have 2x2 supported steps and 2-cell head clearance after recompile',()=>{
 const original=readDopplerR0(),frozen=JSON.stringify(original);
 const r=createOrbitalInteriors(original),p=r.report;
 assert.equal(JSON.stringify(original),frozen);
 assert.equal(orbitalInteriorElements().length,49);
 assert.equal(p.newAuthoringElements,49);
 assert.equal(p.newSolidCells,489);
 assert.equal(p.removedSolidCells,88);
 assert.equal(p.interiorFlights,2);
 assert.equal(p.changedCellsOnOriginalRoute,0);
 assert.equal(p.lowerFloorsY,19);
 assert.equal(p.upperFloorsY,26);
 for(const wing of p.treadProofs){
  assert.equal(wing.rise,7);
  assert.equal(wing.intermediateTreads,7);
  assert.equal(wing.checks.length,9);
  assert(wing.checks.every(s=>s.support2x2&&s.headroom2));
 }
 assert.equal(r.lower.targets[0].steps,127);
 assert.equal(r.lower.targets[0].status,'PASS_FLAT_FOOTPRINT_GEOMETRY');
 assert.deepEqual(r.lower.targets[0].path,r.parent.route.targets[0].path);
 assert.notEqual(r.compiled.geometrySha256,r.parent.compiled.geometrySha256);
 assert.equal(r.model.elements.length,r.parent.finished.elements.length+49);
 assert.equal(p.physicalStairTraversalCertified,false);
 assert.equal(p.connectedMezzanineTraversalCertified,false);
 assert.equal(p.structuralStrengthCertified,false);
 assert.equal(p.constructionApproved,false);
 assert.equal(p.worldContacts,0);
 assert.equal(p.BuildPlan.operations.length,0);
 assert(p.gates.every(x=>x==='BLOCKED'));
 assert(verifyOrbitalInteriors(original,p));
});
test('refuse forged Minecraft movement certificates or writing grants',()=>{
 const d=readDopplerR0(),proof=createOrbitalInteriors(d).report;
 const forged=structuredClone(proof);
 forged.physicalStairTraversalCertified=true;
 assert.equal(verifyOrbitalInteriors(d,forged),false);
 forged.physicalStairTraversalCertified=false;
 forged.BuildPlan.operations.push({op:'place'});
 assert.equal(verifyOrbitalInteriors(d,forged),false);
 assert.throws(()=>createOrbitalInteriors({...d,designOnly:false}),
  /B143_SCHEMA_OR_MODE/);
});
test('35 real 3D scenes retain all 34 old designs and expose distinct new interior gallery',()=>{
 const inputs=[readDesigns(),readRevisionRequests(),readContinuations(),
  readStructuralRequests(),readRepairRequest(),readInteriorDesign(),
  readUpperDesign(),readWideDesign(),readLoopDesign(),readSkyDesign(),
  readBypassDesign(),readInterchangeR0(),readInterchangeR1(),
  readHeliosR0(),readPolarisR0(),readDopplerR0()];
 const frozen=JSON.stringify(inputs),b=makeB165Bundle(...inputs);
 assert.equal(JSON.stringify(inputs),frozen);
 assert.equal(b.gallery.scenes.length,35);
 assert.equal(b.gallery.scenes[33].id,'doppler-monumental-orbital-crown');
 assert.equal(b.gallery.scenes[34].id,'doppler-orbital-crown-inhabited-interior');
 assert.equal(new Set(b.gallery.scenes.map(x=>x.id)).size,35);
 assert.equal(b.gallery.safety.minecraftWrites,0);
 assert.deepEqual(b.gallery.safety.BuildPlan.operations,[]);
 const tmpl=fs.readFileSync(new URL('../source/ai/b143-viewer-template.html',import.meta.url),'utf8');
 const html=renderB165Html(b,tmpl);
 for(const token of ['id="b165-route"','id="b165-status"',
  'index=34;select.value="34";setScene()','NOT_PREPARED',
  '489','88','127']){
  assert(html.includes(token),'Missing '+token);
 }
 assert(!html.includes('fetch('));
});
