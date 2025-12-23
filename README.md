# WebApp - AI-Powered Git Analysis Tool

A modern web application that combines local AI capabilities with Git repository analysis. It allows users to clone repositories, explore their history, and use AI to analyze commits for risks, summaries, and testing suggestions.

## 🚀 Features

- **Git Operations**: Clone public repositories and view commit history directly from the web interface.
- **AI-Powered Analysis**: Integrated with [Ollama](https://ollama.com/) to provide intelligent summaries and risk assessments of Git commits.
- **Streaming Responses**: Real-time AI response streaming for a better user experience.
- **Modern UI**: Built with React, featuring Tailwind CSS v4, Bootstrap 5, and smooth animations using AOS and Animate.css.
- **Git Console**: Interactive console for monitoring Git operations.

## 🛠 Tech Stack

### Backend
- **Node.js & Express**: Core server framework.
- **TypeScript**: Typed development for the backend.
- **Ollama SDK**: Integration with local LLMs.
- **Isomorphic-Git**: Perform Git operations in Node.js.
- **Http-Proxy**: Proxying requests between development servers.

### Frontend
- **React**: Component-based UI library.
- **Tailwind CSS v4**: Utility-first styling with the latest features.
- **Bootstrap 5**: Reliable UI components and grid system.
- **Animations**: AOS (Animate On Scroll) and Animate.css.
- **Webpack**: Module bundling and development server.
- **PostCSS**: CSS transformation and Autoprefixer.

## 📋 Prerequisites

- **Node.js**: v20 or higher recommended.
- **Ollama**: Must be installed and running locally to use AI features.

## ⚙️ Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd webapp
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start Ollama**:
   Ensure Ollama is running and you have at least one model pulled (e.g., `codellama` or `llama3`):
   ```bash
   ollama pull codellama
   ```

## 🚀 Running the Application

The project uses a dual-server setup for development.

### Development Mode
To start both the backend server and frontend development server simultaneously:
```bash
npm start
```
- **Backend API**: http://localhost:5000
- **Frontend (WDS)**: http://localhost:5100 (Proxied through the backend)

### Individual Scripts
- **Start Backend**: `npm run server`
- **Start Frontend**: `npm run client`
- **Build CSS**: `npm run build:css`
- **Run Tests**: `npm test`

## 📂 Project Structure

- `src/`: TypeScript backend source code.
  - `services/`: Core logic for Git and Ollama integrations.
  - `client/`: React frontend source code.
- `frontend/`: CSS styles, animation utilities, and frontend-specific documentation.
- `static/`: Static assets and the main HTML entry point.
- `repos/`: (Auto-created) Directory where cloned repositories are stored.
- `dist/`: Compiled JavaScript files.

## 📄 License

This project is licensed under the ISC License.
