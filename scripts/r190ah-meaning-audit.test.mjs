import test from 'node:test';
import assert from 'node:assert/strict';
import {auditR190AHMeaning} from '../source/ai/r190ah-meaning-audit.mjs';
const spaces = [
 {id:'arrival',privacy:'public',purpose:'Reception'},
 {id:'staff',privacy:'private',purpose:'Staff office'},
 {id:'gallery',privacy:'public',purpose:'Gallery'}
];
const plan = {entrySpaceId:'arrival',spaces};
const tree = {portals:[{a:'arrival',b:'staff'},{a:'staff',b:'gallery'}]};
test('public access through private demands review but never modifies design',()=>{
 const before=JSON.stringify(plan);
 const result=auditR190AHMeaning(plan,tree,{sourceRoutesVerified:true});
 assert.deepEqual(result.publicSharedAccess.needsReview,['gallery']);
 assert.equal(result.functionalPrivacyCertified,false);
 assert.equal(result.sourceRoutesVerified,true);
 assert.equal(JSON.stringify(plan),before);
});
test('explicit direct public link avoids the private transit risk',()=>{
 const added={portals:[...tree.portals,{a:'arrival',b:'gallery'}]};
 const result=auditR190AHMeaning(plan,added);
 assert.deepEqual(result.publicSharedAccess.needsReview,[]);
 assert.equal(result.status,'ADVISORY_NO_PRIVATE_TRANSIT_DETECTED');
 assert.equal(result.sourceRoutesVerified,false);
});
test('private entrance requires independent review for public destinations',()=>{
 const p={entrySpaceId:'arrival',spaces:spaces.map(s=>({...s}))};
 p.spaces[0].privacy='private';
 const a=auditR190AHMeaning(p,tree);
 assert.deepEqual(a.publicSharedAccess.needsReview,['gallery']);
});
test('portal graph silently referencing missing rooms is rejected',()=>{
 assert.throws(()=>auditR190AHMeaning(plan,{portals:[{a:'arrival',b:'missing'}]}),/INVALID_PORTAL_GRAPH/);
});
