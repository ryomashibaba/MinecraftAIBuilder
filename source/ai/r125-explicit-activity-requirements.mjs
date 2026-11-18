/**
 * Literal capabilities in the ORIGINAL request. No genre-to-equipment inference.
 * Shared by model request hints and the limited independent SOURCE audit.
 * An empty list means UNKNOWN, never full functional coverage.
 */
const cues=[
 ['baking-heating','oven',/焼成設備|焼成炉|オーブン|パンを焼|\boven\b/i],
 ['washing-basin','washbasin',/洗面台|手洗い設備|手洗い場|\bwashbasin\b/i],
 ['sleeping-bed','bed',/ベッド|就寝用ベッド|\bbed\b/i],
 ['electronic-maintenance','electronics',
  /電子機器(?:の|を)(?:点検|整備|操作)|\belectronic (?:equipment )?maintenance\b/i],
 ['fabrication-bench','workbench',
  /工作台|製作用作業台|組立作業台|\bworkbench\b/i],
 ['exhibit-stand','display',
  /展示ケース|展示台|展示設備|\bdisplay (?:case|stand|fixture)\b/i],
 ['records-desk','desk',
  /事務机|記録用(?:の)?机|作業用デスク|\bdesk\b/i]
];
export function inferR125ExplicitActivityRequirements(brief){
 if(typeof brief!=='string'||!brief.trim()||brief.length>8000)return [];
 return cues.filter(([, ,pattern])=>pattern.test(brief))
  .map(([capability,requiredRole])=>({capability,requiredRole}));
}
