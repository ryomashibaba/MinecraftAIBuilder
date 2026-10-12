/** B100: Edition-neutral architecture IR, Education-first research proof.
 * Every proposal is OFFLINE / NON-EXECUTABLE.  No Bedrock API is imported here.
 */
import {createHash} from 'node:crypto';
const ck=(x,z)=>`${x},${z}`;
const pt=(p)=>ck(p.x,p.z);
const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
const clone=x=>JSON.parse(JSON.stringify(x));
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const at=(w,h,x,z)=>x>=0&&z>=0&&x<w&&z<h;
const rect=(x,z,a,b)=>({x,z,width:a,depth:b});
const inside=(r,x,z)=>x>=r.x&&z>=r.z&&x<r.x+r.width&&z<r.z+r.depth;

export const DEFAULT_BRIEFS=Object.freeze([
 {id:'HOUSE',instruction:'森の中に非対称な2階建ての木造一戸建てを作り、居間と寝室を配置して',typology:'house',width:26,depth:22,floors:2,style:'woodland',essential:['居間','寝室']},
 {id:'HOTEL',instruction:'中央に吹き抜けのある5階建て高級ホテル。客室とロビーを作って',typology:'hotel',width:38,depth:30,floors:5,style:'luxury',essential:['吹き抜け','客室','ロビー']},
 {id:'APARTMENT',instruction:'6階建ての中庭型集合住宅。住戸と共用廊下を作って',typology:'apartment',width:34,depth:30,floors:6,style:'urban',essential:['中庭','住戸','共用廊下']},
 {id:'OFFICE',instruction:'セットバックのある6階建てオフィスタワー。会議室と執務室を作って',typology:'office',width:32,depth:28,floors:6,style:'modern',essential:['セットバック','会議室','執務室']},
 {id:'LIBRARY',instruction:'大きな閲覧ホールのある3階建て図書館。閲覧室と書庫を配置して',typology:'library',width:36,depth:28,floors:3,style:'civic',essential:['閲覧ホール','閲覧室','書庫']}
]);
const dictionaries={house:['居間','寝室','書斎'],hotel:['ロビー','客室','ラウンジ','客室'],apartment:['住戸','住戸','共用室'],office:['執務室','会議室','執務室'],library:['閲覧室','書庫','学習室']};

/** Controlled rule-based Japanese brief extraction. This is NOT an LLM/free-form Japanese understanding claim. */
export function parseJapaneseBrief(instruction){
 if(typeof instruction!=='string'||!instruction.trim()||instruction.length>1000)throw Error('B100_BAD_INSTRUCTION');
 const typology=/図書館|ライブラリー/.test(instruction)?'library':/ホテル/.test(instruction)?'hotel':/集合住宅|マンション|アパート/.test(instruction)?'apartment':/オフィス|事務所/.test(instruction)?'office':/一戸建て|住宅|家/.test(instruction)?'house':null;
 if(!typology)throw Error('B100_UNSUPPORTED_TYPE_NEEDS_USER_OR_AI_INTERPRETATION');
 const kanji={一:1,二:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9,十:10};
 const m=instruction.match(/([1-9]|10|[一二三四五六七八九十])階建て/);
 const floors=m?(Number(m[1])||kanji[m[1]]):null;
 const hard={courtyard:/中庭/.test(instruction),atrium:/吹き抜け/.test(instruction),setback:/セットバック|段状/.test(instruction)};
 const style=/木造|木の/.test(instruction)?'woodland':/豪華|高級/.test(instruction)?'luxury':/未来|SF/.test(instruction)?'futuristic':'unspecified';
 const all=['ロビー','客室','住戸','居間','寝室','会議室','執務室','閲覧室','書庫','中庭','吹き抜け','閲覧ホール'];
 return {typology,floors,hard,style,requestedFeatures:all.filter(x=>instruction.includes(x)),requiresHumanReview:true,parser:'DETERMINISTIC_JAPANESE_KEYWORD_PROTOTYPE',unsupportedRequirements:[],originalInstruction:instruction};
}

