/** V38: independent, review-only full-block expression over frozen B143.
 * Catalog IDs are Bedrock candidates, NOT Education installation attestations.
 * No texture assets, stateful blocks, world API, exporter or BuildPlan changes.
 */
import {createHash} from 'node:crypto';
import {compileDesign,verifyCompiled,MATERIALS} from './b143-building-dsl.mjs';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const fail=x=>{throw Error('R125_BLOCK_EXPRESSION_'+x)};
const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const key=v=>v.slice(0,3).join(',');
const catalog={
 stone:'#858585',stone_bricks:'#838780',polished_andesite:'#a5a7a5',
 polished_granite:'#b98171',sandstone:'#d9c58f',smooth_sandstone:'#ded0a4',
 quartz_block:'#e9e4db',deepslate_bricks:'#4c5054',deepslate_tiles:'#34363b',
 oak_planks:'#bd985f',spruce_planks:'#775333',birch_planks:'#d7c59a',
 dark_oak_planks:'#513a28',cherry_planks:'#dfb0a5',iron_block:'#d2d6d6',
 white_concrete:'#d6d9dc',gray_concrete:'#50545a',light_gray_concrete:'#91918a',
 black_concrete:'#25262a',blue_concrete:'#35478b',yellow_concrete:'#e2bb33',
 bookshelf:'#906f48',glass:'#5be0e8',glowstone:'#f9dc80'
};
export const BLOCK_COLORS=Object.freeze(catalog);
const legacy=Object.freeze({stone:'stone',concrete:'white_concrete',metal:'iron_block',
 glass:'glass',wood:'oak_planks',glow:'glowstone',accent:'yellow_concrete'});
const baseRoles=Object.freeze(['floor','wall','roof','trim','furniture']);
const detailRoles=Object.freeze(['windowFrame','storage']);
const roles=Object.freeze([...baseRoles,...detailRoles]);
const opaque=Object.keys(catalog).filter(x=>!['glass','glowstone','bookshelf'].includes(x));
const wood=opaque.filter(x=>x.endsWith('_planks'));
const choices=role=>role==='furniture'?wood:role==='storage'?['bookshelf',...wood]:opaque;
export function validateR125BlockPalette(palette){
 if(!obj(palette)||!Object.keys(palette).length||
    Object.keys(palette).some(r=>!roles.includes(r)||!choices(r).includes(palette[r])))
  fail('PALETTE');
 return true;
}
export function r125BlockPaletteSchema(){
 return {type:'object',additionalProperties:false,minProperties:1,
  properties:Object.fromEntries(roles.map(r=>[r,{type:'string',enum:choices(r)}]))};
}
const instruction='OPTIONAL blockPalette: choose actual full blocks for floor, wall, roof, trim (existing piers/fins/frame) and furniture (wood parts only). Omit unused roles. Allowed IDs: '+opaque.join('|')+'. Furniture: planks only. Optional windowFrame: existing wall cells immediately around real exterior windows; storage: bookshelf or planks on existing shelf parts only. Use these if relevant; coherent contrast is optional, never mandatory. Keep materials as the required B143 coarse geometry palette; blockPalette is your explicit visual choice, never changes geometry, glass or light. Do not invent extra blocks or features. Optional windowRelief: hoods (one-block projecting lintel) or surrounds (projecting head, sill and jambs), placed only at feasible existing exterior windows with solid backing and clear outside; at least one must fit. Omit if not appropriate; no new openings. Optional wallRelief: pilasters (paired projecting vertical piers) or framed-bays (paired piers joined by a projecting upper band), on feasible solid exterior walls only. These use trim material. Omit unless suited to the design.';
export function prepareR125BlockPaletteRequest(body){
 if(!obj(body)||!Array.isArray(body.messages)||body.messages[0]?.role!=='system'||
    typeof body.messages[0].content!=='string'||body.messages[0].content.includes('OPTIONAL blockPalette:'))
  fail('REQUEST');
 const next=JSON.parse(JSON.stringify(body));
 const native=obj(next.format),compat=obj(next.response_format?.json_schema?.schema);
 if(native===compat)fail('EXACTLY_ONE_SCHEMA');
 const schema=native?next.format:next.response_format.json_schema.schema;
 if(!Array.isArray(schema.anyOf)||!schema.anyOf.length)fail('VARIANTS');
 for(const variant of schema.anyOf){
  if(!obj(variant.properties)||Object.hasOwn(variant.properties,'blockPalette'))fail('VARIANT');
  variant.properties.blockPalette=r125BlockPaletteSchema();
  if(Object.hasOwn(variant.properties,'windowRelief'))fail('RELIEF_VARIANT');
  variant.properties.windowRelief={type:'string',enum:['hoods','surrounds']};
  if(Object.hasOwn(variant.properties,'wallRelief'))fail('WALL_RELIEF_VARIANT');
  variant.properties.wallRelief={type:'string',enum:['pilasters','framed-bays']};
 }
 next.messages[0].content+='\n'+instruction;
 return next;
}
/** Exact last surviving ADD owner. For a FINAL occupied cell any later CUT
 * must have been followed by a later ADD. Thus reverse ADD-only coverage
 * is equivalent to replaying every ADD/CUT; no geometry rules are duplicated.
 * Each element mask comes from the real frozen compiler, including repeats.
 */
