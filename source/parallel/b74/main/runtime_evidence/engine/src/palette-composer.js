import { blockCatalog, lookupBlock, colorMatches, catalogSource, compatibility, educationProfile } from './block-catalog.js';
import { shapeStates } from './block-states.js';
export const COMPOSER_REVISION='6b.1';
export const materialStyles={
 modern:{families:['quartz','andesite','concrete'],glazing:0,trim:1,shapes:1,roof:1},
 urban_japanese:{families:['oak','terracotta','concrete'],glazing:-1,trim:1,shapes:2,roof:1},
 industrial:{families:['brick','andesite','copper'],glazing:-1,trim:1,shapes:1,roof:2},
 minimal:{families:['quartz','concrete','sandstone'],glazing:0,trim:0,shapes:1,roof:0},
 premium:{families:['sandstone','quartz','oxidized_copper'],glazing:1,trim:2,shapes:2,roof:2},
 traditional:{families:['brick','sandstone','spruce'],glazing:-1,trim:2,shapes:2,roof:2}
};
export function normalizeMaterialRequirements(r={}) {
 if(!r||typeof r!=='object'||Array.isArray(r)||Object.keys(r).some(k=>!['color','materialFamilies','glazing'].includes(k))) throw new Error('Invalid materialRequirements');
 if(r.color&&!['white','warm','neutral','gray','black','brown','red','orange','yellow','green','blue','cyan','pink','purple','lime','magenta','light_blue','light_gray'].includes(r.color)) throw new Error('Unsupported material color');
 if(r.materialFamilies&&(!Array.isArray(r.materialFamilies)||!r.materialFamilies.length||r.materialFamilies.length>3||r.materialFamilies.some(f=>!blockCatalog.some(b=>b.safetyClassification==='building'&&(b.family===f||b.materialCategory===f))))) throw new Error('Unsupported material families');
 if(r.glazing&&!['low','balanced','high'].includes(r.glazing)) throw new Error('Unsupported glazing');
 return structuredClone(r);
}
export function composePalette({program='office',style='modern',massing='slab',quality='standard',seed=0,materialRequirements={}}={},education=educationProfile) {
 const candidates=(family,form='full_block',color)=>blockCatalog.filter(b=>b.safetyClassification==='building'&&compatibility(b.id,{},education)!=='unsupported'&&b.form===form&&(b.family===family||b.materialCategory===family)&&(!color||colorMatches(b.colorFamily,color))).sort((a,b)=>a.id.localeCompare(b.id));
 const req=normalizeMaterialRequirements(materialRequirements),profile=materialStyles[style];
 if(!profile) throw new Error('Unsupported material style');
 if(!['compact','standard','premium'].includes(quality)||!Number.isInteger(seed)||seed<0||seed>2147483647) throw new Error('Invalid palette quality/seed');
 const programFamilies={office:['quartz','andesite','concrete'],apartment:['concrete','oak','terracotta'],hotel:['brick','sandstone','quartz']}[program]??['stone','quartz','oak'];
 const choices=req.materialFamilies??(style==='modern'?programFamilies:profile.families);
 const index=(seed+(massing==='tower_on_podium'?1:0))%choices.length;
 const mainFamily=choices[index], main=candidates(mainFamily,'full_block',req.color);
 // Explicit color may select a different compatible family, never silently ignore it.
 const pool=main.length?main:choices.flatMap(f=>candidates(f,'full_block',req.color));
 if(!pool.length) throw new Error('No compatible material satisfies color/family requirements');
 const preferred={quartz:'quartz_block',andesite:'polished_andesite',concrete:program==='apartment'?'light_gray_concrete':'white_concrete',brick:'brick_block',sandstone:'sandstone',oak:'oak_planks',terracotta:'white_terracotta'};
 const primary=pool.find(b=>b.id===`minecraft:${preferred[mainFamily]}`)??pool[seed%pool.length];
 const pick=(family,offset=0)=>{const list=candidates(family);if(!list.length) throw new Error(`No building material for ${family}`);return list[(seed+offset)%list.length].id;};
 const secondaryFamily=req.materialFamilies?.[1]??(style==='minimal'?'sandstone':program==='apartment'?'oak':program==='hotel'?'sandstone':'stone');
 const secondary=pick(secondaryFamily);
 const roles={primaryWall:primary.id,secondaryWall:secondary,structure:'minecraft:stone',frame:pick(style==='industrial'?'blackstone':'andesite'),glazing:'minecraft:glass',accent:secondary,floor:pick(program==='hotel'?'sandstone':'stone',1),roof:pick('stone',2),trim:primary.id,detail:secondary,lighting:'minecraft:sea_lantern'};
 for(const family of req.materialFamilies??[]) if(!Object.values(roles).some(id=>{const b=lookupBlock(id);return b.family===family||b.materialCategory===family;})) roles.detail=pick(family);
 for(const [role,id] of Object.entries(roles)) if(compatibility(id,{},education)==='unsupported') {
  const replacement=blockCatalog.find(b=>b.safetyClassification==='building'&&b.architecturalRoles.includes(role)&&b.form===lookupBlock(id).form&&compatibility(b.id,{},education)!=='unsupported');
  if(!replacement) throw new Error(`No compatible replacement for ${role}`);roles[role]=replacement.id;
 }
 const shapes={};
 if(quality!=='compact') {
  const roleFamilies=[...new Set(Object.values(roles).map(id=>lookupBlock(id).family))];
  for(const form of ['slab','stairs','wall','fence','pane','trapdoor','pillar/log']) {
   const list=(form==='pane'?['glass']:roleFamilies).flatMap(family=>candidates(family,form)).filter(b=>roleFamilies.includes(b.family));
   if(list.length) shapes[form]=list[seed%list.length].id;
  }
 if(!shapes.slab) {const candidate=candidates('stone','slab')[0];if(candidate)shapes.slab=candidate.id;}
 if(!shapes.stairs) {const candidate=candidates('stone','stairs')[0];if(candidate)shapes.stairs=candidate.id;}
 }
 return {revision:COMPOSER_REVISION,catalogRevision:catalogSource.revision,roles,shapes,profile:{...profile,glazing:req.glazing==='high'?1:req.glazing==='low'?-1:req.glazing==='balanced'?0:profile.glazing},requirements:req,summary:`${program}/${style}: ${primary.family} + ${lookupBlock(secondary).family}`,seed};
}

