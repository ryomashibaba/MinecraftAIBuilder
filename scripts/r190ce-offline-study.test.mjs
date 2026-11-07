import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {studyR190CE} from './r190ce-offline-study.mjs';
import {renderR190CE} from './r190ce-offline-visual-evidence.mjs';
test('BO saved-source through CD to eight voxel views is synthetic-only and ART HOLD',t=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'r190ce-'));
 t.after(()=>fs.rmSync(tmp,{recursive:true,force:true}));
 const out=path.join(tmp,'study'),report=studyR190CE(out);
 assert.equal(report.cases.length,2);
 assert.equal(report.modelCalls,0);
 assert.equal(report.worldWrites,0);
 for(const c of report.cases){
  const d=path.join(out,c.name),visual=path.join(d,'visual');
  const v=JSON.parse(fs.readFileSync(path.join(visual,'VISUAL_EVIDENCE.json'),'utf8'));
  assert.equal(v.images.length,8);
  assert.equal(v.geometrySha256,c.geometrySHA);
  assert.equal(v.artDecision,'ART_HOLD');
  assert.equal(v.executionAllowed,false);
  assert.equal(v.officialArtAdoptions,0);
  assert.ok(fs.readFileSync(path.join(visual,'REVIEW.html'),'utf8').includes('ART HOLD'));
  assert.equal(fs.existsSync(path.join(d,'prepared','ATTEMPT_CONSUMED.json')),false);
  assert.throws(()=>renderR190CE({reviewDir:path.join(d,'cd'),out:visual}),
   /R190CE_FRESH_OUTPUT_REQUIRED/);
 }
 const cd=path.join(out,'PUBLIC_CONCOURSE','cd');
 const f=path.join(cd,'DERIVED_VOXELS.json');
 const mutated=JSON.parse(fs.readFileSync(f,'utf8'));
 mutated.primitives[0][0]+=1;
 fs.writeFileSync(f,JSON.stringify(mutated)+'\n');
 const never=path.join(tmp,'should-not-exist');
 assert.throws(()=>renderR190CE({reviewDir:cd,out:never}),
  /R190CE_SOURCE_OR_GEOMETRY_INTEGRITY/);
 assert.equal(fs.existsSync(never),false);
});
