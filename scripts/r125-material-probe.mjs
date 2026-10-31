/** Generate an isolated single-material MakeCode test. Offline only. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const fail=x=>{throw Error('R125_PROBE_'+x)};
export function makeMaterialProbe(blockName){
 if(typeof blockName!=='string'||!/^[a-z][a-z0-9_]{1,63}$/.test(blockName)||
  ['air','water','lava','fire','tnt','command_block'].includes(blockName))fail('INVALID_BLOCK');
 const code=[
  '// Copy of EMPTY, backed-up Education test world only.',
  '// One candidate per script; no automatic retries or existing building edits.',
  'let mabProbeTried = false',
  'player.onChat("mabprobe", function () {',
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
  '})'
 ].join('\n')+'\n';
 return {code,blockName,worldWrites:0,status:'OFFLINE_ONLY',version:'26.33',inGameResult:'NOT_TESTED'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 if(args.length!==4||args[0]!=='--block'||args[2]!=='--out')fail('ARGUMENTS');
 const target=path.resolve(args[3]);
 if(fs.existsSync(target)||!fs.existsSync(path.dirname(target)))fail('FRESH_OUTPUT');
 const result=makeMaterialProbe(args[1]);
 fs.mkdirSync(target);
 fs.writeFileSync(path.join(target,'MAKECODE_MATERIAL_PROBE.ts'),result.code,{flag:'wx'});
 const {code,...metadata}=result;
 fs.writeFileSync(path.join(target,'PROBE_REPORT.json'),JSON.stringify(metadata,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify(metadata,null,2));
}
