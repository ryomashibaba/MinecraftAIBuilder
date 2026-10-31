import test from 'node:test';
import assert from 'node:assert/strict';
import {elevationR190BZ} from './r190bz-open-shell-study.mjs';

const synthetic={
 bounds:{width:9,height:10,depth:8},
 primitives:[[2,4,5,3,0]]
};
const only=(svg)=>[...svg.matchAll(/<rect\s/g)].length;
test('Camera elevation x/y mapping: side views use depth u and height v independently',()=>{
 const expected={
  front:[12,30,54,60],
  rear:[12,30,54,60],
  west:[30,30,48,60],
  east:[30,30,48,60],
  roof:[12,30,54,48]
 };
 for(const [view,[x,y,w,h]] of Object.entries(expected)){
  const svg=elevationR190BZ(synthetic,view);
  assert.ok(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'));
  assert.ok(svg.includes('aria-label="R190-BZ true occupied voxels '+view+' view" viewBox="0 0 '+w+' '+h+'"'));
  assert.ok(svg.includes('<rect x="'+x+'" y="'+y+'" width="6" height="6" fill="#7dc0ea"/>'),view);
  assert.equal(only(svg),2,view);
  assert.ok(svg.endsWith('</svg>'));
 }
});
