import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {safe} from '../../b79/main/compile-b79.mjs';
import {buildingEnvelopeSummary,evaluateVerticalPocket,searchVerticalPockets,buildingProgrammeAlternatives,validateB94} from './b94-building-composition.mjs';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../..');
const report=JSON.parse(fs.readFileSync(path.join(here,'B94_BUILDING_COMPOSITION_REPORT.json')));
const b93=JSON.parse(fs.readFileSync(path.join(root,'parallel/b93/main/B93_ALTERNATE_PROGRAMME_REPORT.json')));
function synthetic({occupied=false,glass=false,protectedSite=false,cutRoom=false,freeHall=true}={}){
 const sections=[1,2,3].map(level=>({id:'unit/L'+level,level,
  floorMaskRows:Array.from({length:8},()=>('1'.repeat(9))),
  conceptRooms:[{id:'held',x:2,z:2,width:2,depth:2},...(cutRoom?[{id:'frozen',x:3,z:3,width:2,depth:2}]:[])],
  conceptReservations:{corridors:Array.from({length:9},(_,x)=>({x,z:4})),stairs:[{x:8,z:5}],elevators:[]}}));
 const indices=new Map(sections.map(s=>[s.id,{final:new Map()}]));
 const fixedBySection=new Map(sections.map(s=>[s.id,{reserved:new Set(),solids:new Set(),protectedSites:new Set()}]));
 const heldBySection=new Map(sections.map(s=>[s.id,['held']]));
 if(occupied||glass)indices.get('unit/L2').final.set('2,6,2',{occupied:true,block:glass?'minecraft:glass':'minecraft:stone_bricks',role:glass?'glass':'primaryWall'});
 if(protectedSite)fixedBySection.get('unit/L1').protectedSites.add('2,2');
 if(!freeHall)for(const s of sections)for(let x=1;x<=4;x++)indices.get(s.id).final.set(`${x},${(s.level-1)*5+1},4`,{occupied:true,block:'stone',role:'primaryWall'});
 return {sections,indices,fixedBySection,heldBySection};
}
const evaluate=(v)=>evaluateVerticalPocket({...synthetic(v),x:2,z:2});
test('B94 pinned schema and no world access',()=>{safe(report,'minecraftaibuilder-b94-offline-building-envelope-core-programme-options-v1');assert.equal(validateB94(report),true);});
test('B93 immutable provenance',()=>{assert.equal(report.provenance.b93,b93.reportSha256);});
test('Exact five buildings and thirty floors',()=>{assert.equal(report.buildings.length,5);assert.equal(report.buildings.reduce((n,b)=>n+b.reference.floors.length,0),30);});
test('Historic nominal rooms and unapproved rooms not inflated',()=>{assert.equal(report.totals.originalNominalRooms,314);assert.equal(report.totals.priorUnapprovedCandidates,296);assert.equal(report.totals.heldIndependentRooms,18);assert.equal(report.totals.newApprovedRooms,0);});
test('Every building has four separate options',()=>{assert.equal(report.totals.totalBuildingAlternatives,20);for(const b of report.buildings)assert.deepEqual(b.alternatives.map(x=>x.id),['KEEP_ORIGINAL_ENVELOPE_AND_UNRESOLVED_ROOMS','REPURPOSE_HELD_AS_COMMON_SERVICE','INSERT_NEW_ALIGNED_VERTICAL_CORE','RESET_FLOOR_PROGRAMME_AND_CORE_AS_NEW_BUILDING_BRANCH']);});
test('All envelope and planning scenarios are unapproved',()=>{for(const b of report.buildings){assert.equal(b.selectedForConstruction,null);for(const a of b.alternatives){assert.equal(a.constructionApproved,false);assert.deepEqual(a.liveConstructionOperations,[]);assert.equal(a.verifiedUsableRoomsAdded,0);assert.equal(a.originalEnvelopeMutations,0);}}});
test('Source building and floor nominal room totals exact',()=>{assert.equal(report.buildings.reduce((n,b)=>n+b.reference.originalNominalRoomCount,0),314);assert.equal(report.buildings.reduce((n,b)=>n+b.affectedHeldRooms,0),18);});
test('Service repurpose counts reduction as design tradeoff',()=>{for(const b of report.buildings){const a=b.alternatives[1];assert.equal(a.claimedIndependentRoomCount,b.reference.originalNominalRoomCount-b.affectedHeldRooms);assert.equal(a.nominalServiceReallocationArea,b.heldProgrammeArea);}});
test('Only two production-backed buildings, not five',()=>{assert.equal(report.replayed.length,2);assert.equal(report.totals.productionBackedBuildings,2);assert.equal(report.buildings.filter(b=>b.verticalCoreSearch!==null).length,2);});
test('Exact pinned Planner operations replay',()=>{for(const r of report.replayed){const p=b93.replayed.find(x=>x.building===r.building);assert.ok(p);assert.equal(r.operationsSha256,p.operationsSha256);assert.equal(r.verifiedReadOnly,true);}});
test('Apartment vertically aligned shaft pocket is a real conditional design option',()=>{const b=report.buildings.find(x=>x.buildingId==='apartment/candidate-01');assert.equal(b.verticalCoreSearch.strictEmptyFootprints,1);const c=b.verticalCoreSearch.top[0];assert.equal(c.sections.length,6);assert.equal(c.retiredHeldRoomIds.length,6);assert.ok(c.retiredHeldRoomIds.every(x=>x.includes('R013')));assert.equal(c.productionVoxelContacts,0);assert.equal(c.floorsAdjacentToTwoHighAirCorridor,6);assert.equal(c.strictCandidateSiteClear,true);});
test('Strictly clear core columns are not certified shafts',()=>{for(const b of report.buildings)for(const c of b.verticalCoreSearch?.top??[]){assert.equal(c.physicalShaftConstructible,false);assert.equal(c.constructionApproved,false);assert.equal(c.worldCoordinates,null);assert.deepEqual(c.blockOperations,[]);assert.ok(c.requiredApprovals.includes('INTER_FLOOR_SLAB_CUTS_AND_ROOF'));}});
test('Office core pockets do not automatically fix held office rooms',()=>{const b=report.buildings.find(x=>x.buildingId==='office/candidate-01');assert.ok(b.verticalCoreSearch.strictEmptyFootprints>0);assert.ok(b.verticalCoreSearch.top.every(c=>!c.retiredHeldRoomIds.length));});
test('Synthetic shaft with 2x2 aligned cavity is found, not built',()=>{const c=evaluate();assert.equal(c.strictCandidateSiteClear,true);assert.equal(c.retiredHeldRoomIds.length,3);assert.equal(c.physicalShaftConstructible,false);});
test('A primary-wall block on one floor rejects shaft',()=>{const c=evaluate({occupied:true});assert.equal(c.productionVoxelContacts,1);assert.equal(c.strictCandidateSiteClear,false);});
test('Glazing collision is explicitly rejected',()=>{const c=evaluate({glass:true});assert.ok(c.hardGlassSites>0);assert.equal(c.strictCandidateSiteClear,false);});
test('Frozen candidate footprint is explicitly rejected',()=>{const c=evaluate({protectedSite:true});assert.equal(c.strictCandidateSiteClear,false);assert.ok(c.sections[0].protectedSiteCount>0);});
test('Overlapping other unapproved room cannot create new shaft',()=>{const c=evaluate({cutRoom:true});assert.equal(c.strictCandidateSiteClear,false);assert.ok(c.otherRoomContacts>0);});
test('Blocked corridor neighbor cannot claim two-high access',()=>{const c=evaluate({freeHall:false});assert.equal(c.strictCandidateSiteClear,false);assert.equal(c.floorsAdjacentToTwoHighAirCorridor,0);});
test('Synthetic search returns sorted non-executable candidates',()=>{const a=synthetic();const c=searchVerticalPockets({...a,limit:5});assert.ok(c.checked>0);assert.equal(c.unapprovedAll,true);assert.ok(c.top.every(v=>v.strictCandidateSiteClear&&v.physicalShaftConstructible===false));});
test('Synthetic programme branch never converts service into approved occupancy',()=>{const a=synthetic();const o=buildingProgrammeAlternatives({id:'unit',sections:a.sections,affectedFloors:[],verticalResult:null});assert.equal(o.alternatives[1].verifiedUsableRoomsAdded,0);assert.equal(o.alternatives[2].qualityStatus,'HOLD_NO_CLEAR_2X2_SHAFT');});
test('Tampered gates or BuildPlan rejected',()=>{const r=structuredClone(report);r.gates[0].status='PASS';assert.equal(validateB94(r),false);r.gates[0].status='BLOCKED';r.BuildPlan.operations.push({setblock:'stone'});assert.equal(validateB94(r),false);});
test('Tampered room approvals rejected',()=>{const r=structuredClone(report);r.buildings[0].alternatives[0].verifiedUsableRoomsAdded=1;assert.equal(validateB94(r),false);});
test('Production edits, world contacts and commands remain zero',()=>{assert.equal(report.totals.productionChangesApplied,0);assert.equal(report.totals.worldOperations,0);assert.equal(report.totals.worldContacts,0);assert.equal(report.worldContacts,0);assert.deepEqual(report.BuildPlan.operations,[]);});
