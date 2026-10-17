/**
 * B164 — monumental orbital-crown architectural rework.
 * Builds actual 3D DSL elements (not a fake viewer overlay) on the B163
 * MONUMENTAL terminal: 2 vaulted glass shells, suspended interterminal
 * halo, two inhabited mezzanine levels, 8 facade fins, 4 aerial skybeams,
 * illuminated canopy, open-frame decks and high observation arches.
 *
 * All new voxels start ABOVE the validated standing/headroom cells (Y >= 21).
 * The B163 monumental route is recompiled and independently rechecked.
 * Structural strength/fall safety/player collision remain NOT CERTIFIED.
 */
import {createHash} from 'node:crypto';
import {validateDesign,compileDesign,verifyCompiled,MAX_CELLS} from './b143-building-dsl.mjs';
import {analyzeFootprint,verifyFootprint} from './b152-footprint-review.mjs';
import {createCorridorPortfolio,verifyCorridorPortfolio} from './b163-corridor-portfolio.mjs';
import {DEFAULT_ROUTE} from './b161-adaptive-skybridge.mjs';
export const SCHEMA='minecraftaibuilder-b164-orbital-crown-v1';
const box=(id,origin,size,material='metal')=>
 ({id,shape:'box',mode:'add',material,origin,size});
const ell=(id,center,radii,material='glass',shell=2)=>
 ({id,shape:'ellipsoid',mode:'add',material,center,radii,shell});
const tor=(id,center,axis,majorRadius,tubeRadius,material='accent')=>
 ({id,shape:'torus',mode:'add',material,center,axis,majorRadius,tubeRadius});
const beam=(id,start,end,thickness=1,material='metal')=>
 ({id,shape:'beam',mode:'add',material,start,end,thickness});
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const ok=(v,reason)=>{if(!v)throw Error('B164_'+reason);};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

