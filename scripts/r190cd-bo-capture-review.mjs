/** R190-CD BO-capture bridge. Read-only, zero model/network/world I/O.
 * Verify a prior BO capture INVENTORY, exact input bytes, receipt SHA, and prior
 * geometry before compiling BN/B143 and applying the independent CD review.
 * A saved receipt/LOCAL_PROVIDER label cannot authenticate provider authorship.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {offlineRawReviewCD} from './r190cd-offline-raw-review.mjs';
import {compileR190BNAssembly} from '../source/ai/r190bn-spatial-assembly.mjs';
import {auditR190BQ} from '../source/ai/r190bq-independent-physical-program.mjs';

const H=b=>createHash('sha256').update(b).digest('hex');
const J=o=>JSON.stringify(o,null,2)+'\n';
const fail=x=>{throw Error('R190CD_BO_CAPTURE_'+x);};
function readRegular(file,max){
 const s=fs.lstatSync(file);
 if(!s.isFile()||s.isSymbolicLink()||s.size<1||s.size>max)fail('UNSAFE_OR_OVERSIZED_FILE');
 return fs.readFileSync(file);
}
function namesIn(dir,prefix=''){
 const result=[];
 for(const e of fs.readdirSync(dir,{withFileTypes:true})){
  if(e.isSymbolicLink())fail('SYMLINK');
  const name=prefix+e.name;
  if(e.isDirectory())result.push(...namesIn(path.join(dir,e.name),name+'/'));
  else if(e.isFile()&&name!=='INVENTORY.json')result.push(name);
  else if(!e.isFile())fail('UNSAFE_FILE_TYPE');
 }
 return result.sort();
}
export function verifyR190CDBOCapture(capture){
 if(typeof capture!=='string'||!capture)fail('CAPTURE_DIR_REQUIRED');
 const dir=path.resolve(capture);
 const st=fs.lstatSync(dir);
 if(!st.isDirectory()||st.isSymbolicLink())fail('DIRECTORY_NOT_REGULAR');
 const inventoryBytes=readRegular(path.join(dir,'INVENTORY.json'),300000);
 let inventory;
 try{inventory=JSON.parse(inventoryBytes);}catch{fail('INVENTORY_JSON');}
 if(!inventory||inventory.exactSavedBytes!==true||!Array.isArray(inventory.files)||
    inventory.files.length<3||inventory.files.length>200)fail('INVENTORY_FORMAT');
 const seen=new Set();
 for(const f of inventory.files){
  if(!f||typeof f.file!=='string'||!(/^[A-Za-z0-9._/-]+$/).test(f.file)||
     f.file.split('/').some(p=>p===''||p==='.'||p==='..')||
     f.file==='INVENTORY.json'||seen.has(f.file)||
     !Number.isSafeInteger(f.bytes)||f.bytes<1||f.bytes>20000000||
     typeof f.sha256!=='string'||!(/^[a-f0-9]{64}$/).test(f.sha256))
   fail('INVENTORY_ENTRY');
  seen.add(f.file);
  const file=path.join(dir,...f.file.split('/'));
  const raw=readRegular(file,20000000);
  if(raw.length!==f.bytes||H(raw)!==f.sha256)fail('INVENTORY_SHA_MISMATCH');
 }
 const actual=namesIn(dir),declared=[...seen].sort();
 if(JSON.stringify(actual)!==JSON.stringify(declared))fail('UNDECLARED_OR_MISSING_FILE');
 for(const name of ['CAPTURE.json','MODEL_ORIGINAL.txt','ORIGINAL_BRIEF.txt'])
  if(!seen.has(name))fail('REQUIRED_EVIDENCE_MISSING');
 let receipt;
 const receiptBytes=readRegular(path.join(dir,'CAPTURE.json'),200000);
 try{receipt=JSON.parse(receiptBytes);}catch{fail('RECEIPT_JSON');}
 const original=readRegular(path.join(dir,'MODEL_ORIGINAL.txt'),200000);
 const brief=readRegular(path.join(dir,'ORIGINAL_BRIEF.txt'),20000);
 if(!receipt||receipt.schema!=='minecraftaibuilder-r190bo-source-capture-v1'||
    !['LOCAL_PROVIDER','SAVED_SOURCE_UNVERIFIED','SYNTHETIC_TEST_FIXTURE'].includes(receipt.origin)||
    typeof receipt.status!=='string'||
    receipt.originalRawSha256!==H(original)||
    receipt.originalBriefSha256!==H(brief)||
    (receipt.geometrySha256!==undefined&&
     !(/^[a-f0-9]{64}$/).test(receipt.geometrySha256)))fail('RECEIPT_SOURCE_BINDING');
 return {dir,receipt,inventorySha256:H(inventoryBytes),
  originalSha256:H(original),briefSha256:H(brief)};
}
/** Check previously saved BO evidence against fresh deterministic recompilation.
 * A rewritten INVENTORY alone cannot make a changed viewer proposal or physical
 * program report truthful. Evidence remains untrusted for provider identity.
 */
