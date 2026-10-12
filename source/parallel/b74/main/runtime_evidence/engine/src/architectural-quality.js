import { programs, styles, massings, facades, grounds } from './building-grammar.js';
import { emitModule } from '../../modules/architectural-library.js';
export const programGrammars = {
 office: { ground:'commercial_lobby', typical:'structural_bays', top:'executive_floor', opening:'curtain_wall_bay', entrance:'entrance_office_lobby', core:'core_glazed_vertical', modules:['curtain_wall_bay','structural_bay'], roof:'roof_mechanical_cluster', materials:{ solid:.25 }, bay:4, gap:1, bottom:1 },
 apartment: { ground:'residential_circulation', typical:'dwelling_rhythm', top:'penthouse', opening:'window_punched_single', entrance:'entrance_residential', core:'core_solid', modules:['window_punched_single','balcony_recessed'], roof:'roof_terrace', materials:{ solid:.65 }, bay:5, gap:3, bottom:2 },
 hotel: { ground:'hotel_lobby', typical:'guest_rooms', top:'suites', opening:'window_vertical_strip', entrance:'entrance_hotel', core:'core_solid', modules:['window_vertical_strip','window_punched_wide'], roof:'roof_crown', materials:{ solid:.5 }, bay:4, gap:2, bottom:1 }
};
// Additional programs can supply a complete quality grammar in their registry rule.
export function qualityComposition(c) {
 const grammar = programs.get(c.program).qualityGrammar ?? programGrammars[c.program] ?? programGrammars.office;
 const style = { density:0, depth:1, moduleStride:2, crown:1, materialShift:0, ...styles.get(c.style).architecture };
 if(c.materialPalette) {style.density+=c.materialPalette.profile.glazing;style.moduleStride+=c.materialPalette.profile.trim===0?2:0;style.crown=c.materialPalette.profile.roof;}
 const index = massings.names().indexOf(c.massing), seed = c.variationSeed;
 const repairs=[];
 if(c.program==='apartment' && c.facadeStrategy==='curtain_wall') { c.requestedFacadeStrategy=c.facadeStrategy; c.facadeStrategy='punched_windows'; repairs.push('Residential curtain wall replaced with dwelling openings'); }
 if(c.massing==='courtyard' && Math.min(c.dimensions.width,c.dimensions.depth)<16) { c.variation.wing=3; repairs.push('Courtyard scaled to minimum safe wings'); }
 return { version:1, stages:['program_grammar','massing_composition','facade_composition','architectural_modules','material_grammar','detail_pass'], grammar, style, repairs, zoning:c.quality==='premium'?3:2, coreSide:index%4, entranceBias:index%3-1, roofVariant:(index+seed)%3, depth:c.quality==='compact'?0:Math.min(2,style.depth+seed%2), bay:Math.max(3,grammar.bay+(index%2)+style.density+(c.dimensions.width>32?2:0)), detail:c.quality==='premium', secondary:c.quality!=='compact' };
}
export function materialGrammar(material) {
 const result={...material, primaryWall:material.primaryWall??material.wall, secondaryWall:material.secondaryWall??material.accent, frame:material.frame??material.structure};
 for(const role of ['primaryWall','secondaryWall','structure','frame','glass','accent','floor','roof','light']) if(!result[role]) throw new Error(`Missing palette role ${role}`);
 // No new IDs: all roles reuse existing palette blocks.
 return result;
}
export function composeFacade(c,q,e,f,base,top,line,annotate,material) {
 const g=q.grammar, ground=f===0, crown=f===c.floorCount-1;
 const spec=facades.get(c.facadeStrategy), groundRule=grounds.get(c.groundFloorStrategy), inset=ground?groundRule.inset:0;
 const run=(a,b,y1,y2,role,phase,depth=0,endDepth=depth)=>line(e,a,b,y1,y2,role,phase,depth,endDepth);
 const context=(a,b,y1,y2)=>({program:c.program,massing:c.massing,start:a,end:b,y1,y2,line:run,inset,annotate,material,depth:q.depth});
 run(e.start,e.end,base+1,top,ground||q.style.materialShift&&crown?'secondaryWall':'primaryWall','solid_wall',inset);
 const bay=ground?(c.program==='hotel'?6:4):q.bay+(spec.bay-4)+(crown?1:0);
 const gap=ground?1:Math.max(1,g.gap+(spec.gap-(c.program==='apartment'?2:1))+(e.sign===1?1:0)-(c.materialPalette?.profile.glazing??0));
 for(let a=e.start+1+c.variation.bayShift,n=0;a<e.end;a+=Math.max(3,bay),n++) {
  const zone=Math.min(q.zoning-1,Math.floor((a-e.start)*q.zoning/(e.end-e.start+1)));
  const b=Math.min(e.end-1,Math.max(a,a+bay-gap-1-(q.detail&&zone===1?1:0))); if(b<a || spec.alternate&&n%2===0 || spec.service&&n%4===0) continue;
  const low=base+(ground?1:Math.max(g.bottom,spec.bottom)), high=top-(ground?0:['hotel','apartment'].includes(c.program)?0:spec.top);
  if(high<low) continue;
  const id=ground?'curtain_wall_bay':crown&&c.program==='hotel'?'window_punched_wide':g.opening;
  if(ground&&!groundRule.glazing) continue;
  if(q.depth) emitModule(id,context(a,b,low,high)); else run(a,b,low,high,'glass','glazing',inset);
  if(c.program==='apartment'&&!ground&&q.secondary&&e.sign===-1&&n%q.style.moduleStride===0) emitModule(['balcony_recessed','balcony_standard','balcony_corner'][c.variationSeed%3],context(a,b,base+1,top));
  if(c.program==='office' && n%2===0) emitModule('structural_bay',context(a-1,a-1,base+1,top));
  if(q.detail&&n%3===0) run(b,b,base+1,top,'accent','accent_zone',0);
 }
 if(!ground&&q.secondary) {
  const coreEdge=(e.axis==='x'?0:2)+(e.sign===1?1:0);
  if(coreEdge===q.coreSide && e.end-e.start>=5) { const t=e.start+1+(c.variationSeed%2); emitModule(g.core,context(t,t+1,base+1,top)); }
  emitModule('horizontal_spandrel',context(e.start,e.end,top,top));
  if(e.end-e.start>=4) run(e.start+1,Math.min(e.end-1,e.start+(q.detail?3:2)),top,top,'accent','secondary_mass',1,2);
 }
 if(c.facadeStrategy==='vertical_bays') run(e.end,e.end,base+1,top,'accent','fin');
 if(c.facadeStrategy==='horizontal_bands'||crown) run(e.start,e.end,top,top,'frame','crown_band');
 if(q.secondary&&c.materialPalette&&c.materialPalette.profile.trim>0&&(q.detail||crown)) {
  emitModule('shape_cornice',context(e.start,e.end,top,top));
  if(q.detail&&c.materialPalette.shapes.trapdoor&&c.materialPalette.profile.shapes>1&&e.end-e.start>=4) emitModule('shape_facade_screen',context(e.start+1,e.end-1,top,top));
 }
}
