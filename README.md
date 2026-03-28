# AI Prompt Studio

Local-first AI prompt and metadata toolkit built with Next.js.

## Features

- Image prompt generation (`/prompt-generator`)
- Vector prompt generation (`/vector-generator`)
- Video prompt generation (`/video-generator`)
- Metadata generation from uploaded images (`/metadata-generator`)
- Multi-provider API key support (Gemini, Groq, Mistral) with failover

## Local-First Key Model

- API keys are stored in browser storage on your machine.
- You can switch key storage mode in Settings:
  - Local storage (persists across browser restarts)
  - Session-only storage (cleared when browser closes)
- No server-side key persistence is used by this app.

Security note: browser storage can be exposed if XSS is introduced. Do not use this app on untrusted devices and keep dependencies updated.

## Requirements

- Node.js 22+ recommended
- npm 10+

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` - start local dev server
- `npm run lint` - run ESLint
- `npm run test` - run Node test runner
- `npm run build` - production build
- `npm run verify` - lint + test + build

## API Endpoints

- `POST /api/generate-prompts`
  - Body: `concept`, `quantity`, `model`, `apiKeys`, `type`
- `POST /api/generate-metadata`
  - Body: `image` (data URL), `apiKeys`

## Deployment Readiness

A minimal CI pipeline is included at `.github/workflows/ci.yml` to run lint, test, and build checks on push and pull request.
