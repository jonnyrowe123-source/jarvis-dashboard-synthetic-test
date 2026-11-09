"""Verify complete package membership and SHA256 (manifest excludes itself)."""
import hashlib, json, pathlib, sys
root = pathlib.Path(__file__).resolve().parent
expected = json.loads((root / 'SHA256SUMS.json').read_text())
actual = {p.relative_to(root).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest()
          for p in root.rglob('*') if p.is_file() and p != root / 'SHA256SUMS.json'}
if expected != actual:
    print('FAIL: package membership or file digest mismatch')
    sys.exit(1)
print(f'PASS: {len(actual)} package files verified')
