import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {prepareBO,replayBO} from './r190bo-spatial-local.mjs';
import {reviewR190CDBOCapture} from './r190cd-bo-capture-review.mjs';
import {twoLevelReadingProbe,longConcourseProbe} from './fixtures/r190bn-spatial-assemblies.mjs';
const H=b=>createHash('sha256').update(b).digest('hex');
const read=(file)=>JSON.parse(fs.readFileSync(file,'utf8'));
function fixture(t,probe,model='qwen3:14b',raw=probe.original){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r190cd-bo-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const brief=path.join(root,'brief.txt'),source=path.join(root,'source.json');
 fs.writeFileSync(brief,probe.brief);fs.writeFileSync(source,raw);
 const prepared=path.join(root,'prepared'),capture=path.join(root,'capture');
 prepareBO({briefFile:brief,model,out:prepared});
 const receipt=replayBO({prepared,original:source,out:capture,origin:'SYNTHETIC_TEST_FIXTURE'});
 return {root,capture,receipt,probe,out:path.join(root,'cd')};
}
function rebalanceInventory(capture,changedName){
 const manifestFile=path.join(capture,'INVENTORY.json');
 const inventory=read(manifestFile),record=inventory.files.find(x=>x.file===changedName);
 assert.ok(record);
 const b=fs.readFileSync(path.join(capture,changedName));
 record.bytes=b.length;record.sha256=H(b);
 fs.writeFileSync(manifestFile,JSON.stringify(inventory,null,2)+'\n');
}
test('Actual offline BO prepare/replay capture -> strict BN/B143 -> independent CD, Qwen synthetic two-level',t=>{
 const x=fixture(t,twoLevelReadingProbe());
 assert.ok(x.receipt.geometrySha256);
 const result=reviewR190CDBOCapture(x),a=read(path.join(x.out,'ASSESSMENT.json'));
 const cd=read(path.join(x.out,'CD_SCORECARD.json'));
 const binding=read(path.join(x.out,'BO_CAPTURE_BINDING.json'));
 assert.equal(result.status,'HOLD_PHYSICAL_ART_FIDELITY_AND_PROVIDER_PROVENANCE');
 assert.equal(a.geometrySha256,x.receipt.geometrySha256);
 assert.equal(cd.geometrySha256,x.receipt.geometrySha256);
 assert.equal(binding.independentGeometryMatchesPriorCapture,true);
 assert.equal(binding.BOOriginIndependentlyAuthenticated,false);
 assert.equal(binding.originalBOOriginClaim,'SYNTHETIC_TEST_FIXTURE');
 assert.deepEqual(fs.readFileSync(path.join(x.out,'UNALTERED_SOURCE.txt')),x.probe.original);
 assert.deepEqual(fs.readFileSync(path.join(x.out,'ORIGINAL_BRIEF.txt')),x.probe.brief);
 assert.equal(cd.actualDeclaredFlights,1);
 assert.equal(cd.authorRoute.nodes,0);
 assert.equal(cd.artGate,'ART_HOLD_REQUIRES_REAL_MULTI_VIEW_HUMAN');
 assert.equal(cd.executionAllowed,false);
 assert.equal(cd.worldWrites,0);
 assert.deepEqual(cd.gates,Array(9).fill('BLOCKED'));
 assert.ok(!fs.existsSync(path.join(x.root,'prepared','ATTEMPT_CONSUMED.json')));
});
test('Different arbitrary Japanese brief and Gemma tag are not converted to fixed building categories',t=>{
 const x=fixture(t,longConcourseProbe(),'gemma4:26b');
 const result=reviewR190CDBOCapture(x),cd=read(path.join(x.out,'CD_SCORECARD.json'));
 assert.equal(result.geometrySha256,x.receipt.geometrySha256);
 assert.equal(cd.programs.length,1);
 assert.equal(cd.programs[0].id,x.probe.plan.spaces[0].id);
 assert.equal(cd.programs[0].floorY,0);
 assert.equal(cd.sourceOriginalAuthorship,'UNVERIFIED_AUTHOR');
 assert.equal(cd.realMinecraftWalkability,'NOT_TESTED');
});
test('Invalid saved BO response remains HOLD without fabricated geometry',t=>{
 const q=twoLevelReadingProbe();
 const x=fixture(t,q,'qwen3:14b',Buffer.from('invalid unaltered JSON'));
 assert.equal(x.receipt.status,'HOLD');
 const result=reviewR190CDBOCapture(x),assessment=read(path.join(x.out,'ASSESSMENT.json'));
 assert.equal(result.status,'HOLD_INVALID_ORIGINAL_NO_DERIVED_3D');
 assert.equal(assessment.derivedGeometryAbsent,true);
 assert.equal(fs.existsSync(path.join(x.out,'DERIVED_VOXELS.json')),false);
 assert.equal(fs.existsSync(path.join(x.out,'CD_SCORECARD.json')),false);
});
test('Raw BO byte mutation is rejected before new CD evidence is written',t=>{
 const x=fixture(t,twoLevelReadingProbe());
 fs.appendFileSync(path.join(x.capture,'MODEL_ORIGINAL.txt'),' ');
 assert.throws(()=>reviewR190CDBOCapture(x),/R190CD_BO_CAPTURE_INVENTORY_SHA_MISMATCH/);
 assert.equal(fs.existsSync(x.out),false);
});
test('Tampered receipt source SHA fails even if attacker rewrites manifest hash',t=>{
 const x=fixture(t,longConcourseProbe());
 const p=path.join(x.capture,'CAPTURE.json'),receipt=read(p);
 receipt.originalRawSha256='0'.repeat(64);
 fs.writeFileSync(p,JSON.stringify(receipt,null,2)+'\n');
 rebalanceInventory(x.capture,'CAPTURE.json');
 assert.throws(()=>reviewR190CDBOCapture(x),/R190CD_BO_CAPTURE_RECEIPT_SOURCE_BINDING/);
 assert.equal(fs.existsSync(x.out),false);
});
test('Rehashed but contradictory saved BO geometry yields HOLD and no new 3D',t=>{
 const x=fixture(t,twoLevelReadingProbe());
 const p=path.join(x.capture,'CAPTURE.json'),receipt=read(p);
 receipt.geometrySha256='f'.repeat(64);
 fs.writeFileSync(p,JSON.stringify(receipt,null,2)+'\n');
 rebalanceInventory(x.capture,'CAPTURE.json');
 const result=reviewR190CDBOCapture(x);
 assert.equal(result.status,'HOLD_INVALID_ORIGINAL_NO_DERIVED_3D');
 assert.equal(fs.existsSync(path.join(x.out,'DERIVED_VOXELS.json')),false);
 assert.equal(fs.existsSync(path.join(x.out,'CD_SCORECARD.json')),false);
 assert.equal(read(path.join(x.out,'BO_CAPTURE_BINDING.json')).independentGeometryMatchesPriorCapture,false);
});
test('Prior missing geometry evidence cannot be silently reconstructed into apparent acceptance',t=>{
 const x=fixture(t,twoLevelReadingProbe());
 const p=path.join(x.capture,'CAPTURE.json'),receipt=read(p);
 delete receipt.geometrySha256;
 fs.writeFileSync(p,JSON.stringify(receipt,null,2)+'\n');
 rebalanceInventory(x.capture,'CAPTURE.json');
 const result=reviewR190CDBOCapture(x);
 assert.equal(result.status,'HOLD_INVALID_ORIGINAL_NO_DERIVED_3D');
 assert.equal(fs.existsSync(path.join(x.out,'DERIVED_VOXELS.json')),false);
});
test('Existing output is never overwritten and unlisted capture files are rejected',t=>{
 const x=fixture(t,longConcourseProbe());
 fs.writeFileSync(path.join(x.capture,'INJECTED.txt'),'untracked');
 assert.throws(()=>reviewR190CDBOCapture(x),/R190CD_BO_CAPTURE_UNDECLARED_OR_MISSING_FILE/);
 fs.unlinkSync(path.join(x.capture,'INJECTED.txt'));
 fs.mkdirSync(x.out);
 assert.throws(()=>reviewR190CDBOCapture(x),/R190CD_BO_CAPTURE_FRESH_OUTPUT_REQUIRED/);
});
