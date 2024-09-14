# Item Sorter

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

## Overview

**Item Sorter** monitors your Downloads folder and watches for new files. When a new file or files appears, it intelligently categorizes and organizes them into existing folders if it can find an appropriate one, or it creates a new folder if needed. It uses the ChatGPT API to determine the appropriate folders.

Files are managed in batches of up to 10, ensuring efficient processing and reduced API requests. Recent files are moved to a `Recents` folder, while older files are categorized and stored in sub folders under a folder called `AI Library`. Item Sorter ignores pre-existing and new folders and only operates in individual files.

## Features

- **Real-time Folder Monitoring:** Utilizes `chokidar` to watch for new files in the specified directory.
- **Batch Processing:** Groups incoming files into batches of up to 10 for efficient API interactions.
- **Smart Categorization:** Leverages ChatGPT to suggest suitable categories based on file names and existing folders.
- **Automated Organization:** Moves recent files to a `Recents` folder and older files to categorized folders within an `AI Library`.
- **Customizable Paths:** Allows users to specify a custom directory path via command-line arguments.
- **Scheduled Maintenance:** Periodically checks and moves files older than three days from `Recents` to `AI Library`.
- **Error Handling & Logging:** Comprehensive logging for monitoring and debugging purposes.

## Prerequisites

- **Node.js** (v14 or later)
- **npm** (Node Package Manager)
- **OpenAI API Key:** Required to interact with the ChatGPT API.

## Installation

1. **Clone the Repository**

   ```bash
   git clone https://github.com/marcus/Item-Sorter.git
   ```

2. **Navigate to the Project Directory**

   ```bash
   cd Item-Sorter
   ```

3. **Install Dependencies**

   ```bash
   npm install
   ```

4. **Set Up Environment Variables**

   Create a `.env` file in the root directory and add your OpenAI API key:

   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   OPENAI_MODEL=gpt-3.5-turbo # Optional: Specify the model, defaults to 'gpt-3.5-turbo'
   ```

   > **Note:** Ensure that the `.env` file is included in your `.gitignore` to prevent sensitive information from being exposed.

## Configuration

**Item Sorter** can be customized using command-line arguments to specify the directory you want to monitor.

- **Default Directory:** `Downloads` folder in the user's home directory.
- **Custom Directory:** Use the `--path` argument to specify a different directory.

### Example

```bash
node index.js --path="/Users/marcus/Documents/My Downloads"
```

## Usage

1. **Start the Application**

   ```bash
   node index.js
   ```

   Or with a custom path:

   ```bash
   node index.js --path="/path/to/your/custom/folder"
   ```

2. **How It Works**

   - **Monitoring:** The application continuously watches the specified directory for new files.
   - **Batching:** Files are grouped into batches of up to 10. If the batch size is reached or after a 3-second interval, the batch is processed.
   - **Categorization:** The batch is sent to the ChatGPT API, which suggests appropriate folders for each file based on its name.
   - **Organization:** 
     - **Recent Files:** Files less than or equal to 72 hours old are moved to the `Recents` folder.
     - **Older Files:** Files older than 72 hours are moved to the `AI Library` under the suggested categories.
   - **Scheduled Maintenance:** Every hour, the application checks the `Recents` folder and moves files older than three days to the `AI Library`.

## Contributing

Contributions are welcome! Please follow these steps:

1. **Fork the Repository**

2. **Create a New Branch**

   ```bash
   git checkout -b feature/YourFeatureName
   ```

3. **Make Your Changes**

4. **Commit Your Changes**

   ```bash
   git commit -m "Add your message here"
   ```

5. **Push to the Branch**

   ```bash
   git push origin feature/YourFeatureName
   ```

6. **Open a Pull Request**

Please ensure that your code adheres to the project's coding standards and that all tests pass.

## License

This project is licensed under the [MIT License](LICENSE).
