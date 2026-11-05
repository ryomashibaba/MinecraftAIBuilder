/** Opt-in small AUTHOR input -> existing compact/relative/real B143.
 * Parent index is NOT a new node generator. Model owns every placement
 * relation, shape, purpose, roof, window, fixture and material decision.
 * HOST only expands earlier parent indices and omitted sky nulls.
 * No repair, model call, world access, scripting or template by genre.
 */
import {createHash} from 'node:crypto';
import {COMPACT_SCHEMA,compileCompactModelIntent}
 from './r125-v4d-compact-model-ir.mjs';
export const SHORT_SCHEMA='minecraftaibuilder-r125-v4d-short-semantic-v1';
export const SHORT_PROTOCOL='V4D_SHORT_INDEXED_SEMANTIC_V1';
const fail=s=>{throw Error('R125_V4D_SHORT_'+s);};
const exact=(x,keys)=>x!==null&&typeof x==='object'&&
 !Array.isArray(x)&&Object.keys(x).sort().join('|')===
 keys.slice().sort().join('|');
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
export function translateShortSemanticIntent(raw){
 const src=structuredClone(raw);
 if(!exact(src,['schema','id','title','brief','materials','spaces'])||
    src.schema!==SHORT_SCHEMA||!Array.isArray(src.spaces)||
    src.spaces.length<3||src.spaces.length>5)fail('ROOT');
 const spaces=src.spaces.map((s,i)=>{
  const keys=['id','purpose','kind','width','depth','feature',
   'featureMaterial','link'];
  if(s?.kind==='covered')keys.push('roof','height','facade','windowSide');
  if(!exact(s,keys)||!['covered','sky'].includes(s.kind))
   fail('SPACE_FIELDS_'+i);
  if(i===0){
   if(s.kind!=='covered'||s.link!==null)fail('ROOT_ENTRY');
  }else if(!exact(s.link,['parentIndex','side','shift'])||
    !Number.isSafeInteger(s.link.parentIndex)||
    s.link.parentIndex<0||s.link.parentIndex>=i)
   fail('PARENT_BEFORE_CHILD_'+i);
  return {
   id:s.id,purpose:s.purpose,kind:s.kind,
   width:s.width,depth:s.depth,
   roof:s.kind==='covered'?s.roof:null,
   height:s.kind==='covered'?s.height:null,
   facade:s.kind==='covered'?s.facade:null,
   windowSide:s.kind==='covered'?s.windowSide:null,
   feature:s.feature,featureMaterial:s.featureMaterial,
   attach:i===0?null:{
    to:src.spaces[s.link.parentIndex].id,
    side:s.link.side,shift:s.link.shift
   }
  };
 });
 return {shortSemanticOriginal:src,shortSemanticAuthorSha256:hash(src),
  expandedCompactIR:{
   schema:COMPACT_SCHEMA,id:src.id,title:src.title,brief:src.brief,
   materials:structuredClone(src.materials),spaces
  },
  shortExpansion:{indexedParentsOnly:true,modelAuthorshipAttested:false,
   genrePrescriptions:false,silentRepair:false,worldWrites:0}};
}
export function compileShortSemanticIntent(input){
 const short=translateShortSemanticIntent(input);
 const r=compileCompactModelIntent(short.expandedCompactIR);
 if(r.readiness!=='NOT_PREPARED'||r.constructionApproved!==false||
    r.worldContacts!==0||r.worldWrites!==0||
    r.BuildPlan?.operations?.length!==0||
    r.gates?.length!==9||!r.gates.every(x=>x==='BLOCKED'))
  fail('WORLD_SAFETY');
 return {...r,...short,sourceProvenance:'SHORT_AUTHOR_UNATTESTED',
  modelIdentity:'NOT_ATTESTED',art:'NOT_REVIEWED',
  mac8GBTwoB:'NOT_TESTED'};
}
export const SHORT_SYSTEM_PROMPT=[
 'You are an original architect. Output ONE valid JSON object, no Markdown, no code.',
 'Top-level EXACT keys schema,id,title,brief,materials,spaces. schema='+SHORT_SCHEMA,
 'id and zone ids: unique lowercase hyphen slugs 3..35; title/brief/purpose/feature: meaningful 3..150 chars.',
 'materials EXACT floor,wall,roof,public. floor=wood|stone|concrete; wall/roof=wood|stone|concrete|metal; public=stone|concrete|accent.',
 'spaces 3..5, first a covered reception with link:null, at least TWO covered rooms and ONE sky-open public space.',
 'Each space EXACT id,purpose,kind,width,depth,feature,featureMaterial,link. Width/depth 18..30 integers; featureMaterial wood|stone|metal|concrete|accent.',
 'COVERED spaces ALSO require roof (ridgeX|ridgeZ|shedX|shedZ), height (low|medium|high), facade (glass|wall), windowSide (north|south|east|west|none).',
 'SKY spaces OMIT roof,height,facade,windowSide entirely, and attach directly to an earlier covered space.',
 'For later spaces link EXACT {parentIndex:<index of earlier space>,side:north|south|east|west,shift:-3..3 integer}. Index zero is the FIRST space.',
 'The first public reception has a reserved north entrance: no child may attach NORTH of space[0]. Avoid any overlapping rooms, blocked windows, or shared-wall glazing.',
 'Choose genuine independent functional meanings, adjacencies, volumes, roof silhouettes, material intentions, windows and service furnishings. No generic genre template.',
 'The host only maps an earlier parent index to the model-authored room ID and inserts sky null fields, then uses UNCHANGED strict B143 and SOURCE route verification. Invalid output HOLDS; no automatic correction/retry.'
].join('\n');
