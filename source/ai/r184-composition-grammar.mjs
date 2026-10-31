/**
 * R184 ART-FIRST alternate architecture grammar study.
 * Three alternative WHOLE BUILDING compositions share one conceptual
 * program. This deliberately breaks from R181-R183's 32x32 three boxes.
 *
 * Static caller-authored hypothesis only. No local LLM, room/route proof,
 * Minecraft APIs or world contacts. Geometric B143 evidence is inspectable.
 */
import {createHash} from 'node:crypto';
import {SCHEMA as B143,compileDesign,verifyCompiled}
 from './b143-building-dsl.mjs';

export const R184_SCHEMA='minecraftaibuilder-r184-composition-research-v1';
export const FORM_FAMILIES=Object.freeze([
 'inhabited-rotunda','elevated-crossing','folded-ground']);
const err=s=>{throw Error('R184_COMPOSITION_'+s);};
const exact=(o,keys)=>o!==null&&typeof o==='object'&&!Array.isArray(o)&&
 Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
const int=(n,lo,hi)=>Number.isSafeInteger(n)&&n>=lo&&n<=hi;
const sha=s=>createHash('sha256').update(s).digest('hex');
const key=(x,y,z)=>x+','+y+','+z;
const safe=()=>({readiness:'NOT_PREPARED',executionAllowed:false,
 constructionApproved:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},worldWrites:0,worldContacts:0});
export const R184_RESEARCH_INSTRUCTIONS=[
 'Use one explicit static architecture research hypothesis per reply.',
 'Top level fields: schema,id,title,brief,site,program,composition.',
 'schema=minecraftaibuilder-r184-composition-research-v1.',
 'site={width:48,height:32,depth:48}. Local source coordinates only.',
 'program has three conceptual uses: gathering, focused, support.',
 'composition={grammar,publicSpace,verticalContrast,dominantUse}.',
 'grammars inhabited-rotunda/elevated-crossing/folded-ground.',
 'publicSpace must match grammar: central-court/underpass/roof-walk.',
 'dominantUse must equal a declared use id. Host translates into a',
 'PHYSICAL 3D FORM hypothesis, not a working furnished building.',
 'No room access, feature use, Minecraft walking, or aesthetic pass',
 'may be inferred from conceptual labels. Invalid inputs are HOLD.'
].join('\n');

export function validateR184Hypothesis(raw){
 if(typeof raw!=='string'||raw.length<50||raw.length>12000)
  err('RAW_BOUNDS');
 let r;try{r=JSON.parse(raw)}catch{err('JSON')}
 if(!exact(r,['schema','id','title','brief','site','program','composition'])||
  r.schema!==R184_SCHEMA||!(/^[a-z][a-z0-9-]{2,39}$/).test(r.id)||
  typeof r.title!=='string'||r.title.length<3||r.title.length>100||
  typeof r.brief!=='string'||r.brief.length<3||r.brief.length>500||
  !exact(r.site,['width','height','depth'])||
  r.site.width!==48||r.site.height!==32||r.site.depth!==48||
  !exact(r.program,['zones','functionalVerification'])||
  r.program.functionalVerification!=='NOT_TESTED'||
  !Array.isArray(r.program.zones)||r.program.zones.length!==3||
  !exact(r.composition,['grammar','publicSpace','verticalContrast','dominantUse']))
  err('RESEARCH_IR_CONTRACT');
 const roles=new Set();
 const zoneIds=new Set();
 for(const z of r.program.zones){
  if(!exact(z,['id','role','areaPriority'])||
   typeof z.id!=='string'||!/^[a-z][a-z0-9-]{2,23}$/.test(z.id)||
   zoneIds.has(z.id)||roles.has(z.role)||
   !['gathering','focused','support'].includes(z.role)||
   !['primary','secondary','tertiary'].includes(z.areaPriority))
   err('PROGRAM_ZONE_FIELDS');
  roles.add(z.role);zoneIds.add(z.id);
 }
 if(roles.size!==3||!zoneIds.has(r.composition.dominantUse)||
  !FORM_FAMILIES.includes(r.composition.grammar)||
  !int(r.composition.verticalContrast,1,3))
  err('COMPOSITION_PROGRAM_LINK');
 const nameToSpace={
  'inhabited-rotunda':'central-court',
  'elevated-crossing':'underpass',
  'folded-ground':'roof-walk'
 };
 if(r.composition.publicSpace!==nameToSpace[r.composition.grammar])
  err('GRAMMAR_PUBLIC_SPACE_CONFLICT');
 return r;
}

