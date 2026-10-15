/** B123: independent, read-only two-wide gallery-to-stair-interface reconciliation.
 * This is a 2D source-proxy graph, NEVER a Minecraft collision certificate.
 */
const K=p=>p.x+','+p.z;
const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
const point=id=>{const t=id.split(',').map(Number);return {x:t[0],z:t[1]};};
const sq=p=>[p,{x:p.x+1,z:p.z},{x:p.x,z:p.z+1},{x:p.x+1,z:p.z+1}];
const adj=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.z-b.z)===1;
const valid=p=>p&&Number.isSafeInteger(p.x)&&Number.isSafeInteger(p.z);
function checkSets(x,label) {
 if(!Array.isArray(x)||!x.length||!x.every(v=>v instanceof Set))
  throw Error('B123_BAD_SET_ARRAY_'+label);
 for(const s of x)for(const id of s)if(typeof id!=='string'||!/^-?\d+,-?\d+$/.test(id))
  throw Error('B123_BAD_CELL_KEY_'+label);
}
function graph(source,staged,removed=new Set(),extra=new Set()){
 for(const id of removed) {
  if(!staged.has(id))throw Error('B123_RETRACTION_OUTSIDE_STAGED_RESERVATIONS');
  if(source.has(id))throw Error('B123_IMMUTABLE_SOURCE_RETRACTION');
 }
 const all=new Set([...source,...staged].filter(id=>!removed.has(id)));
 for(const id of extra)all.add(id);
 const anchors=new Map();
 for(const id of all) {
  const p=point(id);
  if(sq(p).every(q=>all.has(K(q))))anchors.set(id,p);
 }
 const roots=[];
 for(const [id,p] of anchors){
  const tiles=sq(p).filter(q=>source.has(K(q)));
  if(tiles.some((a,i)=>tiles.slice(i+1).some(b=>adj(a,b))))roots.push(id);
 }
 const reachable=new Set(),queue=[...roots];
 for(let i=0;i<queue.length;i++){
  const id=queue[i];if(reachable.has(id))continue;
  reachable.add(id);const p=point(id);
  for(const [dx,dz]of dirs){
   const next=K({x:p.x+dx,z:p.z+dz});
   if(anchors.has(next)&&!reachable.has(next))queue.push(next);
  }
 }
 const covered=new Set();
 for(const id of reachable)for(const p of sq(point(id)))covered.add(K(p));
 const pending=[...staged].filter(id=>!source.has(id)&&!removed.has(id));
 return {anchors:anchors.size,rootAnchors:roots.length,
  rootedAnchors:reachable.size,rootedCells:covered.size,
  remainingStagedCells:pending.length,
  rootedStagedCells:pending.filter(id=>covered.has(id)).length,
  covered};
}
/** Both adjacent landing lanes must meet an adjacent pair in the same rooted 2-wide component. */
function interfaceLinked(landing,rootedCells){
 if(!Array.isArray(landing)||landing.length!==2||!landing.every(valid)||!adj(landing[0],landing[1]))
  throw Error('B123_INVALID_LANDING_TWO_LANES');
 const choices=landing.map(p=>dirs.map(([dx,dz])=>({x:p.x+dx,z:p.z+dz}))
  .filter(q=>rootedCells.has(K(q))&&!landing.some(x=>K(x)===K(q))));
 return choices[0].some(a=>choices[1].some(b=>K(a)!==K(b)&&adj(a,b)));
}
export function reconcileB123StairInterfaces({sourceByLevel,stagedByLevel,
 removedByLevel,newByLevel,stairInterfaces,replacedStairIndex,replacementLandings}){
 checkSets(sourceByLevel,'SOURCE');checkSets(stagedByLevel,'STAGED');
 checkSets(removedByLevel,'REMOVED');checkSets(newByLevel,'ADDED');
 const levels=sourceByLevel.length;
 if([stagedByLevel,removedByLevel,newByLevel].some(a=>a.length!==levels)||
 !Array.isArray(stairInterfaces)||!stairInterfaces.length||
 !Number.isInteger(replacedStairIndex)||replacedStairIndex<0||
 !replacementLandings||!Array.isArray(replacementLandings.lowerLanding)||
 !Array.isArray(replacementLandings.upperLanding))
  throw Error('B123_INCOMPLETE_NETWORK_INPUT');
 if(new Set(stairInterfaces.map(x=>x.stairIndex)).size!==stairInterfaces.length||
 !stairInterfaces.some(x=>x.stairIndex===replacedStairIndex))
  throw Error('B123_STAIR_INVENTORY_NOT_UNIQUE');
 const before=[],after=[];
 for(let l=0;l<levels;l++){
  before.push(graph(sourceByLevel[l],stagedByLevel[l]));
  after.push(graph(sourceByLevel[l],stagedByLevel[l],removedByLevel[l],newByLevel[l]));
 }
 const records=[],regressions=[];
 for(const stair of stairInterfaces) {
  const {stairIndex,fromLevel,toLevel,lowerLanding,upperLanding}=stair;
  if(!Number.isInteger(stairIndex)||!Number.isInteger(fromLevel)||
   !Number.isInteger(toLevel)||toLevel!==fromLevel+1||
   fromLevel<0||toLevel>=levels)
   throw Error('B123_BAD_STAIR_LEVEL_OR_INDEX');
  const target=stairIndex===replacedStairIndex;
  const next=target?replacementLandings:{lowerLanding,upperLanding};
  const lowBefore=interfaceLinked(lowerLanding,before[fromLevel].covered);
  const upBefore=interfaceLinked(upperLanding,before[toLevel].covered);
  const lowAfter=interfaceLinked(next.lowerLanding,after[fromLevel].covered);
  const upAfter=interfaceLinked(next.upperLanding,after[toLevel].covered);
  const lostSides=[];
  if(!target&&lowBefore&&!lowAfter)lostSides.push('LOWER');
  if(!target&&upBefore&&!upAfter)lostSides.push('UPPER');
  if(lostSides.length)regressions.push({stairIndex,lostSides});
  records.push({stairIndex,target,fromLevel,toLevel,
   before:{LOWER:lowBefore,UPPER:upBefore},
   after:{LOWER:lowAfter,UPPER:upAfter},
   lostPreviouslyRootedOtherInterfaceSides:lostSides,
   originalGeometryUnchanged:!target,physicalAccessCertified:false});
 }
 const target=records.find(x=>x.target);
 const delta=(key)=>after.reduce((n,g)=>n+g[key],0)-
  before.reduce((n,g)=>n+g[key],0);
 const output={stairCount:records.length,
  targetStairIndex,replacedTargetBothRooted:target.after.LOWER&&target.after.UPPER,
  otherStairRegressionCount:regressions.length,regressions,
  previouslyRootedOtherInterfaceSidesLost:regressions.reduce((n,x)=>n+x.lostSides.length,0),
  baselineRootedAnchorCount:before.reduce((n,g)=>n+g.rootedAnchors,0),
  replannedRootedAnchorCount:after.reduce((n,g)=>n+g.rootedAnchors,0),
  stagedCellsRemoved:removedByLevel.reduce((n,s)=>n+s.size,0),
  conceptualCellsAdded:newByLevel.reduce((n,s)=>n+s.size,0),
  rootedStagedCellDelta:delta('rootedStagedCells'),
  interfaceRecords:records,
  status:regressions.length||!target.after.LOWER||!target.after.UPPER?
   'HOLD_NETWORK_RECONNECTION_REVIEW':'NO_NEW_TWO_WIDE_INTERFACE_REGRESSION_IN_SCOPED_PROXY',
  originalSourceModified:false,worldContacts:0,
  allOtherStairPhysicalConnectionsCertified:false,allStair3DCollisionsCertified:false,
  constructionAllowed:false};
 return output;
}
