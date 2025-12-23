# WebApp - AI-Powered Git Analysis Tool

A modern web application that combines local AI capabilities with Git repository analysis. It allows users to clone repositories, explore their history, and use AI to analyze commits for risks, summaries, and testing suggestions.

## 🚀 Features

- **Git Operations**: Clone public repositories and view commit history directly from the web interface.
- **AI-Powered Analysis**: Support for local LLMs (via [Ollama](https://ollama.com/)) and upcoming support for external AI providers like OpenAI (ChatGPT) and Anthropic (Claude).
- **Flexible LLM Integration**: Analyze commits for risks, summaries, and testing suggestions using your preferred AI model.
- **Streaming Responses**: Real-time AI response streaming for a better user experience.
- **Modern UI**: Built with React, featuring Tailwind CSS v4, Bootstrap 5, and smooth animations using AOS and Animate.css.
- **Git Console**: Interactive console for monitoring Git operations.

## 🛠 Tech Stack

### Backend
- **Node.js & Express**: Core server framework.
- **TypeScript**: Typed development for the backend.
- **LLM Integration**: Support for local models (Ollama SDK) and extensible architecture for external APIs.
- **Isomorphic-Git**: Perform Git operations in Node.js.
- **Http-Proxy**: Proxying requests between development servers.

### Frontend
- **React**: Component-based UI library.
- **Tailwind CSS v4**: Utility-first styling with the latest features.
- **Bootstrap 5**: Reliable UI components and grid system.
- **Animations**: AOS (Animate On Scroll), Animate.css, and Framer Motion.
- **Vite**: Ultra-fast frontend tooling and development server.
- **PostCSS**: CSS transformation and Autoprefixer.

## 📋 Prerequisites

- **Node.js**: v20 or higher recommended.
- **LLM Provider (Optional but recommended)**: 
  - **Local**: [Ollama](https://ollama.com/) can be used for local AI features.
  - **External**: Support for providers like ChatGPT, Claude, and others is currently being implemented.

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

3. **Configure AI (Optional)**:
   If using Ollama, ensure it is running and you have at least one model pulled (e.g., `codellama` or `llama3`):
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
- **Frontend (Vite)**: http://localhost:5101 (Proxied through the backend)

### Individual Scripts
- **Start Backend**: `npm run server`
- **Start Frontend**: `npm run client`
- **Build CSS**: `npm run build:css`
- **Run Tests**: `npm test`

## 📂 Project Structure

- `src/`: Core source code.
  - `client/`: React frontend (Vite entry point: `index.tsx`).
    - `components/`: Modularized UI components.
  - `server/`: Express backend entry point.
  - `services/`: Shared business logic for Git and Ollama.
  - `types/`: Shared TypeScript interfaces between client and server.
- `static/`: Static assets and global CSS.
- `index.html`: Vite entry point.
- `repos/`: (Auto-created) Directory where cloned repositories are stored.
- `dist/`: Compiled server-side JavaScript files.
- `tools/`: Development utilities (e.g., `dev.js`).

## 📄 License

This project is licensed under the ISC License.
