import React, { useState } from 'react'
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Input,
  Spacer,
  Divider,
  Progress,
  Chip,
  CardFooter
} from '@heroui/react'
import { CloudUpload, FileText, Image, Video, Mic } from 'lucide-react'

interface UploadedFiles {
  text?: File | null
  media?: File | null
  slides: File[]
}

const UploadPage: React.FC = () => {
  const [files, setFiles] = useState<UploadedFiles>({
    text: null,
    media: null,
    slides: []
  })
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [urls, setUrls] = useState('')

  const handleFileUpload = (type: keyof UploadedFiles, file: File | File[]) => {
    if (type === 'slides' && Array.isArray(file)) {
      setFiles(prev => ({ ...prev, slides: file }))
    } else if (type !== 'slides' && !Array.isArray(file)) {
      setFiles(prev => ({ ...prev, [type]: file }))
    }
  }

  const removeFile = (type: keyof UploadedFiles, index?: number) => {
    if (type === 'slides' && typeof index === 'number') {
      setFiles(prev => ({
        ...prev,
        slides: prev.slides.filter((_, i) => i !== index)
      }))
    } else if (type !== 'slides') {
      setFiles(prev => ({ ...prev, [type]: null }))
    }
  }

  const handleSubmit = async () => {
    setUploading(true)
    setUploadProgress(0)
    
    // Simulate upload progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 200))
      setUploadProgress(i)
    }
    
    setUploading(false)
    // Handle the actual upload logic here
  }

  const renderFileUploadCard = (
    title: string,
    description: string,
    icon: React.ReactNode,
    acceptedTypes: string,
    currentFile: File | null,
    onUpload: (file: File) => void,
    onRemove: () => void
  ) => (
    <Card className="h-full">
      <CardHeader className="flex flex-col items-center p-6">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-center">{title}</h3>
        <p className="text-sm text-default-500 text-center">{description}</p>
      </CardHeader>
      <CardBody className="px-6 pb-6">
        {currentFile ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-success-50 rounded-lg border border-success-200">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-success-600" />
                <span className="text-sm font-medium text-success-700">
                  {currentFile.name}
                </span>
              </div>
              <Button
                size="sm"
                variant="light"
                color="danger"
                onClick={onRemove}
              >
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <label className="block cursor-pointer">
            <input
              type="file"
              accept={acceptedTypes}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) onUpload(file)
              }}
              className="hidden"
            />
            <div className="border-2 border-dashed border-default-300 rounded-lg p-6 text-center hover:border-primary transition-colors">
              <CloudUpload className="w-8 h-8 mx-auto mb-2 text-default-400" />
              <p className="text-sm text-default-600">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-default-400 mt-1">
                {acceptedTypes}
              </p>
            </div>
          </label>
        )}
      </CardBody>
    </Card>
  )

  return (
    <div className="container mx-auto max-w-6xl p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Upload Content</h1>
        <p className="text-default-600">
          Upload your documents, media files, and presentation slides to create a searchable knowledge base.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {renderFileUploadCard(
          'Text Documents',
          'Upload PDFs, Word docs, or text files',
          <FileText className="w-6 h-6 text-primary" />,
          '.pdf,.doc,.docx,.txt',
          files.text,
          (file) => handleFileUpload('text', file),
          () => removeFile('text')
        )}

        {renderFileUploadCard(
          'Media Files',
          'Upload videos or audio recordings',
          files.media?.type.startsWith('video/') ? 
            <Video className="w-6 h-6 text-primary" /> : 
            <Mic className="w-6 h-6 text-primary" />,
          '.mp4,.mp3,.wav,.mov,.avi',
          files.media,
          (file) => handleFileUpload('media', file),
          () => removeFile('media')
        )}

        <Card className="h-full">
          <CardHeader className="flex flex-col items-center p-6">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <Image className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-center">Presentation Slides</h3>
            <p className="text-sm text-default-500 text-center">
              Upload multiple slide images or PDFs
            </p>
          </CardHeader>
          <CardBody className="px-6 pb-6">
            {files.slides.length > 0 ? (
              <div className="space-y-3">
                {files.slides.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-success-50 rounded-lg border border-success-200">
                    <div className="flex items-center space-x-2">
                      <Image className="w-4 h-4 text-success-600" />
                      <span className="text-sm font-medium text-success-700">
                        {file.name}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="light"
                      color="danger"
                      onClick={() => removeFile('slides', index)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <label className="block cursor-pointer">
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf,.ppt,.pptx"
                    multiple
                    onChange={(e) => {
                      const newFiles = Array.from(e.target.files || [])
                      if (newFiles.length > 0) {
                        setFiles(prev => ({
                          ...prev,
                          slides: [...prev.slides, ...newFiles]
                        }))
                      }
                    }}
                    className="hidden"
                  />
                  <Button
                    variant="bordered"
                    size="sm"
                    startContent={<CloudUpload className="w-4 h-4" />}
                    className="w-full"
                  >
                    Add More Slides
                  </Button>
                </label>
              </div>
            ) : (
              <label className="block cursor-pointer">
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf,.ppt,.pptx"
                  multiple
                  onChange={(e) => {
                    const newFiles = Array.from(e.target.files || [])
                    if (newFiles.length > 0) {
                      handleFileUpload('slides', newFiles)
                    }
                  }}
                  className="hidden"
                />
                <div className="border-2 border-dashed border-default-300 rounded-lg p-6 text-center hover:border-primary transition-colors">
                  <CloudUpload className="w-8 h-8 mx-auto mb-2 text-default-400" />
                  <p className="text-sm text-default-600">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-default-400 mt-1">
                    .jpg, .png, .pdf, .ppt, .pptx
                  </p>
                </div>
              </label>
            )}
          </CardBody>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <h3 className="text-lg font-semibold">Additional Sources</h3>
        </CardHeader>
        <CardBody>
          <Input
            label="URLs"
            placeholder="Enter URLs separated by commas or new lines"
            value={urls}
            onChange={(e) => setUrls(e.target.value)}
            description="Add web pages or online resources to include in your knowledge base"
          />
        </CardBody>
      </Card>

      {(files.text || files.media || files.slides.length > 0 || urls.trim()) && (
        <>
          <Spacer y={6} />
          <Card className="bg-success-50 border border-success-200">
            <CardHeader className="pb-3">
              <h3 className="text-lg font-semibold text-success-800">
                Ready to Upload
              </h3>
            </CardHeader>
            <CardBody className="pt-0">
              <div className="space-y-2 mb-4">
                {files.text && (
                  <Chip color="success" variant="flat" size="sm">
                    Text: {files.text.name}
                  </Chip>
                )}
                {files.media && (
                  <Chip color="success" variant="flat" size="sm">
                    Media: {files.media.name}
                  </Chip>
                )}
                {files.slides.length > 0 && (
                  <Chip color="success" variant="flat" size="sm">
                    Slides: {files.slides.length} files
                  </Chip>
                )}
                {urls.trim() && (
                  <Chip color="success" variant="flat" size="sm">
                    URLs: {urls.split(/[,\n]/).filter(u => u.trim()).length} sources
                  </Chip>
                )}
              </div>
              
              {uploading && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} color="success" />
                </div>
              )}
            </CardBody>
            <CardFooter>
              <Button
                color="success"
                size="lg"
                onClick={handleSubmit}
                disabled={uploading}
                startContent={!uploading && <CloudUpload className="w-5 h-5" />}
                className="w-full"
              >
                {uploading ? 'Processing...' : 'Upload and Process'}
              </Button>
            </CardFooter>
          </Card>
        </>
      )}
    </div>
  )
}

export default UploadPage
