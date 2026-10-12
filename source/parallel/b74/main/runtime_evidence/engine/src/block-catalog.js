import fs from 'node:fs';
const read = name => fs.readFileSync(new URL(`../../catalog/${name}`, import.meta.url), 'utf8');
export const catalogSource = JSON.parse(read('sources/manifest.json'));
const semantic = JSON.parse(read('semantic.json'));
const semanticOverrides = JSON.parse(read('semantic-overrides.json'));
export const educationProfile = JSON.parse(read('education.json'));
export const FORMS = ['full_block','slab','stairs','wall','fence','pane','door','trapdoor','pillar/log','light','decorative','other'];
const stateDefinitions = {};
for (const line of (read('sources/IntrinsicBlockStatesList.md')+'\n'+read('sources/BlockStateAndTraitListings.md')).split('\n')) {
 const cols=line.split('|').slice(1,-1).map(s=>s.trim());
 if(cols.length<3 || !['Boolean','Integer','String'].includes(cols[1])) continue;
 const [key,type,raw]=cols; let values;
 if(type==='Boolean') values=[false,true];
 else if(type==='Integer') { const range=raw.match(/^(\d+)\s*-\s*(\d+)$/); if(range) values=Array.from({length:+range[2]-+range[1]+1},(_,i)=>i+(+range[1])); else if(/^\d+(,\s*\d+)*$/.test(raw)) values=raw.split(',').map(Number); }
 else if(/^[a-z_]+(,\s*[a-z_]+)*$/.test(raw)) values=raw.split(',').map(s=>s.trim());
 if(values) stateDefinitions[key]={type:type.toLowerCase(),values};
}
for (const key of ['cardinal_direction','vertical_half','corner','facing_direction']) {
 const values={cardinal_direction:['north','south','east','west'],vertical_half:['bottom','top'],corner:['inner_left','inner_right','outer_left','outer_right','none'],facing_direction:['down','up','north','south','east','west']}[key];
 stateDefinitions[`minecraft:${key}`]={type:'string',values};
}
// Legacy wall signs use numeric facing_direction, as documented in the official aux map.
const legacyFacing={type:'integer',values:[0,1,2,3,4,5]};
const map=new Map();
const colors=['white','orange','magenta','light_blue','yellow','lime','pink','gray','light_gray','cyan','purple','blue','brown','green','red','black'];
const unsafeId=/(?:^|_)(?:tnt|command|structure|water|lava|fire|soul_fire|redstone|piston|observer|repeater|comparator|sand|gravel|powder|portal|barrier|allow|deny|border_block|chest|barrel|shulker_box|dispenser|dropper|hopper|furnace|brewing_stand|beacon|spawner)(?:_|$)/;
function inferSemantic(short){
 const form=/_stairs$/.test(short)?'stairs':/_slab$/.test(short)?'slab':/_wall$/.test(short)?'wall':/_fence$/.test(short)&&!short.endsWith('_fence_gate')?'fence':/_glass_pane$|_pane$/.test(short)?'pane':/(_log|_stem|_hyphae|_pillar)$/.test(short)?'pillar/log':/_trapdoor$/.test(short)?'trapdoor':/(_door|_gate)$/.test(short)?'door':/(sea_lantern|lantern|torch|glowstone|shroomlight|light_block)$/.test(short)?'light':'full_block';
 const family=/quartz/.test(short)?'quartz':/concrete/.test(short)?'concrete':/terracotta/.test(short)?'terracotta':/copper/.test(short)?'copper':/iron|gold|metal/.test(short)?'metal':/brick/.test(short)?'brick':/wood|planks|log|stem|hyphae|bamboo|acacia|birch|cherry|dark_oak|jungle|mangrove|oak|spruce|crimson|warped/.test(short)?'wood':/stone|andesite|diorite|granite|deepslate|blackstone|basalt|tuff|sandstone/.test(short)?'stone':/glass/.test(short)?'glass':'unknown';
 const color=colors.find(c=>short.startsWith(`${c}_`)||short.includes(`_${c}_`)||short.endsWith(`_${c}`))??(/quartz|snow/.test(short)?'white':/stone|andesite/.test(short)?'gray':/wood|log|planks/.test(short)?'brown':'unknown');
 const redstone=/rail|redstone|_wire$|lever|button|pressure_plate|tripwire|target|daylight_detector|lightning_rod|sculk_sensor/.test(short),plant=/flower|dandelion|tulip|orchid|allium|poppy|sapling|crop|wheat|carrot|potato|beetroot|berry|bamboo|cactus|sugar_cane|vine|grass|fern|mushroom|azalea|leaves|lily_pad|kelp|seagrass|coral/.test(short),liquid=/water|lava/.test(short),technical=/command|structure|barrier|allow|deny|portal|spawner|bedrock/.test(short);
 const survivalRequirement=redstone?'rail_or_redstone_support':plant?'special_plant_support':/lantern|torch|chain|iron_bars/.test(short)?'wall_or_ceiling_support':'none';
 const commandPlacementClass=redstone||technical?'technical_excluded':liquid||plant?'environment_dependent':/lantern|torch|chain|iron_bars/.test(short)?'support_above':(['slab','stairs','wall','fence','pane','trapdoor','pillar/log','light'].includes(form)?'free_space_stable':'free_space_stable');
 const supportRequirement=survivalRequirement==='none'?'none':'placement_support',environmentRequirement=liquid?'liquid':plant?'light_or_biome':redstone?'redstone_or_rail_context':'none';
 const verificationFixtureType=commandPlacementClass==='free_space_stable'?'free_space':commandPlacementClass==='support_above'?'solid_support_above':commandPlacementClass==='technical_excluded'?'unsupported_by_current_harness':commandPlacementClass==='environment_dependent'?'unsupported_by_current_harness':'free_space';
 const architecturalEligibility=commandPlacementClass==='free_space_stable'&&family!=='unknown'&&!unsafeId.test(short)&&!redstone&&!plant&&!liquid&&!technical?'tier_a':'excluded';
 return {family,materialCategory:family,colorFamily:color,textureCharacter:['stairs','slab','wall'].includes(form)?'masonry':family==='wood'?'grain':'unknown',form,architecturalRoles:form==='full_block'?['primaryWall','secondaryWall','structure','frame','accent','floor','roof','trim','detail']:form==='light'?['lighting','detail']:['detail'],applicablePrograms:['office','apartment','hotel'],applicableStyles:['modern','urban_japanese','industrial','minimal','premium','traditional'],supportRequirements:[],orientationRequirements:[],supportRequirement,survivalRequirement,commandPlacementClass,architecturalEligibility,environmentRequirement,verificationFixtureType,semanticSource:'inferred',safetyClassification:(unsafeId.test(short)||redstone||plant||liquid||technical)?'excluded':family!=='unknown'?'building':'unknown'};
}
function canonicalPlacement(short,form,family){
 const rail=/rail|redstone|_wire$|lever|button|pressure_plate|tripwire|target|daylight_detector|lightning_rod|sculk_sensor/.test(short), plant=/flower|dandelion|tulip|orchid|allium|poppy|sapling|crop|wheat|carrot|potato|beetroot|berry|bamboo|cactus|sugar_cane|vine|grass|fern|mushroom|azalea|leaves|lily_pad|kelp|seagrass|coral/.test(short), liquid=/water|lava/.test(short), technical=/command|structure|barrier|allow|deny|portal|spawner|bedrock/.test(short);
 const attachedLantern=/(^|_)lantern$/.test(short)&&short!=='sea_lantern';
 const survivalRequirement=rail?'rail_or_redstone_support':plant?'special_plant_support':attachedLantern||/chain|iron_bars/.test(short)?'wall_or_ceiling_support':/torch/.test(short)?'wall_attachment':'none';
 const commandPlacementClass=rail||technical?'technical_excluded':liquid||plant?'environment_dependent':attachedLantern||/chain|iron_bars/.test(short)?'support_above':/torch/.test(short)?'wall_attachment':'free_space_stable';
 const verificationFixtureType=commandPlacementClass==='free_space_stable'?'free_space':commandPlacementClass==='support_above'?'solid_support_above':commandPlacementClass==='wall_attachment'?'wall_attachment':commandPlacementClass==='technical_excluded'||commandPlacementClass==='environment_dependent'?'unsupported_by_current_harness':'free_space';
 const architecturalEligibility=commandPlacementClass==='free_space_stable'&&family!=='unknown'&&!unsafeId.test(short)&&!rail&&!plant&&!liquid&&!technical?'tier_a':'excluded';
 return {survivalRequirement,commandPlacementClass,verificationFixtureType,architecturalEligibility};
}
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
for(const match of read('sources/Blocks.md').matchAll(/\| (minecraft:[a-z0-9_]+) \|([^|]*)\|/g)) {
 const id=match[1],short=id.slice(10), keys=match[2].split(',').map(s=>s.trim()).filter(Boolean);
 const override=semanticOverrides.blocks?.[id]??semanticOverrides.blocks?.[short]??{};
 const meta={...inferSemantic(short),...(semantic[short]?{...semantic[short],semanticSource:'manual'}:{}),...override,...(Object.keys(override).length?{semanticSource:'manual'}:{})};
 const unsafe=unsafeId.test(short);
 const states=Object.fromEntries(keys.map(k=>[k,k==='facing_direction'&&short.endsWith('wall_sign')?legacyFacing:stateDefinitions[k]??{type:'unknown',values:[]} ]));
 const entry={id,family:'unknown',materialCategory:'unknown',colorFamily:'unknown',textureCharacter:'unknown',form:'other',architecturalRoles:[],applicablePrograms:[],applicableStyles:[],supportRequirements:[],orientationRequirements:keys,...meta,...canonicalPlacement(short,meta.form,meta.family),states,safetyClassification:unsafe?'excluded':meta.safetyClassification??'unknown',educationStatus:'documented',source:catalogSource.revision};
 map.set(id,freeze(entry));
}
export const blockCatalog=Object.freeze([...map.values()]);
export function lookupBlock(id) {return map.get(id?.includes(':')?id:`minecraft:${id}`);}
export function validateBlockStates(id,states={}) {
 const b=lookupBlock(id); if(!b) throw new Error(`Unknown catalog block: ${id}`);
 if(!states || typeof states!=='object'||Array.isArray(states)) throw new Error('Invalid blockStates');
 for(const [key,value] of Object.entries(states)) if(!b.states[key]?.values.includes(value)) throw new Error(`Unknown or invalid state ${id}.${key}`);
 return states;
}
export function compatibility(id,states={},profile=educationProfile) {
 const b=lookupBlock(id); if(!b) return 'unknown';
 validateBlockStates(id,states);
 const records=profile.records??[];
 const matches=records.filter(r=>r.id===b.id&&r.environment===profile.environment&&r.evidence&&r.educationVersion&&r.educationVersion===profile.educationVersion);
 if(matches.some(r=>r.status==='unsupported'&&JSON.stringify(Object.entries(r.states??{}).sort())===JSON.stringify(Object.entries(states).sort()))) return 'unsupported';
 if(profile.environment && matches.some(r=>r.status==='verified'&&JSON.stringify(Object.entries(r.states??{}).sort())===JSON.stringify(Object.entries(states).sort()))) return 'verified';
 if(profile.environment && matches.some(r=>r.status==='unknown'&&JSON.stringify(Object.entries(r.states??{}).sort())===JSON.stringify(Object.entries(states).sort()))) return 'unknown';
 return b.educationStatus;
}
export function searchBlocks(query={},profile=educationProfile) {
 const {role,form,color,materialFamily,style,program,verifiedOnly=false,limit=20}=query;
 if(!Number.isInteger(limit)||limit<1||limit>50) throw new Error('limit must be 1–50');
 if(form&&!FORMS.includes(form)) throw new Error('Unknown block form');
 const styleCategories={modern:['glass','concrete','stone'],urban_japanese:['wood','ceramic','concrete'],industrial:['masonry','metal','stone'],minimal:['concrete','stone','glass'],premium:['stone','metal','glass'],traditional:['wood','masonry','stone']}[style]??[];
 const programCategories={office:['glass','stone','concrete'],apartment:['wood','concrete','ceramic'],hotel:['masonry','stone','wood']}[program]??[];
 const score=b=>(role?10:0)+(form?10:0)+(color?10:0)+(materialFamily?10:0)+(styleCategories.includes(b.materialCategory)?4-styleCategories.indexOf(b.materialCategory):0)+(programCategories.includes(b.materialCategory)?3-programCategories.indexOf(b.materialCategory):0)+(compatibility(b.id,{},profile)==='verified'?1:0);
 return blockCatalog.filter(b=>b.safetyClassification==='building'&&compatibility(b.id,{},profile)!=='unsupported'&&(!verifiedOnly||compatibility(b.id,{},profile)==='verified')&&(!role||b.architecturalRoles.includes(role))&&(!form||b.form===form)&&(!color||colorMatches(b.colorFamily,color))&&(!materialFamily||b.family===materialFamily||b.materialCategory===materialFamily)&&(!style||b.applicableStyles.includes(style))&&(!program||b.applicablePrograms.includes(program)))
 .sort((a,b)=>score(b)-score(a)||a.id.localeCompare(b.id)).slice(0,limit).map(b=>({id:b.id,family:b.family,form:b.form,color:b.colorFamily,roles:b.architecturalRoles,educationStatus:compatibility(b.id,{},profile),score:score(b),reason:`${b.family}/${b.textureCharacter}; ${role??'architectural material'}; ${program??'any program'}/${style??'any style'}`}));
}
export function colorMatches(actual,requested) {return actual===requested || requested==='warm'&&['brown','red','orange','yellow','pink'].includes(actual) || requested==='white'&&actual==='light_gray' || requested==='neutral'&&['white','gray','light_gray','black'].includes(actual);}
export function assertMaterialCompatibility(operations,profile=educationProfile) {
 const missing=[];
 for(const o of operations) {
  if(o.block==='air'||o.block==='minecraft:air') {if(Object.keys(o.blockStates??{}).length) throw new Error('air cannot have states');continue;}
  const b=lookupBlock(o.block);
  if(!b||b.safetyClassification!=='building') throw new Error(`Unsafe or unclassified material: ${o.block}`);
  if(compatibility(o.block,o.blockStates??{},profile)!=='verified') missing.push({id:b.id,states:o.blockStates??{}});
 }
 if(missing.length) throw new Error(`Education verification required: ${JSON.stringify([...new Map(missing.map(m=>[JSON.stringify(m),m])).values()])}`);
}
export function materialCompatibilityReport(operations,profile=educationProfile) {
 const materials=[...new Map(operations.filter(o=>!['air','minecraft:air'].includes(o.block)).map(o=>{const entry={id:lookupBlock(o.block)?.id??o.block,states:o.blockStates??{}};return [JSON.stringify(entry),entry];})).values()].map(entry=>({...entry,status:compatibility(entry.id,entry.states,profile)}));
 return {materials,verificationRequired:materials.filter(m=>m.status!=='verified'),executionReady:materials.every(m=>m.status==='verified'&&lookupBlock(m.id)?.safetyClassification==='building')};
}
