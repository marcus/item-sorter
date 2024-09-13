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
  ignoreInitial: true, // Ignore existing files on start
  depth: 0,  // Only monitor the top level of the Downloads folder, not subfolders
});

let fileBatch = [];
let batchTimeout = null;
const BATCH_INTERVAL = 3000; // 3 seconds for batch window

// Function to process the batch of files
const processBatch = () => {
  if (fileBatch.length > 0) {
    console.log(`Processing batch of ${fileBatch.length} files`);
    try {
      FileSorter.sortFiles(fileBatch); // Process the batch using the modified sortFiles
    } catch (error) {
      console.error(`Error processing batch: ${error}`);
    }
    fileBatch = []; // Reset the batch
  }
  clearTimeout(batchTimeout);
  batchTimeout = null;
};

// Handle new files in Downloads
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

// Periodically check the Recents folder and move old files to AI Library
const checkRecentsForOldFiles = () => {
  fs.readdir(recentsFolder, (err, files) => {
    if (err) {
      console.error(`Error reading Recents folder: ${err}`);
      return;
    }

    const oldFilesBatch = [];

    files.forEach(file => {
      const filePath = path.join(recentsFolder, file);
      
      // Ignore .DS_Store or other hidden files
      if (file === '.DS_Store' || fs.statSync(filePath).isDirectory()) return;

      fs.stat(filePath, (err, stats) => {
        if (err) {
          console.error(`Error reading file stats: ${err}`);
          return;
        }

        const fileAge = Date.now() - stats.birthtimeMs;
        const threeDays = 3 * 24 * 60 * 60 * 1000;

        // If file is older than 3 days, move it to AI Library
        if (fileAge > threeDays) {
          console.log(`File ${file} is older than 3 days. Moving to AI Library...`);
          oldFilesBatch.push(filePath);
        }
      });
    });

    // Process old files as a batch if there are any
    if (oldFilesBatch.length > 0) {
      console.log(`Processing batch of ${oldFilesBatch.length} old files from Recents folder`);
      try {
        FileSorter.sortFiles(oldFilesBatch); // Use the batch processing method
      } catch (error) {
        console.error(`Error processing old files batch: ${error}`);
      }
    }
  });
};

// Run the checkRecentsForOldFiles function every 1 hour (3600000ms)
setInterval(checkRecentsForOldFiles, 3600000);
