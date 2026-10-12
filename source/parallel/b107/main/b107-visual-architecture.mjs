/** B107 whole-building VISUAL architecture atop immutable B104/B105/B106.
 * Every visual shape is an offline box annotation of an anchored conceptual cell.
 * This is not blockstate geometry, not physics, not a Minecraft operation.
 */
import {createHash} from 'node:crypto';
import {auditB105} from '../../b105/main/b105-building-volume.mjs';
import {validateB106Scene} from '../../b106/main/b106-review-scene.mjs';
const key=(x,y,z)=>x+','+y+','+z;
const sha=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const looks=Object.freeze({
 house:{roof:'PITCHED_RIDGE',facade:'WARM_TIMBER',windows:'RESIDENTIAL_FRAMES',furniture:'DOMESTIC'},
 hotel:{roof:'CROWN_PARAPET',facade:'STONE_GLAZING',windows:'VERTICAL_BAYS',furniture:'HOSPITALITY'},
 apartment:{roof:'ROOF_TERRACE',facade:'BALCONY_RHYTHM',windows:'RESIDENTIAL_FRAMES',furniture:'RESIDENTIAL'},
 office:{roof:'LAYERED_PLANT_ROOF',facade:'METAL_GLASS',windows:'CURTAIN_WALL',furniture:'WORKPLACE'},
 library:{roof:'SAWTOOTH_SKYLIGHT',facade:'MASONRY_GLASS',windows:'READING_BAYS',furniture:'CULTURAL'}
});
export const B107_MATERIALS=Object.freeze({
 timber:'#b68e6a',masonry:'#b7ad9e',metal:'#899bac',glass:'#80c9de',
 roof:'#697b8c',roofTrim:'#e3d3b8',skylight:'#b8e9f2',
 balcony:'#9cabb0',woodFurniture:'#cba678',upholstery:'#7b9aa8',
 floor:'#6e8bb3',highlight:'#f0c978',stair:'#b8a3d8',railing:'#d6cbe3'
});
export const B107_LAYERS=Object.freeze([
 'ROOF_FORM','ROOF_TRIM','FACADE_RHYTHM','WINDOW_FRAME','WINDOW_GLASS',
 'BALCONY_BAND','INTERIOR_FURNITURE','INTERIOR_DETAIL','STAIR_DIAGRAM','CORE_RAILING'
]);
function safe(d,v,s){
 return d?.schema==='minecraftaibuilder-b104-co-design-v1'&&d.readonlyDesign===true&&
 d.constructionApproved===false&&d.worldContacts===0&&d.worldCoordinates===null&&
 d.blockOperations?.length===0&&d.BuildPlan?.status==='NOT_PREPARED'&&
 d.BuildPlan.operations?.length===0&&d.BuildPlan.commandCount===0&&d.BuildPlan.worldCoordinates===null&&
 v?.schema==='minecraftaibuilder-b105-building-volume-ir-v1'&&v.constructionApproved===false&&
 v.worldContacts===0&&v.worldCoordinates===null&&v.blockOperations?.length===0&&
 v.BuildPlan?.operations?.length===0&&v.BuildPlan.commandCount===0&&
 v.BuildPlan.worldCoordinates===null&&validateB106Scene(s)&&
 d.candidateId===v.candidateId&&v.candidateId===s.id;
}
const validBox=b=>[b.x,b.y,b.z,b.w,b.h,b.d].every(Number.isFinite)&&
 b.w>0&&b.h>0&&b.d>0&&b.w<=2&&b.h<=2&&b.d<=2;
