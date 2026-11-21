/**
 * R190-AQ — Author-owned architectural parti, NOT room-template dispatch.
 * Pure local research: explicit added forms, negative volumes, and path anchors.
 * B143 CSG is an honest subtractive operation in SOURCE ONLY; never world CUT.
 * This is deliberately separate from AF/AG/AJ automatic model invocation.
 */
import {createHash} from 'node:crypto';
import {SCHEMA as B143,compileDesign,validateDesign,verifyCompiled} from './b143-building-dsl.mjs';
export const R190AQ_SCHEMA='minecraftaibuilder-r190aq-author-parti-v1';
const fail=x=>{throw Error('R190AQ_'+x);};
const yes=(condition,reason)=>{if(!condition)fail(reason);};
const keys=(x,wanted)=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&
 Object.keys(x).length===wanted.length&&wanted.every(k=>Object.hasOwn(x,k));
const int=(n,a,b)=>Number.isSafeInteger(n)&&n>=a&&n<=b;
const slug=s=>typeof s==='string'&&/^[a-z][a-z0-9-]{2,39}$/.test(s);
const safe=(s,max=200)=>typeof s==='string'&&s.length>=8&&s.length<=max&&
 !/[\u0000-\u001f<>]/.test(s);
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const xy=p=>p.join(',');
const cell=(x,y,z)=>x+','+y+','+z;
const SAFETY=()=>({readiness:'NOT_PREPARED',executionAllowed:false,
 constructionApproved:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},worldContacts:0,worldWrites:0,art:'ART_HOLD'});
const permittedGeometry=['id','shape','mode','material','origin','size','center','radii',
 'axis','radius','length','shell','start','end','thickness'];
