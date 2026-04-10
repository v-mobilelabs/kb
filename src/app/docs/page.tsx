import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'API Documentation — CosmoOps',
    description:
        'CosmoOps Knowledge Base API reference — authentication, stores, documents, and RAG queries.',
}

const BASE = 'https://kb.cosmoops.com' // TODO: update with real base URL when deployed

// ── Curl snippets (built with arrays to avoid backslash lint errors) ─────────

const CURL_AUTH_BEARER = [
    '# Option A — Authorization header (recommended)',
    `curl ${BASE}/api/v1/store \\`,
    '  -H "Authorization: Bearer cmo_YOUR_API_KEY"',
].join('\n')

const CURL_AUTH_XAPI = [
    '# Option B — X-API-Key header',
    `curl ${BASE}/api/v1/store \\`,
    '  -H "X-API-Key: cmo_YOUR_API_KEY"',
].join('\n')

const CURL_CREATE_STORE = [
    `curl -X POST ${BASE}/api/v1/store \\`,
    '  -H "Authorization: Bearer cmo_YOUR_API_KEY" \\',
    '  -H "Content-Type: application/json" \\',
    "  -d '{",
    '    "name": "Product Docs",',
    '    "description": "Public product documentation",',
    '    "source": {',
    '      "id": "product-docs",',
    '      "collection": "documentation"',
    '    }',
    "  }'",
].join('\n')

const CURL_UPDATE_STORE = [
    `curl -X PUT ${BASE}/api/v1/store/abc123 \\`,
    '  -H "Authorization: Bearer cmo_YOUR_API_KEY" \\',
    '  -H "Content-Type: application/json" \\',
    "  -d '{",
    '    "name": "Product Docs v2",',
    '    "description": "Updated documentation store"',
    "  }'",
].join('\n')

const CURL_DELETE_STORE = [
    `curl -X DELETE ${BASE}/api/v1/store/abc123 \\`,
    '  -H "Authorization: Bearer cmo_YOUR_API_KEY"',
].join('\n')

const CURL_QUERY_EVAL = [
    `curl -X POST ${BASE}/api/v1/query \\`,
    '  -H "Authorization: Bearer cmo_YOUR_API_KEY" \\',
    '  -H "Content-Type: application/json" \\',
    "  -d '{",
    '    "storeId": "abc123",',
    '    "query": "How do I configure SSO?",',
    '    "topK": 5,',
    '    "enableRagEvaluation": true',
    "  }'",
].join('\n')

const CURL_QUERY_SIMPLE = [
    `curl -X POST ${BASE}/api/v1/query \\`,
    '  -H "Authorization: Bearer cmo_YOUR_API_KEY" \\',
    '  -H "Content-Type: application/json" \\',
    "  -d '{",
    '    "storeId": "abc123",',
    '    "query": "deployment checklist"',
    "  }'",
].join('\n')

// ── Helper components ────────────────────────────────────────────────────────

function Pre({ children }: Readonly<{ children: string }>) {
    return (
        <pre className="overflow-x-auto rounded-lg bg-zinc-950 p-4 text-sm leading-relaxed text-zinc-200 dark:bg-zinc-900">
            <code>{children}</code>
        </pre>
    )
}

function Endpoint({
    method,
    path,
}: Readonly<{ method: string; path: string }>) {
    const colors: Record<string, string> = {
        GET: 'bg-emerald-600',
        POST: 'bg-blue-600',
        PUT: 'bg-amber-600',
        DELETE: 'bg-red-600',
    }
    return (
        <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-800">
            <span
                className={`${colors[method] ?? 'bg-zinc-600'} rounded px-2 py-0.5 text-xs font-bold text-white`}
            >
                {method}
            </span>
            <span>{path}</span>
        </div>
    )
}

function Param({
    name,
    type,
    required,
    children,
}: Readonly<{
    name: string
    type: string
    required?: boolean
    children: React.ReactNode
}>) {
    return (
        <tr className="border-b border-zinc-200 dark:border-zinc-700">
            <td className="py-2 pr-4 font-mono text-sm">{name}</td>
            <td className="py-2 pr-4 text-sm text-zinc-500 dark:text-zinc-400">
                {type}
            </td>
            <td className="py-2 pr-4 text-sm">
                {required ? (
                    <span className="text-red-500">required</span>
                ) : (
                    <span className="text-zinc-400">optional</span>
                )}
            </td>
            <td className="py-2 text-sm text-zinc-600 dark:text-zinc-300">
                {children}
            </td>
        </tr>
    )
}

