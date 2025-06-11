import ffmpeg from 'fluent-ffmpeg';
import ytdl from 'ytdl-core';
import path from 'path';
import fs from 'fs';
import archiver from 'archiver';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import ProcessingJob from '../models/ProcessingJob.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set FFmpeg path (you may need to adjust this based on your system)
// ffmpeg.setFfmpegPath('/usr/bin/ffmpeg');
// ffmpeg.setFfprobePath('/usr/bin/ffprobe');

export const processVideo = async (inputPath, jobId, clipDuration, io) => {
  try {
    // Update job status
    await ProcessingJob.findOneAndUpdate(
      { jobId },
      { status: 'processing', progress: 10 }
    );

    io.emit('progress', { jobId, progress: 10, message: 'Analyzing video...' });

    // Create output directory
    const outputDir = path.join(__dirname, '../output', jobId);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Get video metadata
    const metadata = await getVideoMetadata(inputPath);
    const videoDuration = metadata.duration;
    const numberOfClips = Math.ceil(videoDuration / clipDuration);

    io.emit('progress', { 
      jobId, 
      progress: 20, 
      message: `Creating ${numberOfClips} clips...` 
    });

    const clips = [];
    
    // Process each clip
    for (let i = 0; i < numberOfClips; i++) {
      const startTime = i * clipDuration;
      const actualDuration = Math.min(clipDuration, videoDuration - startTime);
      
      if (actualDuration <= 0) break;

      const outputFilename = `clip_${i + 1}.mp4`;
      const outputPath = path.join(outputDir, outputFilename);
      
      await processClip(inputPath, outputPath, startTime, actualDuration);
      
      // Generate thumbnail
      const thumbnailPath = await generateThumbnail(outputPath, outputDir, i + 1);
      
      const stats = fs.statSync(outputPath);
      clips.push({
        filename: outputFilename,
        duration: actualDuration,
        size: stats.size,
        thumbnail: thumbnailPath ? `thumbnail_${i + 1}.jpg` : null,
        downloadUrl: `/api/download/${jobId}/${outputFilename}`
      });

      const progress = 20 + ((i + 1) / numberOfClips) * 60;
      io.emit('progress', { 
        jobId, 
        progress, 
        message: `Processed clip ${i + 1} of ${numberOfClips}` 
      });
    }

    // Create zip file
    io.emit('progress', { jobId, progress: 85, message: 'Creating zip file...' });
    const zipFilename = await createZipFile(outputDir, jobId, clips);

    // Update job with completion
    await ProcessingJob.findOneAndUpdate(
      { jobId },
      {
        status: 'completed',
        progress: 100,
        clips,
        zipFile: zipFilename,
        completedAt: new Date()
      }
    );

    // Clean up original file
    fs.unlinkSync(inputPath);

    io.emit('progress', { jobId, progress: 100, message: 'Processing complete!' });
    io.emit('completed', { jobId, clips, zipFile: zipFilename });

  } catch (error) {
    console.error('Processing error:', error);
    
    await ProcessingJob.findOneAndUpdate(
      { jobId },
      { status: 'failed', error: error.message }
    );

    io.emit('error', { jobId, error: error.message });
  }
};

export const processYouTubeVideo = async (url, jobId, clipDuration, io) => {
  try {
    // Update job status
    await ProcessingJob.findOneAndUpdate(
      { jobId },
      { status: 'processing', progress: 5 }
    );

    io.emit('progress', { jobId, progress: 5, message: 'Downloading YouTube video...' });

    // Download video
    const tempFilename = `${jobId}-youtube.mp4`;
    const tempPath = path.join(__dirname, '../uploads', tempFilename);
    
    await downloadYouTubeVideo(url, tempPath, (progress) => {
      io.emit('progress', { 
        jobId, 
        progress: 5 + (progress * 0.15), 
        message: `Downloading... ${Math.round(progress)}%` 
      });
    });

    io.emit('progress', { jobId, progress: 20, message: 'Download complete. Processing video...' });

    // Process the downloaded video
    await processVideo(tempPath, jobId, clipDuration, io);

  } catch (error) {
    console.error('YouTube processing error:', error);
    
    await ProcessingJob.findOneAndUpdate(
      { jobId },
      { status: 'failed', error: error.message }
    );

    io.emit('error', { jobId, error: error.message });
  }
};

const getVideoMetadata = (inputPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) reject(err);
      else resolve(metadata.format);
    });
  });
};

const processClip = (inputPath, outputPath, startTime, duration) => {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .seekInput(startTime)
      .duration(duration)
      .videoFilters([
        'scale=720:1280:force_original_aspect_ratio=increase',
        'crop=720:1280'
      ])
      .videoBitrate('2000k')
      .audioBitrate('128k')
      .output(outputPath)
      .on('end', resolve)
      .on('error', reject)
      .run();
  });
};

const generateThumbnail = (videoPath, outputDir, clipNumber) => {
  return new Promise((resolve, reject) => {
    const thumbnailPath = path.join(outputDir, `thumbnail_${clipNumber}.jpg`);
    
    ffmpeg(videoPath)
      .screenshots({
        timestamps: ['10%'],
        filename: `thumbnail_${clipNumber}.jpg`,
        folder: outputDir,
        size: '360x640'
      })
      .on('end', () => resolve(thumbnailPath))
      .on('error', (err) => {
        console.error('Thumbnail generation error:', err);
        resolve(null);
      });
  });
};

const downloadYouTubeVideo = (url, outputPath, progressCallback) => {
  return new Promise((resolve, reject) => {
    try {
      const video = ytdl(url, { 
        quality: 'highest',
        filter: format => format.container === 'mp4'
      });
      
      const stream = fs.createWriteStream(outputPath);
      let downloadedBytes = 0;
      let totalBytes = 0;
      
      video.on('info', (info) => {
        const format = ytdl.chooseFormat(info.formats, { 
          quality: 'highest',
          filter: format => format.container === 'mp4'
        });
        totalBytes = parseInt(format.contentLength) || 0;
      });
      
      video.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        if (totalBytes > 0) {
          const progress = (downloadedBytes / totalBytes) * 100;
          progressCallback(progress);
        }
      });
      
      video.pipe(stream);
      
      stream.on('finish', resolve);
      video.on('error', reject);
      stream.on('error', reject);
      
    } catch (error) {
      reject(error);
    }
  });
};

const createZipFile = (outputDir, jobId, clips) => {
  return new Promise((resolve, reject) => {
    const zipFilename = `${jobId}-clips.zip`;
    const zipPath = path.join(__dirname, '../output', zipFilename);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve(zipFilename));
    archive.on('error', reject);
    archive.pipe(output);

    // Add all clips to the zip
    clips.forEach(clip => {
      const filePath = path.join(outputDir, clip.filename);
      archive.file(filePath, { name: clip.filename });
    });

    archive.finalize();
  });
};