export function resolveR125FinalOwners(design,scene){
 if(!verifyCompiled(design,scene))fail('SOURCE_MISMATCH');
 const pending=new Map(scene.primitives.map((p,i)=>[key(p),i]));
 const owners=new Array(scene.primitives.length);
 for(let i=design.elements.length-1;i>=0&&pending.size;i--){
  const e=design.elements[i];if(e.mode!=='add')continue;
  const mask=compileDesign({...design,elements:[e]});
  for(const p of mask.primitives){
   const k=key(p),index=pending.get(k);if(index===undefined)continue;
   if(p[3]!==scene.primitives[index][3])fail('OWNER_MATERIAL_MISMATCH');
   owners[index]=e.id;pending.delete(k);
  }
 }
 if(pending.size)fail('OWNER_COVERAGE');
 return owners;
}
/** Conservative semantic classification of audited R125 generator IDs.
 * Unknown elements remain baseline. Material alone never assigns a role.
 * Glass/glow and non-wood furniture parts always retain the original class.
 */
export function r125ElementRole(e){
 const id=e.id,m=e.material;
 if(e.mode!=='add'||m==='glass'||m==='glow')return null;
 if(/^(?:fx-l\d+-z\d+|host-scale-fx-l\d+-z\d+)-/.test(id))
  return m==='wood'?'furniture':null;
 if(/^(?:floor-\d+|space-\d+-floor|interfloor-stair|recess-paved-court-floor|u-court-paving|front-court-paving|detail-covered-entry-landing|detail-entry-paving)$/.test(id))return 'floor';
 if(/^relief-window-\d+-(?:head|sill|left|right)$/.test(id)||/^wall-relief-\d+-(?:pier-[01]|band)$/.test(id))return 'trim';
 if(/^(?:l\d+-(?:fin|screen)-\d+|space-\d+-front-pier-\d+|entry-portal-pier-\d+|entry-portal-lintel|entry-canopy-support-(?:left|right)|detail-covered-entry-pier-\d+|spatial-daylight-bay-\d+-(?:left-fin|right-fin|sill|head)|portico-front-spandrel)$/.test(id))return 'trim';
 if(/^(?:l\d+-(?:west|east|front|rear|divider|secondary-divider|(?:rear|side)-divider-\d+|recess-(?:west|east|rear)-wall)|space-\d+-(?:west|east|front|rear|shed-riser-\d+|(?:ridge|shed|gable)-gable-\d+-\d+|shed-high-end)|roof-monitor-riser-.+|roof-raised-eave-[ab]-\d+|roof-raised-terminal-gable|roof-hip-inner-(?:front|rear|west|east)|portico-(?:west-return|east-return|rear-wall)|u-court-(?:return-west|return-east|interior-wall)|front-court-(?:side|inner)-wall|recess-outer-roof-seal-[xz]-\d+|detail-entry-(?:return|back)-\d+|(?:deep-east|deep-rear|front-terrace)-parapet-.+)$/.test(id))return 'wall';
 if(/^(?:roof|roof-base|roof-monitor-(?:low|high)|roof-one-cell-eave-.+|roof-raised-skin-.+|roof-tapered-riser-\d+|roof-profile-\d+|roof-pitched-eave-.+|roof-hip-(?:\d+-(?:front|rear|west|east)|ridge|eave-.+)|space-\d+-(?:roof|(?:ridge|shed|gable)-skin-\d+|gable-riser-\d+)|entry-canopy-roof|detail-covered-entry-canopy|detail-entry-canopy|detail-eave-.+)$/.test(id))return 'roof';
 return null;
}
/** Only windows created by known R125 exterior-window generators, not
 * equipment glazing or observation partitions. A wall owner must be an
 * actual one-cell exterior face and the pane must be in its plane.
 * The role is a full-block finish, not an added frame or altered opening. */
