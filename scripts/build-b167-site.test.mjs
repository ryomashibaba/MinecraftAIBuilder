import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {auditUnifiedJourneys,verifyUnifiedJourneys} from '../source/ai/b167-unified-journey.mjs';
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
import {makeB167Bundle,renderB167Html} from './build-b167-site.mjs';
test('north and south each have one non-teleporting 1x1 journey from shared lower terminal to upper destination',()=>{
 const source=readDopplerR0(),before=JSON.stringify(source);
 const result=auditUnifiedJourneys(source),r=result.report;
 assert.equal(JSON.stringify(source),before);
 assert.deepEqual(r.fullyUnifiedWings,['north','south']);
 assert.deepEqual(r.missingLowerAccessWings,[]);
 assert.deepEqual(r.wingRoutes.map(x=>x.lower1x1Moves),[11,142]);
 assert.deepEqual(r.wingRoutes.map(x=>x.stair1x1Moves),[15,15]);
 assert.deepEqual(r.wingRoutes.map(x=>x.upper2x2Moves),[48,71]);
 assert.deepEqual(r.wingRoutes.map(x=>x.full1x1Moves),[74,228]);
 for(const r0 of r.wingRoutes){
  assert.equal(r0.exactSame1x1FootprintEveryStep,true);
  assert.equal(r0.full1x1Path.length,r0.full1x1Moves+1);
  assert.deepEqual(r0.full1x1Path.at(0),r.lowerSourceStart);
  assert.deepEqual(r0.full1x1Path.at(-1),r0.upperDestination);
  for(let i=1;i<r0.full1x1Path.length;i++){
   const a=r0.full1x1Path[i-1],b=r0.full1x1Path[i];
   assert.equal(Math.abs(a[0]-b[0])+Math.abs(a[2]-b[2]),1);
   assert(Math.abs(a[1]-b[1])<=1);
  }
  assert.equal(r0.MinecraftEntityPhysicsCertified,false);
  assert.equal(r0.fullJourney2x2Certified,false);
 }
 assert.equal(r.physicalActorMovementCertified,false);
 assert.equal(r.wholeJourney2x2Certified,false);
 assert.equal(r.worldContacts,0);
 assert.equal(r.constructionApproved,false);
 assert(r.gates.every(g=>g==='BLOCKED'));
 assert.deepEqual(r.BuildPlan.operations,[]);
 assert(verifyUnifiedJourneys(source,r));
});
test('fail closed on forged 2x2 journey / Minecraft physics / world construction',()=>{
 const source=readDopplerR0(),proof=auditUnifiedJourneys(source).report;
 const forged=structuredClone(proof);
 forged.actualMinecraftStepTransitionCertified=true;
 assert(!verifyUnifiedJourneys(source,forged));
 forged.actualMinecraftStepTransitionCertified=false;
 forged.wingRoutes[0].fullJourney2x2Certified=true;
 assert(!verifyUnifiedJourneys(source,forged));
 forged.wingRoutes[0].fullJourney2x2Certified=false;
 forged.BuildPlan.operations.push({type:'place-block'});
 assert(!verifyUnifiedJourneys(source,forged));
 assert.throws(()=>auditUnifiedJourneys({...source,designOnly:false}),
  /B143_SCHEMA_OR_MODE/);
});
test('new static 36-scene comparison uses source-identical B166 architecture, not a fake 37th building',()=>{
 const args=[readDesigns(),readRevisionRequests(),readContinuations(),
  readStructuralRequests(),readRepairRequest(),readInteriorDesign(),readUpperDesign(),
  readWideDesign(),readLoopDesign(),readSkyDesign(),readBypassDesign(),
  readInterchangeR0(),readInterchangeR1(),readHeliosR0(),
  readPolarisR0(),readDopplerR0()];
 const frozen=JSON.stringify(args),b=makeB167Bundle(...args);
 assert.equal(JSON.stringify(args),frozen);
 assert.equal(b.gallery.scenes.length,36);
 assert.equal(b.gallery.scenes[35].id,'doppler-orbital-crown-navigation-network');
 assert.equal(b.old.gallery.geometryHashes.join(),b.gallery.geometryHashes.join());
 assert.equal(b.old.gallery.sourceHashes.join(),b.gallery.sourceHashes.join());
 assert.equal(b.gallery.safety.minecraftWrites,0);
 assert.deepEqual(b.gallery.safety.BuildPlan.operations,[]);
 const template=fs.readFileSync(new URL('../source/ai/b143-viewer-template.html',import.meta.url),'utf8');
 const html=renderB167Html(b,template);
 for(const marker of ['id="b167-route"','id="b167-status"',
  'index=35;select.value="35";setScene()','74移動','228移動',
  'NOT_PREPARED']){
  assert(html.includes(marker),'Missing '+marker);
 }
 assert(!html.includes('fetch('));
});
