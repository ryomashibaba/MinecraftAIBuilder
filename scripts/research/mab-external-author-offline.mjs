/**
 * Research-only External Author boundary for an ALREADY-AUTHORED R125 or V6 IR.
 * The original UTF-8 JSON is read once, never repaired or written back.
 * No provider/network/model/World adapter is used. No user text is printed.
 *
 * node scripts/research/mab-external-author-offline.mjs \
 *   --contract r125 --input ABSOLUTE_PRIVATE_FILE.json
 *
 * This is NOT real model provenance, human ART, or Minecraft approval.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {TextDecoder} from 'node:util';
import {fileURLToPath} from 'node:url';
import {SCHEMA as R125_SCHEMA,compileArchitecturePlan,
 auditArchitecturePlanCirculation} from '../../source/ai/r125-architecture-plan.mjs';
import {CIVIC_ARCADE_SCHEMA,compileCivicArcadeAuthorIntent}
 from '../../source/ai/r125-v4j-civic-author-ir.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const abort=code=>{throw Error('MAB_EXTERNAL_IR_'+code);};
const blocked=x=>Array.isArray(x)&&x.length===9&&x.every(g=>g==='BLOCKED');
const inside=(child,parent)=>{const rel=path.relative(parent,child);
 return rel===''||(!path.isAbsolute(rel)&&rel!=='..'&&!rel.startsWith('..'+path.sep));
};
export function parseExternalAuthorArgs(args){
 if(args.length===1&&args[0]==='--help')return {help:true};
 if(args.length!==4)abort('REQUIRE_CONTRACT_AND_INPUT');
 const values={};
 for(let i=0;i<args.length;i+=2){
  const key=args[i];
  if(!['--contract','--input'].includes(key)||Object.hasOwn(values,key)||
   !args[i+1]||args[i+1].startsWith('--'))abort('BAD_ARGUMENT');
  values[key]=args[i+1];
 }
 if(!['r125','v6'].includes(values['--contract']))abort('UNKNOWN_CONTRACT');
 if(!path.isAbsolute(values['--input']))abort('ABSOLUTE_INPUT_REQUIRED');
 return {contract:values['--contract'],input:values['--input']};
}
export function readExternalAuthorIR(input){
 // No repository content is used as a new external author original.
 const absolute=path.resolve(input),stat=fs.lstatSync(absolute);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size<1||stat.size>65536)
  abort('UNSAFE_INPUT');
 if(inside(fs.realpathSync(absolute),fs.realpathSync(ROOT)))
  abort('INPUT_INSIDE_PUBLIC_REPO');
 const bytes=fs.readFileSync(absolute);
 if(bytes.length!==stat.size)abort('INPUT_CHANGED_WHILE_READING');
 let raw;
 try{raw=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}
 catch{abort('INVALID_UTF8');}
 let original;
 try{original=JSON.parse(raw);}catch{abort('INVALID_JSON');}
 if(!original||typeof original!=='object'||Array.isArray(original))
  abort('IR_OBJECT_REQUIRED');
 return {original,rawSha256:createHash('sha256').update(bytes).digest('hex')};
}
export function verifyExternalAuthorSource(original,contract){
 const expected=contract==='r125'?R125_SCHEMA:
  contract==='v6'?CIVIC_ARCADE_SCHEMA:null;
 if(!expected)abort('UNKNOWN_CONTRACT');
 if(original?.schema!==expected)abort('IR_SCHEMA_MISMATCH');
 // The existing genuine HOST validates all author fields without repairs.
 if(contract==='r125'){
  const product=compileArchitecturePlan(original);
  const routes=auditArchitecturePlanCirculation(product);
  if(product?.design?.designOnly!==true||product?.constructionApproved!==false||
   product?.worldContacts!==0||product?.worldWrites!==0||
   !blocked(product?.gates))abort('SOURCE_OR_WORLD_BOUNDARY');
  if(routes?.status!=='SOURCE_CLEARANCE_PROBES_PASS'||
   routes?.worldWrites!==0)abort('R125_CIRCULATION_HOLD');
  return {status:'R125_SOURCE_CANDIDATE_ART_AND_WORLD_HOLD',
   occupiedVoxels:product.compiled.primitives.length,
   geometrySha256:product.geometrySha256,
   circulation:'SOURCE_CLEARANCE_PROBES_PASS'};
 }
 const out=compileCivicArcadeAuthorIntent(original);
 const routes=out?.b143?.sourceRoutes;
 if(!Array.isArray(out?.b143?.compiled?.primitives)||
  out?.b143?.design?.designOnly!==true||
  routes?.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  routes.zones?.some(z=>!z.reachedFromEntrance)||
  routes.featureAccess?.some(f=>!f.reachableFromEntrance)||
  out?.readiness!=='NOT_PREPARED'||out?.constructionApproved!==false||
  out?.executionAllowed!==false||out?.worldContacts!==0||
  out?.worldWrites!==0||!blocked(out?.gates)||
  out?.BuildPlan?.operations?.length!==0)
  abort('V6_SOURCE_OR_WORLD_BOUNDARY');
 return {status:'V6_SOURCE_CANDIDATE_ART_AND_WORLD_HOLD',
  occupiedVoxels:out.b143.compiled.primitives.length,
  geometrySha256:out.b143.geometrySha256,
  circulation:'SOURCE_ROUTES_REACH_ALL_ZONES'};
}
export function runExternalAuthorOffline({input,contract}){
 const {original,rawSha256}=readExternalAuthorIR(input);
 const frozen=JSON.stringify(original);
 const source=verifyExternalAuthorSource(original,contract);
 if(JSON.stringify(original)!==frozen)abort('ORIGINAL_MUTATED');
 return {schema:'mab-external-author-offline-research-v1',
  ...source,contract,originalRawSha256:rawSha256,
  sourceAuthorship:'EXTERNAL_AUTHOR_NOT_INDEPENDENTLY_ATTESTED',
  humanArt:'NOT_REVIEWED',minecraftWalking:'NOT_TESTED',
  gateCP1:'HOLD',constructionApproved:false,executionAllowed:false,
  readiness:'NOT_PREPARED',allNineConstructionGatesBlocked:true,
  BuildPlanOperations:0,modelCalls:0,networkCalls:0,
  worldContacts:0,worldWrites:0,originalEdited:false};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const args=parseExternalAuthorArgs(process.argv.slice(2));
  if(args.help)console.log('Offline only: --contract r125|v6 --input ABSOLUTE_PRIVATE_FILE.json');
  else console.log(JSON.stringify(runExternalAuthorOffline(args)));
 }catch(e){
  // Never print raw provider text, compiler exceptions, room IDs or local paths.
  const message=String(e?.message??'');
  const code=message.startsWith('MAB_EXTERNAL_IR_')?message:
   'MAB_EXTERNAL_IR_SOURCE_NOT_PROVEN';
  console.error(JSON.stringify({status:'HOLD',code,modelCalls:0,
   networkCalls:0,worldWrites:0}));
  process.exitCode=2;
 }
}
