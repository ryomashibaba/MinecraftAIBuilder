import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DEFAULT_ROUTE,planAdaptiveSkybridge} from '../source/ai/b161-adaptive-skybridge.mjs';
import {makeRevisedSkyport,REVISIONS,reviewSkyportRevision,verifySkyportRevision}
 from '../source/ai/b162-revision-replan.mjs';
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
import {makeB162Bundle,renderB162Html} from './build-b162-site.mjs';
test('real new blocker invalidates old route but recalculates independent viable R3',()=>{
 const source=readDopplerR0(),unchanged=JSON.stringify(source);
 const prior=planAdaptiveSkybridge(source,DEFAULT_ROUTE);
 const rebuilt=reviewSkyportRevision(source,prior,REVISIONS.alpha);
 const proof=rebuilt.report;
 assert.equal(JSON.stringify(source),unchanged);
 assert.equal(proof.originalMoves,101);
 assert.equal(proof.revisedMoves,113);
 assert(proof.oldRouteObstructedAnchors>0);
 assert.equal(proof.newRouteObstructedAnchors,0);
 assert.notDeepEqual(proof.previousWaypoints,proof.newWaypoints);
 assert.equal(rebuilt.rebuilt.report.centerlineTurns,4);
 assert.equal(rebuilt.rebuilt.report.corridorSegments,5);
 assert.equal(rebuilt.rebuilt.before.targets[0].status,'FOOTPRINT_UNREACHABLE');
 assert.equal(rebuilt.rebuilt.finalRoute.targets[0].status,'PASS_FLAT_FOOTPRINT_GEOMETRY');
 assert.equal(rebuilt.rebuilt.finalScene.id,'doppler-switchback-terminal-replanned-r3');
 assert.equal(rebuilt.rebuilt.report.constructionApproved,false);
 assert.equal(rebuilt.rebuilt.report.BuildPlan.operations.length,0);
 assert.equal(proof.playerCollisionCertified,false);
 assert.equal(proof.structuralStrengthCertified,false);
 assert(proof.gates.every(v=>v==='BLOCKED'));
 assert(verifySkyportRevision(source,prior,REVISIONS.alpha,proof));
});
test('two genuinely different revisions cause new path generation, and false revisions are refused',()=>{
 const source=readDopplerR0(),prior=planAdaptiveSkybridge(source,DEFAULT_ROUTE);
 const other=reviewSkyportRevision(source,prior,REVISIONS.beta);
 assert(other.report.oldRouteObstructedAnchors>0);
 assert.equal(other.report.newRouteObstructedAnchors,0);
 assert(other.report.revisedMoves>101);
 assert.notDeepEqual(other.report.newWaypoints,prior.report.dynamicWaypoints);
 assert.equal(other.report.constructionApproved,false);
 const invalid=structuredClone(other.report);
 invalid.constructionApproved=true;
 assert(!verifySkyportRevision(source,prior,REVISIONS.beta,invalid));
 assert.throws(()=>makeRevisedSkyport(source,{id:'../../',
  origin:[20,19,47],size:[12,20,15]}),/B162_REVISION_INPUT/);
 assert.throws(()=>makeRevisedSkyport(source,{id:'bad',origin:[80,19,80],
  size:[20,25,25]}),/B162_REVISION_INPUT/);
 assert.throws(()=>reviewSkyportRevision(source,prior,
  {id:'far',origin:[3,19,50],size:[2,10,4]}),
  /B162_OLD_PATH_NOT_AFFECTED/);
});
test('B162 30-scene gallery preserves B141-B161 source lineage and renders old/new status',()=>{
 const inputs=[readDesigns(),readRevisionRequests(),readContinuations(),
  readStructuralRequests(),readRepairRequest(),readInteriorDesign(),
  readUpperDesign(),readWideDesign(),readLoopDesign(),readSkyDesign(),
  readBypassDesign(),readInterchangeR0(),readInterchangeR1(),
  readHeliosR0(),readPolarisR0(),readDopplerR0()];
 const original=JSON.stringify(inputs),b=makeB162Bundle(...inputs);
 assert.equal(JSON.stringify(inputs),original);
 assert.equal(b.gallery.scenes.length,30);
 assert.equal(b.gallery.scenes[27].id,'doppler-switchback-terminal-adaptive-r2');
 assert(b.gallery.scenes[28].id.endsWith('-revised-alpha'));
 assert.equal(b.gallery.scenes[29].id,'doppler-switchback-terminal-replanned-r3');
 assert.equal(new Set(b.gallery.scenes.map(s=>s.id)).size,30);
 assert(b.gallery.safety.minecraftWrites===0);
 assert.deepEqual(b.gallery.safety.BuildPlan.operations,[]);
 const template=fs.readFileSync(new URL('../source/ai/b143-viewer-template.html',import.meta.url),'utf8');
 const html=renderB162Html(b,template);
 for(const value of ['id="b162-route"','id="b162-status"',
  'index=29;select.value="29";setScene()','NOT_PREPARED'])
  assert(html.includes(value),'Missing '+value);
 assert(!html.includes('fetch('));
});
