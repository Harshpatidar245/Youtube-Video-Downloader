import mongoose from 'mongoose';

const clipSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  duration: { type: Number, required: true },
  size: { type: Number, required: true },
  thumbnail: { type: String },
  downloadUrl: { type: String, required: true }
});

const processingJobSchema = new mongoose.Schema({
  jobId: { type: String, required: true, unique: true },
  originalFilename: { type: String, required: true },
  youtubeUrl: { type: String },
  clipDuration: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'failed'], 
    default: 'pending' 
  },
  progress: { type: Number, default: 0 },
  clips: [clipSchema],
  zipFile: { type: String },
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
  error: { type: String }
});

export default mongoose.model('ProcessingJob', processingJobSchema);