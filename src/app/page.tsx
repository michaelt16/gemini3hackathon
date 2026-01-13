import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-[var(--accent)] blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-[var(--accent-light)] blur-3xl" />
        </div>
        
        <div className="relative z-10 text-center max-w-3xl mx-auto">
          {/* Logo/Title */}
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-light)] mb-6 shadow-lg">
              <span className="text-4xl">📖</span>
            </div>
            <h1 
              className="text-5xl md:text-6xl font-semibold text-[var(--accent)] mb-4"
              style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
            >
              Living Memory
            </h1>
            <p className="text-xl text-[var(--foreground)] opacity-70 max-w-xl mx-auto leading-relaxed">
              Preserve family stories across generations. Collect memories, weave narratives, 
              and create living photo albums that tell your family&apos;s story.
            </p>
          </div>

          {/* Mode Selection */}
          <div className="grid md:grid-cols-2 gap-6 mt-12 max-w-2xl mx-auto">
            {/* Capture Mode */}
            <Link 
              href="/capture"
              className="group paper-texture p-8 rounded-2xl border-2 border-transparent hover:border-[var(--accent)] transition-all duration-300 hover:shadow-xl"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform">
                <span className="text-3xl">📸</span>
              </div>
              <h2 className="text-2xl font-semibold text-[var(--accent)] mb-2" style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}>
                Capture
              </h2>
              <p className="text-[var(--foreground)] opacity-60 text-sm leading-relaxed">
                Share stories about your photos through natural conversation. 
                Point your camera at old albums and talk about the memories.
              </p>
              <div className="mt-4 text-xs text-[var(--accent)] opacity-70">
                Mobile-friendly • Voice & Camera
              </div>
            </Link>

            {/* Album Mode */}
            <Link 
              href="/album"
              className="group paper-texture p-8 rounded-2xl border-2 border-transparent hover:border-[var(--accent)] transition-all duration-300 hover:shadow-xl"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform">
                <span className="text-3xl">🎞️</span>
              </div>
              <h2 className="text-2xl font-semibold text-[var(--accent)] mb-2" style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}>
                Album
              </h2>
              <p className="text-[var(--foreground)] opacity-60 text-sm leading-relaxed">
                Browse your family events, explore timelines, see who contributed what, 
                and watch generated recap videos.
              </p>
              <div className="mt-4 text-xs text-[var(--accent)] opacity-70">
                Desktop-friendly • Browse & Review
              </div>
            </Link>
          </div>

          {/* Playground Link */}
          <div className="mt-12 pt-8 border-t border-[var(--accent)] border-opacity-20">
            <Link 
              href="/playground"
              className="inline-flex items-center gap-2 text-sm text-[var(--foreground)] opacity-50 hover:opacity-100 transition-opacity"
            >
              <span>🧪</span>
              <span>API Playground</span>
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Dev</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="p-6 text-center text-sm text-[var(--foreground)] opacity-40 border-t border-[var(--accent)] border-opacity-10">
        <p>Built for Gemini 3 Hackathon • Preserving memories with AI</p>
      </footer>
    </main>
  );
}
