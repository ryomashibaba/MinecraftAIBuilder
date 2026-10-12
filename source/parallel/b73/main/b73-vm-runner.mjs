/** Real production Planner evaluation with restricted filesystem and no execution interfaces.
 * Must be run as: node --experimental-vm-modules ... (only inside a disposable offline process).
 * Returns strictly JSON geometry/metrics, never any executable BuildPlan or placement instruction.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import nodePath from 'node:path';
import nodeUrl from 'node:url';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {RUNTIME_ASSETS,sha,inspectB73Sources} from './b73-asset-contract.mjs';
const fail=s=>{throw Error('B73_VM_'+s)};
const allowRead=new Set([...RUNTIME_ASSETS,'palettes/modern_office.json',...['modern','urban_japanese','industrial','minimal','premium','traditional'].map(x=>`styles/${x}.json`)]);
export async function createOfflinePlanner(runtime,manifest){
 const inspection=inspectB73Sources(runtime,manifest);
 if(inspection.staticESMClosureMissing.length)fail('INCOMPLETE_MODULE_GRAPH');
 if(inspection.missingRuntimeAssets.length)fail('MISSING_ASSETS '+inspection.missingRuntimeAssets.join(','));
 if(typeof vm.SourceTextModule!=='function')fail('NODE_VM_MODULES_FLAG_REQUIRED');
 const base=path.resolve(runtime);const context=vm.createContext(Object.freeze({
  URL,performance:Object.freeze({now:()=>0}),structuredClone,TextEncoder,TextDecoder,
  console:Object.freeze({error:()=>{},log:()=>{}}),
 }),{name:'B73-restricted-planner'});
 const readChecked=(target,enc)=>{
  const file=target instanceof URL ? fileURLToPath(target) : typeof target==='string'&&target.startsWith('file:')?fileURLToPath(target):path.resolve(String(target));
  const normalized=path.resolve(file);
  if(!normalized.startsWith(base+path.sep))fail('READ_OUTSIDE_EVIDENCE');
  const rel=path.relative(base,normalized).replaceAll(path.sep,'/');
  if(!allowRead.has(rel))fail('READ_NOT_ALLOWLISTED '+rel);
  const st=fs.lstatSync(normalized);if(!st.isFile()||st.isSymbolicLink()||st.size>2_000_000)fail('READ_TYPE_OR_SIZE');
  const bytes=fs.readFileSync(normalized);
  return typeof enc==='string'||enc?.encoding==='utf8' ? bytes.toString('utf8'):bytes;
 };
 const readonlyFs=Object.freeze({readFileSync:readChecked});
 const readonlyPromises=Object.freeze({readFile:async (target,enc)=>readChecked(target,enc)});
 const dependencyModules=new Map();
 const builtin={
  'node:fs':{default:readonlyFs,readFileSync:readChecked},
  'node:fs/promises':{default:readonlyPromises,readFile:readonlyPromises.readFile},
  'node:path':{default:nodePath,...Object.fromEntries(['resolve','join','dirname','basename','relative','normalize','sep'].map(k=>[k,nodePath[k]]))},
  'node:url':{fileURLToPath:nodeUrl.fileURLToPath,pathToFileURL:nodeUrl.pathToFileURL},
  'node:crypto':{createHash:crypto.createHash,randomUUID:crypto.randomUUID},
 };
 for(const [id,exports] of Object.entries(builtin)){
  const m=new vm.SyntheticModule(Object.keys(exports),function(){for(const [key,v]of Object.entries(exports))this.setExport(key,v)},{context,identifier:id});
  dependencyModules.set(id,m);
 }
 const moduleMap=new Map();
 const linker=(specifier,parent)=>{
  if(dependencyModules.has(specifier))return dependencyModules.get(specifier);
  if(!specifier.startsWith('./')&&!specifier.startsWith('../'))fail('BAD_IMPORT '+specifier);
  const filename=path.resolve(path.dirname(parent.identifier),specifier);
  if(!filename.startsWith(base+path.sep))fail('IMPORT_OUTSIDE_EVIDENCE');
  if(!fs.existsSync(filename)||!fs.lstatSync(filename).isFile()||!filename.endsWith('.js'))fail('UNSUPPORTED_IMPORT '+specifier);
  return load(filename);
 };
 function load(filename){
  if(moduleMap.has(filename))return moduleMap.get(filename);
  const source=fs.readFileSync(filename,'utf8');
  const m=new vm.SourceTextModule(source,{context,identifier:filename,initializeImportMeta(meta,mod){meta.url=pathToFileURL(mod.identifier).href},
   importModuleDynamically(){fail('DYNAMIC_IMPORT_DENIED')}});
  moduleMap.set(filename,m);return m;
 }
 const entry=load(path.join(base,'engine/src/general-building-planner.js'));
 await entry.link(linker);
 await entry.evaluate({timeout:4500});
 const create=entry.namespace.createBuildingPlan;
 if(typeof create!=='function')fail('NO_PRODUCTION_ENTRYPOINT');
 return {inspection,makePlan(input){
  if(!input||!['office','hotel','apartment'].includes(input.buildingType)||input.floors!==6||input.floorHeight!==5||
    !Number.isSafeInteger(input.width)||!Number.isSafeInteger(input.depth))fail('CANDIDATE_INPUT_ONLY');
  const output=create({...input},{materialPipeline:'legacy'});
  if(output?.type!=='general_building'||!Array.isArray(output.operations)||output.operations.some(o=>o.type!=='fill'))fail('PLAN_SHAPE');
  // Serialize back across realm; deliberate local geometry only. No world coordinates.
  return JSON.parse(JSON.stringify({type:output.type,composition:output.composition,masses:output.masses,
   operations:output.operations.map(({type,from,to})=>({type,from,to})),counts:{operations:output.operations.length,roles:[...new Set(output.operations.map(o=>o.role))],bounds:output.bounds}}));
 }};
}
