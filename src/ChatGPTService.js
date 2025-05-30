const OpenAI = require('openai');
require('dotenv').config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY
});

// Function to get file categorization suggestions from ChatGPT for multiple files
const suggestFileCategories = async (fileNames, existingFolders) => {
  try {
    const existingFoldersList = existingFolders.join(', ');
    const fileList = fileNames.join(', ');
    console.log("Sending files for categorization:", fileList);

    // System instructions for file categorization
    const systemInstructions = `You are an assistant that helps organize files by suggesting appropriate folders based on file names. 

If applicable, please try to match the file to one of the existing folders rather than creating a new folder, but do not over-optimize. For example, images should not go in a Books folder, and PDFs should not be put into a generic Documents folder. 

It is of utmost importance that you ONLY respond with a single folder name per file, as the folder will be created based on your response. The folder name should be at most 5 words. Use fairly generic folder names. 

For example, for a file called 4runner.pdf, suggest the folder "Vehicles." For a file called The Seven Expectations of Great Managing, use the folder "Business Articles" to prevent excessive folder creation. If a file is a generic screenshot, use a folder called "Screenshots." 

Do not provide any preliminary description or return any text after the folder name. Respond in this exact format: filename: foldername with a newline between each file and folder. You MUST respond with a folder for each and every file and the response must be in that exact format.`;
    
    // User message with files and existing folders
    const userMessage = `Here are the files: ${fileList}. Here are the existing folders: ${existingFoldersList}. Please suggest a category for each file.`;

    // Call the OpenAI responses API
    const response = await openai.responses.create({
      model: OPENAI_MODEL,
      input: systemInstructions + '\n' + userMessage
    });

    // Extract the response text from the output
    const responseText = response.output[0].content[0].text;
    
    // Log the full response for debugging
    console.log(`Full ChatGPT response: ${responseText}`);

    // Parse the response: it should be in the format "filename: foldername" per line
    const lines = responseText.trim().split('\n');
    const categories = lines.map(line => {
      const [fileName, folderName] = line.split(':').map(part => part.trim());
      return { fileName, folderName };
    });

    // Map categories back to the input fileNames to ensure order
    const categoryMap = {};
    categories.forEach(cat => {
      categoryMap[cat.fileName] = cat.folderName;
    });

    return fileNames.map(fileName => ({
      fileName,
      folderName: categoryMap[fileName] || null
    }));
  } catch (error) {
    console.error('Error communicating with OpenAI API:', error.message);
    return fileNames.map(fileName => ({ fileName, folderName: null })); // Return null for each file if an error occurs
  }
};

module.exports = { suggestFileCategories };
