/** B44-C. Pure, fail-closed review-only IR validator. No IO, imports, engine calls or placements.
 * This is deliberately NOT an execution authorization, converter, or BuildPlan compiler.
 */
const bad = (code, path) => { const e = new Error(`${code} at ${path}`); e.code = `B44C_${code}`; throw e; };
const plain = v => v !== null && typeof v === 'object' && (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null);
const noPayload = v => v === null || (Array.isArray(v) && v.length === 0);
const inertPlan = plan => plain(plan) && plan.status === 'NOT_PREPARED' && Array.isArray(plan.operations) && plan.operations.length === 0 &&
 (!Object.hasOwn(plan,'commandCount') || plan.commandCount === 0) &&
 (!Object.hasOwn(plan,'worldCoordinates') || plan.worldCoordinates === null) &&
 (!Object.hasOwn(plan,'worldAnchor') || plan.worldAnchor === null) &&
 (!Object.hasOwn(plan,'materialIds') || (Array.isArray(plan.materialIds) && plan.materialIds.length === 0)) &&
 (!Object.hasOwn(plan,'blockIds') || (Array.isArray(plan.blockIds) && plan.blockIds.length === 0));
const authFlags = new Set(['approved','constructionapproved','executionallowed','canexecute','canbuild','canplace','canemitblocks','caninstallwalls','canchangedoors','runnable','applied','authorized','authorizationgranted','deploymentallowed','permitconstruction','placementauthorized','engineinvocation','enginecalled','bridgecontact','worldaccess','scanallowed','packgenerationallowed','engineexecution','runtimeproven','runtimeidentityattested','engineloadedhashattested','physicalvalidated','physicalvalidationpassed','sitevalidated','worldidentityproven','liveacceptanceproven','verifiedphysicalwalkability','verifiedworldcoordinates','allowexecution','emitbuildplanallowed','readyforconstruction']);
const zeroCounts = new Set(['buildoperations','operationcount','commandcount','commandsissued','commandsemitted','constructioncommands','enginecalls','enginecallcount','physicalchanges','physicalmodifications','placementcount','buildcommandcount']);
const concreteIds = new Set(['materialid','materialids','blockid','blockids','doorblockid','stairblockid','blockstate','blockstates','materialblockids','resolvedmaterialids','runtimeblockids','blockname','blocktype','minecraftid','blockidentifier','materialidentifier','minecraftcommand','minecraftcommands','placementcommands']);
const executable = new Set(['operations','commands','placements','placeblocks','blockplacements','worldedits','packfiles','bridgecommands','executeplan','engineoperations','writes']);
const worldRefs = new Set(['worldcoordinates','worldposition','worldanchor','worldorigin','worldtransform','worldbounds','worldx','worldy','worldz','absoluteorigin','absoluteposition','sitecoordinates','playerspawn','playerposition','dimensionid','dimensionname','anchorworld','originx','originy','originz']);
const exactPhysicalStates = new Set(['statelower','stateupper','stairblockstates','doorstates','physicalfacing','doorfacing','doorhinge','hinge','openstate','slabhalf','stairhalf','upperblockbit','doorhingebit','weirdodirection','stairshape','blockstateproperties','doorstate','stairstate','slabstate','doorstateproperties','stairstateproperties','slabstateproperties','blockfacing']);
const physicalProofFields = new Set(['collisionverified','supportverified','headroomverified','walkabilityverified','physicalpassageverified','staircollisionverified','stairdirectionverified','stairorientationverified','doorstateverified','stateverified','floorverified']);
const proofStrings = new Set(['runtimeidentity','executioncompatibility','deployment','deploymentgate','readiness','worldidentity','installedenginecompatibility']);
const disallowedProof = /^(PROVEN|VERIFIED|APPROVED|READY|PREPARED|EXECUTABLE|ENABLED|ALLOWED|SUPPORTED|COMPATIBLE|PASS)$/i;
function checkTree(ir) {
 const visited = new WeakSet(); let count=0;
 function walk(v, path, depth) {
  if(++count > 150000 || depth > 96) bad('LIMIT',path);
  if(v === null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
   if(typeof v === 'number' && !Number.isFinite(v)) bad('NON_JSON_VALUE',path);
   if(typeof v === 'string' && /\bminecraft:[a-z0-9_.:-]+\b/i.test(v)) bad('CONCRETE_MINECRAFT_ID',path);
   return;
  }
  if(typeof v !== 'object' || (!Array.isArray(v) && !plain(v))) bad('NON_JSON_VALUE',path);
  if(visited.has(v)) bad('SHARED_OR_CYCLIC_INPUT',path);
  visited.add(v);
  if(Array.isArray(v)){if(v.length>100000)bad('LIMIT',path); v.forEach((a,i)=>walk(a,`${path}[${i}]`,depth+1));return;}
  for(const [key,val] of Object.entries(v)) {
   const k=key.replace(/[^a-z0-9]/gi,'').toLowerCase(), p=`${path}.${key}`;
   if(key==='__proto__'||key==='prototype'||key==='constructor')bad('UNSAFE_PROPERTY',p);
   if(key==='BuildPlan' && !inertPlan(val)) bad('NONINERT_BUILDPLAN',p);
   if((authFlags.has(k) || /(approved|authorized|permitted)$/.test(k) || /^(isapproved|approvedto|approvedfor|allowconstruction|enableconstruction|allowexecution|enableexecution|canexecute|canbuild)/.test(k)) && val !== false && val !== null) bad('AUTHORIZATION_OR_PHYSICAL_PROOF',p);
   if(k==='notprepared' && val!==true) bad('INVALID_SAFETY_FLAG',p);
   if(k==='noworldmutation'||k==='nobridge'||k==='noscan'||k==='nopackgeneration') { if(val!==true)bad('INVALID_SAFETY_FLAG',p); }
   if(zeroCounts.has(k) && val!==0)bad('NONZERO_EXECUTION_COUNT',p);
   if(concreteIds.has(k) && !noPayload(val))bad('CONCRETE_BLOCK_OR_MATERIAL',p);
   if(k==='material' && ![null,'UNKNOWN','UNVERIFIED'].includes(val))bad('CONCRETE_BLOCK_OR_MATERIAL',p);
   if(exactPhysicalStates.has(k) && ![null,'UNKNOWN','UNVERIFIED'].includes(val))bad('UNVERIFIED_BLOCK_STATE_PROMOTED',p);
   if((physicalProofFields.has(k) || /^physical.*(verified|validated|accepted|approved)$/.test(k)) && val!==false && val!==null && val!=='UNKNOWN' && val!=='UNVERIFIED')bad('PHYSICAL_PROOF_PROMOTED',p);
   if(k==='approvedvariant' && val!==null)bad('CANDIDATE_APPROVAL_PROMOTED',p);
   if(!zeroCounts.has(k) && (executable.has(k) || /(?:operation|placement|command)s?$/.test(k)) && !noPayload(val) && !(k==='executeplan' && val===false))bad('EXECUTABLE_PAYLOAD',p);
   if((worldRefs.has(k) || /world.*(coords|coordinates|position|anchor|origin|transform|bounds)$/.test(k)) && val!==null)bad('WORLD_REFERENCE',p);
   if(k==='coordinateframe'||k==='schematicframe'||k==='coordinatesystem'||k==='spatialframe') {
    if(typeof val==='string' && /\b(world|absolute|minecraft|runtime)\b/i.test(val))bad('WORLD_FRAME',p);
   }
   if(proofStrings.has(k) && typeof val === 'string'){
    if(disallowedProof.test(val) || (k==='runtimeidentity' && val!=='NOT_PROVEN' && val!=='UNKNOWN'))bad('FALSE_PROOF_OR_APPROVAL',p);
    if((k==='deployment'||k==='deploymentgate') && val!=='BLOCKED')bad('DEPLOYMENT_NOT_BLOCKED',p);
    if(k==='readiness' && val!=='NOT_PREPARED')bad('READINESS_PROMOTED',p);
   }
   walk(val,p,depth+1);
  }
 }
 walk(ir,'$',0);
 return count;
}
export function validateNonExecutableIR(ir, {role}={}) {
 if(!['sub-a','sub-b','baseline'].includes(role))bad('ROLE', '$.role');
 if(!plain(ir) || typeof ir.schema!=='string' || !/^minecraftaibuilder-[a-z0-9-]{5,120}-v\d+$/.test(ir.schema))bad('IR_SCHEMA','$.schema');
 const safety=ir.safety;
 const approved = Object.hasOwn(ir,'constructionApproved') ? ir.constructionApproved : safety?.constructionApproved;
 const execution = Object.hasOwn(ir,'executionAllowed') ? ir.executionAllowed : safety?.executionAllowed;
 if(approved!==false || execution!==false)bad('MISSING_FAIL_CLOSED_SAFETY','$.safety');
 if(!((ir.readiness==='NOT_PREPARED') || (ir.deployment==='BLOCKED') ||
    ['NO_EXECUTION_NOT_READY','NOT_PREPARED','REVIEW_ONLY','DESIGN_ONLY','CANDIDATE_ONLY'].includes(ir.status)))bad('MISSING_BLOCKED_STATUS','$');
 if(ir.BuildPlan!==undefined&&!inertPlan(ir.BuildPlan))bad('NONINERT_BUILDPLAN','$.BuildPlan');
 const traversed=checkTree(ir);
 return Object.freeze({schema:'minecraftaibuilder-b44c-nonexecuting-ir-result-v1',role,
  inputSchema:ir.schema,acceptedForOfflineReview:true,physicalValidity:'UNKNOWN',runtimeIdentity:'NOT_PROVEN',
  readiness:'NOT_PREPARED',deployment:'BLOCKED',constructionApproved:false,executionAllowed:false,
  checkedNodes:traversed,engineCalls:0,buildOperations:0,
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]}});
}
