const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs');
const FileSorter = require('./FileSorter');

// Path to the Downloads folder
const DOWNLOADS_FOLDER = path.join(process.env.HOME, 'Downloads');

// Initialize watcher
const watcher = chokidar.watch(DOWNLOADS_FOLDER, {
  persistent: true,
  ignoreInitial: true,
  depth: 0,
  awaitWriteFinish: {
    stabilityThreshold: 100,
    pollInterval: 50,
  }
});

let fileBatch = [];
let batchTimeout = null;
const BATCH_INTERVAL = 3000; // 3 seconds for batch window

const processBatch = () => {
  if (fileBatch.length > 0) {
    console.log(`Processing batch of ${fileBatch.length} files`);
    FileSorter.sortFiles(fileBatch); // Process batch of files
    fileBatch = [];
  }
  clearTimeout(batchTimeout);
  batchTimeout = null;
};

// Handle new files
watcher.on('add', (filePath) => {
  console.log(`New file detected: ${filePath}`);
  fileBatch.push(filePath);

  // If there's no timeout, start one to process the batch after a short delay
  if (!batchTimeout) {
    batchTimeout = setTimeout(processBatch, BATCH_INTERVAL);
  }
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
