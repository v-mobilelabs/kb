export interface DocItem {
  label: string
  href: string
  children?: DocItem[]
}

export const docsNavigation: DocItem[] = [
  {
    label: 'Introduction',
    href: '/docs',
    children: [
      { label: 'What is CosmoOps?', href: '/docs/introduction/what-is-cosmoops' },
      { label: 'Key Concepts', href: '/docs/introduction/key-concepts' },
      { label: 'Why Choose CosmoOps?', href: '/docs/introduction/why-cosmoops' },
    ],
  },
  {
    label: 'Getting Started',
    href: '/docs/getting-started',
    children: [
      { label: 'Installation', href: '/docs/getting-started/installation' },
      { label: 'First API Call', href: '/docs/getting-started/first-api-call' },
      { label: 'Authentication', href: '/docs/getting-started/authentication' },
      { label: 'API Keys', href: '/docs/getting-started/api-keys' },
    ],
  },
  {
    label: 'Core Concepts',
    href: '/docs/core-concepts',
    children: [
      { label: 'Stores', href: '/docs/core-concepts/stores' },
      { label: 'Documents', href: '/docs/core-concepts/documents' },
      { label: 'Embeddings', href: '/docs/core-concepts/embeddings' },
      { label: 'Vector Search', href: '/docs/core-concepts/vector-search' },
      { label: 'Semantic Ranking', href: '/docs/core-concepts/semantic-ranking' },
    ],
  },
  {
    label: 'API Reference',
    href: '/docs/api',
    children: [
      { label: 'Query Endpoint', href: '/docs/api/query' },
      { label: 'Upload Document', href: '/docs/api/upload' },
      { label: 'List Documents', href: '/docs/api/list' },
      { label: 'Delete Document', href: '/docs/api/delete' },
      { label: 'Error Handling', href: '/docs/api/errors' },
    ],
  },
  {
    label: 'Guides & Examples',
    href: '/docs/guides',
    children: [
      { label: 'Build a Q&A Bot', href: '/docs/guides/qa-bot' },
      { label: 'Customer Support Agent', href: '/docs/guides/support-agent' },
      { label: 'Internal Wiki Search', href: '/docs/guides/wiki-search' },
      { label: 'Integration Examples', href: '/docs/guides/integrations' },
    ],
  },
  {
    label: 'Advanced',
    href: '/docs/advanced',
    children: [
      { label: 'Custom Embeddings', href: '/docs/advanced/custom-embeddings' },
      { label: 'Batch Processing', href: '/docs/advanced/batch-processing' },
      { label: 'Multi-tenancy', href: '/docs/advanced/multi-tenancy' },
      { label: 'Performance Tuning', href: '/docs/advanced/performance' },
    ],
  },
  {
    label: 'Troubleshooting',
    href: '/docs/troubleshooting',
    children: [
      { label: 'Common Issues', href: '/docs/troubleshooting/common-issues' },
      { label: 'FAQ', href: '/docs/troubleshooting/faq' },
      { label: 'Support', href: '/docs/troubleshooting/support' },
    ],
  },
]

export function flattenNav(items: DocItem[] = docsNavigation): DocItem[] {
  return items.reduce((acc: DocItem[], item) => {
    acc.push(item)
    if (item.children) {
      acc.push(...item.children)
    }
    return acc
  }, [])
}
