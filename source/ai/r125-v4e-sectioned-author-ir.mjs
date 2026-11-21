/**
 * Research-only V4E: ONE original author JSON chooses BOTH a full
 * ranked-exterior spatial program and one nonrectangular loggia section.
 * Reject conflicts without changing/repairing model decisions.
 */
import {createHash} from 'node:crypto';
import {RANKED_SCHEMA,compileRankedExteriorIntent} from './r125-v4e-ranked-exterior-ir.mjs';
import {compileAuthoredPublicLoggia} from './r125-v4e-authored-public-loggia.mjs';
export const SECTIONED_SCHEMA='minecraftaibuilder-r125-v4e-sectioned-author-v1';
const fail=s=>{throw Error('R125_V4E_SECTIONED_'+s)};
const exact=(o,ks)=>o&&typeof o==='object'&&!Array.isArray(o)&&
 Object.keys(o).sort().join('|')===ks.slice().sort().join('|');
const digest=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
export function compileSectionedAuthorIntent(input){
 const raw=structuredClone(input);
 if(!exact(raw,['schema','id','title','brief','materials','spaces','section'])||
    raw.schema!==SECTIONED_SCHEMA||
    !exact(raw.section,['spaceId','corner','recessDepth']))
  fail('ROOT_AND_SECTION_CONTRACT');
 const {section,...ranked}=raw;ranked.schema=RANKED_SCHEMA;
 const base=compileRankedExteriorIntent(ranked);
 const result=compileAuthoredPublicLoggia(ranked,section);
 const final=result.sectionedCompiled;
 if(base.b143.geometrySha256!==result.unchangedV4EBaseGeometrySha256||
    base.b143.geometrySha256===final.geometrySha256||
    result.sectionedRoutes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
    result.worldWrites!==0||result.worldContacts!==0||
    result.readiness!=='NOT_PREPARED'||result.constructionApproved!==false||
    result.executionAllowed!==false||result.BuildPlan.operations.length!==0||
    result.gates.length!==9||result.gates.some(x=>x!=='BLOCKED'))
  fail('SOURCE_AND_SAFETY_FAIL_CLOSED');
 const compiledB143={
  ...base.b143,
  design:result.sectionedB143Design,compiled:final,
  sourceSha256:final.sourceSha256,geometrySha256:final.geometrySha256,
  sourceRoutes:result.sectionedRoutes,
  sourceProof:{...base.b143.sourceProof,
   nonrectAuthoredSectionWitness:result.trueSectionSourceWitness,
   humanArchitecturalArt:'NOT_REVIEWED'}
 };
 return {...base,
  authorContract:SECTIONED_SCHEMA,
  sectionedAuthorOriginal:raw,
  sectionedAuthorSha256:digest(raw),
  authoredSection:result.authoredSection,
  authoredNonrectSectionWitness:result.trueSectionSourceWitness,
  unchangedRankedGeometrySha256:base.b143.geometrySha256,
  b143:compiledB143,
  sourceSha256:compiledB143.sourceSha256,geometrySha256:compiledB143.geometrySha256,
  provenance:'ONE_EXPLICIT_AUTHOR_RESPONSE_IDENTITY_NOT_ATTESTED',
  humanArt:'NOT_REVIEWED',minecraftWalking:'NOT_TESTED',
  worldContacts:0,worldWrites:0,readiness:'NOT_PREPARED',
  constructionApproved:false,executionAllowed:false,
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}
 };
}
export const SECTIONED_SYSTEM_PROMPT=[
 'You are an ORIGINAL architect. Decide a coherent usable architecture AND one genuine nonrectangular corner loggia in the SAME single response.',
 'Return precisely ONE JSON, with EXACT root keys schema,id,title,brief,materials,spaces,section; schema='+SECTIONED_SCHEMA+'. No markdown.',
 'Apply the unchanged V4E ranked facade rules: spaces 3..5, FIRST covered reception attach:null, at least 2 covered and 1 sky open public. Other rooms attach to earlier rooms.',
 'Each space EXACT keys id,purpose,kind,width,depth,roof,height,facade,windowPriority,feature,featureMaterial,attach. widths/depths integers 18..30.',
 'Covered: roof ridgeX|ridgeZ|shedX|shedZ, height low|medium|high, facade glass|wall, windowPriority FOUR distinct ordered north,east,south,west. Sky: roof,height,facade,windowPriority all null.',
 'Nonfirst attach EXACT {to:<earlier space id>,side:north|south|west|east,shift:-3..3}. Name each purpose and functional equipment yourself.',
 'Materials EXACT {floor,wall,roof,public}; floor wood|stone|concrete; wall and roof stone|wood|concrete|metal; public stone|concrete|accent; featureMaterial wood|stone|metal|concrete|accent.',
 'The host chooses the FIRST of your authored windowPriority facing a truly EXTERIOR unshared whole wall after ALL attached rooms are laid out; root NORTH is the public entry.',
 'section EXACT {spaceId:<one authored COVERED space id>,corner:NW|NE|SW|SE,recessDepth:5|6}. BOTH wall directions of your chosen corner MUST be completely unshared, leave window panels, entrance, functional fixtures and roof intact.',
 'A section is real outdoor air cut from a corner of the authored covered room, closed by a staggered new diagonal wall over the preserved walkable floor. Do not pretend it is arbitrary curves or multi-floor construction.',
 'Unknown keys, shared walls, window/door conflicts, real B143 roof and fixture damage, invalid SOURCE routes HOLD with NO host repair and no second model call.',
 'No world coordinates, no code, no genre-specific standardized layouts, no ART or Minecraft completion claims.'
].join('\n');
