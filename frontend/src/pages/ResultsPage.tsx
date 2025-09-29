import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Chip,
  Tabs,
  Tab,
  Progress,
  Badge,
  Accordion,
  AccordionItem
} from '@heroui/react'
import { 
  FileText, 
  Download, 
  Share2, 
  Clock, 
  User, 
  CheckCircle, 
  AlertTriangle, 
  Calendar,
  Play,
  Volume2,
  Eye,
  ArrowLeft
} from 'lucide-react'

interface JobResult {
  job_id: string
  filename: string
  status: string
  upload_date: string
  processing_duration?: number
  file_size?: number
  duration?: number
  summary?: string
  transcript?: Array<{
    speaker: string
    timestamp: number
    text: string
    confidence: number
  }>
  action_items?: Array<{
    item: string
    assigned_to?: string
    due_date?: string
    priority: 'high' | 'medium' | 'low'
    completed: boolean
  }>
  key_topics?: string[]
  sentiment_analysis?: {
    overall_sentiment: 'positive' | 'neutral' | 'negative'
    confidence: number
    emotional_highlights: Array<{
      timestamp: number
      emotion: string
      intensity: number
    }>
  }
  slides_analysis?: Array<{
    slide_number: number
    title: string
    content: string
    key_points: string[]
  }>
}