function ParamTable({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left">
                <thead>
                    <tr className="border-b border-zinc-300 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-600">
                        <th className="py-2 pr-4">Name</th>
                        <th className="py-2 pr-4">Type</th>
                        <th className="py-2 pr-4">Required</th>
                        <th className="py-2">Description</th>
                    </tr>
                </thead>
                <tbody>{children}</tbody>
            </table>
        </div>
    )
}

function Ic({ children }: Readonly<{ children: string }>) {
    return (
        <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
            {children}
        </code>
    )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DocsPage() {
    return (
        <div className="mx-auto max-w-3xl px-6 py-16">
            {/* Header */}
            <h1 className="text-3xl font-bold tracking-tight">
                CosmoOps KB — API Reference
            </h1>
            <p className="mt-3 text-zinc-600 dark:text-zinc-400">
                The CosmoOps Knowledge Base API lets you create stores, ingest
                documents, and query them using RAG (Retrieval-Augmented Generation).
            </p>
            <p className="mt-2 text-sm text-zinc-500">
                Base URL: <Ic>{BASE}</Ic>
            </p>

            {/* Table of contents */}
            <nav className="mt-8 rounded-lg border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-700 dark:bg-zinc-800/50">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                    Contents
                </h2>
                <ol className="mt-3 list-inside list-decimal space-y-1 text-sm">
                    <li>
                        <a href="#authentication" className="text-blue-600 hover:underline dark:text-blue-400">
                            Authentication
                        </a>
                    </li>
                    <li>
                        <a href="#api-keys" className="text-blue-600 hover:underline dark:text-blue-400">
                            Creating API Keys
                        </a>
                    </li>
                    <li>
                        <a href="#health" className="text-blue-600 hover:underline dark:text-blue-400">
                            Health Check
                        </a>
                    </li>
                    <li>
                        <a href="#create-store" className="text-blue-600 hover:underline dark:text-blue-400">
                            Create a Store
                        </a>
                    </li>
                    <li>
                        <a href="#update-store" className="text-blue-600 hover:underline dark:text-blue-400">
                            Update a Store
                        </a>
                    </li>
                    <li>
                        <a href="#delete-store" className="text-blue-600 hover:underline dark:text-blue-400">
                            Delete a Store
                        </a>
                    </li>
                    <li>
                        <a href="#rag" className="text-blue-600 hover:underline dark:text-blue-400">
                            How RAG Works
                        </a>
                    </li>
                    <li>
                        <a href="#query" className="text-blue-600 hover:underline dark:text-blue-400">
                            Query (RAG Search)
                        </a>
                    </li>
                    <li>
                        <a href="#errors" className="text-blue-600 hover:underline dark:text-blue-400">
                            Error Reference
                        </a>
                    </li>
                </ol>
            </nav>

            {/* ── 1. Authentication ─────────────────────────────────────────── */}
            <section id="authentication" className="mt-14">
                <h2 className="text-2xl font-semibold">1. Authentication</h2>
                <p className="mt-3 text-zinc-600 dark:text-zinc-400">
                    All API endpoints (except the health check) require a valid API key.
                    Pass it via one of two headers:
                </p>
                <div className="mt-4 space-y-3">
                    <Pre>{CURL_AUTH_BEARER}</Pre>
                    <Pre>{CURL_AUTH_XAPI}</Pre>
                </div>
                <p className="mt-4 text-sm text-zinc-500">
                    If the key is missing, expired, or revoked the API returns{' '}
                    <Ic>401</Ic>.
                </p>
            </section>

            {/* ── 2. API Keys ───────────────────────────────────────────────── */}
            <section id="api-keys" className="mt-14">
                <h2 className="text-2xl font-semibold">2. Creating API Keys</h2>
                <p className="mt-3 text-zinc-600 dark:text-zinc-400">
                    API keys are managed from the CosmoOps dashboard — there is no API
                    endpoint to create them programmatically.
                </p>
                <ol className="mt-4 list-inside list-decimal space-y-2 text-zinc-600 dark:text-zinc-400">
                    <li>
                        Sign in to the <strong>CosmoOps dashboard</strong>.
                    </li>
                    <li>
                        Navigate to <strong>Settings &rarr; API Keys</strong>.
                    </li>
                    <li>
                        Click <strong>&quot;Create API Key&quot;</strong> and enter a
                        descriptive name.
                    </li>
                    <li>
                        Copy the key immediately — it is shown <strong>only once</strong>.
                    </li>
                </ol>
                <p className="mt-4 text-sm text-zinc-500">
                    Keys use the format <Ic>{'cmo_<32 random chars>'}</Ic>. You can
                    revoke keys at any time from the same settings page.
                </p>
            </section>

            {/* ── 3. Health ─────────────────────────────────────────────────── */}
            <section id="health" className="mt-14">
                <h2 className="text-2xl font-semibold">3. Health Check</h2>
                <Endpoint method="GET" path="/api/v1/health" />
                <p className="mt-3 text-zinc-600 dark:text-zinc-400">
                    Returns the API status. No authentication required.
                </p>
                <Pre>{`curl ${BASE}/api/v1/health`}</Pre>
                <p className="mt-2 text-sm font-medium text-zinc-500">Response:</p>
                <Pre>{'{ "status": "ok" }'}</Pre>
            </section>

            {/* ── 4. Create Store ───────────────────────────────────────────── */}
            <section id="create-store" className="mt-14">
                <h2 className="text-2xl font-semibold">4. Create a Store</h2>
                <Endpoint method="POST" path="/api/v1/store" />
                <p className="mt-3 text-zinc-600 dark:text-zinc-400">
                    Creates a new knowledge store to hold documents. Each store is scoped
                    to your organization.
                </p>

                <h3 className="mt-6 text-lg font-medium">Request Body</h3>
                <ParamTable>
                    <Param name="name" type="string" required>
                        Display name for the store.
                    </Param>
                    <Param name="description" type="string">
                        Optional description.
                    </Param>
                    <Param name="source.id" type="string" required>
                        External source identifier.
                    </Param>
                    <Param name="source.collection" type="string" required>
                        Source collection name.
                    </Param>
                </ParamTable>

                <h3 className="mt-6 text-lg font-medium">Example</h3>
                <Pre>{CURL_CREATE_STORE}</Pre>

                <p className="mt-3 text-sm font-medium text-zinc-500">
                    Response <Ic>201</Ic>:
                </p>
                <Pre>
                    {JSON.stringify(
                        {
                            store: {
                                id: 'abc123',
                                orgId: 'org_xyz',
                                name: 'Product Docs',
                                description: 'Public product documentation',
                                source: { id: 'product-docs', collection: 'documentation' },
                                documentCount: 0,
                                customCount: 0,
                                createdBy: 'api:key_id',
                                createdAt: '...',
                                updatedAt: '...',
                            },
                        },
                        null,
                        2,
                    )}
                </Pre>
            </section>

            {/* ── 5. Update Store ───────────────────────────────────────────── */}
            <section id="update-store" className="mt-14">
                <h2 className="text-2xl font-semibold">5. Update a Store</h2>
                <Endpoint method="PUT" path="/api/v1/store/:storeId" />
                <p className="mt-3 text-zinc-600 dark:text-zinc-400">
                    Updates an existing store. Only the fields you include in the request
                    body will be changed.
                </p>

                <h3 className="mt-6 text-lg font-medium">URL Parameters</h3>
                <ParamTable>
                    <Param name="storeId" type="string" required>
                        The ID of the store to update.
                    </Param>
                </ParamTable>

                <h3 className="mt-6 text-lg font-medium">Request Body</h3>
                <ParamTable>
                    <Param name="name" type="string">
                        New display name.
                    </Param>
                    <Param name="description" type="string | null">
                        New description (send <Ic>null</Ic> to clear).
                    </Param>
                    <Param name="source" type="object">
                        Updated source (<Ic>id</Ic> and <Ic>collection</Ic>).
                    </Param>
                </ParamTable>

                <h3 className="mt-6 text-lg font-medium">Example</h3>
                <Pre>{CURL_UPDATE_STORE}</Pre>

                <p className="mt-3 text-sm font-medium text-zinc-500">
                    Response <Ic>200</Ic>:
                </p>
                <Pre>
                    {JSON.stringify(
                        {
                            store: {
                                id: 'abc123',
                                name: 'Product Docs v2',
                                description: 'Updated documentation store',
                                '...': '...',
                            },
                        },
                        null,
                        2,
                    )}
                </Pre>
            </section>

            {/* ── 6. Delete Store ───────────────────────────────────────────── */}
            <section id="delete-store" className="mt-14">
                <h2 className="text-2xl font-semibold">6. Delete a Store</h2>
                <Endpoint method="DELETE" path="/api/v1/store/:storeId" />
                <p className="mt-3 text-zinc-600 dark:text-zinc-400">
                    Permanently deletes a store and all its documents. This operation is
                    idempotent — deleting an already-deleted store returns success.
                </p>

                <h3 className="mt-6 text-lg font-medium">Example</h3>
                <Pre>{CURL_DELETE_STORE}</Pre>

                <p className="mt-3 text-sm font-medium text-zinc-500">
                    Response <Ic>200</Ic>:
                </p>
                <Pre>{'{ "deleted": true }'}</Pre>
            </section>

            {/* ── 7. How RAG Works ──────────────────────────────────────────── */}
            <section id="rag" className="mt-14">
                <h2 className="text-2xl font-semibold">7. How RAG Works</h2>
                <p className="mt-3 text-zinc-600 dark:text-zinc-400">
                    CosmoOps uses a{' '}
                    <strong>Retrieval-Augmented Generation (RAG)</strong> pipeline to
                    answer queries against your knowledge stores. Here is what happens
                    when you call the query endpoint:
                </p>
                <ol className="mt-4 list-inside list-decimal space-y-3 text-zinc-600 dark:text-zinc-400">
                    <li>
                        <strong>Embedding</strong> — Your query text is converted into a
                        vector embedding using Vertex AI.
                    </li>
                    <li>
                        <strong>Retrieval</strong> — The embedding is used to perform a
                        similarity search against document embeddings stored in Firestore,
                        returning up to <Ic>topK</Ic> results.
                    </li>
                    <li>
                        <strong>LLM Judgment</strong>{' '}
                        <span className="text-xs text-zinc-400">(optional)</span> — When{' '}
                        <Ic>enableRagEvaluation</Ic> is turned on, an LLM judge evaluates
                        whether the retrieved documents actually answer the query. It
                        produces a relevance flag, confidence score, reasoning, and a
                        synthesised answer.
                    </li>
                    <li>
                        <strong>Response</strong> — The API returns the matched sources,
                        answer text, and optional judgment metadata.
                    </li>
                </ol>
                <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
                    <strong>Tip:</strong> Enable RAG evaluation for quality-critical
                    queries. Disable it for low-latency use cases where you only need the
                    raw retrieved documents.
                </div>
            </section>

            {/* ── 8. Query ──────────────────────────────────────────────────── */}
            <section id="query" className="mt-14">
                <h2 className="text-2xl font-semibold">8. Query (RAG Search)</h2>
                <Endpoint method="POST" path="/api/v1/query" />
                <p className="mt-3 text-zinc-600 dark:text-zinc-400">
                    Performs a RAG query against a store and returns relevant documents
                    with an AI-generated answer.
                </p>

                <h3 className="mt-6 text-lg font-medium">Request Body</h3>
                <ParamTable>
                    <Param name="storeId" type="string" required>
                        The store to query.
                    </Param>
                    <Param name="query" type="string" required>
                        Natural language query.
                    </Param>
                    <Param name="filters" type="Record<string, string>">
                        Key-value metadata filters for narrowing results.
                    </Param>
                    <Param name="topK" type="number">
                        Max documents to retrieve (1–50). Default: <Ic>10</Ic>.
                    </Param>
                    <Param name="enableRagEvaluation" type="boolean">
                        Run LLM quality judgment. Default: <Ic>false</Ic>.
                    </Param>
                </ParamTable>

                <h3 className="mt-6 text-lg font-medium">Example</h3>
                <Pre>{CURL_QUERY_EVAL}</Pre>

                <p className="mt-3 text-sm font-medium text-zinc-500">
                    Response <Ic>200</Ic>:
                </p>
                <Pre>
                    {JSON.stringify(
                        {
                            answer:
                                'To configure SSO, navigate to Settings \u2192 Identity ...',
                            sources: [
                                {
                                    id: 'doc_456',
                                    summary:
                                        'SSO configuration guide for enterprise accounts',
                                    score: 0.92,
                                    updatedAt: '2026-04-01T12:00:00Z',
                                },
                            ],
                            retrievedCount: 3,
                            judgment: {
                                relevant: true,
                                confidence: 0.95,
                                reasoning: 'Documents contain a direct SSO setup guide.',
                                answer:
                                    'To configure SSO, navigate to Settings \u2192 Identity ...',
                            },
                        },
                        null,
                        2,
                    )}
                </Pre>

                <h3 className="mt-6 text-lg font-medium">
                    Example Without RAG Evaluation
                </h3>
                <Pre>{CURL_QUERY_SIMPLE}</Pre>

                <p className="mt-3 text-sm font-medium text-zinc-500">
                    Response <Ic>200</Ic>:
                </p>
                <Pre>
                    {JSON.stringify(
                        {
                            answer: 'Retrieved 2 relevant documents.',
                            sources: [
                                {
                                    id: 'doc_789',
                                    summary:
                                        'Pre-deployment checklist for production releases',
                                    score: 0.87,
                                },
                                {
                                    id: 'doc_012',
                                    summary: 'Infrastructure readiness template',
                                    score: 0.71,
                                },
                            ],
                            retrievedCount: 2,
                        },
                        null,
                        2,
                    )}
                </Pre>
            </section>

            {/* ── 9. Error Reference ────────────────────────────────────────── */}
            <section id="errors" className="mt-14">
                <h2 className="text-2xl font-semibold">9. Error Reference</h2>
                <p className="mt-3 text-zinc-600 dark:text-zinc-400">
                    All errors return a JSON body with an <Ic>error</Ic> field and
                    optional <Ic>details</Ic>.
                </p>
                <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-zinc-300 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-600">
                                <th className="py-2 pr-4">Status</th>
                                <th className="py-2 pr-4">Error Code</th>
                                <th className="py-2">Meaning</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                            <tr>
                                <td className="py-2 pr-4 font-mono">400</td>
                                <td className="py-2 pr-4 font-mono">
                                    Invalid request parameters
                                </td>
                                <td className="py-2">
                                    Validation failed — check the <Ic>details</Ic> array.
                                </td>
                            </tr>
                            <tr>
                                <td className="py-2 pr-4 font-mono">401</td>
                                <td className="py-2 pr-4 font-mono">MISSING_API_KEY</td>
                                <td className="py-2">
                                    No API key was provided in the request headers.
                                </td>
                            </tr>
                            <tr>
                                <td className="py-2 pr-4 font-mono">401</td>
                                <td className="py-2 pr-4 font-mono">INVALID_API_KEY</td>
                                <td className="py-2">
                                    The API key is invalid or has been revoked.
                                </td>
                            </tr>
                            <tr>
                                <td className="py-2 pr-4 font-mono">403</td>
                                <td className="py-2 pr-4 font-mono">Forbidden</td>
                                <td className="py-2">
                                    The API key does not have access to this resource.
                                </td>
                            </tr>
                            <tr>
                                <td className="py-2 pr-4 font-mono">404</td>
                                <td className="py-2 pr-4 font-mono">Store not found</td>
                                <td className="py-2">The specified store does not exist.</td>
                            </tr>
                            <tr>
                                <td className="py-2 pr-4 font-mono">500</td>
                                <td className="py-2 pr-4 font-mono">QUERY_ERROR</td>
                                <td className="py-2">
                                    An internal error occurred during the RAG query flow.
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <h3 className="mt-6 text-lg font-medium">Error Response Shape</h3>
                <Pre>
                    {JSON.stringify(
                        {
                            error: 'Invalid request parameters',
                            details: [
                                {
                                    code: 'too_small',
                                    minimum: 1,
                                    type: 'string',
                                    inclusive: true,
                                    exact: false,
                                    message: 'storeId is required',
                                    path: ['storeId'],
                                },
                            ],
                        },
                        null,
                        2,
                    )}
                </Pre>
            </section>

            {/* Footer */}
            <footer className="mt-20 border-t border-zinc-200 pt-6 text-center text-sm text-zinc-400 dark:border-zinc-700">
                CosmoOps Knowledge Base API &mdash; v1
            </footer>
        </div>
    )
}
