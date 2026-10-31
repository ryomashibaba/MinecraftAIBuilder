import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {R156_CASES} from './r156-unknown-use-study.mjs';
import {compareR157Pairs,evaluateR157Review,runR157Review}
 from './r157-comparative-review.mjs';
const arch=(i=0,material='stone')=>({
 id:'alternate-name-'+i,title:'Alternate '+i,
 footprint:{width:26,depth:30},materials:{floor:material,wall:'concrete',roof:'metal'},
 layout:{axis:'z',spaces:Array.from({length:4},(_,k)=>({id:'room-'+k,purpose:'Generic '+i+' description '+k,weight:1}))},
 form:{roofProfile:'flat',facadeLanguage:'plain'},
 objects:[{role:'work-surface'}],
 relations:{entryFacingZoneId:'room-3',directAdjacencies:[['room-0','room-1'],['room-2','room-3']]},
 architecture:{volumeHierarchy:'paired',arrivalSpace:'covered',roofSilhouette:'ridge'}
});
const make=(raw,local=true)=>({
 schema:'r156-unknown-use-v1',cases:R156_CASES.map((x,i)=>({
 id:x.id,use:x.use,status:local?'SOURCE_CANDIDATE_REAL_LOCAL_RESPONSE_HUMAN_REVIEW_REQUIRED':'HOLD_TEST_DOUBLE_NOT_REAL_INFERENCE',
 sourceSha256:'source-'+i,geometrySha256:'geometry-'+i,newLocalResponseCandidate:local,safe:true
 }))
});
test('R157 finds convergence when material, room labels, ids and different source hashes hide identical spatial mass',()=>{
 const m=make();
 const raw=Object.fromEntries(R156_CASES.map((c,i)=>[c.id,JSON.stringify(arch(i,['stone','wood','metal'][i]))]));
 const r=evaluateR157Review(m,raw);
 assert.equal(r.status,'HOLD_SPATIAL_CONVERGENCE');
 assert.equal(r.pairs.length,3);
 assert.ok(r.pairs.every(p=>p.sameSpatialStructure&&p.differenceCount===0));
 assert.equal(r.humanArchitecturalArt,'ART_HOLD');assert.equal(r.worldWrites,0);
});
test('R157 catches near-duplicates differing only roof silhouette, not just identical geometry hashes',()=>{
 const m=make(),arr=R156_CASES.map((c,i)=>arch(i));
 arr[1].architecture.roofSilhouette='shed';arr[2].architecture.roofSilhouette='shed';
 const r=evaluateR157Review(m,Object.fromEntries(R156_CASES.map((c,i)=>[c.id,JSON.stringify(arr[i])])));
 assert.equal(r.status,'HOLD_SPATIAL_CONVERGENCE');
 assert.equal(r.pairs.find(p=>p.pair.join('-')==='home-shop').differenceCount,1);
 assert.equal(r.pairs.find(p=>p.pair.join('-')==='shop-laboratory').differenceCount,0);
});
test('R157 two or more independently changed spatial features still need human review',()=>{
 const m=make(),arr=R156_CASES.map((c,i)=>arch(i));
 arr[1].footprint={width:28,depth:30};arr[1].architecture.roofSilhouette='shed';
 arr[2].footprint={width:28,depth:26};arr[2].architecture.volumeHierarchy='single';
 const r=evaluateR157Review(m,Object.fromEntries(R156_CASES.map((c,i)=>[c.id,JSON.stringify(arr[i])])));
 assert.equal(r.status,'HOLD_HUMAN_ART_REVIEW_REQUIRED');
 assert.ok(r.pairs.every(p=>p.differenceCount>=2));
 assert.equal(r.shapeSimilarityDoesNotProveQuality,true);
});
test('R157 rejects missing genuine inference, blocked gates broken, original JSON absent',()=>{
 const m=make();m.cases[0].newLocalResponseCandidate=false;
 assert.equal(evaluateR157Review(m,{}).status,'HOLD_MISSING_REAL_LOCAL_MODEL_EVIDENCE');
 m.cases[0].newLocalResponseCandidate=true;m.cases[1].safe=false;
 assert.equal(evaluateR157Review(m,{}).status,'HOLD_SAFETY');
 m.cases[1].safe=true;
 assert.equal(evaluateR157Review(m,{}).status,'HOLD_MISSING_ORIGINAL_REPLY');
 assert.throws(()=>evaluateR157Review({schema:'fake',cases:m.cases},{}),/R157_MANIFEST_CONTRACT/);
});
test('R157 writes honest comparison HTML with local 3D views where present and never overwrites evidence',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r157-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const m=make(undefined,false);
 fs.writeFileSync(path.join(dir,'R156_STUDY_MANIFEST.json'),JSON.stringify(m));
 for(const c of R156_CASES){fs.mkdirSync(path.join(dir,c.id));fs.writeFileSync(path.join(dir,c.id,'MODEL_RAW_ORIGINAL.txt'),JSON.stringify(arch()));}
 fs.writeFileSync(path.join(dir,'home/index.html'),'<html>viewer</html>');
 const r=runR157Review(dir);
 assert.equal(r.status,'HOLD_MISSING_REAL_LOCAL_MODEL_EVIDENCE');
 assert.ok(fs.existsSync(path.join(dir,'R157_SPATIAL_AUDIT.json')));
 const html=fs.readFileSync(path.join(dir,'R157_COMPARE.html'),'utf8');
 assert.match(html,/home\/index.html/);
 assert.match(html,/B143ビューア未生成/);
 assert.match(html,/ART HOLD/);
 assert.throws(()=>runR157Review(dir),/EEXIST/);
});
