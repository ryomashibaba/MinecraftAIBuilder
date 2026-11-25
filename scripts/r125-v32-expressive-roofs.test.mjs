import {test} from 'node:test';
import {taperedR125RidgeHeight as height} from '../source/ai/r125-roof-profiles.mjs';
import {SCHEMA,compileArchitecturePlan,auditArchitecturePlanCirculation} from '../source/ai/r125-architecture-plan.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {auditR125SourceRoutes,auditR125VisitorRoutes} from '../source/ai/r125-source-routes.mjs';
const check=(ok,msg)=>{if(!ok)throw Error(msg)};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const policy={entrancePlacement:'source-accessible',upperDoorPlacement:'stair-clear'};
const plan=(id,w,d,axis)=>({schema:SCHEMA,id,title:'Independent roof study',
 brief:'Synthetic architectural study, not a genuine model response',
 footprint:{width:w,depth:d},levels:[{splitAxis:'z',splitPercent:50,
 spaces:[{id:'public-room',purpose:'Public gathering',access:'public'},
 {id:'work-room',purpose:'Quiet workspace',access:'shared'}]}],
 materials:{floor:'wood',wall:'stone',roof:'wood'},
 expression:{setbackSide:'none',setbackDepth:0,roofProfile:'ridge',
 roofAxis:axis,roofVolume:'raised',facadeLanguage:'plain'}});
const below=(r,y)=>r.compiled.primitives.filter(v=>v[1]<y);
const verify=(r,p)=>{
 check(verifyCompiled(r.design,r.compiled),'compiled verification');
 check(auditR125SourceRoutes(r,{featureTargets:r.fixtureTargets??[]}).status===
  'SOURCE_ROUTES_REACH_ALL_ZONES','routes');
 check(auditR125VisitorRoutes(r,p).status==='SOURCE_VISITOR_ROUTES_AVOID_STAFF','visitor routes');
 check(r.design.elements.length<=160,'element budget');
 check(r.worldWrites===0&&r.compiled.BuildPlan.operations.length===0,'no construction');
};
test('span-relative ridge symmetry, bounded slope and narrow crest',()=>{
 for(let n=3;n<=32;n++)for(const cap of [4,6]){
  const a=Array.from({length:n},(_,i)=>height(i,n,cap));
  check(a[0]===0&&a.at(-1)===0&&same(a,[...a].reverse()),'symmetric eaves');
  check(Math.max(...a)<=cap&&a.filter(x=>x===Math.max(...a)).length===(n%2?1:2),'crest');
  check(a.slice(1).every((x,i)=>Math.abs(x-a[i])<=1),'step');
 }
});
for(const n of [16,24,32])for(const axis of ['x','z'])test('tapered roof '+n+' '+axis,()=>{
 const p=plan('taper-'+n+'-'+axis,n,n,axis);
 if(n===24)p.expression.roofOverhang='one-block';
 const before=compileArchitecturePlan(p,policy),q=structuredClone(p);
 q.expression.ridgeProfile='tapered';const snapshot=JSON.stringify(q);
 const after=compileArchitecturePlan(q,policy);verify(after,q);
 check(auditArchitecturePlanCirculation(after).status==='SOURCE_CLEARANCE_PROBES_PASS','circulation');
 check(JSON.stringify(q)===snapshot,'original unchanged');
 check(same(below(before,6),below(after,6)),'lower geometry');
 check(!same(before.compiled.primitives,after.compiled.primitives),'real new geometry');
 check(after.design.elements.some(e=>e.id.startsWith('roof-tapered-riser-')),'physical roof steps');
 check(same(compileArchitecturePlan(p,policy).design,before.design),'old source stable');
});
test('two floors with setback',()=>{
 const p=plan('tapered-two-level',30,28,'z');
 p.levels.push({splitAxis:'z',splitPercent:60,spaces:[
  {id:'upper-public',purpose:'Reading room',access:'shared'},
  {id:'upper-private',purpose:'Workroom',access:'staff'}]});
 p.expression.setbackSide='east';p.expression.setbackDepth=3;
 const before=compileArchitecturePlan(p,policy),q=structuredClone(p);
 q.expression.ridgeProfile='tapered';const after=compileArchitecturePlan(q,policy);
 verify(after,q);check(same(below(before,11),below(after,11)),'lower geometry');
 check(auditArchitecturePlanCirculation(after).status==='SOURCE_CLEARANCE_PROBES_PASS','stairs');
});
for(const axis of ['x','z'])test('spatial gable '+axis+' with connected volumes and fixtures',()=>{
 const p=plan('gable-spatial-'+axis,30,26,axis);delete p.expression;
 p.levels=[{layoutMode:'spatial-tree',spaces:[
  {id:'root-room',purpose:'Public gathering',access:'public',fixtures:['seating'],
   volume:{width:14,depth:10,roofY:8,roofForm:'ridge',roofAxis:axis}},
  {id:'wing-room',purpose:'Private work',access:'staff',fixtures:['desk'],
   volume:{width:9,depth:8,roofY:6,roofForm:'shed',roofAxis:'z',
    attach:{to:'root-room',side:'east',shift:0}}}
 ]}];
 const before=compileArchitecturePlan(p),q=structuredClone(p);
 q.levels[0].spaces[0].volume.roofForm='gable';const snapshot=JSON.stringify(q);
 const after=compileArchitecturePlan(q);verify(after,q);
 check(JSON.stringify(q)===snapshot,'original unchanged');
 check(!same(before.compiled.primitives,after.compiled.primitives),'real new geometry');
 check(after.fixtureTargets.length===2,'both fixtures retained');
 check(after.design.elements.some(e=>e.id.startsWith('space-0-gable-riser-')),'physical step');
 check(after.design.bounds.width===before.design.bounds.width&&after.design.bounds.depth===before.design.bounds.depth,'site unchanged');
});
test('invalid tapered roof combinations rejected',()=>{
 for(const kind of ['flat','corner']){
  const p=plan('invalid-'+kind,24,24,'z');p.expression.ridgeProfile='tapered';
  if(kind==='flat'){p.expression.roofProfile='flat';delete p.expression.roofVolume;}
  else p.expression.rearCornerCut={width:4,depth:4,side:'east',access:'paved'};
  let rejected=false;try{compileArchitecturePlan(p)}catch{rejected=true}
  check(rejected,kind+' rejected');
 }
});
