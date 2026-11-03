import test from 'node:test';
import assert from 'node:assert/strict';
import {inflateSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {renderFiveGenreSourceEvidence}
 from './r125-five-genre-source-art-overview.mjs';

const ids=['home','retail','laboratory','gallery','station'];
function scene(material,width=14,height=8,depth=12){
 const pixels=[];
 // These test-double voxel arrays are NEVER a Qwen, B143 or Minecraft proof.
 // They test ONLY that the renderer projects the exact supplied primitives.
 for(let x=0;x<width;x++)for(let z=0;z<depth;z++){
  pixels.push([x,0,z,4]);
  pixels.push([x,height-1,z,material]);
 }
 for(let y=1;y<height-1;y++)for(let x=0;x<width;x++)
  pixels.push([x,y,0,material]);
 return {design:{bounds:{width,height,depth}},
  compiled:{primitives:pixels},geometrySha256:String(material).repeat(64)};
}
const examples=ids.map((id,i)=>({
 id,base:scene(i%7),final:scene((i+1)%7),
 finalGeometrySha256:String(i).repeat(64),
 status:'REUSED_SHA_VERIFIED_ART_HOLD'
}));
const report={status:'FIVE_FUNCTIONAL_SOURCE_CANDIDATES_ART_HOLD',
 modelCalls:0,worldWrites:0,art:'NOT_REVIEWED',minecraft:'NOT_TESTED'};
function parsePNG(png){
 assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10]);
 const chunks=[];let pos=8;
 while(pos+12<=png.length){
  const len=png.readUInt32BE(pos),type=png.toString('ascii',pos+4,pos+8);
  const data=png.subarray(pos+8,pos+8+len);
  chunks.push({type,data});pos+=12+len;if(type==='IEND')break;
 }
 const ihdr=chunks.find(c=>c.type==='IHDR').data;
 const meta=chunks.find(c=>c.type==='tEXt').data.toString('utf8');
 assert(meta.startsWith('MAB_Source_Evidence\0'));
 const raw=inflateSync(Buffer.concat(chunks.filter(c=>c.type==='IDAT')
  .map(c=>c.data)));
 return {width:ihdr.readUInt32BE(0),height:ihdr.readUInt32BE(4),
  channels:ihdr[9],meta:JSON.parse(meta.slice(meta.indexOf('\0')+1)),raw};
}
test('one deterministic verifiable PNG contains 5 real SOURCE voxel projections and preserved SHA, no screenshots',()=>{
 const a=renderFiveGenreSourceEvidence(examples,report);
 const b=renderFiveGenreSourceEvidence(examples,report);
 assert.equal(a.sha256,b.sha256);
 assert.deepEqual(a.png,b.png);
 assert.equal(createHash('sha256').update(a.png).digest('hex'),a.sha256);
 const png=parsePNG(a.png);
 assert.equal(png.width,a.width);
 assert.equal(png.height,a.height);
 assert.equal(png.channels,6);
 assert.equal(png.raw.length,(png.width*4+1)*png.height);
 assert.equal(png.meta.schema,'r125-five-genre-source-overview-png-v1');
 assert.equal(png.meta.worldWrites,0);
 assert.equal(png.meta.humanArt,'NOT_REVIEWED');
 assert.equal(png.meta.minecraft,'NOT_TESTED');
 assert.equal(png.meta.cases.length,5);
 assert.deepEqual(png.meta.cases.map(c=>c.id),ids);
 assert.deepEqual(png.meta.cases.map(c=>c.finalV3GeometrySha256),
  examples.map(c=>c.finalGeometrySha256));
 assert.equal(png.meta.sourceReadyCount,5);
 assert.equal(png.meta.sharedScalePixelsPerBlock>0,true);
 // Actual source colors, not an illustrative placeholder.
 assert(png.raw.includes(Buffer.from([0x44,0xd3,0xda,0xff])));
 assert(png.raw.includes(Buffer.from([0xbb,0x92,0x65,0xff])));
});
test('missing case shows correct partial 4/5, never a fabricated five-source claim',()=>{
 const partial=examples.map((v,i)=>i===0?{...v,final:null}:v);
 const png=parsePNG(renderFiveGenreSourceEvidence(partial,{
  ...report,status:'HOLD_FAILED_ONLY_HOME'}).png);
 assert.equal(png.meta.sourceReadyCount,4);
 assert.equal(png.meta.cases[0].finalPresent,false);
 assert.equal(png.meta.cases[0].finalV3GeometrySha256,examples[0].finalGeometrySha256);
});
test('source overview refuses world-write, genre substitution and malformed materials',()=>{
 assert.throws(()=>renderFiveGenreSourceEvidence(examples,{...report,worldWrites:1}),
  /PROVENANCE_OR_WORLD_WRITE/);
 assert.throws(()=>renderFiveGenreSourceEvidence([
  {...examples[0],id:'not-the-original-home'},...examples.slice(1)],report),
  /PROVENANCE_OR_WORLD_WRITE/);
 assert.throws(()=>renderFiveGenreSourceEvidence([
  {...examples[0],base:{design:examples[0].base.design,
   compiled:{primitives:[[1,1,1,99]]}}},...examples.slice(1)],report),
  /UNKNOWN_MATERIAL/);
 assert.throws(()=>renderFiveGenreSourceEvidence([
  {...examples[0],final:null,base:null},...examples.slice(1)],report),
  /MISSING_REAL_B143_GEOMETRY/);
});
