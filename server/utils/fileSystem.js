import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const setupDirectories = () => {
  const directories = [
    path.join(__dirname, '../uploads'),
    path.join(__dirname, '../output')
  ];

  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  });
};

export const cleanupTempFiles = (directory, maxAge = 24 * 60 * 60 * 1000) => {
  if (!fs.existsSync(directory)) return;

  const files = fs.readdirSync(directory);
  const now = Date.now();

  files.forEach(file => {
    const filePath = path.join(directory, file);
    const stats = fs.statSync(filePath);

    if (now - stats.mtime.getTime() > maxAge) {
      if (stats.isDirectory()) {
        fs.rmSync(filePath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(filePath);
      }
      console.log(`Cleaned up old file: ${filePath}`);
    }
  });
};
