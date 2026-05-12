import re
import subprocess
import os
import sys

# ── 1. Read blueprint ──────────────────────────────────────────────────────────
with open('MIRAI_BLUEPRINT.md', 'r', encoding='utf-8') as f:
    content = f.read()

# ── 2. Strip all fenced code blocks (``` ... ```) ──────────────────────────────
content_no_code = re.sub(r'```[^\n]*\n[\s\S]*?```', '', content)

# Strip inline code (backtick-wrapped words) → plain text
content_no_code = re.sub(r'`([^`]+)`', r'\1', content_no_code)

# Clean up excessive blank lines left after stripping
content_no_code = re.sub(r'\n{3,}', '\n\n', content_no_code)

# ── 3. Convert Markdown → HTML ────────────────────────────────────────────────
try:
    import markdown
    html_body = markdown.markdown(
        content_no_code,
        extensions=['tables', 'toc', 'nl2br']
    )
    print("markdown library found ✓")
except ImportError:
    # Minimal fallback: wrap in <pre> with basic heading detection
    lines = []
    for line in content_no_code.splitlines():
        if line.startswith('#### '):
            lines.append(f'<h4>{line[5:]}</h4>')
        elif line.startswith('### '):
            lines.append(f'<h3>{line[4:]}</h3>')
        elif line.startswith('## '):
            lines.append(f'<h2>{line[3:]}</h2>')
        elif line.startswith('# '):
            lines.append(f'<h1>{line[2:]}</h1>')
        elif line.startswith('---'):
            lines.append('<hr>')
        elif line.startswith('> '):
            lines.append(f'<blockquote>{line[2:]}</blockquote>')
        elif line.startswith('- [x] ') or line.startswith('- ✅'):
            lines.append(f'<li class="done">{line[2:]}</li>')
        elif line.startswith('- [ ] ') or line.startswith('- ❌'):
            lines.append(f'<li class="todo">{line[2:]}</li>')
        elif line.startswith('- '):
            lines.append(f'<li>{line[2:]}</li>')
        elif line.strip() == '':
            lines.append('<br>')
        else:
            lines.append(f'<p>{line}</p>')
    html_body = '\n'.join(lines)
    print("Using fallback HTML converter (pip install markdown for better output)")

# ── 4. Wrap in clean HTML with print-friendly CSS ────────────────────────────
html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>MIRAI Blueprint v2.0</title>
  <style>
    body {{
      font-family: Georgia, "Times New Roman", serif;
      font-size: 11pt;
      line-height: 1.75;
      max-width: 860px;
      margin: 0 auto;
      padding: 48px 56px;
      color: #111;
    }}

    h1 {{
      font-size: 20pt;
      margin-top: 36px;
      border-bottom: 2px solid #222;
      padding-bottom: 6px;
      page-break-after: avoid;
    }}
    h2 {{
      font-size: 15pt;
      margin-top: 30px;
      border-bottom: 1px solid #888;
      padding-bottom: 4px;
      page-break-after: avoid;
    }}
    h3 {{
      font-size: 12.5pt;
      margin-top: 22px;
      color: #222;
      page-break-after: avoid;
    }}
    h4 {{
      font-size: 11pt;
      margin-top: 16px;
      font-style: italic;
      page-break-after: avoid;
    }}

    p {{ margin: 8px 0 10px; }}
    ul, ol {{ margin: 6px 0; padding-left: 22px; }}
    li {{ margin: 3px 0; }}

    blockquote {{
      border-left: 4px solid #555;
      margin: 14px 0;
      padding: 8px 16px;
      background: #f7f7f7;
      font-style: italic;
      color: #333;
    }}

    table {{
      border-collapse: collapse;
      width: 100%;
      margin: 14px 0;
      font-size: 9.5pt;
      page-break-inside: auto;
    }}
    th {{
      background: #222;
      color: #fff;
      padding: 7px 10px;
      text-align: left;
      font-weight: bold;
    }}
    td {{
      border: 1px solid #bbb;
      padding: 5px 9px;
      vertical-align: top;
    }}
    tr:nth-child(even) td {{ background: #f5f5f5; }}

    hr {{
      border: none;
      border-top: 1px solid #bbb;
      margin: 22px 0;
    }}

    strong {{ color: #000; }}
    em {{ color: #333; }}

    @page {{
      margin: 2.2cm 2.5cm;
      @bottom-right {{ content: counter(page); font-size: 9pt; color: #666; }}
    }}
    @media print {{
      body {{ padding: 0; max-width: 100%; }}
      h1, h2, h3 {{ page-break-after: avoid; }}
      table {{ page-break-inside: auto; }}
      tr {{ page-break-inside: avoid; }}
    }}
  </style>
</head>
<body>
{html_body}
</body>
</html>"""

html_path = os.path.abspath('MIRAI_BLUEPRINT.html')
with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html)
print(f"HTML saved → {html_path}")

# ── 5. Print to PDF via Chrome headless ──────────────────────────────────────
pdf_path = os.path.abspath('MIRAI_BLUEPRINT.pdf')
chrome = r'C:\Program Files\Google\Chrome\Application\chrome.exe'

print(f"Converting to PDF via Chrome headless...")
result = subprocess.run([
    chrome,
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--run-all-compositor-stages-before-draw',
    f'--print-to-pdf={pdf_path}',
    '--print-to-pdf-no-header',
    '--no-pdf-header-footer',
    html_path
], capture_output=True, text=True, timeout=90)

if os.path.exists(pdf_path):
    size_kb = os.path.getsize(pdf_path) / 1024
    print(f"\n✅ PDF created → {pdf_path}  ({size_kb:.0f} KB)")
else:
    print("⚠  Chrome PDF failed. Open MIRAI_BLUEPRINT.html in Chrome and use Ctrl+P → Save as PDF")
    print("Chrome stderr:", result.stderr[:500] if result.stderr else "(none)")
