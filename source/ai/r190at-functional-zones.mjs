/**
 * R190-AT functional geography: exact weather-exposed versus roof-protected
 * public zones and the source-proven 2-wide path between them.
 *
 * An author freely supplies ALL geometry; no host typology, inferred floor,
 * decorative roof or hidden spatial repair. Source-only B143 research.
 */
import {compileR190AQParti} from './r190aq-architectural-parti.mjs';
import {auditR190ARStructuralContinuity} from './r190ar-structure-audit.mjs';
import {verifyCompiled} from './b143-building-dsl.mjs';

export const R190AT_SCHEMA='minecraftaibuilder-r190at-authored-zones-v1';
const fail=s=>{throw Error('R190AT_'+s);};
const ok=(p,s)=>{if(!p)fail(s);};
const fields=(p,a)=>p!==null&&typeof p==='object'&&!Array.isArray(p)&&
 Object.keys(p).length===a.length&&a.every(x=>Object.hasOwn(p,x));
const integer=(x,low,high)=>Number.isSafeInteger(x)&&x>=low&&x<=high;
const slug=x=>typeof x==='string'&&/^[a-z][a-z0-9-]{2,39}$/.test(x);
const k=(x,y,z)=>x+','+y+','+z;
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},worldWrites:0,worldContacts:0,art:'ART_HOLD'});

export function validateR190ATZones(q){
 ok(fields(q,['schema','parti','functionalZones'])&&q.schema===R190AT_SCHEMA,
  'TOP_LEVEL');
 ok(Array.isArray(q.functionalZones)&&q.functionalZones.length>=3&&
  q.functionalZones.length<=6,'ZONE_COUNT');
 const ids=new Set(),anchorSet=new Set(),kinds=new Set();
 const anchors=new Map((q.parti?.programAnchors??[]).map(a=>[a.id,a]));
 const bounds=q.parti?.site;
 ok(bounds&&integer(bounds.width,32,80)&&integer(bounds.depth,32,80)&&
  integer(bounds.height,16,32),'SITE');
 for(const z of q.functionalZones){
  ok(fields(z,['id','kind','anchorId','origin','size','headroom'])&&
   slug(z.id)&&!ids.has(z.id)&&
   ['sheltered','open-sky'].includes(z.kind)&&
   slug(z.anchorId)&&anchors.has(z.anchorId)&&!anchorSet.has(z.anchorId)&&
   Array.isArray(z.origin)&&z.origin.length===2&&
   Array.isArray(z.size)&&z.size.length===2&&
   integer(z.origin[0],0,bounds.width-1)&&
   integer(z.origin[1],0,bounds.depth-1)&&
   z.size.every(n=>integer(n,5,16))&&
   z.origin[0]+z.size[0]<=bounds.width&&
   z.origin[1]+z.size[1]<=bounds.depth&&
   integer(z.headroom,5,9),'ZONE_FIELDS');
  const a=anchors.get(z.anchorId);
  ok(a.x>=z.origin[0]&&a.x+1<z.origin[0]+z.size[0]&&
    a.z>=z.origin[1]&&a.z+1<z.origin[1]+z.size[1],
   'ANCHOR_OUTSIDE_PHYSICAL_ZONE');
  ids.add(z.id);anchorSet.add(z.anchorId);kinds.add(z.kind);
 }
 ok(kinds.has('open-sky')&&kinds.has('sheltered')&&
  q.functionalZones.filter(z=>z.kind==='sheltered').length>=2,
  'CIVIC_SEQUENCE_MISSING');
 return true;
}
export function reviewR190ATZones(q){
 validateR190ATZones(q);
 const authored=structuredClone(q);
 const source=compileR190AQParti(authored.parti);
 ok(verifyCompiled(source.design,source.compiled),'REAL_B143_PROOF');
 const structure=auditR190ARStructuralContinuity(source);
 ok(structure.status==='SOURCE_CONTACT_PASS_NOT_ENGINEERING'&&
  structure.detachedVoxelCount===0,'DETACHED_BUILDING_MASS');
 const voxels=new Set(source.compiled.primitives.map(c=>k(c[0],c[1],c[2])));
 const {height}=authored.parti.site;
 const inspected=[];
 for(const z of authored.functionalZones){
  let checkedFloorCells=0,checkedClearHeadroom=0,roofedCells=0,openSkyCells=0;
  for(let x=z.origin[0];x<z.origin[0]+z.size[0];x++)
   for(let zz=z.origin[1];zz<z.origin[1]+z.size[1];zz++){
    ok(voxels.has(k(x,0,zz))&&voxels.has(k(x,1,zz)),
     'ZONE_FLOOR_NOT_PHYSICALLY_SUPPORTED');
    checkedFloorCells++;
    for(let y=2;y<=1+z.headroom;y++){
     ok(!voxels.has(k(x,y,zz)),'ZONE_LACKS_HEADROOM');
     checkedClearHeadroom++;
    }
    if(z.kind==='sheltered'){
     let above=false;
     for(let y=2+z.headroom;y<height;y++)
      if(voxels.has(k(x,y,zz))){above=true;break;}
     ok(above,'SHELTERED_ZONE_HAS_NO_CANOPY');
     roofedCells++;
    }else{
     for(let y=2;y<height;y++)ok(!voxels.has(k(x,y,zz)),'CIVIC_SKY_OCCLUDED');
     openSkyCells++;
    }
   }
  inspected.push({id:z.id,kind:z.kind,anchorId:z.anchorId,
   sourceFloorCells:checkedFloorCells,sourceClearHeadroomCells:checkedClearHeadroom,
   verifiedOverheadRoofCells:roofedCells,verifiedOpenSkyCells:openSkyCells,
   functionalUseSupportedByVoxels:'NOT_CERTIFIED'});
 }
 const skyZones=inspected.filter(z=>z.kind==='open-sky');
 ok(skyZones.length===1,'ONE_PRIMARY_OUTDOOR_FORUM');
 ok(source.audit.allAnchorsReachable&&source.audit.openSkyColumns>=100,
  'PUBLIC_PATH_OR_SKY_LOST');
 const shellShapes=authored.parti.masses.filter(m=>
  ['ellipsoid','cylinder','torus'].includes(m.shape));
 const result={schema:'minecraftaibuilder-r190at-zones-source-review-v1',
  original:authored,source,structure,zones:inspected,
  sourceVerified:true,
  shelterVsOpenSky:'REAL_B143_SOURCE_VERIFIED',
  realTwoWideSourceRoute:true,
  originalPurposeSemantics:'NOT_CERTIFIED',
  durability:'NOT_CERTIFIED',loadBearing:'NOT_CERTIFIED',
  buildingExteriorAesthetics:'ART_HOLD',
  automaticModelOrHostGeometry:false,
  sourceEllipsoidsCylindersToruses:shellShapes.length,
  actualMinecraftWalking:'NOT_TESTED',modelCallsByReview:0,...safety()};
 return result;
}
