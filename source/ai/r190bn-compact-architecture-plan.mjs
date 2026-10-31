/** Compact MODEL-authored design choices. Zero placement, repair, provider or world I/O.
 * Geometry is intentionally NOT claimed: later solvers preserve authored choices or HOLD.
 */
import {createHash} from 'node:crypto';
export const ARCHITECTURE_PLAN_SCHEMA='minecraftaibuilder-architecture-plan-v1';
const F=x=>{throw Error('R190_ARCHPLAN_'+x);};
const ok=(v,tag)=>{if(!v)F(tag);};
const exact=(v,keys)=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const slug=v=>typeof v==='string'&&/^[a-z][a-z0-9-]{2,39}$/.test(v);
const str=(v,a,b)=>typeof v==='string'&&v.length>=a&&v.length<=b&&!/[\u0000-\u001f<>]/.test(v);
const int=(n,a,b)=>Number.isSafeInteger(n)&&n>=a&&n<=b;
const dir=['north','south','east','west'];
const mat=['stone','concrete','metal','glass','wood','glow','accent'];
const failClosed=()=>({sourceOnly:true,geometryCompiled:false,modelCalls:0,
 worldContacts:0,worldWrites:0,readiness:'NOT_PREPARED',
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},art:'ART_HOLD',
 architecturalQuality:'NOT_CERTIFIED',minecraftWalking:'NOT_TESTED'});
