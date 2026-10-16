import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SCHEMA,compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {generateRepairOptions,verifyRepairOptions} from '../source/ai/b148-repair-options.mjs';
import {readDesigns} from './build-b143-site.mjs';
import {readRevisionRequests} from './build-b144-site.mjs';
import {readContinuations} from './build-b145-site.mjs';
import {readStructuralRequests} from './build-b146-site.mjs';
import {readRepairRequest} from './build-b147-site.mjs';
import {makeB148Bundle,renderB148Html} from './build-b148-site.mjs';
const box=(id,origin,size)=>({id,shape:'box',mode:'add',material:'stone',origin,size});
const demo=()=>({
 schema:SCHEMA,id:'test-remote-studio',title:'非連結の展示台',
 brief:'自由形状の幾何学的接続案生成。施工禁止。',
 bounds:{width:30,height:30,depth:30},designOnly:true,
 elements:[box('base',[3,0,3],[8,5,8]),box('island',[3,7,3],[8,2,8])]
});
test('a detached geometric component yields two independent bounded options',()=>{
 const d=demo(),frozen=JSON.stringify(d),options=generateRepairOptions(d);
 assert.equal(verifyRepairOptions(d,options.report),true);
 assert.equal(options.report.selected,null);
 assert.equal(options.report.approved,false);
 assert.equal(options.report.options.length,2);
 assert.equal(options.report.options[0].beforeDetachedCells,128);
 assert(options.report.options.every(x=>x.afterDetachedCells===0));
 assert(options.candidates.every(x=>x.scene.worldContacts===0&&x.scene.BuildPlan.operations.length===0));
 assert.notEqual(options.candidates[0].scene.geometrySha256,options.candidates[1].scene.geometrySha256);
 assert.equal(JSON.stringify(d),frozen);
});
test('a one-cell bridge is valid for diagnosis repair, without the old 25-voxel cosmetic threshold',()=>{
 const d=demo(),out=generateRepairOptions(d),min=out.candidates[0];
 assert.equal(min.summary.localAddedElement.shape,'box');
 assert.equal(min.summary.localAddedElement.size.reduce((a,b)=>a*b,1),2);
 assert(min.summary.proposedBlockCount>=1&&min.summary.proposedBlockCount<=2);
 assert.equal(min.summary.beforeDetachedGroups,1);
 assert.equal(min.summary.afterDetachedGroups,0);
});
test('stale source, unauthorized changes and fake approval cannot enter published evidence',()=>{
 const d=demo(),out=generateRepairOptions(d);
 const forged=structuredClone(out.report);forged.options[0].constructionApproved=true;
 assert.equal(verifyRepairOptions(d,forged),false);
 const modified=structuredClone(d);modified.elements[0].origin[0]=4;
 assert.equal(verifyRepairOptions(modified,out.report),false);
 const injected=structuredClone(d);injected.worldCoordinates=[1,10,1];
 assert.throws(()=>generateRepairOptions(injected),/B143_TOP_LEVEL_UNKNOWN/);
 const connected=structuredClone(d);connected.elements.push(box('support',[4,4,4],[2,4,2]));
 assert.throws(()=>generateRepairOptions(connected),/B148_NO_DETACHED_COMPONENT/);
});
test('nine historic designs are preserved while two unapproved automatic repair options render',()=>{
 const original=readDesigns(),r2=readRevisionRequests(),r3=readContinuations(),
  r4=readStructuralRequests(),r5=readRepairRequest();
 const freeze=JSON.stringify([original,r2,r3,r4,r5]);
 const result=makeB148Bundle(original,r2,r3,r4,r5);
 assert.equal(result.gallery.scenes.length,11);
 assert.equal(result.gallery.scenes[6].repairDiagnostics.detachedCellCount,390);
 assert.equal(result.gallery.scenes[8].repairDiagnostics.detachedCellCount,0);
 assert.equal(result.gallery.scenes[9].repairDiagnostics.detachedCellCount,0);
 assert.equal(result.gallery.scenes[10].repairDiagnostics.detachedCellCount,0);
 assert.equal(result.gallery.safety.minecraftWrites,0);
 assert.equal(result.gallery.safety.original15BuildingSafetyGates,'9 BLOCKED');
 assert.equal(JSON.stringify([original,r2,r3,r4,r5]),freeze);
 assert(result.optionReport.options.every(o=>o.gates.every(g=>g==='BLOCKED')));
 const t=fs.readFileSync(new URL('../source/ai/b143-viewer-template.html',import.meta.url),'utf8');
 const html=renderB148Html(result,t);
 for(const value of ['id="markDisconnected"','minimum-face-bridge','wider-contact-patch',
  '390','NOT_PREPARED','index=6;select.value="6";setScene()'])
  if(value.includes('-bridge')||value.includes('-patch'))continue;
  else assert(html.includes(value),'Expected '+value);
 assert(html.includes('未採用')&&html.includes('候補'));
 assert(!html.includes('__B143_GALLERY_JSON__')&&!html.includes('fetch('));
});