export function normalizeBrief(s){
 const parsed=parseJapaneseBrief(s.instruction);if(parsed.typology!==s.typology)throw Error('B100_BRIEF_TYPE_MISMATCH');
 const f=parsed.floors??s.floors; if(f<1||f>12||s.width<14||s.depth<14||s.width>96||s.depth>96)throw Error('B100_EXPERIMENT_DIMENSION_BOUNDS');
 return {id:s.id,typology:s.typology,width:s.width,depth:s.depth,floors:f,hard:parsed.hard,style:parsed.style==='unspecified'?s.style:parsed.style,
  essential:s.essential,originalInstruction:s.instruction,parser:parsed.parser,requiresHumanReview:true};
}

/** Footprints are generated as Boolean unions/differences; NOT selected baseline building masks. */
export function maskFor(brief,variant,level){
 const {width:w,depth:h,typology:t}=brief;
 const mask=[]; const zshift=variant===2?1:0,shift=variant===1?2:0;
 const inset=brief.hard.setback&&level>=Math.max(2,Math.ceil(brief.floors/2))?1+Math.floor(level/3):0;
 const main=rect(2+inset+shift,2+inset,w-4-2*inset-shift,h-4-2*inset-zshift);
 const inner=rect(Math.round(w*0.33)+(variant===1?2:0),Math.round(h*0.32)+(variant===2?-2:0),Math.max(4,Math.floor(w*.29)+(variant===2?2:0)),Math.max(4,Math.floor(h*.30)+(variant===1?2:0)));
 for(let z=0;z<h;z++){
  let row='';for(let x=0;x<w;x++){
   let fill=inside(main,x,z);
   if(t==='house'){
    const arm=variant===0?rect(2,Math.floor(h*.55),Math.round(w*.51),h-2-Math.floor(h*.55)):variant===1?rect(Math.floor(w*.43),2,Math.floor(w*.49),Math.floor(h*.49)):rect(2,2,Math.floor(w*.47),Math.floor(h*.43));
    const remove=variant===0?rect(Math.floor(w*.57),Math.floor(h*.59),w, h):variant===1?rect(0,Math.floor(h*.54),Math.floor(w*.40),h):rect(Math.floor(w*.57),0,w,Math.floor(h*.40));
    fill=(fill||inside(arm,x,z))&&!inside(remove,x,z);
   }else if(t==='hotel'){
    // Ground lobby has roof; upper floor has a central open void.
    if(level>=1)fill=fill&&!inside(inner,x,z);
    if(variant===1)fill=fill&&!inside(rect(Math.floor(w*.70),Math.floor(h*.62),w,h),x,z);
    if(variant===2)fill=fill||inside(rect(2,Math.floor(h*.60),Math.floor(w*.30),h-3-Math.floor(h*.60)),x,z);
   }else if(t==='apartment'){
    // All options explicitly retain an open court; variant changes volume and perimeter.
    fill=fill&&!inside(inner,x,z);
    if(variant===1)fill=fill&&!inside(rect(w-7,2,7,Math.floor(h*.42)),x,z);
    if(variant===2)fill=fill||inside(rect(2,2,Math.floor(w*.33),Math.floor(h*.19)),x,z);
   }else if(t==='office'){
    if(variant===1)fill=fill&&!inside(rect(2,Math.floor(h*.67),Math.floor(w*.37),h),x,z);
    if(variant===2&&level>=2)fill=fill&&!inside(rect(w-10,2,10,Math.floor(h*.40)),x,z);
   }else if(t==='library'){
    if(variant===1)fill=fill&&!inside(rect(Math.floor(w*.62),Math.floor(h*.58),w,h),x,z);
    if(variant===2)fill=fill&&!inside(rect(0,0,Math.floor(w*.36),Math.floor(h*.42)),x,z);
    // atrium + reading hall, upper floors open the central hall.
    if(level>=1)fill=fill&&!inside(inner,x,z);
   }
   row+=fill?'1':'0';
  }mask.push(row);
 }
 return mask;
}
const covers=(rows,r)=>{for(let z=r.z;z<r.z+r.depth;z++)for(let x=r.x;x<r.x+r.width;x++)if(rows[z]?.[x]!=='1')return false;return true};
const positions=(r)=>{const a=[];for(let z=r.z;z<r.z+r.depth;z++)for(let x=r.x;x<r.x+r.width;x++)a.push({x,z});return a};
const dist=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.z-b.z);
export function commonCore(brief,variant){
 const plates=Array.from({length:brief.floors},(_,i)=>maskFor(brief,variant,i));
 const starts=[{x:6,z:6},{x:brief.width-10,z:6},{x:6,z:brief.depth-10}, {x:brief.width-10,z:brief.depth-10}, {x:Math.floor(brief.width/2)-2,z:4},{x:4,z:Math.floor(brief.depth/2)-2}];
 const candidates=[];for(let z=2;z<brief.depth-5;z++)for(let x=2;x<brief.width-5;x++){
  const r=rect(x,z,3,3);if(plates.every(rows=>covers(rows,r)))candidates.push({x,z,width:3,depth:3});
 }
 if(!candidates.length)throw Error('B100_NO_STACKABLE_CORE');
 // Vary core POSITION without sacrificing vertical alignment.
 const ideal=starts[variant%starts.length];candidates.sort((a,b)=>dist(a,ideal)-dist(b,ideal)||a.z-b.z||a.x-b.x);
 return candidates[0];
}
const intersects=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.z<b.z+b.depth&&a.z+a.depth>b.z;
function connected(cells){if(!cells.length)return false;const all=new Set(cells.map(pt)),q=[cells[0]],seen=new Set([pt(cells[0])]);for(let i=0;i<q.length;i++){const p=q[i];for(const [dx,dz]of dirs){const n=ck(p.x+dx,p.z+dz);if(all.has(n)&&!seen.has(n)){seen.add(n);q.push({x:p.x+dx,z:p.z+dz});}}}return seen.size===all.size;}

