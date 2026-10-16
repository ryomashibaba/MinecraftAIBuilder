import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {reviewAxisTransfer,verifyAxisTransfer} from '../source/ai/b158-axis-transfer.mjs';
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
import {readInterchangeR0,readInterchangeR1,TRANSIT_PROPOSAL} from './build-b155-site.mjs';
import {readHeliosR0,HELIOS_PROPOSAL,makeB158Bundle,renderB158Html} from './build-b158-site.mjs';

test('two genuinely unrelated terminals prove x and z bridge finish using identical geometry engine',()=>{
 const east=readInterchangeR0(),north=readHeliosR0(),snap=JSON.stringify([east,north]);
 const compare=reviewAxisTransfer(east,TRANSIT_PROPOSAL,north,HELIOS_PROPOSAL);
 assert.deepEqual(compare.report.bridgeAxes,['x','z']);
 assert.equal(compare.report.testedBuildingCount,2);
 assert.equal(compare.north.generated.before.targets[0].status,'FOOTPRINT_UNREACHABLE');
 assert.equal(compare.north.reroute.targets[0].status,'PASS_FLAT_FOOTPRINT_GEOMETRY');
 assert.equal(compare.north.reroute.targets[0].steps,38);
 assert.equal(compare.east.reroute.targets[0].steps,26);
 assert.equal(compare.report.sourceIndependent,true);
 assert.equal(compare.report.constructionApproved,false);
 assert.equal(compare.report.worldContacts,0);
 assert.equal(compare.report.BuildPlan.operations.length,0);
 assert(compare.report.gates.every(v=>v==='BLOCKED'));
 assert(compare.north.reroute.targets[0].path.every(p=>p[1]===19));
 assert.equal(compare.north.finished.elements.length,
  north.elements.length+15);
 assert.equal(compare.north.report.guardrailPieces,2);
 assert.equal(compare.north.report.foundationPiers,2);
 assert.equal(compare.north.report.portalFrames,2);
 assert.equal(compare.north.report.structuralStrengthCertified,false);
 assert(verifyAxisTransfer(east,TRANSIT_PROPOSAL,north,HELIOS_PROPOSAL,compare.report));
 assert.equal(JSON.stringify([east,north]),snap);
});

test('cross-axis proof is immutable and refuses forged passes or same design',()=>{
 const east=readInterchangeR0(),north=readHeliosR0();
 const proof=reviewAxisTransfer(east,TRANSIT_PROPOSAL,north,HELIOS_PROPOSAL).report;
 const tampered=structuredClone(proof);
 tampered.constructionApproved=true;
 assert.equal(verifyAxisTransfer(east,TRANSIT_PROPOSAL,north,HELIOS_PROPOSAL,tampered),false);
 assert.throws(()=>reviewAxisTransfer(east,TRANSIT_PROPOSAL,east,TRANSIT_PROPOSAL),
  /B158_MUST_BE_INDEPENDENT_DESIGNS/);
 assert.throws(()=>reviewAxisTransfer(east,TRANSIT_PROPOSAL,north,
  {...HELIOS_PROPOSAL,goal:[44,20,69]}),/B156_NOT_A_SAFE_CANDIDATE/);
});

test('new 23-scene static HELOS gallery preserves full previous architectural history',()=>{
 const argumentsList=[readDesigns(),readRevisionRequests(),readContinuations(),
  readStructuralRequests(),readRepairRequest(),readInteriorDesign(),readUpperDesign(),
  readWideDesign(),readLoopDesign(),readSkyDesign(),readBypassDesign(),
  readInterchangeR0(),readInterchangeR1(),readHeliosR0()];
 const frozen=JSON.stringify(argumentsList);
 const b=makeB158Bundle(...argumentsList);
 assert.equal(JSON.stringify(argumentsList),frozen);
 assert.equal(b.gallery.scenes.length,23);
 assert.equal(b.gallery.scenes[20].id,'aurora-interchange-generated-finished');
 assert.equal(b.gallery.scenes[21].id,'helios-freight-harbor-r0');
 assert.equal(b.gallery.scenes[22].id,'helios-freight-harbor-generated-finished');
 assert.equal(b.axis.north.reroute.targets[0].steps,38);
 assert.equal(b.gallery.safety.minecraftWrites,0);
 assert.equal(b.axis.north.report.BuildPlan.operations.length,0);
 const template=fs.readFileSync(new URL('../source/ai/b143-viewer-template.html',import.meta.url),'utf8');
 const html=renderB158Html(b,template);
 for(const x of ['id="b158-status"','id="b158-route"',
  'index=22;select.value="22";setScene()','NOT_PREPARED'])
  assert(html.includes(x),'Missing '+x);
 assert(!html.includes('fetch('));
});
