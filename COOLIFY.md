# Deploying this repository to Coolify

This repository contains a Vite + React frontend and an Express server bundled into dist/server.cjs.

What I added
- Dockerfile — multi-stage build that installs dependencies, runs the build, and produces a small runtime image.
- .dockerignore — excludes node_modules, dist, and local files.

How to deploy on Coolify (recommended)
1. If you don't have Coolify running, install Coolify and make sure it can access your Git provider or you can push the repo to a place Coolify can pull from (this repo is on GitHub).
2. In the Coolify dashboard, create a new "Application" and connect your repository (nishu5232/TardeMindai-zeher).
3. Coolify will detect the Dockerfile. Configure these fields:
   - Build context: / (root)
   - Dockerfile: Dockerfile
   - Port: 3000 (or set to the PORT env variable your app expects)
   - Environment variables: add any secrets your app needs (e.g. GOOGLE_GENAI_API_KEY, NODE_ENV=production, etc.)
4. Start the deployment — Coolify will run docker build and run the container.
5. If your app listens on a different port, set the PORT environment variable in Coolify or update the Dockerfile to expose the correct port.

Notes
- This Dockerfile expects your `npm run build` to output `dist/server.cjs` and any static files used by the frontend in `dist/`.
- If your server reads env vars (like API keys), add them in the Coolify environment variables for the app.

If you'd like I can also add a GitHub Actions workflow to build and push the image to a registry (GHCR or Docker Hub) which Coolify can pull from instead of building itself. Say the word if you want that automated flow added.