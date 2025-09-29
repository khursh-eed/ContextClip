'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Card, 
  CardBody, 
  CardHeader, 
  Button, 
  Chip, 
  Divider,
  Progress,
  Code,
  Tabs,
  Tab
} from '@heroui/react'
import { 
  FileText, 
  Clock, 
  User, 
  CheckCircle, 
  AlertCircle, 
  Download,
  Play,
  ArrowLeft,
  Calendar,
  Users
} from 'lucide-react'

interface ActionItem {
  task: string
  assignee?: string
  priority?: string
  due_date?: string
}

interface SlideLink {
  slide_number: number
  timestamp: number
  confidence: number
  matched_text: string
}

interface JobData {
  job_id: string
  status: string
  files: {
    transcript?: string
    summary?: string
    segments?: string
    slide_texts?: string
    linked_segments?: string
  }
  urls: {
    transcript?: string
    summary?: string
    segments?: string
    slide_texts?: string
    linked_segments?: string
  }
  action_items: ActionItem[]
  slide_links: SlideLink[]
  meeting_duration?: number
  speakers?: string[]
  summary_data?: {
    summary_points: string[]
    action_items: ActionItem[]
    key_topics: string[]
    meeting_duration: string
  }
}

interface TranscriptSegment {
  start_time: number
  end_time: number
  speaker: string
  text: string
}

