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
 glass:'#5be0e8',glowstone:'#f9dc80'
};
export const BLOCK_COLORS=Object.freeze(catalog);
const legacy=Object.freeze({stone:'stone',concrete:'white_concrete',metal:'iron_block',
 glass:'glass',wood:'oak_planks',glow:'glowstone',accent:'yellow_concrete'});
const roles=Object.freeze(['floor','wall','roof','trim','furniture']);
const opaque=Object.keys(catalog).filter(x=>!['glass','glowstone'].includes(x));
const wood=opaque.filter(x=>x.endsWith('_planks'));
const choices=role=>role==='furniture'?wood:opaque;
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
const instruction='OPTIONAL blockPalette: choose actual full blocks for floor, wall, roof, trim (existing piers/fins/frame) and furniture (wood parts only). Omit unused roles. Allowed IDs: '+opaque.join('|')+'. Furniture: planks only. Keep materials as the required B143 coarse geometry palette; blockPalette is your explicit visual choice, never changes geometry, glass or light. Do not invent extra blocks or features.';
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
 if(/^(?:l\d+-(?:fin|screen)-\d+|space-\d+-front-pier-\d+|entry-portal-pier-\d+|entry-portal-lintel|entry-canopy-support-(?:left|right)|detail-covered-entry-pier-\d+|spatial-daylight-bay-\d+-(?:left-fin|right-fin|sill|head)|portico-front-spandrel)$/.test(id))return 'trim';
 if(/^(?:l\d+-(?:west|east|front|rear|divider|secondary-divider|(?:rear|side)-divider-\d+|recess-(?:west|east|rear)-wall)|space-\d+-(?:west|east|front|rear|shed-riser-\d+|(?:ridge|shed|gable)-gable-\d+-\d+|shed-high-end)|roof-monitor-riser-.+|roof-raised-eave-[ab]-\d+|roof-raised-terminal-gable|roof-hip-inner-(?:front|rear|west|east)|portico-(?:west-return|east-return|rear-wall)|u-court-(?:return-west|return-east|interior-wall)|front-court-(?:side|inner)-wall|recess-outer-roof-seal-[xz]-\d+|detail-entry-(?:return|back)-\d+|(?:deep-east|deep-rear|front-terrace)-parapet-.+)$/.test(id))return 'wall';
 if(/^(?:roof|roof-base|roof-monitor-(?:low|high)|roof-one-cell-eave-.+|roof-raised-skin-.+|roof-tapered-riser-\d+|roof-profile-\d+|roof-pitched-eave-.+|roof-hip-(?:\d+-(?:front|rear|west|east)|ridge|eave-.+)|space-\d+-(?:roof|(?:ridge|shed|gable)-skin-\d+|gable-riser-\d+)|entry-canopy-roof|detail-covered-entry-canopy|detail-entry-canopy|detail-eave-.+)$/.test(id))return 'roof';
 return null;
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
 const coverage=Object.fromEntries(roles.map(r=>[r,{eligible:0,selected:0,changed:0}]));
 const counts={},unclassified=new Set();
 // Compact rows: source x,y,z, original abstract index, final ADD id,
 // semantic role or null, selected concrete candidate (null = no override).
 const rows=scene.primitives.map((p,i)=>{
  const owner=owners[i],role=r125ElementRole(elements.get(owner));
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
/** Modify only a copy of the viewer template. Old mode uses exact old colors,
 * same camera, same B143 surface and section caps. New mode uses color proxies
 * for explicit overrides only; no claim of real Minecraft textures.
 */
export function makeR125BlockComparisonTemplate(template,args,packet){
 if(!verifyR125BlockExpression(args,packet))fail('EXPRESSION_MISMATCH');
 const colors=Object.fromEntries(packet.rows.filter(r=>r[6]!==null).map(r=>[key(r),catalog[r[6]]]));
 const replace=(s,a,b)=>{if(s.indexOf(a)<0||s.indexOf(a)!==s.lastIndexOf(a))fail('VIEWER_ANCHOR');return s.replace(a,b)};
 let t=replace(template,'<div id="materialToggles"></div>',
  '<div id="materialToggles"></div><div class="toggle"><input id="v38Blocks" type="checkbox" checked><label for="v38Blocks">V38 部位別ブロック色（旧表示と比較）</label></div><div class="info warn">色の近似表示のみ。Minecraftテクスチャ・Education施工未認証。選択された部位のみ変更。凡例は元のB143分類。</div>');
 t=replace(t,'const palette=','const v38Colors='+JSON.stringify(colors)+';\nconst palette=');
 t=replace(t,'const color=palette[m]||"#aabbcc",height=1;',
  'const color=(el("v38Blocks").checked?v38Colors[[x,y,z].join(",")]:null)||palette[m]||"#aabbcc",height=1;');
 t=replace(t,'function drawSoon(){','el("v38Blocks").addEventListener("change",drawSoon);\nfunction drawSoon(){');
 return t;
}
