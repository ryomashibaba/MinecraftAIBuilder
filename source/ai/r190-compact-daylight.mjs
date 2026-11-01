/**
 * R190 compact minimum-window experiment.
 *
 * Keep the model-authored compact program, original host-derived geometry,
 * and geometry SHA unchanged. A second HOST-DERIVED candidate adds real
 * B143 apertures through the existing full semantic source + circulation QA.
 * These are NOT model-authored window decisions or an ART/World approval.
 */
import {compileR190SemanticPlan,auditR190SourceRoutes} from './r190-semantic-massing.mjs';
import {verifyCompiled} from './b143-building-dsl.mjs';
const fail=code=>{throw Error('R190_COMPACT_DAYLIGHT_'+code);};
const faces=['north','east','west','south'];
const match=(p,r)=>p?.spaces?.find(x=>x.id===r.id);
const dimension=(r,face)=>['north','south'].includes(face)?r.width:r.depth;
const offsets=(span,width=2)=>{
 const max=span-2-width;
 return [...new Set([Math.floor((span-width)/2),2,max].filter(x=>x>=2&&x<=max))];
};
export function deriveR190CompactMinimumWindows(base){
 if(!base||base.status!=='COMPILED_SOURCE_ONLY_ART_HOLD'||
  !base.hostDerivedPlan||!base.built||!verifyCompiled(base.built.design,base.built.compiled)||
  base.built.worldWrites!==0||base.built.constructionApproved!==false)
  fail('BASE_NOT_VERIFIED');
 const original=JSON.stringify(base.hostDerivedPlan);
 if(base.hostDerivedPlan.glazedOpenings!==undefined)fail('BASE_ALREADY_HAS_WINDOWS');
 const plan=structuredClone(base.hostDerivedPlan),applied=[],skipped=[];
 let current=base.built,candidateTests=0;
 for(const s of plan.spaces){
  const authored=base.modelProgram.spaces.find(r=>r.id===s.id);
  if(!authored)fail('ROOM_AUTHORSHIP_MISSING');
  if(s.spatialRole==='open-court'||authored.form==='facet'){
   skipped.push({spaceId:s.id,reason:authored.form==='facet'?
    'FACET_NOT_SUPPORTED_FOR_GLAZING':'OPEN_COURT_NO_ENCLOSED_WALL'});
   continue;
  }
  const rejected=new Map();
  let found=null,accepted=null;
  for(const face of faces){
   if(found)break;
   const span=dimension(s,face);
   for(const offset of offsets(span)){
    if(found)break;
    for(const baseY of [5,6]){
     if(baseY+2>s.height-1)continue;
     const request={spaceId:s.id,face,offset,baseY,width:2,height:2};
     const next=structuredClone(plan);
     next.glazedOpenings=[...(plan.glazedOpenings??[]),request];
     candidateTests++;
     try{
      const compiled=compileR190SemanticPlan(next);
      if(!verifyCompiled(compiled.design,compiled.compiled)||
       !compiled.audit.allProgramSpacesReachable||
       compiled.audit.realGlazingCells<2*2*(applied.length+1)||
       compiled.worldWrites!==0||compiled.worldContacts!==0||
       compiled.constructionApproved!==false||
       compiled.BuildPlan.operations.length!==0||
       compiled.gates.length!==9||
       compiled.gates.some(g=>g!=='BLOCKED'))fail('NEW_SOURCE_INVALID');
      found=request;accepted=compiled;
      break;
     }catch(e){
      const name=String(e?.message??e).slice(0,100);
      rejected.set(name,(rejected.get(name)??0)+1);
     }
    }
   }
  }
  if(found){
   plan.glazedOpenings=[...(plan.glazedOpenings??[]),found];
   applied.push({...found,authorship:'HOST_DERIVED_MINIMUM_DAYLIGHT',
    acceptedUnder:'FULL_R190_SOURCE_AND_CIRCULATION_QA'});
   current=accepted;
  }else skipped.push({spaceId:s.id,reason:'NO_VERIFIED_EXTERIOR_WINDOW',
   rejectedReasons:Object.fromEntries(rejected)});
 }
 if(JSON.stringify(base.hostDerivedPlan)!==original)fail('BASE_MUTATED');
 if(!applied.length)return {status:'WINDOW_RESEARCH_HOLD',reason:'NO_VALID_WINDOW',
  originalSourceSha256:base.built.compiled.sourceSha256,
  originalGeometrySha256:base.built.compiled.geometrySha256,
  modelOriginalUnaffected:true,attemptedCandidates:candidateTests,
  applied,skipped,modelRequests:0,worldWrites:0};
 if(current.compiled.geometrySha256===base.built.compiled.geometrySha256)
  fail('WINDOW_DID_NOT_CHANGE_GEOMETRY');
 return {status:'HOST_DERIVED_WINDOWS_SOURCE_ART_HOLD',
  originalSourceSha256:base.built.compiled.sourceSha256,
  originalGeometrySha256:base.built.compiled.geometrySha256,
  derivedSourceSha256:current.compiled.sourceSha256,
  derivedGeometrySha256:current.compiled.geometrySha256,
  modelOriginalUnaffected:true,attemptedCandidates:candidateTests,
  authorship:'MODEL_SPACE_AND_FORM_HOST_MINIMUM_WINDOWS',
  applied,skipped,modelRequests:0,worldContacts:0,worldWrites:0,
  art:'NOT_REVIEWED',minecraftWalking:'NOT_TESTED',
  constructionApproved:false,plan,current};
}

