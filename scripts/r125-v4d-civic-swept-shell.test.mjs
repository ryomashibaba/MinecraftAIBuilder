import test from 'node:test';
import assert from 'node:assert/strict';
import {makeV4DCivicSweptShellFixture} from './r125-v4d-civic-swept-shell-fixture.mjs';
import {validateV4DSweptShell,compileV4DSweptShell}
 from '../source/ai/r125-v4d-civic-swept-shell.mjs';
import {verifyCompiled,MATERIALS} from '../source/ai/b143-building-dsl.mjs';

test('third V4D AUTHOR defines non-flat two-wing physical roof and vast open civic spine on REAL B143',()=>{
 const p=makeV4DCivicSweptShellFixture(),frozen=structuredClone(p);
 validateV4DSweptShell(p);
 const r=compileV4DSweptShell(p);
 assert.deepEqual(p,frozen);
 assert(verifyCompiled(r.design,r.compiled));
 assert(r.sourceProof.realOpenSkySupportedTwoWidePads>=120);
 assert(r.sourceProof.realGlassVoxels>=50);
 assert.equal(r.sourceProof.bayCount,3);
 assert.deepEqual(r.sourceProof.authoredAxisCenters,[54,58,55]);
 assert.deepEqual(r.sourceProof.authoredWestRoofRidges,[21,27,19]);
 assert.equal(r.sourceProof.realInclinedRoofEndpointsVerified,true);
 assert(r.design.elements.some(e=>e.shape==='beam'&&e.repeat?.count===6));
 assert(r.compiled.primitives.some(x=>x[3]===MATERIALS.indexOf('glass')));
 assert.equal(r.sourceRoutes.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(r.sourceRoutes.zones.length,3);
 assert(r.sourceRoutes.zones.every(z=>z.reachedFromEntrance));
 assert.equal(r.provenance,'SYNTHETIC_AUTHOR_SUPPLIED_NOT_REAL_QWEN');
 assert.equal(r.authorIsRealModel,'NOT_ATTESTED');
 assert.equal(r.architecturalArt,'NOT_REVIEWED');
 assert.equal(r.minecraftWalking,'NOT_TESTED');
 assert.equal(r.readiness,'NOT_PREPARED');
 assert.equal(r.constructionApproved,false);
 assert.equal(r.executionAllowed,false);
 assert.deepEqual(r.BuildPlan.operations,[]);
 assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
 assert.equal(r.worldContacts,0);
 assert.equal(r.worldWrites,0);
});
test('foreign fields, collapsed design, invalid volumes and missing access fail BEFORE host repair',()=>{
 const p=makeV4DCivicSweptShellFixture();
 const frozen=JSON.stringify(p),bad=[];
 const change=f=>{const x=structuredClone(p);f(x);bad.push(x)};
 change(x=>x.schema='unknown');
 change(x=>x.worldWrites=1);
 change(x=>x.materials.roof='tnt');
 change(x=>x.bays.pop());
 change(x=>x.bays[1].id=x.bays[0].id);
 change(x=>x.bays[1].centerX=81);
 change(x=>x.bays.forEach(b=>b.centerX=54));
 change(x=>x.bays.forEach(b=>b.westRidgeY=21));
 change(x=>x.bays.forEach(b=>b.eastRidgeY=25));
 change(x=>x.bays[1].westRidgeY=x.bays[1].westEaveY+1);
 change(x=>x.site.frontZ=3);
 change(x=>x.site.bayLength=17);
 change(x=>x.site.promenadeWidth=3);
 change(x=>x.portals[1].side='west');
 change(x=>x.portals[0].offsetZ=0);
 change(x=>x.portals[1].bayId='unreal');
 change(x=>x.glazing[0].spanZ=2);
 change(x=>x.glazing[0].sillY=26);
 change(x=>x.glazing[1].side='west');
 for(const x of bad){
  assert.throws(()=>validateV4DSweptShell(x),/R125_V4D_SHELL_/);
  assert.throws(()=>compileV4DSweptShell(x),/R125_V4D_SHELL_/);
 }
 assert.equal(JSON.stringify(p),frozen);
});
