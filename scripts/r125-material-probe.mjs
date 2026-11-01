/** Isolated one-shot single or bounded batch MakeCode material probes. Offline only. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const fail=x=>{throw Error('R125_PROBE_'+x)};
export const DEFAULT_MATERIAL_BATCH=Object.freeze([
 'gray_concrete','light_gray_concrete','black_concrete','red_concrete',
 'blue_concrete','spruce_planks','birch_planks','stone_bricks'
]);
const validName=name=>typeof name==='string'&&/^[a-z][a-z0-9_]{1,63}$/.test(name)&&
 !['air','water','lava','fire','tnt','command_block'].includes(name);
export function makeMaterialProbe(blockName){
 if(!validName(blockName))fail('INVALID_BLOCK');
 const code=[
  '// Copy of EMPTY, backed-up Education test world only.',
  '// One candidate per script; no automatic retries or existing building edits.',
  'let mabProbeTried = false',
  'function mabMaterialSingleRun() {',
  '    if (mabProbeTried) { player.say("HOLD: already attempted"); return }',
  '    mabProbeTried = true',
  '    let target = positions.add(player.position(), pos(8, 0, 8))',
  '    let ground = positions.add(target, pos(0, -1, 0))',
  '    if (!blocks.testForBlock(AIR, target) || blocks.testForBlock(AIR, ground)) {',
  '        player.say("HOLD: blocked or unsupported site. Wrote zero blocks."); return',
  '    }',
  '    let chosen = blocks.blockByName('+JSON.stringify(blockName)+')',
  '    blocks.fill(chosen, target, target, FillOperation.Keep)',
  '    if (!blocks.testForBlock(AIR,target) && blocks.testForBlock(chosen,target)) player.say("PROBE MATCH: '+blockName+'")',
  '    else player.say("HOLD: unexpected block, restore copied world.")',
  '}',
  'player.onChat("mabprobe", mabMaterialSingleRun)',
  'player.onChat("mb", mabMaterialSingleRun)'
 ].join('\n')+'\n';
 return {code,blockName,worldWrites:0,status:'OFFLINE_ONLY',version:'26.33',inGameResult:'NOT_TESTED'};
}

// One batch command can screen multiple independent candidates. All targets
// and ALL material identifiers are checked before the first world write.
// MakeCode does not reliably recover from a bad blockByName using try/catch,
// so a bad candidate fails closed rather than performing partial guessing.
export function makeMaterialBatchProbe(names=DEFAULT_MATERIAL_BATCH){
 if(!Array.isArray(names)||names.length<1||names.length>8||
  names.some(name=>!validName(name))||new Set(names).size!==names.length)
  fail('BATCH_CONTRACT');
 const list=JSON.stringify(names);
 const code=[
  '// BATCH MATERIAL PROBE: backed-up COPY of an EMPTY, flat Education test world ONLY.',
  '// One command "mb": 8 or fewer spaced targets, one shot; no automatic retries.',
  '// This is NOT a construction script or an automatic materials certification.',
  'let mabBatchTried = false',
  'let mabBatchNames: string[] = '+list,
  'let mabBatchAnchor = player.position()',
  'function mabBatchAt(i: number): Position {',
  '    return positions.add(mabBatchAnchor, pos(8 + i * 2, 0, 8))',
  '}',
  'player.onChat("mb", function () {',
  '    if (mabBatchTried) { player.say("MB HOLD: already attempted"); return }',
  '    mabBatchTried = true',
  '    mabBatchAnchor = player.position()',
  '    player.say("MB checking '+names.length+' clear supported spots; no blocks yet.")',
  '    for (let i = 0; i < mabBatchNames.length; i++) {',
  '        let target = mabBatchAt(i)',
  '        let ground = positions.add(target, pos(0, -1, 0))',
  '        if (!blocks.testForBlock(AIR, target) || blocks.testForBlock(AIR, ground)) {',
  '            player.say("MB HOLD: blocked or unsupported target " + (i + 1) + "; zero writes."); return',
  '        }',
  '    }',
  '    let mabResolved: number[] = []',
  '    player.say("MB space OK. Resolving ALL block names before writing.")',
  '    for (let i = 0; i < mabBatchNames.length; i++) {',
  '        let chosen = blocks.blockByName(mabBatchNames[i])',
  '        if (blocks.testForBlock(chosen, mabBatchAt(i))) {',
  '            player.say("MB HOLD: AIR/invalid at " + mabBatchNames[i] + "; zero writes."); return',
  '        }',
  '        for (let j = 0; j < mabResolved.length; j++) {',
  '            if (chosen == mabResolved[j]) {',
  '                player.say("MB HOLD: duplicate block ID for " + mabBatchNames[i] + "; zero writes."); return',
  '            }',
  '        }',
  '        mabResolved.push(chosen)',
  '    }',
  '    player.say("MB resolved '+names.length+' names. Placing one block each.")',
  '    let matched = 0',
  '    for (let i = 0; i < mabBatchNames.length; i++) {',
  '        let target = mabBatchAt(i)',
  '        blocks.fill(mabResolved[i], target, target, FillOperation.Keep)',
  '        if (!blocks.testForBlock(AIR, target) && blocks.testForBlock(mabResolved[i], target)) {',
  '            matched++',
  '            player.say("MB MATCH " + (i + 1) + "/" + mabBatchNames.length + ": " + mabBatchNames[i])',
  '        } else {',
  '            player.say("MB HOLD " + (i + 1) + ": " + mabBatchNames[i] + "; restore world copy.")',
  '        }',
  '    }',
  '    player.say("MB " + matched + "/" + mabBatchNames.length + " matching; inspect each visually before approving.")',
  '})'
 ].join('\n')+'\n';
 return {code,blockNames:[...names],status:'OFFLINE_ONLY',worldWrites:0,
  chatCommand:'mb',version:'26.33',inGameResult:'NOT_TESTED',
  testedMaterialsApproved:false,requiresVisualIdentityReview:true};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 let result;
 let output;
 if(args.length===3&&args[0]==='--batch'&&args[1]==='--out'){
  result=makeMaterialBatchProbe();
  output=args[2];
 }else if(args.length===4&&args[0]==='--block'&&args[2]==='--out'){
  result=makeMaterialProbe(args[1]);
  output=args[3];
 }else fail('ARGUMENTS');
 const target=path.resolve(output);
 if(fs.existsSync(target)||!fs.existsSync(path.dirname(target)))fail('FRESH_OUTPUT');
 fs.mkdirSync(target);
 fs.writeFileSync(path.join(target,'MAKECODE_MATERIAL_PROBE.ts'),result.code,{flag:'wx'});
 const {code,...metadata}=result;
 fs.writeFileSync(path.join(target,'PROBE_REPORT.json'),JSON.stringify(metadata,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify(metadata,null,2));
}
