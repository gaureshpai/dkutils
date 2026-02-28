# Frontend for dkutils

**Version:** 2.0.2

This directory contains the frontend application for dkutils, built with React and Vite.

## Technologies Used

- React.js
- Vite (as the build tool)
- TailwindCSS
- Axios for API requests

For detailed setup and running instructions, refer to the [main project README.md](../../README.md).

## File Upload Limits

Many of the tools in the dkutils now support file uploads up to 10MB for unauthenticated users, and up to 50MB for authenticated users, providing greater flexibility for larger files.

## Project Structure

- `src/components`: Reusable React components.
- `src/pages`: Top-level page components.
- `src/context`: React Context for global state management (e.g., authentication).
- `src/utils`: Utility functions.

## Build for Production

To create a production-ready build of the frontend application, run:

```bash
pnpm build
```

The build artifacts will be placed in the `dist` directory.
