"""R190-CC independent real final voxels, 16 XML, 10 exact ortho, authored-stair,
frozen-route SHA, protected void and authored room footprint evidence. stdlib only.
No output can certify Minecraft walking, human art or structural stability.
"""
import hashlib
import json
import pathlib
import sys
import xml.etree.ElementTree as ET
NS="{http://www.w3.org/2000/svg}"
COLORS=["#8b9ca9","#d5d6cf","#657f91","#7dc0ea","#bc9c66","#e7cb86","#5ed1b5"]
CB_SHA="041ac8905c697cb3eb347f8af3300d1ab470657edb8c841944eafdab7e8df353"
def req(v,s):
    if not v: raise AssertionError("R190CC_EVIDENCE_"+s)
def inside(x,z,p):
    val=False
    for i,b in enumerate(p):
        a=p[i-1]
        if (a[1]>z)!=(b[1]>z) and x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0]:
            val=not val
    return val
def proj(vox,view,h):
    rows={}
    for x,y,z,m,*_ in vox:
        if view=="roof":key=(x,z);depth=-y
        elif view=="front":key=(x,h-1-y);depth=z
        elif view=="rear":key=(x,h-1-y);depth=-z
        elif view=="west":key=(z,h-1-y);depth=x
        elif view=="east":key=(z,h-1-y);depth=-x
        else:raise ValueError(view)
        if key not in rows or depth<rows[key][0]:rows[key]=(depth,COLORS[m])
    return {k:color for k,(_,color) in rows.items()}
def xml_actual(file,wd,ht):
    root=ET.parse(file).getroot()
    req(root.tag==NS+"svg","ROOT_"+file.name)
    req(root.attrib.get("viewBox")==f"0 0 {wd*6} {ht*6}","BOUNDS_"+file.name)
    rects=root.findall(NS+"rect")
    req(len(rects)>100,"EMPTY_"+file.name)
    pixels={}
    for rect in rects[1:]:
        a=rect.attrib;x=int(a["x"]);y=int(a["y"])
        req(x%6==y%6==0 and a["width"]==a["height"]=="6",
            "PIXEL_DIM_"+file.name)
        key=x//6,y//6
        req(key not in pixels,"DUPLICATE_"+file.name)
        pixels[key]=a["fill"]
    return pixels
def programs_true_voxel(programs,vox):
    checked=[]
    for p in programs:
        py=p["floorY"];poly=p["polygon"]
        minx=int(min(v[0] for v in poly))
        maxx=int(max(v[0] for v in poly))+1
        minz=int(min(v[1] for v in poly))
        maxz=int(max(v[1] for v in poly))+1
        total=clear=nofloor=blocked=0
        for x in range(minx,maxx+1):
            for z in range(minz,maxz+1):
                if not inside(x+.5,z+.5,poly):continue
                total+=1
                if (x,py,z) not in vox:nofloor+=1
                elif any((x,py+d,z) in vox for d in (1,2,3)):blocked+=1
                else:clear+=1
        checked.append((p["id"],total,clear,nofloor,blocked))
    return checked
