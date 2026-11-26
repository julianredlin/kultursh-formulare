"""Nur für die Wartung. Verifizierte Browser-Artefakte ohne npm-Installation übernehmen."""
from hashlib import sha256
from io import BytesIO
from pathlib import Path
import tarfile
from urllib.request import urlopen

VERSION = '6.5.438'
DIGEST = '7461aefcd27c4ef0dd76f9ca5760f09466eb6b3f934432670c12132e7b3d6faa'
vendor = Path(__file__).resolve().parent / 'vendor'
with urlopen(f'https://registry.npmjs.org/pdfjs-dist/-/pdfjs-dist-{VERSION}.tgz', timeout=60) as response:
    data = response.read()
if sha256(data).hexdigest() != DIGEST:
    raise SystemExit('Unerwartete Paket-Prüfsumme; Abbruch vor dem Schreiben.')
with tarfile.open(fileobj=BytesIO(data)) as archive:
    for item in archive.getmembers():
        if not item.isfile():
            continue
        path = Path(item.name).relative_to('package')
        if path.as_posix() in ('build/pdf.min.mjs', 'build/pdf.worker.min.mjs'):
            target = vendor / path.name
        elif path.as_posix() == 'LICENSE':
            target = vendor / 'PDFJS-LICENSE.txt'
        elif path.parts[0] in ('cmaps', 'standard_fonts', 'iccs', 'wasm') and 'quickjs' not in path.name.lower():
            target = vendor / 'pdfjs-assets' / path
        else:
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(archive.extractfile(item).read())