export function polishB107(design,volume,baseScene){
 if(!safe(design,volume,baseScene))throw Error('B107_UNSAFE_PARENT');
 const audit=auditB105(volume,design.plan);
 if(audit.issueCount||audit.envelopeConflicts||audit.roofCoverageGaps||
 audit.portalVoidGaps||audit.furniturePathViolations||audit.stairInterfaceGaps)
 throw Error('B107_PARENT_HAS_SPATIAL_ERRORS');
 const spec=looks[volume.typology];if(!spec)throw Error('B107_UNKNOWN_TYPOLOGY');
 const visual=[],roofAnchors=[],windowAnchors=[],fixtureAnchors=[],stairAnchors=[];
 const add=(kind,material,x,y,z,w,h,d,anchor,level)=>{
  const b={kind,material,x,y,z,w,h,d,anchor,level};
  if(!B107_LAYERS.includes(kind)||!Object.hasOwn(B107_MATERIALS,material)||
    !Number.isInteger(level)||level<0||level>=volume.levels||!validBox(b))
    throw Error('B107_INVALID_VISUAL_BOX');
  visual.push(b);
 };
 const roofCells=volume.voxels.filter(v=>v.kind==='ROOF_CAP_PROXY');
 const roofSet=new Set(roofCells.map(p=>key(p.x,p.y,p.z)));
 const styles=Object.fromEntries([
  ['house','PITCHED_RIDGE'],['hotel','CROWN_PARAPET'],['apartment','ROOF_TERRACE'],
  ['office','LAYERED_PLANT_ROOF'],['library','SAWTOOTH_SKYLIGHT']
 ]);
 // Each B105 roof cap receives a documented non-solid height-profile visualization.
 // No neighbor is invented as an additional roof footprint.
 for(const c of roofCells){
  const an=key(c.x,c.y,c.z);roofAnchors.push(an);
  const sideDistance=[-1,1].map(dx=>roofSet.has(key(c.x+dx,c.y,c.z)));
  const sideDistanceZ=[-1,1].map(dz=>roofSet.has(key(c.x,c.y,c.z+dz)));
  const edge=![...sideDistance,...sideDistanceZ].every(Boolean);
  const mod=Math.abs(c.x*7+c.z*3);
  const h=volume.typology==='house'?.18+.11*Math.min(3,Math.abs(c.x%7-3)):
   volume.typology==='library'?.13+.08*(mod%4):
   volume.typology==='hotel'?.17:volume.typology==='office'?.16+.04*(mod%3):.14;
  const material=volume.typology==='library'&&mod%9===0?'skylight':'roof';
  add('ROOF_FORM',material,c.x,c.y,c.z,1,h,1,an,c.level);
  if(edge&&mod%3===0)add('ROOF_TRIM','roofTrim',c.x,c.y+h,c.z,1,.08,1,an,c.level);
 }
 const shell=volume.voxels.filter(v=>v.kind==='FACADE_PANEL_PROXY');
 for(const c of shell){
  if(c.y%5!==2||Math.abs(c.x*17+c.z*7+c.level)%4!==0)continue;
  const an=key(c.x,c.y,c.z);
  // A material rib is a surface visualization at the conceptual outer-shell cell.
  add('FACADE_RHYTHM',volume.typology==='house'?'timber':'metal',
   c.x+.41,c.y,c.z+.41,.18,.98,.18,an,c.level);
  if(volume.typology==='apartment'&&Math.abs(c.x+c.z)%3===0)
   add('BALCONY_BAND','balcony',c.x,c.y-.1,c.z,.98,.12,.98,an,c.level);
 }
 const windows=volume.voxels.filter(v=>v.kind==='WINDOW_GLAZING_PROXY');
 for(const c of windows){
  const an=key(c.x,c.y,c.z);windowAnchors.push(an);
  const f=volume.facadeFaces[c.level]?.faces.find(p=>p.x===c.x&&p.z===c.z);
  if(!f||f.opening)throw Error('B107_WINDOW_SOURCE_INVALID');
  const ns=f.sides.some(x=>x==='N'||x==='S');
  if(ns){
   add('WINDOW_GLASS','glass',c.x+.13,c.y+.12,c.z+.44,.74,.74,.12,an,c.level);
   add('WINDOW_FRAME','metal',c.x+.1,c.y+.1,c.z+.41,.8,.08,.18,an,c.level);
   add('WINDOW_FRAME','metal',c.x+.1,c.y+.84,c.z+.41,.8,.08,.18,an,c.level);
   add('WINDOW_FRAME','metal',c.x+.48,c.y+.1,c.z+.41,.06,.82,.18,an,c.level);
  }else{
   add('WINDOW_GLASS','glass',c.x+.44,c.y+.12,c.z+.13,.12,.74,.74,an,c.level);
   add('WINDOW_FRAME','metal',c.x+.41,c.y+.1,c.z+.1,.18,.08,.8,an,c.level);
   add('WINDOW_FRAME','metal',c.x+.41,c.y+.84,c.z+.1,.18,.08,.8,an,c.level);
   add('WINDOW_FRAME','metal',c.x+.41,c.y+.1,c.z+.48,.18,.82,.06,an,c.level);
  }
 }
 const furniture=volume.voxels.filter(v=>v.kind==='FURNITURE_PLACEHOLDER');
 for(const c of furniture){
  const an=key(c.x,c.y,c.z);fixtureAnchors.push(an);
  const room=volume.interior.find(r=>r.level===c.level&&r.fixtures.some(p=>p.x===c.x&&p.z===c.z));
  if(!room)throw Error('B107_LOST_ROOM_FIXTURE');
  const bedroom=room.fixtureKind==='SLEEP_OR_STORAGE_PROXY';
  const shelving=room.fixtureKind==='SHELF_OR_READING_PROXY';
  const seat=room.fixtureKind==='SEATING_PROXY';
  const tableHeight=bedroom?.33:shelving?1.22:seat?.44:.72;
  add('INTERIOR_FURNITURE',bedroom||shelving?'woodFurniture':'upholstery',
   c.x+.10,c.y-.02,c.z+.12,.8,tableHeight,.76,an,c.level);
  if(bedroom)add('INTERIOR_DETAIL','highlight',c.x+.12,c.y+.24,c.z+.12,.76,.10,.3,an,c.level);
  else if(shelving)add('INTERIOR_DETAIL','woodFurniture',c.x+.10,c.y+.55,c.z+.12,.8,.08,.76,an,c.level);
  else add('INTERIOR_DETAIL','woodFurniture',c.x+.21,c.y+tableHeight-.06,c.z+.20,.58,.09,.56,an,c.level);
 }
 const ring=[{x:0,z:0},{x:1,z:0},{x:2,z:0},{x:2,z:1},{x:2,z:2},{x:1,z:2}];
 for(let ci=0;ci<design.plan.cores.length;ci++)for(let level=0;level<volume.levels-1;level++){
  const core=design.plan.cores[ci],an='CORE'+ci+'@L'+level;stairAnchors.push(an);
  for(let i=0;i<ring.length;i++){
   const p=ring[i],x=core.x+p.x,z=core.z+p.z,y=level*5+.55+i*.62;
   add('STAIR_DIAGRAM','stair',x+.1,y,z+.1,.8,.16,.8,an,level);
   if(i%2===0)add('CORE_RAILING','railing',x+.08,y+.17,z+.08,.09,.55,.09,an,level);
  }
 }
 const stats={roofSourceCells:roofAnchors.length,windowSourceCells:windowAnchors.length,
  furnishingSourceCells:fixtureAnchors.length,stairFlightDiagrams:stairAnchors.length,
  roofForms:visual.filter(b=>b.kind==='ROOF_FORM').length,
  framedWindows:windowAnchors.length,
  visualFurnitureGroups:fixtureAnchors.length,
  staircaseTreadDiagrams:visual.filter(b=>b.kind==='STAIR_DIAGRAM').length,
  profile:spec,
  volumesWithNewExternalFootprint:0,
  visuallyApproved:false,realStairsCertified:false,realRoofWeatherproofingCertified:false,
  realBlockStatesVerified:0,physicallyFinishedRooms:0,
  designIssues:[]};
 const scene={schema:'minecraftaibuilder-b107-visual-polish-v1',id:volume.candidateId,
  typology:volume.typology,levels:volume.levels,baseSceneSha256:baseScene.sceneSha256,
  visualShapes:visual,stats,legacyVisualLayers:[...baseScene.layerNames],
  locality:'OFFLINE_CONCEPTUAL_B105_ANCHORS',worldContacts:0,worldCoordinates:null,
  constructionApproved:false,executionAllowed:false,
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}};
 return {...scene,integritySha256:sha(scene)};
}
export function validateB107Polish(polish,baseScene){
 if(polish?.schema!=='minecraftaibuilder-b107-visual-polish-v1'||
 !validateB106Scene(baseScene)||polish.baseSceneSha256!==baseScene.sceneSha256||
 polish.id!==baseScene.id||polish.levels!==baseScene.levels||
 polish.worldContacts!==0||polish.worldCoordinates!==null||
 polish.constructionApproved!==false||polish.executionAllowed!==false||
 polish.BuildPlan?.status!=='NOT_PREPARED'||polish.BuildPlan?.operations?.length!==0||
 polish.BuildPlan.commandCount!==0||polish.BuildPlan.worldCoordinates!==null||
 !Array.isArray(polish.visualShapes)||!polish.visualShapes.length)return false;
 const {integritySha256,...data}=polish;
 if(integritySha256!==sha(data)||polish.stats?.visuallyApproved!==false||
 polish.stats?.realStairsCertified!==false||polish.stats?.realRoofWeatherproofingCertified!==false||
 polish.stats?.realBlockStatesVerified!==0||polish.stats?.physicallyFinishedRooms!==0||
 polish.stats?.volumesWithNewExternalFootprint!==0||polish.stats?.designIssues?.length!==0||
 JSON.stringify(polish.legacyVisualLayers)!==JSON.stringify(baseScene.layerNames))return false;
 if(polish.visualShapes.some(b=>!B107_LAYERS.includes(b.kind)||
 !Object.hasOwn(B107_MATERIALS,b.material)||!validBox(b)||
 !Number.isInteger(b.level)||b.level<0||b.level>=polish.levels))return false;
 const byKind=k=>polish.visualShapes.filter(b=>b.kind===k).length;
 return polish.stats.roofSourceCells===baseScene.stats.ROOF_CAP_PROXY&&
 polish.stats.windowSourceCells===baseScene.stats.WINDOW_GLAZING_PROXY&&
 polish.stats.furnishingSourceCells===baseScene.stats.FURNITURE_PLACEHOLDER&&
 polish.stats.stairFlightDiagrams===baseScene.stats.conceptualVerticalLinks&&
 polish.stats.roofForms===byKind('ROOF_FORM')&&
 polish.stats.framedWindows===polish.stats.windowSourceCells&&
 polish.stats.visualFurnitureGroups===polish.stats.furnishingSourceCells&&
 polish.stats.staircaseTreadDiagrams===polish.stats.stairFlightDiagrams*6;
}
