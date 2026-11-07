/** Common mechanical expansion for the existing PRIVATE integrated-shell.
 * No genre/purpose-name dispatch. Existing frozen engine is injected explicitly.
 * Supported scope: 2..6 rectangular room footprints (default 12x10; optional 8..14), parent tree, door/open,
 * shed roofs, north/south entry, explicit flat entry shelter, six fixture kinds.
 * Unsupported profiles/anchors/capacity HOLD; no substitution or retry.
 * Layout is HOST-derived, not model-authored coordinates. Building beauty,
 * structural capacity, semantic function and in-game use remain uncertified.
 */
import {compileDesign as compileB143,SCHEMA as B143} from './b143-building-dsl.mjs';
const SCHEMA='mab-explicit-integrated-shell-v1';
const fail=s=>{throw Error('PRIVATE_SPATIAL_'+s);};
const yes=(x,s)=>{if(!x)fail(s);};
const sides=['east','south','west','north'];
const intersects=(a,b)=>a[0]<b[0]+b[2]&&b[0]<a[0]+a[2]&&a[1]<b[1]+b[3]&&b[1]<a[1]+a[3];
const edge=()=>({distance:0,sides:[],material:'metal'});
const opening=(id,kind,rect,side)=>{
 const [x,z,w,d]=rect;
 if(side==='north'||side==='south')return {id,kind,origin:[x+Math.floor((w-4)/2),2,side==='north'?z:z+d-1],size:[4,3,1]};
 return {id,kind,origin:[side==='west'?x:x+w-1,2,z+Math.floor((d-4)/2)],size:[1,3,4]};
};
// Door join clearance is separate; a shelter join must land OUTSIDE the
// room's wall, on the actual covered approach floor in every orientation.
const pad=o=>o.size[2]===1?[o.origin[0],o.origin[2]-1]:[o.origin[0]-1,o.origin[2]];
const exteriorPad=(o,side)=>({
 north:[o.origin[0],o.origin[2]-1],
 south:[o.origin[0],o.origin[2]+1],
 east:[o.origin[0]+1,o.origin[2]],
 west:[o.origin[0]-1,o.origin[2]]
})[side];
const midpoint=rect=>[rect[0]+Math.floor((rect[2]-2)/2),rect[1]+Math.floor((rect[3]-2)/2)];
export function createIntegratedSpatialHost({deriveIntegratedShell,compileDesign=compileB143}={}){
 yes(typeof deriveIntegratedShell==='function','EXISTING_ENGINE_REQUIRED');
 return {expand(payload){
  const author=structuredClone(payload.authoredChoices),journal=[];
  const intent={schema:SCHEMA,author:'ASSISTANT_EXPLICIT_DERIVATIVE_NOT_HISTORICAL_QWEN',
   purpose:'',baseSourceSha256:'',baseGeometrySha256:'',replacement:{elementIds:['host-seed-marker'],reason:'Replace only the explicit procedural seed marker; preserve the root support floor.'},
   siteBounds:{width:124,height:24,depth:124},spaces:[],
   roof:{form:'shed',axis:'x',range:[1,123],eaveY:6,rise:1},
   materials:{floor:'wood',wall:'concrete',roof:'metal'},partitions:[],openings:[],joins:[],fixtures:[],
   architecture:{roofSections:[],shelters:[],entry:null}};
  yes(author.spaces.length<=6,'ENGINE_ROOF_SECTION_LIMIT');
  yes(author.shelters.length>=1,'ENGINE_REQUIRES_EXPLICIT_ENTRY_SHELTER');
  yes(['north','south'].includes(author.entry.face),'ENGINE_ENTRY_DIRECTION_UNSUPPORTED');
  const reserved=new Map(author.spaces.map(s=>[s.key,new Set()]));
  reserved.get(author.entry.space).add(author.entry.face);
  for(const s of author.shelters)reserved.get(s.connectTo).add(s.edge);
  const byKey=new Map(),attachments=new Map(),fixtureCounts=new Map();
  let base,entry;
  for(const [opIndex,op] of payload.operations.entries()){
   if(op.type==='CONCEPT')intent.purpose=op.concept;
   else if(op.type==='SPACE'){
    const footprint=op.footprint??{width:12,depth:10};
    yes(Number.isSafeInteger(footprint.width)&&Number.isSafeInteger(footprint.depth)&&
     [footprint.width,footprint.depth].every(n=>n>=8&&n<=14),'ROOM_FOOTPRINT_INVALID');
    const cw=footprint.width,cd=footprint.depth;
    let rect=[40,40,cw,cd],side=null,parent;
    if(op.link){
     parent=byKey.get(op.link.to);yes(parent,'MISSING_PARENT');
     side=sides.find(side=>{
      if(reserved.get(parent.id).has(side))return false;
      const childEdge={east:'west',west:'east',north:'south',south:'north'}[side];
      if(reserved.get(op.key).has(childEdge))return false;
      const [x,z,w,d]=parent.rect;
      const c=side==='east'?[x+w-1,z+Math.floor((d-cd)/2),cw,cd]:
       side==='west'?[x-cw+1,z+Math.floor((d-cd)/2),cw,cd]:
       side==='south'?[x+Math.floor((w-cw)/2),z+d-1,cw,cd]:
       [x+Math.floor((w-cw)/2),z-cd+1,cw,cd];
      if(c[0]<2||c[1]<2||c[0]+cw>=123||c[1]+cd>=123)return false;
      if(intent.spaces.some(s=>{
       if(s.id===parent.id||!intersects(c,s.rect))return false;
       const overlapX=Math.min(c[0]+c[2],s.rect[0]+s.rect[2])-Math.max(c[0],s.rect[0]);
       const overlapZ=Math.min(c[1]+c[3],s.rect[1]+s.rect[3])-Math.max(c[1],s.rect[1]);
       // A shared corner is a solid wall column, not an unrequested doorway.
       return overlapX>1||overlapZ>1;
      }))return false;
      rect=c;return true;
     });
     yes(side,'NO_SAFE_PARENT_CONTACT_'+op.key);reserved.get(parent.id).add(side);
     reserved.get(op.key).add({east:'west',west:'east',north:'south',south:'north'}[side]);
     const contactSide={east:'west',west:'east',north:'south',south:'north'}[side];
     const o=opening('contact-'+opIndex,'passage',rect,contactSide),clearPad=pad(o);
     if(op.link.kind==='door'){
      const [x,z,w,d]=rect;
      const vertical=side==='east'||side==='west';
      intent.partitions.push({origin:[vertical?o.origin[0]:x,2,vertical?z:o.origin[2]],
       size:vertical?[1,3,d]:[w,3,1],material:'concrete',toRoof:true});
      intent.openings.push(o);
     }
     intent.joins.push({spaces:[parent.id,op.key],openingId:op.link.kind==='door'?o.id:null,clearPad});
    }
    const space={id:op.key,purpose:op.purpose,rect};
    intent.spaces.push(space);byKey.set(op.key,space);attachments.set(op.key,side);
   }else if(op.type==='ROOF'){
    yes(op.profile==='shed','ENGINE_PROFILE_UNSUPPORTED');
    const space=byKey.get(op.space);yes(space,'MISSING_ROOF_SPACE');
    let [x,z,w,d]=space.rect;const side=attachments.get(op.space);
    // The earlier parent owns their shared wall strip: exact, disjoint roof coverage.
    if(side==='east'){x++;w--;}if(side==='west')w--;
    if(side==='south'){z++;d--;}if(side==='north')d--;
    const eaveY={primary:7,secondary:6,subordinate:5}[op.rank];
    intent.architecture.roofSections.push({id:'roof-'+op.space,rect:[x,z,w,d],eaves:edge(),
     profile:{form:'shed',axis:op.axis,range:op.axis==='x'?[x,x+w-1]:[z,z+d-1],eaveY,rise:1}});
   }else if(op.type==='ENTRY'){
    const s=byKey.get(op.space);yes(s,'ENTRY_SPACE');
    entry=opening('exterior-entrance','entry',s.rect,op.face);intent.openings.push(entry);
   }else if(op.type==='SHELTER'){
    yes(op.roof==='flat','ENGINE_SHELTER_PROFILE_UNSUPPORTED');
    const parent=byKey.get(op.connectTo),[x,z,w,d]=parent.rect;
    const [a,b]={small:[6,4],medium:[8,6],large:[10,8]}[op.scale];
    yes((op.edge==='north'||op.edge==='south'?w:d)>=a,'SHELTER_WIDER_THAN_ROOM');
    const rect=op.edge==='north'?[x+Math.floor((w-a)/2),z-b,a,b]:op.edge==='south'?[x+Math.floor((w-a)/2),z+d,a,b]:
     op.edge==='east'?[x+w,z+Math.floor((d-a)/2),b,a]:[x-b,z+Math.floor((d-a)/2),b,a];
    yes(rect[0]>=1&&rect[1]>=1&&rect[0]+rect[2]<124&&rect[1]+rect[3]<124,'SHELTER_BOUNDS');
    yes(![...intent.spaces,...intent.architecture.shelters].some(s=>intersects(rect,s.rect)),'SHELTER_COLLISION');
    const isEntry=op.connectTo===author.entry.space&&op.edge===author.entry.face;
    const o=isEntry?entry:opening('shelter-contact-'+opIndex,'passage',parent.rect,op.edge);
    if(!isEntry)intent.openings.push(o);
    const [sx,sz,sw,sd]=rect;
    const columns=[[sx,sz],[sx+sw-1,sz],[sx+sw-1,sz+sd-1],[sx,sz+sd-1]];
    const approach=midpoint(rect),inside=midpoint(parent.rect);
    const shelter={id:'shelter-'+opIndex,purpose:op.purpose,rect,roofY:6,floorMaterial:'wood',roofMaterial:'metal',structureMaterial:'metal',
     columns,beams:columns.map((p,i)=>({from:p,to:columns[(i+1)%4]})),eaves:edge(),connectionOpening:o.id,interiorPad:inside,approachPad:approach};
    intent.architecture.shelters.push(shelter);
    // Previously south/east were left on the room's outermost wall cell;
    // north/west alone reached the shelter. Check actual floor rectangle.
    const clearPad=exteriorPad(o,op.edge);
    yes(clearPad[0]>=sx&&clearPad[0]<sx+sw&&
     clearPad[1]>=sz&&clearPad[1]<sz+sd,'SHELTER_CONNECTION_NOT_ON_FLOOR');
    intent.joins.push({spaces:[parent.id,shelter.id],openingId:o.id,clearPad});
    if(isEntry){yes(!intent.architecture.entry,'DUPLICATE_ENTRY_SHELTER');intent.architecture.entry={side:author.entry.face,
     openingId:entry.id,shelterId:shelter.id,approachPad:approach,purpose:author.entry.intent};}
   }else if(op.type==='FEATURE'){
    const s=byKey.get(op.space),index=fixtureCounts.get(op.space)??0;
    yes(index<2,'PHYSICAL_FIXTURE_CAPACITY');fixtureCounts.set(op.space,index+1);
    const x=s.rect[0]+2+index*5,z=s.rect[1]+3;
    const part=(origin,size)=>({origin,size,material:'wood'});
    const specs={seat:{parts:[part([x,2,z],[3,1,1]),part([x,2,z+1],[3,2,1])],pad:[x,z-2]},
     worktop:{parts:[part([x,2,z],[3,2,1])],pad:[x,z-2]},
     storage:{parts:[part([x,2,z],[1,3,3])],pad:[x+1,z]},
     display:{parts:[part([x,2,z],[2,2,1])],pad:[x,z-2]},
     service:{parts:[part([x,2,z],[3,2,1])],pad:[x,z-2]},
     equipment:{parts:[part([x,2,z],[2,2,2])],pad:[x,z-2]}};
    const spec=specs[op.kind];yes(spec,'UNSUPPORTED_FIXTURE');
    const [rx,rz,rw,rd]=s.rect;
    yes(spec.parts.every(part=>part.origin[0]>=rx+1&&
     part.origin[2]>=rz+1&&
     part.origin[0]+part.size[0]<=rx+rw-1&&
     part.origin[2]+part.size[2]<=rz+rd-1)&&
     spec.pad[0]>=rx+1&&spec.pad[0]<rx+rw-1&&
     spec.pad[1]>=rz+1&&spec.pad[1]<rz+rd-1,
     'FIXTURE_OUTSIDE_ROOM');
    intent.fixtures.push({id:'fixture-'+opIndex,space:op.space,role:op.purpose,parts:spec.parts,servicePad:spec.pad});
   }else fail('UNKNOWN_OPERATION');
   journal.push({opIndex,type:op.type});
  }
  yes(intent.architecture.entry,'EXPLICIT_SHELTER_MUST_CONNECT_ENTRY');
  const first=intent.spaces[0];
  const design={schema:B143,id:author.id,title:'Semantic author common host SOURCE',brief:author.concept,
   bounds:{...intent.siteBounds},designOnly:true,elements:[
    {id:'space-0-floor',shape:'box',mode:'add',material:'wood',origin:[first.rect[0],1,first.rect[1]],size:[first.rect[2],1,first.rect[3]]},
    {id:'host-seed-marker',shape:'box',mode:'add',material:'concrete',origin:[first.rect[0],2,first.rect[1]],size:[1,1,1]}]};
  base={design,compiled:compileDesign(design)};
  intent.baseSourceSha256=base.compiled.sourceSha256;intent.baseGeometrySha256=base.compiled.geometrySha256;
  return {authorEcho:author,base,intent,journal,provenance:'PROCEDURAL_HOST_SOURCE_SEED_NOT_HISTORICAL_SOURCE'};
 },derive:e=>deriveIntegratedShell(e.base,e.intent)};
}
