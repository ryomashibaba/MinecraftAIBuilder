// Geometry stays material-independent: modules emit palette roles through a local surface adapter.
export const architecturalModules = new Map();
export function registerModule(spec) {
  if (!spec.id || architecturalModules.has(spec.id) || typeof spec.generate !== 'function') throw new Error('Invalid module');
  architecturalModules.set(spec.id, Object.freeze(spec));
}
export function emitModule(id, context) {
  const m = architecturalModules.get(id);
  if (!m) throw new Error(`Unknown module ${id}`);
  if (!m.compatiblePrograms.includes(context.program) && !m.compatiblePrograms.includes('*')) throw new Error(`Incompatible program for ${id}`);
  if (!m.compatibleMassing.includes('*') && !m.compatibleMassing.includes(context.massing)) throw new Error(`Incompatible massing for ${id}`);
  if (context.end - context.start + 1 < m.minimumDimensions.width || context.y2 - context.y1 + 1 < m.minimumDimensions.height) throw new Error(`Module dimensions too small: ${id}`);
  for (const role of m.requiredPaletteRoles) if(context.material && role!=='air' && !context.material[role]) throw new Error(`Missing module palette role ${role}`);
  const tag=()=>context.annotate?.(id,`${id}:${context.start}:${context.y1}:${context.end}`);
  m.generate({...context, line:context.line && ((...args)=>{context.line(...args);tag();}), box:context.box && ((...args)=>{context.box(...args);tag();})});
}
const define = (category, id, programs, depth, roles, generate, width = 1) => registerModule({ id, category, architecturalRole: category, compatiblePrograms: programs, compatibleMassing: ['*'], minimumDimensions: { width, height: 1 }, requiredPaletteRoles: roles, depth, qualityCost: depth + 1, constraints: ['stay_inside_build_envelope'], generate });
for (const [id, depth] of [['window_punched_single',1],['window_punched_wide',1],['window_vertical_strip',2],['curtain_wall_bay',1]]) define('windows',id,['*'],depth,['glass','frame'], c => { const layer=c.depth??depth; c.line(c.start,c.end,c.y1,c.y2,'air','opening_reveal',0,layer-1); c.line(c.start,c.end,c.y1,c.y2,'glass','glazing',layer); c.line(c.start,c.end,c.y1-1,c.y1-1,'frame','secondary_frame',0); });
for (const id of ['balcony_standard','balcony_recessed','balcony_corner']) define('balconies',id,['apartment'],2,['floor','accent'],c => { const layer=id==='balcony_recessed'?1:0; c.line(c.start,c.end,c.y1,c.y1,'floor','balcony',layer,layer+1); c.line(c.start,c.end,c.y1+1,c.y1+1,'accent','balcony_rail',layer); if(id==='balcony_corner')c.line(c.end,c.end,c.y1,c.y1+2,'frame','balcony_return',0,1); });
for (const [id,program,width] of [['entrance_office_lobby','office',4],['entrance_residential','apartment',2],['entrance_hotel','hotel',5]]) define('entrances',id,[program],1,['air','frame'],c => { c.line(c.start,c.end,c.y1,c.y2,'air','entrance',0,c.inset+1); c.line(c.start-1,c.start-1,c.y1,c.y2,'frame','entrance_frame',c.inset); },width);
define('canopies','entrance_canopy',['*'],2,['roof'],c => c.line(c.start,c.end,c.y2,c.y2,'roof','canopy',0,1));
define('facade','horizontal_spandrel',['*'],1,['secondaryWall'],c => c.line(c.start,c.end,c.y2,c.y2,'secondaryWall','horizontal_element',0));
define('columns','structural_bay',['*'],1,['structure'],c => c.line(c.start,c.start,c.y1,c.y2,'structure','primary_structure',0));
for (const id of ['core_solid','core_glazed_vertical']) define('cores',id,['*'],2,['accent','glass'],c => c.line(c.start,c.end,c.y1,c.y2,id==='core_solid'?'accent':'glass','vertical_core',0));
for (const [category,id] of [['roofs','roof_crown'],['terraces','roof_terrace'],['service','roof_mechanical_cluster']]) define(category,id,['*'],2,['roof','secondaryWall'],c => c.box(id==='roof_terrace'?'roof':'secondaryWall',c.from,c.to,id,id));
define('lighting','entrance_light',['*'],1,['light'],c => c.line(c.start,c.end,c.y2,c.y2,'light','lighting',1));
define('facade','shape_cornice',['*'],1,['trim'],c=>c.line(c.start,c.end,c.y2,c.y2,'trim','detail_cornice',0));
define('facade','shape_facade_screen',['*'],2,['detail'],c=>{c.line(c.start,c.end,c.y2,c.y2,'detail','screen_support',2);c.line(c.start,c.end,c.y2,c.y2,'detail','facade_screen',1);});
