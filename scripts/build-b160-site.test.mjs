import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {planMultiturnSkybridge,verifyMultiturnSkybridge,DOPPLER_ROUTE} from '../source/ai/b160-multiturn-router.mjs';
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
import {readDopplerR0,makeB160Bundle,renderB160Html} from './build-b160-site.mjs';
test('genuine four-leg detour chooses only clear candidates and preserves source history',()=>{
 const d=readDopplerR0(),frozen=JSON.stringify(d);
 const r=planMultiturnSkybridge(d,DOPPLER_ROUTE);
 assert.equal(JSON.stringify(d),frozen);
 assert.equal(r.before.targets[0].status,'FOOTPRINT_UNREACHABLE');
 assert.equal(r.after.targets[0].status,'PASS_FLAT_FOOTPRINT_GEOMETRY');
 assert.equal(r.report.verifiedFlatMoves,117);
 assert(r.report.verifiedPathDirectionChanges>=3);
 assert.equal(r.report.floorSegments,4);
 assert.equal(r.report.finishingElements,16);
 assert(r.report.examinedCandidateCount>1);
 assert.equal(r.report.full2x2AfterFinish,true);
 assert.equal(r.report.preflightCheckedOriginalSolidCells,true);
 assert.equal(r.report.constructionApproved,false);
 assert.equal(r.report.structuralStrengthCertified,false);
 assert.equal(r.report.playerCollisionCertified,false);
 assert.equal(r.report.worldContacts,0);
 assert.deepEqual(r.report.BuildPlan.operations,[]);
 assert(r.report.gates.every(v=>v==='BLOCKED'));
 assert(r.after.targets[0].path.every(p=>p[1]===DOPPLER_ROUTE.start[1]));
 assert.equal(JSON.stringify(r.finished.elements.slice(0,d.elements.length)),JSON.stringify(d.elements));
 assert(verifyMultiturnSkybridge(d,DOPPLER_ROUTE,r.report));
});
test('parameter injection and forged physical approvals fail closed',()=>{
 const d=readDopplerR0(),p=DOPPLER_ROUTE;
 for(const invalid of [
  {...p,goal:[67,20,78]},
  {...p,corridorWidth:1},
  {...p,footprintWidth:0},
  {...p,maxCandidates:10000}
 ])assert.throws(()=>planMultiturnSkybridge(d,invalid),/B160_PARAMETERS/);
 assert.throws(()=>planMultiturnSkybridge({...d,designOnly:false},p),/B143_SCHEMA_OR_MODE/);
});
test('historical 25 models and two DOPPLER models produce a 27-scene design-only gallery',()=>{
 const inputs=[readDesigns(),readRevisionRequests(),readContinuations(),
  readStructuralRequests(),readRepairRequest(),readInteriorDesign(),
  readUpperDesign(),readWideDesign(),readLoopDesign(),readSkyDesign(),
  readBypassDesign(),readInterchangeR0(),readInterchangeR1(),
  readHeliosR0(),readPolarisR0(),readDopplerR0()];
 const previous=JSON.stringify(inputs);
 const result=makeB160Bundle(...inputs);
 assert.equal(JSON.stringify(inputs),previous);
 assert.equal(result.gallery.scenes.length,27);
 assert.equal(result.gallery.scenes[24].id,'polaris-orbital-switchyard-generated-bent');
 assert.equal(result.gallery.scenes[25].id,'doppler-switchback-terminal-r0');
 assert.equal(result.gallery.scenes[26].id,'doppler-switchback-terminal-generated-detour');
 assert.equal(result.result.report.verifiedFlatMoves,117);
 assert.equal(result.result.report.finishingElements,16);
 assert.equal(result.gallery.safety.minecraftWrites,0);
 assert.equal(result.gallery.safety.BuildPlan.operations.length,0);
 const template=fs.readFileSync(new URL('../source/ai/b143-viewer-template.html',import.meta.url),'utf8');
 const html=renderB160Html(result,template);
 for(const check of ['id="b160-status"','id="b160-route"',
  'index=26;select.value="26";setScene()','NOT_PREPARED'])
  assert(html.includes(check),'Missing '+check);
 assert(!html.includes('fetch('));
});
