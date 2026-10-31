/** Pure B143 -> Minecraft Education MakeCode pilot exporter. Never opens a world. */
import {createHash} from 'node:crypto';
import {verifyCompiled} from './b143-building-dsl.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const fail=x=>{throw Error('R125_EDUCATION_EXPORT_'+x)};
const key=(x,y,z)=>x+','+y+','+z;
// Education rejected `planks` during startup, even when the material was unused.
// Keep the pilot palette conservative until additional names are verified in-game.
const MATERIAL_NAMES=['stone','stone','stone','glass','stone','stone','stone'];
const int=(x,a,b)=>Number.isSafeInteger(x)&&x>=a&&x<=b;

export function compactB143Cuboids(scene,{maxCuboids=2500}={}){
 if(!Array.isArray(scene?.primitives)||scene.primitives.length===0||scene.primitives.length>20000)fail('VOXEL_LIMIT');
 if(!int(maxCuboids,1,5000))fail('CUBOID_LIMIT');
 const materialAt=new Map();
 for(const p of scene.primitives){
  if(!Array.isArray(p)||p.length!==5||!p.every(Number.isSafeInteger)||
   p.slice(0,3).some(v=>v<0||v>128)||!int(p[3],0,6))fail('INVALID_VOXEL');
  const k=key(p[0],p[1],p[2]);if(materialAt.has(k))fail('DUPLICATE_VOXEL');
  materialAt.set(k,p[3]);
 }
 const all=scene.primitives.slice().sort((a,b)=>a[1]-b[1]||a[2]-b[2]||a[0]-b[0]);
 const used=new Set(),cuboids=[];
 const available=(x,y,z,m)=>materialAt.get(key(x,y,z))===m&&!used.has(key(x,y,z));
 for(const [x,y,z,m] of all){
  if(used.has(key(x,y,z)))continue;
  let x2=x,z2=z,y2=y;
  while(available(x2+1,y,z,m))x2++;
  let grow=true;
  while(grow){
   for(let i=x;i<=x2;i++)if(!available(i,y,z2+1,m)){grow=false;break;}
   if(grow)z2++;
  }
  grow=true;
  while(grow){
   for(let j=z;j<=z2&&grow;j++)
    for(let i=x;i<=x2;i++)if(!available(i,y2+1,j,m)){grow=false;break;}
   if(grow)y2++;
  }
  for(let k=y;k<=y2;k++)for(let j=z;j<=z2;j++)for(let i=x;i<=x2;i++)used.add(key(i,k,j));
  cuboids.push([x,y,z,x2,y2,z2,m]);
  if(cuboids.length>maxCuboids)fail('TOO_MANY_CUBOIDS');
 }
 if(used.size!==scene.primitives.length)fail('VOLUME_MISMATCH');
 return cuboids;
}

