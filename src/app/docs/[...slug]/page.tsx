'use client'

import { notFound } from 'next/navigation'
import { DocsBreadcrumb } from '@/components/docs/breadcrumb'
import Link from 'next/link'

interface DocPageProps {
  params: {
    slug: string[]
  }
}

const docContent: Record<string, { title: string; content: React.ReactNode }> = {
  'introduction/what-is-cosmoops': {
    title: 'What is CosmoOps?',
    content: (
      <div className="docs-content space-y-6">
        <h1 className="text-4xl font-bold">What is CosmoOps?</h1>
        <p className="text-lg text-[--muted]">
          CosmoOps is a production-ready Retrieval-Augmented Generation (RAG) platform that lets you build AI agents with instant knowledge context.
        </p>

        <section>
          <h2 id="the-problem" className="text-2xl font-bold mt-8 mb-4">The Problem</h2>
          <p>
            Building RAG applications is hard. You need to manage vector embeddings, handle document indexing, build search pipelines, and integrate with LLMs. Most developers spend weeks on infrastructure that doesn't differentiate their product.
          </p>
        </section>

        <section>
          <h2 id="the-solution" className="text-2xl font-bold mt-8 mb-4">The Solution</h2>
          <p>
            CosmoOps abstracts away all the RAG plumbing. Upload documents once. Search semantically. Let your AI agents retrieve contextual knowledge in milliseconds.
          </p>
        </section>

        <section>
          <h2 id="key-features" className="text-2xl font-bold mt-8 mb-4">Key Features</h2>
          <ul className="space-y-3 list-disc list-inside text-[--muted]">
            <li><strong>No Infrastructure to Manage</strong> — Embeddings, indexing, and retrieval are all built-in</li>
            <li><strong>Sub-Second Search</strong> — Optimized vector search at any scale</li>
            <li><strong>Multi-Tenant by Default</strong> — 100% organization isolation out of the box</li>
            <li><strong>Auto-Enrichment</strong> — Automatic embeddings, metadata extraction, classification</li>
            <li><strong>Agent-Ready</strong> — Works with LangChain, OpenAI, Anthropic, and any LLM</li>
          </ul>
        </section>

        <section>
          <h2 id="how-it-works" className="text-2xl font-bold mt-8 mb-4">How It Works</h2>
          <ol className="space-y-3 list-decimal list-inside text-[--muted]">
            <li><strong>Create a Store</strong> — Define a knowledge base for your organization</li>
            <li><strong>Upload Documents</strong> — Add PDFs, text files, or structured data</li>
            <li><strong>Query Semantically</strong> — Ask natural language questions</li>
            <li><strong>Get Answers</strong> — Receive AI-generated answers with source citations</li>
          </ol>
        </section>

        <div className="mt-8 p-4 rounded-lg bg-[--overlay] border border-[--border]">
          <p className="text-sm text-[--muted]">
            Ready to get started? <Link href="/docs/getting-started/first-api-call" className="text-[--accent] hover:underline">Make your first API call →</Link>
          </p>
        </div>
      </div>
    ),
  },
  'introduction/key-concepts': {
    title: 'Key Concepts',
    content: (
      <div className="docs-content space-y-6">
        <h1 className="text-4xl font-bold">Key Concepts</h1>

        <section>
          <h2 id="stores" className="text-2xl font-bold mt-8 mb-4">Stores</h2>
          <p>
            A Store is a knowledge base scoped to an organization. It holds all your documents and embeddings. Think of it as a database table dedicated to a specific knowledge domain.
          </p>
          <p className="mt-2 text-sm text-[--muted]">Each store is completely isolated from others due to multi-tenancy.</p>
        </section>

        <section>
          <h2 id="documents" className="text-2xl font-bold mt-8 mb-4">Documents</h2>
          <p>
            Documents are the content you upload to a store. They can be plain text, PDFs, markdown, or structured data. Each document is automatically indexed and made searchable.
          </p>
        </section>

        <section>
          <h2 id="embeddings" className="text-2xl font-bold mt-8 mb-4">Embeddings</h2>
          <p>
            Embeddings are numerical representations of text that enable semantic search. CosmoOps automatically generates embeddings for all documents using state-of-the-art models.
          </p>
        </section>

        <section>
          <h2 id="vector-search" className="text-2xl font-bold mt-8 mb-4">Vector Search</h2>
          <p>
            Vector search finds documents semantically similar to your query—even if they don't share exact keywords. It's more powerful than keyword search and enables true semantic understanding.
          </p>
        </section>

        <section>
          <h2 id="rag" className="text-2xl font-bold mt-8 mb-4">RAG (Retrieval-Augmented Generation)</h2>
          <p>
            RAG is a pattern that combines retrieval and generation. CosmoOps retrieves relevant documents from your store, then uses an LLM to generate human-readable answers grounded in those documents.
          </p>
        </section>

        <div className="mt-8 p-4 rounded-lg bg-[--overlay] border border-[--border]">
          <p className="text-sm text-[--muted]">
            Next: Learn about <Link href="/docs/core-concepts/stores" className="text-[--accent] hover:underline">Stores in detail →</Link>
          </p>
        </div>
      </div>
    ),
  },
  'introduction/why-cosmoops': {
    title: 'Why Choose CosmoOps?',
    content: (
      <div className="docs-content space-y-6">
        <h1 className="text-4xl font-bold">Why Choose CosmoOps?</h1>

        <section>
          <h2 id="speed" className="text-2xl font-bold mt-8 mb-4">⚡ Speed to Market</h2>
          <p>
            Deploy a production RAG system in hours, not weeks. No infrastructure setup, no vendor integration nightmares. Focus on your product, not plumbing.
          </p>
        </section>

        <section>
          <h2 id="cost-effective" className="text-2xl font-bold mt-8 mb-4">💰 Cost Effective</h2>
          <p>
            Pay only for what you use. No expensive infrastructure to maintain. No hidden charges. Scales from startup to enterprise without breaking the bank.
          </p>
        </section>

        <section>
          <h2 id="production-ready" className="text-2xl font-bold mt-8 mb-4">✅ Production Ready</h2>
          <p>
            Enterprise-grade reliability with 99.9% uptime SLA. Multi-tenant isolation. Audit logs. Compliance ready. Trusted by teams building mission-critical AI applications.
          </p>
        </section>

        <section>
          <h2 id="developer-friendly" className="text-2xl font-bold mt-8 mb-4">👨‍💻 Developer Friendly</h2>
          <p>
            Simple, intuitive REST API. Excellent documentation. Playground for testing. SDKs for popular languages. Community support.
          </p>
        </section>

        <section>
          <h2 id="flexible" className="text-2xl font-bold mt-8 mb-4">🚀 Flexible</h2>
          <p>
            Works with any LLM. Integrates with your existing stack. Custom embeddings. Bring your own models. Extensible architecture.
          </p>
        </section>
      </div>
    ),
  },
  'getting-started/installation': {
    title: 'Installation',
    content: (
      <div className="docs-content space-y-6">
        <h1 className="text-4xl font-bold">Installation</h1>

        <section>
          <h2 id="no-installation" className="text-2xl font-bold mt-8 mb-4">No Installation Required</h2>
          <p>
            CosmoOps is a cloud service. There's nothing to install or deploy. Access it via REST API from anywhere.
          </p>
        </section>

        <section>
          <h2 id="get-started" className="text-2xl font-bold mt-8 mb-4">Get Started in 3 Steps</h2>
          
          <h3 className="text-lg font-semibold mt-6 mb-3">1. Sign Up</h3>
          <p>Visit <strong>kb.cosmoops.com</strong> and create an account (free, no credit card required).</p>

          <h3 className="text-lg font-semibold mt-6 mb-3">2. Create an Organization</h3>
          <p>Name your organization and you're ready to go. CosmoOps automatically handles multi-tenancy and isolation.</p>

          <h3 className="text-lg font-semibold mt-6 mb-3">3. Get Your API Key</h3>
          <p>Go to Settings → API Keys and generate your first key. You're now ready to use the API.</p>
        </section>

        <section>
          <h2 id="sdk-clients" className="text-2xl font-bold mt-8 mb-4">SDK Clients</h2>
          <p>You can interact with CosmoOps via:</p>
          <ul className="space-y-2 list-disc list-inside text-[--muted] mt-3">
            <li><strong>REST API</strong> (curl, Postman, any HTTP client)</li>
            <li><strong>Node.js SDK</strong> - Coming soon</li>
            <li><strong>Python SDK</strong> - Coming soon</li>
            <li><strong>JavaScript/TypeScript</strong> - Works with REST API</li>
          </ul>
        </section>
      </div>
    ),
  },
  'getting-started/authentication': {
    title: 'Authentication',
    content: (
      <div className="docs-content space-y-6">
        <h1 className="text-4xl font-bold">Authentication</h1>

        <section>
          <h2 id="api-keys" className="text-2xl font-bold mt-8 mb-4">API Keys</h2>
          <p>
            All API requests require authentication using an API key. Keys are created in the CosmoOps dashboard and should be kept secret.
          </p>
        </section>

        <section>
          <h2 id="passing-api-key" className="text-2xl font-bold mt-8 mb-4">Passing Your API Key</h2>
          <p className="mb-3">Use the <code>Authorization</code> header:</p>
          <pre className="bg-[--surface] p-4 rounded-lg border border-[--border] overflow-x-auto">
            <code className="text-sm text-[--foreground]">Authorization: Bearer your_api_key_here</code>
          </pre>
          <p className="mt-2 text-sm text-[--muted]">Format: <code>Bearer </code> followed by your key (with space in between)</p>
        </section>

        <section>
          <h2 id="example" className="text-2xl font-bold mt-8 mb-4">Example Request</h2>
          <pre className="bg-[--surface] p-4 rounded-lg border border-[--border] overflow-x-auto">
            <code className="text-sm text-[--foreground]">{String.raw`curl https://kb.cosmoops.com/api/v1/health \
  -H "Authorization: Bearer cmo_abc123..."`}</code>
          </pre>
        </section>

        <section>
          <h2 id="key-safety" className="text-2xl font-bold mt-8 mb-4">Keep Keys Secret</h2>
          <ul className="space-y-2 list-disc list-inside text-[--muted]">
            <li>Never commit keys to version control</li>
            <li>Use environment variables in production</li>
            <li>Rotate keys regularly</li>
            <li>Revoke compromised keys immediately</li>
          </ul>
        </section>
      </div>
    ),
  },
  'getting-started/api-keys': {
    title: 'Managing API Keys',
    content: (
      <div className="docs-content space-y-6">
        <h1 className="text-4xl font-bold">Managing API Keys</h1>

        <section>
          <h2 id="create" className="text-2xl font-bold mt-8 mb-4">Create an API Key</h2>
          <ol className="space-y-3 list-decimal list-inside text-[--muted]">
            <li>Log in to the CosmoOps dashboard</li>
            <li>Go to <strong>Settings → API Keys</strong></li>
            <li>Click <strong>"Create API Key"</strong></li>
            <li>Enter a name (e.g., "Production API", "Test Key")</li>
            <li>Click <strong>"Generate"</strong></li>
            <li><strong>Copy the key immediately</strong> — it's shown only once for security</li>
          </ol>
        </section>

        <section>
          <h2 id="format" className="text-2xl font-bold mt-8 mb-4">Key Format</h2>
          <p>Keys follow the pattern:</p>
          <pre className="bg-[--surface] p-4 rounded-lg border border-[--border] overflow-x-auto">
            <code className="text-sm text-[--foreground]">cmo_&lt;32 random characters&gt;</code>
          </pre>
          <p className="mt-2 text-sm text-[--muted]">Example: <code>cmo_abc123def456ghi789jkl012mno345</code></p>
        </section>

        <section>
          <h2 id="rotate" className="text-2xl font-bold mt-8 mb-4">Rotate Keys</h2>
          <p>
            It's a best practice to rotate keys periodically. Create a new key, update your applications to use it, then delete the old one.
          </p>
        </section>

        <section>
          <h2 id="revoke" className="text-2xl font-bold mt-8 mb-4">Revoke a Key</h2>
          <p>
            If a key is compromised, revoke it immediately from the API Keys settings. Revoked keys can no longer be used for authentication.
          </p>
        </section>
      </div>
    ),
  },
  'core-concepts/stores': {
    title: 'Stores',
    content: (
      <div className="docs-content space-y-6">
        <h1 className="text-4xl font-bold">Stores</h1>

        <section>
          <h2 id="overview" className="text-2xl font-bold mt-8 mb-4">What is a Store?</h2>
          <p>
            A Store is a knowledge base scoped to your organization. It's a collection of documents with their embeddings and metadata, ready for semantic search.
          </p>
        </section>

        <section>
          <h2 id="creating" className="text-2xl font-bold mt-8 mb-4">Creating a Store</h2>
          <p className="mb-3">Create a store via the API:</p>
          <pre className="bg-[--surface] p-4 rounded-lg border border-[--border] overflow-x-auto">
            <code className="text-sm text-[--foreground]">{String.raw`curl -X POST https://kb.cosmoops.com/api/v1/store \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Product Documentation",
    "description": "Internal knowledge base"
  }'`}</code>
          </pre>
        </section>

        <section>
          <h2 id="multi-store" className="text-2xl font-bold mt-8 mb-4">Multiple Stores</h2>
          <p>
            You can create multiple stores for different purposes:
          </p>
          <ul className="space-y-2 list-disc list-inside text-[--muted] mt-3">
            <li><strong>Product Docs</strong> — For customer support</li>
            <li><strong>Internal Wiki</strong> — For employee knowledge</li>
            <li><strong>Legal Docs</strong> — For compliance search</li>
            <li><strong>Code Comments</strong> — For dev documentation</li>
          </ul>
        </section>

        <section>
          <h2 id="isolation" className="text-2xl font-bold mt-8 mb-4">Isolation</h2>
          <p>
            Each store is completely isolated. Documents in one store cannot be accessed from another. This ensures data privacy and security.
          </p>
        </section>
      </div>
    ),
  },
  'core-concepts/documents': {
    title: 'Documents',
    content: (
      <div className="docs-content space-y-6">
        <h1 className="text-4xl font-bold">Documents</h1>

        <section>
          <h2 id="overview" className="text-2xl font-bold mt-8 mb-4">What is a Document?</h2>
          <p>
            A Document is a piece of content you upload to a store. It can be text, markdown, a PDF excerpt, or structured data. Each document is indexed and made searchable.
          </p>
        </section>

        <section>
          <h2 id="supported-formats" className="text-2xl font-bold mt-8 mb-4">Supported Formats</h2>
          <ul className="space-y-2 list-disc list-inside text-[--muted]">
            <li>Plain text (.txt)</li>
            <li>Markdown (.md)</li>
            <li>JSON (.json)</li>
            <li>HTML (.html)</li>
            <li>PDF (automatically extracted)</li>
          </ul>
        </section>

        <section>
          <h2 id="metadata" className="text-2xl font-bold mt-8 mb-4">Metadata</h2>
          <p>
            You can attach custom metadata to documents for filtering:
          </p>
          <ul className="space-y-2 list-disc list-inside text-[--muted] mt-3">
            <li>Source (e.g., "support-docs", "blog")</li>
            <li>Tags (e.g., "troubleshooting", "enterprise")</li>
            <li>Version (e.g., "v2.0")</li>
            <li>Author</li>
            <li>Custom fields</li>
          </ul>
        </section>

        <section>
          <h2 id="size-limits" className="text-2xl font-bold mt-8 mb-4">Size Limits</h2>
          <p>
            Maximum document size: <strong>20 MB</strong>. For larger files, split them into multiple documents.
          </p>
        </section>
      </div>
    ),
  },
  'core-concepts/embeddings': {
    title: 'Embeddings',
    content: (
      <div className="docs-content space-y-6">
        <h1 className="text-4xl font-bold">Embeddings</h1>

        <section>
          <h2 id="what-are" className="text-2xl font-bold mt-8 mb-4">What Are Embeddings?</h2>
          <p>
            Embeddings are numerical vectors (arrays of numbers) that represent the semantic meaning of text. Similar pieces of text have similar embeddings, enabling semantic search.
          </p>
        </section>

        <section>
          <h2 id="automatic" className="text-2xl font-bold mt-8 mb-4">Automatic Generation</h2>
          <p>
            CosmoOps automatically generates embeddings when you upload documents. You don't need to do anything — it's handled for you.
          </p>
          <p className="mt-3 text-sm text-[--muted]">
            We use state-of-the-art embedding models from Google Vertex AI for high-quality semantic understanding.
          </p>
        </section>

        <section>
          <h2 id="usage" className="text-2xl font-bold mt-8 mb-4">How They're Used</h2>
          <p>
            When you query a store, your query is also converted to an embedding. We then compare it to document embeddings to find semantically similar content.
          </p>
        </section>

        <section>
          <h2 id="cost" className="text-2xl font-bold mt-8 mb-4">Cost</h2>
          <p>
            Embedding generation is included in your CosmoOps subscription. No additional charges.
          </p>
        </section>
      </div>
    ),
  },
  'core-concepts/vector-search': {
    title: 'Vector Search',
    content: (
      <div className="docs-content space-y-6">
        <h1 className="text-4xl font-bold">Vector Search</h1>

        <section>
          <h2 id="how-it-works" className="text-2xl font-bold mt-8 mb-4">How It Works</h2>
          <p>
            Vector search finds documents semantically similar to your query by comparing embeddings in vector space. It's like finding points closest to a reference point in a high-dimensional space.
          </p>
        </section>

        <section>
          <h2 id="benefits" className="text-2xl font-bold mt-8 mb-4">Benefits Over Keyword Search</h2>
          <ul className="space-y-3 list-disc list-inside text-[--muted]">
            <li><strong>Semantic Understanding</strong> — Finds meaning, not just keywords</li>
            <li><strong>Paraphrasing</strong> — Works even if exact words don't match</li>
            <li><strong>Intent Matching</strong> — Understands what you're looking for</li>
            <li><strong>Cross-Language</strong> — Can match across languages</li>
          </ul>
        </section>

        <section>
          <h2 id="example" className="text-2xl font-bold mt-8 mb-4">Example</h2>
          <p><strong>Query:</strong> "How do I reset my password?"</p>
          <p className="mt-2"><strong>Traditional Search:</strong> Looks for exact words "reset" and "password"</p>
          <p className="mt-2"><strong>Vector Search:</strong> Understands the intent and finds documents about password recovery, account access, authentication reset, etc.</p>
        </section>

        <section>
          <h2 id="topK" className="text-2xl font-bold mt-8 mb-4">Top-K Results</h2>
          <p>
            When you search, you specify how many documents to return (topK). CosmoOps returns the top-K semantically similar documents ranked by relevance score.
          </p>
        </section>
      </div>
    ),
  },
  'api/query': {
    title: 'Query Endpoint',
    content: (
      <div className="docs-content space-y-6">
        <h1 className="text-4xl font-bold">Query Endpoint</h1>

        <section>
          <h2 id="endpoint" className="text-2xl font-bold mt-8 mb-4">POST /api/v1/query</h2>
          <p>Search a store and retrieve relevant documents with AI-generated answers.</p>
        </section>

        <section>
          <h2 id="request" className="text-2xl font-bold mt-8 mb-4">Request</h2>
          <pre className="bg-[--surface] p-4 rounded-lg border border-[--border] overflow-x-auto">
            <code className="text-sm text-[--foreground]">{String.raw`{
  "storeId": "store_abc123",
  "query": "How do I enable SSO?",
  "topK": 5,
  "filters": {},
  "enableRagEvaluation": false
}`}</code>
          </pre>
          
          <h3 className="text-lg font-semibold mt-6 mb-3">Parameters</h3>
          <ul className="space-y-3 list-disc list-inside text-[--muted]">
            <li><strong>storeId</strong> (required) — The store to query</li>
            <li><strong>query</strong> (required) — Natural language query</li>
            <li><strong>topK</strong> (optional) — Number of results (1-50, default 10)</li>
            <li><strong>filters</strong> (optional) — Metadata filters</li>
            <li><strong>enableRagEvaluation</strong> (optional) — Enable LLM quality check (default false)</li>
          </ul>
        </section>

        <section>
          <h2 id="response" className="text-2xl font-bold mt-8 mb-4">Response</h2>
          <pre className="bg-[--surface] p-4 rounded-lg border border-[--border] overflow-x-auto">
            <code className="text-sm text-[--foreground]">{String.raw`{
  "answer": "To enable SSO, navigate to Settings → Security → Single Sign-On...",
  "sources": [
    {
      "id": "doc_xyz",
      "title": "SSO Configuration",
      "excerpt": "Enable single sign-on for your organization",
      "score": 0.95,
      "url": "https://..."
    }
  ],
  "evaluationResult": {
    "isRelevant": true,
    "confidence": 0.92,
    "reasoning": "The retrieved documents directly address SSO configuration"
  }
}`}</code>
          </pre>
        </section>

        <section>
          <h2 id="example-curl" className="text-2xl font-bold mt-8 mb-4">Example Request</h2>
          <pre className="bg-[--surface] p-4 rounded-lg border border-[--border] overflow-x-auto">
            <code className="text-sm text-[--foreground]">{String.raw`curl -X POST https://kb.cosmoops.com/api/v1/query \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "storeId": "store_abc123",
    "query": "How do I enable SSO?",
    "topK": 5
  }'`}</code>
          </pre>
        </section>
      </div>
    ),
  },
  'api/upload': {
    title: 'Upload Document',
    content: (
      <div className="docs-content space-y-6">
        <h1 className="text-4xl font-bold">Upload Document</h1>

        <section>
          <h2 id="endpoint" className="text-2xl font-bold mt-8 mb-4">POST /api/v1/stores/{'{storeId}'}/documents</h2>
          <p>Upload a document to a store. The document will be automatically indexed and embedded.</p>
        </section>

        <section>
          <h2 id="request" className="text-2xl font-bold mt-8 mb-4">Request</h2>
          <p className="text-sm text-[--muted]">Use multipart/form-data:</p>
          <pre className="bg-[--surface] p-4 rounded-lg border border-[--border] overflow-x-auto mt-3">
            <code className="text-sm text-[--foreground]">{String.raw`curl -X POST https://kb.cosmoops.com/api/v1/stores/store_abc/documents \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -F "file=@document.pdf" \
  -F "title=My Document" \
  -F "metadata={\"source\":\"docs\"}"
`}</code>
          </pre>
        </section>

        <section>
          <h2 id="parameters" className="text-2xl font-bold mt-8 mb-4">Parameters</h2>
          <ul className="space-y-3 list-disc list-inside text-[--muted]">
            <li><strong>file</strong> (required) — Document file (PDF, TXT, MD, JSON, HTML)</li>
            <li><strong>title</strong> (optional) — Document title</li>
            <li><strong>metadata</strong> (optional) — Custom JSON metadata</li>
          </ul>
        </section>

        <section>
          <h2 id="limits" className="text-2xl font-bold mt-8 mb-4">Limits</h2>
          <ul className="space-y-2 list-disc list-inside text-[--muted]">
            <li>Max file size: 20 MB</li>
            <li>Processing time: Usually &lt;30 seconds</li>
          </ul>
        </section>
      </div>
    ),
  },
  'api/list': {
    title: 'List Documents',
    content: (
      <div className="docs-content space-y-6">
        <h1 className="text-4xl font-bold">List Documents</h1>

        <section>
          <h2 id="endpoint" className="text-2xl font-bold mt-8 mb-4">GET /api/v1/stores/{'{storeId}'}/documents</h2>
          <p>List all documents in a store with pagination.</p>
        </section>

        <section>
          <h2 id="request" className="text-2xl font-bold mt-8 mb-4">Request</h2>
          <pre className="bg-[--surface] p-4 rounded-lg border border-[--border] overflow-x-auto">
            <code className="text-sm text-[--foreground]">{String.raw`curl https://kb.cosmoops.com/api/v1/stores/store_abc/documents \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Accept: application/json"`}</code>
          </pre>
        </section>

        <section>
          <h2 id="query-params" className="text-2xl font-bold mt-8 mb-4">Query Parameters</h2>
          <ul className="space-y-2 list-disc list-inside text-[--muted]">
            <li><strong>limit</strong> (optional) — Results per page (default 20)</li>
            <li><strong>cursor</strong> (optional) — Pagination cursor</li>
          </ul>
        </section>

        <section>
          <h2 id="response" className="text-2xl font-bold mt-8 mb-4">Response</h2>
          <pre className="bg-[--surface] p-4 rounded-lg border border-[--border] overflow-x-auto">
            <code className="text-sm text-[--foreground]">{String.raw`{
  "documents": [
    {
      "id": "doc_xyz",
      "title": "Getting Started",
      "createdAt": "2026-04-15T10:00:00Z",
      "metadata": {}
    }
  ],
  "nextCursor": "eyJsYXN0S2V5SWQiOiAiZG9jXzEyMyJ9"
}`}</code>
          </pre>
        </section>
      </div>
    ),
  },
  'api/delete': {
    title: 'Delete Document',
    content: (
      <div className="docs-content space-y-6">
        <h1 className="text-4xl font-bold">Delete Document</h1>

        <section>
          <h2 id="endpoint" className="text-2xl font-bold mt-8 mb-4">DELETE /api/v1/stores/{'{storeId}'}/documents/{'{docId}'}</h2>
          <p>Permanently delete a document from a store.</p>
        </section>

        <section>
          <h2 id="request" className="text-2xl font-bold mt-8 mb-4">Request</h2>
          <pre className="bg-[--surface] p-4 rounded-lg border border-[--border] overflow-x-auto">
            <code className="text-sm text-[--foreground]">{String.raw`curl -X DELETE https://kb.cosmoops.com/api/v1/stores/store_abc/documents/doc_xyz \
  -H "Authorization: Bearer YOUR_API_KEY"`}</code>
          </pre>
        </section>

        <section>
          <h2 id="response" className="text-2xl font-bold mt-8 mb-4">Response</h2>
          <pre className="bg-[--surface] p-4 rounded-lg border border-[--border] overflow-x-auto">
            <code className="text-sm text-[--foreground]">{"{ \"deleted\": true }"}</code>
          </pre>
          <p className="mt-3 text-sm text-[--muted]">Returns 200 even if document doesn't exist (idempotent).</p>
        </section>
      </div>
    ),
  },
  'api/errors': {
    title: 'Error Handling',
    content: (
      <div className="docs-content space-y-6">
        <h1 className="text-4xl font-bold">Error Handling</h1>

        <section>
          <h2 id="overview" className="text-2xl font-bold mt-8 mb-4">Overview</h2>
          <p>
            CosmoOps returns standard HTTP status codes and JSON error responses. Always check the status code and error message.
          </p>
        </section>

        <section>
          <h2 id="status-codes" className="text-2xl font-bold mt-8 mb-4">Status Codes</h2>
          <ul className="space-y-3 list-disc list-inside text-[--muted]">
            <li><strong>200-299</strong> — Success</li>
            <li><strong>400</strong> — Bad request (check your parameters)</li>
            <li><strong>401</strong> — Unauthorized (invalid API key)</li>
            <li><strong>404</strong> — Not found (resource doesn't exist)</li>
            <li><strong>429</strong> — Rate limited (slow down)</li>
            <li><strong>500-599</strong> — Server error (retry with backoff)</li>
          </ul>
        </section>

        <section>
          <h2 id="error-response" className="text-2xl font-bold mt-8 mb-4">Error Response Format</h2>
          <pre className="bg-[--surface] p-4 rounded-lg border border-[--border] overflow-x-auto">
            <code className="text-sm text-[--foreground]">{String.raw`{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "storeId is required",
    "details": {
      "field": "storeId"
    }
  }
}`}</code>
          </pre>
        </section>

        <section>
          <h2 id="retry-strategy" className="text-2xl font-bold mt-8 mb-4">Retry Strategy</h2>
          <p>
            For temporary errors (5xx), retry with exponential backoff:
          </p>
          <ul className="space-y-2 list-disc list-inside text-[--muted] mt-3">
            <li>Retry 1: Wait 1 second</li>
            <li>Retry 2: Wait 2 seconds</li>
            <li>Retry 3: Wait 4 seconds</li>
            <li>Max retries: 3</li>
          </ul>
        </section>
      </div>
    ),
  },
  'guides/qa-bot': {
    title: 'Build a Q&A Bot',
    content: (
      <div className="docs-content space-y-6">
        <h1 className="text-4xl font-bold">Build a Q&A Bot</h1>

        <section>
          <h2 id="overview" className="text-2xl font-bold mt-8 mb-4">Overview</h2>
          <p>
            Learn how to build a Q&A bot that answers questions about your documents using CosmoOps and an LLM.
          </p>
        </section>

        <section>
          <h2 id="architecture" className="text-2xl font-bold mt-8 mb-4">Architecture</h2>
          <p>The typical flow:</p>
          <ol className="space-y-2 list-decimal list-inside text-[--muted] mt-3">
            <li>User asks a question</li>
            <li>Query CosmoOps to find relevant documents</li>
            <li>Pass query + documents to an LLM</li>
            <li>LLM generates answer grounded in documents</li>
            <li>Return answer to user with citations</li>
          </ol>
        </section>

        <section>
          <h2 id="steps" className="text-2xl font-bold mt-8 mb-4">Implementation Steps</h2>
          
          <h3 className="text-lg font-semibold mt-6 mb-3">1. Create a Store and Upload Documents</h3>
          <p className="text-sm text-[--muted]">Upload your knowledge base documents to CosmoOps.</p>

          <h3 className="text-lg font-semibold mt-6 mb-3">2. Search for Relevant Documents</h3>
          <p className="text-sm text-[--muted]">Use the Query API to find documents matching the user question.</p>

          <h3 className="text-lg font-semibold mt-6 mb-3">3. Generate Answer with LLM</h3>
          <p className="text-sm text-[--muted]">Send query + documents to OpenAI, Claude, or another LLM.</p>

          <h3 className="text-lg font-semibold mt-6 mb-3">4. Present Results to User</h3>
          <p className="text-sm text-[--muted]">Show the answer with citations back to source documents.</p>
        </section>

        <section>
          <h2 id="example-code" className="text-2xl font-bold mt-8 mb-4">Code Example (Node.js)</h2>
          <pre className="bg-[--surface] p-4 rounded-lg border border-[--border] overflow-x-auto">
            <code className="text-sm text-[--foreground]">{String.raw`// 1. Query CosmoOps for relevant docs
const docs = await cosmoops.query({
  storeId: 'store_abc',
  query: userQuestion,
  topK: 5
});

// 2. Generate answer with LLM
const answer = await openai.createChatCompletion({
  model: 'gpt-4',
  messages: [
    {
      role: 'system',
      content: 'Answer based on these documents: ' + 
               docs.map(d => d.excerpt).join('\n')
    },
    { role: 'user', content: userQuestion }
  ]
});

// 3. Return to user with citations
return {
  answer: answer.content,
  sources: docs
};`}</code>
          </pre>
        </section>
      </div>
    ),
  },
  'guides/support-agent': {
    title: 'Customer Support Agent',
    content: (
      <div className="docs-content space-y-6">
        <h1 className="text-4xl font-bold">Customer Support Agent</h1>

        <section>
          <h2 id="overview" className="text-2xl font-bold mt-8 mb-4">Overview</h2>
          <p>
            Build an AI-powered customer support agent that resolves issues instantly by searching your knowledge base.
          </p>
        </section>

        <section>
          <h2 id="benefits" className="text-2xl font-bold mt-8 mb-4">Benefits</h2>
          <ul className="space-y-2 list-disc list-inside text-[--muted]">
            <li>Instant ticket resolution</li>
            <li>24/7 availability</li>
            <li>Consistent answers</li>
            <li>Reduced support volume</li>
            <li>Lower costs</li>
          </ul>
        </section>

        <section>
          <h2 id="implementation" className="text-2xl font-bold mt-8 mb-4">Implementation</h2>
          
          <p className="mt-4"><strong>1. Organize Your Knowledge Base</strong></p>
          <p className="text-sm text-[--muted]">Structure docs by category: Account, Billing, Troubleshooting, etc.</p>

          <p className="mt-4"><strong>2. Upload to CosmoOps</strong></p>
          <p className="text-sm text-[--muted]">Create a store and upload all support documentation with metadata tags.</p>

          <p className="mt-4"><strong>3. Build Response Service</strong></p>
          <p className="text-sm text-[--muted]">Create an API endpoint that takes customer questions and returns AI-generated answers.</p>

          <p className="mt-4"><strong>4. Integrate with Chat Platform</strong></p>
          <p className="text-sm text-[--muted]">Connect to Slack, Discord, or your support ticketing system.</p>
        </section>

        <section>
          <h2 id="best-practices" className="text-2xl font-bold mt-8 mb-4">Best Practices</h2>
          <ul className="space-y-2 list-disc list-inside text-[--muted]">
            <li>Enable RAG evaluation for quality checks</li>
            <li>Include fallback to human support for uncertain cases</li>
            <li>Monitor and log all interactions for improvement</li>
            <li>Regularly update your knowledge base</li>
          </ul>
        </section>
      </div>
    ),
  },
  'guides/wiki-search': {
    title: 'Internal Wiki Search',
    content: (
      <div className="docs-content space-y-6">
        <h1 className="text-4xl font-bold">Internal Wiki Search</h1>

        <section>
          <h2 id="overview" className="text-2xl font-bold mt-8 mb-4">Overview</h2>
          <p>
            Build a semantic search engine for your team's internal wiki, policies, and technical documentation.
          </p>
        </section>

        <section>
          <h2 id="use-cases" className="text-2xl font-bold mt-8 mb-4">Use Cases</h2>
          <ul className="space-y-2 list-disc list-inside text-[--muted]">
            <li>Find company policies and procedures</li>
            <li>Search technical documentation</li>
            <li>Discover design systems and standards</li>
            <li>Locate decision records and RFCs</li>
          </ul>
        </section>

        <section>
          <h2 id="setup" className="text-2xl font-bold mt-8 mb-4">Setup</h2>
          
          <h3 className="text-lg font-semibold mt-6 mb-3">1. Export Your Wiki</h3>
          <p className="text-sm text-[--muted]">Export pages from Confluence, Notion, or whatever wiki system you use as markdown or PDFs.</p>

          <h3 className="text-lg font-semibold mt-6 mb-3">2. Upload to CosmoOps</h3>
          <p className="text-sm text-[--muted]">Create a store and upload all wiki pages with metadata (author, section, updated date).</p>

          <h3 className="text-lg font-semibold mt-6 mb-3">3. Build Search UI</h3>
          <p className="text-sm text-[--muted]">Create a web interface or Slack bot for semantic search.</p>

          <h3 className="text-lg font-semibold mt-6 mb-3">4. Deploy</h3>
          <p className="text-sm text-[--muted]">Deploy to your infrastructure and share with your team.</p>
        </section>
      </div>
    ),
  },
  'troubleshooting/common-issues': {
    title: 'Common Issues',
    content: (
      <div className="docs-content space-y-6">
        <h1 className="text-4xl font-bold">Common Issues</h1>

        <section>
          <h2 id="auth-401" className="text-2xl font-bold mt-8 mb-4">401 Unauthorized</h2>
          <p><strong>Cause:</strong> Invalid or missing API key</p>
          <p className="mt-2"><strong>Solution:</strong></p>
          <ul className="space-y-1 list-disc list-inside text-[--muted] mt-2">
            <li>Check your API key in Settings → API Keys</li>
            <li>Ensure it's included in the Authorization header</li>
            <li>Try creating a new API key</li>
          </ul>
        </section>

        <section>
          <h2 id="404-notfound" className="text-2xl font-bold mt-8 mb-4">404 Not Found</h2>
          <p><strong>Cause:</strong> Resource (store/document) doesn't exist</p>
          <p className="mt-2"><strong>Solution:</strong></p>
          <ul className="space-y-1 list-disc list-inside text-[--muted] mt-2">
            <li>Check the storeId/documentId spelling</li>
            <li>List all stores and documents to find the ID</li>
          </ul>
        </section>

        <section>
          <h2 id="no-results" className="text-2xl font-bold mt-8 mb-4">Query Returns No Results</h2>
          <p><strong>Cause:</strong> Documents don't match query semantically</p>
          <p className="mt-2"><strong>Solution:</strong></p>
          <ul className="space-y-1 list-disc list-inside text-[--muted] mt-2">
            <li>Try a simpler, more specific query</li>
            <li>Check that documents are uploaded to the right store</li>
            <li>Increase topK to get more results</li>
            <li>Review document metadata and content</li>
          </ul>
        </section>

        <section>
          <h2 id="slow-queries" className="text-2xl font-bold mt-8 mb-4">Slow Query Performance</h2>
          <p><strong>Cause:</strong> Large store or large document count</p>
          <p className="mt-2"><strong>Solution:</strong></p>
          <ul className="space-y-1 list-disc list-inside text-[--muted] mt-2">
            <li>Use metadata filters to narrow search scope</li>
            <li>Split large stores into smaller ones</li>
            <li>Contact support for optimization advice</li>
          </ul>
        </section>
      </div>
    ),
  },
  'troubleshooting/faq': {
    title: 'FAQ',
    content: (
      <div className="docs-content space-y-6">
        <h1 className="text-4xl font-bold">Frequently Asked Questions</h1>

        <section>
          <h2 id="general" className="text-2xl font-bold mt-8 mb-4">General</h2>

          <h3 className="text-lg font-semibold mt-6 mb-2">Q: How much does CosmoOps cost?</h3>
          <p className="text-sm text-[--muted]">A: See our pricing page. Free tier available for development.</p>

          <h3 className="text-lg font-semibold mt-6 mb-2">Q: Is there a free trial?</h3>
          <p className="text-sm text-[--muted]">A: Yes, free tier with limited usage. No credit card required.</p>

          <h3 className="text-lg font-semibold mt-6 mb-2">Q: What's your SLA?</h3>
          <p className="text-sm text-[--muted]">A: 99.9% uptime SLA for production plans.</p>
        </section>

        <section>
          <h2 id="technical" className="text-2xl font-bold mt-8 mb-4">Technical</h2>

          <h3 className="text-lg font-semibold mt-6 mb-2">Q: What embeddings model do you use?</h3>
          <p className="text-sm text-[--muted]">A: Google Vertex AI embeddings for high quality semantic understanding.</p>

          <h3 className="text-lg font-semibold mt-6 mb-2">Q: Can I use custom embeddings?</h3>
          <p className="text-sm text-[--muted]">A: Coming soon. Contact support for early access.</p>

          <h3 className="text-lg font-semibold mt-6 mb-2">Q: What's the max document size?</h3>
          <p className="text-sm text-[--muted]">A: 20 MB per document.</p>

          <h3 className="text-lg font-semibold mt-6 mb-2">Q: How fast is search?</h3>
          <p className="text-sm text-[--muted]">A: Typically &lt;500ms for stores with &lt;1M documents.</p>
        </section>

        <section>
          <h2 id="security" className="text-2xl font-bold mt-8 mb-4">Security</h2>

          <h3 className="text-lg font-semibold mt-6 mb-2">Q: Is data encrypted?</h3>
          <p className="text-sm text-[--muted]">A: Yes, at rest and in transit (TLS 1.3).</p>

          <h3 className="text-lg font-semibold mt-6 mb-2">Q: Is data shared across organizations?</h3>
          <p className="text-sm text-[--muted]">A: No, complete isolation. Your data is only yours.</p>

          <h3 className="text-lg font-semibold mt-6 mb-2">Q: Do you retain documents?</h3>
          <p className="text-sm text-[--muted]">A: We only store what you upload. Delete anytime.</p>
        </section>
      </div>
    ),
  },
}


export default function DocsPage({ params }: Readonly<DocPageProps>) {
  const slug = params.slug?.join('/') || ''
  const docData = docContent[slug]

  if (!docData) {
    notFound()
  }

  return (
    <>
      <DocsBreadcrumb />
      {docData.content}
      
      {/* Prev/Next Navigation */}
      <div className="mt-12 pt-6 border-t border-[--border] flex justify-between">
        <div />
        <div className="text-right">
          <p className="text-sm text-[--muted]">Next</p>
          <Link href="/docs/getting-started/authentication" className="font-medium text-[--accent] hover:underline">
            Authentication →
          </Link>
        </div>
      </div>
    </>
  )
}
