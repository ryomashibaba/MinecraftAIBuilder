/**
 * E2 strict, independent read-only diagnostics on the model's ORIGINAL JSON.
 * Report multiple structural faults rather than stopping at the first
 * fail-closed validation error. Does NOT normalize, fix or compile bad inputs.
 */
import {E2_SCHEMA,compileE2Architecture} from './r190-e2-architecture.mjs';
import {SCHEMA as B143_SCHEMA,validateDesign} from './b143-building-dsl.mjs';
const obj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const int=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const slug=v=>typeof v==='string'&&/^[a-z][a-z0-9-]{2,39}$/.test(v);
const label=v=>typeof v==='string'&&v.length>=2&&v.length<=150&&
 !/[\u0000-\u001f<>]/.test(v);
const faces=['north','south','east','west'];
const key=(a,b,c)=>a+','+b+','+c;

/** This result is a diagnosis, NOT a source certification or a repair proposal. */
export function diagnoseE2AuthoredPlan(plan){
 const issues=[];
 const add=(code,path,actual,expected)=>issues.push({code,path,actual,expected});
 const required=(item,keys,field)=>{
  if(!obj(item)){add('OBJECT_REQUIRED',field,item,'object with '+keys.join(','));return false;}
  for(const k of keys)if(!Object.hasOwn(item,k))
   add('MISSING_FIELD',field+'.'+k,null,'required');
  for(const k of Object.keys(item))if(!keys.includes(k))
   add('UNKNOWN_FIELD',field+'.'+k,item[k],'not allowed');
  return true;
 };
 const top=['schema','sourceDesign','programSpaces','entrance','glazedOpenings'];
 if(!required(plan,top,'$'))return {schema:'e2-original-diagnosis-v1',issues,sourceAudit:'SKIPPED_INVALID_INPUT',worldWrites:0,modelRequests:0};
 if(plan.schema!==E2_SCHEMA)add('SCHEMA_INVALID','schema',plan.schema,E2_SCHEMA);
 const design=plan.sourceDesign;
 let b143Okay=false;
 if(!obj(design))add('SOURCE_DESIGN_MISSING','sourceDesign',design,'B143 object');
 else {
  if(design.schema!==B143_SCHEMA)add('B143_SCHEMA_INVALID','sourceDesign.schema',design.schema,B143_SCHEMA);
  try{validateDesign(design);b143Okay=true;}
  catch(e){add('B143_VALIDATION','sourceDesign',String(e?.message??e).slice(0,240),'strict B143 design contract');}
 }
 const bounds=design?.bounds, w=bounds?.width,d=bounds?.depth,h=bounds?.height;
 const validBounds=int(w,8,100000)&&int(d,8,100000)&&int(h,5,100000);
 if(!validBounds)add('BOUNDS_UNAVAILABLE','sourceDesign.bounds',bounds,
  'valid integer B143 width, depth, height before zone arithmetic');
 const spaces=plan.programSpaces;
 const spaceIds=new Set();
 if(!Array.isArray(spaces)||spaces.length<2||spaces.length>6)
  add('PROGRAM_COUNT','programSpaces',Array.isArray(spaces)?spaces.length:typeof spaces,'2..6 spaces');
 if(Array.isArray(spaces))for(let i=0;i<spaces.length;i++){
  const s=spaces[i],base='programSpaces['+i+']';
  if(!required(s,['id','purpose','zone','witness'],base))continue;
  if(!slug(s.id)||spaceIds.has(s.id))add('PROGRAM_ID',base+'.id',s.id,
   'distinct lowercase kebab-case 3..40 chars');
  if(slug(s.id))spaceIds.add(s.id);
  if(!label(s.purpose))add('PROGRAM_PURPOSE',base+'.purpose',s.purpose,'2..150 printable chars');
  const z=s.zone;
  if(!Array.isArray(z)||z.length!==4){
   add('PROGRAM_ZONE_FORMAT',base+'.zone',z,'[x,z,width,depth]');
  }else if(validBounds){
   const [x,y,wide,deep]=z;
   if(!int(x,0,w-4))add('PROGRAM_ZONE_X',base+'.zone[0]',x,'integer 0..'+(w-4));
   if(!int(y,0,d-4))add('PROGRAM_ZONE_Z',base+'.zone[1]',y,'integer 0..'+(d-4));
   if(!int(wide,4,w-x))add('PROGRAM_ZONE_WIDTH',base+'.zone[2]',wide,
    Number.isSafeInteger(x)&&x>=0&&x<=w-4?'integer 4..'+(w-x):'valid x then integer width >=4 within bounds');
   if(!int(deep,4,d-y))add('PROGRAM_ZONE_DEPTH',base+'.zone[3]',deep,
    Number.isSafeInteger(y)&&y>=0&&y<=d-4?'integer 4..'+(d-y):'valid z then integer depth >=4 within bounds');
  }
  const witness=s.witness;
  if(!Array.isArray(witness)||witness.length!==2||
   !witness.every(x=>Number.isSafeInteger(x)))
   add('PROGRAM_WITNESS_FORMAT',base+'.witness',witness,'integer [x,z] of 2x2 floor pad');
  else if(validBounds){
   if(!int(witness[0],0,w-2)||!int(witness[1],0,d-2))
    add('PROGRAM_WITNESS_SITE',base+'.witness',witness,'2x2 inside source bounds');
   if(Array.isArray(z)&&z.length===4&&z.every(Number.isSafeInteger)&&
    !(witness[0]>=z[0]&&witness[1]>=z[1]&&
      witness[0]+1<z[0]+z[2]&&witness[1]+1<z[1]+z[3]))
    add('PROGRAM_WITNESS_ZONE',base+'.witness',witness,
     '2x2 floor pad inside authored zone '+JSON.stringify(z));
  }
 }
 const entrance=plan.entrance;
 if(required(entrance,['spaceId','face','approachPad','arrivalPad'],'entrance')){
  if(!spaceIds.has(entrance.spaceId))add('ENTRANCE_SPACE_REFERENCE','entrance.spaceId',entrance.spaceId,'existing programSpaces[].id');
  if(!faces.includes(entrance.face))add('ENTRANCE_FACE','entrance.face',entrance.face,faces);
  for(const name of ['approachPad','arrivalPad']){
   const c=entrance[name];
   if(!Array.isArray(c)||c.length!==2||!c.every(Number.isSafeInteger))
    add('ENTRANCE_PAD_FORMAT','entrance.'+name,c,'integer [x,z]');
   else if(validBounds&&(!int(c[0],0,w-2)||!int(c[1],0,d-2)))
    add('ENTRANCE_PAD_BOUNDS','entrance.'+name,c,'2x2 pad inside source bounds');
  }
  const approach=entrance.approachPad;
  if(validBounds&&Array.isArray(approach)&&approach.length===2&&
   approach.every(Number.isSafeInteger)&&faces.includes(entrance.face)&&
   !((entrance.face==='south'&&approach[1]===0)||
     (entrance.face==='north'&&approach[1]===d-2)||
     (entrance.face==='west'&&approach[0]===0)||
     (entrance.face==='east'&&approach[0]===w-2)))
   add('ENTRANCE_BOUNDARY','entrance.approachPad',approach,'2x2 pad touches declared site face');
  const target=Array.isArray(spaces)?spaces.find(x=>x?.id===entrance.spaceId):null;
  const a=entrance.arrivalPad,z=target?.zone;
  if(Array.isArray(a)&&a.length===2&&a.every(Number.isSafeInteger)&&
   Array.isArray(z)&&z.length===4&&z.every(Number.isSafeInteger)&&
   !(a[0]>=z[0]&&a[1]>=z[1]&&a[0]+1<z[0]+z[2]&&a[1]+1<z[1]+z[3]))
   add('ENTRANCE_ARRIVAL_ZONE','entrance.arrivalPad',a,
    '2x2 pad inside zone of '+entrance.spaceId);
 }
 const glaz=plan.glazedOpenings;
 if(!Array.isArray(glaz)||glaz.length<1||glaz.length>8)
  add('GLAZING_COUNT','glazedOpenings',Array.isArray(glaz)?glaz.length:typeof glaz,'1..8');
 const used=new Set();
 if(Array.isArray(glaz))for(let i=0;i<glaz.length;i++){
  const g=glaz[i],base='glazedOpenings['+i+']';
  if(!required(g,['spaceId','face','origin','width','height'],base))continue;
  if(!spaceIds.has(g.spaceId))add('GLAZING_SPACE_REFERENCE',base+'.spaceId',g.spaceId,'existing programSpaces[].id');
  if(!faces.includes(g.face))add('GLAZING_FACE',base+'.face',g.face,faces);
  if(!Array.isArray(g.origin)||g.origin.length!==3||!g.origin.every(Number.isSafeInteger))
   add('GLAZING_ORIGIN',base+'.origin',g.origin,'integer [x,y,z]');
  if(!int(g.width,2,8))add('GLAZING_WIDTH',base+'.width',g.width,'integer 2..8');
  if(!int(g.height,2,4))add('GLAZING_HEIGHT',base+'.height',g.height,'integer 2..4');
  if(validBounds&&Array.isArray(g.origin)&&g.origin.length===3&&g.origin.every(Number.isSafeInteger)&&
   int(g.width,2,8)&&int(g.height,2,4)&&faces.includes(g.face)){
   const [x,y,z]=g.origin,ns=g.face==='north'||g.face==='south';
   const lastX=x+(ns?g.width-1:0),lastZ=z+(ns?0:g.width-1);
   if(!(x>=1&&z>=1&&lastX<w-1&&lastZ<d-1&&y>=3&&y+g.height<h))
    add('GLAZING_SITE_BOUNDS',base+'.origin',g.origin,
     'window full rectangle contained in width='+w+', depth='+d+', height='+h);
   for(let v=0;v<g.height;v++)for(let u=0;u<g.width;u++){
    const k=key(x+(ns?u:0),y+v,z+(ns?0:u));
    if(used.has(k))add('GLAZING_DUPLICATE_CELL',base,k,'no overlapping glass cells');
    used.add(k);
   }
  }
 }
 // Do not invoke expensive physical compile or falsely certify when structural
 // issues were found. The final canonical source contract is still authoritative.
 let sourceAudit='SKIPPED_INVALID_INPUT';
 if(issues.length===0&&b143Okay){
  try{const result=compileE2Architecture(plan);
   sourceAudit=result.sourceReady?'SOURCE_WITNESS_READY_ART_HOLD':'SOURCE_HOLD';
  }catch(e){
   sourceAudit='SOURCE_HOLD';
   add('PHYSICAL_SOURCE_HOLD','sourceDesign',String(e?.message??e).slice(0,240),
    'existing strict SOURCE and functional geometry contract');
  }
 }
 return {schema:'e2-original-diagnosis-v1',issues,sourceAudit,
  independentlyDetectedIssues:issues.length,
  canonicalValidator:'UNCHANGED',fixesApplied:0,originalModified:false,
  modelRequests:0,worldWrites:0,worldContacts:0};
}
