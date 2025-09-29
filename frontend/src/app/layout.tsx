import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'AI Meeting Summarizer',
  description: 'Upload, search, and summarize your meetings with AI.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[--color-bg-dark] text-[--color-text-dark]">
        <header className="w-full bg-[--color-bg-dark] shadow-md border-b border-[--color-border]">
          <nav className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
            <Link href="/" className="text-2xl font-extrabold text-[--color-text-dark] tracking-tight">
              AI Meeting Summarizer
            </Link>
            <div className="flex items-center space-x-6">
              <Link href="/" className="text-[--color-text-dark] hover:text-[--color-accent] font-semibold transition-colors">Home</Link>
              <Link href="/results/test-job" className="text-[--color-text-dark] hover:text-[--color-accent] font-semibold transition-colors">Sample Results</Link>
            </div>
          </nav>
        </header>
        <main className="flex-1 flex flex-col items-center justify-center px-4">
          {children}
        </main>
        <footer className="w-full bg-[--color-bg-dark] border-t border-[--color-border] mt-16 py-4 text-center text-[--color-secondary] text-sm">
          &copy; {new Date().getFullYear()} AI Meeting Summarizer. All rights reserved.
        </footer>
      </body>
    </html>
  );
}
