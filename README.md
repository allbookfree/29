# AI Prompt Studio

A professional AI prompt workspace for microstock creators. Generate image, vector, and video prompts optimized for Shutterstock, Adobe Stock, and Dreamstime — with halal content filtering, anti-repeat intelligence, and SEO metadata extraction.

## Features

### Prompt Generation
- **Image Prompt Generator** — AI-powered prompts for stock photography
- **Vector Prompt Generator** — Prompts for illustrations and vector graphics
- **Video Prompt Generator** — Cinematic video prompt creation
- **15M+ unique seed combinations** with AI-free-choice subject generation

### Content Intelligence
- **Halal content filtering** — No human figures (Islamic ruling enforced via blacklist approach)
- **Seed-based generation** — ~500 nouns × ~200 adjectives × ~150 contexts = 15M+ unique seeds; AI has full creative freedom over any halal subject
- **Anti-repeat system** — Reads prompt history to prevent duplication
- **Festival Mode** — 30+ seasonal events (Eid, Ramadan, Christmas, etc.) as optional toggle
- **Market Research** — Google Search integration for trending topics (Gemini only)
- **Quality Scoring** — AI-based commercial viability assessment (1-10 scale)

### Three Generation Modes
- **Generate Prompts** — Manual mode with user-provided concept
- **Auto Generate** — One-click autonomous generation from seed pool
- **Engineer** — Professional prompt formulas with platform intelligence and repeat buyer strategy

### Metadata Generator
- **SEO-optimized metadata** — Extract titles, descriptions, and keywords from images
- **Anti-hallucination** — Zero tolerance for guessed content; only tags what's visible
- **Keyword priority** — First 10 keywords weighted by buyer intent
- **Title-keyword alignment** — Title terms reinforced in top keywords
- **Brand/trademark ban** — Auto-rejects trademarked content
- **Batch processing** — Unlimited images with Excel/CSV export
- **Multi-provider** — Gemini Flash, Flash Lite, Groq Scout, Pixtral, OpenRouter, HuggingFace

### Analytics & History
- **Analytics Dashboard** — Total prompts, type distribution donut chart, seed system stats
- **Prompt History** — Browse, search, copy, and delete all previously generated prompts
- **Clear All History** — One-click cleanup from "All" tab

### Multi-Provider AI
- **Google Gemini** — 2.5 Flash & Flash-Lite
- **Groq** — Llama 3.3 70B & Llama 4 Scout
- **Mistral** — Mixtral 8x22B
- **OpenRouter** — 6 free models (Nemotron 120B, Qwen3 80B, GPT-OSS 120B, Llama 70B, Hermes 405B, Auto-routing)
- **HuggingFace** — 4 free models (Llama, Qwen, Mistral, DeepSeek)
- **Automatic failover** between multiple API keys per provider

### Export & Security
- **Copy All** — Clean prompt text (no numbering), single newline separated for Excel compatibility
- **CSV export** — UTF-8 BOM for proper Unicode in Excel
- **TXT export** — Numbered prompt list
- **Local-first security** — API keys stored in your browser, never on server
- **Session or persistent storage** — Choose your key storage mode
- **Dark/Light theme** with Bengali and English UI

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Frontend:** React 19
- **Styling:** Custom CSS with CSS variables (no Tailwind)
- **Internationalization:** Custom i18n (English + Bengali)
- **Icons:** Lucide React
- **Storage:** Browser localStorage (no database required)

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Installation

```bash
git clone https://github.com/YOUR_USERNAME/ai-prompt-studio.git
cd ai-prompt-studio
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:5000](http://localhost:5000) in your browser.

### Production Build

```bash
npm run build
npm start
```

## API Keys Setup

1. Open the app and click **API Keys** in the sidebar
2. Add at least one API key from any supported provider:
   - [Google AI Studio](https://aistudio.google.com/app/apikey) (Gemini)
   - [Groq Console](https://console.groq.com/keys)
   - [Mistral Console](https://console.mistral.ai/api-keys)
   - [OpenRouter](https://openrouter.ai/settings/keys) (Free tier available)
   - [HuggingFace](https://huggingface.co/settings/tokens) (Free tier available)
3. Keys are stored locally in your browser — never sent to any server except the AI provider

## Environment Variables (Optional)

| Variable | Description | Default |
|---|---|---|
| `PORT` | Dev server port | `5000` |
| `NEXT_PUBLIC_APP_URL` | App URL for OpenRouter referer header | `https://ai-prompt-studio.replit.app` |

## Deployment

### Replit
Click **Publish** to deploy directly from Replit.

### Vercel
1. Push to GitHub
2. Import repository on [vercel.com](https://vercel.com)
3. Deploy — zero configuration needed

### Other Platforms
Works on any platform supporting Next.js: Netlify, Cloudflare Pages, Railway, etc.

## License

MIT
