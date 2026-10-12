#!/usr/bin/env node
/** Append-only B64 source audit; freezes B63 files, checks report+viewer replay and NO BUILD. */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
import {buildB64FromSource} from './parallel/b64/main/run-b64.mjs';
import {renderB64Viewer} from './parallel/b64/main/viewer-b64.mjs';
const root=path.dirname(fileURLToPath(import.meta.url)),sha=b=>createHash('sha256').update(b).digest('hex');
const bad=s=>{throw Error('B64_PACKAGE_'+s)};
const bytes=(rel)=>{if(typeof rel!=='string'||!rel||rel.includes('\\')||rel.startsWith('/')||rel.split('/').some(s=>!s||s==='.'||s==='..'))bad('PATH');const p=path.join(root,rel),st=fs.lstatSync(p);if(!st.isFile()||st.isSymbolicLink())bad('NON_REGULAR_'+rel);return fs.readFileSync(p)};
const b63=JSON.parse(bytes('B63_FILE_SHA256.json')),
 frozen={...b63.baselineFiles,...b63.addedFiles,'B63_FILE_SHA256.json':sha(bytes('B63_FILE_SHA256.json'))},
 now=JSON.parse(bytes('B64_FILE_SHA256.json'));
if(b63.schema!=='minecraftaibuilder-b63-integrated-sha-v1'||now.schema!=='minecraftaibuilder-b64-integrated-sha-v1'||
 Object.keys(frozen).length!==883||now.frozenB63FileCount!==883||now.originalB63ManifestSha256!==frozen['B63_FILE_SHA256.json']||
 JSON.stringify(now.baselineFiles)!==JSON.stringify(frozen)||now.addedFileCount!==8||Object.keys(now.addedFiles||{}).length!==8)bad('MANIFEST');
const known={...frozen,...now.addedFiles};for(const [rel,hash] of Object.entries(known))if(!/^[0-9a-f]{64}$/.test(hash)||sha(bytes(rel))!==hash)bad('HASH_'+rel);
const allowed=new Set([...Object.keys(known),'B64_FILE_SHA256.json']);
function walk(dir,rel=''){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const n=rel?rel+'/'+e.name:e.name;if(e.isDirectory()&&!e.isSymbolicLink())walk(path.join(dir,e.name),n);else if(!e.isFile()||!allowed.has(n))bad('UNTRACKED_OR_SYMLINK_'+n)}}
walk(root);if(allowed.size!==892)bad('FILE_COUNT');
const {report}=buildB64FromSource();if(JSON.stringify(report)!==JSON.stringify(JSON.parse(bytes('parallel/b64/main/B64_CONCEPT_ROOM_OWNERSHIP.json')))||
 bytes('parallel/b64/main/B64_CONCEPT_ROOM_ATLAS.html').toString('utf8')!==renderB64Viewer(report)||
 report.scope.buildings!==5||report.scope.floors!==30||report.scope.rooms!==314||report.scope.uniqueConceptRoomFootprintCells!==6462||
 report.scope.sourceConceptFootprintDifferenceCells!==123||report.scope.doorMappingsVerified!==314||
 report.alternatives.length!==3||report.alternatives[2].conceptualRoomOverlapCells!==0||report.alternatives[2].cellClassification.UNASSIGNED_CONCEPT_FLOOR!==5||
 report.alternatives.some(x=>x.productionRoomOccupancyVerified!==false||x.approved!==false||x.emittable!==false)||
 report.readiness!=='NOT_PREPARED'||report.deployment!=='BLOCKED'||report.gates.length!==9||report.gates.some(x=>x.status!=='BLOCKED')||
 report.BuildPlan.operations.length!==0||report.worldContacts!==0||report.scans!==0||report.engineCalls!==0)bad('REPLAY_SAFETY');
console.log('B64_PACKAGE_PASS',JSON.stringify({frozenB63Sources:883,addedSourceFiles:8,sourceFiles:892,buildings:5,floors:30,conceptRooms:314,conceptRoomCells:6462,sourceConceptDifferenceCells:123,b64Tests:60,physicalRoomOccupancyVerified:false,gatesBlocked:9,operations:0}));
