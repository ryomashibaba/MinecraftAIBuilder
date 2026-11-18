/**
 * MAB V11: true B143 SOURCE -> PNG, no browser, model or Minecraft calls.
 * node scripts/r125-static-art-review.mjs --source PRIVATE/B143_SOURCE_REVIEW_ONLY.json --out NEW_PRIVATE_DIRECTORY
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {deflateSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {compileDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';

const digest=x=>createHash('sha256').update(x).digest('hex');
const refuse=id=>{throw Error('R125_STATIC_REVIEW_'+id)};
const palette=[[117,129,143],[178,186,194],[102,127,153],
 [99,187,207],[180,142,100],[237,206,114],[226,137,99]];
const signature=Buffer.from([137,80,78,71,13,10,26,10]);
const crcTable=Uint32Array.from({length:256},(_,i)=>{
 let c=i;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;
 return c>>>0;
});
function chunk(name,bytes){
 const type=Buffer.from(name,'ascii'),length=Buffer.alloc(4),crc=Buffer.alloc(4);
 length.writeUInt32BE(bytes.length);
 let c=0xffffffff;
 for(const b of type)c=crcTable[(c^b)&255]^(c>>>8);
 for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);
 crc.writeUInt32BE((c^0xffffffff)>>>0);
 return Buffer.concat([length,type,bytes,crc]);
}
function png(width,height,rgb){
 const scan=Buffer.alloc(height*(1+width*3));
 for(let y=0;y<height;y++)
  rgb.copy(scan,y*(1+3*width)+1,y*width*3,(y+1)*width*3);
 const hdr=Buffer.alloc(13);
 hdr.writeUInt32BE(width,0);hdr.writeUInt32BE(height,4);
 hdr[8]=8;hdr[9]=2;
 return Buffer.concat([signature,chunk('IHDR',hdr),
  chunk('IDAT',deflateSync(scan,{level:7})),chunk('IEND',Buffer.alloc(0))]);
}
function fillPolygon(buf,width,height,pts,color){
 const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);
 const x0=Math.max(0,Math.floor(Math.min(...xs)));
 const x1=Math.min(width-1,Math.ceil(Math.max(...xs)));
 const y0=Math.max(0,Math.floor(Math.min(...ys)));
 const y1=Math.min(height-1,Math.ceil(Math.max(...ys)));
 if(x0>x1||y0>y1)return;
 for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
  const px=x+0.5,py=y+0.5;let sign=0,inside=true;
  for(let i=0;i<4;i++){
   const a=pts[i],b=pts[(i+1)%4];
   const cross=(b[0]-a[0])*(py-a[1])-(b[1]-a[1])*(px-a[0]);
   if(Math.abs(cross)<1e-8)continue;
   if(!sign)sign=Math.sign(cross);
   else if(sign*cross<0){inside=false;break;}
  }
  if(inside){const at=(y*width+x)*3;
   buf[at]=color[0];buf[at+1]=color[1];buf[at+2]=color[2];}
 }
}
const shade=(material,face)=>(palette[material]??palette[0])
 .map(v=>Math.min(255,Math.round(v*(face==='top'?1.13:face==='x'?0.82:0.95))));
/** Render exact final voxel colors as semantic proxy, not a Minecraft screenshot.
 * Ground-floor cutaway HIDES source voxels; it NEVER adds or repairs blocks.
 */
