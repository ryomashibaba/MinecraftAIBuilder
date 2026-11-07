import test from 'node:test';
import assert from 'node:assert/strict';
import {e2SyntheticResearchFacility} from './r190-e2-synthetic-fixture.mjs';
import {compileE2Architecture,validateE2Architecture,auditE2Architecture,
 E2_SCHEMA} from '../source/ai/r190-e2-architecture.mjs';
import {compileDesign} from '../source/ai/b143-building-dsl.mjs';

test('E2 model-authorable B143 geometry: physically distinct program zones, curved roof and glazed exterior are source-audited',()=>{
 const source=e2SyntheticResearchFacility(),old=JSON.stringify(source);
 const result=compileE2Architecture(source);
 assert.equal(result.plan.schema,E2_SCHEMA);
 assert.equal(result.sourceReady,true);
 assert.equal(result.art,'ART_HOLD');
 assert.equal(result.worldWrites,0);
 assert.equal(result.worldContacts,0);
 assert.equal(result.constructionApproved,false);
 assert.equal(result.audit.spaces.length,2);
 assert.equal(result.audit.glazing[0].verifiedGlassCells.length,4);
 assert.equal(result.audit.minecraftPlayerWalking,'NOT_TESTED');
 assert.equal(result.audit.fullWeatherproofing,'NOT_TESTED');
 assert.equal(result.audit.spaces.every(x=>x.reachableFromOutside&&x.roofWitness),true);
 assert(result.audit.reachableSourcePads>20);
 assert.equal(source.sourceDesign.elements.at(-1).shape,'cylinder');
 assert.equal(result.design.elements.at(-1).shape,'cylinder');
 assert.equal(JSON.stringify(source),old);
 assert.equal(result.scene.sourceSha256,compileDesign(source.sourceDesign).sourceSha256);
});

test('E2 strict source route rejects physically blocked entrance instead of graph-only PASS',()=>{
 const p=e2SyntheticResearchFacility();
 p.sourceDesign.elements=p.sourceDesign.elements.filter(x=>x.id!=='entrance-door-cut');
 assert.throws(()=>compileE2Architecture(p),/E2_ENTRANCE_NOT_SOURCE_CONNECTED/);
});

test('E2 architecture rejects graph-witness claims through uncut internal walls',()=>{
 const p=e2SyntheticResearchFacility();
 p.sourceDesign.elements=p.sourceDesign.elements.filter(x=>x.id!=='internal-door-cut');
 assert.throws(()=>compileE2Architecture(p),/E2_PROGRAM_UNREACHABLE_science-lab/);
});

test('E2 rejects glazing if model puts no glass into the compiled source',()=>{
 const p=e2SyntheticResearchFacility();
 p.sourceDesign.elements=p.sourceDesign.elements.filter(x=>x.id!=='window-glass');
 assert.throws(()=>compileE2Architecture(p),/E2_GLAZING_NOT_REAL_GLASS_0/);
});

test('E2 detects physical exterior obstruction even with an authored matching glass window',()=>{
 const p=e2SyntheticResearchFacility();
 p.sourceDesign.elements.push({id:'model-authored-exterior-obstruction',shape:'box',
  mode:'add',material:'stone',origin:[11,4,5],size:[2,2,1]});
 assert.throws(()=>compileE2Architecture(p),/E2_GLAZING_RAY_BLOCKED_0/);
});

test('E2 rejects extra undeclared fields and never repairs a model plan',()=>{
 const p=e2SyntheticResearchFacility();
 p.programSpaces[0].decorations='autofilled';
 const before=JSON.stringify(p);
 assert.throws(()=>validateE2Architecture(p),/E2_PROGRAM_FIELDS_0/);
 assert.equal(JSON.stringify(p),before);
});

test('E2 source witness requires a truly roofed inner 2x2 pad',()=>{
 const p=e2SyntheticResearchFacility();
 p.sourceDesign.elements.push({id:'model-cut-roof-above-lab',shape:'box',
  mode:'cut',origin:[20,9,14],size:[2,5,2]});
 assert.throws(()=>compileE2Architecture(p),/E2_PROGRAM_WITNESS_NO_ROOF_science-lab/);
});

test('E2 scene tampering cannot count as a verified physical audit',()=>{
 const p=e2SyntheticResearchFacility();
 const scene=compileDesign(p.sourceDesign);
 scene.primitives[0][0]+=1;
 assert.throws(()=>auditE2Architecture(p,scene),/E2_SOURCE_STALE/);
});
