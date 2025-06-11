import React, { useState, useEffect } from 'react';
import { Upload, Link, Download, Play, Clock, FileText, Zap } from 'lucide-react';
import io from 'socket.io-client';
import VideoUpload from './components/VideoUpload';
import ProcessingStatus from './components/ProcessingStatus';
import ClipResults from './components/ClipResults';
import ProcessingHistory from './components/ProcessingHistory';

const socket = io('http://localhost:3001');

function App() {
  const [currentJob, setCurrentJob] = useState(null);
  const [activeTab, setActiveTab] = useState('upload');
  const [processingJobs, setProcessingJobs] = useState({});

  useEffect(() => {
    socket.on('progress', (data) => {
      setProcessingJobs(prev => ({
        ...prev,
        [data.jobId]: { ...prev[data.jobId], ...data }
      }));
    });

    socket.on('completed', (data) => {
      setProcessingJobs(prev => ({
        ...prev,
        [data.jobId]: { ...prev[data.jobId], status: 'completed', ...data }
      }));
    });

    socket.on('error', (data) => {
      setProcessingJobs(prev => ({
        ...prev,
        [data.jobId]: { ...prev[data.jobId], status: 'error', error: data.error }
      }));
    });

    return () => {
      socket.off('progress');
      socket.off('completed');
      socket.off('error');
    };
  }, []);

  const handleJobStart = (jobData) => {
    setCurrentJob(jobData.jobId);
    setProcessingJobs(prev => ({
      ...prev,
      [jobData.jobId]: { ...jobData, status: 'processing', progress: 0 }
    }));
    setActiveTab('processing');
  };

  const tabs = [
    { id: 'upload', label: 'Upload Video', icon: Upload },
    { id: 'processing', label: 'Processing', icon: Zap },
    { id: 'history', label: 'History', icon: FileText }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl">
              <Play className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Reel Splitter
            </h1>
          </div>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Transform your videos into perfect Instagram Reels and YouTube Shorts. 
            Upload any video or paste a YouTube link to get started.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-2 flex gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="max-w-6xl mx-auto">
          {activeTab === 'upload' && (
            <VideoUpload onJobStart={handleJobStart} />
          )}
          
          {activeTab === 'processing' && (
            <div className="space-y-8">
              {currentJob && processingJobs[currentJob] && (
                <ProcessingStatus job={processingJobs[currentJob]} />
              )}
              
              {currentJob && processingJobs[currentJob]?.status === 'completed' && (
                <ClipResults job={processingJobs[currentJob]} />
              )}
              
              {!currentJob && (
                <div className="text-center py-16">
                  <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-xl text-gray-400">No active processing jobs</p>
                  <p className="text-gray-500 mt-2">Upload a video to get started</p>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'history' && <ProcessingHistory />}
        </div>
      </div>
    </div>
  );
}

export default App;