function windowFrameCells(scene,elements,owners){
 const byKey=new Map(scene.primitives.map((p,i)=>[key(p),i])),out=new Set();
 for(let i=0;i<owners.length;i++){
  const e=elements.get(owners[i]);
  if(e.material!=='glass'||!e.id.match(/^(?:l\d+-(?:window-|recess-.*-window-)|daylight-|glaze-\d+(?:-\d+)?-glass$|spatial-daylight-|front-court-return-window-|u-court-window-)/))continue;
  if(e.shape!=='box'||!e.size)continue;
  const axis=e.size[0]===1&&e.size[2]>1?0:e.size[2]===1&&e.size[0]>1?2:null;
  if(axis===null)continue; // ambiguous 1x1 panes remain untouched
  const p=scene.primitives[i],along=axis===0?2:0;
  for(const [d,j] of [[1,along],[-1,along],[1,1],[-1,1]]){
   const q=p.slice(0,3);q[j]+=d;
   const n=byKey.get(key(q));if(n===undefined)continue;
   const wall=elements.get(owners[n]);
   if(wall.shape!=='box'||wall.size?.[axis]!==1||wall.origin[axis]!==p[axis]||
      !/^(?:l\d+-(?:west|east|front|rear|recess-(?:west|east|rear)-wall)|space-\d+-(?:west|east|front|rear)|front-court-(?:side|inner)-wall|u-court-(?:return-west|return-east|interior-wall))$/.test(wall.id)||
      r125ElementRole(wall)!=='wall')continue;
   out.add(n);
  }
 }
 return out;
}
function storagePart(e){
 return /^(?:fx-l\d+-z\d+(?:-i\d+)?-(?:bottom-shelf|top-shelf|shelf-object)|host-scale-fx-l\d+-z\d+(?:-i\d+)?-(?:lower-shelf|upper-shelf))$/.test(e.id)&&
  ['wood','metal','accent'].includes(e.material);
}
export function buildR125BlockExpression({design,scene,palette,origin='HOST_COMPARISON_PALETTE',originalRaw=null}){
 validateR125BlockPalette(palette);
 if(!['HOST_COMPARISON_PALETTE','CALLER_PROVIDED_MODEL_RESPONSE_UNVERIFIED'].includes(origin))fail('ORIGIN');
 if(origin==='CALLER_PROVIDED_MODEL_RESPONSE_UNVERIFIED'){
  if(typeof originalRaw!=='string')fail('RAW_REQUIRED');
  let parsed;try{parsed=JSON.parse(originalRaw)}catch{fail('RAW_JSON')}
  validateR125BlockPalette(parsed?.blockPalette);
  if(roles.some(r=>parsed.blockPalette[r]!==palette[r]))fail('RAW_PALETTE_MISMATCH');
 }else if(originalRaw!==null)fail('UNEXPECTED_RAW');
 const owners=resolveR125FinalOwners(design,scene);
 const elements=new Map(design.elements.map(e=>[e.id,e]));
 const activeRoles=[...baseRoles,...detailRoles.filter(r=>Object.hasOwn(palette,r))];
 const frames=Object.hasOwn(palette,'windowFrame')?windowFrameCells(scene,elements,owners):new Set();
 const coverage=Object.fromEntries(activeRoles.map(r=>[r,{eligible:0,selected:0,changed:0}]));
 const counts={},unclassified=new Set();
 // Compact rows: source x,y,z, original abstract index, final ADD id,
 // semantic role or null, selected concrete candidate (null = no override).
 const rows=scene.primitives.map((p,i)=>{
  const owner=owners[i],element=elements.get(owner);
  const role=(frames.has(i)||(Object.hasOwn(palette,'windowFrame')&&/^relief-window-\d+-/.test(owner)))?'windowFrame':Object.hasOwn(palette,'storage')&&storagePart(element)?'storage':r125ElementRole(element);
  const baseline=legacy[MATERIALS[p[3]]],block=role?palette[role]??null:null;
  if(role){coverage[role].eligible++;
   if(block){coverage[role].selected++;if(block!==baseline)coverage[role].changed++;}
  }else unclassified.add(owner);
  const effective=block??baseline;counts[effective]=(counts[effective]??0)+1;
  return [...p.slice(0,4),owner,role,block];
 });
 const unusedRoles=Object.keys(palette).filter(r=>coverage[r].selected===0);
 const packet={schema:'r125-block-expression-v1',origin,
  originalRawSha256:originalRaw===null?null:createHash('sha256').update(originalRaw).digest('hex'),
  sourceSha256:scene.sourceSha256,geometrySha256:scene.geometrySha256,
  palette:{...palette},rows,coverage,blockCounts:counts,unusedRoles,
  unclassifiedElementIds:[...unclassified].sort(),
  status:unusedRoles.length?'PARTIAL_ROLE_COVERAGE':'ALL_SELECTED_ROLES_MAPPED',
  occupiedVoxels:rows.length,geometryChanged:false,
  blockCompatibility:'PREVIEW_ONLY_EDUCATION_NOT_ATTESTED',
  constructionApproved:false,worldWrites:0,BuildPlan:{operations:[]}};
 return {...packet,expressionSha256:hash(packet)};
}
export function verifyR125BlockExpression(args,packet){
 try{return JSON.stringify(buildR125BlockExpression(args))===JSON.stringify(packet)}catch{return false}
}
/** Pure orthographic face enumeration. Camera looks from +depth, whose
 * world normal is (sin(yaw)*cos(pitch), sin(pitch), cos(yaw)*cos(pitch)).
 * Full visible SOURCE cells are used, so cutaways/material filters expose
 * only actual cells, including furniture and previously hidden surfaces.
 */