export function exportB143EducationMakeCode({design,scene,originOffset=[8,0,8],provenance='UNVERIFIED_DESIGN',groundLowestLayer=false}={}){
 if(!design||!scene||!verifyCompiled(design,scene))fail('SOURCE_GEOMETRY_SHA_MISMATCH');
 if(!['UNVERIFIED_DESIGN','SYNTHETIC_TEST_FIXTURE','LOCAL_MODEL_CAPTURE','USER_AUTHORED'].includes(provenance))
  fail('PROVENANCE');
 if(!Array.isArray(originOffset)||originOffset.length!==3||
  !originOffset.every((v,i)=>int(v,i===1?0:5,i===1?10:64)))fail('ORIGIN_OFFSET');
 if(typeof groundLowestLayer!=='boolean')fail('GROUND_OPTION');
 const baseY=groundLowestLayer?Math.min(...scene.primitives.map(p=>p[1])):0;
 const b={...design.bounds,height:design.bounds.height-baseY};
 if([b.width,b.height,b.depth].some(n=>!int(n,1,128))||
    b.width*b.height*b.depth>40000||scene.primitives.length>20000)fail('PILOT_SIZE');
 const cuboids=compactB143Cuboids(scene).map(([x,y,z,X,Y,Z,m])=>[x,y-baseY,z,X,Y-baseY,Z,m]);
 const lines=[
 '// Auto-generated B143 voxels. Not a live bridge. Test-world COPY ONLY.',
 '// In Education: press C -> Code Builder -> MakeCode JavaScript -> paste -> Run.',
 '// Stand on FLAT SOLID ground. Type mabset; inspect location; type mabbuild; then mabverify.',
 '// Back up your test world first. There is NO automatic rollback or world-ID check.',
 'let mabAnchor = player.position()',
 'let mabReady = false',
 'let mabBuilt = false',
 'let mabBusy = false',
 'let mabRows: number[][] = '+JSON.stringify(cuboids),
 'let mabMaterialNames: string[] = '+JSON.stringify(MATERIAL_NAMES),
 'let mabMaterials: number[] = []',
 'for (let i = 0; i < mabMaterialNames.length; i++) {',
 '    mabMaterials.push(blocks.blockByName(mabMaterialNames[i]))',
 '}',
 'function mabAt(x: number, y: number, z: number): Position {',
 '    return positions.add(mabAnchor, pos('+originOffset[0]+'+x,'+originOffset[1]+'+y,'+originOffset[2]+'+z))',
 '}',
 'player.onChat("mabset", function () {',
 '    if (mabBusy) { player.say("HOLD: operation in progress."); return }',
 '    if (mabBuilt) { player.say("Already built. No duplicate run."); return }',
 '    mabAnchor = player.position()',
 '    mabReady = true',
 '    player.say("Test-world anchor saved. Area '+b.width+'x'+b.height+'x'+b.depth+'; type mabbuild explicitly.")',
 '})',
 'player.onChat("mabbuild", function () {',
 '    if (mabBusy || !mabReady || mabBuilt) { player.say("HOLD: busy, not set, or already attempted."); return }',
 '    mabBusy = true',
 '    for (let y = 0; y < '+b.height+'; y++) {',
 '        for (let z = 0; z < '+b.depth+'; z++) {',
 '            for (let x = 0; x < '+b.width+'; x++) {',
 '                if (!blocks.testForBlock(AIR, mabAt(x, y, z))) {',
 '                    mabBusy = false; player.say("HOLD: non-air in proposed volume. Wrote zero blocks."); return',
 '                }',
 '            }',
 '        }',
 '    }',
 '    for (let z = 0; z < '+b.depth+'; z++) {',
 '        for (let x = 0; x < '+b.width+'; x++) {',
 '            if (blocks.testForBlock(AIR, mabAt(x, -1, z))) {',
 '                mabBusy = false; player.say("HOLD: no flat ground support. Wrote zero blocks."); return',
 '            }',
 '        }',
 '    }',
 '    mabBuilt = true',
 '    for (let i = 0; i < mabRows.length; i++) {',
 '        let r = mabRows[i]',
 '        blocks.fill(mabMaterials[r[6]], mabAt(r[0],r[1],r[2]),',
 '            mabAt(r[3],r[4],r[5]), FillOperation.Keep)',
 '    }',
 '    mabBusy = false',
 '    player.say("Placing attempted. Type mabverify; do not run mabbuild again.")',
 '})',
 'player.onChat("mabverify", function () {',
 '    if (mabBusy || !mabBuilt) { player.say("HOLD: busy or no build attempted."); return }',
 '    mabBusy = true',
 '    let mismatch = 0',
 '    for (let i = 0; i < mabRows.length; i++) {',
 '        let r = mabRows[i]',
 '        for (let y = r[1]; y <= r[4]; y++) {',
 '            for (let z = r[2]; z <= r[5]; z++) {',
 '                for (let x = r[0]; x <= r[3]; x++) {',
 '                    if (!blocks.testForBlock(mabMaterials[r[6]], mabAt(x,y,z))) mismatch++',
 '                }',
 '            }',
 '        }',
 '    }',
 '    mabBusy = false',
 '    if (mismatch == 0) player.say("Expected blocks match. Inspect entrances/stairs yourself.")',
 '    else player.say("HOLD: " + mismatch + " mismatches. Restore world backup.")',
 '})'
 ];
 const code=lines.join('\n')+'\n';
 if(Buffer.byteLength(code)>180000)fail('MAKECODE_SOURCE_SIZE');
 return {schema:'minecraftaibuilder-r125-education-makecode-pilot-v1',
  status:'OFFLINE_CODE_GENERATED_ONLY',provenance,
  sourceSha256:scene.sourceSha256,geometrySha256:scene.geometrySha256,
  makecodeSourceSha256:sha(Buffer.from(code)),bounds:structuredClone(b),
  plannedVoxelCount:scene.primitives.length,plannedCuboids:cuboids.length,
  sourceVerticalOffset:-baseY,
  materialMapping:MATERIAL_NAMES,materialWarning:'pilot maps all materials except glass to stone; exact palette not certified',
  actualEducationExecution:'NOT_TESTED',requiresUserPasteAndExplicitChat:true,
  backupVerifiedByProgram:false,worldIdentityVerifiedByProgram:false,
  worldContacts:0,worldWrites:0,programExecuted:false,readiness:'NOT_PREPARED',
  BuildPlan:{operations:[]},gates:Array(9).fill('BLOCKED'),
  constructionApproved:false,art:'ART_HOLD',code};
}

