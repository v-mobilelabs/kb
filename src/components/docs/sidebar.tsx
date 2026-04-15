'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { docsNavigation } from '@/lib/docs-nav'

export function DocsSidebar() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/docs' && pathname === '/docs') return true
    if (href !== '/docs' && pathname.startsWith(href)) return true
    return pathname === href
  }

  return (
    <aside className="fixed left-0 top-16 w-64 border-r border-[--border] bg-[--surface] overflow-y-auto" style={{ height: 'calc(100vh - 4rem)' }}>
      <nav className="space-y-1 px-4 py-6">
        {docsNavigation.map(section => (
          <div key={section.href} className="mb-6">
            {/* Section header */}
            <Link
              href={section.href}
              className={`text-sm font-semibold px-3 py-2 rounded transition-colors block ${
                isActive(section.href)
                  ? 'text-[--accent] bg-[--accent]/10'
                  : 'text-[--foreground] hover:text-[--accent]'
              }`}
            >
              {section.label}
            </Link>

            {/* Sub items */}
            {section.children && section.children.length > 0 && (
              <div className="mt-2 space-y-1">
                {section.children.map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`text-sm px-3 py-1.5 rounded block transition-colors ${
                      isActive(item.href)
                        ? 'text-[--accent] bg-[--accent]/10 font-medium'
                        : 'text-[--muted] hover:text-[--foreground]'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </aside>
  )
}
