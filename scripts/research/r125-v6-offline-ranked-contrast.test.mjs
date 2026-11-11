import test from 'node:test';
import assert from 'node:assert/strict';
import {contrastV6RankedLayer} from './r125-v6-offline-ranked-contrast.mjs';
import {syntheticFiveV4JArcadeAuthors}
 from '../r125-v4j-civic-facade-study.mjs';
import {CIVIC_ARCADE_SCHEMA}
 from '../../source/ai/r125-v4j-civic-author-ir.mjs';

function toV6(original){
 const {spaces,...rest}=structuredClone(original);
 const entrySpace=spaces[0];
 const otherSpaces=spaces.slice(1).map((s,i)=>{
  const index=spaces.slice(0,i+1).findIndex(n=>n.id===s.attach.to);
  assert(index>=0);
  return {...s,attach:{parentIndex:index,side:s.attach.side,shift:s.attach.shift}};
 });
 return {...rest,entrySpace,otherSpaces};
}
test('public housing V6 author: read-only ranked baseline and research opt-in, no full V6 promotion',()=>{
 const sample=syntheticFiveV4JArcadeAuthors().find(x=>x.genre==='housing');
 assert(sample);
 const original={...structuredClone(sample.wholeBuilding),
  schema:CIVIC_ARCADE_SCHEMA,arcade:structuredClone(sample.arcade)};
 const v6=toV6(original);
 const frozen=JSON.stringify(v6);
 const result=contrastV6RankedLayer(v6);
 assert.equal(JSON.stringify(v6),frozen);
 assert.equal(result.legacyRankedStatus,'PASS');
 assert.equal(result.researchRankedStatus,'PASS');
 assert.equal(result.fullV6Source,'NOT_TESTED');
 assert.equal(result.fullV6CompilerExecuted,false);
 assert.equal(result.additionalModelCalls,0);
 assert.equal(result.worldWrites,0);
 assert.equal(result.rankedPhysicalWitness.allNineGatesBlocked,true);
 assert.equal(result.rankedPhysicalWitness.allZonesReached,true);
 assert.equal(result.rankedPhysicalWitness.allFeaturesReached,true);
});
test('V6 corner-only reject reproduces, opt-in ranked improves without touching higher layers',()=>{
 const sample=syntheticFiveV4JArcadeAuthors().find(x=>x.genre==='housing');
 assert(sample);
 const original={...structuredClone(sample.wholeBuilding),
  schema:CIVIC_ARCADE_SCHEMA,arcade:structuredClone(sample.arcade)};
 const mk=(id,kind,side,parentIndex)=>({
  id,purpose:'Independent civic education and service area',kind,
  width:24,depth:24,roof:kind==='sky'?null:'ridgeX',
  height:kind==='sky'?null:'low',facade:kind==='sky'?null:'wall',
  windowPriority:kind==='sky'?null:['north','east','west','south'],
  feature:'Community learning service',featureMaterial:'wood',
  attach:parentIndex===null?null:{parentIndex,side,shift:0}
 });
 const v6=toV6(original);
 v6.entrySpace=mk('root-hall','covered',null,null);
 v6.otherSpaces=[
  mk('middle-hall','covered','east',0),
  mk('open-court','sky','north',1),
  mk('east-studio','covered','east',1)
 ];
 v6.materials={floor:'wood',wall:'stone',roof:'wood',public:'stone'};
 const before=JSON.stringify(v6);
 const result=contrastV6RankedLayer(v6,
  'R125_V4E_RANKED_NO_AUTHORED_EXTERIOR_OPTION_1');
 assert.equal(JSON.stringify(v6),before);
 assert.equal(result.legacyRankedStatus,'HOLD');
 assert.equal(result.legacyCompilerRejectCode,'RANKED_NO_EXTERIOR_OPTION');
 assert.equal(result.originalCompilerErrorReproduced,true);
 assert.equal(result.researchRankedStatus,'PASS');
 assert.equal(result.rankedPhysicalWitness.windows,3);
 assert.equal(result.rankedPhysicalWitness.glassCells,54);
 assert.equal(result.rankedPhysicalWitness.inwardAirCells,54);
 assert.equal(result.rankedPhysicalWitness.outwardAirCells,54);
 assert.equal(result.fullV6Source,'NOT_TESTED');
 assert.equal(result.fullV6CompilerExecuted,false);
 assert.equal(result.modelIdentityAttested,false);
 assert.equal(result.gateCP1,'HOLD');
});
