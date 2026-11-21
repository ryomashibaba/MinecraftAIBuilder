"""R190-CA independent verification of raw SHA, exact occupied voxel SVG projections,
program support / 3-cell headroom, preserved voids and non-executable safety gates.
Python stdlib only; not the R190-CA geometry compiler or B143 model.
"""
import hashlib
import json
import pathlib
import sys
import xml.etree.ElementTree as ET

NS = "{http://www.w3.org/2000/svg}"
COLORS = ["#8b9ca9", "#d5d6cf", "#657f91", "#7dc0ea",
          "#bc9c66", "#e7cb86", "#5ed1b5"]


def demand(value, message):
    if not value:
        raise AssertionError("R190CA_" + message)


def inside(x, z, polygon):
    hit = False
    for i, b in enumerate(polygon):
        a = polygon[i - 1]
        if (a[1] > z) != (b[1] > z):
            if x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]:
                hit = not hit
    return hit


def direct_program_metric(program, occupied):
    y = program["floorY"]
    points = program["polygon"]
    xmin = int(min(v[0] for v in points))
    xmax = int(max(v[0] for v in points)) + 1
    zmin = int(min(v[1] for v in points))
    zmax = int(max(v[1] for v in points)) + 1
    target = clear = nofloor = blocked = 0
    for x in range(xmin, xmax + 1):
        for z in range(zmin, zmax + 1):
            if not inside(x + 0.5, z + 0.5, points):
                continue
            target += 1
            if (x, y, z) not in occupied:
                nofloor += 1
            elif any((x, y + offset, z) in occupied for offset in (1, 2, 3)):
                blocked += 1
            else:
                clear += 1
    return target, clear, nofloor, blocked


def real_projection(voxels, side, w, h, d):
    result = {}
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
        old = result.get(key)
        if old is None or depth < old[0]:
            result[key] = (depth, COLORS[material])
    return {key: val[1] for key, val in result.items()}


def svg_pixels(file, expected_w, expected_h):
    root = ET.parse(file).getroot()
    demand(root.tag == NS + "svg", "INVALID_XML_ROOT_" + file.name)
    demand(root.attrib.get("viewBox") ==
           "0 0 %s %s" % (expected_w * 6, expected_h * 6), "VIEWBOX_" + file.name)
    data = {}
    for rect in root.findall(NS + "rect")[1:]:
        a = rect.attrib
        x, y = int(a["x"]), int(a["y"])
        demand(x % 6 == 0 and y % 6 == 0 and
               a["width"] == a["height"] == "6", "PIXEL_SIZE_" + file.name)
        cell = (x // 6, y // 6)
        demand(cell not in data, "DUPLICATE_PIXEL_" + file.name)
        data[cell] = a["fill"]
    return data


def inspect(folder):
    overall = json.loads((folder / "STUDY.json").read_text(encoding="utf-8"))
    demand(overall["readiness"] == "NOT_PREPARED", "READINESS")
    demand(overall["gates"] == ["BLOCKED"] * 9, "GATES")
    demand(overall["BuildPlan"]["operations"] == [], "CONSTRUCTION_PLAN")
    demand(overall["worldContacts"] == overall["worldWrites"] == 0, "WORLD_WRITES")
    demand(overall["officialArtAdoptions"] == 0, "ART_ADOPTION")
    sha_list = []
    metrics = []
    for kind in ("A", "B"):
        sub = folder / ("MASS_" + kind)
        raw = (sub / "ORIGINAL.json").read_bytes()
        source = json.loads(raw)
        geom = json.loads((sub / "ALL_VOXELS.json").read_text(encoding="utf-8"))
        audit = json.loads((sub / "AUDIT.json").read_text(encoding="utf-8"))
        points = geom["primitives"]
        w, h, d = (source["bounds"][k] for k in ("width", "height", "depth"))
        raw_hash = hashlib.sha256(raw).hexdigest()
        geo_hash = hashlib.sha256(
            json.dumps(points, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
        ).hexdigest()
        demand(raw_hash == geom["originalRawSha256"] == audit["originalRawSha256"],
               "RAW_SHA_" + kind)
        demand(geo_hash == geom["geometrySha256"] == audit["geometrySha256"],
               "GEOMETRY_SHA_" + kind)
        sha_list.append(geo_hash)
        demand(len(points) == audit["trueFinalVoxelCount"], "VOXEL_COUNT_" + kind)
        actual = {(x, y, z) for x, y, z, *_ in points}
        demand(len(actual) == len(points), "DUPLICATE_VOXEL_" + kind)
        for void in source["protectedVoids"]:
            ox, oy, oz = void["origin"]
            sx, sy, sz = void["size"]
            occupied_void = sum((x, y, z) in actual for x in range(ox, ox + sx)
                                for y in range(oy, oy + sy)
                                for z in range(oz, oz + sz))
            demand(occupied_void == 0, "PROTECTED_VOID_" + void["id"])
        for program, reported in zip(source["programs"], audit["programFootprintEvidence"]):
            demand(program["id"] == reported["id"], "PROGRAM_ID_" + kind)
            target, clear, nofloor, blocked = direct_program_metric(program, actual)
            demand((target, clear, nofloor, blocked) ==
                   tuple(reported[key] for key in ("requestedCells", "supportedClearCells",
                       "unsupportedCells", "blockedCells")), "PROGRAM_VOXELS_" + program["id"])
        for side in ("front", "rear", "west", "east", "roof"):
            expected = real_projection(points, side, w, h, d)
            dims = (w, d) if side == "roof" else ((w, h)
                if side in ("front", "rear") else (d, h))
            observed = svg_pixels(sub / ("VIEW_" + side + ".svg"), *dims)
            demand(expected == observed, "PROJECTION_" + kind + "_" + side)
        for side in ("oblique", "ground", "canyon"):
            root = ET.parse(sub / ("VIEW_" + side + ".svg")).getroot()
            demand(root.tag == NS + "svg" and
                   root.attrib.get("viewBox") == "0 0 640 640",
                   "CAMERA_XML_" + kind + "_" + side)
            demand(len(root.findall(NS + "rect")) >= 100,
                   "CAMERA_EMPTY_" + kind + "_" + side)
        metrics.append({"kind": kind, "actualVoxelCount": len(points),
                        "zones": len(source["programs"]),
                        "supportedClearFractions": {
                            v["id"]: v["supportedClearFraction"]
                            for v in audit["programFootprintEvidence"]}})
    demand(sha_list[0] != sha_list[1], "DISTINCT_ARCHITECTURAL_GEOMETRY")
    return {"result": "PASS_INDEPENDENT_SOURCE_AND_VIEW_EVIDENCE",
            "xmlViews": 16, "exactOrthographicProjections": 10,
            "programRegionsIndependentlyRecalculated": sum(q["zones"] for q in metrics),
            "cases": metrics, "geometrySHA": sha_list,
            "artGate": "ART_HOLD", "functionGate": "NOT_CERTIFIED",
            "worldWrites": 0}


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python scripts/r190ca-verify.py ca-evidence")
    print(json.dumps(inspect(pathlib.Path(sys.argv[1])), ensure_ascii=False))
