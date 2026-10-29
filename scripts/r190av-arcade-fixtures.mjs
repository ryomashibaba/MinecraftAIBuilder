/**
 * R190-AV human/assistant-authored experimental design data, not Qwen/Gemma.
 * Two PUBLIC-SPACE-first arcades replace wall slabs in the earlier AU plans.
 * All source-mass coordinates are authored; no implicit pattern or auto-repair.
 */
import {R190AU_AUTHOR_CASES} from './r190au-author-forum-fixtures.mjs';
const box=(id,material,origin,size)=>({id,shape:'box',mode:'add',material,origin,size});
const beam=(id,material,start,end,thickness)=>({id,shape:'beam',mode:'add',material,start,end,thickness});
const primary=new Set([
 'civic-primary-composite-mass','source-pedestrian-and-forum-ground',
 'court-west-cliff-pier','court-east-cliff-pier',
 'court-north-open-frame','court-south-open-frame',
 'author-exterior-bypass-ground'
]);
const first=[
 box('west-great-roof','concrete',[8,14,24],[23,3,15]),
 box('east-great-roof','metal',[47,18,24],[22,3,15]),
 box('west-arch-front-a','stone',[8,2,23],[4,15,4]),
 box('west-arch-rear-a','stone',[8,2,36],[4,15,5]),
 box('west-arch-front-b','stone',[26,2,23],[4,18,4]),
 box('west-arch-rear-b','stone',[26,2,36],[4,18,5]),
 box('east-arch-front-a','stone',[47,2,23],[4,20,4]),
 box('east-arch-rear-a','stone',[47,2,36],[4,20,5]),
 box('east-arch-front-b','stone',[65,2,23],[4,19,4]),
 box('east-arch-rear-b','stone',[65,2,36],[4,19,5]),
 beam('western-inclined-great-rib','metal',[10,16,21],[28,26,21],3),
 beam('east-declining-great-rib','metal',[48,26,21],[67,20,21],3),
 beam('east-ascending-south-rib','metal',[49,20,41],[65,27,41],2)
];
const second=[
 box('west-arcade-roof','concrete',[8,14,24],[23,3,15]),
 box('east-arcade-roof','concrete',[47,18,24],[22,3,15]),
 box('west-portico-thick-a','stone',[8,2,23],[4,15,4]),
 box('west-portico-thick-b','stone',[27,2,36],[3,17,5]),
 box('west-portico-recessed-a','stone',[14,2,23],[3,15,4]),
 box('west-portico-recessed-b','stone',[20,2,37],[3,15,4]),
 box('east-portico-thick-a','stone',[47,2,23],[4,20,4]),
 box('east-portico-thick-b','stone',[65,2,36],[4,18,5]),
 box('east-portico-recessed-a','stone',[60,2,23],[4,20,4]),
 box('east-portico-recessed-b','stone',[59,2,37],[3,20,4]),
 beam('western-overhanging-shear','metal',[11,16,22],[29,27,22],3),
 beam('eastern-overhanging-shear','metal',[48,24,41],[67,19,41],3),
 beam('west-inverted-roof-fin','metal',[10,16,40],[29,25,40],2)
];
const names=[
 {id:'r190av-blade-ribbon',title:'Inclined ribbon arcade with asymmetric public thresholds',
  thesis:'A continuous civic walk cuts between an open western portico and a taller eastern canopy, while opposing diagonal roof structures frame the sky gap.',
  experience:'Large open colonnades mark two different levels of shelter before and after the necessary outdoor civic forum.',
  why:'The central roofless court is the only supported 2-wide crossing between the two weather-protected public halls.',masses:first},
 {id:'r190av-broken-arcade',title:'Alternating civic colonnades and broken rising roof crests',
  thesis:'Alternating supports form open sides to two halls while opposing asymmetric roof ridges register the large sky-lit public chasm.',
  experience:'Visitors traverse an open portico, cross the roofless shared forum, then enter the visibly taller workshop arcade.',
  why:'The main public void organizes the two distinct open-sided halls and the necessary crossing.',masses:second}
];
export const R190AV_AUTHOR_CASES=names.map((x,index)=>{
 const p=structuredClone(R190AU_AUTHOR_CASES[index]);
 p.design.parti.id=x.id;
 p.design.parti.title=x.title;
 p.design.parti.brief='A non-pod civic architecture study: open colonnaded halls and distinctive roof ribs focus a verified public canyon route.';
 p.design.parti.concept={thesis:x.thesis,experientialSequence:x.experience,whyThisVoid:x.why};
 const permanent=p.design.parti.masses.filter(m=>primary.has(m.id));
 if(permanent.length!==7||x.masses.length!==13)throw Error('R190AV_DESIGN_FIXTURE_OWNERSHIP');
 p.design.parti.masses=[...permanent,...structuredClone(x.masses)];
 return p;
});
