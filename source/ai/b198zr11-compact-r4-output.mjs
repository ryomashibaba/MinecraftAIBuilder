/**
 * B198Z-R11: optional compact FOUR-KEY R4 output contract.
 * The model still authors all geometry. This is neither a model response
 * nor an automatic architectural template, repair, or construction command.
 * It is intentionally opt-in so previous R8 original prompts remain pinned.
 */
import {createHash} from 'node:crypto';
export const SCHEMA='minecraftaibuilder-b198zr11-compact-r4-output-v1';
export const PROFILE='r11-compact';
const hash=s=>createHash('sha256').update(s).digest('hex');
export const R11_COMPACT_GUIDE=[
 'You are an inventive building architect. Invent ONE original building specifically for the Japanese user request; never copy a fixed floorplan.',
 'Output exactly ONE complete, valid MINIFIED JSON object, NO markdown or commentary, with EXACT four keys: design, spatialPlan, explanation, assumptions. Close every bracket and quote within the available output tokens; do not stream an unfinished catalogue.',
 'design EXACT keys: schema, id, title, brief, bounds, elements, designOnly. schema="minecraftaibuilder-b143-building-dsl-v1"; designOnly=true. id lowercase-hyphen slug 3..48 chars, title 1..100 chars, brief 1..500 chars; keep title/brief short.',
 'bounds:{width,height,depth} with width/depth 8..128, height 8..96, width*height*depth<=500000. All voxels and shape extents must be inside bounds, all coordinates integers >=0.',
 'elements: unique IDs, original meaningful structural forms, target 10..20 substantive elements, not an arbitrary hard cap. Shape box uses origin:[x,y,z],size:[sx,sy,sz]; ellipsoid center,radii; cylinder origin,axis,radius,length; torus center,axis,majorRadius,tubeRadius; beam start,end,thickness.',
 'Each element has id, shape, mode. add has material stone/concrete/metal/glass/wood/glow/accent; cut must omit material. Use ordered ADD then CUT for real usable interiors, windows and central voids. Do not add arbitrary unsupported fields.',
 'For straight stairs, shape="staircase", mode="add", origin:[x,y,z], axis:"x" or "z", direction:1 or -1, width:2..12, steps:2..32,treadDepth:1..3. One element represents a whole flight; add supported landing floors and clear headroom.',
 'An authored element may use repeat:{count:2..32,offset:[dx,dy,dz]} (nonzero signed integer vector) for identical columns, facade ribs, beams or window CUTs; every translated copy stays inside bounds. Use it only for genuinely repeated forms, not a prescribed building style.',
 'Put real variety in major silhouette, floors, atrium, entrance, glass and meaningful zones. Choose distinct forms that fit THIS request; repetition must not replace original architectural composition.',
 'spatialPlan EXACT keys: designIntent, massStrategy, circulationStrategy, entrance, headroom, protectedVoids, destinations, functionalZones. The three intent strings are short but each >=8 characters. entrance:[x,y,z] is an empty standable cell with solid support, headroom 2 or 3.',
 'protectedVoids: array of {id,origin:[x,y,z],size:[sx,sy,sz],maxOccupiedCells} reflecting actual empty atrium air. destinations: at least one {id,point:[x,y,z],maximumPathSteps}; functionalZones: at least one {id,origin,size,minimumReachablePositions,minimumReachablePercent}. Use honest nontrivial areas, and connect the actual final traversable cells, not fictional paths.',
 'explanation: ONE short string (prefer <=100 characters); assumptions: 0..2 short statements only. Never invent scores, success, Minecraft commands, constructed states or verified walking.',
 'Prioritize complete JSON and substantive geometry rather than many decorative/repeated items or long prose. If space is tight, OMIT lower-priority decor; do NOT omit the functional atrium/floors/entrance/meaningful spatial plan or output incomplete JSON.'
].join('\n');

export const R11_GUIDE_SHA256=hash(R11_COMPACT_GUIDE);
export function inspectR11OriginalRaw(raw,{profile=PROFILE,outputTokenLimit=3072,
 nativeTrace=[]}={}){
 if(typeof raw!=='string'||raw.length>60000)
  throw Error('B198ZR11_ORIGINAL_STRING_BOUND');
 if(profile!==PROFILE||!Number.isSafeInteger(outputTokenLimit)||
  outputTokenLimit<512||outputTokenLimit>4096)
  throw Error('B198ZR11_PROFILE_OR_BUDGET');
 if(!Array.isArray(nativeTrace)||nativeTrace.length>6)
  throw Error('B198ZR11_TRACE_BOUNDS');
 let top=null,parseable=false,exactFourKeys=false,
  sourceElements=null,staircaseElements=null,repeatedElements=null,
  declaredInstanceCount=null;
 try{
  top=JSON.parse(raw);
  parseable=true;
  exactFourKeys=top!==null&&typeof top==='object'&&!Array.isArray(top)&&
   Object.keys(top).length===4&&
   ['design','spatialPlan','explanation','assumptions'].every(
    k=>Object.hasOwn(top,k));
  if(exactFourKeys&&Array.isArray(top.design?.elements)){
   const parts=top.design.elements;
   sourceElements=parts.length;
   staircaseElements=parts.filter(e=>e?.shape==='staircase').length;
   repeatedElements=parts.filter(e=>e?.repeat!==undefined).length;
   declaredInstanceCount=parts.reduce((n,e)=>n+
    (Number.isSafeInteger(e?.repeat?.count)&&e.repeat.count>=2&&
     e.repeat.count<=32?e.repeat.count:1),0);
  }
 }catch{}
 // Only capture model-reported telemetry, not fabricated token estimates
 // based on JSON length, human quality or local model identity.
 const last=nativeTrace.at(-1);
 const evalCount=last&&Number.isSafeInteger(last.generatedTokens)&&
  last.generatedTokens>=0?last.generatedTokens:null;
 const atLimit=evalCount===null?null:evalCount>=outputTokenLimit;
 return {
  schema:SCHEMA,profile,profileGuideSha256:R11_GUIDE_SHA256,
  rawSha256:hash(raw),rawUtf8Bytes:Buffer.byteLength(raw),
  exactFourKeyJsonParseable:parseable&&exactFourKeys,
  structurallyValidR4Certified:false,
  compileAndReachabilityCertified:false,
  originalModelIdentityVerified:false,
  actualModelTokenUsage:evalCount,
  modelReportedOutputLimitReached:atLimit,
  sourceElements,staircaseElements,repeatedElements,declaredInstanceCount,
  noAutomaticRepairOrRetry:true,
  modelCallsInitiatedByInspection:0,
  safety:{readiness:'NOT_PREPARED',constructionApproved:false,
   worldContacts:0,worldWrites:0,gates:Array(9).fill('BLOCKED'),
   BuildPlan:{operations:[]}}
 };
}
