"""Independent Python reconstruction and physical SOURCE audit of this design.
No compiler imports, JS reachability results, model, network or world APIs.
Checks the two primitive types actually present; unknown types fail closed.
"""
from collections import deque
import hashlib
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parent
data=json.loads((ROOT/'TRUE_B143_PRODUCT.json').read_text(encoding='utf-8'))
author_raw=(ROOT/'ORIGINAL_V6.json').read_bytes()
author=json.loads(author_raw)
source_result=json.loads((ROOT/'SOURCE_RESULT.json').read_text(encoding='utf-8'))
design=data['design'];compiled=data['compiled']
materials=['stone','concrete','metal','glass','wood','glow','accent']
sha=lambda obj:hashlib.sha256(json.dumps(obj,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
assert hashlib.sha256(author_raw).hexdigest()==source_result['originalRawSha256']
cells={}
for element in design['elements']:
    assert element['shape'] in ('box','staircase')
    repeat=element.get('repeat',{'count':1,'offset':[0,0,0]})
    for instance in range(repeat['count']):
        origin=[v+instance*repeat['offset'][i] for i,v in enumerate(element['origin'])]
        points=[]
        if element['shape']=='box':
            sx,sy,sz=element['size'];shell=element.get('shell',0)
            for dx in range(sx):
                for dy in range(sy):
                    for dz in range(sz):
                        if shell and all(shell<=v<n-shell for v,n in zip((dx,dy,dz),(sx,sy,sz))):continue
                        points.append((origin[0]+dx,origin[1]+dy,origin[2]+dz))
        else:
            axis=0 if element['axis']=='x' else 2
            across=2 if axis==0 else 0
            for forward in range(element['steps']*element['treadDepth']):
                for lateral in range(element['width']):
                    for rise in range(forward//element['treadDepth']+1):
                        p=origin.copy();p[axis]+=element['direction']*forward;p[across]+=lateral;p[1]+=rise
                        points.append(tuple(p))
        for p in points:
            if element['mode']=='cut':cells.pop(p,None)
            else:cells[p]=materials.index(element['material'])
primitives=[[*p,m,p[1]//5] for p,m in sorted(cells.items(),key=lambda row:(row[0][1],row[0][2],row[0][0]))]
assert primitives==compiled['primitives']
assert sha(design)==compiled['sourceSha256']==source_result['sourceSha256']
assert sha({'design':design,'primitives':primitives})==compiled['geometrySha256']==source_result['geometrySha256']
assert data['worldWrites']==data['worldContacts']==0
assert data['gates']==['BLOCKED']*9 and data['BuildPlan']['operations']==[]
assert data['readiness']=='NOT_PREPARED' and data['constructionApproved'] is False and data['executionAllowed'] is False

# Independently place the author's root-relative rooms and check the HOST echo.
rooms=[]
for index,s in enumerate([author['entrySpace'],*author['otherSpaces']]):
    x,z=48,42
    if index:
        a=s['attach'];parent=rooms[a['parentIndex']];side=a['side'];shift=a['shift']
        if side=='east':x=parent['x']+parent['width']-1;z=parent['z']+(parent['depth']-s['depth'])//2+shift
        if side=='west':x=parent['x']-s['width']+1;z=parent['z']+(parent['depth']-s['depth'])//2+shift
        if side=='south':x=parent['x']+(parent['width']-s['width'])//2+shift;z=parent['z']+parent['depth']-1
        if side=='north':x=parent['x']+(parent['width']-s['width'])//2+shift;z=parent['z']-s['depth']+1
    rooms.append({**s,'x':x,'z':z})
    actual=next(n for n in data['plan']['nodes'] if n['id']==s['id'])
    assert (x,z,s['width'],s['depth'])==(actual['x'],actual['z'],actual['width'],actual['depth'])
room_map={r['id']:r for r in rooms}

# SOURCE graph: two cells across X, full support, THREE cells of air, and
# horizontal unit moves with height change <=1. This is not game physics.
b=design['bounds'];pads=set()
for x in range(b['width']-1):
    for z in range(b['depth']):
        for y in range(1,b['height']-2):
            if all((x+dx,y-1,z) in cells and all((x+dx,y+h,z) not in cells for h in range(3)) for dx in (0,1)):
                pads.add((x,y,z))
door=next(e for e in design['elements'] if e['id']=='exterior-entrance')
assert door['mode']=='cut' and door['size'][0]>=2 and door['size'][1]>=3
start=(door['origin'][0],door['origin'][1],door['origin'][2]-1)
assert start in pads, 'NO_MODELED_OUTSIDE_THRESHOLD_SUPPORT_AND_3_AIR'
seen={start};queue=deque([start])
while queue:
    x,y,z=queue.popleft()
    for dx,dz in ((1,0),(-1,0),(0,1),(0,-1)):
        for dy in (0,1,-1):
            p=(x+dx,y+dy,z+dz)
            if p in pads and p not in seen:seen.add(p);queue.append(p)
zones=[]
for level in data['program']:
    for zone in level['zones']:
        r=zone['range'];y=level['standingFloorY']
        candidates={p for p in pads if p[1]==y and r['x'][0]<=p[0] and p[0]+1<=r['x'][1] and r['z'][0]<=p[2]<=r['z'][1]}
        connected=candidates&seen
        zones.append({'id':zone['id'],'standingY':y,'supported3AirTwoWidePads':len(candidates),
                      'connectedPads':len(connected),'reached':bool(connected)})
assert all(z['reached'] for z in zones),'UNREACHED_PROGRAM_ZONE'

# Equipment is independently located from authored rooms / final source boxes,
# not from the JS reachability witnesses.
targets=[]
for fixture in data['plan']['fixtures']:
    node=room_map[fixture['nodeId']]
    targets.append({'id':fixture['id'],'origin':[node['x']+fixture['offsetX'],2,node['z']+fixture['offsetZ']],
                    'size':[fixture['width'],fixture['height'],fixture['depth']],
                    'material':fixture['material']})
for element in design['elements']:
    if element['id']=='mezz-authored-public-service-desk' or element['id'].startswith('facade-civic-function-workpoint-'):
        targets.append({'id':element['id'],'origin':element['origin'],'size':element['size'],'material':element['material']})
features=[]
for t in targets:
    x,y,z=t['origin'];sx,sy,sz=t['size'];mat=materials.index(t['material'])
    solid=all(cells.get((x+dx,y+dy,z+dz))==mat for dx in range(sx) for dy in range(sy) for dz in range(sz))
    fronts=[(x+dx,y,zz) for dx in range(sx-1) for zz in (z-1,z+sz)]
    sides=[(xx,y,z+dz) for xx in (x-2,x+sx) for dz in range(sz)]
    access=[p for p in fronts+sides if p in seen]
    features.append({'id':t['id'],'solidSourceGeometry':solid,'reachable3AirServicePad':bool(access)})
assert len(features)==6 and all(f['solidSourceGeometry'] and f['reachable3AirServicePad'] for f in features),'EQUIPMENT_NOT_REACHED'

glass=0
directions={'north':(0,-1),'south':(0,1),'west':(-1,0),'east':(1,0)}
for window in data['plan']['windows']:
    n=room_map[window['nodeId']];side=window['side'];dx,dz=directions[side]
    for t in range(window['span']):
        x=n['x'] if side=='west' else n['x']+n['width']-1 if side=='east' else n['x']+window['offset']+t
        z=n['z'] if side=='north' else n['z']+n['depth']-1 if side=='south' else n['z']+window['offset']+t
        for y in range(window['sillY'],window['sillY']+window['height']):
            assert cells.get((x,y,z))==materials.index('glass')
            assert (x+dx,y,z+dz) not in cells and (x-dx,y,z-dz) not in cells
            glass+=1
assert glass==36

# Actual open-sky void, real floor setback, and the equipment-test wing.
v=author['massing'];r=room_map[v['spaceId']]
left=r['x'] if v['corner'].endswith('W') else r['x']+r['width']-v['cutWidth']
top=r['z'] if v['corner'].startswith('N') else r['z']+r['depth']-v['cutDepth']
void_columns=0
for x in range(left,left+v['cutWidth']):
    for z in range(top,top+v['cutDepth']):
        assert (x,1,z) in cells and all((x,y,z) not in cells for y in range(2,b['height']))
        void_columns+=1
void_goal=(left+v['cutWidth']//2,2,top+v['cutDepth']//2)
assert void_goal in seen
f=author['floorplate'];r=room_map[f['spaceId']]
left=r['x'] if f['corner'].endswith('W') else r['x']+r['width']-f['width']
top=r['z'] if f['corner'].startswith('N') else r['z']+r['depth']-f['depth']
assert all((x,1,z) not in cells for x in range(left,left+f['width']) for z in range(top,top+f['depth']))
wing=author['wing'];r=room_map[wing['spaceId']]
assert wing['side']=='west'  # audit only the actually authored design
wing_goal=(r['x']-wing['reach']//2,2,r['z']+wing['start']+wing['span']//2)
assert wing_goal in seen
report={'status':'INDEPENDENT_PHYSICAL_SOURCE_QA_PASS',
        'authorship':'CURRENT_CHAT_AI_DECLARED_NOT_INDEPENDENTLY_ATTESTED','localQwenOutput':False,
        'allFinalVoxelsMaterialsAndLayersIndependentlyReconstructed':len(primitives),
        'sourceAndGeometryHashesMatch':True,'twoWideThreeAirPadsReached':len(seen),
        'modeledOutsideEntryConnected':True,'zones':zones,'features':features,
        'originalWindowGlassAndBothAirSides':glass,'openSkySupportedVoidColumns':void_columns,
        'trueFloorSetbackCells':f['width']*f['depth'],'externalWingReachable':True,
        'art':'NOT_REVIEWED','actualMinecraftMovement':'NOT_TESTED',
        'acousticPerformance':'NOT_TESTED','equipmentUse':'SOURCE_SERVICE_SURFACES_ONLY',
        'structuralEngineering':'NOT_CERTIFIED','formalProjectQA':'NOT_REPLACED',
        'worldWrites':0,'worldContacts':0,'constructionApproved':False,'gates':['BLOCKED']*9}
(ROOT/'INDEPENDENT_FUNCTIONAL_QA.json').write_bytes(json.dumps(report,ensure_ascii=False,indent=2).encode('utf-8'))
print(json.dumps({k:report[k] for k in ('status','allFinalVoxelsMaterialsAndLayersIndependentlyReconstructed',
 'twoWideThreeAirPadsReached','originalWindowGlassAndBothAirSides','openSkySupportedVoidColumns',
 'trueFloorSetbackCells','externalWingReachable','worldWrites')}))
