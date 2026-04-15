import { DocsSidebar } from '@/components/docs/sidebar'
import { DocsTOC } from '@/components/docs/toc'
import { DocsSearch } from '@/components/docs/search'
import Link from 'next/link'
import './docs.css'

export default function DocsLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="min-h-screen bg-[--background] text-[--foreground]">
      {/* Docs Header */}
      <header className="fixed top-0 left-0 right-0 h-16 border-b border-[--border] bg-[--surface]/95 backdrop-blur-sm z-40">
        <div className="h-full px-6 flex items-center justify-between max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-lg font-bold text-[--accent]">
              CosmoOps
            </Link>
            <span className="text-sm text-[--muted]">/</span>
            <Link href="/docs" className="text-sm font-semibold text-[--foreground] hover:text-[--accent]">
              Docs
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <DocsSearch />
          </div>
        </div>
      </header>

      <div className="flex mt-16">
        {/* Sidebar */}
        <DocsSidebar />

        {/* Main Content */}
        <main className="flex-1 pt-8 pb-20 px-8 ml-64">
          <div className="max-w-3xl mx-auto">
            {children}
          </div>
        </main>

        {/* Table of Contents - Right Sidebar */}
        <DocsTOC />
      </div>
    </div>
  )
}
