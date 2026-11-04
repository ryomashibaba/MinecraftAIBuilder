/**
 * Safe V4J ONLY B143 SOURCE-LEVEL packing. Compress boxes into exact repeat
 * elements, without changing even one geometry/material voxel in the author's
 * prior multilevel building. No global B143 limits or old routes changed.
 *
 * Only boxes with equal mode/material/size inside one ADD-only island may
 * pair; a later box is moved earlier ONLY if it cannot overlap intervening
 * differently-materialed add operations. Never cross a cut.
 */
import {compileDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
const fail=s=>{throw Error('R125_V4J_LOSSLESS_PACK_'+s);};
const deep=v=>structuredClone(v);
const box=e=>e?.shape==='box'&&e.mode==='add'&&
 Array.isArray(e.origin)&&e.origin.length===3&&
 Array.isArray(e.size)&&e.size.length===3&&
 e.origin.every(Number.isSafeInteger)&&e.size.every(Number.isSafeInteger);
const overlap=(a,b)=>{
 const x=a.origin,z=b.origin;
 return [0,1,2].every(i=>
  x[i]<z[i]+b.size[i]&&z[i]<x[i]+a.size[i]);
};
function instances(e){
 if(!box(e))return null;
 if(!e.repeat)return [e];
 if(!Number.isSafeInteger(e.repeat.count)||
  !Array.isArray(e.repeat.offset))return null;
 const out=[];
 for(let n=0;n<e.repeat.count;n++)
  out.push({...e,origin:e.origin.map((x,i)=>x+n*e.repeat.offset[i])});
 return out;
}
function safeMoveEarlier(elements,i,j){
 const b=elements[j];
 for(let k=i+1;k<j;k++){
  const e=elements[k];
  if(e.mode==='cut')return false;
  if(e.material===b.material)continue;
  const ins=instances(e);
  if(!ins||ins.some(other=>overlap(other,b)))return false;
 }
 return true;
}
function compat(a,b){
 return box(a)&&box(b)&&!a.repeat&&!b.repeat&&
  a.material===b.material&&
  a.size.every((v,i)=>v===b.size[i])&&
  a.origin.some((v,i)=>v!==b.origin[i])&&
  a.origin.every((v,i)=>Math.abs(b.origin[i]-v)<=128);
}
export function packV4JWithoutAnyGeometryChanges(original,realCompiled,
 requiredSavings=0){
 if(!Number.isSafeInteger(requiredSavings)||requiredSavings<0||
  requiredSavings>80||!Array.isArray(original?.elements)||
  !verifyCompiled(original,realCompiled))
  fail('ORIGINAL_REAL_B143_SOURCE_REQUIRED');
 const el=deep(original.elements),removed=new Set(),pairs=[];
 for(let i=0;i<el.length;i++){
  if(removed.has(i)||!box(el[i])||el[i].repeat)continue;
  for(let j=i+1;j<el.length;j++){
   if(el[j].mode==='cut')break;
   if(removed.has(j)||!compat(el[i],el[j]))continue;
   if(!safeMoveEarlier(el,i,j))continue;
   const diff=el[j].origin.map((v,k)=>v-el[i].origin[k]);
   if(diff.every(v=>v===0))continue;
   el[i].repeat={count:2,offset:diff};
   removed.add(j);
   pairs.push({kept:el[i].id,removed:el[j].id,
    identicalMaterial:el[i].material,delta:diff});
   break;
  }
 }
 const compact=deep(original);
 compact.elements=el.filter((_,i)=>!removed.has(i));
 const compiled=compileDesign(compact);
 if(!verifyCompiled(compact,compiled)||
  compiled.geometrySha256!==realCompiled.geometrySha256||
  compiled.primitives.length!==realCompiled.primitives.length||
  compiled.primitives.some((p,i)=>p.some((v,j)=>v!==realCompiled.primitives[i][j])))
  fail('PACKING_WOULD_CHANGE_EVEN_ONE_AUTHOR_B143_VOXEL');
 if(pairs.length<requiredSavings)
  fail('INSUFFICIENT_SAFE_REPEATS_FOR_NEW_AUTHOR_FEATURE_'+pairs.length+'_NEED_'+requiredSavings);
 return {design:compact,verifiedRealB143:compiled,
  proof:{priorElements:original.elements.length,
   packedElements:compact.elements.length,savedElements:pairs.length,
   newFeatureRequiredSavings:requiredSavings,
   sourceGeometrySha256Before:realCompiled.geometrySha256,
   sourceGeometrySha256After:compiled.geometrySha256,
   realCompiledVoxelsIdentical:true,
   sourceASTIsPackedWithoutChangingOriginalAuthor:true,
   geometryNotArtCertification:true,
   pairs}};
}
