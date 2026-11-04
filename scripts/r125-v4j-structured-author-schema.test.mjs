import test from 'node:test';
import assert from 'node:assert/strict';
import {V4J_STRUCTURED_CIVIC_JSON_SCHEMA as s,
 V4J_STRUCTURED_RESPONSE_FORMAT as fmt,V4J_STRUCTURED_SYSTEM_PROMPT as p,
 V4J_STRUCTURED_PROTOCOL as v} from '../source/ai/r125-v4j-structured-author-schema.mjs';
import {CIVIC_ARCADE_SCHEMA}
 from '../source/ai/r125-v4j-civic-author-ir.mjs';
import {V4J_PRECISION_SYSTEM_PROMPT}
 from '../source/ai/r125-v4j-precision-prompt.mjs';

test('one strict shared schema, distinct author-defined geometry: all 11 real compiler root keys',()=>{
 assert.deepEqual(s.required,[
  'schema','id','title','brief','materials','spaces',
  'massing','wing','floorplate','atrium','mezzanine','arcade']);
 assert.equal(s.additionalProperties,false);
 assert.deepEqual(s.properties.schema.enum,[CIVIC_ARCADE_SCHEMA]);
 assert.equal(s.properties.spaces.minItems,3);
 assert.equal(s.properties.spaces.maxItems,5);
 for(const shape of s.properties.spaces.items.oneOf){
  assert.equal(shape.additionalProperties,false);
  assert.equal(shape.required.length,12);
  assert(shape.required.includes('windowPriority'));
  assert.equal(shape.properties.attach.anyOf.length,2);
 }
 assert.equal(s.properties.massing.additionalProperties,false);
 assert.equal(s.properties.wing.additionalProperties,false);
 assert.equal(s.properties.atrium.additionalProperties,false);
 assert.equal(s.properties.arcade.properties.roofline.minItems,3);
 assert.equal(s.properties.arcade.properties.roofline.maxItems,3);
 assert.equal(fmt.type,'json_schema');
 assert.equal(fmt.json_schema.strict,true);
 assert.deepEqual(fmt.json_schema.schema,s);
 assert.equal(v,'V4J_SINGLE_RESPONSE_SCHEMA_GUIDED_V3');
});
test('V3 preserves independent authorship and math feasibility instead of host repair',()=>{
 assert(p.includes(V4J_PRECISION_SYSTEM_PROMPT));
 assert(p.includes('2*cutWidth+6'));
 assert(p.includes('2*cutDepth+6'));
 assert(p.includes('ALL earlier rooms'));
 assert(p.includes('no silent repair'));
 assert(!p.includes('example-house'));
 assert(!p.includes('example-shop'));
 const snap=JSON.stringify(s);
 for(const word of ['housing','shop','research','gallery','station']){
  assert(!snap.includes('"'+word+'"'));
 }
});
