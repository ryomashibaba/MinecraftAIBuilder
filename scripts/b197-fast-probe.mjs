import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {buildB197,verifyB197Report} from '../source/ai/b197-grand-hollow-atria.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {compiled,design,atria,report}=buildB197();
if(!verifyB197Report(report))throw Error('B197_SOURCE_NOT_PREPARED');
fs.mkdirSync(path.join(root,'b197-evidence'),{recursive:true});
fs.writeFileSync(path.join(root,'b197-evidence/B197_GRAND_ATRIA_SOURCE_PROOF.json'),
 JSON.stringify({report,newMainDesign:design,sourceOnlyOpenGalleries:atria},null,2)+'\n');
// Design audit only: locate ACTUALLY open source 2-wide gallery stations,
// without cutting or clearing any inherited main-building blocks.
const occupancy=new Set(compiled.primitives.map(p=>p.slice(0,3).join(',')));
const open=(x,y,z)=>{
 for(let dx=0;dx<2;dx++)for(let dz=0;dz<2;dz++){
  const a=x+dx,b=z+dz;
  if(!occupancy.has([a,y-1,b].join(','))||
     occupancy.has([a,y,b].join(','))||
     occupancy.has([a,y+1,b].join(',')))return false;
 }
 return true;
};
const centers=[24,62,101],galleryAudit=[];
for(const xCenter of centers)for(const level of [33,41,49,57]){
 const best=[];
 for(let z=0;z<49;z++){
  let beginning=null;
  for(let x=xCenter-8;x<=xCenter+7;x++){
   if(open(x,level,z)){if(beginning===null)beginning=x;}
   else if(beginning!==null){
    best.push({z,startX:beginning,length:x-beginning});
    beginning=null;
   }
  }
  if(beginning!==null)best.push({z,startX:beginning,length:xCenter+8-beginning});
 }
 best.sort((a,b)=>b.length-a.length||a.z-b.z);
 galleryAudit.push({hallCenter:xCenter,standingY:level,
  bestRuns:best.slice(0,3)});
}
console.log('B197_WHOLE_DEPTH_GALLERY_SURVEY',JSON.stringify(galleryAudit));

console.log('B197_REAL_MAIN_ARCHITECTURE_PASS',JSON.stringify({
 previousOriginalMain:report.originalB188MainVoxels,
 newActualOccupiedSourceCells:report.newActualSourceOccupiedCells,
 expandedOriginalMain:report.sourceCellsAfterExpansion,
 remaining160k:report.remainingMain160kCells,
 newAuthoredArchitectureParts:report.newSourceArchitecturalParts,
 completeOriginal3HallNetwork:[report.originalSourceProtectedWaypoints,report.originalSourceProtectedNetworkEdges],
 oldOriginalInterdistrictRoutes:report.originalInterdistrictSourceSeams,
 newlyVerifiedSourceOnlyLocalGalleryEdges:report.gallerySourceOnlyHorizontalEdges,
 newIndependentBuildings:0,worldWrites:0,readiness:report.readiness}));
