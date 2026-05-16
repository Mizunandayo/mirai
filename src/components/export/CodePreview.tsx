// src/components/export/CodePreview.tsx
import { useCallback, useState } from 'react'
import type { ExportPreviewTab } from '../../types/export'
import './export.css'





interface Props {
  code:     string
  language: ExportPreviewTab
}

const LANG_LABEL: Record<ExportPreviewTab, string> = {
  arduino: 'Arduino C++  (.ino)',
  python:  'Python 3  (.py)',
  urdf:    'URDF XML  (.urdf)',
  bom:     'Bill of Materials',
}





// Syntax highlighter — zero external deps 
function highlight(raw: string, lang: ExportPreviewTab): string {
  const safe = raw
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')

  if (lang === 'urdf') {
    return safe
      .replace(/(&lt;\/?[\w:.-]+)/g, '<span class="exp-tok-tag">$1</span>')
      .replace(/(&gt;)/g,            '<span class="exp-tok-tag">$1</span>')
      .replace(/"([^"]*)"/g,         '<span class="exp-tok-str">"$1"</span>')
  }

  if (lang === 'arduino') {
    return safe
      .replace(/(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g,
        '<span class="exp-tok-comment">$1</span>')
      .replace(/\b(void|int|float|bool|const|for|if|return|true|false|delay|max|min)\b/g,
        '<span class="exp-tok-kw">$1</span>')
      .replace(/\b(Servo|Serial|String)\b/g,
        '<span class="exp-tok-type">$1</span>')
      .replace(/(F\(".*?"\)|".*?")/g,
        '<span class="exp-tok-str">$1</span>')
      .replace(/\b(\d+\.?\d*)\b/g,
        '<span class="exp-tok-num">$1</span>')
  }

  // Python
  return safe
    .replace(/(#[^\n]*)/g,
      '<span class="exp-tok-comment">$1</span>')
    .replace(/("""[\s\S]*?"""|\'\'\'[\s\S]*?\'\'\'|"[^"]*"|\'[^\']*\')/g,
      '<span class="exp-tok-str">$1</span>')
    .replace(/\b(def|import|from|try|except|if|else|elif|for|return|True|False|None|class|and|or|not|in|is|as|with|raise|pass)\b/g,
      '<span class="exp-tok-kw">$1</span>')
    .replace(/(def\s+)(\w+)/g,
      '$1<span class="exp-tok-fn">$2</span>')
    .replace(/\b(\d+\.?\d*)\b/g,
      '<span class="exp-tok-num">$1</span>')
}

export default function CodePreview({ code, language }: Props) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* non-secure context — clipboard blocked */ }
  }, [code])







  return (
    <div className="exp-code-panel">
      <div className="exp-code-header">
        <span className="exp-code-lang">{LANG_LABEL[language]}</span>
        <button
          className={`exp-code-copy${copied ? ' exp-code-copy--ok' : ''}`}
          onClick={handleCopy}
          style={{ cursor: 'pointer' }}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div className="exp-code-scroll">
        <pre
          className="exp-code-pre"
          dangerouslySetInnerHTML={{ __html: highlight(code, language) }}
        />
      </div>
    </div>
  )
}