const checkElement=(v,mode)=>{
 yes(v!==null&&typeof v==='object'&&!Array.isArray(v)&&
  Object.keys(v).every(k=>permittedGeometry.includes(k))&&
  v.mode===mode&&slug(v.id)&&v.repeat===undefined,'ELEMENT_OWNERSHIP');
 yes(['box','ellipsoid','cylinder','beam'].includes(v.shape),'ELEMENT_SHAPE');
 yes(mode==='cut'?v.material===undefined:true,'VOID_CANNOT_ADD');
};
export function validateR190AQParti(p){
 yes(keys(p,['schema','id','title','brief','site','concept','masses','voids','programAnchors']),
  'TOP_LEVEL_FIELDS');
 yes(p.schema===R190AQ_SCHEMA&&slug(p.id)&&safe(p.title,100)&&
  safe(p.brief,800),'IDENTITY');
 yes(keys(p.site,['width','height','depth'])&&
  int(p.site.width,32,80)&&int(p.site.depth,32,80)&&
  int(p.site.height,16,32),'SITE');
 yes(keys(p.concept,['thesis','experientialSequence','whyThisVoid'])&&
  safe(p.concept.thesis,500)&&safe(p.concept.experientialSequence,500)&&
  safe(p.concept.whyThisVoid,500),'CONCEPT');
 yes(Array.isArray(p.masses)&&p.masses.length>=3&&p.masses.length<=20&&
  Array.isArray(p.voids)&&p.voids.length>=2&&p.voids.length<=6,
  'VOLUME_COUNTS');
 const ids=new Set();
 for(const m of p.masses){
  checkElement(m,'add');
  yes(!ids.has(m.id),'DUPLICATE_ID');ids.add(m.id);
 }
 const skyVoids=[];
 let passageCount=0;
 for(const v of p.voids){
  yes(keys(v,['role','geometry','intent'])&&
   ['open-sky','passage','spatial-relief'].includes(v.role)&&
   safe(v.intent,300),'VOID_FIELDS');
  checkElement(v.geometry,'cut');
  yes(!ids.has(v.geometry.id),'DUPLICATE_ID');
  ids.add(v.geometry.id);
  if(v.role==='open-sky'){
   yes(v.geometry.shape==='box'&&
    v.geometry.origin[1]===2&&
    v.geometry.size[1]===p.site.height-2&&
    v.geometry.size[0]>=5&&v.geometry.size[2]>=5,
    'SKY_VOID_VERTICAL_DOMAIN');
   skyVoids.push(v);
  }
  if(v.role==='passage')passageCount++;
 }
 yes(skyVoids.length===1&&passageCount>=1,'SKY_AND_PASSAGE_REQUIRED');
 yes(Array.isArray(p.programAnchors)&&p.programAnchors.length>=3&&
  p.programAnchors.length<=7,'ANCHOR_COUNT');
 const anchors=new Set();
 for(const a of p.programAnchors){
  yes(keys(a,['id','purpose','x','z'])&&slug(a.id)&&
   safe(a.purpose,120)&&int(a.x,0,p.site.width-2)&&
   int(a.z,0,p.site.depth-2)&&!anchors.has(a.id),'ANCHOR_FIELDS');
  anchors.add(a.id);
 }
 const b143={schema:B143,id:p.id,title:p.title,brief:p.brief,
  bounds:{width:p.site.width,height:p.site.height,depth:p.site.depth},
  designOnly:true,elements:[...p.masses,...p.voids.map(v=>v.geometry)]};
 validateDesign(b143); // strict B143 validity incl bounds/budgets
 return true;
}
const pads=(voxels,x,z)=>{
 for(let dx=0;dx<2;dx++)for(let dz=0;dz<2;dz++){
  const X=x+dx,Z=z+dz;
  if(!voxels.has(cell(X,0,Z))||!voxels.has(cell(X,1,Z))||
     voxels.has(cell(X,2,Z))||voxels.has(cell(X,3,Z)))return false;
 }
 return true;
};
export function compileR190AQParti(raw){
 const p=typeof raw==='string'?JSON.parse(raw):raw;
 validateR190AQParti(p);
 const plan=structuredClone(p);
 const design={schema:B143,id:plan.id,title:plan.title,brief:plan.brief,
  bounds:{...plan.site},designOnly:true,
  elements:[...plan.masses,...plan.voids.map(v=>v.geometry)]};
 const compiled=compileDesign(design);
 yes(verifyCompiled(design,compiled),'B143_SOURCE_VERIFICATION');
 const occupied=new Set(compiled.primitives.map(q=>cell(q[0],q[1],q[2])));
 const sky=plan.voids.find(v=>v.role==='open-sky').geometry;
 const [sx,sy,sz]=sky.origin,[sw,sh,sd]=sky.size;
 yes(sy===2&&sh===plan.site.height-2,'SKY_VALIDATION');
 let openSkyColumns=0;
 for(let x=sx;x<sx+sw;x++)for(let z=sz;z<sz+sd;z++){
  for(let y=2;y<plan.site.height;y++)
   yes(!occupied.has(cell(x,y,z)),'SKY_IS_ACTUALLY_BLOCKED');
  yes(occupied.has(cell(x,1,z))&&occupied.has(cell(x,0,z)),
   'SKY_FLOOR_UNSUPPORTED');
  openSkyColumns++;
 }
 const ops=compiled.stats.designOperations;
 const proof=plan.voids.map((v,i)=>{
  const op=ops[plan.masses.length+i];
  yes(op.element===v.geometry.id&&op.mode==='cut'&&
   op.removed>=(v.role==='open-sky'?12:4),'VOID_NOT_EFFECTIVE');
  return {id:v.geometry.id,role:v.role,removedPhysicalB143Cells:op.removed,
   sourceIntent:v.intent};
 });
 const minX=0,minZ=0,maxX=plan.site.width-2,maxZ=plan.site.depth-2;
 const candidates=new Set();
 for(let x=minX;x<=maxX;x++)for(let z=minZ;z<=maxZ;z++)
  if(pads(occupied,x,z))candidates.add(xy([x,z]));
 const starts=plan.programAnchors.map(a=>{
  yes(candidates.has(xy([a.x,a.z])),'ANCHOR_NOT_SUPPORTED_WALKABLE');
  return {id:a.id,purpose:a.purpose,pad:[a.x,a.z]};
 });
 const reached=new Set([xy([starts[0].pad[0],starts[0].pad[1]])]);
 const queue=[[...starts[0].pad]];
 for(let i=0;i<queue.length;i++){
  const [x,z]=queue[i];
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const nx=x+dx,nz=z+dz,k=xy([nx,nz]);
   if(candidates.has(k)&&!reached.has(k)){reached.add(k);queue.push([nx,nz]);}
  }
 }
 for(const a of starts)yes(reached.has(xy(a.pad)),'ANCHOR_ROUTE_NOT_CONNECTED');
 return {schema:'minecraftaibuilder-r190aq-source-study-v1',
  inputParti:plan,inputSha256:hash(plan),design,compiled,
  audit:{sourceVerified:true,modelAuthor:'CALLER_PROVIDED_UNVERIFIED',
   actualAuthorWasModel:'NOT_ESTABLISHED',
   openSkyColumns,physicalVoidProof:proof,
   doubleSupportedWalkingPads:reached.size,
   connectedAnchors:starts,allAnchorsReachable:true,
   actualMinecraftWalking:'NOT_TESTED',
   loadBearingEngineering:'NOT_CERTIFIED',
   purposeExpressedInGeometry:'NOT_CERTIFIED',
   visualQuality:'NOT_CERTIFIED',
   weatherproofing:'NOT_CERTIFIED',
   embodiedDesign:'MASS_VOID_ROUTE_ONLY'},
  modelCallsByCompiler:0,...SAFETY()};
}
export const R190AQ_RESEARCH_GUIDE=[
 'Research-only alternate architectural parti contract (not AF automatic model invocation).',
 'The architect authors concept thesis, experiential sequence, the reason for an open sky void.',
 'The architect must explicitly choose every positive mass and every negative spatial volume.',
 'A negative space is real B143 local CSG, never Minecraft CUT; do not claim native uncut geometry.',
 'No host typology, automatic mass location, host-chosen court, inferred room or aesthetic approval.',
 'Every anchor needs true 2x2 voxel floor at y=0 and y=1 with empty y=2 and 3,',
 'and every anchor must be connected to first anchor by contiguous 2-wide B143 source pads.',
 'One open sky volume must start y=2 and reach site top, its floor must remain supported.',
 'A passage cut must remove real source geometry (not merely label air).',
 'Materials must be B143 supported. No operations, world writes, network/model calls.',
 'Program PURPOSE at anchors is semantic metadata; the host cannot prove that a gallery is a gallery.',
 'Do not create a PR adoption, real model call, or Minecraft construction without separate authorization.'
].join('\n');