function verifyPriorBOArtifacts(verified){
 const {dir,receipt}=verified;
 if(receipt.geometrySha256===undefined)return {priorGeometry:'ABSENT',recount:'NOT_APPLICABLE'};
 const brief=readRegular(path.join(dir,'ORIGINAL_BRIEF.txt'),20000);
 const original=readRegular(path.join(dir,'MODEL_ORIGINAL.txt'),200000);
 let derived;
 try{derived=compileR190BNAssembly(original,{originalBrief:brief,authorship:'UNVERIFIED_AUTHOR'});}
 catch{fail('ORIGINAL_CANNOT_REPRODUCE_PRIOR_GEOMETRY');}
 if(derived.geometrySha256!==receipt.geometrySha256||
    receipt.sourceSha256!==derived.sourceSha256||
    receipt.sourceTechnicalStatus!==derived.status)
  fail('BO_RECEIPT_DERIVATION_CONTRADICTION');
 function saved(name){
  try{return JSON.parse(readRegular(path.join(dir,name),2000000));}
  catch{fail('MISSING_OR_MALFORMED_PRIOR_'+name.replace(/[^a-zA-Z]/g,'_'));}
 }
 const priorProposal=saved('DERIVED_B143_PROPOSAL.json');
 if(JSON.stringify(priorProposal)!==JSON.stringify(derived.proposal))
  fail('DERIVED_PROPOSAL_NOT_BOUND_TO_ORIGINAL');
 const priorFunctional=saved('FUNCTIONAL_REVIEW.json');
 const functionalExpected={origin:'DETERMINISTIC_FINAL_VOXEL_CHECKS_OF_MODEL_DECLARATIONS',
  geometrySha256:derived.geometrySha256,spaces:derived.spaceEvidence,
  r4:derived.functionalReview,independentRequestFidelity:'NOT_CERTIFIED',art:'ART_HOLD'};
 if(JSON.stringify(priorFunctional)!==JSON.stringify(functionalExpected))
  fail('FUNCTIONAL_REPORT_NOT_BOUND_TO_VOXELS');
 const priorPhysical=saved('PHYSICAL_PROGRAM_REVIEW.json');
 if(typeof priorPhysical.origin!=='string'||priorPhysical.origin.length>160||
    !['SYNTHETIC_TEST_FIXTURE','SAVED_SOURCE_UNVERIFIED','LOCAL_PROVIDER'].includes(priorPhysical.origin))
  fail('PHYSICAL_ORIGIN_NOT_KNOWN');
 const physicalExpected=auditR190BQ({originalBrief:brief,raw:original,
  compiled:derived.compiled,programSpaces:derived.programSpaces,
  levels:derived.levels,geometrySha256:derived.geometrySha256,origin:priorPhysical.origin});
 if(JSON.stringify(priorPhysical)!==JSON.stringify(physicalExpected)||
    receipt.independentProgramStatus!==physicalExpected.result||
    receipt.minimumLevelPrerequisite!==physicalExpected.minimumLevelPrerequisite)
  fail('PHYSICAL_REPORT_NOT_BOUND_TO_VOXELS');
 // Prior status is retained as evidence, not interpreted as architecture pass.
 return {priorGeometry:'REPRODUCED',recount:'PRIOR_PROPOSAL_FUNCTION_AND_PHYSICAL_EXACTLY_RECOMPUTED',
  priorBOStatus:receipt.status,priorProgramStatus:physicalExpected.result};
}

