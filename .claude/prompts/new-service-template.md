# New Service Prompt Template
Use this prompt to guide the creation of a new service in the `src/services` directory.

## Instructions
When creating a new service, follow these requirements:
1. **File Location**: Place the new service in `src/services/<serviceName>.ts`.
2. **TypeScript**: Use strict TypeScript 6. Define interfaces for all inputs and outputs in `src/types/` if they are shared, or locally if specific to the service.
3. **Safety**: 
   - If the service interacts with the file system or Git, it MUST use `src/services/gitService.ts` for path sanitization.
   - If it involves AI, it MUST integrate with `src/services/aiService.ts`.
4. **Error Handling**: Implement robust error handling with try-catch blocks and informative error messages.
5. **Testing**: Create a corresponding test file in `src/services/__tests__/<serviceName>.test.ts` using Vitest.
6. **Exports**: Use named exports.
7. **Logging**: Use a consistent logging pattern (if established in the project).

## Prompt to Claude
"I want to create a new service called `[SERVICE_NAME]`. 
Its purpose is to: `[PURPOSE]`.
Key features should include:
- `[FEATURE_1]`
- `[FEATURE_2]`

Please implement the service in `src/services/[SERVICE_NAME].ts` and its tests in `src/services/__tests__/[SERVICE_NAME].test.ts`. Refer to `.claude/rules/development.md` for architectural guidelines."