export function renderB143StaticPNG(compiled,{sx=1,sz=-1,
 cutAboveY=null,width=1200,height=760,includeRgb=false,
 fitReference=null}={}){
 if(![1,-1].includes(sx)||![1,-1].includes(sz)||
    !Number.isSafeInteger(width)||width<320||width>2600||
    !Number.isSafeInteger(height)||height<220||height>2000||
    (cutAboveY!==null&&(!Number.isSafeInteger(cutAboveY)||cutAboveY<1)))
  refuse('INVALID_CAMERA');
 if(!Array.isArray(compiled?.primitives)||compiled.primitives.length<1||
    compiled.primitives.length>160000)refuse('INVALID_SCENE');
 if(fitReference!==null&&(!Array.isArray(fitReference?.primitives)||
     fitReference.primitives.length<1||fitReference.primitives.length>160000))
  refuse('INVALID_FIT_REFERENCE');
 const vox=compiled.primitives.filter(v=>cutAboveY===null||v[1]<cutAboveY);
 if(!vox.length)refuse('CUTAWAY_EMPTY');
 const occ=new Set(vox.map(v=>v[0]+','+v[1]+','+v[2]));
 const ordered=[...vox].sort((a,b)=>
  (sx*a[0]+sz*a[2]+1.2*a[1])-(sx*b[0]+sz*b[2]+1.2*b[1])||
  a[1]-b[1]||a[2]-b[2]||a[0]-b[0]);
 const xy=([x,y,z])=>[(sz*x-sx*z)*0.866,(sx*x+sz*z)*0.5-y*1.2];
 // Fit camera to both SOURCEs but render ONLY voxels from this SOURCE.
 const reference=fitReference===null?[]:fitReference.primitives.filter(v=>
  cutAboveY===null||v[1]<cutAboveY);
 const corners=[];
 for(const [x,y,z] of [...vox,...reference]){
  corners.push(xy([x,y,z]),xy([x+1,y+1,z+1]));
 }
 for(const bb of [compiled.bounds,fitReference?.bounds]){
  if(!bb)continue;
  for(const x of [bb.minX,bb.maxX+1])
   for(const y of [bb.minY,bb.maxY+1])
    for(const z of [bb.minZ,bb.maxZ+1])
     if(cutAboveY===null||y<=cutAboveY)corners.push(xy([x,y,z]));
 }
 let loX=Infinity,hiX=-Infinity,loY=Infinity,hiY=-Infinity;
 for(const [px,py] of corners){
  loX=Math.min(loX,px);hiX=Math.max(hiX,px);
  loY=Math.min(loY,py);hiY=Math.max(hiY,py);
 }
 const scale=Math.min((width-90)/Math.max(1,hiX-loX),
  (height-90)/Math.max(1,hiY-loY));
 const offsetX=width/2-(hiX+loX)*scale/2;
 const offsetY=height/2-(hiY+loY)*scale/2;
 const project=p=>{const v=xy(p);return [v[0]*scale+offsetX,v[1]*scale+offsetY];};
 const buf=Buffer.alloc(width*height*3);
 for(let i=0;i<buf.length;i+=3){buf[i]=239;buf[i+1]=245;buf[i+2]=250;}
 let faces=0;
 for(const [x,y,z,m] of ordered){
  const paint=(face,pts)=>{
   fillPolygon(buf,width,height,pts.map(project),shade(m,face));faces++;
  };
  if(!occ.has(x+','+(y+1)+','+z))
   paint('top',[[x,y+1,z],[x+1,y+1,z],[x+1,y+1,z+1],[x,y+1,z+1]]);
  if(!occ.has((x+sx)+','+y+','+z)){
   const a=x+(sx===1?1:0);
   paint('x',[[a,y,z],[a,y+1,z],[a,y+1,z+1],[a,y,z+1]]);
  }
  if(!occ.has(x+','+y+','+(z+sz))){
   const a=z+(sz===1?1:0);
   paint('z',[[x,y,a],[x+1,y,a],[x+1,y+1,a],[x,y+1,a]]);
  }
 }
 return {bytes:png(width,height,buf),renderedFaces:faces,
  ...(includeRgb?{rgb:buf,width,height}:{}),
  originalSourceCells:compiled.primitives.length,renderedCells:vox.length,
  hiddenAboveY:cutAboveY,viewDirection:{x:sx,z:sz},
  cameraScalePxPerUnit:scale,cameraOffsetPx:[offsetX,offsetY],
  cameraFrame:fitReference?'PAIRED_UNION':'SINGLE_SCENE',
  status:'ORTHOGRAPHIC_REVIEW_PROXY_NOT_MINECRAFT_SCREENSHOT'};
}
/**
 * Four SOURCE-matched reviews in ONE image. No new solids, re-design,
 * browser, AI, external image packages, or Minecraft calls.
 *
 * Reading order: front-left, front-right, rear-right, ground-floor cutaway.
 * Insets are the exact RGB buffers used for the individual four PNGs.
 */
