// Step 8A architecture concept review, deterministic and entirely offline.
// No calls to Minecraft, Bridge, scans, pack generation or construction APIs.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {buildConcept,parseJapanese,renderSVG} from './step8a-design.mjs';
import {renderReviewHtml} from './step8a-viewer.mjs';
import {renderFloorPlanHtml} from './step8a-floorplan.mjs';
import {planArchitecture} from './step8a-architecture.mjs';
import {planDetailedCoordinates} from './step8a-detail.mjs';
import {renderDetailHtml} from './step8a-detail-viewer.mjs';
import {assessPhysicalDesign} from './step8a-physical.mjs';
import {renderPhysicalHtml} from './step8a-physical-viewer.mjs';
import {proposeImprovements} from './step8a-optimize.mjs';
import {renderOptimizationHtml} from './step8a-optimize-viewer.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
function error(code,message){const e=new Error(message);e.code=code;throw e;}
const fixedRx=/中庭|ロの字|コの字|[uUlL]字|エル字|ツイン|二棟|双子|タワー|高層棟|塔状|段々|段状|セットバック|階段状|非対称|アシンメトリー|板状|直方体|シンプルな箱/;
const blockedAction=/(?:今すぐ|ここに|現地に|実際に)(?:.{0,12})?(?:施工|建築|建てて|配置|撤去|設置)|\/fill\b|\/setblock\b|世界を消|ワールドを削除|スキャンを実行|Bridgeに接続/iu;
const names={office:'オフィス',apartment:'集合住宅',hotel:'ホテル'};
const alternatives={office:['asymmetric_block','slab','L_shape'],apartment:['L_shape','slab','U_shape'],hotel:['U_shape','asymmetric_block','slab']};
const token={slab:'直方体',L_shape:'L字',U_shape:'コの字',courtyard:'中庭',tower_on_podium:'タワー',stepped:'段々',twin_bar:'ツイン',asymmetric_block:'非対称'};
const safeObj={constructionApproved:false,executionAllowed:false,notPrepared:true,worldIdentityProven:false,bridgeSessionVerified:false,siteSafetyProven:false,scanAndBridgeSameSessionProven:false,noBridge:true,noScan:true,noPackGeneration:true,noWorldMutation:true};
function floorSet(p, floor){const s=new Set();for(const r of p.Massing.rectangles)if(r.start<=floor&&r.end>floor)for(let z=r.z;z<r.z+r.depth;z++)for(let x=r.x;x<r.x+r.width;x++)s.add(x+':'+z);return s;}
function components(mask){let count=0;const todo=new Set(mask);while(todo.size){count++;const first=todo.values().next().value;todo.delete(first);const q=[first];for(let i=0;i<q.length;i++){const [x,z]=q[i].split(':').map(Number);for(const n of [`${x+1}:${z}`,`${x-1}:${z}`,`${x}:${z+1}`,`${x}:${z-1}`])if(todo.delete(n))q.push(n);}}return count;}
function frontRuns(mask,w,d){const runs=[];for(let z=0;z<d;z++){let x=0;while(x<w){if(!mask.has(x+':'+z)||mask.has(x+':'+(z-1))){x++;continue;}const start=x;while(x<w&&mask.has(x+':'+z)&&!mask.has(x+':'+(z-1)))x++;runs.push({start,end:x-1,z,length:x-start});}}return runs.sort((a,b)=>a.z-b.z||b.length-a.length);}
function commonCore(masks,w,d){const every=masks[0];for(let z=0;z<=d-3;z++)for(let x=0;x<=w-3;x++){
 let valid=true;for(let zz=z;zz<z+3&&valid;zz++)for(let xx=x;xx<x+3;xx++)if(!every.has(xx+':'+zz)||masks.some(s=>!s.has(xx+':'+zz))){valid=false;break;}
 if(valid)return {x,z,footprint:'3x3',status:'GEOMETRIC_SPACE_ONLY_UNVERIFIED'};
}return null;}
export function inspectPlan(p){
 const {width:w,depth:d}=p.EngineCompatibility.parameters,n=p.BuildingComposition.floorCount;
 const masks=Array.from({length:n},(_,i)=>floorSet(p,i));
 const cc=masks.map(components);
 const overlaps=masks.slice(1).map((s,i)=>{let v=0;for(const cell of s)if(masks[i].has(cell))v++;return v;});
 const need={office:4,hotel:5,apartment:2}[p.BuildingComposition.program];
 const runs=frontRuns(masks[0],w,d),front=runs.find(r=>r.length>=need+2);
 const core=commonCore(masks,w,d);
 const issues=[];
 if(cc.some(c=>c>1))issues.push('一部の階で床版が複数に分離。渡り廊下・昇降動線は未設計');
 if(overlaps.some(x=>x===0))issues.push('上下階に共通する床版がない箇所あり');
 if(!front)issues.push('既存エンジンの正面入口に必要な連続壁面を確認できない');
 if(!core)issues.push('全階共通の3×3コア候補なし。階段・EV・避難動線の配置は未確定');
 const footprintRatio=+((masks[0].size/(w*d))*100).toFixed(1);
 const upperPlateRatio=+((masks.at(-1).size/(w*d))*100).toFixed(1);
 return {measures:{groundFootprintBlocks:masks[0].size,topFloorPlateBlocks:masks.at(-1).size,totalFloorAreaBlocks:p.Massing.totalFloorAreaBlocks,buildingHeightBlocks:p.Massing.heightBlocks,siteEnvelopeBlocks:w*d,groundCoveragePercent:footprintRatio,topPlatePercent:upperPlateRatio,connectedComponentsEachFloor:cc,verticalOverlapBlocks:overlaps,frontageLengthBlocks:front?.length??0,entranceRequiredBlocks:need},geometricEntranceCandidate:front?{x:front.start,z:front.z,usableWidth:front.length,status:'CONCEPT_ONLY_UNVERIFIED'}:null,commonCoreCandidate:core,reviewIssues:issues};
}
function rank(p,a){
 const type=p.BuildingComposition.program,m=p.BuildingComposition.massing;
 const preferred={office:['tower_on_podium','asymmetric_block','slab'],apartment:['courtyard','L_shape','slab'],hotel:['stepped','U_shape','asymmetric_block']}[type];
 const shapeRank=preferred.indexOf(m);const score=40+(shapeRank===0?20:shapeRank===1?14:shapeRank===2?7:0)+Math.min(20,Math.round(a.measures.groundCoveragePercent*.20))-(a.reviewIssues.length*10);
 return {relativeReviewPoints:Math.max(0,Math.min(100,score)),basis:'fixed offline heuristic for comparing forms, NOT a construction quality percentage, safety certification or AI confidence'};
}
export function createReview(text){
 if(typeof text!=='string'||text.length>3000||!text.trim())error('INVALID_INPUT','設計指示が必要です');
 if(blockedAction.test(text))error('LIVE_ACTION_BLOCKED','実施工・ワールド操作の指示はこのオフライン設計ツールで扱いません');
 if(/(?:幅|奥行き?|横幅)\s*\d+.*(?:幅|奥行き?|横幅)\s*\d+.*(?:幅|奥行き?|横幅)\s*\d+/u.test(text))error('DIMENSION_REVIEW_REQUIRED','寸法が複数指定されています。矛盾解決は手動確認が必要です');
 // At most three alternatives, and no alteration to an explicitly requested massing.
 const fixed=fixedRx.test(text.normalize('NFKC'));
 let firstText=text,parsed;
 try{parsed=parseJapanese(firstText);}catch(e){
  if(e.code!=='MASSING_LIMIT'||fixed)throw e;
  firstText=text+'。直方体'; // legacy office 2-3F default conflicts with tower minimum
  parsed=parseJapanese(firstText);
 }
 const variants=[firstText];
 if(!fixed)for(const m of alternatives[parsed.p]){
  if(variants.length>=3)break;
  if(m==='tower_on_podium'&&parsed.floors<4)continue;
  const t=text+'。形状は'+token[m];const form=buildConcept(t).BuildingComposition.massing;
  if(!variants.some(v=>{try{return buildConcept(v).BuildingComposition.massing===form;}catch{return false;}}))variants.push(t);
 }
 const candidates=variants.map((prompt,i)=>{
  const concept=buildConcept(prompt);const assessment=inspectPlan(concept);
  const architecture=planArchitecture(concept);
  const detail=planDetailedCoordinates(concept,architecture);
  const physical=assessPhysicalDesign(concept,architecture,detail);
  const optimization=proposeImprovements(concept,architecture,detail,physical);
  assessment.reviewIssues=[...new Set([...assessment.reviewIssues,...architecture.issues,...detail.issues,...physical.blockingIssues.map(x=>'3D予約: '+x)])];
  const verdict=assessment.reviewIssues.length?'REVIEW_REQUIRED':'SCHEMATIC_CONSISTENCY_CHECKED';
  return {id:'candidate-'+String(i+1).padStart(2,'0'),title:`${names[concept.BuildingComposition.program]} / ${concept.BuildingComposition.massing}`,sourcePrompt:prompt,concept,assessment,architecture,detail,physical,optimization,ranking:rank(concept,assessment),status:verdict};
 });
 candidates.sort((a,b)=>b.ranking.relativeReviewPoints-a.ranking.relativeReviewPoints||a.id.localeCompare(b.id));
 const recommendation=candidates[0]?.id;
 const report={schema:'minecraftaibuilder-step8a-review-v3',status:'OFFLINE_DESIGN_REVIEW_ONLY_NOT_PREPARED',inputText:text,shapeUserSpecified:fixed,candidateCount:candidates.length,rankingNotice:'相対順位は設計レビューの目安。未設計の構造・動線・材料・敷地安全性を評価していません。',recommendedForConceptReview:recommendation,candidates,
  validation:{testedAgainst:'Step7Q reference grammar only; NOT Windows currently installed engine',installedEngineValidated:false,structuralSafetyVerified:false,interiorUsabilityVerified:false,verticalTravelVerified:false,egressVerified:false,buildingQualityProven:false,siteScanPerformed:false,verifiedBlockPalette:false,verifiedMinecraftWorld:false},safety:{...safeObj},BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0}};
 report.reviewSha256=sha(JSON.stringify(report));
 return report;
}
export function writeReview(outputDir,text){
 const report=createReview(text);
 const dir=path.resolve(outputDir);
 if(fs.existsSync(dir))error('OUTPUT_EXISTS','既存フォルダーには上書きしません。新しい出力先を指定してください');
 fs.mkdirSync(dir,{recursive:true});
 const write=(file,data)=>fs.writeFileSync(path.join(dir,file),data,{flag:'wx'});
 write('review.json',JSON.stringify(report,null,2)+'\n');
 write('VIEWER.html',renderReviewHtml(report));
 write('FLOOR_PLANS.html',renderFloorPlanHtml(report));
 write('DETAIL_COORDINATES.html',renderDetailHtml(report));
 write('PHYSICAL_REVIEW.html',renderPhysicalHtml(report));
 write('OPTIMIZATION_REVIEW.html',renderOptimizationHtml(report));
 write('SUMMARY_JA.txt',['MinecraftAIBuilder STEP 8A / OFFLINE DESIGN REVIEW',`STATUS: ${report.status}`,`CANDIDATES: ${report.candidateCount}`,`USER_MASSING_FIXED: ${report.shapeUserSpecified}`,`REVIEW_SHA256: ${report.reviewSha256}`,...report.candidates.map((c,i)=>`${i+1}. ${c.title} / RELATIVE REVIEW POINTS ${c.ranking.relativeReviewPoints} / ${c.status} / ${c.assessment.reviewIssues.join(' ; ')||'幾何上の警告なし'}`),'OPTIMIZATION_REVIEW.html は候補別の通路・部屋割り再計画を原案と比較。品質基準未達の案は棄却。',...report.candidates.map(c=>`OPTIMIZATION ${c.id}: ${c.optimization.status} / ${c.optimization.proposals.map(p=>p.id+':'+p.baseline.collisionCount+'->'+p.revised.collisionCount).join(', ')||'NO ACCEPTABLE IMPROVEMENT'}`),'FLOOR_PLANS.html は概念コア、DETAIL_COORDINATES.html は座標階段・部屋、PHYSICAL_REVIEW.html は3D予約・内外装・衝突レビューを表示。いずれも施工図ではありません。','最適解・建築品質・避難安全・材料互換性・施工可否の証明ではありません。','NO MINECRAFT, NO BRIDGE, NO SCAN, NO BUILD, NOT PREPARED.'].join('\r\n')+'\r\n');
 for(let i=0;i<report.candidates.length;i++)write(`concept-${i+1}.svg`,renderSVG(report.candidates[i].concept));
 return {directory:dir,reviewSha256:report.reviewSha256,candidateCount:report.candidateCount};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
 try{const text=process.argv[2],out=process.argv[3];if(!text||!out)error('USAGE','node runner/step8a-review.mjs "幅24×奥行20の6階建てオフィス" "新規出力ディレクトリ"');console.log('STEP8A_REVIEW_CREATED_NOT_PREPARED',JSON.stringify(writeReview(out,text)));}
 catch(e){console.error('STEP8A_BLOCKED',e.code??'ERROR',e.message);process.exitCode=1;}
}
