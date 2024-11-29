// ./src/FileSorter.js
const path = require('path');
const fs = require('fs');
const { suggestFileCategories } = require('./ChatGPTService');

// Default paths for Recents and AI Library folders
let recentsFolder = path.join(process.env.HOME, 'Downloads', 'Recents');
let aiLibraryFolder = path.join(process.env.HOME, 'Downloads', 'AI Library');

// List of file extensions to exclude from being moved
const excludedExtensions = ['.dng', '.dmg', '.pkg', '.mpkg', '.app']; // Add any other extensions you want to exclude

// Sanitize folder names to remove invalid characters and capitalize words
const sanitizeFolderName = (name) => {
  return name
    .replace(/[<>:"/\\|?*&'"]/g, '') 
    .trim()
    .split(' ')
    .slice(0, 5)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// Ensure folders exist
const ensureFoldersExist = () => {
  if (!fs.existsSync(recentsFolder)) fs.mkdirSync(recentsFolder, { recursive: true });
  if (!fs.existsSync(aiLibraryFolder)) fs.mkdirSync(aiLibraryFolder, { recursive: true });
};

// Utility function to split array into chunks of specified size
const chunkArray = (array, chunkSize) => {
  const result = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    result.push(array.slice(i, i + chunkSize));
  }
  return result;
};

// Sort files based on the creation time and category suggestions from ChatGPT
const sortFiles = async (filePaths, recentsFolderPath, aiLibraryFolderPath) => {
  // Update folder paths if provided
  if (recentsFolderPath) recentsFolder = recentsFolderPath;
  if (aiLibraryFolderPath) aiLibraryFolder = aiLibraryFolderPath;

  ensureFoldersExist();

  // **Filter out excluded files**
  const filteredFilePaths = filePaths.filter(filePath => {
    const ext = path.extname(filePath).toLowerCase();
    const isExcluded = excludedExtensions.includes(ext);
    if (isExcluded) {
      console.log(`Excluded file from sorting: ${path.basename(filePath)}`);
    }
    return !isExcluded;
  });

  // Split files into recent and old
  const recentFiles = [];
  const oldFiles = [];

  for (const filePath of filteredFilePaths) {
    if (isFileRecent(filePath)) {
      recentFiles.push(filePath);
    } else {
      oldFiles.push(filePath);
    }
  }

  // Move recent files directly to Recents folder without categorization
  for (const filePath of recentFiles) {
    const fileName = path.basename(filePath);
    const destination = path.join(recentsFolder, fileName);
    try {
      await fs.promises.rename(filePath, destination);
      console.log(`Moved recent file ${fileName} to Recents folder.`);
    } catch (err) {
      console.error(`Error moving recent file ${fileName} to Recents folder: ${err}`);
    }
  }

  // If there are old files, proceed with categorization
  if (oldFiles.length === 0) {
    console.log('No old files to categorize.');
    return;
  }

  // Get existing folders from AI Library
  const existingFolders = fs.readdirSync(aiLibraryFolder).filter(item => {
    return item !== '.DS_Store' && fs.statSync(path.join(aiLibraryFolder, item)).isDirectory();
  });

  // If no existing folders, provide a default message
  const folderList = existingFolders.length > 0 ? existingFolders : ['No existing folders'];

  // Split old files into batches of 10
  const fileBatches = chunkArray(oldFiles, 10);

  for (const batch of fileBatches) {
    const fileNames = batch.map(filePath => path.basename(filePath));

    console.log(`Processing batch of ${fileNames.length} old files: ${fileNames.join(', ')}`);

    // Categorize old files in batch
    let categories;
    try {
      categories = await suggestFileCategories(fileNames, folderList);
    } catch (error) {
      console.error(`Error getting categories from ChatGPT: ${error}`);
      continue; // Skip this batch on error
    }

    for (let i = 0; i < batch.length; i++) {
      const filePath = batch[i];
      const fileName = fileNames[i];
      const category = categories[i]?.folderName;

      if (!category) {
        console.log(`No category suggestion for ${fileName}. Skipping.`);
        continue;
      }

      const sanitizedCategory = sanitizeFolderName(category);

      // Determine destination folder
      let destinationFolder;
      // Use existing folder or create a new one
      const folderToUse = existingFolders.find(folder => folder.toLowerCase() === sanitizedCategory.toLowerCase()) || sanitizedCategory;
      destinationFolder = path.join(aiLibraryFolder, folderToUse);

      if (!fs.existsSync(destinationFolder)) {
        console.log(`Creating folder: ${destinationFolder}`);
        try {
          fs.mkdirSync(destinationFolder, { recursive: true });
          existingFolders.push(folderToUse); // Update existing folders
        } catch (err) {
          console.error(`Error creating folder "${destinationFolder}": ${err}`);
          continue;
        }
      }

      // Move the file to the destination folder
      const destination = path.join(destinationFolder, fileName);
      try {
        await fs.promises.rename(filePath, destination);
        console.log(`Moved ${filePath} to ${destinationFolder} under "${sanitizedCategory}".`);
      } catch (err) {
        console.error(`Error moving file to ${destinationFolder}: ${err}`);
      }
    }
  }
};

// Helper function to determine if a file is recent (<= 72 hours)
const isFileRecent = (filePath) => {
  try {
    const stats = fs.statSync(filePath);
    const fileAge = Date.now() - stats.birthtimeMs;
    const threeDays = 3 * 24 * 60 * 60 * 1000;
    return fileAge <= threeDays;
  } catch (err) {
    console.error(`Error checking file age for ${filePath}: ${err}`);
    return false;
  }
};

module.exports = { sortFiles };
