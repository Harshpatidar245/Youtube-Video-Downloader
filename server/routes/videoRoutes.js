import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs'; // ✅ Imported fs
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { processVideo, processYouTubeVideo } from '../services/videoProcessor.js';
import ProcessingJob from '../models/ProcessingJob.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /mp4|avi|mov|wmv|flv|webm|mkv/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'));
    }
  },
  limits: { fileSize: 500 * 1024 * 1024 }
});

router.post('/upload', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No video file uploaded' });

    const { clipDuration = 90 } = req.body;
    const jobId = uuidv4();

    const job = new ProcessingJob({
      jobId,
      originalFilename: req.file.originalname,
      clipDuration: parseInt(clipDuration)
    });
    await job.save();

    processVideo(req.file.path, jobId, parseInt(clipDuration), req.io);

    res.json({ 
      jobId, 
      message: 'Video uploaded successfully. Processing started.',
      filename: req.file.originalname
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload video' });
  }
});

router.post('/youtube', async (req, res) => {
  try {
    const { url, clipDuration = 90 } = req.body;
    if (!url) return res.status(400).json({ error: 'YouTube URL is required' });

    const jobId = uuidv4();

    const job = new ProcessingJob({
      jobId,
      originalFilename: 'YouTube Video',
      youtubeUrl: url,
      clipDuration: parseInt(clipDuration)
    });
    await job.save();

    processYouTubeVideo(url, jobId, parseInt(clipDuration), req.io);

    res.json({ 
      jobId, 
      message: 'YouTube video processing started.',
      url
    });
  } catch (error) {
    console.error('YouTube processing error:', error);
    res.status(500).json({ error: 'Failed to process YouTube video' });
  }
});

router.get('/status/:jobId', async (req, res) => {
  try {
    const job = await ProcessingJob.findOne({ jobId: req.params.jobId });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ error: 'Failed to get job status' });
  }
});

router.get('/download/:jobId/:filename', async (req, res) => {
  try {
    const filePath = path.join(__dirname, '../output', req.params.jobId, req.params.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
    res.download(filePath);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

router.get('/download-all/:jobId', async (req, res) => {
  try {
    const job = await ProcessingJob.findOne({ jobId: req.params.jobId });
    if (!job || !job.zipFile) return res.status(404).json({ error: 'Zip file not found' });

    const zipPath = path.join(__dirname, '../output', job.zipFile);
    if (!fs.existsSync(zipPath)) return res.status(404).json({ error: 'Zip file not found' });

    res.download(zipPath);
  } catch (error) {
    console.error('Download all error:', error);
    res.status(500).json({ error: 'Failed to download zip file' });
  }
});

router.get('/history', async (req, res) => {
  try {
    const jobs = await ProcessingJob.find().sort({ createdAt: -1 }).limit(20).select('-__v');
    res.json(jobs);
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ error: 'Failed to get processing history' });
  }
});

export default router;
