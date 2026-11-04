import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyPrivateCompilerRejection,safeStaticCompilerRejectCode,
 UNKNOWN_COMPILER_REJECT} from './r125-v4d-compiler-reject-codes.mjs';
test('audited compiler errors classify to public static code only',()=>{
 assert.equal(classifyPrivateCompilerRejection('R125_V4E_MASSING_PRIMARY_VOLUME_TOO_SMALL'),
  'MASSING_PRIMARY_VOLUME_TOO_SMALL');
 assert.equal(classifyPrivateCompilerRejection('R125_V4D_GRAPH_LINK_GEOMETRY'),
  'GRAPH_LINK_GEOMETRY');
 assert.equal(classifyPrivateCompilerRejection('R125_V4D_COMPACT_ROOT'),'COMPACT_ROOT');
 assert.equal(classifyPrivateCompilerRejection(
  'R125_V4J_CIVIC_AUTHOR_ONE_ORIGINAL_JSON_WITH_COMPLETE_PUBLIC_ARCHITECTURE'),
  'CIVIC_AUTHOR_ONE_ORIGINAL_JSON_WITH_COMPLETE_PUBLIC_ARCHITECTURE');
});
test('indices and author-chosen IDs never escape PRIVATE source report',()=>{
 assert.equal(classifyPrivateCompilerRejection('R125_V4D_COMPACT_PARENT_BEFORE_CHILD_1'),
  'COMPACT_PARENT_BEFORE_CHILD');
 assert.equal(classifyPrivateCompilerRejection('R125_V4D_COMPACT_MATERIALS_wall'),
  'COMPACT_MATERIALS_ENUM');
 assert.equal(classifyPrivateCompilerRejection(
  'R125_V4D_GRAPH_REAL_PUBLIC_FLOOR-private-building'),
  'GRAPH_REAL_PUBLIC_FLOOR');
});
test('unknown raw strings are not shared',()=>{
 for(const x of ['private prompt','R125_V4D_COMPACT_ROOT private',
  'R125_V4E_MASSING_UNKNOWN','R125_V4D_GRAPH_PUBLIC_FLOOR_secret room',
  42,null]){
  assert.equal(classifyPrivateCompilerRejection(x),UNKNOWN_COMPILER_REJECT);
  assert.equal(safeStaticCompilerRejectCode(x),UNKNOWN_COMPILER_REJECT);
 }
 assert.equal(safeStaticCompilerRejectCode('COMPACT_ROOT'),'COMPACT_ROOT');
});
