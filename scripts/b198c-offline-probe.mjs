/** Two genuinely source-compiled scenes, MOCK adapter for deterministic CI.
 * This never demonstrates actual LLM reasoning / human aesthetic quality.
 */
import fs from 'node:fs';import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runB198CRepair} from './b198c-repair-cli.mjs';
import {fragmentedGallery,bridgedGallery,candidate} from './b198c-fixtures.mjs';
const dir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../b198c-evidence');
fs.mkdirSync(dir,{recursive:true});
const source=path.join(dir,'original-broken-gallery.json');
fs.writeFileSync(source,JSON.stringify(fragmentedGallery(),null,2)+'\n',{flag:'wx'});
const result=await runB198CRepair({
 args:['--base',source,
  '--goal','Create a fully supported bridge that genuinely connects two disconnected original galleries, without damaging any old floors',
  '--model','CI-FIXTURE-NOT-REAL',
  '--protect','west-original-platform,east-original-platform',
  '--minimum-gain','20',
  '--out',path.join(dir,'BEFORE_AFTER_SOURCE_PREVIEW')],
 adapter:async()=>candidate(bridgedGallery())
});
if(result.verifiedConnectedSourceSquareGain<20||
 result.realInferencePerformed!==false||
 result.minecraftWorldWrites!==0)throw Error('B198C_FALSE_REPAIR_OR_WORLD_STATUS');
console.log('B198C_GENUINE_SOURCE_REPAIR_FIXTURE_ONLY_PASS',JSON.stringify(result));
