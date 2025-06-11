import React, { useState, useCallback } from 'react';
import { Upload, Link, Clock, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface VideoUploadProps {
  onJobStart: (jobData: any) => void;
}

const VideoUpload: React.FC<VideoUploadProps> = ({ onJobStart }) => {
  const [uploadMethod, setUploadMethod] = useState<'file' | 'youtube'>('file');
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [clipDuration, setClipDuration] = useState(90);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadStats, setUploadStats] = useState({
    uploadedBytes: 0,
    totalBytes: 0,
    uploadSpeed: 0,
    estimatedTimeRemaining: 0,
    startTime: 0
  });

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setError(null);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      validateAndSetFile(file);
    }
  }, []);

  const validateAndSetFile = (file: File) => {
    console.log('Selected file:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    });

    // Validate file type
    if (!file.type.startsWith('video/')) {
      setError('Please select a video file');
      return;
    }

    // Validate file size (500MB = 524288000 bytes)
    if (file.size > 524288000) {
      setError('File size exceeds 500MB limit');
      return;
    }

    setSelectedFile(file);
    setError(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSecond: number) => {
    if (bytesPerSecond === 0) return '0 KB/s';
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
    return parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatTime = (seconds: number) => {
    if (seconds === Infinity || isNaN(seconds) || seconds <= 0) return '--:--';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Simple upload progress simulation for fetch (since fetch doesn't have built-in progress tracking)
  const simulateUploadProgress = (file: File, onProgress: (progress: number) => void) => {
    const totalSize = file.size;
    let uploadedSize = 0;
    const startTime = Date.now();

    const interval = setInterval(() => {
      // Simulate upload progress
      uploadedSize += Math.min(totalSize * 0.1, totalSize - uploadedSize);
      const progress = Math.round((uploadedSize / totalSize) * 100);
      
      const currentTime = Date.now();
      const elapsedTime = (currentTime - startTime) / 1000;
      const uploadSpeed = elapsedTime > 0 ? uploadedSize / elapsedTime : 0;
      const remainingBytes = totalSize - uploadedSize;
      const estimatedTimeRemaining = uploadSpeed > 0 ? remainingBytes / uploadSpeed : 0;

      setUploadStats({
        uploadedBytes: uploadedSize,
        totalBytes: totalSize,
        uploadSpeed,
        estimatedTimeRemaining,
        startTime
      });

      onProgress(progress);

      if (progress >= 100) {
        clearInterval(interval);
      }
    }, 500);

    return interval;
  };

  const handleUpload = async () => {
    if (!selectedFile && !youtubeUrl.trim()) return;

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);
    
    const startTime = Date.now();
    setUploadStats({
      uploadedBytes: 0,
      totalBytes: selectedFile?.size || 0,
      uploadSpeed: 0,
      estimatedTimeRemaining: 0,
      startTime
    });

    let progressInterval: NodeJS.Timeout | null = null;

    try {
      console.log('Starting upload...', { uploadMethod, selectedFile, youtubeUrl, clipDuration });

      if (uploadMethod === 'file' && selectedFile) {
        const formData = new FormData();
        formData.append('video', selectedFile);
        formData.append('clipDuration', clipDuration.toString());

        console.log('FormData created, making request to /api/upload');

        // Start progress simulation
        progressInterval = simulateUploadProgress(selectedFile, setUploadProgress);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (progressInterval) {
          clearInterval(progressInterval);
        }

        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(`Server error ${response.status}: ${errorData}`);
        }

        const responseData = await response.json();
        console.log('Upload successful:', responseData);
        setUploadProgress(100);
        onJobStart(responseData);
      } else if (uploadMethod === 'youtube' && youtubeUrl.trim()) {
        console.log('Processing YouTube URL:', youtubeUrl);

        const response = await fetch('/api/youtube', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: youtubeUrl.trim(),
            clipDuration
          }),
        });

        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(`Server error ${response.status}: ${errorData}`);
        }

        const responseData = await response.json();
        console.log('YouTube processing successful:', responseData);
        onJobStart(responseData);
      }

      // Reset form
      setSelectedFile(null);
      setYoutubeUrl('');
      setUploadProgress(0);
      setUploadStats({
        uploadedBytes: 0,
        totalBytes: 0,
        uploadSpeed: 0,
        estimatedTimeRemaining: 0,
        startTime: 0
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      
      // Enhanced error handling
      let errorMessage = 'Upload failed. Please try again.';
      
      if (error.message.includes('Server error')) {
        errorMessage = error.message;
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Upload failed: Network error. Check if the server is running.';
      } else {
        errorMessage = `Upload failed: ${error.message}`;
      }
      
      setError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const presetDurations = [30, 60, 90, 120];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20">
        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div className="text-red-200">
                <p className="font-medium">Error</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Upload Method Selection */}
        <div className="flex justify-center mb-8">
          <div className="bg-white/10 rounded-2xl p-2 flex gap-2">
            <button
              onClick={() => {
                setUploadMethod('file');
                setError(null);
              }}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                uploadMethod === 'file'
                  ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              <Upload className="w-5 h-5" />
              Upload File
            </button>
            <button
              onClick={() => {
                setUploadMethod('youtube');
                setError(null);
              }}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                uploadMethod === 'youtube'
                  ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              <Link className="w-5 h-5" />
              YouTube URL
            </button>
          </div>
        </div>

        {/* File Upload */}
        {uploadMethod === 'file' && (
          <div className="mb-8">
            <div
              className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-200 ${
                dragActive
                  ? 'border-purple-400 bg-purple-500/10'
                  : error
                  ? 'border-red-400 bg-red-500/5'
                  : 'border-gray-600 hover:border-gray-500'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isUploading}
              />
              
              {selectedFile ? (
                <div className="flex items-center justify-center gap-4">
                  <CheckCircle className="w-12 h-12 text-green-500" />
                  <div className="text-left">
                    <p className="text-xl font-semibold text-white">{selectedFile.name}</p>
                    <p className="text-gray-300">{formatFileSize(selectedFile.size)}</p>
                  </div>
                </div>
              ) : (
                <div>
                  <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-xl font-semibold text-white mb-2">
                    Drop your video here or click to browse
                  </p>
                  <p className="text-gray-300">
                    Supports MP4, AVI, MOV, WMV, FLV, WebM, MKV (Max 500MB)
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* YouTube URL Input */}
        {uploadMethod === 'youtube' && (
          <div className="mb-8">
            <label className="block text-white font-medium mb-4">
              YouTube Video URL
            </label>
            <div className="relative">
              <Link className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="url"
                value={youtubeUrl}
                onChange={(e) => {
                  setYoutubeUrl(e.target.value);
                  setError(null);
                }}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={isUploading}
              />
            </div>
          </div>
        )}

        {/* Clip Duration Settings */}
        <div className="mb-8">
          <label className="block text-white font-medium mb-4">
            <Clock className="inline w-5 h-5 mr-2" />
            Clip Duration (seconds)
          </label>
          
          <div className="flex flex-wrap gap-3 mb-4">
            {presetDurations.map((duration) => (
              <button
                key={duration}
                onClick={() => setClipDuration(duration)}
                disabled={isUploading}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                  clipDuration === duration
                    ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                {duration}s
              </button>
            ))}
          </div>
          
          <input
            type="range"
            min="15"
            max="300"
            value={clipDuration}
            onChange={(e) => setClipDuration(parseInt(e.target.value))}
            disabled={isUploading}
            className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider disabled:opacity-50 disabled:cursor-not-allowed"
          />
          
          <div className="flex justify-between text-sm text-gray-400 mt-2">
            <span>15s</span>
            <span className="font-medium text-white">{clipDuration}s</span>
            <span>5min</span>
          </div>
        </div>

        {/* Enhanced Upload Progress */}
        {isUploading && (
          <div className="mb-8 bg-white/5 rounded-2xl p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
              <h3 className="text-lg font-semibold text-white">
                {uploadMethod === 'file' ? 'Uploading Video...' : 'Processing YouTube Video...'}
              </h3>
            </div>
            
            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-medium">Progress</span>
                <span className="text-purple-400 font-bold text-lg">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-4 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-purple-500 to-blue-500 h-4 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                  style={{ width: `${uploadProgress}%` }}
                >
                  {uploadProgress > 10 && (
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  )}
                </div>
              </div>
            </div>

            {/* Upload Statistics */}
            {uploadMethod === 'file' && selectedFile && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/10 rounded-lg p-3 text-center">
                  <div className="text-sm text-gray-400 mb-1">Uploaded</div>
                  <div className="text-white font-semibold">
                    {formatFileSize(uploadStats.uploadedBytes)}
                  </div>
                  <div className="text-xs text-gray-500">
                    of {formatFileSize(uploadStats.totalBytes)}
                  </div>
                </div>
                
                <div className="bg-white/10 rounded-lg p-3 text-center">
                  <div className="text-sm text-gray-400 mb-1">Speed</div>
                  <div className="text-green-400 font-semibold">
                    {formatSpeed(uploadStats.uploadSpeed)}
                  </div>
                </div>
                
                <div className="bg-white/10 rounded-lg p-3 text-center">
                  <div className="text-sm text-gray-400 mb-1">Time Left</div>
                  <div className="text-blue-400 font-semibold">
                    {formatTime(uploadStats.estimatedTimeRemaining)}
                  </div>
                </div>
                
                <div className="bg-white/10 rounded-lg p-3 text-center">
                  <div className="text-sm text-gray-400 mb-1">File Size</div>
                  <div className="text-purple-400 font-semibold">
                    {formatFileSize(selectedFile.size)}
                  </div>
                </div>
              </div>
            )}

            {/* YouTube Processing Message */}
            {uploadMethod === 'youtube' && (
              <div className="text-center py-4">
                <p className="text-gray-300 mb-2">
                  Downloading and processing YouTube video...
                </p>
                <p className="text-sm text-gray-400">
                  This may take a few minutes depending on video length and quality
                </p>
              </div>
            )}
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-8">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-200">
              <p className="font-medium mb-1">Processing Info:</p>
              <ul className="space-y-1 text-blue-300">
                <li>• Videos will be converted to 720x1280 (9:16 portrait)</li>
                <li>• Perfect for Instagram Reels and YouTube Shorts</li>
                <li>• Processing time depends on video length and quality</li>
                <li>• You'll receive real-time progress updates</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Debug Info */}
        <div className="bg-gray-500/10 border border-gray-500/20 rounded-xl p-4 mb-8">
          <div className="text-sm text-gray-300">
            <p className="font-medium mb-2">Debug Info:</p>
            <p>Upload Method: {uploadMethod}</p>
            {selectedFile && <p>Selected File: {selectedFile.name} ({formatFileSize(selectedFile.size)})</p>}
            {youtubeUrl && <p>YouTube URL: {youtubeUrl}</p>}
            <p>Clip Duration: {clipDuration}s</p>
            <p className="mt-2 text-xs text-gray-400">
              Check browser console for detailed logs
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleUpload}
          disabled={
            isUploading || 
            (uploadMethod === 'file' && !selectedFile) ||
            (uploadMethod === 'youtube' && !youtubeUrl.trim())
          }
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-600 text-white font-semibold py-4 px-8 rounded-xl transition-all duration-200 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isUploading && <Loader2 className="w-5 h-5 animate-spin" />}
          {isUploading
            ? uploadMethod === 'file' 
              ? `Uploading... ${uploadProgress}%`
              : 'Processing YouTube Video...'
            : uploadMethod === 'file'
            ? 'Upload & Process Video'
            : 'Process YouTube Video'
          }
        </button>
      </div>
    </div>
  );
};

export default VideoUpload;