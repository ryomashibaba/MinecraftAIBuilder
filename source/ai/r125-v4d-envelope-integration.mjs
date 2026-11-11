/**
 * R125 V4D opt-in universal enclosure-integrity extension.
 * The old author graph remains frozen. This changes actual B143 geometry:
 * - fills real roof-to-wall gable gaps per AUTHOR-selected facade material
 * - widens actual shared-wall + exterior entrances by an AUTHOR-selected span
 * - shelters one side of each AUTHOR-designated public sky court with real
 *   walkable ground, shade roof and two physical supporting posts
 * It never infers a design from building genre or permits Minecraft writes.
 */
import {createHash} from 'node:crypto';
import {compileAuthoredGraph} from './r125-v4d-authored-topology.mjs';
import {SCHEMA as B143,compileDesign,verifyCompiled,MATERIALS} from './b143-building-dsl.mjs';
import {auditR125SourceRoutes} from './r125-source-routes.mjs';
export const ENVELOPE_SCHEMA='minecraftaibuilder-r125-v4d-authored-envelope-integrity-v1';
const fail=s=>{throw Error('R125_V4D_INTEGRITY_'+s);};
const exact=(v,fields)=>v&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).sort().join('|')===fields.slice().sort().join('|');
const K=(x,y,z)=>x+','+y+','+z;
const maxX=n=>n.x+n.width-1,maxZ=n=>n.z+n.depth-1;
const box=(id,mode,origin,size,mat)=>({
 id,shape:'box',mode,...(mode==='add'?{material:mat}:{}),origin,size
});
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');

