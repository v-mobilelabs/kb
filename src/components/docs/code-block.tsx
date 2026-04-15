'use client'

import { useState } from 'react'

interface CodeBlockProps {
  code: string
  language?: string
  title?: string
}

export function CodeBlock({ code, language = 'typescript', title }: Readonly<CodeBlockProps>) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="my-4 rounded-lg border border-[--border] bg-[--surface] overflow-hidden">
      {title && (
        <div className="px-4 py-2 bg-[--overlay] border-b border-[--border] text-xs font-medium text-[--muted]">
          {title}
        </div>
      )}
      <div className="relative">
        <pre className="p-4 overflow-x-auto">
          <code className="text-sm text-[--foreground]">{code}</code>
        </pre>
        <button
          onClick={copyToClipboard}
          className="absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium bg-[--accent] text-[--accent-foreground] hover:opacity-90 transition-opacity"
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
    </div>
  )
}
