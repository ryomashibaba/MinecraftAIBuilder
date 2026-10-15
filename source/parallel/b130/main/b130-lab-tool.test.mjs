import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createB129CalibrationPlan} from '../../b129/main/b129-repeated-calibration.mjs';
import {inspectB130Package,addB130ManualObservation} from './b130-lab-tool.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const digest=sha('B130_SYNTHETIC_SOURCE_DIGEST_NO_REAL_MINECRAFT');
const make=()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'b130-offline-'));
 fs.writeFileSync(path.join(dir,'B129_Isolated_Calibration_Protocol.json'),
 JSON.stringify(createB129CalibrationPlan(digest,'FORWARD_UPPER_HALF')));
 return dir;
};
const proof=(root,id)=>{
 const p=path.join(root,'synthetic-'+id+'.png');
 fs.writeFileSync(p,Buffer.from('SYNTHETIC-ONLY-'+id));
 return p;
};
const take=(root,trial,value,stamp,extra={})=>
 addB130ManualObservation({
 root,trialId:trial,educationVersion:'1.26.32.0',
 stateValue:value,observedUpperHalfShape:'FORWARD_UPPER_HALF',
 proofFile:proof(root,trial),readbackConfirmed:true,
 observedAt:stamp,...extra
 });
const at=(round,minute)=>'2026-10-15T'+(round===1?'09':'10')+':'+
 String(minute).padStart(2,'0')+':00Z';
