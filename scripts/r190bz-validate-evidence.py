"""R190-BZ: independent stdlib XML + real-source orthographic pixel evidence audit.
No model calls, network, world access, image approximation or source repair.
"""
from collections import deque
import hashlib
import json
import pathlib
import sys
import xml.etree.ElementTree as ET

PALETTE = [
    "#8b9ca9", "#d5d6cf", "#657f91", "#7dc0ea",
    "#bc9c66", "#e7cb86", "#5ed1b5",
]
NS = "{http://www.w3.org/2000/svg}"


def check(condition, message):
    if not condition:
        raise AssertionError("R190BZ_EVIDENCE_" + message)


def expected_view(voxels, side, w, h, d):
    projected = {}
    for x, y, z, material, *_ in voxels:
        if side == "roof":
            key, depth = (x, z), -y
        elif side == "front":
            key, depth = (x, h - 1 - y), z
        elif side == "rear":
            key, depth = (x, h - 1 - y), -z
        elif side == "west":
            key, depth = (z, h - 1 - y), x
        elif side == "east":
            key, depth = (z, h - 1 - y), -x
        else:
            raise ValueError(side)
        old = projected.get(key)
        if old is None or depth < old[0]:
            projected[key] = (depth, PALETTE[material])
    return {key: color for key, (_, color) in projected.items()}


def read_view(path, w, h):
    root = ET.parse(path).getroot()
    check(root.tag == NS + "svg", "ROOT_" + path.name)
    check(root.attrib.get("viewBox") == "0 0 %s %s" % (6 * w, 6 * h),
          "VIEWBOX_" + path.name)
    rects = root.findall(NS + "rect")
    check(len(rects) >= 2, "EMPTY_" + path.name)
    check(rects[0].attrib.get("fill") == "#14202e", "BACKGROUND_" + path.name)
    observed = {}
    for rect in rects[1:]:
        a = rect.attrib
        x, y = int(a["x"]), int(a["y"])
        check(x % 6 == 0 and y % 6 == 0 and a["width"] == "6"
              and a["height"] == "6", "PIXEL_GRID_" + path.name)
        key = x // 6, y // 6
        check(key not in observed, "PIXEL_DUPLICATE_" + path.name)
        observed[key] = a["fill"]
    return observed


def shape_diagnostics(voxels):
    occupied = {(x, y, z) for x, y, z, *_ in voxels}
    rows = {}
    for x, y, z in occupied:
        rows.setdefault(y, []).append(z)
    wide_rows = sum(max(zs) - min(zs) >= 40 for zs in rows.values())
    unvisited = occupied.copy()
    connected = []
    while unvisited:
        seed = unvisited.pop()
        queue = deque([seed])
        count, low, high = 0, seed[1], seed[1]
        while queue:
            x, y, z = queue.popleft()
            count += 1
            low, high = min(low, y), max(high, y)
            for target in ((x - 1, y, z), (x + 1, y, z),
                           (x, y - 1, z), (x, y + 1, z),
                           (x, y, z - 1), (x, y, z + 1)):
                if target in unvisited:
                    unvisited.remove(target)
                    queue.append(target)
        connected.append({"voxels": count, "minY": low, "maxY": high})
    connected.sort(key=lambda v: v["voxels"], reverse=True)
    return {"sixNeighbourComponentCount": len(connected),
            "largestComponentFraction": connected[0]["voxels"] / len(occupied),
            "largestComponents": connected[:5],
            "wideDepthRows40": wide_rows, "totalOccupiedYRows": len(rows)}


def inspect(root):
    study = json.loads((root / "STUDY.json").read_text(encoding="utf-8"))
    check(study["technicalGate"] == "SOURCE_REAL_DISTINCT_OPEN_PATCHES", "TECH")
    check(study["artGate"] == "ART_HOLD", "ART")
    check(study["readiness"] == "NOT_PREPARED", "READINESS")
    check(study["BuildPlan"]["operations"] == [], "WORLD_PLAN")
    check(study["worldContacts"] == study["worldWrites"] == 0, "WORLD_WRITES")
    check(study["gates"] == ["BLOCKED"] * 9, "SAFETY_GATES")
    actual_hashes = []
    diagnostic_cases = {}
    for kind in ("A", "B"):
        folder = root / ("FORM_" + kind)
        author_raw = (folder / "ORIGINAL.json").read_bytes()
        original = json.loads(author_raw)
        whole = json.loads((folder / "ALL_VOXELS.json").read_text(encoding="utf-8"))
        audit = json.loads((folder / "AUDIT.json").read_text(encoding="utf-8"))
        voxels = whole["primitives"]
        actual_source_sha = hashlib.sha256(author_raw).hexdigest()
        check(actual_source_sha == audit["rawSha256"] == whole["originalRawSha256"],
              "SOURCE_SHA_" + kind)
        actual_geometry_sha = hashlib.sha256(
            json.dumps(voxels, separators=(",", ":"), ensure_ascii=False).encode()
        ).hexdigest()
        check(actual_geometry_sha == audit["geometrySha256"]
              == whole["geometrySha256"], "GEOMETRY_SHA_" + kind)
        check(len(voxels) == audit["finalVoxelCount"], "VOXEL_COUNT_" + kind)
        actual_hashes.append(actual_geometry_sha)
        diagnostic_cases[kind] = shape_diagnostics(voxels)
        w, h, d = (original["bounds"][key] for key in ("width", "height", "depth"))
        for side in ("front", "rear", "west", "east", "roof"):
            expected = expected_view(voxels, side, w, h, d)
            dims = (w, d) if side == "roof" else ((w, h)
                if side in ("front", "rear") else (d, h))
            observed = read_view(folder / ("VIEW_" + side + ".svg"), *dims)
            check(expected == observed, "SOURCE_PROJECTION_" + kind + "_" + side)
        for view in ("oblique", "ground", "canyon"):
            svg = ET.parse(folder / ("VIEW_" + view + ".svg")).getroot()
            check(svg.tag == NS + "svg" and svg.attrib.get("viewBox") == "0 0 640 640",
                  "PERSPECTIVE_XML_" + kind + "_" + view)
            check(len(svg.findall(NS + "rect")) > 100,
                  "PERSPECTIVE_EMPTY_" + kind + "_" + view)
        check(all(v["occupiedCells"] == 0 for v in audit["protectedVoidResults"]),
              "VOID_OCCUPIED_" + kind)
    check(actual_hashes[0] != actual_hashes[1], "INDEPENDENT_GEOMETRY")
    return {"status": "PASS_REAL_VOXEL_8_VIEWS_EACH", "geometrySha256": actual_hashes,
            "caseCount": 2, "viewsChecked": 16, "xmlViewsParsed": 16,
            "worldWrites": 0, "officialArtAdoptions": 0,
            "shapeDiagnosticsNotSafetyCertification": diagnostic_cases}


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python scripts/r190bz-validate-evidence.py <bz-evidence>")
    print(json.dumps(inspect(pathlib.Path(sys.argv[1])), ensure_ascii=False))
