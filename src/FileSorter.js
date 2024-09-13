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
const sortFiles = async (filePaths, targetFolder) => {
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

    console.log(`Processing batch of ${fileNames.length} files: ${fileNames.join(', ')}`);

    for (const filePath of batch) {
      const fileName = path.basename(filePath);

      // Check if the file is younger than 72 hours
      const stats = fs.statSync(filePath);
      const fileAge = Date.now() - stats.birthtimeMs;
      const threeDays = 3 * 24 * 60 * 60 * 1000;

      if (fileAge <= threeDays) {
        console.log(`File ${fileName} is less than 72 hours old. Moving to Recents.`);
        const destination = path.join(recentsFolder, path.basename(filePath));
        try {
          await fs.promises.rename(filePath, destination);
          console.log(`Moved ${filePath} to Recents.`);
        } catch (err) {
          console.error(`Error moving file to Recents: ${err}`);
        }
        continue;  // Skip categorizing since it's within 72 hours
      }

      // If the file is older than 72 hours, categorize and move it to AI Library
      const suggestion = await suggestFileCategories([fileName], folderList);
      if (suggestion.length && suggestion[0].folderName) {
        const sanitizedCategory = sanitizeFolderName(suggestion[0].folderName);

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
          console.log(`Moved ${filePath} to AI Library under "${folderToUse}".`);
        } catch (err) {
          console.error(`Error moving file to AI Library: ${err}`);
        }
      } else {
        console.log(`Could not get a suggestion for: ${filePath}`);
      }
    }
  }
};

module.exports = { sortFiles };
