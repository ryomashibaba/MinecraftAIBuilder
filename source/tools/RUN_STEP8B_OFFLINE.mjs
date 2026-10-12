#!/usr/bin/env node
// Review only: reads an existing offline Step8A.5 report (and optionally an already
// extracted source snapshot); never imports or calls an installed building engine.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {makeCompatibilityEnvelope,auditSourceDirectory} from '../runner/step8b-compatibility.mjs';
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
 try {
  const [reviewFile,outputDir,snapshotDir]=process.argv.slice(2);
  if(!reviewFile||!outputDir)throw Object.assign(new Error('Usage: node tools/RUN_STEP8B_OFFLINE.mjs samples/hotel/review.json NEW_OUTPUT_DIR [EXTRACTED_WINDOWS_SOURCE_SNAPSHOT_DIR]'),{code:'USAGE'});
  if(fs.existsSync(outputDir))throw Object.assign(new Error('Existing destination forbidden; never overwrite evidence'),{code:'OUTPUT_EXISTS'});
  const review=JSON.parse(fs.readFileSync(reviewFile,'utf8'));
  const audit=snapshotDir?auditSourceDirectory(snapshotDir):null;
  const envelope=makeCompatibilityEnvelope(review,{snapshotAudit:audit});
  fs.mkdirSync(outputDir,{recursive:true});
  const f=(name,data)=>fs.writeFileSync(path.join(outputDir,name),data,{flag:'wx'});
  f('COMPATIBILITY_ENVELOPE.json',JSON.stringify(envelope,null,2)+'\n');
  if(audit)f('SNAPSHOT_INVENTORY_AUDIT.json',JSON.stringify(audit,null,2)+'\n');
  f('SUMMARY_JA.txt',[
   'MinecraftAIBuilder Step8B/B0 / OFFLINE READ-ONLY COMPATIBILITY REVIEW',
   'COMPATIBILITY: UNKNOWN',
   'BUILD STATUS: NOT PREPARED',
   'EXECUTION ALLOWED: false',
   'WORLD OPERATIONS: 0',
   'Windows latest engine compatibility NOT proven. No Minecraft / Bridge / build / pack / scan.',
   'Snapshot inventory status: '+envelope.snapshotAuditStatus,
   'Blockers:',...envelope.blockers.map(x=>'- '+x)
  ].join('\r\n')+'\r\n');
  console.log('STEP8B_OFFLINE_REVIEW_COMPLETED_NOT_PREPARED',JSON.stringify({outputDir:path.resolve(outputDir),designCount:envelope.designs.length,compatibility:'UNKNOWN',commandCount:0}));
 } catch(e){console.error('STEP8B_BLOCKED',e.code??'ERROR',e.message);process.exitCode=1;}
}
