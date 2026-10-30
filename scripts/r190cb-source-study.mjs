/** R190-CB genuine voxels, 3D viewer and eight camera evidence.
 * Original CB/CA source is immutable. Absolutely no model/network/world contact.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {compileR190CB} from '../source/ai/r190cb-architectural-circulation.mjs';
import {surfaceOnly,renderB143Html} from './b143-gallery-core.mjs';
import {elevationR190BZ,perspectiveR190BZ} from './r190bz-open-shell-study.mjs';
const ROOT=fileURLToPath(new URL('../',import.meta.url));
const BM='bbd44cc9f28234055601b4055466e2f3564e7e4565d408432de4c4fab0aa277a';
const digest=x=>createHash('sha256').update(x).digest('hex');
const J=x=>JSON.stringify(x,null,2)+'\n';
export function studyR190CB(out){
 if(typeof out!=='string'||!out||fs.existsSync(out))throw Error('R190CB_BAD_OUTPUT');
 const raw=fs.readFileSync(path.join(ROOT,'evidence/r190cb/RIFT_LANTERN.json'));
 if(digest(fs.readFileSync(path.join(ROOT,'evidence/r190bm/USER_BRIEF.txt')))!==BM)
  throw Error('R190CB_FROZEN_BRIEF_CHANGED');
 const p=JSON.parse(raw),c=compileR190CB(raw);
 if(c.originalRawSha256!==digest(raw)||c.worldContacts!==0||
    c.worldWrites!==0||c.metrics.protectedVoidResults.some(v=>!v.pass))throw Error('R190CB_SAFETY');
 fs.mkdirSync(out,{recursive:false});
 fs.writeFileSync(path.join(out,'ORIGINAL.json'),raw,{flag:'wx'});
 fs.writeFileSync(path.join(out,'ALL_VOXELS.json'),J({schema:c.schema,
  originalRawSha256:c.originalRawSha256,sourceGeometrySha256:c.sourceGeometrySha256,
  geometrySha256:c.geometrySha256,primitives:c.primitives}),{flag:'wx'});
 const surf=surfaceOnly({primitives:c.primitives}),v=c.primitives,mn=[Infinity,Infinity,Infinity],mx=[-1,-1,-1];
 for(const q of v)for(let i=0;i<3;i++){mn[i]=Math.min(mn[i],q[i]);mx[i]=Math.max(mx[i],q[i]);}
 const scene={id:p.id,title:p.title,brief:'Chat-authored architectural+circulation SOURCE, not functionality or ART certified',
 typology:'inhabited-asymmetric-monolith-with-explicit-switchback',
 levels:Math.floor(mx[1]/5)+1,
 layerNames:c.materialNames.map(x=>'CB_'+x.toUpperCase()),surface:surf,
 bounds:{minX:mn[0],minY:mn[1],minZ:mn[2],maxX:mx[0],maxY:mx[1],maxZ:mx[2]},
 sourceSha256:c.sourceSha256,geometrySha256:c.geometrySha256,
 stats:{voxels:v.length,renderedSurfaceCells:surf.length,conceptRooms:0,
 actualPlayerMovement:'NOT_CERTIFIED',structuralSafety:'NOT_CERTIFIED'},
 targetEdition:'MINECRAFT_EDUCATION',readiness:'NOT_PREPARED',worldContacts:0,
 worldCoordinates:null,designOnly:true,BuildPlan:{operations:[]}};
 const template=fs.readFileSync(path.join(ROOT,'source/ai/b143-viewer-template.html'),'utf8');
 const viewer={schema:'minecraftaibuilder-b143-gallery-v1',edition:'MINECRAFT_EDUCATION',
  sourceHashes:[c.sourceSha256],geometryHashes:[c.geometrySha256],scenes:[scene],
  safety:{constructionApproved:false,executionAllowed:false,readiness:'NOT_PREPARED',
   worldCoordinates:null,worldContacts:0,BuildPlan:{operations:[]},
   original15BuildingSafetyGates:'9 BLOCKED',minecraftWrites:0}};
 fs.writeFileSync(path.join(out,'VIEWER_3D.html'),renderB143Html(viewer,template),{flag:'wx'});
 const views=['front','rear','west','east','roof','oblique','ground','canyon'];
 for(const side of views)fs.writeFileSync(path.join(out,'VIEW_'+side+'.svg'),
   ['front','rear','west','east','roof'].includes(side)?
    elevationR190BZ(c,side):perspectiveR190BZ(c,side),{flag:'wx'});
 const report={schema:'minecraftaibuilder-r190cb-open-author-route-audit-v1',
  originalRawSha256:c.originalRawSha256,geometrySha256:c.geometrySha256,
  originalBMBriefSha256:BM,authorship:c.authorship,
  technicalState:'AUTHOR_CIRCULATION_VOXELS_CREATED',
  artGate:'ART_HOLD',functionGate:'HOLD_STAIR_PROXY_ONLY_REAL_GAMEPLAY_UNTESTED',
  structuralGate:'NOT_TESTED',traversability:'NOT_CERTIFIED',
  metrics:c.metrics,actualVoxelViews:views,preExistingSourcesUnmodified:true,
  readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
  worldContacts:0,worldWrites:0,modelCalls:0,networkRequests:0,
  officialArtAdoptions:0};
 fs.writeFileSync(path.join(out,'AUDIT.json'),J(report),{flag:'wx'});
 fs.writeFileSync(path.join(out,'INDEX.html'),'<!doctype html><html lang="ja"><meta charset="utf-8"><h1>R190-CB author explicit circulation</h1><p>All evidence SOURCE-only; ART, actual routes and construction not certified.</p><ul>'+
  views.map(x=>'<li><a href="VIEW_'+x+'.svg">'+x+'</a></li>').join('')+
  '</ul><p><a href="VIEWER_3D.html">View true 3D</a></p><a href="AUDIT.json">Raw spatial metrics</a></html>',{flag:'wx'});
 return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==4||process.argv[2]!=='--out')throw Error('R190CB_CLI');
  const r=studyR190CB(process.argv[3]);
  console.log(J({state:r.technicalState,raw:r.originalRawSha256,geometry:r.geometrySha256,
   voxelCount:r.metrics.finalVoxels,authorNodes:r.metrics.authoredNodeCount,
   programs:r.metrics.programMetrics,worldWrites:r.worldWrites}));
 }catch(e){console.error(e.stack??String(e));process.exitCode=1;}
}
