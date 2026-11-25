import {test} from 'node:test';
import {SCHEMA,compileArchitecturePlan,auditArchitecturePlanCirculation} from '../source/ai/r125-architecture-plan.mjs';
import {verifyCompiled,MATERIALS} from '../source/ai/b143-building-dsl.mjs';
import {auditR125FixtureDaylightView} from '../source/ai/r125-room-fixtures.mjs';
import {auditR125SourceRoutes,auditR125VisitorRoutes} from '../source/ai/r125-source-routes.mjs';
const check=(ok,msg)=>{if(!ok)throw Error(msg)};
const shell=(id,axis)=>({schema:SCHEMA,id,title:'View-oriented building study',
 brief:'Synthetic daylight design, not a genuine model response',
 footprint:{width:26,depth:26},levels:[{splitAxis:axis,splitPercent:50,
 spaces:[{id:'public-room',purpose:'Public gathering and reading',access:'public'},
 {id:'work-room',purpose:'Private work',access:'staff'}]}],
 materials:{floor:'wood',wall:'stone',roof:'wood'},
 expression:{setbackSide:'none',setbackDepth:0,roofProfile:'ridge',
 roofAxis:axis,roofVolume:'raised',ridgeProfile:'tapered',facadeLanguage:'plain'}});
const verify=(r,p)=>{
 check(verifyCompiled(r.design,r.compiled),'SOURCE');
 const t=r.daylightTargets.find(t=>t.kind==='panorama');
 check(t&&t.size[1]===2&&Math.max(t.size[0],t.size[2])===8,'exact panoramic aperture');
 const cell=new Map(r.compiled.primitives.map(v=>[v.slice(0,3).join(','),v[3]]));
 const [x,y,z]=t.origin,alongX=t.face==='front'||t.face==='rear';
 const dx=t.face==='east'?-1:t.face==='west'?1:0;
 const dz=t.face==='front'?1:t.face==='rear'?-1:0;
 const at=(x,y,z)=>cell.get([x,y,z].join(','));
 for(let i=0;i<8;i++)for(let h=0;h<2;h++){
  const xx=x+(alongX?i:0),zz=z+(alongX?0:i);
  check(at(xx,y+h,zz)===MATERIALS.indexOf('glass'),'real glass');
  check(at(xx-dx,y+h,zz-dz)===undefined,'exterior air');
 }
 check(auditR125FixtureDaylightView(r.compiled,r.daylightTargets).status==='DAYLIGHT_VIEW_CLEAR','interior view');
 check(auditR125SourceRoutes(r,{featureTargets:r.fixtureTargets}).status==='SOURCE_ROUTES_REACH_ALL_ZONES','routes');
 check(auditR125VisitorRoutes(r,p).status==='SOURCE_VISITOR_ROUTES_AVOID_STAFF','visitor privacy');
 check(r.worldWrites===0&&r.compiled.BuildPlan.operations.length===0,'no world');
};
for(const axis of ['x','z'])test('panorama conventional '+axis,()=>{
 const p=shell('panorama-'+axis,axis);p.levels[0].spaces[0].daylight='panorama';
 p.levels[0].spaces[0].fixtures=['seating'];
 p.levels[0].spaces[1].fixtures=['desk'];
 if(axis==='x')p.entryZone='first';
 const snapshot=JSON.stringify(p),r=compileArchitecturePlan(p,{entrancePlacement:'source-accessible'});
 verify(r,p);check(JSON.stringify(p)===snapshot,'immutable');
 check(auditArchitecturePlanCirculation(r).status==='SOURCE_CLEARANCE_PROBES_PASS','circulation');
 check(r.fixtureTargets.length===2,'fixtures');
});
const tree=axis=>{const p=shell('panoramic-tree-'+axis,axis);delete p.expression;
 p.footprint={width:30,depth:28};
 p.levels=[{layoutMode:'spatial-tree',spaces:[
  {id:'view-room',purpose:'Public reading and views',access:'public',fixtures:['seating'],
   daylight:'panorama',volume:{width:14,depth:12,roofY:8,roofForm:'gable',roofAxis:axis}},
  {id:'office-room',purpose:'Private work',access:'staff',fixtures:['desk'],
   volume:{width:8,depth:8,roofY:6,roofForm:'shed',roofAxis:'z',
    attach:{to:'view-room',side:'east',shift:0}}}
 ]}];return p;};
for(const axis of ['x','z'])test('panorama spatial '+axis,()=>{
 const p=tree(axis),snapshot=JSON.stringify(p),r=compileArchitecturePlan(p);
 verify(r,p);check(JSON.stringify(p)===snapshot,'immutable');
 check(r.fixtureTargets.length===2,'fixtures');
});
test('panorama refuses physically short exposed faces, without a smaller substitute',()=>{
 const p=tree('x');p.levels[0].spaces[0].volume.width=10;
 p.levels[0].spaces[0].volume.depth=10;
 let e='';try{compileArchitecturePlan(p)}catch(error){e=String(error)}
 check(e.includes('DAYLIGHT_OPENING_UNAVAILABLE_view-room'),'exact size HOLD');
});
test('panoramic fixture audit retains four contiguous clear columns',()=>{
 const target={zoneId:'view-room',kind:'panorama',face:'rear',origin:[2,3,10],size:[8,2,1]};
 const blocked={primitives:[[5,3,9,1],[8,3,9,1]]};
 const result=auditR125FixtureDaylightView(blocked,[target]);
 check(result.status==='DAYLIGHT_VIEW_HOLD'&&result.blocked[0].requiredContiguousColumns===4,'panorama blocked');
 check(auditR125FixtureDaylightView(blocked,[{...target,kind:'wide-bay'}]).status==='DAYLIGHT_VIEW_CLEAR','legacy threshold unchanged');
});
