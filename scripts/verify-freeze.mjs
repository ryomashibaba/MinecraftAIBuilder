import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
const record=JSON.parse(fs.readFileSync('docs/B100_CODE_FREEZE_SHA256.json','utf8'));
let checked=0;
for(const {path:rel,sha256} of record.files){
 const fp=path.resolve(rel);
 if(!fs.existsSync(fp))throw Error('Missing frozen file: '+rel);
 const got=crypto.createHash('sha256').update(fs.readFileSync(fp)).digest('hex');
 if(got!==sha256)throw Error('Changed frozen file: '+rel);
 checked++;
}
console.log(`PASS: ${checked} frozen baseline files unchanged`);
