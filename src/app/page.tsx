import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[--background] text-[--foreground]">
      {/* Nav */}
      <header className="border-b border-[--border] bg-[--surface]">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-lg font-bold tracking-tight text-[--accent]">CosmoOps</span>
          <Link
            href="/login"
            className="text-sm font-medium px-4 py-2 rounded-lg bg-[--accent] text-[--accent-foreground] hover:opacity-90 transition-opacity"
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 gap-8">
        <div className="flex flex-col items-center gap-4 max-w-3xl">
          <span className="text-xs font-semibold tracking-widest uppercase text-[--accent] border border-[--accent]/30 bg-[--accent]/5 rounded-full px-4 py-1">
            Production-Ready RAG Platform
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight text-[--foreground]">
            Ship AI Agents with<br className="hidden sm:block" /> Instant Knowledge Context
          </h1>
          <p className="text-lg text-[--muted] max-w-lg leading-relaxed">
            Upload documents once. Search semantically. Let your AI agents retrieve contextual knowledge in milliseconds. No RAG infrastructure to manage.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Link
            href="/login"
            className="px-6 py-3 rounded-xl bg-[--accent] text-[--accent-foreground] font-semibold text-sm hover:opacity-90 transition-opacity shadow-sm"
          >
            Get started free
          </Link>
          <Link
            href="/docs"
            className="px-6 py-3 rounded-xl border border-[--border] text-[--foreground] font-medium text-sm hover:bg-[--default] transition-colors"
          >
            View API Docs
          </Link>
        </div>
      </main>

      {/* Why CosmoOps */}
      <section id="features" className="border-t border-[--border] bg-[--surface]">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="flex flex-col gap-16">
            <div className="flex flex-col gap-3 max-w-2xl">
              <h2 className="text-3xl font-bold tracking-tight text-[--foreground]">
                Why CosmoOps for RAG
              </h2>
              <p className="text-base text-[--muted]">
                Purpose-built for AI agents. Deploy faster, scale further.
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-6">
              {[
                {
                  icon: '✨',
                  title: 'No RAG Plumbing',
                  desc: 'Vector embeddings, document indexing, and retrieval are built-in. No framework setup required.',
                },
                {
                  icon: '⚡',
                  title: 'Sub-Second Search',
                  desc: 'Semantic vector search optimized for latency. Retrieve context in <500ms at any scale.',
                },
                {
                  icon: '🛡️',
                  title: 'Enterprise Isolation',
                  desc: 'Multi-tenant Firestore architecture. 100% organization isolation, audit logs, and compliance ready.',
                },
                {
                  icon: '🔄',
                  title: 'Auto-Enrichment',
                  desc: 'Automatic embeddings generation, metadata extraction, and document classification. Set it and forget it.',
                },
                {
                  icon: '🤖',
                  title: 'Agent-Ready',
                  desc: 'Works seamlessly with LangChain, OpenAI, Anthropic, and any LLM framework. Built for integration.',
                },
                {
                  icon: '📈',
                  title: 'Scales to Millions',
                  desc: 'Cursor-based pagination and batched processing. Handle millions of documents and queries effortlessly.',
                },
              ].map(f => (
                <div key={f.title} className="flex flex-col gap-3 p-6 rounded-2xl border border-[--border] bg-[--overlay]">
                  <span className="text-3xl">{f.icon}</span>
                  <h3 className="font-semibold text-base text-[--foreground]">{f.title}</h3>
                  <p className="text-sm text-[--muted] leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Code Example */}
      <section className="border-t border-[--border] bg-[--background]">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="flex flex-col gap-12">
            <div className="flex flex-col gap-4 max-w-2xl">
              <h2 className="text-3xl font-bold tracking-tight text-[--foreground]">
                Query Your Knowledge Base
              </h2>
              <p className="text-base text-[--muted]">
                Simple REST API. Bearer token auth. Get results in milliseconds.
              </p>
            </div>

            <div className="max-w-2xl">
              {/* Query */}
              <div className="flex flex-col gap-3 p-6 rounded-xl border border-[--border] bg-[--overlay]">
                <h3 className="font-semibold text-sm text-[--accent]">POST /api/v1/query</h3>
                <pre className="text-xs bg-[--surface] p-3 rounded border border-[--border] overflow-x-auto">
                  {`const result = await fetch(
  'https://api.cosmoops.com/api/v1/query',
  {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      storeId: 'your-store-id',
      query: 'How do I enable SSO?',
      topK: 5
    })
  }
).then(r => r.json());

console.log(result);
// → { results: [...], 
//     scores: [...],
//     sources: [...] }`}
                </pre>
              </div>
            </div>

            <div className="p-6 rounded-xl bg-[--overlay] border border-[--border]">
              <p className="text-sm text-[--muted] mb-3">
                <strong>Full Example</strong> (Node.js) — <a href="/docs" className="text-[--accent] hover:underline">View API Docs →</a>
              </p>
              <pre className="text-xs bg-[--surface] p-4 rounded border border-[--border] overflow-x-auto">
                {`// Initialize
const API_KEY = 'your-api-key';
const BASE = 'https://api.cosmoops.com';

// Query the store
const results = await fetch(\`\${BASE}/api/v1/query\`, {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${API_KEY}\`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    storeId: 'your-store-id',
    query: 'How to get started?',
    topK: 10
  })
}).then(r => r.json());

console.log(results);`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="border-t border-[--border] bg-[--surface]">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="flex flex-col gap-16">
            <div className="flex flex-col gap-3 max-w-2xl">
              <h2 className="text-3xl font-bold tracking-tight text-[--foreground]">
                Use Cases
              </h2>
              <p className="text-base text-[--muted]">
                Power intelligent systems across any domain.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              {[
                {
                  title: 'AI Customer Support',
                  desc: 'Instant ticket resolution with contextual knowledge retrieval. Reduce response time from hours to seconds.',
                },
                {
                  title: 'Product Q&A Agents',
                  desc: 'Self-serve product documentation search. Answer customer questions in real-time with accurate sources.',
                },
                {
                  title: 'Internal Knowledge Search',
                  desc: 'Empower employees to find company policies, procedures, and technical docs instantly via conversational search.',
                },
                {
                  title: 'Legal & Compliance Analysis',
                  desc: 'Semantic search across contracts, regulations, and compliance documents with grounded responses.',
                },
              ].map(uc => (
                <div key={uc.title} className="flex flex-col gap-2 p-6 rounded-xl border border-[--border] bg-[--overlay]">
                  <h3 className="font-semibold text-base text-[--foreground]">{uc.title}</h3>
                  <p className="text-sm text-[--muted] leading-relaxed">{uc.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>



      {/* Use Cases */}
      <section className="border-t border-[--border] bg-[--surface]">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="flex flex-col gap-16">
            <div className="flex flex-col gap-3 max-w-2xl">
              <h2 className="text-3xl font-bold tracking-tight text-[--foreground]">
                Use Cases
              </h2>
              <p className="text-base text-[--muted]">
                Power intelligent systems across any domain.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              {[
                {
                  title: 'AI Customer Support',
                  desc: 'Instant ticket resolution with contextual knowledge retrieval. Reduce response time from hours to seconds.',
                },
                {
                  title: 'Product Q&A Agents',
                  desc: 'Self-serve product documentation search. Answer customer questions in real-time with accurate sources.',
                },
                {
                  title: 'Internal Knowledge Search',
                  desc: 'Empower employees to find company policies, procedures, and technical docs instantly via conversational search.',
                },
                {
                  title: 'Legal & Compliance Analysis',
                  desc: 'Semantic search across contracts, regulations, and compliance documents with grounded responses.',
                },
              ].map(uc => (
                <div key={uc.title} className="flex flex-col gap-2 p-6 rounded-xl border border-[--border] bg-[--overlay]">
                  <h3 className="font-semibold text-base text-[--foreground]">{uc.title}</h3>
                  <p className="text-sm text-[--muted] leading-relaxed">{uc.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-[--border] bg-[--background]">
        <div className="max-w-2xl mx-auto px-6 py-16 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-[--foreground] mb-4">
            Ready to ship AI agents?
          </h2>
          <p className="text-base text-[--muted] mb-8">
            Get an API key and start building your RAG application in minutes. No credit card required.
          </p>
          <Link
            href="/login"
            className="px-8 py-3 rounded-xl bg-[--accent] text-[--accent-foreground] font-semibold hover:opacity-90 transition-opacity inline-block"
          >
            Get started free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[--border] py-6 text-center text-xs text-[--muted]">
        © 2025 CosmoOps. All rights reserved.
      </footer>
    </div>
  )
}
