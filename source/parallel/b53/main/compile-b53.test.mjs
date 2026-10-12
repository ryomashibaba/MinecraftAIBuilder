import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {buildB52FromSource} from '../../b52/main/run-b52.mjs';
import {buildB53FromSource} from './run-b53.mjs';
import {compileB53,verifyB53} from './compile-b53.mjs';
import {renderB53} from './render-b53.mjs';
const upstream=buildB52FromSource();
const {report,b52,b51,b50,b49,b48,b47,b46,b45,structure,main,evidence}=buildB53FromSource();
const args=[b52,b51,b50,b49,b48,b47,b46,b45,structure,main,evidence];
const copy=x=>structuredClone(x);
const fail=(x,err)=>assert.throws(x,err);
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
test('5 buildings, 30 levels and all 3,022 graphic markers in full',()=>{
 assert.equal(report.totals.buildings,5);assert.equal(report.totals.levels,30);
 assert.equal(report.totals.facadeVisualEdges,3022);assert.equal(report.totals.designVariants,15);
});
test('cell totals agree with immutable B48 floor and roof surfaces',()=>{
 assert.equal(report.totals.floorCells,b48.totals.floorCells);assert.equal(report.totals.roofCells,b48.totals.roofCells);
});
test('B52 portfolio produced from pinned source exactly matches saved report',()=>{
 assert.deepEqual(b52,upstream.report);
});
test('building ID, programs, dimensions and order are preserved',()=>{
 for(let i=0;i<5;i++){
  assert.equal(report.buildings[i].id,b48.buildings[i].id);
  assert.equal(report.buildings[i].program,b52.buildings[i].program);
  assert.equal(report.buildings[i].localSite.width,b48.buildings[i].selection.site.width);
  assert.equal(report.buildings[i].localSite.depth,b48.buildings[i].selection.site.depth);
 }
});
test('all floor masks are immutable canonical rectangle clones',()=>{
 for(let i=0;i<5;i++)for(let j=0;j<6;j++){
  const a=report.buildings[i].floorPlans[j],b=b48.buildings[i].levels[j];
  assert.deepEqual(a.floor,b.canonical.floorRectangles);
  assert.deepEqual(a.roof,b.canonical.roofRectangles);
 }
});
test('six floors per building with safe local extents',()=>{
 for(const b of report.buildings){assert.equal(b.floorPlans.length,6);
  for(const f of b.floorPlans){assert.equal(f.siteLocalWidth,b.localSite.width);assert.equal(f.siteLocalDepth,b.localSite.depth);}
 }
});
test('all original facade columns match B51 segmentation exactly',()=>{
 for(let i=0;i<5;i++){
  const b=report.buildings[i],m=b.facade.strips.flatMap(s=>s.columns.map(c=>[`${s.face}/${s.fixed}/${c.localT}`,c]));
  const map=new Map(m);assert.equal(map.size,b51.buildings[i].facadeRhythm.localColumns);
  for(const source of b51.buildings[i].facadeRhythm.columnStacks){
   const got=map.get(source.localWallColumn);assert.ok(got);
   const expected=Array(6).fill(null);for(const segment of source.segments)
    for(let k=segment.from;k<=segment.to;k++)expected[k-1]=segment.role;
   assert.deepEqual(got.original,expected);
  }
 }
});
test('facade source count per floor matches canonical geometry',()=>{
 for(let i=0;i<5;i++)for(let k=0;k<6;k++)assert.equal(
  report.buildings[i].facade.sourceFloorVisualUnits[k],b48.buildings[i].levels[k].geometry.facadeEdgeUnits);
});
test('original adjacent display changes reproduce B51, total 1,807',()=>{
 assert.equal(report.totals.originalGraphicTransitions,1807);
 for(let i=0;i<5;i++)assert.equal(report.buildings[i].facade.originalGraphicTransitions,b51.buildings[i].facadeRhythm.changedGraphicAdjacentPairs);
});
test('suggested overlay never inserts or deletes a facade edge',()=>{
 for(const b of report.buildings)for(const s of b.facade.strips)for(const c of s.columns){
  for(let i=0;i<6;i++)assert.equal(c.original[i]===null,c.overlay[i]===null);
 }
});
test('suggested overlay never changes edge geometry classification',()=>{
 for(const b of report.buildings)for(const s of b.facade.strips)for(const c of s.columns)
  assert.equal(c.edgeClasses.length,6);
});
test('suggested edits occur exclusively at isolated original graphic-role flips',()=>{
 let seen=0;
 for(const b of report.buildings)for(const s of b.facade.strips)for(const c of s.columns){
  let last=-100;
  for(let i=0;i<6;i++)if(c.original[i]!==c.overlay[i]){
   assert.ok(i>0&&i<5);assert.ok(i-last>=2);
   assert.equal(c.original[i-1],c.original[i+1]);
   assert.equal(c.edgeClasses[i-1],c.edgeClasses[i]);
   assert.equal(c.edgeClasses[i],c.edgeClasses[i+1]);
   assert.equal(c.overlay[i],c.original[i-1]);last=i;seen++;
  }
 }
 assert.equal(seen,report.totals.isolatedGraphicCellsSuggested);
});
test('preview transitions improve by precisely 2 per isolated edited marker',()=>{
 assert.equal(report.totals.previewGraphicTransitions,
  report.totals.originalGraphicTransitions-2*report.totals.isolatedGraphicCellsSuggested);
});
test('every profile is preserved with no approval',()=>{
 for(let i=0;i<5;i++)for(let j=0;j<3;j++){
  const a=report.buildings[i].variants[j],b=b52.buildings[i].variants[j];
  assert.equal(a.profile,b.profile);assert.equal(a.entry.start,b.entry.start);
  assert.equal(a.entry.endInclusive,b.entry.endInclusive);
  assert.equal(a.rooftop.x,b.roof.x);assert.equal(a.rooftop.z,b.roof.z);
  assert.equal(a.approved,false);
 }
});
test('review plans include only local axes, not world transforms',()=>{
 assert.equal(report.worldCoordinates,null);assert.deepEqual(report.materialIds,[]);
 assert.ok(report.warnings.includes('LOCAL_NOT_WORLD_COORDINATES'));
});
test('M4 all nine gates BLOCKED and NOT_PREPARED',()=>{
 assert.equal(report.readiness,'NOT_PREPARED');assert.equal(report.blockers.M4Gates.length,9);
 for(const g of report.blockers.M4Gates)assert.equal(g.status,'BLOCKED');
});
test('no operations, no commands, no scans, no runtime calls',()=>{
 assert.deepEqual(report.BuildPlan.operations,[]);assert.equal(report.BuildPlan.commandCount,0);
 for(const k of ['engineCalls','minecraftCommands','scans','buildOperations'])assert.equal(report[k],0);
});
test('actual geometry and production parity remain unknown/unverified',()=>{
 assert.equal(report.provenance.productionParity,'UNVERIFIED');
 for(const b of report.buildings){assert.equal(b.actualFacadeGeometry,false);
  assert.equal(b.designApproved,false);assert.equal(b.productionPlannerParity,'UNVERIFIED');}
});
test('B53 report can be independently replay verified',()=>assert.equal(verifyB53(report,...args),true));
test('B53 whole report SHA256 matches body',()=>{
 const {reportSha256,...body}=report;assert.equal(reportSha256,sha(body));
});
test('B53 reproducible build equals checked-in report',()=>{
 const saved=JSON.parse(fs.readFileSync(new URL('./B53_VISUAL_REVIEW.json',import.meta.url)));
 assert.deepEqual(report,saved);
});
test('B53 stand-alone HTML matches renderer byte-for-byte',()=>{
 const saved=fs.readFileSync(new URL('./B53_VISUAL_REVIEW.html',import.meta.url),'utf8');
 assert.equal(renderB53(report),saved);
});
test('HTML viewer embeds data, CSS, all selection controls, no external assets',()=>{
 const html=renderB53(report);
 for(const marker of ['offline-data','id="plan"','id="elevation"','id="building"','id="profile"','id="floor"','id="strip"','id="overlay"'])assert.ok(html.includes(marker));
 assert.doesNotMatch(html,/<script\s+src=|<link\s+[^>]*href=|<iframe|<img\s+[^>]*src=|https?:\/\//i);
});
test('HTML payload is protected against closing script tag injection',()=>{
 const bad=copy(report);bad.warnings.push('</script><img src=x onerror=alert(1)>');
 const html=renderB53(bad);
 assert.ok(html.includes('\\u003c/script\\u003e'));assert.ok(!html.includes('<img src=x'));
});
test('reject source B52 altered building candidate before compiling',()=>{
 const bad=copy(b52);bad.buildings[0].variants[0].roof.x++;
 fail(()=>compileB53(bad,...args.slice(1)),/B52_/);
});
test('reject altered upstream local floor rectangle',()=>{
 const bad=copy(b48);bad.buildings[0].levels[0].canonical.floorRectangles[0].width++;
 fail(()=>compileB53(b52,b51,b50,b49,bad,...args.slice(5)),/B48_|B49_|B50_|B51_|B52_/);
});
test('reject altered B51 facade role',()=>{
 const bad=copy(b51);bad.buildings[0].facadeRhythm.columnStacks[0].segments[0].role='DOOR';
 fail(()=>compileB53(b52,bad,...args.slice(2)),/B51_|B52_/);
});
test('reject report digest tampering',()=>{
 const bad=copy(report);bad.buildings[0].floorPlans[0].floor[0].width++;
 fail(()=>verifyB53(bad,...args),/B53_REPORT_SHA|B53_REPLAY/);
});
test('reject safety readyness tampering',()=>{
 const bad=copy(report);bad.readiness='PREPARED';
 fail(()=>verifyB53(bad,...args),/B53_UNSAFE_REPORT|B50_/);
});
test('reject any approval flag',()=>{
 const bad=copy(report);bad.buildings[0].variants[0].approved=true;
 fail(()=>verifyB53(bad,...args),/B53_UNSAFE_REPORT/);
});
test('reject expanded build plan even if digest recalculated',()=>{
 const bad=copy(report);bad.BuildPlan.operations.push({type:'place'});
 const {reportSha256,...body}=bad;bad.reportSha256=sha(body);
 fail(()=>verifyB53(bad,...args),/B50_|B53_UNSAFE_REPORT/);
});
test('HTML renderer rejects deployment enablement',()=>{
 const bad=copy(report);bad.executionAllowed=true;
 fail(()=>renderB53(bad),/B53_HTML_UNSAFE_INPUT/);
});
test('input compiler does not mutate source reports',()=>{
 const before=args.map(sha);compileB53(...args);assert.deepEqual(args.map(sha),before);
});
