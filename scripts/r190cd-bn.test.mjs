import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {compileR190BNAssembly} from '../source/ai/r190bn-spatial-assembly.mjs';
import {auditR190CDFromBN} from '../source/ai/r190cd-bn-adapter.mjs';
import {twoLevelReadingProbe,longConcourseProbe} from './fixtures/r190bn-spatial-assemblies.mjs';
const hash=v=>createHash('sha256').update(v).digest('hex');
const go=(fn)=>{
 const p=fn(),derived=compileR190BNAssembly(p.original,
  {originalBrief:p.brief,authorship:'SYNTHETIC_TEST_FIXTURE'});
 return {p,derived,report:auditR190CDFromBN({
   original:p.original,originalBrief:p.brief,derived,
   origin:'SYNTHETIC_BN_FOR_CONTRACT_TEST_ONLY'})};
};
test('Reuses true BN/B143 source without replacing B143 design+voxel geometry hash',()=>{
 const {p,derived,report}=go(twoLevelReadingProbe);
 assert.equal(report.geometrySha256,derived.geometrySha256);
 assert.notEqual(report.primitiveVoxelSha256,report.geometrySha256);
 assert.equal(report.rawSourceSha256,hash(p.original));
 assert.equal(report.originalBriefSha256,hash(p.brief));
 assert.equal(report.sourceOriginalAuthorship,'SYNTHETIC_TEST_FIXTURE');
 assert.equal(report.actualDeclaredFlights,1);
 assert.equal(report.authorRoute.nodes,0);
 assert.equal(report.authorFlightCoverage,'NO_IMPLICIT_FLIGHT_TO_ROUTE_ANCHORS_CONVERSION');
 assert.equal(report.originalAuthorEntrance.join(','),p.plan.entrance.join(','));
 assert.equal(report.programs.length,p.plan.spaces.length);
 assert.equal(report.programs[0].floorY,p.plan.levels[0].standingY-1);
 assert.equal(report.worldWrites,0);
 assert.deepEqual(report.gates,Array(9).fill('BLOCKED'));
 assert.equal(report.artGate,'ART_HOLD_REQUIRES_REAL_MULTI_VIEW_HUMAN');
 assert.equal(report.realMinecraftWalkability,'NOT_TESTED');
});
test('Accepts a different arbitrary synthetic program without selecting a building typology',()=>{
 const {p,derived,report}=go(longConcourseProbe);
 assert.equal(report.actualDeclaredFlights,0);
 assert.equal(report.programs.length,1);
 assert.equal(report.programs[0].id,p.plan.spaces[0].id);
 assert.equal(report.programs[0].floorY,0);
 assert.equal(report.geometrySha256,derived.geometrySha256);
 assert.ok(report.programs[0].requestedCells>500);
});
test('Rejects swapped original source, changed request, spliced design and altered voxel bytes',()=>{
 const a=go(twoLevelReadingProbe),b=go(longConcourseProbe);
 assert.throws(()=>auditR190CDFromBN({
  original:a.p.original,originalBrief:b.p.brief,derived:a.derived}),
  /R190CD_BN_ORIGIN_BINDING/);
 assert.throws(()=>auditR190CDFromBN({
  original:b.p.original,originalBrief:b.p.brief,derived:a.derived}),
  /R190CD_BN_ORIGIN_BINDING/);
 const fake={...a.derived,geometrySha256:'f'.repeat(64)};
 assert.throws(()=>auditR190CDFromBN({
  original:a.p.original,originalBrief:a.p.brief,derived:fake}),
  /R190CD_BN_ORIGIN_BINDING/);
 const c={...a.derived,compiled:{...a.derived.compiled,
  primitives:[...a.derived.compiled.primitives]}};
 c.compiled.primitives[0]=[...c.compiled.primitives[0]];
 c.compiled.primitives[0][0]+=1;
 assert.throws(()=>auditR190CDFromBN({
  original:a.p.original,originalBrief:a.p.brief,derived:c}),
  /R190CD_BN_DERIVATION_CHANGED/);
});