/** Route the 2×2 walkable squares around holes and vertical core reservations. */
export function buildTwoWideNetwork(rows,core,variant){
 const w=rows[0].length,h=rows.length,blocked=new Set(positions(core).map(pt));
 const anchors=[];for(let z=0;z<h-1;z++)for(let x=0;x<w-1;x++){
  if([ck(x,z),ck(x+1,z),ck(x,z+1),ck(x+1,z+1)].every(k=>!blocked.has(k)&&rows[Number(k.split(',')[1])]?.[Number(k.split(',')[0])]==='1'))anchors.push({x,z});
 }
 const aMap=new Map(anchors.map(a=>[pt(a),a]));
 const source=anchors.filter(a=>positions(rect(a.x,a.z,2,2)).some(p=>positions(core).some(c=>dist(c,p)===1))).sort((a,b)=>dist(a,core)-dist(b,core))[0];
 if(!source)throw Error('B100_NO_CORE_APPROACH');
 const targets=[];const dirs8=[[1,0],[0,1],[-1,0],[0,-1],[1,1],[-1,1],[-1,-1],[1,-1]];
 for(const [dx,dz]of dirs8){targets.push(anchors.reduce((best,p)=>{
   const score=(p.x-core.x)*dx+(p.z-core.z)*dz -(variant===1?Math.abs(p.x-(w/2))*0.05:0);
   return score>best.score?{p,score}:best;
  },{p:source,score:-Infinity}).p);}
 const selected=new Map([[pt(source),source]]);
 for(const target of targets){
  const goal=pt(target),queue=[target],prev=new Map([[goal,null]]);let found=null;
  for(let i=0;i<queue.length&&!found;i++){
   const curr=queue[i],k=pt(curr);
   if(selected.has(k)){found=k;break;}
   for(const [dx,dz]of dirs){const n=ck(curr.x+dx,curr.z+dz),obj=aMap.get(n);
    if(obj&&!prev.has(n)){prev.set(n,k);queue.push(obj);}}
  }
  if(!found)throw Error('B100_NO_NETWORK_ROUTE');
  let v=found;while(v!==goal){const next=prev.get(v);if(!next)break;selected.set(next,aMap.get(next));v=next;}
 }
 const gallery=new Map();for(const a of selected.values())for(const p of positions(rect(a.x,a.z,2,2)))gallery.set(pt(p),p);
 const cells=[...gallery.values()].sort((a,b)=>a.z-b.z||a.x-b.x);
 return {gallery:cells,anchors:[...selected.values()].sort((a,b)=>a.z-b.z||a.x-b.x),coreAdjacent:cells.some(p=>positions(core).some(c=>dist(p,c)===1)),connected:connected(cells)};
}
function frontage(r,net){const g=new Set(net.gallery.map(pt));const slots=[];
 for(let z=r.z;z<r.z+r.depth;z++){
  if(z===r.z||z===r.z+r.depth-1){const dz=z===r.z?-1:1;for(let x=r.x;x<r.x+r.width-1;x++)if(g.has(ck(x,z+dz))&&g.has(ck(x+1,z+dz)))slots.push({x,z,along:'x',direction:dz});}
 }
 for(let x=r.x;x<r.x+r.width;x++){
  if(x===r.x||x===r.x+r.width-1){const dx=x===r.x?-1:1;for(let z=r.z;z<r.z+r.depth-1;z++)if(g.has(ck(x+dx,z))&&g.has(ck(x+dx,z+1)))slots.push({x,z,along:'z',direction:dx});}
 }
 return slots;
}
function exterior(r,rows){let count=0;for(const p of positions(r))for(const [dx,dz]of dirs)if(rows[p.z+dz]?.[p.x+dx]!=='1')count++;return count;}
export function allocateRooms(brief,rows,core,net,level,variant){
 const base=brief.typology==='house'?[4,4]:brief.typology==='hotel'?[4,4]:brief.typology==='library'?[5,4]:[4,3];
 const target=brief.typology==='house'?4:brief.typology==='hotel'?7:brief.typology==='library'?4:6;
 const g=new Set(net.gallery.map(pt)),c=new Set(positions(core).map(pt)),roomCells=new Set();
 const candidates=[];
 for(const [rw,rh]of [base,[base[1],base[0]],[base[0]+1,base[1]]])for(let z=1;z<rows.length-rh;z++)for(let x=1;x<rows[0].length-rw;x++){
  const r=rect(x,z,rw,rh),cells=positions(r);if(!covers(rows,r)||cells.some(p=>g.has(pt(p))||c.has(pt(p))))continue;
  const bays=frontage(r,net),ext=exterior(r,rows);
  candidates.push({r,bays,ext,score:(bays.length>0?200:0)+Math.min(10,ext)*3-rw*rh*.5+((x*31+z*17+variant*19)%11)*.03});
 }
 candidates.sort((a,b)=>b.score-a.score||a.r.z-b.r.z||a.r.x-b.r.x);
 const results=[];
 for(const cand of candidates){if(results.length>=target)break;const cells=positions(cand.r);if(cells.some(p=>roomCells.has(pt(p))))continue;
  // For core and room program, no overlap with public gallery, and each rectangular volume is contiguous.
  const r=cand.r,goal=dictionaries[brief.typology][results.length%dictionaries[brief.typology].length];
  results.push({...r,id:`L${level+1}-R${String(results.length+1).padStart(2,'0')}`,purpose:goal,nominalDoorBays:cand.bays.slice(0,2),externalExposureProxyEdges:cand.ext,entranceConnectedNominal:cand.bays.length>0,voxel3DVerified:false});
  cells.forEach(p=>roomCells.add(pt(p)));
 }
 return {rooms:results,programmeTargetRooms:target,programmeRetainedRooms:results.length,entranceConnectedRooms:results.filter(x=>x.entranceConnectedNominal).length};
}
function detectInnerVoid(rows){let count=0;for(let z=1;z<rows.length-1;z++)for(let x=1;x<rows[0].length-1;x++){
  if(rows[z][x]!=='0')continue;
  if(rows[z].slice(0,x).includes('1')&&rows[z].slice(x+1).includes('1')&&rows.some(r=>r[x]==='1'))count++;
 }return count;}
