import test from 'node:test';
import assert from 'node:assert/strict';
import {straightModel} from '../../b119/main/b119-full-stair-3d-search.mjs';
import {buildB120UTurn} from '../../b120/main/b120-u-return-screener.mjs';
import {auditB124StairCorridor3D} from '../../b124/main/b124-3d-transition-audit.mjs';
import {auditB125FineLanding} from './b125-fine-landing-proof.mjs';
const P=(x,z)=>({x,z});
function testCase(shape='STRAIGHT_HALF_STEP_PROXY'){
 const model=shape==='STRAIGHT_HALF_STEP_PROXY'?
  straightModel(P(4,4),{dx:1,dz:0},0):
  buildB120UTurn({origin:P(4,4),ascent:{dx:1,dz:0},fromLevel:0,firstRise:2});
 const floor={footprintRows:Array(30).fill('1'.repeat(30)),rooms:[],gallery:[]};
 const makeRoute=l=>{const x=Math.max(...l.map(p=>p.x))+1;
  const z=Math.min(...l.map(p=>p.z));
  return [P(x,z),P(x,z+1),P(x+1,z),P(x+1,z+1)];};
 const lower=makeRoute(model.lowerLanding),upper=makeRoute(model.upperLanding);
 const b124=auditB124StairCorridor3D({model,lowerFloor:floor,upperFloor:floor,
  lowerRoute:lower,upperRoute:upper});
 return {shape,model,upperFloor:floor,protectedUpperWalk:new Set(),
  previousB124:b124,sourceVoxels:[],foreignStairSolids:[]};
}
test('independently reconstructs all signed-grid half-step sample boxes',()=>{
 const a=testCase(),r=auditB125FineLanding(a);
 assert(r.fineSampleCount>=10);
 assert.equal(r.independentlyReplayedOpeningCells,a.previousB124.conceptualNewUpperOpeningCells);
 assert.equal(r.educationStepCollision,'UNVERIFIED');
 assert.equal(r.educationStairBlockStateOrientation,'UNVERIFIED');
 assert.equal(r.physicalTraversalCertified,false);
 assert.equal(r.constructionAllowed,false);
 assert.deepEqual(r.BuildPlanOperations,[]);
});
test('180 degree U-turn samples are bound to the original B120 conservative sweep',()=>{
 const a=testCase('B120_BOUNDED_U_RETURN_5_RISE'),r=auditB125FineLanding(a);
 assert(r.fineSampleCount>10);
 assert.equal(r.independentlyReplayedOpeningCells,a.previousB124.conceptualNewUpperOpeningCells);
 assert.equal(r.maxLocalStepRise<=.5+1e-7,true);
});
test('detect protected gallery cut cells rather than accepting all eight openings',()=>{
 const a=testCase();
 assert(a.previousB124.conceptualOpeningSamples.length>0);
 a.protectedUpperWalk.add(a.previousB124.conceptualOpeningSamples[0].x+','+
  a.previousB124.conceptualOpeningSamples[0].z);
 assert(auditB125FineLanding(a).findingCodes.includes('CUT_REMOVES_PROTECTED_B113_GALLERY'));
});
test('protected room under a proposed opening blocks conceptual cut',()=>{
 const a=testCase(),p=a.previousB124.conceptualOpeningSamples[0];
 a.upperFloor={...a.upperFloor,rooms:[{x:p.x,z:p.z,width:1,depth:1}]};
 assert(auditB125FineLanding(a).findingCodes.includes('CUT_OVER_PROTECTED_ROOM'));
});
test('upper source voxel intrusion is reported on exact fine sample body',()=>{
 const a=testCase(),p=a.model.upperLanding[0];
 a.sourceVoxels=[{x:p.x,y:6,z:p.z,kind:'TEST_WALL'}];
 const r=auditB125FineLanding(a);
 assert(r.findingCodes.includes('FINE_BODY_INTERSECTS_UNCHANGED_B105_SOLID'));
});
test('foreign stair solids intersecting fine upper samples are recorded without approval',()=>{
 const a=testCase();a.foreignStairSolids=[{...a.model.body.at(-1)}];
 const r=auditB125FineLanding(a);
 assert(r.findingCodes.includes('FINE_BODY_INTERSECTS_FOREIGN_STAIR'));
 assert.equal(r.approvedSourceEdits,0);
});
test('fail closed when original coarse sweep or the B124 opening list no longer matches',()=>{
 const a=testCase();a.model.body[1].x+=.125;
 assert.throws(()=>auditB125FineLanding(a),/B125_FINE_SAMPLE_NOT_PINNED_TO_SOURCE_SWEEP/);
 const b=testCase();b.previousB124.conceptualNewUpperOpeningCells+=1;
 assert.throws(()=>auditB125FineLanding(b),/B125_B124_SLAB_EVIDENCE_DRIFT/);
});
test('missing landing support is a hold, not an implicit construction permission',()=>{
 const a=testCase(),p=a.model.upperLanding[0];
 const rows=[...a.upperFloor.footprintRows];
 rows[p.z]=rows[p.z].slice(0,p.x)+'0'+rows[p.z].slice(p.x+1);
 a.upperFloor={...a.upperFloor,footprintRows:rows};
 a.previousB124=auditB124StairCorridor3D({model:a.model,lowerFloor:a.upperFloor,
  upperFloor:a.upperFloor,lowerRoute:[P(15,10),P(15,11)],upperRoute:[P(15,10),P(15,11)]});
 const r=auditB125FineLanding(a);
 assert(r.findingCodes.includes('UPPER_LANDING_TWO_CELL_FLOOR_SUPPORT_NOT_PRESERVED'));
 assert.equal(r.structuralBearingAndRetainedSlabLoad,'UNVERIFIED');
});
