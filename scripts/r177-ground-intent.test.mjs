import test from 'node:test';
import assert from 'node:assert/strict';
import {validateR177GroundIntent,r177ToR160,R177_SCHEMA}
 from '../source/ai/r177-ground-intent.mjs';
import {deriveR176GroundFootprint}
 from '../source/ai/r176-ground-footprint.mjs';
import {buildR172Autoreview} from './r172-ci-autoreview.mjs';

const core={schema:R177_SCHEMA,entryHierarchy:'quiet',
 daylightStrategy:'even',roofEdge:'fine',spatialTopology:'central-spine'};
const make=(corner='rear-east',spanX=5,spanZ=5)=>({
 ...core,groundShape:{kind:'open-corner-court',corner,spanX,spanZ}
});

test('R177 strict source-independent ground-shape IR accepts only explicit measured intent',()=>{
 const example=make();
 assert.equal(validateR177GroundIntent(example),true);
 const old=r177ToR160(example);
 assert.equal(old.schema,'minecraftaibuilder-r160-topology-ir-v1');
 assert.ok(!Object.hasOwn(old,'groundShape'));
 assert.equal(old.spatialTopology,'central-spine');
 for(const invalid of [
  {...example,unexpected:'hidden-template'},
  {...example,groundShape:{...example.groundShape,extra:1}},
  make('center',5,5),make('rear-east',7,5),
  make('rear-east',4,2),make('rear-east',4.5,4),
  {...example,spatialTopology:'anything'},
  {...example,groundShape:{...example.groundShape,kind:'sculptural-style'}}
 ]) assert.throws(()=>validateR177GroundIntent(invalid));
});

test('R177 explicit caller shape is faithfully realized, never silently substituted',()=>{
 const cases=buildR172Autoreview().cases;
 assert.equal(cases.length,3);
 for(const c of cases){
  const geometry=c.grounded.r176GroundFootprintEvidence;
  assert.equal(geometry.exactCallerRequestRealized,true);
  assert.equal(geometry.courtAt,c.audit.r177RequestedGroundShape.corner);
  assert.equal(geometry.actualSpanX,c.audit.r177RequestedGroundShape.spanX);
  assert.equal(geometry.actualSpanZ,c.audit.r177RequestedGroundShape.spanZ);
  assert.ok(geometry.removedActualY1FloorCells>=9);
  assert.equal(geometry.protectedOtherCellsUnchanged,true);
  assert.equal(geometry.unchangedFurnishingVoxelCells,true);
  assert.equal(c.grounded.constructionApproved,false);
  assert.equal(c.grounded.worldWrites,0);
  assert.deepEqual(c.grounded.BuildPlan.operations,[]);
 }
 const home=cases.find(c=>c.id==='home');
 const impossible=make('front-west',3,3);
 assert.throws(()=>deriveR176GroundFootprint(home.massed,{groundIntent:impossible}),
  /R176_GROUND_FOOTPRINT_MODEL_REQUESTED_/);
 assert.throws(()=>deriveR176GroundFootprint(home.massed,{groundIntent:make('center',5,5)}),
  /R177_STRICT_CORNER_AND_EXTENTS/);
});
