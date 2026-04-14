# Development & Style Rules
- **TypeScript 6**: Use strict type checking. Ensure all new code and refactors are fully typed.
- **Styling**: Prefer Tailwind CSS v4 utility classes. Keep custom CSS in `frontend/styles/main.css` to a minimum.
- **Git Safety**: All Git operations must go through `src/services/gitService.ts` to ensure path sanitization and boundary checks.
- **AI Service**: Logic for AI interactions (Ollama, OpenAI, etc.) should be encapsulated in `src/services/aiService.ts`.
- **Architecture**:
  - `src/client`: Components and hooks.
  - `src/server`: Express routes and middleware.
  - `src/services`: Shared business logic.
  - `src/types`: Shared interfaces.
