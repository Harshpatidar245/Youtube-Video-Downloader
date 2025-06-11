import React from 'react';
import { Loader2, CheckCircle, XCircle, Clock, Video } from 'lucide-react';

interface ProcessingStatusProps {
  job: {
    jobId: string;
    originalFilename?: string;
    youtubeUrl?: string;
    status: string;
    progress: number;
    message?: string;
    error?: string;
    clipDuration: number;
  };
}

const ProcessingStatus: React.FC<ProcessingStatusProps> = ({ job }) => {
  const getStatusIcon = () => {
    switch (job.status) {
      case 'completed':
        return <CheckCircle className="w-8 h-8 text-green-500" />;
      case 'failed':
      case 'error':
        return <XCircle className="w-8 h-8 text-red-500" />;
      case 'processing':
        return <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />;
      default:
        return <Clock className="w-8 h-8 text-yellow-500" />;
    }
  };

  const getStatusColor = () => {
    switch (job.status) {
      case 'completed':
        return 'text-green-400';
      case 'failed':
      case 'error':
        return 'text-red-400';
      case 'processing':
        return 'text-purple-400';
      default:
        return 'text-yellow-400';
    }
  };

  const getStatusText = () => {
    switch (job.status) {
      case 'completed':
        return 'Processing Complete';
      case 'failed':
      case 'error':
        return 'Processing Failed';
      case 'processing':
        return 'Processing Video';
      default:
        return 'Pending';
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20">
      <div className="flex items-center gap-4 mb-6">
        {getStatusIcon()}
        <div>
          <h2 className={`text-2xl font-bold ${getStatusColor()}`}>
            {getStatusText()}
          </h2>
          <p className="text-gray-300">
            {job.originalFilename || 'YouTube Video'} • {job.clipDuration}s clips
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      {job.status === 'processing' && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white font-medium">
              {job.message || 'Processing...'}
            </span>
            <span className="text-purple-400 font-bold">
              {Math.round(job.progress)}%
            </span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-4">
            <div
              className="bg-gradient-to-r from-purple-500 to-blue-500 h-4 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
              style={{ width: `${job.progress}%` }}
            >
              {job.progress > 10 && (
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {job.status === 'failed' || job.status === 'error' ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-red-400 mb-1">Error Details:</p>
              <p className="text-red-300 text-sm">
                {job.error || 'An unexpected error occurred during processing.'}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Processing Steps */}
      {job.status === 'processing' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { step: 'Upload', completed: job.progress > 10 },
            { step: 'Analyze', completed: job.progress > 25 },
            { step: 'Split & Convert', completed: job.progress > 80 },
            { step: 'Package', completed: job.progress >= 100 }
          ].map((item, index) => (
            <div
              key={index}
              className={`text-center p-4 rounded-xl border transition-all duration-300 ${
                item.completed
                  ? 'bg-green-500/10 border-green-500/20 text-green-400'
                  : job.progress > (index * 25)
                  ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                  : 'bg-white/5 border-white/10 text-gray-500'
              }`}
            >
              <Video className="w-6 h-6 mx-auto mb-2" />
              <p className="font-medium">{item.step}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProcessingStatus;