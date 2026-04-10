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
        <div className="flex flex-col items-center gap-4 max-w-2xl">
          <span className="text-xs font-semibold tracking-widest uppercase text-[--accent] border border-[--accent]/30 bg-[--accent]/5 rounded-full px-4 py-1">
            API Key Management &amp; Observability
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight text-[--foreground]">
            Ship APIs your customers<br className="hidden sm:block" /> can actually use
          </h1>
          <p className="text-lg text-[--muted] max-w-lg leading-relaxed">
            CosmoOps gives your team magic-link auth, scoped API keys, and a live dashboard — all in one place. No passwords. No friction.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Link
            href="/login"
            className="px-6 py-3 rounded-xl bg-[--accent] text-[--accent-foreground] font-semibold text-sm hover:opacity-90 transition-opacity shadow-sm"
          >
            Get started free
          </Link>
          <a
            href="#features"
            className="px-6 py-3 rounded-xl border border-[--border] text-[--foreground] font-medium text-sm hover:bg-[--default] transition-colors"
          >
            See how it works
          </a>
        </div>
      </main>

      {/* Features */}
      <section id="features" className="border-t border-[--border] bg-[--surface]">
        <div className="max-w-5xl mx-auto px-6 py-20 grid sm:grid-cols-3 gap-8">
          {[
            {
              icon: '✉️',
              title: 'Magic link auth',
              desc: 'Passwordless sign-in via email. One click and you\'re in — secure, fast, and frictionless.',
            },
            {
              icon: '🔑',
              title: 'Scoped API keys',
              desc: 'Create, name, and revoke keys per organization. Each key is masked after creation for security.',
            },
            {
              icon: '📊',
              title: 'Live dashboard',
              desc: 'Track API usage and error rates over rolling 30-day windows with per-day bar charts.',
            },
          ].map(f => (
            <div key={f.title} className="flex flex-col gap-3 p-6 rounded-2xl border border-[--border] bg-[--overlay]">
              <span className="text-3xl">{f.icon}</span>
              <h3 className="font-semibold text-base text-[--foreground]">{f.title}</h3>
              <p className="text-sm text-[--muted] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[--border] py-6 text-center text-xs text-[--muted]">
        © 2025 CosmoOps. All rights reserved.
      </footer>
    </div>
  )
}