export function inspectCompactArchitecturePlan(p,{originalBrief}={}){
 ok(exact(p,['schema','id','title','originalBriefSha256','site','stories','adjacency',
  'entry','verticalLinks','massing','roof','openings','materials','assumptions','unmetRequirements']), 'FIELDS');
 ok(p.schema===ARCHITECTURE_PLAN_SCHEMA&&slug(p.id)&&str(p.title,1,100), 'IDENTITY');
 ok(/^[a-f0-9]{64}$/.test(p.originalBriefSha256??''), 'HASH');
 if(originalBrief!==undefined){
  ok(originalBrief instanceof Uint8Array&&originalBrief.length>=8&&originalBrief.length<=20000,'ORIGINAL_BRIEF_BYTES');
  ok(createHash('sha256').update(originalBrief).digest('hex')===p.originalBriefSha256,'BRIEF_BINDING');
 }
 ok(exact(p.site,['width','depth','height'])&&int(p.site.width,16,128)&&
  int(p.site.depth,16,128)&&int(p.site.height,8,96)&&
  p.site.width*p.site.depth*p.site.height<=500000,'SITE');
 ok(Array.isArray(p.stories)&&p.stories.length>=1&&p.stories.length<=4,'STORIES');
 const stories=new Map(),spaces=new Map(),heights=[];
 let standingY=1;
 for(const story of p.stories){
  ok(exact(story,['id','clearHeight','spaces'])&&slug(story.id)&&!stories.has(story.id)&&
   int(story.clearHeight,4,14)&&Array.isArray(story.spaces)&&story.spaces.length>=1&&
   story.spaces.length<=5,'STORY');
  stories.set(story.id,{index:stories.size,standingY});
  heights.push({storyId:story.id,standingY,derivedBy:'ARITHMETIC_FROM_AUTHOR_CLEARHEIGHT'});
  for(const s of story.spaces){
   ok(exact(s,['id','purpose','width','depth','privacy'])&&slug(s.id)&&!spaces.has(s.id)&&
    str(s.purpose,3,180)&&int(s.width,5,36)&&int(s.depth,5,36)&&
    s.width<=p.site.width-2&&s.depth<=p.site.depth-2&&
    ['public','shared','private'].includes(s.privacy),'SPACE');
   spaces.set(s.id,story.id);
  }
  standingY+=story.clearHeight+1;
 }
 ok(standingY-1<p.site.height,'VERTICAL_SITE_OVERFLOW');
 ok(spaces.size<=12,'SPACE_BUDGET');
 ok(exact(p.entry,['spaceId','face'])&&spaces.has(p.entry.spaceId)&&
  spaces.get(p.entry.spaceId)===p.stories[0].id&&dir.includes(p.entry.face),'ENTRY');
 ok(Array.isArray(p.adjacency)&&p.adjacency.length<=16,'ADJACENCY');
 const seenRel=new Set();
 for(const r of p.adjacency){
  ok(exact(r,['a','b','relation'])&&spaces.has(r.a)&&spaces.has(r.b)&&r.a!==r.b&&
   ['door','open','visual'].includes(r.relation),'ADJACENCY_ENTRY');
  ok(r.relation==='visual'||spaces.get(r.a)===spaces.get(r.b),'CROSS_STORY_DOOR_UNSUPPORTED');
  const key=[r.a,r.b].sort().join('|');ok(!seenRel.has(key),'DUPLICATE_ADJACENCY');seenRel.add(key);
 }
 ok(Array.isArray(p.verticalLinks)&&p.verticalLinks.length<=8,'VERTICAL_LINKS');
 const linked=new Set();
 for(const v of p.verticalLinks){
  ok(exact(v,['fromStory','toStory','fromSpace','toSpace','kind','side','width'])&&
   stories.has(v.fromStory)&&stories.has(v.toStory)&&spaces.get(v.fromSpace)===v.fromStory&&
   spaces.get(v.toSpace)===v.toStory&&
   stories.get(v.toStory).index===stories.get(v.fromStory).index+1&&
   ['straight','switchback','spiral'].includes(v.kind)&&dir.includes(v.side)&&int(v.width,2,6),
   'VERTICAL_LINK');
  linked.add(v.fromStory+'|'+v.toStory);
 }
 for(let i=1;i<p.stories.length;i++)
  ok(linked.has(p.stories[i-1].id+'|'+p.stories[i].id),'MISSING_VERTICAL_LINK');
 if(p.stories.length===1)ok(p.verticalLinks.length===0,'UNEXPECTED_VERTICAL_LINK');
 ok(exact(p.massing,['intent','forms'])&&str(p.massing.intent,12,300)&&
  Array.isArray(p.massing.forms)&&p.massing.forms.length>=1&&p.massing.forms.length<=12,'MASSING');
 const occupiedForm=new Set();
 for(const f of p.massing.forms){
  ok(exact(f,['spaceId','kind','intent'])&&spaces.has(f.spaceId)&&
   ['rectilinear','curved','faceted','cylindrical','stepped','cantilevered','freeform'].includes(f.kind)&&
   str(f.intent,5,180)&&!occupiedForm.has(f.spaceId),'FORM');
  occupiedForm.add(f.spaceId);
 }
 ok(exact(p.roof,['kind','intent'])&&
  ['flat','shed','ridge','sawtooth','vault','dome','freeform'].includes(p.roof.kind)&&
  str(p.roof.intent,5,200),'ROOF');
 ok(Array.isArray(p.openings)&&p.openings.length<=12,'OPENINGS');
 for(const o of p.openings){
  ok(exact(o,['spaceId','face','role','pattern'])&&spaces.has(o.spaceId)&&
   dir.includes(o.face)&&['daylight','view','ventilation'].includes(o.role)&&
   ['ribbon','tall','punched','clerestory'].includes(o.pattern),'OPENING');
 }
 ok(exact(p.materials,['floor','wall','roof'])&&
  Object.values(p.materials).every(x=>mat.includes(x)),'MATERIALS');
 ok(Array.isArray(p.assumptions)&&p.assumptions.length<=12&&
  p.assumptions.every(x=>str(x,0,250)),'ASSUMPTIONS');
 ok(Array.isArray(p.unmetRequirements)&&p.unmetRequirements.length<=12&&
  p.unmetRequirements.every(x=>str(x,0,200)),'UNMET');
 return {schema:'minecraftaibuilder-architecture-plan-inspection-v1',
  sourceSHA256:createHash('sha256').update(JSON.stringify(p)).digest('hex'),
  sourceAuthorship:'CALLER_PROVIDED_NOT_VERIFIED_AS_REAL_MODEL',
  contract:'VALID_AUTHOR_CHOICES_GEOMETRY_NOT_ATTEMPTED',
  storyCount:stories.size,zoneCount:spaces.size,computedLevels:heights,
  modelChosen:{entry:p.entry,verticalLinks:p.verticalLinks,massing:p.massing,
   roof:p.roof,openings:p.openings,materials:p.materials},
  structuralFeasibility:'NOT_TESTED',unsupportedFeatures:'AWAITING_EXACT_COMPILER',
  provenance:{authorGeometryModified:false,authorIntentReplaced:false},...failClosed()};
}
