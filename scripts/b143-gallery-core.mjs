/** B143 pure gallery core — small dependency footprint for R7/R8 light runtime. */
import {compileDesign,validateDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
const ensure=(b,m)=>{if(!b)throw Error('B143_'+m)};
/** Surface-only cells for a practical fast browser preview (6-neighbor culling). */
export function surfaceOnly(scene){
 const occupied=new Set(scene.primitives.map(p=>p[0]+','+p[1]+','+p[2]));
 const sides=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
 return scene.primitives.filter(p=>sides.some(([dx,dy,dz])=>
  !occupied.has((p[0]+dx)+','+(p[1]+dy)+','+(p[2]+dz))));
}
/** Additional genuine cross-section caps omitted by whole-building surface culling.
 * Every cap is an existing FINAL B143 voxel, never inferred or filled in.
 * No extra voxels are placed in the Minecraft world. */
export function sectionCapsOnly(scene,outerSurface=surfaceOnly(scene)){
 const outside=new Set(outerSurface.map(p=>p[0]+','+p[1]+','+p[2]));
 const occupied=new Set(scene.primitives.map(p=>p[0]+','+p[1]+','+p[2]));
 return scene.primitives.filter(p=>{
  const [x,y,z,,,,]=p;
  // Only interior voxels exposed by removing all higher 5-cell bands.
  // Each source voxel belongs to at most one cut-plane, so the payload is
  // bounded by scene.primitives.length even for tall/complex architecture.
  if(p[4]>=scene.levels-1||y%5!==4)return false;
  const key=x+','+y+','+z;
  return !outside.has(key)&&occupied.has(x+','+(y+1)+','+z);
 });
}
export function compileB143Gallery(documents,{auditCompiled=null}={}){
 ensure(Array.isArray(documents)&&documents.length>0&&documents.length<=24,'GALLERY_COUNT');
 ensure(auditCompiled===null||typeof auditCompiled==='function','INVALID_AUDITOR');
 const ids=new Set(),sourceHashes=[],geometryHashes=[];
 const scenes=documents.map(d=>{
  validateDesign(d);
  ensure(!ids.has(d.id),'DUPLICATE_DESIGN_ID');ids.add(d.id);
  const result=compileDesign(d);
  ensure(verifyCompiled(d,result),'NONDETERMINISTIC_COMPILATION');
  sourceHashes.push(result.sourceSha256);geometryHashes.push(result.geometrySha256);
  const {primitives,...meta}=result;
  const surface=surfaceOnly(result),sectionCaps=sectionCapsOnly(result,surface);
  ensure(surface.length>50&&surface.length<=primitives.length,'EMPTY_SURFACE');
  ensure(sectionCaps.length<=primitives.length-surface.length,'CUTAWAY_CAP_BUDGET');
  const extraAudit=auditCompiled===null?{}:{
   topologyReview:auditCompiled(result)};
  return {...meta,...extraAudit,surface,sectionCaps,
   stats:{...result.stats,renderedSurfaceCells:surface.length,
    trueSectionRevealedCells:sectionCaps.length}};
 });
 ensure(new Set(geometryHashes).size===documents.length,'DUPLICATE_GEOMETRIES');
 return {schema:'minecraftaibuilder-b143-gallery-v1',edition:'MINECRAFT_EDUCATION',
  sourceHashes,geometryHashes,scenes,
  safety:{constructionApproved:false,executionAllowed:false,readiness:'NOT_PREPARED',
   worldCoordinates:null,worldContacts:0,BuildPlan:{operations:[]},
   original15BuildingSafetyGates:'9 BLOCKED',minecraftWrites:0}};
}
export function verifyB143Payload(p){
 return p?.schema==='minecraftaibuilder-b143-gallery-v1'&&
  p.edition==='MINECRAFT_EDUCATION'&&p.safety?.constructionApproved===false&&
  p.safety.executionAllowed===false&&p.safety.readiness==='NOT_PREPARED'&&
  p.safety.worldCoordinates===null&&p.safety.worldContacts===0&&
  p.safety.minecraftWrites===0&&p.safety.BuildPlan?.operations?.length===0&&
  p.safety.original15BuildingSafetyGates==='9 BLOCKED'&&
  p.scenes?.length>=1&&p.scenes.length===p.sourceHashes?.length&&
  p.scenes.length===p.geometryHashes?.length&&
  p.scenes.every((s,i)=>s.designOnly===true&&s.readiness==='NOT_PREPARED'&&
   s.worldContacts===0&&s.worldCoordinates===null&&
   s.BuildPlan?.operations?.length===0&&
   s.sourceSha256===p.sourceHashes[i]&&s.geometrySha256===p.geometryHashes[i]&&
   Array.isArray(s.surface)&&s.surface.length>50&&
   s.surface.every(x=>Array.isArray(x)&&x.length===5&&
    x.every(Number.isSafeInteger)&&x[3]>=0&&x[3]<s.layerNames.length)&&
   // Backward-compatible with verified archived galleries that predate
   // section caps; new ones are strict source-derived review evidence.
   (s.sectionCaps===undefined||(
    Array.isArray(s.sectionCaps)&&
    s.sectionCaps.length<=s.stats.voxels-s.surface.length&&
    s.stats.trueSectionRevealedCells===s.sectionCaps.length&&
    s.sectionCaps.every(x=>Array.isArray(x)&&x.length===5&&
     x.every(Number.isSafeInteger)&&x[3]>=0&&x[3]<s.layerNames.length&&
     x[4]===Math.floor(x[1]/5)&&x[1]%5===4&&x[4]<s.levels-1))) );
}
export function renderB143Html(payload,template){
 ensure(verifyB143Payload(payload),'UNSAFE_PAYLOAD');
 const key='__B143_GALLERY_JSON__';
 ensure(template.includes(key)&&template.indexOf(key)===template.lastIndexOf(key),'TEMPLATE_SLOT');
 const json=JSON.stringify(payload).replaceAll('<','\\u003c')
  .replaceAll('\u2028','\\u2028').replaceAll('\u2029','\\u2029');
 const html=template.replace(key,json);
 ensure(!html.includes(key)&&!html.includes('fetch('),'EXTERNAL_SCRIPT_NOT_ALLOWED');
 return html;
}
