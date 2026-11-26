/** Independent shape overlay over verified B143 SOURCE. Never pass it
 * to construction/export or claim full-block SOURCE QA applies to it. */
import {createHash} from 'node:crypto';
import {verifyCompiled} from './b143-building-dsl.mjs';
import {verifyR125BlockExpression,r125ReviewFaces} from './r125-block-expression.mjs';
import {validateR125RoofSurface,ROOF_SURFACE_FAMILIES} from './r125-roof-surface-contract.mjs';
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const fail=x=>{throw Error('R125_ROOF_SURFACE_'+x)};
const key=p=>p.slice(0,3).join(',');
export function buildR125RoofSurface(args,expression){
 if(!verifyR125BlockExpression(args,expression))fail('EXPRESSION');
 if(args.origin!=='CALLER_PROVIDED_MODEL_RESPONSE_UNVERIFIED')fail('AUTHORED_RAW_REQUIRED');
 const plan=JSON.parse(args.originalRaw);validateR125RoofSurface(plan);
 if(!Object.hasOwn(plan,'roofSurface'))fail('SELECTION_REQUIRED');
 const mode=plan.roofSurface,family=ROOF_SURFACE_FAMILIES[plan.blockPalette.roof];
 const levels=plan.levels,spatial=levels?.[0]?.layoutMode==='spatial-tree';
 const spaces=spatial?(levels[0].spaces??[levels[0].rootSpace,...(levels[0].attachedSpaces??[])]):[];
 const classify=id=>{
  if(spatial){
   const m=/^space-(\d+)-(roof|(?:ridge|shed|gable)-skin-\d+)$/.exec(id);
   if(!m)return null;const volume=spaces[Number(m[1])]?.volume;
   if(!volume)return null;
   return {group:'space-'+m[1],axis:volume.roofAxis,form:volume.roofForm??'flat'};
  }
  const form=plan.expression?.roofProfile??'flat';
  if(!['flat','ridge'].includes(form)||! /^(?:roof|roof-base|roof-raised-skin-\d+|roof-profile-\d+)$/.test(id))return null;
  return {group:'main',axis:plan.expression?.roofAxis,form};
 };
 const occ=new Set(args.scene.primitives.map(key)),columns=new Map(),eligible=[];
 for(const r of expression.rows){
  const shape=classify(r[4]);
  if(!shape||r[5]!=='roof'||r[6]!==plan.blockPalette.roof)continue;
  const k=[shape.group,r[0],r[2]].join(',');
  const prior=columns.get(k);
  if(!prior||prior.row[1]<r[1])columns.set(k,{row:r,...shape});
 }
 for(const item of columns.values())if(!occ.has([item.row[0],item.row[1]+1,item.row[2]].join(',')))eligible.push(item);
 const rows=[],skipped={notStep:0,notCrest:0,ambiguous:0,unsupportedForm:0};
 const step=(r,axis,sign)=>axis==='x'?[r[0]+sign,r[2]]:[r[0],r[2]+sign];
 for(const item of eligible){
  const {row:r,axis,form,group}=item;
  const neighbor=sign=>columns.get([group,...step(r,axis,sign)].join(','))?.row[1];
  const pitched=['ridge','gable','shed'].includes(form)&&['x','z'].includes(axis);
  const ns=pitched?[-1,1].map(neighbor):[];
  const rising=pitched?[-1,1].filter((s,i)=>ns[i]===r[1]+1):[];
  if(rising.length>1){skipped.ambiguous++;continue}
  let kind=null,highSide=null,block=null;
  if(mode!=='slabs'&&rising.length===1){
   kind='stairs';highSide=axis+(rising[0]===1?'+':'-');block=family[0];
  }else if(mode!=='stairs'){
   // Slabs only on flat roofs or ridge/gable/shed crest cells, where a
   // neighbor is lower and neither is higher. Do not change flat runs
   // in the middle of a pitched slope or any sawtooth/hip roof.
   if(form==='flat'||(pitched&&ns.some(y=>y!==undefined&&y<r[1])&&
      ns.every(y=>y===undefined||y<=r[1]))){kind='slab';block=family[1]}
   else{skipped.notCrest++;continue}
  }else{skipped.notStep++;continue}
  rows.push({at:r.slice(0,3),owner:r[4],kind,block,highSide,half:'bottom',
   belowSourceSolid:occ.has([r[0],r[1]-1,r[2]].join(','))});
 }
 const packet={schema:'r125-roof-surface-v1',origin:args.origin,
  sourceSha256:expression.sourceSha256,geometrySha256:expression.geometrySha256,
  expressionSha256:expression.expressionSha256,originalRawSha256:expression.originalRawSha256,
  mode,roofMaterial:plan.blockPalette.roof,rows,eligible:eligible.length,skipped,
  counts:{stairs:rows.filter(r=>r.kind==='stairs').length,slabs:rows.filter(r=>r.kind==='slab').length},
  status:rows.length?'SHAPE_PREVIEW_ONLY':'NO_FEASIBLE_ROOF_SURFACE',
  frozenSourceChanged:false,partialBlockCollision:'NOT_TESTED',roofEnclosure:'NOT_TESTED',
  educationBlockState:'NOT_ATTESTED',constructionApproved:false,worldWrites:0,BuildPlan:{operations:[]}};
 return {...packet,shapeSha256:sha(packet)};
}
export function verifyR125RoofSurface(args,expression,packet){
 try{return JSON.stringify(buildR125RoofSurface(args,expression))===JSON.stringify(packet)}catch{return false}
}
/** Half-grid cell masks. Each full cube is eight subcells, bottom slab
 * four, straight bottom stair six. The high side is explicitly recorded
 * in world axes; no engine-specific facing state is assumed. */
