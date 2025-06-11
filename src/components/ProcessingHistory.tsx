import React, { useState, useEffect } from 'react';
import { Clock, Download, CheckCircle, XCircle, Loader2, Calendar } from 'lucide-react';
import axios from 'axios';

interface HistoryJob {
  _id: string;
  jobId: string;
  originalFilename: string;
  youtubeUrl?: string;
  clipDuration: number;
  status: string;
  progress: number;
  clips: any[];
  zipFile?: string;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

const ProcessingHistory: React.FC = () => {
  const [history, setHistory] = useState<HistoryJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await axios.get('/api/history');
      setHistory(response.data);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'processing':
        return <Loader2 className="w-5 h-5 text-purple-500 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'processing':
        return 'Processing';
      default:
        return 'Pending';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDownloadAll = (jobId: string) => {
    const link = document.createElement('a');
    link.href = `/api/download-all/${jobId}`;
    link.download = `${jobId}-all-clips.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
        <span className="ml-3 text-gray-300">Loading history...</span>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-16">
        <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-xl text-gray-400">No processing history yet</p>
        <p className="text-gray-500 mt-2">Upload a video to get started</p>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20">
      <h2 className="text-3xl font-bold text-white mb-8">Processing History</h2>
      
      <div className="space-y-4">
        {history.map((job) => (
          <div
            key={job._id}
            className="bg-white/5 rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all duration-200"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {getStatusIcon(job.status)}
                <div>
                  <h3 className="font-semibold text-white text-lg">
                    {job.originalFilename}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                    <span>{formatDate(job.createdAt)}</span>
                    <span>•</span>
                    <span>{job.clipDuration}s clips</span>
                    {job.status === 'completed' && (
                      <>
                        <span>•</span>
                        <span>{job.clips.length} clips generated</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className={`font-medium ${
                    job.status === 'completed' ? 'text-green-400' :
                    job.status === 'failed' ? 'text-red-400' :
                    job.status === 'processing' ? 'text-purple-400' :
                    'text-yellow-400'
                  }`}>
                    {getStatusText(job.status)}
                  </div>
                  {job.status === 'processing' && (
                    <div className="text-sm text-gray-400">
                      {Math.round(job.progress)}%
                    </div>
                  )}
                </div>
                
                {job.status === 'completed' && job.zipFile && (
                  <button
                    onClick={() => handleDownloadAll(job.jobId)}
                    className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium px-4 py-2 rounded-lg transition-all duration-200"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                )}
              </div>
            </div>
            
            {/* Progress bar for processing jobs */}
            {job.status === 'processing' && (
              <div className="mt-4">
                <div className="w-full bg-white/20 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${job.progress}%` }}
                  />
                </div>
              </div>
            )}
            
            {/* Error message for failed jobs */}
            {job.status === 'failed' && job.error && (
              <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-red-300 text-sm">{job.error}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProcessingHistory;