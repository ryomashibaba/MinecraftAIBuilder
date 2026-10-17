import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildInterlevelNetwork,verifyInterlevelNetwork,
 navigationArchitecture} from '../source/ai/b166-interlevel-network.mjs';
import {readDesigns} from './build-b143-site.mjs';
import {readRevisionRequests} from './build-b144-site.mjs';
import {readContinuations} from './build-b145-site.mjs';
import {readStructuralRequests} from './build-b146-site.mjs';
import {readRepairRequest} from './build-b147-site.mjs';
import {readInteriorDesign} from './build-b149-site.mjs';
import {readUpperDesign} from './build-b150-site.mjs';
import {readWideDesign} from './build-b151-site.mjs';
import {readLoopDesign} from './build-b152-site.mjs';
import {readSkyDesign} from './build-b153-site.mjs';
import {readBypassDesign} from './build-b154-site.mjs';
import {readInterchangeR0,readInterchangeR1} from './build-b155-site.mjs';
import {readHeliosR0} from './build-b158-site.mjs';
import {readPolarisR0} from './build-b159-site.mjs';
import {readDopplerR0} from './build-b160-site.mjs';
import {makeB166Bundle,renderB166Html} from './build-b166-site.mjs';
test('both stairs have actual continuous 1x1 cardinal-grid paths, not just individually supported steps',()=>{
 const d=readDopplerR0(),snapshot=JSON.stringify(d),r=buildInterlevelNetwork(d),p=r.report;
 assert.equal(JSON.stringify(d),snapshot);
 assert.equal(navigationArchitecture().length,2);
 assert.equal(p.addedElements,2);
 assert.equal(p.newlyOccupiedCells,204);
 assert.equal(p.originalLowerMoves,127);
 assert.equal(p.changedLowerRouteBodyCells,0);
 assert.deepEqual(p.stairGridPaths.map(x=>x.horizontalSteps),[15,15]);
 for(const s of p.stairGridPaths){
  assert.equal(s.netHeightGain,7);
  assert.equal(s.maxRise,1);
  assert.deepEqual(s.bodyFootprint,[1,1]);
  assert.deepEqual(s.path.at(0),s.entry);
  assert.deepEqual(s.path.at(-1),s.top);
  for(let i=1;i<s.path.length;i++){
   const a=s.path[i-1],b=s.path[i];
   assert.equal(Math.abs(a[0]-b[0])+Math.abs(a[2]-b[2]),1);
   assert(Math.abs(a[1]-b[1])<=1);
  }
 }
 assert.deepEqual(p.upperFlatPlatforms.map(s=>s.flatMoves),[48,71]);
 assert.deepEqual(p.upperFlatPlatforms.map(s=>s.reachableAnchors),[221,290]);
 assert(p.upperFlatPlatforms.every(s=>s.allCellsChecked&&
  s.bodyFootprint.join()==='2,2'&&s.height===26));
 assert(r.upper.every(s=>s.route.targets[0].status==='PASS_FLAT_FOOTPRINT_GEOMETRY'));
 assert.deepEqual(r.low.targets[0].path,r.before.lower.targets[0].path);
 assert.equal(p.mixedFootprintWholeJourneyCertified,false);
 assert.equal(p.physicalActorMovementCertified,false);
 assert.equal(p.constructionApproved,false);
 assert.equal(p.worldContacts,0);
 assert.deepEqual(p.BuildPlan.operations,[]);
 assert(p.gates.every(x=>x==='BLOCKED'));
 assert(verifyInterlevelNetwork(d,p));
});
test('forged game movement certificates and forbidden construction plans are rejected',()=>{
 const original=readDopplerR0(),actual=buildInterlevelNetwork(original).report;
 const forged=structuredClone(actual);
 forged.physicalActorMovementCertified=true;
 assert(!verifyInterlevelNetwork(original,forged));
 forged.physicalActorMovementCertified=false;
 forged.mixedFootprintWholeJourneyCertified=true;
 assert(!verifyInterlevelNetwork(original,forged));
 forged.mixedFootprintWholeJourneyCertified=false;
 forged.BuildPlan.operations.push({type:'place'});
 assert(!verifyInterlevelNetwork(original,forged));
 assert.throws(()=>buildInterlevelNetwork({...original,designOnly:false}),
  /B143_SCHEMA_OR_MODE/);
});
test('36th source-hashed scene exposes actual separate stair and upper-level path overlays',()=>{
 const inputs=[readDesigns(),readRevisionRequests(),readContinuations(),
  readStructuralRequests(),readRepairRequest(),readInteriorDesign(),
  readUpperDesign(),readWideDesign(),readLoopDesign(),readSkyDesign(),
  readBypassDesign(),readInterchangeR0(),readInterchangeR1(),
  readHeliosR0(),readPolarisR0(),readDopplerR0()];
 const before=JSON.stringify(inputs),b=makeB166Bundle(...inputs);
 assert.equal(JSON.stringify(inputs),before);
 assert.equal(b.gallery.scenes.length,36);
 assert.equal(b.gallery.scenes[35].id,'doppler-orbital-crown-navigation-network');
 assert.equal(new Set(b.gallery.scenes.map(s=>s.id)).size,36);
 assert.equal(b.gallery.safety.minecraftWrites,0);
 assert.deepEqual(b.gallery.safety.BuildPlan.operations,[]);
 const tpl=fs.readFileSync(new URL('../source/ai/b143-viewer-template.html',import.meta.url),'utf8');
 const html=renderB166Html(b,tpl);
 for(const mark of ['id="b166-route"','id="b166-status"',
  'index=35;select.value="35";setScene()','48移動','71移動',
  'NOT_PREPARED'])
  assert(html.includes(mark),'Missing '+mark);
 assert(!html.includes('fetch('));
});