export function r125ReviewFaces(cells,yaw,pitch){
 const sy=Math.sin(yaw),cy=Math.cos(yaw),sp=Math.sin(pitch),cp=Math.cos(pitch);
 const depth=[sy*cp,sp,cy*cp],occ=new Set(cells.map(p=>p.slice(0,3).join(',')));
 const faces=[];
 for(const p of cells){
  const [x,y,z]=p;
  const candidates=[
   [0,1,0,[[x,y+1,z],[x+1,y+1,z],[x+1,y+1,z+1],[x,y+1,z+1]],'top'],
   [1,0,0,[[x+1,y,z],[x+1,y,z+1],[x+1,y+1,z+1],[x+1,y+1,z]],'x'],
   [-1,0,0,[[x,y,z],[x,y,z+1],[x,y+1,z+1],[x,y+1,z]],'x'],
   [0,0,1,[[x,y,z+1],[x+1,y,z+1],[x+1,y+1,z+1],[x,y+1,z+1]],'z'],
   [0,0,-1,[[x,y,z],[x+1,y,z],[x+1,y+1,z],[x,y+1,z]],'z']
  ];
  for(const [dx,dy,dz,vertices,axis] of candidates){
   if(dx*depth[0]+dy*depth[1]+dz*depth[2]<=1e-9||occ.has([x+dx,y+dy,z+dz].join(',')))continue;
   const distance=(x+.5+dx*.5)*depth[0]+(y+.5+dy*.5)*depth[1]+(z+.5+dz*.5)*depth[2];
   faces.push({cell:p,vertices,axis,distance,normal:[dx,dy,dz]});
  }
 }
 return faces.sort((a,b)=>a.distance-b.distance);
}
/** Approximate procedural material markings, NOT Minecraft texture assets.
 * Returns only bounded face-local segments; no extra geometry or blocks. */
export function r125ReviewPattern(block,axis){
 if(block.endsWith('_planks'))return [[0,.25,1,.25],[0,.5,1,.5],[0,.75,1,.75],[.35,0,.35,.25],[.7,.5,.7,.75]];
 if(block==='bookshelf'&&axis!=='top')return [[0,.33,1,.33],[0,.66,1,.66],[.17,0,.17,.33],[.36,.33,.36,.66],[.62,.66,.62,1],[.8,0,.8,.33]];
 if(/bricks|tiles/.test(block))return [[0,.5,1,.5],[.25,0,.25,.5],[.75,.5,.75,1]];
 return [];
}
/** Modify only a copy of the viewer template. Old mode uses exact old colors,
 * same camera, same B143 surface and section caps. New mode uses color proxies
 * for explicit overrides only; no claim of real Minecraft textures.
 */