const Results = () => {
  const params = useParams<{ jobId: string }>();
  const jobId = params.jobId as string;
  const [jobData, setJobData] = useState<JobData | null>(null)
  const [transcriptSegments, setTranscriptSegments] = useState<TranscriptSegment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'summary' | 'transcript' | 'slides'>('summary')

  useEffect(() => {
    if (!jobId) return

    const fetchJobData = async () => {
      try {
        setLoading(true)
        const response = await fetch(`http://localhost:8000/job/${jobId}`)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch job data: ${response.status}`)
        }
        
        const data = await response.json()
        setJobData(data)

        // Fetch transcript segments if available
        if (data.urls.segments) {
          const segmentsResponse = await fetch(data.urls.segments)
          if (segmentsResponse.ok) {
            const segmentsText = await segmentsResponse.text()
            const segments = parseCSV(segmentsText)
            setTranscriptSegments(segments)
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load job data')
      } finally {
        setLoading(false)
      }
    }

    fetchJobData()
  }, [jobId])

  const parseCSV = (csvText: string): TranscriptSegment[] => {
    const lines = csvText.split('\n').filter(line => line.trim())
    const segments: TranscriptSegment[] = []
    
    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',')
      if (cols.length >= 4) {
        segments.push({
          start_time: parseFloat(cols[0]) || 0,
          end_time: parseFloat(cols[1]) || 0,
          speaker: cols[2] || 'Unknown',
          text: cols.slice(3).join(',').replace(/"/g, '') // Handle text with commas
        })
      }
    }
    
    return segments
  }

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const jumpToTimestamp = (timestamp: number) => {
    // In a real implementation, this would control audio/video playback
    console.log(`Jump to timestamp: ${formatTime(timestamp)}`)
    alert(`Would jump to ${formatTime(timestamp)}`)
  }

  const getSpeakerColor = (speaker: string): string => {
    const colors = [
      'bg-blue-100 text-blue-800',
      'bg-green-100 text-green-800', 
      'bg-purple-100 text-purple-800',
      'bg-orange-100 text-orange-800',
      'bg-pink-100 text-pink-800'
    ]
    const hash = speaker.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
    return colors[hash % colors.length]
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-4 text-lg text-gray-600">Loading job results...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <h2 className="text-lg font-medium text-red-800 mb-2">Error Loading Results</h2>
        <p className="text-red-600">{error}</p>
        <Link href="/" className="mt-4 inline-block text-blue-600 hover:text-blue-800">
          ← Back to Upload
        </Link>
      </div>
    )
  }

  if (!jobData) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No job data found</p>
        <Link href="/" className="mt-4 inline-block text-blue-600 hover:text-blue-800">
          ← Back to Upload
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Meeting Results
            </h1>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>Job ID: <code className="bg-gray-100 px-2 py-1 rounded">{jobData.job_id}</code></span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                jobData.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {jobData.status.toUpperCase()}
              </span>
              {jobData.meeting_duration && (
                <span>Duration: {formatTime(jobData.meeting_duration)}</span>
              )}
            </div>
          </div>
          <Link 
            href="/" 
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← New Upload
          </Link>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-lg">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {(['summary', 'transcript', 'slides'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-2 border-b-2 font-medium text-sm capitalize transition-colors ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Summary Tab */}
          {activeTab === 'summary' && (
            <div className="space-y-6">
              {/* Meeting Summary */}
              {jobData.summary_data?.summary_points && (
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Meeting Summary</h3>
                  <ul className="space-y-2">
                    {jobData.summary_data.summary_points.map((point, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-blue-600 mr-2">•</span>
                        <span className="text-gray-700">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Items */}
              {jobData.action_items.length > 0 && (
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Action Items</h3>
                  <div className="space-y-3">
                    {jobData.action_items.map((item, index) => (
                      <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                        <div className="flex justify-between items-start">
                          <p className="text-gray-800 flex-1">{item.task}</p>
                          <button
                            onClick={() => jumpToTimestamp(0)} // In real app, would have actual timestamp
                            className="ml-4 text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Go to segment →
                          </button>
                        </div>
                        <div className="mt-2 flex space-x-4 text-sm text-gray-600">
                          {item.assignee && (
                            <span>
                              <span className="font-medium">Assigned:</span> {item.assignee}
                            </span>
                          )}
                          {item.priority && (
                            <span>
                              <span className="font-medium">Priority:</span> 
                              <span className={`ml-1 px-2 py-1 rounded-full text-xs ${
                                item.priority.toLowerCase() === 'high' ? 'bg-red-100 text-red-800' :
                                item.priority.toLowerCase() === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {item.priority}
                              </span>
                            </span>
                          )}
                          {item.due_date && (
                            <span>
                              <span className="font-medium">Due:</span> {item.due_date}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Key Topics */}
              {jobData.summary_data?.key_topics && (
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Key Topics</h3>
                  <div className="flex flex-wrap gap-2">
                    {jobData.summary_data.key_topics.map((topic, index) => (
                      <span 
                        key={index}
                        className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Transcript Tab */}
          {activeTab === 'transcript' && (
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Transcript</h3>
              {transcriptSegments.length > 0 ? (
                <div className="space-y-4">
                  {transcriptSegments.map((segment, index) => (
                    <div key={index} className="flex space-x-4 p-4 hover:bg-gray-50 rounded-md">
                      <button
                        onClick={() => jumpToTimestamp(segment.start_time)}
                        className="text-blue-600 hover:text-blue-800 font-mono text-sm font-medium min-w-[60px] text-left"
                      >
                        {formatTime(segment.start_time)}
                      </button>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSpeakerColor(segment.speaker)}`}>
                        {segment.speaker}
                      </span>
                      <p className="text-gray-800 flex-1">{segment.text}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No transcript segments available</p>
              )}
            </div>
          )}

          {/* Slides Tab */}
          {activeTab === 'slides' && (
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Slide Links</h3>
              {jobData.slide_links.length > 0 ? (
                <div className="space-y-3">
                  {jobData.slide_links.map((link, index) => (
                    <div key={index} className="bg-blue-50 border border-blue-200 rounded-md p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            Slide {link.slide_number}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            Matched text: "{link.matched_text}"
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Confidence: {(link.confidence * 100).toFixed(1)}%
                          </p>
                        </div>
                        <button
                          onClick={() => jumpToTimestamp(link.timestamp)}
                          className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                        >
                          {formatTime(link.timestamp)} →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No slide links available</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Speakers Summary */}
      {jobData.speakers && jobData.speakers.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Meeting Participants</h3>
          <div className="flex flex-wrap gap-2">
            {jobData.speakers.map((speaker, index) => (
              <span 
                key={index}
                className={`px-3 py-2 rounded-full text-sm font-medium ${getSpeakerColor(speaker)}`}
              >
                {speaker}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Results
