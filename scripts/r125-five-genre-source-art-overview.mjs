/**
 * MinecraftAIBuilder five-genre ART overview: one PNG synthesized directly
 * from TRUE verified B143 source voxels, never from invented renderings.
 * Self-contained PNG writer (Node built-ins only), embeds nonprivate SHA
 * provenance so the user can upload ONE image instead of five screenshots.
 * This is SOURCE visualization, not Minecraft or human ART certification.
 */
import {createHash} from 'node:crypto';
import {deflateSync} from 'node:zlib';

const COLORS=['#aab5bd','#d9e1e4','#728b9c','#44d3da','#bb9265','#e6cf7b','#c77aa4'];
const FONT={
 A:['01110','10001','10001','11111','10001','10001','10001'],
 B:['11110','10001','10001','11110','10001','10001','11110'],
 C:['01111','10000','10000','10000','10000','10000','01111'],
 D:['11110','10001','10001','10001','10001','10001','11110'],
 E:['11111','10000','10000','11110','10000','10000','11111'],
 F:['11111','10000','10000','11110','10000','10000','10000'],
 G:['01111','10000','10000','10111','10001','10001','01111'],
 H:['10001','10001','10001','11111','10001','10001','10001'],
 I:['11111','00100','00100','00100','00100','00100','11111'],
 J:['00111','00010','00010','00010','10010','10010','01100'],
 K:['10001','10010','10100','11000','10100','10010','10001'],
 L:['10000','10000','10000','10000','10000','10000','11111'],
 M:['10001','11011','10101','10101','10001','10001','10001'],
 N:['10001','11001','10101','10011','10001','10001','10001'],
 O:['01110','10001','10001','10001','10001','10001','01110'],
 P:['11110','10001','10001','11110','10000','10000','10000'],
 Q:['01110','10001','10001','10001','10101','10010','01101'],
 R:['11110','10001','10001','11110','10100','10010','10001'],
 S:['01111','10000','10000','01110','00001','00001','11110'],
 T:['11111','00100','00100','00100','00100','00100','00100'],
 U:['10001','10001','10001','10001','10001','10001','01110'],
 V:['10001','10001','10001','10001','10001','01010','00100'],
 W:['10001','10001','10001','10101','10101','10101','01010'],
 X:['10001','10001','01010','00100','01010','10001','10001'],
 Y:['10001','10001','01010','00100','00100','00100','00100'],
 Z:['11111','00001','00010','00100','01000','10000','11111'],
 0:['01110','10011','10101','10101','11001','10001','01110'],
 1:['00100','01100','00100','00100','00100','00100','01110'],
 2:['01110','10001','00001','00010','00100','01000','11111'],
 3:['11110','00001','00001','00110','00001','00001','11110'],
 4:['00010','00110','01010','10010','11111','00010','00010'],
 5:['11111','10000','11110','00001','00001','10001','01110'],
 6:['00110','01000','10000','11110','10001','10001','01110'],
 7:['11111','00001','00010','00100','01000','01000','01000'],
 8:['01110','10001','10001','01110','10001','10001','01110'],
 9:['01110','10001','10001','01111','00001','00010','11100'],
 ':':['00000','00100','00100','00000','00100','00100','00000'],
 '-':['00000','00000','00000','11111','00000','00000','00000'],
 '/':['00001','00001','00010','00100','01000','10000','10000'],
 '.':['00000','00000','00000','00000','00000','01100','01100'],
 '+':['00000','00100','00100','11111','00100','00100','00000'],
 ' ':['00000','00000','00000','00000','00000','00000','00000'],
 '?':['01110','10001','00010','00100','00100','00000','00100']
};
const GENRES=['home','retail','laboratory','gallery','station'];
const LABELS=['HOME','RETAIL','LABORATORY','GALLERY','STATION'];
const rgb=s=>[1,3,5].map(i=>parseInt(s.slice(i,i+2),16));
const UI={bg:[9,23,37],panel:[17,40,57],panel2:[23,51,72],ink:[238,245,249],muted:[165,189,202],red:[248,152,142]};
const fail=s=>{throw Error('R125_ART_OVERVIEW_'+s)};
function boundsOf(s){
 if(!s||!Array.isArray(s.compiled?.primitives)||!s.compiled.primitives.length||
    !s.design?.bounds)fail('MISSING_REAL_B143_GEOMETRY');
 const b=s.design.bounds;
 if(!['width','height','depth'].every(k=>Number.isInteger(b[k])&&b[k]>0&&b[k]<512))
  fail('INVALID_BOUNDS');
 if(s.compiled.primitives.length>1500000)fail('EXCESS_VOXELS');
 return b;
}
function sourceProjection(s,view){
 const projected=new Map();
 for(const p of s.compiled.primitives){
  if(!Array.isArray(p)||p.length<4||
     p.slice(0,4).some(n=>!Number.isInteger(n)))fail('INVALID_VOXEL');
  const [x,y,z,mat]=p;if(mat<0||mat>=COLORS.length)fail('UNKNOWN_MATERIAL');
  const a=view==='side'?z:x,b=view==='top'?z:y;
  const depth=view==='front'?z:view==='side'?x:y;
  const k=a+','+b,prior=projected.get(k);
  if(!prior||(view==='top'?depth>prior.depth:depth<prior.depth))
   projected.set(k,{a,b,mat,depth});
 }
 return [...projected.values()];
}
function drawText(fill,msg,x,y,scale=2,color=UI.ink){
 for(const char of String(msg).toUpperCase().slice(0,300)){
  const glyph=FONT[char]||FONT['?'];
  for(let dy=0;dy<7;dy++)for(let dx=0;dx<5;dx++)if(glyph[dy][dx]==='1')
   fill(x+dx*scale,y+dy*scale,scale,scale,color);
  x+=6*scale;
 }
}
function pngChunk(name,data){
 const type=Buffer.from(name,'ascii'),size=Buffer.alloc(4);
 size.writeUInt32BE(data.length);
 const content=Buffer.concat([type,data]);let crc=0xffffffff;
 for(const n of content){crc^=n;for(let j=0;j<8;j++)
  crc=crc&1?(crc>>>1)^0xedb88320:crc>>>1}
 const trailer=Buffer.alloc(4);trailer.writeUInt32BE((crc^0xffffffff)>>>0);
 return Buffer.concat([size,content,trailer]);
}
function encodePng(width,height,pixels,metadata){
 const header=Buffer.alloc(13);header.writeUInt32BE(width,0);header.writeUInt32BE(height,4);
 header[8]=8;header[9]=6;
 const stride=width*4,unfiltered=Buffer.alloc((stride+1)*height);
 for(let y=0;y<height;y++)
  pixels.copy(unfiltered,y*(stride+1)+1,y*stride,(y+1)*stride);
 const text=Buffer.from('MAB_Source_Evidence\0'+JSON.stringify(metadata),'utf8');
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),
  pngChunk('IHDR',header),pngChunk('tEXt',text),
  pngChunk('IDAT',deflateSync(unfiltered,{level:6})),
  pngChunk('IEND',Buffer.alloc(0))]);
}
/** Input stages must be independently verified before calling this renderer. */
export function renderFiveGenreSourceEvidence(cases,report){
 if(!Array.isArray(cases)||cases.length!==5||
    cases.some((c,i)=>c.id!==GENRES[i]||!c.base)||
    !report||typeof report.status!=='string'||
    report.worldWrites!==0||report.art==='PASS'||report.minecraft==='PASS')
  fail('PROVENANCE_OR_WORLD_WRITE');
 const dims={width:1,height:1,depth:1};
 for(const c of cases)for(const k of ['base','final']){
  if(!c[k])continue;
  const b=boundsOf(c[k]);for(const dim of Object.keys(dims))
   dims[dim]=Math.max(dims[dim],b[dim]);
 }
 const cell=Math.max(2,Math.min(8,Math.floor(225/Math.max(...Object.values(dims)))));
 const gap=12,pad=15,head=56,rowHeader=33;
 const vw={front:(dims.width+2)*cell,side:(dims.depth+2)*cell,
  top:(dims.width+2)*cell};
 const panelH=(Math.max(dims.height,dims.depth)+2)*cell;
 const panelW=vw.front+vw.side+vw.top+gap*2+pad*2;
 const width=panelW*2+gap+pad*2,rowH=rowHeader+panelH+pad*2+26;
 const height=head+rowH*5+20;
 if(width>5500||height>5500||width*height>20000000)fail('OVERSIZED_PNG');
 const image=Buffer.alloc(width*height*4);
 function fill(x,y,w,h,c){
  const xa=Math.max(0,Math.floor(x)),ya=Math.max(0,Math.floor(y));
  const xb=Math.min(width,Math.ceil(x+w)),yb=Math.min(height,Math.ceil(y+h));
  for(let yy=ya;yy<yb;yy++)for(let xx=xa;xx<xb;xx++){
   const p=(yy*width+xx)*4;
   image[p]=c[0];image[p+1]=c[1];image[p+2]=c[2];image[p+3]=255;
  }
 }
 fill(0,0,width,height,UI.bg);
 const ready=cases.filter(c=>!!c.final).length;
 drawText(fill,'MAB FIVE GENRES   SOURCE '+ready+'/5   ART HOLD',pad,13,2);
 drawText(fill,'V1+V2 FROZEN / V3 SOURCE / WORLD WRITES 0',pad,34,1,UI.muted);
 const metadata={schema:'r125-five-genre-source-overview-png-v1',
  visualization:'ACTUAL_B143_VOXEL_PROJECTION_NOT_AN_ART_RENDER',
  status:report.status,modelCallsThisRun:report.modelCalls??null,
  sourceReadyCount:ready,worldWrites:0,humanArt:'NOT_REVIEWED',
  minecraft:'NOT_TESTED',sharedScalePixelsPerBlock:cell,
  globalBlockBounds:dims,cases:[]};
 for(const [i,c] of cases.entries()){
  const y=head+i*rowH;
  drawText(fill,(i+1)+' '+LABELS[i],pad,y+5,2);
  metadata.cases.push({id:c.id,status:c.status??null,
   frozenV2GeometrySha256:c.base?.geometrySha256??null,
   finalV3GeometrySha256:c.final?c.finalGeometrySha256??null:null,
   finalPresent:!!c.final});
  for(const [k,scene] of [['FROZEN V2',c.base],['V3 SOURCE',c.final]]){
   const left=pad+(k==='V3 SOURCE'?panelW+gap:0),top=y+rowHeader;
   fill(left,top,panelW,panelH+pad*2+20,UI.panel);
   drawText(fill,k,left+pad,top+5,1,UI.muted);
   if(!scene){drawText(fill,'NO NEW SOURCE',left+pad,top+33,2,UI.red);continue}
   let vx=left+pad;
   for(const view of ['front','side','top']){
    const yy=top+27;
    fill(vx,yy,vw[view],panelH,UI.panel2);
    for(const voxel of sourceProjection(scene,view)){
     const py=view==='top'?voxel.b:dims.height-1-voxel.b;
     if(voxel.a<0||py<0||
        voxel.a>=(view==='side'?dims.depth:dims.width)||
        py>=(view==='top'?dims.depth:dims.height))
      fail('VOXEL_OUTSIDE_GLOBAL_BOUNDS');
     fill(vx+(voxel.a+1)*cell,yy+(py+1)*cell,cell,cell,
      rgb(COLORS[voxel.mat]));
    }
    drawText(fill,view,vx+6,top+panelH+pad+11,1,UI.muted);
    vx+=vw[view]+gap;
   }
  }
 }
 const png=encodePng(width,height,image,metadata);
 return {png,metadata,width,height,
  sha256:createHash('sha256').update(png).digest('hex')};
}
