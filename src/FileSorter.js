const path = require('path');
const fs = require('fs');
const { suggestFileCategory } = require('./ChatGPTService');

// Default paths for Recents and AI Library folders
let recentsFolder = path.join(process.env.HOME, 'Downloads', 'Recents');
let aiLibraryFolder = path.join(process.env.HOME, 'Downloads', 'AI Library');

// Sanitize folder names to remove invalid characters and capitalize words
const sanitizeFolderName = (name) => {
  return name
    .replace(/[<>:"/\\|?*&'"]/g, '')  // Removes quotes, slashes, and other invalid characters
    .trim()
    .split(' ')
    .slice(0, 5)  // Limit folder name to the first 5 words to avoid long names
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())  // Capitalize each word
    .join(' ');
};

// Ensure folders exist
const ensureFoldersExist = () => {
  if (!fs.existsSync(recentsFolder)) fs.mkdirSync(recentsFolder);
  if (!fs.existsSync(aiLibraryFolder)) fs.mkdirSync(aiLibraryFolder);
};

// Check if a file is inside a subfolder of the target folder
const isInsideSubfolder = (filePath) => {
  const relativePath = path.relative(recentsFolder, filePath);
  // If the relative path starts with '..', the file is inside a subfolder
  return relativePath.includes(path.sep);
};

// Collect existing folders from the AI Library folder
const getExistingFolders = () => {
  return fs.readdirSync(aiLibraryFolder).filter((item) => {
    // Ignore system files like .DS_Store
    return item !== '.DS_Store' && fs.statSync(path.join(aiLibraryFolder, item)).isDirectory();
  });
};

// Sort file based on creation time and category suggestion from ChatGPT
const sortFile = (filePath) => {
  ensureFoldersExist();

  // Ignore .DS_Store files and directories in the Recents folder itself
  if (path.basename(filePath) === '.DS_Store' || fs.statSync(filePath).isDirectory()) {
    console.log(`Ignoring directory or system file: ${filePath}`);
    return;
  }

  // Ignore files inside subfolders of the Recents folder
  if (isInsideSubfolder(filePath)) {
    console.log(`Ignoring file inside subfolder: ${filePath}`);
    return;
  }

  // Get file stats (creation time and whether it's a file or directory)
  fs.stat(filePath, async (err, stats) => {
    if (err) {
      console.error(`Error reading file stats: ${err}`);
      return;
    }

    const fileAge = Date.now() - stats.birthtimeMs;
    const threeDays = 3 * 24 * 60 * 60 * 1000;

    if (fileAge < threeDays) {
      // Move to Recents
      const destination = path.join(recentsFolder, path.basename(filePath));
      fs.rename(filePath, destination, (err) => {
        if (err) console.error(`Error moving file: ${err}`);
        else console.log(`Moved to Recents: ${filePath}`);
      });
    } else {
      // Get existing folders from the AI Library
      const existingFolders = getExistingFolders();

      // If no existing folders, provide a default message
      const folderList = existingFolders.length > 0 ? existingFolders : ['No existing folders'];

      // Get category suggestion from ChatGPT
      const suggestedCategory = await suggestFileCategory(path.basename(filePath), folderList);

      if (suggestedCategory) {
        // Sanitize folder name and capitalize words
        const sanitizedCategory = sanitizeFolderName(suggestedCategory.split('.')[0]); // Use only the top suggestion

        // Check if a folder already exists that matches the sanitized name
        const folderToUse = existingFolders.find(folder => folder.toLowerCase() === sanitizedCategory.toLowerCase()) || sanitizedCategory;

        // Only create the folder if it doesn't already exist
        const categoryFolder = path.join(aiLibraryFolder, folderToUse);
        if (!existingFolders.includes(folderToUse) && !fs.existsSync(categoryFolder)) {
          console.log(`Creating folder: ${categoryFolder}`);
          fs.mkdirSync(categoryFolder);
        } else {
          console.log(`Using existing folder: ${categoryFolder}`);
        }

        // Move the file to the appropriate category folder (only once)
        const destination = path.join(categoryFolder, path.basename(filePath));
        fs.rename(filePath, destination, (err) => {
          if (err) console.error(`Error moving file: ${err}`);
          else console.log(`Moved to AI Library under "${folderToUse}": ${filePath}`);
        });
      } else {
        console.log(`Could not get a suggestion for: ${filePath}`);
      }
    }
  });
};

module.exports = { sortFile };
