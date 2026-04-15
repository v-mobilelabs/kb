'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { flattenNav } from '@/lib/docs-nav'

export function DocsBreadcrumb() {
  const pathname = usePathname()

  if (pathname === '/docs') {
    return null
  }

  const allDocs = flattenNav()
  const currentDoc = allDocs.find(doc => doc.href === pathname)

  const breadcrumbs = [
    { label: 'Docs', href: '/docs' },
    ...(currentDoc ? [{ label: currentDoc.label, href: currentDoc.href }] : []),
  ]

  return (
    <div className="flex items-center gap-2 text-sm text-[--muted] mb-6">
      {breadcrumbs.map((crumb, idx) => (
        <div key={crumb.href} className="flex items-center gap-2">
          {idx > 0 && <span className="text-[--border]">/</span>}
          <Link href={crumb.href} className="text-[--muted] hover:text-[--foreground] transition-colors">
            {crumb.label}
          </Link>
        </div>
      ))}
    </div>
  )
}
