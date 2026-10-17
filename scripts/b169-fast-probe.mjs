import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {researchBedrockShapeProfiles,verifyBedrockShapeProfiles}
 from '../source/ai/b169-bedrock-pixel-shapes.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const original=JSON.parse(fs.readFileSync(path.join(ROOT,
 'designs/ai/interiors/doppler-switchback-terminal-r0.json'),'utf8'));
const m=researchBedrockShapeProfiles(original);
if(!verifyBedrockShapeProfiles(original,m)||
 m.orientationVariants.length!==8||
 m.orientationVariants.some(v=>v.boxCount!==2||
  v.vanillaCollisionShapeCertified!==false)||
 m.fixtureWideHalfStepResult!=='PASS_SIMPLIFIED_AABB_ONLY'||
 m.authoredCollisionComponents!==0||m.collisionStatesMissing!==true||
 m.originalCompiledVoxelsModified!==false||
 m.educationVersionCustomMultiBoxVerified!==false||
 m.physicalJourney2x2Certified!==false||
 m.constructionApproved!==false||m.worldContacts!==0||
 m.gates.length!==9||m.gates.some(v=>v!=='BLOCKED')||
 m.BuildPlan.operations.length!==0)
 throw Error('B169_UNVERIFIED_OR_WORLD_MUTATION');
const proof={schema:'minecraftaibuilder-b169-offline-component-proof-v1',
 parentGeometrySha256:m.originalGeometrySha256,
 bedrockPixelUnit:16,stairOrientationVariantCount:m.orientationVariants.length,
 supportVsCollisionSeparation:true,fixtureHalfStep:m.fixtureWideHalfStepResult,
 authoredCollisionComponents:m.authoredCollisionComponents,
 missingBlockStateEvidence:m.collisionStatesMissing,
 educationMultiBoxCompatibilityConfirmed:false,
 vanillaStairCollisionCertified:false,
 actualPlayerCollisionCertified:false,
 constructionApproved:false,worldWrites:0,readiness:'NOT_PREPARED',
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
 proofSha256:m.sha256};
fs.mkdirSync(path.join(ROOT,'b169-fast-evidence'),{recursive:true});
fs.writeFileSync(path.join(ROOT,'b169-fast-evidence/B169_OFFLINE_COMPONENTS.json'),
 JSON.stringify({proof,report:m},null,2)+'\n');
console.log('B169_OFFLINE_PROOF',JSON.stringify(proof));
