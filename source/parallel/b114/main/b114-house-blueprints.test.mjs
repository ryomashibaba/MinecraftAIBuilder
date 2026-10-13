import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const dir='b114-review-output/';
const sheets=['B114_HOUSE_V3_L0_Plan.svg','B114_HOUSE_V3_L1_Plan.svg',
 'B114_HOUSE_V3_Roof_Plan.svg','B114_HOUSE_V3_Stair_Sections.svg',
 'B114_HOUSE_V3_Four_Elevations.svg'];
test('all 5 viewable SVG sheets are static and source-labeled',()=>{
 for(const file of sheets){
  const s=fs.readFileSync(dir+file,'utf8');
  assert(s.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'));
  assert(s.includes('NOT_PREPARED'));assert(s.includes('worldContacts=0'));
  assert(s.includes('<title>'));assert(s.length>13000);
  assert(!/<script|<foreignObject|(?:xlink:)?href=|javascript:/i.test(s));
 }
});
test('two floor plans preserve room identities and stairs',()=>{
 const a=fs.readFileSync(dir+sheets[0],'utf8'),b=fs.readFileSync(dir+sheets[1],'utf8');
 assert(a.includes('S001'));assert(b.includes('S001'));assert(b.includes('S002'));
 assert(a.includes('STAIR 0'));assert(a.includes('STAIR 1'));
});
test('roof and stair sections explicitly withhold physical certification',()=>{
 const roof=fs.readFileSync(dir+sheets[2],'utf8');
 const sec=fs.readFileSync(dir+sheets[3],'utf8');
 assert(roof.includes('NOT weatherproof certified'));
 assert(sec.includes('CUT z=12'));assert(sec.includes('CUT z=15'));
 assert(sec.includes('collision unverified'));
});
test('four facades and manifest are non-executable',()=>{
 const el=fs.readFileSync(dir+sheets[4],'utf8');
 for(const side of ['N','S','E','W'])assert(el.includes(side+' / EXTERIOR PROJECTION'));
 const md=fs.readFileSync(dir+'B114_HOUSE_V3_Visual_Review_Index.md','utf8');
 assert(md.includes('BuildPlan.operations=[]'));
 for(const file of sheets)assert(md.includes(file));
});