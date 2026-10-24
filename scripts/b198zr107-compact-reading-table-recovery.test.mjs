import test from 'node:test';
import assert from 'node:assert/strict';
import {extractR106TableUnit} from './b198zr106-reading-table-doorway-reflow.mjs';
import {designR107CompactTable,auditR107AdjacentCorridor,
 buildR107CompactReadingStudy} from './b198zr107-compact-reading-table-recovery.mjs';
const tri=(a,b,c,kind)=>({a,b,c,kind});
const kind='right_R87_READING_TABLE_NOT_OCCUPANCY',side='right_R87_TABLE_SIDE';
const A=[.54,.025,-.1],B=[.572,.025,-.1],C=[.555,.025,.1],top=[A,B,C];
const base=top.map(p=>[p[0],0,p[2]]),table=[tri(A,B,C,kind)];
for(let i=0;i<3;i++){const j=(i+1)%3;
 table.push(tri(base[i],base[j],top[j],side),tri(base[i],top[j],top[i],side));
}
const nodes={
 entrance:[[0,.05,-1.11],[.53,.05,-1.11],[.53,.05,-.75]],
 westAccess:[[0,.05,-1.11],[-.53,.05,-1.11],[-.53,.05,-.75]],
 westAscent:[[-.53,.05,-.75],[-.53,.20,.72],[-.68,.20,.72],
  [-.68,.38,-.72],[-.53,.38,-.72],[-.53,.54,.72]],
 eastAscent:[[.53,.05,-.75],[.53,.24,.73],[.68,.24,.73],
  [.68,.44,-.72],[.53,.44,-.72],[.53,.64,.73],
  [.68,.64,.73],[.68,.80,-.72],[.68,.80,.35],[.55,.80,.35]]
};
test('R107 quick: source-bound compact real table and five corridor width witnesses',()=>{
 const unit=extractR106TableUnit(table,0);
 const shrunk=designR107CompactTable(unit,{scale:.6,dx:.065,dz:0});
 assert.equal(shrunk.faces.length,7);
 assert.equal(shrunk.faces[0].kind,kind);
 assert(shrunk.faces.slice(1).every(f=>f.kind===side));
 assert.throws(()=>designR107CompactTable(unit,{scale:0,dx:0,dz:0}),
  /SOURCE_R87_TABLE_AND_BOUNDED_COMPACT_MOVE_REQUIRED/);
 const a=[.53,0,-.1],b=[.58,0,-.1],c=[.53,0,.1],d=[.58,0,.1];
 const throat={middle:[a,b],terminal:[c,d]};
 const floor=[
  tri([.2,0,-.5],[.9,0,-.5],[.9,0,.5],'right_reading_terrace'),
  tri([.2,0,-.5],[.9,0,.5],[.2,0,.5],'right_reading_terrace')
 ];
 const five=auditR107AdjacentCorridor(floor,throat);
 assert.equal(five.surrogateLanes.length,5);
 assert.equal(five.allFiniteSourceLanesScreened,true);
 assert(five.surrogateLanes.every(x=>x.floor===0&&x.headroom===0));
 assert.equal(five.actualHumanBodySweptVolumeCertified,false);
});
test('R107 real: R106 relocated R87 table is screened across five lateral routes',()=>{
 const result=buildR107CompactReadingStudy(nodes),r=result.report;
 assert.equal(result.originalR98Faces.length,4692);
 assert.equal(r.originalR98Preserved,true);
 assert.equal(r.safety.readiness,'NOT_PREPARED');
 assert.deepEqual(r.safety.BuildPlan.operations,[]);
 assert.equal(r.priorR105SurrogateCorridorLanes.surrogateLanes.length,5);
 assert.equal(r.priorR106SurrogateCorridorLanes.surrogateLanes.length,5);
 assert.equal(r.selectedR107SurrogateCorridorLanes.surrogateLanes.length,5);
 assert.equal(r.actualHumanWalkingCertified,false);
 assert.equal(r.artQuality,'NOT_REVIEWED');
 if(r.repositionedExistingRealTable)
  assert(r.crossLaneVerifiedOffsets.length>0);
 if(r.furnitureRestoredInCompactForm)
  assert.equal(result.faces.length,result.r106Faces.length+7);
 console.log('R107_REAL_R91_FIVE_LANES',JSON.stringify({
  status:r.evaluationStatus,changed:r.alternativeR107Sha256!==r.originalR106Sha256,
  previous:r.previousR106FurnitureDisposition,
  verifiedOffsets:r.crossLaneVerifiedOffsets,
  old:r.priorR105SurrogateCorridorLanes.surrogateLanes.map(x=>
   [x.offset,x.floor,x.headroom,x.lateral]),
  moved:r.priorR106SurrogateCorridorLanes.surrogateLanes.map(x=>
   [x.offset,x.floor,x.headroom,x.lateral]),
  chosen:r.selectedR107SurrogateCorridorLanes.surrogateLanes.map(x=>
   [x.offset,x.floor,x.headroom,x.lateral])
 }));
});
