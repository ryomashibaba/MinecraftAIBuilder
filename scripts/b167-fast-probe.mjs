import fs from 'node:fs';import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {auditUnifiedJourneys,verifyUnifiedJourneys} from '../source/ai/b167-unified-journey.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const d=JSON.parse(fs.readFileSync(path.join(root,'designs/ai/interiors/doppler-switchback-terminal-r0.json'),'utf8'));
const a=auditUnifiedJourneys(d),p=a.report;
if(!verifyUnifiedJourneys(d,p)||p.wingRoutes.length!==2||
 p.constructionApproved!==false||p.worldContacts!==0||
 p.gates.length!==9||!p.gates.every(x=>x==='BLOCKED')||
 p.BuildPlan.operations.length!==0)
 throw Error('B167_FAIL_CLOSED');
const summary={schema:p.schema,connected:p.fullyUnifiedWings,missing:p.missingLowerAccessWings,
 wingMetrics:p.wingRoutes.map(({full1x1Path,...rest})=>rest),sourceSha256:p.sourceSha256,
 reportSha256:p.sha256,worldWrites:0,readiness:'NOT_PREPARED',gates:p.gates};
fs.mkdirSync(path.join(root,'b167-fast-evidence'),{recursive:true});
fs.writeFileSync(path.join(root,'b167-fast-evidence/B167_FIRST_LOOK.json'),
 JSON.stringify(summary,null,2)+'\n');
console.log('B167_FIRST_LOOK',JSON.stringify(summary));
