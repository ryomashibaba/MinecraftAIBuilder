/**
 * R77 — human-authored architectural concept brief for a FUTURE consented
 * model attempt, anchored to frozen c01 and R76's exact evidence. This
 * is neither a generated model design nor proof of buildability or beauty.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {CREATION_CASES} from '../source/ai/b198b-benchmark-cases.mjs';
import {synthesizeR76ReviewDecisions,SCHEMA as R76_SCHEMA}
 from './b198zr76-architecture-next-decisions.mjs';
export const SCHEMA='minecraftaibuilder-b198zr77-cohesive-architecture-brief-v1';
const c01=CREATION_CASES.find(x=>x.id==='c01');
const sha=x=>createHash('sha256').update(x).digest('hex');
const fail=x=>{throw Error('B198ZR77_'+x)};
const esc=x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
 modelCalls:0,worldContacts:0,worldReads:0,worldWrites:0});
const idea=Object.freeze({
 name:'潮光の裂帆図書館 — Tidal Light Library',
 status:'HUMAN_AUTHORED_HYPOTHESIS_NOT_GENERATED_GEOMETRY',
 bigIdea:'海辺の潮の流れを受ける一枚の巨大な帆が二つの非対称な建築の翼に裂け、間に空へ抜ける都市規模の公共空洞を抱く。外殻の曲面と内部の書架段丘が同じ流線から生まれる。',
 designNarrative:[
  {id:'01_PUBLIC_ARRIVAL',title:'公共の海辺から自然に入る',
   mustResolve:'誰もが発見できる入口、海沿いの広場、内部公共空間の高低差をひと続きの到着体験として考える。入口を点やラベルだけで済ませない。',
   spatialEvidence:'入口の高さ、床との接続、出入口の空気、通行の必要な幅と支持床は実形状で見る。海辺と地面の高さは未確定。'},
  {id:'02_SKY_ATRIUM',title:'屋根まで切り抜けた主役のアトリウム',
   mustResolve:'中央の巨大な負の空間を上部まで保ち、空に向かって光と視線が伸びるようにする。真ん中を支持床で埋めない。',
   spatialEvidence:'外観の大きさとは別に内側の空気・頭上空間・連続した開口を最終ボクセルで確認。'},
  {id:'03_TWO_BOOK_WINGS',title:'左右の翼が実際の立体書架を抱える',
   mustResolve:'左右の曲面外殻を居住可能な書架段丘と閲覧空間に変える。書架の列・歩ける閲覧床・机・眺望を、ただの飾り箱でなく一緒に成立させる。',
   spatialEvidence:'実床、開いた棚の前、読書に必要な空気、上下の閲覧床との接続を目視で確かめる。'},
  {id:'04_CONTINUOUS_ROUTE',title:'明確な上下移動と本当の踊り場',
   mustResolve:'海辺の入口→下層閲覧→上層書架→星空ラウンジという公共の連続体験を、アトリウムをつぶさず設計する。螺旋階段・側翼ランプ・外周回廊などは自由に検討できるが実体をつくる。',
   spatialEvidence:'歩行可能性・階段の使いやすさ・支持床は別途検証。R70の仮入口やR71の最近傍ペアだけでは確認できない。'},
  {id:'05_GLASS_SKY_LOUNGE',title:'高層ガラスラウンジを建築の終着点へ',
   mustResolve:'透明な星空観察ラウンジを最上層の明確な場所に置き、意図した支持構造とアクセスをもたせる。単なる頭上の浮遊ガラス塊にしない。',
   spatialEvidence:'高層床、内側の観察空気、天候を感じるガラス外皮、下層から到達するための踊り場を検討。'},
  {id:'06_INTEGRATED_SILHOUETTE',title:'海流の曲面が内外の全体形をつくる',
   mustResolve:'曲面的な遠景シルエット・書架翼・巨大吹抜け・ガラスラウンジを一つの造形言語で統合し、正面・斜視・側面・俯瞰と内部から評価する。箱を並べただけの外装や単なる薄い輪を避ける。',
   spatialEvidence:'形態の読みやすさ・造形の成熟度・都市規模の迫力は人間の視覚審査でしか確認できない。'}
 ],
 variationFreedom:'この案は議論の出発点であり、新しい大胆な造形案がこれを超えるなら自由に変更してよい。リング、アーチ、塔、曲面、二重外殻、浮遊床など構造カテゴリー自体を禁止しない。先にMinecraftのブロック都合で美術を貧弱にしない。',
 nonGoals:['単なる多量のボクセルや高さ閾値で品質PASS',
 'モデル申告spatialPlanだけで入口や階段を認定',
 'R71最近傍の2点を自動的に橋でつなぐ',
 '人間の見ていない品質の成功判定',
 '過去R48/R54の元回答の上書き・施工']
});
export function prepareR77FutureArchitecturalBrief({
 raw,expectedRawSha256,b143Status,expectedGeometrySha256=null,
 r61Evidence=null,r64Evidence=null,r66Evidence=null,r67Evidence=null,
 r68Evidence=null,r69Evidence=null,r70Evidence=null,r71Evidence=null,
 r72Evidence=null,r73Evidence=null,r74Evidence=null,
 r62Evidence,r76Evidence
}={}){
 if(typeof raw!=='string'||!raw||Buffer.byteLength(raw)>120000||
  sha(raw)!==expectedRawSha256||!c01||c01.criteria.length!==4)
  fail('FROZEN_C01_RAW_REQUIRED');
 const verified=synthesizeR76ReviewDecisions({raw,expectedRawSha256,
  b143Status,expectedGeometrySha256,r61Evidence,r64Evidence,
  r66Evidence,r67Evidence,r68Evidence,r69Evidence,
  r70Evidence,r71Evidence,r72Evidence,r73Evidence,r74Evidence,
  r62Evidence});
 if(!r76Evidence||r76Evidence.schema!==R76_SCHEMA||
  JSON.stringify(r76Evidence)!==JSON.stringify(verified))
  fail('R76_EVIDENCE_RECOMPUTE_MISMATCH');
 if(verified.frozenHumanQualityCriteria.length!==4||
  verified.frozenHumanQualityCriteria.some((criterion,i)=>
   criterion.id!==c01.criteria[i].id||
   criterion.requirement!==c01.criteria[i].description||
   criterion.status!=='NOT_REVIEWED'))
  fail('FOUR_FROZEN_HUMAN_REQUIREMENTS_NOT_PRESERVED');
 const hold=verified.status==='HOLD_NO_FINAL_VOXEL_ARCHITECTURE';
 const frozen=c01.criteria.map(c=>({
  id:c.id,requirement:c.description,
  visualOrFunctionalHumanEvidence:'NOT_REVIEWED',
  modelSelfReportCannotCertify:true,
  thresholdCannotCertify:true
 }));
 const tasks=[
  {id:'A',title:'まず強い建築の着想を定義',
   actionable:'巨大空洞・本棚翼・高層ガラスラウンジと外観を一つの造形着想から説明する。採用する構造や材料は自由。基本構想が貧弱なら初めから作り直す。',
   evidence:'文章上の発想は構築・画像・機能の成功証明ではない'},
  {id:'B',title:'建築断面の公共空間を成立させる',
   actionable:'入口→書架を持つ閲覧階→上層公共空間→星空ラウンジが、切断面でそれぞれ居住可能な空洞・床・アクセスとして読み取れるよう計画。アトリウムは全高で空に抜く。',
   evidence:'R64/R69/R70の支持床と概念的到達、R66/R68の頭上空気を再確認'},
  {id:'C',title:'外形と内部を同じ建築にする',
   actionable:'外殻がただの飾りではなく、本棚段丘・回遊経路・高層ラウンジを包むように整える。遠景と正面・側面・斜視・俯瞰・内部視点で意味ある厚みと断面変化を確認。',
   evidence:'R72原本断面と4つの独立人間品質基準。美観を自動PASSさせない'},
  {id:'D',title:'成立した一案だけをB143で正確に表現',
   actionable:'建築構想を先に完成させたうえで、将来許可された生成でB143形式・材料・ADD/CUT・範囲・最終ボクセル・spatialPlanを一致させる。コンパイル失敗ならHOLDのまま原本を保護する。',
   evidence:'B143厳格コンパイラとR49/R61。生成のやり直しには別途明示承認'}
 ];
 const decisions=verified.reviewPackages.map(pkg=>({
  id:pkg.id,title:pkg.title,
  dependencyStatus:hold&&pkg.id!=='01_SOURCE_TRUTH'?
   'BLOCKED_BY_B143_HOLD':'INDEPENDENT_HUMAN_REVIEW_REQUIRED',
  existingIssueKinds:pkg.observedIssueKinds,
  suggestion:pkg.nextHumanDecision,
  actualRemediationValidated:false
 }));
 const nextInput=[
  'FOR FUTURE SEPARATELY CONSENTED QWEN ATTEMPT ONLY — DO NOT EXECUTE.',
  'Frozen original Japanese brief: '+c01.prompt,
  'Design a NEW, deeply coherent futuristic seaside public library. Use an architecture-first creative approach; do not copy the old failing original.',
  'Optional art hypothesis, not a required template: '+idea.name+'。'+idea.bigIdea,
  ...idea.designNarrative.map(x=>x.title+' — '+x.mustResolve),
  'Do not merely label rooms. Make occupied reading floors, a large roof-height void, left and right BOOKSTACK WINGS, and a physically meaningful glass observation lounge that is reached by a continuous circulation concept.',
  'Freedom: '+idea.variationFreedom,
  'Use the strict frozen B143 four-key JSON contract from the existing repository ONLY when expressing the completed concept. Geometry and every spatialPlan claim must correspond; no fake PASS or inferred real Minecraft safety.',
  ...decisions.map(x=>'Evidence dependency ['+x.id+'] '+x.dependencyStatus+': '+x.suggestion),
  'All four original independent criteria remain NOT_REVIEWED; require human visual and functional judgment.',
  'No model invocation without fresh explicit one-time consent. No Minecraft construction or world contact.'
 ].join('\n');
 return {schema:SCHEMA,status:hold?
   'ARCHITECTURE_FIRST_BRIEF_B143_SOURCE_HOLD':
   'ARCHITECTURE_FIRST_BRIEF_FINAL_VOXEL_QUALITY_UNVERIFIED',
  originalRawSha256:expectedRawSha256,
  frozenOriginalPromptSha256:sha(c01.prompt),
  frozenOriginalPrompt:c01.prompt,
  reviewedR76Status:verified.status,
  reviewDependencies:decisions,
  independentCriteria:frozen,
  conceptHypothesis:idea,
  orderedDesignActions:tasks,
  futureOnlyUnexecutedModelInput:nextInput,
  outputPolicy:'NO_AUTOMATIC_QWEN_INVOCATION_OR_ARTISTIC_PASS',
  authoringStatus:'HUMAN_AUTHORED_FUTURE_BRIEF_NOT_REAL_MODEL_IMPROVEMENT',
  sourceModelOutputUnmodified:true,
  noAutomaticScoringOrModelSelection:true,
  noModelCallAuthorized:true,
  humanVisualReview:'NOT_REVIEWED',
  executedDesign:null,modelCalls:0,worldWrites:0,safety:safe()};
}
export function writeR77FutureArchitecturalBrief({destination,...params}={}){
 if(typeof destination!=='string'||!path.isAbsolute(destination)||
  !fs.existsSync(destination)||!fs.lstatSync(destination).isDirectory()||
  fs.lstatSync(destination).isSymbolicLink())
  fail('EXISTING_NORMAL_EVIDENCE_DIRECTORY_REQUIRED');
 const json=path.join(destination,'R77_FUTURE_ARCHITECTURE_BRIEF.json'),
  html=path.join(destination,'R77_COHESIVE_LIBRARY_DESIGN_BRIEF.html'),
  text=path.join(destination,'R77_FUTURE_ONLY_MODEL_BRIEF_UNEXECUTED.txt');
 if([json,html,text].some(x=>fs.existsSync(x)))
  fail('NEVER_OVERWRITE_ORIGINAL_REVIEW');
 const r=prepareR77FutureArchitecturalBrief(params);
 const prog=r.conceptHypothesis.designNarrative.map(x=>
  '<section><h3>'+esc(x.title)+'</h3><p>'+esc(x.mustResolve)+'</p>'+
  '<p><small>検証すること：'+esc(x.spatialEvidence)+'</small></p></section>').join('');
 const criteria=r.independentCriteria.map(x=>
  '<li>'+esc(x.requirement)+' — 未審査</li>').join('');
 const actions=r.orderedDesignActions.map(x=>
  '<li><b>'+esc(x.title)+'</b>：'+esc(x.actionable)+'</li>').join('');
 const document='<!doctype html><html lang="ja"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;">'+
  '<title>R77 実際の建築品質を狙う設計ブリーフ</title>'+
  '<style>body{font:15px/1.7 system-ui;max-width:920px;margin:24px auto;padding:0 20px;color:#294157}section{border-top:1px solid #cbd6df;padding:8px 0}.notice{padding:13px;background:#fff1d8}small{color:#586c7a}h3{margin:10px 0}li{margin:9px 0}</style></head><body>'+
  '<h1>R77 建築として成立する未来型公共図書館へ</h1>'+
  '<p class="notice">これは次の未実行モデル生成に向けた人間作成の設計提案であり、実Qwenの作品でも建築品質の合格でもありません。Minecraftワールド・モデル呼び出し・施工はすべて0。</p>'+
  '<p>凍結原要求：'+esc(r.frozenOriginalPrompt)+'</p>'+
  '<h2>着想：'+esc(r.conceptHypothesis.name)+'</h2><p>'+
  esc(r.conceptHypothesis.bigIdea)+'</p>'+prog+
  '<h2>設計の順番</h2><ol>'+actions+'</ol>'+
  '<h2>独立した人間の品質基準</h2><ul>'+criteria+'</ul>'+
  '<p>造形の自由度：'+esc(r.conceptHypothesis.variationFreedom)+'</p>'+
  '<p>出所SHA '+esc(r.originalRawSha256)+
  ' ／原本状態 '+esc(r.reviewedR76Status)+'</p>'+
  '<p>同一レビューの <a href="R76_ARCHITECTURE_NEXT_DECISIONS.html">R76優先判断</a>と '+
  '<a href="R62_NEXT_DESIGN_REVIEW.html">R62根拠</a>も参照。</p>'+
  '<p>新たなQwen推論には別の明示的な単発承認が必要。NOT_PREPARED、9ゲートBLOCKED。</p></body></html>';
 fs.writeFileSync(json,JSON.stringify(r,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(html,document,{flag:'wx'});
 fs.writeFileSync(text,r.futureOnlyUnexecutedModelInput+'\n',{flag:'wx'});
 return {relativeFile:path.basename(html),status:r.status,
  modelCalls:0,worldWrites:0};
}