export function makeB143ContactSheet(pics){
 if(!Array.isArray(pics)||pics.length!==4||
  pics.some(p=>p?.render?.width!==1200||p?.render?.height!==760||
   !Buffer.isBuffer(p.render.rgb)||p.render.rgb.length!==1200*760*3))
  refuse('CONTACT_SHEET_REQUIRES_FOUR_MATCHED_RGB_VIEWS');
 const tileW=1200,tileH=760,gutter=16;
 const width=tileW*2+gutter,height=tileH*2+gutter;
 const rgb=Buffer.alloc(width*height*3,229);
 for(let i=0;i<4;i++){
  const col=i%2,row=Math.floor(i/2),src=pics[i].render.rgb;
  for(let y=0;y<tileH;y++){
   const target=((row*(tileH+gutter)+y)*width+
    col*(tileW+gutter))*3;
   src.copy(rgb,target,y*tileW*3,(y+1)*tileW*3);
  }
 }
 return {bytes:png(width,height,rgb),width,height,
  order:pics.map(x=>x.name)};
}
/**
 * Same-brief A/B: OLD on left, NEW on right at the same four camera angles.
 * Opt-in matched-camera framing gives each A/B pair the same pixels/block.
 */
export function makeB143ABSheet(oldViews,newViews,{matchedCamera=false}={}){
 const expected=['EXTERIOR_FRONT_LEFT.png','EXTERIOR_FRONT_RIGHT.png',
  'EXTERIOR_REAR_RIGHT.png','GROUND_FLOOR_CUTAWAY.png'];
 if(!Array.isArray(oldViews)||!Array.isArray(newViews)||
    oldViews.length!==4||newViews.length!==4)
  refuse('AB_FOUR_VIEWS_REQUIRED');
 const all=[oldViews,newViews];
 if(all.some(views=>views.some((p,i)=>p.name!==expected[i]||
  p.render?.width!==1200||p.render?.height!==760||
  !Buffer.isBuffer(p.render.rgb)||p.render.rgb.length!==1200*760*3)))
  refuse('AB_VIEWS_MISMATCH');
 if(typeof matchedCamera!=='boolean')refuse('AB_CAMERA_POLICY');
 if(matchedCamera)for(let i=0;i<4;i++){
  const a=oldViews[i].render,b=newViews[i].render;
  if(a.cameraFrame!=='PAIRED_UNION'||b.cameraFrame!=='PAIRED_UNION'||
     Math.abs(a.cameraScalePxPerUnit-b.cameraScalePxPerUnit)>1e-9||
     a.cameraOffsetPx.some((v,j)=>Math.abs(v-b.cameraOffsetPx[j])>1e-9))
   refuse('AB_CAMERA_NOT_PHYSICALLY_MATCHED');
 }
 const tileW=1200,tileH=760,gap=16,width=tileW*2+gap,
  height=tileH*4+gap*3;
 const rgb=Buffer.alloc(width*height*3,226);
 for(let row=0;row<4;row++)for(let col=0;col<2;col++){
  const src=all[col][row].render.rgb;
  for(let y=0;y<tileH;y++){
   const at=((row*(tileH+gap)+y)*width+col*(tileW+gap))*3;
   src.copy(rgb,at,y*tileW*3,(y+1)*tileW*3);
  }
 }
 return {bytes:png(width,height,rgb),width,height,
  rowOrder:expected,columnOrder:['OLD','NEW'],
  physicalScale:matchedCamera?'PAIRED_SAME_PIXELS_PER_BLOCK_AND_CENTER':
   'EACH_DESIGN_AUTO_FIT_NOT_SAME_PIXEL_PER_BLOCK'};
}
const validSource=(filename)=>{
 if(typeof filename!=='string'||!filename)refuse('AB_SOURCE_PATH_REQUIRED');
 const p=path.resolve(filename);
 if(!fs.existsSync(p)||!fs.statSync(p).isFile()||
   fs.statSync(p).size>2000000)refuse('AB_SOURCE_NOT_READABLE');
 const raw=fs.readFileSync(p,'utf8'),design=JSON.parse(raw);
 const scene=compileDesign(design);
 if(!verifyCompiled(design,scene)||scene.worldContacts!==0||
   scene.BuildPlan?.operations?.length!==0||scene.readiness!=='NOT_PREPARED')
  refuse('AB_SOURCE_NOT_VERIFIED');
 return {design,scene,fileHash:digest(raw)};
};
const fourViews=(scene,fitReference=null)=>{
 const cameras=[[-1,-1,null],[1,-1,null],[1,1,null],[1,-1,4]];
 const names=['EXTERIOR_FRONT_LEFT.png','EXTERIOR_FRONT_RIGHT.png',
  'EXTERIOR_REAR_RIGHT.png','GROUND_FLOOR_CUTAWAY.png'];
 return cameras.map(([sx,sz,cutAboveY],i)=>({name:names[i],
  render:renderB143StaticPNG(scene,{sx,sz,cutAboveY,includeRgb:true,
   fitReference})}));
};
/** Compare two REAL persisted B143 designs without an inference call.
 * SOURCE SHA contains author metadata; physical differences instead use
 * actual final coordinates and MATERIAL indices, not source hash inequality.
 */
