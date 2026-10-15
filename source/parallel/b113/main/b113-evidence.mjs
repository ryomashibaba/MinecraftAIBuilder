/** Public documentation is a candidate schema, never an Education runtime certificate. */
import {B110_BLOCK_CANDIDATES} from '../../b110/main/b110-functional-interfaces.mjs';
export const SOURCES=Object.freeze({
 blocks:'https://learn.microsoft.com/en-us/minecraft/creator/reference/content/vanillalistingsreference/blocks?view=minecraft-bedrock-stable',
 intrinsic:'https://learn.microsoft.com/en-us/minecraft/creator/reference/content/blockreference/examples/intrinsicblockstateslist?view=minecraft-bedrock-stable',
 traits:'https://learn.microsoft.com/en-us/minecraft/creator/reference/content/blockreference/examples/blockstateandtraitlistings?view=minecraft-bedrock-stable',
 aux:'https://learn.microsoft.com/en-us/minecraft/creator/reference/content/blockreference/examples/auxvaluetoblockstatemap?view=minecraft-bedrock-stable',
 education:'https://edusupport.minecraft.net/hc/en-us/articles/360047556451-Minecraft-Education-Change-Log'
});
export const OBSERVATION=Object.freeze({
 observedDate:'2026-10-13',baseCommit:'8b8b1f726fc5cf82b6d3e633f24ca219164983fc',
 platform:'Windows 11 build 26200',node:'24.18.1',python:'3.13.15',
 originalFolderGitStatus:'NO_GIT_METADATA',originalFolderModified:false,
 packageName:'Microsoft.MinecraftEducationEdition',packageVersion:'1.26.3200.0',
 executableFileVersion:'1.26.32.0',executableProductVersion:'1.26.32.0',
 evidence:'WINDOWS_PACKAGE_MANIFEST_AND_FILE_VERSION_READ_ONLY',
 resourceDictionarySha256:'40952dc18c265fc51b406fb1cfce6753e7e13545418647b5ea669827d8c86ec0',
 configuredLegacyVersion:'v26.3',legacyEvidenceImported:false,
 gameStarted:false,worldContacts:0,liveBlockStates:'UNVERIFIED'
});
const bool=[false,true],four=[0,1,2,3];
const domains={
 'minecraft:cardinal_direction':['north','south','east','west'],
 direction:four,weirdo_direction:four,facing_direction:[0,1,2,3,4,5],
 door_hinge_bit:bool,open_bit:bool,upper_block_bit:bool,upside_down_bit:bool,
 head_piece_bit:bool,occupied_bit:bool,
 'minecraft:corner':['none','inner_left','inner_right','outer_left','outer_right']
};
export function blockRoleEvidence(role){
 const c=B110_BLOCK_CANDIDATES[role];
 if(!c)throw Error('B113_UNKNOWN_ROLE');
 const issues=[];
 if(role==='door')issues.push('DOOR_CURRENT_CARDINAL_VS_LEGACY_DIRECTION_SCHEMA_DRIFT');
 if(role==='stairs'||role==='seating')issues.push('CORNER_ABSENT_FROM_LEGACY_AUX_MAP','WEIRDO_DIRECTION_TO_ASCENT_UNVERIFIED');
 if(role==='generic')issues.push('INTRINSIC_STRING_VS_TRAITS_INTEGER_FACING_DIRECTION_CONFLICT');
 return {role,id:c.id,stateDomains:Object.fromEntries(c.states.map(n=>[n,[...domains[n]]])),
  documentationStatus:'BEDROCK_DOCUMENTED_CANDIDATE',retrievedDate:'2026-10-13',
  sources:[SOURCES.blocks,SOURCES.traits,SOURCES.intrinsic,SOURCES.aux],issues,
  installedAssetStatus:c.id==='minecraft:oak_planks'?'DIRECT_RESOURCE_KEY_ABSENT_NOT_RUNTIME_UNSUPPORTED':'RESOURCE_KEY_PRESENT_NOT_RUNTIME_VERIFIED',educationStatus:'UNVERIFIED',
  exactStateAcceptance:'UNVERIFIED',placementOrder:'UNVERIFIED',executable:false};
}
export const blockEvidence=()=>Object.keys(B110_BLOCK_CANDIDATES).map(blockRoleEvidence);
/** Exact names/types only. No coercion, aliases, defaults, or family-version fallback. */
export function inspectStateCandidate(role,states,version){
 const evidence=blockRoleEvidence(role),issues=[];
 if(!states||typeof states!=='object'||Array.isArray(states))throw Error('B113_BAD_STATES');
 if(version!==OBSERVATION.executableProductVersion)issues.push('EXACT_TARGET_VERSION_MISMATCH');
 for(const [name,value] of Object.entries(states)){
  if(!Object.hasOwn(evidence.stateDomains,name))issues.push('UNKNOWN_STATE:'+name);
  else if(!evidence.stateDomains[name].includes(value))issues.push('INVALID_STATE_VALUE:'+name);
 }
 for(const name of Object.keys(evidence.stateDomains))if(!Object.hasOwn(states,name))issues.push('MISSING_STATE:'+name);
 return {documentationShapeValid:issues.length===0,issues,
  documentationWarnings:evidence.issues,educationStatus:'UNVERIFIED',executionAllowed:false};
}
