---
name: feature-development-with-api-and-ui-update
description: Workflow command scaffold for feature-development-with-api-and-ui-update in Vistoria-Cyble-App.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /feature-development-with-api-and-ui-update

Use this workflow when working on **feature-development-with-api-and-ui-update** in `Vistoria-Cyble-App`.

## Goal

Implements a new feature that requires both backend API changes and frontend UI updates.

## Common Files

- `app/api/*/route.ts`
- `app/galeria/GaleriaClient.tsx`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Create or update an API route file in app/api/...
- Update the corresponding frontend component in app/galeria/GaleriaClient.tsx or similar UI file
- Optionally update documentation or agent/README files

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.