/**
 * Literal capabilities in the ORIGINAL request. No genre-to-equipment inference.
 * Shared by model request hints and the limited independent SOURCE audit.
 * An empty list means UNKNOWN, never full functional coverage.
 */
const cues=[
 ['baking-heating','oven',/焼成設備|焼成炉|オーブン|パンを焼|\boven\b/i],
 ['washing-basin','washbasin',
  /洗面台|手洗い設備|手洗い場|手洗いを行(?:う|い)|手洗いをする|手を洗(?:う|い)|\bwashbasin\b|\bhandwashing\b/i],
 ['sleeping-bed','bed',/ベッド|就寝用ベッド|\bbed\b/i],
 ['electronic-maintenance','electronics',
  /電子機器(?:の|を)(?:点検|整備|操作)|\belectronic (?:equipment )?maintenance\b/i],
 ['fabrication-bench','workbench',
  /工作台|製作用作業台|組立作業台|生地をこね(?:る|て|ます|ています)?(?!ない|ません)|パン生地をこね(?:る|て|ます|ています)?(?!ない|ません)|\bknead(?:ing)? (?:the )?dough\b|\bworkbench\b/i],
 ['assembly-workstation','assembly-table',
  /組立作業|組み立て作業|組立工程|(?:部品|製品|模型)の組(?:み)?立(?:て)?(?:[、，,]|を|作業)|\bassembly (?:station|table)\b/i],
 ['parts-inspection','inspection-stand',
  /点検(?:作業|工程|を(?:行(?:う|い)|する)|[、，,])|検査(?:台|設備|作業|を(?:行(?:う|い)|する))|\binspection (?:stand|station)\b/i],
 ['parts-storage','storage',
  /保管(?:室|庫|棚|設備|作業|を(?:行(?:う|い)|する)|[、，,])|部品の収納|\b(?:parts storage|storage rack)\b/i],
 ['exhibit-stand','display',
  /展示ケース|展示台|展示設備|展示できる|展示する|展示を行(?:う|い)|展示を(?:見られる|見る|観覧する)|\bdisplay (?:case|stand|fixture)\b/i],
 ['records-desk','desk',
  /事務机|記録用(?:の)?机|作業用デスク|記録(?:室|作業|を(?:行(?:う|い|います)|する)|[、，,])|\bdesk\b|\brecord(?:ing|s)? (?:desk|station)\b/i]
];
// A negated equipment mention is not a user request for that equipment.
// Conservative suffix check: unsupported constructions remain outside coverage.
const negated=/^(?:[\s　、]*(?:は|が|を|の|も|など|作業|こと|行為|設備|設置)?){0,4}[\s　]*(?:不要|要らない|いらない|必要(?:は|が)?ない|なし|無し|置かない|設置しない|使わない|省く|禁止)/;
function explicitlyRequested(pattern,brief){
 const global=new RegExp(pattern.source,pattern.flags.replace(/g/g,'')+'g');
 for(const match of brief.matchAll(global)){
  const suffix=brief.slice(match.index+match[0].length,
   match.index+match[0].length+24);
  if(!negated.test(suffix))return true;
 }
 return false;
}
export function inferR125ExplicitActivityRequirements(brief){
 if(typeof brief!=='string'||!brief.trim()||brief.length>8000)return [];
 return cues.filter(([, ,pattern])=>explicitlyRequested(pattern,brief))
  .map(([capability,requiredRole])=>({capability,requiredRole}));
}
