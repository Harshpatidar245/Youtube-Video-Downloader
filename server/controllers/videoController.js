import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';

const OUTPUT_DIR = 'output/';

// Helper: Convert and trim video
const processVideo = (inputPath, outputName, duration) => {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(OUTPUT_DIR, outputName);

    ffmpeg(inputPath)
      .setStartTime(0)
      .duration(duration)
      .size('720x1280')
      .outputOptions(['-preset fast'])
      .output(outputPath)
      .on('end', () => resolve({ outputPath }))
      .on('error', reject)
      .run();
  });
};

// File Upload Controller
export const handleFileUpload = async (req, res) => {
  try {
    const file = req.file;
    const { duration } = req.body;

    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const outputName = `processed-${file.filename}`;
    const clipDuration = parseInt(duration || 60);

    const result = await processVideo(file.path, outputName, clipDuration);

    return res.status(200).json({
      message: 'File processed successfully',
      downloadUrl: `/output/${outputName}`,
      filename: file.originalname,
      size: file.size,
      duration: clipDuration
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Video processing failed' });
  }
};

// YouTube URL Processing
export const handleYouTubeDownload = async (req, res) => {
  try {
    const { url, duration } = req.body;

    if (!url) return res.status(400).json({ error: 'YouTube URL is required' });

    const tempFile = `yt-${Date.now()}.mp4`;
    const outputPath = path.join('uploads', tempFile);

    // Use yt-dlp to download
    const ytProcess = spawn('yt-dlp', ['-o', outputPath, '-f', 'mp4', url]);

    ytProcess.stderr.on('data', data => console.error(`yt-dlp error: ${data}`));

    ytProcess.on('close', async (code) => {
      if (code !== 0) {
        return res.status(500).json({ error: 'Failed to download YouTube video' });
      }

      const outputName = `processed-${tempFile}`;
      try {
        const result = await processVideo(outputPath, outputName, parseInt(duration || 60));
        return res.status(200).json({
          message: 'YouTube video processed',
          downloadUrl: `/output/${outputName}`,
        });
      } catch (err) {
        return res.status(500).json({ error: 'Error processing YouTube video' });
      }
    });

  } catch (error) {
    res.status(500).json({ error: 'YouTube processing failed' });
  }
};