export function buildUniversalCandidate(brief,variant){
 if(![0,1,2].includes(variant))throw Error('B100_VARIANT_RANGE');const core=commonCore(brief,variant),floors=[];
 for(let level=0;level<brief.floors;level++){
  const rows=maskFor(brief,variant,level),network=buildTwoWideNetwork(rows,core,variant);
  if(!network.coreAdjacent||!network.connected)throw Error('B100_GALLERY_UNREACHABLE');
  const programme=allocateRooms(brief,rows,core,network,level,variant);
  floors.push({level,footprintRows:rows,core:clone(core),gallery:network.gallery,networkAnchorCount:network.anchors.length,
   rooms:programme.rooms,programmeTargetRooms:programme.programmeTargetRooms,programmeRetainedRooms:programme.programmeRetainedRooms,
   entranceConnectedRooms:programme.entranceConnectedRooms,programmeReadiness:'CONCEPT_ONLY',floor3DHeight:5,innerVoidCellsProxy:detectInnerVoid(rows),
   sunlightSimulationVerified:false,physicalDoorSwingVerified:false,realStaircaseVerified:false,actualLoadPathVerified:false});
 }
 const allRoom=floors.reduce((n,f)=>n+f.rooms.length,0),nominal=floors.reduce((n,f)=>n+f.entranceConnectedRooms,0),targets=floors.reduce((n,f)=>n+f.programmeTargetRooms,0);
 const c={id:`${brief.id}_V${variant+1}`,variant,typology:brief.typology,languageBrief:brief.originalInstruction,geometrySource:'B100_PARAMETERIZED_INDEPENDENT_NEW_BUILD',
  core,levels:brief.floors,style:brief.style,footprintAreaByLevel:floors.map(f=>f.footprintRows.join('').replaceAll('0','').length),
  summary:{programmeTargetRooms:targets,programmeRetainedRooms:allRoom,nominalTwoCellFrontageRooms:nominal,
   floorsWithConnectedTwoWideGallery:floors.filter(f=>f.gallery.length).length,hasUpperLevelVoid:floors.some((f,i)=>i>0&&f.innerVoidCellsProxy>0),
   roofHeightVerified:false,allRoomsHaveDoors:false,finishedInteriorRooms:0,physicalEgressVerified:false},
  floors,blockOperations:[],worldCoordinates:null,status:'CONCEPT_NOT_CERTIFIED',constructionApproved:false};
 return c;
}

