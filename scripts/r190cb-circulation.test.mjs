import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {compileR190CB,SCHEMA} from '../source/ai/r190cb-architectural-circulation.mjs';
const raw=()=>fs.readFileSync(new URL('../evidence/r190cb/RIFT_LANTERN.json',import.meta.url));
const doc=()=>JSON.parse(raw());
const run=d=>compileR190CB(Buffer.from(JSON.stringify(d)));
test('Authored switchback is a real source voxel corridor with every 2x2 step supported and head-clear',()=>{
 const a=compileR190CB(raw());
 assert.ok(a.primitives.length>12000);
 assert.equal(a.metrics.validStairNodes,a.metrics.authoredNodeCount);
 assert.equal(a.metrics.authoredNodeCount,267);
 assert.deepEqual(a.metrics.firstNode,[44,7,35]);
 assert.deepEqual(a.metrics.lastNode,[72,91,35]);
 assert.ok(a.metrics.protectedVoidResults.every(q=>q.pass));
 assert.ok(a.metrics.programMetrics.length>=6);
 assert.equal(a.worldContacts,0);assert.equal(a.worldWrites,0);
 assert.deepEqual(a.gates,Array(9).fill('BLOCKED'));
 assert.deepEqual(a.BuildPlan.operations,[]);
 assert.equal(a.artGate,'ART_HOLD_AWAITING_VISUAL_REVIEW');
 assert.equal(a.functionGate,'HOLD_AUTHOR_ROUTE_PROXY_ONLY');
});
test('Source hash deterministic and byte-for-byte source never overwritten',()=>{
 const before=raw(),save=Buffer.from(before),a=compileR190CB(before),b=compileR190CB(before);
 assert.equal(a.geometrySha256,b.geometrySha256);
 assert.equal(a.originalRawSha256,b.originalRawSha256);
 assert.deepEqual(before,save);
});
test('Unknown fields, unapproved world coordinates and model spoofing are forbidden',()=>{
 const a=doc();a.worldCoordinates=[0,10,0];
 assert.throws(()=>run(a),/R190CB_FORMAT/);
 const b=doc();b.schema=SCHEMA+'-fake';
 assert.throws(()=>run(b),/R190CB_FORMAT/);
});
test('Impossible riser transition rejects without invented stair or automatic repair',()=>{
 const a=doc();a.circulation.nodes[3][0]+=4;
 assert.throws(()=>run(a),/R190CB_UNSUPPORTED_TRANSITION/);
});
test('Changing true mass design origin to unrelated BM request fails closed',()=>{
 const a=doc();a.architecture.originalBriefSha256='a'.repeat(64);
 assert.throws(()=>run(a),/R190CB_BRIEF/);
});
