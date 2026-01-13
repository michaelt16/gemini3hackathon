import Link from 'next/link';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation Header */}
      <header className="border-b border-[var(--accent)] border-opacity-10 bg-[var(--paper)] bg-opacity-80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link 
            href="/" 
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <span className="text-xl">📖</span>
            <span 
              className="text-lg font-semibold text-[var(--accent)]"
              style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
            >
              Living Memory
            </span>
          </Link>
          
          <nav className="flex items-center gap-1">
            <Link 
              href="/capture"
              className="px-4 py-2 text-sm text-[var(--foreground)] hover:text-[var(--accent)] hover:bg-[var(--accent)] hover:bg-opacity-5 rounded-lg transition-colors"
            >
              📸 Capture
            </Link>
            <Link 
              href="/album"
              className="px-4 py-2 text-sm text-[var(--foreground)] hover:text-[var(--accent)] hover:bg-[var(--accent)] hover:bg-opacity-5 rounded-lg transition-colors"
            >
              🎞️ Album
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
