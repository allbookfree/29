# AI Prompt Studio

A professional AI prompt workspace for microstock creators. Generate image, vector, and video prompts optimized for Shutterstock, Adobe Stock, and Dreamstime — with halal content filtering, anti-repeat intelligence, and SEO metadata extraction.

## Features

### Prompt Generation
- **Image Prompt Generator** — AI-powered prompts for stock photography
- **Vector Prompt Generator** — Prompts for illustrations and vector graphics
- **Video Prompt Generator** — Cinematic video prompt creation
- **50,000+ unique prompts** possible with 6-month non-repetition guarantee

### Content Intelligence
- **1,502 halal subjects** across 59 categories (no human figures — Islamic ruling enforced)
- **Anti-repeat system** — Tracks generated prompts to prevent duplication
- **Festival Mode** — Seasonal content suggestions (Eid, Ramadan, etc.)
- **Market Research** — Google Search integration for trending topics
- **Quality Scoring** — AI-based prompt quality assessment

### Metadata & Analytics
- **Metadata Generator** — Extract SEO-optimized titles, descriptions, and keywords from images
- **Batch processing** — Up to 500 images at once with Excel export
- **Analytics Dashboard** — Track usage patterns and category coverage
- **Prompt History** — Browse, search, and reuse all previously generated prompts

### Multi-Provider AI
- **Google Gemini** — 2.5 Flash & Flash-Lite
- **Groq** — Llama 3.3 70B & Llama 4 Scout
- **Mistral** — Mixtral 8x22B
- **OpenRouter** — 6 free models (Nemotron 120B, Qwen3 80B, GPT-OSS 120B, Llama 70B, Hermes 405B, Auto-routing)
- **HuggingFace** — 4 free models (Llama, Qwen, Mistral, DeepSeek)
- **Automatic failover** between multiple API keys per provider

### Export & Security
- **CSV & TXT export** for generated prompts
- **Local-first security** — API keys stored in your browser, never on server
- **Session or persistent storage** — Choose your key storage mode
- **Dark/Light theme** with Bengali (বাংলা) & English UI

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
- npm or pnpm

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

## Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Import repository on [vercel.com](https://vercel.com)
3. Deploy — zero configuration needed

### Other Platforms
Works on any platform supporting Next.js: Netlify, Cloudflare Pages, Railway, etc.

## License

MIT
