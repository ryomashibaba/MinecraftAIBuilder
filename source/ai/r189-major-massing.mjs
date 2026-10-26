/**
 * R189 — vertical massing intent translated to physically DIFFERENT
 * front/rear rooflines; no more local punched-window iterations.
 *
 * All 4 major region envelopes are directly declared in the candidate IR.
 * Their semantic labels select no hidden typology: the exact cut coordinates
 * from caller are used for true B143 voxel compilation after STRICT bounded
 * envelope, function-preservation and front/rear silhouette validation.
 *
 * Source-only STATIC SYNTHETIC authoring: not new Qwen/Gemma inference,
 * Minecraft construction, actual walking or structural engineering.
 */
import {createHash} from 'node:crypto';
import {R188_SCHEMA,compileR188InhabitedFrontage,auditR188InhabitedFrontage}
 from './r188-inhabited-frontage.mjs';
import {compileDesign,verifyCompiled}
 from './b143-building-dsl.mjs';

export const R189_SCHEMA='minecraftaibuilder-r189-massing-priority-study-v1';
const fail=s=>{throw Error('R189_MAJOR_VOLUME_'+s)};
const exact=(o,keys)=>o!==null&&typeof o==='object'&&
 !Array.isArray(o)&&Object.keys(o).length===keys.length&&
 keys.every(k=>Object.hasOwn(o,k));
const isInt=(n)=>Number.isSafeInteger(n);
const key=(x,y,z)=>x+','+y+','+z;
const sha=s=>createHash('sha256').update(s).digest('hex');
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,worldWrites:0,worldContacts:0,
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}});
export const R189_REGIONS=Object.freeze({
 'west-public-front':{x:[6,18],y:[10,15],z:[9,17]},
 'west-back-quiet':{x:[6,18],y:[11,15],z:[33,38]},
 'east-public-front':{x:[31,42],y:[12,21],z:[8,16]},
 'east-rear-high-court':{x:[31,38],y:[16,21],z:[33,41]}
});
export const R189_INSTRUCTIONS=[
 'Research opt-in: JSON exactly {schema,base,majorMassing}.',
 'schema minecraftaibuilder-r189-massing-priority-study-v1.',
 'base is entire validated R188 reply, with original rooms and routes.',
 'majorMassing exactly {architecturalIntent,volumes}.',
 'architecturalIntent=low-public-front-central-occupied-high-back.',
 'volumes is 4 exact {sector,origin,size} source proposals, one',
 'per named regional envelope west-public-front/west-back-quiet/',
 'east-public-front/east-rear-high-court; each must span the',
 'entire horizontal region and contain >=3 meaningful vertical voxels.',
 'HOST does not choose a shape from use labels. Explicit caller cut',
 'coordinates directly subtract REAL B143 roof/body cells. Validated',
 'functional stairs/room/exhibition/skycourt/public paths must survive.',
 'Strong front/rear skyline changes required; no Minecraft operations,',
 'structural construction or model-authorship claims permitted.'
].join('\n');

function parse(raw){
 if(typeof raw!=='string'||raw.length<100||raw.length>32000)
  fail('RAW_IR_BOUNDS');
 let q;try{q=JSON.parse(raw)}catch{fail('INVALID_JSON')}
 if(!exact(q,['schema','base','majorMassing'])||
  q.schema!==R189_SCHEMA||q.base?.schema!==R188_SCHEMA||
  !exact(q.majorMassing,['architecturalIntent','volumes'])||
  q.majorMassing.architecturalIntent!==
   'low-public-front-central-occupied-high-back'||
  !Array.isArray(q.majorMassing.volumes)||
  q.majorMassing.volumes.length!==4)
  fail('EXPLICIT_SOURCE_MASSING_IR');
 const names=new Set();
 for(const v of q.majorMassing.volumes){
  if(!exact(v,['sector','origin','size'])||
   !Object.hasOwn(R189_REGIONS,v.sector)||names.has(v.sector)||
   !Array.isArray(v.origin)||v.origin.length!==3||
   !Array.isArray(v.size)||v.size.length!==3||
   ![...v.origin,...v.size].every(isInt)||
   v.size.some(n=>n<1))
   fail('MAJOR_VOLUMES_FIELDS');
  names.add(v.sector);
  const r=R189_REGIONS[v.sector],
   end=v.origin.map((n,i)=>n+v.size[i]-1);
  if(v.origin[0]!==r.x[0]||end[0]!==r.x[1]||
   v.origin[2]!==r.z[0]||end[2]!==r.z[1]||
   v.origin[1]<r.y[0]||end[1]!==r.y[1]||
   v.size[1]<3)
   fail('DECLARED_BODY_REDUCTIONS_OUTSIDE_PROTECTED_REGIONS');
 }
 if(names.size!==4)fail('FOUR_INDEPENDENT_MASS_REGIONS_REQUIRED');
 return q;
}
const index=compiled=>new Map(compiled.primitives.map(p=>
 [key(p[0],p[1],p[2]),p[3]]));
const inVolume=(p,v)=>p.every((n,i)=>
 n>=v.origin[i]&&n<v.origin[i]+v.size[i]);
