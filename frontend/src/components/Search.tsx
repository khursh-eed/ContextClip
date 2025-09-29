'use client';
import { useState } from 'react';
import Link from 'next/link';
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Chip,
  Divider,
  Code
} from '@heroui/react';
import { Search as SearchIcon, FileText, Clock, User, ExternalLink } from 'lucide-react';

// Palette
const CARD = '#F2F1EF';
const TEXT_LIGHT = '#413F3D';
const ACCENT = '#697184';
const SECONDARY = '#B1A6A4';
const BORDER = '#D8CFD0';

interface SearchResult {
  job_id: string;
  relevance_score: number;
  matched_segments: Array<{
    start_time: number;
    end_time: number;
    speaker: string;
    text: string;
    highlight: string;
  }>;
  matched_slides: Array<{
    slide_number: number;
    text: string;
    highlight: string;
  }>;
  job_info: {
    status: string;
    created_at?: string;
    meeting_duration?: number;
  };
}

interface SearchResponse {
  query: string;
  total_results: number;
  results: SearchResult[];
}

const Search = () => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setHasSearched(true);
    try {
      const response = await fetch(`http://localhost:8000/search?q=${encodeURIComponent(query.trim())}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
      } else {
        setSearchResults({ query: query.trim(), total_results: 0, results: [] });
      }
    } catch (error) {
      setSearchResults({ query: query.trim(), total_results: 0, results: [] });
    } finally {
      setSearching(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const highlightText = (text: string, highlight: string): React.ReactElement => {
    if (!highlight) return <span>{text}</span>;
    const parts = text.split(new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
      <span>
        {parts.map((part, index) =>
          part.toLowerCase() === highlight.toLowerCase() ? (
            <mark key={index} className="bg-yellow-200 px-1 rounded">{part}</mark>
          ) : (
            <span key={index}>{part}</span>
          )
        )}
      </span>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <Card className="bg-[#F2F1EF] border border-[#D8CFD0] shadow-xl rounded-2xl">
        <CardBody className="p-8 text-center">
          <div className="w-16 h-16 bg-[#697184] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <SearchIcon className="w-8 h-8 text-[#F2F1EF]" />
          </div>
          <h1 className="text-4xl font-bold text-[#413F3D] mb-4">
            Search Meetings
          </h1>
          <p className="text-xl text-[#B1A6A4] max-w-2xl mx-auto">
            Search across all meeting transcripts and slide content with AI-powered relevance ranking
          </p>
        </CardBody>
      </Card>
      {/* Search Form */}
      <Card className="bg-[#F2F1EF] border border-[#D8CFD0] shadow-xl rounded-2xl">
        <CardBody className="p-8">
          <form onSubmit={handleSearch} className="space-y-6">
            <div className="flex space-x-4">
              <Input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for topics, speakers, action items..."
                size="lg"
                startContent={<SearchIcon className="w-5 h-5 text-[#697184]" />}
                className="flex-1 bg-[#D8CFD0] text-[#413F3D] border border-[#B1A6A4] rounded-lg"
                classNames={{
                  input: 'text-lg',
                  inputWrapper: 'h-14',
                }}
              />
              <Button
                type="submit"
                isDisabled={!query.trim() || searching}
                isLoading={searching}
                color="primary"
                size="lg"
                className="px-8 bg-[#697184] text-[#F2F1EF] font-semibold rounded-full hover:bg-[#5a6173]"
              >
                {searching ? 'Searching...' : 'Search'}
              </Button>
            </div>
            {/* Quick Search Suggestions */}
            <div>
              <p className="text-sm font-semibold text-[#413F3D] mb-3">Quick searches:</p>
              <div className="flex flex-wrap gap-2">
                {['action items', 'API', 'demo', 'Sarah', 'testing', 'deadlines'].map((suggestion) => (
                  <Chip
                    key={suggestion}
                    onClick={() => setQuery(suggestion)}
                    variant="flat"
                    color="default"
                    className="cursor-pointer bg-[#D8CFD0] text-[#413F3D] hover:bg-[#697184]/10 transition-colors"
                  >
                    {suggestion}
                  </Chip>
                ))}
              </div>
            </div>
          </form>
        </CardBody>
      </Card>
      {/* Search Results */}
      {hasSearched && (
        <Card className="bg-[#F2F1EF] border border-[#D8CFD0] shadow-xl rounded-2xl">
          <CardBody className="p-8">
            {searchResults ? (
              <>
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-bold text-[#413F3D]">
                    Search Results
                  </h2>
                  <Chip variant="flat" color="primary" size="lg" className="bg-[#697184] text-[#F2F1EF]">
                    {searchResults.total_results} result(s) for "{searchResults.query}"
                  </Chip>
                </div>
                {searchResults.results.length > 0 ? (
                  <div className="space-y-6">
                    {searchResults.results.map((result, index) => (
                      <Card key={index} className="border border-[#D8CFD0] hover:shadow-lg transition-all duration-300 rounded-xl bg-[#F2F1EF]">
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-start w-full">
                            <div className="space-y-2">
                              <Button
                                as={Link}
                                href={`/results/${result.job_id}`}
                                variant="light"
                                color="primary"
                                size="lg"
                                className="text-lg font-semibold p-0 h-auto min-w-0 justify-start text-[#697184] hover:text-[#413F3D]"
                                endContent={<ExternalLink className="w-4 h-4" />}
                              >
                                Job {result.job_id.substring(0, 8)}...
                              </Button>
                              <div className="flex items-center space-x-4">
                                <Chip
                                  variant="flat"
                                  color={result.job_info.status === 'completed' ? 'success' : 'warning'}
                                  size="sm"
                                >
                                  {result.job_info.status.toUpperCase()}
                                </Chip>
                                {result.job_info.meeting_duration && (
                                  <div className="flex items-center space-x-1 text-sm text-[#B1A6A4]">
                                    <Clock className="w-4 h-4" />
                                    <span>Duration: {formatTime(result.job_info.meeting_duration)}</span>
                                  </div>
                                )}
                                {result.job_info.created_at && (
                                  <span className="text-sm text-[#B1A6A4]">
                                    Created: {new Date(result.job_info.created_at).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Chip variant="bordered" size="sm" className="border-[#697184] text-[#697184]">
                              Relevance: {(result.relevance_score * 100).toFixed(0)}%
                            </Chip>
                          </div>
                        </CardHeader>
                        <CardBody className="pt-0">
                          {/* Matched Transcript Segments */}
                          {result.matched_segments.length > 0 && (
                            <div className="mb-6">
                              <h4 className="text-lg font-semibold text-[#413F3D] mb-4 flex items-center">
                                <FileText className="w-5 h-5 mr-2 text-[#697184]" />
                                Transcript Matches ({result.matched_segments.length})
                              </h4>
                              <div className="space-y-3">
                                {result.matched_segments.slice(0, 3).map((segment, segIndex) => (
                                  <Card key={segIndex} className="bg-[#D8CFD0] rounded-lg">
                                    <CardBody className="p-4">
                                      <div className="flex items-start space-x-4">
                                        <Code size="sm" className="bg-[#697184]/10 text-[#697184] min-w-[60px]">
                                          {formatTime(segment.start_time)}
                                        </Code>
                                        <Chip
                                          variant="flat"
                                          color="primary"
                                          size="sm"
                                          startContent={<User className="w-3 h-3" />}
                                          className="bg-[#697184]/10 text-[#697184]"
                                        >
                                          {segment.speaker}
                                        </Chip>
                                        <p className="text-[#413F3D] flex-1">
                                          {highlightText(segment.text, segment.highlight)}
                                        </p>
                                      </div>
                                    </CardBody>
                                  </Card>
                                ))}
                                {result.matched_segments.length > 3 && (
                                  <p className="text-sm text-[#B1A6A4] italic pl-4">
                                    +{result.matched_segments.length - 3} more matches...
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                          {/* Matched Slides */}
                          {result.matched_slides.length > 0 && (
                            <div className="mb-4">
                              <h4 className="text-lg font-semibold text-[#413F3D] mb-4 flex items-center">
                                <FileText className="w-5 h-5 mr-2 text-[#697184]" />
                                Slide Matches ({result.matched_slides.length})
                              </h4>
                              <div className="space-y-3">
                                {result.matched_slides.slice(0, 2).map((slide, slideIndex) => (
                                  <Card key={slideIndex} className="bg-[#D8CFD0] rounded-lg">
                                    <CardBody className="p-4">
                                      <div className="flex items-start space-x-4">
                                        <Chip variant="flat" color="secondary" size="sm" className="bg-[#697184]/10 text-[#697184]">
                                          Slide {slide.slide_number}
                                        </Chip>
                                        <p className="text-[#413F3D] flex-1">
                                          {highlightText(slide.text, slide.highlight)}
                                        </p>
                                      </div>
                                    </CardBody>
                                  </Card>
                                ))}
                                {result.matched_slides.length > 2 && (
                                  <p className="text-sm text-[#B1A6A4] italic pl-4">
                                    +{result.matched_slides.length - 2} more slide matches...
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                          <Divider className="my-4" />
                          <Button
                            as={Link}
                            href={`/results/${result.job_id}`}
                            variant="light"
                            color="primary"
                            className="bg-[#697184] text-[#F2F1EF] rounded-full hover:bg-[#5a6173]"
                            endContent={<ExternalLink className="w-4 h-4" />}
                          >
                            View full meeting details
                          </Button>
                        </CardBody>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-[#D8CFD0] rounded-full flex items-center justify-center mx-auto mb-6">
                      <SearchIcon className="w-10 h-10 text-[#697184]" />
                    </div>
                    <h3 className="text-xl font-semibold text-[#413F3D] mb-3">No results found</h3>
                    <p className="text-[#B1A6A4] text-lg">
                      Try searching for different keywords or check your spelling.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-[#B1A6A4] text-lg">Search failed. Please try again.</p>
              </div>
            )}
          </CardBody>
        </Card>
      )}
      {/* Search Tips */}
      <Card className="bg-[#D8CFD0] border border-[#697184] rounded-2xl">
        <CardHeader>
          <h3 className="text-xl font-semibold text-[#697184]">Search Tips</h3>
        </CardHeader>
        <CardBody className="pt-0">
          <ul className="text-[#697184] space-y-2">
            <li className="flex items-start space-x-2">
              <span className="text-[#697184] mt-1">•</span>
              <span>Search for specific topics, action items, or speaker names</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-[#697184] mt-1">•</span>
              <span>Use multiple keywords to narrow down results</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-[#697184] mt-1">•</span>
              <span>Results are ranked by relevance to your query</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-[#697184] mt-1">•</span>
              <span>Search covers both transcript content and slide text</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-[#697184] mt-1">•</span>
              <span>Click on any result to view the full meeting details</span>
            </li>
          </ul>
        </CardBody>
      </Card>
    </div>
  );
};

export default Search;