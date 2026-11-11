/**
 * Research-only public SOURCE contract witness, no PRIVATE/model/network/world IO.
 * This is synthetic architectural topology, NOT the user's Qwen original.
 * It proves a whole-side ranking rejection can coexist with an acceptable
 * non-linked six-wide facade window in the frozen spatial graph contract.
 * Run from a checkout: node --test scripts/research/r125-v6-corner-facade-contract.test.mjs
 * No B143 ART or Minecraft construction approval is implied.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateRankedExteriorIntent,proveRankedExteriorPhysicalGlazing,RANKED_SCHEMA} from
 '../../source/ai/r125-v4e-ranked-exterior-ir.mjs';
import {translateCompactModelIntent,compileCompactModelIntent,COMPACT_SCHEMA} from
 '../../source/ai/r125-v4d-compact-model-ir.mjs';
import {translateRelativeAuthorIntent} from
 '../../source/ai/r125-v4d-relative-author-ir.mjs';

const mkSpace=(id,purpose,kind,attach)=>({
 id,purpose,kind,width:24,depth:24,
 roof:kind==='sky'?null:'ridgeX',height:kind==='sky'?null:'low',
 facade:kind==='sky'?null:'wall',windowSide:kind==='sky'?null:'none',
 feature:'Educational service station',featureMaterial:'wood',attach
});
function author(){
 return {
  schema:COMPACT_SCHEMA,id:'public-corner-facade-witness',
  title:'Corner overlap geometry study',
  brief:'Research-only synthetic four-zone plan for a public facade contract witness',
  materials:{floor:'wood',wall:'stone',roof:'wood',public:'stone'},
  spaces:[
   mkSpace('root-hall','Main public reception and circulation','covered',null),
   mkSpace('middle-hall','Adjacent public learning hall','covered',
    {to:'root-hall',side:'east',shift:0}),
   mkSpace('open-court','Outdoor teaching courtyard','sky',
    {to:'middle-hall',side:'north',shift:0}),
   mkSpace('east-studio','Additional enclosed education studio','covered',
    {to:'middle-hall',side:'east',shift:0})
  ]
 };
}
const endX=n=>n.x+n.width-1;
const endZ=n=>n.z+n.depth-1;
const overlap=(a,b,c,d)=>Math.max(a,c)<=Math.min(b,d);
function touchingOnlyAtSouthCorner(hall,other){
 const xOverlap=Math.min(endX(hall),endX(other))-
  Math.max(hall.x,other.x)+1;
 const zOverlap=Math.min(endZ(hall),endZ(other))-
  Math.max(hall.z,other.z)+1;
 return xOverlap===1&&zOverlap===hall.depth;
}

test('V4E whole-face ranking can reject a valid nonlinked 6-wide south glazing candidate',()=>{
 const base=author();
 const ranked=structuredClone(base);
 ranked.schema=RANKED_SCHEMA;
 for(const room of ranked.spaces){
  delete room.windowSide;
  room.windowPriority=room.kind==='covered'?['north','east','west','south']:null;
 }
 const frozen=structuredClone(ranked);
 assert.throws(()=>translateRankedExteriorIntent(ranked),
  /R125_V4E_RANKED_NO_AUTHORED_EXTERIOR_OPTION_1$/);
 assert.deepEqual(ranked,frozen,'Original author decisions must not mutate');

 // Only for a SOURCE contract counterexample: unlike the ranked contract,
 // compact authoring can select this already-authored SOUTH direction.
 const compact=author();
 compact.spaces[1].windowSide='south';
 const expanded=translateCompactModelIntent(compact);
 const plan=translateRelativeAuthorIntent(expanded.expandedMechanicalIR).plan;
 const hall=plan.nodes[1],root=plan.nodes[0],studio=plan.nodes[3];
 assert.deepEqual([hall.x,hall.z,hall.width,hall.depth],[71,42,24,24]);
 assert.deepEqual([root.x,root.z,studio.x,studio.z],[48,42,94,42]);
 // Root and studio touch the middle hall at its west/east seam, but both
 // share exactly one corner voxel with the SOUTH face, not its center.
 assert(touchingOnlyAtSouthCorner(hall,root));
 assert(touchingOnlyAtSouthCorner(hall,studio));
 const w=plan.windows.find(w=>w.nodeId==='middle-hall');
 assert(w);
 assert.deepEqual([w.side,w.span,w.offset,w.sillY,w.height],
  ['south',6,9,5,3]);
 const wx0=hall.x+w.offset,wx1=wx0+w.span-1,faceZ=endZ(hall);
 assert.deepEqual([wx0,wx1,faceZ],[80,85,65]);
 for(const other of plan.nodes.filter(n=>n.id!==hall.id)){
  assert(!(
   overlap(other.x,endX(other),wx0,wx1)&&
   overlap(other.z,endZ(other),faceZ,faceZ+1)
  ),'Entire authored window interval must be unoccupied');
 }
 assert(!plan.links.some(l=>(l.from===hall.id&&l.side==='south')||
  (l.to===hall.id&&l.side==='north')),
  'No protected 2-wide portal exists on hall south face');
 assert.equal(plan.nodes.length,4);
 assert.equal(plan.links.length,3);
});


test('same authored topology: TRUE frozen B143 glass, interior/exterior air and routes',()=>{
 // Counterfactual synthetic AUTHOR selection: the south face was always a
 // lower-ranked ORIGINAL preference, not a host-invented new direction.
 // This must never be used to promote the unrelated PRIVATE Qwen original.
 const compact=author();
 compact.spaces[1].windowSide='south';
 const original=structuredClone(compact);
 const compiled=compileCompactModelIntent(compact);
 assert.deepEqual(compact,original,'Compiler must not mutate author source');
 assert.equal(compiled.b143.sourceRoutes.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert(compiled.b143.sourceRoutes.zones.every(z=>z.reachedFromEntrance));
 assert(compiled.b143.sourceRoutes.featureAccess.every(f=>f.reachableFromEntrance));
 assert(compiled.b143.compiled.primitives.length>0,'Real B143 geometry must exist');
 const proof=proveRankedExteriorPhysicalGlazing(compiled,[
  {spaceIndex:1,selectedSide:'south'}
 ]);
 assert.equal(proof.status,'B143_WINDOW_GLASS_AND_IMMEDIATE_OUTWARD_AIR_SOURCE_VERIFIED');
 assert.equal(proof.windowCount,1);
 assert.equal(proof.verifiedPanelGlassCells,18);
 assert.equal(proof.verifiedImmediateOutwardAirCells,18);
 assert.equal(proof.verifiedImmediateInwardAirCells,18);
 assert.equal(compiled.worldWrites,0);
 assert.equal(compiled.worldContacts,0);
 assert.equal(compiled.constructionApproved,false);
 assert.equal(compiled.executionAllowed,false);
 assert.equal(compiled.readiness,'NOT_PREPARED');
 assert.deepEqual(compiled.gates,Array(9).fill('BLOCKED'));
 assert.deepEqual(compiled.BuildPlan.operations,[]);
 assert.equal(proof.humanArchitecturalArt,'NOT_REVIEWED');
 assert.equal(proof.minecraftWalking,'NOT_TESTED');
});
