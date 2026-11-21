"""R190-CA independent 2x2 supporting-footprint + three-headspace + step<=1 path audit.
This is a conservative grid walkability proxy, NOT a Minecraft game/physics/structural test.
Starts in first authored public hall, not outside street. The route does not assume teleports,
elevators, ladders, doors, ramps or rooms that are absent from final true voxels.
"""
import collections
import json
import pathlib
import sys

def check(ok, name):
    if not ok:
        raise AssertionError("R190CA_ROUTE_"+name)

def contains(x,z,polygon):
    hit=False
    for i,b in enumerate(polygon):
        a=polygon[i-1]
        if (a[1]>z)!=(b[1]>z) and x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0]:
            hit=not hit
    return hit

def supported_stands(voxels,bounds):
    """Each anchor (x,y,z) stands on a 2x2 solid floor at y-1 with y..y+2 clear."""
    w,h,d=(bounds[k] for k in ("width","height","depth"))
    solid={(x,y,z) for x,y,z,*_ in voxels}
    stand=set()
    for x,y,z in solid:
        if x+1>=w or z+1>=d or y+3>=h:
            continue
        if all((x+dx,y,z+dz) in solid and
               all((x+dx,y+off,z+dz) not in solid for off in (1,2,3))
               for dx in (0,1) for dz in (0,1)):
            stand.add((x,y+1,z))
    return stand

def trace(stands,start):
    if start is None:
        return set()
    seen={start}
    queue=collections.deque([start])
    while queue:
        x,y,z=queue.popleft()
        for dx,dz in ((1,0),(-1,0),(0,1),(0,-1)):
            for step in (-1,0,1):
                next_cell=(x+dx,y+step,z+dz)
                if next_cell in stands and next_cell not in seen:
                    seen.add(next_cell)
                    queue.append(next_cell)
    return seen

def inspect(source,voxels):
    bounds=source["bounds"]
    stands=supported_stands(voxels,bounds)
    programs=source["programs"]
    check(len(programs)>0,"NO_PROGRAMS")
    zones=[]
    for p in programs:
        y=p["floorY"]+1
        poly=p["polygon"]
        valid=[v for v in stands if v[1]==y and contains(v[0]+1,v[2]+1,poly)]
        zones.append(valid)
    first=programs[0]
    seed=None
    if zones[0]:
        midx=sum(q[0] for q in first["polygon"])/len(first["polygon"])
        midz=sum(q[1] for q in first["polygon"])/len(first["polygon"])
        seed=min(zones[0],key=lambda v:((v[0]-midx)**2+(v[2]-midz)**2,v))
    reachable=trace(stands,seed)
    result=[]
    for p,anchors in zip(programs,zones):
        matched=sum(anchor in reachable for anchor in anchors)
        result.append({
            "programId":p["id"],"floorY":p["floorY"],
            "validTwoWideFloorHeadroomAnchors":len(anchors),
            "reachableFromFirstHall":matched,
            "accessibleFractionOfValidAnchors":round(matched/len(anchors),4) if anchors else 0,
            "twoWideCellClearance":2,"headroomAboveStandingFloor":3
        })
    upper=[p for p in result[1:] if p["floorY"]>first["floorY"]]
    all_access=seed is not None and all(q["validTwoWideFloorHeadroomAnchors"]>0 and
        q["reachableFromFirstHall"]>0 for q in result)
    return {
        "source":"INDEPENDENT_FINAL_TRUE_VOXELS_2x2_3HEAD_STEP1",
        "scope":"FIRST_NOMINAL_PUBLIC_HALL_INTERIOR_SEED_NOT_STREET_ENTRY",
        "doesNotModel":"REAL_PLAYER_COLLISION_ELEVATORS_DOORS_JUMPS_LADDERS_OR_GAMEPLAY",
        "validTwoWideStandAnchors":len(stands),
        "hallSeed":list(seed) if seed is not None else None,
        "reachableAnchorsFromFirstHall":len(reachable),
        "upperProgramsReachableFromFirstHall":sum(q["reachableFromFirstHall"]>0 for q in upper),
        "upperProgramCount":len(upper),
        "programs":result,
        "functionalDecision":"HOLD_REJECT_CURRENT_ROUTE_EVIDENCE" if not all_access else
            "HOLD_PROXY_ONLY_GAMEPLAY_UNTESTED",
        "minecraftReadiness":"NOT_PREPARED",
        "constructionApproved":False,
        "worldContacts":0,"worldWrites":0
    }

def self_test():
    b={"width":7,"height":10,"depth":8}
    # Two-block-wide planar routes connect; remove a transverse strip to break them.
    pts=[(x,2,z,0,0) for x in range(1,6) for z in range(1,4)]
    stands=supported_stands(pts,b)
    check((1,3,1) in stands and (4,3,1) in stands,"TEST_STANDS")
    check((4,3,1) in trace(stands,(1,3,1)),"TEST_SAME_HEIGHT")
    gapped=[q for q in pts if q[0]!=3]
    isolated=supported_stands(gapped,b)
    check((4,3,1) in isolated and
          (4,3,1) not in trace(isolated,(1,3,1)),"TEST_GAP")
    check(not trace(stands,None),"TEST_NO_SEED")
    return True

if __name__=="__main__":
    if len(sys.argv)==2 and sys.argv[1]=="--self-test":
        print("R190CA_ROUTE_SELF_TEST_PASS",self_test())
        raise SystemExit(0)
    if len(sys.argv)!=2:
        raise SystemExit("Usage: python scripts/r190ca-navigation-audit.py <ca-evidence>")
    self_test()
    root=pathlib.Path(sys.argv[1])
    report={"schema":"minecraftaibuilder-r190ca-2wide-navigation-evidence-v1","cases":{}}
    for kind in ("A","B"):
        sub=root/("MASS_"+kind)
        src=json.loads((sub/"ORIGINAL.json").read_text(encoding="utf-8"))
        vox=json.loads((sub/"ALL_VOXELS.json").read_text(encoding="utf-8"))
        check(vox["originalRawSha256"]==
              json.loads((sub/"AUDIT.json").read_text(encoding="utf-8"))["originalRawSha256"],
              "SOURCE_HASH_"+kind)
        result=inspect(src,vox["primitives"])
        report["cases"][kind]=result
        (sub/"NAVIGATION_AUDIT.json").write_text(
            json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    check(report["cases"]["A"]["upperProgramsReachableFromFirstHall"]==0,
          "A_NEGATIVE_ROUTE_EXPECTED")
    check(report["cases"]["B"]["upperProgramsReachableFromFirstHall"]==0,
          "B_NEGATIVE_ROUTE_EXPECTED")
    check(all(v["worldWrites"]==0 for v in report["cases"].values()),"NO_WRITES")
    print(json.dumps(report,ensure_ascii=False))
