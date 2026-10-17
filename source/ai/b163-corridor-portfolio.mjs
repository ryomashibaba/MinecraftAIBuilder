/**
 * B163 — three architecture trade-offs generated from THE SAME original
 * obstacle voxels; independent geometry and post-decoration 2x2 path checks.
 *
 * Compact 2-wide / Balanced 4-wide / Monumental 8-wide each gets a real
 * finished DSL design. No winner is hard-coded: publish a Pareto comparison.
 * Minecraft strength, rail safety, and physical player fit are never certified.
 */
import {createHash} from 'node:crypto';
import {validateDesign,compileDesign,verifyCompiled} from './b143-building-dsl.mjs';
import {planAdaptiveSkybridge,verifyAdaptiveSkybridge,DEFAULT_ROUTE} from './b161-adaptive-skybridge.mjs';
export const SCHEMA='minecraftaibuilder-b163-portfolio-v1';
export const PROFILES=Object.freeze([
 Object.freeze({id:'compact',width:2,turnPenalty:12,title:'COMPACT — 軽量貨物通路'}),
 Object.freeze({id:'balanced',width:4,turnPenalty:12,title:'BALANCED — 標準旅客回廊'}),
 Object.freeze({id:'monumental',width:8,turnPenalty:12,title:'MONUMENTAL — 巨大幅員の空中回廊'})
]);
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const need=(v,why)=>{if(!v)throw Error('B163_'+why);};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const pts=x=>x.reduce((n,p)=>n+p.size[0]*p.size[1]*p.size[2],0);
const stableCompare=(a,b)=>a-b;
export function createCorridorPortfolio(original){
 validateDesign(original);
 need(original.designOnly===true,'MUST_BE_OFFLINE');
 const snapshot=JSON.stringify(original);
 const source=compileDesign(original);
 need(verifyCompiled(original,source)&&source.readiness==='NOT_PREPARED'&&
  source.worldContacts===0&&source.BuildPlan.operations.length===0,
  'SOURCE_IS_NOT_SAFE');
 const candidates=PROFILES.map(profile=>{
  const route={...DEFAULT_ROUTE,corridorWidth:profile.width,
   turnPenalty:profile.turnPenalty};
  const outputId='doppler-corridor-portfolio-'+profile.id;
  const variant=planAdaptiveSkybridge(original,route,{finishedId:outputId});
  need(variant.finalScene.id===outputId&&
   variant.source.sourceSha256===source.sourceSha256&&
   variant.source.geometrySha256===source.geometrySha256&&
   variant.floorRoute.targets[0].status==='PASS_FLAT_FOOTPRINT_GEOMETRY'&&
   variant.finalRoute.targets[0].status==='PASS_FLAT_FOOTPRINT_GEOMETRY'&&
   variant.report.corridorWidth===profile.width&&
   variant.report.final2x2FlatMoves>=101&&
   variant.report.centerlineSteps>=101&&
   variant.report.originalDesignUnmodified===true&&
   variant.report.constructionApproved===false&&
   variant.report.BuildPlan.operations.length===0&&
   variant.report.gates.every(g=>g==='BLOCKED'),'CANDIDATE_INVALID_'+profile.id);
  const props={
   profileId:profile.id,profileTitle:profile.title,
   corridorDesignWidth:profile.width,
   verifiedFootprintWidth:2,verifiedFootprintDepth:2,
   sourceSha256:source.sourceSha256,
   floorGeometrySha256:variant.floorScene.geometrySha256,
   finalSourceSha256:variant.finalScene.sourceSha256,
   finalGeometrySha256:variant.finalScene.geometrySha256,
   afterFinishProofSha256:variant.finalRoute.sha256,
   flatMoves:variant.report.final2x2FlatMoves,
   directionChanges:variant.report.centerlineTurns,
   corridorSections:variant.report.corridorSegments,
   grossDeckCells:pts(variant.floors),
   actuallyOccupiedCellsAdded:variant.finalScene.primitives.length-
    source.primitives.length,
   finishingElements:variant.finishing.length,
   explorationNodes:variant.report.searchExpansionCount,
   verifiedFlatWholeBody:true,
   constructionApproved:false,worldContacts:0,
   structuralStrengthCertified:false,
   railingCertified:false,playerCollisionCertified:false
  };
  need(props.actuallyOccupiedCellsAdded>0&&props.grossDeckCells>0&&
   props.finishingElements>=8&&props.corridorSections>=2&&
   props.explorationNodes>0,'NOT_NEW_ARCHITECTURE_'+profile.id);
  return {profile,variant,metrics:props};
 });
 need(JSON.stringify(original)===snapshot&&
  candidates.length===3&&
  new Set(candidates.map(x=>x.variant.finalScene.sourceSha256)).size===3&&
  new Set(candidates.map(x=>x.variant.finalScene.geometrySha256)).size===3,
  'SOURCE_MUTATED_OR_DUPLICATES');
 const metrics=candidates.map(c=>c.metrics);
 // A design Pareto-dominates another only if not worse in ALL of distance,
 // direction changes and added occupied solids, and better in at least one.
 // Width is an explicit distinct user objective and never smuggled into cost.
 const dominates=(a,b)=>a.flatMoves<=b.flatMoves&&
  a.directionChanges<=b.directionChanges&&
  a.actuallyOccupiedCellsAdded<=b.actuallyOccupiedCellsAdded&&
  (a.flatMoves<b.flatMoves||a.directionChanges<b.directionChanges||
   a.actuallyOccupiedCellsAdded<b.actuallyOccupiedCellsAdded);
 const pareto=metrics.filter(a=>!metrics.some(b=>b!==a&&dominates(b,a)))
  .map(m=>m.profileId);
 // Width is a meaningful positive objective for the broader portfolio:
 // a more spacious corridor is NOT considered dominated by a smaller one
 // solely because the smaller one has fewer occupied cells.
 const byAllFour=(a,b)=>a.flatMoves<=b.flatMoves&&
  a.directionChanges<=b.directionChanges&&
  a.actuallyOccupiedCellsAdded<=b.actuallyOccupiedCellsAdded&&
  a.corridorDesignWidth>=b.corridorDesignWidth&&
  (a.flatMoves<b.flatMoves||a.directionChanges<b.directionChanges||
   a.actuallyOccupiedCellsAdded<b.actuallyOccupiedCellsAdded||
   a.corridorDesignWidth>b.corridorDesignWidth);
 const widthAwarePareto=metrics.filter(a=>!metrics.some(b=>b!==a&&byAllFour(b,a)))
  .map(m=>m.profileId);
 const minimum=(prop)=>[...metrics].sort((a,b)=>
  stableCompare(a[prop],b[prop])||
  stableCompare(a.actuallyOccupiedCellsAdded,b.actuallyOccupiedCellsAdded)||
  a.profileId.localeCompare(b.profileId))[0].profileId;
 const maximum=(prop)=>[...metrics].sort((a,b)=>
  stableCompare(b[prop],a[prop])||a.profileId.localeCompare(b.profileId))[0].profileId;
 const bestFor={
  fewestFlatMoves:minimum('flatMoves'),
  fewestTurns:minimum('directionChanges'),
  fewestAddedSolids:minimum('actuallyOccupiedCellsAdded'),
  maximumDesignWidth:maximum('corridorDesignWidth')
 };
 const report={
  schema:SCHEMA,originalBuildingId:original.id,
  sourceSha256:source.sourceSha256,
  sourceGeometrySha256:source.geometrySha256,
  comparisonBasis:'same immutable original source, same endpoint and 2x2 clearance after decoration',
  pathQualityMetrics:['flatMoves','directionChanges','actuallyOccupiedCellsAdded'],
  corridorWidthIsDesignParameterNotPlayerWidthCertification:true,
  optionCount:candidates.length,options:metrics,
  paretoByRouteAndSolids:pareto,paretoIncludingCorridorWidth:widthAwarePareto,bestFor,
  immutableOriginal:true,independentCandidateGeometry:true,
  wholeFootprintReplayedAfterFinishing:true,
  structuralStrengthCertified:false,
  fallProtectionCertified:false,playerCollisionCertified:false,
  constructionApproved:false,worldContacts:0,worldCoordinates:null,
  readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]}
 };
 return {source,candidates,report:{...report,sha256:digest(report)}};
}
export function verifyCorridorPortfolio(original,report){
 try{
  const r=createCorridorPortfolio(original);
  return same(r.report,report)&&report.constructionApproved===false&&
   report.gates.length===9&&report.gates.every(g=>g==='BLOCKED')&&
   report.BuildPlan.operations.length===0;
 }catch{return false}
}