export function saveB143ABReview({beforeSourcePath,afterSourcePath,outDir,
 matchedCamera=false}={}){
 if(typeof outDir!=='string'||!outDir)refuse('AB_OUTPUT_REQUIRED');
 if(typeof matchedCamera!=='boolean')refuse('AB_CAMERA_POLICY');
 const out=path.resolve(outDir),parent=path.dirname(out);
 if(!fs.existsSync(parent)||!fs.statSync(parent).isDirectory()||
    fs.existsSync(out))refuse('AB_OUTPUT_MUST_BE_NEW');
 const repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
 const realParent=fs.realpathSync(parent);
 if(out===repoRoot||out.startsWith(repoRoot+path.sep)||
   realParent===repoRoot||realParent.startsWith(repoRoot+path.sep))
  refuse('AB_OUTPUT_INSIDE_REPOSITORY');
 const before=validSource(beforeSourcePath),after=validSource(afterSourcePath);
 const oldMap=new Map(before.scene.primitives.map(p=>[p.slice(0,3).join(','),p[3]]));
 const newMap=new Map(after.scene.primitives.map(p=>[p.slice(0,3).join(','),p[3]]));
 let added=0,removed=0,changedMaterial=0;
 for(const [loc,material] of newMap){
  if(!oldMap.has(loc))added++;
  else if(oldMap.get(loc)!==material)changedMaterial++;
 }
 for(const loc of oldMap.keys())if(!newMap.has(loc))removed++;
 const oldViews=fourViews(before.scene,matchedCamera?after.scene:null);
 const newViews=fourViews(after.scene,matchedCamera?before.scene:null);
 const sheet=makeB143ABSheet(oldViews,newViews,{matchedCamera});
 const report={schema:'r125-same-brief-ab-v1',
  before:{sourceSha256:before.scene.sourceSha256,
   geometrySha256:before.scene.geometrySha256,
   sourceFileSha256:before.fileHash,occupiedVoxels:before.scene.primitives.length},
  after:{sourceSha256:after.scene.sourceSha256,
   geometrySha256:after.scene.geometrySha256,
   sourceFileSha256:after.fileHash,occupiedVoxels:after.scene.primitives.length},
  finalVoxelDifference:{added,removed,changedMaterial,
   sameActualGeometryAndMaterial:added===0&&removed===0&&changedMaterial===0},
  preview:{file:'AB_OLD_LEFT_NEW_RIGHT.png',sha256:digest(sheet.bytes),
   width:sheet.width,height:sheet.height,
   columnOrder:sheet.columnOrder,rowOrder:sheet.rowOrder,
   physicalScale:sheet.physicalScale,
   style:'B143_SEMANTIC_COLOR_PROXY_NOT_MINECRAFT'},
  modelCalls:0,worldWrites:0,sourceEdited:false,
  artOutcome:'HUMAN_REVIEW_REQUIRED',minecraftWalking:'NOT_TESTED'};
 fs.mkdirSync(out);
 fs.writeFileSync(path.join(out,sheet.preview?.file??'AB_OLD_LEFT_NEW_RIGHT.png'),
  sheet.bytes,{flag:'wx'});
 fs.writeFileSync(path.join(out,'AB_REPORT.json'),
  JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 return report;
}
/** Offline render of PRIVATE saved B143 SOURCE; never loads a model or edits it. */
export function saveB143StaticReview({sourcePath,outDir}={}){
 if(typeof sourcePath!=='string'||typeof outDir!=='string'||!sourcePath||!outDir)
  refuse('SOURCE_AND_OUT_REQUIRED');
 const input=path.resolve(sourcePath),out=path.resolve(outDir);
 if(!fs.existsSync(input)||!fs.statSync(input).isFile()||
    fs.statSync(input).size>2000000)refuse('SOURCE_NOT_READABLE_OR_TOO_LARGE');
 const parent=path.dirname(out);
 if(!fs.existsSync(parent)||!fs.statSync(parent).isDirectory()||
    fs.existsSync(out))refuse('OUTPUT_MUST_BE_NEW');
 const repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
 const realParent=fs.realpathSync(parent);
 if(out===repoRoot||out.startsWith(repoRoot+path.sep)||
    realParent===repoRoot||realParent.startsWith(repoRoot+path.sep))
  refuse('OUTPUT_INSIDE_PUBLIC_REPOSITORY');
 const raw=fs.readFileSync(input,'utf8'),design=JSON.parse(raw);
 const compiled=compileDesign(design);
 if(!verifyCompiled(design,compiled)||compiled.BuildPlan?.operations?.length!==0||
    compiled.worldContacts!==0||compiled.readiness!=='NOT_PREPARED')
  refuse('SOURCE_NOT_VERIFIED');
 const views=[
  ['EXTERIOR_FRONT_LEFT.png',-1,-1,null],
  ['EXTERIOR_FRONT_RIGHT.png',1,-1,null],
  ['EXTERIOR_REAR_RIGHT.png',1,1,null],
  ['GROUND_FLOOR_CUTAWAY.png',1,-1,4]
 ];
 const pics=views.map(([name,sx,sz,cutAboveY])=>({
  name,render:renderB143StaticPNG(compiled,{sx,sz,cutAboveY,includeRgb:true})}));
 const contact=makeB143ContactSheet(pics);
 const report={schema:'r125-b143-offline-static-review-v1',
  id:design.id,sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256,
  sourceDocumentFileSha256:digest(raw),occupiedVoxels:compiled.primitives.length,
  renderMethod:'PURE_NODE_DETERMINISTIC_ISOMETRIC_PROXY_NO_BROWSER_OR_WEBGL',
  cutawayRule:'HIDE_SOURCE_VOXELS_Y_GE_4_WITHOUT_ADDING_BLOCKS',
  images:pics.map(({name,render})=>({name,
   sha256:digest(render.bytes),renderedFaces:render.renderedFaces,
   originalSourceCells:render.originalSourceCells,
   renderedCells:render.renderedCells,hiddenAboveY:render.hiddenAboveY,
   viewDirection:render.viewDirection})),
  contactSheet:{name:'CONTACT_4_VIEWS.png',sha256:digest(contact.bytes),
   width:contact.width,height:contact.height,
   order:contact.order,sourceVoxels:compiled.primitives.length},
  sourceGeometryNotEdited:true,originalModelResponseNotEdited:true,
  humanArt:'NOT_REVIEWED',minecraftWalking:'NOT_TESTED',
  modelCalls:0,worldContacts:0,worldWrites:0,constructionApproved:false};
 fs.mkdirSync(out);
 for(const pic of pics)
  fs.writeFileSync(path.join(out,pic.name),pic.render.bytes,{flag:'wx'});
 fs.writeFileSync(path.join(out,'CONTACT_4_VIEWS.png'),contact.bytes,{flag:'wx'});
 fs.writeFileSync(path.join(out,'STATIC_REVIEW.json'),
  JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 return report;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const a=process.argv.slice(2);
  if(a.length===6&&a[0]==='--before'&&a[2]==='--after'&&a[4]==='--out'){
   const report=saveB143ABReview({
    beforeSourcePath:a[1],afterSourcePath:a[3],outDir:a[5]});
   console.log('R125_SAME_BRIEF_AB_OFFLINE_SUCCESS',JSON.stringify(report));
  }else if(a.length===4&&a[0]==='--source'&&a[2]==='--out'){
   const report=saveB143StaticReview({sourcePath:a[1],outDir:a[3]});
   console.log('R125_STATIC_ART_OFFLINE_SUCCESS',JSON.stringify(report));
  }else refuse('CLI_SOURCE_OUT_REQUIRED');
 }catch(e){console.error('R125_STATIC_ART_HOLD',String(e?.message??e));process.exitCode=2;}
}
