/**
 * One small, optional Minecraft Education v26.33 materials test in a
 * newly created FLAT TEST WORLD. Running this Node file only prints code.
 * It does NOT attest results, export a palette, or contact any Minecraft world.
 * The returned MakeCode code writes ONLY after an explicit 'mabmat' chat command.
 */
import {fileURLToPath} from 'node:url';
import path from 'node:path';

export const MATERIAL_PROBES=Object.freeze([
 {purpose:'known-stone',codeName:'stone'},
 {purpose:'known-glass',codeName:'glass'},
 {purpose:'concrete',codeName:'white_concrete'},
 {purpose:'concrete-alt',codeName:'gray_concrete'},
 {purpose:'metal',codeName:'iron_block'},
 {purpose:'metal-alt',codeName:'polished_andesite'},
 {purpose:'wood',codeName:'oak_planks'},
 {purpose:'wood-alt',codeName:'planks'},
 {purpose:'accent',codeName:'yellow_concrete'},
 {purpose:'accent-alt',codeName:'gold_block'}
]);
export function makeEducationMaterialProbe(){
 const names=MATERIAL_PROBES.map(p=>p.codeName);
 const labels=MATERIAL_PROBES.map(p=>p.purpose);
 const lines=[
  '// PRIVATE TEST WORLD ONLY. This program is NOT a verified-material palette.',
  '// Use a NEW flat copy world, empty 10x1 row and SOLID ground underneath.',
  '// Paste into Minecraft Education MakeCode JavaScript, press Run.',
  '// Only chat command mabmat makes a change. It writes at (+8..+17,0,+8) from your feet.',
  '// One run only. Do NOT use in an existing world or near valuable structures.',
  'let mabNames: string[] = '+JSON.stringify(names),
  'let mabPurposes: string[] = '+JSON.stringify(labels),
  'let mabMaterialBusy = false',
  'let mabMaterialDone = false',
  'player.onChat("mabmat", function () {',
  '    if (mabMaterialBusy || mabMaterialDone) { player.say("HOLD: probe already active or used"); return }',
  '    mabMaterialBusy = true',
  '    let anchor = player.position()',
  '    // Preflight every destination AND its solid support before any write.',
  '    for (let i = 0; i < mabNames.length; i++) {',
  '        let target = positions.add(anchor, pos(8 + i, 0, 8))',
  '        let support = positions.add(anchor, pos(8 + i, -1, 8))',
  '        if (!blocks.testForBlock(AIR, target) || blocks.testForBlock(AIR, support)) {',
  '            mabMaterialBusy = false',
  '            player.say("HOLD: destination is not clear or flat; zero blocks written")',
  '            return',
  '        }',
  '    }',
  '    mabMaterialDone = true',
  '    player.say("MAB probe: " + mabNames.length + " samples; inspect each physical block")',
  '    for (let i = 0; i < mabNames.length; i++) {',
  '        let at = positions.add(anchor, pos(8 + i, 0, 8))',
  '        let block = blocks.blockByName(mabNames[i])',
  '        let placed = blocks.place(block, at)',
  '        let matched = placed && blocks.testForBlock(block, at) && !blocks.testForBlock(AIR, at)',
  '        if (matched) player.say("API PASS " + i + " " + mabPurposes[i] + " " + mabNames[i])',
  '        else player.say("HOLD " + i + " " + mabPurposes[i] + " " + mabNames[i])',
  '    }',
  '    mabMaterialBusy = false',
  '    player.say("API PASS alone is NOT verification. Record screenshot, texture and version 26.33.")',
  '})'
 ];
 return lines.join('\n')+'\n';
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
 process.stdout.write(makeEducationMaterialProbe());
