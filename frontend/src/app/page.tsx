'use client';
import Upload from '../components/Upload';
import Search from '../components/Search';

export default function HomePage() {
  return (
    <section className="w-full min-h-screen flex flex-col items-center justify-center py-16 px-4">
      <div className="max-w-3xl w-full mx-auto space-y-16">
        <div className="text-center space-y-4">
          <h1 className="text-5xl md:text-7xl font-extrabold text-[--color-card] mb-4 drop-shadow-lg">
            AI Meeting Summarizer
          </h1>
          <p className="max-w-2xl mx-auto text-xl text-[--color-secondary] font-medium mb-8">
            Upload your meeting media and slides for instant AI summaries, smart transcripts, and searchable content.
          </p>
        </div>
        <div className="flex flex-col items-center space-y-12">
          <Upload />
          <Search />
        </div>
      </div>
    </section>
  );
}
