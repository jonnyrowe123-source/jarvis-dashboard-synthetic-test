"""Verify exact first-party package membership and SHA256, before or after npm ci."""
import hashlib, json, pathlib, sys
root = pathlib.Path(__file__).resolve().parent
excluded = {'SHA256SUMS.json', 'SHA256SUMS.txt', 'FR-GL03-19-PACKAGE.zip'}
actual = {}
for p in root.rglob('*'):
    relative = p.relative_to(root).as_posix()
    if relative.startswith('source/node_modules/') or relative == 'source/node_modules':
        continue  # Dependency bytes are verified by npm ci against package-lock.json.
    if relative in excluded:
        continue
    if p.is_symlink():
        sys.exit('FAIL: unexpected package symlink')
    if p.is_file():
        actual[relative] = hashlib.sha256(p.read_bytes()).hexdigest()
expected = json.loads((root / 'SHA256SUMS.json').read_text())
if actual != expected:
    sys.exit('FAIL: package file inventory or SHA256 mismatch')
print(f'PASS: {len(actual)} first-party files verified')
