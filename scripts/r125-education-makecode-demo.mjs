/** Deliberately small USER-independent offline demo: one genuinely B143 voxel house.
 * This fixture is NOT model-authored, not a user-request fulfilment, not MC-executed.
 * CI publishes MakeCode and inventory to permit ONE manual flat-world test.
 */
import fs from 'node:fs';
import path from 'node:path';
import {compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {exportB143EducationMakeCode} from '../source/ai/r125-education-makecode-export.mjs';
export const SIMPLE_HOUSE={
 schema:'minecraftaibuilder-b143-building-dsl-v1',id:'mab-first-small-test-house',
 title:'Small flat-roofed house, synthetic',brief:'Synthetic one-storey shell/door/window for first Minecraft Education bridge QA',
 bounds:{width:18,height:10,depth:18},designOnly:true,elements:[
 {id:'building-shell',shape:'box',mode:'add',material:'stone',origin:[3,0,3],size:[12,7,12],shell:1},
 {id:'solid-roof',shape:'box',mode:'add',material:'wood',origin:[3,6,3],size:[12,1,12]},
 {id:'front-door',shape:'box',mode:'cut',origin:[7,1,3],size:[2,3,1]},
 {id:'front-window-opening',shape:'box',mode:'cut',origin:[10,2,3],size:[2,2,1]},
 {id:'front-window-glass',shape:'box',mode:'add',material:'glass',origin:[10,2,3],size:[2,2,1]},
 {id:'side-window-opening',shape:'box',mode:'cut',origin:[3,2,7],size:[1,2,3]},
 {id:'side-window-glass',shape:'box',mode:'add',material:'glass',origin:[3,2,7],size:[1,2,3]}
]};
export function makePilotDemo({out}={}){
 if(typeof out!=='string'||!out||fs.existsSync(out)||!fs.existsSync(path.dirname(path.resolve(out))))
  throw Error('R125_PILOT_FRESH_OUTPUT_REQUIRED');
 const scene=compileDesign(SIMPLE_HOUSE);
 const packet=exportB143EducationMakeCode({design:SIMPLE_HOUSE,scene,provenance:'SYNTHETIC_TEST_FIXTURE'});
 const {code,...report}=packet;
 fs.mkdirSync(out);
 fs.writeFileSync(path.join(out,'MAKECODE_EDUCATION.ts'),code,{flag:'wx'});
 fs.writeFileSync(path.join(out,'EXPORT_REPORT.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(path.join(out,'B143_DESIGN.json'),JSON.stringify(SIMPLE_HOUSE,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(path.join(out,'RUN_FIRST_JA.txt'),[
 'これは「希望に応じたAI建築」ではなく、施工経路を実機確認する小さな合成家屋です。',
 '1) Minecraft Educationで「新しい平坦ワールド」を作りコピー/バックアップを保存。',
 '2) コピーしたテストワールドを開き、何もない場所の地面に立つ。',
 '3) Cキー → Code Builder → MakeCode のJavaScriptへ MAKECODE_EDUCATION.ts の中身を貼付して Run。',
 '4) チャットで mabset →（貼り付け成功を確認後）mabbuild → mabverify。',
 '5) エラー、途中終了、既存ブロックがある場合はSTOP。再実行せず世界コピーを復元。',
 '6) 結果のゲーム内スクリーンショット、mabverify結果、Minecraft Education版を記録。',
 '7) 真のAI→3D→MC接続、実用性、美術品質は未認定。',
 ].join('\n')+'\n',{flag:'wx'});
 return {status:'OFFLINE_SYNTHETIC_DEMO_CREATED',report,worldWrites:0};
}
if(process.argv[1]?.endsWith('r125-education-makecode-demo.mjs')){
 if(process.argv.length!==4||process.argv[2]!=='--out')throw Error('R125_PILOT_ARGS');
 console.log(JSON.stringify(makePilotDemo({out:process.argv[3]}),null,2));
}
