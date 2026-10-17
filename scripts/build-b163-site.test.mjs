import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PROFILES,createCorridorPortfolio,verifyCorridorPortfolio} from '../source/ai/b163-corridor-portfolio.mjs';
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
import {makeB163Bundle,renderB163Html} from './build-b163-site.mjs';
test('three independently generated DSL skybridges reveal real width-distance-volume tradeoffs',()=>{
 const base=readDopplerR0(),before=JSON.stringify(base);
 const b=createCorridorPortfolio(base),p=b.report;
 assert.equal(JSON.stringify(base),before);
 assert.equal(PROFILES.length,3);
 assert.equal(p.optionCount,3);
 assert.deepEqual(p.options.map(x=>x.corridorDesignWidth),[2,4,8]);
 assert.deepEqual(p.options.map(x=>x.flatMoves),[101,101,127]);
 assert.deepEqual(p.options.map(x=>x.directionChanges),[3,3,3]);
 assert.deepEqual(p.options.map(x=>x.actuallyOccupiedCellsAdded),[825,1212,2318]);
 assert.deepEqual(p.paretoIncludingCorridorWidth,['compact','balanced','monumental']);
 assert.equal(p.bestFor.fewestFlatMoves,'compact');
 assert.equal(p.bestFor.fewestAddedSolids,'compact');
 assert.equal(p.bestFor.maximumDesignWidth,'monumental');
 for(const option of b.candidates){
  const route=option.variant.finalRoute;
  assert.equal(route.targets[0].status,'PASS_FLAT_FOOTPRINT_GEOMETRY');
  assert(route.targets[0].path.every(a=>a[1]===19));
  assert.equal(option.variant.source.sourceSha256,b.source.sourceSha256);
  assert.equal(option.variant.finalScene.designOnly,true);
  assert.equal(option.variant.finalScene.worldContacts,0);
  assert.deepEqual(option.variant.finalScene.BuildPlan.operations,[]);
  assert.equal(option.metrics.playerCollisionCertified,false);
  assert.equal(option.metrics.structuralStrengthCertified,false);
 }
 assert.equal(new Set(b.candidates.map(x=>x.variant.finalScene.sourceSha256)).size,3);
 assert.equal(p.constructionApproved,false);
 assert.equal(p.readiness,'NOT_PREPARED');
 assert.equal(p.worldContacts,0);
 assert(p.gates.every(x=>x==='BLOCKED'));
 assert.deepEqual(p.BuildPlan.operations,[]);
 assert(verifyCorridorPortfolio(base,p));
});
test('invalid or forged investment/safety claim is rejected, never converted to world operations',()=>{
 const d=readDopplerR0(),b=createCorridorPortfolio(d),falseReport=structuredClone(b.report);
 falseReport.constructionApproved=true;
 assert(!verifyCorridorPortfolio(d,falseReport));
 falseReport.constructionApproved=false;
 falseReport.options[1].actuallyOccupiedCellsAdded=0;
 assert(!verifyCorridorPortfolio(d,falseReport));
 assert.throws(()=>createCorridorPortfolio({...d,designOnly:false}),/B143_SCHEMA_OR_MODE/);
});
test('33-model portfolio viewer retains B141–B162 and includes a real parameter comparison table',()=>{
 const inputs=[readDesigns(),readRevisionRequests(),readContinuations(),
  readStructuralRequests(),readRepairRequest(),readInteriorDesign(),
  readUpperDesign(),readWideDesign(),readLoopDesign(),readSkyDesign(),
  readBypassDesign(),readInterchangeR0(),readInterchangeR1(),
  readHeliosR0(),readPolarisR0(),readDopplerR0()];
 const snapshot=JSON.stringify(inputs);
 const b=makeB163Bundle(...inputs);
 assert.equal(JSON.stringify(inputs),snapshot);
 assert.equal(b.gallery.scenes.length,33);
 assert.deepEqual(b.gallery.scenes.slice(30).map(x=>x.id),[
  'doppler-corridor-portfolio-compact','doppler-corridor-portfolio-balanced',
  'doppler-corridor-portfolio-monumental']);
 assert.equal(new Set(b.gallery.scenes.map(x=>x.id)).size,33);
 assert.equal(b.gallery.safety.minecraftWrites,0);
 assert.deepEqual(b.gallery.safety.BuildPlan.operations,[]);
 const template=fs.readFileSync(new URL('../source/ai/b143-viewer-template.html',import.meta.url),'utf8');
 const html=renderB163Html(b,template);
 for(const expected of ['id="b163-route"','id="b163-status"',
  'index=32;select.value="32";setScene()','NOT_PREPARED',
  'COMPACT','BALANCED','MONUMENTAL'])
  assert(html.includes(expected),'Missing '+expected);
 assert(!html.includes('fetch('));
});
