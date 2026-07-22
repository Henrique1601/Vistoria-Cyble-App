```markdown
# Vistoria-Cyble-App Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill provides guidance for contributing to the Vistoria-Cyble-App, a TypeScript project with no detected framework. It covers coding conventions, workflow processes for feature development, documentation updates, and testing patterns. The repository emphasizes clear commit messages, modular code organization, and consistent file and import/export styles.

## Coding Conventions

- **File Naming:** Use `camelCase` for file names.
  - Example: `galeriaClient.tsx`, `userProfile.ts`
- **Import Style:** Use alias imports for modules.
  - Example:
    ```typescript
    import apiClient from '@/utils/apiClient';
    ```
- **Export Style:** Use default exports for modules and components.
  - Example:
    ```typescript
    const GaleriaClient = () => { /* ... */ };
    export default GaleriaClient;
    ```
- **Commit Messages:** Follow [Conventional Commits](https://www.conventionalcommits.org/) with the `feat` prefix for features.
  - Example: `feat: add image upload to galeria client`

## Workflows

### Feature Development with API and UI Update
**Trigger:** When adding or modifying a feature that affects both the backend API and the frontend UI.  
**Command:** `/new-feature-api-ui`

1. **Create or update an API route file**  
   - Path: `app/api/<feature>/route.ts`
   - Example:
     ```typescript
     // app/api/gallery/route.ts
     export default function handler(req, res) {
       // API logic here
     }
     ```
2. **Update the corresponding frontend component**  
   - Path: `app/galeria/GaleriaClient.tsx` or similar UI file
   - Example:
     ```typescript
     // app/galeria/GaleriaClient.tsx
     import apiClient from '@/utils/apiClient';
     // UI logic here
     ```
3. **Optionally update documentation**  
   - Files: `README.md`, `AGENTS.md`, or `.opencode/agent/*.md`
   - Example:
     ```markdown
     ## New Gallery Feature
     This feature allows users to upload images to the gallery.
     ```

### Feature Development with Documentation Update
**Trigger:** When adding a new feature and ensuring documentation is up to date.  
**Command:** `/feature-with-docs`

1. **Implement the feature in the codebase**  
   - This may involve API, UI, or both.
2. **Update documentation files**  
   - Files: `README.md`, `AGENTS.md`, `.opencode/agent/*.md`
   - Example:
     ```markdown
     ### Usage
     To use the new feature, navigate to the gallery and click "Upload".
     ```

## Testing Patterns

- **Test Files:** Named with the pattern `*.test.*`
  - Example: `galeriaClient.test.ts`
- **Testing Framework:** Not explicitly detected; follow standard TypeScript testing practices.
- **Example Test File:**
  ```typescript
  // galeriaClient.test.ts
  import GaleriaClient from './galeriaClient';

  test('should render gallery', () => {
    // test implementation
  });
  ```

## Commands

| Command              | Purpose                                                        |
|----------------------|----------------------------------------------------------------|
| /new-feature-api-ui  | Start a feature involving both API and UI updates              |
| /feature-with-docs   | Start a feature and update documentation accordingly           |
```
