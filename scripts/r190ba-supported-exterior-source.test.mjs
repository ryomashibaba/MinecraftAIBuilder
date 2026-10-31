/** R190-BA independent physically supported flat exterior-width proof. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {reviewR190BASupportedExterior,writeR190BAReview}
 from './r190ba-supported-exterior-source.mjs';

const ORIGINAL=fileURLToPath(new URL('../evidence/r190aa/pilot-01/MODEL_RESPONSE_ORIGINAL.txt',import.meta.url));
const SHA='0bf706181bb2b7a30f8082f896a703c33749ba55f75d42010adba88f47c84f17';
const sha=x=>createHash('sha256').update(x).digest('hex');
const box=(id,mode,origin,size,material)=>({
 id,mode,shape:'box',origin,size,...(material?{material}:{})
});
function authorSource(){
 return {design:{
  schema:'minecraftaibuilder-b143-building-dsl-v1',
  id:'non-prescriptive-civic-study',
  title:'Source-authored pavilion',
  brief:'A freely chosen physical civic space study with an entrance and overhead roof.',
  bounds:{width:20,height:16,depth:20},designOnly:true,
  elements:[
   box('ground','add',[2,0,2],[16,2,16],'stone'),
   box('support','add',[2,2,2],[2,8,2],'concrete'),
   box('roof','add',[2,10,2],[16,4,16],'metal'),
   box('sky-cut','cut',[8,10,8],[4,4,4])
  ]},explanation:'An independently shaped sheltered public space, no model was called.',
  assumptions:[],
  spatialPlan:{
   entrance:[6,2,5],headroom:2,
   protectedVoids:[{id:'sky-cut',origin:[8,2,8],size:[4,12,4],maxOccupiedCells:0}],
   destinations:[{id:'meeting',point:[12,2,13],maximumPathSteps:45}],
   functionalZones:[{id:'gathering',origin:[5,2,4],size:[9,2,8],
    minimumReachablePositions:20,minimumReachablePercent:0.3}]
  }};
}
const audit=s=>reviewR190BASupportedExterior(Buffer.from(JSON.stringify(s)));

test('BA existing archived real model original remains invalid; cannot invent building',()=>{
 const before=fs.readFileSync(ORIGINAL);
 assert.equal(sha(before),SHA);
 const r=reviewR190BASupportedExterior(before,{expectedSha256:SHA});
 assert.equal(r.upstreamAZStatus,'HOLD_INVALID_B143');
 assert.equal(r.status,'HOLD_UPSTREAM_INVALID_SOURCE');
 assert.equal(r.sourceGeometrySha256,null);
 assert.equal(r.routeEvidence,null);
 assert.equal(r.modelProviderCalled,false);
 assert.equal(r.worldContacts,0);assert.equal(r.worldWrites,0);
 assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
 assert.deepEqual(r.BuildPlan.operations,[]);
 assert.equal(r.art,'ART_HOLD');
 assert.deepEqual(fs.readFileSync(ORIGINAL),before);
});
test('BA catches false sense of external access from AIR ONLY although AZ proxies pass',()=>{
 const s=authorSource(),before=JSON.stringify(s);
 const r=audit(s);
 assert.equal(r.upstreamAZStatus,'SOURCE_MODEL_CLAIMS_PHYSICAL_PROXIES_PASS_ART_HOLD');
 assert.equal(r.upstreamAZAirBoundaryProxy,true);
 assert.equal(r.status,'HOLD_NO_SUPPORTED_TWO_WIDE_FLAT_PATH_TO_BOUNDARY');
 assert.equal(r.routeEvidence.entranceCandidatePads>0,true);
 assert.equal(r.routeEvidence.sourceTwoWidePadCount>100,true);
 assert.equal(r.routeEvidence.boundaryPads.length,0);
 assert.equal(r.routeEvidence.witness.length,0);
 assert.equal(r.actualExteriorSiteConnection,'NOT_CERTIFIED');
 assert.equal(JSON.stringify(s),before);
});
test('BA genuine 2-block supported ground promenade reaches a local boundary',()=>{
 const s=authorSource();
 s.design.elements.push(box('author-boundary-ground','add',[0,0,4],[6,2,4],'stone'));
 const before=JSON.stringify(s);
 const r=audit(s);
 assert.equal(r.status,'SOURCE_TWO_WIDE_SUPPORTED_FLAT_BOUNDARY_PATH_FOUND');
 assert.equal(r.upstreamAZAirBoundaryProxy,true);
 assert.equal(r.routeEvidence.minimumAirHeightInBlocks,2);
 assert.equal(r.routeEvidence.requiredSupportedFootprintCellsPerPad,4);
 assert(r.routeEvidence.shortestSourceWitnessSteps>=2);
 assert(r.routeEvidence.witness.length>2);
 assert(r.routeEvidence.witness.some(p=>p[0]===0));
 assert(r.routeEvidence.witness.every(p=>p[1]===2));
 assert.equal(r.routeEvidence.boundaryIsOnlyLocalDesignVolumeNotRealOutside,true);
 assert.equal(r.routeEvidence.actualMinecraftWalking,'NOT_TESTED');
 assert.equal(r.routeEvidence.firstPersonAccessAndDoors,'NOT_CERTIFIED');
 assert.equal(r.art,'ART_HOLD');
 assert.equal(JSON.stringify(s),before);
});
test('BA 1-block-wide ground is not a supported two-wide corridor',()=>{
 const s=authorSource();
 s.design.elements.push(box('narrow-runway','add',[0,0,5],[6,2,1],'stone'));
 const r=audit(s);
 assert.equal(r.upstreamAZAirBoundaryProxy,true);
 assert.equal(r.status,'HOLD_NO_SUPPORTED_TWO_WIDE_FLAT_PATH_TO_BOUNDARY');
 assert.equal(r.routeEvidence.boundaryPads.length,0);
});
test('BA blocked real corridor must reject despite lateral AIR-to-edge route',()=>{
 const s=authorSource();
 s.design.elements.push(box('boundary-ground','add',[0,0,4],[6,2,4],'stone'));
 s.design.elements.push(box('cutoff-wall','add',[2,2,4],[2,4,4],'concrete'));
 const r=audit(s);
 assert.equal(r.upstreamAZAirBoundaryProxy,true);
 assert.equal(r.status,'HOLD_NO_SUPPORTED_TWO_WIDE_FLAT_PATH_TO_BOUNDARY');
});
test('BA entry positions cannot infer a valid standing pad from filled solid',()=>{
 const s=authorSource();
 s.spatialPlan.entrance=[6,0,5];
 const r=audit(s);
 assert.equal(r.status,'HOLD_INVALID_MODEL_ENTRANCE_POINT');
 assert.equal(r.routeEvidence.entranceCandidatePads,0);
});
test('BA SHA mismatch, symlink, and existing destination fail closed, no raw reupload',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r190ba-'));
 const out=path.join(root,'new');
 try{
  const old=fs.readFileSync(ORIGINAL);
  assert.throws(()=>writeR190BAReview({originalPath:ORIGINAL,outDir:out,
   expectedSha256:'0'.repeat(64)}),/R190BA_ORIGINAL_SHA_MISMATCH/);
  assert.equal(fs.existsSync(out),false);
  const receipt=writeR190BAReview({originalPath:ORIGINAL,outDir:out,expectedSha256:SHA});
  assert.equal(receipt.status,'HOLD_UPSTREAM_INVALID_SOURCE');
  assert.deepEqual(fs.readdirSync(out).sort(),
   ['REAL_SOURCE_BOUNDARY_ROUTE.json','RESULT_JA.txt']);
  assert.deepEqual(fs.readFileSync(ORIGINAL),old);
  assert.throws(()=>writeR190BAReview({originalPath:ORIGINAL,outDir:out,
   expectedSha256:SHA}),/R190BA_FRESH_ABSOLUTE_OUTPUT_REQUIRED/);
  const link=path.join(root,'original-link');
  fs.symlinkSync(ORIGINAL,link);
  assert.throws(()=>writeR190BAReview({originalPath:link,
   outDir:path.join(root,'other'),expectedSha256:SHA}),/R190BA_UNSAFE_ORIGINAL_FILE/);
 }finally{fs.rmSync(root,{force:true,recursive:true});}
});
