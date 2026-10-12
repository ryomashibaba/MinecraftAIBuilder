import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {buildB3Preview,predictLocalRectangles,orientPoint,orientedRectangles,footprintSummary,B3_SOURCE_MANIFEST_SHA} from '../runner/step8b-geometry-b3.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const source=process.env.STEP8B_SOURCE_DIR??path.join(here,'../../windows');
const sourceTest=fs.existsSync(path.join(source,'WINDOWS_SNAPSHOT_MANIFEST.json'))?test:test.skip;
const review=n=>JSON.parse(fs.readFileSync(path.join(here,'../samples',n,'review.json'),'utf8'));
const styles={modern:{architecture:{proportion:0}},urban_japanese:{architecture:{proportion:1}},traditional:{architecture:{}}};
const all=['slab','L_shape','U_shape','courtyard','tower_on_podium','stepped','twin_bar','asymmetric_block'];
const faces=['north','east','south','west'];
const digest=x=>createHash('sha256').update(x).digest('hex');
const params=(m,orientation='north',seed=0,style='modern',width=24,depth=20,floors=6)=>({massing:m,orientation,seed,style,width,depth,floors});
// Independent cell-based reference oracle instead of corner-based rectangle transform.
function cells(rects,w,d,n){const arr=Array.from({length:n},()=>new Set());for(const r of rects)for(let f=r.start;f<r.end;f++)for(let x=r.x;x<r.x+r.width;x++)for(let z=r.z;z<r.z+r.depth;z++)arr[f].add(`${x},${z}`);return arr;}
function rotatedCellSet(rects,face,w,d,n){return cells(rects,w,d,n).map(layer=>new Set([...layer].map(k=>{const [x,z]=k.split(',').map(Number);
 // Deliberately independent axis derivation, used only in tests.
 const xNew=face==='north'?x:face==='east'?d-z-1:face==='south'?w-x-1:z;
 const zNew=face==='north'?z:face==='east'?x:face==='south'?d-z-1:w-x-1;
 return `${xNew},${zNew}`;
})));}
const sorted=s=>[...s].sort();
test('8 registered massings x four facings x 3 seeds x 3 styles: cell exact orientation, per floor',()=>{
 let verified=0;
 for(const m of all)for(const facing of faces)for(const seed of [0,1,5])for(const st of Object.keys(styles)){
  const p=params(m,facing,seed,st),original=predictLocalRectangles(p,styles[st]);
  const oriented=orientedRectangles(original.rectangles,facing,p.width,p.depth);
  const w2=['east','west'].includes(facing)?p.depth:p.width,d2=['east','west'].includes(facing)?p.width:p.depth;
  const expected=rotatedCellSet(original.rectangles,facing,p.width,p.depth,p.floors),actual=cells(oriented,w2,d2,p.floors);
  for(let i=0;i<p.floors;i++)assert.deepEqual(sorted(actual[i]),sorted(expected[i]),`${m}/${facing}/${seed}/${st}/${i}`);
  assert.ok(footprintSummary(oriented,w2,d2,p.floors).totalCells>0);verified++;
 }
 assert.equal(verified,288);
});
test('Variation matches Oct 10 source formula incl seed/style, stepped setbacks, heightDrop',()=>{
 const p=params('asymmetric_block','south',5,'urban_japanese');const v=predictLocalRectangles(p,styles.urban_japanese);
 assert.deepEqual(v.variation,{wing:7,setback:2,heightDrop:1+5%5,styleProportion:1,seed:5});
 assert.equal(v.rectangles[1].end,6-v.variation.heightDrop);
 const step=predictLocalRectangles(params('stepped','north',1),styles.modern);
 assert.deepEqual(step.rectangles.map(r=>[r.x,r.z,r.width,r.depth]),[[0,0,24,20],[2,2,20,16],[4,4,16,12]]);
});
test('One-block style mismatch for office asymmetric does not mutate original conceptual geometry',()=>{
 const p=params('asymmetric_block','south',0,'urban_japanese');const a=predictLocalRectangles(p,styles.urban_japanese),b=predictLocalRectangles({...p,style:'modern'},styles.modern);
 assert.equal(a.variation.wing-b.variation.wing,1);
 assert.deepEqual(a.rectangles[0],{x:0,z:0,width:13,depth:14,start:0,end:6});
});
test('Identity transforms and rectangular extents on non-square plan',()=>{
 assert.deepEqual(orientPoint({x:0,z:0},'north',24,20),{x:0,z:0});
 assert.deepEqual(orientPoint({x:0,z:0},'east',24,20),{x:19,z:0});
 assert.deepEqual(orientPoint({x:0,z:0},'south',24,20),{x:23,z:19});
 assert.deepEqual(orientPoint({x:0,z:0},'west',24,20),{x:0,z:23});
 const r=[{x:2,z:3,width:6,depth:7,start:0,end:2}];
 assert.deepEqual(orientedRectangles(r,'west',24,20),[{x:3,z:16,width:7,depth:6,start:0,end:2}]);
});
test('Boundaries and rotated 48x12 and 15x40 remain inside valid preview dimensions',()=>{
 for(const [w,d] of [[48,12],[15,40]])for(const m of all)for(const facing of faces){
  const p=params(m,facing,1,'modern',w,d,6),v=predictLocalRectangles(p,styles.modern),or=orientedRectangles(v.rectangles,facing,w,d);
  const ow=['east','west'].includes(facing)?d:w,od=['east','west'].includes(facing)?w:d;
  assert.deepEqual(footprintSummary(or,ow,od,6).areaByFloor,footprintSummary(v.rectangles,w,d,6).areaByFloor);
 }
});
test('Reject invalid seed, unregistered style/massing/facing and out-of-site points',()=>{
 for(const p of [params('slab','north',-1),params('slab','north',2147483648),params('slab','north',0,'unknown'),params('other'),params('slab','northish')])assert.throws(()=>predictLocalRectangles(p,styles.modern));
 assert.throws(()=>orientPoint({x:24,z:0},'north',24,20));
 assert.throws(()=>orientedRectangles([{x:0,z:0,width:100,depth:2,start:0,end:1}],'north',24,20));
 assert.throws(()=>predictLocalRectangles(params('slab'),{architecture:{proportion:-3}}));
});
sourceTest('Source pinned 249/249; review original immutable, 3 designs, 288 matrix cases, all safety FALSE',()=>{
 const r=review('office'),before=JSON.stringify(r),out=buildB3Preview(source,r);
 assert.equal(JSON.stringify(r),before);assert.equal(out.sourceManifestSha256,B3_SOURCE_MANIFEST_SHA);
 assert.equal(out.sourceFilesVerified,249);assert.equal(out.styleSeedCases,288);assert.equal(out.candidates.length,3);
 assert.equal(out.status,'STATIC_PREVIEW_COMPLETE_NOT_PREPARED');assert.equal(out.deploymentGate,'BLOCKED');
 assert.equal(out.compatibility,'ADAPTER_PREVIEW_ONLY_NOT_EXECUTION_COMPATIBLE');
 assert.deepEqual(out.candidates.map(c=>c.comparison.match),[true,false,true]);
 assert.ok(out.candidates[1].comparison.noLongerOccupiedCellsByFloor.some(x=>x>0));
 assert.deepEqual(out.BuildPlan,{status:'NOT_PREPARED',operations:[],commandCount:0});
 assert.deepEqual(out.candidates[0].BuildPlan,{status:'NOT_PREPARED',operations:[],commandCount:0});
 assert.ok(out.candidates.every(c=>c.worldAnchor===null&&c.worldCoordinates===null&&c.materialBlockIds.length===0));
 assert.equal(out.safety.executionAllowed,false);assert.equal(out.safety.constructionApproved,false);
 const {reportSha256,...content}=out;assert.equal(digest(JSON.stringify(content)),reportSha256);
});
sourceTest('Hotel/apartment match under exact source-styled preview, no Minecraft output',()=>{
 for(const n of ['hotel','apartment']){const x=buildB3Preview(source,review(n),{matrix:false});
  assert.equal(x.styleSeedCases,0);assert.equal(x.candidates.length,1);assert.equal(x.candidates[0].comparison.match,true);
  assert.equal(x.candidates[0].BuildPlan.commandCount,0);
 }
});
sourceTest('Source pin mismatch is fail-closed even after attack recomputes manifest',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'b3-drift-'));
 try{
  const original=JSON.parse(fs.readFileSync(path.join(source,'WINDOWS_SNAPSHOT_MANIFEST.json'),'utf8').replace(/^\uFEFF/,''));
  for(const row of original.files){const src=path.join(source,row.path),dst=path.join(tmp,row.path);fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(src,dst);}
  const target=path.join(tmp,'styles','urban_japanese.json');fs.appendFileSync(target,'\n');
  const updated=original.files.find(x=>x.path==='styles/urban_japanese.json');updated.bytes=fs.statSync(target).size;updated.sha256=digest(fs.readFileSync(target));
  original.includedBytes=original.files.reduce((a,x)=>a+x.bytes,0);
  fs.writeFileSync(path.join(tmp,'WINDOWS_SNAPSHOT_MANIFEST.json'),JSON.stringify(original));
  assert.throws(()=>buildB3Preview(tmp,review('hotel')),e=>e.code==='B3_SOURCE_PIN_MISMATCH');
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
sourceTest('Malformed/hash-forged concept or fake approval rejected by B2 strict safety gate',()=>{
 const r=review('hotel');r.safety.executionAllowed=true;
 delete r.reviewSha256;r.reviewSha256=digest(JSON.stringify(r));
 assert.throws(()=>buildB3Preview(source,r),e=>e.code==='UNSAFE_SAFETY_STATE');
});
sourceTest('Canary synthetic inputs do not cause calls or file modifications',()=>{
 const r=review('office'),before=fs.readFileSync(path.join(source,'WINDOWS_SNAPSHOT_MANIFEST.json'));
 const out=buildB3Preview(source,r,{matrix:false});
 assert.ok(out.candidates.every(x=>x.BuildPlan.operations.length===0));
 assert.deepEqual(fs.readFileSync(path.join(source,'WINDOWS_SNAPSHOT_MANIFEST.json')),before);
});