/** Read-only evidence of actual B143 clear supporting floor, not game walking. */
export function auditR190CompactInteriorEvidence(built){
 if(built?.schema!=='minecraftaibuilder-r190-source-research-v1'||
  !Array.isArray(built.layout?.spaces)||!built.layout.spaces.length||
  !Array.isArray(built.audit?.witnesses)||
  !verifyCompiled(built.design,built.compiled)||
  built.worldWrites!==0||built.constructionApproved!==false)
  fail('INTERIOR_UNVERIFIED_SOURCE');
 const cells=new Set(built.compiled.primitives.map(v=>v[0]+','+v[1]+','+v[2]));
 const has=(x,y,z)=>cells.has(x+','+y+','+z);
 const clear=(x,z)=>has(x,1,z)&&!has(x,2,z)&&!has(x,3,z);
 // Recompute the authoritative outdoor-to-room route from true final voxels.
 // Do not trust the cached receipt or count isolated 2-wide pads as usable.
 const independentlyAudited=auditR190SourceRoutes(
  built.inputPlan,built.layout,built.design,built.compiled);
 if(!independentlyAudited.allProgramSpacesReachable||
  JSON.stringify(independentlyAudited.witnesses)!==JSON.stringify(built.audit.witnesses))
  fail('INTERIOR_ROUTE_RECEIPT_MISMATCH');
 const witness=independentlyAudited.witnesses.find(
  w=>w.id===built.inputPlan.entrySpaceId)?.reachableTwoWideSourceCell;
 if(!witness)fail('INTERIOR_ENTRY_WITNESS_MISSING');
 const {width,depth}=built.inputPlan.site;
 const stand=(x,z)=>x>=0&&z>=0&&x+1<width&&z+1<depth&&
  [0,1].every(dx=>[0,1].every(dz=>clear(x+dx,z+dz)));
 const queue=[[witness[0],witness[2]]];
 const seen=new Set([queue[0].join(',')]);
 for(let i=0;i<queue.length;i++){
  const [x,z]=queue[i];
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const nx=x+dx,nz=z+dz,key=nx+','+nz;
   if(!seen.has(key)&&stand(nx,nz)){seen.add(key);queue.push([nx,nz]);}
  }
 }
 const rooms=built.layout.spaces.map(r=>{
  const x0=r.x+1,x1=r.x+r.w-2,z0=r.z+1,z1=r.z+r.d-2;
  if(x1<x0||z1<z0)fail('INTERIOR_BOUNDS');
  let supportedClearFloorCells=0,twoByTwoSupportedClearPads=0,reachableTwoWidePads=0;
  for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++){
   if(clear(x,z))supportedClearFloorCells++;
   if(x<x1&&z<z1&&stand(x,z)){
    twoByTwoSupportedClearPads++;
    if(seen.has(x+','+z))reachableTwoWidePads++;
   }
  }
  const witness=built.audit.witnesses.find(w=>w.id===r.id)?.reachableTwoWideSourceCell;
  if(!Array.isArray(witness)||witness.length!==3||witness[1]!==2||
   witness[0]<x0||witness[0]+1>x1||witness[2]<z0||witness[2]+1>z1||
   ![0,1].every(dx=>[0,1].every(dz=>clear(witness[0]+dx,witness[2]+dz))))
   fail('INTERIOR_WITNESS_MISMATCH');
  const interiorFootprintCells=(x1-x0+1)*(z1-z0+1);
  return {spaceId:r.id,spatialRole:r.spatialRole??'enclosed',
   hostResolvedDimensions:[r.w,r.h,r.d],interiorFootprintCells,
   supportedClearFloorCells,twoByTwoSupportedClearPads,
   reachableTwoWidePadsFromEntrance:reachableTwoWidePads,
   disconnectedTwoWidePads:twoByTwoSupportedClearPads-reachableTwoWidePads,
   reachableTwoWidePadFraction:twoByTwoSupportedClearPads===0?0:
    Number((reachableTwoWidePads/twoByTwoSupportedClearPads).toFixed(4)),
   clearFloorFraction:Number((supportedClearFloorCells/interiorFootprintCells).toFixed(4)),
   connectedEntranceWitness:witness,
   furniture:'NOT_GENERATED',actualMinecraftWalking:'NOT_TESTED'};
 });
 return {schema:'r190-compact-interior-source-evidence-v1',
  sourceSha256:built.compiled.sourceSha256,geometrySha256:built.compiled.geometrySha256,
  status:'MEASURED_SOURCE_ONLY_NO_FUNCTION_OR_ART_APPROVAL',
  rooms,allRoomsHaveSourceEntranceWitness:true,
  roomsWithDisconnectedTwoWidePads:rooms.filter(x=>x.disconnectedTwoWidePads>0).map(x=>x.spaceId),
  allRoomTwoWidePadsReachableFromEntrance:rooms.every(x=>x.disconnectedTwoWidePads===0),
  sourceRouteIndependentlyRechecked:true,
  note:'Source-only, two air cells over floor. Reachability is a 2-wide horizontal proxy, not actual Minecraft walking, furniture usability, or ART approval.',
  modelCalls:0,worldContacts:0,worldWrites:0,constructionApproved:false,
  readiness:'NOT_PREPARED',art:'NOT_REVIEWED',actualMinecraftWalking:'NOT_TESTED'};
}

