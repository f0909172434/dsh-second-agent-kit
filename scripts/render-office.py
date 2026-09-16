#!/usr/bin/env python3
"""Render an Office file with independently installed LibreOffice and macOS fonts."""
import argparse
import os
from pathlib import Path
import subprocess
import tempfile
from xml.sax.saxutils import escape


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('output_dir', type=Path)
    parser.add_argument('--soffice', default='/Applications/LibreOffice.app/Contents/MacOS/soffice')
    parser.add_argument('--png', action='store_true', help='Requires PyMuPDF in this Python environment')
    args = parser.parse_args()
    source = args.source.resolve(strict=True)
    output = args.output_dir.resolve()
    output.mkdir(parents=True, exist_ok=True)
    if source.suffix.lower() not in {'.docx', '.xlsx', '.pptx', '.odt', '.ods', '.odp'}:
        parser.error('Unsupported source format')
    pdf = output / (source.stem + '.pdf')
    if pdf.exists():
        parser.error('Destination PDF exists; choose an empty output directory')
    with tempfile.TemporaryDirectory(prefix='office-render-', dir=output) as temp:
        root = Path(temp).resolve()
        fontconfig = root / 'fonts.conf'
        fontconfig.write_text('<?xml version="1.0"?><fontconfig>'
            '<dir>/System/Library/Fonts</dir><dir>/Library/Fonts</dir>'
            f'<cachedir>{escape(str(root / "font-cache"))}</cachedir></fontconfig>')
        env = dict(os.environ, FONTCONFIG_FILE=str(fontconfig))
        subprocess.run([args.soffice, '-env:UserInstallation=' + (root / 'profile').as_uri(),
            '--headless', '--convert-to', 'pdf', '--outdir', str(output), str(source)],
            env=env, check=True, timeout=120)
    if not pdf.is_file() or pdf.stat().st_size == 0:
        raise RuntimeError('LibreOffice did not produce a PDF')
    if args.png:
        import pymupdf
        with pymupdf.open(pdf) as document:
            for index, page in enumerate(document):
                page.get_pixmap(matrix=pymupdf.Matrix(1.5, 1.5)).save(output / f'{source.stem}-page-{index+1}.png')
            print(f'Rendered {len(document)} pages; visually inspect every PNG')
    print(pdf)

if __name__ == '__main__':
    main()
