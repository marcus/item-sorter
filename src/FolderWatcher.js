const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs');
const FileSorter = require('./FileSorter');

// Path to the Downloads folder (adjust if needed)
const DOWNLOADS_FOLDER = path.join(process.env.HOME, 'Downloads');

// Initialize watcher
const watcher = chokidar.watch(DOWNLOADS_FOLDER, {
  persistent: true,
  ignoreInitial: true, // Ignore existing files on start
  depth: 0,  // Only monitor the top level of the Downloads folder, not subfolders
  awaitWriteFinish: {
    stabilityThreshold: 100,  // Reduce to 100ms for quicker detection
    pollInterval: 50,  // Check more frequently (50ms)
  }
});

// Handle new files
watcher.on('add', (filePath) => {
  // If a file is detected, call the sorter
  console.log(`New file detected: ${filePath}`);
  FileSorter.sortFile(filePath);
});

// Handle new directories
watcher.on('addDir', (dirPath) => {
  console.log(`Ignoring directory: ${dirPath}`);
});

// Handle file errors
watcher.on('error', (error) => {
  console.error(`Watcher error: ${error}`);
});

module.exports = watcher;
