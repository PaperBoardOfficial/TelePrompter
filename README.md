# TelePrompter

TelePrompter is a powerful desktop assistant that helps you analyze code problems, improve solutions, and extract information from your screen without leaving your current context.

## Features

- **Instant Screen Analysis**: Capture any part of your screen and get AI-powered analysis
- **Code Problem Solving**: Automatically detects programming language and provides optimized solutions
- **Meeting Note Extraction**: Capture meeting slides and get structured notes
- **Customizable Prompts**: Create and edit templates for different use cases
- **Transparent Overlay**: Adjustable transparency to see your work while using the app
- **Keyboard Shortcuts**: Quick access to all features without disrupting your workflow

## Use Cases

- **Technical Interviews**: Get help during coding interviews without switching contexts
- **Remote Meetings**: Extract key information from shared screens
- **Code Reviews**: Quickly analyze and improve code snippets
- **Learning**: Understand complex code examples with detailed explanations
- **Productivity**: Save time by getting instant analysis of visual information

## Getting Started

1. **Install TelePrompter**: Download the latest version for your platform
2. **Add Your API Key**: Enter your Gemini API key in Settings
3. **Capture Screenshots**: Use the keyboard shortcut or button to capture your screen
4. **Get Analysis**: TelePrompter will automatically analyze the content

## Keyboard Shortcuts

- **Toggle Window Visibility**: `Cmd/Ctrl + B`
- **Take Screenshot**: `Cmd/Ctrl + H`
- **Process Screenshots**: `Cmd/Ctrl + Enter`
- **Quit Application**: `Cmd/Ctrl + Q`
- **Move Window**: Arrow keys with `Cmd/Ctrl`

## Configuration

### API Key

TelePrompter uses Google's Gemini API. You'll need to:
1. Get an API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Enter it in the Settings panel (accessible from the menu)

### Prompt Templates

Customize how TelePrompter analyzes content:
1. Open Settings and go to the "Prompts" tab
2. Choose between built-in templates (Coding Task, Meeting Notes) or create your own
3. Set your preferred template as active

## Privacy

- All processing happens through the Gemini API
- Your API key is stored securely on your machine
- Screenshots are saved temporarily and can be deleted at any time

## Development

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/PaperBoardOfficial/teleprompter.git
   cd teleprompter
   ```

2. Install dependencies:
   ```
   npm install
   # or
   yarn
   ```

3. Run the application in development mode:
   ```
   npm run dev
   # or
   yarn dev
   ```

4. Build the application for production:
   ```
   npm run build
   # or
   yarn build
   ```

## License

This project is licensed under the ISC License.