export function r125HalfMask(shape){
 const result=[];
 for(let y=0;y<2;y++)for(let z=0;z<2;z++)for(let x=0;x<2;x++){
  if(!shape||y===0||shape.kind==='stairs'&&
    ({'x+':x===1,'x-':x===0,'z+':z===1,'z-':z===0})[shape.highSide])result.push([x,y,z]);
 }
 return result;
}
export function r125PartialReviewFaces(cells,shapes,yaw,pitch){
 const half=[];
 for(const p of cells){
  const shape=shapes[p.slice(0,3).join(',')];
  for(const [x,y,z] of r125HalfMask(shape))half.push([2*p[0]+x,2*p[1]+y,2*p[2]+z,p[3],p[4]]);
 }
 return r125ReviewFaces(half,yaw,pitch).map(f=>({...f,
  cell:[Math.floor(f.cell[0]/2),Math.floor(f.cell[1]/2),Math.floor(f.cell[2]/2),f.cell[3],f.cell[4]],
  vertices:f.vertices.map(v=>v.map(n=>n/2)),distance:f.distance/2}));
}
export function makeR125RoofSurfaceTemplate(template,args,expression,packet){
 if(!verifyR125RoofSurface(args,expression,packet))fail('PACKET');
 const replace=(s,a,b)=>{if(s.indexOf(a)<0||s.indexOf(a)!==s.lastIndexOf(a))fail('VIEWER_ANCHOR');return s.replace(a,b)};
 const shapes=Object.fromEntries(packet.rows.map(r=>[key(r.at),{kind:r.kind,highSide:r.highSide}]));
 let t=replace(template,'<div id="materialToggles"></div>','<div id="materialToggles"></div><div class="toggle"><input id="v385Shapes" type="checkbox" '+(packet.rows.length?'checked':'disabled')+'><label for="v385Shapes">屋根の階段・ハーフブロック（研究表示）</label></div><p class="muted">部分ブロックの衝突・屋根の閉鎖性・施工は未検証。'+(packet.rows.length?'適用候補 '+packet.rows.length+' 個。':'適用可能な屋根セルなし。')+'</p>');
 t=replace(t,'const palette=','const v385Shapes='+JSON.stringify(shapes)+';\n'+r125HalfMask.toString()+'\n'+r125PartialReviewFaces.toString()+'\nconst palette=');
 t=replace(t,'function drawSoon(){','el("v385Shapes").addEventListener("change",drawSoon);\nfunction drawSoon(){');
 t=replace(t,'for(const f of r125ReviewFaces(cells,yaw,pitch)){','const partial=el("v385Shapes").checked&&el("v38Blocks").checked&&cells.length<=12000;\n  for(const f of (partial?r125PartialReviewFaces(cells,v385Shapes,yaw,pitch):r125ReviewFaces(cells,yaw,pitch))){');
 t=replace(t,'｜簡易模様・陰影（Minecraft画像ではありません）";','｜簡易模様・陰影（Minecraft画像ではありません）"+(partial?"｜屋根部分形状・未認証":el("v385Shapes").checked&&cells.length>12000?"｜描画上限により部分形状OFF":"");');
 return t;
}
