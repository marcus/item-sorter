// Import the folder watcher to start monitoring
const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs');
const FileSorter = require('./src/FileSorter');

// Default to the Downloads folder
let downloadsFolder = path.join(process.env.HOME, 'Downloads');
let recentsFolder = path.join(downloadsFolder, 'Recents');
let aiLibraryFolder = path.join(downloadsFolder, 'AI Library');

// Parse command-line arguments to get the custom path
const args = process.argv.slice(2);
args.forEach(arg => {
  if (arg.startsWith('--path=')) {
    downloadsFolder = arg.split('=')[1];
    downloadsFolder = downloadsFolder.replace(/\\ /g, ' ');  // Handle escaped spaces like '\ '
    recentsFolder = path.join(downloadsFolder, 'Recents');
    aiLibraryFolder = path.join(downloadsFolder, 'AI Library');
    console.log(`Using custom folder path: ${downloadsFolder}`);
  }
});

// Ensure the folders exist before monitoring
const ensureFolderExists = (folder) => {
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
    console.log(`Created folder: ${folder}`);
  }
};
ensureFolderExists(recentsFolder);
ensureFolderExists(aiLibraryFolder);

// Initialize watcher for the main Downloads folder
const watcher = chokidar.watch(downloadsFolder, {
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
const MAX_BATCH_SIZE = 10;    // Maximum number of files per batch

// Function to process the batch of files
const processBatch = async () => {
  if (fileBatch.length > 0) {
    const batchToProcess = fileBatch.slice(0, MAX_BATCH_SIZE);
    fileBatch = fileBatch.slice(MAX_BATCH_SIZE);
    console.log(`Processing batch of ${batchToProcess.length} files`);
    try {
      await FileSorter.sortFiles(batchToProcess, recentsFolder, aiLibraryFolder); // Process the batch
    } catch (error) {
      console.error(`Error processing batch: ${error}`);
    }
  }
  if (fileBatch.length > 0 && !batchTimeout) {
    batchTimeout = setTimeout(processBatch, BATCH_INTERVAL);
  } else {
    clearTimeout(batchTimeout);
    batchTimeout = null;
  }
};

// Handle new files in Downloads
watcher.on('add', (filePath) => {
  console.log(`New file detected: ${filePath}`);
  fileBatch.push(filePath);

  // If batch size reached, process immediately
  if (fileBatch.length >= MAX_BATCH_SIZE) {
    processBatch();
  } else {
    // If there's no timeout, start one to process the batch after a short delay
    if (!batchTimeout) {
      batchTimeout = setTimeout(processBatch, BATCH_INTERVAL);
    }
  }
});

// Handle new directories
watcher.on('addDir', (dirPath) => {
  console.log(`Ignoring directory: ${dirPath}`);
});

// Handle watcher errors
watcher.on('error', (error) => {
  console.error(`Watcher error: ${error}`);
});

// Periodically check the Recents folder and move old files to AI Library
const checkRecentsForOldFiles = () => {
  fs.readdir(recentsFolder, async (err, files) => {
    if (err) {
      console.error(`Error reading Recents folder: ${err}`);
      return;
    }

    const oldFiles = [];

    for (const file of files) {
      const filePath = path.join(recentsFolder, file);

      // Ignore .DS_Store or other hidden files
      if (file === '.DS_Store' || fs.statSync(filePath).isDirectory()) continue;

      try {
        const stats = fs.statSync(filePath);
        const fileAge = Date.now() - stats.birthtimeMs;
        const threeDays = 3 * 24 * 60 * 60 * 1000;

        // If file is older than 3 days, move it to AI Library
        if (fileAge > threeDays) {
          console.log(`File ${file} is older than 3 days. Moving to AI Library...`);
          oldFiles.push(filePath);
        }
      } catch (statErr) {
        console.error(`Error reading file stats for ${filePath}: ${statErr}`);
      }
    }

    // Process old files in batches
    if (oldFiles.length > 0) {
      try {
        await FileSorter.sortFiles(oldFiles, aiLibraryFolder, aiLibraryFolder); // Move the old files to the AI Library
      } catch (error) {
        console.error(`Error processing old files batch: ${error}`);
      }
    }
  });
};

// Run the checkRecentsForOldFiles function every 1 hour (3600000ms)
setInterval(checkRecentsForOldFiles, 3600000);

console.log(`Watching for new files in: ${downloadsFolder}`);
