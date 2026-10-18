import fs from 'node:fs';import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createReviewAssignments,summarizeB198FReview}
 from '../source/ai/b198f-evidence-review.mjs';
const output=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../b198f-evidence');
if(fs.existsSync(output))throw Error('B198F_REFUSE_EXISTING_OUTPUT');
const cases=createReviewAssignments();
const report=summarizeB198FReview(cases);
fs.mkdirSync(output,{recursive:true});
fs.writeFileSync(path.join(output,'B198F_CRITERION_REVIEW_ASSIGNMENTS.json'),JSON.stringify(cases,null,2)+'\n');
fs.writeFileSync(path.join(output,'B198F_NOT_YET_HUMAN_REVIEWED_REPORT.json'),JSON.stringify(report,null,2)+'\n');
console.log('B198F_REAL_SOURCE_CRITERIA_PREPARED_NOT_HUMAN_SCORED',JSON.stringify({
 sourceDesigns:cases.length,criteria:cases.reduce((n,c)=>n+c.requiredCriteria.length,0),
 reviewed:report.completedCriterionEvidenceReviews,semanticQualityCertified:false,
 modelAPITest:false,minecraftWorldWrites:0}));
