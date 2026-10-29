/** Typed BN authoring contract. Pure data; no geometry examples or provider I/O. */
import {createHash} from 'node:crypto';
import {MATERIALS} from './b143-building-dsl.mjs';
import {R190BN_SCHEMA} from './r190bn-spatial-assembly.mjs';
export const hashBO=x=>createHash('sha256').update(x).digest('hex');
const integer=(minimum,maximum)=>({type:'integer',minimum,maximum});
const string=(minLength,maxLength)=>({type:'string',minLength,maxLength,pattern:'^[^\\u0000-\\u001f<>]*$'});
const object=(properties,optional=[])=>({type:'object',properties,
 required:Object.keys(properties).filter(k=>!optional.includes(k)),additionalProperties:false});
const array=(items,minItems,maxItems)=>({type:'array',items,minItems,maxItems});
const vector=(n,min,max)=>array(integer(min,max),n,n);
const literal=val=>({const:val});
const id={type:'string',pattern:'^[a-z][a-z0-9-]{2,23}$'};
const material={type:'string',enum:[...MATERIALS]};
const repeat=object({count:integer(2,32),offset:vector(3,-128,128)});

export function spatialModelSchema(briefSha256){
 if(!/^[a-f0-9]{64}$/.test(briefSha256))throw Error('R190BO_HASH');
 // Separate ADD/CUT variants prohibit material on CUT at generation time.
 const shapes={
  box:{origin:vector(3,0,128),size:vector(3,1,128)},
  ellipsoid:{center:vector(3,0,128),radii:vector(3,1,64)},
  cylinder:{origin:vector(3,0,128),axis:{enum:['x','y','z']},radius:integer(1,64),length:integer(1,128)},
  torus:{center:vector(3,0,128),axis:{enum:['x','y','z']},majorRadius:integer(3,45),tubeRadius:integer(1,9)},
  beam:{start:vector(3,0,128),end:vector(3,0,128),thickness:integer(1,3)},
  staircase:{origin:vector(3,0,128),axis:{enum:['x','z']},direction:{enum:[-1,1]},
   width:integer(2,12),steps:integer(2,32),treadDepth:integer(1,3)}
 };
 const primitives=[];
 for(const [shape,fields] of Object.entries(shapes))for(const mode of shape==='staircase'?['add']:['add','cut']){
  const props={id:{type:'string',pattern:'^[a-zA-Z][a-zA-Z0-9_-]{0,39}$'},
   shape:literal(shape),mode:literal(mode),...(mode==='add'?{material}:{}),...fields,repeat};
  const optional=['repeat'];
  if(mode==='add'&&!['beam','staircase'].includes(shape)){props.shell=integer(0,4);optional.push('shell');}
  primitives.push(object(props,optional));
 }
 return object({schema:literal(R190BN_SCHEMA),id:{type:'string',pattern:'^[a-z][a-z0-9-]{2,47}$'},
  title:string(1,100),brief:string(1,500),originalBriefSha256:literal(briefSha256),
  bounds:object({width:integer(8,128),height:integer(8,96),depth:integer(8,128)}),
  intent:object({use:string(8,350),experience:string(8,350),massing:string(8,350),circulation:string(8,350)}),
  levels:array(object({id,standingY:integer(1,94)}),1,32),
  spaces:array(object({id,levelId:id,purpose:string(3,250),origin:vector(2,0,127),size:vector(2,2,128),
   clearHeight:integer(2,95),minimumReachablePositions:integer(1,16384),minimumReachablePercent:integer(1,100)}),1,24),
  operations:array({anyOf:[
   object({kind:literal('enclosure'),id,spaceId:id,thickness:integer(1,4),materials:object({floor:material,wall:material,roof:material})}),
   object({kind:literal('flight'),id,fromLevelId:id,toLevelId:id,start:vector(2,0,127),end:vector(2,0,127),
    width:integer(2,12),treadDepth:integer(1,3),material}),
   object({kind:literal('primitive'),element:{anyOf:primitives}})
  ]},1,160),entrance:vector(3,0,127),headroom:integer(2,3),
  destinations:array(object({id,point:vector(3,0,127),maximumPathSteps:integer(1,500000)}),1,48),
  protectedVoids:array(object({id,origin:vector(3,0,127),size:vector(3,1,128),maxOccupiedCells:integer(0,500000)}),0,16),
  assumptions:array(string(0,250),0,12)});
}