function profile(n){
 const {axis,type,eaveY,peakY,peakPercent}=n.roof;
 const len=axis==='x'?n.width:n.depth,mid=Math.round((len-1)*peakPercent/100);
 return Array.from({length:len},(_,i)=>Math.round(
  type==='shed'?eaveY+(peakY-eaveY)*i/(len-1):
  i<=mid?eaveY+(peakY-eaveY)*i/mid:
  eaveY+(peakY-eaveY)*(len-1-i)/(len-1-mid)
 ));
}
function sideHasLink(plan,nodeId,side){
 const reverse={north:'south',south:'north',west:'east',east:'west'};
 return plan.links.some(l=>l.from===nodeId&&l.side===side||
  l.to===nodeId&&reverse[l.side]===side);
}
export function validateEnvelopeIntegrity(plan,choices){
 if(!exact(choices,['schema','portalWidth','gables','publicShelters'])||
  choices.schema!==ENVELOPE_SCHEMA||
  !Number.isSafeInteger(choices.portalWidth)||choices.portalWidth!==4||
  !Array.isArray(choices.gables)||!Array.isArray(choices.publicShelters))
  fail('ROOT');
 const covered=plan.nodes.filter(n=>n.kind==='covered'),
  sky=plan.nodes.filter(n=>n.kind==='sky');
 if(choices.gables.length!==covered.length||
  choices.publicShelters.length!==sky.length)
  fail('MISSING_ARCHITECTURAL_DECISION');
 const ids=new Set(),sIds=new Set();
 for(const g of choices.gables){
  if(!exact(g,['nodeId','upperFacade'])||
   !covered.some(n=>n.id===g.nodeId)||ids.has(g.nodeId)||
   !['wall','glass'].includes(g.upperFacade))
   fail('GABLE_CHOICE');
  ids.add(g.nodeId);
 }
 for(const v of choices.publicShelters){
  if(!exact(v,['nodeId','edge','depth','roofY','material'])||
   !sky.some(n=>n.id===v.nodeId)||sIds.has(v.nodeId)||
   !['north','south','west','east'].includes(v.edge)||
   !Number.isSafeInteger(v.depth)||v.depth<3||v.depth>5||
   !Number.isSafeInteger(v.roofY)||v.roofY<7||v.roofY>10||
   !MATERIALS.includes(v.material)||v.material==='glass'||
   !sideHasLink(plan,v.nodeId,v.edge))fail('PUBLIC_SHELTER');
  sIds.add(v.nodeId);
 }
 // Originally each 2-wide portal was within the shared overlap, but the
 // larger cut must not run across the corner of either connected building.
 const positions=new Map(plan.nodes.map(n=>[n.id,n]));
 for(const l of plan.links){
  const a=positions.get(l.from),b=positions.get(l.to);
  const horizontal=l.side==='east'||l.side==='west';
  const low=horizontal?Math.max(a.z,b.z):Math.max(a.x,b.x);
  const high=horizontal?Math.min(maxZ(a),maxZ(b)):Math.min(maxX(a),maxX(b));
  if(low+l.offset+choices.portalWidth-1>high-2)
   fail('FOUR_WIDE_PORTAL_CLIPS_JAMB');
 }
 const root=plan.nodes[0],e=plan.entry;
 if(root.x+e.offset+choices.portalWidth>maxX(root)-2)fail('FOUR_WIDE_ENTRY_CLIPS_JAMB');
 for(const w of plan.windows){
  if(w.nodeId!==root.id||w.side!=='north')continue;
  if(w.offset<e.offset+choices.portalWidth&&
   w.offset+w.span>e.offset)fail('ENTRANCE_WINDOW_CLASH');
 }
 return true;
}
function gableCells(plan,choice,add){
 const eave=plan.roof.eaveY,heights=profile(plan),
  axis=plan.roof.axis,glass=choice.upperFacade==='glass',
  material=glass?'glass':add.wallMaterial;
 let count=0;
 const addBox=(label,x,y,z,sx,sy,sz)=>{
  if(sy<=0)return;
  add.elements.push(box('encl-'+add.nodeIndex+'-'+label+'-'+add.elements.length,
   'add',[x,y,z],[sx,sy,sz],material));
  count+=sx*sy*sz;
 };
 // Sloping gable walls, on both ends of the perpendicular face.
 // Adjacent equal columns are compiled into one true B143 box.
 const n=plan;
 const len=axis==='x'?n.width:n.depth;
 let start=0;
 for(let i=1;i<=len;i++){
  if(i<len&&heights[i]===heights[start])continue;
  const upper=heights[start]-2,thick=upper-eave+1;
  if(thick>0)for(let q=0;q<2;q++){
   if(axis==='x'){
    addBox('gable-'+q,n.x+start,eave,q===0?n.z:maxZ(n),i-start,thick,1);
   }else{
    addBox('gable-'+q,q===0?n.x:maxX(n),eave,n.z+start,1,thick,i-start);
   }
  }
  start=i;
 }
 // End walls parallel to the roofing direction also rise to the end roof,
 // not merely to the author's lowest eave.
 for(const [i,y] of [[0,heights[0]],[1,heights.at(-1)]]){
  const thick=y-eave-1;
  if(thick<=0)continue;
  if(axis==='x')addBox('end-'+i,i===0?n.x:maxX(n),eave,n.z,
   1,thick,n.depth);
  else addBox('end-'+i,n.x,eave,i===0?n.z:maxZ(n),
   n.width,thick,1);
 }
 return count;
}
function publicShelterIds(n,nodeIndex){
 // B143 element labels are HOST metadata, not authored room identifiers.
 // Keep previously compilable shelters' labels byte-identical. The underscore reserves
 // the fallback namespace: authored graph slugs cannot contain underscores.
 const labels=key=>({roof:'public-covered-arcade-'+key,
  columns:[0,1].map(i=>'public-arcade-column-'+key+'-'+i)});
 const original=labels(n.id);
 return [original.roof,...original.columns].every(id=>id.length<=40)?
  original:labels('node_'+nodeIndex);
}
function publicShelter(n,c,add,nodeIndex){
 // A genuine semicivic covered arcade inside the sky volume.
 // The roof lies 5-9 cells above the standing floor and is supported by
 // two end columns, kept two cells away from the public connection wall.
 const d=c.depth,isX=c.edge==='west'||c.edge==='east';
 const x=isX?(c.edge==='west'?n.x+1:maxX(n)-d):n.x+2;
 const z=isX?n.z+2:(c.edge==='north'?n.z+1:maxZ(n)-d);
 const sx=isX?d:n.width-4,sz=isX?n.depth-4:d;
 const roofOrigin=[x,c.roofY,z],roofSize=[sx,1,sz];
 const ids=publicShelterIds(n,nodeIndex);
 add.push(box(ids.roof,'add',roofOrigin,roofSize,c.material));
 const postPositions=isX?[[x+Math.floor(d/2),z],[x+Math.floor(d/2),z+sz-1]]:
  [[x,z+Math.floor(d/2)],[x+sx-1,z+Math.floor(d/2)]];
 postPositions.forEach(([px,pz],i)=>{
  add.push(box(ids.columns[i],'add',
   [px,2,pz],[1,c.roofY-2,1],c.material));
 });
 return sx*sz;
}
export function compileEnvelopeIntegrity(original,choicesValue){
 const plan=structuredClone(original),choices=structuredClone(choicesValue);
 const before=compileAuthoredGraph(plan);
 validateEnvelopeIntegrity(plan,choices);
 const previous=before.design;
 // Existing ingress cuts MUST stay last so new gables cannot silently seal
 // a public or room-to-room doorway.
 const cuts=previous.elements.filter(e=>
  e.id==='exterior-entrance'||e.id.startsWith('link-portal-'));
 const elements=previous.elements.filter(e=>!cuts.includes(e));
 const fill={elements:[],wallMaterial:plan.materials.wall,nodeIndex:0};
 let requestedGableCells=0;
 for(const [i,n] of plan.nodes.entries()){
  if(n.kind!=='covered')continue;
  fill.nodeIndex=i;
  const choice=choices.gables.find(g=>g.nodeId===n.id);
  requestedGableCells+=gableCells(n,choice,fill);
 }
 elements.push(...fill.elements);
 const shelters=[];
 for(const sky of choices.publicShelters){
  const n=plan.nodes.find(n=>n.id===sky.nodeId);
  shelters.push({nodeId:n.id,edge:sky.edge,
   shelteredRoofCells:publicShelter(n,sky,elements,plan.nodes.indexOf(n))});
 }
 const root=plan.nodes[0],entranceX=root.x+plan.entry.offset;
 // AUTHOR-approved broader framed entrance over a real public paved approach.
 elements.push(box('portal-emphasis-left','add',
  [entranceX-1,2,root.z-2],[1,7,2],plan.materials.wall));
 elements.push(box('portal-emphasis-right','add',
  [entranceX+choices.portalWidth,2,root.z-2],[1,7,2],plan.materials.wall));
 elements.push(box('portal-emphasis-lintel','add',
  [entranceX-1,8,root.z-2],[choices.portalWidth+2,1,2],
  plan.materials.roof));
 for(const cut of cuts){
  const axisCut=cut.id==='exterior-entrance'?0:(cut.size[0]===1?2:0);
  const size=cut.size.slice();size[axisCut]=choices.portalWidth;
  elements.push({...cut,size});
 }
 if(elements.length>160)fail('B143_ELEMENT_BUDGET_'+elements.length);
 const design={...previous,elements};
 const compiled=compileDesign(design);
 if(!verifyCompiled(design,compiled))fail('B143_SOURCE_DRIFT');
 const vox=new Map(compiled.primitives.map(v=>[K(v[0],v[1],v[2]),v[3]]));
 const has=(x,y,z)=>vox.has(K(x,y,z));
 const oldVox=new Set(before.compiled.primitives.map(v=>K(v[0],v[1],v[2])));
 let closedCells=0,missingBefore=0;
 for(const n of plan.nodes.filter(n=>n.kind==='covered')){
  const heights=profile(n),eave=n.roof.eaveY;
  for(let z=n.z;z<=maxZ(n);z++)for(let x=n.x;x<=maxX(n);x++){
   const edge=x===n.x||x===maxX(n)||z===n.z||z===maxZ(n);
   if(!edge)continue;
   const index=n.roof.axis==='x'?x-n.x:z-n.z;
   for(let y=eave;y<=heights[index]-2;y++){
    if(!has(x,y,z))fail('ROOF_TO_WALL_GAP_'+n.id);
    closedCells++;
    if(!oldVox.has(K(x,y,z)))missingBefore++;
   }
  }
 }
 if(closedCells<150||missingBefore<100)
  fail('NO_SUBSTANTIVE_REAL_CLOSURE');
 let shelteredPads=0,skyPads=0,posts=0;
 for(const c of choices.publicShelters){
  const n=plan.nodes.find(n=>n.id===c.nodeId),edge=c.edge;
  const isX=edge==='west'||edge==='east',d=c.depth;
  const x=isX?(edge==='west'?n.x+1:maxX(n)-d):n.x+2;
  const z=isX?n.z+2:(edge==='north'?n.z+1:maxZ(n)-d);
  const sx=isX?d:n.width-4,sz=isX?n.depth-4:d;
  for(let xx=x;xx<x+sx;xx++)for(let zz=z;zz<z+sz;zz++){
   if(!has(xx,1,zz)||!has(xx,c.roofY,zz))
    fail('PUBLIC_ARCADE_NOT_GENUINE');
   shelteredPads++;
  }
  for(let xx=n.x+2;xx<maxX(n)-1;xx++)
   for(let zz=n.z+2;zz<maxZ(n)-1;zz++){
    let clear=true;
    for(let yy=2;yy<design.bounds.height;yy++)if(has(xx,yy,zz)){clear=false;break;}
    if(clear&&has(xx,1,zz))skyPads++;
   }
  const ids=publicShelterIds(n,plan.nodes.indexOf(n));
  const pillars=elements.filter(e=>ids.columns.includes(e.id));
  for(const pillar of pillars){
   const [xx,,zz]=pillar.origin;
   for(let yy=2;yy<c.roofY;yy++)
    if(!has(xx,yy,zz))fail('PUBLIC_ARCADE_POST_GAP');
   posts++;
  }
 }
 if(skyPads<100||shelteredPads<45||posts<2)
  fail('PUBLIC_MIXED_SKY_COVERED_HOLD');
 let doorwayCells=0;
 for(const cut of elements.filter(e=>e.id==='exterior-entrance'||e.id.startsWith('link-portal-'))){
  const [x,y,z]=cut.origin,[sx,sy,sz]=cut.size;
  for(let xx=x;xx<x+sx;xx++)for(let zz=z;zz<z+sz;zz++){
   if(!has(xx,1,zz))fail('WIDE_DOOR_UNSUPPORTED');
   for(let yy=y;yy<y+sy;yy++)
    if(has(xx,yy,zz))fail('FOUR_WIDE_REAL_DOOR_OBSTRUCTED');
   doorwayCells++;
  }
 }
 const featureTargets=plan.fixtures.map(f=>{
  const n=plan.nodes.find(n=>n.id===f.nodeId);
  return {id:f.id,zoneId:n.id,
   origin:[n.x+f.offsetX,2,n.z+f.offsetZ],
   size:[f.width,f.height,f.depth]};
 });
 const routes=auditR125SourceRoutes({
  schema:'minecraftaibuilder-r125-plan-to-b143-result-v1',
  design,compiled,program:before.program,
  sourceSha256:compiled.sourceSha256,geometrySha256:compiled.geometrySha256
 },{featureTargets});
 if(routes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  routes.zones.some(z=>!z.reachedFromEntrance)||
  routes.featureAccess.some(f=>!f.reachableFromEntrance))
  fail('FINAL_FOUR_WIDE_TWO_PAD_SOURCE_ACCESS_HOLD');
 return {
  schema:'r125-v4d-true-enclosure-public-integration-source-v1',
  authorIR:plan,envelopeAuthorIR:choices,baseGraphGeometrySha256:before.geometrySha256,
  authoredEnvelopeSha256:hash(choices),geometrySha256:compiled.geometrySha256,
  sourceSha256:compiled.sourceSha256,design,compiled,program:before.program,sourceRoutes:routes,
  sourceProof:{
   originalRoofWallMissingCells:missingBefore,
   verifiedFinalRoofWallPerimeterCells:closedCells,
   requestedEnclosureMaterialCellVolume:requestedGableCells,
   entranceAndLinkPortalWidth:choices.portalWidth,
   physicallyVerifiedWidePortalFloorCells:doorwayCells,
   shelteredSupportedRoofCells:shelteredPads,
   supportedOpenSkyCells:skyPads,continuousShadeColumns:posts,
   reachableZones:routes.zones.length,
   reachableFunctionServicePoints:routes.featureAccess.length,
   b143Elements:elements.length,
   realMinecraftWalking:'NOT_TESTED',roofWaterproofing:'NOT_TESTED',
   structuralEngineering:'NOT_TESTED',independentART:'NOT_REVIEWED'
  },
  syntheticAuthorOnly:true,realModelAuthorship:'NOT_ATTESTED',
  architecturalArt:'NOT_REVIEWED',minecraftWalking:'NOT_TESTED',
  readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
  BuildPlan:{operations:[]},gates:Array(9).fill('BLOCKED'),
  worldContacts:0,worldWrites:0
 };
}
