"""Independent Python SHA and exact five-direction voxel orthographic check.
Three camera splat images receive XML/nonblank checks, NOT raytrace validation.
"""
import hashlib
import json
import pathlib
import sys
import xml.etree.ElementTree as ET
COLORS=["#8b9ca9","#d5d6cf","#657f91","#7dc0ea","#bc9c66","#e7cb86","#5ed1b5"]
NS="{http://www.w3.org/2000/svg}"
VIEWS=("front","rear","west","east","roof","oblique","ground","canyon")
def req(ok,tag):
    if not ok:raise AssertionError("R190CE_INDEPENDENT_"+tag)
def projection(cells,view,h):
    depth={}
    for x,y,z,m,*_ in cells:
        if view=="roof":k=(x,z);v=-y
        elif view=="front":k=(x,h-1-y);v=z
        elif view=="rear":k=(x,h-1-y);v=-z
        elif view=="west":k=(z,h-1-y);v=x
        else:k=(z,h-1-y);v=-x
        if k not in depth or v<depth[k][0]:
            depth[k]=(v,COLORS[m])
    return {k:v[1] for k,v in depth.items()}
def inspect(d):
    cd=d/"cd"; visual=d/"visual"
    score=json.loads((cd/"CD_SCORECARD.json").read_text(encoding="utf-8"))
    vox=json.loads((cd/"DERIVED_VOXELS.json").read_text(encoding="utf-8"))
    audit=json.loads((visual/"VISUAL_EVIDENCE.json").read_text(encoding="utf-8"))
    cells=vox["primitives"]
    actual=hashlib.sha256(json.dumps(cells,separators=(",",":"),ensure_ascii=False).encode()).hexdigest()
    req(actual==audit["rawVoxelOnlySha256"]==score["primitiveVoxelSha256"],"VOXEL_SHA")
    req(audit["geometrySha256"]==score["geometrySha256"],"B143_SHA")
    req(audit["sourceRawSha256"]==score["rawSourceSha256"],"SOURCE_SHA")
    req(audit["artDecision"]=="ART_HOLD","ART_HOLD")
    req(audit["modelCalls"]==audit["worldWrites"]==audit["worldContacts"]==0,"ZERO_IO")
    req(audit["gates"]==["BLOCKED"]*9 and audit["BuildPlan"]["operations"]==[],"SAFETY")
    req([p["view"] for p in audit["images"]]==list(VIEWS),"VIEWS")
    w,h,z=(score["bounds"][k] for k in ("width","height","depth"))
    for entry in audit["images"]:
        b=(visual/entry["file"]).read_bytes()
        name=entry["view"]
        req(hashlib.sha256(b).hexdigest()==entry["sha256"] and len(b)==entry["bytes"],"IMAGE_SHA_"+name)
        root=ET.fromstring(b)
        req(root.tag==NS+"svg","SVG_"+name)
        if name in VIEWS[:5]:
            width=w if name in ("front","rear","roof") else z
            height=z if name=="roof" else h
            req(root.attrib.get("viewBox")==f"0 0 {width*6} {height*6}","VIEWBOX_"+name)
            pixels={}
            for rect in root.findall(NS+"rect"):
                if "x" not in rect.attrib:continue
                x,y=int(rect.attrib["x"]),int(rect.attrib["y"])
                req(x%6==0 and y%6==0 and rect.attrib["width"]==rect.attrib["height"]=="6","CELL_"+name)
                k=(x//6,y//6)
                req(k not in pixels,"DUPLICATE_"+name)
                pixels[k]=rect.attrib["fill"]
            req(pixels==projection(cells,name,h),"PIXEL_MISMATCH_"+name)
        else:
            req(root.attrib.get("viewBox")=="0 0 640 640","CAMERA_SIZE_"+name)
            req(any("x" in r.attrib for r in root.findall(NS+"rect")),"EMPTY_CAMERA_"+name)
    return {"voxels":len(cells),"orthosRechecked":5,"camerasStructurallyChecked":3,
            "humanArt":"NOT_REVIEWED"}
if __name__=="__main__":
    if len(sys.argv)!=2:raise SystemExit("Usage: python scripts/r190ce-independent-verify.py CE_DIR")
    root=pathlib.Path(sys.argv[1])
    result=json.loads((root/"STUDY.json").read_text(encoding="utf-8"))
    req(result["modelCalls"]==result["worldWrites"]==0,"STUDY_ZERO_IO")
    cases={n:inspect(root/n) for n in ("READING_TWO_LEVELS","PUBLIC_CONCOURSE")}
    req(len(result["cases"])==2 and result["humanArtDecision"]=="ART_HOLD","STUDY_ART")
    print(json.dumps({"result":"PASS_SOURCE_ONLY_EIGHT_VIEW_EVIDENCE_NOT_ART",
        "cases":cases,"modelCalls":0,"worldWrites":0}))
