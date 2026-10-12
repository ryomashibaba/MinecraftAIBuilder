import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {codeMask,lexicalInventory,inspectProductionArchive,missingSourceReport} from './inspect-b68.mjs';
import {PINS,collectReadOnly} from '../../b67/main/collect-b67.mjs';
import {buildB68FromSource} from './run-b68.mjs';
import {compileB68,verifyB68} from './compile-b68.mjs';
import {buildB67FromSource} from '../../b67/main/run-b67.mjs';
const b67=buildB67FromSource().report;
const marker='B68_USER_SOURCE_WOULD_BE_EXECUTED';
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'b68-static-fixture-'));
const project=path.join(scratch,'project'),out=path.join(scratch,'out');fs.mkdirSync(project);fs.mkdirSync(out);
fs.writeFileSync(path.join(project,'package.json'),JSON.stringify({name:'minecraft-ai-builder'}));
const keys=Object.keys(PINS);
const payloads={
 'engine/src/general-building-planner.js':`// composeFacade() should never count\nexport function generateBuilding() { return composeFacade(); }\nconst fake = 'createStairs()';\n/* buildWalls */`,
 'engine/src/building-grammar.js':`class BuildingGrammar { buildWalls(){} }\nfunction createStairs() {}`, 
 'engine/src/architectural-quality.js':`exports.checkQuality = () => { const x = architecturalQuality; }`,
 'modules/architectural-library.js':`module.exports.createDoor = function createDoor() { return createWalls(); }`,
 'styles/urban_japanese.json':JSON.stringify({materials:{stone:'secret'},palette:{name:'urban'},colors:[], privateToken:'not printed'})
};
for(const [k,v] of Object.entries(payloads)){const f=path.join(project,k);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,v);}
const collected=collectReadOnly({projectRoot:project,outputDir:out,now:new Date('2026-10-11T00:00:00Z'),uuid:()=> '12345678-0000-0000-0000-000000000000'});
const bytes=fs.readFileSync(collected.archivePath);
const expected=inspectProductionArchive(bytes);
const gate=compileB68(b67,expected);
test('B68 archived input is parsed without executing source',()=>assert.equal(globalThis[marker],undefined));
test('B68 exports missing-source status for no evidence',()=>assert.deepEqual(missingSourceReport().count,{required:5,found:0,exactPinMatch:0,versionMismatch:0,missing:5}));
test('B68 includes exact five pinned keys in order',()=>assert.deepEqual(expected.files.map(x=>x.path),keys));
test('B68 reads all five synthesized entries',()=>assert.equal(expected.count.found,5));
test('B68 marks fake source as version mismatch',()=>assert.equal(expected.count.versionMismatch,5));
test('B68 never accepts a synthetic archive as pinned version',()=>assert.equal(expected.count.exactPinMatch,0));
test('B68 source archive hash is real hash',()=>assert.match(expected.sourceArchiveSha256,/^[a-f0-9]{64}$/));
test('B68 metadata consistent with B67 original source collector',()=>assert.equal(expected.metadata,'CONSISTENT'));
test('B68 report contains no original source literal',()=>assert.equal(JSON.stringify(expected).includes('secret'),false));
test('B68 tokenization finds exported function',()=>assert(expected.files[0].inventory.exportedSymbols.includes('generateBuilding')));
test('B68 tokenization finds relevant composeFacade call',()=>assert(expected.files[0].inventory.targetReferences.some(x=>x.name==='composeFacade'&&x.count===1)));
test('B68 strips comment and quoted false-positive buildWalls',()=>assert.equal(expected.files[0].inventory.targetReferences.some(x=>x.name==='buildWalls'),false));
test('B68 detects class declarations',()=>assert(expected.files[1].inventory.declaredSymbols.includes('BuildingGrammar')));
test('B68 detects createStairs references',()=>assert(expected.files[1].inventory.targetReferences.some(x=>x.name==='createStairs')));
test('B68 CommonJS exports show named symbol',()=>assert(expected.files[2].inventory.exportedSymbols.includes('checkQuality')));
test('B68 dotted module.exports recognized',()=>assert(expected.files[3].inventory.exportedSymbols.includes('createDoor')));
test('B68 JSON names are whitelisted',()=>assert.deepEqual(expected.files[4].inventory.schemaKeysPresent,['materials','palette','colors']));
test('B68 JSON values not exposed',()=>assert.equal(JSON.stringify(expected).includes('not printed'),false));
test('B68 no network nor engine usage',()=>assert.deepEqual([expected.safety.network,expected.safety.worldAccess,expected.safety.sourceExecuted,expected.safety.sourceImported],[false,false,false,false]));
test('B68 report does not produce build operations',()=>assert.equal(expected.safety.buildOperations,0));
test('B68 applies B67 immutable source gate',()=>assert(verifyB68(gate,b67,expected)));
test('B68 report keeps nine gates blocked',()=>assert(gate.guards.M4Gates.length===9&&gate.guards.M4Gates.every(x=>x.status==='BLOCKED')));
test('B68 never declares production parity',()=>assert.equal(gate.productionParity,'UNVERIFIED'));
test('B68 does not approve implementation based on symbols',()=>assert(gate.interfaceMatrix.every(x=>x.implementationApproved===false)));
test('B68 decline source missing',()=>assert.equal(buildB68FromSource().report.concreteNextGate,'B67_ORIGINAL_SOURCE_ZIP_REQUIRED'));
test('B68 detect non-existent path',()=>assert.throws(()=>inspectProductionArchive(path.join(scratch,'missing.zip'))));
test('B68 reject malformed bytes',()=>assert.throws(()=>inspectProductionArchive(Buffer.from('evil'))));
test('B68 reject tampered ZIP checksum',()=>{let x=Buffer.from(bytes);x[80]^=0x80;assert.throws(()=>inspectProductionArchive(x));});
test('B68 enforce Buffer or local path only',()=>assert.throws(()=>inspectProductionArchive({bytes})));
test('B68 report rejects false executionAllowed',()=>{const copy=structuredClone(expected);copy.safety.executionAllowed=true;assert.throws(()=>compileB68(b67,copy));});
test('B68 report rejects sourceImported true',()=>{const copy=structuredClone(expected);copy.safety.sourceImported=true;assert.throws(()=>compileB68(b67,copy));});
test('B68 report rejects build operations',()=>{const copy=structuredClone(expected);copy.safety.buildOperations=1;assert.throws(()=>compileB68(b67,copy));});
test('B68 report rejects changed report integrity',()=>{const copy=structuredClone(gate);copy.interfaceMatrix[0].runtimeParity='PASS';assert.throws(()=>verifyB68(copy,b67,expected));});
test('B68 masks block comments',()=>assert(!codeMask('/* generateBuilding() */').includes('generateBuilding')));
test('B68 masks line comments',()=>assert(!codeMask('// composeFacade()\n').includes('composeFacade')));
test('B68 masks quotes',()=>assert(!codeMask('"setBlock()"').includes('setBlock')));
test('B68 masks template strings',()=>assert(!codeMask('`placeBlock()`').includes('placeBlock')));
test('B68 preserves real syntax',()=>assert(codeMask('function composeFacade() {}').includes('composeFacade')));
test('B68 invalid JSON is classified without throwing',()=>assert.equal(lexicalInventory('{oops','json').syntax,'INVALID_JSON'));
test('B68 handles JSON primitive without invented keys',()=>assert.equal(lexicalInventory('4','json').syntax,'JSON_NOT_OBJECT'));
test('B68 scans side-effect text but never runs it',()=>{
 const text=`(()=>{globalThis.${marker}=true;throw Error('EXECUTED')})()`;
 lexicalInventory(text,'js');assert.equal(globalThis[marker],undefined);
});
test('B68 uses exact B67 generated ZIP unchanged',()=>assert.equal(expected.count.found,collected.sourceFilesFound));
test('B68 accepts local source ZIP path',()=>assert.deepEqual(inspectProductionArchive(collected.archivePath).count,expected.count));
test('B68 runner produces same gate with provided zip',()=>assert.deepEqual(buildB68FromSource(collected.archivePath).report,gate));
test('B68 gate rejects missing source identity',()=>{const copy=structuredClone(expected);copy.files[0].path='unknown.js';assert.throws(()=>compileB68(b67,copy));});
test('B68 inventory never reveals source text in json',()=>assert(!JSON.stringify(gate).includes('function generateBuilding')));
test('B68 output requires explicit source file to change found count',()=>assert.equal(buildB68FromSource().report.intake.found,0));