export function makeR125BlockComparisonTemplate(template,args,packet){
 if(!verifyR125BlockExpression(args,packet))fail('EXPRESSION_MISMATCH');
 const colors=Object.fromEntries(packet.rows.filter(r=>r[6]!==null).map(r=>[key(r),catalog[r[6]]]));
 const blocks=Object.fromEntries(packet.rows.map(r=>[key(r),r[6]??legacy[MATERIALS[r[3]]]]));
 const replace=(s,a,b)=>{if(s.indexOf(a)<0||s.indexOf(a)!==s.lastIndexOf(a))fail('VIEWER_ANCHOR');return s.replace(a,b)};
 let t=replace(template,'<div id="materialToggles"></div>',
  '<div id="materialToggles"></div><div class="toggle"><input id="v38Blocks" type="checkbox" checked><label for="v38Blocks">V38 部位別ブロック色（旧表示と比較）</label></div><div class="info warn">色の近似表示のみ。Minecraftテクスチャ・Education施工未認証。選択された部位のみ変更。凡例は元のB143分類。</div><div class="toggle"><input id="v38Shade" type="checkbox" checked><label for="v38Shade">陰影・簡易素材模様・正確な断面</label></div>');
 t=replace(t,'const palette=','const v38Colors='+JSON.stringify(colors)+';\nconst v38Source='+JSON.stringify(packet.geometrySha256)+';\nconst palette=');
 t=replace(t,'const color=palette[m]||"#aabbcc",height=1;',
  'const color=(el("v38Blocks").checked&&s.geometrySha256===v38Source?v38Colors[[x,y,z].join(",")]:null)||palette[m]||"#aabbcc",height=1;');
 t=replace(t,'function drawSoon(){','el("v38Blocks").addEventListener("change",drawSoon);\nel("v38Shade").addEventListener("change",drawSoon);\nfunction drawSoon(){');
 // Preserve the original template and baseline path. Enhanced mode is
 // available only for the specific verified SOURCE, never another gallery.
 const marker=' let painted=0;';
 if(t.includes(marker)){
  t=replace(t,'const palette=','const v38All='+JSON.stringify(args.scene.primitives)+';\nconst v38BlockIds='+JSON.stringify(blocks)+';\n'+r125ReviewFaces.toString()+'\n'+r125ReviewPattern.toString()+'\nconst palette=');
  const enhanced=` let painted=0;
 if(el("v38Shade").checked&&s.geometrySha256===v38Source){
  const cells=v38All.filter(p=>p[4]<=limit&&visible(p));
  for(const f of r125ReviewFaces(cells,yaw,pitch)){
   const p=f.cell,m=s.layerNames[p[3]].slice(5).toLowerCase(),id=v38BlockIds[p.slice(0,3).join(",")];
   const blockMode=el("v38Blocks").checked;
   const color=blockMode?(v38Colors[p.slice(0,3).join(",")]||palette[m]):palette[m];
   const vs=f.vertices.map(q=>project(...q));
   const factor=f.axis==="top"?1.12:f.axis==="x"?.79:.93;
   const rgb=color.slice(1).match(/../g).map(n=>Math.min(255,Math.round(parseInt(n,16)*factor)));
   ctx.globalAlpha=m==="glass"?.80:1;
   ctx.beginPath();ctx.moveTo(...vs[0].slice(0,2));for(const q of vs.slice(1))ctx.lineTo(...q.slice(0,2));ctx.closePath();
   ctx.fillStyle="rgb("+rgb.join(",")+")";ctx.fill();ctx.strokeStyle="#07152124";ctx.lineWidth=.28;ctx.stroke();
   if(blockMode&&scale>=5){
    const point=(u,v)=>[vs[0][0]+u*(vs[1][0]-vs[0][0])+v*(vs[3][0]-vs[0][0]),vs[0][1]+u*(vs[1][1]-vs[0][1])+v*(vs[3][1]-vs[0][1])];
    ctx.strokeStyle="#261b1940";ctx.lineWidth=Math.max(.35,scale*.025);
    for(const [u,v,a,b] of r125ReviewPattern(id,f.axis)){ctx.beginPath();ctx.moveTo(...point(u,v));ctx.lineTo(...point(a,b));ctx.stroke();}
   }
   painted++;
  }
  ctx.globalAlpha=1;
  el("meta").textContent="V38.2 表示セル: "+cells.length+" / SOURCE: "+v38All.length+" ｜露出描画面: "+painted+" ｜簡易模様・陰影（Minecraft画像ではありません）";
  return;
 }`;
  t=replace(t,marker,enhanced);
 }
 return t;
}
