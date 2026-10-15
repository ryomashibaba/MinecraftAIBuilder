/**
 * B132: distinguish immutable distribution source from legitimately mutable
 * local human-claimed observation records. Does not touch Minecraft.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {buildB131Package,verifyB131Package} from '../../b131/main/b131-package.mjs';
import {inspectB130Package} from '../../b130/main/b130-lab-tool.mjs';

const sha=data=>createHash('sha256').update(data).digest('hex');
const SOURCE_ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const mutable='data/B130_Observation_Receipts.json';
const immutableBaseline='B131_MANIFEST_SHA256.json';
const manifestFile='B132_STATIC_SOURCE_MANIFEST.json';

export function buildB132Kit({
 root=SOURCE_ROOT,b129Output=path.join(SOURCE_ROOT,'b129-review-output'),
 out=path.join(SOURCE_ROOT,'b132-review-output','B132_Windows_Offline_Lab')
}={}){
 buildB131Package({root,b129Output,out});
 const b131=verifyB131Package(out);
 if(b131.realReadbacks!==0||b131.remainingSlots!==8||
  b131.unknownPermutations!==24||b131.worldContacts!==0)
  throw Error('B132_BASELINE_B131_INCORRECT');
 const baseline=JSON.parse(fs.readFileSync(path.join(out,immutableBaseline),'utf8'));
 const safe=Object.fromEntries(Object.entries(baseline.fileHashes)
  .filter(([filename])=>filename!==mutable));
 if(!Object.hasOwn(baseline.fileHashes,mutable)||Object.keys(safe).length!==9)
  throw Error('B132_EXPECTED_9_PINNED_STATIC_SOURCES');
 const manifest={
  schema:'minecraftaibuilder-b132-active-kit-static-source-manifest-v1',
  distributionB131ManifestDigest:sha(fs.readFileSync(path.join(out,immutableBaseline))),
  sourceB127Integrity:baseline.sourceB127Integrity,
  immutableFilesSha256:safe,
  intentionallyMutableFiles:[
   mutable,
   'data/B130_Offline_Receipt_Review.json',
   'evidence/'
  ],
  claimedObservationsAreNotAuthenticated:true,
  certifiedEducationBlockstates:0,realStairPasses:0,
  constructionAllowed:false,worldContacts:0,operations:[]
 };
 fs.writeFileSync(path.join(out,manifestFile),JSON.stringify(manifest,null,2)+'\n');
 fs.writeFileSync(path.join(out,'B132_RUNTIME_VERIFICATION_JA.txt'),[
  'B132 Windows 対話式入力・再起動検証用キット（オフライン）',
  '',
  'START_B130_LAB.cmdで従来と同じローカル観察記録を入力できます。',
  'START_B130_LAB.cmd --check は現在の観察数と残りの枠を安全に読み取ります。',
  'B131_MANIFEST_SHA256.jsonは「初期配布時のファイル構成」の記録です。',
  '記録後には data/B130_Observation_Receipts.json が変更されるのが正しい動作です。',
  'B132_STATIC_SOURCE_MANIFEST.jsonは変更禁止の9ファイルだけを別途固定します。',
  '入力後も元のソースや空の初期配布物が書き換わっていないかを区別して検査できます。',
  '',
  'このキットはMinecraft Educationを起動・操作しません。',
  '観察が無ければ未実施のままにしてください。自動的に観察値を生成しません。',
  'テストで作られる合成画像と記録はWindows CIの一時フォルダーだけに作られます。',
  '実際のゲーム内BlockStateの取得・確認は未実施で、合成記録はその代わりにはなりません。',
  'Minecraft実機で階段の向きが確認済みとは解釈できません。',
  'NOT_PREPARED、施工HOLD9件、9 BLOCKED、BuildPlan.operations=[]、worldContacts=0。',
  ''
 ].join('\r\n'),'utf8');
 const result=verifyB132ActiveKit(out);
 if(result.recordCount!==0||result.remainingSlots!==8)
  throw Error('B132_PACKAGE_NOT_BLANK');
 return {folder:out,result};
}

export function verifyB132ActiveKit(folder){
 const manifest=JSON.parse(fs.readFileSync(path.join(folder,manifestFile),'utf8'));
 const distribution=fs.readFileSync(path.join(folder,immutableBaseline));
 const initial=JSON.parse(distribution.toString('utf8'));
 if(manifest.schema!=='minecraftaibuilder-b132-active-kit-static-source-manifest-v1'||
  manifest.distributionB131ManifestDigest!==sha(distribution)||
  manifest.sourceB127Integrity!==initial.sourceB127Integrity||
  manifest.constructionAllowed!==false||manifest.worldContacts!==0||
  manifest.claimedObservationsAreNotAuthenticated!==true||
  manifest.certifiedEducationBlockstates!==0||manifest.realStairPasses!==0||
  manifest.operations.length!==0)
  throw Error('B132_STATIC_MANIFEST_INVALID');
 const expected=Object.entries(initial.fileHashes).filter(([k])=>k!==mutable);
 if(expected.length!==9||
  Object.keys(manifest.immutableFilesSha256).length!==expected.length)
  throw Error('B132_STATIC_FILE_SET_CHANGED');
 for(const [name,hash]of expected){
  const actual=sha(fs.readFileSync(path.join(folder,name)));
  if(actual!==hash||manifest.immutableFilesSha256[name]!==hash)
   throw Error('B132_IMMUTABLE_SOURCE_TAMPER_'+name);
 }
 const {status}=inspectB130Package(folder);
 if(status.sourceB127Integrity!==manifest.sourceB127Integrity||
  status.worldContacts!==0||status.constructionAllowed!==false||
  status.educationBlockstatesCertified!==false||
  status.realMovementCertified!==false||status.humanClaimedReceiptCount>8)
  throw Error('B132_ACTIVE_RECEIPT_SAFETY_FAIL');
 return {fileCount:expected.length,allStaticSourceHashesMatch:true,
  recordCount:status.humanClaimedReceiptCount,
  remainingSlots:status.remainingTrialIds.length,
  consistentHumanClaimHypotheses:status.claimConsistentDirectionMappings,
  warningStatus:status.warningStatus,
  humanClaimsAuthenticated:false,
  realEducationCalibrations:0,realPassageCertifications:0,
  constructionAllowed:false,worldContacts:0};
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
 const result=buildB132Kit();
 console.log(JSON.stringify(result,null,2));
}
