const axios = require('axios');
require('dotenv').config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Function to get file categorization suggestion from ChatGPT 4-turbo
const suggestFileCategory = async (fileName, existingFolders) => {
  try {
    const existingFoldersList = existingFolders.join(', ');

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an assistant that helps organize files by suggesting appropriate categories based on file names. If applicable, please try to match the file to one of the existing folders rather than creating a new folder but do not over-optimize, meaning images should not go in an Books folder or pdfs should not be put into a generic Documents folder. It is of utmost importance that you ONLY respond with a single folder name as the folder will be created based in the operating system based on your response. The folder name should be at most 5 words. Use fairly generic folder names, for example for a file called 4runner.pdf, put suggest the folder Vehicles or for a file called The Seven Expectations of Great Managing use the folder Business Articles this is to prevent excessive folder creation. If a file is a generic screenshot, use a folder called Screenshots. Do not use any preliminary description or return any text after the foldername.'
          },
          {
            role: 'user',
            content: existingFolders.includes('No existing folders')
              ? `There are no existing folders. Suggest a new category for this file: ${fileName}`
              : `Here are the existing folders: ${existingFoldersList}. Suggest a category for this file: ${fileName}`
          }
        ],
        max_tokens: 100
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        }
      }
    );

    // Log the full response for debugging
    console.log(`Full ChatGPT response: ${JSON.stringify(response.data.choices[0].message.content)}`);

    // Extract the first 1-3 words as the category suggestion, ignoring full sentences
    let categorySuggestion = response.data.choices[0].message.content.trim();

    // Use regex to grab the first meaningful part, stopping at punctuation or stopwords
    categorySuggestion = categorySuggestion.match(/^[A-Za-z\s]+/)[0];  // Extract first few meaningful words
    console.log(`ChatGPT suggested category: ${categorySuggestion}`);

    return categorySuggestion;
  } catch (error) {
    console.error('Error communicating with ChatGPT API:', error);
    return null;
  }
};

module.exports = { suggestFileCategory };
