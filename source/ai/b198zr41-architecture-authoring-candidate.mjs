/**
 * R41 — compact architecture-first drafting candidate + reusable model-output
 * feedback. OFFLINE / NOT ENABLED. No generator, transport or world adapter.
 * Never mutates, repairs, retries or relabels a real model original.
 */
import {createHash} from 'node:crypto';
import {reviewR4PlannedProposal} from './b198zr4-planned-source.mjs';
import {R30_GUIDE_SHA256,R30_GUIDE_UTF8_BYTES}
 from './b198zr30-generalized-space-guide.mjs';

export const SCHEMA='minecraftaibuilder-b198zr41-architecture-authoring-v1';
export const PROFILE='r41-space-first-candidate-NOT_ENABLED';
export const R41_DRAFT_GUIDE=[
 'You are an inventive spatial architect. Respond to the Japanese brief with a NEW building composition and useful interior, never a category template, copied plan, hard-coded coordinates or a cosmetic reskin.',
 'Return one COMPLETE minified JSON object with EXACT top-level keys design, spatialPlan, explanation, assumptions. No markdown or narration outside JSON. Favor a few substantial architectural forms over excessive repeated decorative elements; finish all brackets inside the output budget.',
 'design EXACT fields: schema,id,title,brief,bounds,elements,designOnly. schema="minecraftaibuilder-b143-building-dsl-v1", designOnly=true; id lowercase hyphen slug, short title and brief. bounds width/depth 8..128, height 8..96, volume <=500000. All local coordinates and COMPLETE extents stay inside the bounds.',
 'Each element has unique id, shape, mode. Valid shapes: box(origin,size), ellipsoid(center,radii), cylinder(origin,axis,radius,length), torus(center,axis,majorRadius,tubeRadius), beam(start,end,thickness), staircase(origin,axis,direction,width,steps,treadDepth). All coordinates are integer local grid values. staircase is add-only; axis x or z; direction 1 or -1; width 2..12, steps 2..32, treadDepth 1..3. Shape-specific validation still applies.',
 'Every add must have material from stone,concrete,metal,glass,wood,glow,accent. Every cut MUST OMIT material. Shells require a real supported shell parameter, not an element name containing "shell". Optional repeat:{count,offset} creates translated copies and must fit within bounds.',
 'Mentally design occupied solids AND empty usable air first: primary massing, genuinely hollow rooms, entry route, supported floors and upper landings. Solid boxes fill their entire volume unless shell is supplied or a later cut removes cells. Decide massing from the brief, not from a standard library/house silhouette.',
 'Sequence the relevant solids before the openings/void cuts that must remain empty at the end; avoid any later add that refills required voids. This is a planning discipline, NOT permission for a software auto-reorder or automatic correction of your source.',
 'At the entrance use an EMPTY standing cell y>=1, a solid floor exactly below and 2 or 3 empty headroom cells. Every declared destination and usable zone must connect by supported standable cells, including proper staircase landing heights; a named reading room or lounge alone proves nothing.',
 'spatialPlan EXACT fields: designIntent,massStrategy,circulationStrategy,entrance,headroom,protectedVoids,destinations,functionalZones. Use short original intent strings (>=8 chars). protectedVoids objects {id,origin,size,maxOccupiedCells}; destinations {id,point,maximumPathSteps}; functionalZones {id,origin,size,minimumReachablePositions,minimumReachablePercent}. Include meaningful actual accessible air areas rather than furniture solids, and do not invent implausibly low thresholds.',
 'Use curved/asymmetric forms, volumes, bridges, terraces or loops only when appropriate to the specific brief. Preserve freedom of scale, program, circulation and style. Avoid extra prose: explanation is a short string; assumptions is a small array of short strings. Never claim verification, real Minecraft walking, construction or human aesthetic approval.'
].join('\n');
const hash=s=>createHash('sha256').update(s).digest('hex');
export const GUIDE_SHA256=hash(R41_DRAFT_GUIDE);
export const GUIDE_UTF8_BYTES=Buffer.byteLength(R41_DRAFT_GUIDE);
export const PARENT_R30_SHA256=R30_GUIDE_SHA256;
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},worldContacts:0,worldWrites:0});
const errorHints=Object.freeze({
 B143_MATERIAL:'CUTからmaterial属性を除去し、ADDには許可されたmaterialを明記する。原本の自動修正は禁止。',
 B143_OUTSIDE_LOCAL_BOUNDS:'全形状とrepeatの最遠端まで、指定boundsの内側に収まる設計にする。',
 B143_WORK_BUDGET:'形状の占有計算範囲を減らすか、建築の構成と寸法を設計から見直す。',
 B143_VOXEL_BUDGET:'最終ソリッド体積を設計上減らす。内部空洞を意図した場所は実際に空ける。',
 B143_TITLE_OR_BRIEF:'title/briefに必要な非空文字列を正規の構文で記載する。',
 B198ZR3_CONTRACT_ENTRANCE_NOT_STANDABLE:'入口の最終座標で支持床・足元の空気・頭上2〜3セルを確保する。座標の自動変更は禁止。',
 B198ZR4_NOT_JSON:'一回の応答で完結した四キーJSONを出力する。既存原本へ閉じ括弧を補わない。',
 B198ZR4_EXPECTED_FOUR_KEYS:'design/spatialPlan/explanation/assumptionsの四キーだけを出力する。'
});
const errorCode=e=>String(e?.message??'').match(/\b(?:B143|B198ZR[34])_[A-Z0-9_]+/)?.[0]??'UNCLASSIFIED_HOLD';
export function inspectR41Draft(){
 return {schema:SCHEMA,profile:PROFILE,activation:'NOT_ENABLED',
  guideSha256:GUIDE_SHA256,guideUtf8Bytes:GUIDE_UTF8_BYTES,
  referenceR30Sha256:PARENT_R30_SHA256,
  referenceR30Utf8Bytes:R30_GUIDE_UTF8_BYTES,
  smallerThanR30Bytes:GUIDE_UTF8_BYTES<R30_GUIDE_UTF8_BYTES,
  tokenizerMeasured:false,contextFitMeasured:false,
  successRateMeasured:false,realModelImprovementProven:false,
  liveModelProfileActivated:false,modelCalls:0,worldContacts:0,
  worldWrites:0,safety:safe()};
}
/** Diagnose one raw source WITHOUT writing to it or attempting another model call.
 * Report only real B143/R3/R4 results; no claim that the model was authenticated.
 */
