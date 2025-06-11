import React from 'react';
import { Download, Play, Clock, FileDown, Package } from 'lucide-react';

interface Clip {
  filename: string;
  duration: number;
  size: number;
  thumbnail?: string;
  downloadUrl: string;
}

interface ClipResultsProps {
  job: {
    jobId: string;
    clips: Clip[];
    zipFile?: string;
    originalFilename?: string;
  };
}

const ClipResults: React.FC<ClipResultsProps> = ({ job }) => {
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  // const getDownloadUrl = (clip: Clip) => `/api/output/${job.jobId}/${clip.downloadUrl}`;


  const handleDownload = (url: string, filename: string) => {
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  link.setAttribute('target', '_blank');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};


  const handleDownloadAll = () => {
    if (job.zipFile) {
      handleDownload(`/api/download-all/${job.jobId}`, `${job.jobId}-all-clips.zip`);
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">
            Processing Complete! 🎉
          </h2>
          <p className="text-gray-300">
            {job.clips.length} clips generated from {job.originalFilename || 'YouTube Video'}
          </p>
        </div>
        
        {job.zipFile && (
          <button
            onClick={handleDownloadAll}
            className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-200"
          >
            <Package className="w-5 h-5" />
            Download All
          </button>
        )}
      </div>

      {/* Clips Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {job.clips.map((clip, index) => (
          <div
            key={index}
            className="bg-white/5 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/10 hover:border-white/20 transition-all duration-200 group"
          >
            {/* Thumbnail */}
            <div className="relative aspect-[9/16] bg-gradient-to-br from-purple-500/20 to-blue-500/20">
              {clip.thumbnail ? (
                <img
                  src={`/api/output/${job.jobId}/${clip.thumbnail}`}
                  alt={`Clip ${index + 1} thumbnail`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Play className="w-16 h-16 text-white/50" />
                </div>
              )}
              
              {/* Play overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
                  <Play className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>

            {/* Clip Info */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white">
                  Clip {index + 1}
                </h3>
                <div className="flex items-center gap-1 text-gray-400 text-sm">
                  <Clock className="w-4 h-4" />
                  {formatDuration(clip.duration)}
                </div>
              </div>
              
              <p className="text-gray-400 text-sm mb-4">
                {formatFileSize(clip.size)} • 720x1280 • MP4
              </p>
              
              <button
                onClick={() => handleDownload(`/api/output/${job.jobId}/${clip.downloadUrl}`, clip.filename)}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-purple-400 mb-1">
            {job.clips.length}
          </div>
          <div className="text-gray-400 text-sm">Total Clips</div>
        </div>
        
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-400 mb-1">
            {formatFileSize(job.clips.reduce((total, clip) => total + clip.size, 0))}
          </div>
          <div className="text-gray-400 text-sm">Total Size</div>
        </div>
        
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-400 mb-1">
            720x1280
          </div>
          <div className="text-gray-400 text-sm">Resolution</div>
        </div>
      </div>
    </div>
  );
};

export default ClipResults;