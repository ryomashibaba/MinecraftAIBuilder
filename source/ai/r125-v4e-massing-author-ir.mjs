/**
 * Opt-in ONE-response model-authored PRIMARY massing contract.
 * The author selects the full V4E spatial program AND open-sky principal
 * volume, its dimensions/corner and the X/Z public circulation opening.
 * Host converts exact authored intent to B143; no fallback or auto-repair.
 * This never certifies architectural ART, real LLM identity or world safety.
 * Frozen ranked/sectioned V4E and the Education production path are untouched.
 */
import {createHash} from 'node:crypto';
import {RANKED_SCHEMA,compileRankedExteriorIntent}
 from './r125-v4e-ranked-exterior-ir.mjs';
import {compileAuthoredPrimaryMassingVoid}
 from './r125-v4e-authored-primary-massing-void.mjs';
export const MASSING_SCHEMA='minecraftaibuilder-r125-v4e-massing-author-v1';
const fail=s=>{throw Error('R125_V4E_MASSING_AUTHOR_'+s);};
const exact=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&
 Object.keys(x).sort().join('|')===keys.slice().sort().join('|');
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');

export function compileMassingAuthorIntent(input){
 const raw=structuredClone(input);
 if(!exact(raw,['schema','id','title','brief','materials','spaces','massing'])||
    raw.schema!==MASSING_SCHEMA||
    !exact(raw.massing,['spaceId','corner','cutWidth','cutDepth','publicAccessSide'])||
    !['X','Z'].includes(raw.massing.publicAccessSide))
  fail('ROOT_AND_EXPLICIT_MASSING_CONTRACT');
 const {massing,...ranked}=raw;
 ranked.schema=RANKED_SCHEMA;
 const base=compileRankedExteriorIntent(ranked);
 const mass=compileAuthoredPrimaryMassingVoid(ranked,massing);
 const compiled=mass.b143Compiled;
 const witness=mass.sourceMassingWitness;
 if(base.b143.geometrySha256!==mass.baselineGeometrySha256||
    base.b143.geometrySha256===mass.finalGeometrySha256||
    compiled.geometrySha256!==mass.finalGeometrySha256||
    mass.sourceRoutes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
    !witness.publicPortalAuthored||
    witness.authorSelectedPublicPortalAxis!==massing.publicAccessSide||
    !witness.originalEntranceToOpenSky.supported||
    witness.originalEntranceToOpenSky.twoByTwoSourcePadsReached<1||
    witness.genuinelyOpenSkyFloorCells!==massing.cutWidth*massing.cutDepth||
    mass.worldContacts!==0||mass.worldWrites!==0||
    mass.readiness!=='NOT_PREPARED'||
    mass.constructionApproved!==false||mass.executionAllowed!==false||
    mass.BuildPlan.operations.length!==0||
    mass.gates.length!==9||mass.gates.some(g=>g!=='BLOCKED'))
  fail('TRUE_B143_SOURCE_AND_SAFETY_FAIL_CLOSED');
 const b143={
  ...base.b143,design:mass.b143Design,compiled,
  sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256,
  sourceRoutes:mass.sourceRoutes,
  sourceProof:{...base.b143.sourceProof,
   authorSelectedPrincipalMassingWitness:witness,
   humanArchitecturalArt:'NOT_REVIEWED'}
 };
 return {...base,
  authorContract:MASSING_SCHEMA,
  massingAuthorOriginal:raw,
  massingAuthorSha256:digest(raw),
  authoredMassing:massing,
  authoredMassingSourceWitness:witness,
  unchangedRankedGeometrySha256:base.b143.geometrySha256,
  b143,sourceSha256:b143.sourceSha256,
  geometrySha256:b143.geometrySha256,
  provenance:'ONE_EXPLICIT_AUTHOR_RESPONSE_IDENTITY_NOT_ATTESTED',
  humanArt:'NOT_REVIEWED',realModel:'NOT_TESTED',
  minecraftWalking:'NOT_TESTED',
  readiness:'NOT_PREPARED',constructionApproved:false,
  executionAllowed:false,gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]},worldContacts:0,worldWrites:0
 };
}

export const MASSING_SYSTEM_PROMPT=[
 'You are the ORIGINAL architect. Independently author the WHOLE useful architecture plus its PRIMARY nonrectangular open-sky mass and public route in ONE JSON answer.',
 'Return one JSON only. EXACT root keys schema,id,title,brief,materials,spaces,massing. schema='+MASSING_SCHEMA+'.',
 'V4E ranked spatial contract: 3..5 spaces, first covered public NORTH-entry reception attach:null, at least 2 covered and 1 sky space. Each other space attaches to an earlier space.',
 'Each space EXACT keys id,purpose,kind,width,depth,roof,height,facade,windowPriority,feature,featureMaterial,attach. width/depth integers 18..30.',
 'Covered roof ridgeX|ridgeZ|shedX|shedZ, height low|medium|high, facade wall|glass, windowPriority a full ordered permutation of north,east,south,west. Sky roof,height,facade,windowPriority null.',
 'Nonfirst attach EXACT {to:<earlier space id>,side:north|south|east|west,shift:-3..3}; meaningful function and featureMaterial for every space.',
 'Materials EXACT {floor,wall,roof,public}; floor wood|stone|concrete; wall/roof wood|stone|concrete|metal; public stone|concrete|accent; featureMaterial wood|stone|metal|concrete|accent.',
 'massing EXACT {spaceId,corner,cutWidth,cutDepth,publicAccessSide}. Choose one COVERED space by its id, corner NW|NE|SW|SE, cutWidth/cutDepth 7..10 integer, publicAccessSide X|Z.',
 'The chosen space must have width >= 2*cutWidth+6 and depth >= 2*cutDepth+6, and BOTH outer corner sides must be unshared with any attached space.',
 'The HOST cuts the entire sky-open principal corner INCLUDING existing roof, retains real walking floor, closes two internal faces and opens a physical 2-wide 3-high portal on the author-chosen X or Z face.',
 'Avoid entrance, glass, linked walls, equipment and circulation conflicts. The HOST never repairs or relocates your selection. Invalid SOURCE, real voxel or supported 2-wide public route => HOLD.',
 'Never claim ART approval, real Minecraft walking, model identity verification, or permission for Minecraft/world writes.'
].join('\n');
