/**
 * R125: genuinely glazed inter-room work observation, selected by the AI.
 * The HOST places no fake view: a 2x2 glass panel, accessible visitor-side
 * standing pads, and a clear eye-level ray terminating on an authored real
 * work fixture MUST all be proven in the compiled B143 voxels.
 * No doors, staff-room relabeling, model calls, or Minecraft contact.
 */
import {compileDesign,verifyCompiled,MATERIALS}
 from './b143-building-dsl.mjs';
import {auditR125SourceRoutes,auditR125VisitorRoutes}
 from './r125-source-routes.mjs';

const fail=code=>{throw Error('R125_OBSERVATION_'+code);};
const k=(x,y,z)=>x+','+y+','+z;
const workKinds=new Set(['assembly-table','inspection-stand','workbench',
 'service-bay','electronics','oven','tool-rack']);
const zoneWithLevel=(product,id)=>{
 for(const level of product.program??[]){
  const zone=level.zones.find(x=>x.id===id);
  if(zone)return {...zone,level:level.level,y:level.standingFloorY};
 }
 return null;
};
function adjoiningWalls(view,work){
 if(view.level!==work.level)return [];
 const out=[],a=view.range,b=work.range;
 const overlap=(l,r)=>[Math.max(l[0],r[0]),Math.min(l[1],r[1])];
 if(a.x[1]+2===b.x[0]){
  const span=overlap(a.z,b.z);
  if(span[1]-span[0]>=1)out.push({axis:'x',wall:a.x[1]+1,
   dir:1,viewerSide:'left',span});
 }
 if(b.x[1]+2===a.x[0]){
  const span=overlap(a.z,b.z);
  if(span[1]-span[0]>=1)out.push({axis:'x',wall:b.x[1]+1,
   dir:-1,viewerSide:'right',span});
 }
 if(a.z[1]+2===b.z[0]){
  const span=overlap(a.x,b.x);
  if(span[1]-span[0]>=1)out.push({axis:'z',wall:a.z[1]+1,
   dir:1,viewerSide:'near',span});
 }
 if(b.z[1]+2===a.z[0]){
  const span=overlap(a.x,b.x);
  if(span[1]-span[0]>=1)out.push({axis:'z',wall:b.z[1]+1,
   dir:-1,viewerSide:'far',span});
 }
 return out;
}
const inFixture=(f,x,z)=>x>=f.origin[0]&&
 x<f.origin[0]+f.size[0]&&z>=f.origin[2]&&z<f.origin[2]+f.size[2];
