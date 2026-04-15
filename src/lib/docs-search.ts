import { docsNavigation, flattenNav } from '@/lib/docs-nav'

export interface SearchResult {
  href: string
  title: string
  excerpt: string
  score: number
}

// Extract all searchable content from docs
const buildSearchIndex = () => {
  const allDocs = flattenNav()
  const index: Record<string, { title: string; content: string }> = {}

  // Map of slug to title and description
  const docMetadata: Record<string, string> = {
    'introduction/what-is-cosmoops':
      'CosmoOps is a production-ready Retrieval-Augmented Generation platform for AI agents',
    'introduction/key-concepts': 'Understand stores, documents, embeddings, and vector search',
    'introduction/why-cosmoops': 'Speed to market, cost effective, production ready',
    'getting-started/installation': 'No installation required, get started in 3 steps',
    'getting-started/first-api-call': 'Make your first API call with curl',
    'getting-started/authentication': 'API keys and authentication',
    'getting-started/api-keys': 'Create, rotate, and manage API keys',
    'core-concepts/stores': 'What is a store, creating stores, multiple stores',
    'core-concepts/documents': 'Upload documents, metadata, size limits',
    'core-concepts/embeddings': 'Automatic embedding generation',
    'core-concepts/vector-search': 'How semantic search works, benefits',
    'api/query': 'Query endpoint for searching documents',
    'api/upload': 'Upload documents to a store',
    'api/list': 'List documents with pagination',
    'api/delete': 'Delete documents from a store',
    'api/errors': 'Error codes and handling',
    'guides/qa-bot': 'Build a Q&A bot tutorial',
    'guides/support-agent': 'Customer support agent guide',
    'guides/wiki-search': 'Internal wiki search setup',
    'troubleshooting/common-issues': '401 errors, 404 not found, no results',
    'troubleshooting/faq': 'Frequently asked questions',
  }

  for (const [slug, description] of Object.entries(docMetadata)) {
    const doc = allDocs.find(d => d.href.endsWith(slug))
    if (doc) {
      index[slug] = {
        title: doc.label,
        content: description,
      }
    }
  }

  return index
}

export const searchIndex = buildSearchIndex()

export function search(query: string, limit = 5): SearchResult[] {
  if (!query || query.length < 2) return []

  const lowerQuery = query.toLowerCase()
  const results: SearchResult[] = []

  for (const [slug, { title, content }] of Object.entries(searchIndex)) {
    let score = 0
    const fullText = (title + ' ' + content).toLowerCase()

    // Exact match in title (highest priority)
    if (title.toLowerCase() === lowerQuery) {
      score = 1000
    }
    // Title contains query
    else if (title.toLowerCase().includes(lowerQuery)) {
      score = 500
    }
    // Content contains query
    else if (fullText.includes(lowerQuery)) {
      score = 100
    }

    // Word boundary matching for partial matches
    const words = lowerQuery.split(' ')
    for (const word of words) {
      if (word.length > 2) {
        if (title.toLowerCase().includes(word)) score += 50
        if (content.toLowerCase().includes(word)) score += 25
      }
    }

    if (score > 0) {
      results.push({
        href: `/docs/${slug}`,
        title,
        excerpt: content.substring(0, 100),
        score,
      })
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit)
}
