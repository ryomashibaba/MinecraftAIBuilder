/** B37: offline, non-executable landing-envelope candidate contract.
 * Supports comparison only: never imports planner/Bridge, never emits Minecraft commands.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const digest=b=>createHash('sha256').update(b).digest('hex');
const hash=v=>digest(JSON.stringify(v));
const fail=s=>{throw Object.assign(new Error('B37_'+s),{code:'B37_'+s});};
const pins=Object.freeze({
 'B36_FILE_SHA256.json':'d782ad0156a29da879ae493b9f61476e36d1e4b8adc6f2726b8d3f1fac24993b',
 'reports/B36_LOCAL_STAIR_SECTION_REPORT.json':'bf58d8200c430908030dbdc72d6149c40023a1bf0f05a87cc881c687373fd842',
 'reports/B17_INTERIOR_INTEGRATION_IR.json':'e04e8ca2789bd8b65548a10e98e940e9537a562ebbf38a63e456ac9b73fb425d',
 'reports/B31_FLOOR_DOOR_OVERLAY.json':'6d233d5ad09b8138650f65d46e0cf2d2ab143577d3862696b562a3857545c430',
});
function pinned(root,rel){
 const p=path.join(root,rel),st=fs.lstatSync(p);
 if(!st.isFile()||st.isSymbolicLink())fail('SOURCE_TYPE');
 const buf=fs.readFileSync(p);if(digest(buf)!==pins[rel])fail('SOURCE_MODIFIED_'+rel.replace(/\W/g,'_'));
 return JSON.parse(buf.toString('utf8'));
}
const k=p=>`${p.x},${p.z}`;
const parse=s=>{if(!/^\d+,\d+$/.test(s))fail('CELL_KEY');const [x,z]=s.split(',').map(Number);return {x,z};};
const direction=Object.freeze({EAST:{x:-1,z:0},WEST:{x:1,z:0},NORTH:{x:0,z:1},SOUTH:{x:0,z:-1}});
const unique=(arr,w,d)=>{
 if(!Array.isArray(arr)||arr.some(p=>!p||!Number.isSafeInteger(p.x)||!Number.isSafeInteger(p.z)||p.x<0||p.z<0||p.x>=w||p.z>=d))fail('CELL_FORMAT');
 const s=new Set(arr.map(k));if(s.size!==arr.length)fail('CELL_DUPLICATE');return s;
};
const sorted=s=>[...s].sort((a,b)=>{const x=parse(a),y=parse(b);return x.z-y.z||x.x-y.x;});
const isInside=(x,z,w,d)=>x>=0&&z>=0&&x<w&&z<d;
/** Corridor-side footprints only. All cells must be in corridor & nominal floor, never on a stair cutout.
 * oneByTwo: port + one retreat cell. twoByTwo: a square to either lateral side.
 */
