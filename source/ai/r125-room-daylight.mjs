/** Generic author-selected true glazed openings with daylight to room air.
 * Not a genre template, a repaired author response, or Minecraft execution.
 * A window kind describes intended glazing, not an immutable metre width.
 */
import {compileDesign,verifyCompiled,MATERIALS} from './b143-building-dsl.mjs';
import {auditR125SourceRoutes} from './r125-source-routes.mjs';
const key=(x,y,z)=>x+','+y+','+z;
const fail=(why,daylightPlacement=null)=>{
 const error=Error('R125_PLAN_DAYLIGHT_'+why);
 if(daylightPlacement)error.daylightPlacement=daylightPlacement;
 throw error;
};
export function addAuthoredRoomDaylight(product,{auditCirculation}={}){
 // Two bays are requested only by an explicit model-owned 'paired-bays'.
 // Each bay is separately verified as true exterior glass with inside air.
 // Existing single-window author choices have byte-identical SOURCE output.
 const asks=product.plan.levels.flatMap((level,li)=>
  level.spaces.flatMap((s,zi)=>s.daylight===undefined?[]:
   (s.daylight==='paired-bays'?[0,1]:[0]).map(index=>({
    li,zi,id:s.id,kind:s.daylight,
    ...(s.daylight==='paired-bays'?{index}:{})
   }))));
 if(asks.length===0)return product;
 if(typeof auditCirculation!=='function')fail('AUDITOR_REQUIRED');
 let current=product;
 const chosen=[];
 for(const ask of asks){
  const zone=current.program[ask.li].zones[ask.zi].range;
  const floorY=current.program[ask.li].standingFloorY;
  const wide=ask.kind==='wide-bay'||ask.kind==='paired-bays';
  const widths=ask.kind==='paired-bays'?[3,2]:wide?[4,3,2]:[5,4,3];
  const height=wide?2:1,wy=floorY+(wide?1:2);
  const p=current.plan,e=p.expression,w=p.footprint.width,d=p.footprint.depth;
  const right=w-2-(ask.li===1&&e?.setbackSide==='east'?e.setbackDepth:0);
  const rear=d-2-(ask.li===1&&e?.setbackSide==='rear'?e.setbackDepth:0);
  const edges=[
   {face:'front',axis:'z',wall:1,inside:1,valid:zone.z[0]===2,lo:zone.x[0],hi:zone.x[1]},
   {face:'rear',axis:'z',wall:rear,inside:-1,valid:zone.z[1]===rear-1,lo:zone.x[0],hi:zone.x[1]},
   {face:'east',axis:'x',wall:right,inside:-1,valid:zone.x[1]===right-1,lo:zone.z[0],hi:zone.z[1]},
   {face:'west',axis:'x',wall:1,inside:1,valid:zone.x[0]===2,lo:zone.z[0],hi:zone.z[1]}
  ];
  const first=ask.kind==='paired-bays'&&ask.index===1?
   chosen.find(t=>t.zoneId===ask.id&&t.kind==='paired-bays'):null;
  if(ask.kind==='paired-bays'&&ask.index===1&&!first)
   fail('PAIRED_BAY_FIRST_MISSING_'+ask.id);
  // Prefer genuinely independent wall faces. A second bay on the same
  // face is allowed only with at least one intact wall column between bays.
  const preferredEdges=first?
   [...edges.filter(e=>e.face!==first.face),
    ...edges.filter(e=>e.face===first.face)]:edges;
  const matrix=new Map(current.compiled.primitives.map(v=>
   [key(...v.slice(0,3)),v[3]]));
  const at=(x,y,z)=>matrix.get(key(x,y,z));
  const material=MATERIALS.indexOf(p.materials.wall);
  // The cut+glass is allowed only at cells occupied by wall; it does not
  // change the AIR/SOLID geometry used by SOURCE circulation. A broken
  // shell cannot be fixed by exchanging wall material for glass. Diagnose
  // it once at the source instead of mislabeling every window as a blocker.
  const baselineCirculation=auditCirculation(current);
  const baselineRoutes=auditR125SourceRoutes(current);
  if(baselineCirculation.status!=='SOURCE_CLEARANCE_PROBES_PASS'||
     baselineRoutes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'){
   fail('BASELINE_SOURCE_HOLD_'+ask.id,{
    schema:'r125-daylight-placement-failure-v1',
    failed:{level:ask.li,zoneId:ask.id,kind:ask.kind,range:zone},
    attemptedWidths:widths,candidatesEvaluated:0,
    baselineCirculation:baselineCirculation.status,
    baselineCirculationFailures:baselineCirculation.failures.slice(0,24),
    baselineRoutes:baselineRoutes.status,
    baselineRouteIssues:baselineRoutes.issues.slice(0,24),
    upstreamOfWindow:true,
    sourceOnly:true,originalPlanEdited:false,modelCalls:0,worldWrites:0
   });
  }
  const baselineOccupied=new Set(current.compiled.primitives.map(v=>
   key(...v.slice(0,3))));
  const rejected={WALL_OR_SILL_LINTEL:0,INTERIOR_AIR_BLOCKED:0,
   EXTERIOR_AIR_BLOCKED:0,SAME_FACADE_SEPARATION:0,SOURCE_CIRCULATION_HOLD:0,
   SOURCE_ROUTE_HOLD:0};
  let candidatesEvaluated=0,created=null;
  // Preserve historical window dimensions and front/rear/east/west
  // precedence when possible. Shorter windows are a universal fallback,
  // not a silent change from clerestory to a low window or stained panel.
  for(const width of widths){
   for(const edge of preferredEdges){
    if(!edge.valid)continue;
    const starts=[];
    for(let k=edge.lo+1;k<=edge.hi-width;k++)starts.push(k);
    const mid=(edge.lo+edge.hi-width+1)/2;
    starts.sort((x,z)=>Math.abs(x-mid)-Math.abs(z-mid)||x-z);
    const locate=(i,side=0)=>edge.axis==='z'?
     [i,wy,edge.wall+side]:[edge.wall+side,wy,i];
    for(const pos of starts){
     if(first&&first.face===edge.face){
      const previousPos=edge.axis==='z'?first.origin[0]:first.origin[2];
      const previousWidth=edge.axis==='z'?first.size[0]:first.size[2];
      if(!(pos+width<previousPos||previousPos+previousWidth<pos)){
       rejected.SAME_FACADE_SEPARATION++;continue;
      }
     }
     candidatesEvaluated++;
     let rejectedBy=null;
     for(let dx=0;dx<width&&!rejectedBy;dx++){
      const [x,,z]=locate(pos+dx);
      const [ix,,iz]=locate(pos+dx,edge.inside);
      const [ox,,oz]=locate(pos+dx,-edge.inside);
      if(at(x,wy-1,z)!==material||
         at(x,wy+height,z)!==material)
       rejectedBy='WALL_OR_SILL_LINTEL';
      for(let dy=0;dy<height&&!rejectedBy;dy++){
       if(at(x,wy+dy,z)!==material)
        rejectedBy='WALL_OR_SILL_LINTEL';
       else if(at(ix,wy+dy,iz)!==undefined)
        rejectedBy='INTERIOR_AIR_BLOCKED';
       else if(at(ox,wy+dy,oz)!==undefined)
        rejectedBy='EXTERIOR_AIR_BLOCKED';
      }
     }
     if(rejectedBy){rejected[rejectedBy]++;continue;}
     const origin=locate(pos),size=edge.axis==='z'?
      [width,height,1]:[1,height,width];
     const tag='daylight-l'+ask.li+'-z'+ask.zi+
      (ask.kind==='paired-bays'?'-p'+ask.index:'');
     const design={...current.design,elements:[
      ...current.design.elements,
      {id:tag+'-cut',shape:'box',mode:'cut',origin,size},
      {id:tag+'-glass',shape:'box',mode:'add',material:'glass',origin,size}
     ]};
     const compiled=compileDesign(design);
     if(!verifyCompiled(design,compiled))fail('SOURCE_MISMATCH');
     const trialOccupied=new Set(compiled.primitives.map(v=>
      key(...v.slice(0,3))));
     // Verify the geometric premise before attributing ANY circulation
     // regression to a material-only window replacement.
     if(trialOccupied.size!==baselineOccupied.size||
        [...baselineOccupied].some(id=>!trialOccupied.has(id)))
      fail('UNEXPECTED_OCCUPANCY_CHANGE_'+ask.id,{
       schema:'r125-daylight-placement-failure-v1',
       failed:{level:ask.li,zoneId:ask.id,kind:ask.kind,range:zone},
       attemptedWidths:widths,candidatesEvaluated,
       selectedCandidate:{face:edge.face,origin,size},
       baselineOccupiedCells:baselineOccupied.size,
       trialOccupiedCells:trialOccupied.size,
       sourceOnly:true,originalPlanEdited:false,modelCalls:0,worldWrites:0
      });
     const trial={...current,design,compiled,
      sourceSha256:compiled.sourceSha256,geometrySha256:compiled.geometrySha256};
     const trialCirculation=auditCirculation(trial);
     if(trialCirculation.status!=='SOURCE_CLEARANCE_PROBES_PASS'){
      // No occupancy change is allowed above; a failure here is an
      // auditor inconsistency, not evidence the window blocks a passage.
      fail('SOURCE_AUDIT_INCONSISTENT_'+ask.id,{
       schema:'r125-daylight-placement-failure-v1',
       failed:{level:ask.li,zoneId:ask.id,kind:ask.kind,range:zone},
       selectedCandidate:{face:edge.face,origin,size},
       baselineCirculationFailures:baselineCirculation.failures,
       trialCirculationFailures:trialCirculation.failures,
       sourceOnly:true,originalPlanEdited:false,modelCalls:0,worldWrites:0
      });
     }
     const trialRoutes=auditR125SourceRoutes(trial);
     if(trialRoutes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'){
      fail('SOURCE_ROUTE_INCONSISTENT_'+ask.id,{
       schema:'r125-daylight-placement-failure-v1',
       failed:{level:ask.li,zoneId:ask.id,kind:ask.kind,range:zone},
       selectedCandidate:{face:edge.face,origin,size},
       baselineRouteIssues:baselineRoutes.issues,
       trialRouteIssues:trialRoutes.issues,
       sourceOnly:true,originalPlanEdited:false,modelCalls:0,worldWrites:0
      });
     }
     current=trial;
     created={zoneId:ask.id,kind:ask.kind,
      ...(ask.kind==='paired-bays'?{paneIndex:ask.index}:{}),
      face:edge.face,origin,size,
      outsideAirVerified:true,sillLintelVerified:true,
      ...(width!==widths[0]?{adaptedWidthFrom:widths[0]}:{}),
      MinecraftWalking:'NOT_TESTED',worldWrites:0};
     break;
    }
    if(created)break;
   }
   if(created)break;
  }
  if(!created)fail('NO_SUPPORTED_EXTERIOR_BAY_'+ask.id,{
   schema:'r125-daylight-placement-failure-v1',
   failed:{level:ask.li,zoneId:ask.id,kind:ask.kind,range:zone,
    ...(ask.kind==='paired-bays'?{paneIndex:ask.index}:{})},
   attemptedWidths:widths,candidatesEvaluated,rejected,
   sourceOnly:true,originalPlanEdited:false,modelCalls:0,worldWrites:0
  });
  chosen.push(created);
 }
 return {...current,daylightTargets:chosen,
  daylightChoiceOwner:'MODEL',daylightGeometryOwner:'GENERIC_HOST'};
}