function top(map,x,z){
 for(let y=31;y>=2;y--)if(map.has(key(x,y,z)))return y;
 return -1;
}
export function auditR189TrueMassing(design,compiled,baseline,volumes){
 if(!verifyCompiled(design,compiled)||
  !verifyCompiled(baseline.design,baseline.compiled))
  fail('REAL_B143_SOURCE_UNVERIFIED');
 // Every old R188 functional zone + R187 sunlight/court and R186
 // stepped stair/room exhibit stays live in the *new* actual voxels.
 const inherited=auditR188InhabitedFrontage(design,compiled);
 if(inherited.groundAndUpperEntranceZoneWitnesses.length!==5||
  inherited.groundAndUpperEntranceZoneWitnesses.some(z=>!z.reachedFromEntrance)||
  inherited.actualExhibitServiceWitness.reachableFromEntrance!==true)
  fail('ORIGINAL_FUNCTIONAL_SOURCE_REGRESSION');
 const before=index(baseline.compiled),after=index(compiled);
 const originalCellCount=before.size,newCellCount=after.size;
 let changed=0,removed=0,materialChanged=0;
 for(const [k,mat] of before){
  const xyz=k.split(',').map(Number),next=after.get(k);
  if(next!==mat){
   if(!volumes.some(v=>inVolume(xyz,v)))
    fail('UNDECLARED_ORIGINAL_GEOMETRY_DAMAGED');
   if(next!==undefined)materialChanged++;
   else removed++;
   changed++;
  }
 }
 if(after.size!==before.size-removed||
  materialChanged!==0||removed<1200||changed!==removed)
  fail('NOT_A_GENUINE_SUPPORTED_ENVELOPE_RECONFIGURATION');
 const regions=volumes.map(v=>{
  const x0=v.origin[0],x1=x0+v.size[0]-1,
   z0=v.origin[2],z1=z0+v.size[2]-1;
  const rows=[];
  let realHeightChanges=0,largeCuts=0,maximumDrop=0;
  for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++){
   const oldY=top(before,x,z),newY=top(after,x,z),
    drop=oldY-newY;
   if(drop>=3)realHeightChanges++;
   if(drop>=4)largeCuts++;
   maximumDrop=Math.max(maximumDrop,drop);
   rows.push([x,z,oldY,newY,drop]);
  }
  const count=rows.length;
  const ratio=largeCuts/count;
  if(count<40||realHeightChanges/count<0.60||
   ratio<0.52||maximumDrop<4)
   fail('FRONTAL_OR_REAR_ROOFLINE_NOT_PHYSICALLY_RESHAPED_'+v.sector);
  return {sector:v.sector,origin:v.origin,size:v.size,
   sampledTopPlanCells:count,
   realRooflineCellsLoweredAtLeast3:realHeightChanges,
   realRooflineCellsLoweredAtLeast4:largeCuts,
   proportionClearlyLowered:ratio,maximumActualHeightReduction:maximumDrop,
   exactHeightBeforeAfter:rows};
 });
 const has=(x,y,z)=>after.has(key(x,y,z));
 // A continuous high circulation/room core is preserved between the
 // LOWER forecourt and LOWER rear mass. No fantasy "room completed".
 for(const [x,z,lo,hi] of [[17,23,9,15],[33,19,9,21],
  [39,37,10,21]]){
  for(let y=lo;y<=hi;y++){
   if(!has(x,y,z))fail('REAL_RETAINED_OCCUPIED_CORE_DISCONNECTED');
  }
 }
 // The 4 differentiated skyline sectors remain distinct: west low
 // frontage, west medium stair mass, east lowered entry and high rear.
 for(const [x,z,low,high] of [[8,10,6,10],[8,30,13,15],
  [33,11,8,12],[39,37,18,21]]){
  const y=top(after,x,z);
  if(y<low||y>high)fail('INTENDED_HIERARCHY_NOT_VISIBLE_IN_VOXELS_'+x+'_'+z+'_'+y);
 }
 return {schema:'r189-physical-height-massing-source-audit-v1',
  beforeVoxels:originalCellCount,afterVoxels:newCellCount,
  trulyRemovedB143Cells:removed,
  oldCellsChangedOutsideCallerBounds:0,materialChanged:0,
  rooflineRegions:regions,
  everyOriginalR188FunctionSourceVerified:true,
  fullyVerifiedR186StairAndOneRoom:true,
  fullyVerifiedR187DaylitAccessibleTerrace:true,
  stillNotProven:['STAIR_MINECRAFT_PHYSICS','STRUCTURAL_ENGINEERING',
   'OTHER_TWO_PROGRAM_ROOMS','REAL_QWEN_GEMMA_GENERATION',
   'CONSTRUCTION_APPROVAL','HUMAN_ART_PASS'],
  artStatus:'ART_HOLD',...safety()};
}

export function compileR189MajorVolumeStudy(raw){
 const q=parse(raw);
 let baseline;
 try{baseline=compileR188InhabitedFrontage(JSON.stringify(q.base));}
 catch{fail('FAILED_TO_COMPILE_VERIFIED_R188_BASE')}
 if(!verifyCompiled(baseline.design,baseline.compiled)||
  baseline.review?.groundAndUpperEntranceZoneWitnesses?.length!==5)
  fail('ORIGINAL_REAL_FUNCTIONAL_MODEL_MISSING');
 const design=structuredClone(baseline.design);
 const cuts=q.majorMassing.volumes;
 for(const v of cuts)
  design.elements.push({id:'r189-'+v.sector,shape:'box',mode:'cut',
   origin:v.origin.slice(),size:v.size.slice()});
 if(design.elements.length>160)fail('SOURCE_ELEMENT_BUDGET');
 const compiled=compileDesign(design);
 const evidence=auditR189TrueMassing(design,compiled,baseline,cuts);
 return {
  schema:'r189-major-three-dimensional-form-study-v1',
  modelAuthorship:'STATIC_SYNTHETIC_CALLER_SOURCE_NOT_REAL_LLM',
  rawSourceReply:raw,originalRawSha256:sha(raw),
  originalR188GeometrySha256:baseline.compiled.geometrySha256,
  resultingGeometrySha256:compiled.geometrySha256,
  design,compiled,sourceOnly:true,modelCalls:0,
  evidence,artStatus:'ART_HOLD_HUMAN_REVIEW_REQUIRED',
  ...safety()
 };
}
