/** Common mechanical expansion for the existing PRIVATE integrated-shell.
 * No genre/purpose-name dispatch. Existing frozen engine is injected explicitly.
 * Supported scope: 2..6 rectangular room footprints (default 12x10; optional 8..14), parent tree, door/open,
 * shed/hip/barrel room roofs, north/south entry, explicit flat entry shelter, six fixture kinds.
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
// The exterior approach cell stays on the shelter floor. The 2x2 JOIN
// clearance instead straddles the wall threshold for south/east too.
const shelterJoinPad=(o,side)=>{
 const outside=exteriorPad(o,side);
 return side==='south'?[outside[0],outside[1]-1]:
  side==='east'?[outside[0]-1,outside[1]]:outside;
};
const midpoint=rect=>[rect[0]+Math.floor((rect[2]-2)/2),rect[1]+Math.floor((rect[3]-2)/2)];

/** Bounded HOST-only compact-room placement. Never certifies PRIVATE function or ART.
 * All real 2x2 equipment pads and every declared join must remain connected.
 * If this cannot be proven at the mechanical preflight level, fail closed.
 */
function rehomeCompactFixturePair(first,second,rect,joins){
 const [rx,rz,rw,rd]=rect,xMin=rx+1,xMax=rx+rw-3,zMin=rz+1,zMax=rz+rd-3;
 if(!joins.length)return null;
 const key=(x,z)=>x+','+z;
 const within=s=>s.pad[0]>=xMin&&s.pad[0]<=xMax&&
  s.pad[1]>=zMin&&s.pad[1]<=zMax&&s.parts.every(p=>
   p.origin[0]>=rx+1&&p.origin[2]>=rz+1&&
   p.origin[0]+p.size[0]<=rx+rw-1&&p.origin[2]+p.size[2]<=rz+rd-1);
 const placements=(s,index)=>{
  const [px,,pz]=s.parts[0].origin,tx=index?rx+rw-4:rx+1,tz=rz+rd-3;
  const out=[];
  for(let z=rz+1;z<rz+rd-1;z++)for(let x=rx+1;x<rx+rw-1;x++){
   const dx=x-px,dz=z-pz;
   const candidate={parts:s.parts.map(p=>({
    ...p,origin:[p.origin[0]+dx,p.origin[1],p.origin[2]+dz]
   })),pad:[s.pad[0]+dx,s.pad[1]+dz]};
   if(within(candidate))out.push({candidate,x,z,score:Math.abs(x-tx)+Math.abs(z-tz)});
  }
  out.sort((a,b)=>a.score-b.score||a.z-b.z||a.x-b.x);
  return out.map(x=>x.candidate);
 };
 // A 4-cell opening offers three adjacent 2x2 positions, not just
 // the historical corner of clearPad. Reject non-boundary joins explicitly.
 const options=j=>{
  const [x,z]=j.clearPad;
  if(x<xMin)return [0,1,2].map(i=>[xMin,z+i]);
  if(x>xMax)return [0,1,2].map(i=>[xMax,z+i]);
  if(z<zMin)return [0,1,2].map(i=>[x+i,zMin]);
  if(z>zMax)return [0,1,2].map(i=>[x+i,zMax]);
  return [];
 };
 const isConnected=pair=>{
  const occupied=new Set();
  for(const s of pair){
   const local=new Set();
   for(const p of s.parts)
    for(let x=p.origin[0];x<p.origin[0]+p.size[0];x++)
     for(let z=p.origin[2];z<p.origin[2]+p.size[2];z++)local.add(key(x,z));
   // Parts of ONE fixture may overlap in projection at different heights.
   // Two different fixtures must never share any occupied column.
   if([...local].some(p=>occupied.has(p)))return false;
   for(const p of local)occupied.add(p);
  }
  const free=([x,z])=>x>=xMin&&x<=xMax&&z>=zMin&&z<=zMax&&
   ![key(x,z),key(x+1,z),key(x,z+1),key(x+1,z+1)].some(k=>occupied.has(k));
  if(pair.some(p=>!free(p.pad)))return false;
  const seeds=joins.map(j=>options(j).filter(free));
  if(seeds.some(list=>!list.length))return false;
  for(const start of seeds[0]){
   const queue=[start],visited=new Set([key(...start)]);
   for(let i=0;i<queue.length;i++){
    const [x,z]=queue[i];
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
     const p=[x+dx,z+dz],k=key(...p);
     if(!visited.has(k)&&free(p)){visited.add(k);queue.push(p);}
    }
   }
   if(pair.every(p=>visited.has(key(...p.pad)))&&
    seeds.every(list=>list.some(p=>visited.has(key(...p)))))return true;
  }
  return false;
 };
 // Existing fixed layout is retained only when it passes the SAME 2x2
 // test as fallback layouts; never use the historical "it fits" shortcut.
 if(within(first)&&within(second)&&isConnected([first,second]))
  return [first,second];
 for(const a of placements(first,0))for(const b of placements(second,1))
  if(isConnected([a,b]))return [a,b];
 return null;
}

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
  const byKey=new Map(),fixtureCounts=new Map(),roofTrims=new Map(author.spaces.map(x=>[x.key,new Set()]));
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
     // Bounded sibling lookahead prevents a small early room from occupying
     // the only viable contact for a later larger room. This never changes
     // authored space order, room links, or source provenance.
     const opposite={east:'west',west:'east',north:'south',south:'north'};
     const position=(foot,dir)=>{
      const [x,z,w,d]=parent.rect,ww=foot.width,dd=foot.depth;
      return dir==='east'?[x+w-1,z+Math.floor((d-dd)/2),ww,dd]:
       dir==='west'?[x-ww+1,z+Math.floor((d-dd)/2),ww,dd]:
       dir==='south'?[x+Math.floor((w-ww)/2),z+d-1,ww,dd]:
       [x+Math.floor((w-ww)/2),z-dd+1,ww,dd];
     };
     const valid=(room,dir,placed,used)=>{
      if(used.has(dir)||reserved.get(room.key).has(opposite[dir]))return null;
      const c=position(room.footprint??{width:12,depth:10},dir);
      if(c[0]<2||c[1]<2||c[0]+c[2]>=123||c[1]+c[3]>=123)return null;
      if(placed.some(s=>{
       if(s.id===parent.id||!intersects(c,s.rect))return false;
       const dx=Math.min(c[0]+c[2],s.rect[0]+s.rect[2])-Math.max(c[0],s.rect[0]);
       const dz=Math.min(c[1]+c[3],s.rect[1]+s.rect[3])-Math.max(c[1],s.rect[1]);
       // Shared wall columns are allowed; overlapping unrelated interiors are not.
       return dx>1||dz>1;
      }))return null;
      // Project every already-anchored authored shelter before committing a
      // contact. An otherwise valid room may block a later public entry canopy.
      const rooms=[...placed,{id:room.key,rect:c}];
      const projected=[];
      for(const shelter of author.shelters){
       const owner=rooms.find(s=>s.id===shelter.connectTo);
       if(!owner)continue;
       const [x,z,w,d]=owner.rect;
       const scale={small:[6,4],medium:[8,6],large:[10,8]}[shelter.scale];
       if(!scale)return null;
       const [a,b]=scale;
       if((shelter.edge==='north'||shelter.edge==='south'?w:d)<a)continue;
       const sh=shelter.edge==='north'?[x+Math.floor((w-a)/2),z-b,a,b]:
        shelter.edge==='south'?[x+Math.floor((w-a)/2),z+d,a,b]:
        shelter.edge==='east'?[x+w,z+Math.floor((d-a)/2),b,a]:
        [x-b,z+Math.floor((d-a)/2),b,a];
       if(sh[0]<1||sh[1]<1||sh[0]+sh[2]>=124||sh[1]+sh[3]>=124||
          rooms.some(other=>other.id!==owner.id&&intersects(sh,other.rect))||
          projected.some(previous=>intersects(sh,previous)))return null;
       projected.push(sh);
      }
      return c;
     };
     const later=payload.operations.slice(opIndex+1).filter(x=>
      x.type==='SPACE'&&x.link?.to===parent.id);
     const canFitLater=(i,placed,used)=>i===later.length||sides.some(dir=>{
      const c=valid(later[i],dir,placed,used);
      return c!==null&&canFitLater(i+1,[...placed,{id:later[i].key,rect:c}],
       new Set([...used,dir]));
     });
     const used=reserved.get(parent.id);
     const candidates=sides.map(dir=>({side:dir,rect:valid(op,dir,intent.spaces,used)}))
      .filter(x=>x.rect!==null);
     // Favor the historical first-fit layout if it leaves all later siblings
     // feasible. Only change direction when that first-fit demonstrably traps
     // another room, preserving the author's original order and room links.
     const chosen=candidates.find(x=>canFitLater(0,[...intent.spaces,
      {id:op.key,rect:x.rect}],new Set([...used,x.side])))??candidates[0];
     side=chosen?.side;rect=chosen?.rect??rect;
     yes(side,'NO_SAFE_PARENT_CONTACT_'+op.key);reserved.get(parent.id).add(side);
     reserved.get(op.key).add({east:'west',west:'east',north:'south',south:'north'}[side]);
     const contactSide={east:'west',west:'east',north:'south',south:'north'}[side];
     // A child overhanging its parent's contact span must own that entire
     // shared edge. Otherwise trimming the child's whole edge leaves an
     // unroofed tail not covered by the shorter parent room.
     const [px,pz,pw,pd]=parent.rect;
     const overhang=(side==='east'||side==='west')?
      rect[1]<pz||rect[1]+rect[3]>pz+pd:
      rect[0]<px||rect[0]+rect[2]>px+pw;
     if(overhang)roofTrims.get(parent.id).add(side);
     else roofTrims.get(op.key).add(contactSide);
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
    intent.spaces.push(space);byKey.set(op.key,space);
   }else if(op.type==='ROOF'){
    yes(['shed','hip','barrel'].includes(op.profile),'ENGINE_PROFILE_UNSUPPORTED');
    const space=byKey.get(op.space);yes(space,'MISSING_ROOF_SPACE');
    let [x,z,w,d]=space.rect;const trims=roofTrims.get(op.space);
    // Allocate the wall strip to whichever side spans it completely, never
    // silently discard overhanging floor cells. The author roof form is kept.
    if(trims.has('west')){x++;w--;}if(trims.has('east'))w--;
    if(trims.has('north')){z++;d--;}if(trims.has('south'))d--;
    yes(w>0&&d>0,'ENGINE_EMPTY_ROOF_REGION');
    const eaveY={primary:7,secondary:6,subordinate:5}[op.rank];
    intent.architecture.roofSections.push({id:'roof-'+op.space,rect:[x,z,w,d],eaves:edge(),
     profile:{form:op.profile,axis:op.axis,range:op.axis==='x'?[x,x+w-1]:[z,z+d-1],eaveY,rise:1}});
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
    const outsidePad=exteriorPad(o,op.edge);
    yes(outsidePad[0]>=sx&&outsidePad[0]<sx+sw&&
     outsidePad[1]>=sz&&outsidePad[1]<sz+sd,'SHELTER_CONNECTION_NOT_ON_FLOOR');
    const clearPad=shelterJoinPad(o,op.edge);
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
     // Unlike a worktop, service has a physical transaction aperture:
     // a supported low counter, two posts and a lintel. Keep the exact
     // existing servicePad and avoid changing any room or entry geometry.
     service:{parts:[
      part([x,2,z],[3,1,1]),
      {origin:[x,3,z],size:[1,2,1],material:'metal'},
      {origin:[x+2,3,z],size:[1,2,1],material:'metal'},
      {origin:[x+1,4,z],size:[1,1,1],material:'metal'}
     ],pad:[x,z-2]},
     equipment:{parts:[part([x,2,z],[2,2,2])],pad:[x,z-2]}};
    let spec=specs[op.kind];yes(spec,'UNSUPPORTED_FIXTURE');
    const [rx,rz,rw,rd]=s.rect;
    const fits=p=>p.parts.every(part=>part.origin[0]>=rx+1&&
     part.origin[2]>=rz+1&&
     part.origin[0]+part.size[0]<=rx+rw-1&&
     part.origin[2]+part.size[2]<=rz+rd-1)&&
     p.pad[0]>=rx+1&&p.pad[0]<rx+rw-1&&
     p.pad[1]>=rz+1&&p.pad[1]<rz+rd-1;
    if(index===1){
     const prior=intent.fixtures.find(f=>f.space===op.space);
     yes(prior,'FIXTURE_PRIOR_MISSING');
     const layout=rehomeCompactFixturePair(
      {parts:prior.parts,pad:prior.servicePad},spec,s.rect,
      intent.joins.filter(j=>j.spaces.includes(op.space)));
     yes(layout,'FIXTURE_2X2_PATH_CAPACITY');
     prior.parts=layout[0].parts;prior.servicePad=layout[0].pad;
     spec=layout[1];
    }
    yes(fits(spec),'FIXTURE_OUTSIDE_ROOM');
    intent.fixtures.push({id:'fixture-'+opIndex,space:op.space,role:op.purpose,parts:spec.parts,servicePad:spec.pad});
   }else fail('UNKNOWN_OPERATION');
   journal.push({opIndex,type:op.type});
  }
  yes(intent.architecture.entry,'EXPLICIT_SHELTER_MUST_CONNECT_ENTRY');
  // The existing PRIVATE engine rejects missing or overlapping roof coverage.
  // Fail closed at the public boundary rather than hide a late engine error.
  const roofs=new Set();
  for(const sec of intent.architecture.roofSections){
   const [x,z,w,d]=sec.rect;
   for(let rx=x;rx<x+w;rx++)for(let rz=z;rz<z+d;rz++){
    const k=rx+','+rz;
    yes(!roofs.has(k),'ENGINE_ROOF_OVERLAP');roofs.add(k);
   }
  }
  const floors=new Set();
  for(const space of intent.spaces){
   const [x,z,w,d]=space.rect;
   for(let rx=x;rx<x+w;rx++)for(let rz=z;rz<z+d;rz++)floors.add(rx+','+rz);
  }
  yes(floors.size===roofs.size&&[...floors].every(k=>roofs.has(k)),'ENGINE_ROOF_COVERAGE');
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
