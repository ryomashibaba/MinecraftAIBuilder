/**
 * B198Z-R7 — create a REAL interactive offline B143 3D visual dossier for
 * a saved model architecture. Purely offline source review, NOT construction.
 *
 * Uses the existing strict B143 renderer and B198W frozen c01 human-rubric
 * board. No image or programmatic 'beauty' score is ever certified.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {compileB143Gallery,renderB143Html,verifyB143Payload}
 from './b143-gallery-core.mjs';
import {writeB198WReviewBundle}
 from './b198w-quality-review.mjs';
export const SCHEMA='minecraftaibuilder-b198zr7-offline-visual-review-v1';
const fail=s=>{throw Error('B198ZR7_'+s)};
const yes=(v,s)=>{if(!v)fail(s)};
const template=new URL('../source/ai/b143-viewer-template.html',import.meta.url);
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,worldContacts:0,worldWrites:0,worldCoordinates:null,
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}});
export function writeR7OfflineVisualReview({
 design,compiled,destination,caseId='c01'
}={}){
 yes(design?.designOnly===true&&verifyCompiled(design,compiled),
  'STRICT_DESIGN_AND_COMPILER_PROOF_REQUIRED');
 yes(typeof destination==='string'&&destination.length>0,
  'OUTPUT_REQUIRED');
 yes(caseId==='c01','ONLY_FROZEN_C01_SUPPORTED');
 const dir=path.resolve(destination);
 yes(fs.existsSync(dir)&&fs.statSync(dir).isDirectory(),'OUTPUT_DIR_MISSING');
 const filenames=['index.html','B198W_REVIEW_BOARD.html',
  'B198W_SOURCE_QUALITY_EVIDENCE.json',
  'R7_VISUAL_REVIEW_MANIFEST.json'];
 yes(filenames.every(f=>!fs.existsSync(path.join(dir,f))),
  'NEVER_OVERWRITE_EXISTING_EVIDENCE');
 const gallery=compileB143Gallery([design]);
 yes(verifyB143Payload(gallery)&&
  gallery.scenes[0].sourceSha256===compiled.sourceSha256&&
  gallery.scenes[0].geometrySha256===compiled.geometrySha256,
  'GALLERY_SHA_MISMATCH');
 let html=renderB143Html(gallery,fs.readFileSync(template,'utf8'));
 // The shared B143 viewer template now labels designs as source-only
 // and unauthenticated. Do not require the REMOVED old ChatGPT-author label.
 // Treat missing safety disclaimers as fail-closed, never claim authorship.
 yes(html.includes('設計ソース由来の建築プレビュー（作者未認証）')&&
  html.includes('Minecraft Educationで建設済みではありません。')&&
  !html.includes('ChatGPTが設計した新規建築'),'UNSAFE_OR_STALE_VIEWER_LABEL');
 html=html.replace('<a href="../">既存15棟の設計レビュー →</a>',
  '<span class="muted">完全オフライン表示・施工なし</span>');
 const opening=html.match(/<body\b[^>]*>/i)?.[0];
 yes(!!opening,'VIEWER_BODY_NOT_FOUND');
 html=html.replace(opening,opening+
  '<div style="background:#51371f;color:white;padding:12px 16px;font:700 14px system-ui">R7 MODEL CANDIDATE — 保存した形状の視覚化に過ぎません。実Qwenの作者認定・美観・日本語要求への忠実性・実機歩行・施工は未審査 / NOT_PREPARED</div>');
 // The existing renderer uses inline scripts and no network dependencies.
 yes(!html.includes('fetch('),'OFFLINE_ONLY');
 fs.writeFileSync(path.join(dir,'index.html'),html,{flag:'wx'});
 // Existing B198W review board provides frozen Japanese semantic criteria and
 // a manually exportable evidence-pinned rating, never a synthetic score.
 const board=writeB198WReviewBundle({
  design,compiled,destination:dir,viewerName:'index.html',caseId});
 const manifest={schema:SCHEMA,
  status:'WAITING_FOR_HUMAN_VISUAL_AND_SEMANTIC_REVIEW',
  caseId,sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256,
  occupiedVoxels:compiled.primitives.length,
  visibleSurfaceCells:gallery.scenes[0].surface.length,
  visualizationFiles:filenames.slice(0,3),
  sourceOnly:true,noModelCallsMade:true,
  originalModelRawUnmodified:true,
  modelAuthorshipIndependentlyAuthenticated:false,
  automaticAestheticQualityCertification:false,
  humanReviewRequired:true,
  actualMinecraftPlayerWalkingNotTested:true,
  frozenHumanBoardStatus:board.status,
  safety:safe()};
 fs.writeFileSync(path.join(dir,'R7_VISUAL_REVIEW_MANIFEST.json'),
  JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
 return manifest;
}