export function validateUniversalCandidate(c,brief){
 if(c.status!=='CONCEPT_NOT_CERTIFIED'||c.constructionApproved!==false||c.blockOperations.length||c.worldCoordinates!==null||c.levels!==brief.floors||c.floors.length!==brief.floors||c.summary.finishedInteriorRooms!==0)return false;
 for(const [i,f]of c.floors.entries()){
  if(f.level!==i||f.footprintRows.length!==brief.depth||f.footprintRows.some(r=>r.length!==brief.width)||!covers(f.footprintRows,c.core))return false;
  const coreSet=new Set(positions(c.core).map(pt)),net=new Set(f.gallery.map(pt));
  if(!f.gallery.length||!connected(f.gallery)||!f.gallery.some(p=>positions(c.core).some(q=>dist(p,q)===1))||f.gallery.some(p=>f.footprintRows[p.z]?.[p.x]!=='1'||coreSet.has(pt(p))))return false;
  const used=new Set();for(const room of f.rooms){
   if(!covers(f.footprintRows,room)||!Number.isInteger(room.x)||!Number.isInteger(room.z))return false;
   for(const p of positions(room)){if(coreSet.has(pt(p))||net.has(pt(p))||used.has(pt(p)))return false;used.add(pt(p));}
   if(room.entranceConnectedNominal!==(room.nominalDoorBays.length>0)||room.nominalDoorBays.some(b=>!frontage(room,{gallery:f.gallery}).some(n=>JSON.stringify(n)===JSON.stringify(b))))return false;
   if(room.voxel3DVerified!==false||!Array.isArray(room.nominalDoorBays))return false;
  }
  if(f.programmeRetainedRooms!==f.rooms.length||f.entranceConnectedRooms!==f.rooms.filter(x=>x.entranceConnectedNominal).length||f.actualLoadPathVerified!==false||f.realStaircaseVerified!==false)return false;
  if(c.footprintAreaByLevel[i]!==f.footprintRows.join('').replaceAll('0','').length)return false;
 }
 // Meaningful constraints interpreted from prompt; no conversion of geometry into physical certification.
 if(c.summary.programmeRetainedRooms!==c.floors.reduce((n,f)=>n+f.rooms.length,0)||c.summary.nominalTwoCellFrontageRooms!==c.floors.reduce((n,f)=>n+f.entranceConnectedRooms,0)||c.summary.floorsWithConnectedTwoWideGallery!==c.floors.length||c.summary.allRoomsHaveDoors!==false||c.summary.physicalEgressVerified!==false)return false;
 if(brief.hard.atrium&&!c.summary.hasUpperLevelVoid)return false;
 if(brief.hard.courtyard&&!c.floors.every(f=>f.innerVoidCellsProxy>0))return false;
 if(brief.hard.setback&&!c.footprintAreaByLevel.some((a,i)=>i>0&&a<c.footprintAreaByLevel[i-1]))return false;
 return true;
}

