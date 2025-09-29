import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Card, 
  CardBody, 
  CardHeader, 
  Button, 
  Progress, 
  Chip, 
  Divider
} from '@heroui/react'
import { Upload as UploadIcon, FileText, Play, CheckCircle, AlertCircle, Zap } from 'lucide-react'

interface JobStatus {
  job_id: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  message?: string
}

const UploadPage = () => {
  const [files, setFiles] = useState<{
    media: File | null
    slides: File[]
  }>({
    media: null,
    slides: []
  })
  
  const [uploading, setUploading] = useState(false)
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null)
  const [polling, setPolling] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  
  const mediaRef = useRef<HTMLInputElement>(null)
  const slidesRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFiles(prev => ({ ...prev, media: e.target.files![0] }))
    }
  }

  const handleSlidesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => ({ ...prev, slides: Array.from(e.target.files!) }))
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    
    const droppedFiles = Array.from(e.dataTransfer.files)
    const mediaTypes = ['audio/', 'video/']
    const imageTypes = ['image/', 'application/pdf']
    
    droppedFiles.forEach(file => {
      if (mediaTypes.some(type => file.type.startsWith(type)) && !files.media) {
        setFiles(prev => ({ ...prev, media: file }))
      } else if (imageTypes.some(type => file.type.startsWith(type))) {
        setFiles(prev => ({ ...prev, slides: [...prev.slides, file] }))
      }
    })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
  }

  const pollJobStatus = async (jobId: string) => {
    setPolling(true)
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:8000/job/${jobId}`)
        if (response.ok) {
          const jobData = await response.json()
          setJobStatus(jobData)
          
          if (jobData.status === 'completed') {
            clearInterval(pollInterval)
            setPolling(false)
            setTimeout(() => {
              navigate(`/results/${jobId}`)
            }, 2000)
          } else if (jobData.status === 'failed') {
            clearInterval(pollInterval)
            setPolling(false)
          }
        }
      } catch (error) {
        console.error('Error polling job status:', error)
      }
    }, 2000)

    setTimeout(() => {
      clearInterval(pollInterval)
      setPolling(false)
    }, 300000)
  }

  const handleUpload = async () => {
    if (!files.media) {
      alert('Please select a media file')
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append('media', files.media)
    
    files.slides.forEach(slide => {
      formData.append('slides', slide)
    })

    try {
      const response = await fetch('http://localhost:8000/upload', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const result = await response.json()
        setJobStatus({
          job_id: result.job_id,
          status: 'queued',
          message: result.message
        })
        pollJobStatus(result.job_id)
      } else {
        const error = await response.json()
        alert(`Upload failed: ${error.detail || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Upload failed: Network error')
    } finally {
      setUploading(false)
    }
  }

  const clearFiles = () => {
    setFiles({ media: null, slides: [] })
    setJobStatus(null)
    if (mediaRef.current) mediaRef.current.value = ''
    if (slidesRef.current) slidesRef.current.value = ''
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="text-center space-y-6 max-w-4xl mx-auto">
        <Chip 
          startContent={<Zap className="w-4 h-4" />}
          variant="flat" 
          color="primary"
          size="lg"
          className="bg-blue-100/80 text-blue-800 border border-blue-200/50"
        >
          AI-Powered Meeting Intelligence
        </Chip>
        
        <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 leading-tight">
            Transform Your
            <span className="block bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mt-2">
              Meeting Content
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Upload audio, video, and presentation slides to generate intelligent summaries, 
            extract action items, and create searchable transcripts with AI precision.
          </p>
        </div>
      </div>

      {/* Upload Card */}
      <div className="max-w-5xl mx-auto">
        <Card className="bg-white/90 backdrop-blur-sm shadow-xl border border-white/20">
          <CardBody className="p-8">
            {/* Drag & Drop Zone */}
            <Card
              className={`border-2 border-dashed p-6 transition-all duration-300 cursor-pointer ${
                dragActive 
                  ? 'border-blue-500 bg-blue-50/50' 
                  : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50/50'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              isPressable
            >
              <CardBody className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <UploadIcon className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    Drop your files here, or click to browse
                  </h3>
                  <p className="text-gray-600">
                    Supports audio, video files and presentation slides
                  </p>
                </div>
              </CardBody>
            </Card>

            <div className="mt-8 grid md:grid-cols-2 gap-6">
              {/* Media File Upload */}
              <Card className="border border-gray-200 hover:shadow-lg transition-all duration-300">
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                      <Play className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-900">Media File</h4>
                      <p className="text-sm text-gray-500">Required - Audio or video content</p>
                    </div>
                  </div>
                </CardHeader>
                <CardBody className="pt-0">
                  <div className="relative">
                    <input
                      ref={mediaRef}
                      type="file"
                      accept="audio/*,video/*"
                      onChange={handleMediaChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <Card className="bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                      <CardBody className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                            <FileText className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">
                              {files.media ? files.media.name : 'Choose audio or video file'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {files.media ? formatFileSize(files.media.size) : 'MP3, WAV, MP4, etc.'}
                            </p>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  </div>
                </CardBody>
              </Card>

              {/* Slides Upload */}
              <Card className="border border-gray-200 hover:shadow-lg transition-all duration-300">
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                      <FileText className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-900">Presentation Slides</h4>
                      <p className="text-sm text-gray-500">Optional - Images or PDFs</p>
                    </div>
                  </div>
                </CardHeader>
                <CardBody className="pt-0">
                  <div className="relative">
                    <input
                      ref={slidesRef}
                      type="file"
                      multiple
                      accept="image/*,.pdf"
                      onChange={handleSlidesChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <Card className="bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                      <CardBody className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                            <FileText className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">
                              {files.slides.length > 0 ? `${files.slides.length} slide(s) selected` : 'Choose presentation slides'}
                            </p>
                            <p className="text-sm text-gray-500">PNG, JPG, PDF supported</p>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  </div>
                </CardBody>
              </Card>
            </div>

            {/* Selected Files Preview */}
            {(files.media || files.slides.length > 0) && (
              <div className="mt-8">
                <Card className="bg-green-50 border border-green-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <h4 className="text-lg font-bold text-green-800">Selected Files</h4>
                    </div>
                  </CardHeader>
                  <CardBody className="pt-0">
                    <div className="space-y-3">
                      {files.media && (
                        <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Play className="w-5 h-5 text-green-600" />
                            <span className="font-medium text-green-800">{files.media.name}</span>
                          </div>
                          <Chip size="sm" variant="flat" color="success">
                            {formatFileSize(files.media.size)}
                          </Chip>
                        </div>
                      )}
                      {files.slides.map((slide, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg">
                          <div className="flex items-center space-x-3">
                            <FileText className="w-5 h-5 text-green-600" />
                            <span className="font-medium text-green-800">{slide.name}</span>
                          </div>
                          <Chip size="sm" variant="flat" color="success">
                            {formatFileSize(slide.size)}
                          </Chip>
                        </div>
                      ))}
                    </div>
                  </CardBody>
                </Card>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-8 flex space-x-4">
              <Button
                onClick={handleUpload}
                isDisabled={!files.media || uploading || polling}
                isLoading={uploading}
                color="primary"
                size="lg"
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold h-14 text-lg"
                startContent={!uploading && <Zap className="w-5 h-5" />}
              >
                {uploading ? 'Processing...' : 'Process with AI'}
              </Button>
              
              <Button
                onClick={clearFiles}
                isDisabled={uploading || polling}
                variant="bordered"
                size="lg"
                className="px-8 border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 h-14"
              >
                Clear All
              </Button>
            </div>
          </CardBody>

          {/* Job Status */}
          {jobStatus && (
            <>
              <Divider />
              <Card className="m-6 bg-gray-50/50">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Processing Status</h3>
                  </div>
                </CardHeader>
                
                <CardBody className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-2">Job ID:</p>
                      <Chip variant="flat" className="font-mono">
                        {jobStatus.job_id}
                      </Chip>
                    </div>
                    
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-2">Status:</p>
                      <Chip
                        variant="flat"
                        color={
                          jobStatus.status === 'completed' ? 'success' :
                          jobStatus.status === 'failed' ? 'danger' :
                          jobStatus.status === 'processing' ? 'warning' :
                          'primary'
                        }
                        size="lg"
                      >
                        {jobStatus.status.toUpperCase()}
                      </Chip>
                    </div>
                  </div>
                  
                  {jobStatus.message && (
                    <Card className="bg-gray-100">
                      <CardBody>
                        <p className="text-gray-700">{jobStatus.message}</p>
                      </CardBody>
                    </Card>
                  )}
                  
                  {polling && (
                    <Card className="bg-blue-50 border border-blue-200">
                      <CardBody>
                        <div className="flex items-center space-x-3">
                          <Progress
                            size="sm"
                            isIndeterminate
                            color="primary"
                            className="flex-1"
                          />
                          <p className="text-blue-700 font-semibold">AI is processing your content...</p>
                        </div>
                      </CardBody>
                    </Card>
                  )}
                  
                  {jobStatus.status === 'completed' && (
                    <Card className="bg-green-50 border border-green-200">
                      <CardBody>
                        <div className="flex items-center space-x-3">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <p className="text-green-700 font-semibold">Processing complete! Redirecting to results...</p>
                        </div>
                      </CardBody>
                    </Card>
                  )}
                </CardBody>
              </Card>
            </>
          )}
        </Card>
      </div>

      {/* Features Grid */}
      <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
        <Card className="bg-white/60 backdrop-blur-sm border border-white/20 hover:shadow-xl transition-all duration-300">
          <CardBody className="p-6 text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-3">Smart Transcription</h3>
            <p className="text-gray-600 text-sm">AI-powered speech recognition with speaker identification and timestamp precision.</p>
          </CardBody>
        </Card>

        <Card className="bg-white/60 backdrop-blur-sm border border-white/20 hover:shadow-xl transition-all duration-300">
          <CardBody className="p-6 text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-3">Action Extraction</h3>
            <p className="text-gray-600 text-sm">Automatically identify action items, assignments, and deadlines from your meetings.</p>
          </CardBody>
        </Card>

        <Card className="bg-white/60 backdrop-blur-sm border border-white/20 hover:shadow-xl transition-all duration-300">
          <CardBody className="p-6 text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-3">Intelligent Search</h3>
            <p className="text-gray-600 text-sm">Search across all your meeting content with AI-powered relevance ranking.</p>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

export default UploadPage