export function reviewR190CDBOCapture({capture,out}={}){
 if(typeof out!=='string'||!out||fs.existsSync(out))fail('FRESH_OUTPUT_REQUIRED');
 const verified=verifyR190CDBOCapture(capture);
 const prior=verifyPriorBOArtifacts(verified);
 const r=offlineRawReviewCD({
  briefFile:path.join(verified.dir,'ORIGINAL_BRIEF.txt'),
  originalFile:path.join(verified.dir,'MODEL_ORIGINAL.txt'),
  out,requireBOGeometry:true,requiredBOGeometrySha256:verified.receipt.geometrySha256??null
 });
 fs.writeFileSync(path.join(out,'BO_CAPTURE_BINDING.json'),J({
  schema:'minecraftaibuilder-r190cd-bo-capture-binding-v1',
  captureInventorySha256:verified.inventorySha256,
  captureOriginalSha256:verified.originalSha256,
  captureBriefSha256:verified.briefSha256,
  originalBOOriginClaim:verified.receipt.origin,
  BOOriginIndependentlyAuthenticated:false,
  priorBOGeometrySha256:verified.receipt.geometrySha256??null,
  priorBOStatus:verified.receipt.status,
  priorEvidenceVerification:prior.recount,
  independentGeometryMatchesPriorCapture:r.geometrySha256?
   r.geometrySha256===verified.receipt.geometrySha256:false,
  admission:'HOLD_OFFLINE_CAPTURE_PROVENANCE_AND_ART_NOT_APPROVED',
  modelCalls:0,networkRequests:0,worldContacts:0,worldWrites:0,
  readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]},constructionApproved:false,executionAllowed:false,
  officialArtAdoptions:0
 }),{flag:'wx'});
 if(r.geometrySha256){
  const score=JSON.parse(readRegular(path.join(out,'CD_SCORECARD.json'),1000000));
  const inventory=JSON.parse(readRegular(path.join(verified.dir,'INVENTORY.json'),300000));
  const savedEvidence=inventory.files.filter(f=>f.file==='DERIVED_3D.html'||
   /^DERIVED_(front|rear|west|east|roof)\.svg$/.test(f.file))
   .map(f=>({file:f.file,sha256:f.sha256,source:'PRIOR_BO_CAPTURE_INVENTORY_NOT_INDEPENDENT_VISUAL_VALIDATION'}));
  const author=JSON.parse(readRegular(path.join(verified.dir,'MODEL_ORIGINAL.txt'),200000));
  const packet={
   schema:'minecraftaibuilder-r190cd-evidence-bound-manual-review-queue-v1',
   sourceOriginalSha256:verified.originalSha256,
   originalBriefSha256:verified.briefSha256,geometrySha256:r.geometrySha256,
   captureInventorySha256:verified.inventorySha256,
   originalBOOriginClaim:verified.receipt.origin,
   originalBOStatus:verified.receipt.status,
   sourceOfDesign:'SAVED_AUTHOR_SPATIAL_ASSEMBLY_NOT_INDEPENDENT_PROVIDER_AUTHENTICATION',
   authorDeclaredIntent:author.intent,
   authoredPrograms:score.programs.map(s=>({
    id:s.id,authorDeclaredPurpose:s.sourceDeclaredPurpose,
    declaredCells:s.requestedCells,physicalFloorAndAirCells:s.supportedClearCells,
    conservativeTwoWideReachable:s.conservativeTwoWideReachable,
    functionCertified:false
   })),
   entranceFindings:score.entrances,
   conservativeFindings:score.findings,
   savedVisualEvidence:savedEvidence,
   visualCoverageLimitation:'BO viewer plus at most five saved elevations; no independently validated eight genuine views or interior eye-level inspection',
   reviewRequired:{
    japaneseBriefFidelity:'UNREVIEWED_HUMAN_MUST_COMPARE_EXACT_BRIEF',
    architectureOriginality:'UNREVIEWED',
    silhouetteAndProportions:'UNREVIEWED',
    usableEntrancesAndSpatialExperience:'UNREVIEWED',
    multiViewVisualReview:'MISSING_EIGHT_VIEW_AND_INTERIOR_VALIDATION',
    accessibilityAndActualGameWalking:'NOT_TESTED',
    realModelProviderIdentity:'NOT_INDEPENDENTLY_AUTHENTICATED'
   },
   independentArtPass:false,independentFunctionalPass:false,
   approvedForMinecraft:false,constructionApproved:false,executionAllowed:false,
   readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),
   BuildPlan:{operations:[]},worldContacts:0,worldWrites:0,
   modelCalls:0,officialArtAdoptions:0,status:'HOLD_NEEDS_GENUINE_ART_AND_REQUEST_FIDELITY_REVIEW'
  };
  fs.writeFileSync(path.join(out,'MANUAL_REVIEW_QUEUE.json'),J(packet),{flag:'wx'});
 }
 return {status:r.status,geometrySha256:r.geometrySha256??null,
  originalSHA256:verified.originalSha256,
  captureOriginClaim:verified.receipt.origin,
  providerProvenance:'NOT_INDEPENDENTLY_AUTHENTICATED',
  networkRequests:0,worldWrites:0,executionAllowed:false};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const p=process.argv;
  if(p.length!==6||p[2]!=='--capture'||p[4]!=='--out')
   fail('CLI_USAGE --capture SAVED_BO_CAPTURE --out NEW_CD_REVIEW');
  const result=reviewR190CDBOCapture({capture:p[3],out:p[5]});
  console.log(J(result));
  // Valid 3D still requires independent source, art and practical assessment.
  if(result.status!=='HOLD_PHYSICAL_ART_FIDELITY_AND_PROVIDER_PROVENANCE')
   process.exitCode=2;
 }catch(e){console.error(e.stack??String(e));process.exitCode=1;}
}
