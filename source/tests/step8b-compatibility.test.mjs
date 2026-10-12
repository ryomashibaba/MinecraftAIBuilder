import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createReview} from '../runner/step8a-review.mjs';
import {makeCompatibilityEnvelope,auditSourceDirectory} from '../runner/step8b-compatibility.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const original=createReview('幅26奥行20の6階建てホテル。直方体、北向き');
const copy=()=>structuredClone(original);
const rehash=o=>{delete o.reviewSha256;o.reviewSha256=hash(JSON.stringify(o));return o};
const rehashConcept=(r,i=0)=>{const c=r.candidates[i].concept;delete c.designSha256;c.designSha256=hash(JSON.stringify(c));return rehash(r)};
const blocked=(f,code)=>assert.throws(f,e=>e.code===code,`must BLOCK ${code}`);
const makeDir=()=>fs.mkdtempSync(path.join(os.tmpdir(),'step8b-test-'));
const src='scripts/step7r-qa.js';
function snap(root,{corrupt=false,missing=false,oversized=false,extra=false}={}){
 fs.mkdirSync(path.join(root,'scripts'),{recursive:true});
 fs.writeFileSync(path.join(root,'package.json'),'{}');
 if(!missing)fs.writeFileSync(path.join(root,src),corrupt?'wrong':'original');
 const data=[{path:'package.json',bytes:2,sha256:hash('{}')},
  ...(!missing?[{path:src,bytes:8,sha256:hash('original')}]:[])];
 const manifest={schema:'minecraftaibuilder-step7s-windows-source-only-snapshot-v1',createdAtLocal:'2026-10-10T18:00:00+09:00',
  notPrepared:true,executionAllowed:false,filesIncluded:data.length,includedBytes:data.reduce((a,x)=>a+x.bytes,0),
  filesExcludedBySize:oversized?1:0,excluded:oversized?[{path:'engine/large.js',reason:'SIZE_LIMIT',bytes:6000000}]:[],files:data};
 if(extra)fs.writeFileSync(path.join(root,'scripts','extra.js'),'code');
 fs.writeFileSync(path.join(root,'WINDOWS_SNAPSHOT_MANIFEST.json'),JSON.stringify(manifest));
 return manifest;
}
test('valid offline 8A5 review produces ONLY unknown, NOT_PREPARED, zero commands',()=>{
 const e=makeCompatibilityEnvelope(original);
 assert.equal(e.compatibility,'UNKNOWN');assert.equal(e.safety.executionAllowed,false);
 assert.equal(e.BuildPlan.commandCount,0);assert.deepEqual(e.BuildPlan.operations,[]);
 assert.equal(e.coordinateContract.worldAnchor,null);assert.equal(e.designs[0].worldAnchor,null);
 assert.equal(e.designs[0].materials.blockIds.length,0);
 assert.equal(e.sourceReviewSha256,original.reviewSha256);
});
test('review unchanged by audit',()=>{const s=JSON.stringify(original);makeCompatibilityEnvelope(original);assert.equal(JSON.stringify(original),s)});
test('report missing forbidden',()=>blocked(()=>makeCompatibilityEnvelope(null),'INVALID_REVIEW_SCHEMA'));
test('edited report hash blocked',()=>{const o=copy();o.inputText+=' TEST';blocked(()=>makeCompatibilityEnvelope(o),'REVIEW_HASH_MISMATCH')});
test('forged construction approval blocked even with recomputed report hash',()=>{
 const o=copy();o.safety.constructionApproved=true;blocked(()=>makeCompatibilityEnvelope(rehash(o)),'UNSAFE_SAFETY_STATE');
});
test('forged operations blocked even with recomputed report hash',()=>{
 const o=copy();o.candidates[0].physical.BuildPlan.operations=['/fill'];
 blocked(()=>makeCompatibilityEnvelope(rehash(o)),'UNSAFE_BUILD_PLAN');
});
test('nested approval bypass forbidden',()=>{
 const o=copy();o.candidates[0].optimization.safety.executionAllowed=true;
 blocked(()=>makeCompatibilityEnvelope(rehash(o)),'UNSAFE_SAFETY_STATE');
});
test('concept hash mismatch blocked even if report hash updated',()=>{
 const o=copy();o.candidates[0].concept.BuildingComposition.dimensions.width+=1;
 blocked(()=>makeCompatibilityEnvelope(rehash(o)),'CONCEPT_HASH_MISMATCH');
});
test('unsupported material assertion blocked',()=>{
 const o=copy();o.candidates[0].concept.MaterialGrammar.blockIds=['minecraft:concrete'];
 blocked(()=>makeCompatibilityEnvelope(rehashConcept(o)),'UNSUPPORTED_CONCEPT_SCHEMA');
});
test('unexpected coordinate direction blocked',()=>{
 const o=copy();o.candidates[0].detail.coordinateSystem.zSouth=false;
 blocked(()=>makeCompatibilityEnvelope(rehash(o)),'COORDINATE_CONTRACT_MISMATCH');
});
test('out of bounds massing blocked even when both hashes recomputed',()=>{
 const o=copy();o.candidates[0].concept.Massing.rectangles[0].x=100;
 blocked(()=>makeCompatibilityEnvelope(rehashConcept(o)),'OUT_OF_BOUNDS_CONCEPT');
});
test('incompatible schema blocked',()=>{
 const o=copy();o.schema='mock-buildable-v1';blocked(()=>makeCompatibilityEnvelope(rehash(o)),'INVALID_REVIEW_SCHEMA');
});
test('unauthenticated snapshotAudit blocked',()=>{
 blocked(()=>makeCompatibilityEnvelope(original,{snapshotAudit:{status:'COMPATIBLE'}}),'INVALID_SNAPSHOT_AUDIT');
});
test('valid source inventory verifies actual bytes, still unknown engine compatibility',()=>{
 const d=makeDir();try{snap(d);const a=auditSourceDirectory(d);assert.equal(a.status,'SOURCE_INVENTORY_CHECKED_MAPPING_UNKNOWN');
  assert.equal(a.engineCompatibility,'UNKNOWN');assert.equal(a.sourceFilesVerified,2);
  const e=makeCompatibilityEnvelope(original,{snapshotAudit:a});assert.equal(e.compatibility,'UNKNOWN');
 }finally{fs.rmSync(d,{recursive:true,force:true})}
});
test('missing source -> incomplete, never PASS',()=>{
 const d=makeDir();try{snap(d,{missing:true});const a=auditSourceDirectory(d);assert.equal(a.status,'SOURCE_INVENTORY_INCOMPLETE');assert.ok(a.missingRequiredPaths.includes(src))}
 finally{fs.rmSync(d,{recursive:true,force:true})}
});
test('oversized excluded source -> incomplete',()=>{
 const d=makeDir();try{snap(d,{oversized:true});assert.equal(auditSourceDirectory(d).status,'SOURCE_INVENTORY_INCOMPLETE')}
 finally{fs.rmSync(d,{recursive:true,force:true})}
});
test('changed source file blocked',()=>{
 const d=makeDir();try{snap(d,{corrupt:true});blocked(()=>auditSourceDirectory(d),'SNAPSHOT_HASH_MISMATCH')}
 finally{fs.rmSync(d,{recursive:true,force:true})}
});
test('unexpected archive file blocked',()=>{
 const d=makeDir();try{snap(d,{extra:true});blocked(()=>auditSourceDirectory(d),'UNEXPECTED_SNAPSHOT_FILE')}
 finally{fs.rmSync(d,{recursive:true,force:true})}
});
test('parent symlink in source blocked',()=>{
 const d=makeDir();try{snap(d);const real=path.join(d,'scripts');fs.renameSync(real,path.join(d,'scripts_real'));fs.symlinkSync(path.join(d,'scripts_real'),real,'dir');
  blocked(()=>auditSourceDirectory(d),'UNSAFE_SNAPSHOT_SYMLINK')}
 finally{fs.rmSync(d,{recursive:true,force:true})}
});
test('path traversal blocked',()=>{
 const d=makeDir();try{const m=snap(d);m.files[1].path='../secret.js';fs.writeFileSync(path.join(d,'WINDOWS_SNAPSHOT_MANIFEST.json'),JSON.stringify(m));
 blocked(()=>auditSourceDirectory(d),'UNSAFE_SOURCE_PATH')}
 finally{fs.rmSync(d,{recursive:true,force:true})}
});
test('all status fields preserve NOT_PREPARED even after snapshot audit',()=>{
 const e=makeCompatibilityEnvelope(original,{snapshotAudit:{status:'SOURCE_INVENTORY_INCOMPLETE'}});
 assert.equal(e.snapshotAuditStatus,'SOURCE_INVENTORY_INCOMPLETE');assert.equal(e.readiness.constructionApproved,false);
 assert.equal(e.designs[0].BuildPlan.status,'NOT_PREPARED');
});