export function orbitalCrownElements(){
 const parts=[
  // Large suspended city-scale roof geometry: not just another road.
  tor('crown-halo-main',[44,48,49],'y',29,2,'accent'),
  ell('crown-north-vault',[24,40,21],[18,9,15],'glass',2),
  ell('crown-south-vault',[69,40,79],[17,9,15],'glass',2),
  box('crown-north-roof-spine',[11,48,19],[29,2,5],'metal'),
  box('crown-south-roof-spine',[56,48,77],[27,2,5],'metal'),
  // Multi-level inhabited terminal volumes at 24–26, explicitly non-executable.
  box('crown-north-upper-mezzanine',[11,24,12],[28,2,25],'concrete'),
  box('crown-south-upper-mezzanine',[55,24,70],[28,2,22],'concrete'),
  box('crown-north-skywalk-railing-a',[11,26,12],[28,2,1],'glass'),
  box('crown-north-skywalk-railing-b',[11,26,36],[28,2,1],'glass'),
  box('crown-south-skywalk-railing-a',[55,26,70],[28,2,1],'glass'),
  box('crown-south-skywalk-railing-b',[55,26,91],[28,2,1],'glass'),
  // Façade fins highlight the shape of both major terminals.
  box('crown-north-facade-fins-west',[8,23,14],[2,18,2],'metal'),
  box('crown-north-facade-fins-east',[40,23,14],[2,18,2],'metal'),
  box('crown-north-facade-fins-rear-w',[8,23,33],[2,18,2],'metal'),
  box('crown-north-facade-fins-rear-e',[40,23,33],[2,18,2],'metal'),
  box('crown-south-facade-fins-west',[53,23,73],[2,18,2],'metal'),
  box('crown-south-facade-fins-east',[84,23,73],[2,18,2],'metal'),
  box('crown-south-facade-fins-rear-w',[53,23,89],[2,18,2],'metal'),
  box('crown-south-facade-fins-rear-e',[84,23,89],[2,18,2],'metal'),
  // Cantilevered facade wings and luminous hospitality balconies.
  box('crown-north-luminous-balcony',[11,30,7],[25,2,4],'glow'),
  box('crown-south-luminous-balcony',[57,30,91],[24,2,4],'glow'),
  box('crown-north-side-skywing',[7,34,18],[5,2,19],'accent'),
  box('crown-south-side-skywing',[82,34,72],[5,2,20],'accent'),
  box('crown-north-upper-windowband',[10,36,9],[28,2,2],'glow'),
  box('crown-south-upper-windowband',[56,36,92],[26,2,2],'glow'),
  // Floating halo / canopy is anchored by a soaring sculptural truss system.
  beam('crown-truss-nw',[20,43,25],[25,48,32],2),
  beam('crown-truss-ne',[40,42,36],[36,48,43],2),
  beam('crown-truss-sw',[53,44,67],[54,48,66],2),
  beam('crown-truss-se',[75,43,75],[69,48,69],2),
  beam('crown-aerial-spine-n',[29,43,34],[41,47,45],2,'accent'),
  beam('crown-aerial-spine-s',[49,47,56],[65,43,69],2,'accent'),
  // Interior light courts and recognizable terminal portals.
  box('crown-north-atrium-light',[14,27,20],[20,2,4],'glow'),
  box('crown-south-atrium-light',[58,27,80],[21,2,4],'glow'),
  box('crown-north-portal-tall-west',[12,26,8],[2,13,2],'glass'),
  box('crown-north-portal-tall-east',[34,26,8],[2,13,2],'glass'),
  box('crown-north-portal-top',[12,39,8],[24,2,2],'accent'),
  box('crown-south-portal-tall-west',[58,26,92],[2,13,2],'glass'),
  box('crown-south-portal-tall-east',[78,26,92],[2,13,2],'glass'),
  box('crown-south-portal-top',[58,39,92],[22,2,2],'accent'),
  // Extra ring-adjacent aviation lights, tall enough to not touch y=19/20.
  box('crown-halo-light-north',[39,51,20],[10,2,3],'glow'),
  box('crown-halo-light-south',[39,51,78],[10,2,3],'glow'),
  box('crown-halo-light-west',[14,51,45],[3,2,10],'glow'),
  box('crown-halo-light-east',[73,51,45],[3,2,10],'glow')
 ];
 return parts;
}
function spatialMetrics(source,final,parts){
 const base=new Set(source.primitives.map(p=>p[0]+','+p[1]+','+p[2]));
 const added=final.primitives.filter(p=>!base.has(p[0]+','+p[1]+','+p[2]));
 const byLayer={};
 for(const [,y,,m] of added){
  const k=Math.floor(y/5)*5;byLayer[k]=(byLayer[k]??0)+1;
 }
 const changedNearBody=added.filter(p=>p[1]<=20);
 return {
  authoredArchitecturalElements:parts.length,
  distinctNewCells:added.length,
  changedAtOrBelowBodyHeight:changedNearBody.length,
  maxHeight:Math.max(...added.map(p=>p[1])),
  minimumNewHeight:Math.min(...added.map(p=>p[1])),
  addedByHeightBand:byLayer,
  visuallyDistinctRoofCount:2,
  newMezzanineCount:2,
  newHaloCount:1,
  newFacadeFinCount:8,
  terminalSpanCells:final.bounds.maxZ-final.bounds.minZ+1
 };
}
export function createOrbitalCrown(original){
 validateDesign(original);
 const frozen=JSON.stringify(original);
 const portfolio=createCorridorPortfolio(original);
 ok(verifyCorridorPortfolio(original,portfolio.report),'BASE_PORTFOLIO_FAIL');
 const monumental=portfolio.candidates.find(x=>x.profile.id==='monumental');
 ok(monumental&&monumental.metrics.corridorDesignWidth===8&&
  monumental.metrics.flatMoves===127,'WRONG_BASELINE');
 const sourceDesign=monumental.variant.finished;
 const sourceCompiled=monumental.variant.finalScene;
 const parts=orbitalCrownElements();
 ok(new Set(parts.map(p=>p.id)).size===parts.length&&
  parts.every(p=>!sourceDesign.elements.some(e=>e.id===p.id)),
  'PART_ID_CONFLICT');
 const finished={...structuredClone(sourceDesign),
  id:'doppler-monumental-orbital-crown',
  title:'DOPPLER ORBITAL CROWN — 巨大リング空港と二層ガラス大屋根',
  brief:'幅8の壮大な高架回廊を軸とする都市級の宇宙港。浮遊する巨大光輪、北南2つの曲面ガラス大屋根、上層旅客デッキ、側翼、ファサード、宇宙航路のトラスを施工なしの3Dモデルとして増築。',
  elements:[...structuredClone(sourceDesign.elements),...parts]};
 ok(same(finished.elements.slice(0,sourceDesign.elements.length),
  sourceDesign.elements),'MUTATED_PREDECESSOR');
 validateDesign(finished);
 const compiled=compileDesign(finished);
 ok(verifyCompiled(finished,compiled)&&
  compiled.geometrySha256!==sourceCompiled.geometrySha256&&
  compiled.primitives.length<=MAX_CELLS,'INVALID_FINISHED_MODEL');
 const routeArgs={start:DEFAULT_ROUTE.start,
  destinations:[{id:'target',at:DEFAULT_ROUTE.goal}],
  width:DEFAULT_ROUTE.footprintWidth,depth:DEFAULT_ROUTE.footprintDepth,
  headroom:2};
 const route=analyzeFootprint(compiled,routeArgs);
 ok(verifyFootprint(compiled,routeArgs,route)&&
  route.targets[0].status==='PASS_FLAT_FOOTPRINT_GEOMETRY'&&
  route.targets[0].steps===monumental.metrics.flatMoves&&
  route.targets[0].path.every(p=>p[1]===DEFAULT_ROUTE.start[1]),
  'ROOF_OR_FACADE_DESTROYS_2X2_ROUTE');
 const metrics=spatialMetrics(sourceCompiled,compiled,parts);
 ok(metrics.changedAtOrBelowBodyHeight===0&&
  metrics.minimumNewHeight>=21&&metrics.distinctNewCells>1500&&
  metrics.maxHeight>=50&&
  metrics.authoredArchitecturalElements>=35&&
  JSON.stringify(original)===frozen,'NOT_A_MAJOR_SAFE_ADDITION');
 const core={schema:SCHEMA,
  buildingId:finished.id,
  sourceDesignId:sourceDesign.id,
  sourceSha256:sourceCompiled.sourceSha256,
  sourceGeometrySha256:sourceCompiled.geometrySha256,
  finishedSourceSha256:compiled.sourceSha256,
  finishedGeometrySha256:compiled.geometrySha256,
  portfolioProofSha256:portfolio.report.sha256,
  unchangedRouteSha256:route.sha256,
  existingRouteSha256:monumental.variant.finalRoute.sha256,
  flatMoves:route.targets[0].steps,stepsHaveConstantY:true,
  ...metrics,
  geometryOnly:true,structuralStrengthCertified:false,
  realPlayerCollisionCertified:false,fallProtectionCertified:false,
  constructionApproved:false,worldContacts:0,worldCoordinates:null,
  readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]}};
 return {portfolio,monumental,finished,compiled,route,parts,
  report:{...core,sha256:hash(core)}};
}
export function verifyOrbitalCrown(original,report){
 try{
  const result=createOrbitalCrown(original);
  return same(result.report,report)&&report.constructionApproved===false&&
   report.gates.length===9&&report.gates.every(x=>x==='BLOCKED')&&
   report.BuildPlan.operations.length===0;
 }catch{return false;}
}
