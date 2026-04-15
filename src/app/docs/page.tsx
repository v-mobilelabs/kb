import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Documentation — CosmoOps',
  description:
    'Complete guide to building RAG applications with CosmoOps. Learn core concepts, API reference, and integration examples.',
}

export default function DocsHome() {
  return (
    <div className="docs-content space-y-12">
      {/* Hero */}
      <div className="space-y-4 pb-8 border-b border-[--border]">
        <h1 className="text-4xl font-bold text-[--foreground]">Documentation</h1>
        <p className="text-lg text-[--muted] max-w-2xl">
          The complete guide to building RAG applications with CosmoOps. Learn how to upload documents, query your knowledge base, and integrate with your AI agents.
        </p>
      </div>

      {/* Quick Start Cards */}
      <div>
        <h2 id="quick-start" className="text-2xl font-bold mb-6 text-[--foreground]">
          Quick Start
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            {
              title: 'What is CosmoOps?',
              desc: 'Learn the core concepts and how CosmoOps works',
              href: '/docs/introduction/what-is-cosmoops',
            },
            {
              title: 'First API Call',
              desc: 'Get your API key and make your first query',
              href: '/docs/getting-started/first-api-call',
            },
            {
              title: 'Upload Documents',
              desc: 'Learn how to upload and index your knowledge base',
              href: '/docs/getting-started/installation',
            },
            {
              title: 'Query Endpoint',
              desc: 'Explore the REST API reference',
              href: '/docs/api/query',
            },
          ].map(card => (
            <Link
              key={card.href}
              href={card.href}
              className="p-4 rounded-xl border border-[--border] bg-[--overlay] hover:bg-[--surface] hover:border-[--accent]/50 transition-colors"
            >
              <h3 className="font-semibold text-[--foreground] mb-1">{card.title}</h3>
              <p className="text-sm text-[--muted]">{card.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Main Sections */}
      <div className="space-y-12">
        {/* Getting Started */}
        <section>
          <h2 id="getting-started" className="text-2xl font-bold mb-4 text-[--foreground]">
            Getting Started
          </h2>
          <p className="text-[--muted] mb-4">
            New to CosmoOps? Start here. We'll walk you through authentication, your first API call, and best practices.
          </p>
          <ul className="space-y-2 text-sm">
            {[
              { label: 'Installation', href: '/docs/getting-started/installation' },
              { label: 'Authentication', href: '/docs/getting-started/authentication' },
              { label: 'API Keys', href: '/docs/getting-started/api-keys' },
            ].map(item => (
              <li key={item.href}>
                <Link href={item.href} className="text-[--accent] hover:underline">
                  → {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Core Concepts */}
        <section>
          <h2 id="core-concepts" className="text-2xl font-bold mb-4 text-[--foreground]">
            Core Concepts
          </h2>
          <p className="text-[--muted] mb-4">
            Understand the fundamental building blocks: Stores, Documents, Embeddings, and Vector Search.
          </p>
          <ul className="space-y-2 text-sm">
            {[
              { label: 'Stores', href: '/docs/core-concepts/stores' },
              { label: 'Documents', href: '/docs/core-concepts/documents' },
              { label: 'Embeddings', href: '/docs/core-concepts/embeddings' },
              { label: 'Vector Search', href: '/docs/core-concepts/vector-search' },
            ].map(item => (
              <li key={item.href}>
                <Link href={item.href} className="text-[--accent] hover:underline">
                  → {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* API Reference */}
        <section>
          <h2 id="api-reference" className="text-2xl font-bold mb-4 text-[--foreground]">
            API Reference
          </h2>
          <p className="text-[--muted] mb-4">
            Complete REST API documentation with examples in multiple languages.
          </p>
          <ul className="space-y-2 text-sm">
            {[
              { label: 'Query Endpoint', href: '/docs/api/query' },
              { label: 'Upload Document', href: '/docs/api/upload' },
              { label: 'List Documents', href: '/docs/api/list' },
              { label: 'Delete Document', href: '/docs/api/delete' },
              { label: 'Error Handling', href: '/docs/api/errors' },
            ].map(item => (
              <li key={item.href}>
                <Link href={item.href} className="text-[--accent] hover:underline">
                  → {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Guides & Examples */}
        <section>
          <h2 id="guides" className="text-2xl font-bold mb-4 text-[--foreground]">
            Guides & Examples
          </h2>
          <p className="text-[--muted] mb-4">
            Step-by-step tutorials and code examples for common use cases.
          </p>
          <ul className="space-y-2 text-sm">
            {[
              { label: 'Build a Q&A Bot', href: '/docs/guides/qa-bot' },
              { label: 'Customer Support Agent', href: '/docs/guides/support-agent' },
              { label: 'Internal Wiki Search', href: '/docs/guides/wiki-search' },
            ].map(item => (
              <li key={item.href}>
                <Link href={item.href} className="text-[--accent] hover:underline">
                  → {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* CTA */}
      <div className="mt-12 p-6 rounded-xl border border-[--border] bg-[--overlay]">
        <h3 className="font-semibold text-[--foreground] mb-2">Ready to dive deeper?</h3>
        <p className="text-sm text-[--muted] mb-4">
          Explore the API Playground to test endpoints in real-time.
        </p>
        <a
          href="https://kb.cosmoops.com/playground"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-4 py-2 rounded-lg bg-[--accent] text-[--accent-foreground] text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Open API Explore →
        </a>
      </div>
    </div>
  )
}
