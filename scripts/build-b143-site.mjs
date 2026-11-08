/**
 * B143 -- Compile ChatGPT-authored building DSL docs and extend the existing
 * source-verified B142 Pages build. No execution of user-provided JS/commands.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {compileB143Gallery,verifyB143Payload,renderB143Html} from './b143-gallery-core.mjs';
export {surfaceOnly,compileB143Gallery,verifyB143Payload,renderB143Html} from './b143-gallery-core.mjs';
import {verifyOutput as verifyB142Output} from './build-b142-site.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SITE=path.join(ROOT,'b142-site-output');
const DESIGNS=path.join(ROOT,'designs/ai');
const TEMPLATE=path.join(ROOT,'source/ai/b143-viewer-template.html');
const hash=x=>createHash('sha256').update(x).digest('hex');
const ensure=(b,m)=>{if(!b)throw Error('B143_'+m);};
const F=s=>path.join(SITE,s);

const NAV='<div id="b143-ai-design-navigation" style="padding:12px 24px;background:#123347;color:#d8f5ff;border-bottom:1px solid #287a8a"><strong>B143 NEW:</strong> 固定カテゴリに依存しないChatGPT設計の実証 → <a style="color:#81ffda" href="./ai/">AI Architecture Studioで新しい建築を見る</a>（設計プレビュー・施工禁止）</div>';
export function extendB142Root(html){
 ensure(html.includes('<header>')&&html.includes('</header>')&&!html.includes('b143-ai-design-navigation'),'B142_ROOT_UNEXPECTED');
 return html.replace('</header>','</header>\n'+NAV);
}
export function verifyB143Site(dir=SITE){
 const manifest=JSON.parse(fs.readFileSync(path.join(dir,'B143_MANIFEST.json'),'utf8'));
 const root=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 const html=fs.readFileSync(path.join(dir,'ai/index.html'),'utf8');
 const b142=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));
 ensure(manifest.schema==='minecraftaibuilder-b143-site-v1'&&
  manifest.sourceIds.length>=2&&
  manifest.rootSha256===hash(root)&&manifest.gallerySha256===hash(html)&&
  manifest.b142IntegritySha256===b142.b141IntegritySha256&&
  b142.htmlSha256===hash(root)&&b142.worldOperations===0&&
  b142.gateStatuses.length===9&&b142.gateStatuses.every(x=>x==='BLOCKED')&&
  manifest.constructionApproved===false&&manifest.minecraftWrites===0&&
  html.includes('minecraftaibuilder-b143-gallery-v1')&&
  root.includes('b143-ai-design-navigation'),'SITE_INVALID');
 return manifest;
}
export function writeB143Site(payload,dir=SITE){
 ensure(verifyB143Payload(payload),'UNSAFE_WRITE');
 // Base B142 must already have run and checked its own SHA/gates.
 verifyB142Output(dir);
 const template=fs.readFileSync(TEMPLATE,'utf8');
 const html=renderB143Html(payload,template);
 fs.mkdirSync(path.join(dir,'ai'),{recursive:true});
 fs.writeFileSync(path.join(dir,'ai/index.html'),html);
 const root=extendB142Root(fs.readFileSync(path.join(dir,'index.html'),'utf8'));
 fs.writeFileSync(path.join(dir,'index.html'),root);
 const b142=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));
 b142.htmlSha256=hash(root); // Old source-gate proofs remain unchanged.
 fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(b142,null,2)+'\n');
 const manifest={schema:'minecraftaibuilder-b143-site-v1',sourceIds:payload.scenes.map(s=>s.id),
  sourceHashes:payload.sourceHashes,
  geometryHashes:payload.geometryHashes,
  gallerySha256:hash(html),rootSha256:hash(root),
  b142IntegritySha256:b142.b141IntegritySha256,
  minecraftWrites:0,constructionApproved:false};
 fs.writeFileSync(path.join(dir,'B143_MANIFEST.json'),JSON.stringify(manifest,null,2)+'\n');
 ensure(JSON.stringify(verifyB143Site(dir))===JSON.stringify(manifest),'POSTWRITE_FAILED');
 verifyB142Output(dir);
 return manifest;
}
export function readDesigns(){
 const files=fs.readdirSync(DESIGNS).filter(f=>/^[a-z][a-z0-9-]*\.json$/.test(f)).sort();
 ensure(files.length>=2&&files.length<=24,'NOT_ENOUGH_AI_DESIGNS');
 const documents=files.map(f=>JSON.parse(fs.readFileSync(path.join(DESIGNS,f),'utf8')));
 ensure(files.every((f,i)=>f===documents[i].id+'.json'),'FILENAME_MISMATCH');
 return documents;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.includes('--verify')){
   const m=verifyB143Site();
   const p=compileB143Gallery(readDesigns());
   ensure(p.scenes.map(s=>s.geometrySha256).join()===m.geometryHashes.join(),'SOURCE_CHANGED');
   console.log(JSON.stringify(m,null,2));
  }else{
   const p=compileB143Gallery(readDesigns());
   console.log(JSON.stringify({built:writeB143Site(p),totals:p.scenes.map(s=>({
    id:s.id,voxels:s.stats.voxels,visibleCells:s.surface.length,
    hash:s.geometrySha256}))},null,2));
  }
 }catch(e){console.error('B143_HOLD:',e.message);process.exitCode=1;}
}