export function evaluateLandingPadsB37({width,depth,floorRows,corridorCells,shaftCells,openingCells,edges}){
 if(!Number.isInteger(width)||!Number.isInteger(depth)||width<4||depth<4||width>64||depth>64||
  !Array.isArray(floorRows)||floorRows.length!==depth||floorRows.some(r=>typeof r!=='string'||r.length!==width||!/^[#.o]+$/.test(r)))fail('GRID');
 const cor=unique(corridorCells,width,depth),shaft=unique(shaftCells,width,depth),opening=unique(openingCells,width,depth);
 if(opening.size!==2||[...opening].some(s=>!shaft.has(s)))fail('OPENING');
 if([...cor].some(s=>shaft.has(s)))fail('CORRIDOR_SHAFT_OVERLAP');
 if([...cor,...shaft].some(s=>{const p=parse(s);return floorRows[p.z][p.x]==='.';}))fail('OUTSIDE_NOMINAL_FLOOR');
 if(!Array.isArray(edges)||edges.length>40)fail('EDGES');
 const seen=new Set();
 const candidates=edges.map(e=>{
  if(!e||typeof e.corridorKey!=='string'||typeof e.shaftKey!=='string'||!direction[e.approachSide])fail('EDGE_FORMAT');
  const c=parse(e.corridorKey),s=parse(e.shaftKey),d=direction[e.approachSide];
  if(!cor.has(e.corridorKey)||!shaft.has(e.shaftKey)||s.x-c.x!==-d.x||s.z-c.z!==-d.z)fail('EDGE_DISCONNECTED');
  const edgeId=`${e.corridorKey}|${e.shaftKey}`;if(seen.has(edgeId))fail('EDGE_DUPLICATE');seen.add(edgeId);
  if(e.shaftCutoutAdjacent!==opening.has(e.shaftKey))fail('EDGE_CUTOUT_TAMPER');
  const good=(x,z)=>isInside(x,z,width,depth)&&cor.has(`${x},${z}`)&&!opening.has(`${x},${z}`)&&floorRows[z][x]!=='.';
  const retreat={x:c.x+d.x,z:c.z+d.z};
  const line=good(retreat.x,retreat.z);
  // 2x2 square: entrance port, retreat, and their lateral neighbors. Lateral direction independent of stair rotation.
  const lateral={x:-d.z,z:d.x};
  const squares=[];
  for(const sign of [-1,1]){
   const side={x:lateral.x*sign,z:lateral.z*sign};
   const positions=[c,retreat,{x:c.x+side.x,z:c.z+side.z},{x:retreat.x+side.x,z:retreat.z+side.z}];
   if(positions.every(p=>good(p.x,p.z)))squares.push(sorted(new Set(positions.map(k))));
  }
  const squaresDistinct=[...new Map(squares.map(v=>[v.join('|'),v])).values()];
  return {edgeId,corridorKey:e.corridorKey,shaftKey:e.shaftKey,approachSide:e.approachSide,
   directlyTouchesCandidateFloorCutout:opening.has(e.shaftKey),
   corridor1x2Available:line, corridor1x2Cells:line?[e.corridorKey,k(retreat)]:[],
   corridor2x2Available:squaresDistinct.length>0,corridor2x2Alternatives:squaresDistinct,
   geometricReviewClass:squaresDistinct.length&&opening.has(e.shaftKey)?'POTENTIAL_2X2_NEAR_CUTOUT':line?'POTENTIAL_1X2_ONLY':'INSUFFICIENT_CORRIDOR_FOOTPRINT',
   landingBlockDimensionsCertified:false,structuralSupportCertified:false,wallJointCertified:false,headroomCertified:false};
 });
 return candidates.sort((a,b)=>a.edgeId.localeCompare(b.edgeId));
}
export function buildLandingEnvelopeB37(root){
 pinned(root,'B36_FILE_SHA256.json');
 const b36=pinned(root,'reports/B36_LOCAL_STAIR_SECTION_REPORT.json');
 const b17=pinned(root,'reports/B17_INTERIOR_INTEGRATION_IR.json');
 const b31=pinned(root,'reports/B31_FLOOR_DOOR_OVERLAY.json');
 if(b36.schema!=='minecraftaibuilder-step8b-b36-local-section-v1'||b36.readiness!=='NOT_PREPARED'||
 b36.BuildPlan?.operations?.length!==0||b36.assessment?.chosenOption!==null||b36.levels?.length!==5)fail('B36_SAFETY');
 const building=b17.buildings.find(x=>x.id===b36.building),plates=b31.buildings.find(x=>x.id===b36.building);
 if(!building||!plates)fail('BUILDING');
 const levels=[];
 for(const source of b36.levels){
  const floor=building.floors.find(f=>f.level===source.level),plate=plates.floors.find(f=>f.level===source.level);
  if(!floor||!plate||source.options.length!==2)fail('LEVEL_MAPPING');
  const shaft=floor.stairReservation.map(p=>({x:p.x+b36.shift.dx,z:p.z+b36.shift.dz}));
  const openings=source.stairCutoutCellKeys.map(parse);
  const variants=source.options.map(opt=>{
   const del=new Set(opt.removedKeys),corridor=floor.corridorReservation.filter(p=>!del.has(k(p)));
   const ports=evaluateLandingPadsB37({width:plate.width,depth:plate.depth,floorRows:plate.overlayRows,
    corridorCells:corridor,shaftCells:shaft,openingCells:openings,edges:opt.edges});
   return {id:opt.id,ports,
    nominalCorridor1x2Ports:ports.filter(p=>p.corridor1x2Available).length,
    nominalCorridor2x2Ports:ports.filter(p=>p.corridor2x2Available).length,
    nominal2x2CutoutAdjacentPorts:ports.filter(p=>p.corridor2x2Available&&p.directlyTouchesCandidateFloorCutout).length,
    physicalLandingCertified:false,selection:'UNSELECTED',approval:false};
  });
  levels.push({floor:source.level,variants});
 }
 const totals={levels:5,portCountA:levels.reduce((a,l)=>a+l.variants[0].ports.length,0),portCountB:levels.reduce((a,l)=>a+l.variants[1].ports.length,0),
  corridor2x2PortsA:levels.reduce((a,l)=>a+l.variants[0].nominalCorridor2x2Ports,0),
  corridor2x2PortsB:levels.reduce((a,l)=>a+l.variants[1].nominalCorridor2x2Ports,0),
  cutoutAdjacent2x2PortsA:levels.reduce((a,l)=>a+l.variants[0].nominal2x2CutoutAdjacentPorts,0),
  cutoutAdjacent2x2PortsB:levels.reduce((a,l)=>a+l.variants[1].nominal2x2CutoutAdjacentPorts,0),
  physicallyValidLandings:0,materialVerified:0,operationsEmitted:0};
 const report={schema:'minecraftaibuilder-step8b-b37-landing-envelope-v1',kind:'OFFLINE_READONLY_GEOMETRY_DIAGNOSTIC',
  provenance:{basedOn:'B36_FROZEN_REPORT_B17_B31',B36ReportSha256:pins['reports/B36_LOCAL_STAIR_SECTION_REPORT.json'],worldConnection:false,plannerExecuted:false},
  building:b36.building,nominalFootprintsOnly:true,wallAndSupportEvidence:'UNKNOWN',
  landingInterpretation:'CORRIDOR_RESERVATION_1x2_OR_2x2_ONLY_NOT_A_CONSTRUCTIBLE_LANDING',
  levels,totals,unresolved:['LANDING_REAL_DIMENSIONS','STAIR_ENTRY_VERTICAL_TRANSITION','SLAB_SUPPORT_AND_ROOF_HEADROOM',
   'FLOOR_CUTOUT_REAL_EMITTER','WALL_AND_RAIL_JOINTS','MATERIAL_AND_DOOR_STATES','WORLD_COORDINATES','RUNTIME_ENGINE_IDENTITY','CONSTRUCTION_APPROVAL'],
  recommendation:'REVIEW_EAST_SIDE_CORRIDOR_2X2_AS_NONEXECUTABLE_CANDIDATE_ONLY',approvedVariant:null,
  safety:{notPrepared:true,constructionApproved:false,executionAllowed:false,worldAccess:false,bridgeContact:false,
   projectFilesModified:false,frozenEvidenceModified:false,legacyModified:false},readiness:'NOT_PREPARED',deployment:'BLOCKED',
  BuildPlan:{status:'NOT_PREPARED',operations:[],materialIds:[],worldCoordinates:null},constructionCommands:0};
 report.reportSha256=hash(report);return report;
}
export function validateLandingEnvelopeB37(report,root){
 if(report?.schema!=='minecraftaibuilder-step8b-b37-landing-envelope-v1'||report?.readiness!=='NOT_PREPARED'||
 report.deployment!=='BLOCKED'||report.approvedVariant!==null||report.safety?.notPrepared!==true||
 report.safety?.constructionApproved!==false||report.safety?.executionAllowed!==false||report.safety?.worldAccess!==false||
 report.safety?.bridgeContact!==false||report.BuildPlan?.operations?.length!==0||report.BuildPlan?.materialIds?.length!==0||
 report.BuildPlan?.worldCoordinates!==null||report.constructionCommands!==0||
 report.totals?.physicallyValidLandings!==0||report.levels?.some(l=>l.variants?.some(v=>v.approval!==false||v.physicalLandingCertified!==false)))fail('UNSAFE_REPORT');
 const {reportSha256,...body}=report;
 if(hash(body)!==reportSha256||JSON.stringify(report)!==JSON.stringify(buildLandingEnvelopeB37(root)))fail('REPORT_MODIFIED');
 return true;
}
