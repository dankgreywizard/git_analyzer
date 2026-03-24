# WebApp - AI-Powered Git Analysis Tool

A modern web application that combines local AI capabilities with Git repository analysis. It allows users to clone repositories, explore their history, and use AI to analyze commits for risks, summaries, and testing suggestions.

## 🚀 Features

- **Git Operations**: Clone public repositories, view commit history, and **checkout multiple commits simultaneously** into their own branches.
- **Reset Repository**: Easily restore your repository to its default branch (`main`/`master`) and clean up temporary `branch-*` branches with a single click.
- **AI-Powered Code Review**: Support for both local LLMs (via [Ollama](https://ollama.com/)) and external AI providers (OpenAI, Anthropic, etc.) acting as an **expert code reviewer**.
- **Unified Analysis Flow**: A single "Analyze with AI" button that handles both general repository analysis and specific commit-level reviews (with automatic batch checkout).
- **Detailed Diff Analysis**: Automatically generates and analyzes line-by-line diffs for each file in selected commits, with robust error handling to gracefully skip problematic files (e.g., binary or oversized files).
- **Automated Log Fetching**: History is automatically retrieved after cloning or opening a repository, streamlining the workflow.
- **Configurable AI Persona**: Choose from built-in presets (Expert Code Reviewer, Security Analyst, Refactoring Specialist) or define your own system prompt to guide the AI's analysis style and focus.
- **Configurable Timeout**: Set a custom timeout for AI requests to manage latency and performance.
- **Persistent Settings**: Uses an in-memory database (**LokiJS**) to persist AI configurations and settings across application restarts.
- **Real-time Feedback**: Visual "AI is thinking..." indicators, detailed in-chat error reporting, and **specific error feedback for Git operations** (Clone, Open, Log) to help diagnose connectivity or repository issues.
- **Modern UI**: Built with React, featuring a modular architecture with custom hooks (`useGit`, `useChat`), Tailwind CSS v4, and a compact dropdown navigation menu.
- **Security-First**: Robust input validation and path traversal protection for all Git and AI operations. Centralized path sanitization in `GitService` ensures all file access remains within the repository boundaries, sensitive information (like `apiKey`) is masked in the UI, and strict validation (like `ref` validation and `timeout` clamping) is enforced at the API level.
- **Improved Chat Experience**: Automatic scrolling to the bottom of the chat window for real-time AI responses, fixed input bar for constant access, and **dedicated scrollbars** for the chat container and individual long message results.
- **Git Console**: Interactive console for monitoring Git operations in real-time.

## 🛠 Tech Stack

### Infrastructure
- **Docker**: Containerized deployment for easy setup and distribution.
- **Multi-stage Builds**: Optimized Docker images using Alpine Linux.

### Backend
- **Node.js & Express**: Core server framework.
- **TypeScript**: Typed development for the backend.
- **LokiJS**: In-memory database with file-based persistence for settings and configuration.
- **LLM Integration**: Support for local models (Ollama SDK) and extensible architecture for external APIs.
- **Isomorphic-Git**: Perform Git operations in Node.js.
- **Security**: Built-in path normalization, leading slash stripping, and boundary checks to prevent path traversal across all repository-related operations. Includes strict `ref` validation and clamped `timeout` parameters to ensure stability and security.
- **Http-Proxy**: Proxying requests between development servers.

### Frontend
- **React**: Component-based UI library using modern patterns (Hooks, Layouts).
- **Custom Hooks**: Encapsulated logic in `useGit`, `useChat`, `useModels`, and `useChatHistory`.
- **Tailwind CSS v4**: Utility-first styling with the latest features.
- **Animations**: AOS (Animate On Scroll), Animate.css, and Framer Motion.
- **Vite**: Ultra-fast frontend tooling and development server.
- **PostCSS**: CSS transformation and Autoprefixer.

## 📋 Prerequisites

- **Node.js**: v20 or higher recommended.
- **LLM Provider**: 
  - **Local**: [Ollama](https://ollama.com/) can be used for local AI features.
  - **External**: Supports OpenAI, Anthropic, and other OpenAI-compatible APIs.

## ⚙️ Configuration

The application can be configured using environment variables:

- `PORT`: Server port (default: 5000).
- `WDS_PORT`: Frontend development server port (default: 5100).
- `BODY_LIMIT`: Maximum JSON request size (e.g., '10mb').
- `AI_API_KEY`: API key for an external AI provider (e.g., OpenAI, Claude).
- `AI_BASE_URL`: Base URL for the AI provider. Defaults to 'https://api.openai.com/v1' if `AI_API_KEY` is set, otherwise defaults to Ollama's default (http://localhost:11434).
- `AI_MODEL`: Default AI model to use (default: 'codellama:latest' for Ollama, 'gpt-4o' for OpenAI).
- `AI_MODELS`: Comma-separated list of models to display in the UI when using an external provider.
- `AI_PERSONA`: Default AI persona / system prompt preset (e.g., 'Expert Code Reviewer', 'Concise Reviewer').
- `AI_TIMEOUT`: Maximum time to wait for a response from the AI provider in milliseconds (default: 30000).

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

### Docker Compose (Recommended)
The easiest way to run the application with a local AI is using Docker Compose, which starts both the web application and an Ollama instance.

1. **Start the application**:
   ```bash
   docker compose up -d
   ```
   *Note: On first run, it will build the webapp image, pull the Ollama image, and automatically pull the `codellama` AI model. The Ollama service runs internally and does not conflict with any Ollama instance you might have running on your host machine.*

2. **Wait for Model Pull**:
   The `codellama` model is pulled automatically in the background. You can monitor the progress with:
   ```bash
   docker compose logs -f ollama
   ```

The application will be accessible at http://localhost:5000.

#### Troubleshooting: Port 11434 already in use
If you encounter an error saying `address already in use` for port `11434`, it means you have Ollama running on your host. We have configured the Docker Compose file to use internal networking to avoid this, but if you've modified it to expose ports, you should either stop the host service or change the port mapping in `docker-compose.yml`.

### Docker Mode (Manual)
If you prefer to run only the webapp container:

#### Connecting to Ollama on Host
If you are running Ollama on your host machine (not in Docker), you need to allow the container to reach the host's network.

**For Linux users**:
```bash
docker run -p 5000:5000 \
  --add-host=host.docker.internal:host-gateway \
  -e AI_BASE_URL=http://host.docker.internal:11434 \
  webapp:latest
```

**For macOS/Windows users**:
```bash
docker run -p 5000:5000 \
  -e AI_BASE_URL=http://host.docker.internal:11434 \
  webapp:latest
```

*Note: Ensure Ollama is configured to listen on all interfaces (OLLAMA_HOST=0.0.0.0).*

#### Data Persistence (Optional)
To persist cloned repositories and AI configuration across container restarts, mount volumes for the `/app/repos` directory and the `data.json` file:
```bash
docker run -p 5000:5000 \
  -v $(pwd)/repos:/app/repos \
  -v $(pwd)/data.json:/app/data.json \
  webapp:latest
```
Note: Ensure `data.json` exists on your host before mounting it as a file, or mount a directory if preferred.

### Production Build
To create a production distribution manually:
```bash
npm run build
```
This builds the CSS, frontend (Vite), and backend (TypeScript) into the `dist/` directory.

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
- **Build All**: `npm run build`
- **Build CSS**: `npm run build:css`
- **Run Tests**: `npm test` (217 tests currently passing across 24 files)

### API Endpoints (Core)
- **POST `/api/clone`**: Clone a Git repository to the server.
- **POST `/api/checkout-commits`**: Checkout multiple commits into separate branches.
- **POST `/api/analyze-commits`**: Send commits for AI analysis with detailed diffs.
- **POST `/api/reset-repo`**: Reset the repository to the default branch and clean up temporary branches.
- **GET `/api/config`**: Retrieve current AI configuration and system prompt.
- **POST `/api/config`**: Update AI configuration and persistence.
- **GET `/api/ollama/models`**: List available models from the configured AI service.

## 📂 Project Structure

- `src/`: Core source code.
  - `client/`: React frontend (Vite entry point: `index.tsx`).
    - `components/`: Modularized UI components including `ChatView`, `GitView`, `SettingsView`, and `Layout`.
    - `hooks/`: Custom React hooks for Git (`useGit`), Chat (`useChat`), and state management.
  - `server/`: Express backend entry point and API route definitions.
  - `services/`: Shared business logic for Git, Ollama, AI Service orchestration, and Config management (LokiJS).
  - `types/`: Shared TypeScript interfaces between client and server.
- `static/`: Static assets and global CSS.
- `index.html`: Vite entry point.
- `repos/`: (Auto-created) Directory where cloned repositories are stored.
- `dist/`: Compiled server-side JavaScript files.
- `tools/`: Development utilities (e.g., `dev.js`).

## 📄 License

This project is licensed under the ISC License.
