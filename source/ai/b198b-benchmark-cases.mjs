/**
 * Frozen B198B evaluation suite. This is USER INTENT/QUALITY evidence,
 * NOT a prompt-to-shape keyword implementation. The LLM gets natural
 * language; an evaluator later scores the meaning on independent criteria.
 * Exactly 12 distinct architectural genres and 4 real follow-up requests.
 */
export const SUITE_VERSION='b198b-architecture-benchmark-v1';
const caseOf=(id,genre,prompt,criteria,sourceGoals={})=>Object.freeze({
 id,kind:'creation',genre,prompt,
 criteria:Object.freeze(criteria.map((description,index)=>Object.freeze({
  id:id+'-intent-'+(index+1),description,
  requiresHumanVisualAndSemanticJudgment:true
 }))),
 sourceGoals:Object.freeze({
  minVoxels:sourceGoals.minVoxels??500,
  minHeightSpan:sourceGoals.minHeightSpan??7,
  minMaterialFamilies:sourceGoals.minMaterialFamilies??2,
  minDistinctGeometries:sourceGoals.minDistinctGeometries??2
 }),
});
export const CREATION_CASES=Object.freeze([
 caseOf('c01','civic','海沿いに建つ大きな未来型の公共図書館。中央には屋根まで続く巨大な吹き抜けがあり、左右に立体書架、最上階には透き通った星空観察ラウンジを配置。外観は曲線的で統一感を出す。',
  ['図書館として明確に読める公共建築','中央が単なる塊ではなく大きく抜けている','展望ラウンジが高層にある','曲面と階層の外観に統一感がある'],{minHeightSpan:20}),
 caseOf('c02','performing-arts','丘に埋め込んだ野外音楽劇場。すり鉢状の三段客席から中央の光る舞台が見える。左右に安全そうな通路、屋根はほぼ空に開放される。',
  ['すり鉢形状の客席','三段の高さ関係','舞台が客席から認識できる','開放的な屋根'],{minHeightSpan:10}),
 caseOf('c03','industrial','海上の大型未来港。幅広い積み込みデッキ、巨大ガントリークレーン、高い管制塔を持ち、物流の作業空間と旅客の歩く場所がはっきり分かれる。',
  ['工業港の明確なシルエット','ガントリークレーンの機械らしさ','管制塔が高く目立つ','作業エリアと旅客エリアの分離'],{minHeightSpan:24}),
 caseOf('c04','residential','温室を中心にした集合住宅。共用温室は大きな透明な空間で、周囲に高さの異なる4棟の居住棟。日光の入るスカイブリッジで各棟をゆるく結ぶ。',
  ['4棟の高さが異なる','中央温室が透明で開放的','棟の関係が一目で理解できる','屋上や橋の連続性がある'],{minHeightSpan:17}),
 caseOf('c05','sacred','近未来の和風寺院。伝統的な多層屋根と荘厳な参道を大事にしながら、透明な光の塔や空中庭園を融合。神社や西洋の大聖堂にすり替えない。',
  ['和風寺院として認識できる','複層の屋根がある','参道の空間がある','光の塔が寺院の主役を奪いすぎない'],{minHeightSpan:15}),
 caseOf('c06','science','砂漠に建つ巨大天体観測研究所。中央に大きな球形ドーム、複数の小さい観測ドーム、低層の研究棟と長い連絡デッキ。研究棟が単なる飾りにならないこと。',
  ['主ドームと小ドームの対比','低層研究棟のまとまり','建物内の移動を意識した連絡デッキ','砂漠の孤立研究拠点らしい構図'],{minHeightSpan:17}),
 caseOf('c07','aquatic','海中の観光水族館。水槽に囲まれた透明な管状回廊、球形の展示室、海面側の入口を持つ。水中部分は明るく広々して、展示室同士の見通しを保つ。',
  ['透明な回廊らしい造形','球形展示室','海面からの入口と展示の位置関係','視界を遮る塊が少ない'],{minHeightSpan:15}),
 caseOf('c08','transit','空中都市の乗換駅。幅のある複数の水平ホームと上階の巨大コンコースを備え、斜めに走る巨大支柱と吊り屋根でダイナミックな遠景を作る。実際に歩けない動線を歩けると断言しない。',
  ['水平ホームが視覚的に複数ある','上階のコンコース','巨大斜材と吊り屋根','通行可能性について慎重な説明'],{minHeightSpan:26}),
 caseOf('c09','nature','空中に浮かんだ三層の未来植物園。中央には大きな一本の幹のような柱、各層から外側へテラスが伸び、丸い温室が3つ、全体は有機的に見えるように。',
  ['樹木の幹のような中心柱','高さの異なる三層','外向きのテラス','温室が3つの群として理解できる'],{minHeightSpan:22}),
 caseOf('c10','art','現代美術館。外観は大きくねじれたリングを主役にし、内部は立体展示室が三方向に分岐する。外部と内部が同じ建物だと分かる一体感を持たせる。',
  ['リングを主役にした独創的な外観','内部展示室が3方向に分岐','吹抜けと展示床のバランス','外装だけのモックで終わらない'],{minHeightSpan:18}),
 caseOf('c11','education','科学高校のキャンパス。体育館のような大空間と低層の教室棟、中央交流広場、2つの実験棟をはっきり区別し、建物をただ大きな箱の列にしない。',
  ['体育館らしい大空間','教室と実験棟の区分','交流広場','単調な箱の反復を避けた立面'],{minHeightSpan:13}),
 caseOf('c12','shelter','巨大な山岳気象観測シェルター。分厚い耐風外殻と細い上部観測塔、入口前の守られた吹き溜まりを意識した前庭。内部に作業室と休憩室の区画。',
  ['山岳基地らしい風に強そうな外観','観測塔が独立して見える','外部前庭の構成','室内用途の異なる区画'],{minHeightSpan:20})
]);
const revOf=(id,baseCaseId,prompt,criteria)=>Object.freeze({
 id,kind:'revision',baseCaseId,prompt,
 criteria:Object.freeze(criteria.map((description,index)=>Object.freeze({
  id:id+'-intent-'+(index+1),description,
  requiresHumanVisualAndSemanticJudgment:true
 }))),
 protect:'FIRST_SOURCE_ELEMENT',maxChangedElements:18
});
export const REVISION_CASES=Object.freeze([
 revOf('r01','c01','図書館の中央吹抜けは保持し、屋根上の星空観察ラウンジだけ大きな丸いガラス空間に変更。その他の階層や書架は変更しないで。',
  ['ラウンジに狙い通りの局所改修がある','旧吹抜けが残っている','他の部材が意図なく改変されていない']),
 revOf('r02','c03','港のクレーンを高く、少し傾いた骨格に変更して。通路と船着き場はそのまま維持し、塔や荷積みデッキを消さないで。',
  ['クレーンの高さと形が変わっている','船着き場と歩行デッキを維持','管制塔が残る']),
 revOf('r03','c05','参道や本堂は変えずに、背後の光の塔に発光する円環を一つ加えて。寺院全体をSF基地にはしないで。',
  ['光の塔に円環が実際に付いた','本堂と参道の形を保った','寺院としての雰囲気を守った']),
 revOf('r04','c08','最上段の吊り屋根だけを大胆に延長して。既存の駅ホームを削除せず、低層部分のレイアウトは維持して。',
  ['屋根が意図通り延長された','従来のホームが消えていない','低層構造が大きく変わらない'])
]);
export const BENCHMARK=Object.freeze({
 schema:SUITE_VERSION,createdFor:'B198B true-model quality and follow-up stability testing',
 expectedLiveCreationCases:CREATION_CASES.length,
 expectedLiveRevisionCases:REVISION_CASES.length,
 actualProviderModelsRequired:true,
 geometryOnlyDoesNotProvePromptCompliance:true,
 humanScoringMandatory:true,
 creationCases:CREATION_CASES,revisionCases:REVISION_CASES
});
export function verifyBenchmark(){
 const all=[...CREATION_CASES,...REVISION_CASES];
 const ids=new Set(all.map(c=>c.id));
 return CREATION_CASES.length===12&&REVISION_CASES.length===4&&
  ids.size===16&&all.every(c=>c.prompt.length>30&&
  c.criteria.length>=3&&
  new Set(c.criteria.map(x=>x.id)).size===c.criteria.length)&&
  REVISION_CASES.every(c=>ids.has(c.baseCaseId)&&
  c.maxChangedElements<=24);
}
