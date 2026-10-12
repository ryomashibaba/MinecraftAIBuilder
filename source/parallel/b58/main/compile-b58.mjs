/** B58: offline nominal core opportunity search and cross-era stair mask reconciliation.
 * Only local 2D bitmasks; no construction output, coordinates, materials, runtime bridge,
 * wall traversal assertions, doors, ladder/stair block states or execution capabilities.
 */
import {createHash} from 'node:crypto';
const digest=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const fail=x=>{throw Error('B58_'+x)};
const validInt=(x,max)=>Number.isSafeInteger(x)&&x>=0&&x<=max;
function checkHash(r){if(!r||typeof r!=='object')fail('INPUT');const {reportSha256,...rest}=r;if(reportSha256!==digest(rest))fail('SOURCE_HASH');}
function raster(rects,w,d,count){
 if(!Array.isArray(rects)||!validInt(w,64)||!validInt(d,64))fail('RASTER');
 const result=new Uint8Array(w*d);let n=0;
 for(const r of rects){if(!r||![r.x,r.z,r.width,r.depth].every(x=>validInt(x,64))||!r.width||!r.depth||r.x+r.width>w||r.z+r.depth>d)fail('RECTANGLE');
  for(let z=r.z;z<r.z+r.depth;z++)for(let x=r.x;x<r.x+r.width;x++){
   const k=z*w+x;if(result[k])fail('RECTANGLE_OVERLAP');result[k]=1;n++;
  }
 }
 if(n!==count)fail('RECTANGLE_COUNT');return result;
}
function flood(mask,w,d,starts){
 const distance=new Int32Array(w*d).fill(-1),q=[];
 for(const [x,z] of starts){if(!validInt(x,w-1)||!validInt(z,d-1)||!mask[z*w+x])continue;
  const k=z*w+x;if(distance[k]===-1){distance[k]=0;q.push(k);}
 }
 for(let i=0;i<q.length;i++){
  const k=q[i],x=k%w,z=(k-x)/w;
  for(const [nx,nz] of [[x+1,z],[x-1,z],[x,z+1],[x,z-1]]){
   if(nx<0||nx>=w||nz<0||nz>=d)continue;
   const n=nz*w+nx;if(mask[n]&&distance[n]<0){distance[n]=distance[k]+1;q.push(n);}
  }
 }
 return distance;
}
function coreOptions(floors,w,d,variants){
 const common=new Uint8Array(w*d);let shared=0;
 for(let i=0;i<common.length;i++) {common[i]=Number(floors.every(f=>f[i]===1));shared+=common[i];}
 const sizes=[2,3,4],bySize=[];
 for(const size of sizes){const options=[];
  for(let z=0;z<=d-size;z++)for(let x=0;x<=w-size;x++){
   let filled=true;for(let zz=z;zz<z+size&&filled;zz++)for(let xx=x;xx<x+size;xx++)if(!common[zz*w+xx]){filled=false;break;}
   if(!filled)continue;
   // Score is a geometric ranking, not a structural engineering or egress judgement.
   const setback=Math.min(x,z,w-(x+size),d-(z+size));
   options.push({x,z,size,nominalSharedCells:size*size,minSiteEdgeSetback:setback,approved:false});
  }
  options.sort((a,b)=>b.minSiteEdgeSetback-a.minSiteEdgeSetback||a.z-b.z||a.x-b.x);
  bySize.push({size,fullySharedOptions:options.length,topThree:options.slice(0,3)});
 }
 const ground=floors[0],entryReviews=[];
 for(const v of variants){
  const e=v.entry;
  if(!validInt(e.start,w-1)||!validInt(e.end,w-1)||e.start>e.end||
     e.northBoundaryCovered!==true||v.approved!==false||e.verifiedPhysicalPassage!==false)fail('VARIANT');
  const candidates=[];
  for(let x=e.start;x<=e.end;x++)candidates.push([x,0]);
  const startCoverage=candidates.filter(([x,z])=>ground[z*w+x]).length;
  if(startCoverage!==candidates.length)fail('ENTRANCE_FLOOR_DRIFT');
  const dist=flood(ground,w,d,candidates);
  const ranked=[];
  for(let z=0;z<d-1;z++)for(let x=0;x<w-1;x++){
   if(![0,1,w,w+1].every(off=>common[z*w+x+off]))continue;
   const steps=Math.min(dist[z*w+x],dist[z*w+x+1],dist[(z+1)*w+x],dist[(z+1)*w+x+1]);
   if(steps<0)continue;
   const setback=Math.min(x,z,w-(x+2),d-(z+2));
   ranked.push({x,z,nominalGroundFootprintSteps:steps,localSiteSetback:setback,physicalWalkabilityVerified:false});
  }
  ranked.sort((a,b)=>a.nominalGroundFootprintSteps-b.nominalGroundFootprintSteps||
   b.localSiteSetback-a.localSiteSetback||a.z-b.z||a.x-b.x);
  entryReviews.push({profile:v.profile,entryFrontageCells:startCoverage,
    sharedTwoByTwoCoreOptionsReachableOnBareFloor:ranked.length,
    closestSharedTwoByTwoCore:ranked[0]??null,
    partitionWallDoorsStairsAndClearancesVerified:false});
 }
 return {commonFloorCells:shared,sharedCoreSearch:bySize,entranceToCommonCore:entryReviews,
  corridorAndVerticalPassageVerified:false,roofAccessVerified:false};
}
function reconcileB42(apartment,b42){
 if(b42.schema!=='minecraftaibuilder-step8b-b42-stair-macro-module-v1'||
  b42.readiness!=='NOT_PREPARED'||b42.deployment!=='BLOCKED'||
  b42.safety?.executionAllowed!==false||b42.BuildPlan?.operations?.length!==0||
  b42.blockers?.length!==9||b42.blockers.some(g=>g.status!=='BLOCKED')||
  b42.interface?.outputCompatibleWithRuntimePlanner!==false||b42.transitions?.length!==5)fail('B42_SAFETY');
 const {width:w,depth:d}=apartment.site;const floor=apartment.preview.levels.map((l,i)=>raster(l.floorRectangles,w,d,apartment.levels[i].floorCells));
 const diffs=[];let missingInB42=0,extraInB42=0,reviewRouteOutsideCanonical=0;
 for(let i=0;i<5;i++){
  const t=b42.transitions[i];if(t.transition!==`L${i+1}_L${i+2}`||t.floorMask?.width!==w||t.floorMask?.depth!==d||
   t.floorMask?.candidateFloorRows?.length!==d)fail('B42_FRAME');
  const rows=t.floorMask.candidateFloorRows;
  const found=new Uint8Array(w*d);let total=0;
  for(let z=0;z<d;z++){
   if(typeof rows[z]!=='string'||rows[z].length!==w||/[^.#]/.test(rows[z]))fail('B42_ROW');
   for(let x=0;x<w;x++){if(rows[z][x]==='#'){found[z*w+x]=1;total++;}}
  }
  if(total!==t.floorMask.candidateOccupiedCells||t.floorMask.exactRectangleCoverage!==true)fail('B42_COUNT');
  const dropped=[],added=[];
  // B42 transition mask is a candidate *upper*-floor proxy, not an L1 floor proof.
  // Compare it to B57 canonical upper-floor mask; incompatible snapshots are not repaired.
  for(let k=0;k<w*d;k++){
   const x=k%w,z=Math.floor(k/w);
   if(floor[i+1][k]&&!found[k])dropped.push({x,z});
   if(!floor[i+1][k]&&found[k])added.push({x,z});
  }
  const corridor=t.corridor;if(!corridor?.lead||!corridor?.upperLanding)fail('B42_CORRIDOR');
  const connector=corridor.potentialUpperCorridorConnector;
  if(!connector||!Array.isArray(connector.route))fail('B42_CONNECTOR');
  const pathOutside=connector.route.filter(pt=>!validInt(pt.x,w-1)||!validInt(pt.z,d-1)||!floor[i+1][pt.z*w+pt.x]);
  const anchorInLower=Boolean(floor[i][corridor.lead.z*w+corridor.lead.x]);
  const landingInUpper=Boolean(floor[i+1][corridor.upperLanding.z*w+corridor.upperLanding.x]);
  if(!anchorInLower||!landingInUpper)fail('B42_ANCHOR_OUTSIDE_CANONICAL');
  missingInB42+=dropped.length;extraInB42+=added.length;reviewRouteOutsideCanonical+=pathOutside.length;
  diffs.push({transition:t.transition,canonicalUpperFloorCells:apartment.levels[i+1].floorCells,
   b42CandidateUpperFloorCells:total,
   cellsPresentInB57MissingFromB42:dropped,cellsPresentInB42MissingFromB57:added,
   corridorLeadCoveredByB57:anchorInLower,upperLandingCoveredByB57:landingInUpper,
   reviewUpperConnectorRouteLength:connector.route.length,
   upperConnectorRouteOutsideB57Floor:pathOutside,
   b42SourceInterchangeParity:dropped.length||added.length?'DIFFERENT':'MATCH_LOCAL_MASK_ONLY',
   realStairGeometryCertified:false});
 }
 return {transitions:diffs,totals:{transitions:5,cellsPresentOnlyInB57:missingInB42,
  cellsPresentOnlyInB42:extraInB42,routePointsOutsideCanonical:reviewRouteOutsideCanonical},
  safetyInterpretation:'TWO_DIFFERENT_UNAPPROVED_SNAPSHOT_MASKS_NEVER_AUTOMERGE',
  physicalStairPassageVerified:false};
}
export function compileB58(b57,b42){
 checkHash(b57);checkHash(b42);
 if(b57.schema!=='minecraftaibuilder-b57-offline-envelope-topology-v1'||
  b57.readiness!=='NOT_PREPARED'||b57.deployment!=='BLOCKED'||
  b57.executionAllowed!==false||b57.constructionApproved!==false||
  b57.BuildPlan?.operations?.length!==0||b57.BuildPlan.commandCount!==0||
  b57.blockers?.M4Gates?.length!==9||b57.blockers.M4Gates.some(g=>g.status!=='BLOCKED')||
  b57.productionFacadeParity!=='UNVERIFIED'||b57.buildings?.length!==5||
  b57.totals?.facadeMissing!==0||b57.totals?.facadeExtra!==0||
  b57.engineCalls!==0||b57.worldContacts!==0||b57.scans!==0)fail('UPSTREAM_SAFETY');
 const buildings=[];
 for(const b of b57.buildings){const {width:w,depth:d,floors:n}=b.site;
  if(!validInt(w,64)||!validInt(d,64)||n!==6||b.levels?.length!==6||b.preview?.levels?.length!==6||b.variants?.length!==3)fail('BUILDING');
  const floor=b.preview.levels.map((l,i)=>raster(l.floorRectangles,w,d,b.levels[i].floorCells));
  const options=coreOptions(floor,w,d,b.variants);
  buildings.push({id:b.id,site:{width:w,depth:d,levels:6},
   ...options,originalFloorCellCounts:b.levels.map(l=>l.floorCells),
   candidatePhysicalClearanceVerified:false,approved:false});
 }
 const apt=b57.buildings.find(b=>b.id==='apartment/candidate-01');if(!apt)fail('NO_APARTMENT');
 const legacyStairAudit=reconcileB42(apt,b42);
 const totals={buildings:buildings.length,levels:buildings.length*6,
  commonVerticalFootprintCells:buildings.reduce((s,b)=>s+b.commonFloorCells,0),
  candidateTwoByTwoSharedCorePositions:buildings.reduce((s,b)=>s+b.sharedCoreSearch[0].fullySharedOptions,0),
  candidateThreeByThreeSharedCorePositions:buildings.reduce((s,b)=>s+b.sharedCoreSearch[1].fullySharedOptions,0),
  candidateFourByFourSharedCorePositions:buildings.reduce((s,b)=>s+b.sharedCoreSearch[2].fullySharedOptions,0),
  entranceToCoreReviews:buildings.reduce((s,b)=>s+b.entranceToCommonCore.length,0),
  b42VsB57DifferentMaskCells:legacyStairAudit.totals.cellsPresentOnlyInB57+legacyStairAudit.totals.cellsPresentOnlyInB42,
  runtimePlannerCalls:0,actualConstructionOperations:0};
 const body={schema:'minecraftaibuilder-b58-nominal-vertical-core-reconciliation-v1',
  kind:'OFFLINE_LOCAL_ONLY_VERTICAL_CORE_OPPORTUNITY_AND_STAIR_SNAPSHOT_RECONCILIATION',
  provenance:{b57ReportSha256:b57.reportSha256,b42ReportSha256:b42.reportSha256},
  buildings,legacyStairAudit,totals,
  verified:['SOURCE_HASHES','LOCAL_FLOOR_RASTER_COVERAGE','SIX_LEVEL_COMMON_FOOTPRINT','BARE_FLOOR_2D_CONNECTED_PATH','B42_REVIEW_MASK_DIFFERENCES'],
  notVerified:['REAL_STAIR_CONSTRUCTION','INTERIOR_WALL_OBSTRUCTIONS','PHYSICAL_EGRESS','FIRE_SAFETY','MATERIALS','LOAD_CAPACITY','PRODUCTION_FACADE_PARITY','WORLD_COORDINATES'],
  readiness:'NOT_PREPARED',deployment:'BLOCKED',executionAllowed:false,constructionApproved:false,
  productionFacadeParity:'UNVERIFIED',physicalQuality:'UNKNOWN',
  engineCalls:0,worldContacts:0,minecraftCommands:0,scans:0,
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]},
  blockers:{M4Gates:b57.blockers.M4Gates.map(g=>({...g}))}};
 return {...body,reportSha256:digest(body)};
}
export function verifyB58(report,b57,b42){
 checkHash(report);
 if(report.schema!=='minecraftaibuilder-b58-nominal-vertical-core-reconciliation-v1'||
  report.readiness!=='NOT_PREPARED'||report.deployment!=='BLOCKED'||
  report.executionAllowed!==false||report.constructionApproved!==false||
  report.BuildPlan?.operations?.length!==0||report.BuildPlan?.commandCount!==0||
  report.blockers?.M4Gates?.length!==9||report.blockers.M4Gates.some(g=>g.status!=='BLOCKED')||
  report.engineCalls!==0||report.worldContacts!==0||report.minecraftCommands!==0||report.scans!==0||
  report.productionFacadeParity!=='UNVERIFIED')fail('OUTPUT_SAFETY');
 if(JSON.stringify(report)!==JSON.stringify(compileB58(b57,b42)))fail('REPLAY');
 return true;
}
