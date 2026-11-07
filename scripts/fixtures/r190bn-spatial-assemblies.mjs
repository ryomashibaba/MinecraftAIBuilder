/** Authored SYNTHETIC geometry probes, not an LLM result or runtime template.
 * Only tests/offline study import this file; the compiler has no typology branch.
 */
import {createHash} from 'node:crypto';
import {R190BN_SCHEMA} from '../../source/ai/r190bn-spatial-assembly.mjs';
const H=x=>createHash('sha256').update(x).digest('hex');
const box=(id,mode,origin,size,material)=>({kind:'primitive',element:{id,mode,shape:'box',origin,size,
 ...(material?{material}:{})}});
const envelope=(id,spaceId)=>({kind:'enclosure',id,spaceId,thickness:1,
 materials:{floor:'wood',wall:'concrete',roof:'concrete'}});
const space=(id,levelId,purpose,origin,size,clearHeight)=>({id,levelId,purpose,origin,size,clearHeight,
 minimumReachablePositions:Math.floor(size[0]*size[1]*0.8),minimumReachablePercent:80});
function base(id,brief,bounds){return {schema:R190BN_SCHEMA,id,
 title:'SYNTHETIC OFFLINE — '+id,brief,originalBriefSha256:H(brief),bounds,
 intent:{use:'Synthetic usable spaces for an offline translation study.',
  experience:'Synthetic authored space and circulation, not AI aesthetic improvement.',
  massing:'Author chooses all levels, exact voids, envelopes and primitive shapes.',
  circulation:'Author specifies every opening, stair flight and landing. No host solver.'},
 levels:[],spaces:[],operations:[],entrance:[],headroom:3,destinations:[],protectedVoids:[],
 assumptions:['SYNTHETIC_TEST_FIXTURE; no model inference or artistic approval']}}

export function twoLevelReadingProbe(){
 const brief='合成検証：下階の展示と上階の閲覧空間を、屋内の階段と踊り場で結ぶ。実モデル設計ではない。';
 const p=base('bn-synthetic-reading',brief,{width:28,height:24,depth:34});
 p.levels=[{id:'lower-level',standingY:1},{id:'upper-level',standingY:9}];
 p.spaces=[space('lower-gallery','lower-level','展示のための下階空間',[3,3],[12,24],7),
  space('upper-reading','upper-level','閲覧のための上階空間',[3,3],[12,24],7)];
 p.operations=[envelope('lower-envelope','lower-gallery'),envelope('upper-envelope','upper-reading'),
  {kind:'primitive',element:{id:'stair-core-skin',shape:'box',mode:'add',material:'metal',
   origin:[16,0,2],size:[8,18,26],shell:1}},
  box('arrival-floor','add',[5,0,0],[4,1,4],'stone'),
  box('arrival-opening','cut',[6,1,2],[2,3,1]),
  box('lower-core-portal','cut',[15,1,4],[2,3,3]),
  box('upper-core-portal','cut',[15,9,20],[2,3,3]),
  box('lower-landing','add',[15,0,3],[8,1,5],'stone'),
  box('upper-landing','add',[15,8,19],[8,1,5],'stone'),
  {kind:'flight',id:'authored-flight',fromLevelId:'lower-level',toLevelId:'upper-level',
   start:[18,3],end:[18,20],width:3,treadDepth:2,material:'stone'}];
 p.entrance=[6,1,1];p.destinations=[{id:'upper-destination',point:[5,9,22],maximumPathSteps:150}];
 p.protectedVoids=[{id:'reading-air',origin:[4,9,5],size:[8,3,10],maxOccupiedCells:0}];
 return {brief:Buffer.from(brief),original:Buffer.from(JSON.stringify(p,null,2)+'\n'),plan:p,inspectionZ:12};
}

export function longConcourseProbe(){
 const brief='合成検証：横長の公共コンコースと曲面の屋根被覆。実モデル設計・用途適合の証明ではない。';
 const p=base('bn-synthetic-concourse',brief,{width:72,height:20,depth:32});
 p.levels=[{id:'public-level',standingY:1}];
 p.spaces=[space('public-concourse','public-level','長い通過・滞在のための空間',[4,4],[58,20],8)];
 p.operations=[envelope('hall-envelope','public-concourse'),
  box('arrival-slab','add',[7,0,1],[6,1,4],'stone'),
  box('arrival-door','cut',[8,1,3],[4,4,1]),
  {kind:'primitive',element:{id:'curved-cover',shape:'ellipsoid',mode:'add',material:'metal',
   center:[32,12,14],radii:[25,3,12],shell:1}},
  box('window-cut','cut',[3,3,8],[1,3,10]),
  box('window-glass','add',[3,3,8],[1,3,10],'glass')];
 p.entrance=[9,1,2];p.destinations=[{id:'far-destination',point:[59,1,20],maximumPathSteps:200}];
 return {brief:Buffer.from(brief),original:Buffer.from(JSON.stringify(p,null,2)+'\n'),plan:p,inspectionZ:14};
}
