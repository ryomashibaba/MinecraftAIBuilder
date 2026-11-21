"""R190-CB: stdlib-only independent final-voxel SHA, 8 XML / 5 projected images,
2x2 authored riser/landing geometry, start+restaurant floor-zone and safety verifier.
All findings are proxy geometry, never real Minecraft movement certification.
"""
import hashlib
import json
import pathlib
import sys
import xml.etree.ElementTree as ET
NS="{http://www.w3.org/2000/svg}"
COLORS=["#8b9ca9","#d5d6cf","#657f91","#7dc0ea","#bc9c66","#e7cb86","#5ed1b5"]
def require(v,s):
    if not v: raise AssertionError("R190CB_"+s)
def inside(x,z,p):
    flag=False
    for i,b in enumerate(p):
        a=p[i-1]
        if (a[1]>z)!=(b[1]>z) and x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0]:
            flag=not flag
    return flag
def project(vox,side,h):
    depths={}
    for x,y,z,material,*_ in vox:
        if side=="roof":key=(x,z);depth=-y
        elif side=="front":key=(x,h-1-y);depth=z
        elif side=="rear":key=(x,h-1-y);depth=-z
        elif side=="west":key=(z,h-1-y);depth=x
        elif side=="east":key=(z,h-1-y);depth=-x
        else: raise ValueError(side)
        old=depths.get(key)
        if old is None or depth<old[0]:depths[key]=(depth,COLORS[material])
    return {k:v[1] for k,v in depths.items()}
def view_pixels(file,wd,ht):
    root=ET.parse(file).getroot()
    require(root.tag==NS+"svg","XML_ROOT_"+file.name)
    require(root.attrib.get("viewBox")=="0 0 %d %d"%(6*wd,6*ht),"VIEWBOX_"+file.name)
    pixels={}
    rectangles=root.findall(NS+"rect")
    require(len(rectangles)>100,"EMPTY_"+file.name)
    for rect in rectangles[1:]:
        a=rect.attrib
        x,y=int(a["x"]),int(a["y"])
        require(x%6==y%6==0 and a["width"]=="6" and a["height"]=="6","GRID_"+file.name)
        key=x//6,y//6
        require(key not in pixels,"DUPLICATE_"+file.name)
        pixels[key]=a["fill"]
    return pixels
def validate(folder):
    raw=(folder/"ORIGINAL.json").read_bytes()
    source=json.loads(raw)
    geom=json.loads((folder/"ALL_VOXELS.json").read_text(encoding="utf8"))
    audit=json.loads((folder/"AUDIT.json").read_text(encoding="utf8"))
    vox=geom["primitives"]
    source_hash=hashlib.sha256(raw).hexdigest()
    geo_hash=hashlib.sha256(json.dumps(vox,separators=(",",":"),ensure_ascii=False).encode()).hexdigest()
    require(source_hash==geom["originalRawSha256"]==audit["originalRawSha256"],"RAW_SHA")
    require(geo_hash==geom["geometrySha256"]==audit["geometrySha256"],"GEOMETRY_SHA")
    require(len(vox)==audit["metrics"]["finalVoxels"],"VOXEL_COUNT")
    occupied={(x,y,z) for x,y,z,*_ in vox}
    require(len(occupied)==len(vox),"DUPLICATE_VOXELS")
    bounds=source["architecture"]["bounds"];w,h,d=(bounds[k] for k in ("width","height","depth"))
    for side in ("front","rear","west","east","roof"):
        dims=(w,d) if side=="roof" else ((w,h) if side in ("front","rear") else (d,h))
        require(view_pixels(folder/("VIEW_"+side+".svg"),*dims)==project(vox,side,h),
                "PROJECTION_"+side)
    for side in ("oblique","ground","canyon"):
        root=ET.parse(folder/("VIEW_"+side+".svg")).getroot()
        require(root.tag==NS+"svg" and root.attrib.get("viewBox")=="0 0 640 640",
                "PERSPECTIVE_"+side)
        require(len(root.findall(NS+"rect"))>100,"EMPTY_CAMERA_"+side)
    nodes=source["circulation"]["nodes"]
    require(len(nodes)==audit["metrics"]["authoredNodeCount"],"NODE_COUNT")
    for i,(x,y,z) in enumerate(nodes):
        require(all((x+dx,y-1,z+dz) in occupied and all(
            (x+dx,y+dy,z+dz) not in occupied for dy in (0,1,2))
            for dx in (0,1) for dz in (0,1)),"STAIR_FLOOR_HEADROOM_"+str(i))
        if i:
            a,b,c=nodes[i-1]
            dx,dy,dz=abs(x-a),y-b,abs(z-c)
            require((dy==0 and dx+dz==1) or
                    (dy==1 and dx+dz==2 and (dx==0 or dz==0)),"STAIR_EDGE_"+str(i))
    start,end=nodes[0],nodes[-1]
    programs=source["architecture"]["programs"]
    require(start[1]==programs[0]["floorY"]+1 and
            inside(start[0]+.5,start[2]+.5,programs[0]["polygon"]),"FIRST_HALL_LINK")
    require(end[1]==programs[-1]["floorY"]+1 and
            inside(end[0]+.5,end[2]+.5,programs[-1]["polygon"]),"RESTAURANT_LINK")
    for q in source["architecture"]["protectedVoids"]:
        ox,oy,oz=q["origin"];sx,sy,sz=q["size"]
        require(all((x,y,z) not in occupied for x in range(ox,ox+sx)
                    for y in range(oy,oy+sy) for z in range(oz,oz+sz)),"VOID_"+q["id"])
    require(audit["readiness"]=="NOT_PREPARED" and
            audit["gates"]==["BLOCKED"]*9 and
            audit["BuildPlan"]["operations"]==[] and
            audit["officialArtAdoptions"]==0 and
            audit["worldContacts"]==audit["worldWrites"]==0,"CONSTRUCTION_SAFETY")
    risen=sum(nodes[i][1]-nodes[i-1][1] for i in range(1,len(nodes)))
    require(risen==84,"NONCONTIGUOUS_VERTICAL_RANGE")
    return {"evidence":"INDEPENDENT_AUTHORED_STAIR_AND_8VIEWS_PASS",
            "sourceSHA256":source_hash,"geometrySHA256":geo_hash,
            "voxels":len(vox),"positiveRiserSteps":risen,
            "authorNodes":len(nodes),"viewsXML":8,"exactProjectedImages":5,
            "firstHallAtBottom":True,"authoredRestaurantLandingAtTop":True,
            "function":"AUTHOR_DIRECTED_RISER_VOXEL_PROXY_ONLY",
            "actualMinecraftMovement":"NOT_TESTED",
            "independentStreetEntry":"NOT_TESTED",
            "externalStructuralSupport":"NOT_TESTED",
            "art":"HOLD_UNTIL_HUMAN_VISUAL_AUDIT","worldWrites":0}
if __name__=="__main__":
    if len(sys.argv)!=2:raise SystemExit("Usage: python scripts/r190cb-evidence-verify.py cb-evidence")
    print(json.dumps(validate(pathlib.Path(sys.argv[1])),ensure_ascii=False))