const ResultsPage = () => {
  const { jobId } = useParams<{ jobId: string }>()
  const [result, setResult] = useState<JobResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('summary')

  useEffect(() => {
    if (jobId) {
      fetchJobResult(jobId)
    }
  }, [jobId])

  const fetchJobResult = async (id: string) => {
    setLoading(true)
    try {
      const response = await fetch(`http://localhost:8000/results/${id}`)
      
      if (response.ok) {
        const data = await response.json()
        setResult(data)
      } else if (response.status === 404) {
        setError('Job not found. It may have been deleted or the ID is incorrect.')
      } else {
        setError('Failed to load results. Please try again.')
      }
    } catch (error) {
      console.error('Error fetching results:', error)
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const formatTimestamp = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const jumpToTimestamp = (timestamp: number) => {
    // In a real implementation, you would control an audio/video player here
    console.log('Jump to timestamp:', timestamp)
  }

  const downloadTranscript = () => {
    if (!result?.transcript) return
    
    const content = result.transcript
      .map(t => `[${formatTimestamp(t.timestamp)}] ${t.speaker}: ${t.text}`)
      .join('\n\n')
    
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${result.filename}_transcript.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadSummary = () => {
    if (!result) return
    
    let content = `Meeting Summary: ${result.filename}\n`
    content += `Date: ${new Date(result.upload_date).toLocaleDateString()}\n\n`
    
    if (result.summary) {
      content += `Summary:\n${result.summary}\n\n`
    }
    
    if (result.key_topics?.length) {
      content += `Key Topics:\n${result.key_topics.map(topic => `• ${topic}`).join('\n')}\n\n`
    }
    
    if (result.action_items?.length) {
      content += `Action Items:\n${result.action_items.map(item => 
        `• ${item.item} ${item.assigned_to ? `(Assigned to: ${item.assigned_to})` : ''} ${item.due_date ? `(Due: ${item.due_date})` : ''}`
      ).join('\n')}\n\n`
    }
    
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${result.filename}_summary.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <Card className="bg-white/80 backdrop-blur-sm shadow-xl">
          <CardBody className="p-12 text-center">
            <div className="space-y-6">
              <Progress size="lg" isIndeterminate color="primary" className="max-w-md mx-auto" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading Results</h2>
                <p className="text-gray-600">Please wait while we fetch your processed content...</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
        <Card className="bg-red-50 border border-red-200">
          <CardBody className="p-12 text-center">
            <div className="space-y-6">
              <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle className="w-12 h-12 text-red-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-red-900 mb-2">Error Loading Results</h2>
                <p className="text-red-700 mb-6">{error}</p>
                <div className="space-x-4">
                  <Button 
                    color="danger" 
                    variant="flat"
                    onClick={() => jobId && fetchJobResult(jobId)}
                  >
                    Try Again
                  </Button>
                  <Button as={Link} to="/search" variant="bordered">
                    Go to Search
                  </Button>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    )
  }

  if (!result) {
    return null
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <Card className="bg-white/80 backdrop-blur-sm shadow-xl border border-white/20">
        <CardBody className="p-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <Button
                  as={Link}
                  to="/search"
                  variant="flat"
                  size="sm"
                  startContent={<ArrowLeft className="w-4 h-4" />}
                >
                  Back to Search
                </Button>
                <Chip 
                  color={result.status === 'completed' ? 'success' : 'warning'}
                  variant="flat"
                  startContent={<CheckCircle className="w-4 h-4" />}
                >
                  {result.status.toUpperCase()}
                </Chip>
              </div>
              
              <h1 className="text-4xl font-bold text-gray-900 mb-4">{result.filename}</h1>
              
              <div className="grid md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center space-x-2 text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(result.upload_date).toLocaleDateString()}</span>
                </div>
                
                {result.duration && (
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>{formatTimestamp(result.duration)}</span>
                  </div>
                )}
                
                {result.file_size && (
                  <div className="flex items-center space-x-2 text-gray-600">
                    <FileText className="w-4 h-4" />
                    <span>{formatFileSize(result.file_size)}</span>
                  </div>
                )}
                
                {result.processing_duration && (
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>Processed in {Math.round(result.processing_duration)}s</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex space-x-3">
              <Button
                color="primary"
                variant="flat"
                startContent={<Download className="w-4 h-4" />}
                onClick={downloadSummary}
              >
                Download Summary
              </Button>
              
              <Button
                color="secondary"
                variant="flat"
                startContent={<Share2 className="w-4 h-4" />}
              >
                Share
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          {(result.transcript?.length || result.action_items?.length || result.key_topics?.length) && (
            <div className="grid md:grid-cols-3 gap-4">
              {result.transcript?.length && (
                <Card className="bg-blue-50 border border-blue-200">
                  <CardBody className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-800">{result.transcript.length}</div>
                    <div className="text-sm text-blue-600">Transcript Segments</div>
                  </CardBody>
                </Card>
              )}
              
              {result.action_items?.length && (
                <Card className="bg-green-50 border border-green-200">
                  <CardBody className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-800">{result.action_items.length}</div>
                    <div className="text-sm text-green-600">Action Items</div>
                  </CardBody>
                </Card>
              )}
              
              {result.key_topics?.length && (
                <Card className="bg-purple-50 border border-purple-200">
                  <CardBody className="p-4 text-center">
                    <div className="text-2xl font-bold text-purple-800">{result.key_topics.length}</div>
                    <div className="text-sm text-purple-600">Key Topics</div>
                  </CardBody>
                </Card>
              )}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Main Content */}
      <Card className="bg-white/80 backdrop-blur-sm shadow-xl border border-white/20">
        <CardBody className="p-0">
          <Tabs 
            selectedKey={activeTab} 
            onSelectionChange={(key) => setActiveTab(key as string)}
            size="lg"
            variant="underlined"
            color="primary"
            className="px-8 pt-8"
          >
            <Tab key="summary" title={
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <span>Summary</span>
              </div>
            }>
              <div className="p-8 pt-6 space-y-6">
                {result.summary ? (
                  <Card className="bg-gray-50">
                    <CardBody className="p-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-4">AI Generated Summary</h3>
                      <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{result.summary}</p>
                    </CardBody>
                  </Card>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No summary available for this content.</p>
                  </div>
                )}

                {/* Key Topics */}
                {result.key_topics && result.key_topics.length > 0 && (
                  <Card className="bg-purple-50 border border-purple-200">
                    <CardHeader>
                      <h3 className="text-xl font-bold text-purple-900">Key Topics Discussed</h3>
                    </CardHeader>
                    <CardBody className="pt-0">
                      <div className="flex flex-wrap gap-2">
                        {result.key_topics.map((topic, index) => (
                          <Chip key={index} color="secondary" variant="flat" size="lg">
                            {topic}
                          </Chip>
                        ))}
                      </div>
                    </CardBody>
                  </Card>
                )}

                {/* Sentiment Analysis */}
                {result.sentiment_analysis && (
                  <Card className="bg-indigo-50 border border-indigo-200">
                    <CardHeader>
                      <h3 className="text-xl font-bold text-indigo-900">Sentiment Analysis</h3>
                    </CardHeader>
                    <CardBody className="pt-0 space-y-4">
                      <div className="flex items-center space-x-4">
                        <Chip 
                          color={
                            result.sentiment_analysis.overall_sentiment === 'positive' ? 'success' :
                            result.sentiment_analysis.overall_sentiment === 'negative' ? 'danger' : 'warning'
                          }
                          variant="flat"
                          size="lg"
                        >
                          {result.sentiment_analysis.overall_sentiment.toUpperCase()}
                        </Chip>
                        <div className="flex-1">
                          <Progress 
                            value={result.sentiment_analysis.confidence * 100}
                            color="primary"
                            size="sm"
                            label="Confidence"
                            showValueLabel
                          />
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                )}
              </div>
            </Tab>

            <Tab key="transcript" title={
              <div className="flex items-center space-x-2">
                <Volume2 className="w-4 h-4" />
                <span>Transcript</span>
              </div>
            }>
              <div className="p-8 pt-6">
                {result.transcript && result.transcript.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xl font-bold text-gray-900">Full Transcript</h3>
                      <Button
                        variant="flat"
                        color="primary"
                        startContent={<Download className="w-4 h-4" />}
                        onClick={downloadTranscript}
                      >
                        Download Transcript
                      </Button>
                    </div>
                    
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {result.transcript.map((segment, index) => (
                        <Card key={index} className="border border-gray-200 hover:shadow-md transition-shadow">
                          <CardBody className="p-4">
                            <div className="flex items-start space-x-4">
                              <div className="flex-shrink-0 space-y-2">
                                <Button
                                  size="sm"
                                  variant="flat"
                                  color="primary"
                                  startContent={<Play className="w-3 h-3" />}
                                  onClick={() => jumpToTimestamp(segment.timestamp)}
                                >
                                  {formatTimestamp(segment.timestamp)}
                                </Button>
                                
                                <div className="flex items-center space-x-2">
                                  <User className="w-4 h-4 text-gray-500" />
                                  <Chip size="sm" variant="flat" color="secondary">
                                    {segment.speaker}
                                  </Chip>
                                </div>
                              </div>
                              
                              <div className="flex-1">
                                <p className="text-gray-800 leading-relaxed">{segment.text}</p>
                                {segment.confidence < 0.8 && (
                                  <div className="mt-2">
                                    <Chip size="sm" variant="flat" color="warning">
                                      Low Confidence ({Math.round(segment.confidence * 100)}%)
                                    </Chip>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardBody>
                        </Card>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Volume2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No transcript available for this content.</p>
                  </div>
                )}
              </div>
            </Tab>

            <Tab key="actions" title={
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4" />
                <span>Action Items</span>
              </div>
            }>
              <div className="p-8 pt-6">
                {result.action_items && result.action_items.length > 0 ? (
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-gray-900">Extracted Action Items</h3>
                    
                    <div className="space-y-4">
                      {result.action_items.map((item, index) => (
                        <Card key={index} className="border border-gray-200">
                          <CardBody className="p-6">
                            <div className="flex items-start space-x-4">
                              <div className="flex-shrink-0 mt-1">
                                <div className={`w-4 h-4 rounded-full border-2 ${
                                  item.completed ? 'bg-green-500 border-green-500' : 'border-gray-300'
                                }`} />
                              </div>
                              
                              <div className="flex-1 space-y-3">
                                <p className={`text-lg font-medium ${
                                  item.completed ? 'text-gray-500 line-through' : 'text-gray-900'
                                }`}>
                                  {item.item}
                                </p>
                                
                                <div className="flex flex-wrap items-center gap-3">
                                  <Chip
                                    color={
                                      item.priority === 'high' ? 'danger' :
                                      item.priority === 'medium' ? 'warning' : 'success'
                                    }
                                    variant="flat"
                                    size="sm"
                                  >
                                    {item.priority.toUpperCase()} PRIORITY
                                  </Chip>
                                  
                                  {item.assigned_to && (
                                    <div className="flex items-center space-x-1">
                                      <User className="w-4 h-4 text-gray-500" />
                                      <span className="text-sm text-gray-600">{item.assigned_to}</span>
                                    </div>
                                  )}
                                  
                                  {item.due_date && (
                                    <div className="flex items-center space-x-1">
                                      <Calendar className="w-4 h-4 text-gray-500" />
                                      <span className="text-sm text-gray-600">{item.due_date}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardBody>
                        </Card>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No action items extracted from this content.</p>
                  </div>
                )}
              </div>
            </Tab>

            {result.slides_analysis && result.slides_analysis.length > 0 && (
              <Tab key="slides" title={
                <div className="flex items-center space-x-2">
                  <Eye className="w-4 h-4" />
                  <span>Slides</span>
                </div>
              }>
                <div className="p-8 pt-6">
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-gray-900">Slide Analysis</h3>
                    
                    <Accordion variant="splitted">
                      {result.slides_analysis.map((slide, index) => (
                        <AccordionItem
                          key={index}
                          title={
                            <div className="flex items-center space-x-3">
                              <Badge content={slide.slide_number} color="primary" size="sm">
                                <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                                  <Eye className="w-4 h-4 text-blue-600" />
                                </div>
                              </Badge>
                              <span className="font-semibold">{slide.title || `Slide ${slide.slide_number}`}</span>
                            </div>
                          }
                        >
                          <div className="space-y-4 p-4">
                            {slide.content && (
                              <div>
                                <h4 className="font-semibold text-gray-900 mb-2">Content:</h4>
                                <p className="text-gray-700 whitespace-pre-wrap">{slide.content}</p>
                              </div>
                            )}
                            
                            {slide.key_points && slide.key_points.length > 0 && (
                              <div>
                                <h4 className="font-semibold text-gray-900 mb-2">Key Points:</h4>
                                <ul className="space-y-1">
                                  {slide.key_points.map((point, pointIndex) => (
                                    <li key={pointIndex} className="flex items-start space-x-2">
                                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                                      <span className="text-gray-700">{point}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                </div>
              </Tab>
            )}
          </Tabs>
        </CardBody>
      </Card>
    </div>
  )
}

export default ResultsPage
