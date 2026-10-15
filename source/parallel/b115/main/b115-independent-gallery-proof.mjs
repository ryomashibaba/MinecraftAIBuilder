/** B115: independent geometry-only audit, no Minecraft connection or build plan. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateStairGalleryIntegration} from '../../b114/main/b114-stair-gallery-integration.mjs';

export function checkB115Footprint(p,{allowed,walk,ascent,upper}={}){
 const errors=[],detail={};
 const isPoint=q=>q&&Number.isSafeInteger(q.x)&&Number.isSafeInteger(q.z)&&Math.abs(q.x)<1000000&&Math.abs(q.z)<1000000;
 const k=q=>q.x+","+q.z, sq=q=>[q,{x:q.x+1,z:q.z},{x:q.x,z:q.z+1},{x:q.x+1,z:q.z+1}];
 if(!p||p.status!=="CONDITIONAL_TWO_WIDE_ROUTE_CANDIDATE")return {status:"NOT_A_CANDIDATE",errors:["EXPECTED_CANDIDATE"],twoWideTopologyVerified:false};
 if(!Array.isArray(p.fullFootprintCells)||!Array.isArray(p.addedCells)||!isPoint(p.startAnchor)||!isPoint(p.goalAnchor)||!Array.isArray(p.landing)||p.landing.length!==2||!p.landing.every(isPoint)||!p.fullFootprintCells.every(isPoint)||!p.addedCells.every(isPoint))
  return {status:"REJECTED",errors:["MALFORMED_GEOMETRY"],twoWideTopologyVerified:false};
 const all=new Set(p.fullFootprintCells.map(k)),added=new Set(p.addedCells.map(k));
 if(all.size!==p.fullFootprintCells.length)errors.push("DUPLICATE_FOOTPRINT_CELL");
 if(added.size!==p.addedCells.length)errors.push("DUPLICATE_ADDED_CELL");
 if(!p.addedCells.length)errors.push("NO_NEW_CELLS_FOR_CANDIDATE");
 if([...added].some(x=>!all.has(x)))errors.push("ADDITION_OUTSIDE_FOOTPRINT");
 const adjacency=Math.abs(p.landing[0].x-p.landing[1].x)+Math.abs(p.landing[0].z-p.landing[1].z);
 if(adjacency!==1)errors.push("LANDING_NOT_TWO_ADJACENT_CELLS");
 if(ascent!==undefined){
  if(!ascent||!Number.isSafeInteger(ascent.dx)||!Number.isSafeInteger(ascent.dz)||Math.abs(ascent.dx)+Math.abs(ascent.dz)!==1)errors.push("INVALID_ASCENT");
  else{
   const d=upper?ascent:{dx:-ascent.dx,dz:-ascent.dz};
   const rows=p.landing.flatMap(t=>[{x:t.x+d.dx,z:t.z+d.dz},{x:t.x+2*d.dx,z:t.z+2*d.dz}]);
   const correct={x:Math.min(...rows.map(y=>y.x)),z:Math.min(...rows.map(y=>y.z))};
   if(k(correct)!==k(p.startAnchor))errors.push("START_ANCHOR_NOT_AT_LANDING_EXIT");
  }
 }
 const anchors=new Set();
 for(const cell of p.fullFootprintCells)if(sq(cell).every(q=>all.has(k(q))))anchors.add(k(cell));
 const start=k(p.startAnchor),goal=k(p.goalAnchor);
 if(!anchors.has(start))errors.push("START_SQUARE_MISSING");
 if(!anchors.has(goal))errors.push("GOAL_SQUARE_MISSING");
 const visited=new Set(),q=anchors.has(start)?[p.startAnchor]:[];
 for(let i=0;i<q.length;i++){
  const a=q[i],s=k(a);if(visited.has(s))continue;visited.add(s);
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const nx={x:a.x+dx,z:a.z+dz},nk=k(nx);
   if(anchors.has(nk)&&!visited.has(nk))q.push(nx);
  }
 }
 if(!visited.has(goal))errors.push("NO_CONTINUOUS_TWO_WIDE_ROUTE");
 const covered=new Set();
 for(const a of q)for(const t of sq(a))covered.add(k(t));
 if([...all].some(x=>!covered.has(x)))errors.push("UNREACHABLE_EXTRA_FOOTPRINT_CELLS");
 if(allowed!==undefined){
  if(!(allowed instanceof Set))errors.push("INVALID_ALLOWED_SET");
  else if([...all].some(x=>!allowed.has(x)))errors.push("FOOTPRINT_NOT_IN_ALLOWED_MASK");
 }
 if(walk!==undefined){
  if(!(walk instanceof Set))errors.push("INVALID_WALK_SET");
  else{
   const target=sq(p.goalAnchor).filter(t=>walk.has(k(t)));
   if(!target.some((x,i)=>target.slice(i+1).some(y=>Math.abs(x.x-y.x)+Math.abs(x.z-y.z)===1)))errors.push("GOAL_NOT_TWO_WIDE_CONNECTED_TO_SOURCE_GALLERY");
   const expected=new Set([...all].filter(x=>!walk.has(x)));
   if(expected.size!==added.size||[...expected].some(x=>!added.has(x)))errors.push("ADDED_CELLS_NOT_EXACT_FOOTPRINT_DELTA");
  }
 }
 detail.squareAnchors=anchors.size;detail.reachableSquareAnchors=visited.size;detail.footprintCells=all.size;detail.addedCells=added.size;
 return {status:errors.length?"REJECTED":allowed instanceof Set&&walk instanceof Set?"SOURCE_CONSTRAINED_TOPOLOGY_PASS":"LOCAL_TOPOLOGY_ONLY",errors,twoWideTopologyVerified:errors.length===0,sourceAllowedMaskVerified:errors.length===0&&allowed instanceof Set,sourceGalleryTerminalVerified:errors.length===0&&walk instanceof Set,...detail,physicalWalkabilityCertified:false};
}

export function auditB115Gallery(g){
 if(!validateStairGalleryIntegration(g))throw Error("B115_UNTRUSTED_OR_CHANGED_B114_INTEGRATION_REPORT");
 const cases=[],failures=[],all=[];
 for(const c of g.cases){
  const per={id:c.id,stairs:c.stairInterfaces.length,candidates:0,unresolved:0,rejected:0,localTopologyPassed:0};
  for(const s of c.stairInterfaces){
   for(const p of s.proposals){
    if(p.status!=="CONDITIONAL_TWO_WIDE_ROUTE_CANDIDATE"){
     per.unresolved++;
     if(p.addedCells?.length||p.fullFootprintCells?.length)failures.push({id:c.id,stairIndex:s.stairIndex,side:p.side,reasons:["NON_CANDIDATE_CONTAINS_GEOMETRY"]});
     continue;
    }
    per.candidates++;
    const result=checkB115Footprint(p);
    all.push(result);
    if(result.twoWideTopologyVerified)per.localTopologyPassed++;
    else{per.rejected++;failures.push({id:c.id,stairIndex:s.stairIndex,side:p.side,reasons:result.errors});}
   }
  }
  cases.push(per);
 }
 const total=x=>cases.reduce((acc,c)=>acc+c[x],0);
 const body={schema:"minecraftaibuilder-b115-independent-gallery-topology-v1",
  inputB114Integrity:g.integritySha256,
  scope:"INDEPENDENT_TOPOLOGY_OF_B114_PRECOMPUTED_CORRIDOR_PROPOSALS_ONLY",
  cases,
  totals:{buildings:cases.length,stairLinks:cases.reduce((n,c)=>n+c.stairs,0),proposals:total("candidates"),topologyPassed:total("localTopologyPassed"),rejected:total("rejected"),unresolved:total("unresolved"),sourceAllowedMasksRechecked:0,sourceGalleryRootConnectivityRechecked:0,physicallyCertifiedStairs:0,worldContacts:0,constructionCommands:0},
  failures,
  warnings:["CURRENT_PASS_IS_LOCAL_2D_TOPOLOGY_ONLY","SOURCE_FLOOR_MASK_AND_EXISTING_GALLERY_REQUIRE_SEPARATE_RECOMPUTATION","ACTUAL_BEDROCK_BODY_COLLISION_DOORS_FLOORS_NOT_CERTIFIED"],
  readiness:"NOT_PREPARED",constructionApproved:false,executionAllowed:false,worldContacts:0,worldCoordinates:null,commandCount:0,gates:g.gates.map(x=>({...x})),BuildPlan:{status:"NOT_PREPARED",operations:[],worldCoordinates:null,commandCount:0}};
 if(body.totals.buildings!==15||body.totals.stairLinks!==102)throw Error("B115_INCOMPLETE_BUILDING_OR_STAIR_COVERAGE");
 if(failures.length)throw Error("B115_GALLERY_TOPOLOGY_FAILED:"+JSON.stringify(failures.slice(0,5)));
 return body;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const input=path.resolve(process.argv[2]||"b114-review-output/B114_15_Buildings_Stair_Gallery_Integrated_Design.json");
 const out=path.resolve(process.argv[3]||"b115-review-output");
 const gallery=JSON.parse(fs.readFileSync(input,"utf8"));
 const result=auditB115Gallery(gallery);
 fs.mkdirSync(out,{recursive:true});
 fs.writeFileSync(path.join(out,"B115_Independent_2D_Gallery_Audit.json"),JSON.stringify(result,null,2)+"\n");
 fs.writeFileSync(path.join(out,"B115_Independent_2D_Gallery_Audit_JA.md"),
 "# B115 幅2通路の独立トポロジー検査（非施工）\n\n"+
 "|項目|値|\n|---|---:|\n"+
 "|検証対象階段|"+result.totals.stairLinks+"|\n"+
 "|候補数|"+result.totals.proposals+"|\n"+
 "|平面上の幅2連続性PASS|"+result.totals.topologyPassed+"|\n"+
 "|不正候補|"+result.totals.rejected+"|\n"+
 "|未解決の提案|"+result.totals.unresolved+"|\n\n"+
 "このPASSは局所的な平面2D連続性のみで、元の床マスク・既存廊下ネットワーク・ゲーム内3D移動は未認証。\n"+
 "NOT_PREPARED / 9 BLOCKED / worldContacts=0 / BuildPlan.operations=[]\n");
 console.log(JSON.stringify({totals:result.totals,output:out},null,2));
}
