/**
 * Export only a narrow, allowlisted, shareable SOURCE receipt.
 * No raw model text, prompt, detailed architecture, user paths, endpoint,
 * error.message or environment variables. No network or world operations.
 */
export const SAFE_SHARE_SCHEMA='minecraftaibuilder-v4d-minimal-shareable-receipt-v1';
const hold=s=>{throw Error('R125_V4D_SAFE_RECEIPT_'+s);};
const sha=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x)?x:null;
export function classifyPrivateV4DFailure(reason){
 if(typeof reason!=='string'||reason.length===0)return 'NOT_APPLICABLE';
 if(/MODEL_TRUNCATED|MODEL_FINISH|RAW|ORIGINAL_MISSING/i.test(reason))
  return 'MODEL_COMPLETENESS';
 if(/MODEL_RESPONSE_NOT_PURE_JSON|MODEL_HTTP_INVALID_JSON|CHOICES/i.test(reason))
  return 'MODEL_FORMAT';
 if(/R125_V4E_RANKED_/.test(reason))return 'RANKED_AUTHOR_EXTERIOR_INVALID';
 if(/R125_V4D_COMPACT_/.test(reason))return 'COMPACT_AUTHOR_IR_INVALID';
 if(/R125_V4D_RELATIVE_/.test(reason))return 'RELATIVE_AUTHOR_RELATIONS_INVALID';
 if(/R125_V4D_GRAPH_/.test(reason))return 'ARCHITECTURAL_GRAPH_INVALID';
 if(/R125_V4D_INTEGRITY_/.test(reason))return 'ENCLOSURE_OR_PUBLIC_SPACE_INVALID';
 if(/R125_ROUTE_/.test(reason))return 'SOURCE_CIRCULATION_INVALID';
 if(/B143_/.test(reason))return 'B143_COMPILATION_INVALID';
 if(/HTTP|TIMEOUT|ABORT|aborted|OLLAMA_TAGS|MODEL_NOT_INSTALLED/i.test(reason))
  return 'LOCAL_MODEL_TRANSPORT_OR_TIMEOUT';
 return 'UNKNOWN_INSPECT_PRIVATE_REPORT';
}
export function buildV4DShareableReceipt(report){
 if(!report||typeof report!=='object'||Array.isArray(report)||
  report.schema!=='minecraftaibuilder-r125-v4d-local-model-author-attempt-v1'||
  !Number.isSafeInteger(report.modelCalls)||report.modelCalls<0||report.modelCalls>1||
  typeof report.testInjectionPresent!=='boolean'||
  typeof report.rawCaptured!=='boolean'||
  report.worldContacts!==0||report.worldWrites!==0||
  report.readiness!=='NOT_PREPARED'||
  report.constructionApproved!==false||report.executionAllowed!==false||
  !Array.isArray(report.gates)||report.gates.length!==9||
  report.gates.some(v=>v!=='BLOCKED')||
  !Array.isArray(report.BuildPlan?.operations)||
  report.BuildPlan.operations.length!==0)
  hold('UNTRUSTED_OR_UNSAFE_ORIGIN');
 const legal=['HOLD_NOT_STARTED','HOLD_MODEL_NOT_INSTALLED',
  'HOLD_LOCAL_PREFLIGHT','HOLD_MODEL_OR_SOURCE_INVALID_NO_REPAIR',
  'HOLD_MODEL_TIMEOUT_OR_ABORTED','HOLD_TEST_DOUBLE_NOT_REAL_MODEL',
  'SOURCE_READY_PRIVATE_ART_REVIEW_REQUIRED'];
 if(!legal.includes(report.status))hold('UNKNOWN_STATUS');
 const synthetic=report.testInjectionPresent;
 const validated=report.sourceRoutesStatus==='SOURCE_ROUTES_REACH_ALL_ZONES'&&
  typeof report.actualB143VoxelCount==='number'&&
  report.actualB143VoxelCount>0&&sha(report.sourceSha256)!==null&&
  sha(report.geometrySha256)!==null&&report.rawCaptured===true;
 const candidate=validated&&
  (report.status==='SOURCE_READY_PRIVATE_ART_REVIEW_REQUIRED'||
   report.status==='HOLD_TEST_DOUBLE_NOT_REAL_MODEL');
 if((report.status==='SOURCE_READY_PRIVATE_ART_REVIEW_REQUIRED'&&!validated)||
  (report.status==='HOLD_TEST_DOUBLE_NOT_REAL_MODEL'&&!synthetic)||
  (report.status==='HOLD_MODEL_NOT_INSTALLED'&&report.modelCalls!==0))
  hold('FALSE_SOURCE_OR_MODEL_PROMOTION');
 return {
  schema:SAFE_SHARE_SCHEMA,sourceOnly:true,
  rawModelTextIncluded:false,userPromptIncluded:false,localPathsIncluded:false,
  apiEndpointIncluded:false,fullErrorTextIncluded:false,
  modelId:typeof report.modelId==='string'&&/^[A-Za-z0-9._:/-]{2,140}$/.test(report.modelId)?
   report.modelId:'UNVERIFIED',
  authorContract:['minecraftaibuilder-r125-v4d-compact-spatial-intent-v1',
   'minecraftaibuilder-r125-v4d-relative-author-intent-v1',
   'minecraftaibuilder-r125-v4e-ranked-exterior-author-v1'].includes(report.authorContract)?
   report.authorContract:'UNRECOGNIZED',
  reportedStatus:report.status,
  modelCallAttempts:report.modelCalls,
  modelIdentityCryptographicallyVerified:false,
  actualOllamaInferenceAttested:false,
  explicitlyInjectedTestResponse:synthetic,
  originalRawSavedPrivately:report.rawCaptured,
  originalRawSha256:sha(report.responseRawSha256),
  sourceCandidateVerified:!!candidate,
  compiledB143SourceSha256:validated?sha(report.sourceSha256):null,
  finalGeometrySha256:validated?sha(report.geometrySha256):null,
  finalB143VoxelCount:validated?report.actualB143VoxelCount:null,
  sourceCirculation:validated?report.sourceRoutesStatus:'NOT_VERIFIED',
  failureCategory:classifyPrivateV4DFailure(report.reason),
  humanArchitecturalArt:'NOT_REVIEWED',
  actualMinecraftWalking:'NOT_TESTED',
  macEightGBTwoBRealTrial:'NOT_TESTED',
  readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
  nineSafetyGates:'9 BLOCKED',buildPlanOperations:0,worldContacts:0,worldWrites:0,
  note:'Share only this minimal JSON. Keep MODEL_RESPONSE_ORIGINAL.txt, LOCAL_REQUEST.json and 3D source PRIVATE. SOURCE success is not ART or genuine-model proof.'
 };
}
