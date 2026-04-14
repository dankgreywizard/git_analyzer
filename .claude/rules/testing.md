# Testing Rules
- Use **Vitest** for all unit and integration tests.
- Core business logic in `src/services` and critical hooks in `src/client/hooks` should maintain at least 75% branch coverage.
- Mocks should be used for external services (Ollama, Git) when testing components.
- Run `npm test` before any major commit.
- Use `npm run test:coverage` to verify coverage requirements.
