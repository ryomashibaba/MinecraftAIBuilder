import test from 'node:test';
import assert from 'node:assert/strict';
import {SITE_SCHEMA,validateAuthoredSiteV4B,compileAuthoredSiteV4B}
 from '../source/ai/r125-site-composition-v4b.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {makeSyntheticV4BSite, SYNTHETIC_GENRES} from './r125-site-composition-v4b-fixtures.mjs';
const ids=SYNTHETIC_GENRES, fixture=makeSyntheticV4BSite;

const clone=v=>JSON.parse(JSON.stringify(v));
test('five cross-genre TEST DOUBLES produce truly distinct authored B143 mass+court SOURCE with 0 world writes',()=>{
 const shapes=[];
 for(let i=0;i<ids.length;i++){
  const p=fixture(i),untouched=clone(p);
  validateAuthoredSiteV4B(p);
  const r=compileAuthoredSiteV4B(p);
  assert.deepEqual(p,untouched);
  assert(verifyCompiled(r.design,r.compiled));
  assert.equal(r.sourceRoutes.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.equal(r.sourceRoutes.zones.length,4);
  assert(r.sourceRoutes.zones.every(z=>z.reachedFromEntrance));
  assert.equal(r.sourceProof.massCount,3);
  assert(r.sourceProof.skyCourtCells>0);
  assert(r.sourceProof.supportedArrivalCells>0);
  assert.equal(r.sourceProof.verifiedNewExteriorGlazing,3);
  assert.equal(r.sourceProof.authorOwnedMassing,true);
  assert.equal(r.sourceProof.authorOwnedCourtyard,true);
  assert.equal(r.authorship,'CALLER_SUPPLIED_AUTHOR_DATA_NOT_REAL_QWEN_VERIFIED');
  assert.equal(r.architecturalArt,'NOT_REVIEWED');
  assert.equal(r.minecraftExecution,'NOT_TESTED');
  assert.equal(r.readiness,'NOT_PREPARED');
  assert.equal(r.worldContacts,0);
  assert.equal(r.worldWrites,0);
  assert.equal(r.constructionApproved,false);
  assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(r.BuildPlan.operations,[]);
  assert(!r.design.elements.some(e=>'worldCoordinates' in e));
  shapes.push(r.geometrySha256);
 }
 assert.equal(new Set(shapes).size,5);
});
test('author intent cannot be repaired by HOST: exact fields, size limits, rooms and placements',()=>{
 const good=fixture(0),bad=[];
 const edited=fn=>{const p=clone(good);fn(p);bad.push(p)};
 edited(p=>p.masses[1].x-=2);
 edited(p=>p.masses[1].x+=3);
 edited(p=>p.links[0].doorOffset=0);
 edited(p=>p.links.pop());
 edited(p=>p.links[0].side='north');
 edited(p=>p.masses[1].id='primary');
 edited(p=>p.approach.offset=20);
 edited(p=>p.court.offsetZ=2);
 edited(p=>p.court.offsetX=1);
 edited(p=>p.court.width=9);
 edited(p=>p.glazing[0].side='east'); // side touches east wing
 edited(p=>p.glazing[0].offset=2); // valid alternative, remove from negative list
 edited(p=>p.materials.roof='tnt');
 edited(p=>p.masses[0].roofY=3);
 edited(p=>p.command='summon-creeper');
 edited(p=>delete p.court);
 bad.splice(11,1);
 for(const p of bad)
  assert.throws(()=>validateAuthoredSiteV4B(p),/R125_V4B_/);
 assert.deepEqual(good,fixture(0));
});
test('no silent roof/entry repair and no proof inflation on a blocked route',()=>{
 const p=fixture(1);
 const r=compileAuthoredSiteV4B(p);
 assert.equal(r.sourceProof.realMinecraftWalkable,'NOT_TESTED');
 assert.equal(r.sourceProof.externalTerrainVerified,false);
 assert.equal(r.originalPlanSha256.length,64);
 assert.equal(r.geometrySha256.length,64);
 assert.equal(r.sourceSha256.length,64);
});