/** Read-only local 2x2 floor-pad map derived from genuine B143 voxels. */
export function renderR190CompactAccessMapSvg(built){
 const audit=auditR190CompactInteriorEvidence(built),rooms=built.layout.spaces;
 const voxels=new Set(built.compiled.primitives.map(v=>v[0]+','+v[1]+','+v[2]));
 const has=(x,y,z)=>voxels.has(x+','+y+','+z);
 const floor=(x,z)=>has(x,1,z)&&!has(x,2,z)&&!has(x,3,z);
 const {width,depth}=built.inputPlan.site;
 const pad=(x,z)=>x>=0&&z>=0&&x+1<width&&z+1<depth&&
  [0,1].every(dx=>[0,1].every(dz=>floor(x+dx,z+dz)));
 const a=audit.rooms.find(r=>r.spaceId===built.inputPlan.entrySpaceId)?.connectedEntranceWitness;
 if(!a||!pad(a[0],a[2]))fail('MAP_ENTRY_INVALID');
 const q=[[a[0],a[2]]],seen=new Set([a[0]+','+a[2]]);
 for(let i=0;i<q.length;i++){
  const [x,z]=q[i];
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const u=x+dx,v=z+dz,k=u+','+v;
   if(!seen.has(k)&&pad(u,v)){seen.add(k);q.push([u,v]);}
  }
 }
 const minX=Math.max(0,Math.min(...rooms.map(r=>r.x))-2);
 const minZ=Math.max(0,Math.min(...rooms.map(r=>r.z))-2);
 const maxX=Math.min(width-1,Math.max(...rooms.map(r=>r.x+r.w-1))+2);
 const maxZ=Math.min(depth-1,Math.max(...rooms.map(r=>r.z+r.d-1))+2);
 const s=8,px=x=>10+(x-minX)*s,pz=z=>58+(z-minZ)*s;
 const H=(maxZ-minZ+1)*s,W=(maxX-minX+1)*s;
 const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;',
  '>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
 const tile=(x,z,color,kind)=>'<rect data-kind="'+kind+'" x="'+px(x)+
  '" y="'+pz(z)+'" width="'+s+'" height="'+s+'" fill="'+color+'"/>';
 const svg=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+
  (W+20)+' '+(H+122)+'" role="img">',
  '<title>B143 SOURCE 2-wide floor pads — Minecraft walking NOT TESTED</title>',
  '<rect width="100%" height="100%" fill="#102334"/>',
  '<text x="10" y="23" fill="white" font-size="13">実SOURCE床の連続到達</text>',
  '<text x="10" y="42" fill="#ffd3b0" font-size="10">実歩行・家具・美術・施工は未認定</text>'];
 for(let z=minZ;z<=maxZ;z++)for(let x=minX;x<=maxX;x++)
  if(has(x,1,z))svg.push(tile(x,z,floor(x,z)?'#486579':'#314052','floor'));
 const roomCounts=new Map(rooms.map(r=>[r.id,[0,0]]));
 for(let z=minZ;z<=maxZ;z++)for(let x=minX;x<=maxX;x++){
  if(!pad(x,z))continue;
  const reached=seen.has(x+','+z);
  svg.push(tile(x,z,reached?'#4ddcb0':'#ffab76',
   reached?'reachable-pad':'disconnected-pad'));
  for(const r of rooms)if(x>=r.x+1&&x+1<=r.x+r.w-2&&z>=r.z+1&&z+1<=r.z+r.d-2){
   const c=roomCounts.get(r.id);c[0]++;if(reached)c[1]++;
  }
 }
 for(const r of audit.rooms){
  const c=roomCounts.get(r.spaceId);
  if(!c||c[0]!==r.twoByTwoSupportedClearPads||
   c[1]!==r.reachableTwoWidePadsFromEntrance)fail('MAP_REPORT_MISMATCH');
 }
 for(const r of rooms){
  svg.push('<rect x="'+px(r.x)+'" y="'+pz(r.z)+'" width="'+(r.w*s)+
   '" height="'+(r.d*s)+'" fill="none" stroke="#f8d7a0" stroke-width="2"/>');
  svg.push('<text x="'+(px(r.x)+4)+'" y="'+(pz(r.z)+12)+
   '" font-size="10" fill="white">'+esc(r.id)+'</text>');
 }
 svg.push('<rect data-kind="entry-witness" x="'+px(a[0])+'" y="'+pz(a[2])+
  '" width="'+s+'" height="'+s+'" fill="none" stroke="white" stroke-width="2"/>');
 svg.push('<text x="10" y="'+(H+80)+'" fill="#4ddcb0" font-size="10">■ 入口に接続した2幅床候補</text>');
 svg.push('<text x="10" y="'+(H+100)+'" fill="#ffab76" font-size="10">■ 孤立した2幅床候補</text>');
 svg.push('<desc>geometrySha256:'+esc(audit.geometrySha256)+
  ' worldWrites:0 constructionApproved:false</desc></svg>');
 return svg.join('\n')+'\n';
}