export function compileR184Hypothesis(raw){
 const ir=validateR184Hypothesis(raw),m=ir.composition;
 const elements=[];
 const box=(id,mode,material,origin,size)=>{
  elements.push({id,shape:'box',mode,...(mode==='add'?{material}:{}),origin,size});
 };
 const cylinder=(id,mode,material,origin,axis,radius,length)=>{
  elements.push({id,shape:'cylinder',mode,
   ...(mode==='add'?{material}:{}),origin,axis,radius,length});
 };
 const beam=(id,material,start,end,thickness)=>{
  elements.push({id,shape:'beam',mode:'add',material,start,end,thickness});
 };
 const torus=(id,material,center,axis,majorRadius,tubeRadius)=>{
  elements.push({id,shape:'torus',mode:'add',material,
   center,axis,majorRadius,tubeRadius});
 };
 // Each program uses the SAME high-level three functional roles.
 // These are composition STUDIES, not furnished/inhabitable buildings.
 // Host does not silently convert a label into an accessible real room.
 box('site-supported-floor','add','stone',[3,1,3],[42,1,42]);
 const v=m.verticalContrast;
 if(m.grammar==='inhabited-rotunda'){
  // Continuous radial perimeter with a physically open central courtyard.
  cylinder('curved-main-perimeter','add','concrete',[24,2,24],
   'y',17,11+v);
  cylinder('courtyard-air-core','cut',null,[24,2,24],
   'y',10,19);
  // Actual six-wide southern public passage, continuing to the court.
  box('southern-portal-void','cut',null,[21,2,6],[6,7,12]);
  box('east-open-air-break','cut',null,[35,6,17],[8,6,16]);
  torus('ribbon-crown','metal',[24,12+v,24],'y',15,2);
  // Diagonal structural composition, not fake zonal furnishing.
  beam('court-spanning-structural-line','metal',[14,14,16],
   [34,12,32],1);
  box('east-court-deck','add','wood',[34,2,21],[7,1,10]);
  // Glazing stays within the physical outer envelope.
  box('front-light-cut','cut',null,[12,5,9],[7,3,2]);
  box('front-light-glass','add','glass',[12,5,9],[7,3,2]);
 }else if(m.grammar==='elevated-crossing'){
  // Three strongly differentiated horizontal/vertical masses. The
  // central raised bridge is genuinely separated from ground by air.
  box('west-ground-hall','add','concrete',[5,2,6],[14,10+v,35]);
  box('west-open-atrium','cut',null,[8,3,13],[7,8,20]);
  box('east-tall-core','add','concrete',[30,2,10],[13,16+v,27]);
  box('east-doubled-height-void','cut',null,[34,4,14],[5,12,20]);
  box('raised-occupied-spine-study','add','metal',[15,17,15],
   [22,5,17]);
  box('raised-axis-clearance','cut',null,[19,18,18],[13,3,11]);
  beam('diagonal-west-tie','accent',[15,10,10],[31,21,15],2);
  beam('diagonal-east-tie','accent',[33,17,36],[16,20,31],2);
  box('crossing-top-sunshade','add','concrete',[12,23,13],
   [28,1,20]);
  // An open-air ground underpass is a genuine void in the bridge plane.
  box('ground-through-way','cut',null,[19,2,16],[10,8,17]);
  box('front-east-window-cut','cut',null,[34,10,10],[5,4,1]);
  box('front-east-window-glass','add','glass',[34,10,10],[5,4,1]);
 }else{
  // Four progressively rising plates FOLLOW A CONNECTED GROUND RIBBON.
  // Vary y as well as x,z and carve a genuine central negative-space
  // canyon rather than stacking independent rectangular three wings.
  box('low-public-bar','add','concrete',[5,2,7],[38,4+v,11]);
  box('middle-rising-plate','add','concrete',[10,5,16],[32,5,11]);
  box('upper-rising-plate','add','concrete',[16,8,25],[25,5,11]);
  box('upper-east-landing','add','concrete',[24,11,33],[17,5,10]);
  box('open-terrain-canyon','cut',null,[17,2,11],[12,16,30]);
  box('front-entry-void','cut',null,[12,2,7],[9,5,9]);
  // Real separately elevated walkable-looking plate surfaces but no
  // source route certification yet.
  box('terrace-one','add','wood',[8,7,17],[8,1,9]);
  box('terrace-two','add','wood',[11,10,27],[7,1,9]);
  box('terrace-three','add','wood',[28,16,34],[12,1,7]);
  beam('fold-diagonal-roofline','metal',[8,10,16],[39,19,38],1);
  beam('counterfold-structure','metal',[12,6,9],[36,16,41],1);
  box('front-window-cut','cut',null,[28,4,7],[10,2,2]);
  box('front-window-glass','add','glass',[28,4,7],[10,2,2]);
 }
 const design={schema:B143,id:'r184-'+ir.id,title:ir.title,
  brief:ir.brief,bounds:{...ir.site},designOnly:true,elements};
 const compiled=compileDesign(design);
 if(!verifyCompiled(design,compiled)||compiled.primitives.length<1500)
  err('B143_PHYSICAL_SOURCE_INVALID');
 const voxels=new Set(compiled.primitives.map(p=>key(p[0],p[1],p[2])));
 const solid=(x,y,z)=>voxels.has(key(x,y,z));
 const required={
  'inhabited-rotunda':{
   present:[[24,1,24],[30,7,9],[41,5,24]],
   absent:[[24,8,24],[24,5,11]]},
  'elevated-crossing':{
   present:[[24,17,16],[24,23,18],[6,5,7]],
   absent:[[24,8,24],[24,19,21]]},
  'folded-ground':{
   present:[[6,3,10],[30,12,35],[20,1,30]],
   absent:[[20,10,30],[20,4,12]]}
 }[m.grammar];
 if(required.present.some(p=>!solid(...p))||
  required.absent.some(p=>solid(...p)))
  err('ACTUAL_GEOMETRY_PROBES_FAILED');
 const roofMap=new Map();
 for(const [x,y,z] of compiled.primitives){
  if(y<2)continue;
  const k=x+','+z;
  roofMap.set(k,Math.max(roofMap.get(k)??0,y));
 }
 const uniqueHeights=new Set(roofMap.values());
 const aboveGround=compiled.primitives.filter(p=>p[1]>=3).length;
 if(uniqueHeights.size<4||aboveGround<1200)
  err('TOO_LITTLE_COMPOSITIONAL_VARIATION');
 const spatialMetrics={
  realVoxels:compiled.primitives.length,
  materializedElements:design.elements.length,
  occupiedGroundPlanCells:roofMap.size,
  occupiedHighVoxelCells:aboveGround,
  distinctTopHeights:uniqueHeights.size,
  maximumTopHeight:Math.max(...uniqueHeights),
  minimumOccupiedTopHeight:Math.min(...uniqueHeights),
  physicalSourceGeometrySha256:compiled.geometrySha256,
  physicalSourceSha256:compiled.sourceSha256,
  actualProbeWitnesses:required,
  // Important: this is a massing test, NOT room or walking verification.
  roomVolumes:'NOT_MODELED',
  actualEntranceRoute:'NOT_TESTED',
  furnitureAndFixtures:'NOT_MODELED',
  minecraftTraversal:'NOT_TESTED'
 };
 return {schema:'r184-genuine-source-composition-study-v1',
  originalRawSha256:sha(raw),rawSyntheticIR:raw,parsedIR:ir,
  modelAuthenticity:'CALLER_AUTHORED_SYNTHETIC_NOT_LLM',
  design,compiled,spatialMetrics,sourceOnly:true,modelCalls:0,
  aestheticStatus:'ART_HOLD',...safe()};
}