test('B130 starts fully blank and does not have an actual Education mapping',t=>{
 const root=make();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const {status,batch}=inspectB130Package(root);
 assert.equal(batch.receipts.length,0);
 assert.equal(status.totalTrialSlots,8);
 assert.equal(status.remainingTrialIds.length,8);
 assert.equal(status.claimConsistentDirectionMappings,24);
 assert.equal(status.educationBlockstatesCertified,false);
 assert.equal(status.realMovementCertified,false);
 assert.equal(status.worldContacts,0);
});
test('a manually selected synthetic image is locally copied and hashed, never uploaded',t=>{
 const root=make();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const r=take(root,'LAB-R1-EAST',3,at(1,0));
 assert.equal(r.humanClaimedReceiptCount,1);
 assert.equal(r.remainingTrialIds.length,7);
 assert.equal(r.claimConsistentDirectionMappings,6);
 const record=JSON.parse(fs.readFileSync(path.join(root,'data','B130_Observation_Receipts.json')));
 const hash=record.receipts[0].observations[0].evidenceSha256;
 assert.match(hash,/^[a-f0-9]{64}$/);
 assert.equal(fs.readdirSync(path.join(root,'evidence')).length,1);
 assert.equal(record.receipts[0].observations[0].traversalClaim,'NOT_TESTED');
 assert(!JSON.stringify(record).includes(root));
 assert.equal(r.constructionAllowed,false);
});
test('two rounds x four directions can complete administrative checklist but not game certification',t=>{
 const root=make();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const vals={EAST:3,NORTH:0,WEST:2,SOUTH:1};
 let final;
 for(let round=1;round<=2;round++)for(const [i,face] of
  ['EAST','NORTH','WEST','SOUTH'].entries()){
  final=take(root,'LAB-R'+round+'-'+face,vals[face],at(round,i));
 }
 assert.equal(final.humanClaimedReceiptCount,8);
 assert.equal(final.remainingTrialIds.length,0);
 assert.equal(final.claimConsistentDirectionMappings,1);
 assert.equal(final.warningStatus,'READY_FOR_INDEPENDENT_MANUAL_EVIDENCE_REVIEW_NOT_CERTIFIED');
 assert.equal(final.evidenceAuthenticityIndependentlyCertified,false);
 assert.equal(final.educationBlockstatesCertified,false);
 assert.equal(final.realMovementCertified,false);
 assert.deepEqual(final.operations,[]);
});
test('the readback confirmation must be explicit before accessing an image',t=>{
 const root=make();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 assert.throws(()=>addB130ManualObservation({root,trialId:'LAB-R1-EAST',
  readbackConfirmed:false,proofFile:'/nonexistent/private.png'}),
 /B130_READBACK_NOT_EXPLICITLY_CONFIRMED/);
 assert.equal(fs.existsSync(path.join(root,'data')),false);
});
test('no slot can be silently overwritten, direction labels are fixed',t=>{
 const root=make();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 take(root,'LAB-R1-EAST',3,at(1,0));
 assert.throws(()=>take(root,'LAB-R1-EAST',3,at(1,1)),/B130_TRIAL_ALREADY_RECORDED/);
 assert.throws(()=>take(root,'LAB-R3-EAST',3,at(1,2)),/B130_UNKNOWN_CALIBRATION_TRIAL/);
 assert.equal(inspectB130Package(root).status.humanClaimedReceiptCount,1);
});
test('contradictory direction claims cannot become even a partial receipt',t=>{
 const root=make();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 take(root,'LAB-R1-EAST',3,at(1,0));
 assert.throws(()=>take(root,'LAB-R1-NORTH',3,at(1,1)),/B128_CONTRADICTORY_STATE_TO_FACING/);
 assert.equal(inspectB130Package(root).status.humanClaimedReceiptCount,1);
});
test('same manually selected proof digest is rejected across trials',t=>{
 const root=make();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const picture=proof(root,'same');
 const common={root,educationVersion:'1.26.32.0',observedUpperHalfShape:'FORWARD_UPPER_HALF',
  proofFile:picture,readbackConfirmed:true};
 addB130ManualObservation({...common,trialId:'LAB-R1-EAST',stateValue:3,observedAt:at(1,0)});
 assert.throws(()=>addB130ManualObservation({...common,trialId:'LAB-R1-NORTH',
  stateValue:0,observedAt:at(1,1)}),/B128_BAD_OR_DUPLICATED_OBSERVATION/);
 assert.equal(inspectB130Package(root).status.humanClaimedReceiptCount,1);
});
test('a reported reverse half-step shape causes HOLD rather than approval',t=>{
 const root=make();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const r=take(root,'LAB-R1-EAST',3,at(1,0),{
  observedUpperHalfShape:'REVERSE_UPPER_HALF'});
 assert.equal(r.warningStatus,'HOLD_REPORTED_SHAPE_DIFFERS_FROM_SOURCE');
 assert.equal(r.constructionAllowed,false);
});
test('a second-round observation inside 60 seconds is a HOLD',t=>{
 const root=make();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 take(root,'LAB-R1-EAST',3,at(1,0));
 const r=take(root,'LAB-R2-EAST',3,at(1,0));
 assert.equal(r.warningStatus,'HOLD_REPEAT_TIME_OR_ORDER');
});
test('all accepted evidence copies are verified again on every run',t=>{
 const root=make();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 take(root,'LAB-R1-EAST',3,at(1,0));
 const ev=path.join(root,'evidence',fs.readdirSync(path.join(root,'evidence'))[0]);
 fs.writeFileSync(ev,'MUTATED');
 assert.throws(()=>inspectB130Package(root),/B130_EVIDENCE_IMAGE_TAMPERED/);
});
test('unknown extensions, empty proof, oversized image and symlinks are rejected',t=>{
 const root=make();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const bad=path.join(root,'private.txt');fs.writeFileSync(bad,'not image');
 assert.throws(()=>take(root,'LAB-R1-EAST',3,at(1,0),{proofFile:bad}),/B130_UNSUPPORTED_EVIDENCE_IMAGE/);
 const empty=path.join(root,'empty.png');fs.writeFileSync(empty,'');
 assert.throws(()=>take(root,'LAB-R1-EAST',3,at(1,0),{proofFile:empty}),/B130_BAD_EVIDENCE_FILE/);
 const large=path.join(root,'big.png');fs.writeFileSync(large,Buffer.alloc(25*1024*1024+1));
 assert.throws(()=>take(root,'LAB-R1-EAST',3,at(1,0),{proofFile:large}),/B130_BAD_EVIDENCE_FILE/);
});
test('wrong version or missing real state value never produces a valid record',t=>{
 const root=make();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 assert.throws(()=>take(root,'LAB-R1-EAST',NaN,at(1,0)),/B130_STATE_VALUE_MUST_BE_READBACK_0_TO_3/);
 assert.throws(()=>take(root,'LAB-R1-EAST',3,at(1,0),{educationVersion:'Bedrock'}),/B128_BAD_RECEIPT_OR_VERSION_OR_SCOPE/);
 assert.equal(inspectB130Package(root).status.humanClaimedReceiptCount,0);
});
