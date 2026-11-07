"""R190-CD independent Python reading frozen true-voxel CC evidence and JS scorecards.
No model, geometry editing, implicit entrances or Minecraft API.
This verifier re-counts support/headroom and route geometry without relying on JS scoring.
"""
import hashlib
import json
import pathlib
import sys

CB_SHA="041ac8905c697cb3eb347f8af3300d1ab470657edb8c841944eafdab7e8df353"
BM_SHA="bbd44cc9f28234055601b4055466e2f3564e7e4565d408432de4c4fab0aa277a"

def require(v,k):
    if not v: raise AssertionError("R190CD_INDEPENDENT_"+k)

def polygon_inside(x,z,p):
    hit=False
    for i,b in enumerate(p):
        a=p[i-1]
        if (a[1]>z)!=(b[1]>z) and x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0]:
            hit=not hit
    return hit

def compare(inp,report,cb):
    source=(inp/"ORIGINAL.json").read_bytes()
    geom=json.loads((inp/"ALL_VOXELS.json").read_text(encoding="utf8"))
    actual=json.loads((report/"CD_SCORECARD.json").read_text(encoding="utf8"))
    raw_hash=hashlib.sha256(source).hexdigest()
    xyz=geom["primitives"]
    geometric=hashlib.sha256(json.dumps(xyz,separators=(",",":"),ensure_ascii=False).encode()).hexdigest()
    require(actual["rawSourceSha256"]==raw_hash==geom["originalRawSha256"],"RAW_SHA")
    require(actual["geometrySha256"]==geometric==geom["geometrySha256"],"GEOM_SHA")
    require(len(xyz)==actual["voxelCount"],"VOXEL_NUMBER")
    full={(x,y,z) for x,y,z,*_ in xyz}
    require(len(full)==len(xyz),"DUPLICATE_OCCUPIED")
    require(actual["entrances"]==[],"ENTRANCE_WAS_INVENTED")
    require("MISSING_AUTHOR_ENTRANCE" in actual["findings"],"MISSING_ENTRANCE_HOLD")
    require(actual["conservative2x2ReachableAnchors"]==0,"UNJUSTIFIED_ROUTE")
    h=actual["bounds"]["height"]
    for p,observed in zip(cb["architecture"]["programs"],actual["programs"]):
        require(p["id"]==observed["id"],"PROGRAM_ORDER")
        py=p["floorY"]
        poly=p["polygon"]
        minx=int(min(v[0] for v in poly))
        maxx=int(max(v[0] for v in poly))+1
        minz=int(min(v[1] for v in poly))
        maxz=int(max(v[1] for v in poly))+1
        request=clear=nofloor=blocked=twoWide=0
        for x in range(minx,maxx+1):
            for z in range(minz,maxz+1):
                if not polygon_inside(x+.5,z+.5,poly):continue
                request+=1
                if (x,py,z) not in full:nofloor+=1
                elif any((x,py+t,z) in full for t in (1,2,3)):blocked+=1
                else:clear+=1
                if all((x+dx,py,z+dz) in full and all(
                    (x+dx,py+o,z+dz) not in full for o in (1,2,3))
                        for dx in (0,1) for dz in (0,1)):
                    twoWide+=1
        require((request,clear,nofloor,blocked,twoWide)==
            (observed["requestedCells"],observed["supportedClearCells"],
            observed["missingFloorCells"],observed["blockedHeadroomCells"],
            observed["conservativeTwoWideStandable"]),"PHYSICAL_PROGRAM_"+p["id"])
        require(observed["conservativeTwoWideReachable"]==0,
                "MISSING_ENTRANCE_NO_REACH_"+p["id"])
    nodes=cb["circulation"]["nodes"]
    require(actual["authorRoute"]["nodes"]==len(nodes),"ROUTE_NODES")
    nonconservative=sum(not (
       (node[1]==prior[1] and abs(node[0]-prior[0])+abs(node[2]-prior[2])==1) or
       (abs(node[1]-prior[1])==1 and
        abs(node[0]-prior[0])+abs(node[2]-prior[2])==1))
       for prior,node in zip(nodes,nodes[1:]))
    require(nonconservative==actual["authorRoute"]["nonConservativeTransitions"],
            "CONSERVATIVE_ROUTE_MATH")
    require(actual["gates"]==["BLOCKED"]*9 and
            actual["readiness"]=="NOT_PREPARED" and
            actual["BuildPlan"]["operations"]==[] and
            actual["worldWrites"]==0 and
            actual["modelCalls"]==0 and
            actual["officialArtAdoptions"]==0,"SAFE")
    return {"sourceSHA":raw_hash,"geometrySHA":geometric,
            "finalRealVoxelCount":len(xyz),
            "programsIndependentlyRecounted":len(cb["architecture"]["programs"]),
            "externalEntrancesInvented":0,
            "routeTransitionsNotConservativeStep1":nonconservative,
            "realMinecraftMovement":"NOT_TESTED",
            "art":"HUMAN_REJECTED_OLD_SOURCE_ONLY"}

if __name__=="__main__":
    if len(sys.argv)!=3:raise SystemExit("Usage: python scripts/r190cd-independent-verify.py cd-base-evidence cd-review")
    base,review=(pathlib.Path(v) for v in sys.argv[1:])
    route=pathlib.Path("evidence/r190cb/RIFT_LANTERN.json").read_bytes()
    require(hashlib.sha256(route).hexdigest()==CB_SHA,"CB_FROZEN")
    cb=json.loads(route)
    summary=json.loads((review/"CD_STUDY.json").read_text(encoding="utf8"))
    require(summary["originalBMBriefSha256"]==BM_SHA and
            summary["originalCBRouteSha256"]==CB_SHA and
            summary["officialArtAdoptions"]==0 and
            summary["worldWrites"]==0,"SUMMARY_SAFETY")
    cases={}
    for name in ("A","B"):
        cases[name]=compare(base/("FORM_"+name),review/("FORM_"+name),cb)
    require(cases["A"]["geometrySHA"]!=cases["B"]["geometrySHA"],"DISTINCT_SOURCE")
    print(json.dumps({"result":"PASS_CD_INDEPENDENT_NEGATIVE_GATES",
     "note":"A PASS here means failing architecture is correctly held, not approved",
     "cases":cases,"modelCalls":0,"worldWrites":0},ensure_ascii=False))
