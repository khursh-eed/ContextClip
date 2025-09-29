import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  CardBody,
  CardHeader,
  Input,
  Button,
  Chip,
  Badge,
  Divider,
  Spinner,
  Pagination
} from '@heroui/react'
import { Search as SearchIcon, Calendar, Clock, User, FileText, Play, Filter, SortAsc, Zap } from 'lucide-react'

interface SearchResult {
  job_id: string
  filename: string
  upload_date: string
  duration?: number
  content_snippet: string
  relevance_score: number
  timestamp?: string
  slide_number?: number
  speaker?: string
}

interface SearchFilters {
  dateRange: string
  contentType: string
  sortBy: string
}

const SearchPage = () => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [totalResults, setTotalResults] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [filters, setFilters] = useState<SearchFilters>({
    dateRange: 'all',
    contentType: 'all',
    sortBy: 'relevance'
  })
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  
  const navigate = useNavigate()
  const resultsPerPage = 10

  useEffect(() => {
    // Load recent searches from localStorage
    const saved = localStorage.getItem('recentSearches')
    if (saved) {
      setRecentSearches(JSON.parse(saved))
    }
  }, [])

  const saveSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return
    
    const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5)
    setRecentSearches(updated)
    localStorage.setItem('recentSearches', JSON.stringify(updated))
  }

  const handleSearch = async (searchQuery: string = query, page: number = 1) => {
    if (!searchQuery.trim()) return

    setLoading(true)
    saveSearch(searchQuery)

    try {
      const params = new URLSearchParams({
        query: searchQuery,
        page: page.toString(),
        limit: resultsPerPage.toString(),
        ...filters
      })

      const response = await fetch(`http://localhost:8000/search?${params}`)
      
      if (response.ok) {
        const data = await response.json()
        setResults(data.results || [])
        setTotalResults(data.total || 0)
        setCurrentPage(page)
      } else {
        console.error('Search failed:', response.statusText)
        setResults([])
        setTotalResults(0)
      }
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
      setTotalResults(0)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: keyof SearchFilters, value: string) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    
    if (query.trim()) {
      handleSearch(query, 1)
    }
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'Unknown'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return null
    const time = parseFloat(timestamp)
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const highlightQuery = (text: string, searchQuery: string) => {
    if (!searchQuery.trim()) return text
    
    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)
    
    return parts.map((part, index) => 
      regex.test(part) ? 
        <mark key={index} className="bg-yellow-200 px-1 rounded">{part}</mark> : 
        part
    )
  }

  const totalPages = Math.ceil(totalResults / resultsPerPage)

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <Chip 
          startContent={<SearchIcon className="w-4 h-4" />}
          variant="flat" 
          color="primary"
          size="lg"
          className="bg-blue-100 text-blue-800"
        >
          AI-Powered Search
        </Chip>
        
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900">
          Search Your
          <span className="block bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Meeting Library
          </span>
        </h1>
        
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          Find specific moments, topics, and insights across all your processed meetings with intelligent semantic search.
        </p>
      </div>

      {/* Search Input */}
      <Card className="bg-white/80 backdrop-blur-sm shadow-xl border border-white/20">
        <CardBody className="p-8">
          <div className="relative">
            <Input
              placeholder="Search across transcripts, action items, summaries..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              size="lg"
              startContent={<SearchIcon className="w-6 h-6 text-gray-400" />}
              className="text-lg"
              classNames={{
                input: "text-lg",
                inputWrapper: "h-16 bg-white shadow-lg border-2 border-gray-200 hover:border-blue-400 focus-within:border-blue-500"
              }}
            />
            
            <Button
              onClick={() => handleSearch()}
              isLoading={loading}
              color="primary"
              size="lg"
              className="absolute right-2 top-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold h-12 px-8"
              startContent={!loading && <Zap className="w-5 h-5" />}
            >
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </div>

          {/* Recent Searches */}
          {recentSearches.length > 0 && !query && (
            <div className="mt-6">
              <p className="text-sm font-semibold text-gray-700 mb-3">Recent Searches:</p>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((search, index) => (
                  <Chip
                    key={index}
                    variant="flat"
                    color="primary"
                    className="cursor-pointer hover:bg-blue-100"
                    onClick={() => {
                      setQuery(search)
                      handleSearch(search)
                    }}
                  >
                    {search}
                  </Chip>
                ))}
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Filters */}
      <Card className="bg-white/80 backdrop-blur-sm shadow-lg border border-white/20">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-bold text-gray-900">Filters & Sorting</h3>
          </div>
        </CardHeader>
        <CardBody className="pt-0">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Date Range</label>
              <select
                value={filters.dateRange}
                onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Content Type</label>
              <select
                value={filters.contentType}
                onChange={(e) => handleFilterChange('contentType', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Content</option>
                <option value="transcript">Transcripts</option>
                <option value="summary">Summaries</option>
                <option value="action_items">Action Items</option>
                <option value="slides">Slide Content</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Sort By</label>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="relevance">Relevance</option>
                <option value="date_desc">Newest First</option>
                <option value="date_asc">Oldest First</option>
                <option value="duration_desc">Longest First</option>
                <option value="duration_asc">Shortest First</option>
              </select>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Results */}
      {query && (
        <Card className="bg-white/80 backdrop-blur-sm shadow-lg border border-white/20">
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-2">
                <SortAsc className="w-5 h-5 text-gray-600" />
                <h3 className="text-lg font-bold text-gray-900">
                  Search Results {totalResults > 0 && `(${totalResults.toLocaleString()} found)`}
                </h3>
              </div>
              
              {loading && <Spinner size="sm" color="primary" />}
            </div>
          </CardHeader>

          <CardBody className="pt-0">
            {loading ? (
              <div className="text-center py-12">
                <Spinner size="lg" color="primary" />
                <p className="text-gray-600 mt-4">Searching through your content...</p>
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-6">
                {results.map((result, index) => (
                  <Card
                    key={`${result.job_id}-${index}`}
                    className="border border-gray-200 hover:shadow-lg transition-all duration-300 cursor-pointer"
                    isPressable
                    onPress={() => navigate(`/results/${result.job_id}`)}
                  >
                    <CardBody className="p-6">
                      <div className="space-y-4">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-xl font-bold text-gray-900 mb-2">
                              {result.filename}
                            </h4>
                            
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <div className="flex items-center space-x-1">
                                <Calendar className="w-4 h-4" />
                                <span>{new Date(result.upload_date).toLocaleDateString()}</span>
                              </div>
                              
                              {result.duration && (
                                <div className="flex items-center space-x-1">
                                  <Clock className="w-4 h-4" />
                                  <span>{formatDuration(result.duration)}</span>
                                </div>
                              )}
                              
                              {result.speaker && (
                                <div className="flex items-center space-x-1">
                                  <User className="w-4 h-4" />
                                  <span>{result.speaker}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Badge
                              content={Math.round(result.relevance_score * 100)}
                              color="primary"
                              size="sm"
                            >
                              <Chip variant="flat" color="primary" size="sm">
                                Relevance
                              </Chip>
                            </Badge>
                            
                            {result.timestamp && (
                              <Chip variant="flat" color="secondary" size="sm">
                                {formatTimestamp(result.timestamp)}
                              </Chip>
                            )}
                            
                            {result.slide_number && (
                              <Chip variant="flat" color="warning" size="sm">
                                Slide {result.slide_number}
                              </Chip>
                            )}
                          </div>
                        </div>

                        <Divider />

                        {/* Content Snippet */}
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <FileText className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-semibold text-gray-700">Content Preview:</span>
                          </div>
                          
                          <p className="text-gray-800 leading-relaxed bg-gray-50 p-4 rounded-lg border-l-4 border-blue-500">
                            {highlightQuery(result.content_snippet, query)}
                          </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center space-x-3 pt-2">
                          <Button
                            size="sm"
                            color="primary"
                            variant="flat"
                            startContent={<Play className="w-4 h-4" />}
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`/results/${result.job_id}`)
                            }}
                          >
                            View Details
                          </Button>
                          
                          {result.timestamp && (
                            <Button
                              size="sm"
                              color="secondary"
                              variant="flat"
                              startContent={<Clock className="w-4 h-4" />}
                            >
                              Jump to Time
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                ))}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center pt-6">
                    <Pagination
                      total={totalPages}
                      page={currentPage}
                      onChange={(page) => handleSearch(query, page)}
                      color="primary"
                      size="lg"
                      showControls
                      showShadow
                    />
                  </div>
                )}
              </div>
            ) : query && !loading ? (
              <div className="text-center py-12">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <SearchIcon className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Results Found</h3>
                <p className="text-gray-600 mb-6">
                  We couldn't find any content matching "{query}". Try adjusting your search terms or filters.
                </p>
                <div className="space-y-3 text-sm text-gray-600">
                  <p><strong>Search Tips:</strong></p>
                  <ul className="space-y-1">
                    <li>• Use specific keywords or phrases</li>
                    <li>• Try broader terms if your search is too specific</li>
                    <li>• Check your filters and date range settings</li>
                    <li>• Make sure you have uploaded and processed content</li>
                  </ul>
                </div>
              </div>
            ) : null}
          </CardBody>
        </Card>
      )}

      {/* Getting Started */}
      {!query && (
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
          <CardBody className="p-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <SearchIcon className="w-10 h-10 text-white" />
            </div>
            
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Start Your Search</h3>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Search across all your meeting transcripts, summaries, action items, and slide content. 
              Our AI understands context and finds relevant information even if you don't remember the exact words.
            </p>
            
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <Card className="bg-white/80 border border-white/50">
                <CardBody className="p-6">
                  <h4 className="font-bold text-gray-900 mb-3">Example Searches:</h4>
                  <div className="space-y-2 text-left">
                    <Chip variant="flat" size="sm" className="mr-2 mb-1">"project timeline"</Chip>
                    <Chip variant="flat" size="sm" className="mr-2 mb-1">"action items"</Chip>
                    <Chip variant="flat" size="sm" className="mr-2 mb-1">"budget discussion"</Chip>
                    <Chip variant="flat" size="sm" className="mr-2 mb-1">"next steps"</Chip>
                  </div>
                </CardBody>
              </Card>
              
              <Card className="bg-white/80 border border-white/50">
                <CardBody className="p-6">
                  <h4 className="font-bold text-gray-900 mb-3">Smart Features:</h4>
                  <div className="space-y-2 text-left text-sm text-gray-600">
                    <p>✓ Semantic search understands context</p>
                    <p>✓ Search by speaker or time range</p>
                    <p>✓ Find specific slides or moments</p>
                    <p>✓ Relevance-ranked results</p>
                  </div>
                </CardBody>
              </Card>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  )
}

export default SearchPage
