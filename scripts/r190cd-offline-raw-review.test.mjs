import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {offlineRawReviewCD} from './r190cd-offline-raw-review.mjs';
import {twoLevelReadingProbe,longConcourseProbe} from './fixtures/r190bn-spatial-assemblies.mjs';
function run(q,raw=q.original){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r190cd-offline-'));
 try{
  const brief=path.join(dir,'brief.txt'),source=path.join(dir,'author.json'),out=path.join(dir,'output');
  fs.writeFileSync(brief,q.brief);fs.writeFileSync(source,raw);
  const report=offlineRawReviewCD({briefFile:brief,originalFile:source,out});
  return {report,actual:JSON.parse(fs.readFileSync(path.join(out,'ASSESSMENT.json'))),
   score:fs.existsSync(path.join(out,'CD_SCORECARD.json'))?
    JSON.parse(fs.readFileSync(path.join(out,'CD_SCORECARD.json'))):null,
   original:fs.readFileSync(path.join(out,'UNALTERED_SOURCE.txt')),
   hasDerived:fs.existsSync(path.join(out,'DERIVED_VOXELS.json'))};
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
}
test('One-call offline BN saved-source review preserves bytes and separate geometry evidence',()=>{
 const q=twoLevelReadingProbe(),x=run(q);
 assert.equal(x.report.status,'HOLD_PHYSICAL_ART_FIDELITY_AND_PROVIDER_PROVENANCE');
 assert.deepEqual(x.original,q.original);
 assert.equal(x.hasDerived,true);
 assert.equal(x.score.sourceOriginalAuthorship,'UNVERIFIED_AUTHOR');
 assert.equal(x.score.realMinecraftWalkability,'NOT_TESTED');
 assert.deepEqual(x.report.BuildPlan.operations,[]);
 assert.equal(x.report.worldContacts,0);
 assert.equal(x.report.modelCalls,0);
 assert.equal(x.report.realModelProvenance,'NOT_AUTHENTICATED');
});
test('A different synthetic public hall also reviews without a category-specific building template',()=>{
 const x=run(longConcourseProbe());
 assert.equal(x.report.status,'HOLD_PHYSICAL_ART_FIDELITY_AND_PROVIDER_PROVENANCE');
 assert.equal(x.hasDerived,true);
 assert.equal(x.score.programs.length,1);
 assert.equal(x.score.programs[0].floorY,0);
});
test('Invalid original is preserved and no fake 3D files are created',()=>{
 const q=twoLevelReadingProbe(),corrupt=Buffer.from('not valid Spatial Assembly JSON');
 const x=run(q,corrupt);
 assert.equal(x.report.status,'HOLD_INVALID_ORIGINAL_NO_DERIVED_3D');
 assert.equal(x.hasDerived,false);
 assert.equal(x.score,null);
 assert.deepEqual(x.original,corrupt);
 assert.equal(x.report.worldWrites,0);
});
test('Original with changed brief hash is held, never re-hashed by the host into an invented design',()=>{
 const q=twoLevelReadingProbe(),changed=JSON.parse(q.original);
 changed.originalBriefSha256='f'.repeat(64);
 const x=run(q,Buffer.from(JSON.stringify(changed)));
 assert.equal(x.report.status,'HOLD_INVALID_ORIGINAL_NO_DERIVED_3D');
 assert.equal(x.hasDerived,false);
 assert.equal(x.report.automaticRepair,false);
});
