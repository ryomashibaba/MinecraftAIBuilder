// Step 8A: deterministic, OFFLINE CONCEPT design. No Minecraft blocks/commands.
// Conceptual grammar is constrained to existing GeneralBuildingPlanner's registered types.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const sha=x=>createHash('sha256').update(x).digest('hex');
const FAIL=(code,reason)=>{const e=new Error(reason);e.code=code;throw e;};
const unsupported=/(?:工場|倉庫|学校|病院|駅舎|商業施設|店舗専用|複合施設|複合ビル|スタジアム|公共施設|空港|教会|神社|寺院|城)/;
const dictionary=[
 {program:'apartment',rx:/集合住宅|マンション|アパート|共同住宅/},
 {program:'hotel',rx:/ホテル|宿泊施設/},
 {program:'office',rx:/オフィス|事務所|オフィスビル|業務ビル/}
];
const masses=['slab','L_shape','U_shape','courtyard','tower_on_podium','stepped','twin_bar','asymmetric_block'];
const patterns=[
 ['courtyard',/中庭|ロの字/],['U_shape',/コの字|Ｕ字|U字/],['L_shape',/Ｌ字|L字|エル字/],
 ['twin_bar',/ツイン|二棟|双子/],['tower_on_podium',/タワー|高層棟|塔状/],
 ['stepped',/段々|段状|セットバック|階段状/],['asymmetric_block',/非対称|アシンメトリー/],
 ['slab',/板状|直方体|シンプルな箱/]
];
const palettes={modern:{frame:'#9daab6',surface:'#dce5ee',glass:'#438ba4',trim:'#43586b'},urban_japanese:{frame:'#707c78',surface:'#d0d1c8',glass:'#467987',trim:'#535d57'},industrial:{frame:'#737e8a',surface:'#b7c2c9',glass:'#4b8e9b',trim:'#505b63'},minimal:{frame:'#b9bab6',surface:'#eeeae2',glass:'#83bac7',trim:'#868d8d'},premium:{frame:'#8a8478',surface:'#ded3bc',glass:'#56757b',trim:'#454e52'},traditional:{frame:'#7c6857',surface:'#d7bd99',glass:'#8eaca6',trim:'#403b36'}};
function norm(s){return s.normalize('NFKC').replace(/[\s　]+/g,' ');}
function detectMatch(text,entries,label){const matches=entries.filter(x=>x.rx.test(text));if(matches.length>1)FAIL('AMBIGUOUS_'+label,label+'が複数指定されています: '+matches.map(x=>x.program??x[0]).join(','));return matches[0];}
const capture=(text,pattern)=>{const m=text.match(pattern);return m?Number(m[1]):null;};
function limit(key,value,min,max){if(!Number.isSafeInteger(value)||value<min||value>max)FAIL('INVALID_DIMENSION',`${key} は${min}〜${max}の整数で指定してください: ${value}`);return value;}
export function parseJapanese(text){
 if(typeof text!=='string'||text.length>3000||text.trim().length<3)FAIL('INVALID_INPUT','日本語の建築指示を3〜3000文字で指定してください');
 const raw=norm(text);
 if(unsupported.test(raw))FAIL('UNSUPPORTED_PROGRAM','この建物用途は既存エンジンのサポート対象外です。オフィス・集合住宅・ホテルのみ対応');
 const types=dictionary.filter(x=>x.rx.test(raw));
 if(types.length!==1)FAIL('PROGRAM_UNCLEAR','用途を一意に特定できません。オフィス・集合住宅・ホテルを明示してください');
 const warnings=[];const assumptions=[];
 const p=types[0].program;
 let width=capture(raw,/(?:幅|横幅|横)\s*(\d+)\s*(?:ブロック|m|メートル)?/i);
 let depth=capture(raw,/(?:奥行き?|縦幅)\s*(\d+)\s*(?:ブロック|m|メートル)?/i);
 if(width===null||depth===null){
  const m=raw.match(/(\d+)\s*[×xX＊*]\s*(\d+)\s*(?:ブロック|m|メートル)?/i);
  if(m){if(width===null)width=Number(m[1]);if(depth===null)depth=Number(m[2]);}
 }
 if(width===null){width=24;assumptions.push('幅24ブロックを仮定');}
 if(depth===null){depth=20;assumptions.push('奥行20ブロックを仮定');}
 let floors=capture(raw,/(?:地上\s*)?(\d+)\s*階(?:建て|建)?/);
 if(floors===null){floors=6;assumptions.push('6階を仮定');}
 limit('width',width,15,48);limit('depth',depth,12,40);limit('floors',floors,2,10);
 const explicit=detectMatch(raw,patterns.map(([program,rx])=>({program,rx})),'MASSING');
 const defaults={office:'tower_on_podium',apartment:'courtyard',hotel:'stepped'};
 const massing=explicit?.program??defaults[p];
 if(massing==='tower_on_podium'&&floors<4)FAIL('MASSING_LIMIT','tower_on_podium は4階以上で指定してください');
 if(!explicit)assumptions.push('用途に合う基本形状を提案');
 let style='modern';
 if(/和モダン|都市和風/.test(raw))style='urban_japanese';
 else if(/和風|伝統/.test(raw))style='traditional';
 else if(/工業風|インダストリアル/.test(raw))style='industrial';
 else if(/高級|ラグジュアリー/.test(raw))style='premium';
 else if(/ミニマル|簡素/.test(raw))style='minimal';
 const facadeStrategy=/全面ガラス|ガラス張り|カーテンウォール/.test(raw)?'curtain_wall':
  /縦ルーバー|縦格子|縦ライン/.test(raw)?'vertical_bays':
  /横帯|水平ライン/.test(raw)?'horizontal_bands':
  /小窓|窓を少なめ/.test(raw)?'punched_windows':p==='apartment'?'punched_windows':p==='hotel'?'vertical_bays':'curtain_wall';
 const roofStrategy=/屋上庭園|屋上テラス|緑化屋上|テラス/.test(raw)?'terrace':
  /機械室|設備階/.test(raw)?'mechanical_crown':'flat_parapet';
 const groundFloorStrategy=/店舗|ショーウィンドウ/.test(raw)?'retail_glazing':
  /アーケード|ピロティ/.test(raw)?'arcade':
  /広いロビー|エントランス|玄関/.test(raw)?'recessed_lobby':p==='hotel'?'arcade':p==='office'?'recessed_lobby':'solid_base';
 const floorsHeight=p==='hotel'?5:4;
 let orientation='north';
 const facing=[['north',/北向き|北面正面/],['south',/南向き|南面正面/],['east',/東向き|東面正面/],['west',/西向き|西面正面/]].filter(([,re])=>re.test(raw));
 if(facing.length>1)FAIL('ORIENTATION_CONFLICT','方角に矛盾があります');
 if(facing.length)orientation=facing[0][0];else assumptions.push('正面方角は仮に北向き');
 if(/地下|\bB\d+F\b/i.test(raw))FAIL('UNSUPPORTED_BASEMENT','地下階は今回のオフライン設計範囲外');
 if(/内装|エレベーター|階段|家具/.test(raw))warnings.push('内装・昇降設備・家具は本段階で実配置していません');
 return {raw,p,width,depth,floors,floorHeight:floorsHeight,massing,style,facadeStrategy,roofStrategy,groundFloorStrategy,orientation,assumptions,warnings};
}
const rect=(x,z,width,depth,start,end)=>({x,z,width,depth,start,end});
function geometry(c){
 const {width:w,depth:d,floors:n,massing:m}=c;
 const t=Math.min(Math.floor((Math.min(w,d)-3)/2),Math.max(3,Math.floor(Math.min(w,d)/4)));
 const s=1; const podium=Math.max(1,Math.floor(n/3));
 switch(m){
  case 'slab':return [rect(0,0,w,d,0,n)];
  case 'L_shape':return [rect(0,0,w,t,0,n),rect(0,t,t,d-t,0,n)];
  case 'U_shape':return [rect(0,d-t,w,t,0,n),rect(0,0,t,d-t,0,n),rect(w-t,0,t,d-t,0,n)];
  case 'courtyard':return [rect(0,d-t,w,t,0,n),rect(0,0,t,d-t,0,n),rect(w-t,0,t,d-t,0,n),rect(t,0,w-2*t,t,0,n)];
  case 'tower_on_podium':return [rect(0,0,w,d,0,podium),rect(s,s+1,w-2*s,d-2*s-1,podium,n)];
  case 'stepped':{
   const levels=Math.min(3,n);return Array.from({length:levels},(_,i)=>rect(i*s,i*s,w-i*s*2,d-i*s*2,Math.floor(i*n/levels),Math.floor((i+1)*n/levels)));}
  case 'twin_bar':return [rect(0,0,w,t,0,n),rect(0,d-t,w,t,0,n),rect(Math.floor(w/2)-1,t,3,d-2*t,0,Math.max(1,n-1))];
  case 'asymmetric_block':{const split=Math.floor(w*.55);return [rect(0,0,split,d-t,0,n),rect(split-2,t,w-split+2,d-t,0,Math.max(1,n-1))];}
  default:FAIL('MASSING_UNSUPPORTED','未知のMassing: '+m);
 }
}
function rectangleCells(c,masses,floor){const set=new Set();for(const r of masses){if(r.start>floor||r.end<=floor)continue;for(let x=r.x;x<r.x+r.width;x++)for(let z=r.z;z<r.z+r.depth;z++)set.add(`${x}:${z}`);}return set;}
export function buildConcept(text){
 const c=parseJapanese(text),masses=geometry(c);
 if(!masses.length||masses.some(r=>r.width<=0||r.depth<=0||r.x<0||r.z<0||r.x+r.width>c.width||r.z+r.depth>c.depth||r.start<0||r.end>c.floors||r.end<=r.start))FAIL('INVALID_MASSING','形状が敷地の範囲外');
 const footprints=Array.from({length:c.floors},(_,floor)=>rectangleCells(c,masses,floor));
 if(footprints.some(x=>x.size===0))FAIL('EMPTY_FLOOR','存在しない階のある建物形状');
 const areaByFloor=footprints.map(x=>x.size);
 const all=footprints[0], start=all.values().next().value,vis=new Set([start]),q=[start];
 for(let i=0;i<q.length;i++){
  const [x,z]=q[i].split(':').map(Number);
  for(const k of [`${x+1}:${z}`,`${x-1}:${z}`,`${x}:${z+1}`,`${x}:${z-1}`])if(all.has(k)&&!vis.has(k)){vis.add(k);q.push(k);}
 }
 if(vis.size!==all.size)FAIL('DISCONNECTED_GROUND','1階の建物形状が分断');
 const total=areaByFloor.reduce((a,b)=>a+b,0);
 const facadeGrid={punched_windows:{bay:4,gap:2},curtain_wall:{bay:4,gap:1},vertical_bays:{bay:3,gap:1},horizontal_bands:{bay:8,gap:1}}[c.facadeStrategy];
 const programFloors=Array.from({length:c.floors},(_,i)=>({level:i+1,area:areaByFloor[i],role:i===0?(c.p==='office'?'lobby':c.p==='hotel'?'reception':'shared_entrance'):c.p==='office'?'workspace':c.p==='hotel'?'guestroom_zone':'residential_zone'}));
 const params={buildingType:c.p,width:c.width,depth:c.depth,floors:c.floors,floorHeight:c.floorHeight,style:c.style,quality:'premium',massing:c.massing,facadeStrategy:c.facadeStrategy,groundFloorStrategy:c.groundFloorStrategy,roofStrategy:c.roofStrategy,orientation:c.orientation,seed:0};
 const out={schema:'minecraftaibuilder-step8a-concept-v1',status:'OFFLINE_CONCEPT_ONLY_NOT_PREPARED',sourceText:c.raw,
  confidence:'rule_based_parse_not_llm',assumptions:c.assumptions,warnings:c.warnings,
  BuildingComposition:{version:1,program:c.p,massing:c.massing,style:c.style,quality:'premium',dimensions:{width:c.width,depth:c.depth},floorCount:c.floors,floorHeight:c.floorHeight,orientation:c.orientation,facadeStrategy:c.facadeStrategy,groundFloorStrategy:c.groundFloorStrategy,roofStrategy:c.roofStrategy},
  ProgramGrammar:{floorAllocation:programFloors,stairs:'NOT_DESIGNED',elevators:'NOT_DESIGNED',interiorLayout:'NOT_DESIGNED'},
  Massing:{rectangles:masses,areaByFloor,totalFloorAreaBlocks:total,groundFootprintBlocks:areaByFloor[0],heightBlocks:c.floors*c.floorHeight},
  Facade:{strategy:c.facadeStrategy,grid:facadeGrid,windowsAreConceptOnly:true},
  Modules:{entrance:c.groundFloorStrategy,rooftop:c.roofStrategy,stairCore:'NOT_DESIGNED'},
  MaterialGrammar:{style:c.style,conceptColors:palettes[c.style],blockIds:'UNVERIFIED_NOT_SELECTED'},
  Detail:{priority:['入口の視認性','階層的な外観','開口部のリズム','屋根・軒の輪郭'],constructionDetails:'NOT_DESIGNED'},
  EngineCompatibility:{referenceGrammar:'Step7Q reference-only, not confirmed installed',parameters:params,validatedByInstalledEngine:false},
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,siteClearanceProven:false,materialIdsVerified:false},
  safety:{constructionApproved:false,executionAllowed:false,worldIdentityProven:false,bridgeSessionVerified:false,scanAndBridgeSameSessionProven:false,siteSafetyProven:false,notPrepared:true,noBridge:true,noScan:true,noWorldMutation:true}};
 out.designSha256=sha(JSON.stringify(out));
 return out;
}
function h(s){return String(s).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));}
export function renderSVG(plan){
 const c=plan.BuildingComposition,pal=plan.MaterialGrammar.conceptColors,M=plan.Massing.rectangles,unit=Math.min(12,240/Math.max(c.dimensions.width,c.dimensions.depth)),ox=55,oz=110;
 const fp=[];
 for(const r of M)fp.push(`<rect x="${ox+r.x*unit}" y="${oz+r.z*unit}" width="${r.width*unit}" height="${r.depth*unit}" fill="${pal.surface}" stroke="${pal.trim}" stroke-width="2"/>`);
 const base=530,H=260;const ys=H/(c.floorCount);const rh=Math.max(2,Math.min(9,unit));
 const levels=Array.from({length:c.floorCount},(_,i)=>{const y=base-(i+1)*ys;return `<rect x="500" y="${y}" width="${c.dimensions.width*rh}" height="${ys}" fill="${pal.surface}" stroke="${pal.trim}" stroke-width="1"/><rect x="${505}" y="${y+ys*.27}" width="${Math.max(0,c.dimensions.width*rh-10)}" height="${ys*.46}" fill="${pal.glass}"/>`;}).join('');
 const label=`${c.program.toUpperCase()} · ${c.massing} · ${c.floorCount}F · ${c.dimensions.width}×${c.dimensions.depth}`;
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 610" role="img" aria-label="Offline architectural concept preview">
 <rect width="960" height="610" fill="#121c2a"/><text x="36" y="52" font-family="Arial,sans-serif" font-size="25" font-weight="bold" fill="#f0f5f7">STEP 8A · CONCEPT DESIGN</text><text x="36" y="82" font-family="Arial,sans-serif" font-size="15" fill="#8da3b9">${h(label)}</text>
 <text x="55" y="106" font-family="Arial,sans-serif" font-size="14" fill="white">SITE / TOP VIEW (schematic)</text><rect x="${ox}" y="${oz}" width="${c.dimensions.width*unit}" height="${c.dimensions.depth*unit}" fill="#273749" stroke="#c5ccd4" stroke-dasharray="5 3"/>
 ${fp.join('')}<text x="55" y="${oz+c.dimensions.depth*unit+28}" fill="#bbc9d9" font-family="Arial,sans-serif" font-size="14">Site envelope ${c.dimensions.width} × ${c.dimensions.depth} blocks</text>
 <text x="500" y="224" font-family="Arial,sans-serif" font-size="14" fill="white">FACADE / HEIGHT STUDY (schematic)</text>${levels}
 <text x="36" y="582" font-family="Arial,sans-serif" font-size="15" fill="#efb273">OFFLINE CONCEPT ONLY · NO BUILD OPERATIONS · NOT PREPARED</text>
 </svg>`;
}
export function writeDesign(directory,text){
 const plan=buildConcept(text);
 fs.mkdirSync(directory,{recursive:true});
 const fp=path.join(directory,'design.json'),svg=path.join(directory,'preview.svg');
 fs.writeFileSync(fp,JSON.stringify(plan,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(svg,renderSVG(plan),{flag:'wx'});
 return {plan,files:{json:fp,svg}};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
 const text=process.argv[2];if(!text){console.error('Usage: node step8a-design.mjs "日本語の建築指示" [output-dir]');process.exitCode=2;}
 else try{const dir=process.argv[3]??path.resolve('step8a-concept-'+Date.now());const r=writeDesign(dir,text);console.log('STEP8A_CONCEPT_CREATED_NOT_PREPARED',JSON.stringify({files:r.files,assumptions:r.plan.assumptions}));}catch(e){console.error('STEP8A_BLOCKED',e.code??'ERROR',e.message);process.exitCode=1;}
}
