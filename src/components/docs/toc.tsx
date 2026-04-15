'use client'

import { useEffect, useState } from 'react'

export interface TOCItem {
  id: string
  level: 1 | 2 | 3
  text: string
}

export function DocsTOC() {
  const [items, setItems] = useState<TOCItem[]>([])
  const [activeId, setActiveId] = useState<string>('')

  useEffect(() => {
    // Extract headings from the page
    const headings = Array.from(document.querySelectorAll('.docs-content h2, .docs-content h3'))
      .filter(heading => heading.id)
      .map(heading => ({
        id: heading.id,
        level: (Number.parseInt(heading.tagName[1]) as 1 | 2 | 3),
        text: heading.textContent || '',
      }))

    setItems(headings)

    // Intersection observer for active heading
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        })
      },
      { rootMargin: '-50% 0px -50% 0px' }
    )

    headings.forEach(heading => {
      const el = document.getElementById(heading.id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  if (items.length === 0) {
    return null
  }

  return (
    <aside className="fixed right-0 top-16 w-56 border-l border-[--border] bg-[--surface] overflow-y-auto hidden xl:block" style={{ height: 'calc(100vh - 4rem)' }}>
      <div className="sticky top-0 bg-[--surface]">
        <p className="text-xs font-semibold uppercase text-[--muted] mb-4 px-4 pt-6">On this page</p>
        <nav className="space-y-2 px-4 pb-6">
          {items.map(item => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={`block text-sm transition-colors ${
                item.level === 3 && 'pl-4'
              } ${
                activeId === item.id
                  ? 'text-[--accent] font-medium'
                  : 'text-[--muted] hover:text-[--foreground]'
              }`}
            >
              {item.text}
            </a>
          ))}
        </nav>
      </div>
    </aside>
  )
}