def check(root):
    study=json.loads((root/"STUDY.json").read_text(encoding="utf8"))
    req(study["worldWrites"]==study["worldContacts"]==0,"WORLD")
    req(study["gates"]==["BLOCKED"]*9,"GATES")
    req(study["BuildPlan"]["operations"]==[],"BUILDPLAN")
    final={}
    route_bytes=pathlib.Path("evidence/r190cb/RIFT_LANTERN.json").read_bytes()
    req(hashlib.sha256(route_bytes).hexdigest()==CB_SHA,"ROUTE_FROZEN_SHA")
    author=json.loads(route_bytes)
    nodes=author["circulation"]["nodes"]
    req(len(nodes)==267,"AUTHOR_NODES_COUNT")
    for label in ("A","B"):
        sub=root/("FORM_"+label)
        raw=(sub/"ORIGINAL.json").read_bytes()
        source=json.loads(raw)
        geom=json.loads((sub/"ALL_VOXELS.json").read_text(encoding="utf8"))
        audit=json.loads((sub/"AUDIT.json").read_text(encoding="utf8"))
        points=geom["primitives"]
        rawsha=hashlib.sha256(raw).hexdigest()
        geosha=hashlib.sha256(json.dumps(points,separators=(",",":"),ensure_ascii=False).encode()).hexdigest()
        req(rawsha==geom["originalRawSha256"]==audit["originalRawSha256"],"SOURCE_SHA_"+label)
        req(geosha==geom["geometrySha256"]==audit["geometrySha256"],"GEOMETRY_SHA_"+label)
        req(geom["originalRouteSha256"]==CB_SHA,"ROUTE_HASH_"+label)
        req(len(points)==audit["trueVoxelCount"],"VOXEL_COUNT_"+label)
        vox={(x,y,z) for x,y,z,*_ in points}
        req(len(vox)==len(points),"DUPLICATE_"+label)
        w,h,d=(source["bounds"][k] for k in ("width","height","depth"))
        for side in ("front","rear","west","east","roof"):
            dims=(w,d) if side=="roof" else ((w,h) if side in ("front","rear") else (d,h))
            req(xml_actual(sub/("VIEW_"+side+".svg"),*dims)==proj(points,side,h),
                "EXACT_REAL_PROJECTION_"+label+"_"+side)
        for side in ("oblique","ground","canyon"):
            image=ET.parse(sub/("VIEW_"+side+".svg")).getroot()
            req(image.tag==NS+"svg" and image.attrib.get("viewBox")=="0 0 640 640",
                "CAMERA_XML_"+label+"_"+side)
            req(len(image.findall(NS+"rect"))>100,"CAMERA_EMPTY_"+label+"_"+side)
        for i,(x,y,z) in enumerate(nodes):
            req(all((x+dx,y-1,z+dz) in vox and
                all((x+dx,y+off,z+dz) not in vox for off in (0,1,2))
                for dx in (0,1) for dz in (0,1)),"AUTHOR_ROUTE_"+label+"_"+str(i))
        for q in source["protectedVoids"]:
            ox,oy,oz=q["origin"];sx,sy,sz=q["size"]
            req(not any((x,y,z) in vox for x in range(ox,ox+sx)
                for y in range(oy,oy+sy) for z in range(oz,oz+sz)),
                "PROTECTED_VOID_"+label+"_"+q["id"])
        evidence=programs_true_voxel(author["architecture"]["programs"],vox)
        reported=audit["metrics"]["programMetrics"]
        req(len(evidence)==len(reported),"PROGRAM_COUNT_"+label)
        for (name,n,clear,nofloor,blocked),q in zip(evidence,reported):
            req((name,n,clear,nofloor,blocked)==
                (q["id"],q["requested"],q["supportedClear"],q["floorAbsent"],q["headBlocked"]),
                "PROGRAM_RECOMPUTE_"+label+"_"+name)
        req(audit["gates"]==["BLOCKED"]*9 and audit["worldWrites"]==0 and
            audit["BuildPlan"]["operations"]==[] and audit["officialArtAdoptions"]==0,
            "CASE_SAFE_"+label)
        final[label]={"voxelCount":len(points),"sourceSHA":rawsha,"geometrySHA":geosha,
             "actualCutsRemoved":audit["metrics"]["removedByTrue3dCuts"],
             "supportedAuthoredNodes":len(nodes),
             "programs":[{"id":n,"supportedClear":clear,"requested":num}
                          for n,num,clear,_,_ in evidence]}
    req(final["A"]["geometrySHA"]!=final["B"]["geometrySHA"],"DISTINCT_AUTHOR_DESIGNS")
    return {"result":"PASS_INDEPENDENT_TRUE_3D_SOURCE_AND_16_XML",
            "realOrthographicProjectionsVerified":10,"xmlViewsParsed":16,
            "realGameMovement":"NOT_TESTED","artAcceptance":"NOT_CERTIFIED",
            "programAndSafety":"PROXY_ONLY","worldWrites":0,"cases":final}
if __name__=="__main__":
    if len(sys.argv)!=2:raise SystemExit("Usage: python scripts/r190cc-evidence-verify.py <cc-evidence>")
    print(json.dumps(check(pathlib.Path(sys.argv[1])),ensure_ascii=False))
