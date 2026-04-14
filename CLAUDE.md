## Project Overview
A modern web application that combines local AI capabilities with Git repository analysis. Users can clone repositories, explore history, and use AI to analyze commits for risks and summaries.

## Tech Stack
- **Frontend**: React 19, Vite 8, Tailwind CSS v4, Framer Motion
- **Backend**: Node.js, Express, TypeScript 6
- **Database**: LokiJS (in-memory with file-based persistence)
- **Git**: Isomorphic-Git
- **AI**: Ollama (local), OpenAI/Anthropic (experimental)
- **Tooling**: Vitest, PostCSS

## Core Commands
- `npm start`: Start both backend and frontend development servers
- `npm run client`: Start Vite development server
- `npm run server`: Build TS and start backend server
- `npm test`: Run tests with Vitest
- `npm run build`: Full production build (CSS, client, server)
- `npm run build:css`: Build Tailwind CSS
- `npm run test:coverage`: Run tests with coverage report

## Development Guidelines
Modular instructions are located in `.claude/rules/`.
- **Development & Style**: Refer to `.claude/rules/development.md` for coding standards, architecture, and safety.
- **Testing**: Refer to `.claude/rules/testing.md` for Vitest configuration and coverage requirements.
- **Service Creation**: Refer to `.claude/prompts/new-service-template.md` for prompts to guide the creation of new services.

## Important Notes
- Cloned repositories are stored in the `repos/` directory.
- Application settings are persisted in `data.json` via LokiJS.
- Default branch is usually `main` or `master`. Temporary branches are prefixed with `branch-`.