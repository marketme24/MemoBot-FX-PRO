# MEMOCODEX AI — Open-Source Code Assistant

An open-source, provider-agnostic AI coding assistant that supports **every programming language** with **zero vendor lock-in**.

## Core Principles

1. **Open Source** — All code is open-source. No proprietary dependencies.
2. **Free API** — Works with free AI providers. No paid subscriptions required.
3. **Provider-Agnostic** — Connect to ANY OpenAI-compatible API endpoint.
4. **All Languages** — Supports every programming language ever created.

## Supported Free AI Providers

| Provider | Type | Free Tier |
|----------|------|-----------|
| [Groq](https://groq.com) | Cloud | Free tier available |
| [HuggingFace](https://huggingface.co) | Cloud | Free inference API |
| [Ollama](https://ollama.ai) | Local | Completely free |
| [OpenRouter](https://openrouter.ai) | Cloud | Free models available |
| [Together AI](https://together.xyz) | Cloud | Free tier available |
| [Google Gemini](https://ai.google.dev) | Cloud | Free tier available |
| [Cohere](https://cohere.com) | Cloud | Free tier available |
| [LM Studio](https://lmstudio.ai) | Local | Completely free |
| Any Custom | Any | Your choice |

## Run Locally

**Prerequisites:** Node.js 18+

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure your AI provider in `.env.local` (copy from `.env.example`):
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` with your chosen provider's URL, API key, and model.

3. Run the app:
   ```bash
   npm run dev
   ```

4. Open `http://localhost:3000` in your browser.

## Architecture

- **Frontend:** React 19 + Vite + TypeScript + Tailwind CSS + Monaco Editor
- **Backend:** Express + Socket.io (real-time collaboration)
- **AI:** Provider-agnostic via OpenAI-compatible chat/completions API
- **Storage:** Local JSON file-based (no cloud dependency)
- **Auth:** None required (self-hosted = your machine = your data)

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `AI_BASE_URL` | Base URL of your AI provider | `https://api.groq.com/openai/v1` |
| `AI_API_KEY` | API key (not needed for local providers) | (empty) |
| `AI_MODEL` | Model name | `llama-3.3-70b-versatile` |

## License

Apache-2.0