export const SPATIAL_GUIDE=[
 '自由な日本語依頼から用途・空間体験、階構成、独創的外形、主要空洞、階段・踊り場・開口を自分で設計し、指定JSON SchemaのSpatial Assemblyを1件だけ返す。完成済み建物例は与えない。',
 'originalBriefSha256はホスト提示値をそのままコピー。計算不要。id/title/brief/intentは自分の設計。元依頼は別保存される。',
 'levels.standingYは床上の立脚ブロック座標。spaces.origin/sizeは[x,z]/[幅,奥行]の空気領域。全clearHeightに空気、直下y-1に支持床が必要。space宣言だけでは形状なし。',
 'enclosureは外側[x-t,y-t,z-t]・外寸[w+2t,clearHeight+2t,d+2t]のshell。床上端y-1、屋根下端y+clearHeight。異材床/屋根もその寸法。階段はspaceの空気外へ設計する。',
 'flightは上階y-下階y+1段、2..32段。水平start/endの一軸だけ変え、距離=段数*treadDepth-1。幅は他の正軸へ増える。踊り場・壁/床の穴は作者がprimitiveで別指定。',
 'primitiveはB143の順序付きadd/cut。addは許可材必須、cutはmaterialなし。box/ellipsoid/cylinder/torusのshellは厚さ0..4、各寸法/半径が内殻を残せること。beamとstaircaseはshellなし。',
 '全形状・repeat最終コピー・空間・検査点はbounds内。cylinder原点は軸方向端面の中心。torusはmajorRadius>tubeRadius+1。beamは異なる両端、boundsには両端周囲thicknessも必要。repeat.offsetは非ゼロ。',
 'bounds体積<=500000、高さ<=96、展開後B143要素<=160、全走査work<=1750000、途中占有も<=160000。巨大充填後cutは途中予算を超え得る。階数を高さと混同しない。',
 'use+空白+experience<=350文字。levels/space/要素の各idは重複なし、各levelにspace必須。space/目的地/空洞のidも相互重複なし。minimumReachablePositions<=面積。閾値は実質的な利用面積に対応させる。',
 '入口・目的地・全用途空間へ支持床と頭上2/3空気の連続経路を作る。開口は最終add/cut順で確保する。入口外部接続・眺望・用途適合も自分で設計する。ホストは欠けた形状や階段を補わない。',
 '最終ボクセルの支持・空気・R4単一セル経路は技術代理検査のみ。原文忠実性・独創性・美術・構造耐力・実Minecraft歩行は認定されない。未成立はassumptionsへ。説明文やMarkdownはJSONの外へ出さない。'
].join('\n');

export function buildSpatialRequest({brief,model,temperature=0.35,seed=23,maxTokens=16384,contextTokens=32768}){
 if(!(brief instanceof Uint8Array)||brief.length<8||brief.length>20000)throw Error('R190BO_BRIEF_BYTES');
 const text=new TextDecoder('utf-8',{fatal:true}).decode(brief);
 if(text.trim().length<8||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text))throw Error('R190BO_BRIEF_TEXT');
 if(typeof model!=='string'||!/^(?:qwen|gemma)[a-z0-9._-]*:[a-zA-Z0-9._-]+$/.test(model)||/cloud/i.test(model))throw Error('R190BO_EXPLICIT_LOCAL_MODEL_TAG');
 if(!Number.isFinite(temperature)||temperature<0||temperature>2||!Number.isSafeInteger(seed)||seed<0||seed>2147483647||
  !Number.isSafeInteger(maxTokens)||maxTokens<1024||maxTokens>32768||!Number.isSafeInteger(contextTokens)||contextTokens<maxTokens+2048||contextTokens>65536)
  throw Error('R190BO_BUDGET');
 const sha=hashBO(brief),schema=spatialModelSchema(sha);
 const body={model,stream:false,format:schema,options:{temperature,seed,num_predict:maxTokens,num_ctx:contextTokens},
  messages:[{role:'system',content:SPATIAL_GUIDE},
   {role:'user',content:'HOST_METADATA originalBriefSha256='+sha+'\nJSON Schema='+JSON.stringify(schema)+'\n元依頼（原文）:\n'+text}]};
 const bytes=Buffer.from(JSON.stringify(body));
 if(bytes.length>64000)throw Error('R190BO_REQUEST_SIZE');
 return {bytes,briefSha256:sha,schema,body};
}
