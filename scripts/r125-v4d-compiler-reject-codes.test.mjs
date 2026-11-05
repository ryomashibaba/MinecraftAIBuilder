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
  'R125_V4D_GRAPH_REAL_PUBLIC_FLOOR_private-building'),
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

test('V5 entry contract rejects with allowlisted private-safe error families',()=>{
 for(const token of ['ROOT_FIELDS','ROOT_ENTRY_CONTRACT',
  'OTHER_SPACES_COUNT','CHILD_ATTACHMENT_REQUIRED']){
  assert.equal(classifyPrivateCompilerRejection('R125_V4K_ENTRY_FIRST_'+token),
   'ENTRY_FIRST_'+token);
  assert.equal(safeStaticCompilerRejectCode('ENTRY_FIRST_'+token),
   'ENTRY_FIRST_'+token);
 }
});

test('V6 root-north prohibition has explicit private-safe error codes',()=>{
 for(const token of ['ROOT_FIELDS','ENTRY_CONTRACT','SPACES_COUNT',
  'PARENT_BEFORE_CHILD','ROOT_NORTH_FORBIDDEN','PARENT_ID']){
  const code='PARENT_INDEX_'+token;
  assert.equal(classifyPrivateCompilerRejection('R125_V4L_PARENT_INDEX_'+token),code);
  assert.equal(safeStaticCompilerRejectCode(code),code);
 }
});

test('relative SOURCE compiler emits only redacted allowlisted failure codes',()=>{
 const fixed=['ATTACH_SIDE','ROOT','ENTRY','ROOT_MUST_BE_COVERED',
  'LOCAL_SITE_TOO_LARGE_OR_COLLIDING','TOO_MANY_LINKS',
  'B143_ROUTE_AND_WORLD_HOLD'];
 for(const token of fixed){
  const safe='RELATIVE_'+token;
  assert.equal(classifyPrivateCompilerRejection('R125_V4D_RELATIVE_'+token),safe);
  assert.equal(safeStaticCompilerRejectCode(safe),safe);
 }
 for(const [raw,safe] of [
  ['R125_V4D_RELATIVE_SPACE_3','RELATIVE_SPACE_FIELDS'],
  ['R125_V4D_RELATIVE_EXTRA_LINK_1','RELATIVE_EXTRA_LINK_FIELDS'],
  ['R125_V4D_RELATIVE_COVERED_INTENT_private-room','RELATIVE_COVERED_INTENT'],
  ['R125_V4D_RELATIVE_SKY_INTENT_private-room','RELATIVE_SKY_INTENT'],
  ['R125_V4D_RELATIVE_ATTACH_private-room','RELATIVE_ATTACH'],
  ['R125_V4D_RELATIVE_WINDOW_INTENT_private-room_1','RELATIVE_WINDOW_INTENT']]){
  assert.equal(classifyPrivateCompilerRejection(raw),safe);
  assert.equal(safeStaticCompilerRejectCode(safe),safe);
  assert(!safe.includes('private-room'));
 }
});
test('relative compiler reject classifier refuses unsafe identifiers, messages and token overflow',()=>{
 for(const raw of [
  'R125_V4D_RELATIVE_ATTACH_private room',
  'R125_V4D_RELATIVE_ATTACH_private-room EXTRA PRIVATE TEXT',
  'R125_V4D_RELATIVE_WINDOW_INTENT_private-room_5',
  'R125_V4D_RELATIVE_SPACE_12',
  'R125_V4D_RELATIVE_UNKNOWN',
  'R125_V4D_RELATIVE_ATTACH_'+ 'x'.repeat(245),
  'C:\\Users\\PRIVATE\\R125_V4D_RELATIVE_ENTRY']){
  assert.equal(classifyPrivateCompilerRejection(raw),UNKNOWN_COMPILER_REJECT);
 }
});
