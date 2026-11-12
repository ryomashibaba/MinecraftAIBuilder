"""Read-only, independent audit of this exact exported trial packet. No world API."""
import hashlib
import json
import re
from pathlib import Path

root = Path(__file__).resolve().parent
product = json.loads((root / 'TRUE_B143_PRODUCT.json').read_text(encoding='utf-8'))
packet = root / 'EDUCATION_TRIAL_V26_33'
report = json.loads((packet / 'EXPORT_REPORT.json').read_text(encoding='utf-8'))
raw = (packet / 'MAKECODE_EDUCATION.ts').read_bytes()
code = raw.decode('utf-8')
assert hashlib.sha256(raw).hexdigest() == report['makecodeSourceSha256']
for field in ('sourceSha256', 'geometrySha256'):
    assert report[field] == product['compiled'][field]
rows = json.loads(re.search(r'let mabRows: number\[\]\[\] = (.*)', code)[1])
columns = json.loads(re.search(r'let columns: number\[\]\[\] = (.*)', code)[1])
shift = [*report['sourceHorizontalOffset']]
expected = {(x+shift[0], y+report['sourceVerticalOffset'], z+shift[1]): m
            for x, y, z, m, _ in product['compiled']['primitives']}
actual = {}
for x, y, z, xx, yy, zz, material in rows:
    for i in range(x, xx+1):
        for j in range(y, yy+1):
            for k in range(z, zz+1):
                assert (i, j, k) not in actual, 'overlapping fill operations'
                actual[i, j, k] = material
assert actual == expected, 'exported placements changed source geometry or material'
tops = {}
for x, y, z in expected:
    tops[x, z] = max(tops.get((x, z), -1), y)
assert len(columns) == len(tops) == report['supportCells']
assert {(x, z): y for x, z, y in columns} == tops
assert sum(y+1 for y in tops.values()) == report['clearanceCells'] <= 40000
assert set(tops) == {(x, z) for x, _, z in expected}
assert report['plannedVoxelCount'] == len(actual) == 7926
assert report['plannedCuboids'] == len(rows) == 184
assert report['worldWrites'] == 0 and report['constructionApproved'] is False
assert report['programExecuted'] is False and report['gates'] == ['BLOCKED'] * 9
assert 'FillOperation.Replace' not in code and 'FillOperation.Keep' in code
print(json.dumps({'status': 'EXACT_TRANSLATED_PACKET_PASS', 'voxels': len(actual),
                  'cuboids': len(rows), 'clearanceCells': report['clearanceCells'],
                  'supportCells': len(tops), 'minecraftExecution': 'NOT_TESTED'}))