/** Geometry distance compares ALL floor voxel footprint masks, not materials/paint/seed labels. */
export function shapeDistance(a,b){
 if(a.levels!==b.levels||a.floors[0].footprintRows.length!==b.floors[0].footprintRows.length||a.floors[0].footprintRows[0].length!==b.floors[0].footprintRows[0].length)throw Error('B100_DISTANCE_DIFFERENT_PLOTS');
 let dif=0,n=0;for(let level=0;level<a.levels;level++)for(let z=0;z<a.floors[level].footprintRows.length;z++){
  const x=a.floors[level].footprintRows[z],y=b.floors[level].footprintRows[z];for(let k=0;k<x.length;k++){n++;if(x[k]!==y[k])dif++;}}
 return +(dif/n).toFixed(5);
}
export function assessDiversity(candidates){
 const pairs=[];for(let i=0;i<candidates.length;i++)for(let j=i+1;j<candidates.length;j++){
  pairs.push({a:candidates[i].id,b:candidates[j].id,footprintDifferenceFraction:shapeDistance(candidates[i],candidates[j]),sameCore:pt(candidates[i].core)===pt(candidates[j].core)});
 }
 return {metric:'3D_VOXEL_FOOTPRINT_HAMMING_FRACTION_NOT_COLOR',pairs,distinctFootprintSignatures:new Set(candidates.map(c=>digest(c.floors.map(f=>f.footprintRows)))).size,
  minimumDifference:Math.min(...pairs.map(p=>p.footprintDifferenceFraction)),nonTrivialStructuralDifferences:pairs.every(p=>p.footprintDifferenceFraction>=0.025),
  noMaterialOnlyVariations:true};
}