/** Return a real first-hit eye-level ray into a fixture, not just its name. */
function rayToStation(solids,wall,pane,fixture,view,work){
 const standing=work.y,eye=standing+1,glass=MATERIALS.indexOf('glass');
 for(const along of [pane,pane+1]){
  let x=wall.axis==='x'?wall.wall:along;
  let z=wall.axis==='z'?wall.wall:along;
  if(solids.get(k(x,eye,z))!==glass)continue;
  // The near side of the glass must open into the genuine staff room.
  for(let step=1;step<=32;step++){
   x=wall.axis==='x'?wall.wall+wall.dir*step:along;
   z=wall.axis==='z'?wall.wall+wall.dir*step:along;
   if(x<work.range.x[0]||x>work.range.x[1]||
      z<work.range.z[0]||z>work.range.z[1])break;
   const hit=solids.get(k(x,eye,z));
   if(hit!==undefined){
    if(inFixture(fixture,x,z))
     return {eyeY:eye,paneAxis:wall.axis,paneCoordinate:pane,
      clearSightlineCells:step-1,workFixtureId:fixture.id,
      workFixtureKind:fixture.kind,visibleWorkCell:[x,eye,z]};
    break;
   }
  }
 }
 return null;
}
/** Opt-in: original plans without observationLink remain byte-identical. */
export function addR125AuthoredObservation(product,plan){
 const link=plan?.observationLink;
 if(link===undefined)return product;
 if(!link||typeof link.viewerSpaceId!=='string'||
    typeof link.workSpaceId!=='string')fail('INVALID_LINK');
 if(!product?.design||!product?.compiled||
    !verifyCompiled(product.design,product.compiled)||
    !Array.isArray(product.fixtureTargets))fail('UNVERIFIED_INPUT');
 const view=zoneWithLevel(product,link.viewerSpaceId);
 const work=zoneWithLevel(product,link.workSpaceId);
 if(!view||!work||view.level!==work.level)fail('SAME_LEVEL_ADJACENCY_REQUIRED');
 const authored=plan.levels[view.level].spaces;
 const visitorRoom=authored.find(s=>s.id===link.viewerSpaceId);
 const workerRoom=authored.find(s=>s.id===link.workSpaceId);
 if(!visitorRoom||!workerRoom||
    !['public','shared'].includes(visitorRoom.access)||
    !['shared','staff'].includes(workerRoom.access))
  fail('ACTUAL_ACCESS_ROLES_REQUIRED');
 const fixtures=product.fixtureTargets.filter(f=>
  f.zoneId===work.id&&workKinds.has(f.kind));
 if(!fixtures.length)fail('NO_WORKSTATION_IN_TARGET_ROOM');
 const walls=adjoiningWalls(view,work);
 if(!walls.length)fail('NO_SHARED_FULL_HEIGHT_WALL');
 const wallMaterial=MATERIALS.indexOf(plan.materials.wall);
 const cells=new Map(product.compiled.primitives.map(v=>
  [k(v[0],v[1],v[2]),v[3]]));
 const attempts=[];
 for(const wall of walls)for(const f of fixtures){
  for(let pane=wall.span[0];pane+1<=wall.span[1];pane++){
   const origin=wall.axis==='x'?
    [wall.wall,view.y+1,pane]:[pane,view.y+1,wall.wall];
   const size=wall.axis==='x'?[1,2,2]:[2,2,1];
   const originalPanel=[];
   for(let xx=origin[0];xx<origin[0]+size[0];xx++)
    for(let yy=origin[1];yy<origin[1]+size[1];yy++)
     for(let zz=origin[2];zz<origin[2]+size[2];zz++)
      originalPanel.push([xx,yy,zz]);
   // Real existing opaque room-divider material, never a doorway, exterior
   // facade, previously glazed wall, staff boundary void or roof.
   if(!originalPanel.every(([x,y,z])=>cells.get(k(x,y,z))===wallMaterial))
    continue;
   const innerEye=wall.axis==='x'?
    [wall.wall+wall.dir,view.y+1,pane]:
    [pane,view.y+1,wall.wall+wall.dir];
   const viewerEye=wall.axis==='x'?
    [wall.wall-wall.dir,view.y+1,pane]:
    [pane,view.y+1,wall.wall-wall.dir];
   if(cells.has(k(...innerEye))||cells.has(k(...viewerEye)))continue;
   // Do not cut low wall support or lintel. Glass occupies the whole
   // 2x2 view opening; it is NOT an open passage into staff rooms.
   const design=structuredClone(product.design);
   design.elements.push({
    id:'authored-observation-glass-opening',shape:'box',mode:'cut',
    origin,size
   },{
    id:'authored-observation-glass-panel',shape:'box',mode:'add',
    material:'glass',origin,size
   });
   let compiled;
   try{compiled=compileDesign(design);}
   catch{continue;}
   if(!verifyCompiled(design,compiled)||
      compiled.BuildPlan.operations.length!==0||
      compiled.worldContacts!==0)continue;
   const finalCells=new Map(compiled.primitives.map(v=>
    [k(v[0],v[1],v[2]),v[3]]));
   if(!originalPanel.every(([x,y,z])=>
     finalCells.get(k(x,y,z))===MATERIALS.indexOf('glass')))
    continue;
   const trial={...product,design,compiled,
    sourceSha256:compiled.sourceSha256,geometrySha256:compiled.geometrySha256};
   const id='authored-observation-window-probe';
   const probe={id,zoneId:view.id,
    origin:[origin[0],view.y,origin[2]],
    size:[size[0],3,size[2]],
    requiredServiceSide:wall.viewerSide};
   const routes=auditR125SourceRoutes(trial,{
    featureTargets:[...product.fixtureTargets,probe]});
   const paneWitness=routes.featureAccess.find(t=>t.id===id);
   if(routes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
      paneWitness?.reachableFromEntrance!==true)continue;
   const visitors=auditR125VisitorRoutes(trial,plan);
   if(visitors.status!=='SOURCE_VISITOR_ROUTES_AVOID_STAFF')continue;
   const ray=rayToStation(finalCells,wall,pane,f,view,work);
   if(!ray)continue;
   return {...trial,observationSource:{
    schema:'r125-source-authored-observation-v1',
    status:'SOURCE_GLAZED_WORK_VIEW_CONFIRMED',
    viewerSpaceId:view.id,workSpaceId:work.id,
    panelOrigin:origin,panelSize:size,
    actualGlassCells:originalPanel.length,
    viewerTwoWideSourceWitness:paneWitness.supportedTwoWideServiceWitness,
    viewerSourceGraphMoves:paneWitness.sourceGraphMoves,
    ray,dividerWallPreservedExceptGlass:true,
    visitorRouteAvoidsStaff:true,originalEdited:false,
    modelCalls:0,worldWrites:0,minecraftWalking:'NOT_TESTED',
    humanVisualLegibility:'NOT_REVIEWED'
   }};
  }
 }
 fail('NO_ACCESSIBLE_GLAZED_SIGHTLINE_TO_WORKSTATION');
}
