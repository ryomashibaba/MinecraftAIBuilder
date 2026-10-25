import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {deriveR167AxisForStudy} from './r167-offline-replay.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const original=()=>JSON.stringify({
 id:'sample-model',title:'Actual model output not used as test fixture',
 layout:{axis:{x:'west-to-east',z:'entrance-front-to-rear'},spaces:[
  {id:'a'},{id:'b'},{id:'c'},{id:'d'}]},
 architecture:{schema:'minecraftaibuilder-r160-topology-ir-v1',
  spatialTopology:'central-spine'}
});
test('R167 host-derived axis is separately disclosed, with original model string immutable',()=>{
 const before=original(),hash=sha(before),a=deriveR167AxisForStudy(before);
 assert.equal(sha(before),hash);
 assert.equal(JSON.parse(before).layout.axis.z,'entrance-front-to-rear');
 assert.equal(JSON.parse(a.derivedRaw).layout.axis,'z');
 assert.equal(a.hostAxisDerivation.originalRawSha256,hash);
 assert.equal(a.hostAxisDerivation.derivedAxis,'z');
 assert.equal(a.hostAxisDerivation.modelCalls,0);
 assert.equal(a.hostAxisDerivation.originalRawUntouched,true);
 assert.match(a.hostAxisDerivation.code,/NOT_MODEL_CHOICE/);
});
test('R167 refuses arbitrary ambiguous axes, incompatible topology and partial legends',()=>{
 for(const update of [
  x=>x.layout.axis={x:'east',z:'north'},
  x=>x.layout.axis={x:'west-to-east'},
  x=>x.layout.axis={x:'west-to-east',z:'entrance-front-to-rear',other:'bad'},
  x=>x.architecture.spatialTopology='east-gallery',
  x=>x.layout.spaces.pop(),
  x=>x.architecture.schema='different'
 ]){
  const x=JSON.parse(original());update(x);
  assert.throws(()=>deriveR167AxisForStudy(JSON.stringify(x)),
   /R167_AMBIGUOUS_AXIS_REQUIRES_HOLD/);
 }
});
test('R167 leaves explicit z or x unchanged and does not pretend host authorship',()=>{
 for(const axis of ['z','x']){
  const x=JSON.parse(original());x.layout.axis=axis;
  const raw=JSON.stringify(x),r=deriveR167AxisForStudy(raw);
  assert.equal(r.derivedRaw,raw);
  assert.equal(r.hostAxisDerivation,null);
 }
});