export function composeProductionPalette(input={},education=educationProfile) {
 const palette=composePalette(input,education),verifiedFull=blockCatalog.filter(b=>b.safetyClassification==='building'&&b.form==='full_block'&&compatibility(b.id,{},education)==='verified').sort((a,b)=>a.id.localeCompare(b.id));
 const missing=[];
 for(const [role,id] of Object.entries(palette.roles)) if(compatibility(id,{},education)!=='verified') {
  const replacement=verifiedFull.find(b=>b.architecturalRoles.includes(role))??(role==='lighting'?null:verifiedFull[0]);
  if(replacement)palette.roles[role]=replacement.id;else delete palette.roles[role];
 }
 for(const [form,id] of Object.entries(palette.shapes)) {
  const candidates=[lookupBlock(id),...blockCatalog].filter((b,i,a)=>b&&a.findIndex(x=>x?.id===b.id)===i&&b.safetyClassification==='building'&&b.form===form);
  const usable=candidates.find(b=>{const states=b.form==='stairs'?['north','east','south','west'].map(d=>shapeStates(b.id,d)):b.form==='slab'?[shapeStates(b.id)]:b.form==='trapdoor'?[{...shapeStates(b.id),open_bit:false}]:[shapeStates(b.id)];return states.every(s=>compatibility(b.id,s,education)==='verified');});
  if(usable)palette.shapes[form]=usable.id;else delete palette.shapes[form];
 }
 for(const [role,id] of Object.entries(palette.roles))if(compatibility(id,{},education)!=='verified')missing.push({role,id,status:compatibility(id,{},education)});
 if(missing.length||!Object.keys(palette.roles).length)throw new Error(`Production palette requires verified materials: ${JSON.stringify(missing)}`);
 return {...palette,productionReady:true,verifiedOnly:true};
}