export function inspectR41Candidate(raw){
 if(typeof raw!=='string'||!raw.length||Buffer.byteLength(raw)>120000)
  throw Error('B198ZR41_RAW_SIZE');
 const rawSha256=hash(raw);
 const common={schema:SCHEMA,rawSha256,rawBytes:Buffer.byteLength(raw),
  originalUnchanged:true,modelAuthorshipAuthenticated:false,
  independentHumanQualityApproved:false,minecraftWalkingVerified:false,
  constructionApproved:false,modelCalls:0,worldContacts:0,worldWrites:0,
  safety:safe()};
 let review;
 try{review=reviewR4PlannedProposal(raw)}
 catch(e){
  const code=errorCode(e);
  return {...common,status:'HOLD_SOURCE_OR_ENTRANCE',
   sourceErrorCode:code,
   issues:[{kind:'STRICT_SOURCE_OR_ENTRANCE',id:null,
    feedback:errorHints[code]??'厳格な構文・入口・空間契約が不成立。元のエラーを調査し、新しい派生案として設計し直す。'}]};
 }
 const plan=review.declaredPlanReview;
 const issues=[
  ...plan.results.protectedVoids.filter(x=>!x.passed).map(x=>({
   kind:'VOID_REFILLED',id:x.id,occupied:x.occupied,volume:x.volume,
   feedback:'最終ADD/CUT後も必要な空洞が塞がれている。形状の配置と演算順を設計から見直す。'})),
  ...plan.results.destinations.filter(x=>!x.passed).map(x=>({
   kind:'DESTINATION_UNREACHABLE_OR_TOO_FAR',id:x.id,
   shortestPathSteps:x.shortestPathSteps,
   feedback:'支持床、入口、階段上端、着地床、頭上クリアランスを経路全体で確認する。'})),
  ...plan.results.functionalZones.filter(x=>!x.passed).map(x=>({
   kind:'FUNCTIONAL_ZONE_NOT_USABLE',id:x.id,reachable:x.reachable,
   regionVolume:x.regionVolume,
   feedback:'家具と構造の占有セルを区別し、利用できる空気・支持床・接続を確保する。'}))
 ];
 return {...common,status:issues.length===0?
   'FORMAL_GEOMETRY_ONLY_PASS_HUMAN_REVIEW_REQUIRED':
   'HOLD_SPATIAL_BUILDABILITY',
  sourceErrorCode:null,sourceSha256:review.compiled.sourceSha256,
  geometrySha256:review.compiled.geometrySha256,
  conceptualVoxels:review.compiled.primitives.length,
  abstractReachablePositions:plan.results.abstractReachablePositions,
  contractAuthorship:plan.contractAuthorship,issues};
}
