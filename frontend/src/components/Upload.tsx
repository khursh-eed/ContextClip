'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Progress,
  Chip,
  Divider,
  Spacer,
  Code
} from '@heroui/react';
import { Upload as UploadIcon, FileText, Play, Search, CheckCircle, AlertCircle } from 'lucide-react';

// Palette
const BG_DARK = '#413F3D';
const BG_GRADIENT = '#697184';
const CARD = '#F2F1EF';
const TEXT_DARK = '#F2F1EF';
const TEXT_LIGHT = '#413F3D';
const ACCENT = '#697184';
const SECONDARY = '#B1A6A4';
const BORDER = '#D8CFD0';

interface JobStatus {
  job_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  message?: string;
}

const Upload = () => {
  const [files, setFiles] = useState<{ media: File | null; slides: File[] }>({ media: null, slides: [] });
  const [uploading, setUploading] = useState(false);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [polling, setPolling] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const mediaRef = useRef<HTMLInputElement>(null);
  const slidesRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFiles(prev => ({ ...prev, media: e.target.files![0] }));
    }
  };
  const handleSlidesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => ({ ...prev, slides: Array.from(e.target.files!) }));
    }
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    const mediaTypes = ['audio/', 'video/'];
    const imageTypes = ['image/', 'application/pdf'];
    droppedFiles.forEach(file => {
      if (mediaTypes.some(type => file.type.startsWith(type)) && !files.media) {
        setFiles(prev => ({ ...prev, media: file }));
      } else if (imageTypes.some(type => file.type.startsWith(type))) {
        setFiles(prev => ({ ...prev, slides: [...prev.slides, file] }));
      }
    });
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };
  const pollJobStatus = async (jobId: string) => {
    setPolling(true);
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:8000/job/${jobId}`);
        if (response.ok) {
          const jobData = await response.json();
          setJobStatus(jobData);
          if (jobData.status === 'completed') {
            clearInterval(pollInterval);
            setPolling(false);
            setTimeout(() => {
              router.push(`/results/${jobId}`);
            }, 2000);
          } else if (jobData.status === 'failed') {
            clearInterval(pollInterval);
            setPolling(false);
          }
        }
      } catch (error) {
        console.error('Error polling job status:', error);
      }
    }, 2000);
    setTimeout(() => {
      clearInterval(pollInterval);
      setPolling(false);
    }, 300000);
  };
  const handleUpload = async () => {
    if (!files.media) {
      alert('Please select a media file');
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append('media', files.media);
    files.slides.forEach(slide => {
      formData.append('slides', slide);
    });
    try {
      const response = await fetch('http://localhost:8000/upload', {
        method: 'POST',
        body: formData
      });
      if (response.ok) {
        const result = await response.json();
        setJobStatus({
          job_id: result.job_id,
          status: 'queued',
          message: result.message
        });
        pollJobStatus(result.job_id);
      } else {
        const error = await response.json();
        alert(`Upload failed: ${error.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed: Network error');
    } finally {
      setUploading(false);
    }
  };
  const clearFiles = () => {
    setFiles({ media: null, slides: [] });
    setJobStatus(null);
    if (mediaRef.current) mediaRef.current.value = '';
    if (slidesRef.current) slidesRef.current.value = '';
  };
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="flex flex-col items-center w-full">
      <Card
        className="bg-[#F2F1EF] border border-[#D8CFD0] shadow-2xl rounded-2xl px-8 py-10 w-full max-w-lg flex flex-col items-center"
      >
        <div className="flex flex-col items-center mb-6">
          <div className="w-20 h-20 flex items-center justify-center rounded-full bg-[#697184] mb-4">
            <UploadIcon className="w-10 h-10 text-[#F2F1EF]" />
          </div>
          <h2 className="text-2xl font-bold text-[#413F3D] mb-2">Upload Your Meeting</h2>
          <p className="text-[#B1A6A4] text-center">Audio, video, or slides. All files are processed securely.</p>
        </div>
        {/* Drag & Drop Zone */}
        <Card
          className={`border-2 border-dashed w-full p-8 flex flex-col items-center justify-center transition-all duration-300 cursor-pointer rounded-xl ${
            dragActive
              ? 'bg-[#697184]/20 border-[#697184]' : 'bg-[#D8CFD0] border-[#D8CFD0] hover:bg-[#697184]/10 hover:border-[#697184]'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          isPressable
        >
          <CardBody className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-[#697184] rounded-full flex items-center justify-center shadow-lg">
              <UploadIcon className="w-8 h-8 text-[#F2F1EF]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#413F3D] mb-2">
                Drop your files here, or click to browse
              </h3>
              <p className="text-[#B1A6A4] text-base">
                Supports audio, video files and presentation slides
              </p>
            </div>
          </CardBody>
        </Card>
        <Spacer y={8} />
        <div className="grid md:grid-cols-2 gap-8 w-full">
          {/* Media File Upload */}
          <Card className="border border-[#D8CFD0] bg-[#F2F1EF] hover:shadow-lg transition-all duration-300 rounded-xl">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-[#697184] rounded-xl flex items-center justify-center">
                  <Play className="w-5 h-5 text-[#F2F1EF]" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-[#413F3D]">Media File</h4>
                  <p className="text-sm text-[#B1A6A4]">Audio or video</p>
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
                <Card className="bg-[#D8CFD0] hover:bg-[#697184]/10 transition-colors cursor-pointer rounded-lg">
                  <CardBody className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-[#697184] rounded-xl flex items-center justify-center">
                        <FileText className="w-6 h-6 text-[#F2F1EF]" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-[#413F3D]">
                          {files.media ? files.media.name : 'Choose Files'}
                        </p>
                        <p className="text-sm text-[#B1A6A4]">
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
          <Card className="border border-[#D8CFD0] bg-[#F2F1EF] hover:shadow-lg transition-all duration-300 rounded-xl">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-[#697184] rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[#F2F1EF]" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-[#413F3D]">Slides</h4>
                  <p className="text-sm text-[#B1A6A4]">Images or PDFs</p>
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
                <Card className="bg-[#D8CFD0] hover:bg-[#697184]/10 transition-colors cursor-pointer rounded-lg">
                  <CardBody className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-[#697184] rounded-xl flex items-center justify-center">
                        <FileText className="w-6 h-6 text-[#F2F1EF]" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-[#413F3D]">
                          {files.slides.length > 0 ? `${files.slides.length} slide(s) selected` : 'Choose Files'}
                        </p>
                        <p className="text-sm text-[#B1A6A4]">PNG, JPG, PDF</p>
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
          <>
            <Spacer y={6} />
            <Card className="bg-[#D8CFD0] border border-[#697184] rounded-xl">
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-[#697184]" />
                  <h4 className="text-lg font-bold text-[#697184]">Selected Files</h4>
                </div>
              </CardHeader>
              <CardBody className="pt-0">
                <div className="space-y-3">
                  {files.media && (
                    <div className="flex items-center justify-between p-3 bg-[#F2F1EF] rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Play className="w-5 h-5 text-[#697184]" />
                        <span className="font-medium text-[#697184]">{files.media.name}</span>
                      </div>
                      <Chip size="sm" variant="flat" color="primary">
                        {formatFileSize(files.media.size)}
                      </Chip>
                    </div>
                  )}
                  {files.slides.map((slide, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-[#F2F1EF] rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText className="w-5 h-5 text-[#697184]" />
                        <span className="font-medium text-[#697184]">{slide.name}</span>
                      </div>
                      <Chip size="sm" variant="flat" color="primary">
                        {formatFileSize(slide.size)}
                      </Chip>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </>
        )}
        <Spacer y={8} />
        {/* Action Buttons */}
        <div className="flex space-x-4 w-full">
          <Button
            onClick={handleUpload}
            isDisabled={!files.media || uploading || polling}
            isLoading={uploading}
            color="primary"
            size="lg"
            className="flex-1 bg-[#697184] text-[#F2F1EF] font-semibold rounded-full hover:bg-[#5a6173] transition-colors"
            startContent={!uploading && <UploadIcon className="w-5 h-5" />}
          >
            {uploading ? 'Processing...' : 'Process with AI'}
          </Button>
          <Button
            onClick={clearFiles}
            isDisabled={uploading || polling}
            variant="bordered"
            size="lg"
            className="px-8 border-2 border-[#D8CFD0] text-[#413F3D] font-semibold hover:bg-[#D8CFD0] rounded-full"
          >
            Clear All
          </Button>
        </div>
        {/* Job Status */}
        {jobStatus && (
          <>
            <Divider />
            <Card className="m-6 bg-[#D8CFD0] border border-[#697184] rounded-xl">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-[#697184] rounded-xl flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-[#F2F1EF]" />
                  </div>
                  <h3 className="text-xl font-bold text-[#413F3D]">Processing Status</h3>
                </div>
              </CardHeader>
              <CardBody className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-semibold text-[#413F3D] mb-2">Job ID:</p>
                    <Code size="sm" className="bg-[#F2F1EF] text-[#413F3D]">
                      {jobStatus.job_id}
                    </Code>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#413F3D] mb-2">Status:</p>
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
                  <Card className="bg-[#F2F1EF] border border-[#D8CFD0] rounded-lg">
                    <CardBody>
                      <p className="text-[#413F3D]">{jobStatus.message}</p>
                    </CardBody>
                  </Card>
                )}
                {polling && (
                  <Card className="bg-[#697184]/10 border border-[#697184] rounded-lg">
                    <CardBody>
                      <div className="flex items-center space-x-3">
                        <Progress
                          size="sm"
                          isIndeterminate
                          color="primary"
                          className="flex-1"
                        />
                        <p className="text-[#697184] font-semibold">AI is processing your content...</p>
                      </div>
                    </CardBody>
                  </Card>
                )}
                {jobStatus.status === 'completed' && (
                  <Card className="bg-green-50 border border-green-200 rounded-lg">
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
  );
};

export default Upload;
