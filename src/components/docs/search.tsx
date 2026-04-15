'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { search, type SearchResult } from '@/lib/docs-search'

export function DocsSearch() {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])

  const handleSearch = useCallback(
    (q: string) => {
      setQuery(q)
      if (q.length >= 2) {
        setResults(search(q))
        setIsOpen(true)
      } else {
        setResults([])
        setIsOpen(false)
      }
    },
    []
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        const input = document.querySelector('[data-docs-search-input]') as HTMLInputElement
        input?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="relative w-full max-w-xs">
      <input
        type="text"
        data-docs-search-input
        placeholder="Search docs... (⌘K)"
        value={query}
        onChange={e => handleSearch(e.target.value)}
        onFocus={() => query.length >= 2 && setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 100)}
        className="w-full px-3 py-1.5 rounded-lg bg-[--overlay] border border-[--border] text-sm placeholder-[--muted] focus:outline-none focus:ring-2 focus:ring-[--accent] transition-all"
      />

      {isOpen && results.length > 0 && (
        <div className="absolute top-12 left-0 right-0 bg-[--surface] border border-[--border] rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="max-h-96 overflow-y-auto">
            {results.map(result => (
              <Link
                key={result.href}
                href={result.href}
                onClick={() => {
                  setQuery('')
                  setIsOpen(false)
                  setResults([])
                }}
                className="block px-4 py-3 hover:bg-[--overlay] border-b border-[--border] last:border-0 transition-colors"
              >
                <div className="font-medium text-sm text-[--foreground]">{result.title}</div>
                <div className="text-xs text-[--muted] mt-1 line-clamp-1">{result.excerpt}</div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {isOpen && query.length >= 2 && results.length === 0 && (
        <div className="absolute top-12 left-0 right-0 bg-[--surface] border border-[--border] rounded-lg shadow-lg z-50 p-4 text-center">
          <p className="text-sm text-[--muted]">No results found for "{query}"</p>
        </div>
      )}
    </div>
  )
}
