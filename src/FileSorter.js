const path = require('path');
const fs = require('fs');
const { suggestFileCategories } = require('./ChatGPTService');

// Default paths for Recents and AI Library folders
let recentsFolder = path.join(process.env.HOME, 'Downloads', 'Recents');
let aiLibraryFolder = path.join(process.env.HOME, 'Downloads', 'AI Library');

// Sanitize folder names to remove invalid characters and capitalize words
const sanitizeFolderName = (name) => {
  return name
    .replace(/[<>:"/\|?*&'"]/g, '') 
    .trim()
    .split(' ')
    .slice(0, 5)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// Ensure folders exist
const ensureFoldersExist = () => {
  if (!fs.existsSync(recentsFolder)) fs.mkdirSync(recentsFolder);
  if (!fs.existsSync(aiLibraryFolder)) fs.mkdirSync(aiLibraryFolder);
};

// Utility function to split array into chunks of 10
const chunkArray = (array, chunkSize) => {
  const result = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    result.push(array.slice(i, i + chunkSize));
  }
  return result;
};

// Sort files based on the creation time and category suggestions from ChatGPT
const sortFiles = async (filePaths) => {
  ensureFoldersExist();

  // Get existing folders from AI Library
  const existingFolders = fs.readdirSync(aiLibraryFolder).filter(item => {
    return item !== '.DS_Store' && fs.statSync(path.join(aiLibraryFolder, item)).isDirectory();
  });

  // If no existing folders, provide a default message
  const folderList = existingFolders.length > 0 ? existingFolders : ['No existing folders'];

  // Split file paths into batches of 10
  const fileBatches = chunkArray(filePaths, 10);

  // Process each batch
  for (const batch of fileBatches) {
    const fileNames = batch.map(filePath => path.basename(filePath));

    console.log(`Sending batch of ${fileNames.length} files: ${fileNames.join(', ')}`);

    // Get categories from ChatGPT for the current batch
    const suggestedCategories = await suggestFileCategories(fileNames, folderList);

    // Sort files based on ChatGPT's suggestions
    for (const filePath of batch) {
      const fileName = path.basename(filePath);
      const suggestion = suggestedCategories.find(item => item.fileName === fileName);

      if (suggestion && suggestion.folderName) {
        const sanitizedCategory = sanitizeFolderName(suggestion.folderName);

        const folderToUse = existingFolders.find(folder => folder.toLowerCase() === sanitizedCategory.toLowerCase()) || sanitizedCategory;

        const categoryFolder = path.join(aiLibraryFolder, folderToUse);
        if (!existingFolders.includes(folderToUse) && !fs.existsSync(categoryFolder)) {
          console.log(`Creating folder: ${categoryFolder}`);
          try {
            fs.mkdirSync(categoryFolder);
          } catch (err) {
            console.error(`Error creating folder: ${err}`);
            continue;
          }
        }

        const destination = path.join(categoryFolder, path.basename(filePath));
        try {
          await fs.promises.rename(filePath, destination);
          console.log(`Moved to AI Library under "${folderToUse}": ${filePath}`);
        } catch (err) {
          console.error(`Error moving file: ${err}`);
        }
      } else {
        console.log(`Could not get a suggestion for: ${filePath}`);
      }
    }
  }
};

module.exports = { sortFiles };
